import uuid
from django.db import models
from django.conf import settings
from apps.vehicles.models import Vehicle

def generate_appointment_number():
    return f"APT-{uuid.uuid4().hex[:8].upper()}"


class ServiceSkill(models.Model):
    name = models.CharField(max_length=100, unique=True, help_text="e.g. Engine Diagnostics, Brake Repair, EV Systems, Transmission")
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name


class TechnicianProfile(models.Model):
    class AvailabilityStatus(models.TextChoices):
        AVAILABLE = 'AVAILABLE', 'Available'
        BUSY = 'BUSY', 'Busy / Working'
        ON_LEAVE = 'ON_LEAVE', 'On Leave'

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='technician_profile')
    skills = models.ManyToManyField(ServiceSkill, blank=True, related_name='technicians')
    experience_years = models.PositiveSmallIntegerField(default=3)
    daily_capacity_hours = models.DecimalField(max_digits=4, decimal_places=1, default=8.0)
    availability_status = models.CharField(max_length=20, choices=AvailabilityStatus.choices, default=AvailabilityStatus.AVAILABLE)
    is_active = models.BooleanField(default=True)
    specialty_notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Tech: {self.user.get_full_name() or self.user.username} ({self.get_availability_status_display()})"


class ServiceType(models.Model):
    name = models.CharField(max_length=150, unique=True)
    description = models.TextField(blank=True, null=True)
    estimated_duration_minutes = models.PositiveIntegerField(default=60)
    base_price = models.DecimalField(max_digits=10, decimal_places=2, default=99.00)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} (₹{self.base_price} - {self.estimated_duration_minutes}m)"


class ServiceAppointment(models.Model):
    class AppointmentStatus(models.TextChoices):
        REQUESTED = 'REQUESTED', 'Requested by Customer'
        CONFIRMED = 'CONFIRMED', 'Confirmed & Scheduled'
        IN_PROGRESS = 'IN_PROGRESS', 'Service in Progress'
        COMPLETED = 'COMPLETED', 'Service Completed'
        CANCELLED = 'CANCELLED', 'Cancelled'

    appointment_number = models.CharField(max_length=30, unique=True, default=generate_appointment_number)
    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='service_appointments')
    vehicle = models.ForeignKey(Vehicle, on_delete=models.SET_NULL, null=True, blank=True, related_name='service_appointments')
    
    # In case customer vehicle was not purchased from dealership inventory
    custom_vehicle_details = models.CharField(max_length=200, blank=True, null=True, help_text="e.g. 2021 Honda Civic - Reg: ABC-1234")
    service_types = models.ManyToManyField(ServiceType, related_name='appointments')
    technician = models.ForeignKey(TechnicianProfile, on_delete=models.SET_NULL, null=True, blank=True, related_name='appointments')
    
    scheduled_datetime = models.DateTimeField()
    status = models.CharField(max_length=20, choices=AppointmentStatus.choices, default=AppointmentStatus.REQUESTED)
    
    current_odometer = models.PositiveIntegerField(default=0, help_text="Current vehicle mileage")
    estimated_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    final_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    customer_notes = models.TextField(blank=True, null=True)
    technician_diagnostic_notes = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-scheduled_datetime']

    @property
    def vehicle_display(self):
        if self.vehicle:
            return self.vehicle.display_name
        return self.custom_vehicle_details or "Customer Vehicle"

    def __str__(self):
        return f"{self.appointment_number} - {self.vehicle_display} [{self.get_status_display()}]"


class ServiceHistoryRecord(models.Model):
    appointment = models.OneToOneField(ServiceAppointment, on_delete=models.CASCADE, related_name='history_record')
    vehicle = models.ForeignKey(Vehicle, on_delete=models.SET_NULL, null=True, blank=True, related_name='service_history')
    work_performed = models.TextField(help_text="Detailed summary of all repairs, fluids, and maintenance performed")
    parts_used = models.TextField(blank=True, null=True, help_text="List of parts used or replaced")
    total_labor_hours = models.DecimalField(max_digits=5, decimal_places=2, default=1.0)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    completed_at = models.DateTimeField(auto_now_add=True)
    next_service_due_date = models.DateField(blank=True, null=True)
    next_service_due_mileage = models.PositiveIntegerField(blank=True, null=True)

    class Meta:
        ordering = ['-completed_at']

    def __str__(self):
        return f"History: {self.appointment.appointment_number} - {self.appointment.vehicle_display} (₹{self.total_amount})"


class MaintenanceRecommendation(models.Model):
    class Priority(models.TextChoices):
        LOW = 'LOW', 'Low / Preventive'
        MEDIUM = 'MEDIUM', 'Medium / Scheduled'
        HIGH = 'HIGH', 'High / Urgent'
        CRITICAL = 'CRITICAL', 'Critical Safety Hazard'

    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='recommendations')
    vehicle = models.ForeignKey(Vehicle, on_delete=models.SET_NULL, null=True, blank=True, related_name='recommendations')
    vehicle_name = models.CharField(max_length=150, blank=True, null=True)
    recommended_service = models.CharField(max_length=200, help_text="e.g. Front Brake Pad Replacement, Transmission Fluid Flush")
    reason = models.TextField(help_text="e.g. Brake pad thickness measured at 2mm during last inspection")
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.MEDIUM)
    due_date = models.DateField(blank=True, null=True)
    due_mileage = models.PositiveIntegerField(blank=True, null=True)
    is_addressed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.priority}] {self.recommended_service} for {self.customer.username}"
