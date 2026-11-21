import api from './axios';

// ─── Auth ────────────────────────────────────────────────────────────
export const login = (data) => api.post('/api/auth/login/', data);
export const register = (data) => api.post('/api/auth/register/', data);
export const getProfile = () => api.get('/api/auth/profile/');
export const updateProfile = (data) => api.patch('/api/auth/profile/', data);

// ─── Vehicles (Module 1) ─────────────────────────────────────────────
export const getVehicles = (params) => api.get('/api/vehicles/inventory/', { params });
export const getAllVehicles = (params) => getAllPages(getVehicles, params);
export const getVehicle = (id) => api.get(`/api/vehicles/inventory/${id}/`);
export const createVehicle = (data) => api.post('/api/vehicles/inventory/', data);
export const updateVehicle = (id, data) => api.patch(`/api/vehicles/inventory/${id}/`, data);
export const deleteVehicle = (id) => api.delete(`/api/vehicles/inventory/${id}/`);
export const getVehicleMakes = (params) => api.get('/api/vehicles/makes/', { params });
export const getAllVehicleMakes = async () => {
  const makes = [];
  let page = 1;
  let response;

  do {
    response = await getVehicleMakes({ page });
    const data = response.data;
    const results = Array.isArray(data) ? data : data?.results;
    if (!Array.isArray(results)) {
      throw new Error('Vehicle makes API returned an invalid response.');
    }
    makes.push(...results);
    page += 1;
  } while (!Array.isArray(response.data) && response.data.next);

  return makes;
};
export const getVehicleModels = (params) => api.get('/api/vehicles/models/', { params });
export const getUsers = (params) => api.get('/api/auth/users/', { params });
export const getAllUsers = (params) => getAllPages(getUsers, params);

// ─── Sales (Modules 2 & 3) ───────────────────────────────────────────
export const getLeads = (params) => api.get('/api/sales/leads/', { params });
export const getAllLeads = (params) => getAllPages(getLeads, params);
export const getLead = (id) => api.get(`/api/sales/leads/${id}/`);
export const createLead = (data) => api.post('/api/sales/leads/', data);
export const updateLead = (id, data) => api.patch(`/api/sales/leads/${id}/`, data);

export const getQuotations = (params) => api.get('/api/sales/quotations/', { params });
export const getAllQuotations = (params) => getAllPages(getQuotations, params);
export const getQuotation = (id) => api.get(`/api/sales/quotations/${id}/`);
export const createQuotation = (data) => api.post('/api/sales/quotations/', data);
export const updateQuotation = (id, data) => api.patch(`/api/sales/quotations/${id}/`, data);

export const getOrders = (params) => api.get('/api/sales/orders/', { params });
export const getAllOrders = (params) => getAllPages(getOrders, params);
export const getOrder = (id) => api.get(`/api/sales/orders/${id}/`);
export const createOrder = (data) => api.post('/api/sales/orders/', data);
export const updateOrder = (id, data) => api.patch(`/api/sales/orders/${id}/update_order_status/`, data);

// ─── Analytics (Module 4) ────────────────────────────────────────────
export const getDashboardStats = () => api.get('/api/analytics/dashboard/');
export const getSalesByMake = () => api.get('/api/analytics/sales-by-make/');

// ─── Ecommerce (Modules 5, 6, 7) ─────────────────────────────────────
export const getProducts = (params) => api.get('/api/ecommerce/products/', { params });
export const getProduct = (id) => api.get(`/api/ecommerce/products/${id}/`);
export const createProduct = (data) => api.post('/api/ecommerce/products/', data);
export const updateProduct = (id, data) => api.patch(`/api/ecommerce/products/${id}/`, data);
export const getCategories = () => api.get('/api/ecommerce/categories/');

export const getCart = () => api.get('/api/ecommerce/cart/');
export const addToCart = (data) => api.post('/api/ecommerce/cart/', data);
export const updateCartItem = (data) => api.put('/api/ecommerce/cart/', data);
export const removeCartItem = (productId) => api.delete('/api/ecommerce/cart/', { params: { product_id: productId } });
export const clearCart = () => api.delete('/api/ecommerce/cart/');
export const checkout = (data) => api.post('/api/ecommerce/checkout/', data);

export const getEcomOrders = (params) => api.get('/api/ecommerce/orders/', { params });
export const getEcomOrder = (id) => api.get(`/api/ecommerce/orders/${id}/`);
export const updateShipping = (id, data) => api.patch(`/api/ecommerce/orders/${id}/update_shipping/`, data);

// ─── Reviews (Module 8) ──────────────────────────────────────────────
export const getReviews = (params) => api.get('/api/reviews/', { params });
export const createReview = (data) => api.post('/api/reviews/', data);
export const updateReview = (id, data) => api.patch(`/api/reviews/${id}/`, data);
export const deleteReview = (id) => api.delete(`/api/reviews/${id}/`);

// ─── Services (Modules 9, 10, 11) ────────────────────────────────────
export const getAppointments = (params) => api.get('/api/services/appointments/', { params });
export const getAllAppointments = (params) => getAllPages(getAppointments, params);
export const getAppointment = (id) => api.get(`/api/services/appointments/${id}/`);
export const createAppointment = (data) => api.post('/api/services/appointments/', data);
export const updateAppointment = (id, data) => api.patch(`/api/services/appointments/${id}/`, data);
export const cancelAppointment = (id) => api.post(`/api/services/appointments/${id}/cancel/`);
export const assignTechnician = (id, technicianId) => api.patch(
  `/api/services/appointments/${id}/assign_technician/`,
  { technician_id: technicianId }
);
export const completeService = (id, data) => api.post(`/api/services/appointments/${id}/complete_service/`, data);
export const updateAppointmentStatus = (id, status) => api.patch(
  `/api/services/appointments/${id}/update_status/`,
  { status }
);

export const getTechnicians = (params) => api.get('/api/services/technicians/', { params });
export const getAllTechnicians = (params) => getAllPages(getTechnicians, params);
export const getTechnician = (id) => api.get(`/api/services/technicians/${id}/`);
export const getTechnicianSchedule = (id, params) => api.get(`/api/services/technicians/${id}/schedule/`, { params });
export const updateTechnician = (id, data) => api.patch(`/api/services/technicians/${id}/`, data);
export const updateTechnicianAvailability = (id, availabilityStatus) => api.patch(
  `/api/services/technicians/${id}/update_status/`,
  { availability_status: availabilityStatus }
);
export const getServiceTypes = (params) => api.get('/api/services/service-types/', { params });
export const getAllServiceTypes = (params) => getAllPages(getServiceTypes, params);

export const getServiceHistory = (params) => api.get('/api/services/history/', { params });
export const getServiceRecord = (id) => api.get(`/api/services/history/${id}/`);
export const getRecommendations = (params) => api.get('/api/services/recommendations/', { params });

// ─── Communications (Module 12) ──────────────────────────────────────
export const getReminders = (params) => api.get('/api/communications/reminders/', { params });
export const getAllReminders = (params) => getAllPages(getReminders, params);
export const createReminder = (data) => api.post('/api/communications/reminders/', data);
export const updateReminder = (id, data) => api.patch(`/api/communications/reminders/${id}/`, data);
export const markReminderRead = (id) => api.patch(`/api/communications/reminders/${id}/mark_read/`);
export const getMessages = (params) => api.get('/api/communications/messages/', { params });
export const getAllMessages = (params) => getAllPages(getMessages, params);
export const sendMessage = (data) => api.post('/api/communications/messages/', data);
export const markMessageRead = (id) => api.patch(`/api/communications/messages/${id}/mark_read/`);
export const getDealers = (params) => api.get('/api/auth/dealers/', { params });
export const getAllDealers = (params) => getAllPages(getDealers, params);

async function getAllPages(request, params = {}) {
  const results = [];
  let page = 1;
  let response;

  do {
    response = await request({ ...params, page });
    const data = response.data;
    const pageResults = Array.isArray(data) ? data : data?.results;
    if (!Array.isArray(pageResults)) {
      throw new Error('Paginated API returned an invalid response.');
    }
    results.push(...pageResults);
    page += 1;
  } while (!Array.isArray(response.data) && response.data.next);

  return results;
}
