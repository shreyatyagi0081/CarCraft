import { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Tab, Nav, Card, Badge, Button, ListGroup, Modal, Form, Spinner } from 'react-bootstrap';
import { Bell, Calendar, Mail, Send, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import {
  getAllReminders,
  createReminder,
  markReminderRead,
  getAllMessages,
  sendMessage,
  markMessageRead,
  getAllUsers,
  getAllDealers,
} from '../../api/endpoints';

const REMINDER_TYPES = [
  ['SERVICE_DUE', 'Service due'],
  ['APPOINTMENT_UPCOMING', 'Upcoming appointment'],
  ['QUOTATION_EXPIRY', 'Quotation expiry'],
  ['ORDER_STATUS', 'Order status'],
  ['PROMOTIONAL', 'Promotional'],
  ['CUSTOM', 'Custom'],
];
const fmtDate = (d) => new Date(d).toLocaleString();
const getApiError = (err, fallback) => {
  const data = err.response?.data;
  if (typeof data === 'string') return data;
  if (data?.detail) return data.detail;
  const messages = Object.values(data || {}).flat(Infinity).filter(value => typeof value === 'string');
  return messages.join(' ') || fallback;
};

/* ═══════════════════════════════════════════════════════════ */
/*  TAB 1 – NOTIFICATIONS                                      */
/* ═══════════════════════════════════════════════════════════ */
function NotificationsTab() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | unread | read

  const load = useCallback(async () => {
    try {
      const [messages, reminders] = await Promise.all([getAllMessages(), getAllReminders()]);
      const messageItems = messages
        .filter(message => message.recipient === user?.id)
        .map(message => ({
          id: `message-${message.id}`,
          recordId: message.id,
          source: 'message',
          title: message.subject,
          message: message.body,
          is_read: message.is_read,
          created_at: message.created_at,
          canMarkRead: true,
        }));
      const reminderItems = reminders
        .filter(reminder => reminder.channel === 'IN_APP')
        .map(reminder => ({
          id: `reminder-${reminder.id}`,
          recordId: reminder.id,
          source: 'reminder',
          title: reminder.title,
          message: reminder.message,
          is_read: reminder.is_read,
          created_at: reminder.scheduled_time,
          canMarkRead: true,
        }));
      setItems([...messageItems, ...reminderItems].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    } catch (err) {
      toast.error(getApiError(err, 'Failed to load in-app messages and reminders'));
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const handleMarkRead = async (item) => {
    try {
      if (item.source === 'message') await markMessageRead(item.recordId);
      else await markReminderRead(item.recordId);
      setItems((prev) => prev.map((entry) => entry.id === item.id ? { ...entry, is_read: true } : entry));
    } catch (err) {
      toast.error(getApiError(err, 'Could not mark this item as read'));
    }
  };

  const visible = items.filter((n) => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'read') return n.is_read;
    return true;
  });

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="btn-group">
          {['all', 'unread', 'read'].map((f) => (
            <button
              key={f}
              className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <span className="small text-muted">Items come from your messages and in-app reminders.</span>
      </div>

      {loading ? (
        <div className="text-center py-5"><Spinner animation="border" /></div>
      ) : visible.length === 0 ? (
        <p className="text-muted text-center py-5">No notifications</p>
      ) : (
        <ListGroup variant="flush">
          {visible.map((n) => (
            <ListGroup.Item
              key={n.id}
              className={`py-3 px-3 ${n.is_read ? 'bg-light text-muted' : ''}`}
              style={{ borderLeft: `4px solid ${n.source === 'message' ? '#0d6efd' : '#ffc107'}`, cursor: !n.is_read && n.canMarkRead ? 'pointer' : 'default' }}
              onClick={() => !n.is_read && n.canMarkRead && handleMarkRead(n)}
            >
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <div className="d-flex align-items-center gap-2">
                    {!n.is_read && <span className="unread-dot flex-shrink-0" />}
                    <strong className={n.is_read ? 'fw-normal' : ''}>{n.title}</strong>
                    <Badge bg={n.source === 'message' ? 'primary' : 'warning'} text={n.source === 'message' ? undefined : 'dark'}>
                      {n.source === 'message' ? 'Message' : 'Reminder'}
                    </Badge>
                  </div>
                  <div className="small mt-1">{n.message}</div>
                </div>
                <span className="small text-muted ms-3 text-nowrap">{fmtDate(n.created_at)}</span>
              </div>
            </ListGroup.Item>
          ))}
        </ListGroup>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  TAB 2 – REMINDERS                                          */
/* ═══════════════════════════════════════════════════════════ */
function RemindersTab() {
  const { user, isDealer } = useAuth();
  const [items, setItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    customer: '', title: '', message: '', scheduled_time: '', reminder_type: 'SERVICE_DUE',
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getAllReminders();
      setItems([...data].sort((a, b) => new Date(a.scheduled_time) - new Date(b.scheduled_time)));
    } catch (err) {
      toast.error(getApiError(err, 'Failed to load reminders'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    if (isDealer) {
      getAllUsers({ role: 'CUSTOMER', is_active: true })
        .then(response => setCustomers(response.filter(customer => customer.role === 'CUSTOMER')))
        .catch(err => toast.error(getApiError(err, 'Failed to load customers')));
    }
  }, [isDealer, load, user?.id]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        message: form.message,
        scheduled_time: new Date(form.scheduled_time).toISOString(),
        reminder_type: form.reminder_type,
        channel: 'IN_APP',
      };
      if (isDealer) payload.customer = Number(form.customer);
      await createReminder(payload);
      toast.success('Reminder created');
      setShowModal(false);
      setForm({ customer: '', title: '', message: '', scheduled_time: '', reminder_type: 'SERVICE_DUE' });
      await load();
    } catch (err) {
      toast.error(getApiError(err, 'Failed to create reminder'));
    } finally {
      setSaving(false);
    }
  };

  const handleMarkRead = async (reminder) => {
    try {
      await markReminderRead(reminder.id);
      setItems(current => current.map(item => item.id === reminder.id ? { ...item, is_read: true } : item));
    } catch (err) {
      toast.error(getApiError(err, 'Unable to mark reminder as read'));
    }
  };

  return (
    <>
      <div className="d-flex justify-content-end mb-3">
        <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
          <Plus size={15} className="me-1" /> New Reminder
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-5"><Spinner animation="border" /></div>
      ) : items.length === 0 ? (
        <p className="text-muted text-center py-5">No reminders</p>
      ) : (
        <Row className="g-3">
          {items.map((r) => (
            <Col xs={12} md={6} key={r.id}>
              <Card className="h-100 shadow-sm">
                <Card.Body className="d-flex gap-3 align-items-start">
                  <div className="flex-shrink-0 mt-1"><Calendar size={20} className="text-primary" /></div>
                  <div className="flex-grow-1">
                    <div className="d-flex justify-content-between">
                      <strong>{r.title}</strong>
                      <Badge bg={r.is_sent ? 'success' : 'secondary'}>{r.is_sent ? 'Marked sent' : 'Scheduled'}</Badge>
                    </div>
                    <div className="small text-muted mt-1">{r.message}</div>
                    <div className="small mt-2 text-secondary">
                      <Calendar size={12} className="me-1" />
                      {fmtDate(r.scheduled_time)}
                      <span className="ms-2">{r.reminder_type.replaceAll('_', ' ')}</span>
                    </div>
                    <div className="small text-muted mt-1">Channel: {r.channel} · {r.is_read ? 'Read' : 'Unread'}</div>
                    {!r.is_read && (
                      <Button variant="link" size="sm" className="px-0" onClick={() => handleMarkRead(r)}>
                        Mark read
                      </Button>
                    )}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* New Reminder Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>New Reminder</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSave}>
          <Modal.Body>
            {isDealer && (
              <Form.Group className="mb-3">
                <Form.Label>Customer</Form.Label>
                <Form.Select
                  required
                  value={form.customer}
                  onChange={e => setForm(current => ({ ...current, customer: e.target.value }))}
                >
                  <option value="">Select a customer</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {[customer.first_name, customer.last_name].filter(Boolean).join(' ') || customer.username}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            )}
            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Message</Form.Label>
              <Form.Control required as="textarea" rows={2} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Scheduled time</Form.Label>
              <Form.Control required type="datetime-local" value={form.scheduled_time} onChange={(e) => setForm({ ...form, scheduled_time: e.target.value })} />
            </Form.Group>
            <Form.Group>
              <Form.Label>Reminder type</Form.Label>
              <Form.Select value={form.reminder_type} onChange={(e) => setForm({ ...form, reminder_type: e.target.value })}>
                {REMINDER_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </Form.Select>
            </Form.Group>
            <div className="small text-muted mt-3">Reminders are saved in the app. No email or SMS provider is configured.</div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? <Spinner size="sm" animation="border" /> : 'Save'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  TAB 3 – MESSAGES                                           */
/* ═══════════════════════════════════════════════════════════ */
function MessagesTab() {
  const { user, isDealer } = useAuth();
  const [messages, setMessages] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ recipient: '', subject: '', body: '' });
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      setMessages(await getAllMessages());
    } catch (err) {
      toast.error(getApiError(err, 'Failed to load messages'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const request = isDealer
      ? getAllUsers({ role: 'CUSTOMER', is_active: true })
      : getAllDealers();
    request
      .then(users => setRecipients(isDealer ? users.filter(recipient => recipient.role === 'CUSTOMER') : users))
      .catch(err => toast.error(getApiError(err, 'Failed to load message recipients')));
  }, [isDealer, load, user?.id]);

  const handleSelect = async (message) => {
    setSelected(message);
    if (message.is_read || message.recipient !== user?.id) return;
    try {
      await markMessageRead(message.id);
      const readMessage = { ...message, is_read: true };
      setMessages(current => current.map(item => item.id === message.id ? readMessage : item));
      setSelected(readMessage);
    } catch (err) {
      toast.error(getApiError(err, 'Could not mark message as read'));
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await sendMessage({ ...form, recipient: Number(form.recipient) });
      toast.success('Message sent');
      setShowModal(false);
      setForm({ recipient: '', subject: '', body: '' });
      await load();
    } catch (err) {
      toast.error(getApiError(err, 'Failed to send message'));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="d-flex justify-content-end mb-3">
        <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
          <Plus size={15} className="me-1" /> New Message
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-5"><Spinner animation="border" /></div>
      ) : (
        <Row className="g-0" style={{ minHeight: 480 }}>
          {/* Message list */}
          <Col xs={12} md={4} style={{ borderRight: '1px solid #dee2e6', overflowY: 'auto', maxHeight: 540 }}>
            {messages.length === 0 ? (
              <p className="text-muted text-center py-5">No messages</p>
            ) : (
              <ListGroup variant="flush">
                {messages.map((m) => (
                  <ListGroup.Item
                    key={m.id}
                    action
                    active={selected?.id === m.id}
                    onClick={() => handleSelect(m)}
                    className="py-3"
                  >
                    <div className={`small ${m.recipient === user?.id && !m.is_read ? 'fw-bold' : 'text-muted'}`}>
                      {[
                        m.sender_details?.first_name,
                        m.sender_details?.last_name,
                      ].filter(Boolean).join(' ') || m.sender_details?.username || 'Unknown'}
                    </div>
                    <div className={`text-truncate ${m.recipient === user?.id && !m.is_read ? 'fw-semibold' : ''}`}>{m.subject}</div>
                    <div className="small text-muted text-truncate">{m.body?.slice(0, 60)}…</div>
                    <div className="small text-muted mt-1">{new Date(m.created_at).toLocaleDateString()}</div>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            )}
          </Col>

          {/* Message body */}
          <Col xs={12} md={8} className="p-4">
            {selected ? (
              <>
                <h5 className="mb-3">{selected.subject}</h5>
                <div className="mb-2 small text-muted">
                  <strong>From:</strong> {[
                    selected.sender_details?.first_name,
                    selected.sender_details?.last_name,
                  ].filter(Boolean).join(' ') || selected.sender_details?.username || '—'}&nbsp;&nbsp;
                  <strong>To:</strong> {[
                    selected.recipient_details?.first_name,
                    selected.recipient_details?.last_name,
                  ].filter(Boolean).join(' ') || selected.recipient_details?.username || '—'}&nbsp;&nbsp;
                  <strong>Date:</strong> {fmtDate(selected.created_at)}
                </div>
                <hr />
                <p style={{ whiteSpace: 'pre-wrap' }}>{selected.body}</p>
              </>
            ) : (
              <div className="d-flex align-items-center justify-content-center h-100 text-muted">
                <div className="text-center">
                  <Mail size={40} className="mb-2 opacity-25" />
                  <div>Select a message to read</div>
                </div>
              </div>
            )}
          </Col>
        </Row>
      )}

      {/* New Message Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>New Message</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSend}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Recipient</Form.Label>
              <Form.Select required value={form.recipient} onChange={(e) => setForm({ ...form, recipient: e.target.value })}>
                <option value="">Select a recipient</option>
                {recipients.map(recipient => (
                  <option key={recipient.id} value={recipient.id}>
                    {[recipient.first_name, recipient.last_name].filter(Boolean).join(' ') || recipient.username}
                    {recipient.email ? ` (${recipient.email})` : ''}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Subject</Form.Label>
              <Form.Control required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            </Form.Group>
            <Form.Group>
              <Form.Label>Body</Form.Label>
              <Form.Control as="textarea" rows={4} required value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={sending}>
              {sending ? <Spinner size="sm" animation="border" /> : <><Send size={14} className="me-1" />Send</>}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  MAIN PAGE                                                   */
/* ═══════════════════════════════════════════════════════════ */
export default function NotificationsPage() {
  return (
    <Container className="py-4">
      <div className="d-flex align-items-center gap-2 mb-4">
        <Bell size={24} className="text-primary" />
        <h2 className="mb-0">Notifications &amp; Communications</h2>
      </div>

      <Tab.Container defaultActiveKey="notifications">
        <Nav variant="tabs" className="mb-4">
          <Nav.Item>
            <Nav.Link eventKey="notifications"><Bell size={15} className="me-1" />Notifications</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="reminders"><Calendar size={15} className="me-1" />Reminders</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="messages"><Mail size={15} className="me-1" />Messages</Nav.Link>
          </Nav.Item>
        </Nav>

        <Card className="shadow-sm">
          <Card.Body>
            <Tab.Content>
              <Tab.Pane eventKey="notifications"><NotificationsTab /></Tab.Pane>
              <Tab.Pane eventKey="reminders"><RemindersTab /></Tab.Pane>
              <Tab.Pane eventKey="messages"><MessagesTab /></Tab.Pane>
            </Tab.Content>
          </Card.Body>
        </Card>
      </Tab.Container>
    </Container>
  );
}
