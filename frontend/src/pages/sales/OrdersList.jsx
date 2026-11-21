import { useEffect, useState } from 'react';
import { Alert, Container, Row, Col, Table, Badge, Button, Modal, Form } from 'react-bootstrap';
import { Plus, Eye } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  getAllOrders, createOrder, updateOrder, getAllQuotations, getAllUsers, getAllVehicles,
} from '../../api/endpoints';
import { getApiErrorMessage } from '../../api/errors';

const ORDER_STATUSES = [
  ['PLACED', 'Order placed'],
  ['DOCS_VERIFIED', 'Documents verified'],
  ['FINANCE_APPROVED', 'Finance approved'],
  ['READY', 'Ready for delivery'],
  ['DELIVERED', 'Delivered'],
  ['CANCELLED', 'Cancelled'],
];
const PAYMENT_STATUSES = [
  ['PENDING', 'Pending'],
  ['PARTIAL', 'Partial'],
  ['PAID', 'Paid'],
  ['REFUNDED', 'Refunded'],
];
const STATUS_VARIANTS = {
  PLACED: 'warning',
  DOCS_VERIFIED: 'info',
  FINANCE_APPROVED: 'primary',
  READY: 'success',
  DELIVERED: 'success',
  CANCELLED: 'danger',
};
const PAYMENT_STATUS_VARIANTS = {
  PENDING: 'warning',
  PARTIAL: 'info',
  PAID: 'success',
  REFUNDED: 'danger',
};
const EMPTY_FORM = {
  quotation: '',
  customer: '',
  vehicle: '',
  total_price: '',
  deposit_paid: '0',
  payment_status: 'PENDING',
  order_status: 'PLACED',
  delivery_date: '',
  delivery_address: '',
  notes: '',
};

export const OrdersList = () => {
  const [orders, setOrders] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reload, setReload] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [viewOrder, setViewOrder] = useState(null);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } =
    useForm({ defaultValues: EMPTY_FORM });

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        setLoadError('');
        const [orderItems, quotationItems, customerItems, vehicleItems] = await Promise.all([
          getAllOrders(),
          getAllQuotations(),
          getAllUsers({ role: 'CUSTOMER' }),
          getAllVehicles({ status: 'AVAILABLE' }),
        ]);
        if (active) {
          setOrders(orderItems);
          setQuotations(quotationItems);
          setCustomers(customerItems);
          setVehicles(vehicleItems);
        }
      } catch (error) {
        const message = getApiErrorMessage(error, 'Failed to load sales order data.');
        if (active) {
          setLoadError(message);
          toast.error(message);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchData();
    return () => { active = false; };
  }, [reload]);

  const openNewOrder = () => {
    setSelectedQuotation(null);
    reset(EMPTY_FORM);
    setShowModal(true);
  };

  const openFromQuotation = (quotation) => {
    setSelectedQuotation(quotation);
    reset({
      ...EMPTY_FORM,
      quotation: String(quotation.id),
      customer: String(quotation.customer),
      vehicle: String(quotation.vehicle),
      total_price: quotation.total_amount,
    });
    setShowModal(true);
  };

  const onQuotationChange = (event) => {
    const quotation = quotations.find((item) => String(item.id) === event.target.value);
    if (!quotation) return;
    setValue('customer', String(quotation.customer));
    setValue('vehicle', String(quotation.vehicle));
    setValue('total_price', String(quotation.total_amount));
  };

  const onSubmit = async (data) => {
    const payload = {
      ...data,
      quotation: data.quotation ? Number(data.quotation) : null,
      customer: Number(data.customer),
      vehicle: Number(data.vehicle),
      total_price: Number(data.total_price),
      deposit_paid: Number(data.deposit_paid || 0),
      delivery_date: data.delivery_date || null,
    };
    try {
      await createOrder(payload);
      toast.success('Sales order created.');
      setShowModal(false);
      setSelectedQuotation(null);
      setReload((value) => value + 1);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to create sales order.'));
    }
  };

  const handleOrderUpdate = async (order, update) => {
    try {
      await updateOrder(order.id, update);
      toast.success('Sales order updated.');
      setReload((value) => value + 1);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to update sales order.'));
    }
  };

  const acceptedQuotations = quotations.filter(
    (quotation) => quotation.status === 'ACCEPTED'
      && !orders.some((order) => Number(order.quotation) === quotation.id)
  );
  const formatCurrency = (value) => value != null
    ? `₹${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
    : '—';
  const customerName = (order) => {
    const customer = order.customer_details;
    return customer ? [customer.first_name, customer.last_name].filter(Boolean).join(' ') || customer.username : `Customer #${order.customer}`;
  };
  const vehicleName = (order) => order.vehicle_details?.display_name || `Vehicle #${order.vehicle}`;

  return (
    <Container fluid className="py-4">
      <Row className="mb-3 align-items-center">
        <Col>
          <h4 className="fw-bold mb-0">Sales Orders</h4>
          <small className="text-muted">Track vehicle sale orders</small>
        </Col>
        <Col xs="auto">
          <Button variant="primary" onClick={openNewOrder} disabled={loading}>
            <Plus size={16} className="me-1" /> New Order
          </Button>
        </Col>
      </Row>

      {loadError && <Alert variant="danger">{loadError}<Button variant="link" onClick={() => setReload((value) => value + 1)}>Retry</Button></Alert>}

      {acceptedQuotations.length > 0 && (
        <div className="bg-success bg-opacity-10 border border-success rounded p-3 mb-4">
          <p className="fw-semibold text-success mb-2">{acceptedQuotations.length} accepted quotation(s) ready for order</p>
          <div className="d-flex flex-wrap gap-2">
            {acceptedQuotations.map((quotation) => (
              <Button key={quotation.id} variant="success" size="sm" onClick={() => openFromQuotation(quotation)}>
                Create order for {quotation.quotation_number} — {quotation.vehicle_details?.display_name || `Vehicle #${quotation.vehicle}`}
              </Button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-5 text-muted">Loading orders…</div>
      ) : (
        <div className="table-responsive">
          <Table hover className="align-middle">
            <thead className="table-light">
              <tr><th>Order #</th><th>Customer</th><th>Vehicle</th><th>Total price</th><th>Payment status</th><th>Order status</th><th>Delivery date</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr><td colSpan={8} className="text-center text-muted py-5">No orders found.</td></tr>
              ) : orders.map((order) => (
                <tr key={order.id}>
                  <td className="fw-semibold">{order.order_number || `#${order.id}`}</td>
                  <td>{customerName(order)}</td>
                  <td>{vehicleName(order)}</td>
                  <td className="fw-semibold">{formatCurrency(order.total_price)}</td>
                  <td>
                    <Form.Select
                      size="sm"
                      value={order.payment_status}
                      aria-label={`Payment status for ${order.order_number}`}
                      onChange={(event) => handleOrderUpdate(order, { payment_status: event.target.value })}
                    >
                      {PAYMENT_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </Form.Select>
                    <Badge bg={PAYMENT_STATUS_VARIANTS[order.payment_status] || 'secondary'} className="d-none">
                      {order.payment_status}
                    </Badge>
                  </td>
                  <td>
                    <Form.Select
                      size="sm"
                      value={order.order_status}
                      aria-label={`Order status for ${order.order_number}`}
                      onChange={(event) => handleOrderUpdate(order, { order_status: event.target.value })}
                    >
                      {ORDER_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </Form.Select>
                  </td>
                  <td>{order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : '—'}</td>
                  <td>
                    <Button variant="outline-primary" size="sm" title="View" onClick={() => setViewOrder(order)}>
                      <Eye size={14} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{selectedQuotation ? `Create order from ${selectedQuotation.quotation_number}` : 'New Sales Order'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit(onSubmit)}>
          <Modal.Body>
            <Row className="g-3">
              {!selectedQuotation && (
                <Col md={12}>
                  <Form.Label>Accepted quotation (optional)</Form.Label>
                  <Form.Select {...register('quotation')} onChange={(event) => { setValue('quotation', event.target.value); onQuotationChange(event); }}>
                    <option value="">Select quotation</option>
                    {quotations.filter((quotation) => quotation.status === 'ACCEPTED').map((quotation) => (
                      <option key={quotation.id} value={quotation.id}>{quotation.quotation_number} — {quotation.vehicle_details?.display_name || `Vehicle #${quotation.vehicle}`}</option>
                    ))}
                  </Form.Select>
                </Col>
              )}
              <Col md={6}>
                <Form.Label>Customer *</Form.Label>
                <Form.Select {...register('customer', { required: 'Customer is required' })} isInvalid={!!errors.customer}>
                  <option value="">Select customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>{[customer.first_name, customer.last_name].filter(Boolean).join(' ') || customer.username} ({customer.email})</option>
                  ))}
                </Form.Select>
                <Form.Control.Feedback type="invalid">{errors.customer?.message}</Form.Control.Feedback>
              </Col>
              <Col md={6}>
                <Form.Label>Vehicle *</Form.Label>
                <Form.Select {...register('vehicle', { required: 'Vehicle is required' })} isInvalid={!!errors.vehicle}>
                  <option value="">Select vehicle</option>
                  {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.display_name}</option>)}
                </Form.Select>
                <Form.Control.Feedback type="invalid">{errors.vehicle?.message}</Form.Control.Feedback>
              </Col>
              <Col md={6}>
                <Form.Label>Total price *</Form.Label>
                <Form.Control type="number" step="0.01" {...register('total_price', { required: 'Total price is required', min: { value: 0, message: 'Must be non-negative' } })} isInvalid={!!errors.total_price} />
                <Form.Control.Feedback type="invalid">{errors.total_price?.message}</Form.Control.Feedback>
              </Col>
              <Col md={6}>
                <Form.Label>Deposit paid</Form.Label>
                <Form.Control type="number" step="0.01" {...register('deposit_paid', { min: { value: 0, message: 'Must be non-negative' } })} isInvalid={!!errors.deposit_paid} />
                <Form.Control.Feedback type="invalid">{errors.deposit_paid?.message}</Form.Control.Feedback>
              </Col>
              <Col md={6}>
                <Form.Label>Payment status</Form.Label>
                <Form.Select {...register('payment_status')}>
                  {PAYMENT_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </Form.Select>
              </Col>
              <Col md={6}>
                <Form.Label>Order status</Form.Label>
                <Form.Select {...register('order_status')}>
                  {ORDER_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </Form.Select>
              </Col>
              <Col md={6}>
                <Form.Label>Delivery date</Form.Label>
                <Form.Control type="date" {...register('delivery_date')} />
              </Col>
              <Col md={6}>
                <Form.Label>Delivery address</Form.Label>
                <Form.Control {...register('delivery_address')} />
              </Col>
              <Col md={12}>
                <Form.Label>Notes</Form.Label>
                <Form.Control as="textarea" rows={3} {...register('notes')} />
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating…' : 'Create order'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={!!viewOrder} onHide={() => setViewOrder(null)} centered>
        <Modal.Header closeButton><Modal.Title>{viewOrder?.order_number}</Modal.Title></Modal.Header>
        <Modal.Body>
          {viewOrder && (
            <Table borderless size="sm"><tbody>
              <tr><td className="text-muted">Customer</td><td>{customerName(viewOrder)}</td></tr>
              <tr><td className="text-muted">Vehicle</td><td>{vehicleName(viewOrder)}</td></tr>
              <tr><td className="text-muted">Total price</td><td>{formatCurrency(viewOrder.total_price)}</td></tr>
              <tr><td className="text-muted">Deposit paid</td><td>{formatCurrency(viewOrder.deposit_paid)}</td></tr>
              <tr><td className="text-muted">Balance due</td><td>{formatCurrency(viewOrder.balance_due)}</td></tr>
              <tr><td className="text-muted">Payment status</td><td><Badge bg={PAYMENT_STATUS_VARIANTS[viewOrder.payment_status]}>{viewOrder.payment_status}</Badge></td></tr>
              <tr><td className="text-muted">Order status</td><td><Badge bg={STATUS_VARIANTS[viewOrder.order_status]}>{viewOrder.order_status}</Badge></td></tr>
              <tr><td className="text-muted">Delivery date</td><td>{viewOrder.delivery_date ? new Date(viewOrder.delivery_date).toLocaleDateString() : '—'}</td></tr>
              {viewOrder.delivery_address && <tr><td className="text-muted">Delivery address</td><td>{viewOrder.delivery_address}</td></tr>}
              {viewOrder.notes && <tr><td className="text-muted">Notes</td><td>{viewOrder.notes}</td></tr>}
            </tbody></Table>
          )}
        </Modal.Body>
        <Modal.Footer><Button variant="secondary" onClick={() => setViewOrder(null)}>Close</Button></Modal.Footer>
      </Modal>
    </Container>
  );
};
