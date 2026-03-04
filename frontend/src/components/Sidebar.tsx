import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions } from 'react-native';
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

type MenuGroup = {
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  roles?: string[];
  children: MenuItem[];
};

const mainMenuItems: MenuItem[] = [
  { label: 'Tableau de bord', path: '/(app)', icon: 'dashboard' },
  { label: 'Feuilles de temps', path: '/(app)/timesheets', icon: 'schedule' },
  { label: 'Projets', path: '/(app)/projects', icon: 'folder-open' },
  { label: 'Planning', path: '/(app)/planning', icon: 'calendar-today' },
  { label: 'Absences', path: '/(app)/leaves', icon: 'event-busy' },
  { label: 'Notes de frais', path: '/(app)/expenses', icon: 'receipt-long' },
  { label: 'Annuaire', path: '/(app)/directory', icon: 'contacts' },
  { label: 'Dossier RH', path: '/(app)/documents', icon: 'folder-shared' },
  { label: 'Rapports', path: '/(app)/reports', icon: 'assessment' },
  { label: 'Analytique', path: '/(app)/analytics', icon: 'insights', roles: ['admin', 'manager'] },
  { label: 'Factures', path: '/(app)/invoices', icon: 'receipt', roles: ['admin', 'manager'] },
  { label: 'Paie', path: '/(app)/payroll', icon: 'account-balance', roles: ['admin', 'manager'] },
];

const settingsGroup: MenuGroup = {
  label: 'Parametres',
  icon: 'settings',
  roles: ['admin', 'manager'],
  children: [
    { label: 'Utilisateurs', path: '/(app)/users', icon: 'people', roles: ['admin', 'manager'] },
    { label: 'Departements', path: '/(app)/departments', icon: 'business', roles: ['admin'] },
    { label: 'Clients', path: '/(app)/clients', icon: 'group-work', roles: ['admin', 'manager'] },
    { label: 'Activites', path: '/(app)/activities', icon: 'local-activity', roles: ['admin', 'manager'] },
    { label: 'Abonnement', path: '/(app)/subscriptions', icon: 'card-membership', roles: ['admin'] },
    { label: 'Journal d\'audit', path: '/(app)/audit', icon: 'history', roles: ['admin'] },
  ],
};

const SIDEBAR_EXPANDED = 240;
const SIDEBAR_COLLAPSED = 68;

export const Sidebar = () => {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const screenWidth = Dimensions.get('window').width;
  const [expanded, setExpanded] = useState(screenWidth > 900);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const canSee = (item: { roles?: string[] }) => {
    if (!item.roles) return true;
    return user && item.roles.includes(user.role);
  };

  const filteredMain = mainMenuItems.filter(canSee);
  const filteredSettings = settingsGroup.children.filter(canSee);
  const showSettings = canSee(settingsGroup) && filteredSettings.length > 0;

  const isActive = (path: string) => {
    if (path === '/(app)') return pathname === '/' || pathname === '/(app)' || pathname === '';
    return pathname === path.replace('/(app)', '');
  };

  const isSettingsActive = filteredSettings.some(c => isActive(c.path));

  const sidebarWidth = expanded ? SIDEBAR_EXPANDED : SIDEBAR_COLLAPSED;

  return (
    <View style={[styles.container, { width: sidebarWidth }]}>
      {/* Toggle + Logo */}
      <View style={styles.topSection}>
        <TouchableOpacity style={styles.toggleBtn} onPress={() => setExpanded(!expanded)} data-testid="sidebar-toggle">
          <MaterialIcons name={expanded ? 'chevron-left' : 'menu'} size={24} color="#FFF" />
        </TouchableOpacity>
        {expanded && (
          <View style={styles.logoArea}>
            <View style={styles.logoIcon}><Text style={styles.logoText}>TS</Text></View>
            <Text style={styles.appName}>TimeSheet</Text>
          </View>
        )}
        {!expanded && (
          <View style={styles.logoIconSmall}><Text style={styles.logoTextSmall}>TS</Text></View>
        )}
      </View>

      {/* Menu */}
      <ScrollView style={styles.menuSection} showsVerticalScrollIndicator={false}>
        {filteredMain.map((item) => {
          const active = isActive(item.path);
          return (
            <TouchableOpacity
              key={item.path}
              style={[styles.menuItem, active && styles.menuItemActive, !expanded && styles.menuItemCollapsed]}
              onPress={() => router.push(item.path as any)}
              data-testid={`sidebar-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <MaterialIcons name={item.icon} size={22} color={active ? '#FFF' : colors.sidebarText} />
              {expanded && <Text style={[styles.menuLabel, active && styles.menuLabelActive]}>{item.label}</Text>}
            </TouchableOpacity>
          );
        })}

        {/* Parametres group */}
        {showSettings && (
          <>
            <TouchableOpacity
              style={[
                styles.menuItem,
                isSettingsActive && !settingsOpen && styles.menuItemActive,
                !expanded && styles.menuItemCollapsed,
                { marginTop: spacing.sm },
              ]}
              onPress={() => {
                if (expanded) {
                  setSettingsOpen(!settingsOpen);
                } else {
                  setExpanded(true);
                  setSettingsOpen(true);
                }
              }}
              data-testid="sidebar-parametres"
            >
              <MaterialIcons name="settings" size={22} color={isSettingsActive ? '#FFF' : colors.sidebarText} />
              {expanded && (
                <>
                  <Text style={[styles.menuLabel, isSettingsActive && styles.menuLabelActive, { flex: 1 }]}>
                    Parametres
                  </Text>
                  <MaterialIcons
                    name={settingsOpen ? 'expand-less' : 'expand-more'}
                    size={20}
                    color={colors.sidebarText}
                  />
                </>
              )}
            </TouchableOpacity>

            {expanded && settingsOpen && (
              <View style={styles.subMenu}>
                {filteredSettings.map((child) => {
                  const active = isActive(child.path);
                  return (
                    <TouchableOpacity
                      key={child.path}
                      style={[styles.subMenuItem, active && styles.subMenuItemActive]}
                      onPress={() => router.push(child.path as any)}
                      data-testid={`sidebar-${child.label.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <MaterialIcons name={child.icon} size={18} color={active ? '#FFF' : colors.sidebarText} />
                      <Text style={[styles.subMenuLabel, active && styles.subMenuLabelActive]}>
                        {child.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* User */}
      <View style={[styles.userSection, !expanded && styles.userSectionCollapsed]}>
        <TouchableOpacity
          style={[styles.userAvatar, !expanded && { marginRight: 0 }]}
          onPress={() => { if (!expanded) setExpanded(true); }}
        >
          <Text style={styles.userAvatarText}>{user?.first_name?.[0]}{user?.last_name?.[0]}</Text>
        </TouchableOpacity>
        {expanded && (
          <>
            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>{user?.first_name} {user?.last_name}</Text>
              <Text style={styles.userRole}>{user?.role === 'admin' ? 'Admin' : user?.role === 'manager' ? 'Manager' : 'Employe'}</Text>
            </View>
            <TouchableOpacity onPress={logout} style={styles.logoutBtn} data-testid="sidebar-logout">
              <MaterialIcons name="logout" size={20} color={colors.sidebarText} />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.sidebarBg,
    paddingVertical: spacing.md,
    justifyContent: 'space-between',
  },
  topSection: {
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
  },
  toggleBtn: {
    width: 40, height: 40, borderRadius: borderRadius.sm,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end', marginBottom: spacing.sm,
  },
  logoArea: {
    alignItems: 'center', paddingBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  logoIcon: {
    width: 42, height: 42, borderRadius: borderRadius.md,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs,
  },
  logoText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  appName: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  logoIconSmall: {
    width: 38, height: 38, borderRadius: borderRadius.sm,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: spacing.sm,
  },
  logoTextSmall: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  menuSection: { flex: 1, paddingHorizontal: spacing.xs },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 11, paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm, marginBottom: 2,
  },
  menuItemActive: { backgroundColor: colors.primary },
  menuItemCollapsed: { justifyContent: 'center', paddingHorizontal: 0 },
  menuLabel: { color: colors.sidebarText, fontSize: 13, marginLeft: spacing.sm },
  menuLabelActive: { color: '#FFF', fontWeight: '600' },
  subMenu: {
    marginLeft: spacing.md,
    paddingLeft: spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(255,255,255,0.1)',
    marginBottom: spacing.xs,
  },
  subMenuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 9, paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm, marginBottom: 1,
  },
  subMenuItemActive: { backgroundColor: colors.primary },
  subMenuLabel: { color: colors.sidebarText, fontSize: 12, marginLeft: spacing.sm },
  subMenuLabelActive: { color: '#FFF', fontWeight: '600' },
  userSection: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.sm, paddingTop: spacing.md,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
  },
  userSectionCollapsed: { justifyContent: 'center', paddingHorizontal: 0 },
  userAvatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm,
  },
  userAvatarText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  userInfo: { flex: 1 },
  userName: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  userRole: { color: colors.sidebarText, fontSize: 10 },
  logoutBtn: { padding: spacing.xs },
});
