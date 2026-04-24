import { useEffect } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import api from '../api/axios';

/**
 * Registers the device for Expo push notifications and posts the token to backend.
 * Only activates on native mobile (iOS/Android) — no-op on web.
 * Requires expo.extra.eas.projectId to be set in app.json.
 */
export function usePushNotifications(isAuthenticated: boolean, userId?: string) {
  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    if (Platform.OS === 'web') return;

    let cancelled = false;

    (async () => {
      try {
        // Dynamic imports so web build doesn't fail
        const Device = await import('expo-device');
        const Notifications = await import('expo-notifications');

        if (!Device.isDevice) return; // only physical devices support push

        // Request permission
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') {
          console.warn('Push notifications permission denied');
          return;
        }

        // Get Expo push token
        const projectId =
          Constants?.expoConfig?.extra?.eas?.projectId ??
          (Constants as any)?.easConfig?.projectId;

        if (!projectId || projectId === 'YOUR_EAS_PROJECT_ID') {
          console.warn('Expo projectId not configured - skipping push registration');
          return;
        }

        const tokenResp = await Notifications.getExpoPushTokenAsync({ projectId });
        const token = tokenResp.data;

        if (cancelled || !token) return;

        // Register on backend
        await api.post('/api/notifications/register-token', {
          token,
          device_type: Platform.OS,
        });

        // Android requires a notification channel
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'LogiRent',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#7C3AED',
          });
        }

        // Foreground behavior
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
          } as any),
        });
      } catch (e) {
        console.warn('Push registration failed:', e);
      }
    })();

    return () => { cancelled = true; };
  }, [isAuthenticated, userId]);
}
