import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useNotificationStore, Notification } from '../../src/store/notificationStore';
import { ClientNavBar } from '../../src/components/ClientNavBar';

const ICON_MAP: Record<string, string> = {
  'checkmark-circle': 'checkmark-circle',
  'close-circle': 'close-circle',
  'car': 'car',
  'flag': 'flag',
  'cash': 'cash',
  'checkmark-done-circle': 'checkmark-done-circle',
  'calendar': 'calendar',
  'calendar-outline': 'calendar-outline',
  'alarm': 'alarm',
  'link': 'link',
  'warning': 'warning',
  'refresh-circle': 'refresh-circle',
  'chatbubble': 'chatbubble',
  'notifications': 'notifications',
};

const TYPE_COLORS: Record<string, string> = {
  'reservation_confirmed': '#10B981',
  'reservation_active': '#3B82F6',
  'reservation_completed': '#6366F1',
  'reservation_cancelled': '#EF4444',
  'payment_success': '#10B981',
  'payment_received': '#10B981',
  'new_reservation': '#7C3AED',
  'reservation_created': '#7C3AED',
  'reservation_reminder': '#F59E0B',
  'client_cancelled': '#EF4444',
  'late_return': '#EF4444',
  'status_changed': '#3B82F6',
  'new_message': '#7C3AED',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "A l'instant";
  if (mins < 60) return `Il y a ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Il y a ${days}j`;
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

function NotificationItem({ item, onPress, onDelete }: { item: Notification; onPress: () => void; onDelete: () => void }) {
  const color = TYPE_COLORS[item.type] || '#6B7280';
  const iconName = ICON_MAP[item.icon || ''] || 'notifications';

  return (
    <TouchableOpacity
      style={[s.notifItem, !item.read && s.notifUnread]}
      onPress={onPress}
      data-testid={`notification-item-${item.id}`}
    >
      <View style={[s.iconWrap, { backgroundColor: color + '15' }]}>
        <Ionicons name={iconName as any} size={20} color={color} />
      </View>
      <View style={s.notifContent}>
        <View style={s.notifTopRow}>
          <Text style={[s.notifTitle, !item.read && s.notifTitleUnread]} numberOfLines={1}>{item.title}</Text>
          <Text style={s.notifTime}>{timeAgo(item.created_at)}</Text>
        </View>
        <Text style={s.notifMsg} numberOfLines={2}>{item.message}</Text>
      </View>
      <TouchableOpacity
        style={s.deleteBtn}
        onPress={(e) => { e.stopPropagation(); onDelete(); }}
        data-testid={`delete-notification-${item.id}`}
      >
        <Ionicons name="trash-outline" size={16} color="#9CA3AF" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const {
    notifications, unreadCount, isLoading,
    fetchNotifications, fetchUnreadCount,
    markAsRead, markAllAsRead, deleteNotification
  } = useNotificationStore();
  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    await fetchUnreadCount();
    setRefreshing(false);
  }, []);

  const handleNotifPress = (item: Notification) => {
    if (!item.read) markAsRead(item.id);
    if (item.reservation_id) {
      router.push(`/(tabs)/reservations` as any);
    }
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ClientNavBar />

      <View style={s.header}>
        <View style={s.headerLeft}>
          <Ionicons name="notifications" size={24} color="#7C3AED" />
          <Text style={s.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={s.headerBadge} data-testid="notifications-unread-badge">
              <Text style={s.headerBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead} style={s.markAllBtn} data-testid="mark-all-read-btn">
            <Ionicons name="checkmark-done" size={16} color="#7C3AED" />
            <Text style={s.markAllText}>Tout marquer lu</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={notifications.length === 0 ? s.emptyContainer : s.listContent}
        renderItem={({ item }) => (
          <NotificationItem
            item={item}
            onPress={() => handleNotifPress(item)}
            onDelete={() => deleteNotification(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={s.empty} data-testid="notifications-empty">
            <View style={s.emptyIconWrap}>
              <Ionicons name="notifications-off-outline" size={48} color="#D1D5DB" />
            </View>
            <Text style={s.emptyTitle}>Aucune notification</Text>
            <Text style={s.emptySubtitle}>
              Vos notifications de réservations, paiements et rappels apparaitront ici.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  headerBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  headerBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F3EEFF',
  },
  markAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C3AED',
  },
  listContent: {
    paddingVertical: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  notifUnread: {
    backgroundColor: '#F5F3FF',
    borderLeftWidth: 3,
    borderLeftColor: '#7C3AED',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifContent: {
    flex: 1,
  },
  notifTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  notifTitleUnread: {
    fontWeight: '800',
    color: '#111827',
  },
  notifTime: {
    fontSize: 11,
    color: '#9CA3AF',
    marginLeft: 8,
  },
  notifMsg: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  deleteBtn: {
    padding: 8,
  },
  empty: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
});
