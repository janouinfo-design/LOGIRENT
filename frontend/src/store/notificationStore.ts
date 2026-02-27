import { create } from 'zustand';
import api from '../api/axios';

export interface Notification {
  id: string;
  user_id: string;
  reservation_id?: string;
  type: string;
  title: string;
  message: string;
  icon?: string;
  read: boolean;
  created_at: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get('/api/notifications');
      set({ notifications: response.data.notifications || [], isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const response = await api.get('/api/notifications/unread-count');
      set({ unreadCount: response.data.count || 0 });
    } catch {}
  },

  markAsRead: async (id: string) => {
    try {
      await api.put(`/api/notifications/${id}/read`);
      const { notifications } = get();
      set({
        notifications: notifications.map(n => n.id === id ? { ...n, read: true } : n),
        unreadCount: Math.max(0, get().unreadCount - 1),
      });
    } catch {}
  },

  markAllAsRead: async () => {
    try {
      await api.put('/api/notifications/read-all');
      const { notifications } = get();
      set({
        notifications: notifications.map(n => ({ ...n, read: true })),
        unreadCount: 0,
      });
    } catch {}
  },
}));
