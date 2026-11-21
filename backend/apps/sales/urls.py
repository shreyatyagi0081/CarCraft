from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SalesLeadViewSet, QuotationViewSet, VehicleOrderViewSet

router = DefaultRouter()
router.register(r'leads', SalesLeadViewSet, basename='sales-lead')
router.register(r'quotations', QuotationViewSet, basename='quotation')
router.register(r'orders', VehicleOrderViewSet, basename='vehicle-order')

urlpatterns = [
    path('', include(router.urls)),
]
