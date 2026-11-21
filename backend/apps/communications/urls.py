from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CustomerMessageViewSet, CustomerReminderViewSet

router = DefaultRouter()
router.register(r'messages', CustomerMessageViewSet, basename='customer-message')
router.register(r'reminders', CustomerReminderViewSet, basename='customer-reminder')

urlpatterns = [
    path('', include(router.urls)),
]
