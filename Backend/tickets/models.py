from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone


class Issue(models.Model):
    """Catalogue of issue types; each belongs to the Department that handles it."""

    department = models.ForeignKey("accounts.Department", on_delete=models.PROTECT, related_name="issues")
    name = models.CharField(max_length=120)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]
        constraints = [models.UniqueConstraint(fields=["department", "name"], name="uniq_issue_per_department")]

    def __str__(self):
        return self.name


class Ticket(models.Model):
    class Status(models.TextChoices):
        PENDING_ASSIGNMENT = "PENDING_ASSIGNMENT", "Pending Technician Assignment"
        PENDING_ASSESSMENT = "PENDING_ASSESSMENT", "Pending Technician Assessment"
        PENDING_POC_REVIEW = "PENDING_POC_REVIEW", "Pending Department POC Review"
        RESOLVED = "RESOLVED", "Resolved"

    class Outcome(models.TextChoices):
        FULLY_RESOLVED = "FULLY_RESOLVED", "Fully resolved"
        PARTIALLY_RESOLVED = "PARTIALLY_RESOLVED", "Partially resolved"
        SUGGEST_CHANGE = "SUGGEST_CHANGE", "Suggested department/worker change"

    OPEN_STATUSES = (Status.PENDING_ASSIGNMENT, Status.PENDING_ASSESSMENT, Status.PENDING_POC_REVIEW)

    client = models.ForeignKey("accounts.Client", on_delete=models.PROTECT, related_name="tickets")
    department = models.ForeignKey("accounts.Department", on_delete=models.PROTECT, related_name="tickets")
    issues = models.ManyToManyField(Issue, related_name="tickets")
    # Denormalised, comma-joined issue names: keeps text search a single indexed-table scan (no M2M join).
    issue_text = models.CharField(max_length=500)
    floors = models.ManyToManyField("accounts.Floor", related_name="tickets")
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING_ASSIGNMENT)
    assessment_outcome = models.CharField(max_length=20, choices=Outcome.choices, blank=True)

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_tickets")
    assigned_poc = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="poc_tickets"
    )
    assigned_worker = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="worker_tickets"
    )

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            # Main listing: tab (status) + newest/oldest first. Covers the default query of every role.
            models.Index(fields=["status", "-created_at"], name="ticket_status_created_idx"),
            models.Index(fields=["department", "status"], name="ticket_dept_status_idx"),
            models.Index(fields=["client", "-created_at"], name="ticket_client_created_idx"),
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(status__in=["PENDING_ASSIGNMENT", "PENDING_ASSESSMENT", "PENDING_POC_REVIEW", "RESOLVED"]),
                name="ticket_valid_status",
            ),
            # A ticket still waiting for assignment cannot already have a worker.
            models.CheckConstraint(
                condition=~Q(status="PENDING_ASSIGNMENT") | Q(assigned_worker__isnull=True),
                name="ticket_pending_assignment_has_no_worker",
            ),
            models.CheckConstraint(
                condition=Q(status="RESOLVED", resolved_at__isnull=False) | ~Q(status="RESOLVED"),
                name="ticket_resolved_has_timestamp",
            ),
        ]

    @property
    def number(self):
        return f"TKT-{1000 + self.pk}"

    @property
    def is_open(self):
        return self.status != self.Status.RESOLVED

    def __str__(self):
        return f"{self.number} {self.issue_text}"


class TicketActivity(models.Model):
    """Append-only audit trail + comments for a ticket (the 'ACTIVITY' section in the wireframe)."""

    class Type(models.TextChoices):
        CREATED = "CREATED", "created"
        AUTO_ASSIGNED = "AUTO_ASSIGNED", "auto-assigned"
        WORKER_ASSIGNED = "WORKER_ASSIGNED", "assigned technician"
        DEPARTMENT_CHANGED = "DEPARTMENT_CHANGED", "changed department"
        ASSESSMENT_SUBMITTED = "ASSESSMENT_SUBMITTED", "changed status"
        RESOLVED = "RESOLVED", "resolved"
        COMMENT = "COMMENT", "commented"

    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name="activities")
    # Null actor == the System.
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="ticket_activities"
    )
    type = models.CharField(max_length=24, choices=Type.choices)
    from_value = models.CharField(max_length=120, blank=True)
    to_value = models.CharField(max_length=120, blank=True)
    message = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["created_at", "id"]
        indexes = [models.Index(fields=["ticket", "created_at"], name="activity_ticket_created_idx")]

    @property
    def is_comment(self):
        return self.type == self.Type.COMMENT


class Notification(models.Model):
    """Simulated notification. `idempotency_key` makes the Celery task safe to run more than once."""

    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name="notifications")
    activity = models.ForeignKey(TicketActivity, on_delete=models.CASCADE, related_name="notifications")
    message = models.CharField(max_length=255)
    idempotency_key = models.CharField(max_length=80, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    attempts = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["-created_at"]

