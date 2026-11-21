import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Card, Col, Container, Form, Row, Spinner, Table } from 'react-bootstrap';
import toast from 'react-hot-toast';
import { checkout } from '../../api/endpoints';
import { getApiErrorMessage } from '../../api/errors';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

const initialForm = {
  shipping_full_name: '',
  shipping_address: '',
  shipping_city: '',
  shipping_state: '',
  shipping_zip_code: '',
  shipping_phone: '',
  payment_method: 'COD',
};

export default function CartPage() {
  const { user } = useAuth();
  const { cart, cartError, loading, updateItem, removeItem, fetchCart } = useCart();
  const [form, setForm] = useState({
    ...initialForm,
    shipping_full_name: [user?.first_name, user?.last_name].filter(Boolean).join(' '),
    shipping_address: user?.address || '',
    shipping_city: user?.city || '',
    shipping_state: user?.state || '',
    shipping_zip_code: user?.zip_code || '',
    shipping_phone: user?.phone_number || '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState(null);
  const [quantities, setQuantities] = useState({});

  const commitQuantity = async (item) => {
    const value = quantities[item.id];
    if (value === undefined || value === '' || !Number.isInteger(Number(value)) || Number(value) < 0) return;

    try {
      const quantity = Number(value);
      if (quantity < 1) {
        await removeItem(item.product.id);
      } else {
        await updateItem(item.product.id, quantity);
      }
      setQuantities(current => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not update your cart.'));
    }
  };

  const submitOrder = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await checkout(form);
      setOrder(data.order);
      await fetchCart();
      toast.success('Your order has been placed.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not place your order.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (order) {
    return (
      <Container className="py-5">
        <Alert variant="success">
          <Alert.Heading>Order placed</Alert.Heading>
          <p className="mb-0">Order number: <strong>{order.order_number}</strong>. Payment is pending; no payment provider is connected yet.</p>
        </Alert>
        <Button as={Link} to="/shop" variant="primary">Continue shopping</Button>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <h1 className="h3 mb-4">Shopping cart</h1>
      {cartError && (
        <Alert variant="danger">
          {cartError}
          <Button variant="link" onClick={() => fetchCart().catch(() => {})}>Retry</Button>
        </Alert>
      )}
      {loading && <div className="text-center py-4"><Spinner animation="border" /></div>}
      {!loading && !cartError && cart.items.length === 0 ? (
        <Alert variant="info">Your cart is empty. <Link to="/shop">Browse parts</Link>.</Alert>
      ) : !cartError && (
        <Row className="g-4">
          <Col lg={7}>
            <Card className="border-0 shadow-sm">
              <Table responsive className="mb-0 align-middle">
                <thead><tr><th>Product</th><th>Price</th><th>Quantity</th><th>Subtotal</th></tr></thead>
                <tbody>
                  {cart.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="fw-semibold">{item.product.name}</div>
                        <small className="text-muted">{item.product.sku}</small>
                      </td>
                      <td>₹{Number(item.product.effective_price).toFixed(2)}</td>
                      <td>
                        <Form.Control
                          aria-label={`Quantity for ${item.product.name}`}
                          type="number"
                          min="0"
                          max={item.product.stock_quantity}
                          value={quantities[item.id] ?? item.quantity}
                          onChange={(event) => setQuantities(current => ({ ...current, [item.id]: event.target.value }))}
                          onBlur={() => commitQuantity(item)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') event.currentTarget.blur();
                          }}
                          style={{ width: 90 }}
                        />
                      </td>
                      <td>₹{Number(item.subtotal).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          </Col>
          <Col lg={5}>
            <Card className="border-0 shadow-sm">
              <Card.Body>
                <h2 className="h5 mb-3">Delivery details</h2>
                <p className="d-flex justify-content-between">
                  <span>Subtotal ({cart.total_items} items)</span>
                  <strong>₹{Number(cart.subtotal).toFixed(2)}</strong>
                </p>
                <p className="small text-muted">Shipping and tax are calculated when the order is placed.</p>
                <Form onSubmit={submitOrder}>
                  {[
                    ['shipping_full_name', 'Full name'],
                    ['shipping_address', 'Address'],
                    ['shipping_city', 'City'],
                    ['shipping_state', 'State'],
                    ['shipping_zip_code', 'ZIP / postal code'],
                    ['shipping_phone', 'Phone'],
                  ].map(([name, label]) => (
                    <Form.Group className="mb-3" key={name}>
                      <Form.Label>{label}</Form.Label>
                      <Form.Control
                        required
                        value={form[name]}
                        onChange={(event) => setForm((current) => ({ ...current, [name]: event.target.value }))}
                      />
                    </Form.Group>
                  ))}
                  <Form.Group className="mb-3">
                    <Form.Label>Payment method</Form.Label>
                    <Form.Select
                      value={form.payment_method}
                      onChange={(event) => setForm((current) => ({ ...current, payment_method: event.target.value }))}
                    >
                      <option value="COD">Cash on delivery</option>
                    </Form.Select>
                  </Form.Group>
                  <Button type="submit" className="w-100" disabled={submitting || cart.items.length === 0}>
                    {submitting ? 'Placing order…' : 'Place order'}
                  </Button>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </Container>
  );
}
