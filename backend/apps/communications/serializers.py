from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import CustomerMessage, CustomerReminder
from apps.accounts.serializers import UserSerializer

User = get_user_model()


class CustomerMessageSerializer(serializers.ModelSerializer):
    sender_details = UserSerializer(source='sender', read_only=True)
    recipient_details = UserSerializer(source='recipient', read_only=True)

    class Meta:
        model = CustomerMessage
        fields = [
            'id', 'sender', 'sender_details', 'recipient', 'recipient_details',
            'subject', 'body', 'is_read', 'created_at'
        ]
        read_only_fields = ['id', 'sender', 'is_read', 'created_at']

    def get_fields(self):
        fields = super().get_fields()
        if self.instance is not None:
            fields['recipient'].read_only = True
        return fields

    def validate(self, attrs):
        if 'is_read' in self.initial_data:
            raise serializers.ValidationError({'is_read': 'Use the mark_read action to change read status.'})
        if self.instance is not None and 'recipient' in self.initial_data:
            raise serializers.ValidationError({'recipient': 'Message recipients cannot be changed.'})
        return attrs


class CustomerReminderSerializer(serializers.ModelSerializer):
    customer = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), required=False)
    customer_username = serializers.CharField(source='customer.username', read_only=True)

    class Meta:
        model = CustomerReminder
        fields = [
            'id', 'customer', 'customer_username', 'created_by', 'reminder_type',
            'title', 'message', 'scheduled_time', 'channel', 'is_sent',
            'sent_at', 'is_read', 'created_at'
        ]
        read_only_fields = ['id', 'created_by', 'is_sent', 'sent_at', 'is_read', 'created_at']

    def validate(self, attrs):
        protected_fields = {'is_sent', 'sent_at', 'is_read'}
        submitted_protected_fields = protected_fields.intersection(self.initial_data)
        if submitted_protected_fields:
            raise serializers.ValidationError({
                field: 'This field can only be changed through its authorized action.'
                for field in submitted_protected_fields
            })

        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return attrs

        customer = attrs.get('customer', getattr(self.instance, 'customer', None))
        if request.user.is_dealer:
            if self.instance is None and customer is None:
                raise serializers.ValidationError({'customer': 'A customer is required for dealer-created reminders.'})
        elif customer and customer != request.user:
            raise serializers.ValidationError({'customer': 'You can only create reminders for yourself.'})
        return attrs
