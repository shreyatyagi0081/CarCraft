from django.urls import path
from .views import DealerDashboardAnalyticsView, SalesByMakeReportView

urlpatterns = [
    path('dashboard/', DealerDashboardAnalyticsView.as_view(), name='dealer_dashboard_analytics'),
    path('sales-by-make/', SalesByMakeReportView.as_view(), name='sales_by_make_report'),
]
