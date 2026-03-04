import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || '';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 30000,
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      AsyncStorage.removeItem('token');
      AsyncStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

// ===================== TYPES =====================

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  contract_hours: number;
  department_id?: string;
  department_name?: string;
  phone?: string;
  created_at: string;
}

export interface Department {
  id: string;
  name: string;
  description: string;
  company_id?: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  created_at: string;
}

export interface Activity {
  id: string;
  name: string;
  description: string;
  billable: boolean;
}

export interface Project {
  id: string;
  name: string;
  client_id?: string;
  client_name?: string;
  description: string;
  location: string;
  budget: number;
  hourly_rate: number;
  start_date?: string;
  end_date?: string;
  status: string;
  created_at: string;
  is_active: boolean;
}

export interface TimeEntry {
  id: string;
  user_id: string;
  user_name?: string;
  project_id?: string;
  project_name?: string;
  activity_id?: string;
  activity_name?: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  break_start: string | null;
  break_end: string | null;
  duration: number;
  break_duration: number;
  billable: boolean;
  status: string;
  comment: string;
  overtime_hours: number;
}

export interface Leave {
  id: string;
  user_id: string;
  user_name?: string;
  type: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  client_name?: string;
  project_id?: string;
  project_name?: string;
  amount: number;
  hours: number;
  status: string;
  date: string;
  due_date?: string;
  notes: string;
  items: any[];
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

export interface Timer {
  id: string;
  start_time: string;
  elapsed_hours: number;
  project_id?: string;
  project_name?: string;
  description: string;
}

export interface WeeklyStats {
  week_start: string;
  total_hours: number;
  billable_hours: number;
  overtime_hours: number;
  contract_hours: number;
  days_worked: number;
}

export interface MonthlyStats {
  month: number;
  year: number;
  total_hours: number;
  billable_hours: number;
  overtime_hours: number;
  contract_hours: number;
  days_worked: number;
}

export interface DashboardStats {
  total_employees: number;
  active_today: number;
  pending_entries: number;
  pending_leaves: number;
  billable_hours_month: number;
}

export interface CurrentEntry {
  active: boolean;
  on_break: boolean;
  entry: {
    id: string;
    clock_in: string;
    clock_out: string | null;
    break_start: string | null;
    break_end: string | null;
    project_id: string | null;
    project_name: string | null;
    activity_id: string | null;
    activity_name: string | null;
    comment: string;
    billable: boolean;
    status: string;
    total_hours: number;
    break_hours: number;
  } | null;
}

export interface ProjectStats {
  total_hours: number;
  billable_hours: number;
  billable_amount: number;
  budget: number;
  budget_remaining: number;
  entries_count: number;
}

// ===================== AUTH APIs =====================

export const login = (email: string, password: string) =>
  api.post('/auth/login', { email, password });

export const register = (data: any) =>
  api.post('/auth/register', data);

export const getMe = () =>
  api.get('/auth/me');

// ===================== USER APIs =====================

export const getUsers = () =>
  api.get<User[]>('/users');

export const updateUser = (id: string, data: any) =>
  api.put(`/users/${id}`, data);

// ===================== DEPARTMENT APIs =====================

export const getDepartments = () =>
  api.get<Department[]>('/departments');

export const createDepartment = (data: { name: string; description?: string }) =>
  api.post<Department>('/departments', data);

export const deleteDepartment = (id: string) =>
  api.delete(`/departments/${id}`);

// ===================== CLIENT APIs =====================

export const getClients = () =>
  api.get<Client[]>('/clients');

export const createClient = (data: { name: string; email?: string; phone?: string; company?: string; address?: string }) =>
  api.post<Client>('/clients', data);

export const updateClient = (id: string, data: any) =>
  api.put(`/clients/${id}`, data);

export const deleteClient = (id: string) =>
  api.delete(`/clients/${id}`);

// ===================== ACTIVITY APIs =====================

export const getActivities = () =>
  api.get<Activity[]>('/activities');

export const createActivity = (data: { name: string; description?: string; billable?: boolean }) =>
  api.post<Activity>('/activities', data);

export const deleteActivity = (id: string) =>
  api.delete(`/activities/${id}`);

// ===================== PROJECT APIs =====================

export const getProjects = (activeOnly: boolean = true) =>
  api.get<Project[]>('/projects', { params: { active_only: activeOnly } });

export const createProject = (data: {
  name: string;
  client_id?: string;
  description?: string;
  location?: string;
  budget?: number;
  hourly_rate?: number;
  start_date?: string;
  end_date?: string;
}) => api.post<Project>('/projects', data);

export const updateProject = (id: string, data: Partial<Project>) =>
  api.put<Project>(`/projects/${id}`, data);

export const deleteProject = (id: string) =>
  api.delete(`/projects/${id}`);

export const getProjectStats = (id: string) =>
  api.get<ProjectStats>(`/projects/${id}/stats`);

// ===================== TIME ENTRY APIs =====================

export const clockIn = (data: { project_id?: string; activity_id?: string; comment?: string; billable?: boolean }) =>
  api.post('/timeentries/clock-in', data);

export const clockOut = (data: { project_id?: string; activity_id?: string; comment?: string; billable?: boolean }) =>
  api.post('/timeentries/clock-out', data);

export const startBreak = () =>
  api.post('/timeentries/break-start');

export const endBreak = () =>
  api.post('/timeentries/break-end');

export const getCurrentEntry = () =>
  api.get<CurrentEntry>('/timeentries/current');

export const getTimeEntries = (params?: {
  start_date?: string;
  end_date?: string;
  user_id?: string;
  project_id?: string;
  status?: string;
  billable?: boolean;
}) => api.get<TimeEntry[]>('/timeentries', { params });

export const updateTimeEntry = (id: string, data: Partial<TimeEntry>) =>
  api.put(`/timeentries/${id}`, data);

export const approveEntry = (id: string) =>
  api.post(`/timeentries/${id}/approve`);

export const rejectEntry = (id: string) =>
  api.post(`/timeentries/${id}/reject`);

export const approveAllEntries = () =>
  api.post('/timeentries/approve-all');

// ===================== TIMER APIs =====================

export const startTimer = (data: { project_id?: string; activity_id?: string; comment?: string; billable?: boolean }) =>
  api.post('/timer/start', data);

export const stopTimer = () =>
  api.post('/timer/stop');

export const getCurrentTimer = () =>
  api.get<{ running: boolean; timer: Timer | null }>('/timer/current');

export const getTimerHistory = () =>
  api.get<Timer[]>('/timer/history');

// ===================== LEAVE APIs =====================

export const getLeaves = (params?: { user_id?: string; status?: string }) =>
  api.get<Leave[]>('/leaves', { params });

export const createLeave = (data: {
  type: string;
  start_date: string;
  end_date: string;
  reason?: string;
}) => api.post<Leave>('/leaves', data);

export const approveLeave = (id: string) =>
  api.post(`/leaves/${id}/approve`);

export const rejectLeave = (id: string) =>
  api.post(`/leaves/${id}/reject`);

// Aliases for backward compatibility
export const getAbsences = getLeaves;
export const createAbsence = createLeave;
export const approveAbsence = approveLeave;
export const rejectAbsence = rejectLeave;

// ===================== INVOICE APIs =====================

export const getInvoices = (params?: { client_id?: string; status?: string }) =>
  api.get<Invoice[]>('/invoices', { params });

export const createInvoice = (data: {
  client_id: string;
  project_id?: string;
  timesheet_ids?: string[];
  due_date?: string;
  notes?: string;
}) => api.post<Invoice>('/invoices', data);

export const updateInvoiceStatus = (id: string, status: string) =>
  api.put(`/invoices/${id}/status`, null, { params: { status } });

// ===================== NOTIFICATION APIs =====================

export const getNotifications = (unreadOnly: boolean = false) =>
  api.get<Notification[]>('/notifications', { params: { unread_only: unreadOnly } });

export const markNotificationRead = (id: string) =>
  api.post(`/notifications/${id}/read`);

export const markAllNotificationsRead = () =>
  api.post('/notifications/read-all');

export const getUnreadCount = () =>
  api.get<{ unread_count: number }>('/notifications/count');

// ===================== STATS APIs =====================

export const getWeeklyStats = () =>
  api.get<WeeklyStats>('/stats/weekly');

export const getMonthlyStats = (params?: { month?: number; year?: number }) =>
  api.get<MonthlyStats>('/stats/monthly', { params });

export const getDashboardStats = () =>
  api.get<DashboardStats>('/stats/dashboard');

// ===================== REPORT APIs =====================

export const getReportPdfUrl = (params?: { user_id?: string; month?: number; year?: number }) => {
  const queryParams = new URLSearchParams();
  if (params?.user_id) queryParams.append('user_id', params.user_id);
  if (params?.month) queryParams.append('month', params.month.toString());
  if (params?.year) queryParams.append('year', params.year.toString());
  return `${API_URL}/api/reports/pdf?${queryParams.toString()}`;
};

export const getReportExcelUrl = (params?: { user_id?: string; month?: number; year?: number }) => {
  const queryParams = new URLSearchParams();
  if (params?.user_id) queryParams.append('user_id', params.user_id);
  if (params?.month) queryParams.append('month', params.month.toString());
  if (params?.year) queryParams.append('year', params.year.toString());
  return `${API_URL}/api/reports/excel?${queryParams.toString()}`;
};

export default api;
