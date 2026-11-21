from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from django.db.models import Sum, Count, Avg, Q

from apps.accounts.permissions import IsDealerUser
from apps.vehicles.models import Vehicle
from apps.sales.models import SalesLead, VehicleOrder, Quotation
from apps.ecommerce.models import Order as EcommerceOrder
from apps.services.models import ServiceAppointment, TechnicianProfile

class DealerDashboardAnalyticsView(APIView):
    """
    Comprehensive Executive Dealer Dashboard & Reporting API:
    - Vehicle Inventory Health
    - Sales Pipeline & Conversion Rates
    - Vehicle & E-commerce Revenue
    - Service Center Performance
    """
    permission_classes = [permissions.IsAuthenticated, IsDealerUser]

    def get(self, request):
        # 1. Vehicle Inventory Stats
        total_vehicles = Vehicle.objects.count()
        available_vehicles = Vehicle.objects.filter(status=Vehicle.Status.AVAILABLE).count()
        reserved_vehicles = Vehicle.objects.filter(status=Vehicle.Status.RESERVED).count()
        sold_vehicles = Vehicle.objects.filter(status=Vehicle.Status.SOLD).count()
        
        inventory_valuation = Vehicle.objects.filter(status=Vehicle.Status.AVAILABLE).aggregate(
            total_selling_value=Sum('selling_price'),
            total_cost_value=Sum('cost_price')
        )
        total_inventory_value = inventory_valuation['total_selling_value'] or 0
        total_inventory_cost = inventory_valuation['total_cost_value'] or 0
        potential_gross_margin = total_inventory_value - total_inventory_cost

        # 2. Sales Pipeline & Lead Funnel
        total_leads = SalesLead.objects.count()
        won_deals = SalesLead.objects.filter(status=SalesLead.LeadStatus.WON).count()
        lost_deals = SalesLead.objects.filter(status=SalesLead.LeadStatus.LOST).count()
        negotiations = SalesLead.objects.filter(status=SalesLead.LeadStatus.NEGOTIATION).count()
        test_drives = SalesLead.objects.filter(status=SalesLead.LeadStatus.TEST_DRIVE_SCHEDULED).count()
        new_leads = SalesLead.objects.filter(status=SalesLead.LeadStatus.NEW).count()
        contacted_leads = SalesLead.objects.filter(status=SalesLead.LeadStatus.CONTACTED).count()
        qualified_leads = SalesLead.objects.filter(status=SalesLead.LeadStatus.QUALIFIED).count()
        
        conversion_rate = (won_deals / total_leads * 100) if total_leads > 0 else 0

        # 3. Vehicle Sales Revenue
        vehicle_sales = VehicleOrder.objects.filter(
            order_status__in=[VehicleOrder.OrderStatus.DELIVERED, VehicleOrder.OrderStatus.READY_FOR_DELIVERY]
        ).aggregate(
            total_revenue=Sum('total_price'),
            total_units_sold=Count('id'),
            avg_deal_size=Avg('total_price')
        )
        total_vehicle_revenue = vehicle_sales['total_revenue'] or 0
        total_units_sold = vehicle_sales['total_units_sold'] or 0
        avg_deal_size = vehicle_sales['avg_deal_size'] or 0

        # 4. E-Commerce Parts Revenue
        parts_sales = EcommerceOrder.objects.filter(payment_status='PAID').aggregate(
            total_parts_revenue=Sum('total_amount'),
        )
        total_parts_revenue = parts_sales['total_parts_revenue'] or 0

        # 5. Service & Maintenance Center
        total_service_appointments = ServiceAppointment.objects.count()
        completed_services = ServiceAppointment.objects.filter(status='COMPLETED').count()
        pending_services = ServiceAppointment.objects.filter(status__in=['REQUESTED', 'CONFIRMED', 'IN_PROGRESS']).count()
        service_revenue = ServiceAppointment.objects.filter(status='COMPLETED').aggregate(total=Sum('final_cost'))['total'] or 0
        active_technicians = TechnicianProfile.objects.filter(is_active=True).count()

        # Combined Total Gross Dealership Revenue
        gross_dealership_revenue = total_vehicle_revenue + total_parts_revenue + service_revenue

        return Response({
            'dealership_summary': {
                'gross_revenue': gross_dealership_revenue,
                'vehicle_sales_revenue': total_vehicle_revenue,
                'parts_ecommerce_revenue': total_parts_revenue,
                'workshop_service_revenue': service_revenue,
            },
            'inventory_analytics': {
                'total_vehicles': total_vehicles,
                'available_count': available_vehicles,
                'reserved_count': reserved_vehicles,
                'sold_count': sold_vehicles,
                'inventory_valuation': total_inventory_value,
                'inventory_cost': total_inventory_cost,
                'potential_margin': potential_gross_margin
            },
            'lead_conversion_funnel': {
                'total_leads': total_leads,
                'new': new_leads,
                'contacted': contacted_leads,
                'test_drives': test_drives,
                'negotiations': negotiations,
                'qualified': qualified_leads,
                'won': won_deals,
                'lost': lost_deals,
                'conversion_rate_percentage': round(conversion_rate, 2)
            },
            'sales_performance': {
                'units_sold': total_units_sold,
                'average_selling_price': round(avg_deal_size, 2)
            },
            'workshop_analytics': {
                'total_appointments': total_service_appointments,
                'completed_services': completed_services,
                'pending_services': pending_services,
                'active_technicians': active_technicians,
                'service_revenue': service_revenue
            }
        }, status=status.HTTP_200_OK)


class SalesByMakeReportView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsDealerUser]

    def get(self, request):
        make_breakdown = Vehicle.objects.values(
            'model__make__name'
        ).annotate(
            total_count=Count('id'),
            sold_count=Count('id', filter=Q(status=Vehicle.Status.SOLD)),
            available_count=Count('id', filter=Q(status=Vehicle.Status.AVAILABLE)),
            total_revenue=Sum('selling_price', filter=Q(status=Vehicle.Status.SOLD))
        ).order_by('-total_count')

        return Response({'makes': list(make_breakdown)})
