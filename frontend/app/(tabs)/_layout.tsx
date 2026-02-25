import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Tabs, usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useNotificationStore } from '../../src/store/notificationStore';
import { useI18n } from '../../src/i18n';

const LOGO_URL = 'https://static.prod-images.emergentagent.com/jobs/5f87ba17-413e-4204-98d4-1c8f25a6208a/images/6552fb693c88f79e17c59c43f1efe1446e03b6ddd3093a08b690934bdc28ae75.png';

const C = {
  purple: '#7C3AED',
  purpleDark: '#5B21B6',
  gray: '#9CA3AF',
  dark: '#1A1A2E',
  bg: '#FAFAFA',
  white: '#FFFFFF',
  border: '#E5E7EB',
};

const tabs = [
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

  const isActive = (route: string) => {
    if (route === '/') return pathname === '/' || pathname === '';
    return pathname.startsWith(route);
  };

  return (
    <View style={styles.topBar}>
      {/* Logo */}
      <View style={styles.logoSection}>
        <Image source={{ uri: LOGO_URL }} style={styles.logo} resizeMode="contain" />
        <Text style={styles.logoText}>Logi<Text style={{ color: C.purple }}>Rent</Text></Text>
      </View>

      {/* Nav Icons - centered */}
      <View style={styles.navIcons}>
        {tabs.map((tab) => {
          const active = isActive(tab.route);
          return (
            <TouchableOpacity
              key={tab.name}
              style={[styles.navItem, active && styles.navItemActive]}
              onPress={() => router.push(tab.route as any)}
              data-testid={`nav-${tab.name}`}
            >
              <Ionicons
                name={(active ? tab.icon : tab.iconOutline) as any}
                size={22}
                color={active ? C.purple : C.gray}
              />
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Right: Notifications + Language */}
      <View style={styles.rightSection}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.push('/(tabs)/reservations')}
          data-testid="notification-bell"
        >
          <Ionicons name="notifications-outline" size={20} color={C.dark} />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.langBtn, lang === 'fr' && styles.langBtnActive]}
          onPress={() => setLang('fr')}
          data-testid="lang-fr"
        >
          <Text style={styles.langFlag}>🇫🇷</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.langBtn, lang === 'en' && styles.langBtnActive]}
          onPress={() => setLang('en')}
          data-testid="lang-en"
        >
          <Text style={styles.langFlag}>🇬🇧</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TopNavBar />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Accueil' }} />
        <Tabs.Screen name="vehicles" options={{ title: 'Véhicules' }} />
        <Tabs.Screen name="reservations" options={{ title: 'Locations' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profil' }} />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 8,
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logo: {
    width: 28,
    height: 28,
  },
  logoText: {
    fontSize: 18,
    fontWeight: '800',
    color: C.dark,
  },
  navIcons: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  navItemActive: {
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
  },
  navLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: C.gray,
  },
  navLabelActive: {
    color: C.purple,
    fontWeight: '600',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    position: 'relative',
    padding: 6,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#EF4444',
    borderRadius: 7,
    minWidth: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: '700',
  },
  langBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    opacity: 0.5,
  },
  langBtnActive: {
    opacity: 1,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
  },
  langFlag: {
    fontSize: 16,
  },
});
