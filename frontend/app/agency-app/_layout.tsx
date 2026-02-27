import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';

const C = {
  bg: '#0B0F1A',
  card: '#141926',
  primary: '#6C2BD9',
  accent: '#A78BFA',
  text: '#FFFFFF',
  textLight: '#8B95A8',
  border: '#1E2536',
  success: '#10B981',
  warning: '#F59E0B',
};

export default function AgencyAppLayout() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/admin-login');
      return;
    }
    if (user?.role !== 'admin') {
      router.replace('/admin-login');
    }
  }, [isAuthenticated, user]);

  if (!isAuthenticated || !user || user.role !== 'admin') return null;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Ionicons name="car-sport" size={22} color={C.accent} />
          <Text style={s.headerTitle}>LogiRent</Text>
          <View style={s.agencyBadge}>
            <Text style={s.agencyText}>{user.agency_name || 'Agence'}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => { logout(); router.replace('/admin-login'); }} data-testid="agency-app-logout">
          <Ionicons name="log-out-outline" size={22} color={C.textLight} />
        </TouchableOpacity>
      </View>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: C.card,
            borderTopColor: C.border,
            borderTopWidth: 1,
            height: Platform.OS === 'web' ? 60 : 80,
            paddingBottom: Platform.OS === 'web' ? 8 : 20,
            paddingTop: 8,
          },
          tabBarActiveTintColor: C.accent,
          tabBarInactiveTintColor: C.textLight,
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Accueil',
            tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="book"
          options={{
            title: 'Réserver',
            tabBarIcon: ({ color, size }) => <Ionicons name="add-circle" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="reservations"
          options={{
            title: 'Réservations',
            tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="vehicles"
          options={{
            title: 'Véhicules',
            tabBarIcon: ({ color, size }) => <Ionicons name="car" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="clients"
          options={{
            title: 'Clients',
            tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
          }}
        />
      </Tabs>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { color: C.text, fontSize: 18, fontWeight: '800' },
  agencyBadge: { backgroundColor: 'rgba(108,43,217,0.2)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6 },
  agencyText: { color: C.accent, fontSize: 11, fontWeight: '700' },
});
