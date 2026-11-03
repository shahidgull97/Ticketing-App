from rest_framework import serializers

from accounts.models import Client, Floor
from accounts.serializers import UserBriefSerializer
from accounts.views import clients_for_user

from . import services
from .models import Issue, Notification, Ticket, TicketActivity


class IssueSerializer(serializers.ModelSerializer):
    department = serializers.CharField(source="department.name", read_only=True)
    department_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = Issue
        fields = ("id", "name", "department", "department_id")


class ActivitySerializer(serializers.ModelSerializer):
    actor = serializers.SerializerMethodField()
    type_label = serializers.CharField(source="get_type_display", read_only=True)
    is_comment = serializers.BooleanField(read_only=True)

    class Meta:
        model = TicketActivity
        fields = ("id", "type", "type_label", "is_comment", "actor", "from_value", "to_value", "message", "created_at")

    def get_actor(self, obj):
        if obj.actor is None:
            return {"id": None, "name": "System", "designation": ""}
        return {"id": obj.actor_id, "name": obj.actor.display_name, "designation": obj.actor.title}


class TicketListSerializer(serializers.ModelSerializer):
    number = serializers.CharField(read_only=True)
    title = serializers.CharField(source="issue_text", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    client = serializers.SerializerMethodField()
    department = serializers.SerializerMethodField()
    facility_manager = serializers.SerializerMethodField()
    floors = serializers.SerializerMethodField()
    created_by = UserBriefSerializer(read_only=True)
    assignees = serializers.SerializerMethodField()
    action_required = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = (
            "id", "number", "title", "status", "status_label", "client", "department", "facility_manager",
            "floors", "created_by", "created_at", "assignees", "action_required",
        )

    def get_client(self, obj):
        return {"id": obj.client_id, "name": obj.client.name, "label": obj.client.label}

    def get_department(self, obj):
        return {"id": obj.department_id, "name": obj.department.name}

    def get_facility_manager(self, obj):
        fm = obj.client.building.facility_manager
        return {"id": fm.pk, "name": fm.display_name} if fm else None

    def get_floors(self, obj):
        floors = list(obj.floors.all())  # prefetched
        total = getattr(obj, "client_floor_count", None)
        if total and total > 1 and len(floors) == total:
            return "All Floors"
        return ", ".join(f.label for f in floors)

    def get_assignees(self, obj):
        people = [obj.assigned_poc, obj.assigned_worker]
        return [{"id": u.pk, "name": u.display_name, "designation": u.title, "role": u.role} for u in people if u]

    def get_action_required(self, obj):
        user = self.context["request"].user
        return bool({"assign_worker", "submit_assessment"} & set(services.available_actions(obj, user)))


class TicketDetailSerializer(TicketListSerializer):
    issues = IssueSerializer(many=True, read_only=True)
    activities = ActivitySerializer(many=True, read_only=True)
    available_actions = serializers.SerializerMethodField()
    assessment_outcome = serializers.CharField(read_only=True)

    class Meta(TicketListSerializer.Meta):
        fields = TicketListSerializer.Meta.fields + (
            "description", "issues", "activities", "available_actions", "assessment_outcome", "resolved_at",
        )

    def get_available_actions(self, obj):
        return services.available_actions(obj, self.context["request"].user)


class TicketCreateSerializer(serializers.Serializer):
    client = serializers.PrimaryKeyRelatedField(queryset=Client.objects.all(), required=False)
    issues = serializers.PrimaryKeyRelatedField(
        queryset=Issue.objects.filter(is_active=True).select_related("department__poc"),
        many=True,
        allow_empty=False,
        error_messages={"empty": "Select at least one issue.", "required": "Select at least one issue."},
    )
    floors = serializers.PrimaryKeyRelatedField(queryset=Floor.objects.all(), many=True, required=False)
    description = serializers.CharField(required=False, allow_blank=True, max_length=2000)

    def validate(self, data):
        user = self.context["request"].user
        allowed = clients_for_user(user)
        client = data.get("client")
        if client is None:
            # Single-client users don't have to send it.
            if allowed.count() == 1:
                client = allowed.first()
            else:
                raise serializers.ValidationError({"client": ["Select a client."]})
        elif not allowed.filter(pk=client.pk).exists():
            raise serializers.ValidationError({"client": ["You cannot raise tickets for this client."]})

        issues = list(dict.fromkeys(data["issues"]))
        if len({i.department_id for i in issues}) > 1:
            raise serializers.ValidationError(
                {"issues": ["Selected issues belong to different departments. Raise them as separate tickets."]}
            )
        if not issues[0].department.poc_id:
            raise serializers.ValidationError({"issues": ["The department for this issue has no POC configured."]})

        client_floors = list(client.floors.all())
        floors = list(dict.fromkeys(data.get("floors", [])))
        if len(client_floors) == 1:
            floors = client_floors
        elif not floors:
            raise serializers.ValidationError({"floors": ["Select at least one floor."]})
        elif any(f.client_id != client.pk for f in floors):
            raise serializers.ValidationError({"floors": ["Selected floors do not belong to this client."]})
        data.update(client=client, issues=issues, floors=floors, description=data.get("description", "").strip())
        return data

    def create(self, validated):
        return services.create_ticket(user=self.context["request"].user, **validated)


class CommentSerializer(serializers.Serializer):
    text = serializers.CharField(max_length=2000, trim_whitespace=True)


class AssignWorkerSerializer(serializers.Serializer):
    worker = serializers.IntegerField(error_messages={"required": "Select a worker.", "invalid": "Select a worker."})


class ChangeDepartmentSerializer(serializers.Serializer):
    department = serializers.IntegerField(error_messages={"required": "Select a department.", "invalid": "Select a department."})
    note = serializers.CharField(max_length=1000, error_messages={"blank": "A forwarding note is required.", "required": "A forwarding note is required."})


class AssessmentSerializer(serializers.Serializer):
    outcome = serializers.ChoiceField(
        choices=Ticket.Outcome.choices, error_messages={"required": "Choose one of the assessment options.", "invalid_choice": "Choose one of the assessment options."}
    )
    note = serializers.CharField(required=False, allow_blank=True, max_length=1000)


class NotificationSerializer(serializers.ModelSerializer):
    ticket_id = serializers.IntegerField(read_only=True)
    ticket_number = serializers.CharField(source="ticket.number", read_only=True)
    ticket_title = serializers.CharField(source="ticket.issue_text", read_only=True)
    actor_name = serializers.SerializerMethodField()
    activity_type = serializers.CharField(source="activity.type", read_only=True)
    is_read = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = (
            "id",
            "ticket_id",
            "ticket_number",
            "ticket_title",
            "activity_type",
            "actor_name",
            "message",
            "created_at",
            "delivered_at",
            "is_read",
        )

    def get_actor_name(self, obj):
        actor = obj.activity.actor
        return actor.display_name if actor else "System"

    def get_is_read(self, obj):
        return obj.read_at is not None
