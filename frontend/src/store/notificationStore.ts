import { create } from 'zustand';
import { Platform } from 'react-native';
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
  pushToken: string | null;
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  registerPushToken: () => Promise<void>;
}

async function getExpoPushToken(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    const Notifications = await import('expo-notifications');
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;
    const tokenData = await Notifications.getExpoPushTokenAsync();
    return tokenData.data;
  } catch {
    return null;
  }
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  pushToken: null,

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

  deleteNotification: async (id: string) => {
    try {
      await api.delete(`/api/notifications/${id}`);
      const { notifications, unreadCount } = get();
      const notif = notifications.find(n => n.id === id);
      set({
        notifications: notifications.filter(n => n.id !== id),
        unreadCount: notif && !notif.read ? Math.max(0, unreadCount - 1) : unreadCount,
      });
    } catch {}
  },

  registerPushToken: async () => {
    const token = await getExpoPushToken();
    if (token) {
      set({ pushToken: token });
      try {
        await api.post('/api/notifications/register-token', {
          token,
          device_type: Platform.OS,
        });
      } catch {}
    }
  },
}));
