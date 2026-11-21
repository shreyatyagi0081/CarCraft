import { useState, useEffect, useCallback } from 'react';
import {
  Container, Row, Col, Card, Table, Button, Badge, Form,
  Modal, Spinner, InputGroup, Alert
} from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { Plus, Edit, Package, Search, ToggleLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { getProducts, getCategories, createProduct, updateProduct } from '../../api/endpoints';
import { getApiErrorMessage } from '../../api/errors';
import ProductImage from '../../components/ProductImage';
import { useAuth } from '../../context/AuthContext';

export function ProductManage() {
  const { isDealer } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoriesError, setCategoriesError] = useState('');
  const [categoriesReload, setCategoriesReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [inStockFilter, setInStockFilter] = useState(false);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (categoryFilter) params.category = categoryFilter;
      if (inStockFilter) params.stock_quantity__gte = 1;
      const res = await getProducts(params);
      setProducts(Array.isArray(res.data) ? res.data : (res.data?.results || []));
    } catch {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, inStockFilter]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  useEffect(() => {
    setCategoriesError('');
    getCategories()
      .then(r => setCategories(r.data?.results || r.data || []))
      .catch(error => setCategoriesError(getApiErrorMessage(error, 'Failed to load product categories.')));
  }, [categoriesReload]);

  const openAdd = () => {
    setEditProduct(null);
    reset({
      name: '', sku: '', category: '', brand: '', cost_price: '', price: '', discount_price: '',
      stock_quantity: 0, description: '', is_active: true
    });
    setShowModal(true);
  };

  const openEdit = (product) => {
    setEditProduct(product);
    Object.entries({
      name: product.name,
      sku: product.sku,
      category: product.category || '',
      brand: product.brand || '',
      price: product.price,
      discount_price: product.discount_price || '',
      cost_price: product.cost_price || '',
      stock_quantity: product.stock_quantity,
      description: product.description || '',
      is_active: product.is_active
    }).forEach(([k, v]) => setValue(k, v));
    setShowModal(true);
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const payload = {
        ...data,
        price: parseFloat(data.price),
        discount_price: data.discount_price ? parseFloat(data.discount_price) : null,
        cost_price: parseFloat(data.cost_price),
        stock_quantity: parseInt(data.stock_quantity, 10),
        category: data.category || null
      };
      if (editProduct) {
        await updateProduct(editProduct.id, payload);
        toast.success('Product updated');
      } else {
        await createProduct(payload);
        toast.success('Product created');
      }
      setShowModal(false);
      fetchProducts();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isDealer) {
    return (
      <Container className="py-5">
        <Alert variant="warning">Access restricted to dealers only.</Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-0">Product Management</h2>
          <small className="text-muted">Manage your auto parts catalog</small>
        </div>
        <Button variant="primary" onClick={openAdd}>
          <Plus size={16} className="me-2" />
          Add Product
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <Row className="g-3 align-items-end">
            {categoriesError && (
              <Col xs={12}>
                <Alert variant="danger" className="mb-0">
                  {categoriesError}
                  <Button variant="link" size="sm" onClick={() => setCategoriesReload(value => value + 1)}>Retry</Button>
                </Alert>
              </Col>
            )}
            <Col md={4}>
              <Form.Label className="small fw-semibold">Search</Form.Label>
              <InputGroup>
                <InputGroup.Text><Search size={14} /></InputGroup.Text>
                <Form.Control
                  placeholder="Search by name or SKU..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={3}>
              <Form.Label className="small fw-semibold">Category</Form.Label>
              <Form.Select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                <option value="">All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Check
                type="switch"
                label="In Stock Only"
                id="manage-in-stock"
                checked={inStockFilter}
                onChange={e => setInStockFilter(e.target.checked)}
              />
            </Col>
            <Col md={2}>
              <Button variant="outline-secondary" onClick={fetchProducts} className="w-100">
                Apply
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-5">
              <Package size={48} className="text-muted mb-3" />
              <p className="text-muted">No products found</p>
            </div>
          ) : (
            <Table hover responsive className="mb-0">
              <thead className="table-light">
                <tr>
                  <th>Image</th>
                  <th>Name</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(product => (
                  <tr key={product.id}>
                    <td>
                      <div
                        className="d-flex align-items-center justify-content-center bg-light rounded"
                        style={{ width: 48, height: 48, overflow: 'hidden' }}
                      >
                        <ProductImage
                          product={product}
                          className="w-100 h-100"
                          style={{ objectFit: 'cover' }}
                          placeholderSize={20}
                        />
                      </div>
                    </td>
                    <td>
                      <div className="fw-semibold">{product.name}</div>
                      {product.brand && <small className="text-muted">{product.brand}</small>}
                    </td>
                    <td><code>{product.sku}</code></td>
                    <td>{product.category_name || '—'}</td>
                    <td>
                      <div className="fw-semibold">₹{parseFloat(product.price || 0).toFixed(2)}</div>
                      {product.discount_price && (
                        <small className="price-compare">₹{parseFloat(product.discount_price).toFixed(2)}</small>
                      )}
                    </td>
                    <td>
                      <span className={product.stock_quantity === 0 ? 'text-danger fw-bold' : product.is_low_stock ? 'text-warning fw-bold' : ''}>
                        {product.stock_quantity}
                      </span>
                    </td>
                    <td>
                      <Badge bg={product.is_active ? 'success' : 'secondary'}>
                        {product.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => openEdit(product)}
                      >
                        <Edit size={14} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Add/Edit Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>{editProduct ? 'Edit Product' : 'Add New Product'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit(onSubmit)}>
          <Modal.Body>
            <Row className="g-3">
              <Col md={8}>
                <Form.Group>
                  <Form.Label>Product Name *</Form.Label>
                  <Form.Control
                    {...register('name', { required: 'Name is required' })}
                    isInvalid={!!errors.name}
                    placeholder="e.g. Bosch Spark Plug Set"
                  />
                  <Form.Control.Feedback type="invalid">{errors.name?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>SKU *</Form.Label>
                  <Form.Control
                    {...register('sku', { required: 'SKU is required' })}
                    isInvalid={!!errors.sku}
                    placeholder="e.g. BSP-001"
                  />
                  <Form.Control.Feedback type="invalid">{errors.sku?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Category</Form.Label>
                  <Form.Select {...register('category')}>
                    <option value="">Select Category</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Brand</Form.Label>
                  <Form.Control
                    {...register('brand')}
                    placeholder="e.g. Bosch"
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Cost price *</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>₹</InputGroup.Text>
                    <Form.Control
                      type="number"
                      step="0.01"
                      min="0"
                      {...register('cost_price', { required: 'Cost price is required', min: 0 })}
                      isInvalid={!!errors.cost_price}
                    />
                  </InputGroup>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Price *</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>₹</InputGroup.Text>
                    <Form.Control
                      type="number"
                      step="0.01"
                      min="0"
                      {...register('price', { required: 'Price is required', min: 0 })}
                      isInvalid={!!errors.price}
                    />
                  </InputGroup>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Discount Price</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>₹</InputGroup.Text>
                    <Form.Control
                      type="number"
                      step="0.01"
                      min="0"
                      {...register('discount_price')}
                      placeholder="Optional sale price"
                    />
                  </InputGroup>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Stock *</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    {...register('stock_quantity', { required: 'Stock is required', min: 0 })}
                    isInvalid={!!errors.stock_quantity}
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    {...register('description')}
                    placeholder="Product description..."
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Check
                  type="switch"
                  id="is-active-toggle"
                  label="Active (visible in shop)"
                  {...register('is_active')}
                />
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? <Spinner size="sm" className="me-2" /> : null}
              {editProduct ? 'Save Changes' : 'Create Product'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
}
