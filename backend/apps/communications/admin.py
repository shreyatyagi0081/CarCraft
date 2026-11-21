from django.contrib import admin
from .models import CustomerMessage, CustomerReminder

@admin.register(CustomerMessage)
class CustomerMessageAdmin(admin.ModelAdmin):
    list_display = ['sender', 'recipient', 'subject', 'is_read', 'created_at']
    list_filter = ['is_read', 'created_at']
    search_fields = ['subject', 'body', 'sender__username', 'recipient__username']

@admin.register(CustomerReminder)
class CustomerReminderAdmin(admin.ModelAdmin):
    list_display = ['title', 'customer', 'reminder_type', 'channel', 'scheduled_time', 'is_sent', 'is_read']
    list_filter = ['reminder_type', 'channel', 'is_sent', 'is_read']
    search_fields = ['title', 'message', 'customer__username']
