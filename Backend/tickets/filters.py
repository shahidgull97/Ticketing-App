import django_filters

from .models import Ticket


class TicketFilter(django_filters.FilterSet):
    tab = django_filters.CharFilter(method="filter_tab")
    client = django_filters.NumberFilter(field_name="client_id")
    department = django_filters.NumberFilter(field_name="department_id")
    facility_manager = django_filters.NumberFilter(field_name="client__building__facility_manager_id")
    status = django_filters.ChoiceFilter(choices=Ticket.Status.choices)

    class Meta:
        model = Ticket
        fields = ["tab", "client", "department", "facility_manager", "status"]

    def filter_tab(self, queryset, name, value):
        if value == "closed":
            return queryset.filter(status=Ticket.Status.RESOLVED)
        return queryset.exclude(status=Ticket.Status.RESOLVED)

