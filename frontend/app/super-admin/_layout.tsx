import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Slot, useRouter, usePathname } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';

const C = {
  primary: '#dc2626',
  bg: '#0a0a12',
  card: '#14141f',
  text: '#fff',
  textLight: '#9ca3af',
  border: '#1f1f2e',
  accent: '#f87171',
  gold: '#fbbf24',
};

const NAV_ITEMS = [
  { key: '/super-admin', label: 'Dashboard', icon: 'grid-outline' as const },
  { key: '/super-admin/agencies', label: 'Agences', icon: 'business-outline' as const },
  { key: '/super-admin/vehicles', label: 'Véhicules', icon: 'car-outline' as const },
  { key: '/super-admin/reservations', label: 'Réservations', icon: 'calendar-outline' as const },
  { key: '/super-admin/users', label: 'Utilisateurs', icon: 'people-outline' as const },
  { key: '/super-admin/tracking', label: 'Suivi GPS', icon: 'locate-outline' as const },
];

export default function SuperAdminLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'super_admin') {
      router.replace('/admin-login');
    }
  }, [isAuthenticated, user]);

  if (!isAuthenticated || !user || user.role !== 'super_admin') return null;

  return (
    <SafeAreaView style={s.container}>
      <View style={s.topBar}>
        <View style={s.topBarLeft}>
          <View style={s.brandGroup}>
            <Ionicons name="shield-checkmark" size={22} color={C.accent} />
            <Text style={s.brandText}>LogiRent</Text>
            <View style={s.superBadge}>
              <Text style={s.superText}>SUPER ADMIN</Text>
            </View>
          </View>
        </View>
        <View style={s.topBarRight}>
          <Text style={s.userName}>{user.name}</Text>
          <TouchableOpacity onPress={() => { logout(); router.replace('/admin-login'); }} data-testid="sa-logout-btn">
            <Ionicons name="log-out-outline" size={22} color={C.textLight} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.navTabs} contentContainerStyle={s.navContent}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.key || (item.key !== '/super-admin' && pathname.startsWith(item.key));
          return (
            <TouchableOpacity
              key={item.key}
              style={[s.navTab, isActive && s.navTabActive]}
              onPress={() => router.push(item.key as any)}
              data-testid={`sa-nav-${item.label.toLowerCase()}`}
            >
              <Ionicons name={item.icon} size={18} color={isActive ? C.accent : C.textLight} />
              <Text style={[s.navText, isActive && s.navTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Slot />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.card },
  topBarLeft: { flexDirection: 'row', alignItems: 'center' },
  brandGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandText: { color: C.text, fontSize: 18, fontWeight: '800' },
  superBadge: { backgroundColor: 'rgba(220,38,38,0.2)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(220,38,38,0.4)' },
  superText: { color: C.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  userName: { color: C.textLight, fontSize: 13 },
  navTabs: { borderBottomWidth: 1, borderBottomColor: C.border, maxHeight: 48, backgroundColor: C.card },
  navContent: { paddingHorizontal: 12, gap: 4 },
  navTab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 12 },
  navTabActive: { borderBottomWidth: 2, borderBottomColor: C.accent },
  navText: { color: C.textLight, fontSize: 13, fontWeight: '500' },
  navTextActive: { color: C.accent, fontWeight: '700' },
});
