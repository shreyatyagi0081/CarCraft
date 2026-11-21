from django.contrib import admin
from .models import SalesLead, LeadActivity, Quotation, VehicleOrder

class LeadActivityInline(admin.TabularInline):
    model = LeadActivity
    extra = 1

@admin.register(SalesLead)
class SalesLeadAdmin(admin.ModelAdmin):
    list_display = ['id', 'first_name', 'last_name', 'email', 'phone', 'source', 'status', 'assigned_to', 'lead_score', 'created_at']
    list_filter = ['status', 'source', 'created_at']
    search_fields = ['first_name', 'last_name', 'email', 'phone']
    inlines = [LeadActivityInline]

@admin.register(Quotation)
class QuotationAdmin(admin.ModelAdmin):
    list_display = ['quotation_number', 'customer', 'vehicle', 'total_amount', 'status', 'valid_until', 'created_at']
    list_filter = ['status', 'financing_type', 'created_at']
    search_fields = ['quotation_number', 'customer__username', 'customer__email']

@admin.register(VehicleOrder)
class VehicleOrderAdmin(admin.ModelAdmin):
    list_display = ['order_number', 'customer', 'vehicle', 'total_price', 'payment_status', 'order_status', 'created_at']
    list_filter = ['order_status', 'payment_status', 'created_at']
    search_fields = ['order_number', 'customer__username', 'vehicle__vin']
