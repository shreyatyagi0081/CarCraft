import { useState, useEffect } from 'react';
import {
  Container, Row, Col, Card, Button, Badge, Spinner,
  Tab, Tabs, Breadcrumb, Alert
} from 'react-bootstrap';
import { useParams, Link } from 'react-router-dom';
import { ShoppingCart, Minus, Plus, Truck } from 'lucide-react';
import toast from 'react-hot-toast';
import { getProduct, getProducts } from '../../api/endpoints';
import ProductImage from '../../components/ProductImage';
import { useCart } from '../../context/CartContext';

export function ProductDetail() {
  const { id } = useParams();
  const { addItem } = useCart();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getProduct(id)
      .then(res => {
        setProduct(res.data);
        // Load related by category
        if (res.data?.category) {
          getProducts({ category: res.data.category, page: 1 })
            .then(r => {
              const items = Array.isArray(r.data) ? r.data : (r.data?.results || []);
              setRelated(items.filter(p => p.id !== res.data.id).slice(0, 3));
            })
            .catch(() => {});
        }
      })
      .catch(() => setError('Product not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAddToCart = async () => {
    setAdding(true);
    try {
      await addItem(product.id, quantity);
      toast.success(`${product.name} added to cart`);
    } catch {
      toast.error('Failed to add to cart');
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Loading product...</p>
      </Container>
    );
  }

  if (error || !product) {
    return (
      <Container className="py-5">
        <Alert variant="danger">{error || 'Product not found'}</Alert>
        <Link to="/shop" className="btn btn-outline-primary">Back to Shop</Link>
      </Container>
    );
  }

  const discount = product.discount_price && parseFloat(product.discount_price) < parseFloat(product.price)
    ? Math.round((1 - parseFloat(product.discount_price) / parseFloat(product.price)) * 100)
    : 0;

  return (
    <Container className="py-4">
      {/* Breadcrumb */}
      <Breadcrumb className="mb-4">
        <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/shop' }}>Shop</Breadcrumb.Item>
        {product.category_name && (
          <Breadcrumb.Item>{product.category_name}</Breadcrumb.Item>
        )}
        <Breadcrumb.Item active>{product.name}</Breadcrumb.Item>
      </Breadcrumb>

      <Row className="g-4 mb-5">
        {/* Images */}
        <Col lg={6}>
          <Card className="border-0 shadow-sm mb-2">
            <div
              className="d-flex align-items-center justify-content-center"
              style={{ height: 400, background: '#f8f9fa', borderRadius: '0.375rem', overflow: 'hidden' }}
            >
              <ProductImage
                product={product}
                alt={product.name}
                style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                placeholderSize={80}
              />
            </div>
          </Card>
        </Col>

        {/* Product Info */}
        <Col lg={6}>
          <div className="d-flex gap-2 mb-2">
            {product.stock_quantity === 0 ? (
              <Badge bg="danger">Out of Stock</Badge>
            ) : product.is_low_stock ? (
              <Badge bg="warning" text="dark">Low Stock ({product.stock_quantity} left)</Badge>
            ) : (
              <Badge bg="success">In Stock</Badge>
            )}
            {discount > 0 && <Badge bg="danger">-{discount}% OFF</Badge>}
          </div>

          <h2 className="fw-bold mb-1">{product.name}</h2>
          <p className="text-muted mb-2">
            SKU: <strong>{product.sku}</strong>
            {product.brand && <> &bull; Brand: <strong>{product.brand}</strong></>}
          </p>

          <div className="d-flex align-items-baseline gap-3 mb-4">
            <span className="fs-2 fw-bold text-primary">
              ₹{parseFloat(product.effective_price || product.price || 0).toFixed(2)}
            </span>
            {product.discount_price && parseFloat(product.discount_price) < parseFloat(product.price) && (
              <span className="fs-5 price-compare text-muted">
                ₹{parseFloat(product.price).toFixed(2)}
              </span>
            )}
          </div>

          {/* Quantity + Add to Cart */}
          {product.is_in_stock && (
            <div className="d-flex align-items-center gap-3 mb-4">
              <div className="d-flex align-items-center border rounded">
                <Button
                  variant="light"
                  size="sm"
                  className="border-0"
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                >
                  <Minus size={16} />
                </Button>
                <span className="px-3 fw-bold">{quantity}</span>
                <Button
                  variant="light"
                  size="sm"
                  className="border-0"
                  onClick={() => setQuantity(q => Math.min(product.stock_quantity, q + 1))}
                >
                  <Plus size={16} />
                </Button>
              </div>
              <Button
                variant="primary"
                onClick={handleAddToCart}
                disabled={adding}
                className="d-flex align-items-center gap-2"
              >
                {adding ? <Spinner size="sm" /> : <ShoppingCart size={18} />}
                Add to Cart
              </Button>
            </div>
          )}

          <div className="d-flex align-items-center gap-2 text-muted small">
            <Truck size={16} />
            Free shipping on orders over ₹200
          </div>
        </Col>
      </Row>

      {/* Tabs */}
      <Card className="border-0 shadow-sm mb-5">
        <Card.Body>
          <Tabs defaultActiveKey="description" className="mb-3">
            <Tab eventKey="description" title="Description">
              <p className="text-muted">
                {product.description || 'No description available.'}
              </p>
            </Tab>
            <Tab eventKey="compatibility" title="Compatibility">
              {product.compatibility ? (
                <div>
                  <p className="text-muted small mb-2">Compatible with:</p>
                  <pre className="text-muted small" style={{ whiteSpace: 'pre-wrap' }}>
                    {product.compatibility}
                  </pre>
                </div>
              ) : (
                <p className="text-muted">No compatibility information available.</p>
              )}
            </Tab>
            <Tab eventKey="reviews" title="Reviews">
              <div className="text-center py-3 text-muted">
                <p>Customer reviews are not currently available for parts.</p>
              </div>
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>

      {/* Related Products */}
      {related.length > 0 && (
        <div>
          <h4 className="fw-bold mb-3">Related Products</h4>
          <Row className="g-3">
            {related.map(p => (
              <Col key={p.id} md={4}>
                <Card className="product-card h-100 border-0 shadow-sm">
                  <div
                    className="d-flex align-items-center justify-content-center"
                    style={{ height: 160, background: '#f8f9fa', borderRadius: '0.375rem 0.375rem 0 0' }}
                  >
                    <ProductImage
                      product={p}
                      alt={p.name}
                      className="w-100 h-100"
                      style={{ objectFit: 'cover' }}
                      placeholderSize={40}
                    />
                  </div>
                  <Card.Body>
                    <Card.Title className="fs-6">{p.name}</Card.Title>
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="fw-bold text-primary">₹{parseFloat(p.price || 0).toFixed(2)}</span>
                      <Link to={`/shop/product/${p.id}`} className="btn btn-sm btn-outline-primary">View</Link>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      )}
    </Container>
  );
}
