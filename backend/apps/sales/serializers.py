from rest_framework import serializers
from .models import SalesLead, LeadActivity, Quotation, VehicleOrder
from apps.vehicles.serializers import VehicleSerializer
from apps.accounts.serializers import UserSerializer

class LeadActivitySerializer(serializers.ModelSerializer):
    performed_by_name = serializers.CharField(source='performed_by.username', read_only=True)

    class Meta:
        model = LeadActivity
        fields = ['id', 'lead', 'activity_type', 'summary', 'description', 'performed_by', 'performed_by_name', 'created_at']
        read_only_fields = ['id', 'performed_by', 'created_at']


class SalesLeadSerializer(serializers.ModelSerializer):
    activities = LeadActivitySerializer(many=True, read_only=True)
    interested_vehicle_details = VehicleSerializer(source='interested_vehicle', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.username', read_only=True)

    class Meta:
        model = SalesLead
        fields = [
            'id', 'customer', 'first_name', 'last_name', 'email', 'phone',
            'interested_vehicle', 'interested_vehicle_details', 'budget_min', 'budget_max',
            'source', 'status', 'assigned_to', 'assigned_to_name', 'lead_score',
            'notes', 'preferred_test_drive_date', 'activities', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class QuotationSerializer(serializers.ModelSerializer):
    vehicle_details = VehicleSerializer(source='vehicle', read_only=True)
    customer_details = UserSerializer(source='customer', read_only=True)
    sales_rep_name = serializers.CharField(source='sales_rep.username', read_only=True)

    class Meta:
        model = Quotation
        fields = [
            'id', 'quotation_number', 'lead', 'customer', 'customer_details',
            'vehicle', 'vehicle_details', 'sales_rep', 'sales_rep_name',
            'vehicle_price', 'discount_amount', 'tax_amount', 'registration_fee',
            'insurance_fee', 'accessories_fee', 'total_amount', 'financing_type',
            'valid_until', 'status', 'terms_and_conditions', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'quotation_number', 'total_amount', 'created_at', 'updated_at']


class VehicleOrderSerializer(serializers.ModelSerializer):
    vehicle_details = VehicleSerializer(source='vehicle', read_only=True)
    customer_details = UserSerializer(source='customer', read_only=True)
    balance_due = serializers.ReadOnlyField()

    class Meta:
        model = VehicleOrder
        fields = [
            'id', 'order_number', 'quotation', 'customer', 'customer_details',
            'vehicle', 'vehicle_details', 'sales_rep', 'total_price', 'deposit_paid',
            'balance_due', 'payment_status', 'order_status', 'delivery_date',
            'delivery_address', 'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'order_number', 'balance_due', 'created_at', 'updated_at']

    def validate(self, attrs):
        request = self.context.get('request')
        if request and request.user.is_authenticated and not request.user.is_dealer:
            if self.instance is None:
                raise serializers.ValidationError({'detail': 'Only dealership staff can create vehicle orders.'})

            protected_fields = {
                'quotation', 'customer', 'vehicle', 'sales_rep', 'total_price',
                'deposit_paid', 'payment_status', 'order_status', 'delivery_date',
            }
            submitted_fields = protected_fields.intersection(self.initial_data)
            if submitted_fields:
                raise serializers.ValidationError({
                    field: 'Only dealership staff can change this order field.'
                    for field in submitted_fields
                })
        return attrs


class VehicleOrderStatusUpdateSerializer(serializers.Serializer):
    order_status = serializers.ChoiceField(
        choices=VehicleOrder.OrderStatus.choices,
        required=False,
    )
    payment_status = serializers.ChoiceField(
        choices=VehicleOrder.PaymentStatus.choices,
        required=False,
    )

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError('Provide an order_status or payment_status.')
        return attrs
