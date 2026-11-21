import { useEffect, useState } from 'react';
import { Alert, Container, Row, Col, Card, Badge, Button, Modal, Form, InputGroup, Dropdown } from 'react-bootstrap';
import { Plus, Search, User, Phone, Car, Calendar, Edit2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { getAllLeads, getAllVehicles, createLead, updateLead } from '../../api/endpoints';
import { getApiErrorMessage } from '../../api/errors';

const STATUS_COLUMNS = [
  { key: 'NEW', label: 'New', variant: 'primary' },
  { key: 'CONTACTED', label: 'Contacted', variant: 'info' },
  { key: 'TEST_DRIVE', label: 'Test Drive', variant: 'secondary' },
  { key: 'NEGOTIATION', label: 'Negotiation', variant: 'warning' },
  { key: 'QUALIFIED', label: 'Qualified', variant: 'dark' },
  { key: 'WON', label: 'Won', variant: 'success' },
  { key: 'LOST', label: 'Lost', variant: 'danger' },
];

const LEAD_SOURCES = [
  ['WEBSITE', 'Website'],
  ['WALK_IN', 'Walk-in'],
  ['PHONE', 'Phone'],
  ['REFERRAL', 'Referral'],
  ['SOCIAL', 'Social media'],
  ['CAMPAIGN', 'Campaign'],
];

const SOURCE_COLORS = {
  WALK_IN: 'secondary',
  WEBSITE: 'primary',
  REFERRAL: 'success',
  PHONE: 'info',
  SOCIAL: 'warning',
  CAMPAIGN: 'dark',
};

const COLUMN_BG = {
  NEW: '#e8f0fe',
  CONTACTED: '#e0f7fa',
  TEST_DRIVE: '#ede7f6',
  NEGOTIATION: '#fff8e1',
  QUALIFIED: '#eceff1',
  WON: '#e8f5e9',
  LOST: '#fce4ec',
};

const EMPTY_FORM = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  interested_vehicle: '',
  source: 'WEBSITE',
  status: 'NEW',
  notes: '',
};

export const LeadsList = () => {
  const [leads, setLeads] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reload, setReload] = useState(0);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ defaultValues: EMPTY_FORM });

  useEffect(() => {
    let active = true;
    getAllVehicles({ status: 'AVAILABLE' })
      .then((items) => { if (active) setVehicles(items); })
      .catch((error) => toast.error(getApiErrorMessage(error, 'Failed to load available vehicles.')));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const fetchLeads = async () => {
      try {
        setLoading(true);
        setLoadError('');
        const params = {};
        if (search.trim()) params.search = search.trim();
        if (dateFrom) params['created_at__date__gte'] = dateFrom;
        if (dateTo) params['created_at__date__lte'] = dateTo;
        const items = await getAllLeads(params);
        if (active) setLeads(items);
      } catch (error) {
        const message = getApiErrorMessage(error, 'Failed to load leads.');
        if (active) {
          setLeads([]);
          setLoadError(message);
          toast.error(message);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchLeads();
    return () => { active = false; };
  }, [search, dateFrom, dateTo, reload]);

  const openNewLead = () => {
    setEditingLead(null);
    reset(EMPTY_FORM);
    setShowModal(true);
  };

  const openEditLead = (lead) => {
    setEditingLead(lead);
    reset({
      first_name: lead.first_name || '',
      last_name: lead.last_name || '',
      email: lead.email || '',
      phone: lead.phone || '',
      interested_vehicle: lead.interested_vehicle ? String(lead.interested_vehicle) : '',
      source: lead.source || 'WEBSITE',
      status: lead.status || 'NEW',
      notes: lead.notes || '',
    });
    setShowModal(true);
  };

  const onSubmit = async (data) => {
    const payload = {
      ...data,
      first_name: data.first_name.trim(),
      last_name: data.last_name.trim(),
      interested_vehicle: data.interested_vehicle ? Number(data.interested_vehicle) : null,
    };
    try {
      if (editingLead) {
        await updateLead(editingLead.id, payload);
        toast.success('Lead updated.');
      } else {
        await createLead(payload);
        toast.success('Lead created.');
      }
      setShowModal(false);
      setReload((value) => value + 1);
    } catch (error) {
      toast.error(getApiErrorMessage(error, `Failed to ${editingLead ? 'update' : 'create'} lead.`));
    }
  };

  const handleStatusChange = async (lead, newStatus) => {
    try {
      await updateLead(lead.id, { status: newStatus });
      toast.success('Lead status updated.');
      setReload((value) => value + 1);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to update lead status.'));
    }
  };

  const leadsByStatus = (status) => leads.filter((lead) => lead.status === status);

  return (
    <Container fluid className="py-4">
      <Row className="mb-3 align-items-center">
        <Col>
          <h4 className="fw-bold mb-0">Leads Pipeline</h4>
          <small className="text-muted">Manage your sales leads</small>
        </Col>
        <Col xs="auto">
          <Button variant="primary" onClick={openNewLead}>
            <Plus size={16} className="me-1" /> New Lead
          </Button>
        </Col>
      </Row>

      <Row className="mb-4 g-2">
        <Col md={5}>
          <InputGroup>
            <InputGroup.Text><Search size={15} /></InputGroup.Text>
            <Form.Control
              placeholder="Search by name or email…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </InputGroup>
        </Col>
        <Col md={3}>
          <Form.Control type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
        </Col>
        <Col md={3}>
          <Form.Control type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
        </Col>
        <Col md={1}>
          <Button
            variant="outline-secondary"
            className="w-100"
            onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); }}
          >
            Clear
          </Button>
        </Col>
      </Row>

      {loadError && (
        <Alert variant="danger">
          {loadError}
          <Button variant="link" onClick={() => setReload((value) => value + 1)}>Retry</Button>
        </Alert>
      )}
      {loading ? (
        <div className="text-center py-5 text-muted">Loading leads…</div>
      ) : (
        <Row className="g-3 flex-nowrap overflow-auto pb-2">
          {STATUS_COLUMNS.map((column) => (
            <Col key={column.key} style={{ minWidth: 240, maxWidth: 280 }}>
              <div className="rounded-3 p-2 h-100" style={{ background: COLUMN_BG[column.key], minHeight: 400 }}>
                <div className="d-flex align-items-center mb-2 px-1">
                  <Badge bg={column.variant} className="me-2">{leadsByStatus(column.key).length}</Badge>
                  <span className="fw-semibold">{column.label}</span>
                </div>
                {leadsByStatus(column.key).map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    colVariant={column.variant}
                    onStatusChange={handleStatusChange}
                    onEdit={openEditLead}
                  />
                ))}
                {leadsByStatus(column.key).length === 0 && (
                  <div className="text-center text-muted small py-4">No leads</div>
                )}
              </div>
            </Col>
          ))}
        </Row>
      )}

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{editingLead ? 'Edit Lead' : 'New Lead'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit(onSubmit)}>
          <Modal.Body>
            <Row className="g-3">
              <Col md={6}>
                <Form.Label>First name *</Form.Label>
                <Form.Control {...register('first_name', { required: 'First name is required' })} isInvalid={!!errors.first_name} />
                <Form.Control.Feedback type="invalid">{errors.first_name?.message}</Form.Control.Feedback>
              </Col>
              <Col md={6}>
                <Form.Label>Last name</Form.Label>
                <Form.Control {...register('last_name')} />
              </Col>
              <Col md={6}>
                <Form.Label>Email *</Form.Label>
                <Form.Control type="email" {...register('email', { required: 'Email is required' })} isInvalid={!!errors.email} />
                <Form.Control.Feedback type="invalid">{errors.email?.message}</Form.Control.Feedback>
              </Col>
              <Col md={6}>
                <Form.Label>Phone *</Form.Label>
                <Form.Control {...register('phone', { required: 'Phone is required' })} isInvalid={!!errors.phone} />
                <Form.Control.Feedback type="invalid">{errors.phone?.message}</Form.Control.Feedback>
              </Col>
              <Col md={12}>
                <Form.Label>Vehicle Interest</Form.Label>
                <Form.Select {...register('interested_vehicle')}>
                  <option value="">No specific vehicle</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>{vehicle.display_name}</option>
                  ))}
                </Form.Select>
              </Col>
              <Col md={6}>
                <Form.Label>Source *</Form.Label>
                <Form.Select {...register('source', { required: 'Source is required' })} isInvalid={!!errors.source}>
                  {LEAD_SOURCES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </Form.Select>
                <Form.Control.Feedback type="invalid">{errors.source?.message}</Form.Control.Feedback>
              </Col>
              <Col md={6}>
                <Form.Label>Status</Form.Label>
                <Form.Select {...register('status')}>
                  {STATUS_COLUMNS.map((status) => (
                    <option key={status.key} value={status.key}>{status.label}</option>
                  ))}
                </Form.Select>
              </Col>
              <Col md={12}>
                <Form.Label>Notes</Form.Label>
                <Form.Control as="textarea" rows={3} {...register('notes')} />
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : editingLead ? 'Save Lead' : 'Create Lead'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

const LeadCard = ({ lead, colVariant, onStatusChange, onEdit }) => (
  <Card className="mb-2 shadow-sm border-0" style={{ borderLeft: `4px solid var(--bs-${colVariant})` }}>
    <Card.Body className="p-2">
      <div className="d-flex justify-content-between align-items-start mb-1">
        <div className="d-flex align-items-center gap-1">
          <User size={13} className="text-muted" />
          <span className="fw-semibold small">{[lead.first_name, lead.last_name].filter(Boolean).join(' ')}</span>
        </div>
        <div className="d-flex gap-1">
          <Button variant="light" size="sm" className="p-0 px-1 border-0" title="Edit lead" onClick={() => onEdit(lead)}>
            <Edit2 size={12} />
          </Button>
          <StatusDropdown lead={lead} onStatusChange={onStatusChange} />
        </div>
      </div>
      <div className="small text-muted">{lead.email}</div>
      {lead.phone && <div className="d-flex align-items-center gap-1 text-muted small mb-1"><Phone size={11} />{lead.phone}</div>}
      {lead.interested_vehicle_details && (
        <div className="d-flex align-items-center gap-1 text-muted small mb-1">
          <Car size={11} /><span>{lead.interested_vehicle_details.display_name}</span>
        </div>
      )}
      <div className="d-flex justify-content-between align-items-center mt-2">
        <Badge bg={SOURCE_COLORS[lead.source] || 'secondary'} style={{ fontSize: '0.68rem' }}>
          {lead.source || 'Unknown'}
        </Badge>
        {lead.created_at && (
          <span className="text-muted" style={{ fontSize: '0.68rem' }}>
            <Calendar size={10} className="me-1" />{new Date(lead.created_at).toLocaleDateString()}
          </span>
        )}
      </div>
    </Card.Body>
  </Card>
);

const StatusDropdown = ({ lead, onStatusChange }) => (
  <Dropdown size="sm">
    <Dropdown.Toggle variant="light" size="sm" className="p-0 px-1 border-0" style={{ fontSize: '0.7rem' }}>
      ⋮
    </Dropdown.Toggle>
    <Dropdown.Menu>
      {STATUS_COLUMNS.map((status) => (
        <Dropdown.Item
          key={status.key}
          onClick={() => onStatusChange(lead, status.key)}
          active={lead.status === status.key}
        >
          {status.label}
        </Dropdown.Item>
      ))}
    </Dropdown.Menu>
  </Dropdown>
);
