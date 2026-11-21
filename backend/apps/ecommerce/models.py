import uuid
from django.db import models
from django.conf import settings
from apps.vehicles.models import VehicleModel

def generate_parts_order_number():
    return f"ORD-PRT-{uuid.uuid4().hex[:8].upper()}"


class PartCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True)
    description = models.TextField(blank=True, null=True)
    image = models.ImageField(upload_to='parts/categories/', blank=True, null=True)
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='subcategories')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'Part Categories'
        ordering = ['name']

    def __str__(self):
        return self.name


class PartProduct(models.Model):
    sku = models.CharField(max_length=50, unique=True, verbose_name="SKU")
    part_number = models.CharField(max_length=100, blank=True, null=True, help_text="OEM or Manufacturer Part #")
    name = models.CharField(max_length=200)
    category = models.ForeignKey(PartCategory, on_delete=models.CASCADE, related_name='products')
    compatible_models = models.ManyToManyField(VehicleModel, blank=True, related_name='compatible_parts')
    is_universal_fit = models.BooleanField(default=False)
    brand = models.CharField(max_length=100, help_text="e.g. Bosch, Brembo, Michelin, Denso")
    
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, help_text="Internal acquisition cost")
    price = models.DecimalField(max_digits=10, decimal_places=2, help_text="Retail selling price")
    discount_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    stock_quantity = models.PositiveIntegerField(default=0)
    low_stock_threshold = models.PositiveIntegerField(default=5)
    weight_kg = models.DecimalField(max_digits=6, decimal_places=2, default=1.00)
    
    image = models.ImageField(upload_to='parts/products/', blank=True, null=True)
    image_url = models.URLField(max_length=500, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    specifications = models.JSONField(default=dict, blank=True, help_text="Technical specifications key-value pairs")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    @property
    def effective_price(self):
        return self.discount_price if self.discount_price else self.price

    @property
    def is_in_stock(self):
        return self.stock_quantity > 0

    @property
    def is_low_stock(self):
        return self.stock_quantity <= self.low_stock_threshold

    def __str__(self):
        return f"{self.name} ({self.sku}) - ₹{self.effective_price}"


class Cart(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='cart')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def total_items(self):
        return sum(item.quantity for item in self.items.all())

    @property
    def subtotal(self):
        return sum(item.subtotal for item in self.items.all())

    def __str__(self):
        return f"Cart for {self.user.username} ({self.total_items} items)"


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(PartProduct, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)

    class Meta:
        unique_together = ('cart', 'product')

    @property
    def subtotal(self):
        return self.product.effective_price * self.quantity

    def __str__(self):
        return f"{self.quantity}x {self.product.name}"


class Order(models.Model):
    class PaymentMethod(models.TextChoices):
        CARD = 'CARD', 'Credit / Debit Card'
        UPI = 'UPI', 'UPI Payment'
        NET_BANKING = 'NET_BANKING', 'Net Banking'
        COD = 'COD', 'Cash on Delivery'

    class PaymentStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending Payment'
        PAID = 'PAID', 'Paid'
        FAILED = 'FAILED', 'Failed'
        REFUNDED = 'REFUNDED', 'Refunded'

    class FulfillmentStatus(models.TextChoices):
        PROCESSING = 'PROCESSING', 'Processing Order'
        PACKED = 'PACKED', 'Packed'
        SHIPPED = 'SHIPPED', 'Shipped'
        OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY', 'Out for Delivery'
        DELIVERED = 'DELIVERED', 'Delivered'
        CANCELLED = 'CANCELLED', 'Cancelled'

    order_number = models.CharField(max_length=30, unique=True, default=generate_parts_order_number)
    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='ecommerce_orders')
    
    # Shipping details
    shipping_full_name = models.CharField(max_length=150)
    shipping_address = models.CharField(max_length=255)
    shipping_city = models.CharField(max_length=100)
    shipping_state = models.CharField(max_length=100)
    shipping_zip_code = models.CharField(max_length=20)
    shipping_phone = models.CharField(max_length=20)
    
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    shipping_fee = models.DecimalField(max_digits=10, decimal_places=2, default=15.00)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices, default=PaymentMethod.CARD)
    payment_status = models.CharField(max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.PENDING)
    fulfillment_status = models.CharField(max_length=20, choices=FulfillmentStatus.choices, default=FulfillmentStatus.PROCESSING)
    
    # Shipping carrier & tracking
    shipping_carrier = models.CharField(max_length=100, blank=True, null=True, help_text="e.g. FedEx, BlueDart, DHL, UPS")
    tracking_number = models.CharField(max_length=100, blank=True, null=True)
    estimated_delivery_date = models.DateField(blank=True, null=True)
    
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.order_number} by {self.customer.username} (₹{self.total_amount})"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(PartProduct, on_delete=models.PROTECT)
    product_name = models.CharField(max_length=200)
    sku = models.CharField(max_length=50)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField(default=1)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.quantity}x {self.product_name} (₹{self.subtotal})"
