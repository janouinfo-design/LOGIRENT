import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../../src/theme/constants';
import { getNotifications, markNotificationRead, markAllNotificationsRead, updateNotification, deleteNotification } from '../../src/services/api';

const TYPE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  success: { icon: 'check-circle', color: '#059669', label: 'Succes' },
  error: { icon: 'cancel', color: '#DC2626', label: 'Erreur' },
  info: { icon: 'info', color: '#2563EB', label: 'Info' },
  warning: { icon: 'warning', color: '#F59E0B', label: 'Avertissement' },
};

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editNotif, setEditNotif] = useState<any>(null);
  const [editForm, setEditForm] = useState({ title: '', message: '', type: 'info' });

  const load = () => {
    setLoading(true);
    getNotifications().then(r => setNotifications(r.data)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleMarkAll = async () => { await markAllNotificationsRead(); load(); };
  const handleRead = async (id: string) => { await markNotificationRead(id); load(); };
  const handleDelete = async (id: string) => { await deleteNotification(id); load(); };

  const handleEdit = (n: any) => {
    setEditNotif(n);
    setEditForm({ title: n.title, message: n.message, type: n.type || 'info' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editNotif) return;
    try {
      await updateNotification(editNotif.id, editForm);
      setShowModal(false);
      setEditNotif(null);
      load();
    } catch (err: any) { alert(err.response?.data?.detail || 'Erreur'); }
  };

  const unread = notifications.filter(n => !n.read).length;
  const typeFilters = [
    { key: 'all', label: 'Tous' }, { key: 'unread', label: 'Non lues' },
    { key: 'info', label: 'Info' }, { key: 'success', label: 'Succes' },
    { key: 'warning', label: 'Avertissement' }, { key: 'error', label: 'Erreur' },
  ];

  const filtered = notifications.filter(n => {
    const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
    const matchSearch = `${n.title} ${n.message} ${cfg.label}`.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || (filterType === 'unread' ? !n.read : n.type === filterType);
    return matchSearch && matchType;
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title} data-testid="notifications-title">Notifications</Text>
          {unread > 0 && <Text style={styles.unreadCount}>{unread} non lue{unread > 1 ? 's' : ''}</Text>}
        </View>
        {unread > 0 && (
          <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAll} data-testid="mark-all-read">
            <MaterialIcons name="done-all" size={16} color="#FFF" />
            <Text style={styles.markAllText}>Tout marquer lu</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search bar */}
      <View style={styles.searchRow} data-testid="notifications-search-bar">
        <MaterialIcons name="search" size={20} color={colors.textLight} style={{ marginRight: spacing.sm }} />
        <TextInput style={styles.searchInput} placeholder="Rechercher une notification..." value={search} onChangeText={setSearch} placeholderTextColor={colors.textLight} data-testid="notifications-search-input" />
        {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')}><MaterialIcons name="close" size={18} color={colors.textLight} /></TouchableOpacity>}
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {typeFilters.map(f => (
          <TouchableOpacity key={f.key} style={[styles.filterChip, filterType === f.key && styles.filterChipActive]} onPress={() => setFilterType(f.key)} data-testid={`filter-${f.key}`}>
            <Text style={[styles.filterChipText, filterType === f.key && styles.filterChipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} /> : filtered.length === 0 ? (
        <View style={styles.empty}><MaterialIcons name="notifications-none" size={48} color={colors.borderLight} /><Text style={styles.emptyText}>Aucune notification</Text></View>
      ) : (
        <View style={styles.grid}>
          {filtered.map(n => {
            const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
            return (
              <View key={n.id} style={[styles.card, !n.read && styles.cardUnread]} data-testid={`notif-card-${n.id}`}>
                <View style={styles.cardTop}>
                  <View style={[styles.typeIcon, { backgroundColor: cfg.color + '18' }]}>
                    <MaterialIcons name={cfg.icon as any} size={20} color={cfg.color} />
                  </View>
                  <View style={styles.cardTopRight}>
                    {!n.read && <View style={styles.unreadDot} />}
                    <View style={[styles.typeBadge, { backgroundColor: cfg.color + '18' }]}>
                      <Text style={[styles.typeBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                  </View>
                </View>

                <Text style={[styles.cardTitle, !n.read && styles.cardTitleUnread]} numberOfLines={2}>{n.title}</Text>
                <Text style={styles.cardMsg} numberOfLines={3}>{n.message}</Text>

                <View style={styles.cardMeta}>
                  <MaterialIcons name="access-time" size={12} color={colors.textLight} />
                  <Text style={styles.cardTime}>{new Date(n.created_at).toLocaleString('fr-CH')}</Text>
                </View>

                <View style={styles.cardFooter}>
                  <View style={styles.editRow}>
                    <TouchableOpacity style={styles.editBtn} onPress={() => handleEdit(n)} data-testid={`edit-notif-${n.id}`}>
                      <MaterialIcons name="edit" size={14} color={colors.primary} />
                      <Text style={styles.editBtnText}>Modifier</Text>
                    </TouchableOpacity>
                    {!n.read && (
                      <TouchableOpacity onPress={() => handleRead(n.id)} data-testid={`read-notif-${n.id}`}>
                        <MaterialIcons name="visibility" size={16} color="#059669" />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => handleDelete(n.id)} data-testid={`delete-notif-${n.id}`}>
                      <MaterialIcons name="delete-outline" size={16} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Edit Modal */}
      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Modifier la notification</Text>
              <TouchableOpacity onPress={() => { setShowModal(false); setEditNotif(null); }}>
                <MaterialIcons name="close" size={24} color={colors.textLight} />
              </TouchableOpacity>
            </View>
            <Text style={styles.label}>Type</Text>
            <View style={styles.typeRow}>
              {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                <TouchableOpacity key={key} style={[styles.typeBtn, editForm.type === key && { backgroundColor: cfg.color, borderColor: cfg.color }]} onPress={() => setEditForm({ ...editForm, type: key })}>
                  <MaterialIcons name={cfg.icon as any} size={14} color={editForm.type === key ? '#FFF' : cfg.color} />
                  <Text style={[styles.typeBtnText, editForm.type === key && { color: '#FFF', fontWeight: '600' }]}>{cfg.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Titre</Text>
            <TextInput style={styles.input} value={editForm.title} onChangeText={v => setEditForm({ ...editForm, title: v })} placeholderTextColor={colors.textLight} data-testid="edit-notif-title" />
            <Text style={styles.label}>Message</Text>
            <TextInput style={[styles.input, { minHeight: 80 }]} value={editForm.message} onChangeText={v => setEditForm({ ...editForm, message: v })} multiline placeholderTextColor={colors.textLight} data-testid="edit-notif-message" />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowModal(false); setEditNotif(null); }}><Text style={styles.cancelBtnText}>Annuler</Text></TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleSave} data-testid="save-notif"><Text style={styles.submitBtnText}>Sauvegarder</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  unreadCount: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600' },
  markAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: borderRadius.sm },
  markAllText: { color: '#FFF', fontSize: fontSize.sm, fontWeight: '600' },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, marginBottom: spacing.md },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: fontSize.md, color: colors.text },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontSize: fontSize.sm, color: colors.textLight, fontWeight: '500' },
  filterChipTextActive: { color: '#FFF', fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: spacing.sm },
  emptyText: { color: colors.textLight, fontSize: fontSize.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.lg, minWidth: 280, flex: 1, maxWidth: '48%', borderWidth: 1, borderColor: colors.border },
  cardUnread: { backgroundColor: '#F0F4FF', borderColor: colors.primary + '44' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  typeIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  cardTopRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.full },
  typeBadgeText: { fontSize: fontSize.xs, fontWeight: '600' },
  cardTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginBottom: 4 },
  cardTitleUnread: { fontWeight: '800' },
  cardMsg: { fontSize: fontSize.sm, color: colors.textLight, marginBottom: spacing.sm },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.sm },
  cardTime: { fontSize: 10, color: colors.textLight },
  cardFooter: { paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight },
  editRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editBtnText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, width: '90%', maxWidth: 480 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.sm, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: fontSize.md, color: colors.text, marginBottom: spacing.md, backgroundColor: colors.background },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  typeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  typeBtnText: { fontSize: fontSize.sm, color: colors.textLight },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md, marginTop: spacing.md },
  cancelBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.sm },
  cancelBtnText: { color: colors.textLight, fontSize: fontSize.md },
  submitBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.sm },
  submitBtnText: { color: '#FFF', fontSize: fontSize.md, fontWeight: '600' },
});
