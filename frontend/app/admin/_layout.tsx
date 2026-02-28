import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Slot, useRouter, usePathname } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeStore } from '../../src/store/themeStore';

const NAV_ITEMS = [
  { key: '/admin', label: 'Tableau de bord', icon: 'grid-outline' as const },
  { key: '/admin/vehicles', label: 'Véhicules', icon: 'car-outline' as const },
  { key: '/admin/reservations', label: 'Réservations', icon: 'calendar-outline' as const },
  { key: '/admin/users', label: 'Clients', icon: 'people-outline' as const },
  { key: '/admin/statistics', label: 'Statistiques', icon: 'stats-chart-outline' as const },
  { key: '/admin/tracking', label: 'Suivi GPS', icon: 'locate-outline' as const },
];

export default function AdminLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { mode, colors: C, toggleTheme, loadTheme } = useThemeStore();

  useEffect(() => { loadTheme(); }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/admin-login');
      return;
    }
    const role = user?.role || 'client';
    if (role === 'super_admin') {
      router.replace('/super-admin');
      return;
    }
    if (role !== 'admin') {
      router.replace('/admin-login');
    }
  }, [isAuthenticated, user]);

  if (!isAuthenticated || !user) return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.bg }]}>
      <View style={[styles.topBar, { backgroundColor: C.navBg, borderBottomColor: C.border }]}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity onPress={() => router.push('/(tabs)')} data-testid="admin-go-home">
            <Ionicons name="arrow-back" size={22} color={C.accent} />
          </TouchableOpacity>
          <View style={styles.brandGroup}>
            <Ionicons name="shield-checkmark" size={20} color={C.accent} />
            <Text style={[styles.brandText, { color: C.text }]}>LogiRent Admin</Text>
          </View>
        </View>
        <View style={styles.topBarRight}>
          <View style={[styles.agencyBadge, { backgroundColor: C.warning + '18' }]} data-testid="admin-agency-badge">
            <Ionicons name="business" size={14} color={C.warning} />
            <Text style={[styles.agencyText, { color: C.warning }]}>{user.agency_name || 'N/A'}</Text>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: C.accent + '20' }]} data-testid="admin-role-badge">
            <Text style={[styles.roleText, { color: C.accent }]}>Admin</Text>
          </View>
          <TouchableOpacity onPress={toggleTheme} testID="admin-theme-toggle">
            <Ionicons name={mode === 'dark' ? 'sunny' : 'moon'} size={20} color={C.textLight} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { logout(); router.replace('/admin-login'); }} testID="admin-logout-btn">
            <Ionicons name="log-out-outline" size={22} color={C.textLight} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.navTabs, { borderBottomColor: C.border, backgroundColor: C.navBg }]} contentContainerStyle={styles.navTabsContent}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.key || (item.key !== '/admin' && pathname.startsWith(item.key));
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.navTab, isActive && { borderBottomWidth: 2, borderBottomColor: C.accent }]}
              onPress={() => router.push(item.key as any)}
              data-testid={`admin-nav-${item.key.replace('/admin/', '').replace('/admin', 'dashboard')}`}
            >
              <Ionicons name={item.icon} size={18} color={isActive ? C.accent : C.textLight} />
              <Text style={[styles.navTabText, { color: isActive ? C.accent : C.textLight }, isActive && { fontWeight: '700' }]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Slot />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brandText: { fontSize: 16, fontWeight: '700' },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  agencyBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  agencyText: { fontSize: 12, fontWeight: '600' },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  roleText: { fontSize: 12, fontWeight: '700' },
  navTabs: { borderBottomWidth: 1, maxHeight: 48 },
  navTabsContent: { paddingHorizontal: 12, gap: 4 },
  navTab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 12 },
  navTabText: { fontSize: 13, fontWeight: '500' },
});
