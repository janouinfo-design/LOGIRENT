import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView, ActivityIndicator, Modal, Switch } from 'react-native';
import { colors, fontSize, spacing, borderRadius, shadows } from '../../src/theme/constants';
import { getActivities, createActivity, deleteActivity } from '../../src/services/api';

export default function ActivitiesScreen() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', billable: true });

  const loadData = useCallback(async () => {
    try {
      const res = await getActivities();
      setActivities(res.data);
    } catch (err) {
      console.log('Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    if (!form.name) { alert('Le nom est requis'); return; }
    try {
      await createActivity(form);
      setShowModal(false);
      setForm({ name: '', description: '', billable: true });
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erreur');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteActivity(id);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erreur');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Activités</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)} data-testid="add-activity-button">
          <Text style={styles.addBtnText}>+ Nouvelle activité</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : activities.length === 0 ? (
        <View style={styles.empty}><Text style={styles.emptyText}>Aucune activité</Text></View>
      ) : (
        <View style={styles.grid}>
          {activities.map((a) => (
            <View key={a.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{a.name}</Text>
                <View style={[styles.billableBadge, { backgroundColor: a.billable ? colors.successLight : colors.borderLight }]}>
                  <Text style={[styles.billableText, { color: a.billable ? '#065F46' : colors.textLight }]}>
                    {a.billable ? 'Facturable' : 'Non facturable'}
                  </Text>
                </View>
              </View>
              {a.description ? <Text style={styles.cardDesc}>{a.description}</Text> : null}
              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(a.id)}>
                <Text style={styles.deleteBtnText}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Nouvelle activité</Text>
            <TextInput style={styles.input} placeholder="Nom" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} placeholderTextColor={colors.textLight} />
            <TextInput style={[styles.input, { minHeight: 80 }]} placeholder="Description" value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} multiline placeholderTextColor={colors.textLight} />
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Facturable</Text>
              <Switch value={form.billable} onValueChange={(v) => setForm({ ...form, billable: v })} trackColor={{ false: colors.border, true: colors.primaryLight }} thumbColor={form.billable ? colors.primary : '#FFF'} />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}><Text style={styles.cancelBtnText}>Annuler</Text></TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleCreate} data-testid="submit-activity"><Text style={styles.submitBtnText}>Créer</Text></TouchableOpacity>
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.lg, minWidth: 250, flex: 1, maxWidth: '32%', ...shadows.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  cardTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  billableBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.full },
  billableText: { fontSize: fontSize.xs, fontWeight: '600' },
  cardDesc: { fontSize: fontSize.sm, color: colors.textLight, marginBottom: spacing.sm },
  deleteBtn: { alignSelf: 'flex-start', marginTop: spacing.sm },
  deleteBtnText: { fontSize: fontSize.sm, color: colors.error },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, width: '90%', maxWidth: 450 },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.lg },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.sm, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: fontSize.md, color: colors.text, marginBottom: spacing.md, backgroundColor: colors.background },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  switchLabel: { fontSize: fontSize.md, color: colors.text },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md, marginTop: spacing.md },
  cancelBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.sm },
  cancelBtnText: { color: colors.textLight, fontSize: fontSize.md },
  submitBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.sm },
  submitBtnText: { color: '#FFF', fontSize: fontSize.md, fontWeight: '600' },
});
