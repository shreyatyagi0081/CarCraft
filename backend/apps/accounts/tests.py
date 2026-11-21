from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase


User = get_user_model()


class AuthenticationIntegrationTests(APITestCase):
    def test_customer_can_register_and_login_with_email_or_username(self):
        registration = self.client.post('/api/auth/register/', {
            'username': 'phase6-customer',
            'email': 'phase6@example.com',
            'password': 'StrongPass123!',
            'password_confirm': 'StrongPass123!',
            'first_name': 'Phase',
            'last_name': 'Six',
        }, format='json')

        self.assertEqual(registration.status_code, status.HTTP_201_CREATED)
        self.assertEqual(registration.data['role'], User.Role.CUSTOMER)
        registered_user_id = User.objects.get(username='phase6-customer').id

        for identifier in ('phase6-customer', 'PHASE6@example.com'):
            response = self.client.post('/api/auth/login/', {
                'username': identifier,
                'password': 'StrongPass123!',
            }, format='json')
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(response.data['user']['id'], registered_user_id)

    def test_public_registration_cannot_assign_dealer_role(self):
        response = self.client.post('/api/auth/register/', {
            'username': 'phase6-dealer-attempt',
            'email': 'phase6-dealer@example.com',
            'password': 'StrongPass123!',
            'password_confirm': 'StrongPass123!',
            'role': User.Role.DEALER_ADMIN,
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(username='phase6-dealer-attempt').exists())

    def test_invalid_login_returns_unauthorized(self):
        response = self.client.post('/api/auth/login/', {
            'username': 'missing@example.com',
            'password': 'incorrect-password',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
