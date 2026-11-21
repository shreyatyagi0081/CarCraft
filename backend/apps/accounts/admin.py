from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, CustomerProfile, DealerProfile

class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ('CarCraft Profile Details', {
            'fields': (
                'role', 'phone_number', 'address', 'city', 'state', 'zip_code',
                'avatar', 'dealership_name', 'is_verified'
            )
        }),
    )
    list_display = ['username', 'email', 'role', 'phone_number', 'dealership_name', 'is_active', 'date_joined']
    list_filter = ['role', 'is_active', 'is_verified', 'date_joined']
    search_fields = ['username', 'email', 'first_name', 'last_name', 'dealership_name']

admin.site.register(User, CustomUserAdmin)
admin.site.register(CustomerProfile)
admin.site.register(DealerProfile)
