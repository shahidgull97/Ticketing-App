"""Asynchronous notification pipeline (simulated delivery).

Design
------
* Triggered via ``transaction.on_commit`` so a worker never sees an activity that was rolled back.
* Idempotent: one ``Notification`` row per (activity, recipient), enforced by a UNIQUE
  ``idempotency_key``. Re-delivery of the same message (``acks_late`` redelivery after a worker crash,
  a retry, or a duplicate enqueue) finds the existing row and only delivers the ones with
  ``delivered_at IS NULL`` - an already delivered notification is never sent twice.
* Failure handling: transient ``NotificationDeliveryError`` => exponential backoff with jitter, up to
  ``NOTIFICATION_MAX_RETRIES``. After that the failure is logged (``on_failure``) and the undelivered
  rows stay in the table for a manual/periodic re-drive.
"""
import logging

from celery import Task, shared_task
from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone

from .models import Notification, TicketActivity

logger = logging.getLogger("tickets")


class NotificationDeliveryError(Exception):
    """Transient failure talking to the (simulated) notification provider."""


def deliver(notification):
    """Simulated provider call. Replace with email/SMS/push; raise NotificationDeliveryError on failure.
    Never log the message body - it can contain user text."""
    logger.info("notification_sent notification_id=%s recipient_id=%s", notification.pk, notification.recipient_id)


def recipients_for(activity):
    ticket = activity.ticket
    users = {ticket.created_by, ticket.assigned_poc, ticket.assigned_worker}
    fm = ticket.client.building.facility_manager
    users.add(fm)
    users.update(ticket.client.users.all())
    users.discard(None)
    users.discard(activity.actor)  # don't notify people about their own action
    return users


def build_message(activity):
    return f"{activity.ticket.number}: {activity.get_type_display()}"[:255]


class NotifyTask(Task):
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        logger.error("notification_task_failed activity_id=%s error=%s", args[0] if args else "?", type(exc).__name__)


@shared_task(
    bind=True,
    base=NotifyTask,
    autoretry_for=(NotificationDeliveryError,),
    retry_backoff=2,
    retry_backoff_max=60,
    retry_jitter=True,
    max_retries=settings.NOTIFICATION_MAX_RETRIES,
)
def notify_activity(self, activity_id):
    try:
        activity = TicketActivity.objects.select_related(
            "ticket__client__building__facility_manager", "ticket__created_by", "ticket__assigned_poc",
            "ticket__assigned_worker", "actor",
        ).get(pk=activity_id)
    except TicketActivity.DoesNotExist:
        logger.warning("notification_activity_missing activity_id=%s", activity_id)
        return 0

    message = build_message(activity)
    for user in recipients_for(activity):
        key = f"activity:{activity.pk}:user:{user.pk}"
        try:
            with transaction.atomic():
                Notification.objects.get_or_create(
                    idempotency_key=key,
                    defaults={"recipient": user, "ticket": activity.ticket, "activity": activity, "message": message},
                )
        except IntegrityError:  # concurrent duplicate execution created it first
            pass

    delivered = 0
    for notification in Notification.objects.filter(activity=activity, delivered_at__isnull=True):
        Notification.objects.filter(pk=notification.pk).update(attempts=notification.attempts + 1)
        deliver(notification)  # may raise -> whole task retries; delivered ones are skipped next run
        Notification.objects.filter(pk=notification.pk, delivered_at__isnull=True).update(delivered_at=timezone.now())
        delivered += 1
    logger.info("notification_task_done activity_id=%s delivered=%s attempt=%s", activity_id, delivered, self.request.retries)
    return delivered

