"""Load reproducible demo data:  python manage.py seed_demo [--reset]

Creates departments, properties, clients/floors, seeded users for every role, an issue catalogue and
~70 tickets in all workflow states (created through the real service layer so audit history is real).
"""
import random
from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from accounts.models import Building, Client, Department, Floor, User
from tickets import services
from tickets.models import Issue, Notification, Ticket, TicketActivity

PEOPLE = [
    # username, first, last, role, designation, department
    ("chaitya", "Chaitya", "M", "CLIENT", "Client POC", None),
    ("meera", "Meera", "K", "CLIENT", "Client POC", None),
    ("rohan", "Rohan", "P", "CLIENT", "Client POC", None),
    ("chandan", "Chandan", "S", "FACILITY_MANAGER", "Facility Manager", None),
    ("neha", "Neha", "Verma", "FACILITY_MANAGER", "Facility Manager", None),
    ("dhananjaya", "Dhananjaya", "Murthy", "DEPARTMENT_POC", "Technical Manager", "Technical"),
    ("abdul", "Abdul", "", "DEPARTMENT_POC", "IT Manager", "IT"),
    ("sunita", "Sunita", "Rao", "DEPARTMENT_POC", "Housekeeping Lead", "Housekeeping"),
    ("vikram", "Vikram", "Shah", "DEPARTMENT_POC", "Electrical Manager", "Electrical"),
    ("prakash", "Prakash", "Kumar", "WORKER", "Technician", "Technical"),
    ("ravi", "Ravi", "Teja", "WORKER", "Technician", "Technical"),
    ("imran", "Imran", "Khan", "WORKER", "IT Technician", "IT"),
    ("lakshmi", "Lakshmi", "Devi", "WORKER", "Housekeeping Supervisor", "Housekeeping"),
    ("mohan", "Mohan", "Das", "WORKER", "Electrician", "Electrical"),
]
POCS = {"Technical": "dhananjaya", "IT": "abdul", "Housekeeping": "sunita", "Electrical": "vikram"}
ISSUES = {
    "Technical": ["AC not cooling", "Lift Servicing", "Plumbing leakage", "Water cooler not working"],
    "IT": ["Internet not working", "Wi-Fi is slow", "Printer not working", "CCTV camera offline"],
    "Housekeeping": ["Pantry not cleaned", "Washroom not cleaned", "Garbage not collected"],
    "Electrical": ["Lights flickering", "Power outage", "Socket not working"],
}
BUILDINGS = {"Harness Tech Park": "chandan", "HSR Business Centre": "neha"}
CLIENTS = [
    # name, office code, building, floors, client users
    ("Harness", "1317", "Harness Tech Park", ["1F", "2F", "3F"], ["chaitya"]),
    ("Orion Labs", "204", "Harness Tech Park", ["2F", "3F", "4F"], ["meera"]),
    ("Zenith Foods", "G1", "HSR Business Centre", ["Ground"], ["meera"]),
    ("Lumen Pharma", "HSR-1317", "HSR Business Centre", ["1F", "2F"], ["rohan"]),
]
DESCRIPTIONS = [
    "The units appear to be running but nothing is improving. Last service was a few months ago.",
    "Multiple people on the floor are affected since this morning.",
    "Issue started yesterday evening and is getting worse.",
    "",
]


class Command(BaseCommand):
    help = "Load demo data (idempotent). Use --reset to rebuild tickets."

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true", help="Delete existing tickets and recreate them.")
        parser.add_argument("--tickets", type=int, default=70)

    @transaction.atomic
    def handle(self, *args, **opts):
        # Seeding must not need a broker: skip the async notification dispatch.
        services._dispatch_notification = lambda activity_id: None
        rng = random.Random(42)

        departments = {n: Department.objects.get_or_create(name=n)[0] for n in ISSUES}
        users = {}
        for username, first, last, role, designation, dept in PEOPLE:
            user, _ = User.objects.update_or_create(
                username=username,
                defaults={
                    "first_name": first, "last_name": last, "role": role, "designation": designation,
                    "department": departments[dept] if dept else None, "is_active": True,
                },
            )
            user.set_password(settings.DEMO_PASSWORD)
            user.save()
            users[username] = user
        for dept_name, username in POCS.items():
            Department.objects.filter(name=dept_name).update(poc=users[username])
        for dept_name, names in ISSUES.items():
            for name in names:
                Issue.objects.get_or_create(department=departments[dept_name], name=name)

        buildings = {}
        for name, fm in BUILDINGS.items():
            b, _ = Building.objects.get_or_create(name=name)
            b.facility_manager = users[fm]
            b.save()
            buildings[name] = b
        clients = []
        for name, code, bname, floors, client_users in CLIENTS:
            client, _ = Client.objects.get_or_create(name=name, office_code=code, defaults={"building": buildings[bname]})
            for pos, label in enumerate(floors):
                Floor.objects.get_or_create(client=client, label=label, defaults={"position": pos})
            for u in client_users:
                users[u].clients.add(client)
            clients.append(client)

        if opts["reset"]:
            Notification.objects.all().delete()
            Ticket.objects.all().delete()
        if Ticket.objects.exists():
            self.stdout.write("Tickets already exist - skipping (use --reset to rebuild).")
            return

        issues_by_dept = {d: list(Issue.objects.filter(department=departments[d])) for d in ISSUES}
        workers = {d: list(User.objects.filter(role="WORKER", department=departments[d])) for d in ISSUES}
        now = timezone.now()

        for i in range(opts["tickets"]):
            client = rng.choice(clients)
            dept_name = rng.choice(list(ISSUES))
            picked = rng.sample(issues_by_dept[dept_name], k=rng.choice([1, 1, 1, 2]))
            client_floors = list(client.floors.all())
            floors = client_floors if rng.random() < 0.3 else rng.sample(client_floors, k=rng.randint(1, len(client_floors)))
            client_users = list(client.users.all())
            creator = rng.choice(client_users + [client.building.facility_manager, users[POCS[dept_name]]])
            ticket = services.create_ticket(
                user=creator, client=client, issues=picked, floors=floors, description=rng.choice(DESCRIPTIONS)
            )
            poc = ticket.department.poc
            roll = rng.random()
            if roll < 0.12:  # forwarded to another department, still waiting for a worker
                other = rng.choice([d for d in ISSUES if d != dept_name])
                services.change_department(
                    ticket_id=ticket.pk, user=poc, department_id=departments[other].pk,
                    note="This falls under another team's scope. Please take over.",
                )
            elif roll >= 0.4:
                ticket.refresh_from_db()
                worker = rng.choice(workers[ticket.department.name])
                services.assign_worker(ticket_id=ticket.pk, user=ticket.department.poc, worker_id=worker.pk)
                if roll >= 0.62:
                    outcome = rng.choice(["FULLY_RESOLVED", "FULLY_RESOLVED", "PARTIALLY_RESOLVED", "SUGGEST_CHANGE"])
                    services.submit_assessment(
                        ticket_id=ticket.pk, user=worker, outcome=outcome, note="" if outcome == "FULLY_RESOLVED" else "See details."
                    )
                    if rng.random() < 0.3:
                        services.add_comment(ticket_id=ticket.pk, user=ticket.department.poc, text="Reviewing the technician's update.")
            if rng.random() < 0.25:
                services.add_comment(ticket_id=ticket.pk, user=client.building.facility_manager, text="Please prioritise this one.")
            if roll >= 0.75 and ticket.status != Ticket.Status.RESOLVED:
                resolver = creator if creator.role in ("CLIENT", "FACILITY_MANAGER") else client_users[0]
                services.resolve_ticket(ticket_id=ticket.pk, user=resolver)

            # Spread creation times over ~60 days so sorting/pagination are visible.
            base = now - timedelta(hours=rng.randint(1, 60 * 24))
            Ticket.objects.filter(pk=ticket.pk).update(created_at=base)
            for step, activity in enumerate(TicketActivity.objects.filter(ticket=ticket).order_by("id")):
                TicketActivity.objects.filter(pk=activity.pk).update(created_at=base + timedelta(minutes=5 + step * 97))
            ticket.refresh_from_db()
            if ticket.status == Ticket.Status.RESOLVED:
                last = TicketActivity.objects.filter(ticket=ticket).order_by("-created_at").first()
                Ticket.objects.filter(pk=ticket.pk).update(resolved_at=last.created_at)

        self.stdout.write(self.style.SUCCESS(f"Seeded {Ticket.objects.count()} tickets and {User.objects.count()} users."))
        self.stdout.write(f"All seeded accounts use the password from DEMO_PASSWORD. Usernames: {', '.join(u[0] for u in PEOPLE)}")

