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
export const getProjectMonthlyHours = (id: string) => api.get(`/projects/${id}/monthly-hours`);
export const getAllProjectsMonthlyHours = () => api.get('/projects/monthly-hours');

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
export const updateLeave = (id: string, data: any) => api.put(`/leaves/${id}`, data);
export const deleteLeave = (id: string) => api.delete(`/leaves/${id}`);
export const approveLeave = (id: string) => api.post(`/leaves/${id}/approve`);
export const rejectLeave = (id: string) => api.post(`/leaves/${id}/reject`);

// Stats
export const getWeeklyStats = () => api.get('/stats/weekly');
export const getMonthlyStats = (params?: any) => api.get('/stats/monthly', { params });
export const getDashboardStats = () => api.get('/stats/dashboard');
export const getBalances = (params?: any) => api.get('/stats/balances', { params });

// Notifications
export const getNotifications = (params?: any) => api.get('/notifications', { params });
export const markNotificationRead = (id: string) => api.post(`/notifications/${id}/read`);
export const updateNotification = (id: string, data: any) => api.put(`/notifications/${id}`, data);
export const deleteNotification = (id: string) => api.delete(`/notifications/${id}`);
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

// Planning
export const getPlanning = (params?: any) => api.get('/planning', { params });

// Expenses
export const getExpenses = (params?: any) => api.get('/expenses', { params });
export const createExpense = (data: any) => {
  const params = new URLSearchParams();
  params.append('amount', data.amount);
  params.append('category', data.category);
  if (data.description) params.append('description', data.description);
  if (data.date) params.append('date', data.date);
  if (data.project_id) params.append('project_id', data.project_id);
  return api.post(`/expenses?${params.toString()}`);
};
export const approveExpense = (id: string) => api.post(`/expenses/${id}/approve`);
export const rejectExpense = (id: string) => api.post(`/expenses/${id}/reject`);

// Directory
export const getDirectory = () => api.get('/directory');

// Timer
export const startTimer = (data: any) => api.post('/timer/start', data);
export const stopTimer = () => api.post('/timer/stop');
export const getCurrentTimer = () => api.get('/timer/current');
export const getTimerHistory = () => api.get('/timer/history');

// Messaging
export const getConversations = () => api.get('/messages/conversations');
export const createConversation = (participants: string[], name?: string) =>
  api.post(`/messages/conversations?${new URLSearchParams(name ? { name } : {}).toString()}`, participants);
export const getMessagesForConv = (convId: string) => api.get(`/messages/${convId}`);
export const sendMessage = (conversationId: string, content: string) =>
  api.post(`/messages/send?conversation_id=${conversationId}&content=${encodeURIComponent(content)}`);

// HR Documents
export const getDocuments = (params?: any) => api.get('/documents', { params });
export const createDocument = (data: any) => {
  const p = new URLSearchParams();
  p.append('title', data.title);
  p.append('category', data.category);
  if (data.content) p.append('content', data.content);
  if (data.target_user_id) p.append('target_user_id', data.target_user_id);
  return api.post(`/documents?${p.toString()}`);
};
export const deleteDocument = (id: string) => api.delete(`/documents/${id}`);

// Schedules
export const getSchedules = (params?: any) => api.get('/schedules', { params });
export const createSchedule = (data: any) => {
  const p = new URLSearchParams();
  Object.entries(data).forEach(([k, v]) => { if (v !== undefined && v !== null) p.append(k, String(v)); });
  return api.post(`/schedules?${p.toString()}`);
};

// Payroll
export const getPayrollVariables = (params: any) => api.get('/payroll/variables', { params });
export const exportPayroll = (format: string, params: any) =>
  api.get(`/payroll/export/${format}`, { params, responseType: 'blob' });

// Subscriptions
export const getPlans = () => api.get('/subscriptions/plans');
export const getCurrentSubscription = () => api.get('/subscriptions/current');

// Analytics
export const getAnalyticsDashboard = (params?: any) => api.get('/analytics/dashboard', { params });

export default api;
