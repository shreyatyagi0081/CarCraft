from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView
)

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # OpenAPI 3 Interactive Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # CarCraft 12 Modules API Endpoints
    path('api/auth/', include('apps.accounts.urls')),
    path('api/vehicles/', include('apps.vehicles.urls')),
    path('api/sales/', include('apps.sales.urls')),
    path('api/analytics/', include('apps.analytics.urls')),
    path('api/ecommerce/', include('apps.ecommerce.urls')),
    path('api/reviews/', include('apps.reviews.urls')),
    path('api/services/', include('apps.services.urls')),
    path('api/communications/', include('apps.communications.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
