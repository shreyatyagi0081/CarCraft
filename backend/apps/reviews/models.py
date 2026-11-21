from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from apps.vehicles.models import Vehicle
from apps.ecommerce.models import PartProduct

class Review(models.Model):
    class ReviewType(models.TextChoices):
        VEHICLE = 'VEHICLE', 'Vehicle Review'
        PART = 'PART', 'Auto Part Review'
        SERVICE = 'SERVICE', 'Dealership / Service Review'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reviews')
    review_type = models.CharField(max_length=20, choices=ReviewType.choices, default=ReviewType.VEHICLE)
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, null=True, blank=True, related_name='reviews')
    part = models.ForeignKey(PartProduct, on_delete=models.CASCADE, null=True, blank=True, related_name='reviews')
    
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Rating between 1 (Poor) and 5 (Excellent)"
    )
    title = models.CharField(max_length=150)
    comment = models.TextField()
    is_verified_purchase = models.BooleanField(default=False)
    is_approved = models.BooleanField(default=False, help_text="Moderation status")
    
    # Dealer feedback
    dealer_response = models.TextField(blank=True, null=True)
    dealer_responded_at = models.DateTimeField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        target = self.vehicle.display_name if self.vehicle else (self.part.name if self.part else "Dealership")
        return f"{self.rating}★ Review by {self.user.username} for {target}"
