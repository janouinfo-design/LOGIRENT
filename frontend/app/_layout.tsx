import React, { useEffect } from 'react';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../src/store/authStore';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Image, useWindowDimensions, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { I18nProvider, useI18n } from '../src/i18n';
import { useNotificationStore } from '../src/store/notificationStore';
import { useThemeStore } from '../src/store/themeStore';

const LOGO_URL = 'https://static.prod-images.emergentagent.com/jobs/5f87ba17-413e-4204-98d4-1c8f25a6208a/images/6552fb693c88f79e17c59c43f1efe1446e03b6ddd3093a08b690934bdc28ae75.png';

const navTabs = [
  { name: 'index', route: '/', icon: 'home', iconOutline: 'home-outline', label: 'Accueil' },
  { name: 'vehicles', route: '/vehicles', icon: 'car', iconOutline: 'car-outline', label: 'Véhicules' },
  { name: 'reservations', route: '/reservations', icon: 'calendar', iconOutline: 'calendar-outline', label: 'Locations' },
  { name: 'profile', route: '/profile', icon: 'person', iconOutline: 'person-outline', label: 'Profil' },
];

function TopNavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { unreadCount, notifications, fetchNotifications, fetchUnreadCount, markAsRead, markAllAsRead } = useNotificationStore();
  const { mode, colors: T, toggleTheme } = useThemeStore();
  const { lang, setLang } = useI18n();
  const { width } = useWindowDimensions();
  const isMobile = width < 1024;
  const [showNotifs, setShowNotifs] = React.useState(false);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const isActive = (route: string) => {
    if (route === '/') return pathname === '/' || pathname === '';
    return pathname.startsWith(route);
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
    <View style={[styles.topBar, { backgroundColor: T.navBg, borderBottomColor: T.navBorder }]}>
      <View style={styles.logoSection}>
        <Image source={{ uri: LOGO_URL }} style={styles.logo} resizeMode="contain" />
        {!isMobile && <Text style={[styles.logoText, { color: T.text }]}>Logi<Text style={{ color: T.accent }}>Rent</Text></Text>}
      </View>
      <View style={styles.navIcons}>
        {navTabs.map((tab) => {
          const active = isActive(tab.route);
          return (
            <TouchableOpacity
              key={tab.name}
              style={[styles.navItem, active && { backgroundColor: T.accent + '14' }]}
              onPress={() => router.push(tab.route as any)}
              data-testid={`nav-${tab.name}`}
            >
              <Ionicons name={(active ? tab.icon : tab.iconOutline) as any} size={isMobile ? 20 : 22} color={active ? T.accent : T.textLight} />
              {!isMobile && <Text style={[styles.navLabel, { color: active ? T.accent : T.textLight }, active && { fontWeight: '600' }]}>{tab.label}</Text>}
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.rightSection}>
        <TouchableOpacity style={styles.iconBtn} onPress={toggleTheme} data-testid="client-theme-toggle">
          <Ionicons name={mode === 'dark' ? 'sunny' : 'moon'} size={18} color={T.textLight} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={() => { fetchNotifications(); setShowNotifs(true); }} data-testid="notification-bell">
          <Ionicons name="notifications-outline" size={18} color={T.textLight} />
          {unreadCount > 0 && (
            <View style={styles.badge} data-testid="client-notif-badge"><Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text></View>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.langBtn, lang === 'fr' && { opacity: 1, backgroundColor: T.accent + '18' }]} onPress={() => setLang('fr')} data-testid="lang-fr">
          <Text style={[styles.langFlag, { color: T.text }]}>FR</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.langBtn, lang === 'en' && { opacity: 1, backgroundColor: T.accent + '18' }]} onPress={() => setLang('en')} data-testid="lang-en">
          <Text style={[styles.langFlag, { color: T.text }]}>EN</Text>
        </TouchableOpacity>
      </View>

      {/* Notification Panel Modal */}
      {showNotifs && (
        <View style={styles.notifOverlay}>
          <TouchableOpacity style={styles.notifBackdrop} onPress={() => setShowNotifs(false)} />
          <View style={[styles.notifDropdown, { backgroundColor: T.card, borderColor: T.border }]}>
            <View style={[styles.notifHeader, { borderBottomColor: T.border }]}>
              <Text style={[styles.notifTitle, { color: T.text }]}>Notifications</Text>
              {unreadCount > 0 && (
                <TouchableOpacity onPress={markAllAsRead}><Text style={{ color: T.accent, fontSize: 12 }}>Tout lire</Text></TouchableOpacity>
              )}
            </View>
            {notifications.length === 0 ? (
              <View style={styles.notifEmpty}><Text style={{ color: T.textLight }}>Aucune notification</Text></View>
            ) : (
              notifications.slice(0, 10).map(n => (
                <TouchableOpacity key={n.id} style={[styles.notifItem, { borderBottomColor: T.border }, !n.read && { backgroundColor: T.accent + '08' }]} onPress={() => { if (!n.read) markAsRead(n.id); }}>
                  <View style={[styles.notifDot, !n.read && { backgroundColor: T.accent }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.notifItemTitle, { color: T.text }]}>{n.title}</Text>
                    <Text style={[styles.notifItemMsg, { color: T.textLight }]}>{n.message}</Text>
                    <Text style={[styles.notifTime, { color: T.textLight }]}>{timeAgo(n.created_at)}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      )}
    </View>
  );
}

function AppContent() {
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuthStore();
  const { colors: T } = useThemeStore();

  const isAdminUser = user?.role === 'admin' || user?.role === 'super_admin';
  const isLanding = pathname === '/' && !isAuthenticated;
  const isAuth = pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.includes('admin-login');
  const showNav = !isLanding && !isAuth && !isAdminUser && isAuthenticated;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.navBg }} edges={['top']}>
      <View style={{ flex: 1, backgroundColor: T.bg }}>
        {showNav && <TopNavBar />}
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: T.bg },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)/login" />
          <Stack.Screen name="(auth)/register" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="vehicle/[id]" />
          <Stack.Screen name="booking/[id]" />
          <Stack.Screen name="payment-success" />
          <Stack.Screen name="payment-cancel" />
        </Stack>
      </View>
    </SafeAreaView>
  );
}

export default function RootLayout() {
  const { loadUser, isLoading } = useAuthStore();
  const { loadTheme } = useThemeStore();

  useEffect(() => {
    const init = async () => {
      // Handle impersonation: check for ?imp_token= in URL query params
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const impToken = params.get('imp_token');
        if (impToken) {
          // Store imp token as the main token before loadUser reads it
          const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
          const axiosModule = (await import('axios')).default;
          await AsyncStorage.setItem('token', impToken);
          axiosModule.defaults.headers.common['Authorization'] = `Bearer ${impToken}`;
          // Clean URL (remove query param)
          window.history.replaceState(null, '', window.location.pathname);
        }
      }
      await loadUser();
      loadTheme();
    };
    init();
  }, []);

  if (isLoading) {
    return <View style={styles.loadingBox}><ActivityIndicator size="large" color="#7C3AED" /></View>;
  }

  return (
    <I18nProvider>
      <StatusBar style="auto" />
      <AppContent />
    </I18nProvider>
  );
}

const styles = StyleSheet.create({
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAFA' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 4, paddingBottom: 6, borderBottomWidth: 1, gap: 4, ...(Platform.OS === 'web' ? { position: 'sticky' as any, top: 0, zIndex: 100 } : {}) },
  logoSection: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  logo: { width: 24, height: 24 },
  logoText: { fontSize: 16, fontWeight: '800' },
  navIcons: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 2 },
  navItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, gap: 4 },
  navLabel: { fontSize: 13, fontWeight: '500' },
  rightSection: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconBtn: { position: 'relative', padding: 6 },
  badge: { position: 'absolute', top: 2, right: 2, backgroundColor: '#EF4444', borderRadius: 7, minWidth: 14, height: 14, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  badgeText: { color: '#FFF', fontSize: 8, fontWeight: '700' },
  langBtn: { paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6, opacity: 0.5 },
  langFlag: { fontSize: 16 },
  notifOverlay: { position: 'absolute' as any, top: '100%', right: 0, zIndex: 1000 },
  notifBackdrop: { position: 'fixed' as any, top: 0, left: 0, right: 0, bottom: 0 },
  notifDropdown: { position: 'absolute' as any, right: 8, top: 4, width: 340, borderRadius: 12, borderWidth: 1, maxHeight: 400, overflow: 'hidden' as any },
  notifHeader: { flexDirection: 'row' as any, justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1 },
  notifTitle: { fontSize: 15, fontWeight: '700' as any },
  notifEmpty: { padding: 24, alignItems: 'center' as any },
  notifItem: { flexDirection: 'row' as any, alignItems: 'flex-start' as any, gap: 8, padding: 10, borderBottomWidth: 1 },
  notifDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5, backgroundColor: 'transparent' },
  notifItemTitle: { fontSize: 13, fontWeight: '700' as any },
  notifItemMsg: { fontSize: 12, marginTop: 2 },
  notifTime: { fontSize: 11, marginTop: 3 },
});
