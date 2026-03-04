import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../../src/theme/constants';
import { useAuth } from '../../src/context/AuthContext';
import { getLeaves, createLeave, updateLeave, deleteLeave, approveLeave, rejectLeave } from '../../src/services/api';

const leaveTypes = [
  { key: 'vacation', label: 'Vacances', icon: 'beach-access', color: '#F59E0B' },
  { key: 'sick', label: 'Maladie', icon: 'local-hospital', color: '#EF4444' },
  { key: 'accident', label: 'Accident', icon: 'warning', color: '#DC2626' },
  { key: 'training', label: 'Formation', icon: 'school', color: '#6366F1' },
  { key: 'maternity', label: 'Maternite', icon: 'child-friendly', color: '#EC4899' },
  { key: 'paternity', label: 'Paternite', icon: 'child-friendly', color: '#8B5CF6' },
  { key: 'special', label: 'Conge special', icon: 'event-busy', color: '#F97316' },
];

export default function LeavesScreen() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [form, setForm] = useState({ type: 'vacation', start_date: '', end_date: '', reason: '' });
  const isManager = user?.role === 'manager' || user?.role === 'admin';

  const loadData = useCallback(async () => {
    try { const res = await getLeaves(); setLeaves(res.data); } catch (err) { console.log(err); } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const resetForm = () => { setForm({ type: 'vacation', start_date: '', end_date: '', reason: '' }); setEditId(null); };

  const handleCreate = async () => {
    if (!form.start_date || !form.end_date) { alert('Veuillez remplir les dates'); return; }
    try {
      if (editId) { await updateLeave(editId, form); } else { await createLeave(form); }
      setShowModal(false); resetForm(); await loadData();
    } catch (err: any) { alert(err.response?.data?.detail || 'Erreur'); }
  };

  const handleEdit = (l: any) => {
    setForm({ type: l.type, start_date: l.start_date, end_date: l.end_date, reason: l.reason || '' });
    setEditId(l.id); setShowModal(true);
  };

  const handleDelete = async (id: string) => { try { await deleteLeave(id); await loadData(); } catch (err: any) { alert(err.response?.data?.detail || 'Erreur'); } };
  const handleApprove = async (id: string) => { try { await approveLeave(id); await loadData(); } catch (err: any) { alert(err.response?.data?.detail || 'Erreur'); } };
  const handleReject = async (id: string) => { try { await rejectLeave(id); await loadData(); } catch (err: any) { alert(err.response?.data?.detail || 'Erreur'); } };

  const getTypeConfig = (t: string) => leaveTypes.find((lt) => lt.key === t) || { key: t, label: t, icon: 'event-busy', color: '#94A3B8' };
  const statusColor = (s: string) => {
    switch (s) { case 'approved': return { bg: '#D1FAE5', text: '#065F46', label: 'Approuvee' }; case 'rejected': return { bg: '#FEE2E2', text: '#991B1B', label: 'Refusee' }; default: return { bg: '#FEF3C7', text: '#92400E', label: 'En attente' }; }
  };

  const filtered = leaves.filter(l => {
    const tc = getTypeConfig(l.type);
    const matchSearch = `${l.user_name || ''} ${tc.label} ${l.reason || ''} ${l.start_date} ${l.end_date}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || l.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const statusFilters = [
    { key: 'all', label: 'Tous' }, { key: 'pending', label: 'En attente' },
    { key: 'approved', label: 'Approuvees' }, { key: 'rejected', label: 'Refusees' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title} data-testid="leaves-title">Absences</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => { resetForm(); setShowModal(true); }} data-testid="add-leave-button">
          <Text style={styles.addBtnText}>+ Demande d'absence</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow} data-testid="leaves-search-bar">
        <MaterialIcons name="search" size={20} color={colors.textLight} style={{ marginRight: spacing.sm }} />
        <TextInput style={styles.searchInput} placeholder="Rechercher par nom, type, raison..." value={search} onChangeText={setSearch} placeholderTextColor={colors.textLight} data-testid="leaves-search-input" />
        {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')}><MaterialIcons name="close" size={18} color={colors.textLight} /></TouchableOpacity>}
      </View>

      <View style={styles.filterRow}>
        {statusFilters.map(f => (
          <TouchableOpacity key={f.key} style={[styles.filterChip, filterStatus === f.key && styles.filterChipActive]} onPress={() => setFilterStatus(f.key)} data-testid={`filter-${f.key}`}>
            <Text style={[styles.filterChipText, filterStatus === f.key && styles.filterChipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} /> : filtered.length === 0 ? (
        <View style={styles.empty}><Text style={styles.emptyText}>Aucune absence trouvee</Text></View>
      ) : (
        <View style={styles.grid}>
          {filtered.map((l) => {
            const tc = getTypeConfig(l.type);
            const sc = statusColor(l.status);
            const canEdit = l.status === 'pending' && (l.user_id === user?.id || isManager);
            return (
              <View key={l.id} style={styles.card} data-testid={`leave-card-${l.id}`}>
                <View style={styles.cardTop}>
                  <View style={[styles.typeIcon, { backgroundColor: tc.color + '18' }]}>
                    <MaterialIcons name={tc.icon as any} size={20} color={tc.color} />
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.statusText, { color: sc.text }]}>{sc.label}</Text>
                  </View>
                </View>

                <Text style={styles.cardType}>{tc.label}</Text>
                {isManager && <Text style={styles.cardName}>{l.user_name}</Text>}

                <View style={styles.dateRow}>
                  <MaterialIcons name="date-range" size={14} color={colors.textLight} />
                  <Text style={styles.dateText}>{l.start_date} → {l.end_date}</Text>
                </View>

                {l.reason ? <Text style={styles.cardReason} numberOfLines={2}>{l.reason}</Text> : null}

                <View style={styles.cardFooter}>
                  {canEdit && (
                    <View style={styles.editRow}>
                      <TouchableOpacity style={styles.editBtn} onPress={() => handleEdit(l)} data-testid={`edit-leave-${l.id}`}>
                        <MaterialIcons name="edit" size={14} color={colors.primary} />
                        <Text style={styles.editBtnText}>Modifier</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(l.id)} data-testid={`delete-leave-${l.id}`}>
                        <MaterialIcons name="delete-outline" size={16} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  )}
                  {isManager && l.status === 'pending' && (
                    <View style={styles.actionRow}>
                      <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(l.id)} data-testid={`approve-leave-${l.id}`}>
                        <MaterialIcons name="check" size={14} color="#065F46" />
                        <Text style={styles.approveBtnText}>Approuver</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(l.id)} data-testid={`reject-leave-${l.id}`}>
                        <MaterialIcons name="close" size={14} color="#991B1B" />
                        <Text style={styles.rejectBtnText}>Refuser</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editId ? 'Modifier l\'absence' : 'Demande d\'absence'}</Text>
              <TouchableOpacity onPress={() => { setShowModal(false); resetForm(); }}><MaterialIcons name="close" size={24} color={colors.textLight} /></TouchableOpacity>
            </View>
            <Text style={styles.label}>Type</Text>
            <View style={styles.typeRow}>
              {leaveTypes.map((lt) => (
                <TouchableOpacity key={lt.key} style={[styles.typeBtn, form.type === lt.key && { backgroundColor: lt.color, borderColor: lt.color }]} onPress={() => setForm({ ...form, type: lt.key })}>
                  <MaterialIcons name={lt.icon as any} size={14} color={form.type === lt.key ? '#FFF' : lt.color} />
                  <Text style={[styles.typeBtnText, form.type === lt.key && { color: '#FFF', fontWeight: '600' }]}>{lt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Date de debut (AAAA-MM-JJ)</Text>
            <TextInput style={styles.input} placeholder="2026-01-15" value={form.start_date} onChangeText={(v) => setForm({ ...form, start_date: v })} placeholderTextColor={colors.textLight} data-testid="leave-start-date" />
            <Text style={styles.label}>Date de fin (AAAA-MM-JJ)</Text>
            <TextInput style={styles.input} placeholder="2026-01-20" value={form.end_date} onChangeText={(v) => setForm({ ...form, end_date: v })} placeholderTextColor={colors.textLight} data-testid="leave-end-date" />
            <Text style={styles.label}>Raison</Text>
            <TextInput style={[styles.input, { minHeight: 80 }]} placeholder="Raison (optionnel)" value={form.reason} onChangeText={(v) => setForm({ ...form, reason: v })} multiline placeholderTextColor={colors.textLight} data-testid="leave-reason" />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowModal(false); resetForm(); }}><Text style={styles.cancelBtnText}>Annuler</Text></TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleCreate} data-testid="submit-leave"><Text style={styles.submitBtnText}>{editId ? 'Sauvegarder' : 'Soumettre'}</Text></TouchableOpacity>
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
  addBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.sm },
  addBtnText: { color: '#FFF', fontSize: fontSize.sm, fontWeight: '600' },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, marginBottom: spacing.md },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: fontSize.md, color: colors.text },
  filterRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontSize: fontSize.sm, color: colors.textLight, fontWeight: '500' },
  filterChipTextActive: { color: '#FFF', fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyText: { fontSize: fontSize.md, color: colors.textLight },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    minWidth: 280,
    flex: 1,
    maxWidth: '48%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  typeIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.full },
  statusText: { fontSize: fontSize.xs, fontWeight: '600' },
  cardType: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, marginBottom: 2 },
  cardName: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '500', marginBottom: spacing.sm },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.xs },
  dateText: { fontSize: fontSize.sm, color: colors.textLight },
  cardReason: { fontSize: fontSize.xs, color: colors.textLight, marginTop: spacing.xs },
  cardFooter: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight, gap: spacing.sm },
  editRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editBtnText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '500' },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  approveBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#D1FAE5', paddingHorizontal: 10, paddingVertical: 6, borderRadius: borderRadius.sm, flex: 1, justifyContent: 'center' },
  approveBtnText: { color: '#065F46', fontSize: fontSize.xs, fontWeight: '600' },
  rejectBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: 6, borderRadius: borderRadius.sm, flex: 1, justifyContent: 'center' },
  rejectBtnText: { color: '#991B1B', fontSize: fontSize.xs, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, width: '90%', maxWidth: 500 },
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
