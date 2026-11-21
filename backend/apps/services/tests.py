from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.services.models import ServiceAppointment, ServiceType, TechnicianProfile

User = get_user_model()


class ServiceIntegrationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.dealer = User.objects.create_user(
            username='service_dealer',
            email='service_dealer@test.com',
            password='password123',
            role=User.Role.DEALER_ADMIN,
        )
        self.customer = User.objects.create_user(
            username='service_customer',
            email='service_customer@test.com',
            password='password123',
            role=User.Role.CUSTOMER,
        )
        self.other_customer = User.objects.create_user(
            username='service_other_customer',
            email='service_other_customer@test.com',
            password='password123',
            role=User.Role.CUSTOMER,
        )
        self.technician_user = User.objects.create_user(
            username='service_technician',
            email='service_technician@test.com',
            password='password123',
            role=User.Role.TECHNICIAN,
        )
        self.other_technician_user = User.objects.create_user(
            username='service_other_technician',
            email='service_other_technician@test.com',
            password='password123',
            role=User.Role.TECHNICIAN,
        )
        self.technician = TechnicianProfile.objects.create(user=self.technician_user)
        self.other_technician = TechnicianProfile.objects.create(user=self.other_technician_user)
        self.service_type = ServiceType.objects.create(
            name='Service Integration Test',
            estimated_duration_minutes=60,
            base_price='125.00',
        )

    def create_appointment(self, *, customer=None, technician=None, status=None, scheduled_datetime=None):
        appointment = ServiceAppointment.objects.create(
            customer=customer or self.customer,
            technician=technician,
            custom_vehicle_details='Test vehicle',
            scheduled_datetime=scheduled_datetime or timezone.now() + timedelta(days=2),
            status=status or ServiceAppointment.AppointmentStatus.REQUESTED,
            estimated_cost='125.00',
        )
        appointment.service_types.add(self.service_type)
        return appointment

    def test_schedule_is_registered_and_limited_to_dealer_or_profile_owner(self):
        appointment = self.create_appointment(technician=self.technician)

        self.client.force_authenticate(self.technician_user)
        own_schedule = self.client.get(f'/api/services/technicians/{self.technician.id}/schedule/')
        self.assertEqual(own_schedule.status_code, 200)
        self.assertEqual([item['id'] for item in own_schedule.data['appointments']], [appointment.id])
        self.assertEqual(own_schedule.data['availability_status'], TechnicianProfile.AvailabilityStatus.AVAILABLE)
        self.assertEqual(
            self.client.get(f'/api/services/technicians/{self.other_technician.id}/schedule/').status_code,
            403,
        )
        self.assertEqual(
            self.client.get(
                f'/api/services/technicians/{self.technician.id}/schedule/',
                {'start_date': 'not-a-date'},
            ).status_code,
            400,
        )

        self.client.force_authenticate(self.dealer)
        self.assertEqual(
            self.client.get(f'/api/services/technicians/{self.technician.id}/schedule/').status_code,
            200,
        )

    def test_custom_availability_update_only_allows_self_or_dealer(self):
        self.client.force_authenticate(self.technician_user)
        denied = self.client.patch(
            f'/api/services/technicians/{self.other_technician.id}/update_status/',
            {'availability_status': TechnicianProfile.AvailabilityStatus.ON_LEAVE},
            format='json',
        )
        self.assertEqual(denied.status_code, 403)

        updated = self.client.patch(
            f'/api/services/technicians/{self.technician.id}/update_status/',
            {'availability_status': TechnicianProfile.AvailabilityStatus.BUSY},
            format='json',
        )
        self.assertEqual(updated.status_code, 200)
        self.technician.refresh_from_db()
        self.assertEqual(self.technician.availability_status, TechnicianProfile.AvailabilityStatus.BUSY)

    def test_customer_cannot_set_status_or_cancel_another_customers_appointment(self):
        appointment = self.create_appointment()
        other_appointment = self.create_appointment(customer=self.other_customer)
        self.client.force_authenticate(self.customer)

        forbidden_status_write = self.client.patch(
            f'/api/services/appointments/{appointment.id}/',
            {'status': ServiceAppointment.AppointmentStatus.COMPLETED},
            format='json',
        )
        self.assertEqual(forbidden_status_write.status_code, 400)
        unauthorized_action = self.client.patch(
            f'/api/services/appointments/{appointment.id}/update_status/',
            {'status': ServiceAppointment.AppointmentStatus.IN_PROGRESS},
            format='json',
        )
        self.assertEqual(unauthorized_action.status_code, 403)
        appointment.refresh_from_db()
        self.assertEqual(appointment.status, ServiceAppointment.AppointmentStatus.REQUESTED)
        forged_cost = self.client.patch(
            f'/api/services/appointments/{appointment.id}/',
            {'estimated_cost': '1.00'},
            format='json',
        )
        self.assertEqual(forged_cost.status_code, 400)

        self.assertEqual(
            self.client.post(f'/api/services/appointments/{other_appointment.id}/cancel/').status_code,
            404,
        )
        self.assertEqual(self.client.post(f'/api/services/appointments/{appointment.id}/cancel/').status_code, 200)
        appointment.refresh_from_db()
        self.assertEqual(appointment.status, ServiceAppointment.AppointmentStatus.CANCELLED)

    def test_technician_cannot_bypass_service_actions_for_controlled_fields(self):
        appointment = self.create_appointment(
            technician=self.technician,
            status=ServiceAppointment.AppointmentStatus.IN_PROGRESS,
        )
        self.client.force_authenticate(self.technician_user)
        response = self.client.patch(
            f'/api/services/appointments/{appointment.id}/',
            {
                'final_cost': '1.00',
                'technician_diagnostic_notes': 'Forged update',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        appointment.refresh_from_db()
        self.assertIsNone(appointment.final_cost)
        self.assertIsNone(appointment.technician_diagnostic_notes)

    def test_customer_cannot_reschedule_after_technician_assignment(self):
        appointment = self.create_appointment(
            technician=self.technician,
            status=ServiceAppointment.AppointmentStatus.CONFIRMED,
        )
        original_scheduled_datetime = appointment.scheduled_datetime
        self.client.force_authenticate(self.customer)
        response = self.client.patch(
            f'/api/services/appointments/{appointment.id}/',
            {'scheduled_datetime': (timezone.now() + timedelta(days=10)).isoformat()},
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        appointment.refresh_from_db()
        self.assertEqual(
            appointment.scheduled_datetime,
            original_scheduled_datetime,
        )

    def test_dealer_assignment_prevents_overlaps_and_customers_cannot_assign(self):
        scheduled = timezone.now() + timedelta(days=3)
        first = self.create_appointment(scheduled_datetime=scheduled)
        second = self.create_appointment(scheduled_datetime=scheduled + timedelta(minutes=30))

        self.client.force_authenticate(self.customer)
        self.assertEqual(
            self.client.patch(
                f'/api/services/appointments/{first.id}/assign_technician/',
                {'technician_id': self.technician.id},
                format='json',
            ).status_code,
            403,
        )

        self.client.force_authenticate(self.dealer)
        assigned = self.client.patch(
            f'/api/services/appointments/{first.id}/assign_technician/',
            {'technician_id': self.technician.id},
            format='json',
        )
        self.assertEqual(assigned.status_code, 200)
        self.assertEqual(assigned.data['status'], ServiceAppointment.AppointmentStatus.CONFIRMED)

        conflict = self.client.patch(
            f'/api/services/appointments/{second.id}/assign_technician/',
            {'technician_id': self.technician.id},
            format='json',
        )
        self.assertEqual(conflict.status_code, 400)

    def test_assigned_technician_can_start_and_complete_with_real_work_data(self):
        appointment = self.create_appointment(
            technician=self.technician,
            status=ServiceAppointment.AppointmentStatus.CONFIRMED,
        )
        self.client.force_authenticate(self.technician_user)
        started = self.client.patch(
            f'/api/services/appointments/{appointment.id}/update_status/',
            {'status': ServiceAppointment.AppointmentStatus.IN_PROGRESS},
            format='json',
        )
        self.assertEqual(started.status_code, 200)

        completed = self.client.post(
            f'/api/services/appointments/{appointment.id}/complete_service/',
            {
                'work_performed': 'Replaced engine oil and inspected brakes.',
                'parts_used': 'Oil filter',
                'labor_hours': '1.25',
                'final_cost': '145.00',
                'diagnostic_notes': 'Brake pads are in good condition.',
            },
            format='json',
        )
        self.assertEqual(completed.status_code, 200)
        appointment.refresh_from_db()
        self.assertEqual(appointment.status, ServiceAppointment.AppointmentStatus.COMPLETED)
        self.assertEqual(appointment.history_record.work_performed, 'Replaced engine oil and inspected brakes.')
        self.assertEqual(str(appointment.history_record.total_amount), '145.00')

    def test_completion_requires_work_details_and_in_progress_status(self):
        appointment = self.create_appointment(technician=self.technician)
        self.client.force_authenticate(self.technician_user)

        not_started = self.client.post(
            f'/api/services/appointments/{appointment.id}/complete_service/',
            {},
            format='json',
        )
        self.assertEqual(not_started.status_code, 400)

        appointment.status = ServiceAppointment.AppointmentStatus.IN_PROGRESS
        appointment.save(update_fields=['status'])
        missing_details = self.client.post(
            f'/api/services/appointments/{appointment.id}/complete_service/',
            {'final_cost': '100.00'},
            format='json',
        )
        self.assertEqual(missing_details.status_code, 400)
        self.assertFalse(hasattr(appointment, 'history_record'))
