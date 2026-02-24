import React from 'react';
import { Stack } from 'expo-router';

const COLORS = {
  primary: '#1E3A8A',
  background: '#F8FAFC',
};

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: COLORS.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Admin Dashboard' }} />
      <Stack.Screen name="vehicles" options={{ title: 'Manage Vehicles' }} />
      <Stack.Screen name="reservations" options={{ title: 'Reservations' }} />
      <Stack.Screen name="users" options={{ title: 'Users' }} />
      <Stack.Screen name="payments" options={{ title: 'Payments' }} />
    </Stack>
  );
}
