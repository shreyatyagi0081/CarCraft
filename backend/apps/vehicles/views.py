from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import VehicleMake, VehicleModel, Vehicle, VehicleImage
from .serializers import (
    VehicleMakeSerializer,
    VehicleModelSerializer,
    VehicleSerializer,
    VehicleImageSerializer
)
from apps.accounts.permissions import IsDealerUser

class VehicleMakeViewSet(viewsets.ModelViewSet):
    queryset = VehicleMake.objects.all()
    serializer_class = VehicleMakeSerializer
    search_fields = ['name', 'country_of_origin']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsDealerUser()]
        return [permissions.AllowAny()]


class VehicleModelViewSet(viewsets.ModelViewSet):
    queryset = VehicleModel.objects.all()
    serializer_class = VehicleModelSerializer
    filterset_fields = ['make', 'body_type']
    search_fields = ['name', 'make__name']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsDealerUser()]
        return [permissions.AllowAny()]


class VehicleViewSet(viewsets.ModelViewSet):
    serializer_class = VehicleSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        'model__make': ['exact'],
        'model': ['exact'],
        'model__body_type': ['exact'],
        'year': ['exact', 'gte', 'lte'],
        'fuel_type': ['exact'],
        'transmission': ['exact'],
        'condition': ['exact'],
        'status': ['exact', 'in'],
        'selling_price': ['gte', 'lte'],
        'mileage': ['lte', 'gte'],
    }
    search_fields = ['vin', 'trim', 'exterior_color', 'model__name', 'model__make__name', 'description']
    ordering_fields = ['selling_price', 'year', 'mileage', 'created_at']

    def get_queryset(self):
        user = self.request.user
        # Dealers can see all statuses; anonymous/customers only see AVAILABLE or RESERVED
        if user and user.is_authenticated and user.is_dealer:
            return Vehicle.objects.all().select_related('model', 'model__make').prefetch_related('images')
        return Vehicle.objects.filter(status__in=[Vehicle.Status.AVAILABLE, Vehicle.Status.RESERVED]).select_related('model', 'model__make').prefetch_related('images')

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'update_status']:
            return [permissions.IsAuthenticated(), IsDealerUser()]
        return [permissions.AllowAny()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsDealerUser])
    def add_image(self, request, pk=None):
        vehicle = self.get_object()
        serializer = VehicleImageSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(vehicle=vehicle)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['patch'], permission_classes=[permissions.IsAuthenticated, IsDealerUser])
    def update_status(self, request, pk=None):
        vehicle = self.get_object()
        new_status = request.data.get('status')
        if new_status in Vehicle.Status.values:
            vehicle.status = new_status
            vehicle.save()
            return Response({'status': vehicle.status, 'message': 'Vehicle status updated successfully.'})
        return Response({'error': f'Invalid status. Allowed values: {Vehicle.Status.values}'}, status=status.HTTP_400_BAD_REQUEST)
