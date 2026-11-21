import uuid
from decimal import Decimal
from django.db import models
from django.conf import settings
from apps.vehicles.models import Vehicle

def generate_quotation_number():
    return f"QTN-{uuid.uuid4().hex[:8].upper()}"

def generate_order_number():
    return f"ORD-VEH-{uuid.uuid4().hex[:8].upper()}"


class SalesLead(models.Model):
    class LeadStatus(models.TextChoices):
        NEW = 'NEW', 'New Lead'
        CONTACTED = 'CONTACTED', 'Contacted'
        TEST_DRIVE_SCHEDULED = 'TEST_DRIVE', 'Test Drive Scheduled'
        NEGOTIATION = 'NEGOTIATION', 'Negotiation / Opportunity'
        QUALIFIED = 'QUALIFIED', 'Qualified'
        WON = 'WON', 'Deal Won'
        LOST = 'LOST', 'Deal Lost'

    class LeadSource(models.TextChoices):
        WEBSITE = 'WEBSITE', 'Website Inquiry'
        WALK_IN = 'WALK_IN', 'Walk-In Showroom'
        PHONE = 'PHONE', 'Phone Inquiry'
        REFERRAL = 'REFERRAL', 'Referral'
        SOCIAL_MEDIA = 'SOCIAL', 'Social Media'
        CAMPAIGN = 'CAMPAIGN', 'Marketing Campaign'

    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='leads')
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100, blank=True, null=True)
    email = models.EmailField()
    phone = models.CharField(max_length=20)
    interested_vehicle = models.ForeignKey(Vehicle, on_delete=models.SET_NULL, null=True, blank=True, related_name='leads')
    budget_min = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    budget_max = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    source = models.CharField(max_length=20, choices=LeadSource.choices, default=LeadSource.WEBSITE)
    status = models.CharField(max_length=20, choices=LeadStatus.choices, default=LeadStatus.NEW)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_leads',
        limit_choices_to={'role__in': ['DEALER_ADMIN', 'DEALER_STAFF']}
    )
    lead_score = models.PositiveSmallIntegerField(default=50, help_text="Score 1-100 indicating conversion likelihood")
    notes = models.TextField(blank=True, null=True)
    preferred_test_drive_date = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Lead: {self.first_name} {self.last_name or ''} - [{self.get_status_display()}]"


class LeadActivity(models.Model):
    ACTIVITY_TYPES = [
        ('CALL', 'Phone Call'),
        ('EMAIL', 'Email Sent'),
        ('TEST_DRIVE', 'Test Drive'),
        ('MEETING', 'Showroom Meeting'),
        ('NOTE', 'Internal Note'),
    ]

    lead = models.ForeignKey(SalesLead, on_delete=models.CASCADE, related_name='activities')
    activity_type = models.CharField(max_length=20, choices=ACTIVITY_TYPES, default='NOTE')
    summary = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    performed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.activity_type} on Lead #{self.lead.id} ({self.created_at.strftime('%Y-%m-%d')})"


class Quotation(models.Model):
    class QuotationStatus(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        SENT = 'SENT', 'Sent to Customer'
        ACCEPTED = 'ACCEPTED', 'Accepted'
        REJECTED = 'REJECTED', 'Rejected'
        EXPIRED = 'EXPIRED', 'Expired'

    class FinancingType(models.TextChoices):
        CASH = 'CASH', 'Full Cash Payment'
        DEALERSHIP_FINANCE = 'DEALER_FINANCE', 'Dealership Financing'
        BANK_LOAN = 'BANK_LOAN', 'External Bank Loan'
        LEASE = 'LEASE', 'Vehicle Lease'

    quotation_number = models.CharField(max_length=30, unique=True, default=generate_quotation_number)
    lead = models.ForeignKey(SalesLead, on_delete=models.SET_NULL, null=True, blank=True, related_name='quotations')
    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='quotations')
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='quotations')
    sales_rep = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='rep_quotations')
    
    # Financial breakdown
    vehicle_price = models.DecimalField(max_digits=12, decimal_places=2)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    registration_fee = models.DecimalField(max_digits=12, decimal_places=2, default=500.00)
    insurance_fee = models.DecimalField(max_digits=12, decimal_places=2, default=1200.00)
    accessories_fee = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    
    financing_type = models.CharField(max_length=20, choices=FinancingType.choices, default=FinancingType.CASH)
    valid_until = models.DateField()
    status = models.CharField(max_length=20, choices=QuotationStatus.choices, default=QuotationStatus.DRAFT)
    terms_and_conditions = models.TextField(blank=True, default="1. Quotation valid for 15 days.\n2. Prices subject to statutory taxes.\n3. Delivery subject to vehicle availability.")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        subtotal = (self.vehicle_price - self.discount_amount) + self.registration_fee + self.insurance_fee + self.accessories_fee
        if not self.tax_amount:
            # 10% standard vehicle tax calculation if not provided
            self.tax_amount = (self.vehicle_price - self.discount_amount) * Decimal('0.10')
        self.total_amount = subtotal + self.tax_amount
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.quotation_number} - {self.vehicle.display_name} -> {self.customer.username} (₹{self.total_amount})"


class VehicleOrder(models.Model):
    class OrderStatus(models.TextChoices):
        ORDER_PLACED = 'PLACED', 'Order Placed'
        DOCUMENTS_VERIFIED = 'DOCS_VERIFIED', 'Documents Verified'
        FINANCE_APPROVED = 'FINANCE_APPROVED', 'Financing Approved'
        READY_FOR_DELIVERY = 'READY', 'Ready for Delivery'
        DELIVERED = 'DELIVERED', 'Delivered to Customer'
        CANCELLED = 'CANCELLED', 'Cancelled'

    class PaymentStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending Deposit'
        PARTIAL = 'PARTIAL', 'Deposit Paid / Partial'
        PAID = 'PAID', 'Fully Paid'
        REFUNDED = 'REFUNDED', 'Refunded'

    order_number = models.CharField(max_length=30, unique=True, default=generate_order_number)
    quotation = models.OneToOneField(Quotation, on_delete=models.SET_NULL, null=True, blank=True, related_name='order')
    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='vehicle_orders')
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='orders')
    sales_rep = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='completed_orders')
    
    total_price = models.DecimalField(max_digits=12, decimal_places=2)
    deposit_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    payment_status = models.CharField(max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.PENDING)
    order_status = models.CharField(max_length=20, choices=OrderStatus.choices, default=OrderStatus.ORDER_PLACED)
    delivery_date = models.DateField(blank=True, null=True)
    delivery_address = models.CharField(max_length=255, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    @property
    def balance_due(self):
        return self.total_price - self.deposit_paid

    def __str__(self):
        return f"{self.order_number} - {self.vehicle.display_name} ({self.get_order_status_display()})"
