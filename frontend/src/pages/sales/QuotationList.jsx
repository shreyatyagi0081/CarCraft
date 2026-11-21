import { useEffect, useState } from 'react';
import { Alert, Container, Row, Col, Table, Badge, Button, Modal, Form, Nav } from 'react-bootstrap';
import { Plus, Eye, Edit2, Send } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  getAllQuotations, createQuotation, updateQuotation, getAllLeads, getAllUsers, getAllVehicles,
} from '../../api/endpoints';
import { getApiErrorMessage } from '../../api/errors';

const STATUS_VARIANTS = {
  DRAFT: 'secondary',
  SENT: 'primary',
  ACCEPTED: 'success',
  REJECTED: 'danger',
  EXPIRED: 'dark',
};
const STATUS_TABS = ['ALL', 'DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'];
const FINANCING_TYPES = [
  ['CASH', 'Cash'],
  ['DEALER_FINANCE', 'Dealership finance'],
  ['BANK_LOAN', 'Bank loan'],
  ['LEASE', 'Lease'],
];
const EMPTY_FORM = {
  lead: '',
  customer: '',
  vehicle: '',
  vehicle_price: '',
  discount_amount: '0',
  tax_amount: '0',
  registration_fee: '500',
  insurance_fee: '1200',
  accessories_fee: '0',
  financing_type: 'CASH',
  valid_until: '',
  terms_and_conditions: '',
};

export const QuotationList = () => {
  const [quotations, setQuotations] = useState([]);
  const [leads, setLeads] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reload, setReload] = useState(0);
  const [activeTab, setActiveTab] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState(null);
  const [viewQuotation, setViewQuotation] = useState(null);

  const { register, handleSubmit, reset, control, setValue, formState: { errors, isSubmitting } } =
    useForm({ defaultValues: EMPTY_FORM });
  const vehiclePrice = Number(useWatch({ control, name: 'vehicle_price' }) || 0);
  const discountAmount = Number(useWatch({ control, name: 'discount_amount' }) || 0);
  const taxAmount = Number(useWatch({ control, name: 'tax_amount' }) || 0);
  const registrationFee = Number(useWatch({ control, name: 'registration_fee' }) || 0);
  const insuranceFee = Number(useWatch({ control, name: 'insurance_fee' }) || 0);
  const accessoriesFee = Number(useWatch({ control, name: 'accessories_fee' }) || 0);
  const taxableAmount = Math.max(vehiclePrice - discountAmount, 0);
  const calculatedTax = taxAmount || taxableAmount * 0.1;
  const calculatedTotal = taxableAmount + registrationFee + insuranceFee + accessoriesFee + calculatedTax;

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        setLoadError('');
        const [quotationItems, leadItems, customerItems, vehicleItems] = await Promise.all([
          getAllQuotations(),
          getAllLeads(),
          getAllUsers({ role: 'CUSTOMER' }),
          getAllVehicles({ status: 'AVAILABLE' }),
        ]);
        if (active) {
          setQuotations(quotationItems);
          setLeads(leadItems);
          setCustomers(customerItems);
          setVehicles(vehicleItems);
        }
      } catch (error) {
        const message = getApiErrorMessage(error, 'Failed to load quotation data.');
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

  const openNewQuotation = () => {
    setEditingQuotation(null);
    reset(EMPTY_FORM);
    setShowModal(true);
  };

  const openEditQuotation = (quotation) => {
    setEditingQuotation(quotation);
    reset({
      lead: quotation.lead ? String(quotation.lead) : '',
      customer: String(quotation.customer),
      vehicle: String(quotation.vehicle),
      vehicle_price: quotation.vehicle_price,
      discount_amount: quotation.discount_amount,
      tax_amount: quotation.tax_amount,
      registration_fee: quotation.registration_fee,
      insurance_fee: quotation.insurance_fee,
      accessories_fee: quotation.accessories_fee,
      financing_type: quotation.financing_type,
      valid_until: quotation.valid_until,
      terms_and_conditions: quotation.terms_and_conditions || '',
    });
    setShowModal(true);
  };

  const onLeadChange = (event) => {
    const lead = leads.find((item) => String(item.id) === event.target.value);
    if (lead?.customer) setValue('customer', String(lead.customer));
    if (lead?.interested_vehicle) setValue('vehicle', String(lead.interested_vehicle));
  };

  const onSubmit = async (data) => {
    const payload = {
      ...data,
      lead: data.lead ? Number(data.lead) : null,
      customer: Number(data.customer),
      vehicle: Number(data.vehicle),
      vehicle_price: Number(data.vehicle_price),
      discount_amount: Number(data.discount_amount || 0),
      tax_amount: Number(data.tax_amount || 0),
      registration_fee: Number(data.registration_fee || 0),
      insurance_fee: Number(data.insurance_fee || 0),
      accessories_fee: Number(data.accessories_fee || 0),
      status: editingQuotation?.status || 'DRAFT',
    };
    try {
      if (editingQuotation) {
        await updateQuotation(editingQuotation.id, payload);
        toast.success('Quotation updated.');
      } else {
        await createQuotation(payload);
        toast.success('Quotation created.');
      }
      setShowModal(false);
      setReload((value) => value + 1);
    } catch (error) {
      toast.error(getApiErrorMessage(error, `Failed to ${editingQuotation ? 'update' : 'create'} quotation.`));
    }
  };

  const handleSend = async (quotation) => {
    try {
      await updateQuotation(quotation.id, { status: 'SENT' });
      toast.success('Quotation marked as sent. Email delivery is not configured.');
      setReload((value) => value + 1);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to update quotation status.'));
    }
  };

  const filteredQuotations = activeTab === 'ALL'
    ? quotations
    : quotations.filter((quotation) => quotation.status === activeTab);
  const formatCurrency = (value) => value != null
    ? `₹${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
    : '—';
  const customerName = (quotation) => {
    const customer = quotation.customer_details;
    return customer ? [customer.first_name, customer.last_name].filter(Boolean).join(' ') || customer.username : `Customer #${quotation.customer}`;
  };
  const vehicleName = (quotation) => quotation.vehicle_details?.display_name || `Vehicle #${quotation.vehicle}`;

  return (
    <Container fluid className="py-4">
      <Row className="mb-3 align-items-center">
        <Col>
          <h4 className="fw-bold mb-0">Quotations</h4>
          <small className="text-muted">Manage price quotations for leads</small>
        </Col>
        <Col xs="auto">
          <Button variant="primary" onClick={openNewQuotation} disabled={loading}>
            <Plus size={16} className="me-1" /> New Quotation
          </Button>
        </Col>
      </Row>

      {loadError && <Alert variant="danger">{loadError}<Button variant="link" onClick={() => setReload((value) => value + 1)}>Retry</Button></Alert>}

      <Nav variant="tabs" className="mb-3">
        {STATUS_TABS.map((tab) => (
          <Nav.Item key={tab}>
            <Nav.Link active={activeTab === tab} onClick={() => setActiveTab(tab)} className="text-capitalize">
              {tab.toLowerCase()}
              <Badge bg="light" text="dark" className="ms-1">
                {tab === 'ALL' ? quotations.length : quotations.filter((quotation) => quotation.status === tab).length}
              </Badge>
            </Nav.Link>
          </Nav.Item>
        ))}
      </Nav>

      {loading ? (
        <div className="text-center py-5 text-muted">Loading…</div>
      ) : (
        <div className="table-responsive">
          <Table hover className="align-middle">
            <thead className="table-light">
              <tr><th>Quotation</th><th>Customer</th><th>Vehicle</th><th>Total</th><th>Status</th><th>Valid Until</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filteredQuotations.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-muted py-4">No quotations found</td></tr>
              ) : filteredQuotations.map((quotation) => (
                <tr key={quotation.id}>
                  <td className="fw-semibold text-muted">{quotation.quotation_number}</td>
                  <td>{customerName(quotation)}</td>
                  <td>{vehicleName(quotation)}</td>
                  <td className="fw-semibold">{formatCurrency(quotation.total_amount)}</td>
                  <td><Badge bg={STATUS_VARIANTS[quotation.status] || 'secondary'}>{quotation.status}</Badge></td>
                  <td>{quotation.valid_until ? new Date(quotation.valid_until).toLocaleDateString() : '—'}</td>
                  <td>
                    <div className="d-flex gap-1">
                      <Button variant="outline-primary" size="sm" title="View" onClick={() => setViewQuotation(quotation)}><Eye size={14} /></Button>
                      <Button variant="outline-secondary" size="sm" title="Edit" onClick={() => openEditQuotation(quotation)}><Edit2 size={14} /></Button>
                      {quotation.status === 'DRAFT' && (
                        <Button variant="outline-success" size="sm" title="Mark sent" onClick={() => handleSend(quotation)}><Send size={14} /></Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
        <Modal.Header closeButton><Modal.Title>{editingQuotation ? 'Edit Quotation' : 'New Quotation'}</Modal.Title></Modal.Header>
        <Form onSubmit={handleSubmit(onSubmit)}>
          <Modal.Body>
            <Row className="g-3">
              <Col md={6}>
                <Form.Label>Lead</Form.Label>
                <Form.Select {...register('lead', { onChange: onLeadChange })}>
                  <option value="">No linked lead</option>
                  {leads.map((lead) => (
                    <option key={lead.id} value={lead.id}>{[lead.first_name, lead.last_name].filter(Boolean).join(' ')} — {lead.email}</option>
                  ))}
                </Form.Select>
              </Col>
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
              <Col md={12}>
                <Form.Label>Vehicle *</Form.Label>
                <Form.Select {...register('vehicle', { required: 'Vehicle is required' })} isInvalid={!!errors.vehicle}>
                  <option value="">Select vehicle</option>
                  {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.display_name}</option>)}
                </Form.Select>
                <Form.Control.Feedback type="invalid">{errors.vehicle?.message}</Form.Control.Feedback>
              </Col>
              {[
                ['vehicle_price', 'Vehicle price', { required: 'Vehicle price is required', min: { value: 0, message: 'Must be non-negative' } }],
                ['discount_amount', {
                  min: { value: 0, message: 'Must be non-negative' },
                  validate: (value) => Number(value || 0) <= vehiclePrice || 'Discount cannot exceed vehicle price',
                }],
                ['tax_amount', 'Tax amount (0 = default 10%)', { min: { value: 0, message: 'Must be non-negative' } }],
                ['registration_fee', 'Registration fee', { min: { value: 0, message: 'Must be non-negative' } }],
                ['insurance_fee', 'Insurance fee', { min: { value: 0, message: 'Must be non-negative' } }],
                ['accessories_fee', 'Accessories fee', { min: { value: 0, message: 'Must be non-negative' } }],
              ].map(([name, label, validation]) => (
                <Col md={6} key={name}>
                  <Form.Label>{label}{validation.required ? ' *' : ''}</Form.Label>
                  <Form.Control type="number" step="0.01" {...register(name, validation)} isInvalid={!!errors[name]} />
                  <Form.Control.Feedback type="invalid">{errors[name]?.message}</Form.Control.Feedback>
                </Col>
              ))}
              <Col md={6}>
                <Form.Label>Financing type</Form.Label>
                <Form.Select {...register('financing_type')}>
                  {FINANCING_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </Form.Select>
              </Col>
              <Col md={6}>
                <Form.Label>Valid until *</Form.Label>
                <Form.Control type="date" {...register('valid_until', { required: 'Expiry date is required' })} isInvalid={!!errors.valid_until} />
                <Form.Control.Feedback type="invalid">{errors.valid_until?.message}</Form.Control.Feedback>
              </Col>
              <Col md={12}>
                <div className="bg-light rounded p-3 d-flex justify-content-between align-items-center">
                  <span className="text-muted">Estimated total (server-calculated)</span>
                  <span className="fs-5 fw-bold text-success">{formatCurrency(calculatedTotal)}</span>
                </div>
                <small className="text-muted">The backend recalculates the total using vehicle price, discount, tax, and fees.</small>
              </Col>
              <Col md={12}>
                <Form.Label>Terms and conditions</Form.Label>
                <Form.Control as="textarea" rows={3} {...register('terms_and_conditions')} />
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : editingQuotation ? 'Save changes' : 'Create quotation'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={!!viewQuotation} onHide={() => setViewQuotation(null)} centered>
        <Modal.Header closeButton><Modal.Title>{viewQuotation?.quotation_number}</Modal.Title></Modal.Header>
        <Modal.Body>
          {viewQuotation && (
            <Table borderless size="sm"><tbody>
              <tr><td className="text-muted">Customer</td><td>{customerName(viewQuotation)}</td></tr>
              <tr><td className="text-muted">Vehicle</td><td>{vehicleName(viewQuotation)}</td></tr>
              <tr><td className="text-muted">Vehicle price</td><td>{formatCurrency(viewQuotation.vehicle_price)}</td></tr>
              <tr><td className="text-muted">Discount</td><td>{formatCurrency(viewQuotation.discount_amount)}</td></tr>
              <tr><td className="text-muted">Tax</td><td>{formatCurrency(viewQuotation.tax_amount)}</td></tr>
              <tr><td className="text-muted">Registration</td><td>{formatCurrency(viewQuotation.registration_fee)}</td></tr>
              <tr><td className="text-muted">Insurance</td><td>{formatCurrency(viewQuotation.insurance_fee)}</td></tr>
              <tr><td className="text-muted">Accessories</td><td>{formatCurrency(viewQuotation.accessories_fee)}</td></tr>
              <tr><td className="text-muted fw-bold">Total</td><td className="fw-bold text-success fs-5">{formatCurrency(viewQuotation.total_amount)}</td></tr>
              <tr><td className="text-muted">Status</td><td><Badge bg={STATUS_VARIANTS[viewQuotation.status]}>{viewQuotation.status}</Badge></td></tr>
              <tr><td className="text-muted">Valid until</td><td>{viewQuotation.valid_until ? new Date(viewQuotation.valid_until).toLocaleDateString() : '—'}</td></tr>
              {viewQuotation.terms_and_conditions && <tr><td className="text-muted">Terms</td><td>{viewQuotation.terms_and_conditions}</td></tr>}
            </tbody></Table>
          )}
        </Modal.Body>
        <Modal.Footer><Button variant="secondary" onClick={() => setViewQuotation(null)}>Close</Button></Modal.Footer>
      </Modal>
    </Container>
  );
};
