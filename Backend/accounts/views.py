from django.conf import settings
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Client, Department, User
from .serializers import ClientSerializer, DepartmentSerializer, MeSerializer, UserBriefSerializer


def clients_for_user(user):
    """Clients on whose behalf `user` may raise tickets."""
    qs = Client.objects.select_related("building__facility_manager").prefetch_related("floors")
    if user.role == User.Role.CLIENT:
        return qs.filter(users=user)
    if user.role == User.Role.FACILITY_MANAGER:
        return qs.filter(building__facility_manager=user)
    if user.role == User.Role.DEPARTMENT_POC:
        return qs
    return qs.none()


class HealthView(APIView):
    """Liveness/readiness probe for load balancers: verifies the database is reachable."""

    permission_classes = [permissions.AllowAny]
    authentication_classes: list = []

    def get(self, request):
        from django.db import connection

        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        return Response({"status": "ok"})


class MeView(APIView):
    def get(self, request):
        return Response(MeSerializer(request.user).data)


class DemoAccountsView(APIView):
    """Public list of seeded accounts for the account switcher. Only active when DEMO_MODE=true."""

    permission_classes = [permissions.AllowAny]
    authentication_classes: list = []

    def get(self, request):
        if not settings.DEMO_MODE:
            return Response({"enabled": False, "accounts": []})
        users = User.objects.filter(is_active=True, is_staff=False).select_related("department").order_by("role", "id")
        accounts = [
            {"username": u.username, "name": u.display_name, "designation": u.title, "role": u.role} for u in users
        ]
        return Response({"enabled": True, "password": settings.DEMO_PASSWORD, "accounts": accounts})


class ClientListView(generics.ListAPIView):
    serializer_class = ClientSerializer
    pagination_class = None

    def get_queryset(self):
        return clients_for_user(self.request.user)


class DepartmentListView(generics.ListAPIView):
    serializer_class = DepartmentSerializer
    queryset = Department.objects.all()
    pagination_class = None


class FacilityManagerListView(generics.ListAPIView):
    serializer_class = UserBriefSerializer
    queryset = User.objects.filter(role=User.Role.FACILITY_MANAGER).order_by("first_name")
    pagination_class = None


class WorkerListView(generics.ListAPIView):
    """Workers of a department (used by the POC's 'Assign Worker' control). POC/FM only."""

    serializer_class = UserBriefSerializer
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        if user.role != User.Role.DEPARTMENT_POC:
            return User.objects.none()
        return User.objects.filter(role=User.Role.WORKER, department=user.department, is_active=True).order_by(
            "first_name"
        )
