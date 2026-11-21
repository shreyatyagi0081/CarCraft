from rest_framework import serializers
from .models import Review
from apps.accounts.serializers import UserSerializer

class ReviewSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source='user', read_only=True)
    target_name = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = [
            'id', 'user', 'user_details', 'review_type', 'vehicle', 'part',
            'target_name', 'rating', 'title', 'comment', 'is_verified_purchase',
            'is_approved', 'dealer_response', 'dealer_responded_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'is_verified_purchase', 'dealer_responded_at', 'created_at', 'updated_at']

    def get_target_name(self, obj):
        if obj.vehicle:
            return obj.vehicle.display_name
        if obj.part:
            return obj.part.name
        return "Dealership Service"

    def validate(self, attrs):
        request = self.context.get('request')
        if request and request.user.is_authenticated and not request.user.is_dealer:
            protected_fields = {'is_approved', 'dealer_response'}
            submitted_fields = protected_fields.intersection(self.initial_data)
            if submitted_fields:
                raise serializers.ValidationError({
                    field: 'Only dealership staff can change this review field.'
                    for field in submitted_fields
                })

        review_type = attrs.get('review_type', self.instance.review_type if self.instance else None)
        vehicle = attrs.get('vehicle', self.instance.vehicle if self.instance else None)
        part = attrs.get('part', self.instance.part if self.instance else None)

        if review_type == Review.ReviewType.VEHICLE and not vehicle:
            raise serializers.ValidationError({"vehicle": "Vehicle is required for vehicle reviews."})
        if review_type == Review.ReviewType.PART and not part:
            raise serializers.ValidationError({"part": "Part is required for part reviews."})
        return attrs
