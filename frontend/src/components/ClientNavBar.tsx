import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';

const tabs = [
  { name: 'index', route: '/(tabs)', icon: 'home', iconOutline: 'home-outline', label: 'Accueil' },
  { name: 'vehicles', route: '/(tabs)/vehicles', icon: 'car', iconOutline: 'car-outline', label: 'Véhicules' },
  { name: 'reservations', route: '/(tabs)/reservations', icon: 'calendar', iconOutline: 'calendar-outline', label: 'Locations' },
  { name: 'profile', route: '/(tabs)/profile', icon: 'person', iconOutline: 'person-outline', label: 'Profil' },
];

export function ClientNavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuthStore();

  const isActive = (route: string) => {
    if (route === '/(tabs)') return pathname === '/' || pathname === '' || pathname === '/index';
    return pathname.includes(route.replace('/(tabs)', ''));
  };

  return (
    <View style={s.bar}>
      {tabs.map((tab) => {
        const active = isActive(tab.route);
        return (
          <TouchableOpacity
            key={tab.name}
            style={[s.tab, active && s.tabActive]}
            onPress={() => router.push(tab.route as any)}
          >
            <Ionicons name={(active ? tab.icon : tab.iconOutline) as any} size={26} color={active ? '#7C3AED' : '#6B7280'} />
            <Text style={[s.label, active && s.labelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
      <TouchableOpacity
        style={[s.tab, { backgroundColor: '#FEE2E2' }]}
        onPress={() => { logout(); router.replace('/login' as any); }}
      >
        <Ionicons name="log-out-outline" size={26} color="#EF4444" />
        <Text style={[s.label, { color: '#EF4444' }]}>Quitter</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    marginHorizontal: 2,
  },
  tabActive: {
    backgroundColor: '#F3EEFF',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 4,
  },
  labelActive: {
    color: '#7C3AED',
    fontWeight: '700',
  },
});
