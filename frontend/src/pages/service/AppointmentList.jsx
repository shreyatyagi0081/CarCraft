import { useState, useEffect, useCallback } from 'react';
import {
  Container, Row, Col, Card, Button, Modal, Form, ListGroup, Alert
} from 'react-bootstrap';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Calendar, Clock, Wrench, User, Plus, X, ChevronLeft, ChevronRight, List } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, addDays, isToday, isSunday, isBefore, startOfDay } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner, ErrorAlert, StatusBadge, EmptyState, PageHeader } from '../../components/common';
import {
  getAllAppointments, createAppointment, cancelAppointment, getAllTechnicians, getAllServiceTypes,
  getTechnicians, getTechnicianSchedule, assignTechnician, updateAppointmentStatus,
  completeService, updateTechnicianAvailability,
} from '../../api/endpoints';

const TIME_SLOTS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

const STATUS_COLORS = {
  REQUESTED: 'warning',
  CONFIRMED: 'primary',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  CANCELLED: 'danger',
};

const getApiError = (err, fallback) => {
  const data = err.response?.data;
  if (typeof data === 'string') return data;
  if (data?.detail) return data.detail;
  const messages = Object.values(data || {}).flat(Infinity).filter(value => typeof value === 'string');
  return messages.join(' ') || fallback;
};

function BookingModal({ show, onHide, onSuccess, serviceTypes }) {
  const [form, setForm] = useState({
    custom_vehicle_details: '',
    service_type: '',
    preferred_date: null,
    preferred_time: '09:00',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const isDisabledDate = (date) => isBefore(date, startOfDay(new Date())) || isSunday(date);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.preferred_date) { toast.error('Please select a date'); return; }
    if (!form.custom_vehicle_details.trim()) { toast.error('Please describe your vehicle'); return; }
    if (!form.service_type) { toast.error('Please select a service'); return; }
    setSubmitting(true);
    try {
      const [hours, minutes] = form.preferred_time.split(':').map(Number);
      const scheduledDate = new Date(form.preferred_date);
      scheduledDate.setHours(hours, minutes, 0, 0);
      const payload = {
        custom_vehicle_details: form.custom_vehicle_details.trim(),
        service_types: [Number(form.service_type)],
        scheduled_datetime: scheduledDate.toISOString(),
        customer_notes: form.notes,
      };
      await createAppointment(payload);
      toast.success('Appointment booked successfully!');
      onSuccess();
      onHide();
    } catch (err) {
      toast.error(getApiError(err, 'Failed to book appointment'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold"><Wrench size={20} className="me-2 text-warning" />Book Appointment</Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4">
        <Form onSubmit={handleSubmit}>
          <Row className="g-3">
            <Col md={6}>
              <Form.Label className="fw-semibold small">Vehicle *</Form.Label>
              <Form.Control name="custom_vehicle_details" value={form.custom_vehicle_details} onChange={handleChange} required placeholder="2020 Toyota Camry" />
            </Col>
            <Col md={6}>
              <Form.Label className="fw-semibold small">Service Type *</Form.Label>
              <Form.Select name="service_type" value={form.service_type} onChange={handleChange} required>
                <option value="">Select a service</option>
                {serviceTypes.map(service => <option key={service.id} value={service.id}>{service.name}</option>)}
              </Form.Select>
            </Col>
            <Col md={6}>
              <Form.Label className="fw-semibold small">Date *</Form.Label>
              <DatePicker
                selected={form.preferred_date}
                onChange={d => setForm(f => ({ ...f, preferred_date: d }))}
                filterDate={d => !isDisabledDate(d)}
                minDate={new Date()}
                placeholderText="Select date..."
                className="form-control"
                dateFormat="MMMM d, yyyy"
              />
            </Col>
            <Col md={6}>
              <Form.Label className="fw-semibold small">Time *</Form.Label>
              <Form.Select name="preferred_time" value={form.preferred_time} onChange={handleChange} required>
                {TIME_SLOTS.map(t => <option key={t} value={t}>{format(new Date(`2000-01-01T${t}:00`), 'h:mm a')}</option>)}
              </Form.Select>
            </Col>
            <Col md={12}>
              <Form.Label className="fw-semibold small">Notes</Form.Label>
              <Form.Control as="textarea" rows={3} name="notes" value={form.notes} onChange={handleChange} placeholder="Describe issues or special requests..." />
            </Col>
          </Row>
          <div className="d-flex justify-content-end gap-2 mt-4">
            <Button variant="light" onClick={onHide} disabled={submitting}>Cancel</Button>
            <Button type="submit" variant="warning" disabled={submitting}>
              {submitting ? 'Booking...' : 'Book Appointment'}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
}

function CalendarView({ appointments }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const startPad = (startOfMonth(currentMonth).getDay() + 6) % 7; // Mon start

  const getAptsForDay = (day) => appointments.filter(a => isSameDay(new Date(a.scheduled_datetime), day));

  return (
    <Card className="border-0 shadow-sm">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <Button variant="light" size="sm" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
            <ChevronLeft size={16} />
          </Button>
          <h6 className="mb-0 fw-bold">{format(currentMonth, 'MMMM yyyy')}</h6>
          <Button variant="light" size="sm" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
            <ChevronRight size={16} />
          </Button>
        </div>
        <div className="d-grid" style={{ gridTemplateColumns: 'repeat(7,1fr)', display: 'grid', gap: '2px' }}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
            <div key={d} className="text-center small fw-semibold text-muted py-1">{d}</div>
          ))}
          {Array(startPad).fill(null).map((_, i) => <div key={`pad-${i}`} />)}
          {days.map(day => {
            const apts = getAptsForDay(day);
            return (
              <div key={day.toISOString()} className={`border rounded p-1 text-center ${isToday(day) ? 'bg-warning bg-opacity-10 border-warning' : ''}`} style={{ minHeight: 60 }}>
                <div className={`small fw-bold ${isToday(day) ? 'text-warning' : ''}`}>{format(day, 'd')}</div>
                {apts.slice(0, 2).map(a => (
                  <div key={a.id} className={`badge bg-${STATUS_COLORS[a.status] || 'secondary'} text-truncate w-100 mt-1`} style={{ fontSize: '0.6rem' }}>
                    {a.service_types_details?.[0]?.name || a.appointment_number}
                  </div>
                ))}
                {apts.length > 2 && <div className="text-muted" style={{ fontSize: '0.6rem' }}>+{apts.length - 2}</div>}
              </div>
            );
          })}
        </div>
      </Card.Body>
    </Card>
  );
}

export function AppointmentList() {
  const { user, isDealer } = useAuth();
  const userId = user?.id;
  const isTechnician = user?.role === 'TECHNICIAN';
  const [appointments, setAppointments] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [technicianProfile, setTechnicianProfile] = useState(null);
  const [technicianSchedule, setTechnicianSchedule] = useState(null);
  const [selectedTechnicians, setSelectedTechnicians] = useState({});
  const [completionAppointment, setCompletionAppointment] = useState(null);
  const [completionForm, setCompletionForm] = useState({
    work_performed: '', parts_used: '', labor_hours: '', final_cost: '', diagnostic_notes: '',
  });
  const [savingAction, setSavingAction] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showBook, setShowBook] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'calendar'
  const [filters, setFilters] = useState({ status: '', technician: '', date: '' });

  const fetchData = useCallback(async () => {
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.technician) params.technician = filters.technician;
      if (filters.date) params.scheduled_datetime__date = filters.date;
      const [apts, techs, services, ownTechs] = await Promise.all([
        getAllAppointments(params),
        isDealer ? getAllTechnicians({ is_active: true }) : Promise.resolve([]),
        getAllServiceTypes(),
        isTechnician ? getTechnicians({ user: userId }) : Promise.resolve({ data: [] }),
      ]);
      setError(null);
      setAppointments(apts);
      setTechnicians(techs);
      setServiceTypes(services);
      const ownTech = ownTechs.data?.results?.[0] || ownTechs.data?.[0] || null;
      setTechnicianProfile(ownTech);
      if (ownTech) {
        const startDate = format(new Date(), 'yyyy-MM-dd');
        const endDate = format(addDays(new Date(), 30), 'yyyy-MM-dd');
        const scheduleResponse = await getTechnicianSchedule(ownTech.id, { start_date: startDate, end_date: endDate });
        setTechnicianSchedule(scheduleResponse.data);
      } else {
        setTechnicianSchedule(null);
      }
    } catch (err) {
      setError(getApiError(err, 'Failed to load appointments'));
    } finally {
      setLoading(false);
    }
  }, [filters, isDealer, isTechnician, userId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this appointment?')) return;
    try {
      await cancelAppointment(id);
      toast.success('Appointment cancelled');
      fetchData();
    } catch (err) {
      toast.error(getApiError(err, 'Unable to cancel appointment'));
    }
  };

  const handleAssign = async (appointmentId) => {
    const technicianId = selectedTechnicians[appointmentId];
    if (!technicianId) {
      toast.error('Select a technician first');
      return;
    }
    setSavingAction(true);
    try {
      await assignTechnician(appointmentId, Number(technicianId));
      toast.success('Technician assigned');
      await fetchData();
    } catch (err) {
      toast.error(getApiError(err, 'Unable to assign technician'));
    } finally {
      setSavingAction(false);
    }
  };

  const handleStartService = async (appointmentId) => {
    try {
      await updateAppointmentStatus(appointmentId, 'IN_PROGRESS');
      toast.success('Service started');
      await fetchData();
    } catch (err) {
      toast.error(getApiError(err, 'Unable to start service'));
    }
  };

  const handleCompleteService = async (e) => {
    e.preventDefault();
    if (!completionAppointment) return;
    setSavingAction(true);
    try {
      await completeService(completionAppointment.id, {
        ...completionForm,
        labor_hours: Number(completionForm.labor_hours),
        final_cost: Number(completionForm.final_cost),
      });
      toast.success('Service completed and history recorded');
      setCompletionAppointment(null);
      setCompletionForm({ work_performed: '', parts_used: '', labor_hours: '', final_cost: '', diagnostic_notes: '' });
      await fetchData();
    } catch (err) {
      toast.error(getApiError(err, 'Unable to complete service'));
    } finally {
      setSavingAction(false);
    }
  };

  const handleAvailabilityChange = async (availabilityStatus) => {
    if (!technicianProfile) return;
    try {
      await updateTechnicianAvailability(technicianProfile.id, availabilityStatus);
      setTechnicianSchedule(schedule => ({ ...schedule, availability_status: availabilityStatus }));
      toast.success('Availability updated');
    } catch (err) {
      toast.error(getApiError(err, 'Unable to update availability'));
    }
  };

  if (loading) return <Container className="py-5"><LoadingSpinner text="Loading appointments..." /></Container>;
  if (error) return <Container className="py-5"><ErrorAlert message={error} onRetry={fetchData} /></Container>;

  return (
    <Container className="py-4">
      <PageHeader
        title={<><Calendar size={28} className="me-2 text-warning" />Appointments</>}
        subtitle={isDealer ? 'Manage all service appointments' : 'Your service appointments'}
        action={
          <div className="d-flex gap-2">
            <Button variant={viewMode === 'list' ? 'warning' : 'light'} size="sm" onClick={() => setViewMode('list')}><List size={16} /></Button>
            <Button variant={viewMode === 'calendar' ? 'warning' : 'light'} size="sm" onClick={() => setViewMode('calendar')}><Calendar size={16} /></Button>
            <Button variant="warning" onClick={() => setShowBook(true)}>
              <Plus size={16} className="me-1" />Book Appointment
            </Button>
          </div>
        }
      />

      {/* Filters (dealer view) */}
      {isDealer && (
        <Card className="border-0 shadow-sm mb-4">
          <Card.Body>
            <Row className="g-2 align-items-end">
              <Col md={3}>
                <Form.Label className="small fw-semibold">Status</Form.Label>
                <Form.Select size="sm" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
                  <option value="">All Statuses</option>
                  {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </Form.Select>
              </Col>
              <Col md={3}>
                <Form.Label className="small fw-semibold">Technician</Form.Label>
                <Form.Select size="sm" value={filters.technician} onChange={e => setFilters(f => ({ ...f, technician: e.target.value }))}>
                  <option value="">All Technicians</option>
                  {technicians.map(t => <option key={t.id} value={t.id}>{t.user_details?.first_name || t.user_details?.username}</option>)}
                </Form.Select>
              </Col>
              <Col md={3}>
                <Form.Label className="small fw-semibold">Date</Form.Label>
                <Form.Control size="sm" type="date" value={filters.date} onChange={e => setFilters(f => ({ ...f, date: e.target.value }))} />
              </Col>
              <Col md={3}>
                <Button size="sm" variant="outline-secondary" onClick={() => setFilters({ status: '', technician: '', date: '' })}>Clear</Button>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}

      {isTechnician && technicianSchedule && (
        <Card className="border-0 shadow-sm mb-4">
          <Card.Body>
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
              <div>
                <h5 className="fw-bold mb-1">My Schedule</h5>
                <div className="small text-muted">Upcoming appointments for the next 30 days</div>
              </div>
              <Form.Select
                aria-label="Technician availability"
                value={technicianSchedule.availability_status}
                onChange={e => handleAvailabilityChange(e.target.value)}
                style={{ maxWidth: 200 }}
              >
                <option value="AVAILABLE">Available</option>
                <option value="BUSY">Busy</option>
                <option value="ON_LEAVE">On leave</option>
              </Form.Select>
            </div>
            {!technicianSchedule.appointments.length ? (
              <div className="text-muted small">No appointments scheduled in this date range.</div>
            ) : (
              <ListGroup variant="flush">
                {technicianSchedule.appointments.map(item => (
                  <ListGroup.Item key={item.id} className="px-0 d-flex flex-wrap justify-content-between gap-2">
                    <span><strong>{item.vehicle_display}</strong> · {item.service_names.join(', ')}</span>
                    <span className="text-muted">{format(new Date(item.scheduled_datetime), 'MMM d, yyyy h:mm a')} · {item.duration_minutes} min</span>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            )}
          </Card.Body>
        </Card>
      )}
      {isTechnician && !technicianProfile && (
        <Alert variant="warning">
          A technician profile is not configured for this account, so no schedule or availability is available.
        </Alert>
      )}

      {viewMode === 'calendar' ? (
        <CalendarView appointments={appointments} />
      ) : (
        <>
          {appointments.length === 0 ? (
            <EmptyState icon={Calendar} title="No appointments found" description="Book your first service appointment" action={<Button variant="warning" onClick={() => setShowBook(true)}>Book Now</Button>} />
          ) : (
            <Row className="g-3">
              {appointments.map(apt => (
                <Col key={apt.id} md={isDealer ? 6 : 12} lg={isDealer ? 4 : 12}>
                  <Card className="border-0 shadow-sm h-100">
                    <Card.Body>
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div>
                          <h6 className="fw-bold mb-1">
                            {[apt.customer_details?.first_name, apt.customer_details?.last_name].filter(Boolean).join(' ') || user?.first_name}
                          </h6>
                          <small className="text-muted">{apt.vehicle_display}</small>
                        </div>
                        <StatusBadge status={apt.status} />
                      </div>
                      <div className="d-flex flex-column gap-1 mb-3">
                        <div className="d-flex align-items-center gap-2 small text-muted">
                          <Wrench size={14} />
                          <span>{apt.service_types_details?.map(service => service.name).join(', ') || 'Service'}</span>
                        </div>
                        <div className="d-flex align-items-center gap-2 small text-muted">
                          <Calendar size={14} />
                          <span>{format(new Date(apt.scheduled_datetime), 'MMM d, yyyy')}</span>
                        </div>
                        <div className="d-flex align-items-center gap-2 small text-muted">
                          <Clock size={14} />
                          <span>{format(new Date(apt.scheduled_datetime), 'h:mm a')}</span>
                        </div>
                        {apt.technician_details && (
                          <div className="d-flex align-items-center gap-2 small text-muted">
                            <User size={14} />
                            <span>
                              {[apt.technician_details.user_details?.first_name, apt.technician_details.user_details?.last_name]
                                .filter(Boolean).join(' ') || apt.technician_details.user_details?.username}
                            </span>
                          </div>
                        )}
                      </div>
                      {apt.customer_notes && <p className="small text-muted border-top pt-2 mb-2">{apt.customer_notes}</p>}
                      {isDealer && apt.status === 'REQUESTED' && (
                        <div className="d-flex gap-2 mt-3">
                          <Form.Select
                            size="sm"
                            aria-label="Assign technician"
                            value={selectedTechnicians[apt.id] || ''}
                            onChange={e => setSelectedTechnicians(current => ({ ...current, [apt.id]: e.target.value }))}
                          >
                            <option value="">Select technician</option>
                            {technicians.map(tech => (
                              <option key={tech.id} value={tech.id}>
                                {tech.user_details?.first_name || tech.user_details?.username}
                              </option>
                            ))}
                          </Form.Select>
                          <Button size="sm" variant="outline-primary" disabled={savingAction} onClick={() => handleAssign(apt.id)}>
                            Assign
                          </Button>
                        </div>
                      )}
                      {isTechnician && apt.status === 'CONFIRMED' && apt.technician_details?.user === user?.id && (
                        <Button variant="primary" size="sm" onClick={() => handleStartService(apt.id)}>
                          Start service
                        </Button>
                      )}
                      {isTechnician && apt.status === 'IN_PROGRESS' && apt.technician_details?.user === user?.id && (
                        <Button variant="success" size="sm" onClick={() => setCompletionAppointment(apt)}>
                          Complete service
                        </Button>
                      )}
                      {(isDealer || apt.customer === user?.id) && ['REQUESTED', 'CONFIRMED'].includes(apt.status) && (
                        <Button variant="outline-danger" size="sm" onClick={() => handleCancel(apt.id)}>
                          <X size={14} className="me-1" />Cancel
                        </Button>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </>
      )}

      <BookingModal
        show={showBook}
        onHide={() => setShowBook(false)}
        onSuccess={fetchData}
        serviceTypes={serviceTypes}
      />
      <Modal show={Boolean(completionAppointment)} onHide={() => setCompletionAppointment(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Complete service</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCompleteService}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Work performed *</Form.Label>
              <Form.Control
                required
                as="textarea"
                rows={3}
                value={completionForm.work_performed}
                onChange={e => setCompletionForm(current => ({ ...current, work_performed: e.target.value }))}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Parts used</Form.Label>
              <Form.Control
                value={completionForm.parts_used}
                onChange={e => setCompletionForm(current => ({ ...current, parts_used: e.target.value }))}
              />
            </Form.Group>
            <Row className="g-3">
              <Col sm={6}>
                <Form.Label>Labor hours *</Form.Label>
                <Form.Control
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={completionForm.labor_hours}
                  onChange={e => setCompletionForm(current => ({ ...current, labor_hours: e.target.value }))}
                />
              </Col>
              <Col sm={6}>
                <Form.Label>Final cost *</Form.Label>
                <Form.Control
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={completionForm.final_cost}
                  onChange={e => setCompletionForm(current => ({ ...current, final_cost: e.target.value }))}
                />
              </Col>
            </Row>
            <Form.Group className="mt-3">
              <Form.Label>Diagnostic notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={completionForm.diagnostic_notes}
                onChange={e => setCompletionForm(current => ({ ...current, diagnostic_notes: e.target.value }))}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" onClick={() => setCompletionAppointment(null)} disabled={savingAction}>Cancel</Button>
            <Button type="submit" variant="success" disabled={savingAction}>
              {savingAction ? 'Saving...' : 'Complete service'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
}
