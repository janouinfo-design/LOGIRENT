import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { colors, fontSize, spacing, borderRadius, shadows } from '../../src/theme/constants';
import { getUsers, registerUser, getDepartments } from '../../src/services/api';

export default function UsersScreen() {
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', first_name: '', last_name: '', role: 'employee', contract_hours: '42', department_id: '' });

  const loadData = useCallback(async () => {
    try {
      const [usersRes, deptRes] = await Promise.all([getUsers(), getDepartments()]);
      setUsers(usersRes.data);
      setDepartments(deptRes.data);
    } catch (err) {
      console.log('Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    try {
      await registerUser({
        email: form.email,
        password: form.password,
        first_name: form.first_name,
        last_name: form.last_name,
        role: form.role,
        contract_hours: parseFloat(form.contract_hours) || 42,
        department_id: form.department_id || null,
      });
      setShowModal(false);
      setForm({ email: '', password: '', first_name: '', last_name: '', role: 'employee', contract_hours: '42', department_id: '' });
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erreur');
    }
  };

  const roleLabel = (r: string) => {
    switch (r) { case 'admin': return 'Admin'; case 'manager': return 'Manager'; default: return 'Employé'; }
  };
  const roleColor = (r: string) => {
    switch (r) { case 'admin': return { bg: '#EDE9FE', text: '#5B21B6' }; case 'manager': return { bg: colors.primaryLight, text: colors.primary }; default: return { bg: colors.borderLight, text: colors.textLight }; }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Utilisateurs</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)} data-testid="add-user-button">
          <Text style={styles.addBtnText}>+ Nouvel utilisateur</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 2 }]}>Nom</Text>
            <Text style={[styles.th, { flex: 2 }]}>Email</Text>
            <Text style={[styles.th, { flex: 1 }]}>Rôle</Text>
            <Text style={[styles.th, { flex: 1.5 }]}>Département</Text>
            <Text style={[styles.th, { flex: 1 }]}>Contrat</Text>
          </View>
          {users.map((u) => {
            const rc = roleColor(u.role);
            return (
              <View key={u.id} style={styles.tableRow}>
                <Text style={[styles.td, { flex: 2, fontWeight: '600' }]}>{u.first_name} {u.last_name}</Text>
                <Text style={[styles.td, { flex: 2 }]}>{u.email}</Text>
                <View style={[styles.td, { flex: 1 }]}>
                  <View style={[styles.roleBadge, { backgroundColor: rc.bg }]}>
                    <Text style={[styles.roleText, { color: rc.text }]}>{roleLabel(u.role)}</Text>
                  </View>
                </View>
                <Text style={[styles.td, { flex: 1.5 }]}>{u.department_name || '-'}</Text>
                <Text style={[styles.td, { flex: 1 }]}>{u.contract_hours}h/sem</Text>
              </View>
            );
          })}
        </View>
      )}

      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Nouvel utilisateur</Text>
            <View style={styles.row}>
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Prénom" value={form.first_name} onChangeText={(v) => setForm({ ...form, first_name: v })} placeholderTextColor={colors.textLight} />
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Nom" value={form.last_name} onChangeText={(v) => setForm({ ...form, last_name: v })} placeholderTextColor={colors.textLight} />
            </View>
            <TextInput style={styles.input} placeholder="Email" value={form.email} onChangeText={(v) => setForm({ ...form, email: v })} keyboardType="email-address" autoCapitalize="none" placeholderTextColor={colors.textLight} />
            <TextInput style={styles.input} placeholder="Mot de passe" value={form.password} onChangeText={(v) => setForm({ ...form, password: v })} secureTextEntry placeholderTextColor={colors.textLight} />
            <Text style={styles.label}>Rôle</Text>
            <View style={styles.roleRow}>
              {['employee', 'manager', 'admin'].map((r) => (
                <TouchableOpacity key={r} style={[styles.roleBtn, form.role === r && styles.roleBtnActive]} onPress={() => setForm({ ...form, role: r })}>
                  <Text style={[styles.roleBtnText, form.role === r && styles.roleBtnTextActive]}>{roleLabel(r)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.row}>
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Heures contrat" value={form.contract_hours} onChangeText={(v) => setForm({ ...form, contract_hours: v })} keyboardType="numeric" placeholderTextColor={colors.textLight} />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}><Text style={styles.cancelBtnText}>Annuler</Text></TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleCreate} data-testid="submit-user"><Text style={styles.submitBtnText}>Créer</Text></TouchableOpacity>
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
  table: { backgroundColor: colors.surface, borderRadius: borderRadius.md, overflow: 'hidden', ...shadows.sm },
  tableHeader: { flexDirection: 'row', backgroundColor: colors.borderLight, paddingVertical: 12, paddingHorizontal: spacing.md },
  th: { fontSize: fontSize.xs, fontWeight: '700', color: colors.textLight, textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  td: { fontSize: fontSize.sm, color: colors.text },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.full },
  roleText: { fontSize: fontSize.xs, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, width: '90%', maxWidth: 500 },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.lg },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.sm, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: fontSize.md, color: colors.text, marginBottom: spacing.md, backgroundColor: colors.background },
  row: { flexDirection: 'row', gap: spacing.md },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  roleRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  roleBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.border },
  roleBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  roleBtnText: { fontSize: fontSize.sm, color: colors.textLight },
  roleBtnTextActive: { color: '#FFF', fontWeight: '600' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md, marginTop: spacing.md },
  cancelBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.sm },
  cancelBtnText: { color: colors.textLight, fontSize: fontSize.md },
  submitBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.sm },
  submitBtnText: { color: '#FFF', fontSize: fontSize.md, fontWeight: '600' },
});
