from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.sales.models import SalesLead, VehicleOrder
from apps.vehicles.models import Vehicle, VehicleMake, VehicleModel

User = get_user_model()


class DealerDashboardAnalyticsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.dealer = User.objects.create_user(
            username='analytics_dealer',
            email='analytics_dealer@test.com',
            password='password123',
            role=User.Role.DEALER_ADMIN,
        )
        self.customer = User.objects.create_user(
            username='analytics_customer',
            email='analytics_customer@test.com',
            password='password123',
            role=User.Role.CUSTOMER,
        )

    def test_dashboard_and_sales_by_make_require_dealer_access(self):
        for endpoint in ['/api/analytics/dashboard/', '/api/analytics/sales-by-make/']:
            self.assertEqual(self.client.get(endpoint).status_code, 401)

        self.client.force_authenticate(user=self.customer)
        for endpoint in ['/api/analytics/dashboard/', '/api/analytics/sales-by-make/']:
            self.assertEqual(self.client.get(endpoint).status_code, 403)

        self.client.force_authenticate(user=self.dealer)
        self.assertEqual(self.client.get('/api/analytics/dashboard/').status_code, 200)
        self.assertEqual(self.client.get('/api/analytics/sales-by-make/').status_code, 200)

    def test_dashboard_and_make_report_reflect_database_changes(self):
        self.client.force_authenticate(user=self.dealer)
        initial = self.client.get('/api/analytics/dashboard/')
        self.assertEqual(initial.status_code, 200)
        self.assertEqual(initial.data['inventory_analytics']['total_vehicles'], 0)
        self.assertEqual(initial.data['lead_conversion_funnel']['total_leads'], 0)
        self.assertEqual(self.client.get('/api/analytics/sales-by-make/').data['makes'], [])

        make = VehicleMake.objects.create(name='Analytics Test Make')
        model = VehicleModel.objects.create(make=make, name='Analytics Test Model')
        vehicle = Vehicle.objects.create(
            vin='ANALYTICS00000001',
            model=model,
            year=2025,
            mileage=100,
            fuel_type=Vehicle.FuelType.ELECTRIC,
            transmission=Vehicle.Transmission.AUTOMATIC,
            exterior_color='Blue',
            cost_price=Decimal('30000.00'),
            selling_price=Decimal('42000.00'),
            status=Vehicle.Status.SOLD,
            created_by=self.dealer,
        )
        SalesLead.objects.create(
            customer=self.customer,
            first_name='New',
            email='new_lead@test.com',
            phone='555-1001',
            status=SalesLead.LeadStatus.NEW,
        )
        SalesLead.objects.create(
            customer=self.customer,
            first_name='Won',
            email='won_lead@test.com',
            phone='555-1002',
            status=SalesLead.LeadStatus.WON,
        )
        VehicleOrder.objects.create(
            customer=self.customer,
            vehicle=vehicle,
            total_price=Decimal('42000.00'),
            order_status=VehicleOrder.OrderStatus.DELIVERED,
            payment_status=VehicleOrder.PaymentStatus.PAID,
        )

        refreshed = self.client.get('/api/analytics/dashboard/')
        self.assertEqual(refreshed.status_code, 200)
        self.assertEqual(refreshed.data['inventory_analytics']['total_vehicles'], 1)
        self.assertEqual(refreshed.data['inventory_analytics']['sold_count'], 1)
        self.assertEqual(refreshed.data['lead_conversion_funnel']['total_leads'], 2)
        self.assertEqual(refreshed.data['lead_conversion_funnel']['new'], 1)
        self.assertEqual(refreshed.data['lead_conversion_funnel']['won'], 1)
        self.assertEqual(refreshed.data['lead_conversion_funnel']['conversion_rate_percentage'], 50)
        self.assertEqual(refreshed.data['sales_performance']['units_sold'], 1)
        self.assertEqual(Decimal(str(refreshed.data['dealership_summary']['gross_revenue'])), Decimal('42000.00'))

        make_report = self.client.get('/api/analytics/sales-by-make/')
        self.assertEqual(make_report.status_code, 200)
        self.assertEqual(make_report.data['makes'], [{
            'model__make__name': 'Analytics Test Make',
            'total_count': 1,
            'sold_count': 1,
            'available_count': 0,
            'total_revenue': Decimal('42000.00'),
        }])
