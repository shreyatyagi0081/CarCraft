import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Container, Form, Row, Spinner } from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { createVehicle, getVehicle, getAllVehicleMakes, updateVehicle } from '../../api/endpoints';
import { getApiErrorMessage } from '../../api/errors';

const EMPTY_VEHICLE = {
  vin: '',
  model: '',
  trim: '',
  year: new Date().getFullYear(),
  mileage: 0,
  condition: 'NEW',
  fuel_type: 'PETROL',
  transmission: 'AUTOMATIC',
  exterior_color: '',
  interior_color: '',
  engine_details: '',
  seating_capacity: 5,
  cost_price: '',
  selling_price: '',
  discount_price: '',
  primary_image_url: '',
  status: 'AVAILABLE',
  description: '',
};

const CHOICES = {
  condition: [['NEW', 'Brand new'], ['CPO', 'Certified pre-owned'], ['USED', 'Used']],
  fuel_type: [['PETROL', 'Petrol'], ['DIESEL', 'Diesel'], ['ELECTRIC', 'Electric'], ['HYBRID', 'Hybrid'], ['PHEV', 'Plug-in hybrid']],
  transmission: [['AUTOMATIC', 'Automatic'], ['MANUAL', 'Manual'], ['CVT', 'CVT'], ['DCT', 'Dual-clutch']],
  status: [['AVAILABLE', 'Available'], ['RESERVED', 'Reserved'], ['SOLD', 'Sold'], ['UNDER_INSPECTION', 'Under inspection'], ['IN_SERVICE', 'In service']],
};

export function VehicleForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [makes, setMakes] = useState([]);
  const [selectedMake, setSelectedMake] = useState('');
  const [vehicle, setVehicle] = useState(EMPTY_VEHICLE);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([getAllVehicleMakes(), id ? getVehicle(id) : Promise.resolve(null)])
      .then(([availableMakes, vehicleResponse]) => {
        if (!active) return;
        setMakes(availableMakes);
        if (vehicleResponse) {
          const currentVehicle = vehicleResponse.data;
          const make = availableMakes.find((entry) =>
            entry.models?.some((model) => String(model.id) === String(currentVehicle.model))
          );
          setSelectedMake(make ? String(make.id) : '');
          setVehicle({
            ...EMPTY_VEHICLE,
            ...currentVehicle,
            model: String(currentVehicle.model),
            discount_price: currentVehicle.discount_price || '',
          });
        }
      })
      .catch((requestError) => setError(getApiErrorMessage(
        requestError,
        'Could not load vehicle data. Please try again.'
      )))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const updateField = (event) => {
    const { name, value } = event.target;
    setVehicle((current) => ({ ...current, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    const vehicleFields = { ...vehicle };
    delete vehicleFields.primary_image;
    const payload = {
      ...vehicleFields,
      model: Number(vehicle.model),
      year: Number(vehicle.year),
      mileage: Number(vehicle.mileage),
      seating_capacity: Number(vehicle.seating_capacity),
      cost_price: Number(vehicle.cost_price),
      selling_price: Number(vehicle.selling_price),
      discount_price: vehicle.discount_price === '' ? null : Number(vehicle.discount_price),
    };
    try {
      if (id) {
        await updateVehicle(id, payload);
      } else {
        await createVehicle(payload);
      }
      toast.success(id ? 'Vehicle updated.' : 'Vehicle added.');
      navigate('/vehicles');
    } catch (requestError) {
      const message = getApiErrorMessage(requestError, 'Could not save the vehicle.');
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Container className="py-5 text-center"><Spinner animation="border" /></Container>;
  }

  const models = makes.find((make) => String(make.id) === selectedMake)?.models || [];

  return (
    <Container className="py-4">
      <Button as={Link} to="/vehicles" variant="outline-secondary" className="mb-3">
        <ArrowLeft size={16} className="me-1" />Inventory
      </Button>
      <h1 className="h3 mb-4">{id ? 'Edit vehicle' : 'Add vehicle'}</h1>
      {error && <Alert variant="danger">{error}</Alert>}
      <Form onSubmit={onSubmit}>
        <Card className="border-0 shadow-sm mb-4">
          <Card.Body>
            <Row className="g-3">
              <Col md={6}>
                <Form.Label>Make *</Form.Label>
                <Form.Select
                  required
                  value={selectedMake}
                  onChange={(event) => {
                    setSelectedMake(event.target.value);
                    setVehicle((current) => ({ ...current, model: '' }));
                  }}
                >
                  <option value="">Select make</option>
                  {makes.map((make) => <option key={make.id} value={make.id}>{make.name}</option>)}
                </Form.Select>
              </Col>
              <Col md={6}>
                <Form.Label>Model *</Form.Label>
                <Form.Select name="model" required value={vehicle.model} onChange={updateField} disabled={!selectedMake}>
                  <option value="">Select model</option>
                  {models.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}
                </Form.Select>
              </Col>
              {[
                ['vin', 'VIN', { required: true, maxLength: 17, minLength: 17 }],
                ['trim', 'Trim'],
                ['year', 'Year', { type: 'number', required: true, min: 1900 }],
                ['mileage', 'Mileage', { type: 'number', min: 0 }],
                ['exterior_color', 'Exterior color', { required: true }],
                ['interior_color', 'Interior color'],
                ['engine_details', 'Engine details'],
                ['seating_capacity', 'Seating capacity', { type: 'number', min: 1 }],
                ['cost_price', 'Dealer cost', { type: 'number', required: true, min: 0, step: '0.01' }],
                ['selling_price', 'Selling price', { type: 'number', required: true, min: 0, step: '0.01' }],
                ['discount_price', 'Discount price', { type: 'number', min: 0, step: '0.01' }],
                ['primary_image_url', 'Primary image URL', { type: 'url' }],
              ].map(([name, label, options = {}]) => (
                <Col md={6} key={name}>
                  <Form.Label>{label}{options.required ? ' *' : ''}</Form.Label>
                  <Form.Control name={name} value={vehicle[name] ?? ''} onChange={updateField} {...options} />
                </Col>
              ))}
              {Object.entries(CHOICES).map(([name, choices]) => (
                <Col md={6} key={name}>
                  <Form.Label>{name.replace('_', ' ')}</Form.Label>
                  <Form.Select name={name} value={vehicle[name]} onChange={updateField}>
                    {choices.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </Form.Select>
                </Col>
              ))}
              <Col xs={12}>
                <Form.Label>Description</Form.Label>
                <Form.Control as="textarea" rows={4} name="description" value={vehicle.description || ''} onChange={updateField} />
              </Col>
            </Row>
          </Card.Body>
        </Card>
        <div className="d-flex gap-2">
          <Button type="submit" disabled={submitting || !makes.length}>
            {submitting ? <Spinner size="sm" className="me-2" /> : <Save size={16} className="me-2" />}
            {id ? 'Save changes' : 'Add vehicle'}
          </Button>
          <Button as={Link} to="/vehicles" variant="outline-secondary">Cancel</Button>
        </div>
      </Form>
    </Container>
  );
}

export default VehicleForm;
