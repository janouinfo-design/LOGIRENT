import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../../src/theme/constants';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../../src/services/api';

const TYPE_ICONS: Record<string, { icon: string; color: string }> = {
  success: { icon: 'check-circle', color: '#059669' },
  error: { icon: 'cancel', color: '#DC2626' },
  info: { icon: 'info', color: '#2563EB' },
  warning: { icon: 'warning', color: '#F59E0B' },
};

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getNotifications().then(r => setNotifications(r.data)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleMarkAll = async () => {
    await markAllNotificationsRead();
    load();
  };

  const handleRead = async (id: string) => {
    await markNotificationRead(id);
    load();
  };

  const unread = notifications.filter(n => !n.read).length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Notifications</Text>
          {unread > 0 && <Text style={styles.unreadCount}>{unread} non lue{unread > 1 ? 's' : ''}</Text>}
        </View>
        {unread > 0 && (
          <Pressable style={styles.markAllBtn} onPress={handleMarkAll}>
            <MaterialIcons name="done-all" size={18} color="#FFF" />
            <Text style={styles.markAllText}>Tout marquer lu</Text>
          </Pressable>
        )}
      </View>

      {loading ? <ActivityIndicator size="large" color={colors.primary} /> : notifications.length === 0 ? (
        <View style={styles.empty}><MaterialIcons name="notifications-none" size={48} color={colors.borderLight} /><Text style={styles.emptyText}>Aucune notification</Text></View>
      ) : (
        notifications.map(n => {
          const cfg = TYPE_ICONS[n.type] || TYPE_ICONS.info;
          return (
            <Pressable key={n.id} style={[styles.card, !n.read && styles.cardUnread]} onPress={() => !n.read && handleRead(n.id)}>
              <View style={[styles.iconBox, { backgroundColor: cfg.color + '18' }]}>
                <MaterialIcons name={cfg.icon as any} size={22} color={cfg.color} />
              </View>
              <View style={styles.cardContent}>
                <Text style={[styles.cardTitle, !n.read && styles.cardTitleUnread]}>{n.title}</Text>
                <Text style={styles.cardMsg}>{n.message}</Text>
                <Text style={styles.cardTime}>{new Date(n.created_at).toLocaleString('fr-CH')}</Text>
              </View>
              {!n.read && <View style={styles.unreadDot} />}
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  unreadCount: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600' },
  markAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: borderRadius.sm },
  markAllText: { color: '#FFF', fontSize: fontSize.sm, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: spacing.sm },
  emptyText: { color: colors.textLight, fontSize: fontSize.md },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  cardUnread: { backgroundColor: '#F0F4FF', borderColor: colors.primary + '44' },
  iconBox: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  cardTitleUnread: { fontWeight: '800' },
  cardMsg: { fontSize: fontSize.xs, color: colors.textLight, marginTop: 2 },
  cardTime: { fontSize: 10, color: colors.textLight, marginTop: 4 },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
});
