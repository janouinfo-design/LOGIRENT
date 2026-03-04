import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { colors, fontSize, spacing, borderRadius, shadows } from '../../src/theme/constants';
import { useAuth } from '../../src/context/AuthContext';
import { getLeaves, createLeave, approveLeave, rejectLeave } from '../../src/services/api';

const leaveTypes = [
  { key: 'vacation', label: 'Vacances' },
  { key: 'sick', label: 'Maladie' },
  { key: 'accident', label: 'Accident' },
  { key: 'training', label: 'Formation' },
];

export default function LeavesScreen() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
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

  const handleCreate = async () => {
    if (!form.start_date || !form.end_date) {
      alert('Veuillez remplir les dates');
      return;
    }
    try {
      await createLeave(form);
      setShowModal(false);
      setForm({ type: 'vacation', start_date: '', end_date: '', reason: '' });
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erreur');
    }
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
      case 'approved': return 'Approuvée';
      case 'rejected': return 'Refusée';
      default: return 'En attente';
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Absences</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)} data-testid="add-leave-button">
          <Text style={styles.addBtnText}>+ Demande d'absence</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : leaves.length === 0 ? (
        <View style={styles.empty}><Text style={styles.emptyText}>Aucune absence</Text></View>
      ) : (
        <View style={styles.list}>
          {leaves.map((l) => {
            const sc = statusColor(l.status);
            return (
              <View key={l.id} style={styles.card}>
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
                    {isManager && l.status === 'pending' && (
                      <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(l.id)}>
                          <Text style={styles.approveBtnText}>Approuver</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(l.id)}>
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
            <Text style={styles.modalTitle}>Demande d'absence</Text>
            <Text style={styles.label}>Type</Text>
            <View style={styles.typeRow}>
              {leaveTypes.map((lt) => (
                <TouchableOpacity key={lt.key} style={[styles.typeBtn, form.type === lt.key && styles.typeBtnActive]} onPress={() => setForm({ ...form, type: lt.key })}>
                  <Text style={[styles.typeBtnText, form.type === lt.key && styles.typeBtnTextActive]}>{lt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Date de début (AAAA-MM-JJ)</Text>
            <TextInput style={styles.input} placeholder="2025-01-15" value={form.start_date} onChangeText={(v) => setForm({ ...form, start_date: v })} placeholderTextColor={colors.textLight} />
            <Text style={styles.label}>Date de fin (AAAA-MM-JJ)</Text>
            <TextInput style={styles.input} placeholder="2025-01-20" value={form.end_date} onChangeText={(v) => setForm({ ...form, end_date: v })} placeholderTextColor={colors.textLight} />
            <Text style={styles.label}>Raison</Text>
            <TextInput style={[styles.input, { minHeight: 80 }]} placeholder="Raison (optionnel)" value={form.reason} onChangeText={(v) => setForm({ ...form, reason: v })} multiline placeholderTextColor={colors.textLight} />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}><Text style={styles.cancelBtnText}>Annuler</Text></TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleCreate} data-testid="submit-leave"><Text style={styles.submitBtnText}>Soumettre</Text></TouchableOpacity>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  addBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.sm },
  addBtnText: { color: '#FFF', fontSize: fontSize.sm, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyText: { fontSize: fontSize.md, color: colors.textLight },
  list: { gap: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.lg, ...shadows.sm },
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
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  approveBtn: { backgroundColor: colors.successLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: borderRadius.sm },
  approveBtnText: { color: '#065F46', fontSize: fontSize.sm, fontWeight: '600' },
  rejectBtn: { backgroundColor: colors.errorLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: borderRadius.sm },
  rejectBtnText: { color: '#991B1B', fontSize: fontSize.sm, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, width: '90%', maxWidth: 500 },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.lg },
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
