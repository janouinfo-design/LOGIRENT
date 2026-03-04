import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Slot, router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { Sidebar } from '../../src/components/Sidebar';
import { colors, fontSize, spacing, borderRadius } from '../../src/theme/constants';
import { getNotifications } from '../../src/services/api';

export default function AppLayout() {
  const { user, loading, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading]);

  useEffect(() => {
    if (user) {
      getNotifications().then(r => {
        const unread = (r.data || []).filter((n: any) => !n.read).length;
        setUnreadCount(unread);
      }).catch(() => {});
    }
  }, [user]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) return null;

  return (
    <View style={styles.container}>
      <Sidebar />
      <View style={styles.main}>
        {/* Top Header Bar */}
        <View style={styles.topBar}>
          <View style={styles.topBarLeft} />
          <View style={styles.topBarRight}>
            {/* Notifications */}
            <TouchableOpacity
              style={styles.topBarIcon}
              onPress={() => router.push('/(app)/notifications' as any)}
              data-testid="topbar-notifications"
            >
              <MaterialIcons name="notifications-none" size={22} color={colors.text} />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Profile */}
            <TouchableOpacity
              style={styles.profileBtn}
              onPress={() => setShowProfileMenu(!showProfileMenu)}
              data-testid="topbar-profile"
            >
              <View style={styles.profileAvatar}>
                <Text style={styles.profileAvatarText}>
                  {user?.first_name?.[0]}{user?.last_name?.[0]}
                </Text>
              </View>
              <Text style={styles.profileName} numberOfLines={1}>{user?.first_name} {user?.last_name}</Text>
              <MaterialIcons name="keyboard-arrow-down" size={18} color={colors.textLight} />
            </TouchableOpacity>
          </View>

          {/* Profile Dropdown */}
          {showProfileMenu && (
            <View style={styles.dropdown}>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => { setShowProfileMenu(false); router.push('/(app)/profile' as any); }}
                data-testid="dropdown-profile"
              >
                <MaterialIcons name="person" size={18} color={colors.text} />
                <Text style={styles.dropdownText}>Mon profil</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => { setShowProfileMenu(false); router.push('/(app)/notifications' as any); }}
                data-testid="dropdown-notifications"
              >
                <MaterialIcons name="notifications" size={18} color={colors.text} />
                <Text style={styles.dropdownText}>Notifications</Text>
                {unreadCount > 0 && <View style={styles.dropdownBadge}><Text style={styles.dropdownBadgeText}>{unreadCount}</Text></View>}
              </TouchableOpacity>
              <View style={styles.dropdownDivider} />
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => { setShowProfileMenu(false); logout(); }}
                data-testid="dropdown-logout"
              >
                <MaterialIcons name="logout" size={18} color={colors.error} />
                <Text style={[styles.dropdownText, { color: colors.error }]}>Deconnexion</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Page Content */}
        <View style={styles.content}>
          <Slot />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.background,
  },
  main: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    zIndex: 100,
  },
  topBarLeft: {},
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  topBarIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.error,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  profileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  profileAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  profileName: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.text,
    maxWidth: 120,
  },
  dropdown: {
    position: 'absolute',
    top: 50,
    right: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs,
    minWidth: 200,
    zIndex: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  dropdownText: {
    fontSize: fontSize.sm,
    color: colors.text,
    flex: 1,
  },
  dropdownBadge: {
    backgroundColor: colors.error,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  dropdownBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  content: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
