import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../../src/theme/constants';
import { getExpenses, createExpense, updateExpense, deleteExpense, approveExpense, rejectExpense, getProjects } from '../../src/services/api';
import { useAuth } from '../../src/context/AuthContext';

const CATEGORIES = [
  { key: 'Transport', icon: 'directions-car', color: '#2563EB' },
  { key: 'Repas', icon: 'restaurant', color: '#F59E0B' },
  { key: 'Materiel', icon: 'build', color: '#8B5CF6' },
  { key: 'Hebergement', icon: 'hotel', color: '#EC4899' },
  { key: 'Communication', icon: 'phone', color: '#059669' },
  { key: 'Autre', icon: 'more-horiz', color: '#94A3B8' },
];
const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: '#FEF3C7', text: '#92400E', label: 'En attente' },
  approved: { bg: '#D1FAE5', text: '#065F46', label: 'Approuve' },
  rejected: { bg: '#FEE2E2', text: '#991B1B', label: 'Refuse' },
};

export default function ExpensesScreen() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [form, setForm] = useState({ amount: '', category: 'Transport', description: '', date: new Date().toISOString().split('T')[0], project_id: '' });
  const isManager = user?.role === 'manager' || user?.role === 'admin';

  const loadData = useCallback(async () => {
    try {
      const [expRes, projRes] = await Promise.all([getExpenses(), getProjects({ active_only: true })]);
      setExpenses(expRes.data); setProjects(projRes.data);
    } catch (err) { console.log(err); } finally { setLoading(false); }
  }, []);
  useEffect(() => { loadData(); }, [loadData]);

  const resetForm = () => { setForm({ amount: '', category: 'Transport', description: '', date: new Date().toISOString().split('T')[0], project_id: '' }); setEditId(null); };

  const handleCreate = async () => {
    if (!form.amount) return alert('Montant requis');
    try {
      if (editId) { await updateExpense(editId, { amount: parseFloat(form.amount), category: form.category, description: form.description, date: form.date, project_id: form.project_id || null }); }
      else { await createExpense({ amount: form.amount, category: form.category, description: form.description, date: form.date, project_id: form.project_id || undefined }); }
      setShowModal(false); resetForm(); await loadData();
    } catch (err: any) { alert(err.response?.data?.detail || 'Erreur'); }
  };

  const handleEdit = (e: any) => {
    setForm({ amount: e.amount.toString(), category: e.category, description: e.description || '', date: e.date, project_id: e.project_id || '' });
    setEditId(e.id); setShowModal(true);
  };

  const handleDelete = async (id: string) => { try { await deleteExpense(id); await loadData(); } catch (err: any) { alert(err.response?.data?.detail || 'Erreur'); } };

  const getCatConfig = (cat: string) => CATEGORIES.find(c => c.key === cat) || CATEGORIES[5];
  const total = expenses.filter(e => e.status === 'approved').reduce((s, e) => s + e.amount, 0);
  const pending = expenses.filter(e => e.status === 'pending').reduce((s, e) => s + e.amount, 0);

  const statusFilters = [{ key: 'all', label: 'Tous' }, { key: 'pending', label: 'En attente' }, { key: 'approved', label: 'Approuves' }, { key: 'rejected', label: 'Refuses' }];

  const filtered = expenses.filter(e => {
    const matchSearch = `${e.amount} ${e.category} ${e.description || ''} ${e.user_name || ''} ${e.project_name || ''} ${e.date}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || e.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title} data-testid="expenses-title">Notes de frais</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => { resetForm(); setShowModal(true); }} data-testid="add-expense-btn">
          <Text style={styles.addBtnText}>+ Nouvelle note</Text>
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { borderLeftColor: '#059669' }]}><Text style={[styles.summaryValue, { color: '#059669' }]}>{total.toFixed(0)} CHF</Text><Text style={styles.summaryLabel}>Approuve</Text></View>
        <View style={[styles.summaryCard, { borderLeftColor: '#F59E0B' }]}><Text style={[styles.summaryValue, { color: '#F59E0B' }]}>{pending.toFixed(0)} CHF</Text><Text style={styles.summaryLabel}>En attente</Text></View>
        <View style={[styles.summaryCard, { borderLeftColor: colors.primary }]}><Text style={[styles.summaryValue, { color: colors.primary }]}>{expenses.length}</Text><Text style={styles.summaryLabel}>Total</Text></View>
      </View>

      {/* Search */}
      <View style={styles.searchRow} data-testid="expenses-search-bar">
        <MaterialIcons name="search" size={20} color={colors.textLight} style={{ marginRight: spacing.sm }} />
        <TextInput style={styles.searchInput} placeholder="Rechercher par montant, categorie, description..." value={search} onChangeText={setSearch} placeholderTextColor={colors.textLight} data-testid="expenses-search-input" />
        {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')}><MaterialIcons name="close" size={18} color={colors.textLight} /></TouchableOpacity>}
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        {statusFilters.map(f => (
          <TouchableOpacity key={f.key} style={[styles.filterChip, filterStatus === f.key && styles.filterChipActive]} onPress={() => setFilterStatus(f.key)} data-testid={`filter-${f.key}`}>
            <Text style={[styles.filterChipText, filterStatus === f.key && styles.filterChipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} /> : filtered.length === 0 ? (
        <View style={styles.empty}><MaterialIcons name="receipt-long" size={48} color={colors.borderLight} /><Text style={styles.emptyText}>Aucune note de frais</Text></View>
      ) : (
        <View style={styles.grid}>
          {filtered.map(exp => {
            const catCfg = getCatConfig(exp.category);
            const sc = STATUS_CONFIG[exp.status] || STATUS_CONFIG.pending;
            const canEdit = exp.status === 'pending' && (exp.user_id === user?.id || isManager);
            return (
              <View key={exp.id} style={styles.card} data-testid={`expense-card-${exp.id}`}>
                <View style={styles.cardTop}>
                  <View style={[styles.catIcon, { backgroundColor: catCfg.color + '18' }]}>
                    <MaterialIcons name={catCfg.icon as any} size={20} color={catCfg.color} />
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.statusText, { color: sc.text }]}>{sc.label}</Text>
                  </View>
                </View>

                <Text style={styles.cardAmount}>{exp.amount.toFixed(2)} CHF</Text>
                <Text style={[styles.cardCat, { color: catCfg.color }]}>{exp.category}</Text>
                {exp.description ? <Text style={styles.cardDesc} numberOfLines={2}>{exp.description}</Text> : null}

                <View style={styles.cardMeta}>
                  <View style={styles.metaItem}><MaterialIcons name="date-range" size={12} color={colors.textLight} /><Text style={styles.metaText}>{exp.date}</Text></View>
                  {exp.user_name && <View style={styles.metaItem}><MaterialIcons name="person" size={12} color={colors.textLight} /><Text style={styles.metaText}>{exp.user_name}</Text></View>}
                  {exp.project_name && <View style={styles.metaItem}><MaterialIcons name="folder" size={12} color={colors.textLight} /><Text style={styles.metaText}>{exp.project_name}</Text></View>}
                </View>

                <View style={styles.cardFooter}>
                  {canEdit && (
                    <View style={styles.editRow}>
                      <TouchableOpacity style={styles.editBtn} onPress={() => handleEdit(exp)} data-testid={`edit-expense-${exp.id}`}>
                        <MaterialIcons name="edit" size={14} color={colors.primary} />
                        <Text style={styles.editBtnText}>Modifier</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(exp.id)} data-testid={`delete-expense-${exp.id}`}>
                        <MaterialIcons name="delete-outline" size={16} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  )}
                  {isManager && exp.status === 'pending' && (
                    <View style={styles.actionRow}>
                      <TouchableOpacity style={styles.approveBtn} onPress={async () => { await approveExpense(exp.id); loadData(); }} data-testid={`approve-expense-${exp.id}`}>
                        <MaterialIcons name="check" size={14} color="#065F46" />
                        <Text style={styles.approveBtnText}>Approuver</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.rejectBtn} onPress={async () => { await rejectExpense(exp.id); loadData(); }} data-testid={`reject-expense-${exp.id}`}>
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

      {/* Modal */}
      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editId ? 'Modifier la note' : 'Nouvelle note de frais'}</Text>
              <TouchableOpacity onPress={() => { setShowModal(false); resetForm(); }}><MaterialIcons name="close" size={24} color={colors.textLight} /></TouchableOpacity>
            </View>
            <Text style={styles.label}>Montant (CHF)</Text>
            <TextInput style={styles.input} placeholder="0.00" value={form.amount} onChangeText={v => setForm({ ...form, amount: v })} keyboardType="numeric" placeholderTextColor={colors.textLight} data-testid="expense-amount-input" />
            <Text style={styles.label}>Categorie</Text>
            <View style={styles.catRow}>
              {CATEGORIES.map(c => (
                <TouchableOpacity key={c.key} style={[styles.catChip, form.category === c.key && { backgroundColor: c.color, borderColor: c.color }]} onPress={() => setForm({ ...form, category: c.key })}>
                  <MaterialIcons name={c.icon as any} size={14} color={form.category === c.key ? '#FFF' : c.color} />
                  <Text style={[styles.catChipText, form.category === c.key && { color: '#FFF', fontWeight: '600' }]}>{c.key}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Description</Text>
            <TextInput style={styles.input} placeholder="Description" value={form.description} onChangeText={v => setForm({ ...form, description: v })} placeholderTextColor={colors.textLight} data-testid="expense-desc-input" />
            <Text style={styles.label}>Date</Text>
            <TextInput style={styles.input} placeholder="AAAA-MM-JJ" value={form.date} onChangeText={v => setForm({ ...form, date: v })} placeholderTextColor={colors.textLight} data-testid="expense-date-input" />
            {projects.length > 0 && (
              <>
                <Text style={styles.label}>Projet (optionnel)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                  <TouchableOpacity style={[styles.projChip, !form.project_id && styles.projChipActive]} onPress={() => setForm({ ...form, project_id: '' })}>
                    <Text style={[styles.projChipText, !form.project_id && styles.projChipTextActive]}>Aucun</Text>
                  </TouchableOpacity>
                  {projects.map((p: any) => (
                    <TouchableOpacity key={p.id} style={[styles.projChip, form.project_id === p.id && styles.projChipActive]} onPress={() => setForm({ ...form, project_id: p.id })}>
                      <Text style={[styles.projChipText, form.project_id === p.id && styles.projChipTextActive]}>{p.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowModal(false); resetForm(); }}><Text style={styles.cancelBtnText}>Annuler</Text></TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleCreate} data-testid="submit-expense"><Text style={styles.submitBtnText}>{editId ? 'Sauvegarder' : 'Creer'}</Text></TouchableOpacity>
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
  summaryRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  summaryCard: { flex: 1, backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 4 },
  summaryValue: { fontSize: fontSize.lg, fontWeight: '800' },
  summaryLabel: { fontSize: fontSize.xs, color: colors.textLight },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, marginBottom: spacing.md },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: fontSize.md, color: colors.text },
  filterRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontSize: fontSize.sm, color: colors.textLight, fontWeight: '500' },
  filterChipTextActive: { color: '#FFF', fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: spacing.sm },
  emptyText: { color: colors.textLight, fontSize: fontSize.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.lg, minWidth: 280, flex: 1, maxWidth: '48%', borderWidth: 1, borderColor: colors.border },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  catIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.full },
  statusText: { fontSize: fontSize.xs, fontWeight: '600' },
  cardAmount: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text },
  cardCat: { fontSize: fontSize.sm, fontWeight: '600', marginBottom: spacing.xs },
  cardDesc: { fontSize: fontSize.xs, color: colors.textLight, marginBottom: spacing.sm },
  cardMeta: { gap: 4, marginBottom: spacing.sm },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: fontSize.xs, color: colors.textLight },
  cardFooter: { paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight, gap: spacing.sm },
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
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  catChipText: { fontSize: fontSize.sm, color: colors.textLight },
  projChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, marginRight: spacing.sm },
  projChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  projChipText: { fontSize: fontSize.sm, color: colors.textLight },
  projChipTextActive: { color: '#FFF', fontWeight: '600' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md, marginTop: spacing.md },
  cancelBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.sm },
  cancelBtnText: { color: colors.textLight, fontSize: fontSize.md },
  submitBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.sm },
  submitBtnText: { color: '#FFF', fontSize: fontSize.md, fontWeight: '600' },
});
