import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../src/store/themeStore';
import { Platform } from 'react-native';

export default function TabLayout() {
  const { colors: C } = useThemeStore();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: C.card || '#FFFFFF',
          borderTopColor: C.border || '#E5E7EB',
          borderTopWidth: 1,
          height: Platform.OS === 'android' ? 65 : 85,
          paddingBottom: Platform.OS === 'android' ? 8 : 28,
          paddingTop: 6,
        },
        tabBarActiveTintColor: '#7C3AED',
        tabBarInactiveTintColor: C.textLight || '#9CA3AF',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{
        title: 'Accueil',
        tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
      }} />
      <Tabs.Screen name="vehicles" options={{
        title: 'Véhicules',
        tabBarIcon: ({ color, size }) => <Ionicons name="car" size={size} color={color} />,
      }} />
      <Tabs.Screen name="reservations" options={{
        title: 'Locations',
        tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />,
      }} />
      <Tabs.Screen name="profile" options={{
        title: 'Profil',
        tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
      }} />
    </Tabs>
  );
}
