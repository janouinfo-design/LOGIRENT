import axios from 'axios';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL || '';

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { 'Content-Type': 'application/json' },
});

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      authToken = null;
    }
    return Promise.reject(err);
  }
);

// Auth
export const loginUser = (email: string, password: string) =>
  api.post('/auth/login', { email, password });
export const registerUser = (data: any) => api.post('/auth/register', data);
export const getMe = () => api.get('/auth/me');

// Time Entries
export const clockIn = (data?: any) => api.post('/timeentries/clock-in', data || {});
export const clockOut = (data?: any) => api.post('/timeentries/clock-out', data || {});
export const startBreak = () => api.post('/timeentries/break-start');
export const endBreak = () => api.post('/timeentries/break-end');
export const getCurrentEntry = () => api.get('/timeentries/current');
export const getTimeEntries = (params?: any) => api.get('/timeentries', { params });
export const updateTimeEntry = (id: string, data: any) => api.put(`/timeentries/${id}`, data);
export const approveEntry = (id: string) => api.post(`/timeentries/${id}/approve`);
export const rejectEntry = (id: string) => api.post(`/timeentries/${id}/reject`);
export const approveAllEntries = () => api.post('/timeentries/approve-all');

// Projects
export const getProjects = (params?: any) => api.get('/projects', { params });
export const createProject = (data: any) => api.post('/projects', data);
export const updateProject = (id: string, data: any) => api.put(`/projects/${id}`, data);
export const deleteProject = (id: string) => api.delete(`/projects/${id}`);
export const getProjectStats = (id: string) => api.get(`/projects/${id}/stats`);

// Clients
export const getClients = () => api.get('/clients');
export const createClient = (data: any) => api.post('/clients', data);
export const updateClient = (id: string, data: any) => api.put(`/clients/${id}`, data);
export const deleteClient = (id: string) => api.delete(`/clients/${id}`);

// Activities
export const getActivities = () => api.get('/activities');
export const createActivity = (data: any) => api.post('/activities', data);
export const deleteActivity = (id: string) => api.delete(`/activities/${id}`);

// Departments
export const getDepartments = () => api.get('/departments');
export const createDepartment = (data: any) => api.post('/departments', data);
export const deleteDepartment = (id: string) => api.delete(`/departments/${id}`);

// Users
export const getUsers = () => api.get('/users');
export const updateUser = (id: string, data: any) => api.put(`/users/${id}`, data);

// Companies
export const getCompanies = () => api.get('/companies');
export const createCompany = (data: any) => api.post('/companies', data);

// Leaves
export const getLeaves = (params?: any) => api.get('/leaves', { params });
export const createLeave = (data: any) => api.post('/leaves', data);
export const approveLeave = (id: string) => api.post(`/leaves/${id}/approve`);
export const rejectLeave = (id: string) => api.post(`/leaves/${id}/reject`);

// Stats
export const getWeeklyStats = () => api.get('/stats/weekly');
export const getMonthlyStats = (params?: any) => api.get('/stats/monthly', { params });
export const getDashboardStats = () => api.get('/stats/dashboard');

// Notifications
export const getNotifications = (params?: any) => api.get('/notifications', { params });
export const markNotificationRead = (id: string) => api.post(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => api.post('/notifications/read-all');
export const getUnreadCount = () => api.get('/notifications/count');

// Reports
export const downloadPdfReport = (params?: any) =>
  api.get('/reports/pdf', { params, responseType: 'blob' });
export const downloadExcelReport = (params?: any) =>
  api.get('/reports/excel', { params, responseType: 'blob' });

// Invoices
export const getInvoices = (params?: any) => api.get('/invoices', { params });
export const createInvoice = (data: any) => api.post('/invoices', data);
export const updateInvoiceStatus = (id: string, status: string) =>
  api.put(`/invoices/${id}/status?status=${status}`);

// Audit Logs
export const getAuditLogs = (params?: any) => api.get('/audit-logs', { params });

export default api;
