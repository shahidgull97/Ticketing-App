"""Business rules for the ticket workflow.

Status machine
--------------
    PENDING_ASSIGNMENT --assign_worker--------> PENDING_ASSESSMENT
    PENDING_ASSIGNMENT --change_department----> PENDING_ASSIGNMENT   (new department POC)
    PENDING_ASSESSMENT --submit_assessment----> PENDING_POC_REVIEW   ("Technician Closed")
    any open status    --resolve (client)-----> RESOLVED

Every mutating function runs inside one transaction, locks the ticket row, writes the audit
activity in the same transaction and only then (on commit) schedules the async notification.
"""
import logging

from django.db import transaction
from django.db.models import Count
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from accounts.models import Department, User
from core.exceptions import InvalidTransition

from .models import Issue, Ticket, TicketActivity

logger = logging.getLogger("tickets")

ACTIONS = ("comment", "resolve", "assign_worker", "change_department", "submit_assessment")


def label(user):
    return f"{user.display_name} ({user.title})" if user else "Unassigned"


# --------------------------------------------------------------------------- visibility
def visible_tickets(user):
    """Server-side visibility rule: which tickets may this user see at all."""
    qs = Ticket.objects.all()
    if user.role == User.Role.CLIENT:
        return qs.filter(client__users=user)
    if user.role == User.Role.FACILITY_MANAGER:
        return qs.filter(client__building__facility_manager=user)
    if user.role == User.Role.DEPARTMENT_POC:
        return qs.filter(department_id=user.department_id)
    if user.role == User.Role.WORKER:
        return qs.filter(assigned_worker=user)
    return qs.none()


# --------------------------------------------------------------------------- permissions
def _role_allows(ticket, user, action):
    if action == "comment":
        return True  # visibility is already enforced by the queryset
    if action == "resolve":
        is_client_member = user.role == User.Role.CLIENT and user.clients.filter(pk=ticket.client_id).exists()
        return ticket.created_by_id == user.id or is_client_member
    if action in ("assign_worker", "change_department"):
        return user.role == User.Role.DEPARTMENT_POC and user.department_id == ticket.department_id
    if action == "submit_assessment":
        return user.role == User.Role.WORKER and ticket.assigned_worker_id == user.id
    return False


def _state_allows(ticket, action):
    S = Ticket.Status
    if action in ("comment", "resolve"):
        return ticket.status != S.RESOLVED
    if action in ("assign_worker", "change_department"):
        return ticket.status == S.PENDING_ASSIGNMENT
    if action == "submit_assessment":
        return ticket.status == S.PENDING_ASSESSMENT
    return False


def available_actions(ticket, user):
    return [a for a in ACTIONS if _role_allows(ticket, user, a) and _state_allows(ticket, a)]


def _authorize(ticket, user, action):
    if not _role_allows(ticket, user, action):
        raise PermissionDenied("You do not have permission to perform this action on this ticket.")
    if not _state_allows(ticket, action):
        raise InvalidTransition(
            f"Action '{action}' is not allowed while the ticket is '{ticket.get_status_display()}'."
        )


def _locked(ticket_id):
    return Ticket.objects.select_for_update(of=("self",)).select_related("department", "assigned_poc").get(pk=ticket_id)


# --------------------------------------------------------------------------- activity + async
def _record(ticket, actor, type_, from_value="", to_value="", message=""):
    activity = TicketActivity.objects.create(
        ticket=ticket, actor=actor, type=type_, from_value=from_value, to_value=to_value, message=message
    )
    transaction.on_commit(lambda: _dispatch_notification(activity.pk))
    logger.info(
        "ticket_activity ticket_id=%s type=%s actor_id=%s", ticket.pk, type_, actor.pk if actor else "system"
    )
    return activity


def _dispatch_notification(activity_id):
    from .tasks import notify_activity

    try:
        notify_activity.delay(activity_id)
    except Exception:  # broker down must never fail the user's request
        logger.exception("notification_enqueue_failed activity_id=%s", activity_id)


# --------------------------------------------------------------------------- operations
@transaction.atomic
def create_ticket(*, user, client, issues, floors, description):
    department = issues[0].department
    ticket = Ticket.objects.create(
        client=client,
        department=department,
        issue_text=", ".join(i.name for i in issues)[:500],
        description=description,
        created_by=user,
        assigned_poc=department.poc,
    )
    ticket.issues.set(issues)
    ticket.floors.set(floors)
    _record(ticket, user, TicketActivity.Type.CREATED)
    _record(
        ticket, None, TicketActivity.Type.AUTO_ASSIGNED, "Unassigned", label(department.poc) if department.poc else "Unassigned"
    )
    return ticket


@transaction.atomic
def assign_worker(*, ticket_id, user, worker_id):
    ticket = _locked(ticket_id)
    _authorize(ticket, user, "assign_worker")
    try:
        worker = User.objects.get(pk=worker_id, role=User.Role.WORKER, department_id=ticket.department_id, is_active=True)
    except User.DoesNotExist:
        raise ValidationError({"worker": ["Select a worker from this ticket's department."]})
    ticket.assigned_worker = worker
    ticket.status = Ticket.Status.PENDING_ASSESSMENT
    ticket.save(update_fields=["assigned_worker", "status", "updated_at"])
    _record(ticket, user, TicketActivity.Type.WORKER_ASSIGNED, "Unassigned", label(worker))
    return ticket


@transaction.atomic
def change_department(*, ticket_id, user, department_id, note):
    ticket = _locked(ticket_id)
    _authorize(ticket, user, "change_department")
    note = (note or "").strip()
    errors = {}
    if not note:
        errors["note"] = ["A forwarding note is required."]
    try:
        department = Department.objects.select_related("poc").get(pk=department_id)
    except (Department.DoesNotExist, ValueError, TypeError):
        department = None
        errors["department"] = ["Select a valid department."]
    if department and department.pk == ticket.department_id:
        errors["department"] = ["Select a different department."]
    if department and not department.poc_id:
        errors["department"] = ["That department has no POC configured."]
    if errors:
        raise ValidationError(errors)
    old_department = ticket.department
    ticket.department = department
    ticket.assigned_poc = department.poc
    ticket.save(update_fields=["department", "assigned_poc", "updated_at"])
    _record(ticket, user, TicketActivity.Type.DEPARTMENT_CHANGED, old_department.name, department.name, note)
    return ticket


@transaction.atomic
def submit_assessment(*, ticket_id, user, outcome, note):
    ticket = _locked(ticket_id)
    _authorize(ticket, user, "submit_assessment")
    note = (note or "").strip()
    errors = {}
    if outcome not in Ticket.Outcome.values:
        errors["outcome"] = ["Choose one of the assessment options."]
    elif outcome != Ticket.Outcome.FULLY_RESOLVED and not note:
        errors["note"] = ["A note is required for this option."]
    if errors:
        raise ValidationError(errors)
    ticket.status = Ticket.Status.PENDING_POC_REVIEW
    ticket.assessment_outcome = outcome
    ticket.save(update_fields=["status", "assessment_outcome", "updated_at"])
    message = Ticket.Outcome(outcome).label + (f": {note}" if note else "")
    _record(ticket, user, TicketActivity.Type.ASSESSMENT_SUBMITTED, "Open", "Technician Closed", message)
    return ticket


@transaction.atomic
def resolve_ticket(*, ticket_id, user):
    ticket = _locked(ticket_id)
    _authorize(ticket, user, "resolve")
    previous = ticket.get_status_display()
    ticket.status = Ticket.Status.RESOLVED
    ticket.resolved_at = timezone.now()
    ticket.save(update_fields=["status", "resolved_at", "updated_at"])
    _record(ticket, user, TicketActivity.Type.RESOLVED, previous, "Resolved")
    return ticket


@transaction.atomic
def add_comment(*, ticket_id, user, text):
    ticket = _locked(ticket_id)
    _authorize(ticket, user, "comment")
    text = (text or "").strip()
    if not text:
        raise ValidationError({"text": ["Comment cannot be empty."]})
    if len(text) > 2000:
        raise ValidationError({"text": ["Comment must be 2000 characters or fewer."]})
    return _record(ticket, user, TicketActivity.Type.COMMENT, message=text)


# --------------------------------------------------------------------------- quick issues
def quick_issues(client, limit=4):
    """Top issues this client raised before; padded with globally popular ones for new clients."""
    base = Issue.objects.filter(is_active=True)
    own = list(base.filter(tickets__client=client).annotate(n=Count("tickets")).order_by("-n", "name")[:limit])
    if len(own) < limit:
        taken = [i.pk for i in own]
        popular = base.exclude(pk__in=taken).annotate(n=Count("tickets")).order_by("-n", "name")[: limit - len(own)]
        own.extend(popular)
    return own
