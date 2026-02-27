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
};

function TopTabBar({ state, descriptors, navigation }: any) {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  return (
    <View style={s.stickyHeader}>
      <View style={s.headerRow}>
        <View style={s.headerLeft}>
          <Ionicons name="car-sport" size={20} color={C.accent} />
          <Text style={s.headerTitle}>LogiRent</Text>
          <View style={s.agencyBadge}>
            <Text style={s.agencyText}>{user?.agency_name || 'Agence'}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => { logout(); router.replace('/admin-login'); }} data-testid="agency-app-logout">
          <Ionicons name="log-out-outline" size={20} color={C.textLight} />
        </TouchableOpacity>
      </View>
      <View style={s.tabRow}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const label = options.title || route.name;
          const isFocused = state.index === index;
          const icon = options.tabBarIcon;

          return (
            <TouchableOpacity
              key={route.key}
              style={[s.tabItem, isFocused && s.tabItemActive]}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
              data-testid={`tab-${route.name}`}
            >
              {icon && icon({ color: isFocused ? C.accent : C.textLight, size: 20, focused: isFocused })}
              <Text style={[s.tabLabel, isFocused && s.tabLabelActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function AgencyAppLayout() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

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
      <Tabs
        tabBar={(props) => <TopTabBar {...props} />}
        screenOptions={{ headerShown: false }}
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
  tabItemActive: { borderBottomColor: C.accent },
  tabLabel: { fontSize: 11, fontWeight: '600', color: C.textLight },
  tabLabelActive: { color: C.accent },
});
