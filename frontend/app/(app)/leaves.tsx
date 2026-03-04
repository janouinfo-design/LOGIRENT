import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../../src/theme/constants';
import { useAuth } from '../../src/context/AuthContext';
import { getLeaves, createLeave, updateLeave, deleteLeave, approveLeave, rejectLeave } from '../../src/services/api';

const leaveTypes = [
  { key: 'vacation', label: 'Vacances' },
  { key: 'sick', label: 'Maladie' },
  { key: 'accident', label: 'Accident' },
  { key: 'training', label: 'Formation' },
  { key: 'maternity', label: 'Maternite' },
  { key: 'paternity', label: 'Paternite' },
  { key: 'special', label: 'Conge special' },
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
    try {
      const res = await getLeaves();
      setLeaves(res.data);
    } catch (err) {
      console.log('Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const resetForm = () => {
    setForm({ type: 'vacation', start_date: '', end_date: '', reason: '' });
    setEditId(null);
  };

  const handleCreate = async () => {
    if (!form.start_date || !form.end_date) {
      alert('Veuillez remplir les dates');
      return;
    }
    try {
      if (editId) {
        await updateLeave(editId, form);
      } else {
        await createLeave(form);
      }
      setShowModal(false);
      resetForm();
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erreur');
    }
  };

  const handleEdit = (l: any) => {
    setForm({ type: l.type, start_date: l.start_date, end_date: l.end_date, reason: l.reason || '' });
    setEditId(l.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    try { await deleteLeave(id); await loadData(); } catch (err: any) { alert(err.response?.data?.detail || 'Erreur'); }
  };

  const handleApprove = async (id: string) => {
    try { await approveLeave(id); await loadData(); } catch (err: any) { alert(err.response?.data?.detail || 'Erreur'); }
  };

  const handleReject = async (id: string) => {
    try { await rejectLeave(id); await loadData(); } catch (err: any) { alert(err.response?.data?.detail || 'Erreur'); }
  };

  const typeLabel = (t: string) => leaveTypes.find((lt) => lt.key === t)?.label || t;
  const statusColor = (s: string) => {
    switch (s) {
      case 'approved': return { bg: colors.successLight, text: '#065F46' };
      case 'rejected': return { bg: colors.errorLight, text: '#991B1B' };
      default: return { bg: colors.warningLight, text: '#92400E' };
    }
  };
  const statusLabel = (s: string) => {
    switch (s) {
      case 'approved': return 'Approuvee';
      case 'rejected': return 'Refusee';
      default: return 'En attente';
    }
  };

  const filtered = leaves.filter(l => {
    const matchSearch = `${l.user_name || ''} ${typeLabel(l.type)} ${l.reason || ''} ${l.start_date} ${l.end_date}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || l.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const statusFilters = [
    { key: 'all', label: 'Tous' },
    { key: 'pending', label: 'En attente' },
    { key: 'approved', label: 'Approuvees' },
    { key: 'rejected', label: 'Refusees' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title} data-testid="leaves-title">Absences</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => { resetForm(); setShowModal(true); }} data-testid="add-leave-button">
          <Text style={styles.addBtnText}>+ Demande d'absence</Text>
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={styles.searchRow} data-testid="leaves-search-bar">
        <MaterialIcons name="search" size={20} color={colors.textLight} style={{ marginRight: spacing.sm }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher par nom, type, raison..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor={colors.textLight}
          data-testid="leaves-search-input"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <MaterialIcons name="close" size={18} color={colors.textLight} />
          </TouchableOpacity>
        )}
      </View>

      {/* Status filters */}
      <View style={styles.filterRow}>
        {statusFilters.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filterStatus === f.key && styles.filterChipActive]}
            onPress={() => setFilterStatus(f.key)}
            data-testid={`filter-${f.key}`}
          >
            <Text style={[styles.filterChipText, filterStatus === f.key && styles.filterChipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : filtered.length === 0 ? (
        <View style={styles.empty}><Text style={styles.emptyText}>Aucune absence trouvee</Text></View>
      ) : (
        <View style={styles.list}>
          {filtered.map((l) => {
            const sc = statusColor(l.status);
            const canEdit = l.status === 'pending' && (l.user_id === user?.id || isManager);
            return (
              <View key={l.id} style={styles.card} data-testid={`leave-card-${l.id}`}>
                <View style={styles.cardRow}>
                  <View style={styles.cardInfo}>
                    {isManager && <Text style={styles.cardName}>{l.user_name}</Text>}
                    <View style={styles.typeBadge}><Text style={styles.typeText}>{typeLabel(l.type)}</Text></View>
                    <Text style={styles.cardDates}>{l.start_date} {'→'} {l.end_date}</Text>
                    {l.reason ? <Text style={styles.cardReason}>{l.reason}</Text> : null}
                  </View>
                  <View style={styles.cardActions}>
                    <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                      <Text style={[styles.statusText, { color: sc.text }]}>{statusLabel(l.status)}</Text>
                    </View>
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
                          <Text style={styles.approveBtnText}>Approuver</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(l.id)} data-testid={`reject-leave-${l.id}`}>
                          <Text style={styles.rejectBtnText}>Refuser</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
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
              <TouchableOpacity onPress={() => { setShowModal(false); resetForm(); }}>
                <MaterialIcons name="close" size={24} color={colors.textLight} />
              </TouchableOpacity>
            </View>
            <Text style={styles.label}>Type</Text>
            <View style={styles.typeRow}>
              {leaveTypes.map((lt) => (
                <TouchableOpacity key={lt.key} style={[styles.typeBtn, form.type === lt.key && styles.typeBtnActive]} onPress={() => setForm({ ...form, type: lt.key })}>
                  <Text style={[styles.typeBtnText, form.type === lt.key && styles.typeBtnTextActive]}>{lt.label}</Text>
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: fontSize.md, color: colors.text },
  filterRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontSize: fontSize.sm, color: colors.textLight, fontWeight: '500' },
  filterChipTextActive: { color: '#FFF', fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyText: { fontSize: fontSize.md, color: colors.textLight },
  list: { gap: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cardInfo: { flex: 1 },
  cardName: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  typeBadge: { backgroundColor: colors.primaryLight, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.full, marginBottom: spacing.sm },
  typeText: { fontSize: fontSize.xs, fontWeight: '600', color: colors.primary },
  cardDates: { fontSize: fontSize.sm, color: colors.text, marginBottom: spacing.xs },
  cardReason: { fontSize: fontSize.sm, color: colors.textLight },
  cardActions: { alignItems: 'flex-end', gap: spacing.sm },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.full },
  statusText: { fontSize: fontSize.xs, fontWeight: '600' },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editBtnText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '500' },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  approveBtn: { backgroundColor: colors.successLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: borderRadius.sm },
  approveBtnText: { color: '#065F46', fontSize: fontSize.sm, fontWeight: '600' },
  rejectBtn: { backgroundColor: colors.errorLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: borderRadius.sm },
  rejectBtnText: { color: '#991B1B', fontSize: fontSize.sm, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, width: '90%', maxWidth: 500 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.sm, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: fontSize.md, color: colors.text, marginBottom: spacing.md, backgroundColor: colors.background },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  typeBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  typeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeBtnText: { fontSize: fontSize.sm, color: colors.textLight },
  typeBtnTextActive: { color: '#FFF', fontWeight: '600' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md, marginTop: spacing.md },
  cancelBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.sm },
  cancelBtnText: { color: colors.textLight, fontSize: fontSize.md },
  submitBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.sm },
  submitBtnText: { color: '#FFF', fontSize: fontSize.md, fontWeight: '600' },
});
