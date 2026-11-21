import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Navbar, Nav, Container, NavDropdown, Badge, Button } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { ShoppingCart, Bell, Car, Wrench, BarChart3, Package, Users, LogOut, User } from 'lucide-react';

export default function AppNavbar() {
  const { user, logout, isDealer } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Navbar bg="dark" variant="dark" expand="lg" sticky="top" className="shadow-sm">
      <Container fluid>
        <Navbar.Brand as={Link} to="/" className="fw-bold fs-4 d-flex align-items-center gap-2">
          <Car size={28} className="text-warning" />
          <span className="text-warning">Car</span>
          <span className="text-white">Craft</span>
        </Navbar.Brand>
        <Navbar.Toggle />
        <Navbar.Collapse>
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/vehicles" active={location.pathname.startsWith('/vehicles')}>
              <Car size={16} className="me-1" />Inventory
            </Nav.Link>

            {isDealer && (
              <>
                <NavDropdown title={<><BarChart3 size={16} className="me-1" />Sales</>} id="sales-nav">
                  <NavDropdown.Item as={Link} to="/sales/leads">Leads & Opportunities</NavDropdown.Item>
                  <NavDropdown.Item as={Link} to="/sales/quotations">Quotations</NavDropdown.Item>
                  <NavDropdown.Item as={Link} to="/sales/orders">Orders</NavDropdown.Item>
                  <NavDropdown.Divider />
                  <NavDropdown.Item as={Link} to="/analytics">Analytics Dashboard</NavDropdown.Item>
                </NavDropdown>
              </>
            )}

            <NavDropdown title={<><Package size={16} className="me-1" />Parts Shop</>} id="shop-nav">
              <NavDropdown.Item as={Link} to="/shop">Browse Products</NavDropdown.Item>
              {isDealer && <NavDropdown.Item as={Link} to="/shop/manage">Manage Products</NavDropdown.Item>}
            </NavDropdown>

            <NavDropdown title={<><Wrench size={16} className="me-1" />Service</>} id="service-nav">
              <NavDropdown.Item as={Link} to="/service/appointments">Appointments</NavDropdown.Item>
            </NavDropdown>
          </Nav>

          <Nav className="ms-auto align-items-center gap-2">
            {user ? (
              <>
                <Nav.Link as={Link} to="/cart" className="position-relative">
                  <ShoppingCart size={22} />
                  {cart?.total_items > 0 && (
                    <Badge bg="warning" text="dark" pill className="position-absolute top-0 start-100 translate-middle" style={{ fontSize: '0.65rem' }}>
                      {cart.total_items}
                    </Badge>
                  )}
                </Nav.Link>
                <Nav.Link as={Link} to="/notifications" className="position-relative">
                  <Bell size={22} />
                </Nav.Link>
                <NavDropdown title={<><User size={18} className="me-1" />{user.first_name || user.username}</>} align="end" id="user-nav">
                  <NavDropdown.Item as={Link} to="/profile"><User size={14} className="me-2" />Profile</NavDropdown.Item>
                  {isDealer && <NavDropdown.Item as={Link} to="/analytics"><BarChart3 size={14} className="me-2" />Analytics</NavDropdown.Item>}
                  <NavDropdown.Divider />
                  <NavDropdown.Item onClick={handleLogout} className="text-danger">
                    <LogOut size={14} className="me-2" />Logout
                  </NavDropdown.Item>
                </NavDropdown>
              </>
            ) : (
              <>
                <Button variant="outline-light" size="sm" as={Link} to="/login">Login</Button>
                <Button variant="warning" size="sm" as={Link} to="/register">Register</Button>
              </>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
