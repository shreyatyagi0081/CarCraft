import { useState, useEffect } from 'react';
import {
  Container, Row, Col, Card, Badge, Button, Tab, Nav,
  Table, Modal, Form, Spinner, Carousel
} from 'react-bootstrap';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { Car, Fuel, Settings, ArrowLeft, Tag, Phone, FileText } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { getVehicle, createLead } from '../../api/endpoints';
import { getApiErrorMessage } from '../../api/errors';
import { getMediaUrl } from '../../api/media';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const statusVariant = { available: 'success', sold: 'danger', reserved: 'warning' };

function SpecRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <tr>
      <td className="text-muted fw-semibold" style={{ width: '40%' }}>{label}</td>
      <td className="text-capitalize">{value}</td>
    </tr>
  );
}

export function VehicleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hash } = useLocation();
  const { user } = useAuth();

  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [submittingQuote, setSubmittingQuote] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      customer_name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : '',
      customer_email: user?.email || '',
      customer_phone: user?.phone_number || '',
      notes: '',
      source: 'website',
    }
  });

  useEffect(() => {
    if (hash === '#contact') setActiveTab('contact');
  }, [hash]);

  useEffect(() => {
    setLoading(true);
    getVehicle(id)
      .then(res => setVehicle(res.data))
      .catch(requestError => setError(getApiErrorMessage(
        requestError,
        'Vehicle not found or could not be loaded.'
      )))
      .finally(() => setLoading(false));
  }, [id]);

  const onQuoteSubmit = async (data) => {
    setSubmittingQuote(true);
    try {
      await createLead({
        interested_vehicle: vehicle.id,
        first_name: data.customer_name.trim().split(/\s+/)[0],
        last_name: data.customer_name.trim().split(/\s+/).slice(1).join(' '),
        email: data.customer_email,
        phone: data.customer_phone,
        notes: data.notes,
        source: 'WEBSITE',
      });
      toast.success('Quote request submitted! We will contact you shortly.');
      setShowQuoteModal(false);
      reset();
    } catch (requestError) {
      toast.error(getApiErrorMessage(requestError, 'Failed to submit quote. Please try again.'));
    } finally {
      setSubmittingQuote(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Loading vehicle details...</p>
      </Container>
    );
  }

  if (error || !vehicle) {
    return (
      <Container className="py-5 text-center">
        <Car size={56} className="text-muted mb-3" />
        <h4 className="text-danger">{error || 'Vehicle not found'}</h4>
        <Button variant="primary" onClick={() => navigate('/vehicles')}>
          <ArrowLeft size={16} className="me-1" /> Back to Inventory
        </Button>
      </Container>
    );
  }

  const galleryImages = (vehicle.images || [])
    .map((image) => getMediaUrl(image))
    .filter(Boolean);
  if (!galleryImages.length) {
    const primaryImage = getMediaUrl(vehicle.primary_image_url) || getMediaUrl(vehicle.primary_image);
    if (primaryImage) galleryImages.push(primaryImage);
  }
  const title = vehicle.display_name || `${vehicle.year} ${vehicle.make_name} ${vehicle.model_name}`;

  return (
    <Container fluid className="py-4">
      {/* Back Button */}
      <Button variant="outline-secondary" size="sm" className="mb-3" as={Link} to="/vehicles">
        <ArrowLeft size={16} className="me-1" /> Back to Inventory
      </Button>

      {/* Image Carousel / Placeholder */}
      <Card className="shadow-sm border-0 mb-4">
        {galleryImages.length ? (
          <Carousel>
              {galleryImages.map((image, idx) => (
              <Carousel.Item key={idx}>
                <img
                    src={image}
                  alt={`${title} - ${idx + 1}`}
                  style={{ width: '100%', height: 420, objectFit: 'cover' }}
                  className="d-block rounded-top"
                />
              </Carousel.Item>
            ))}
          </Carousel>
        ) : (
          <div
            style={{ height: 360, background: '#e9ecef' }}
            className="d-flex align-items-center justify-content-center rounded-top"
          >
            <div className="text-center text-muted">
              <Car size={80} />
              <p className="mt-2">No images available</p>
            </div>
          </div>
        )}
      </Card>

      {/* Main Content */}
      <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
        <Nav variant="tabs" className="mb-3">
          <Nav.Item><Nav.Link eventKey="overview">Overview</Nav.Link></Nav.Item>
          <Nav.Item><Nav.Link eventKey="specifications">Specifications</Nav.Link></Nav.Item>
          <Nav.Item><Nav.Link eventKey="contact" id="contact">Contact</Nav.Link></Nav.Item>
        </Nav>

        <Tab.Content>
          {/* Overview Tab */}
          <Tab.Pane eventKey="overview">
            <Row className="g-4">
              {/* Left: Specs Table */}
              <Col lg={7}>
                <Card className="shadow-sm border-0 h-100">
                  <Card.Header className="bg-dark text-white fw-semibold">
                    <Settings size={16} className="me-2" />Vehicle Specifications
                  </Card.Header>
                  <Card.Body>
                    <Table borderless responsive className="mb-0">
                      <tbody>
                        <SpecRow label="Make" value={vehicle.make_name} />
                        <SpecRow label="Model" value={vehicle.model_name} />
                        <SpecRow label="Year" value={vehicle.year} />
                        <SpecRow label="Exterior color" value={vehicle.exterior_color} />
                        <SpecRow label="VIN" value={vehicle.vin} />
                        <SpecRow label="Mileage" value={vehicle.mileage ? `${Number(vehicle.mileage).toLocaleString()} miles` : null} />
                        <SpecRow label="Fuel Type" value={vehicle.fuel_type} />
                        <SpecRow label="Transmission" value={vehicle.transmission} />
                        <SpecRow label="Body Type" value={vehicle.body_type} />
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>
              </Col>

              {/* Right: Price + Actions */}
              <Col lg={5}>
                <Card className="shadow-sm border-0">
                  <Card.Body>
                    <div className="d-flex align-items-center justify-content-between mb-3">
                      <h3 className="text-primary fw-bold mb-0">
                        ₹{Number(vehicle.effective_price || vehicle.selling_price).toLocaleString()}
                      </h3>
                      <Badge bg={statusVariant[vehicle.status] || 'secondary'} className="text-capitalize fs-6">
                        {vehicle.status}
                      </Badge>
                    </div>

                    <h4 className="fw-bold mb-1">{title}</h4>
                    <div className="text-muted small mb-3">
                      <Fuel size={14} className="me-1" />{vehicle.fuel_type}
                      <span className="mx-2">•</span>
                      <Settings size={14} className="me-1" />{vehicle.transmission}
                    </div>

                    {vehicle.description && (
                      <p className="text-muted mb-4" style={{ fontSize: '0.95rem' }}>
                        {vehicle.description}
                      </p>
                    )}

                    <div className="d-grid gap-2">
                      <Button
                        variant="primary"
                        disabled={vehicle.status === 'sold'}
                        onClick={() => setShowQuoteModal(true)}
                      >
                        <FileText size={16} className="me-2" />
                        {vehicle.status === 'sold' ? 'Vehicle Sold' : 'Get Quote'}
                      </Button>
                      <Button
                        variant="outline-secondary"
                        onClick={() => setActiveTab('contact')}
                      >
                        <Phone size={16} className="me-2" />Contact Dealer
                      </Button>
                    </div>
                  </Card.Body>
                </Card>

                {vehicle.is_featured && (
                  <div className="mt-3">
                    <Badge bg="warning" text="dark" className="fs-6 px-3 py-2">
                      <Tag size={14} className="me-1" />Featured Vehicle
                    </Badge>
                  </div>
                )}
              </Col>
            </Row>
          </Tab.Pane>

          {/* Specifications Tab */}
          <Tab.Pane eventKey="specifications">
            <Card className="shadow-sm border-0">
              <Card.Header className="bg-dark text-white fw-semibold">Full Specifications</Card.Header>
              <Card.Body>
                <Table bordered hover responsive>
                  <tbody>
                    <SpecRow label="Make" value={vehicle.make_name} />
                    <SpecRow label="Model" value={vehicle.model_name} />
                    <SpecRow label="Year" value={vehicle.year} />
                    <SpecRow label="Exterior color" value={vehicle.exterior_color} />
                    <SpecRow label="VIN" value={vehicle.vin} />
                    <SpecRow label="Mileage" value={vehicle.mileage ? `${Number(vehicle.mileage).toLocaleString()} miles` : null} />
                    <SpecRow label="Fuel Type" value={vehicle.fuel_type} />
                    <SpecRow label="Transmission" value={vehicle.transmission} />
                    <SpecRow label="Body Type" value={vehicle.body_type} />
                    <SpecRow label="Status" value={vehicle.status} />
                    <SpecRow label="Price" value={`₹${Number(vehicle.effective_price || vehicle.selling_price).toLocaleString()}`} />
                  </tbody>
                </Table>
                {vehicle.description && (
                  <>
                    <h6 className="fw-semibold mt-4 mb-2">Description</h6>
                    <p className="text-muted">{vehicle.description}</p>
                  </>
                )}
              </Card.Body>
            </Card>
          </Tab.Pane>

          {/* Contact Tab */}
          <Tab.Pane eventKey="contact">
            <Card className="shadow-sm border-0">
              <Card.Header className="bg-dark text-white fw-semibold">
                <Phone size={16} className="me-2" />Contact Dealer
              </Card.Header>
              <Card.Body style={{ maxWidth: 540 }}>
                <p className="text-muted mb-4">
                  Interested in <strong>{title}</strong>? Fill out the form below and our team will reach out shortly.
                </p>
                <Form onSubmit={handleSubmit(onQuoteSubmit)}>
                  <Form.Group className="mb-3">
                    <Form.Label>Your Name</Form.Label>
                    <Form.Control
                      {...register('customer_name', { required: 'Name is required' })}
                      isInvalid={!!errors.customer_name}
                    />
                    <Form.Control.Feedback type="invalid">{errors.customer_name?.message}</Form.Control.Feedback>
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Email</Form.Label>
                    <Form.Control
                      type="email"
                      {...register('customer_email', { required: 'Email is required' })}
                      isInvalid={!!errors.customer_email}
                    />
                    <Form.Control.Feedback type="invalid">{errors.customer_email?.message}</Form.Control.Feedback>
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Phone <span className="text-danger">*</span></Form.Label>
                    <Form.Control {...register('customer_phone', { required: 'Phone is required' })} isInvalid={!!errors.customer_phone} />
                    <Form.Control.Feedback type="invalid">{errors.customer_phone?.message}</Form.Control.Feedback>
                  </Form.Group>
                  <Form.Group className="mb-4">
                    <Form.Label>Message</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={4}
                      placeholder="I am interested in this vehicle..."
                      {...register('notes')}
                    />
                  </Form.Group>
                  <Button type="submit" variant="primary" disabled={submittingQuote}>
                    {submittingQuote ? <Spinner size="sm" className="me-2" /> : null}
                    Send Message
                  </Button>
                </Form>
              </Card.Body>
            </Card>
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>

      {/* Get Quote Modal */}
      <Modal show={showQuoteModal} onHide={() => setShowQuoteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <FileText size={20} className="me-2" />Get a Quote
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit(onQuoteSubmit)}>
          <Modal.Body>
            <p className="text-muted small mb-3">
              Request a quote for: <strong>{title}</strong>
            </p>
            <Form.Group className="mb-3">
              <Form.Label>Your Name <span className="text-danger">*</span></Form.Label>
              <Form.Control
                {...register('customer_name', { required: 'Name is required' })}
                isInvalid={!!errors.customer_name}
              />
              <Form.Control.Feedback type="invalid">{errors.customer_name?.message}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email <span className="text-danger">*</span></Form.Label>
              <Form.Control
                type="email"
                {...register('customer_email', {
                  required: 'Email is required',
                  pattern: { value: /^\S+@\S+$/i, message: 'Invalid email' }
                })}
                isInvalid={!!errors.customer_email}
              />
              <Form.Control.Feedback type="invalid">{errors.customer_email?.message}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Phone <span className="text-danger">*</span></Form.Label>
              <Form.Control {...register('customer_phone', { required: 'Phone is required' })} isInvalid={!!errors.customer_phone} />
              <Form.Control.Feedback type="invalid">{errors.customer_phone?.message}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Message</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Any specific requirements or questions?"
                {...register('notes')}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShowQuoteModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submittingQuote}>
              {submittingQuote ? <><Spinner size="sm" className="me-1" />Submitting...</> : 'Submit Quote Request'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
}

export default VehicleDetail;
