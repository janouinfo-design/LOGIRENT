import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Modal, ScrollView, FlatList } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useNotificationStore } from '../../src/store/notificationStore';
import { useThemeStore } from '../../src/store/themeStore';

function TopTabBar({ state, descriptors, navigation }: any) {
  const { user, logout } = useAuthStore();
  const { unreadCount, notifications, fetchNotifications, fetchUnreadCount, markAsRead, markAllAsRead } = useNotificationStore();
  const { mode, colors: C, toggleTheme } = useThemeStore();
  const router = useRouter();
  const [showNotifs, setShowNotifs] = React.useState(false);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const openNotifs = () => {
    fetchNotifications();
    setShowNotifs(true);
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "A l'instant";
    if (mins < 60) return `Il y a ${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Il y a ${hours}h`;
    return `Il y a ${Math.floor(hours / 24)}j`;
  };

  return (
    <View style={[s.stickyHeader, { backgroundColor: C.navBg, borderBottomColor: C.navBorder }]}>
      <View style={s.headerRow}>
        <View style={s.headerLeft}>
          <Ionicons name="car-sport" size={20} color={C.accent} />
          <Text style={[s.headerTitle, { color: C.text }]}>LogiRent</Text>
          <View style={[s.agencyBadge, { backgroundColor: C.accent + '20' }]}>
            <Text style={[s.agencyText, { color: C.accent }]}>{user?.agency_name || 'Agence'}</Text>
          </View>
        </View>
        <View style={s.headerRight}>
          <TouchableOpacity onPress={toggleTheme} data-testid="theme-toggle">
            <Ionicons name={mode === 'dark' ? 'sunny' : 'moon'} size={20} color={C.textLight} />
          </TouchableOpacity>
          <TouchableOpacity onPress={openNotifs} data-testid="notif-bell">
            <Ionicons name="notifications" size={20} color={C.textLight} />
            {unreadCount > 0 && (
              <View style={s.badge}><Text style={s.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text></View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { logout(); router.replace('/admin-login'); }} data-testid="agency-app-logout">
            <Ionicons name="log-out-outline" size={20} color={C.textLight} />
          </TouchableOpacity>
        </View>
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
              style={[s.tabItem, isFocused && { borderBottomColor: C.accent }]}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
              }}
            >
              {icon && icon({ color: isFocused ? C.accent : C.textLight, size: 20, focused: isFocused })}
              <Text style={[s.tabLabel, { color: isFocused ? C.accent : C.textLight }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Notification Panel */}
      <Modal visible={showNotifs} transparent animationType="slide" onRequestClose={() => setShowNotifs(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.notifPanel, { backgroundColor: C.card }]}>
            <View style={s.notifHeader}>
              <Text style={[s.notifTitle, { color: C.text }]}>Notifications</Text>
              <View style={s.notifActions}>
                {unreadCount > 0 && (
                  <TouchableOpacity onPress={markAllAsRead}><Text style={{ color: C.accent, fontSize: 13 }}>Tout lire</Text></TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setShowNotifs(false)}><Ionicons name="close" size={24} color={C.text} /></TouchableOpacity>
              </View>
            </View>
            <FlatList
              data={notifications}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={<View style={s.emptyNotif}><Ionicons name="notifications-off-outline" size={32} color={C.textLight} /><Text style={{ color: C.textLight, marginTop: 8 }}>Aucune notification</Text></View>}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[s.notifItem, { borderBottomColor: C.border }, !item.read && { backgroundColor: C.accent + '08' }]}
                  onPress={() => { if (!item.read) markAsRead(item.id); }}
                >
                  <View style={[s.notifDot, !item.read && { backgroundColor: C.accent }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.notifItemTitle, { color: C.text }]}>{item.title}</Text>
                    <Text style={[s.notifItemMsg, { color: C.textLight }]}>{item.message}</Text>
                    <Text style={[s.notifTime, { color: C.textLight }]}>{timeAgo(item.created_at)}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function AgencyAppLayout() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { colors: C, loadTheme } = useThemeStore();

  useEffect(() => { loadTheme(); }, []);

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/admin-login'); return; }
    if (user?.role !== 'admin') router.replace('/admin-login');
  }, [isAuthenticated, user]);

  if (!isAuthenticated || !user || user.role !== 'admin') return null;

  return (
    <View style={[s.container, { backgroundColor: C.bg }]}>
      <Tabs tabBar={(props) => <TopTabBar {...props} />} screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="index" options={{ title: 'Accueil', tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} /> }} />
        <Tabs.Screen name="book" options={{ title: 'Réserver', tabBarIcon: ({ color, size }) => <Ionicons name="add-circle" size={size} color={color} /> }} />
        <Tabs.Screen name="reservations" options={{ title: 'Réservations', tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} /> }} />
        <Tabs.Screen name="vehicles" options={{ title: 'Véhicules', tabBarIcon: ({ color, size }) => <Ionicons name="car" size={size} color={color} /> }} />
        <Tabs.Screen name="clients" options={{ title: 'Clients', tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} /> }} />
      </Tabs>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  stickyHeader: { borderBottomWidth: 1, ...(Platform.OS === 'web' ? { position: 'sticky' as any, top: 0, zIndex: 100 } : {}) },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  agencyBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6 },
  agencyText: { fontSize: 11, fontWeight: '700' },
  badge: { position: 'absolute', top: -6, right: -8, backgroundColor: '#EF4444', borderRadius: 9, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  tabRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 8, paddingBottom: 2 },
  tabItem: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 2, borderBottomColor: 'transparent', gap: 2 },
  tabLabel: { fontSize: 11, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  notifPanel: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%', paddingTop: 16 },
  notifHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  notifTitle: { fontSize: 18, fontWeight: '800' },
  notifActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  emptyNotif: { alignItems: 'center', paddingVertical: 40 },
  notifItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  notifDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6, backgroundColor: 'transparent' },
  notifItemTitle: { fontSize: 14, fontWeight: '700' },
  notifItemMsg: { fontSize: 12, marginTop: 2 },
  notifTime: { fontSize: 11, marginTop: 4 },
});
