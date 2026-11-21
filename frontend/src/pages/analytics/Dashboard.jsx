import { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Container, Row, Table } from 'react-bootstrap';
import { Car, IndianRupee, RefreshCw, TrendingUp, Users } from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { getDashboardStats, getLeads, getSalesByMake } from '../../api/endpoints';
import { getApiErrorMessage } from '../../api/errors';
import { ErrorAlert, LoadingSpinner, StatCard } from '../../components/common';

const CHART_COLORS = ['#0d6efd', '#17a2b8', '#ffc107', '#198754', '#dc3545', '#6f42c1', '#fd7e14'];
const LEAD_STATUSES = [
  ['new', 'New'],
  ['contacted', 'Contacted'],
  ['test_drives', 'Test drive'],
  ['negotiations', 'Negotiation'],
  ['qualified', 'Qualified'],
  ['won', 'Won'],
  ['lost', 'Lost'],
];
const LEAD_STATUS_VARIANTS = {
  NEW: 'primary',
  CONTACTED: 'info',
  TEST_DRIVE: 'secondary',
  NEGOTIATION: 'warning',
  QUALIFIED: 'dark',
  WON: 'success',
  LOST: 'danger',
};

const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const getLeadName = (lead) => [lead.first_name, lead.last_name].filter(Boolean).join(' ') || '—';

export const Dashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [salesByMake, setSalesByMake] = useState([]);
  const [recentLeads, setRecentLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setError('');
        const [dashboardResponse, makeResponse, leadsResponse] = await Promise.all([
          getDashboardStats(),
          getSalesByMake(),
          getLeads({ ordering: '-created_at' }),
        ]);
        const data = dashboardResponse.data;
        if (!data?.inventory_analytics || !data?.dealership_summary || !data?.lead_conversion_funnel) {
          throw new Error('Dashboard API returned an unsupported response.');
        }
        if (!Array.isArray(makeResponse.data?.makes) || !Array.isArray(leadsResponse.data?.results)) {
          throw new Error('Analytics API returned an unsupported report response.');
        }
        if (active) {
          setDashboard(data);
          setSalesByMake(makeResponse.data.makes);
          setRecentLeads(leadsResponse.data.results.slice(0, 5));
        }
      } catch (requestError) {
        if (active) setError(getApiErrorMessage(requestError, 'Could not load analytics.'));
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchDashboard();
    return () => { active = false; };
  }, [reload]);

  if (loading) {
    return <Container fluid className="py-4"><LoadingSpinner text="Loading dashboard…" /></Container>;
  }

  if (error || !dashboard) {
    return (
      <Container fluid className="py-4">
        <ErrorAlert message={error || 'Dashboard data is unavailable.'} onRetry={() => setReload((value) => value + 1)} />
      </Container>
    );
  }

  const inventory = dashboard.inventory_analytics;
  const summary = dashboard.dealership_summary;
  const funnel = dashboard.lead_conversion_funnel;
  const performance = dashboard.sales_performance;
  const leadData = LEAD_STATUSES
    .map(([key, name]) => ({ name, value: Number(funnel[key] || 0) }))
    .filter((item) => item.value > 0);
  const revenueData = [
    { name: 'Vehicle sales', revenue: Number(summary.vehicle_sales_revenue || 0) },
    { name: 'Parts', revenue: Number(summary.parts_ecommerce_revenue || 0) },
    { name: 'Service', revenue: Number(summary.workshop_service_revenue || 0) },
  ];
  const hasRevenue = revenueData.some((item) => item.revenue > 0);
  const makeData = salesByMake.map((item) => ({
    make: item['model__make__name'] || 'Unknown',
    inventory: Number(item.total_count || 0),
    sold: Number(item.sold_count || 0),
  }));
  const hasInventoryByMake = makeData.some((item) => item.inventory > 0);

  return (
    <Container fluid className="py-4">
      <Row className="mb-4 align-items-center">
        <Col>
          <h4 className="fw-bold mb-0">Dashboard</h4>
          <small className="text-muted">Live dealership and sales analytics</small>
        </Col>
        <Col xs="auto">
          <Button variant="outline-primary" onClick={() => setReload((value) => value + 1)}>
            <RefreshCw size={15} className="me-1" />Refresh
          </Button>
        </Col>
      </Row>

      <Row className="g-3 mb-4">
        <Col sm={6} xl={3}>
          <StatCard title="Total Vehicles" value={inventory.total_vehicles} icon={Car} color="primary" />
          <small className="text-muted d-block mt-2">
            {inventory.available_count} available · {inventory.reserved_count} reserved · {inventory.sold_count} sold
          </small>
        </Col>
        <Col sm={6} xl={3}>
          <StatCard title="Sales Units (Ready/Delivered)" value={performance.units_sold} icon={TrendingUp} color="warning" />
          <small className="text-muted d-block mt-2">Average deal size: {formatCurrency(performance.average_selling_price)}</small>
        </Col>
        <Col sm={6} xl={3}>
          <StatCard title="Sales Leads" value={funnel.total_leads} icon={Users} color="success" />
          <small className="text-muted d-block mt-2">Conversion rate: {Number(funnel.conversion_rate_percentage).toFixed(2)}%</small>
        </Col>
        <Col sm={6} xl={3}>
          <StatCard title="Gross Dealership Revenue" value={formatCurrency(summary.gross_revenue)} icon={IndianRupee} color="info" />
          <small className="text-muted d-block mt-2">Vehicles, paid parts orders, and completed services</small>
        </Col>
      </Row>

      <Row className="g-3 mb-4">
        <Col xl={7}>
          <Card className="shadow-sm border-0 h-100">
            <Card.Body>
              <h6 className="fw-semibold mb-3">Revenue by Business Area</h6>
              {!hasRevenue ? (
                <Alert variant="light" className="text-center text-muted mb-0">No revenue recorded yet.</Alert>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={revenueData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value) => [formatCurrency(value), 'Revenue']} />
                    <Bar dataKey="revenue" name="Revenue" fill="#0d6efd" radius={[4, 4, 0, 0]}>
                      {revenueData.map((item, index) => <Cell key={item.name} fill={CHART_COLORS[index]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
              <div className="d-flex flex-wrap gap-3 small text-muted mt-2">
                <span>Inventory valuation: {formatCurrency(inventory.inventory_valuation)}</span>
                <span>Potential inventory margin: {formatCurrency(inventory.potential_margin)}</span>
                <span>Active technicians: {dashboard.workshop_analytics.active_technicians}</span>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xl={5}>
          <Card className="shadow-sm border-0 h-100">
            <Card.Body>
              <h6 className="fw-semibold mb-3">Lead Status Distribution</h6>
              {!leadData.length ? (
                <Alert variant="light" className="text-center text-muted mb-0">No leads recorded yet.</Alert>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={leadData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={95}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {leadData.map((item, index) => <Cell key={item.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
              <small className="text-muted">
                {funnel.new} new · {funnel.contacted} contacted · {funnel.test_drives} test drives · {funnel.negotiations} negotiating · {funnel.qualified} qualified · {funnel.won} won · {funnel.lost} lost
              </small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-3">
        <Col xl={6}>
          <Card className="shadow-sm border-0 h-100">
            <Card.Body>
              <h6 className="fw-semibold mb-3">Vehicle Inventory by Make</h6>
              {!hasInventoryByMake ? (
                <Alert variant="light" className="text-center text-muted mb-0">No vehicle inventory to report.</Alert>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={makeData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="make" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="inventory" name="Total inventory" fill="#0d6efd" />
                    <Bar dataKey="sold" name="Sold" fill="#198754" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col xl={6}>
          <Card className="shadow-sm border-0 h-100">
            <Card.Body>
              <h6 className="fw-semibold mb-3">Recent Leads</h6>
              {!recentLeads.length ? (
                <Alert variant="light" className="text-center text-muted mb-0">No recent leads.</Alert>
              ) : (
                <Table hover responsive className="align-middle mb-0">
                  <thead className="table-light">
                    <tr><th>Name</th><th>Email</th><th>Vehicle interest</th><th>Status</th><th>Date</th></tr>
                  </thead>
                  <tbody>
                    {recentLeads.map((lead) => (
                      <tr key={lead.id}>
                        <td className="fw-semibold">{getLeadName(lead)}</td>
                        <td>{lead.email || '—'}</td>
                        <td>{lead.interested_vehicle_details?.display_name || '—'}</td>
                        <td><Badge bg={LEAD_STATUS_VARIANTS[lead.status] || 'secondary'}>{lead.status}</Badge></td>
                        <td className="text-muted small">{lead.created_at ? new Date(lead.created_at).toLocaleDateString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};
