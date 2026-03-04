import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { colors, fontSize, spacing, borderRadius, shadows } from '../../src/theme/constants';
import { useAuth } from '../../src/context/AuthContext';
import { getProjects, createProject, deleteProject, getClients } from '../../src/services/api';

export default function ProjectsScreen() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', client_id: '', budget: '', hourly_rate: '', location: '' });
  const isManager = user?.role === 'manager' || user?.role === 'admin';

  const loadData = useCallback(async () => {
    try {
      const [projRes, clientRes] = await Promise.all([getProjects({ active_only: false }), getClients()]);
      setProjects(projRes.data);
      setClients(clientRes.data);
    } catch (err) {
      console.log('Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    try {
      await createProject({
        name: form.name,
        description: form.description,
        client_id: form.client_id || null,
        budget: parseFloat(form.budget) || 0,
        hourly_rate: parseFloat(form.hourly_rate) || 0,
        location: form.location,
      });
      setShowModal(false);
      setForm({ name: '', description: '', client_id: '', budget: '', hourly_rate: '', location: '' });
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erreur');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProject(id);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erreur');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Projets</Text>
        {isManager && (
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)} data-testid="add-project-button">
            <Text style={styles.addBtnText}>+ Nouveau projet</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : projects.length === 0 ? (
        <View style={styles.empty}><Text style={styles.emptyText}>Aucun projet</Text></View>
      ) : (
        <View style={styles.grid}>
          {projects.map((p) => (
            <View key={p.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{p.name}</Text>
                <View style={[styles.statusBadge, { backgroundColor: p.is_active ? colors.successLight : colors.errorLight }]}>
                  <Text style={[styles.statusText, { color: p.is_active ? '#065F46' : '#991B1B' }]}>
                    {p.is_active ? 'Actif' : 'Inactif'}
                  </Text>
                </View>
              </View>
              {p.client_name && <Text style={styles.cardClient}>{p.client_name}</Text>}
              {p.description ? <Text style={styles.cardDesc} numberOfLines={2}>{p.description}</Text> : null}
              <View style={styles.cardMeta}>
                {p.budget > 0 && <Text style={styles.metaItem}>Budget: {p.budget.toLocaleString()} CHF</Text>}
                {p.hourly_rate > 0 && <Text style={styles.metaItem}>Taux: {p.hourly_rate} CHF/h</Text>}
                {p.location ? <Text style={styles.metaItem}>{p.location}</Text> : null}
              </View>
              {isManager && (
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(p.id)}>
                  <Text style={styles.deleteBtnText}>Désactiver</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}

      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Nouveau projet</Text>
            <TextInput style={styles.input} placeholder="Nom du projet" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} placeholderTextColor={colors.textLight} />
            <TextInput style={styles.input} placeholder="Description" value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} placeholderTextColor={colors.textLight} />
            <TextInput style={styles.input} placeholder="Lieu" value={form.location} onChangeText={(v) => setForm({ ...form, location: v })} placeholderTextColor={colors.textLight} />
            <View style={styles.row}>
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Budget (CHF)" value={form.budget} onChangeText={(v) => setForm({ ...form, budget: v })} keyboardType="numeric" placeholderTextColor={colors.textLight} />
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Taux horaire" value={form.hourly_rate} onChangeText={(v) => setForm({ ...form, hourly_rate: v })} keyboardType="numeric" placeholderTextColor={colors.textLight} />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleCreate} data-testid="submit-project">
                <Text style={styles.submitBtnText}>Créer</Text>
              </TouchableOpacity>
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
  card: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.lg, minWidth: 300, flex: 1, maxWidth: '48%', ...shadows.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  cardTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.full },
  statusText: { fontSize: fontSize.xs, fontWeight: '600' },
  cardClient: { fontSize: fontSize.sm, color: colors.primary, marginBottom: spacing.xs },
  cardDesc: { fontSize: fontSize.sm, color: colors.textLight, marginBottom: spacing.sm },
  cardMeta: { gap: 4, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight },
  metaItem: { fontSize: fontSize.xs, color: colors.textLight },
  deleteBtn: { marginTop: spacing.sm, alignSelf: 'flex-start' },
  deleteBtnText: { fontSize: fontSize.sm, color: colors.error },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, width: '90%', maxWidth: 500 },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.lg },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.sm, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: fontSize.md, color: colors.text, marginBottom: spacing.md, backgroundColor: colors.background },
  row: { flexDirection: 'row', gap: spacing.md },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md, marginTop: spacing.md },
  cancelBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.sm },
  cancelBtnText: { color: colors.textLight, fontSize: fontSize.md },
  submitBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.sm },
  submitBtnText: { color: '#FFF', fontSize: fontSize.md, fontWeight: '600' },
});
