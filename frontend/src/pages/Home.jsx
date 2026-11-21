import { Container, Row, Col, Button } from 'react-bootstrap';
import { Car, Package, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';

const heroStyle = {
  background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  color: '#fff',
};

const features = [
  {
    icon: <Car size={40} color="#4fc3f7" />,
    title: 'Vehicle Inventory',
    desc: 'Browse the available vehicle inventory with detailed specifications and pricing.',
  },
  {
    icon: <Package size={40} color="#81c784" />,
    title: 'Parts & Accessories',
    desc: 'Browse the parts and accessories currently listed in the product catalog.',
  },
  {
    icon: <Wrench size={40} color="#ffb74d" />,
    title: 'Service Center',
    desc: 'Schedule maintenance and repair appointments and follow the service workflow.',
  },
];

export const Home = () => {
  return (
    <>
      {/* Hero */}
      <div style={heroStyle}>
        <Container>
          <Row className="justify-content-center text-center py-5">
            <Col md={8}>
              <div className="mb-3">
                <span style={{ fontSize: 56, fontWeight: 900, letterSpacing: 2 }}>
                  Car<span style={{ color: '#4fc3f7' }}>Craft</span>
                </span>
              </div>
              <h1 className="display-5 fw-bold mb-3" style={{ color: '#e0e0e0' }}>
                Drive Your Business Forward
              </h1>
              <p className="lead mb-4" style={{ color: '#b0bec5' }}>
                Your all-in-one automotive management platform — vehicles, parts, and service
                designed for dealerships that mean business.
              </p>
              <div className="d-flex gap-3 justify-content-center flex-wrap">
                <Button
                  as={Link}
                  to="/vehicles"
                  size="lg"
                  style={{ background: '#4fc3f7', border: 'none', fontWeight: 600, minWidth: 180 }}
                >
                  Browse Vehicles
                </Button>
                <Button
                  as={Link}
                  to="/service/appointments"
                  size="lg"
                  variant="outline-light"
                  style={{ fontWeight: 600, minWidth: 180 }}
                >
                  Book Service
                </Button>
              </div>
            </Col>
          </Row>
        </Container>
      </div>

      {/* Feature Cards */}
      <div style={{ background: '#12121f', paddingTop: 64, paddingBottom: 80 }}>
        <Container>
          <h2 className="text-center fw-bold mb-2" style={{ color: '#e0e0e0' }}>
            Everything You Need
          </h2>
          <p className="text-center mb-5" style={{ color: '#78909c' }}>
            Powerful tools built for modern automotive businesses
          </p>
          <Row className="g-4 justify-content-center">
            {features.map((f) => (
              <Col key={f.title} md={4}>
                <div
                  className="p-4 h-100 rounded-3 text-center"
                  style={{
                    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                    border: '1px solid #0f3460',
                    color: '#e0e0e0',
                    transition: 'transform 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-6px)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                >
                  <div className="mb-3">{f.icon}</div>
                  <h5 className="fw-bold mb-2" style={{ color: '#fff' }}>{f.title}</h5>
                  <p style={{ color: '#90a4ae', fontSize: 14, margin: 0 }}>{f.desc}</p>
                </div>
              </Col>
            ))}
          </Row>
        </Container>
      </div>

      {/* Footer */}
      <div style={{ background: '#0a0a14', borderTop: '1px solid #1e2a4a', color: '#546e7a' }} className="py-4 text-center">
        <small>© {new Date().getFullYear()} CarCraft. All rights reserved.</small>
      </div>
    </>
  );
};
