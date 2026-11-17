const API_BASE = import.meta.env.VITE_API_URL || '/api';

export function getToken() {
  return localStorage.getItem('token');
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
}

async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    setToken(null);
    if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/signup')) {
      window.location.href = '/login';
    }
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(data?.detail || data?.message || 'Something went wrong');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

// Auth
export async function login(email, password) {
  const formData = new URLSearchParams();
  formData.append('username', email);
  formData.append('password', password);

  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.detail || 'Login failed');
    error.status = response.status;
    error.detail = data.detail;
    throw error;
  }
  return data;
}

export async function signup(userData) {
  return request('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
}

export async function getMe() {
  return request('/auth/me');
}

// Tickets
export async function getTickets(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, val);
    }
  });
  return request(`/tickets?${query.toString()}`);
}

export async function getTicket(id) {
  return request(`/tickets/${id}`);
}

export async function createTicket(ticketData) {
  return request('/tickets', {
    method: 'POST',
    body: JSON.stringify(ticketData),
  });
}

export async function updateTicketStatus(id, status, note) {
  return request(`/tickets/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status, note }),
  });
}

export async function assignTicket(id, assignee_id, note) {
  return request(`/tickets/${id}/assign`, {
    method: 'PUT',
    body: JSON.stringify({ assignee_id, note }),
  });
}

export async function updateTicketTags(id, tag_ids) {
  return request(`/tickets/${id}/tags`, {
    method: 'PUT',
    body: JSON.stringify({ tag_ids }),
  });
}

export async function updateTicketFields(id, fields) {
  return request(`/tickets/${id}/fields`, {
    method: 'PUT',
    body: JSON.stringify(fields),
  });
}

export async function addComment(id, note) {
  return request(`/tickets/${id}/comment`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
}

export async function requestApproval(id, note) {
  return request(`/tickets/${id}/request_approval`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
}

export async function approveTicket(id, note, fulfill_directly = false) {
  return request(`/tickets/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ note, fulfill_directly }),
  });
}

export async function rejectTicket(id, note) {
  return request(`/tickets/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
}

// Dashboard
export async function getDashboardSummary(stuck_days = 3) {
  return request(`/dashboard/summary?stuck_days=${stuck_days}`);
}

export async function getDashboardCharts() {
  return request('/dashboard/charts');
}

export async function getDashboardStuck(stuck_days = 3) {
  return request(`/dashboard/stuck?stuck_days=${stuck_days}`);
}

// Users (Admin)
export async function getUsers(role = '', status = '') {
  const query = new URLSearchParams();
  if (role) query.append('role', role);
  if (status) query.append('status', status);
  return request(`/users?${query.toString()}`);
}

export async function createUser(userData) {
  return request('/users', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
}

export async function updateUser(id, userData) {
  return request(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(userData),
  });
}

export async function getPendingUsers() {
  return request('/users/pending');
}

export async function approveUser(id, payload = {}) {
  return request(`/users/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function rejectUser(id, reason) {
  return request(`/users/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

// Categories
export async function getCategories() {
  return request('/categories');
}

export async function createCategory(catData) {
  return request('/categories', {
    method: 'POST',
    body: JSON.stringify(catData),
  });
}

export async function updateCategory(id, catData) {
  return request(`/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(catData),
  });
}

export async function getCategorySubAdmins(id) {
  return request(`/categories/${id}/sub_admins`);
}

// Tags
export async function getTags() {
  return request('/tags');
}

export async function createTag(name) {
  return request('/tags', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function renameTag(id, name) {
  return request(`/tags/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  });
}

export async function deleteTag(id) {
  return request(`/tags/${id}`, {
    method: 'DELETE',
  });
}

export async function mergeTags(source_id, target_id) {
  return request('/tags/merge', {
    method: 'POST',
    body: JSON.stringify({ source_id, target_id }),
  });
}
