import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Spinner } from 'react-bootstrap';

export default function ProtectedRoute({ children, dealerOnly = false }) {
  const { user, loading, isDealer } = useAuth();
  const location = useLocation();

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
      <Spinner animation="border" variant="warning" />
    </div>
  );

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (dealerOnly && !isDealer) return <Navigate to="/" replace />;

  return children;
}
