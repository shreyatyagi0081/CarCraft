from django.db import models
from django.conf import settings

class VehicleMake(models.Model):
    name = models.CharField(max_length=100, unique=True)
    country_of_origin = models.CharField(max_length=100, blank=True, null=True)
    logo = models.ImageField(upload_to='makes/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class VehicleModel(models.Model):
    make = models.ForeignKey(VehicleMake, on_delete=models.CASCADE, related_name='models')
    name = models.CharField(max_length=100)
    body_type = models.CharField(
        max_length=50,
        choices=[
            ('SEDAN', 'Sedan'),
            ('SUV', 'SUV'),
            ('HATCHBACK', 'Hatchback'),
            ('TRUCK', 'Truck / Pickup'),
            ('COUPE', 'Coupe'),
            ('CONVERTIBLE', 'Convertible'),
            ('VAN', 'Van / Minivan'),
            ('WAGON', 'Station Wagon'),
        ],
        default='SEDAN'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('make', 'name')
        ordering = ['make__name', 'name']

    def __str__(self):
        return f"{self.make.name} {self.name}"


class Vehicle(models.Model):
    class Status(models.TextChoices):
        AVAILABLE = 'AVAILABLE', 'Available'
        RESERVED = 'RESERVED', 'Reserved'
        SOLD = 'SOLD', 'Sold'
        UNDER_INSPECTION = 'UNDER_INSPECTION', 'Under Inspection'
        IN_SERVICE = 'IN_SERVICE', 'In Service'

    class Condition(models.TextChoices):
        NEW = 'NEW', 'Brand New'
        CERTIFIED_PRE_OWNED = 'CPO', 'Certified Pre-Owned'
        USED = 'USED', 'Pre-Owned'

    class FuelType(models.TextChoices):
        PETROL = 'PETROL', 'Petrol / Gasoline'
        DIESEL = 'DIESEL', 'Diesel'
        ELECTRIC = 'ELECTRIC', 'Electric (EV)'
        HYBRID = 'HYBRID', 'Hybrid'
        PLUGIN_HYBRID = 'PHEV', 'Plug-in Hybrid'

    class Transmission(models.TextChoices):
        AUTOMATIC = 'AUTOMATIC', 'Automatic'
        MANUAL = 'MANUAL', 'Manual'
        CVT = 'CVT', 'CVT'
        DUAL_CLUTCH = 'DCT', 'Dual-Clutch'

    vin = models.CharField(max_length=17, unique=True, verbose_name="VIN")
    model = models.ForeignKey(VehicleModel, on_delete=models.PROTECT, related_name='vehicles')
    trim = models.CharField(max_length=100, blank=True, null=True, help_text="e.g. XLE, GT-Line, Sport")
    year = models.PositiveIntegerField()
    mileage = models.PositiveIntegerField(default=0, help_text="Odometer reading in km or miles")
    condition = models.CharField(max_length=20, choices=Condition.choices, default=Condition.NEW)
    fuel_type = models.CharField(max_length=20, choices=FuelType.choices, default=FuelType.PETROL)
    transmission = models.CharField(max_length=20, choices=Transmission.choices, default=Transmission.AUTOMATIC)
    exterior_color = models.CharField(max_length=50)
    interior_color = models.CharField(max_length=50, blank=True, null=True)
    engine_details = models.CharField(max_length=100, blank=True, null=True, help_text="e.g. 2.0L Turbo 4-Cylinder")
    seating_capacity = models.PositiveSmallIntegerField(default=5)
    
    # Pricing
    cost_price = models.DecimalField(max_digits=12, decimal_places=2, help_text="Dealer internal acquisition cost")
    selling_price = models.DecimalField(max_digits=12, decimal_places=2, help_text="Showroom / MSRP selling price")
    discount_price = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.AVAILABLE)
    primary_image = models.ImageField(upload_to='vehicles/', blank=True, null=True)
    primary_image_url = models.URLField(max_length=500, blank=True, null=True, help_text="External image URL fallback")
    description = models.TextField(blank=True, null=True)
    key_features = models.JSONField(default=list, blank=True, help_text="List of vehicle features, e.g. ['Sunroof', 'Adaptive Cruise']")
    location_showroom = models.CharField(max_length=150, default="Main Dealership Showroom")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='vehicles_managed')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    @property
    def display_name(self):
        trim_str = f" {self.trim}" if self.trim else ""
        return f"{self.year} {self.model.make.name} {self.model.name}{trim_str}"

    @property
    def effective_price(self):
        return self.discount_price if self.discount_price else self.selling_price

    @property
    def profit_margin(self):
        if self.effective_price and self.cost_price:
            return self.effective_price - self.cost_price
        return 0

    def __str__(self):
        return f"{self.display_name} - VIN: {self.vin} [{self.get_status_display()}]"


class VehicleImage(models.Model):
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='vehicles/gallery/', blank=True, null=True)
    image_url = models.URLField(max_length=500, blank=True, null=True)
    caption = models.CharField(max_length=150, blank=True, null=True)
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Image for {self.vehicle.vin} - {self.caption or 'Gallery'}"
