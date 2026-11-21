from rest_framework import viewsets, permissions, status, filters
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from decimal import Decimal

from .models import PartCategory, PartProduct, Cart, CartItem, Order, OrderItem
from .serializers import (
    PartCategorySerializer,
    PartProductSerializer,
    CartSerializer,
    CartItemSerializer,
    CartAddSerializer,
    CartUpdateSerializer,
    RestockSerializer,
    OrderSerializer,
    CheckoutSerializer
)
from apps.accounts.permissions import IsDealerUser

class PartCategoryViewSet(viewsets.ModelViewSet):
    queryset = PartCategory.objects.all()
    serializer_class = PartCategorySerializer
    search_fields = ['name', 'description']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsDealerUser()]
        return [permissions.AllowAny()]


class PartProductViewSet(viewsets.ModelViewSet):
    serializer_class = PartProductSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        'category': ['exact'],
        'brand': ['exact'],
        'is_universal_fit': ['exact'],
        'compatible_models': ['exact'],
        'price': ['gte', 'lte'],
        'stock_quantity': ['gte', 'lte'],
        'is_active': ['exact'],
    }
    search_fields = ['name', 'sku', 'part_number', 'brand', 'description']
    ordering_fields = ['price', 'stock_quantity', 'created_at']

    def get_queryset(self):
        user = self.request.user
        if user and user.is_authenticated and user.is_dealer:
            return PartProduct.objects.all().select_related('category').prefetch_related('compatible_models')
        return PartProduct.objects.filter(is_active=True).select_related('category').prefetch_related('compatible_models')

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'restock']:
            return [permissions.IsAuthenticated(), IsDealerUser()]
        return [permissions.AllowAny()]

    @action(detail=True, methods=['patch'], permission_classes=[permissions.IsAuthenticated, IsDealerUser])
    def restock(self, request, pk=None):
        product = self.get_object()
        serializer = RestockSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        quantity_to_add = serializer.validated_data['quantity']
        product.stock_quantity += quantity_to_add
        product.save()
        return Response({
            'message': f"Product {product.name} restocked successfully.",
            'new_stock_quantity': product.stock_quantity
        })


class CartView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        cart, _ = Cart.objects.get_or_create(user=request.user)
        serializer = CartSerializer(cart)
        return Response(serializer.data)

    def post(self, request):
        """Add item to cart or increment quantity"""
        serializer = CartAddSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        cart, _ = Cart.objects.get_or_create(user=request.user)
        product_id = serializer.validated_data['product_id']
        quantity = serializer.validated_data['quantity']

        try:
            product = PartProduct.objects.get(id=product_id, is_active=True)
        except PartProduct.DoesNotExist:
            return Response({'error': 'Product not found or inactive.'}, status=status.HTTP_404_NOT_FOUND)

        if product.stock_quantity < quantity:
            return Response({'error': f'Only {product.stock_quantity} units available in stock.'}, status=status.HTTP_400_BAD_REQUEST)

        cart_item, created = CartItem.objects.get_or_create(cart=cart, product=product)
        if not created:
            cart_item.quantity += quantity
        else:
            cart_item.quantity = quantity
        cart_item.save()

        serializer = CartSerializer(cart)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request):
        """Update specific cart item quantity"""
        serializer = CartUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        cart, _ = Cart.objects.get_or_create(user=request.user)
        product_id = serializer.validated_data['product_id']
        quantity = serializer.validated_data['quantity']

        try:
            cart_item = CartItem.objects.get(cart=cart, product_id=product_id)
        except CartItem.DoesNotExist:
            return Response({'error': 'Item not in cart.'}, status=status.HTTP_404_NOT_FOUND)

        if quantity <= 0:
            cart_item.delete()
        else:
            if cart_item.product.stock_quantity < quantity:
                return Response({'error': f'Only {cart_item.product.stock_quantity} in stock.'}, status=status.HTTP_400_BAD_REQUEST)
            cart_item.quantity = quantity
            cart_item.save()

        serializer = CartSerializer(cart)
        return Response(serializer.data)

    def delete(self, request):
        """Remove item or clear cart"""
        cart, _ = Cart.objects.get_or_create(user=request.user)
        product_id = request.query_params.get('product_id')

        if product_id:
            CartItem.objects.filter(cart=cart, product_id=product_id).delete()
        else:
            cart.items.all().delete()

        serializer = CartSerializer(cart)
        return Response(serializer.data)


class CheckoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        cart, _ = Cart.objects.get_or_create(user=request.user)
        cart_items = cart.items.select_related('product').all()

        if not cart_items.exists():
            return Response({'error': 'Your cart is empty.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = CheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Verify stock and calculate subtotal
        subtotal = Decimal('0.00')
        for item in cart_items:
            if item.product.stock_quantity < item.quantity:
                return Response({
                    'error': f"Insufficient stock for '{item.product.name}'. Available: {item.product.stock_quantity}, Requested: {item.quantity}"
                }, status=status.HTTP_400_BAD_REQUEST)
            subtotal += item.product.effective_price * item.quantity

        shipping_fee = Decimal('15.00') if subtotal < Decimal('200.00') else Decimal('0.00')
        tax_amount = subtotal * Decimal('0.08')  # 8% parts sales tax
        total_amount = subtotal + shipping_fee + tax_amount

        # Create Order
        order = Order.objects.create(
            customer=request.user,
            shipping_full_name=data['shipping_full_name'],
            shipping_address=data['shipping_address'],
            shipping_city=data['shipping_city'],
            shipping_state=data['shipping_state'],
            shipping_zip_code=data['shipping_zip_code'],
            shipping_phone=data['shipping_phone'],
            subtotal=subtotal,
            shipping_fee=shipping_fee,
            tax_amount=tax_amount,
            total_amount=total_amount,
            payment_method=data.get('payment_method', Order.PaymentMethod.CARD),
            payment_status=Order.PaymentStatus.PENDING,
            fulfillment_status=Order.FulfillmentStatus.PROCESSING,
            notes=data.get('notes', '')
        )

        # Create Order Items and deduct inventory
        for item in cart_items:
            OrderItem.objects.create(
                order=order,
                product=item.product,
                product_name=item.product.name,
                sku=item.product.sku,
                unit_price=item.product.effective_price,
                quantity=item.quantity,
                subtotal=item.product.effective_price * item.quantity
            )
            item.product.stock_quantity -= item.quantity
            item.product.save()

        # Clear cart
        cart.items.all().delete()

        order_serializer = OrderSerializer(order)
        return Response({
            'message': 'Order placed successfully!',
            'order': order_serializer.data
        }, status=status.HTTP_201_CREATED)


class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['fulfillment_status', 'payment_status', 'payment_method']
    search_fields = ['order_number', 'shipping_full_name', 'tracking_number']
    ordering_fields = ['created_at', 'total_amount']

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Order.objects.none()
        if user.is_dealer:
            return Order.objects.all().prefetch_related('items', 'items__product')
        return Order.objects.filter(customer=user).prefetch_related('items', 'items__product')

    def get_permissions(self):
        if self.action in ['create', 'update_shipping', 'destroy']:
            return [permissions.IsAuthenticated(), IsDealerUser()]
        return [permissions.IsAuthenticated()]

    @action(detail=True, methods=['patch'], permission_classes=[permissions.IsAuthenticated, IsDealerUser])
    def update_shipping(self, request, pk=None):
        order = self.get_object()
        carrier = request.data.get('shipping_carrier')
        tracking = request.data.get('tracking_number')
        status_val = request.data.get('fulfillment_status')
        delivery_date = request.data.get('estimated_delivery_date')

        if carrier:
            order.shipping_carrier = carrier
        if tracking:
            order.tracking_number = tracking
        if delivery_date:
            order.estimated_delivery_date = delivery_date
        if status_val and status_val in Order.FulfillmentStatus.values:
            order.fulfillment_status = status_val

        order.save()
        return Response({
            'message': 'Shipping information updated successfully.',
            'order_number': order.order_number,
            'fulfillment_status': order.fulfillment_status,
            'carrier': order.shipping_carrier,
            'tracking_number': order.tracking_number
        })
