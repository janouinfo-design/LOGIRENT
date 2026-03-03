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
      // Handle unauthorized - could trigger logout
      AsyncStorage.removeItem('token');
      AsyncStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

export interface TimeEntry {
  id: string;
  user_id: string;
  user_name?: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  break_start: string | null;
  break_end: string | null;
  project_id: string | null;
  project_name: string | null;
  comment: string;
  status: string;
  total_hours: number;
  break_hours: number;
  overtime_hours: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  location: string;
  created_at: string;
  is_active: boolean;
}

export interface Absence {
  id: string;
  user_id: string;
  user_name?: string;
  type: string;
  start_date: string;
  end_date: string;
  comment: string;
  status: string;
  approved_by: string | null;
  created_at: string;
}

export interface WeeklyStats {
  week_start: string;
  total_hours: number;
  overtime_hours: number;
  contract_hours: number;
  days_worked: number;
}

export interface MonthlyStats {
  month: number;
  year: number;
  total_hours: number;
  overtime_hours: number;
  contract_hours: number;
  days_worked: number;
}

export interface DashboardStats {
  total_employees: number;
  active_today: number;
  pending_entries: number;
  pending_absences: number;
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
    comment: string;
    status: string;
    total_hours: number;
    break_hours: number;
  } | null;
}

// Time Entry APIs
export const clockIn = (data: { project_id?: string; comment?: string }) =>
  api.post('/timeentries/clock-in', data);

export const clockOut = (data: { project_id?: string; comment?: string }) =>
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
  status?: string;
}) => api.get<TimeEntry[]>('/timeentries', { params });

export const updateTimeEntry = (id: string, data: Partial<TimeEntry>) =>
  api.put(`/timeentries/${id}`, data);

export const approveEntry = (id: string) =>
  api.post(`/timeentries/${id}/approve`);

export const rejectEntry = (id: string) =>
  api.post(`/timeentries/${id}/reject`);

// Project APIs
export const getProjects = () =>
  api.get<Project[]>('/projects');

export const createProject = (data: { name: string; description?: string; location?: string }) =>
  api.post<Project>('/projects', data);

export const updateProject = (id: string, data: Partial<Project>) =>
  api.put<Project>(`/projects/${id}`, data);

export const deleteProject = (id: string) =>
  api.delete(`/projects/${id}`);

// Absence APIs
export const getAbsences = (params?: { user_id?: string; status?: string }) =>
  api.get<Absence[]>('/absences', { params });

export const createAbsence = (data: {
  type: string;
  start_date: string;
  end_date: string;
  comment?: string;
}) => api.post<Absence>('/absences', data);

export const approveAbsence = (id: string) =>
  api.post(`/absences/${id}/approve`);

export const rejectAbsence = (id: string) =>
  api.post(`/absences/${id}/reject`);

// Stats APIs
export const getWeeklyStats = () =>
  api.get<WeeklyStats>('/stats/weekly');

export const getMonthlyStats = (params?: { month?: number; year?: number }) =>
  api.get<MonthlyStats>('/stats/monthly', { params });

export const getDashboardStats = () =>
  api.get<DashboardStats>('/stats/dashboard');

// Users API
export const getUsers = () =>
  api.get('/users');

export default api;
