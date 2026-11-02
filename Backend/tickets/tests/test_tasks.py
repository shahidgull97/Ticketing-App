from unittest import mock

from tickets import tasks
from tickets.models import Notification, TicketActivity

from .base import BaseTicketTest


class NotificationTaskTests(BaseTicketTest):
    def setUp(self):
        tid = self.create_ticket().data["id"]
        self.activity = TicketActivity.objects.filter(ticket_id=tid, type="CREATED").get()

    def test_on_commit_enqueues_task_and_notifies_other_parties(self):
        # create_ticket() ran with CELERY_EAGER, so the task has already created + delivered rows.
        recipients = set(Notification.objects.filter(activity=self.activity).values_list("recipient__username", flat=True))
        self.assertEqual(recipients, {"fm", "techpoc"})  # not the creator
        self.assertFalse(Notification.objects.filter(delivered_at__isnull=True).exists())

    def test_duplicate_execution_is_idempotent(self):
        with mock.patch.object(tasks, "deliver") as deliver:
            tasks.notify_activity.apply(args=[self.activity.pk])
            tasks.notify_activity.apply(args=[self.activity.pk])
        deliver.assert_not_called()  # everything was already delivered by the first (eager) run
        self.assertEqual(Notification.objects.filter(activity=self.activity).count(), 2)

    def test_transient_failure_is_retried_and_delivered_exactly_once(self):
        Notification.objects.all().delete()
        calls = {"n": 0}

        def flaky(notification):
            calls["n"] += 1
            if calls["n"] == 1:
                raise tasks.NotificationDeliveryError("provider down")

        with mock.patch.object(tasks, "deliver", side_effect=flaky):
            result = tasks.notify_activity.apply(args=[self.activity.pk])
        self.assertTrue(result.successful(), result.traceback)
        rows = Notification.objects.filter(activity=self.activity)
        self.assertEqual(rows.count(), 2)  # no duplicates despite the retry
        self.assertFalse(rows.filter(delivered_at__isnull=True).exists())
        self.assertEqual(calls["n"], 3)  # 1 failure + retry delivering both rows

    def test_permanent_failure_gives_up_after_max_retries(self):
        Notification.objects.all().delete()
        with mock.patch.object(tasks, "deliver", side_effect=tasks.NotificationDeliveryError("down")):
            result = tasks.notify_activity.apply(args=[self.activity.pk])
        self.assertTrue(result.failed())
        # Rows are kept (undelivered) so they can be re-driven later; nothing is lost or duplicated.
        self.assertEqual(Notification.objects.filter(activity=self.activity, delivered_at__isnull=True).count(), 2)

    def test_missing_activity_is_a_noop(self):
        self.assertEqual(tasks.notify_activity.apply(args=[999999]).get(), 0)

