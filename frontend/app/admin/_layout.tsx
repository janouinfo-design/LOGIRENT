import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Slot, useRouter, usePathname } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';

const COLORS = {
  primary: '#6C2BD9',
  primaryDark: '#5521B5',
  background: '#0F0B1A',
  card: '#1A1425',
  text: '#FFFFFF',
  textLight: '#9CA3AF',
  border: '#2D2640',
  accent: '#A78BFA',
  success: '#10B981',
  warning: '#F59E0B',
};

const NAV_ITEMS = [
  { key: '/admin', label: 'Tableau de bord', icon: 'grid-outline' as const },
  { key: '/admin/vehicles', label: 'Véhicules', icon: 'car-outline' as const },
  { key: '/admin/reservations', label: 'Réservations', icon: 'calendar-outline' as const },
  { key: '/admin/users', label: 'Clients', icon: 'people-outline' as const },
];

export default function AdminLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();

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
    <SafeAreaView style={styles.container}>
      {/* Top Admin Bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity onPress={() => router.push('/(tabs)')} data-testid="admin-go-home">
            <Ionicons name="arrow-back" size={22} color={COLORS.accent} />
          </TouchableOpacity>
          <View style={styles.brandGroup}>
            <Ionicons name="shield-checkmark" size={20} color={COLORS.accent} />
            <Text style={styles.brandText}>LogiRent Admin</Text>
          </View>
        </View>
        <View style={styles.topBarRight}>
          <View style={styles.agencyBadge} data-testid="admin-agency-badge">
            <Ionicons name="business" size={14} color={COLORS.warning} />
            <Text style={styles.agencyText}>{user.agency_name || 'N/A'}</Text>
          </View>
          <View style={styles.roleBadge} data-testid="admin-role-badge">
            <Text style={styles.roleText}>Admin</Text>
          </View>
          <TouchableOpacity onPress={() => { logout(); router.replace('/admin-login'); }} data-testid="admin-logout-btn">
            <Ionicons name="log-out-outline" size={22} color={COLORS.textLight} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Navigation Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.navTabs} contentContainerStyle={styles.navTabsContent}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.key || (item.key !== '/admin' && pathname.startsWith(item.key));
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.navTab, isActive && styles.navTabActive]}
              onPress={() => router.push(item.key as any)}
              data-testid={`admin-nav-${item.key.replace('/admin/', '').replace('/admin', 'dashboard')}`}
            >
              <Ionicons name={item.icon} size={18} color={isActive ? COLORS.accent : COLORS.textLight} />
              <Text style={[styles.navTabText, isActive && styles.navTabTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Content */}
      <Slot />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brandText: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  agencyBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(245,158,11,0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  agencyText: { color: COLORS.warning, fontSize: 12, fontWeight: '600' },
  roleBadge: { backgroundColor: 'rgba(108,43,217,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  roleText: { color: COLORS.accent, fontSize: 12, fontWeight: '700' },
  navTabs: { borderBottomWidth: 1, borderBottomColor: COLORS.border, maxHeight: 48 },
  navTabsContent: { paddingHorizontal: 12, gap: 4 },
  navTab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 12 },
  navTabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.accent },
  navTabText: { color: COLORS.textLight, fontSize: 13, fontWeight: '500' },
  navTabTextActive: { color: COLORS.accent, fontWeight: '700' },
});
