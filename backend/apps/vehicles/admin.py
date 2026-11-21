from django.contrib import admin
from .models import VehicleMake, VehicleModel, Vehicle, VehicleImage

class VehicleImageInline(admin.TabularInline):
    model = VehicleImage
    extra = 1

@admin.register(VehicleMake)
class VehicleMakeAdmin(admin.ModelAdmin):
    list_display = ['name', 'country_of_origin', 'created_at']
    search_fields = ['name']

@admin.register(VehicleModel)
class VehicleModelAdmin(admin.ModelAdmin):
    list_display = ['name', 'make', 'body_type', 'created_at']
    list_filter = ['make', 'body_type']
    search_fields = ['name', 'make__name']

@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = ['vin', 'display_name', 'year', 'condition', 'fuel_type', 'selling_price', 'status', 'created_at']
    list_filter = ['status', 'condition', 'fuel_type', 'transmission', 'year', 'model__make']
    search_fields = ['vin', 'model__name', 'model__make__name', 'trim', 'exterior_color']
    inlines = [VehicleImageInline]
