import { useState } from 'react';
import { Container, Card, Form, Button, Row, Col, Spinner } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { UserPlus, Car } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { register as apiRegister } from '../../api/endpoints';

const pageStyle = {
  background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  paddingTop: 40,
  paddingBottom: 40,
};

const cardStyle = {
  maxWidth: 540,
  width: '100%',
  borderRadius: 16,
  border: '1px solid #0f3460',
  background: 'rgba(26, 26, 46, 0.95)',
  color: '#e0e0e0',
  boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
};

const inputStyle = {
  background: '#12121f',
  border: '1px solid #0f3460',
  color: '#e0e0e0',
};

export const Register = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();

  const password = watch('password');

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const payload = {
        first_name: data.first_name,
        last_name: data.last_name,
        username: data.username,
        email: data.email,
        password: data.password,
        password_confirm: data.confirm_password,
        role: 'CUSTOMER',
        phone_number: data.phone,
      };
      await apiRegister(payload);
      await login({ username: data.username, password: data.password });
      toast.success('Account created! Welcome to CarCraft.');
      navigate('/');
    } catch (err) {
      const errData = err?.response?.data;
      const msg = errData
        ? Object.values(errData).flat().join(' ')
        : 'Registration failed. Please try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageStyle}>
      <Container className="d-flex justify-content-center px-3">
        <Card style={cardStyle} className="p-4">
          {/* Logo */}
          <div className="text-center mb-4">
            <Car size={36} color="#4fc3f7" className="mb-2" />
            <h3 className="fw-bold mb-0" style={{ color: '#fff' }}>
              Car<span style={{ color: '#4fc3f7' }}>Craft</span>
            </h3>
            <p style={{ color: '#78909c', fontSize: 14 }}>Create your account</p>
          </div>

          <Form onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Name row */}
            <Row className="g-3 mb-3">
              <Col xs={6}>
                <Form.Group>
                  <Form.Label style={{ color: '#b0bec5' }}>First Name</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="First"
                    isInvalid={!!errors.first_name}
                    style={inputStyle}
                    {...register('first_name', { required: 'First name required' })}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.first_name?.message}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col xs={6}>
                <Form.Group>
                  <Form.Label style={{ color: '#b0bec5' }}>Last Name</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Last"
                    isInvalid={!!errors.last_name}
                    style={inputStyle}
                    {...register('last_name', { required: 'Last name required' })}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.last_name?.message}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            {/* Username */}
            <Form.Group className="mb-3">
              <Form.Label style={{ color: '#b0bec5' }}>Username</Form.Label>
              <Form.Control
                type="text"
                placeholder="Choose a username"
                isInvalid={!!errors.username}
                style={inputStyle}
                {...register('username', {
                  required: 'Username is required',
                  minLength: { value: 3, message: 'At least 3 characters' },
                })}
              />
              <Form.Control.Feedback type="invalid">
                {errors.username?.message}
              </Form.Control.Feedback>
            </Form.Group>

            {/* Email */}
            <Form.Group className="mb-3">
              <Form.Label style={{ color: '#b0bec5' }}>Email</Form.Label>
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

            {/* Phone */}
            <Form.Group className="mb-3">
              <Form.Label style={{ color: '#b0bec5' }}>Phone</Form.Label>
              <Form.Control
                type="tel"
                placeholder="+1 (555) 000-0000"
                isInvalid={!!errors.phone}
                style={inputStyle}
                {...register('phone', { required: 'Phone is required' })}
              />
              <Form.Control.Feedback type="invalid">
                {errors.phone?.message}
              </Form.Control.Feedback>
            </Form.Group>

            {/* Password */}
            <Form.Group className="mb-3">
              <Form.Label style={{ color: '#b0bec5' }}>Password</Form.Label>
              <Form.Control
                type="password"
                placeholder="Min. 8 characters"
                isInvalid={!!errors.password}
                style={inputStyle}
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 8, message: 'At least 8 characters' },
                })}
              />
              <Form.Control.Feedback type="invalid">
                {errors.password?.message}
              </Form.Control.Feedback>
            </Form.Group>

            {/* Confirm Password */}
            <Form.Group className="mb-4">
              <Form.Label style={{ color: '#b0bec5' }}>Confirm Password</Form.Label>
              <Form.Control
                type="password"
                placeholder="Repeat password"
                isInvalid={!!errors.confirm_password}
                style={inputStyle}
                {...register('confirm_password', {
                  required: 'Please confirm your password',
                  validate: (v) => v === password || 'Passwords do not match',
                })}
              />
              <Form.Control.Feedback type="invalid">
                {errors.confirm_password?.message}
              </Form.Control.Feedback>
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
                  <UserPlus size={16} className="me-2" />
                  Create Account
                </>
              )}
            </Button>
          </Form>

          <div className="text-center mt-3" style={{ color: '#78909c', fontSize: 14 }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#4fc3f7', textDecoration: 'none', fontWeight: 600 }}>
              Sign In
            </Link>
          </div>
        </Card>
      </Container>
    </div>
  );
};
