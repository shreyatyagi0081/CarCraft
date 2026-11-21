from rest_framework import serializers
from .models import VehicleMake, VehicleModel, Vehicle, VehicleImage

class VehicleImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleImage
        fields = ['id', 'image', 'image_url', 'caption', 'is_primary', 'created_at']


class VehicleModelSerializer(serializers.ModelSerializer):
    make_name = serializers.CharField(source='make.name', read_only=True)

    class Meta:
        model = VehicleModel
        fields = ['id', 'make', 'make_name', 'name', 'body_type', 'created_at']


class VehicleMakeSerializer(serializers.ModelSerializer):
    models = VehicleModelSerializer(many=True, read_only=True)

    class Meta:
        model = VehicleMake
        fields = ['id', 'name', 'country_of_origin', 'logo', 'models', 'created_at']


class VehicleSerializer(serializers.ModelSerializer):
    make_name = serializers.CharField(source='model.make.name', read_only=True)
    model_name = serializers.CharField(source='model.name', read_only=True)
    body_type = serializers.CharField(source='model.body_type', read_only=True)
    display_name = serializers.ReadOnlyField()
    effective_price = serializers.ReadOnlyField()
    images = VehicleImageSerializer(many=True, read_only=True)

    class Meta:
        model = Vehicle
        fields = [
            'id', 'vin', 'model', 'make_name', 'model_name', 'body_type', 'trim',
            'year', 'mileage', 'condition', 'fuel_type', 'transmission',
            'exterior_color', 'interior_color', 'engine_details', 'seating_capacity',
            'cost_price', 'selling_price', 'discount_price', 'effective_price',
            'status', 'primary_image', 'primary_image_url', 'description',
            'key_features', 'location_showroom', 'display_name', 'images',
            'created_by', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        request = self.context.get('request')
        # Mask cost_price for customers/unauthenticated visitors
        if not request or not request.user.is_authenticated or not request.user.is_dealer:
            ret.pop('cost_price', None)
        return ret
