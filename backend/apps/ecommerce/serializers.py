from rest_framework import serializers
from .models import PartCategory, PartProduct, Cart, CartItem, Order, OrderItem
from apps.vehicles.serializers import VehicleModelSerializer

class PartCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = PartCategory
        fields = ['id', 'name', 'slug', 'description', 'image', 'parent', 'created_at']


class PartProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    effective_price = serializers.ReadOnlyField()
    is_in_stock = serializers.ReadOnlyField()
    is_low_stock = serializers.ReadOnlyField()

    class Meta:
        model = PartProduct
        fields = [
            'id', 'sku', 'part_number', 'name', 'category', 'category_name',
            'compatible_models', 'is_universal_fit', 'brand', 'cost_price',
            'price', 'discount_price', 'effective_price', 'stock_quantity',
            'low_stock_threshold', 'weight_kg', 'image', 'image_url',
            'description', 'specifications', 'is_active', 'is_in_stock',
            'is_low_stock', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        request = self.context.get('request')
        # Mask cost_price for non-dealers
        if not request or not request.user.is_authenticated or not request.user.is_dealer:
            ret.pop('cost_price', None)
        return ret


class CartAddSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1, default=1)


class CartUpdateSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=0, default=1)


class RestockSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=1)


class CartItemSerializer(serializers.ModelSerializer):
    product = PartProductSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=PartProduct.objects.filter(is_active=True), source='product', write_only=True
    )
    subtotal = serializers.ReadOnlyField()

    class Meta:
        model = CartItem
        fields = ['id', 'product', 'product_id', 'quantity', 'subtotal']


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total_items = serializers.ReadOnlyField()
    subtotal = serializers.ReadOnlyField()

    class Meta:
        model = Cart
        fields = ['id', 'items', 'total_items', 'subtotal', 'updated_at']


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'product_name', 'sku', 'unit_price', 'quantity', 'subtotal']


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    customer_username = serializers.CharField(source='customer.username', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'customer', 'customer_username',
            'shipping_full_name', 'shipping_address', 'shipping_city',
            'shipping_state', 'shipping_zip_code', 'shipping_phone',
            'subtotal', 'shipping_fee', 'tax_amount', 'total_amount',
            'payment_method', 'payment_status', 'fulfillment_status',
            'shipping_carrier', 'tracking_number', 'estimated_delivery_date',
            'notes', 'items', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'order_number', 'subtotal', 'tax_amount', 'total_amount', 'created_at', 'updated_at']

    def validate(self, attrs):
        request = self.context.get('request')
        if request and request.user.is_authenticated and not request.user.is_dealer:
            if self.instance is None:
                raise serializers.ValidationError({'detail': 'Orders must be placed through checkout.'})

            protected_fields = {
                'customer', 'subtotal', 'shipping_fee', 'tax_amount', 'total_amount',
                'payment_method', 'payment_status', 'fulfillment_status', 'shipping_carrier',
                'tracking_number', 'estimated_delivery_date',
            }
            submitted_fields = protected_fields.intersection(self.initial_data)
            if submitted_fields:
                raise serializers.ValidationError({
                    field: 'Only dealership staff can change this order field.'
                    for field in submitted_fields
                })
        return attrs


class CheckoutSerializer(serializers.Serializer):
    shipping_full_name = serializers.CharField(max_length=150)
    shipping_address = serializers.CharField(max_length=255)
    shipping_city = serializers.CharField(max_length=100)
    shipping_state = serializers.CharField(max_length=100)
    shipping_zip_code = serializers.CharField(max_length=20)
    shipping_phone = serializers.CharField(max_length=20)
    payment_method = serializers.ChoiceField(choices=Order.PaymentMethod.choices, default=Order.PaymentMethod.CARD)
    notes = serializers.CharField(required=False, allow_blank=True)
