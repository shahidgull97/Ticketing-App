from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from . import views

urlpatterns = [
    path("health/", views.HealthView.as_view(), name="health"),
    path("auth/token/", TokenObtainPairView.as_view(), name="token"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("auth/me/", views.MeView.as_view(), name="me"),
    path("auth/demo-accounts/", views.DemoAccountsView.as_view(), name="demo-accounts"),
    path("clients/", views.ClientListView.as_view(), name="clients"),
    path("departments/", views.DepartmentListView.as_view(), name="departments"),
    path("facility-managers/", views.FacilityManagerListView.as_view(), name="facility-managers"),
    path("workers/", views.WorkerListView.as_view(), name="workers"),
]
