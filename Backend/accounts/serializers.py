from rest_framework import serializers

from .models import Client, Department, Floor, User


class UserBriefSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="display_name")
    designation = serializers.CharField(source="title")

    class Meta:
        model = User
        fields = ("id", "name", "designation", "role")


class MeSerializer(UserBriefSerializer):
    department = serializers.SerializerMethodField()
    can_create_ticket = serializers.SerializerMethodField()

    class Meta(UserBriefSerializer.Meta):
        fields = UserBriefSerializer.Meta.fields + ("username", "department", "can_create_ticket")

    def get_department(self, obj):
        return {"id": obj.department_id, "name": obj.department.name} if obj.department_id else None

    def get_can_create_ticket(self, obj):
        return obj.role != User.Role.WORKER


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ("id", "name")


class FloorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Floor
        fields = ("id", "label")


class ClientSerializer(serializers.ModelSerializer):
    label = serializers.CharField(read_only=True)
    floors = FloorSerializer(many=True, read_only=True)
    property_name = serializers.CharField(source="building.name", read_only=True)
    facility_manager = serializers.SerializerMethodField()

    class Meta:
        model = Client
        fields = ("id", "name", "label", "property_name", "facility_manager", "floors")

    def get_facility_manager(self, obj):
        fm = obj.building.facility_manager
        return fm.display_name if fm else None

