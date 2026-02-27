import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Modal, FlatList, ScrollView } from 'react-native';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useNotificationStore } from '../../src/store/notificationStore';
import { useThemeStore } from '../../src/store/themeStore';

export default function AgencyAppLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { unreadCount, notifications, fetchNotifications, fetchUnreadCount, markAsRead, markAllAsRead } = useNotificationStore();
  const { mode, colors: C, toggleTheme, loadTheme } = useThemeStore();
  const [showNotifs, setShowNotifs] = useState(false);

  useEffect(() => { loadTheme(); }, []);

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/admin-login'); return; }
    if (user?.role !== 'admin') router.replace('/admin-login');
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  if (!isAuthenticated || !user || user.role !== 'admin') return null;

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "A l'instant";
    if (mins < 60) return `Il y a ${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Il y a ${hours}h`;
    return `Il y a ${Math.floor(hours / 24)}j`;
  };

  const TABS = [
    { key: 'index', label: 'Accueil', icon: 'home', iconO: 'home-outline' },
    { key: 'book', label: 'Réserver', icon: 'add-circle', iconO: 'add-circle-outline' },
    { key: 'reservations', label: 'Réservations', icon: 'calendar', iconO: 'calendar-outline' },
    { key: 'vehicles', label: 'Véhicules', icon: 'car', iconO: 'car-outline' },
    { key: 'tracking', label: 'GPS', icon: 'navigate', iconO: 'navigate-outline' },
    { key: 'clients', label: 'Clients', icon: 'people', iconO: 'people-outline' },
  ];

  const isTabActive = (key: string) => {
    if (key === 'index') return pathname === '/' || pathname === '';
    return pathname.includes(key);
  };

  return (
    <View style={[s.container, { backgroundColor: C.bg }]}>
      {/* Sticky Header - MUST be before Tabs */}
      <View style={[s.header, { backgroundColor: C.navBg, borderBottomColor: C.navBorder }]}>
        <View style={s.headerTop}>
          <View style={s.headerLeft}>
            <Ionicons name="car-sport" size={20} color={C.accent} />
            <Text style={[s.title, { color: C.text }]}>LogiRent</Text>
            <View style={[s.badge_agency, { backgroundColor: C.accent + '20' }]}>
              <Text style={[s.badgeText_agency, { color: C.accent }]}>{user.agency_name || 'Agence'}</Text>
            </View>
          </View>
          <View style={s.headerRight}>
            <TouchableOpacity onPress={toggleTheme} style={s.iconBtn} data-testid="agency-theme-toggle">
              <Ionicons name={mode === 'dark' ? 'sunny' : 'moon'} size={20} color={C.textLight} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { fetchNotifications(); setShowNotifs(true); }} style={s.iconBtn} data-testid="agency-notification-bell">
              <Ionicons name="notifications" size={20} color={C.textLight} />
              {unreadCount > 0 && (
                <View style={s.notifBadge} data-testid="agency-notif-badge"><Text style={s.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text></View>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { logout(); router.replace('/admin-login'); }} style={s.iconBtn} data-testid="agency-logout-btn">
              <Ionicons name="log-out-outline" size={20} color={C.textLight} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={s.tabsRow}>
          {TABS.map(tab => {
            const active = isTabActive(tab.key);
            return (
              <TouchableOpacity
                key={tab.key}
                style={[s.tab, active && { borderBottomColor: C.accent }]}
                onPress={() => router.push(tab.key === 'index' ? '/agency-app' as any : `/agency-app/${tab.key}` as any)}
                data-testid={`agency-tab-${tab.key}`}
              >
                <Ionicons name={(active ? tab.icon : tab.iconO) as any} size={20} color={active ? C.accent : C.textLight} />
                <Text style={[s.tabText, { color: active ? C.accent : C.textLight }]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Tab Content - hidden native tab bar */}
      <View style={{ flex: 1 }}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: { display: 'none' },
          }}
        >
          <Tabs.Screen name="index" options={{ title: 'Accueil' }} />
          <Tabs.Screen name="book" options={{ title: 'Réserver' }} />
          <Tabs.Screen name="reservations" options={{ title: 'Réservations' }} />
          <Tabs.Screen name="vehicles" options={{ title: 'Véhicules' }} />
          <Tabs.Screen name="clients" options={{ title: 'Clients' }} />
        </Tabs>
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

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { borderBottomWidth: 1, ...(Platform.OS === 'web' ? { position: 'sticky' as any, top: 0, zIndex: 100 } : {}) },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  title: { fontSize: 17, fontWeight: '800' },
  badge_agency: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6 },
  badgeText_agency: { fontSize: 11, fontWeight: '700' },
  iconBtn: { position: 'relative' as any, padding: 4 },
  notifBadge: { position: 'absolute', top: -2, right: -4, backgroundColor: '#EF4444', borderRadius: 9, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  notifBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  tabsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 8, paddingBottom: 2 },
  tab: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 2, borderBottomColor: 'transparent', gap: 2 },
  tabText: { fontSize: 11, fontWeight: '600' },
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
