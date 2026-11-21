import { useState, useEffect } from 'react';
import {
  Alert, Container, Row, Col, Card, Button, Form, Badge,
  Pagination, InputGroup
} from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { Car, Fuel, Settings, Search, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getVehicles, getAllVehicleMakes } from '../../api/endpoints';
import { getApiErrorMessage } from '../../api/errors';
import { getMediaUrl } from '../../api/media';
import toast from 'react-hot-toast';

const statusVariant = { AVAILABLE: 'success', SOLD: 'danger', RESERVED: 'warning' };
const PAGE_SIZE = 12;

function SkeletonCard() {
  return (
    <Card className="h-100 shadow-sm">
      <div style={{ height: 200, background: '#dee2e6' }} className="card-img-top" />
      <Card.Body>
        <div className="placeholder-glow">
          <span className="placeholder col-8 mb-2 d-block" />
          <span className="placeholder col-5 mb-2 d-block" />
          <span className="placeholder col-6 d-block" />
        </div>
      </Card.Body>
    </Card>
  );
}

function VehicleCard({ vehicle }) {
  const image = vehicle.images?.map((item) => getMediaUrl(item)).find(Boolean)
    || getMediaUrl(vehicle.primary_image_url)
    || getMediaUrl(vehicle.primary_image);
  return (
    <Card className="h-100 shadow-sm border-0">
      <div
        style={{
          height: 200,
          background: image ? 'none' : '#e9ecef',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
        className="card-img-top rounded-top"
      >
        {image ? (
          <img
            src={image}
            alt={`${vehicle.make_name} ${vehicle.model_name}`}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <Car size={64} color="#adb5bd" />
        )}
      </div>
      <Card.Body className="d-flex flex-column">
        <div className="d-flex justify-content-between align-items-start mb-1">
          <Card.Title className="mb-0 fs-6 fw-bold">
            {vehicle.year} {vehicle.make_name} {vehicle.model_name}
          </Card.Title>
          <Badge bg={statusVariant[vehicle.status] || 'secondary'} className="text-capitalize">
            {vehicle.status}
          </Badge>
        </div>
        <div className="text-primary fw-bold fs-5 mb-2">
          ₹{Number(vehicle.effective_price || vehicle.selling_price).toLocaleString()}
        </div>
        <div className="text-muted small mb-3 d-flex gap-3">
          <span><Settings size={13} className="me-1" />{Number(vehicle.mileage).toLocaleString()} mi</span>
          <span><Fuel size={13} className="me-1" />{vehicle.fuel_type}</span>
        </div>
        <div className="mt-auto d-flex gap-2">
          <Button as={Link} to={`/vehicles/${vehicle.id}`} variant="primary" size="sm" className="flex-fill">
            View Details
          </Button>
          <Button as={Link} to={`/vehicles/${vehicle.id}#contact`} variant="outline-secondary" size="sm" className="flex-fill">
            Contact
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
}

export function VehicleList() {
  const { isDealer } = useAuth();
  const navigate = useNavigate();

  const [vehicles, setVehicles] = useState([]);
  const [makes, setMakes] = useState([]);
  const [makesError, setMakesError] = useState('');
  const [vehiclesError, setVehiclesError] = useState('');
  const [loading, setLoading] = useState(true);
  const [makesReload, setMakesReload] = useState(0);
  const [vehiclesReload, setVehiclesReload] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  const [filters, setFilters] = useState({
    search: '',
    make: '',
    min_year: '',
    max_year: '',
    min_price: '',
    max_price: '',
    status: '',
    fuel_type: '',
  });
  const [appliedFilters, setAppliedFilters] = useState({});

  useEffect(() => {
    getAllVehicleMakes()
      .then(setMakes)
      .catch(error => {
        const message = getApiErrorMessage(error, 'Failed to load vehicle makes.');
        setMakesError(message);
        toast.error(message);
      });
  }, [makesReload]);

  useEffect(() => {
    setLoading(true);
    const params = { ...appliedFilters, page: currentPage };
    if (params.make) {
      params.model__make = params.make;
      delete params.make;
    }
    if (params.min_year) {
      params.year__gte = params.min_year;
      delete params.min_year;
    }
    if (params.max_year) {
      params.year__lte = params.max_year;
      delete params.max_year;
    }
    if (params.min_price) {
      params.selling_price__gte = params.min_price;
      delete params.min_price;
    }
    if (params.max_price) {
      params.selling_price__lte = params.max_price;
      delete params.max_price;
    }
    Object.keys(params).forEach(k => {
      if (params[k] === '' || params[k] === null || params[k] === undefined) delete params[k];
    });

    setVehiclesError('');
    getVehicles(params)
      .then(res => {
        const data = res.data;
        const results = Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data) ? data : [];
        setVehicles(results);
        setTotalPages(data.count !== undefined ? Math.ceil(data.count / PAGE_SIZE) || 1 : 1);
      })
      .catch(error => {
        const message = getApiErrorMessage(error, 'Failed to load vehicles.');
        setVehicles([]);
        setVehiclesError(message);
        toast.error(message);
      })
      .finally(() => setLoading(false));
  }, [appliedFilters, currentPage, vehiclesReload]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const applyFilters = () => {
    setCurrentPage(1);
    setAppliedFilters({ ...filters });
  };

  const resetFilters = () => {
    const empty = { search: '', make: '', min_year: '', max_year: '', min_price: '', max_price: '', status: '', fuel_type: '' };
    setFilters(empty);
    setAppliedFilters({});
    setCurrentPage(1);
  };

  const fuelTypes = ['PETROL', 'DIESEL', 'ELECTRIC', 'HYBRID', 'PHEV'];

  const paginationItems = [];
  for (let p = 1; p <= totalPages; p++) {
    paginationItems.push(
      <Pagination.Item key={p} active={p === currentPage} onClick={() => setCurrentPage(p)}>
        {p}
      </Pagination.Item>
    );
  }

  return (
    <Container fluid className="py-4">
      {/* Header */}
      <Row className="mb-4 align-items-center">
        <Col>
          <h2 className="fw-bold mb-0">
            <Car className="me-2" size={28} />
            Vehicle Inventory
          </h2>
        </Col>
        {isDealer && (
          <Col xs="auto">
            <Button variant="primary" onClick={() => navigate('/vehicles/new')}>
              <Plus size={18} className="me-1" />
              Add Vehicle
            </Button>
          </Col>
        )}
      </Row>

      <Row>
        {/* Sidebar Filters */}
        <Col lg={3} md={4} className="mb-4">
          <Card className="shadow-sm border-0">
            <Card.Header className="bg-dark text-white fw-semibold">Filters</Card.Header>
            <Card.Body>
              {/* Search */}
              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold">Search</Form.Label>
                <InputGroup size="sm">
                  <InputGroup.Text><Search size={14} /></InputGroup.Text>
                  <Form.Control
                    placeholder="Make, model, VIN..."
                    value={filters.search}
                    onChange={e => handleFilterChange('search', e.target.value)}
                  />
                </InputGroup>
              </Form.Group>

              {/* Make */}
              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold">Make</Form.Label>
                {makesError && (
                  <Alert variant="danger" className="small py-2">
                    {makesError}
                    <Button variant="link" size="sm" className="p-0 ms-2" onClick={() => setMakesReload((value) => value + 1)}>
                      Retry
                    </Button>
                  </Alert>
                )}
                <Form.Select size="sm" value={filters.make} onChange={e => handleFilterChange('make', e.target.value)}>
                  <option value="">All Makes</option>
                  {makes.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </Form.Select>
              </Form.Group>

              {/* Year Range */}
              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold">Year Range</Form.Label>
                <Row className="g-2">
                  <Col>
                    <Form.Control
                      size="sm" type="number" placeholder="Min"
                      value={filters.min_year}
                      onChange={e => handleFilterChange('min_year', e.target.value)}
                    />
                  </Col>
                  <Col>
                    <Form.Control
                      size="sm" type="number" placeholder="Max"
                      value={filters.max_year}
                      onChange={e => handleFilterChange('max_year', e.target.value)}
                    />
                  </Col>
                </Row>
              </Form.Group>

              {/* Price Range */}
              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold">Price Range (₹)</Form.Label>
                <Row className="g-2">
                  <Col>
                    <Form.Control
                      size="sm" type="number" placeholder="Min"
                      value={filters.min_price}
                      onChange={e => handleFilterChange('min_price', e.target.value)}
                    />
                  </Col>
                  <Col>
                    <Form.Control
                      size="sm" type="number" placeholder="Max"
                      value={filters.max_price}
                      onChange={e => handleFilterChange('max_price', e.target.value)}
                    />
                  </Col>
                </Row>
              </Form.Group>

              {/* Status */}
              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold">Status</Form.Label>
                {['', 'AVAILABLE', 'RESERVED', ...(isDealer ? ['SOLD', 'IN_SERVICE', 'UNDER_INSPECTION'] : [])].map(s => (
                  <Form.Check
                    key={s}
                    type="radio"
                    id={`status-${s || 'all'}`}
                    label={s ? s.replaceAll('_', ' ').toLowerCase().replace(/(^\w|\s\w)/g, (m) => m.toUpperCase()) : 'All'}
                    name="status"
                    value={s}
                    checked={filters.status === s}
                    onChange={() => handleFilterChange('status', s)}
                    className="small"
                  />
                ))}
              </Form.Group>

              {/* Fuel Type */}
              <Form.Group className="mb-4">
                <Form.Label className="small fw-semibold">Fuel Type</Form.Label>
                {fuelTypes.map(ft => (
                  <Form.Check
                    key={ft}
                    type="radio"
                    name="fuel-type"
                    id={`fuel-${ft}`}
                    label={ft.replace('_', ' ')}
                    checked={filters.fuel_type === ft}
                    onChange={() => handleFilterChange('fuel_type', filters.fuel_type === ft ? '' : ft)}
                    className="small"
                  />
                ))}
              </Form.Group>

              <div className="d-grid gap-2">
                <Button variant="primary" size="sm" onClick={applyFilters}>Apply Filters</Button>
                <Button variant="outline-secondary" size="sm" onClick={resetFilters}>Reset</Button>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Vehicle Grid */}
        <Col lg={9} md={8}>
          {vehiclesError ? (
            <Alert variant="danger">
              {vehiclesError}
              <Button variant="link" onClick={() => setVehiclesReload((value) => value + 1)}>Retry</Button>
            </Alert>
          ) : loading ? (
            <Row className="g-4">
              {[1, 2, 3].map(i => (
                <Col key={i} md={6} lg={4}><SkeletonCard /></Col>
              ))}
            </Row>
          ) : vehicles.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <Car size={48} className="mb-3" />
              <p className="fs-5">No vehicles found. Try adjusting your filters.</p>
            </div>
          ) : (
            <>
              <Row className="g-4">
                {vehicles.map(v => (
                  <Col key={v.id} xs={12} sm={6} lg={4}>
                    <VehicleCard vehicle={v} />
                  </Col>
                ))}
              </Row>

              {totalPages > 1 && (
                <div className="d-flex justify-content-center mt-4">
                  <Pagination>
                    <Pagination.Prev disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} />
                    {paginationItems}
                    <Pagination.Next disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} />
                  </Pagination>
                </div>
              )}
            </>
          )}
        </Col>
      </Row>
    </Container>
  );
}

export default VehicleList;
