import api from './axios';

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

export const orgAPI = {
  getProfile: () => api.get('/org/profile'),
  updateProfile: (data) => api.patch('/org/profile', data),
  getDashboard: () => api.get('/org/dashboard'),
};

export const recipientsAPI = {
  list: (params) => api.get('/recipients', { params }),
  get: (id) => api.get(`/recipients/${id}`),
  create: (data) => api.post('/recipients', data),
  update: (id, data) => api.patch(`/recipients/${id}`, data),
  delete: (id) => api.delete(`/recipients/${id}`),
};

export const certificatesAPI = {
  list: (params) => api.get('/certificates', { params }),
  get: (id) => api.get(`/certificates/${id}`),
  issue: (data) => api.post('/certificates', data),
  revoke: (id, data) => api.patch(`/certificates/${id}/revoke`, data),
  download: (id) => api.get(`/certificates/${id}/download`, { responseType: 'blob' }),
  getQR: (id) => api.get(`/certificates/${id}/qr`),
};

export const publicAPI = {
  verify: (publicId) => api.get(`/public/verify/${publicId}`),
};

export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  listOrgs: (params) => api.get('/admin/organizations', { params }),
  getOrg: (id) => api.get(`/admin/organizations/${id}`),
  setOrgStatus: (id, status) => api.patch(`/admin/organizations/${id}/status`, { status }),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
  listCertificates: (params) => api.get('/admin/certificates', { params }),
};
