import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Slot, useRouter, usePathname } from 'expo-router';
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

const TABS = [
  { key: 'index', route: '/agency-app', label: 'Accueil', icon: 'home', iconOutline: 'home-outline' },
  { key: 'book', route: '/agency-app/book', label: 'Réserver', icon: 'add-circle', iconOutline: 'add-circle-outline' },
  { key: 'reservations', route: '/agency-app/reservations', label: 'Réservations', icon: 'calendar', iconOutline: 'calendar-outline' },
  { key: 'vehicles', route: '/agency-app/vehicles', label: 'Véhicules', icon: 'car', iconOutline: 'car-outline' },
  { key: 'clients', route: '/agency-app/clients', label: 'Clients', icon: 'people', iconOutline: 'people-outline' },
];

export default function AgencyAppLayout() {
  const router = useRouter();
  const pathname = usePathname();
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

  const isActive = (tab: typeof TABS[0]) => {
    if (tab.key === 'index') return pathname === '/' || pathname === '' || pathname === '/agency-app';
    return pathname.includes(tab.key);
  };

  return (
    <View style={s.container}>
      {/* Sticky top bar - Facebook style */}
      <View style={s.stickyHeader}>
        {/* Row 1: Logo + Agency + Logout */}
        <View style={s.headerRow}>
          <View style={s.headerLeft}>
            <Ionicons name="car-sport" size={20} color={C.accent} />
            <Text style={s.headerTitle}>LogiRent</Text>
            <View style={s.agencyBadge}>
              <Text style={s.agencyText}>{user.agency_name || 'Agence'}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => { logout(); router.replace('/admin-login'); }} data-testid="agency-app-logout">
            <Ionicons name="log-out-outline" size={20} color={C.textLight} />
          </TouchableOpacity>
        </View>
        {/* Row 2: Tab navigation */}
        <View style={s.tabRow}>
          {TABS.map((tab) => {
            const active = isActive(tab);
            return (
              <TouchableOpacity
                key={tab.key}
                style={[s.tabItem, active && s.tabItemActive]}
                onPress={() => router.push(tab.route as any)}
                data-testid={`tab-${tab.key}`}
              >
                <Ionicons name={(active ? tab.icon : tab.iconOutline) as any} size={20} color={active ? C.accent : C.textLight} />
                <Text style={[s.tabLabel, active && s.tabLabelActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      {/* Content */}
      <View style={s.content}>
        <Slot />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  stickyHeader: {
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    ...(Platform.OS === 'web' ? { position: 'sticky' as any, top: 0, zIndex: 100 } : {}),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { color: C.text, fontSize: 17, fontWeight: '800' },
  agencyBadge: { backgroundColor: 'rgba(108,43,217,0.2)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6 },
  agencyText: { color: C.accent, fontSize: 11, fontWeight: '700' },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingBottom: 2,
  },
  tabItem: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    gap: 2,
  },
  tabItemActive: {
    borderBottomColor: C.accent,
  },
  tabLabel: { fontSize: 11, fontWeight: '600', color: C.textLight },
  tabLabelActive: { color: C.accent },
  content: { flex: 1 },
});
