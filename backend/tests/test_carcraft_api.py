import pytest
from decimal import Decimal
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.vehicles.models import VehicleMake, VehicleModel, Vehicle, VehicleImage
from apps.sales.models import SalesLead, Quotation, VehicleOrder
from apps.ecommerce.models import PartCategory, PartProduct, Cart, CartItem, Order
from apps.services.models import ServiceSkill, TechnicianProfile, ServiceType, ServiceAppointment
from apps.reviews.models import Review

User = get_user_model()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def dealer_user(db):
    user = User.objects.create_user(
        username='test_dealer',
        email='dealer@test.com',
        password='password123',
        role=User.Role.DEALER_ADMIN,
        dealership_name='Test Motors'
    )
    return user

@pytest.fixture
def customer_user(db):
    user = User.objects.create_user(
        username='test_customer',
        email='customer@test.com',
        password='password123',
        role=User.Role.CUSTOMER
    )
    return user

@pytest.fixture
def sample_vehicle(db, dealer_user):
    make = VehicleMake.objects.create(name='Toyota', country_of_origin='Japan')
    model = VehicleModel.objects.create(make=make, name='Camry', body_type='SEDAN')
    return Vehicle.objects.create(
        vin='12345678901234567',
        model=model,
        year=2024,
        mileage=100,
        fuel_type=Vehicle.FuelType.PETROL,
        transmission=Vehicle.Transmission.AUTOMATIC,
        exterior_color='Black',
        cost_price=Decimal('25000.00'),
        selling_price=Decimal('30000.00'),
        status=Vehicle.Status.AVAILABLE,
        created_by=dealer_user
    )

@pytest.fixture
def sample_part(db):
    cat = PartCategory.objects.create(name='Brakes', slug='brakes')
    return PartProduct.objects.create(
        sku='BRK-001',
        name='Premium Brake Pads',
        category=cat,
        brand='Brembo',
        cost_price=Decimal('30.00'),
        price=Decimal('60.00'),
        stock_quantity=20
    )


# 1. Accounts & Authentication Tests
@pytest.mark.django_db
def test_jwt_login(api_client, customer_user):
    response = api_client.post('/api/auth/login/', {
        'username': 'test_customer',
        'password': 'password123'
    })
    assert response.status_code == 200
    assert 'access' in response.data
    assert 'refresh' in response.data
    assert response.data['user']['role'] == 'CUSTOMER'

@pytest.mark.django_db
def test_user_registration(api_client):
    response = api_client.post('/api/auth/register/', {
        'username': 'new_customer',
        'email': 'new@test.com',
        'password': 'password123',
        'password_confirm': 'password123',
        'role': 'CUSTOMER'
    })
    assert response.status_code == 201
    assert User.objects.filter(username='new_customer').exists()


@pytest.mark.parametrize(
    'role',
    [User.Role.DEALER_ADMIN, User.Role.DEALER_STAFF, User.Role.TECHNICIAN],
)
@pytest.mark.django_db
def test_public_registration_rejects_privileged_roles(api_client, role):
    response = api_client.post('/api/auth/register/', {
        'username': f'privileged_{role.lower()}',
        'email': f'{role.lower()}@test.com',
        'password': 'password123',
        'password_confirm': 'password123',
        'role': role,
    })

    assert response.status_code == 400
    assert not User.objects.filter(username=f'privileged_{role.lower()}').exists()


@pytest.mark.parametrize('role', [User.Role.DEALER_ADMIN, User.Role.TECHNICIAN])
def test_user_cannot_change_own_role_from_profile(api_client, customer_user, role):
    api_client.force_authenticate(user=customer_user)

    response = api_client.patch('/api/auth/profile/', {'role': role})

    assert response.status_code == 200
    customer_user.refresh_from_db()
    assert customer_user.role == User.Role.CUSTOMER


# 2. Vehicle Inventory Tests (Module 1)
@pytest.mark.django_db
def test_vehicle_inventory_listing(api_client, sample_vehicle):
    response = api_client.get('/api/vehicles/inventory/')
    assert response.status_code == 200
    results = response.data['results'] if 'results' in response.data else response.data
    assert len(results) >= 1
    # Check that cost_price is masked for anonymous visitors
    assert 'cost_price' not in results[0]


@pytest.mark.django_db
def test_vehicle_inventory_search_filters_and_pagination(
    api_client, dealer_user, sample_vehicle
):
    api_client.force_authenticate(user=dealer_user)
    model = sample_vehicle.model
    for index in range(12):
        Vehicle.objects.create(
            vin=f'FILTER{index:011d}',
            model=model,
            year=2020 + index,
            mileage=1000 + index,
            fuel_type=Vehicle.FuelType.PETROL,
            transmission=Vehicle.Transmission.AUTOMATIC,
            exterior_color='Blue',
            cost_price=Decimal('20000.00'),
            selling_price=Decimal('30000.00'),
            created_by=dealer_user,
        )

    page_one = api_client.get('/api/vehicles/inventory/')
    assert page_one.status_code == 200
    assert page_one.data['count'] == 13
    assert len(page_one.data['results']) == 12
    assert page_one.data['next']

    page_two = api_client.get('/api/vehicles/inventory/', {'page': 2})
    assert page_two.status_code == 200
    assert len(page_two.data['results']) == 1
    assert page_two.data['previous']

    filtered = api_client.get('/api/vehicles/inventory/', {
        'search': 'FILTER',
        'model__make': model.make_id,
        'year__gte': 2025,
        'selling_price__lte': '30000',
        'fuel_type': Vehicle.FuelType.PETROL,
    })
    assert filtered.status_code == 200
    assert filtered.data['count'] == 7
    assert all(item['model'] == model.id for item in filtered.data['results'])
    assert all(item['year'] >= 2025 for item in filtered.data['results'])

    for index in range(12):
        VehicleMake.objects.create(name=f'ZZ Test Make {index:02d}')

    make_page = api_client.get('/api/vehicles/makes/')
    assert make_page.status_code == 200
    assert make_page.data['count'] == 13
    assert len(make_page.data['results']) == 12
    assert make_page.data['next']
    assert make_page.data['results'][0]['models'][0]['id'] == model.id
    make_page_two = api_client.get('/api/vehicles/makes/', {'page': 2})
    assert make_page_two.status_code == 200
    assert len(make_page_two.data['results']) == 1


@pytest.mark.django_db
def test_dealer_can_create_and_retrieve_vehicle_with_media_urls(
    api_client, dealer_user, sample_vehicle
):
    api_client.force_authenticate(user=dealer_user)
    response = api_client.post('/api/vehicles/inventory/', {
        'vin': 'CARCRAFTTEST00001',
        'model': sample_vehicle.model_id,
        'year': 2025,
        'mileage': 2500,
        'condition': Vehicle.Condition.CERTIFIED_PRE_OWNED,
        'fuel_type': Vehicle.FuelType.HYBRID,
        'transmission': Vehicle.Transmission.AUTOMATIC,
        'exterior_color': 'Silver',
        'interior_color': 'Black',
        'engine_details': '2.0L Hybrid',
        'seating_capacity': 5,
        'cost_price': '20000.00',
        'selling_price': '25000.00',
        'discount_price': '24000.00',
        'primary_image_url': 'https://images.example.test/car.jpg',
        'status': Vehicle.Status.AVAILABLE,
        'description': 'Inventory API test vehicle',
    }, format='json')
    assert response.status_code == 201
    assert response.data['model'] == sample_vehicle.model_id
    assert response.data['year'] == 2025
    assert response.data['mileage'] == 2500
    assert response.data['selling_price'] == '25000.00'
    assert response.data['primary_image_url'] == 'https://images.example.test/car.jpg'

    vehicle = Vehicle.objects.get(vin='CARCRAFTTEST00001')
    vehicle.primary_image.name = 'vehicles/primary.jpg'
    vehicle.save(update_fields=['primary_image'])
    gallery = VehicleImage.objects.create(
        vehicle=vehicle,
        image_url='https://images.example.test/gallery.jpg',
        is_primary=True,
    )

    detail = api_client.get(f'/api/vehicles/inventory/{vehicle.id}/')
    assert detail.status_code == 200
    assert detail.data['primary_image'].endswith('/media/vehicles/primary.jpg')
    assert detail.data['images'][0]['image_url'] == gallery.image_url
    assert detail.data['images'][0]['image'] is None


# 3. Sales Lead & Opportunity Tests (Module 2 & 3)
@pytest.mark.django_db
def test_create_sales_lead(api_client, sample_vehicle):
    response = api_client.post('/api/sales/leads/', {
        'first_name': 'Robert',
        'last_name': 'Downey',
        'email': 'robert@test.com',
        'phone': '1234567890',
        'interested_vehicle': sample_vehicle.id,
        'source': 'WEBSITE'
    })
    assert response.status_code == 201
    assert SalesLead.objects.filter(email='robert@test.com').exists()


# 4. E-Commerce Cart & Checkout Tests (Module 5, 6, 7)
@pytest.mark.django_db
def test_cart_and_checkout(api_client, customer_user, sample_part):
    api_client.force_authenticate(user=customer_user)
    
    # Add to cart
    add_resp = api_client.post('/api/ecommerce/cart/', {
        'product_id': sample_part.id,
        'quantity': 2
    })
    assert add_resp.status_code == 200
    assert add_resp.data['total_items'] == 2

    # Checkout
    checkout_resp = api_client.post('/api/ecommerce/checkout/', {
        'shipping_full_name': 'Test Customer',
        'shipping_address': '123 Test St',
        'shipping_city': 'Cityville',
        'shipping_state': 'ST',
        'shipping_zip_code': '12345',
        'shipping_phone': '555-1234',
        'payment_method': 'CARD'
    })
    assert checkout_resp.status_code == 201
    assert Order.objects.filter(customer=customer_user).exists()
    assert checkout_resp.data['order']['payment_status'] == Order.PaymentStatus.PENDING
    
    # Verify stock decremented
    sample_part.refresh_from_db()
    assert sample_part.stock_quantity == 18


@pytest.mark.django_db
def test_vehicle_order_customer_scope_and_field_permissions(
    api_client, customer_user, dealer_user, sample_vehicle
):
    other_customer = User.objects.create_user(
        username='other_vehicle_customer',
        email='other_vehicle_customer@test.com',
        password='password123',
    )
    order = VehicleOrder.objects.create(
        customer=customer_user,
        vehicle=sample_vehicle,
        total_price=Decimal('30000.00'),
    )
    other_order = VehicleOrder.objects.create(
        customer=other_customer,
        vehicle=sample_vehicle,
        total_price=Decimal('30000.00'),
    )
    api_client.force_authenticate(user=customer_user)

    response = api_client.patch(
        f'/api/sales/orders/{other_order.id}/',
        {'order_status': VehicleOrder.OrderStatus.DELIVERED},
    )
    assert response.status_code == 404

    response = api_client.patch(
        f'/api/sales/orders/{order.id}/',
        {
            'total_price': '1.00',
            'payment_status': VehicleOrder.PaymentStatus.PAID,
            'order_status': VehicleOrder.OrderStatus.DELIVERED,
            'deposit_paid': '30000.00',
        },
    )
    assert response.status_code == 400
    order.refresh_from_db()
    assert order.total_price == Decimal('30000.00')
    assert order.payment_status == VehicleOrder.PaymentStatus.PENDING
    assert order.order_status == VehicleOrder.OrderStatus.ORDER_PLACED

    response = api_client.patch(f'/api/sales/orders/{order.id}/', {'notes': 'Customer note'})
    assert response.status_code == 200

    response = api_client.post('/api/sales/orders/', {
        'customer': customer_user.id,
        'vehicle': sample_vehicle.id,
        'total_price': '30000.00',
    })
    assert response.status_code == 403

    api_client.force_authenticate(user=dealer_user)
    response = api_client.patch(
        f'/api/sales/orders/{order.id}/',
        {
            'total_price': '28000.00',
            'payment_status': VehicleOrder.PaymentStatus.PARTIAL,
            'order_status': VehicleOrder.OrderStatus.DOCUMENTS_VERIFIED,
        },
    )
    assert response.status_code == 200
    order.refresh_from_db()
    assert order.total_price == Decimal('28000.00')
    assert order.payment_status == VehicleOrder.PaymentStatus.PARTIAL


@pytest.mark.django_db
def test_ecommerce_order_customer_scope_and_field_permissions(
    api_client, customer_user, dealer_user
):
    other_customer = User.objects.create_user(
        username='other_parts_customer',
        email='other_parts_customer@test.com',
        password='password123',
    )
    order_fields = {
        'shipping_full_name': 'Test Customer',
        'shipping_address': '123 Test St',
        'shipping_city': 'Cityville',
        'shipping_state': 'ST',
        'shipping_zip_code': '12345',
        'shipping_phone': '555-1234',
        'subtotal': Decimal('100.00'),
        'total_amount': Decimal('123.00'),
    }
    order = Order.objects.create(customer=customer_user, **order_fields)
    other_order = Order.objects.create(customer=other_customer, **order_fields)
    api_client.force_authenticate(user=customer_user)

    response = api_client.patch(
        f'/api/ecommerce/orders/{other_order.id}/',
        {'payment_status': Order.PaymentStatus.PAID},
    )
    assert response.status_code == 404

    response = api_client.patch(
        f'/api/ecommerce/orders/{order.id}/',
        {
            'customer': other_customer.id,
            'subtotal': '1.00',
            'shipping_fee': '0.00',
            'payment_status': Order.PaymentStatus.PAID,
            'fulfillment_status': Order.FulfillmentStatus.DELIVERED,
        },
    )
    assert response.status_code == 400
    order.refresh_from_db()
    assert order.customer == customer_user
    assert order.subtotal == Decimal('100.00')
    assert order.payment_status == Order.PaymentStatus.PENDING
    assert order.fulfillment_status == Order.FulfillmentStatus.PROCESSING

    response = api_client.patch(
        f'/api/ecommerce/orders/{order.id}/',
        {'shipping_address': '456 New Address'},
    )
    assert response.status_code == 200

    response = api_client.post('/api/ecommerce/orders/', {
        **order_fields,
        'customer': customer_user.id,
    })
    assert response.status_code == 403

    api_client.force_authenticate(user=dealer_user)
    response = api_client.patch(
        f'/api/ecommerce/orders/{order.id}/update_shipping/',
        {'fulfillment_status': Order.FulfillmentStatus.SHIPPED},
    )
    assert response.status_code == 200
    order.refresh_from_db()
    assert order.fulfillment_status == Order.FulfillmentStatus.SHIPPED


# 5. Service Appointment Booking (Module 9, 10, 11)
@pytest.mark.django_db
def test_book_service_appointment(api_client, customer_user, sample_vehicle):
    api_client.force_authenticate(user=customer_user)
    svc = ServiceType.objects.create(name='Brake Check', base_price=Decimal('50.00'))
    
    response = api_client.post('/api/services/appointments/', {
        'vehicle': sample_vehicle.id,
        'service_types': [svc.id],
        'scheduled_datetime': '2026-12-01T10:00:00Z',
        'customer_notes': 'Please check front brakes'
    })
    assert response.status_code == 201
    assert ServiceAppointment.objects.filter(customer=customer_user).exists()


@pytest.mark.django_db
def test_customer_cannot_change_appointment_status_or_staff_fields(
    api_client, customer_user, dealer_user
):
    api_client.force_authenticate(user=customer_user)
    service_type = ServiceType.objects.create(
        name='Security test service',
        estimated_duration_minutes=60,
        base_price=Decimal('75.00'),
    )
    response = api_client.post('/api/services/appointments/', {
        'service_types': [service_type.id],
        'scheduled_datetime': '2026-12-02T10:00:00Z',
        'custom_vehicle_details': '2020 Test Sedan',
    })
    assert response.status_code == 201
    appointment_id = response.data['id']

    response = api_client.patch(
        f'/api/services/appointments/{appointment_id}/',
        {
            'status': ServiceAppointment.AppointmentStatus.COMPLETED,
            'final_cost': '1.00',
            'technician_diagnostic_notes': 'Forged diagnosis',
        },
    )
    assert response.status_code == 400
    appointment = ServiceAppointment.objects.get(id=appointment_id)
    assert appointment.status == ServiceAppointment.AppointmentStatus.REQUESTED
    assert appointment.final_cost is None

    api_client.force_authenticate(user=dealer_user)
    response = api_client.patch(
        f'/api/services/appointments/{appointment_id}/',
        {'status': ServiceAppointment.AppointmentStatus.CONFIRMED},
    )
    assert response.status_code == 200
    appointment.refresh_from_db()
    assert appointment.status == ServiceAppointment.AppointmentStatus.CONFIRMED

    technician_user = User.objects.create_user(
        username='appointment_technician',
        email='appointment_technician@test.com',
        password='password123',
        role=User.Role.TECHNICIAN,
    )
    technician = TechnicianProfile.objects.create(user=technician_user)
    response = api_client.patch(
        f'/api/services/appointments/{appointment_id}/assign_technician/',
        {'technician_id': technician.id},
    )
    assert response.status_code == 200

    api_client.force_authenticate(user=technician_user)
    response = api_client.patch(
        f'/api/services/appointments/{appointment_id}/',
        {'status': ServiceAppointment.AppointmentStatus.IN_PROGRESS},
    )
    assert response.status_code == 200
    appointment.refresh_from_db()
    assert appointment.status == ServiceAppointment.AppointmentStatus.IN_PROGRESS


@pytest.mark.django_db
def test_technician_cannot_be_double_booked(api_client, customer_user, dealer_user):
    technician_user = User.objects.create_user(
        username='test_technician',
        email='technician@test.com',
        password='password123',
        role=User.Role.TECHNICIAN
    )
    technician = TechnicianProfile.objects.create(user=technician_user)
    service_type = ServiceType.objects.create(
        name='One-hour service',
        estimated_duration_minutes=60,
        base_price=Decimal('75.00')
    )

    api_client.force_authenticate(user=customer_user)
    appointment_ids = []
    for scheduled_datetime in ['2026-12-01T10:00:00Z', '2026-12-01T10:30:00Z']:
        response = api_client.post('/api/services/appointments/', {
            'service_types': [service_type.id],
            'scheduled_datetime': scheduled_datetime,
            'custom_vehicle_details': '2020 Test Sedan',
        })
        assert response.status_code == 201
        appointment_ids.append(response.data['id'])

    api_client.force_authenticate(user=dealer_user)
    first_assignment = api_client.patch(
        f'/api/services/appointments/{appointment_ids[0]}/assign_technician/',
        {'technician_id': technician.id}
    )
    second_assignment = api_client.patch(
        f'/api/services/appointments/{appointment_ids[1]}/assign_technician/',
        {'technician_id': technician.id}
    )

    assert first_assignment.status_code == 200
    assert second_assignment.status_code == 400
    assert 'scheduled_datetime' in second_assignment.data


@pytest.mark.django_db
def test_review_moderation_is_dealer_only_and_reviews_start_pending(
    api_client, customer_user, dealer_user
):
    api_client.force_authenticate(user=customer_user)
    response = api_client.post('/api/reviews/', {
        'review_type': Review.ReviewType.SERVICE,
        'rating': 5,
        'title': 'Attempted self-approval',
        'comment': 'This review should not be approved on submission.',
        'is_approved': True,
        'dealer_response': 'Forged response',
    })
    assert response.status_code == 400

    response = api_client.post('/api/reviews/', {
        'review_type': Review.ReviewType.SERVICE,
        'rating': 5,
        'title': 'Good service',
        'comment': 'The appointment went well.',
    })
    assert response.status_code == 201
    review_id = response.data['id']
    review = Review.objects.get(id=review_id)
    assert review.is_approved is False

    response = api_client.patch(f'/api/reviews/{review_id}/', {'is_approved': True})
    assert response.status_code == 400
    response = api_client.patch(
        f'/api/reviews/{review_id}/',
        {'dealer_response': 'Unauthorized response'},
    )
    assert response.status_code == 400
    review.refresh_from_db()
    assert review.is_approved is False
    assert review.dealer_response is None

    review_by_another_user = Review.objects.create(
        user=dealer_user,
        review_type=Review.ReviewType.SERVICE,
        rating=4,
        title='Another review',
        comment='Another customer review.',
        is_approved=True,
    )
    response = api_client.patch(
        f'/api/reviews/{review_by_another_user.id}/',
        {'title': 'Modified by someone else'},
    )
    assert response.status_code == 403

    api_client.force_authenticate(user=dealer_user)
    response = api_client.patch(
        f'/api/reviews/{review_id}/moderate/',
        {'is_approved': True},
    )
    assert response.status_code == 200
    response = api_client.post(
        f'/api/reviews/{review_id}/respond/',
        {'dealer_response': 'Thank you for the feedback.'},
    )
    assert response.status_code == 200
    review.refresh_from_db()
    assert review.is_approved is True
    assert review.dealer_response == 'Thank you for the feedback.'


# 6. Dealer Performance Analytics (Module 4)
@pytest.mark.django_db
def test_dealer_analytics_endpoint(api_client, dealer_user):
    api_client.force_authenticate(user=dealer_user)
    response = api_client.get('/api/analytics/dashboard/')
    assert response.status_code == 200
    assert 'dealership_summary' in response.data
    assert 'inventory_analytics' in response.data
    assert 'lead_conversion_funnel' in response.data
