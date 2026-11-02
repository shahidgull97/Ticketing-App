from django.contrib import admin

from .models import Issue, Notification, Ticket, TicketActivity

admin.site.register(Issue)
admin.site.register(Notification)


class ActivityInline(admin.TabularInline):
    model = TicketActivity
    extra = 0


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ("id", "issue_text", "client", "department", "status", "created_at")
    list_filter = ("status", "department")
    inlines = [ActivityInline]

