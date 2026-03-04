import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { colors, fontSize, spacing, borderRadius, shadows } from '../../src/theme/constants';
import { getClients, createClient, deleteClient } from '../../src/services/api';

export default function ClientsScreen() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', address: '' });

  const loadData = useCallback(async () => {
    try {
      const res = await getClients();
      setClients(res.data);
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
      await createClient(form);
      setShowModal(false);
      setForm({ name: '', email: '', phone: '', company: '', address: '' });
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erreur');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteClient(id);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erreur');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Clients</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)} data-testid="add-client-button">
          <Text style={styles.addBtnText}>+ Nouveau client</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : clients.length === 0 ? (
        <View style={styles.empty}><Text style={styles.emptyText}>Aucun client</Text></View>
      ) : (
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 2 }]}>Nom</Text>
            <Text style={[styles.th, { flex: 2 }]}>Email</Text>
            <Text style={[styles.th, { flex: 1.5 }]}>Société</Text>
            <Text style={[styles.th, { flex: 1.5 }]}>Téléphone</Text>
            <Text style={[styles.th, { flex: 1 }]}>Actions</Text>
          </View>
          {clients.map((c) => (
            <View key={c.id} style={styles.tableRow}>
              <Text style={[styles.td, { flex: 2, fontWeight: '600' }]}>{c.name}</Text>
              <Text style={[styles.td, { flex: 2 }]}>{c.email || '-'}</Text>
              <Text style={[styles.td, { flex: 1.5 }]}>{c.company || '-'}</Text>
              <Text style={[styles.td, { flex: 1.5 }]}>{c.phone || '-'}</Text>
              <View style={[styles.td, { flex: 1 }]}>
                <TouchableOpacity onPress={() => handleDelete(c.id)}>
                  <Text style={styles.deleteText}>Supprimer</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Nouveau client</Text>
            <TextInput style={styles.input} placeholder="Nom" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} placeholderTextColor={colors.textLight} />
            <TextInput style={styles.input} placeholder="Email" value={form.email} onChangeText={(v) => setForm({ ...form, email: v })} keyboardType="email-address" autoCapitalize="none" placeholderTextColor={colors.textLight} />
            <TextInput style={styles.input} placeholder="Société" value={form.company} onChangeText={(v) => setForm({ ...form, company: v })} placeholderTextColor={colors.textLight} />
            <View style={styles.row}>
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Téléphone" value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} placeholderTextColor={colors.textLight} />
            </View>
            <TextInput style={[styles.input, { minHeight: 60 }]} placeholder="Adresse" value={form.address} onChangeText={(v) => setForm({ ...form, address: v })} multiline placeholderTextColor={colors.textLight} />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}><Text style={styles.cancelBtnText}>Annuler</Text></TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleCreate} data-testid="submit-client"><Text style={styles.submitBtnText}>Créer</Text></TouchableOpacity>
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
  table: { backgroundColor: colors.surface, borderRadius: borderRadius.md, overflow: 'hidden', ...shadows.sm },
  tableHeader: { flexDirection: 'row', backgroundColor: colors.borderLight, paddingVertical: 12, paddingHorizontal: spacing.md },
  th: { fontSize: fontSize.xs, fontWeight: '700', color: colors.textLight, textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  td: { fontSize: fontSize.sm, color: colors.text },
  deleteText: { color: colors.error, fontSize: fontSize.sm },
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
