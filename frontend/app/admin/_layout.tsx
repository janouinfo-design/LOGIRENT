import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Stack, useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';

const COLORS = {
  primary: '#1E3A8A',
  secondary: '#F59E0B',
  background: '#F8FAFC',
  card: '#FFFFFF',
  text: '#FFFFFF',
  error: '#EF4444',
};

const menuItems = [
  { name: 'index', label: 'Dashboard', icon: 'stats-chart' },
  { name: 'calendar', label: 'Agenda', icon: 'calendar-outline' },
  { name: 'reservations', label: 'Réservations', icon: 'calendar' },
  { name: 'vehicles', label: 'Véhicules', icon: 'car' },
  { name: 'users', label: 'Utilisateurs', icon: 'people' },
  { name: 'payments', label: 'Paiements', icon: 'card' },
];

function AdminNavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { logout, user } = useAuthStore();

  const currentPage = pathname.split('/').pop() || 'index';

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Voulez-vous vous déconnecter?');
      if (confirmed) {
        await logout();
        router.replace('/admin-login');
      }
    } else {
      await logout();
      router.replace('/admin-login');
    }
  };

  return (
    <View style={styles.navContainer}>
      {/* Header with logo and logout */}
      <View style={styles.navHeader}>
        <View style={styles.logoSection}>
          <Ionicons name="settings" size={24} color={COLORS.text} />
          <Text style={styles.logoText}>RentDrive Admin</Text>
        </View>
        <View style={styles.userSection}>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out" size={18} color={COLORS.text} />
            <Text style={styles.logoutText}>Déconnexion</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Admin Menu */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.menuContainer}
      >
        {menuItems.map((item) => {
          const isActive = currentPage === item.name || (currentPage === 'admin' && item.name === 'index');
          return (
            <TouchableOpacity
              key={item.name}
              style={[styles.menuItem, isActive && styles.menuItemActive]}
              onPress={() => router.push(`/admin/${item.name === 'index' ? '' : item.name}` as any)}
            >
              <Ionicons 
                name={item.icon as any} 
                size={18} 
                color={isActive ? COLORS.secondary : 'rgba(255,255,255,0.7)'} 
              />
              <Text style={[styles.menuText, isActive && styles.menuTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function AdminLayout() {
  const router = useRouter();
  const { isAuthenticated, isLoading, loadUser } = useAuthStore();

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/admin-login');
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <Text>Chargement...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <AdminNavBar />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.background },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="vehicles" />
        <Stack.Screen name="reservations" />
        <Stack.Screen name="users" />
        <Stack.Screen name="payments" />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  navContainer: {
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'web' ? 10 : 50,
    paddingBottom: 10,
    paddingHorizontal: 16,
  },
  navHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userEmail: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  logoutText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '500',
  },
  menuContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    gap: 6,
  },
  menuItemActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  menuText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '500',
  },
  menuTextActive: {
    color: COLORS.text,
    fontWeight: '600',
  },
});
