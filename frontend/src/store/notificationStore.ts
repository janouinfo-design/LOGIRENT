import { create } from 'zustand';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export interface Notification {
  id: string;
  user_id: string;
  reservation_id?: string;
  type: string;
  title: string;
  message: string;
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
      const response = await axios.get(`${API_URL}/api/notifications`);
      set({ notifications: response.data.notifications, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      console.error('Error fetching notifications:', error);
    }
  },

  fetchUnreadCount: async () => {
    try {
      const response = await axios.get(`${API_URL}/api/notifications/unread-count`);
      set({ unreadCount: response.data.count });
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  },

  markAsRead: async (id: string) => {
    try {
      await axios.put(`${API_URL}/api/notifications/${id}/read`);
      const { notifications } = get();
      set({
        notifications: notifications.map(n => n.id === id ? { ...n, read: true } : n),
        unreadCount: Math.max(0, get().unreadCount - 1),
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  },

  markAllAsRead: async () => {
    try {
      await axios.put(`${API_URL}/api/notifications/read-all`);
      const { notifications } = get();
      set({
        notifications: notifications.map(n => ({ ...n, read: true })),
        unreadCount: 0,
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  },
}));
