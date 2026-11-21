import { Container, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { Car, Mail, Phone, MapPin, Facebook, Twitter, Instagram } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-dark text-light mt-auto py-5">
      <Container>
        <Row className="g-4">
          <Col md={3}>
            <div className="d-flex align-items-center gap-2 mb-3">
              <Car size={28} className="text-warning" />
              <h5 className="mb-0 fw-bold"><span className="text-warning">Car</span>Craft</h5>
            </div>
            <p className="text-secondary small">
              Your comprehensive automotive dealership management suite. Streamlining sales, service, and parts.
            </p>
            <div className="d-flex gap-3">
              <Facebook size={18} className="text-secondary hover-warning cursor-pointer" />
              <Twitter size={18} className="text-secondary" />
              <Instagram size={18} className="text-secondary" />
            </div>
          </Col>

          <Col md={3}>
            <h6 className="text-warning fw-bold mb-3">Quick Links</h6>
            <ul className="list-unstyled small">
              {[['Vehicles', '/vehicles'], ['Parts Shop', '/shop'], ['Service', '/service/appointments']].map(([label, path]) => (
                <li key={label} className="mb-2">
                  <Link to={path} className="text-secondary text-decoration-none hover:text-white">{label}</Link>
                </li>
              ))}
            </ul>
          </Col>

          <Col md={3}>
            <h6 className="text-warning fw-bold mb-3">Services</h6>
            <ul className="list-unstyled small text-secondary">
              <li className="mb-2">Vehicle Inventory</li>
              <li className="mb-2">Auto Parts & Accessories</li>
              <li className="mb-2">Service Scheduling</li>
              <li className="mb-2">Fleet Management</li>
            </ul>
          </Col>

          <Col md={3}>
            <h6 className="text-warning fw-bold mb-3">Contact</h6>
            <ul className="list-unstyled small text-secondary">
              <li className="mb-2 d-flex align-items-center gap-2"><MapPin size={14} />123 Dealer Ave, Auto City</li>
              <li className="mb-2 d-flex align-items-center gap-2"><Phone size={14} />+1 (555) 123-4567</li>
              <li className="mb-2 d-flex align-items-center gap-2"><Mail size={14} />info@carcraft.com</li>
            </ul>
          </Col>
        </Row>

        <hr className="border-secondary mt-4" />
        <div className="text-center text-secondary small">
          © {new Date().getFullYear()} CarCraft. All rights reserved. | Built with Django & React
        </div>
      </Container>
    </footer>
  );
}
