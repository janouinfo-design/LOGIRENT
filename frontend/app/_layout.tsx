import React, { useEffect } from 'react';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../src/store/authStore';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Image, useWindowDimensions, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { I18nProvider, useI18n } from '../src/i18n';
import { useNotificationStore } from '../src/store/notificationStore';

const LOGO_URL = 'https://static.prod-images.emergentagent.com/jobs/5f87ba17-413e-4204-98d4-1c8f25a6208a/images/6552fb693c88f79e17c59c43f1efe1446e03b6ddd3093a08b690934bdc28ae75.png';

const C = {
  purple: '#7C3AED',
  dark: '#1A1A2E',
  gray: '#9CA3AF',
  bg: '#FAFAFA',
  white: '#FFFFFF',
  border: '#E5E7EB',
};

const navTabs = [
  { name: 'index', route: '/', icon: 'home', iconOutline: 'home-outline', label: 'Accueil' },
  { name: 'vehicles', route: '/vehicles', icon: 'car', iconOutline: 'car-outline', label: 'Véhicules' },
  { name: 'reservations', route: '/reservations', icon: 'calendar', iconOutline: 'calendar-outline', label: 'Locations' },
  { name: 'profile', route: '/profile', icon: 'person', iconOutline: 'person-outline', label: 'Profil' },
];

function TopNavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { unreadCount } = useNotificationStore();
  const { lang, setLang } = useI18n();
  const { width } = useWindowDimensions();
  const isMobile = width < 1024;

  const isActive = (route: string) => {
    if (route === '/') return pathname === '/' || pathname === '';
    return pathname.startsWith(route);
  };

  return (
    <View style={styles.topBar}>
      <View style={styles.logoSection}>
        <Image source={{ uri: LOGO_URL }} style={styles.logo} resizeMode="contain" />
        {!isMobile && <Text style={styles.logoText}>Logi<Text style={{ color: C.purple }}>Rent</Text></Text>}
      </View>
      <View style={styles.navIcons}>
        {navTabs.map((tab) => {
          const active = isActive(tab.route);
          return (
            <TouchableOpacity
              key={tab.name}
              style={[styles.navItem, active && styles.navItemActive]}
              onPress={() => router.push(tab.route as any)}
              data-testid={`nav-${tab.name}`}
            >
              <Ionicons name={(active ? tab.icon : tab.iconOutline) as any} size={isMobile ? 20 : 22} color={active ? C.purple : C.gray} />
              {!isMobile && <Text style={[styles.navLabel, active && styles.navLabelActive]}>{tab.label}</Text>}
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.rightSection}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/(tabs)/reservations')} data-testid="notification-bell">
          <Ionicons name="notifications-outline" size={18} color={C.dark} />
          {unreadCount > 0 && (
            <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text></View>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.langBtn, lang === 'fr' && styles.langBtnActive]} onPress={() => setLang('fr')} data-testid="lang-fr">
          <Text style={styles.langFlag}>FR</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.langBtn, lang === 'en' && styles.langBtnActive]} onPress={() => setLang('en')} data-testid="lang-en">
          <Text style={styles.langFlag}>EN</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function AppContent() {
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuthStore();

  // Admin users should never see the client nav bar
  const isAdminUser = user?.role === 'admin' || user?.role === 'super_admin';
  const isLanding = pathname === '/' && !isAuthenticated;
  const isAuth = pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.includes('admin-login');
  const showNav = !isLanding && !isAuth && !isAdminUser && isAuthenticated;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: showNav ? C.white : 'transparent' }} edges={['top']}>
      <View style={{ flex: 1, backgroundColor: showNav ? C.bg : 'transparent' }}>
        {showNav ? <TopNavBar /> : null}
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: 'transparent' },
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

  useEffect(() => { loadUser(); }, []);

  if (isLoading) {
    return <View style={styles.loadingBox}><ActivityIndicator size="large" color={C.purple} /></View>;
  }

  return (
    <I18nProvider>
      <StatusBar style="dark" />
      <AppContent />
    </I18nProvider>
  );
}

const styles = StyleSheet.create({
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, paddingHorizontal: 12, paddingTop: 4, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: C.border, gap: 4 },
  logoSection: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  logo: { width: 24, height: 24 },
  logoText: { fontSize: 16, fontWeight: '800', color: C.dark },
  navIcons: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 2 },
  navItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, gap: 4 },
  navItemActive: { backgroundColor: 'rgba(124, 58, 237, 0.08)' },
  navLabel: { fontSize: 13, fontWeight: '500', color: C.gray },
  navLabelActive: { color: C.purple, fontWeight: '600' },
  rightSection: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconBtn: { position: 'relative', padding: 6 },
  badge: { position: 'absolute', top: 2, right: 2, backgroundColor: '#EF4444', borderRadius: 7, minWidth: 14, height: 14, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  badgeText: { color: '#FFF', fontSize: 8, fontWeight: '700' },
  langBtn: { paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6, opacity: 0.5 },
  langBtnActive: { opacity: 1, backgroundColor: 'rgba(124, 58, 237, 0.1)' },
  langFlag: { fontSize: 16 },
});
