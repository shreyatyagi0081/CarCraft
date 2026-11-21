from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ServiceSkillViewSet,
    TechnicianProfileViewSet,
    ServiceTypeViewSet,
    ServiceAppointmentViewSet,
    ServiceHistoryViewSet,
    MaintenanceRecommendationViewSet
)

router = DefaultRouter()
router.register(r'skills', ServiceSkillViewSet, basename='service-skill')
router.register(r'technicians', TechnicianProfileViewSet, basename='technician-profile')
router.register(r'service-types', ServiceTypeViewSet, basename='service-type')
router.register(r'appointments', ServiceAppointmentViewSet, basename='service-appointment')
router.register(r'history', ServiceHistoryViewSet, basename='service-history')
router.register(r'recommendations', MaintenanceRecommendationViewSet, basename='maintenance-recommendation')

urlpatterns = [
    path('', include(router.urls)),
]
