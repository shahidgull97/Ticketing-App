from datetime import timedelta

from django.utils import timezone

from tickets.models import Ticket, TicketActivity

from .base import BaseTicketTest


class TicketWorkflowTests(BaseTicketTest):
    def test_create_ticket_auto_assigns_department_poc_and_writes_audit(self):
        res = self.create_ticket()
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data["status"], "PENDING_ASSIGNMENT")
        self.assertEqual(res.data["department"]["name"], "Technical")
        self.assertEqual([a["id"] for a in res.data["assignees"]], [self.tech_poc.pk])
        self.assertEqual([a["type"] for a in res.data["activities"]], ["CREATED", "AUTO_ASSIGNED"])
        self.assertEqual(res.data["activities"][1]["actor"]["name"], "System")

    def test_full_happy_path_and_invalid_transitions(self):
        tid = self.create_ticket().data["id"]
        url = f"/api/tickets/{tid}"

        # Worker cannot submit before being assigned (not visible at all -> 404).
        self.assertEqual(self.api(self.tech_worker).post(f"{url}/submit-assessment/", {"outcome": "FULLY_RESOLVED"}).status_code, 404)

        res = self.api(self.tech_poc).post(f"{url}/assign-worker/", {"worker": self.tech_worker.pk})
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data["status"], "PENDING_ASSESSMENT")

        # Re-assigning is an invalid transition: 409 with the standard error envelope.
        res = self.api(self.tech_poc).post(f"{url}/assign-worker/", {"worker": self.tech_worker.pk})
        self.assertEqual(res.status_code, 409)
        self.assertEqual(res.data["error"]["code"], "invalid_transition")

        # Partial resolution requires a note (validation), then succeeds.
        w = self.api(self.tech_worker)
        res = w.post(f"{url}/submit-assessment/", {"outcome": "PARTIALLY_RESOLVED"})
        self.assertEqual(res.status_code, 400)
        self.assertIn("note", res.data["error"]["details"])
        res = w.post(f"{url}/submit-assessment/", {"outcome": "PARTIALLY_RESOLVED", "note": "Needs electrician"})
        self.assertEqual(res.data["status"], "PENDING_POC_REVIEW")

        res = self.api(self.client_user).post(f"{url}/resolve/")
        self.assertEqual(res.data["status"], "RESOLVED")
        self.assertEqual(self.api(self.client_user).post(f"{url}/resolve/").status_code, 409)
        self.assertEqual(self.api(self.client_user).post(f"{url}/comments/", {"text": "hi"}, format="json").status_code, 409)

    def test_change_department_requires_note_and_reroutes_poc(self):
        tid = self.create_ticket().data["id"]
        poc = self.api(self.tech_poc)
        res = poc.post(f"/api/tickets/{tid}/change-department/", {"department": self.it.pk, "note": ""})
        self.assertEqual(res.status_code, 400)
        res = poc.post(f"/api/tickets/{tid}/change-department/", {"department": self.it.pk, "note": "IT issue"})
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data["department"]["name"], "IT")
        self.assertEqual(res.data["assignees"][0]["id"], self.it_poc.pk)
        self.assertEqual(res.data["activities"][-1]["type"], "DEPARTMENT_CHANGED")
        # Old POC lost visibility, new POC gained it.
        self.assertEqual(self.api(self.tech_poc).get(f"/api/tickets/{tid}/").status_code, 404)
        self.assertEqual(self.api(self.it_poc).get(f"/api/tickets/{tid}/").status_code, 200)

    def test_create_validation(self):
        res = self.create_ticket(issues=[])
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data["error"]["code"], "validation_error")
        self.assertEqual(self.create_ticket(floors=[]).status_code, 400)  # multi-floor office needs floors
        self.assertEqual(self.create_ticket(issues=[self.ac.pk, self.net.pk]).status_code, 400)  # mixed depts
        self.assertEqual(self.create_ticket(floors=[self.b_floor.pk]).status_code, 400)  # foreign floor

    def test_listing_pagination_search_filter_sort(self):
        now = timezone.now()
        for i in range(12):
            tid = self.create_ticket(issues=[self.ac.pk if i % 2 else self.lift.pk]).data["id"]
            Ticket.objects.filter(pk=tid).update(created_at=now - timedelta(hours=i))
        self.create_ticket(issues=[self.net.pk])
        api = self.api(self.fm)

        page1 = api.get("/api/tickets/?page_size=5").data
        self.assertEqual((page1["count"], len(page1["results"])), (13, 5))
        self.assertIsNotNone(page1["next"])
        self.assertEqual(len(api.get("/api/tickets/?page_size=5&page=3").data["results"]), 3)

        self.assertEqual(api.get("/api/tickets/?search=lift").data["count"], 6)
        self.assertEqual(api.get(f"/api/tickets/?department={self.it.pk}").data["count"], 1)
        self.assertEqual(api.get(f"/api/tickets/?client={self.client_a.pk}").data["count"], 13)
        self.assertEqual(api.get(f"/api/tickets/?facility_manager={self.fm.pk}").data["count"], 13)
        self.assertEqual(api.get("/api/tickets/?status=RESOLVED").data["count"], 0)
        self.assertEqual(api.get("/api/tickets/?tab=closed").data["count"], 0)

        newest = api.get("/api/tickets/?ordering=-created_at&page_size=50").data["results"]
        oldest = api.get("/api/tickets/?ordering=created_at&page_size=50").data["results"]
        self.assertEqual([t["id"] for t in newest], [t["id"] for t in reversed(oldest)])

    def test_listing_uses_constant_number_of_queries(self):
        for _ in range(6):
            self.create_ticket()
        api = self.api(self.fm)
        with self.assertNumQueries(3):  # count + tickets(all joins/aggregate) + floors prefetch: independent of row count
            api.get("/api/tickets/?page_size=50")

    def test_audit_trail_is_recorded_in_order(self):
        tid = self.create_ticket().data["id"]
        self.api(self.tech_poc).post(f"/api/tickets/{tid}/assign-worker/", {"worker": self.tech_worker.pk})
        types = list(TicketActivity.objects.filter(ticket_id=tid).values_list("type", flat=True))
        self.assertEqual(types, ["CREATED", "AUTO_ASSIGNED", "WORKER_ASSIGNED"])
