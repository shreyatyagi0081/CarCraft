from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from .models import CustomerProfile, DealerProfile

User = get_user_model()

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        token['email'] = user.email
        token['role'] = user.role
        token['is_dealer'] = user.is_dealer
        return token

    def validate(self, attrs):
        identifier = attrs.get(self.username_field)
        if identifier and '@' in identifier:
            try:
                attrs[self.username_field] = User.objects.get(email__iexact=identifier).get_username()
            except User.DoesNotExist:
                pass
            except User.MultipleObjectsReturned:
                pass

        data = super().validate(attrs)
        data['user'] = {
            'id': self.user.id,
            'username': self.user.username,
            'email': self.user.email,
            'first_name': self.user.first_name,
            'last_name': self.user.last_name,
            'role': self.user.role,
            'is_dealer': self.user.is_dealer,
            'is_technician': self.user.is_technician,
            'is_customer': self.user.is_customer,
            'dealership_name': self.user.dealership_name,
            'phone_number': self.user.phone_number,
        }
        return data


class CustomerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerProfile
        fields = ['preferred_contact_method', 'driver_license_number', 'preferred_language', 'notes']


class DealerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = DealerProfile
        fields = ['license_number', 'showroom_location', 'gst_tax_number', 'commission_rate', 'sales_target']


class UserSerializer(serializers.ModelSerializer):
    customer_profile = CustomerProfileSerializer(read_only=True)
    dealer_profile = DealerProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'phone_number', 'address', 'city', 'state', 'zip_code',
            'dealership_name', 'avatar', 'is_verified', 'created_at',
            'customer_profile', 'dealer_profile'
        ]
        read_only_fields = ['id', 'role', 'created_at', 'is_verified']


class UserRegistrationSerializer(serializers.ModelSerializer):
    role = serializers.ChoiceField(choices=User.Role.choices, read_only=True, default=User.Role.CUSTOMER)
    password = serializers.CharField(write_only=True, min_length=6)
    password_confirm = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'password_confirm',
            'first_name', 'last_name', 'role', 'phone_number',
            'address', 'city', 'state', 'zip_code', 'dealership_name'
        ]

    def validate(self, attrs):
        if attrs.get('password') != attrs.get('password_confirm'):
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        requested_role = self.initial_data.get('role')
        if requested_role not in (None, User.Role.CUSTOMER):
            raise serializers.ValidationError({"role": "Public registration is limited to customer accounts."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        validated_data.pop('role', None)
        user = User.objects.create_user(role=User.Role.CUSTOMER, password=password, **validated_data)
        CustomerProfile.objects.create(user=user)
        return user
