from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.communications.models import CustomerMessage, CustomerReminder

User = get_user_model()


class CommunicationsIntegrationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.customer = User.objects.create_user(
            username='communications_customer',
            email='communications_customer@test.com',
            password='password123',
            role=User.Role.CUSTOMER,
        )
        self.other_customer = User.objects.create_user(
            username='communications_other_customer',
            email='communications_other_customer@test.com',
            password='password123',
            role=User.Role.CUSTOMER,
        )
        self.dealer = User.objects.create_user(
            username='communications_dealer',
            email='communications_dealer@test.com',
            password='password123',
            role=User.Role.DEALER_ADMIN,
        )

    def reminder_payload(self, **overrides):
        payload = {
            'title': 'Service appointment reminder',
            'message': 'Your appointment is scheduled.',
            'scheduled_time': (timezone.now() + timedelta(days=1)).isoformat(),
            'reminder_type': CustomerReminder.ReminderType.APPOINTMENT_UPCOMING,
            'channel': CustomerReminder.Channel.IN_APP,
        }
        payload.update(overrides)
        return payload

    def test_customer_reminder_is_owned_by_authenticated_customer(self):
        self.client.force_authenticate(self.customer)
        created = self.client.post(
            '/api/communications/reminders/',
            self.reminder_payload(),
            format='json',
        )
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.data['customer'], self.customer.id)
        self.assertEqual(created.data['scheduled_time'][:10], (timezone.now() + timedelta(days=1)).date().isoformat())

        forged_owner = self.client.post(
            '/api/communications/reminders/',
            self.reminder_payload(customer=self.other_customer.id),
            format='json',
        )
        self.assertEqual(forged_owner.status_code, 400)
        self.assertEqual(CustomerReminder.objects.count(), 1)

    def test_dealer_reminder_requires_and_uses_a_customer_id(self):
        self.client.force_authenticate(self.dealer)
        missing_customer = self.client.post(
            '/api/communications/reminders/',
            self.reminder_payload(),
            format='json',
        )
        self.assertEqual(missing_customer.status_code, 400)

        created = self.client.post(
            '/api/communications/reminders/',
            self.reminder_payload(customer=self.customer.id),
            format='json',
        )
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.data['customer'], self.customer.id)
        self.assertEqual(created.data['created_by'], self.dealer.id)

    def test_reminders_are_scoped_and_only_dealers_can_edit_or_mark_sent(self):
        reminder = CustomerReminder.objects.create(
            customer=self.other_customer,
            created_by=self.dealer,
            title='Private reminder',
            message='Only for another customer.',
            scheduled_time=timezone.now() + timedelta(days=1),
        )
        self.client.force_authenticate(self.customer)
        self.assertEqual(self.client.get('/api/communications/reminders/').data['count'], 0)
        self.assertEqual(
            self.client.patch(
                f'/api/communications/reminders/{reminder.id}/',
                {'title': 'Changed'},
                format='json',
            ).status_code,
            403,
        )
        self.assertEqual(
            self.client.post(f'/api/communications/reminders/{reminder.id}/trigger_send/').status_code,
            403,
        )

        self.client.force_authenticate(self.dealer)
        changed = self.client.patch(
            f'/api/communications/reminders/{reminder.id}/',
            {'title': 'Updated reminder'},
            format='json',
        )
        self.assertEqual(changed.status_code, 200)
        self.assertEqual(changed.data['title'], 'Updated reminder')
        sent = self.client.post(f'/api/communications/reminders/{reminder.id}/trigger_send/')
        self.assertEqual(sent.status_code, 200)
        self.assertIn('No external delivery provider is configured', sent.data['message'])
        reminder.refresh_from_db()
        self.assertTrue(reminder.is_sent)

    def test_reminder_flags_are_read_only_except_through_read_action(self):
        reminder = CustomerReminder.objects.create(
            customer=self.customer,
            title='Read-state test',
            message='Read this in app.',
            scheduled_time=timezone.now() + timedelta(days=1),
        )
        self.client.force_authenticate(self.customer)
        changed = self.client.patch(
            f'/api/communications/reminders/{reminder.id}/',
            {'is_read': True, 'is_sent': True},
            format='json',
        )
        self.assertEqual(changed.status_code, 403)
        marked = self.client.patch(f'/api/communications/reminders/{reminder.id}/mark_read/')
        self.assertEqual(marked.status_code, 200)
        reminder.refresh_from_db()
        self.assertTrue(reminder.is_read)
        self.assertFalse(reminder.is_sent)

    def test_message_recipient_and_read_state_are_authorized(self):
        self.client.force_authenticate(self.customer)
        created = self.client.post(
            '/api/communications/messages/',
            {
                'recipient': self.dealer.id,
                'subject': 'Service question',
                'body': 'Could you confirm the schedule?',
            },
            format='json',
        )
        self.assertEqual(created.status_code, 201)
        message = CustomerMessage.objects.get(pk=created.data['id'])

        forged_read = self.client.patch(
            f'/api/communications/messages/{message.id}/',
            {'is_read': True},
            format='json',
        )
        self.assertEqual(forged_read.status_code, 400)
        sender_mark = self.client.patch(f'/api/communications/messages/{message.id}/mark_read/')
        self.assertEqual(sender_mark.status_code, 403)

        self.client.force_authenticate(self.other_customer)
        self.assertEqual(self.client.get('/api/communications/messages/').data['count'], 0)
        self.assertEqual(
            self.client.get(f'/api/communications/messages/{message.id}/').status_code,
            404,
        )

        self.client.force_authenticate(self.dealer)
        received = self.client.get(f'/api/communications/messages/{message.id}/')
        self.assertEqual(received.status_code, 200)
        self.assertEqual(received.data['sender_details']['id'], self.customer.id)
        marked = self.client.patch(f'/api/communications/messages/{message.id}/mark_read/')
        self.assertEqual(marked.status_code, 200)
        message.refresh_from_db()
        self.assertTrue(message.is_read)

    def test_only_message_sender_can_edit_or_delete_and_recipient_cannot_be_changed(self):
        message = CustomerMessage.objects.create(
            sender=self.customer,
            recipient=self.dealer,
            subject='Original subject',
            body='Original body',
        )
        self.client.force_authenticate(self.dealer)
        self.assertEqual(
            self.client.patch(
                f'/api/communications/messages/{message.id}/',
                {'body': 'Unauthorized edit'},
                format='json',
            ).status_code,
            403,
        )

        self.client.force_authenticate(self.customer)
        updated = self.client.patch(
            f'/api/communications/messages/{message.id}/',
            {'recipient': self.other_customer.id, 'subject': 'Updated subject'},
            format='json',
        )
        self.assertEqual(updated.status_code, 400)
        updated_subject = self.client.patch(
            f'/api/communications/messages/{message.id}/',
            {'subject': 'Updated subject'},
            format='json',
        )
        self.assertEqual(updated_subject.status_code, 200)
        message.refresh_from_db()
        self.assertEqual(message.recipient, self.dealer)
        self.assertEqual(message.subject, 'Updated subject')
