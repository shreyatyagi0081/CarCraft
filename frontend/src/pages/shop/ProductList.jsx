import { useState, useEffect, useCallback } from 'react';
import {
  Container, Row, Col, Card, Form, Button, Badge,
  Spinner, Pagination, InputGroup, Alert
} from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { ShoppingCart, Package, Search, SlidersHorizontal } from 'lucide-react';
import toast from 'react-hot-toast';
import { getProducts, getCategories } from '../../api/endpoints';
import { getApiErrorMessage } from '../../api/errors';
import ProductImage from '../../components/ProductImage';
import { useCart } from '../../context/CartContext';

function SkeletonCard() {
  return (
    <Card className="product-card h-100 border-0 shadow-sm">
      <div style={{ height: 200, background: '#e9ecef', borderRadius: '0.375rem 0.375rem 0 0' }} className="placeholder-glow">
        <span className="placeholder w-100 h-100 d-block" />
      </div>
      <Card.Body>
        <div className="placeholder-glow">
          <span className="placeholder col-8 mb-2 d-block" />
          <span className="placeholder col-5 mb-1 d-block" />
          <span className="placeholder col-4 mb-3 d-block" />
          <span className="placeholder col-6 d-block" />
        </div>
      </Card.Body>
    </Card>
  );
}

export function ProductList() {
  const { addItem } = useCart();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoriesError, setCategoriesError] = useState('');
  const [categoriesReload, setCategoriesReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [productsError, setProductsError] = useState('');
  const [addingId, setAddingId] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [brand, setBrand] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState('');

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page };
      if (search) params.search = search;
      if (selectedCategory) params.category = selectedCategory;
      if (minPrice) params.price__gte = minPrice;
      if (maxPrice) params.price__lte = maxPrice;
      if (brand) params.brand = brand;
      if (inStockOnly) params.stock_quantity__gte = 1;
      if (sortBy) params.ordering = sortBy;

      const res = await getProducts(params);
      const data = res.data;
      setProducts(Array.isArray(data) ? data : (data.results || []));
      setTotalPages(Math.max(1, Math.ceil((data.count ?? data.results?.length ?? 0) / 12)));
      setProductsError('');
    } catch (error) {
      const message = getApiErrorMessage(error, 'Failed to load products.');
      setProducts([]);
      setProductsError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedCategory, minPrice, maxPrice, brand, inStockOnly, sortBy]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  useEffect(() => {
    setCategoriesError('');
    getCategories()
      .then(r => setCategories(r.data?.results || r.data || []))
      .catch(error => setCategoriesError(getApiErrorMessage(error, 'Failed to load product categories.')));
  }, [categoriesReload]);

  const handleAddToCart = async (product) => {
    setAddingId(product.id);
    try {
      await addItem(product.id, 1);
      toast.success(`${product.name} added to cart`);
    } catch {
      toast.error('Failed to add to cart');
    } finally {
      setAddingId(null);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  return (
    <Container fluid className="py-4">
      {/* Hero Banner */}
      <div
        className="rounded-3 mb-4 p-5 text-white text-center"
        style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}
      >
        <h1 className="fw-bold mb-2">Auto Parts &amp; Accessories</h1>
        <p className="mb-4 opacity-75">Find the perfect parts for your vehicle</p>
        <form onSubmit={handleSearch}>
          <InputGroup className="mx-auto" style={{ maxWidth: 500 }}>
            <Form.Control
              placeholder="Search products, brands..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="border-0"
            />
            <Button type="submit" variant="warning">
              <Search size={18} />
            </Button>
          </InputGroup>
        </form>
      </div>

      <Row>
        {/* Sidebar */}
        <Col lg={3} className="mb-4">
          <Card className="border-0 shadow-sm filter-sidebar">
            <Card.Body>
              <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                <SlidersHorizontal size={16} /> Filters
              </h6>

              {/* Categories */}
              <div className="mb-4">
                <p className="fw-semibold text-muted small mb-2">CATEGORIES</p>
                {categoriesError ? (
                  <Alert variant="danger" className="small py-2">
                    {categoriesError}
                    <Button variant="link" size="sm" className="p-0 ms-2" onClick={() => setCategoriesReload(value => value + 1)}>
                      Retry
                    </Button>
                  </Alert>
                ) : categories.map(cat => (
                  <Form.Check
                    key={cat.id}
                    type="radio"
                    name="part-category"
                    label={cat.name}
                    id={`cat-${cat.id}`}
                    checked={selectedCategory === String(cat.id)}
                    onChange={() => { setSelectedCategory(String(cat.id)); setPage(1); }}
                    className="mb-1"
                  />
                ))}
                {!categoriesError && categories.length === 0 && <small className="text-muted">No categories available.</small>}
              </div>

              {/* Price Range */}
              <div className="mb-4">
                <p className="fw-semibold text-muted small mb-2">PRICE RANGE</p>
                <Row className="g-2">
                  <Col>
                    <Form.Control
                      size="sm"
                      type="number"
                      placeholder="Min ₹"
                      value={minPrice}
                      onChange={e => { setMinPrice(e.target.value); setPage(1); }}
                    />
                  </Col>
                  <Col>
                    <Form.Control
                      size="sm"
                      type="number"
                      placeholder="Max ₹"
                      value={maxPrice}
                      onChange={e => { setMaxPrice(e.target.value); setPage(1); }}
                    />
                  </Col>
                </Row>
              </div>

              {/* Brand */}
              <div className="mb-4">
                <p className="fw-semibold text-muted small mb-2">BRAND</p>
                <Form.Control
                  size="sm"
                  placeholder="e.g. Bosch, NGK..."
                  value={brand}
                  onChange={e => { setBrand(e.target.value); setPage(1); }}
                />
              </div>

              {/* In Stock */}
              <div className="mb-4">
                <Form.Check
                  type="switch"
                  label="In Stock Only"
                  id="in-stock-toggle"
                  checked={inStockOnly}
                  onChange={e => { setInStockOnly(e.target.checked); setPage(1); }}
                />
              </div>

              <Button
                variant="outline-secondary"
                size="sm"
                className="w-100"
                onClick={() => {
                  setSelectedCategory(''); setMinPrice(''); setMaxPrice('');
                  setBrand(''); setInStockOnly(false); setSearch(''); setPage(1);
                }}
              >
                Clear Filters
              </Button>
            </Card.Body>
          </Card>
        </Col>

        {/* Product Grid */}
        <Col lg={9}>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <small className="text-muted">{loading ? 'Loading...' : `${products.length} products found`}</small>
            <Form.Select
              style={{ width: 200 }}
              value={sortBy}
              onChange={e => { setSortBy(e.target.value); setPage(1); }}
            >
              <option value="">Sort: Default</option>
              <option value="price">Price: Low to High</option>
              <option value="-price">Price: High to Low</option>
              <option value="-created_at">Newest</option>
            </Form.Select>
          </div>

          {productsError ? (
            <Alert variant="danger">
              {productsError}
              <Button variant="link" onClick={fetchProducts}>Retry</Button>
            </Alert>
          ) : loading ? (
            <Row className="g-3">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Col key={i} md={4}><SkeletonCard /></Col>
              ))}
            </Row>
          ) : products.length === 0 ? (
            <div className="text-center py-5">
              <Package size={48} className="text-muted mb-3" />
              <h5 className="text-muted">No products found</h5>
              <p className="text-muted">Try adjusting your filters</p>
            </div>
          ) : (
            <>
              <Row className="g-3">
                {products.map(product => (
                  <Col key={product.id} md={4}>
                    <Card className="product-card h-100 border-0 shadow-sm">
                      {/* Image */}
                      <div
                        className="d-flex align-items-center justify-content-center"
                        style={{ height: 200, background: '#f8f9fa', borderRadius: '0.375rem 0.375rem 0 0', overflow: 'hidden' }}
                      >
                        <ProductImage
                          product={product}
                          alt={product.name}
                          className="w-100 h-100"
                          style={{ objectFit: 'cover' }}
                        />
                      </div>

                      <Card.Body className="d-flex flex-column">
                        <div className="mb-1">
                          {product.stock_quantity === 0 ? (
                            <Badge bg="danger" className="me-1">Out of Stock</Badge>
                          ) : product.is_low_stock ? (
                            <Badge bg="warning" text="dark" className="me-1">Low Stock</Badge>
                          ) : (
                            <Badge bg="success" className="me-1">In Stock</Badge>
                          )}
                          {product.category_name && (
                            <Badge bg="secondary" className="opacity-75">{product.category_name}</Badge>
                          )}
                        </div>

                        <Card.Title className="fs-6 mb-1">{product.name}</Card.Title>
                        {product.brand && <small className="text-muted mb-2">{product.brand}</small>}

                        <div className="mt-auto">
                          <div className="d-flex align-items-center gap-2 mb-3">
                            <span className="fw-bold fs-5 text-primary">
                              ₹{parseFloat(product.effective_price || product.price || 0).toFixed(2)}
                            </span>
                            {product.discount_price && parseFloat(product.discount_price) < parseFloat(product.price) && (
                              <span className="price-compare small">
                                ₹{parseFloat(product.price).toFixed(2)}
                              </span>
                            )}
                          </div>

                          <div className="d-grid gap-2">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleAddToCart(product)}
                              disabled={!product.is_in_stock || addingId === product.id}
                            >
                              {addingId === product.id ? (
                                <Spinner size="sm" className="me-1" />
                              ) : (
                                <ShoppingCart size={14} className="me-1" />
                              )}
                              Add to Cart
                            </Button>
                            <Link
                              to={`/shop/product/${product.id}`}
                              className="btn btn-outline-secondary btn-sm"
                            >
                              View Details
                            </Link>
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="d-flex justify-content-center mt-4">
                  <Pagination>
                    <Pagination.Prev disabled={page === 1} onClick={() => setPage(p => p - 1)} />
                    {[...Array(totalPages)].map((_, i) => (
                      <Pagination.Item
                        key={i + 1}
                        active={page === i + 1}
                        onClick={() => setPage(i + 1)}
                      >
                        {i + 1}
                      </Pagination.Item>
                    ))}
                    <Pagination.Next disabled={page === totalPages} onClick={() => setPage(p => p + 1)} />
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
