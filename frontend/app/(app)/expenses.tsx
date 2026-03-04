import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../../src/theme/constants';
import { getExpenses, createExpense, approveExpense, rejectExpense, getProjects } from '../../src/services/api';
import { useAuth } from '../../src/context/AuthContext';

const CATEGORIES = ['Transport', 'Repas', 'Materiel', 'Hebergement', 'Communication', 'Autre'];
const STATUS_COLORS: Record<string, string> = { pending: '#F59E0B', approved: '#059669', rejected: '#DC2626' };
const STATUS_LABELS: Record<string, string> = { pending: 'En attente', approved: 'Approuve', rejected: 'Refuse' };

export default function ExpensesScreen() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ amount: '', category: 'Transport', description: '', date: new Date().toISOString().split('T')[0], project_id: '' });
  const isManager = user?.role === 'manager' || user?.role === 'admin';

  const loadData = useCallback(async () => {
    try {
      const [expRes, projRes] = await Promise.all([getExpenses(), getProjects({ active_only: true })]);
      setExpenses(expRes.data);
      setProjects(projRes.data);
    } catch (err) { console.log(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    if (!form.amount) return alert('Montant requis');
    try {
      await createExpense({ amount: form.amount, category: form.category, description: form.description, date: form.date, project_id: form.project_id || undefined });
      setShowModal(false);
      setForm({ amount: '', category: 'Transport', description: '', date: new Date().toISOString().split('T')[0], project_id: '' });
      await loadData();
    } catch (err: any) { alert(err.response?.data?.detail || 'Erreur'); }
  };

  const total = expenses.filter(e => e.status === 'approved').reduce((s, e) => s + e.amount, 0);
  const pending = expenses.filter(e => e.status === 'pending').reduce((s, e) => s + e.amount, 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Notes de frais</Text>
        <Pressable style={styles.addBtn} onPress={() => setShowModal(true)} data-testid="add-expense-btn">
          <Text style={styles.addBtnText}>+ Nouvelle note</Text>
        </Pressable>
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { borderLeftColor: '#059669' }]}><Text style={[styles.summaryValue, { color: '#059669' }]}>{total.toFixed(0)} CHF</Text><Text style={styles.summaryLabel}>Approuve</Text></View>
        <View style={[styles.summaryCard, { borderLeftColor: '#F59E0B' }]}><Text style={[styles.summaryValue, { color: '#F59E0B' }]}>{pending.toFixed(0)} CHF</Text><Text style={styles.summaryLabel}>En attente</Text></View>
        <View style={[styles.summaryCard, { borderLeftColor: colors.primary }]}><Text style={[styles.summaryValue, { color: colors.primary }]}>{expenses.length}</Text><Text style={styles.summaryLabel}>Total</Text></View>
      </View>

      {loading ? <ActivityIndicator size="large" color={colors.primary} /> : expenses.length === 0 ? (
        <View style={styles.empty}><MaterialIcons name="receipt-long" size={48} color={colors.borderLight} /><Text style={styles.emptyText}>Aucune note de frais</Text></View>
      ) : (
        expenses.map(exp => (
          <View key={exp.id} style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.cardInfo}>
                <Text style={styles.cardAmount}>{exp.amount.toFixed(2)} CHF</Text>
                <Text style={styles.cardCategory}>{exp.category}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[exp.status] || '#94A3B8') + '22' }]}>
                <Text style={[styles.statusText, { color: STATUS_COLORS[exp.status] || '#94A3B8' }]}>{STATUS_LABELS[exp.status] || exp.status}</Text>
              </View>
            </View>
            {exp.description ? <Text style={styles.cardDesc}>{exp.description}</Text> : null}
            <View style={styles.cardMeta}>
              <Text style={styles.metaText}>{exp.date}</Text>
              {exp.user_name && <Text style={styles.metaText}>{exp.user_name}</Text>}
              {exp.project_name && <Text style={styles.metaText}>{exp.project_name}</Text>}
            </View>
            {isManager && exp.status === 'pending' && (
              <View style={styles.actionRow}>
                <Pressable style={styles.approveBtn} onPress={async () => { await approveExpense(exp.id); loadData(); }}><MaterialIcons name="check" size={16} color="#FFF" /><Text style={styles.actionText}>Approuver</Text></Pressable>
                <Pressable style={styles.rejectBtn} onPress={async () => { await rejectExpense(exp.id); loadData(); }}><MaterialIcons name="close" size={16} color="#FFF" /><Text style={styles.actionText}>Refuser</Text></Pressable>
              </View>
            )}
          </View>
        ))
      )}

      {/* Create Modal */}
      <Modal visible={showModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowModal(false)}>
          <View style={styles.modal} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Nouvelle note de frais</Text>
            <TextInput style={styles.input} placeholder="Montant (CHF)" value={form.amount} onChangeText={v => setForm({ ...form, amount: v })} keyboardType="numeric" placeholderTextColor={colors.textLight} />
            <Text style={styles.label}>Categorie</Text>
            <View style={styles.catRow}>
              {CATEGORIES.map(c => (
                <Pressable key={c} style={[styles.catChip, form.category === c && styles.catChipActive]} onPress={() => setForm({ ...form, category: c })}>
                  <Text style={[styles.catText, form.category === c && styles.catTextActive]}>{c}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput style={styles.input} placeholder="Description" value={form.description} onChangeText={v => setForm({ ...form, description: v })} placeholderTextColor={colors.textLight} />
            <TextInput style={styles.input} placeholder="Date (YYYY-MM-DD)" value={form.date} onChangeText={v => setForm({ ...form, date: v })} placeholderTextColor={colors.textLight} />
            {projects.length > 0 && (
              <><Text style={styles.label}>Projet (optionnel)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Pressable style={[styles.catChip, !form.project_id && styles.catChipActive]} onPress={() => setForm({ ...form, project_id: '' })}><Text style={[styles.catText, !form.project_id && styles.catTextActive]}>Aucun</Text></Pressable>
                {projects.map((p: any) => (
                  <Pressable key={p.id} style={[styles.catChip, form.project_id === p.id && styles.catChipActive]} onPress={() => setForm({ ...form, project_id: p.id })}><Text style={[styles.catText, form.project_id === p.id && styles.catTextActive]}>{p.name}</Text></Pressable>
                ))}
              </ScrollView></>
            )}
            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setShowModal(false)}><Text style={styles.cancelText}>Annuler</Text></Pressable>
              <Pressable style={styles.submitBtn} onPress={handleCreate}><Text style={styles.submitText}>Creer</Text></Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  addBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.sm },
  addBtnText: { color: '#FFF', fontSize: fontSize.sm, fontWeight: '600' },
  summaryRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  summaryCard: { flex: 1, backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 4 },
  summaryValue: { fontSize: fontSize.lg, fontWeight: '800' },
  summaryLabel: { fontSize: fontSize.xs, color: colors.textLight },
  empty: { alignItems: 'center', paddingVertical: 60, gap: spacing.sm },
  emptyText: { color: colors.textLight, fontSize: fontSize.md },
  card: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardInfo: { flex: 1 },
  cardAmount: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text },
  cardCategory: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: fontSize.xs, fontWeight: '700' },
  cardDesc: { fontSize: fontSize.sm, color: colors.textLight, marginTop: spacing.xs },
  cardMeta: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight },
  metaText: { fontSize: fontSize.xs, color: colors.textLight },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#059669', paddingVertical: 8, borderRadius: borderRadius.sm },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#DC2626', paddingVertical: 8, borderRadius: borderRadius.sm },
  actionText: { color: '#FFF', fontSize: fontSize.sm, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, width: '90%', maxWidth: 480 },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.lg },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.sm, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: fontSize.md, color: colors.text, marginBottom: spacing.md, backgroundColor: colors.background },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  catChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, marginBottom: 4 },
  catChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  catText: { fontSize: fontSize.sm, color: colors.textLight },
  catTextActive: { color: '#FFF', fontWeight: '600' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md, marginTop: spacing.lg },
  cancelBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  cancelText: { color: colors.textLight, fontSize: fontSize.md },
  submitBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.sm },
  submitText: { color: '#FFF', fontSize: fontSize.md, fontWeight: '600' },
});
