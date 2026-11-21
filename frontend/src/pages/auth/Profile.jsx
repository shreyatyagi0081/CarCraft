import { useState, useEffect } from 'react';
import { Container, Card, Row, Col, Form, Button, Badge, Spinner } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Save, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { updateProfile } from '../../api/endpoints';

const AVATAR_COLORS = ['#0f3460', '#1565c0', '#6a1b9a', '#00695c', '#c62828', '#f57f17'];

const getColor = (name = '') => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const getInitials = (user) => {
  if (!user) return '?';
  const f = user.first_name?.[0] || '';
  const l = user.last_name?.[0] || '';
  return (f + l).toUpperCase() || user.username?.[0]?.toUpperCase() || '?';
};

const roleBadge = {
  dealer: { bg: 'warning', text: 'Dealer' },
  customer: { bg: 'info', text: 'Customer' },
  admin: { bg: 'danger', text: 'Admin' },
};

const pageStyle = {
  background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  minHeight: '100vh',
  paddingTop: 60,
  paddingBottom: 60,
};

const cardStyle = {
  borderRadius: 16,
  border: '1px solid #0f3460',
  background: 'rgba(26, 26, 46, 0.97)',
  color: '#e0e0e0',
  boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
};

const inputStyle = {
  background: '#12121f',
  border: '1px solid #0f3460',
  color: '#e0e0e0',
};

export const Profile = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    if (user) {
      reset({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  }, [user, reset]);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await updateProfile(data);
      toast.success('Profile updated successfully!');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const initials = getInitials(user);
  const avatarColor = getColor(user?.username || '');
  const role = user?.role || 'customer';
  const badge = roleBadge[role] || { bg: 'secondary', text: role };

  return (
    <div style={pageStyle}>
      <Container>
        <Row className="justify-content-center">
          <Col md={8} lg={6}>
            <Card style={cardStyle} className="p-4">
              {/* Avatar + Info */}
              <div className="text-center mb-4">
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    background: avatarColor,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 30,
                    fontWeight: 700,
                    color: '#fff',
                    marginBottom: 12,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                  }}
                >
                  {initials}
                </div>
                <div>
                  <h5 className="fw-bold mb-1" style={{ color: '#fff' }}>
                    {user?.first_name || user?.username || 'User'}{' '}
                    {user?.last_name || ''}
                  </h5>
                  <p style={{ color: '#78909c', fontSize: 13, marginBottom: 6 }}>
                    @{user?.username}
                  </p>
                  <Badge bg={badge.bg} className="px-3 py-1" style={{ fontSize: 12 }}>
                    {badge.text}
                  </Badge>
                </div>
              </div>

              <hr style={{ borderColor: '#0f3460' }} />

              {/* Edit Form */}
              <h6 className="mb-3" style={{ color: '#90a4ae' }}>
                <User size={15} className="me-2" />
                Edit Profile
              </h6>
              <Form onSubmit={handleSubmit(onSubmit)} noValidate>
                <Row className="g-3 mb-3">
                  <Col xs={6}>
                    <Form.Group>
                      <Form.Label style={{ color: '#b0bec5', fontSize: 13 }}>First Name</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="First"
                        isInvalid={!!errors.first_name}
                        style={inputStyle}
                        {...register('first_name', { required: 'Required' })}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.first_name?.message}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col xs={6}>
                    <Form.Group>
                      <Form.Label style={{ color: '#b0bec5', fontSize: 13 }}>Last Name</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Last"
                        isInvalid={!!errors.last_name}
                        style={inputStyle}
                        {...register('last_name', { required: 'Required' })}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.last_name?.message}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label style={{ color: '#b0bec5', fontSize: 13 }}>Email</Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="you@example.com"
                    isInvalid={!!errors.email}
                    style={inputStyle}
                    {...register('email', {
                      required: 'Email is required',
                      pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' },
                    })}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.email?.message}
                  </Form.Control.Feedback>
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label style={{ color: '#b0bec5', fontSize: 13 }}>Phone</Form.Label>
                  <Form.Control
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    style={inputStyle}
                    {...register('phone')}
                  />
                </Form.Group>

                <Button
                  type="submit"
                  className="w-100"
                  disabled={loading}
                  style={{ background: '#4fc3f7', border: 'none', fontWeight: 600, height: 44 }}
                >
                  {loading ? (
                    <Spinner animation="border" size="sm" />
                  ) : (
                    <>
                      <Save size={16} className="me-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </Form>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};
