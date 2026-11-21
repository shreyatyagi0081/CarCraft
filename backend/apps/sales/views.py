from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import SalesLead, LeadActivity, Quotation, VehicleOrder
from .serializers import (
    SalesLeadSerializer,
    LeadActivitySerializer,
    QuotationSerializer,
    VehicleOrderSerializer,
    VehicleOrderStatusUpdateSerializer,
)
from apps.accounts.permissions import IsDealerUser
from apps.vehicles.models import Vehicle

class SalesLeadViewSet(viewsets.ModelViewSet):
    serializer_class = SalesLeadSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        'status': ['exact'],
        'source': ['exact'],
        'assigned_to': ['exact'],
        'interested_vehicle': ['exact'],
        'created_at': ['date__gte', 'date__lte'],
    }
    search_fields = ['first_name', 'last_name', 'email', 'phone', 'notes']
    ordering_fields = ['created_at', 'lead_score']

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return SalesLead.objects.none()
        if user.is_dealer:
            return SalesLead.objects.all().select_related('customer', 'interested_vehicle', 'assigned_to')
        return SalesLead.objects.filter(customer=user).select_related('interested_vehicle')

    def get_permissions(self):
        if self.action in ['create']:
            # Customers / visitors can submit an inquiry / lead
            return [permissions.AllowAny()]
        if self.action in ['destroy', 'add_activity', 'assign']:
            return [permissions.IsAuthenticated(), IsDealerUser()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        serializer.save(customer=user)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsDealerUser])
    def add_activity(self, request, pk=None):
        lead = self.get_object()
        serializer = LeadActivitySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(lead=lead, performed_by=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['patch'], permission_classes=[permissions.IsAuthenticated, IsDealerUser])
    def assign(self, request, pk=None):
        lead = self.get_object()
        staff_id = request.data.get('assigned_to')
        lead.assigned_to_id = staff_id
        lead.save()
        return Response({'message': 'Lead assigned successfully.', 'assigned_to': staff_id})


class QuotationViewSet(viewsets.ModelViewSet):
    serializer_class = QuotationSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'customer', 'vehicle', 'financing_type']
    search_fields = ['quotation_number', 'customer__username', 'customer__email']
    ordering_fields = ['created_at', 'total_amount']

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Quotation.objects.none()
        if user.is_dealer:
            return Quotation.objects.all().select_related('customer', 'vehicle', 'sales_rep')
        return Quotation.objects.filter(customer=user).select_related('vehicle', 'sales_rep')

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsDealerUser()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(sales_rep=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def accept(self, request, pk=None):
        quotation = self.get_object()
        if quotation.customer != request.user and not request.user.is_dealer:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
        quotation.status = Quotation.QuotationStatus.ACCEPTED
        quotation.save()
        return Response({'message': 'Quotation accepted successfully.', 'status': quotation.status})

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def reject(self, request, pk=None):
        quotation = self.get_object()
        if quotation.customer != request.user and not request.user.is_dealer:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
        quotation.status = Quotation.QuotationStatus.REJECTED
        quotation.save()
        return Response({'message': 'Quotation rejected.', 'status': quotation.status})


class VehicleOrderViewSet(viewsets.ModelViewSet):
    serializer_class = VehicleOrderSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['order_status', 'payment_status', 'customer', 'vehicle']
    search_fields = ['order_number', 'customer__username', 'vehicle__vin']
    ordering_fields = ['created_at', 'total_price']

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return VehicleOrder.objects.none()
        if user.is_dealer:
            return VehicleOrder.objects.all().select_related('customer', 'vehicle', 'quotation', 'sales_rep')
        return VehicleOrder.objects.filter(customer=user).select_related('vehicle', 'quotation')

    def get_permissions(self):
        if self.action in ['create', 'destroy', 'update_order_status']:
            return [permissions.IsAuthenticated(), IsDealerUser()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        order = serializer.save(sales_rep=self.request.user if self.request.user.is_dealer else None)
        # Mark vehicle as RESERVED when order is placed
        vehicle = order.vehicle
        if vehicle.status == Vehicle.Status.AVAILABLE:
            vehicle.status = Vehicle.Status.RESERVED
            vehicle.save()

    @action(detail=True, methods=['patch'], permission_classes=[permissions.IsAuthenticated, IsDealerUser])
    def update_order_status(self, request, pk=None):
        order = self.get_object()
        serializer = VehicleOrderStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        new_status = data.get('order_status')
        new_payment = data.get('payment_status')

        if new_status:
            order.order_status = new_status
            if new_status == VehicleOrder.OrderStatus.DELIVERED:
                order.vehicle.status = Vehicle.Status.SOLD
                order.vehicle.save()
            elif new_status == VehicleOrder.OrderStatus.CANCELLED:
                order.vehicle.status = Vehicle.Status.AVAILABLE
                order.vehicle.save()

        if new_payment:
            order.payment_status = new_payment

        order.save()
        return Response({
            'message': 'Order updated successfully.',
            'order_status': order.order_status,
            'payment_status': order.payment_status,
            'vehicle_status': order.vehicle.status
        })
