from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from django.utils import timezone

from .models import CustomerMessage, CustomerReminder
from .serializers import CustomerMessageSerializer, CustomerReminderSerializer
from apps.accounts.permissions import IsDealerUser


class IsMessageSender(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.sender_id == request.user.id


class CustomerMessageViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerMessageSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['subject', 'body', 'sender__username', 'recipient__username']
    ordering_fields = ['created_at']

    def get_permissions(self):
        if self.action in ['update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsMessageSender()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return CustomerMessage.objects.none()
        return CustomerMessage.objects.filter(Q(sender=user) | Q(recipient=user)).select_related('sender', 'recipient')

    def perform_create(self, serializer):
        serializer.save(sender=self.request.user)

    @action(detail=True, methods=['patch'])
    def mark_read(self, request, pk=None):
        msg = self.get_object()
        if msg.recipient == request.user:
            msg.is_read = True
            msg.save()
            return Response({'status': 'Message marked as read.'})
        return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)


class CustomerReminderViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerReminderSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['reminder_type', 'channel', 'is_sent', 'is_read', 'customer']
    search_fields = ['title', 'message', 'customer__username']

    def get_permissions(self):
        if self.action in ['update', 'partial_update', 'destroy', 'trigger_send']:
            return [permissions.IsAuthenticated(), IsDealerUser()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return CustomerReminder.objects.none()
        if user.is_dealer:
            return CustomerReminder.objects.all().select_related('customer')
        return CustomerReminder.objects.filter(customer=user)

    def perform_create(self, serializer):
        if self.request.user.is_dealer:
            serializer.save(created_by=self.request.user)
        else:
            serializer.save(customer=self.request.user, created_by=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsDealerUser])
    def trigger_send(self, request, pk=None):
        reminder = self.get_object()
        reminder.is_sent = True
        reminder.sent_at = timezone.now()
        reminder.save()
        return Response({
            'message': 'Reminder marked as sent. No external delivery provider is configured.',
            'sent_at': reminder.sent_at
        })

    @action(detail=True, methods=['patch'])
    def mark_read(self, request, pk=None):
        reminder = self.get_object()
        if reminder.customer == request.user or request.user.is_dealer:
            reminder.is_read = True
            reminder.save()
            return Response({'status': 'Reminder marked as read.'})
        return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
