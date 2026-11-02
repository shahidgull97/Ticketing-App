from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Building, Client, Department, Floor, User

admin.site.register(Department)
admin.site.register(Building)
admin.site.register(Client)
admin.site.register(Floor)


@admin.register(User)
class AppUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (("Ticketing", {"fields": ("role", "designation", "department", "clients")}),)
    list_display = ("username", "first_name", "last_name", "role", "department")

