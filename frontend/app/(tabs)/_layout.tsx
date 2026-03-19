import React, { useEffect } from 'react';
import { Tabs, useRouter, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../../src/store/authStore';
import { useNotificationStore } from '../../src/store/notificationStore';

export default function TabLayout() {
  const { isAuthenticated, user, isLoading } = useAuthStore();
  const { unreadCount } = useNotificationStore();

  // Show loading while checking auth
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#7C3AED',
        tabBarInactiveTintColor: '#6B7280',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          paddingBottom: 8,
          paddingTop: 6,
          height: 65,
        },
      }}
    >
      <Tabs.Screen name="index" options={{
        title: 'Accueil',
        tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />,
      }} />
      <Tabs.Screen name="vehicles" options={{
        title: 'Vehicules',
        tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'car' : 'car-outline'} size={24} color={color} />,
      }} />
      <Tabs.Screen name="reservations" options={{
        title: 'Locations',
        tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={24} color={color} />,
      }} />
      <Tabs.Screen name="notifications" options={{
        title: 'Notifs',
        tabBarIcon: ({ color, focused }) => (
          <View>
            <Ionicons name={focused ? 'notifications' : 'notifications-outline'} size={24} color={color} />
            {unreadCount > 0 && (
              <View style={{ position: 'absolute', top: -4, right: -8, backgroundColor: '#EF4444', borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3, borderWidth: 1.5, borderColor: '#fff' }}>
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </View>
        ),
      }} />
      <Tabs.Screen name="profile" options={{
        title: 'Profil',
        tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />,
      }} />
    </Tabs>
  );
}
