import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Slot, useRouter, usePathname } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeStore } from '../../src/store/themeStore';

const NAV_ITEMS = [
  { key: '/super-admin', label: 'Dashboard', icon: 'grid-outline' as const },
  { key: '/super-admin/agencies', label: 'Agences', icon: 'business-outline' as const },
  { key: '/super-admin/vehicles', label: 'Véhicules', icon: 'car-outline' as const },
  { key: '/super-admin/reservations', label: 'Réservations', icon: 'calendar-outline' as const },
  { key: '/super-admin/users', label: 'Utilisateurs', icon: 'people-outline' as const },
  { key: '/super-admin/statistics', label: 'Statistiques', icon: 'stats-chart-outline' as const },
];

export default function SuperAdminLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { mode, colors: C, toggleTheme, loadTheme } = useThemeStore();

  useEffect(() => { loadTheme(); }, []);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'super_admin') {
      router.replace('/admin-login');
    }
  }, [isAuthenticated, user]);

  if (!isAuthenticated || !user || user.role !== 'super_admin') return null;

  return (
    <SafeAreaView style={[s.container, { backgroundColor: C.bg }]}>
      <View style={[s.topBar, { backgroundColor: C.navBg, borderBottomColor: C.border }]}>
        <View style={s.topBarLeft}>
          <View style={s.brandGroup}>
            <Ionicons name="shield-checkmark" size={22} color={C.error} />
            <Text style={[s.brandText, { color: C.text }]}>LogiRent</Text>
            <View style={[s.superBadge, { backgroundColor: C.error + '20', borderColor: C.error + '40' }]}>
              <Text style={[s.superText, { color: C.error }]}>SUPER ADMIN</Text>
            </View>
          </View>
        </View>
        <View style={s.topBarRight}>
          <Text style={[s.userName, { color: C.textLight }]}>{user.name}</Text>
          <TouchableOpacity onPress={toggleTheme} data-testid="sa-theme-toggle">
            <Ionicons name={mode === 'dark' ? 'sunny' : 'moon'} size={20} color={C.textLight} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { logout(); router.replace('/admin-login'); }} data-testid="sa-logout-btn">
            <Ionicons name="log-out-outline" size={22} color={C.textLight} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[s.navTabs, { borderBottomColor: C.border, backgroundColor: C.navBg }]} contentContainerStyle={s.navContent}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.key || (item.key !== '/super-admin' && pathname.startsWith(item.key));
          return (
            <TouchableOpacity
              key={item.key}
              style={[s.navTab, isActive && { borderBottomWidth: 2, borderBottomColor: C.error }]}
              onPress={() => router.push(item.key as any)}
              data-testid={`sa-nav-${item.label.toLowerCase()}`}
            >
              <Ionicons name={item.icon} size={18} color={isActive ? C.error : C.textLight} />
              <Text style={[s.navText, { color: isActive ? C.error : C.textLight }, isActive && { fontWeight: '700' }]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Slot />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  topBarLeft: { flexDirection: 'row', alignItems: 'center' },
  brandGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandText: { fontSize: 18, fontWeight: '800' },
  superBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  superText: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  userName: { fontSize: 13 },
  navTabs: { borderBottomWidth: 1, maxHeight: 48 },
  navContent: { paddingHorizontal: 12, gap: 4 },
  navTab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 12 },
  navText: { fontSize: 13, fontWeight: '500' },
});
