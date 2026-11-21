// Shared reusable UI components

import { Spinner, Alert, Card, Badge, Button } from 'react-bootstrap';
import { AlertCircle, RefreshCw } from 'lucide-react';

export function LoadingSpinner({ text = 'Loading...' }) {
  return (
    <div className="d-flex flex-column justify-content-center align-items-center py-5 gap-3">
      <Spinner animation="border" variant="warning" style={{ width: '3rem', height: '3rem' }} />
      <span className="text-muted">{text}</span>
    </div>
  );
}

export function ErrorAlert({ message = 'Something went wrong', onRetry }) {
  return (
    <Alert variant="danger" className="d-flex align-items-center gap-2">
      <AlertCircle size={20} />
      <div className="flex-grow-1">{message}</div>
      {onRetry && <Button variant="outline-danger" size="sm" onClick={onRetry}><RefreshCw size={14} /></Button>}
    </Alert>
  );
}

export function StatusBadge({ status }) {
  const map = {
    active: 'success', inactive: 'secondary', sold: 'dark',
    new: 'primary', contacted: 'info', qualified: 'warning', converted: 'success', lost: 'danger',
    pending: 'warning', confirmed: 'primary', in_progress: 'info', completed: 'success', cancelled: 'danger',
    draft: 'secondary', sent: 'primary', accepted: 'success', rejected: 'danger',
    processing: 'warning', shipped: 'info', delivered: 'success',
  };
  return <Badge bg={map[status] || 'secondary'} className="text-capitalize">{status?.replace('_', ' ')}</Badge>;
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="d-flex justify-content-between align-items-start mb-4">
      <div>
        <h2 className="fw-bold mb-1">{title}</h2>
        {subtitle && <p className="text-muted mb-0">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({ title, value, icon: Icon, color = 'primary', trend }) {
  return (
    <Card className="border-0 shadow-sm h-100">
      <Card.Body className="p-4">
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <p className="text-muted small mb-1">{title}</p>
            <h3 className="fw-bold mb-0">{value}</h3>
            {trend && <small className={`text-${trend > 0 ? 'success' : 'danger'}`}>{trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%</small>}
          </div>
          <div className={`bg-${color} bg-opacity-10 rounded-3 p-3`}>
            <Icon size={24} className={`text-${color}`} />
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="text-center py-5">
      <div className="mb-3 text-muted"><Icon size={56} strokeWidth={1} /></div>
      <h5 className="text-muted">{title}</h5>
      {description && <p className="text-muted small">{description}</p>}
      {action}
    </div>
  );
}
