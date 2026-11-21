from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_date

from .models import (
    ServiceSkill,
    TechnicianProfile,
    ServiceType,
    ServiceAppointment,
    ServiceHistoryRecord,
    MaintenanceRecommendation
)
from .serializers import (
    ServiceSkillSerializer,
    TechnicianProfileSerializer,
    ServiceTypeSerializer,
    ServiceAppointmentSerializer,
    ServiceHistoryRecordSerializer,
    MaintenanceRecommendationSerializer,
    TechnicianAvailabilitySerializer,
    TechnicianAssignmentSerializer,
    TechnicianScheduleAppointmentSerializer,
    ServiceCompletionSerializer,
    validate_appointment_schedule,
)
from apps.accounts.permissions import IsDealerUser, IsTechnicianUser

class ServiceSkillViewSet(viewsets.ModelViewSet):
    queryset = ServiceSkill.objects.all()
    serializer_class = ServiceSkillSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsDealerUser()]
        return [permissions.AllowAny()]


class TechnicianProfileViewSet(viewsets.ModelViewSet):
    queryset = TechnicianProfile.objects.all().select_related('user').prefetch_related('skills')
    serializer_class = TechnicianProfileSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['user', 'availability_status', 'is_active', 'skills']
    search_fields = ['user__username', 'user__first_name', 'user__last_name', 'specialty_notes']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsDealerUser()]
        if self.action == 'update_status':
            return [permissions.IsAuthenticated(), IsTechnicianUser()]
        return [permissions.IsAuthenticated()]

    @action(detail=True, methods=['patch'], permission_classes=[permissions.IsAuthenticated, IsTechnicianUser])
    def update_status(self, request, pk=None):
        tech = self.get_object()
        if not request.user.is_dealer and tech.user_id != request.user.id:
            return Response({'error': 'You can only update your own technician availability.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = TechnicianAvailabilitySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tech.availability_status = serializer.validated_data['availability_status']
        tech.save(update_fields=['availability_status'])
        return Response({'message': 'Technician availability updated.', 'status': tech.availability_status})

    @action(detail=True, methods=['get'])
    def schedule(self, request, pk=None):
        technician = self.get_object()
        if not request.user.is_dealer and technician.user_id != request.user.id:
            return Response({'error': 'You can only view your own technician schedule.'}, status=status.HTTP_403_FORBIDDEN)

        start_value = request.query_params.get('start_date')
        end_value = request.query_params.get('end_date')
        start_date = parse_date(start_value) if start_value else None
        end_date = parse_date(end_value) if end_value else None
        if start_value and not start_date:
            return Response({'start_date': 'Use a valid YYYY-MM-DD date.'}, status=status.HTTP_400_BAD_REQUEST)
        if end_value and not end_date:
            return Response({'end_date': 'Use a valid YYYY-MM-DD date.'}, status=status.HTTP_400_BAD_REQUEST)
        if start_date and end_date and end_date < start_date:
            return Response({'end_date': 'End date must be on or after start date.'}, status=status.HTTP_400_BAD_REQUEST)

        appointments = technician.appointments.exclude(
            status=ServiceAppointment.AppointmentStatus.CANCELLED,
        ).prefetch_related('service_types')
        if start_date:
            appointments = appointments.filter(scheduled_datetime__date__gte=start_date)
        elif not end_date:
            appointments = appointments.filter(scheduled_datetime__gte=timezone.now())
        if end_date:
            appointments = appointments.filter(scheduled_datetime__date__lte=end_date)

        return Response({
            'technician_id': technician.id,
            'availability_status': technician.availability_status,
            'is_active': technician.is_active,
            'daily_capacity_hours': technician.daily_capacity_hours,
            'skills': list(technician.skills.values_list('name', flat=True)),
            'appointments': TechnicianScheduleAppointmentSerializer(appointments, many=True).data,
        })


class ServiceTypeViewSet(viewsets.ModelViewSet):
    queryset = ServiceType.objects.filter(is_active=True)
    serializer_class = ServiceTypeSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsDealerUser()]
        return [permissions.AllowAny()]


class ServiceAppointmentViewSet(viewsets.ModelViewSet):
    serializer_class = ServiceAppointmentSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        'status': ['exact'],
        'technician': ['exact'],
        'customer': ['exact'],
        'vehicle': ['exact'],
        'scheduled_datetime': ['date'],
    }
    search_fields = ['appointment_number', 'customer__username', 'custom_vehicle_details']
    ordering_fields = ['scheduled_datetime', 'created_at']

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return ServiceAppointment.objects.none()
        if user.is_dealer:
            return ServiceAppointment.objects.all().select_related('customer', 'vehicle', 'technician', 'technician__user').prefetch_related('service_types')
        if user.is_technician:
            return ServiceAppointment.objects.filter(technician__user=user).select_related('customer', 'vehicle').prefetch_related('service_types')
        return ServiceAppointment.objects.filter(customer=user).select_related('vehicle', 'technician').prefetch_related('service_types')

    def get_permissions(self):
        if self.action in ['destroy', 'assign_technician']:
            return [permissions.IsAuthenticated(), IsDealerUser()]
        if self.action == 'complete_service':
            return [permissions.IsAuthenticated(), IsTechnicianUser()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        user = self.request.user
        # Calculate estimated cost based on selected service types
        technician = serializer.validated_data.get('technician')
        with transaction.atomic():
            if technician:
                technician = TechnicianProfile.objects.select_for_update().get(pk=technician.pk)
                validate_appointment_schedule(
                    None,
                    technician,
                    serializer.validated_data['scheduled_datetime'],
                    serializer.validated_data['service_types'],
                )
            appointment = serializer.save(customer=user)
            appointment.estimated_cost = sum(st.base_price for st in appointment.service_types.all())
            appointment.save(update_fields=['estimated_cost', 'updated_at'])

    def perform_update(self, serializer):
        technician = serializer.validated_data.get('technician', serializer.instance.technician)
        with transaction.atomic():
            if technician:
                technician = TechnicianProfile.objects.select_for_update().get(pk=technician.pk)
                service_types = serializer.validated_data.get('service_types', serializer.instance.service_types.all())
                scheduled_datetime = serializer.validated_data.get(
                    'scheduled_datetime', serializer.instance.scheduled_datetime
                )
                validate_appointment_schedule(serializer.instance, technician, scheduled_datetime, service_types)
            serializer.save()

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        appointment = self.get_object()
        if not request.user.is_dealer and appointment.customer_id != request.user.id:
            return Response({'error': 'You can only cancel your own appointment.'}, status=status.HTTP_403_FORBIDDEN)
        if appointment.status not in [
            ServiceAppointment.AppointmentStatus.REQUESTED,
            ServiceAppointment.AppointmentStatus.CONFIRMED,
        ]:
            return Response(
                {'error': 'Only requested or confirmed appointments can be cancelled.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        appointment.status = ServiceAppointment.AppointmentStatus.CANCELLED
        appointment.save(update_fields=['status', 'updated_at'])
        return Response({'status': appointment.status})

    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        appointment = self.get_object()
        if not request.user.is_dealer:
            is_assigned_technician = (
                request.user.is_technician
                and appointment.technician_id is not None
                and appointment.technician.user_id == request.user.id
            )
            if not is_assigned_technician:
                return Response({'error': 'Only dealership staff or the assigned technician can update status.'}, status=status.HTTP_403_FORBIDDEN)

        new_status = request.data.get('status')
        allowed_transitions = {
            ServiceAppointment.AppointmentStatus.REQUESTED: {
                ServiceAppointment.AppointmentStatus.CONFIRMED,
            },
            ServiceAppointment.AppointmentStatus.CONFIRMED: {
                ServiceAppointment.AppointmentStatus.IN_PROGRESS,
            },
        }
        if new_status not in allowed_transitions.get(appointment.status, set()):
            return Response(
                {'status': 'This status transition is not allowed. Use the dedicated cancellation or completion action where applicable.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if (
            new_status == ServiceAppointment.AppointmentStatus.CONFIRMED
            and appointment.technician_id is None
        ):
            return Response(
                {'status': 'Assign a technician before confirming this appointment.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not request.user.is_dealer and new_status != ServiceAppointment.AppointmentStatus.IN_PROGRESS:
            return Response({'error': 'Technicians may only start their assigned confirmed appointments.'}, status=status.HTTP_403_FORBIDDEN)

        appointment.status = new_status
        appointment.save(update_fields=['status', 'updated_at'])
        return Response({'status': appointment.status})

    @action(detail=True, methods=['patch'], permission_classes=[permissions.IsAuthenticated, IsDealerUser])
    @transaction.atomic
    def assign_technician(self, request, pk=None):
        appointment = self.get_object()
        serializer = TechnicianAssignmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        technician = TechnicianProfile.objects.select_for_update().get(
            pk=serializer.validated_data['technician'].pk,
        )
        validate_appointment_schedule(
            appointment,
            technician,
            appointment.scheduled_datetime,
            appointment.service_types.all(),
        )
        appointment.technician = technician
        appointment.status = ServiceAppointment.AppointmentStatus.CONFIRMED
        appointment.save()
        return Response({'message': 'Technician assigned successfully.', 'status': appointment.status})

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsTechnicianUser])
    @transaction.atomic
    def complete_service(self, request, pk=None):
        appointment = self.get_object()
        if appointment.status != ServiceAppointment.AppointmentStatus.IN_PROGRESS:
            return Response(
                {'error': 'Only an in-progress appointment can be completed.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = ServiceCompletionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        final_cost = data['final_cost']

        appointment.status = ServiceAppointment.AppointmentStatus.COMPLETED
        appointment.final_cost = final_cost
        appointment.technician_diagnostic_notes = data.get('diagnostic_notes', '')
        appointment.save()

        # Create or update history record
        record, _ = ServiceHistoryRecord.objects.update_or_create(
            appointment=appointment,
            defaults={
                'vehicle': appointment.vehicle,
                'work_performed': data['work_performed'],
                'parts_used': data.get('parts_used', ''),
                'total_labor_hours': data['labor_hours'],
                'total_amount': final_cost,
                'next_service_due_mileage': (appointment.current_odometer + 10000) if appointment.current_odometer else None
            }
        )

        return Response({
            'message': 'Service appointment marked COMPLETED and history record created.',
            'appointment_number': appointment.appointment_number,
            'history_record_id': record.id,
            'final_cost': appointment.final_cost
        })


class ServiceHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ServiceHistoryRecordSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['vehicle', 'appointment__customer']
    search_fields = ['appointment__appointment_number', 'work_performed', 'parts_used']
    ordering_fields = ['completed_at', 'total_amount']

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return ServiceHistoryRecord.objects.none()
        if user.is_dealer or user.is_technician:
            return ServiceHistoryRecord.objects.all().select_related('appointment', 'vehicle')
        return ServiceHistoryRecord.objects.filter(appointment__customer=user).select_related('appointment', 'vehicle')


class MaintenanceRecommendationViewSet(viewsets.ModelViewSet):
    serializer_class = MaintenanceRecommendationSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['priority', 'is_addressed', 'customer', 'vehicle']
    search_fields = ['recommended_service', 'reason']

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return MaintenanceRecommendation.objects.none()
        if user.is_dealer:
            return MaintenanceRecommendation.objects.all().select_related('customer', 'vehicle')
        return MaintenanceRecommendation.objects.filter(customer=user).select_related('vehicle')

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsDealerUser()]
        return [permissions.IsAuthenticated()]
