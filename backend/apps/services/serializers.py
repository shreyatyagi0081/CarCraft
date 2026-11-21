from datetime import timedelta
from decimal import Decimal
from rest_framework import serializers
from .models import (
    ServiceSkill,
    TechnicianProfile,
    ServiceType,
    ServiceAppointment,
    ServiceHistoryRecord,
    MaintenanceRecommendation
)
from apps.accounts.serializers import UserSerializer
from apps.vehicles.serializers import VehicleSerializer


def validate_appointment_schedule(appointment, technician, scheduled_datetime, service_types):
    if not technician.is_active:
        raise serializers.ValidationError({'technician': 'The selected technician is inactive.'})
    if technician.availability_status == TechnicianProfile.AvailabilityStatus.ON_LEAVE:
        raise serializers.ValidationError({'technician': 'The selected technician is on leave.'})

    requested_duration = sum(service.estimated_duration_minutes for service in service_types)
    if requested_duration <= 0:
        raise serializers.ValidationError({'service_types': 'At least one service with a duration is required.'})

    requested_end = scheduled_datetime + timedelta(minutes=requested_duration)
    conflicts = ServiceAppointment.objects.filter(
        technician=technician,
        status__in=[
            ServiceAppointment.AppointmentStatus.REQUESTED,
            ServiceAppointment.AppointmentStatus.CONFIRMED,
            ServiceAppointment.AppointmentStatus.IN_PROGRESS,
        ],
        scheduled_datetime__lt=requested_end,
    ).exclude(pk=getattr(appointment, 'pk', None)).prefetch_related('service_types')

    for existing in conflicts:
        existing_duration = sum(service.estimated_duration_minutes for service in existing.service_types.all())
        existing_end = existing.scheduled_datetime + timedelta(minutes=existing_duration)
        if scheduled_datetime < existing_end and existing.scheduled_datetime < requested_end:
            raise serializers.ValidationError({
                'scheduled_datetime': 'The technician already has an appointment during this time.'
            })


class ServiceSkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceSkill
        fields = ['id', 'name', 'description']


class TechnicianProfileSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source='user', read_only=True)
    skills = ServiceSkillSerializer(many=True, read_only=True)
    skill_ids = serializers.PrimaryKeyRelatedField(
        queryset=ServiceSkill.objects.all(), source='skills', many=True, write_only=True, required=False
    )

    class Meta:
        model = TechnicianProfile
        fields = [
            'id', 'user', 'user_details', 'skills', 'skill_ids',
            'experience_years', 'daily_capacity_hours', 'availability_status',
            'is_active', 'specialty_notes'
        ]


class TechnicianAvailabilitySerializer(serializers.Serializer):
    availability_status = serializers.ChoiceField(choices=TechnicianProfile.AvailabilityStatus.choices)


class TechnicianAssignmentSerializer(serializers.Serializer):
    technician_id = serializers.PrimaryKeyRelatedField(
        queryset=TechnicianProfile.objects.filter(is_active=True),
        source='technician',
    )


class ServiceCompletionSerializer(serializers.Serializer):
    work_performed = serializers.CharField()
    parts_used = serializers.CharField(required=False, allow_blank=True)
    labor_hours = serializers.DecimalField(max_digits=5, decimal_places=2, min_value=Decimal('0.01'))
    final_cost = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.00'))
    diagnostic_notes = serializers.CharField(required=False, allow_blank=True)


class TechnicianScheduleAppointmentSerializer(serializers.ModelSerializer):
    service_names = serializers.SlugRelatedField(
        source='service_types',
        many=True,
        read_only=True,
        slug_field='name',
    )
    duration_minutes = serializers.SerializerMethodField()

    class Meta:
        model = ServiceAppointment
        fields = [
            'id', 'appointment_number', 'vehicle_display', 'service_names',
            'scheduled_datetime', 'status', 'duration_minutes',
        ]

    def get_duration_minutes(self, appointment):
        return sum(service.estimated_duration_minutes for service in appointment.service_types.all())


class ServiceTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceType
        fields = ['id', 'name', 'description', 'estimated_duration_minutes', 'base_price', 'is_active']


class ServiceAppointmentSerializer(serializers.ModelSerializer):
    customer_details = UserSerializer(source='customer', read_only=True)
    vehicle_details = VehicleSerializer(source='vehicle', read_only=True)
    service_types_details = ServiceTypeSerializer(source='service_types', many=True, read_only=True)
    technician_details = TechnicianProfileSerializer(source='technician', read_only=True)
    vehicle_display = serializers.ReadOnlyField()

    class Meta:
        model = ServiceAppointment
        fields = [
            'id', 'appointment_number', 'customer', 'customer_details',
            'vehicle', 'vehicle_details', 'custom_vehicle_details', 'vehicle_display',
            'service_types', 'service_types_details', 'technician', 'technician_details',
            'scheduled_datetime', 'status', 'current_odometer', 'estimated_cost',
            'final_cost', 'customer_notes', 'technician_diagnostic_notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'appointment_number', 'customer', 'technician', 'status',
            'estimated_cost', 'final_cost', 'technician_diagnostic_notes',
            'created_at', 'updated_at',
        ]

    def validate(self, attrs):
        request = self.context.get('request')
        dedicated_action_fields = {
            'status', 'technician', 'estimated_cost', 'final_cost',
            'technician_diagnostic_notes',
        }
        submitted_dedicated_fields = dedicated_action_fields.intersection(self.initial_data)
        if submitted_dedicated_fields:
            raise serializers.ValidationError({
                field: 'Use the authorized service action to change this field.'
                for field in submitted_dedicated_fields
            })
        if (
            request
            and request.user.is_authenticated
            and request.user.is_customer
            and self.instance
            and (
                self.instance.technician_id
                or self.instance.status != ServiceAppointment.AppointmentStatus.REQUESTED
            )
        ):
            scheduled_fields = {
                'vehicle', 'custom_vehicle_details', 'service_types',
                'scheduled_datetime', 'current_odometer',
            }
            submitted_scheduled_fields = scheduled_fields.intersection(self.initial_data)
            if submitted_scheduled_fields:
                raise serializers.ValidationError({
                    field: 'Only dealership staff can change scheduled service details after confirmation or assignment.'
                    for field in submitted_scheduled_fields
                })
        technician = attrs.get('technician', getattr(self.instance, 'technician', None))
        scheduled_datetime = attrs.get('scheduled_datetime', getattr(self.instance, 'scheduled_datetime', None))
        service_types = attrs.get('service_types')
        if service_types is None and self.instance:
            service_types = self.instance.service_types.all()

        if technician and scheduled_datetime and service_types:
            validate_appointment_schedule(self.instance, technician, scheduled_datetime, service_types)
        return attrs


class ServiceHistoryRecordSerializer(serializers.ModelSerializer):
    appointment_number = serializers.CharField(source='appointment.appointment_number', read_only=True)
    vehicle_display = serializers.CharField(source='appointment.vehicle_display', read_only=True)

    class Meta:
        model = ServiceHistoryRecord
        fields = [
            'id', 'appointment', 'appointment_number', 'vehicle', 'vehicle_display',
            'work_performed', 'parts_used', 'total_labor_hours', 'total_amount',
            'completed_at', 'next_service_due_date', 'next_service_due_mileage'
        ]
        read_only_fields = ['id', 'completed_at']


class MaintenanceRecommendationSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaintenanceRecommendation
        fields = [
            'id', 'customer', 'vehicle', 'vehicle_name', 'recommended_service',
            'reason', 'priority', 'due_date', 'due_mileage', 'is_addressed', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
