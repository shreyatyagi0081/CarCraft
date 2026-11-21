import { useState } from 'react';
import { Container, Card, Form, Button, Spinner } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LogIn, Car } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const pageStyle = {
  background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
};

const cardStyle = {
  maxWidth: 420,
  width: '100%',
  borderRadius: 16,
  border: '1px solid #0f3460',
  background: 'rgba(26, 26, 46, 0.95)',
  color: '#e0e0e0',
  boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
};

export const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await login({ username: data.email, password: data.password });
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Invalid credentials. Please try again.');
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
            <p style={{ color: '#78909c', fontSize: 14 }}>Sign in to your account</p>
          </div>

          <Form onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Email */}
            <Form.Group className="mb-3">
              <Form.Label style={{ color: '#b0bec5' }}>Email or Username</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter email or username"
                isInvalid={!!errors.email}
                style={{ background: '#12121f', border: '1px solid #0f3460', color: '#e0e0e0' }}
                {...register('email', { required: 'Email or username is required' })}
              />
              <Form.Control.Feedback type="invalid">
                {errors.email?.message}
              </Form.Control.Feedback>
            </Form.Group>

            {/* Password */}
            <Form.Group className="mb-3">
              <Form.Label style={{ color: '#b0bec5' }}>Password</Form.Label>
              <Form.Control
                type="password"
                placeholder="Enter password"
                isInvalid={!!errors.password}
                style={{ background: '#12121f', border: '1px solid #0f3460', color: '#e0e0e0' }}
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 6, message: 'Password must be at least 6 characters' },
                })}
              />
              <Form.Control.Feedback type="invalid">
                {errors.password?.message}
              </Form.Control.Feedback>
            </Form.Group>

            {/* Remember me */}
            <Form.Group className="mb-4">
              <Form.Check
                type="checkbox"
                label="Remember me"
                style={{ color: '#90a4ae' }}
                {...register('remember')}
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
                  <LogIn size={16} className="me-2" />
                  Sign In
                </>
              )}
            </Button>
          </Form>

          <div className="text-center mt-3" style={{ color: '#78909c', fontSize: 14 }}>
            Don&apos;t have an account?{' '}
            <Link to="/register" style={{ color: '#4fc3f7', textDecoration: 'none', fontWeight: 600 }}>
              Register
            </Link>
          </div>
        </Card>
      </Container>
    </div>
  );
};
