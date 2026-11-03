from django.db.models import Count, Prefetch
from django.shortcuts import get_object_or_404
from rest_framework import generics, mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Client, Department, Floor, User
from accounts.views import clients_for_user

from . import services
from .filters import TicketFilter
from .models import Issue, Notification, Ticket, TicketActivity
from .serializers import (
    ActivitySerializer, AssessmentSerializer, AssignWorkerSerializer, ChangeDepartmentSerializer,
    CommentSerializer, IssueSerializer, NotificationSerializer, TicketCreateSerializer, TicketDetailSerializer, TicketListSerializer,
)


class TicketViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    filterset_class = TicketFilter
    search_fields = ["issue_text"]
    ordering_fields = ["created_at"]
    ordering = ["-created_at", "-id"]

    def get_queryset(self):
        """Visibility is enforced here, for every action (list, detail, and all state-changing actions).

        Query optimisation: select_related for the to-one joins rendered on every card, prefetch for the
        to-many floors, and an aggregate (floor count) so "All Floors" needs no extra query per row.
        """
        return self._optimise(services.visible_tickets(self.request.user), detail=self.action == "retrieve")

    @staticmethod
    def _optimise(qs, detail=False):
        qs = (
            qs.select_related("client__building__facility_manager", "department", "created_by", "assigned_poc", "assigned_worker")
            .prefetch_related(Prefetch("floors", queryset=Floor.objects.order_by("position", "id")))
            .annotate(client_floor_count=Count("client__floors", distinct=True))
        )
        if detail:
            qs = qs.prefetch_related(
                "issues__department",
                Prefetch("activities", queryset=TicketActivity.objects.select_related("actor").order_by("created_at", "id")),
            )
        return qs

    def get_serializer_class(self):
        if self.action == "create":
            return TicketCreateSerializer
        return TicketDetailSerializer if self.action == "retrieve" else TicketListSerializer

    def _detail(self, request, pk, http_status=status.HTTP_200_OK):
        # Not re-filtered by visibility: the caller was just authorised to act, and the action itself
        # (e.g. forwarding to another department) may legitimately remove the ticket from their view.
        ticket = self._optimise(Ticket.objects.all(), detail=True).get(pk=pk)
        return Response(TicketDetailSerializer(ticket, context=self.get_serializer_context()).data, status=http_status)

    def create(self, request, *args, **kwargs):
        if request.user.role == "WORKER":
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Workers cannot create tickets.")
        serializer = TicketCreateSerializer(data=request.data, context=self.get_serializer_context())
        serializer.is_valid(raise_exception=True)
        ticket = serializer.save()
        return self._detail(request, ticket.pk, status.HTTP_201_CREATED)

    def _act(self, request, pk, serializer_cls, fn, **extra):
        self.get_object()  # 404 if the user cannot see the ticket; also runs object permissions
        data = serializer_cls(data=request.data) if serializer_cls else None
        if data is not None:
            data.is_valid(raise_exception=True)
        fn(ticket_id=pk, user=request.user, **(data.validated_data if data is not None else {}), **extra)
        return self._detail(request, pk)

    @action(detail=True, methods=["post"], url_path="assign-worker")
    def assign_worker(self, request, pk=None):
        return self._act(request, pk, AssignWorkerSerializer, lambda **kw: services.assign_worker(
            ticket_id=kw["ticket_id"], user=kw["user"], worker_id=kw["worker"]))

    @action(detail=True, methods=["post"], url_path="change-department")
    def change_department(self, request, pk=None):
        return self._act(request, pk, ChangeDepartmentSerializer, lambda **kw: services.change_department(
            ticket_id=kw["ticket_id"], user=kw["user"], department_id=kw["department"], note=kw["note"]))

    @action(detail=True, methods=["post"], url_path="submit-assessment")
    def submit_assessment(self, request, pk=None):
        return self._act(request, pk, AssessmentSerializer, lambda **kw: services.submit_assessment(
            ticket_id=kw["ticket_id"], user=kw["user"], outcome=kw["outcome"], note=kw.get("note", "")))

    @action(detail=True, methods=["post"])
    def resolve(self, request, pk=None):
        return self._act(request, pk, None, services.resolve_ticket)

    @action(detail=True, methods=["post"])
    def comments(self, request, pk=None):
        self.get_object()
        serializer = CommentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        activity = services.add_comment(ticket_id=pk, user=request.user, text=serializer.validated_data["text"])
        activity = TicketActivity.objects.select_related("actor").get(pk=activity.pk)
        return Response(ActivitySerializer(activity).data, status=status.HTTP_201_CREATED)


class FilterOptionsView(APIView):
    """Values for the list filters, limited to what the current user can actually see."""

    def get(self, request):
        visible_ids = services.visible_tickets(request.user).values("pk")
        clients = Client.objects.filter(tickets__in=visible_ids).distinct().order_by("name")
        departments = Department.objects.filter(tickets__in=visible_ids).distinct().order_by("name")
        fms = User.objects.filter(
            role=User.Role.FACILITY_MANAGER, managed_buildings__clients__tickets__in=visible_ids
        ).distinct().order_by("first_name")
        return Response(
            {
                "clients": [{"id": c.pk, "name": c.label} for c in clients],
                "departments": [{"id": d.pk, "name": d.name} for d in departments],
                "facility_managers": [{"id": u.pk, "name": u.display_name} for u in fms],
                "statuses": [{"id": v, "name": l} for v, l in Ticket.Status.choices],
            }
        )


class IssueListView(generics.ListAPIView):
    serializer_class = IssueSerializer
    pagination_class = None
    search_fields = ["name"]
    filterset_class = None

    def get_queryset(self):
        return Issue.objects.filter(is_active=True).select_related("department").order_by("name")


class QuickIssueListView(generics.ListAPIView):
    serializer_class = IssueSerializer
    pagination_class = None

    def get_queryset(self):
        client = get_object_or_404(clients_for_user(self.request.user), pk=self.kwargs["client_id"])
        return services.quick_issues(client)

    def filter_queryset(self, queryset):
        return queryset


class NotificationListView(APIView):
    """Returns recent Celery-delivered notifications for the authenticated user + unread count."""

    def get(self, request):
        qs = (
            Notification.objects.filter(recipient=request.user, delivered_at__isnull=False)
            .select_related("ticket", "activity__actor")
            .order_by("-created_at")
        )
        unread_count = qs.filter(read_at__isnull=True).count()
        items = qs[:25]
        return Response({"unread_count": unread_count, "results": NotificationSerializer(items, many=True).data})


class NotificationMarkReadView(APIView):
    """Marks all (or one) of the user's notifications as read."""

    def post(self, request):
        from django.utils import timezone

        qs = Notification.objects.filter(recipient=request.user, read_at__isnull=True)
        notif_id = request.data.get("id")
        if notif_id:
            qs = qs.filter(pk=notif_id)
        updated = qs.update(read_at=timezone.now())
        return Response({"marked_read": updated})
