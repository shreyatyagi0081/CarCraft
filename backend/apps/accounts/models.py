from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    class Role(models.TextChoices):
        DEALER_ADMIN = 'DEALER_ADMIN', 'Dealer Admin'
        DEALER_STAFF = 'DEALER_STAFF', 'Dealer Staff'
        TECHNICIAN = 'TECHNICIAN', 'Technician'
        CUSTOMER = 'CUSTOMER', 'Customer'

    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.CUSTOMER)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    address = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    zip_code = models.CharField(max_length=20, blank=True, null=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    dealership_name = models.CharField(max_length=150, blank=True, null=True)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def is_dealer(self):
        return self.role in [self.Role.DEALER_ADMIN, self.Role.DEALER_STAFF]

    @property
    def is_technician(self):
        return self.role == self.Role.TECHNICIAN

    @property
    def is_customer(self):
        return self.role == self.Role.CUSTOMER

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"


class CustomerProfile(models.Model):
    CONTACT_PREFERENCE_CHOICES = [
        ('EMAIL', 'Email'),
        ('PHONE', 'Phone Call'),
        ('SMS', 'SMS / Text'),
        ('WHATSAPP', 'WhatsApp'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='customer_profile')
    preferred_contact_method = models.CharField(max_length=20, choices=CONTACT_PREFERENCE_CHOICES, default='EMAIL')
    driver_license_number = models.CharField(max_length=50, blank=True, null=True)
    preferred_language = models.CharField(max_length=30, default='English')
    notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Customer Profile: {self.user.username}"


class DealerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='dealer_profile')
    license_number = models.CharField(max_length=50, blank=True, null=True)
    showroom_location = models.CharField(max_length=255, blank=True, null=True)
    gst_tax_number = models.CharField(max_length=50, blank=True, null=True)
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=5.00)
    sales_target = models.DecimalField(max_digits=12, decimal_places=2, default=500000.00)

    def __str__(self):
        return f"Dealer Profile: {self.user.username} - {self.user.dealership_name or 'Main Branch'}"
