from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models import Q


class Department(models.Model):
    name = models.CharField(max_length=80, unique=True)
    # The Point-of-Contact who receives every new ticket of this department.
    poc = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="poc_of_departments"
    )

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Building(models.Model):
    """A managed Property. Exactly one Facility Manager takes care of it."""

    name = models.CharField(max_length=120, unique=True)
    facility_manager = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="managed_buildings"
    )

    class Meta:
        verbose_name = "property"
        verbose_name_plural = "properties"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Client(models.Model):
    """A client company with an office inside a Property."""

    name = models.CharField(max_length=120)
    office_code = models.CharField(max_length=30)
    building = models.ForeignKey(Building, on_delete=models.PROTECT, related_name="clients")

    class Meta:
        ordering = ["name"]
        constraints = [models.UniqueConstraint(fields=["name", "office_code"], name="uniq_client_office")]

    @property
    def label(self):
        return f"{self.name}-{self.office_code}"

    def __str__(self):
        return self.label


class Floor(models.Model):
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name="floors")
    label = models.CharField(max_length=30)
    position = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["position", "id"]
        constraints = [models.UniqueConstraint(fields=["client", "label"], name="uniq_floor_per_client")]

    def __str__(self):
        return f"{self.client.label} / {self.label}"


class User(AbstractUser):
    class Role(models.TextChoices):
        CLIENT = "CLIENT", "Client"
        FACILITY_MANAGER = "FACILITY_MANAGER", "Facility Manager"
        DEPARTMENT_POC = "DEPARTMENT_POC", "Department POC"
        WORKER = "WORKER", "Worker"

    role = models.CharField(max_length=20, choices=Role.choices)
    designation = models.CharField(max_length=80, blank=True)
    department = models.ForeignKey(Department, null=True, blank=True, on_delete=models.PROTECT, related_name="members")
    # Clients a CLIENT-role user belongs to (a user may be mapped to several).
    clients = models.ManyToManyField(Client, blank=True, related_name="users")

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=~Q(role__in=["DEPARTMENT_POC", "WORKER"]) | Q(department__isnull=False),
                name="poc_and_worker_require_department",
            )
        ]

    @property
    def display_name(self):
        return self.get_full_name() or self.username

    @property
    def title(self):
        return self.designation or self.get_role_display()

    def __str__(self):
        return f"{self.display_name} ({self.title})"

