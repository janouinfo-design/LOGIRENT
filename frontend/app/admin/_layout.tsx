import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Stack, useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  primary: '#1E3A8A',
  secondary: '#F59E0B',
  background: '#F8FAFC',
  card: '#FFFFFF',
  text: '#FFFFFF',
};

const menuItems = [
  { name: 'index', label: 'Dashboard', icon: 'stats-chart' },
  { name: 'reservations', label: 'Réservations', icon: 'calendar' },
  { name: 'vehicles', label: 'Véhicules', icon: 'car' },
  { name: 'users', label: 'Utilisateurs', icon: 'people' },
  { name: 'payments', label: 'Paiements', icon: 'card' },
];

function AdminNavBar() {
  const router = useRouter();
  const pathname = usePathname();

  const currentPage = pathname.split('/').pop() || 'index';

  return (
    <View style={styles.navContainer}>
      {/* Back to Home Button */}
      <TouchableOpacity 
        style={styles.homeButton}
        onPress={() => router.push('/(tabs)')}
      >
        <Ionicons name="home" size={20} color={COLORS.text} />
        <Text style={styles.homeButtonText}>Accueil</Text>
      </TouchableOpacity>

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
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  homeButtonText: {
    color: COLORS.text,
    fontSize: 14,
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
