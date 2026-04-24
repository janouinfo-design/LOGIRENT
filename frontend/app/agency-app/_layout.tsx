import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Modal, FlatList, ScrollView, Pressable } from 'react-native';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useAuthStore } from '../../src/store/authStore';
import { useNotificationStore } from '../../src/store/notificationStore';
import { useThemeStore } from '../../src/store/themeStore';
import { usePushNotifications } from '../../src/hooks/usePushNotifications';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const ACCENT = '#7C3AED';

const TAB_MODULE_MAP: Record<string, string> = {
  analytics: 'analytics',
  tracking: 'gps_tracking',
  statistics: 'analytics',
};

type MenuItem = {
  key: string;
  label: string;
  icon: string;
  iconO: string;
  children?: MenuItem[];
};

const MENU_ITEMS: MenuItem[] = [
  { key: 'index', label: 'Accueil', icon: 'home', iconO: 'home-outline' },
  {
    key: 'reservations-group', label: 'Reservations', icon: 'calendar', iconO: 'calendar-outline',
    children: [
      { key: 'reservations', label: 'Toutes les reservations', icon: 'calendar', iconO: 'calendar-outline' },
      { key: 'book', label: 'Nouvelle reservation', icon: 'add-circle', iconO: 'add-circle-outline' },
    ],
  },
  { key: 'vehicles', label: 'Vehicules', icon: 'car', iconO: 'car-outline' },
  { key: 'clients', label: 'Clients', icon: 'people', iconO: 'people-outline' },
  {
    key: 'finance-group', label: 'Finance', icon: 'wallet', iconO: 'wallet-outline',
    children: [
      { key: 'invoices', label: 'Factures', icon: 'receipt', iconO: 'receipt-outline' },
      { key: 'billing-settings', label: 'Parametres facturation', icon: 'settings', iconO: 'settings-outline' },
      { key: 'statistics', label: 'Statistiques', icon: 'stats-chart', iconO: 'stats-chart-outline' },
      { key: 'analytics', label: 'Analytics', icon: 'analytics', iconO: 'analytics-outline' },
    ],
  },
  {
    key: 'outils-group', label: 'Outils', icon: 'construct', iconO: 'construct-outline',
    children: [
      { key: 'documents', label: 'Scan documents', icon: 'scan', iconO: 'scan-outline' },
      { key: 'tracking', label: 'GPS / Tracking', icon: 'navigate', iconO: 'navigate-outline' },
      { key: 'contract-template', label: 'Modele contrat', icon: 'document-text', iconO: 'document-text-outline' },
      { key: 'email-settings', label: 'Configuration Email', icon: 'mail', iconO: 'mail-outline' },
    ],
  },
  { key: 'profile', label: 'Profil', icon: 'person-circle', iconO: 'person-circle-outline' },
];

function DropdownMenu({ item, isActive, onNavigate, C, agencyModules, modulesLoaded, badge }: {
  item: MenuItem; isActive: boolean; onNavigate: (key: string) => void; C: any; agencyModules: Record<string, boolean>; modulesLoaded: boolean; badge?: number;
}) {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  };
  const handleLeave = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 200);
  };

  const visibleChildren = (item.children || []).filter(ch => {
    const moduleKey = TAB_MODULE_MAP[ch.key];
    if (!moduleKey) return true;
    if (!modulesLoaded) return true;
    return agencyModules[moduleKey] !== false;
  });

  if (visibleChildren.length === 0) return null;

  return (
    <View
      style={s.dropdownWrap}
      {...(Platform.OS === 'web' ? { onMouseEnter: handleEnter, onMouseLeave: handleLeave } : {})}
    >
      <TouchableOpacity
        style={[s.menuItem, isActive && s.menuItemActive]}
        onPress={() => Platform.OS !== 'web' ? setOpen(!open) : onNavigate(visibleChildren[0].key)}
        data-testid={`menu-${item.key}`}
      >
        <View style={{ position: 'relative' }}>
          <Ionicons name={(isActive ? item.icon : item.iconO) as any} size={18} color={isActive ? ACCENT : C.textLight} />
          {badge && badge > 0 ? (
            <View style={s.menuBadge} data-testid={`menu-badge-${item.key}`}>
              <Text style={s.menuBadgeText}>{badge > 9 ? '9+' : badge}</Text>
            </View>
          ) : null}
        </View>
        <Text style={[s.menuText, isActive && { color: ACCENT, fontWeight: '700' }]}>{item.label}</Text>
        <Ionicons name="chevron-down" size={12} color={C.textLight} style={{ marginLeft: 2 }} />
      </TouchableOpacity>

      {open && (
        <View
          style={[s.dropdown, { backgroundColor: C.card, borderColor: C.border }]}
          {...(Platform.OS === 'web' ? { onMouseEnter: handleEnter, onMouseLeave: handleLeave } : {})}
        >
          {visibleChildren.map(child => (
            <TouchableOpacity
              key={child.key}
              style={s.dropdownItem}
              onPress={() => { onNavigate(child.key); setOpen(false); }}
              data-testid={`submenu-${child.key}`}
            >
              <Ionicons name={child.iconO as any} size={16} color={C.textLight} />
              <Text style={[s.dropdownText, { color: C.text }]}>{child.label}</Text>
              {child.key === 'reservations' && badge && badge > 0 ? (
                <View style={[s.menuBadge, { position: 'relative', marginLeft: 'auto' }]}>
                  <Text style={s.menuBadgeText}>{badge > 9 ? '9+' : badge}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

export default function AgencyAppLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout, token } = useAuthStore();
  const { unreadCount, notifications, fetchNotifications, fetchUnreadCount, markAsRead, markAllAsRead } = useNotificationStore();
  const { colors: C, loadTheme } = useThemeStore();
  const [showNotifs, setShowNotifs] = useState(false);
  const [agencyModules, setAgencyModules] = useState<Record<string, boolean>>({});
  const [modulesLoaded, setModulesLoaded] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Register for push notifications (mobile only)
  usePushNotifications(isAuthenticated, user?.id);

  useEffect(() => { loadTheme(); }, []);

  useEffect(() => {
    if (isAuthenticated && token) {
      axios.get(`${API_URL}/api/agency-modules`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => { setAgencyModules(res.data.modules || {}); setModulesLoaded(true); })
        .catch(() => { setAgencyModules({}); setModulesLoaded(true); });
    }
  }, [isAuthenticated, token]);

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

  // Fetch pending reservations count for menu badge
  useEffect(() => {
    if (!isAuthenticated || !token) return;
    const fetchPending = () => {
      axios.get(`${API_URL}/api/admin/stats`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => {
          const byStatus = res.data?.reservations_by_status || {};
          setPendingCount((byStatus.pending || 0) + (byStatus.pending_cash || 0));
        })
        .catch(() => setPendingCount(0));
    };
    fetchPending();
    const interval = setInterval(fetchPending, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, token, pathname]);

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

  const isTabActive = (key: string) => {
    if (key === 'index') return pathname === '/' || pathname === '' || pathname === '/agency-app';
    return pathname.includes(key);
  };

  const isGroupActive = (item: MenuItem): boolean => {
    if (item.children) return item.children.some(ch => isTabActive(ch.key));
    return isTabActive(item.key);
  };

  const navigateTo = (key: string) => {
    router.push(key === 'index' ? '/agency-app' as any : `/agency-app/${key}` as any);
  };

  const isItemVisible = (item: MenuItem): boolean => {
    const moduleKey = TAB_MODULE_MAP[item.key];
    if (!moduleKey) return true;
    if (!modulesLoaded) return true;
    return agencyModules[moduleKey] !== false;
  };

  return (
    <View style={[s.container, { backgroundColor: C.bg }]}>
      {/* Header with grouped menu */}
      <View style={[s.header, { backgroundColor: C.navBg, borderBottomColor: C.navBorder }]}>
        <View style={s.headerInner}>
          {/* Logo */}
          <View style={s.logoArea}>
            <Ionicons name="car-sport" size={22} color={ACCENT} />
            <Text style={[s.logoText, { color: C.text }]}>LogiRent</Text>
            <View style={[s.agencyBadge, { backgroundColor: ACCENT + '15' }]}>
              <Text style={[s.agencyBadgeText, { color: ACCENT }]}>{user.agency_name || 'Agence'}</Text>
            </View>
          </View>

          {/* Menu Items */}
          <View style={s.menuRow}>
            {MENU_ITEMS.map(item => {
              if (item.children) {
                return (
                  <DropdownMenu
                    key={item.key}
                    item={item}
                    isActive={isGroupActive(item)}
                    onNavigate={navigateTo}
                    C={C}
                    agencyModules={agencyModules}
                    modulesLoaded={modulesLoaded}
                    badge={item.key === 'reservations-group' ? pendingCount : 0}
                  />
                );
              }

              if (!isItemVisible(item)) return null;
              const active = isTabActive(item.key);

              return (
                <TouchableOpacity
                  key={item.key}
                  style={[s.menuItem, active && s.menuItemActive]}
                  onPress={() => navigateTo(item.key)}
                  data-testid={`menu-${item.key}`}
                >
                  <Ionicons name={(active ? item.icon : item.iconO) as any} size={18} color={active ? ACCENT : C.textLight} />
                  <Text style={[s.menuText, active && { color: ACCENT, fontWeight: '700' }]}>{item.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Right actions */}
          <View style={s.rightActions}>
            <TouchableOpacity onPress={() => { fetchNotifications(); setShowNotifs(true); }} style={s.iconBtn} data-testid="agency-notification-bell">
              <Ionicons name="notifications" size={20} color={C.textLight} />
              {unreadCount > 0 && (
                <View style={s.notifBadge}><Text style={s.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text></View>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { logout(); router.replace('/admin-login'); }} style={s.iconBtn} data-testid="agency-logout-btn">
              <Ionicons name="log-out-outline" size={20} color={C.textLight} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Tab Content */}
      <View style={{ flex: 1 }}>
        <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}>
          <Tabs.Screen name="index" options={{ title: 'Accueil' }} />
          <Tabs.Screen name="book" options={{ title: 'Reserver' }} />
          <Tabs.Screen name="reservations" options={{ title: 'Reservations' }} />
          <Tabs.Screen name="vehicles" options={{ title: 'Vehicules' }} />
          <Tabs.Screen name="statistics" options={{ title: 'Stats' }} />
          <Tabs.Screen name="analytics" options={{ title: 'Analytics' }} />
          <Tabs.Screen name="tracking" options={{ title: 'GPS' }} />
          <Tabs.Screen name="clients" options={{ title: 'Clients' }} />
          <Tabs.Screen name="invoices" options={{ title: 'Factures' }} />
          <Tabs.Screen name="documents" options={{ title: 'Documents' }} />
          <Tabs.Screen name="billing-settings" options={{ title: 'Facturation' }} />
          <Tabs.Screen name="contract-template" options={{ title: 'Modele' }} />
          <Tabs.Screen name="email-settings" options={{ title: 'Email' }} />
          <Tabs.Screen name="profile" options={{ title: 'Profil' }} />
          <Tabs.Screen name="vehicle-detail" options={{ title: 'Detail', href: null }} />
          <Tabs.Screen name="complete-contract" options={{ title: 'Contrat', href: null }} />
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
                  <TouchableOpacity onPress={markAllAsRead}><Text style={{ color: ACCENT, fontSize: 13 }}>Tout lire</Text></TouchableOpacity>
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
                  style={[s.notifItem, { borderBottomColor: C.border }, !item.read && { backgroundColor: ACCENT + '08' }]}
                  onPress={() => { if (!item.read) markAsRead(item.id); }}
                >
                  <View style={[s.notifDot, !item.read && { backgroundColor: ACCENT }]} />
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
  header: {
    borderBottomWidth: 1,
    ...(Platform.OS === 'web' ? { position: 'sticky' as any, top: 0, zIndex: 1000 } : {}),
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 16,
  },
  logoArea: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoText: { fontSize: 18, fontWeight: '900' },
  agencyBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  agencyBadgeText: { fontSize: 11, fontWeight: '700' },
  menuRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    justifyContent: 'center',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  menuItemActive: {
    backgroundColor: ACCENT + '10',
  },
  menuText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  dropdownWrap: {
    position: 'relative' as any,
    ...(Platform.OS === 'web' ? { zIndex: 1001 } : {}),
  },
  dropdown: {
    position: 'absolute' as any,
    top: '100%',
    left: 0,
    minWidth: 220,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 6,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
      zIndex: 1002,
    } : {
      elevation: 8,
    }),
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dropdownText: {
    fontSize: 14,
    fontWeight: '500',
  },
  rightActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBtn: { position: 'relative' as any, padding: 6 },
  notifBadge: { position: 'absolute', top: 0, right: 0, backgroundColor: '#EF4444', borderRadius: 9, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  notifBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
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
  menuBadge: { position: 'absolute' as any, top: -6, right: -10, backgroundColor: '#EF4444', borderRadius: 9, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: '#fff' },
  menuBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
});
