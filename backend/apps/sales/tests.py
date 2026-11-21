from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.vehicles.models import Vehicle, VehicleMake, VehicleModel
from .models import Quotation, SalesLead, VehicleOrder

User = get_user_model()


class SalesApiContractTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.dealer = User.objects.create_user(
            username='sales_dealer',
            email='sales_dealer@test.com',
            password='password123',
            role=User.Role.DEALER_ADMIN,
        )
        self.customer = User.objects.create_user(
            username='sales_customer',
            email='sales_customer@test.com',
            password='password123',
            role=User.Role.CUSTOMER,
        )
        make = VehicleMake.objects.create(name='Sales Test Make')
        model = VehicleModel.objects.create(make=make, name='Sales Test Model')
        self.vehicle = Vehicle.objects.create(
            vin='SALESTESTVIN00001',
            model=model,
            year=2025,
            mileage=100,
            fuel_type=Vehicle.FuelType.PETROL,
            transmission=Vehicle.Transmission.AUTOMATIC,
            exterior_color='Black',
            cost_price=Decimal('20000.00'),
            selling_price=Decimal('30000.00'),
            created_by=self.dealer,
        )

    def test_lead_contract_status_and_created_date_filters(self):
        self.client.force_authenticate(user=self.customer)
        response = self.client.post('/api/sales/leads/', {
            'first_name': 'Alex',
            'last_name': 'Driver',
            'email': 'alex.driver@test.com',
            'phone': '555-0101',
            'interested_vehicle': self.vehicle.id,
            'source': SalesLead.LeadSource.WEBSITE,
        })
        self.assertEqual(response.status_code, 201)
        lead = SalesLead.objects.get(id=response.data['id'])
        self.assertEqual(response.data['first_name'], 'Alex')
        self.assertEqual(response.data['interested_vehicle'], self.vehicle.id)

        old_date = timezone.now() - timedelta(days=10)
        SalesLead.objects.filter(id=lead.id).update(created_at=old_date)
        self.client.force_authenticate(user=self.dealer)
        response = self.client.get('/api/sales/leads/', {
            'created_at__date__gte': old_date.date().isoformat(),
            'created_at__date__lte': old_date.date().isoformat(),
            'status': SalesLead.LeadStatus.NEW,
            'search': 'Alex',
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['id'], lead.id)

        response = self.client.patch(
            f'/api/sales/leads/{lead.id}/',
            {'status': SalesLead.LeadStatus.CONTACTED},
        )
        self.assertEqual(response.status_code, 200)
        lead.refresh_from_db()
        self.assertEqual(lead.status, SalesLead.LeadStatus.CONTACTED)
        response = self.client.patch(
            f'/api/sales/leads/{lead.id}/',
            {'status': 'contacted'},
        )
        self.assertEqual(response.status_code, 400)

    def test_quotation_contract_create_update_and_customer_permissions(self):
        lead = SalesLead.objects.create(
            customer=self.customer,
            first_name='Casey',
            last_name='Customer',
            email='casey@test.com',
            phone='555-0123',
            interested_vehicle=self.vehicle,
        )
        self.client.force_authenticate(user=self.dealer)
        customers = self.client.get('/api/auth/users/', {'role': User.Role.CUSTOMER})
        self.assertEqual(customers.status_code, 200)
        self.assertIn(self.customer.id, [item['id'] for item in customers.data['results']])

        vehicles = self.client.get('/api/vehicles/inventory/', {'status': Vehicle.Status.AVAILABLE})
        self.assertEqual(vehicles.status_code, 200)
        self.assertIn(self.vehicle.id, [item['id'] for item in vehicles.data['results']])

        response = self.client.post('/api/sales/quotations/', {
            'lead': lead.id,
            'customer': self.customer.id,
            'vehicle': self.vehicle.id,
            'vehicle_price': '30000.00',
            'discount_amount': '1000.00',
            'tax_amount': '0.00',
            'registration_fee': '500.00',
            'insurance_fee': '1200.00',
            'accessories_fee': '0.00',
            'valid_until': '2027-12-31',
            'status': Quotation.QuotationStatus.DRAFT,
            'financing_type': Quotation.FinancingType.CASH,
        })
        self.assertEqual(response.status_code, 201)
        quotation = Quotation.objects.get(id=response.data['id'])
        self.assertEqual(response.data['customer'], self.customer.id)
        self.assertEqual(response.data['vehicle'], self.vehicle.id)
        self.assertEqual(response.data['vehicle_price'], '30000.00')
        self.assertEqual(response.data['total_amount'], '33600.00')

        response = self.client.patch(
            f'/api/sales/quotations/{quotation.id}/',
            {
                'vehicle_price': '31000.00',
                'status': Quotation.QuotationStatus.SENT,
            },
        )
        self.assertEqual(response.status_code, 200)
        quotation.refresh_from_db()
        self.assertEqual(quotation.vehicle_price, Decimal('31000.00'))
        self.assertEqual(quotation.status, Quotation.QuotationStatus.SENT)
        response = self.client.patch(
            f'/api/sales/quotations/{quotation.id}/',
            {'status': 'sent'},
        )
        self.assertEqual(response.status_code, 400)

        self.client.force_authenticate(user=self.customer)
        response = self.client.get(f'/api/sales/quotations/{quotation.id}/')
        self.assertEqual(response.status_code, 200)
        response = self.client.patch(
            f'/api/sales/quotations/{quotation.id}/',
            {'status': Quotation.QuotationStatus.ACCEPTED},
        )
        self.assertEqual(response.status_code, 403)

    def test_vehicle_order_create_and_authorized_status_updates(self):
        self.client.force_authenticate(user=self.customer)
        response = self.client.post('/api/sales/orders/', {
            'customer': self.customer.id,
            'vehicle': self.vehicle.id,
            'total_price': '30000.00',
        })
        self.assertEqual(response.status_code, 403)

        self.client.force_authenticate(user=self.dealer)
        response = self.client.post('/api/sales/orders/', {
            'customer': self.customer.id,
            'vehicle': self.vehicle.id,
            'total_price': '30000.00',
            'deposit_paid': '5000.00',
            'payment_status': VehicleOrder.PaymentStatus.PARTIAL,
            'order_status': VehicleOrder.OrderStatus.ORDER_PLACED,
            'delivery_date': '2027-01-15',
        })
        self.assertEqual(response.status_code, 201)
        order = VehicleOrder.objects.get(id=response.data['id'])
        self.assertEqual(response.data['total_price'], '30000.00')
        self.assertEqual(response.data['customer'], self.customer.id)
        self.assertEqual(response.data['vehicle'], self.vehicle.id)

        response = self.client.patch(
            f'/api/sales/orders/{order.id}/update_order_status/',
            {
                'order_status': VehicleOrder.OrderStatus.READY_FOR_DELIVERY,
                'payment_status': VehicleOrder.PaymentStatus.PAID,
            },
        )
        self.assertEqual(response.status_code, 200)
        order.refresh_from_db()
        self.assertEqual(order.order_status, VehicleOrder.OrderStatus.READY_FOR_DELIVERY)
        self.assertEqual(order.payment_status, VehicleOrder.PaymentStatus.PAID)

        self.client.force_authenticate(user=self.customer)
        response = self.client.patch(
            f'/api/sales/orders/{order.id}/update_order_status/',
            {'order_status': VehicleOrder.OrderStatus.CANCELLED},
        )
        self.assertEqual(response.status_code, 403)

        self.client.force_authenticate(user=self.dealer)
        response = self.client.patch(
            f'/api/sales/orders/{order.id}/update_order_status/',
            {'order_status': 'COMPLETED'},
        )
        self.assertEqual(response.status_code, 400)
        order.refresh_from_db()
        self.assertEqual(order.order_status, VehicleOrder.OrderStatus.READY_FOR_DELIVERY)
