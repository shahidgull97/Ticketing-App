from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("tickets", views.TicketViewSet, basename="ticket")

urlpatterns = [
    path("", include(router.urls)),
    path("issues/", views.IssueListView.as_view(), name="issues"),
    path("ticket-filters/", views.FilterOptionsView.as_view(), name="ticket-filters"),
    path("clients/<int:client_id>/quick-issues/", views.QuickIssueListView.as_view(), name="quick-issues"),
    path("notifications/", views.NotificationListView.as_view(), name="notifications"),
    path("notifications/mark-read/", views.NotificationMarkReadView.as_view(), name="notifications-mark-read"),
]
