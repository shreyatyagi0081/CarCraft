from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import VehicleMakeViewSet, VehicleModelViewSet, VehicleViewSet

router = DefaultRouter()
router.register(r'makes', VehicleMakeViewSet, basename='vehicle-make')
router.register(r'models', VehicleModelViewSet, basename='vehicle-model')
router.register(r'inventory', VehicleViewSet, basename='vehicle-inventory')

urlpatterns = [
    path('', include(router.urls)),
]
