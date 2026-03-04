import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { colors, fontSize, spacing, borderRadius, shadows } from '../../src/theme/constants';
import { updateUser } from '../../src/services/api';

export default function ProfileScreen() {
  const { user, refreshUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone: user?.phone || '',
    contract_hours: user?.contract_hours?.toString() || '42',
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setMsg('');
    try {
      await updateUser(user.id, {
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone,
        contract_hours: parseFloat(form.contract_hours) || 42,
      });
      await refreshUser();
      setEditing(false);
      setMsg('Profil mis à jour');
    } catch (err: any) {
      setMsg(err.response?.data?.detail || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const roleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrateur';
      case 'manager': return 'Manager';
      default: return 'Employé';
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Profil</Text>

      <View style={styles.card}>
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.first_name?.[0]}{user?.last_name?.[0]}</Text>
          </View>
          <View>
            <Text style={styles.userName}>{user?.first_name} {user?.last_name}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            <View style={styles.roleBadge}><Text style={styles.roleText}>{roleLabel(user?.role || '')}</Text></View>
          </View>
        </View>

        {msg ? (
          <View style={[styles.msgBox, msg.includes('Erreur') ? styles.errorBox : styles.successBox]}>
            <Text style={msg.includes('Erreur') ? styles.errorText : styles.successText}>{msg}</Text>
          </View>
        ) : null}

        <View style={styles.fields}>
          <View style={styles.fieldRow}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Prénom</Text>
              {editing ? (
                <TextInput style={styles.input} value={form.first_name} onChangeText={(v) => setForm({ ...form, first_name: v })} />
              ) : (
                <Text style={styles.fieldValue}>{user?.first_name}</Text>
              )}
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Nom</Text>
              {editing ? (
                <TextInput style={styles.input} value={form.last_name} onChangeText={(v) => setForm({ ...form, last_name: v })} />
              ) : (
                <Text style={styles.fieldValue}>{user?.last_name}</Text>
              )}
            </View>
          </View>
          <View style={styles.fieldRow}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Téléphone</Text>
              {editing ? (
                <TextInput style={styles.input} value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} />
              ) : (
                <Text style={styles.fieldValue}>{user?.phone || '-'}</Text>
              )}
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Heures contrat/semaine</Text>
              {editing ? (
                <TextInput style={styles.input} value={form.contract_hours} onChangeText={(v) => setForm({ ...form, contract_hours: v })} keyboardType="numeric" />
              ) : (
                <Text style={styles.fieldValue}>{user?.contract_hours}h</Text>
              )}
            </View>
          </View>
          {user?.department_name && (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Département</Text>
              <Text style={styles.fieldValue}>{user.department_name}</Text>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          {editing ? (
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)}>
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} data-testid="save-profile">
                {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Sauvegarder</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)} data-testid="edit-profile">
              <Text style={styles.editBtnText}>Modifier le profil</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, marginBottom: spacing.lg },
  card: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, ...shadows.md },
  avatarSection: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginBottom: spacing.lg, paddingBottom: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFF', fontSize: fontSize.xl, fontWeight: '700' },
  userName: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  userEmail: { fontSize: fontSize.sm, color: colors.textLight, marginBottom: spacing.xs },
  roleBadge: { backgroundColor: colors.primaryLight, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: borderRadius.full },
  roleText: { fontSize: fontSize.xs, fontWeight: '600', color: colors.primary },
  msgBox: { padding: spacing.md, borderRadius: borderRadius.sm, marginBottom: spacing.md },
  errorBox: { backgroundColor: colors.errorLight },
  successBox: { backgroundColor: colors.successLight },
  errorText: { color: colors.error, fontSize: fontSize.sm },
  successText: { color: '#065F46', fontSize: fontSize.sm },
  fields: { gap: spacing.md },
  fieldRow: { flexDirection: 'row', gap: spacing.md },
  field: { flex: 1, marginBottom: spacing.sm },
  fieldLabel: { fontSize: fontSize.xs, color: colors.textLight, textTransform: 'uppercase', marginBottom: spacing.xs },
  fieldValue: { fontSize: fontSize.md, color: colors.text, fontWeight: '500' },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.sm, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: fontSize.md, color: colors.text, backgroundColor: colors.background },
  actions: { marginTop: spacing.lg, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.borderLight },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md },
  editBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.sm, alignSelf: 'flex-start' },
  editBtnText: { color: '#FFF', fontSize: fontSize.md, fontWeight: '600' },
  cancelBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.sm },
  cancelBtnText: { color: colors.textLight, fontSize: fontSize.md },
  saveBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.sm },
  saveBtnText: { color: '#FFF', fontSize: fontSize.md, fontWeight: '600' },
});
