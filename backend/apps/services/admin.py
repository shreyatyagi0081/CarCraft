from django.contrib import admin
from .models import (
    ServiceSkill,
    TechnicianProfile,
    ServiceType,
    ServiceAppointment,
    ServiceHistoryRecord,
    MaintenanceRecommendation
)

@admin.register(ServiceSkill)
class ServiceSkillAdmin(admin.ModelAdmin):
    list_display = ['name', 'description']

@admin.register(TechnicianProfile)
class TechnicianProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'experience_years', 'availability_status', 'is_active']
    list_filter = ['availability_status', 'is_active']

@admin.register(ServiceType)
class ServiceTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'base_price', 'estimated_duration_minutes', 'is_active']

@admin.register(ServiceAppointment)
class ServiceAppointmentAdmin(admin.ModelAdmin):
    list_display = ['appointment_number', 'customer', 'vehicle_display', 'scheduled_datetime', 'status', 'final_cost']
    list_filter = ['status', 'scheduled_datetime']
    search_fields = ['appointment_number', 'customer__username']

@admin.register(ServiceHistoryRecord)
class ServiceHistoryRecordAdmin(admin.ModelAdmin):
    list_display = ['appointment', 'total_amount', 'total_labor_hours', 'completed_at']

@admin.register(MaintenanceRecommendation)
class MaintenanceRecommendationAdmin(admin.ModelAdmin):
    list_display = ['recommended_service', 'customer', 'priority', 'is_addressed', 'due_date']
    list_filter = ['priority', 'is_addressed']
