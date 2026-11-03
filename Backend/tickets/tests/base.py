from django.test import override_settings
from rest_framework.test import APIClient, APITestCase

from accounts.models import Building, Client, Department, Floor, User
from tickets.models import Issue


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class BaseTicketTest(APITestCase):
    """Small deterministic world: 2 departments, 2 properties, 2 clients, one user per role."""

    @classmethod
    def setUpTestData(cls):
        mk = lambda u, role, dept=None, **kw: User.objects.create_user(  # noqa: E731
            u, password="pw-12345-x", first_name=u.title(), role=role, department=dept, **kw
        )
        cls.tech = Department.objects.create(name="Technical")
        cls.it = Department.objects.create(name="IT")
        cls.fm = mk("fm", "FACILITY_MANAGER")
        cls.other_fm = mk("fm2", "FACILITY_MANAGER")
        cls.tech_poc = mk("techpoc", "DEPARTMENT_POC", cls.tech, designation="Technical Manager")
        cls.it_poc = mk("itpoc", "DEPARTMENT_POC", cls.it)
        cls.tech_worker = mk("techworker", "WORKER", cls.tech)
        cls.it_worker = mk("itworker", "WORKER", cls.it)
        Department.objects.filter(pk=cls.tech.pk).update(poc=cls.tech_poc)
        Department.objects.filter(pk=cls.it.pk).update(poc=cls.it_poc)
        cls.tech.refresh_from_db()
        cls.it.refresh_from_db()

        cls.building = Building.objects.create(name="Tower A", facility_manager=cls.fm)
        cls.other_building = Building.objects.create(name="Tower B", facility_manager=cls.other_fm)
        cls.client_a = Client.objects.create(name="Acme", office_code="1", building=cls.building)
        cls.client_b = Client.objects.create(name="Beta", office_code="2", building=cls.other_building)
        cls.a_floors = [Floor.objects.create(client=cls.client_a, label=l, position=i) for i, l in enumerate(["1F", "2F"])]
        cls.b_floor = Floor.objects.create(client=cls.client_b, label="G")
        cls.client_user = mk("clienta", "CLIENT")
        cls.client_user.clients.add(cls.client_a)
        cls.client_user_b = mk("clientb", "CLIENT")
        cls.client_user_b.clients.add(cls.client_b)
        cls.ac = Issue.objects.create(department=cls.tech, name="AC not cooling")
        cls.lift = Issue.objects.create(department=cls.tech, name="Lift Servicing")
        cls.net = Issue.objects.create(department=cls.it, name="Internet not working")

    def api(self, user=None):
        c = APIClient()
        if user:
            c.force_authenticate(user)
        return c

    def create_ticket(self, user=None, **over):
        payload = {"issues": [self.ac.pk], "floors": [self.a_floors[1].pk], "description": "Broken"}
        payload.update(over)
        with self.captureOnCommitCallbacks(execute=True):
            return self.api(user or self.client_user).post("/api/tickets/", payload, format="json")

