import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors, fontSize, spacing, borderRadius } from '../theme/constants';
import { usePathname } from 'expo-router';
import { router } from 'expo-router';

type MenuItem = {
  label: string;
  path: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  roles?: string[];
};

const menuItems: MenuItem[] = [
  { label: 'Tableau de bord', path: '/(app)', icon: 'dashboard' },
  { label: 'Feuilles de temps', path: '/(app)/timesheets', icon: 'schedule' },
  { label: 'Projets', path: '/(app)/projects', icon: 'folder-open' },
  { label: 'Absences', path: '/(app)/leaves', icon: 'event-busy' },
  { label: 'Utilisateurs', path: '/(app)/users', icon: 'people', roles: ['admin', 'manager'] },
  { label: 'Départements', path: '/(app)/departments', icon: 'business', roles: ['admin'] },
  { label: 'Clients', path: '/(app)/clients', icon: 'contacts', roles: ['admin', 'manager'] },
  { label: 'Activités', path: '/(app)/activities', icon: 'local-activity', roles: ['admin', 'manager'] },
  { label: 'Profil', path: '/(app)/profile', icon: 'person' },
];

export const Sidebar = () => {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const filteredItems = menuItems.filter((item) => {
    if (!item.roles) return true;
    return user && item.roles.includes(user.role);
  });

  const isActive = (path: string) => {
    if (path === '/(app)') return pathname === '/' || pathname === '/(app)' || pathname === '';
    return pathname === path.replace('/(app)', '');
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoSection}>
        <View style={styles.logoIcon}>
          <Text style={styles.logoText}>TS</Text>
        </View>
        <Text style={styles.appName}>TimeSheet</Text>
        <Text style={styles.appSubtitle}>Gestion du temps</Text>
      </View>

      <ScrollView style={styles.menuSection} showsVerticalScrollIndicator={false}>
        {filteredItems.map((item) => (
          <TouchableOpacity
            key={item.path}
            style={[styles.menuItem, isActive(item.path) && styles.menuItemActive]}
            onPress={() => router.push(item.path as any)}
            data-testid={`sidebar-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <MaterialIcons
              name={item.icon}
              size={20}
              color={isActive(item.path) ? colors.primary : colors.sidebarText}
            />
            <Text style={[styles.menuLabel, isActive(item.path) && styles.menuLabelActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.userSection}>
        <View style={styles.userAvatar}>
          <Text style={styles.userAvatarText}>
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>
            {user?.first_name} {user?.last_name}
          </Text>
          <Text style={styles.userRole}>
            {user?.role === 'admin' ? 'Administrateur' : user?.role === 'manager' ? 'Manager' : 'Employé'}
          </Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn} data-testid="sidebar-logout">
          <MaterialIcons name="logout" size={20} color={colors.sidebarText} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 260,
    backgroundColor: colors.sidebarBg,
    paddingVertical: spacing.lg,
    justifyContent: 'space-between',
  },
  logoSection: {
    alignItems: 'center',
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: spacing.md,
  },
  logoIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  logoText: {
    color: '#FFF',
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  appName: {
    color: '#FFF',
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  appSubtitle: {
    color: colors.sidebarText,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  menuSection: {
    flex: 1,
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    marginBottom: 2,
  },
  menuItemActive: {
    backgroundColor: 'rgba(37,99,235,0.15)',
  },
  menuLabel: {
    color: colors.sidebarText,
    fontSize: fontSize.sm,
    marginLeft: spacing.sm,
  },
  menuLabelActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: spacing.sm,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    color: '#FFF',
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  userName: {
    color: '#FFF',
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  userRole: {
    color: colors.sidebarText,
    fontSize: fontSize.xs,
  },
  logoutBtn: {
    padding: spacing.sm,
  },
});
