from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db.models import Q
from .models import Review
from .serializers import ReviewSerializer
from apps.accounts.permissions import IsDealerUser, IsOwnerOrDealer

class ReviewViewSet(viewsets.ModelViewSet):
    serializer_class = ReviewSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['review_type', 'vehicle', 'part', 'rating', 'is_approved']
    search_fields = ['title', 'comment', 'user__username']
    ordering_fields = ['created_at', 'rating']

    def get_queryset(self):
        user = self.request.user
        if user and user.is_authenticated and user.is_dealer:
            return Review.objects.all().select_related('user', 'vehicle', 'part')
        queryset = Review.objects.all()
        if user and user.is_authenticated:
            queryset = queryset.filter(Q(is_approved=True) | Q(user=user))
        else:
            queryset = queryset.filter(is_approved=True)
        return queryset.select_related('user', 'vehicle', 'part')

    def get_permissions(self):
        if self.action in ['create']:
            return [permissions.IsAuthenticated()]
        if self.action in ['destroy', 'respond', 'moderate']:
            return [permissions.IsAuthenticated(), IsDealerUser()]
        if self.action in ['update', 'partial_update']:
            return [permissions.IsAuthenticated(), IsOwnerOrDealer()]
        return [permissions.AllowAny()]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user, is_approved=False)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsDealerUser])
    def respond(self, request, pk=None):
        review = self.get_object()
        response_text = request.data.get('dealer_response')
        if not response_text:
            return Response({'error': 'dealer_response text is required.'}, status=status.HTTP_400_BAD_REQUEST)

        review.dealer_response = response_text
        review.dealer_responded_at = timezone.now()
        review.save()
        return Response({'message': 'Dealer response submitted successfully.', 'review_id': review.id})

    @action(detail=True, methods=['patch'], permission_classes=[permissions.IsAuthenticated, IsDealerUser])
    def moderate(self, request, pk=None):
        review = self.get_object()
        is_approved = request.data.get('is_approved', True)
        review.is_approved = bool(is_approved)
        review.save()
        return Response({'message': 'Moderation status updated.', 'is_approved': review.is_approved})
