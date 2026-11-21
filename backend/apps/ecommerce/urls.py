from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PartCategoryViewSet,
    PartProductViewSet,
    CartView,
    CheckoutView,
    OrderViewSet
)

router = DefaultRouter()
router.register(r'categories', PartCategoryViewSet, basename='part-category')
router.register(r'products', PartProductViewSet, basename='part-product')
router.register(r'orders', OrderViewSet, basename='ecommerce-order')

urlpatterns = [
    path('cart/', CartView.as_view(), name='cart_detail'),
    path('checkout/', CheckoutView.as_view(), name='checkout'),
    path('', include(router.urls)),
]
