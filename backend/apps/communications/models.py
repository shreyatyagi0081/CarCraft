from django.db import models
from django.conf import settings

class CustomerMessage(models.Model):
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_messages')
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='received_messages')
    subject = models.CharField(max_length=200)
    body = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Msg from {self.sender.username} to {self.recipient.username}: {self.subject}"


class CustomerReminder(models.Model):
    class ReminderType(models.TextChoices):
        SERVICE_DUE = 'SERVICE_DUE', 'Periodic Service Due'
        APPOINTMENT_UPCOMING = 'APPOINTMENT_UPCOMING', 'Upcoming Appointment'
        QUOTATION_EXPIRY = 'QUOTATION_EXPIRY', 'Quotation Expiration Notice'
        ORDER_STATUS = 'ORDER_STATUS', 'Order Delivery / Status Update'
        PROMOTIONAL = 'PROMOTIONAL', 'Promotional / Seasonal Offer'
        CUSTOM = 'CUSTOM', 'Custom Dealer Reminder'

    class Channel(models.TextChoices):
        IN_APP = 'IN_APP', 'In-App Notification'
        EMAIL = 'EMAIL', 'Email'
        SMS = 'SMS', 'SMS Text'
        WHATSAPP = 'WHATSAPP', 'WhatsApp'

    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reminders')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_reminders')
    reminder_type = models.CharField(max_length=30, choices=ReminderType.choices, default=ReminderType.SERVICE_DUE)
    title = models.CharField(max_length=200)
    message = models.TextField()
    scheduled_time = models.DateTimeField()
    channel = models.CharField(max_length=20, choices=Channel.choices, default=Channel.IN_APP)
    is_sent = models.BooleanField(default=False)
    sent_at = models.DateTimeField(blank=True, null=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-scheduled_time']

    def __str__(self):
        return f"Reminder [{self.get_reminder_type_display()}] for {self.customer.username} ({'Sent' if self.is_sent else 'Scheduled'})"
