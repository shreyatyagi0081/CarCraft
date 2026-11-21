import os
import django
from decimal import Decimal
from datetime import timedelta
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'carcraft.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.accounts.models import CustomerProfile, DealerProfile
from apps.vehicles.models import VehicleMake, VehicleModel, Vehicle
from apps.sales.models import SalesLead, LeadActivity, Quotation, VehicleOrder
from apps.ecommerce.models import PartCategory, PartProduct, Order, OrderItem
from apps.reviews.models import Review
from apps.services.models import ServiceSkill, TechnicianProfile, ServiceType, ServiceAppointment, ServiceHistoryRecord, MaintenanceRecommendation
from apps.communications.models import CustomerMessage, CustomerReminder

User = get_user_model()

def seed_database():
    print("[*] Starting CarCraft Seed Data Generation...")

    # 1. Create Users
    admin_user, _ = User.objects.get_or_create(
        username='dealer_admin',
        defaults={
            'email': 'admin@carcraft.com',
            'first_name': 'Marcus',
            'last_name': 'Vance',
            'role': User.Role.DEALER_ADMIN,
            'dealership_name': 'CarCraft Apex Motors',
            'phone_number': '+1-800-555-0199',
            'is_staff': True,
            'is_superuser': True,
            'is_verified': True,
        }
    )
    admin_user.set_password('admin123')
    admin_user.save()
    DealerProfile.objects.get_or_create(
        user=admin_user,
        defaults={'license_number': 'DLR-NY-8942', 'showroom_location': '742 Evergreen Terrace, New York, NY'}
    )

    sales_staff, _ = User.objects.get_or_create(
        username='dealer_sales',
        defaults={
            'email': 'sales@carcraft.com',
            'first_name': 'Sarah',
            'last_name': 'Connor',
            'role': User.Role.DEALER_STAFF,
            'dealership_name': 'CarCraft Apex Motors',
            'phone_number': '+1-800-555-0144',
            'is_staff': True,
            'is_verified': True,
        }
    )
    sales_staff.set_password('sales123')
    sales_staff.save()
    DealerProfile.objects.get_or_create(
        user=sales_staff,
        defaults={'license_number': 'SLS-NY-1029', 'showroom_location': 'Main Showroom Floor'}
    )

    tech_user, _ = User.objects.get_or_create(
        username='tech_john',
        defaults={
            'email': 'tech.john@carcraft.com',
            'first_name': 'John',
            'last_name': 'Miller',
            'role': User.Role.TECHNICIAN,
            'phone_number': '+1-800-555-0188',
            'is_staff': False,
            'is_verified': True,
        }
    )
    tech_user.set_password('tech123')
    tech_user.save()

    customer_user, _ = User.objects.get_or_create(
        username='customer_alice',
        defaults={
            'email': 'alice.smith@example.com',
            'first_name': 'Alice',
            'last_name': 'Smith',
            'role': User.Role.CUSTOMER,
            'phone_number': '+1-555-321-7654',
            'address': '124 Maple Avenue',
            'city': 'Brooklyn',
            'state': 'NY',
            'zip_code': '11201',
            'is_verified': True,
        }
    )
    customer_user.set_password('pass123')
    customer_user.save()
    CustomerProfile.objects.get_or_create(
        user=customer_user,
        defaults={'driver_license_number': 'DL-NY-987654321', 'preferred_contact_method': 'EMAIL'}
    )

    print("[+] Users seeded (dealer_admin, dealer_sales, tech_john, customer_alice)")

    # 2. Seed Vehicle Makes & Models
    makes_data = [
        {'name': 'Toyota', 'country': 'Japan'},
        {'name': 'Honda', 'country': 'Japan'},
        {'name': 'Ford', 'country': 'USA'},
        {'name': 'BMW', 'country': 'Germany'},
        {'name': 'Tesla', 'country': 'USA'},
    ]
    created_makes = {}
    for m in makes_data:
        make_obj, _ = VehicleMake.objects.get_or_create(name=m['name'], defaults={'country_of_origin': m['country']})
        created_makes[m['name']] = make_obj

    models_data = [
        {'make': 'Toyota', 'name': 'Camry', 'body': 'SEDAN'},
        {'make': 'Toyota', 'name': 'RAV4', 'body': 'SUV'},
        {'make': 'Honda', 'name': 'Civic', 'body': 'SEDAN'},
        {'make': 'Honda', 'name': 'CR-V', 'body': 'SUV'},
        {'make': 'BMW', 'name': '3 Series 330i', 'body': 'SEDAN'},
        {'make': 'Ford', 'name': 'F-150 Lightning', 'body': 'TRUCK'},
        {'make': 'Tesla', 'name': 'Model 3 Long Range', 'body': 'SEDAN'},
    ]
    created_models = {}
    for mod in models_data:
        mod_obj, _ = VehicleModel.objects.get_or_create(
            make=created_makes[mod['make']],
            name=mod['name'],
            defaults={'body_type': mod['body']}
        )
        created_models[f"{mod['make']} {mod['name']}"] = mod_obj

    print("[+] Vehicle Makes & Models seeded.")

    # 3. Seed Vehicle Inventory
    vehicles_data = [
        {
            'vin': '4T1B11HK5PU123456',
            'model': created_models['Toyota Camry'],
            'trim': 'XLE V6 Premium',
            'year': 2024,
            'mileage': 15,
            'condition': Vehicle.Condition.NEW,
            'fuel_type': Vehicle.FuelType.PETROL,
            'transmission': Vehicle.Transmission.AUTOMATIC,
            'exterior_color': 'Midnight Black Metallic',
            'interior_color': 'Black Perforated Leather',
            'engine_details': '3.5L DOHC V6 301 HP',
            'cost_price': Decimal('31000.00'),
            'selling_price': Decimal('36500.00'),
            'discount_price': Decimal('34990.00'),
            'status': Vehicle.Status.AVAILABLE,
            'primary_image_url': 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=800&q=80',
            'description': 'Brand new Toyota Camry XLE with panoramic sunroof, JBL premium audio, and Toyota Safety Sense 2.5+.',
            'key_features': ['Panoramic Glass Roof', '10-inch HUD', 'JBL 9-Speaker Audio', 'Heated & Ventilated Front Seats'],
        },
        {
            'vin': '2T3P1RFV9RC789012',
            'model': created_models['Toyota RAV4'],
            'trim': 'Hybrid Limited AWD',
            'year': 2024,
            'mileage': 450,
            'condition': Vehicle.Condition.CERTIFIED_PRE_OWNED,
            'fuel_type': Vehicle.FuelType.HYBRID,
            'transmission': Vehicle.Transmission.CVT,
            'exterior_color': 'Ruby Flare Pearl',
            'interior_color': 'Nutmeg SofTex',
            'engine_details': '2.5L 4-Cylinder Hybrid 219 HP',
            'cost_price': Decimal('34500.00'),
            'selling_price': Decimal('39900.00'),
            'discount_price': None,
            'status': Vehicle.Status.AVAILABLE,
            'primary_image_url': 'https://images.unsplash.com/photo-1581540222194-0def2dda95b8?auto=format&fit=crop&w=800&q=80',
            'description': 'Certified Pre-Owned RAV4 Hybrid AWD with low miles, excellent fuel economy, and factory warranty.',
            'key_features': ['Electronic On-Demand AWD', '360 Bird-Eye Camera', 'Digital Rearview Mirror', 'Hands-Free Power Liftgate'],
        },
        {
            'vin': '19XFC2F59RE345678',
            'model': created_models['Honda Civic'],
            'trim': 'Sport Touring',
            'year': 2023,
            'mileage': 12400,
            'condition': Vehicle.Condition.USED,
            'fuel_type': Vehicle.FuelType.PETROL,
            'transmission': Vehicle.Transmission.CVT,
            'exterior_color': 'Sonic Gray Pearl',
            'interior_color': 'Black Cloth/Leatherette',
            'engine_details': '1.5L Turbo 4-Cylinder 180 HP',
            'cost_price': Decimal('22000.00'),
            'selling_price': Decimal('26800.00'),
            'discount_price': Decimal('25900.00'),
            'status': Vehicle.Status.AVAILABLE,
            'primary_image_url': 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=800&q=80',
            'description': 'Clean title, single owner Honda Civic Sport Touring with full service records.',
            'key_features': ['Wireless Apple CarPlay & Android Auto', 'Bose Premium Audio', 'Sport Alloy Wheels'],
        },
        {
            'vin': 'WBA5R7C58PF456789',
            'model': created_models['BMW 3 Series 330i'],
            'trim': 'M Sport Package',
            'year': 2024,
            'mileage': 50,
            'condition': Vehicle.Condition.NEW,
            'fuel_type': Vehicle.FuelType.PETROL,
            'transmission': Vehicle.Transmission.AUTOMATIC,
            'exterior_color': 'Portimao Blue Metallic',
            'interior_color': 'Cognac Vernasca Leather',
            'engine_details': '2.0L TwinPower Turbo 255 HP',
            'cost_price': Decimal('43000.00'),
            'selling_price': Decimal('51200.00'),
            'discount_price': None,
            'status': Vehicle.Status.RESERVED,
            'primary_image_url': 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=80',
            'description': 'Dynamic luxury sports sedan with BMW Curved Display, M Aerodynamics package, and adaptive suspension.',
            'key_features': ['BMW Curved Display', 'M Sport Brakes', 'Shadowline Trim', 'Comfort Access Keyless'],
        },
        {
            'vin': '5YJ3E1EB9PF567890',
            'model': created_models['Tesla Model 3 Long Range'],
            'trim': 'Highland Dual Motor AWD',
            'year': 2024,
            'mileage': 20,
            'condition': Vehicle.Condition.NEW,
            'fuel_type': Vehicle.FuelType.ELECTRIC,
            'transmission': Vehicle.Transmission.AUTOMATIC,
            'exterior_color': 'Ultra Red',
            'interior_color': 'White Premium Interior',
            'engine_details': 'Dual Electric Motor AWD (341 mi Range)',
            'cost_price': Decimal('41000.00'),
            'selling_price': Decimal('47990.00'),
            'discount_price': None,
            'status': Vehicle.Status.AVAILABLE,
            'primary_image_url': 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=800&q=80',
            'description': 'Refreshed Model 3 Highland with whisper-quiet cabin, ventilated seating, and rear touchscreen entertainment.',
            'key_features': ['Autopilot Enabled', 'Rear 8-inch Display', 'Acoustic Glass 360', '0-60 in 4.2s'],
        }
    ]
    created_vehicles = []
    for v in vehicles_data:
        v_obj, _ = Vehicle.objects.get_or_create(
            vin=v['vin'],
            defaults={**v, 'created_by': admin_user}
        )
        created_vehicles.append(v_obj)

    print(f"[+] Seeded {len(created_vehicles)} inventory vehicles.")

    # 4. Seed Sales Leads & Quotations
    lead_obj, _ = SalesLead.objects.get_or_create(
        email='alice.smith@example.com',
        defaults={
            'customer': customer_user,
            'first_name': 'Alice',
            'last_name': 'Smith',
            'phone': '+1-555-321-7654',
            'interested_vehicle': created_vehicles[0],
            'budget_min': Decimal('32000.00'),
            'budget_max': Decimal('38000.00'),
            'source': SalesLead.LeadSource.WEBSITE,
            'status': SalesLead.LeadStatus.NEGOTIATION,
            'assigned_to': sales_staff,
            'lead_score': 85,
            'notes': 'Interested in financing options and trading in older vehicle.',
        }
    )
    LeadActivity.objects.get_or_create(
        lead=lead_obj,
        activity_type='CALL',
        defaults={
            'summary': 'Introductory Consultation & Needs Assessment',
            'description': 'Discussed Toyota Camry XLE specs and scheduled showroom visit.',
            'performed_by': sales_staff
        }
    )

    quote_obj, _ = Quotation.objects.get_or_create(
        quotation_number='QTN-2026-0001',
        defaults={
            'lead': lead_obj,
            'customer': customer_user,
            'vehicle': created_vehicles[0],
            'sales_rep': sales_staff,
            'vehicle_price': Decimal('34990.00'),
            'discount_amount': Decimal('500.00'),
            'tax_amount': Decimal('2759.20'),
            'registration_fee': Decimal('450.00'),
            'insurance_fee': Decimal('1150.00'),
            'accessories_fee': Decimal('250.00'),
            'financing_type': Quotation.FinancingType.DEALERSHIP_FINANCE,
            'valid_until': timezone.now().date() + timedelta(days=14),
            'status': Quotation.QuotationStatus.SENT,
        }
    )

    print("[+] Seeded Sales Lead & Quotation.")

    # 5. Seed Auto Parts E-Commerce Catalog
    cat_brakes, _ = PartCategory.objects.get_or_create(name='Braking Systems', defaults={'slug': 'braking-systems', 'description': 'Discs, brake pads, rotors, and calipers'})
    cat_engine, _ = PartCategory.objects.get_or_create(name='Engine & Fluids', defaults={'slug': 'engine-fluids', 'description': 'Synthetic oils, filters, belts, and spark plugs'})
    cat_tires, _ = PartCategory.objects.get_or_create(name='Tires & Wheels', defaults={'slug': 'tires-wheels', 'description': 'All-season, performance, and touring tires'})
    cat_accessories, _ = PartCategory.objects.get_or_create(name='Interior & Exterior Accessories', defaults={'slug': 'accessories', 'description': 'Floor mats, seat covers, dash cams, and organizers'})

    parts_data = [
        {
            'sku': 'BRK-BREM-01',
            'part_number': 'P83082N',
            'name': 'Brembo Ceramic Premium Front Brake Pad Set',
            'category': cat_brakes,
            'brand': 'Brembo',
            'cost_price': Decimal('48.00'),
            'price': Decimal('89.99'),
            'discount_price': Decimal('79.99'),
            'stock_quantity': 45,
            'image_url': 'https://images.unsplash.com/photo-1600790142055-619df03207e6?auto=format&fit=crop&w=600&q=80',
            'description': 'High performance ceramic brake pads providing silent braking, low dust, and OE stopping power.',
        },
        {
            'sku': 'OIL-MOB1-5W30',
            'part_number': 'MOB-120769',
            'name': 'Mobil 1 Advanced Full Synthetic Motor Oil 5W-30 (5-Quart)',
            'category': cat_engine,
            'brand': 'Mobil 1',
            'cost_price': Decimal('21.00'),
            'price': Decimal('36.99'),
            'discount_price': None,
            'stock_quantity': 120,
            'image_url': 'https://images.unsplash.com/photo-1598970434795-0c54fe7c0648?auto=format&fit=crop&w=600&q=80',
            'description': 'Triple action formula engineered to deliver outstanding engine performance, protection, and cleanliness.',
        },
        {
            'sku': 'FLT-BOSCH-3323',
            'part_number': '3323-PREM',
            'name': 'Bosch Premium FILTECH Engine Oil Filter',
            'category': cat_engine,
            'brand': 'Bosch',
            'cost_price': Decimal('4.50'),
            'price': Decimal('9.99'),
            'discount_price': None,
            'stock_quantity': 200,
            'is_universal_fit': True,
            'image_url': 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=600&q=80',
            'description': 'Exclusive FILTECH media screen technology screens out more harmful contaminants for greater engine protection.',
        },
        {
            'sku': 'TIR-MICH-DEF2',
            'part_number': 'MICH-225-50R18',
            'name': 'Michelin Defender 2 All-Season Passenger Car Tire',
            'category': cat_tires,
            'brand': 'Michelin',
            'cost_price': Decimal('135.00'),
            'price': Decimal('198.00'),
            'discount_price': Decimal('184.99'),
            'stock_quantity': 32,
            'image_url': 'https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=600&q=80',
            'description': 'Longest lasting treadwear warranty with confident stopping power on wet and dry pavement.',
        },
        {
            'sku': 'ACC-WEATHER-01',
            'part_number': 'WT-441221',
            'name': 'WeatherTech Laser Measured FloorLiner HP (Front & Rear)',
            'category': cat_accessories,
            'brand': 'WeatherTech',
            'cost_price': Decimal('95.00'),
            'price': Decimal('179.95'),
            'discount_price': None,
            'stock_quantity': 18,
            'image_url': 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=600&q=80',
            'description': 'Laser-measured custom fit floor liner engineered from high density tri-extruded compound.',
        }
    ]
    created_parts = []
    for p in parts_data:
        p_obj, _ = PartProduct.objects.get_or_create(sku=p['sku'], defaults=p)
        created_parts.append(p_obj)

    print(f"[+] Seeded {len(created_parts)} automotive parts products.")

    # 6. Seed Sample Completed E-Commerce Order
    order_obj, _ = Order.objects.get_or_create(
        order_number='ORD-PRT-SAMPLE-01',
        defaults={
            'customer': customer_user,
            'shipping_full_name': 'Alice Smith',
            'shipping_address': '124 Maple Avenue',
            'shipping_city': 'Brooklyn',
            'shipping_state': 'NY',
            'shipping_zip_code': '11201',
            'shipping_phone': '+1-555-321-7654',
            'subtotal': Decimal('116.98'),
            'shipping_fee': Decimal('15.00'),
            'tax_amount': Decimal('9.36'),
            'total_amount': Decimal('141.34'),
            'payment_method': Order.PaymentMethod.CARD,
            'payment_status': Order.PaymentStatus.PAID,
            'fulfillment_status': Order.FulfillmentStatus.SHIPPED,
            'shipping_carrier': 'FedEx Ground',
            'tracking_number': '794612345678',
            'estimated_delivery_date': timezone.now().date() + timedelta(days=2),
        }
    )
    OrderItem.objects.get_or_create(
        order=order_obj,
        product=created_parts[0],
        defaults={
            'product_name': created_parts[0].name,
            'sku': created_parts[0].sku,
            'unit_price': created_parts[0].effective_price,
            'quantity': 1,
            'subtotal': created_parts[0].effective_price
        }
    )
    OrderItem.objects.get_or_create(
        order=order_obj,
        product=created_parts[1],
        defaults={
            'product_name': created_parts[1].name,
            'sku': created_parts[1].sku,
            'unit_price': created_parts[1].effective_price,
            'quantity': 1,
            'subtotal': created_parts[1].effective_price
        }
    )

    # 7. Seed Reviews
    Review.objects.get_or_create(
        user=customer_user,
        vehicle=created_vehicles[0],
        defaults={
            'review_type': Review.ReviewType.VEHICLE,
            'rating': 5,
            'title': 'Smoothest ride and incredible fuel economy!',
            'comment': 'Purchased the Camry XLE and am totally in love with the ride quality, silence on highways, and intuitive cockpit.',
            'is_verified_purchase': True,
            'is_approved': True,
            'dealer_response': 'Thank you Alice! The CarCraft team is thrilled you are enjoying your new Camry.',
            'dealer_responded_at': timezone.now(),
        }
    )
    Review.objects.get_or_create(
        user=customer_user,
        part=created_parts[0],
        defaults={
            'review_type': Review.ReviewType.PART,
            'rating': 5,
            'title': 'Brembo pads eliminated all squeaks!',
            'comment': 'High quality pads. Very low brake dust and zero squeaks compared to standard factory pads.',
            'is_verified_purchase': True,
            'is_approved': True,
        }
    )

    # 8. Seed Service Workshop (Skills, Tech Profile, Service Types, Appointment, History, Recommendations)
    skill_diag, _ = ServiceSkill.objects.get_or_create(name='Engine Diagnostics & Electrical', defaults={'description': 'OBD-II, ECU programming, sensor calibration'})
    skill_brakes, _ = ServiceSkill.objects.get_or_create(name='Braking & ABS Hydraulics', defaults={'description': 'Rotor machining, caliper rebuilding, ABS bleeding'})
    skill_ev, _ = ServiceSkill.objects.get_or_create(name='High Voltage EV & Hybrid Systems', defaults={'description': 'Traction battery diagnostics, inverter cooling'})

    tech_profile, _ = TechnicianProfile.objects.get_or_create(
        user=tech_user,
        defaults={
            'experience_years': 7,
            'daily_capacity_hours': Decimal('8.0'),
            'availability_status': TechnicianProfile.AvailabilityStatus.AVAILABLE,
            'specialty_notes': 'ASE Master Certified Technician specializing in Asian & European brands.'
        }
    )
    tech_profile.skills.set([skill_diag, skill_brakes, skill_ev])

    svc_oil, _ = ServiceType.objects.get_or_create(
        name='Full Synthetic Oil & Filter Service',
        defaults={'estimated_duration_minutes': 45, 'base_price': Decimal('79.99'), 'description': 'Up to 5 quarts of premium synthetic oil and OEM filter replacement.'}
    )
    svc_brakes, _ = ServiceType.objects.get_or_create(
        name='Front & Rear Brake Inspection & Service',
        defaults={'estimated_duration_minutes': 90, 'base_price': Decimal('149.00'), 'description': 'Pad measurement, rotor runout check, caliper lubrication, fluid inspection.'}
    )
    svc_100pt, _ = ServiceType.objects.get_or_create(
        name='Comprehensive 100-Point Multipoint Inspection',
        defaults={'estimated_duration_minutes': 60, 'base_price': Decimal('99.00'), 'description': 'Thorough inspection of drivetrain, suspension, battery, tires, and lights.'}
    )

    appt_obj, _ = ServiceAppointment.objects.get_or_create(
        appointment_number='APT-2026-0001',
        defaults={
            'customer': customer_user,
            'vehicle': created_vehicles[0],
            'technician': tech_profile,
            'scheduled_datetime': timezone.now() - timedelta(days=5),
            'status': ServiceAppointment.AppointmentStatus.COMPLETED,
            'current_odometer': 5200,
            'estimated_cost': Decimal('129.99'),
            'final_cost': Decimal('129.99'),
            'customer_notes': 'First 5,000 miles complementary dealer inspection and oil change.',
            'technician_diagnostic_notes': 'All vehicle parameters nominal. Tire pressures set to 35 PSI.',
        }
    )
    appt_obj.service_types.set([svc_oil, svc_100pt])

    ServiceHistoryRecord.objects.get_or_create(
        appointment=appt_obj,
        defaults={
            'vehicle': created_vehicles[0],
            'work_performed': 'Replaced engine oil with 0W-20 Full Synthetic. Replaced OEM filter. Executed 100-point safety check.',
            'parts_used': 'Toyota OEM Filter #04152-YZZA1, 5.5 Qts Full Synthetic Oil',
            'total_labor_hours': Decimal('1.0'),
            'total_amount': Decimal('129.99'),
            'next_service_due_mileage': 15000,
        }
    )

    MaintenanceRecommendation.objects.get_or_create(
        customer=customer_user,
        vehicle=created_vehicles[0],
        recommended_service='Tire Rotation and Balance',
        defaults={
            'reason': 'Recommended at 10,000 miles to maximize even tread wear across all four wheels.',
            'priority': MaintenanceRecommendation.Priority.MEDIUM,
            'due_mileage': 10000,
            'is_addressed': False
        }
    )

    # 9. Seed Communications & Reminders
    CustomerMessage.objects.get_or_create(
        sender=sales_staff,
        recipient=customer_user,
        subject='Welcome to CarCraft Dealership & Service Portal',
        defaults={
            'body': 'Dear Alice, thank you for inquiring about our Toyota Camry. Your quotation QTN-2026-0001 is ready for review.',
            'is_read': False
        }
    )

    CustomerReminder.objects.get_or_create(
        customer=customer_user,
        created_by=sales_staff,
        reminder_type=CustomerReminder.ReminderType.SERVICE_DUE,
        title='Upcoming 10,000-Mile Scheduled Service Notice',
        defaults={
            'message': 'Your vehicle is approaching 10,000 miles. Schedule your tire rotation with technician John Miller online today!',
            'scheduled_time': timezone.now() + timedelta(days=30),
            'channel': CustomerReminder.Channel.IN_APP,
            'is_sent': False,
        }
    )

    print("[SUCCESS] All 12 CarCraft Modules Seeded Successfully!")
    print("\nSample Login Credentials:")
    print("--------------------------------------------------")
    print("Dealer Admin : dealer_admin   / admin123")
    print("Dealer Staff : dealer_sales   / sales123")
    print("Technician   : tech_john      / tech123")
    print("Customer     : customer_alice / pass123")
    print("--------------------------------------------------")

if __name__ == '__main__':
    seed_database()
