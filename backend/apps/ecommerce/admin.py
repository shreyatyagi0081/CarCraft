from django.contrib import admin
from .models import PartCategory, PartProduct, Cart, CartItem, Order, OrderItem

class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0

class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0

@admin.register(PartCategory)
class PartCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'parent', 'created_at']
    prepopulated_fields = {'slug': ('name',)}

@admin.register(PartProduct)
class PartProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'sku', 'brand', 'category', 'price', 'discount_price', 'stock_quantity', 'is_active']
    list_filter = ['category', 'brand', 'is_active', 'is_universal_fit']
    search_fields = ['name', 'sku', 'part_number', 'brand']

@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ['user', 'total_items', 'subtotal', 'updated_at']
    inlines = [CartItemInline]

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['order_number', 'customer', 'total_amount', 'payment_status', 'fulfillment_status', 'shipping_carrier', 'created_at']
    list_filter = ['fulfillment_status', 'payment_status', 'payment_method', 'created_at']
    search_fields = ['order_number', 'shipping_full_name', 'tracking_number']
    inlines = [OrderItemInline]
