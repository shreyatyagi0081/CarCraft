from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Cart, CartItem, Order, PartCategory, PartProduct


User = get_user_model()


class EcommerceIntegrationTests(APITestCase):
    def setUp(self):
        self.customer = User.objects.create_user(
            username='phase6-customer',
            email='phase6-customer@example.com',
            password='StrongPass123!',
            role=User.Role.CUSTOMER,
        )
        self.dealer = User.objects.create_user(
            username='phase6-dealer',
            email='phase6-dealer@example.com',
            password='StrongPass123!',
            role=User.Role.DEALER_ADMIN,
        )
        self.category = PartCategory.objects.create(name='Phase 6 Parts', slug='phase-6-parts')
        self.in_stock_product = PartProduct.objects.create(
            sku='PHASE6-IN-STOCK',
            name='In-stock part',
            category=self.category,
            brand='CarCraft',
            cost_price=Decimal('5.00'),
            price=Decimal('10.00'),
            stock_quantity=2,
        )
        self.out_of_stock_product = PartProduct.objects.create(
            sku='PHASE6-OUT-OF-STOCK',
            name='Out-of-stock part',
            category=self.category,
            brand='CarCraft',
            cost_price=Decimal('5.00'),
            price=Decimal('10.00'),
            stock_quantity=0,
        )
        self.client.force_authenticate(user=self.customer)

    def test_stock_quantity_filter_returns_only_matching_products(self):
        response = self.client.get('/api/ecommerce/products/', {'stock_quantity__gte': 1})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [product['id'] for product in response.data['results']],
            [self.in_stock_product.id],
        )

    def test_cart_rejects_non_integer_quantity(self):
        response = self.client.post('/api/ecommerce/cart/', {
            'product_id': self.in_stock_product.id,
            'quantity': 'not-a-number',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Cart.objects.filter(user=self.customer).exists())

    def test_checkout_creates_order_and_decrements_inventory(self):
        add_response = self.client.post('/api/ecommerce/cart/', {
            'product_id': self.in_stock_product.id,
            'quantity': 2,
        }, format='json')
        self.assertEqual(add_response.status_code, status.HTTP_200_OK)

        checkout_response = self.client.post('/api/ecommerce/checkout/', {
            'shipping_full_name': 'Phase Six Customer',
            'shipping_address': '123 Test Street',
            'shipping_city': 'Test City',
            'shipping_state': 'TS',
            'shipping_zip_code': '12345',
            'shipping_phone': '5551234567',
            'payment_method': Order.PaymentMethod.COD,
        }, format='json')

        self.assertEqual(checkout_response.status_code, status.HTTP_201_CREATED)
        order = Order.objects.get(customer=self.customer)
        self.assertEqual(order.subtotal, Decimal('20.00'))
        self.assertEqual(order.total_amount, Decimal('36.60'))
        self.assertEqual(order.items.get().quantity, 2)
        self.in_stock_product.refresh_from_db()
        self.assertEqual(self.in_stock_product.stock_quantity, 0)
        self.assertFalse(CartItem.objects.filter(cart__user=self.customer).exists())

    def test_dealer_restock_rejects_non_integer_quantity(self):
        self.client.force_authenticate(user=self.dealer)
        response = self.client.patch(
            f'/api/ecommerce/products/{self.in_stock_product.id}/restock/',
            {'quantity': 'not-a-number'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_customer_cannot_view_another_customers_order(self):
        other_customer = User.objects.create_user(
            username='phase6-other-customer',
            email='phase6-other@example.com',
            password='StrongPass123!',
            role=User.Role.CUSTOMER,
        )
        order = self.create_order(other_customer)

        response = self.client.get(f'/api/ecommerce/orders/{order.id}/')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_customer_cannot_change_payment_or_order_status(self):
        order = self.create_order(self.customer)

        response = self.client.patch(
            f'/api/ecommerce/orders/{order.id}/',
            {
                'payment_method': Order.PaymentMethod.CARD,
                'payment_status': Order.PaymentStatus.PAID,
                'fulfillment_status': Order.FulfillmentStatus.SHIPPED,
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        order.refresh_from_db()
        self.assertEqual(order.payment_method, Order.PaymentMethod.COD)
        self.assertEqual(order.payment_status, Order.PaymentStatus.PENDING)
        self.assertEqual(order.fulfillment_status, Order.FulfillmentStatus.PROCESSING)

    def create_order(self, customer):
        return Order.objects.create(
            customer=customer,
            shipping_full_name='Phase Six Customer',
            shipping_address='123 Test Street',
            shipping_city='Test City',
            shipping_state='TS',
            shipping_zip_code='12345',
            shipping_phone='5551234567',
            subtotal=Decimal('10.00'),
            shipping_fee=Decimal('15.00'),
            tax_amount=Decimal('0.80'),
            total_amount=Decimal('25.80'),
            payment_method=Order.PaymentMethod.COD,
        )
