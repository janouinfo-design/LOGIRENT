import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TextInput, TouchableOpacity, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../../src/theme/constants';
import { useAuth } from '../../src/context/AuthContext';
import { getDirectory, updateUser } from '../../src/services/api';

const STATUS_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  office: { icon: 'business', color: '#2563EB', label: 'Au bureau' },
  home: { icon: 'home', color: '#7C3AED', label: 'Teletravail' },
  onsite: { icon: 'construction', color: '#059669', label: 'Sur chantier' },
  vacation: { icon: 'beach-access', color: '#F59E0B', label: 'Vacances' },
  sick: { icon: 'local-hospital', color: '#EF4444', label: 'Maladie' },
  accident: { icon: 'warning', color: '#DC2626', label: 'Accident' },
  training: { icon: 'school', color: '#6366F1', label: 'Formation' },
  maternity: { icon: 'child-friendly', color: '#EC4899', label: 'Maternite' },
  paternity: { icon: 'child-friendly', color: '#8B5CF6', label: 'Paternite' },
  special: { icon: 'event-busy', color: '#F97316', label: 'Conge special' },
  absent: { icon: 'person-off', color: '#94A3B8', label: 'Absent' },
};
const ROLE_LABELS: Record<string, string> = { admin: 'Admin', manager: 'Manager', employee: 'Employe' };

export default function DirectoryScreen() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editEmp, setEditEmp] = useState<any>(null);
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', phone: '', contract_hours: '' });
  const isManager = user?.role === 'manager' || user?.role === 'admin';

  const loadData = () => {
    setLoading(true);
    getDirectory().then(r => setEmployees(r.data)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleEdit = (emp: any) => {
    setEditEmp(emp);
    setEditForm({
      first_name: emp.first_name,
      last_name: emp.last_name,
      phone: emp.phone || '',
      contract_hours: '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editEmp) return;
    try {
      const payload: any = {};
      if (editForm.first_name) payload.first_name = editForm.first_name;
      if (editForm.last_name) payload.last_name = editForm.last_name;
      if (editForm.phone !== undefined) payload.phone = editForm.phone;
      if (editForm.contract_hours) payload.contract_hours = parseFloat(editForm.contract_hours);
      await updateUser(editEmp.id, payload);
      setShowModal(false);
      setEditEmp(null);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erreur');
    }
  };

  const filtered = employees.filter(e => `${e.first_name} ${e.last_name} ${e.email} ${e.department || ''} ${e.phone || ''}`.toLowerCase().includes(search.toLowerCase()));
  const active = filtered.filter(e => ['office', 'home', 'onsite'].includes(e.status));
  const absent = filtered.filter(e => !['office', 'home', 'onsite'].includes(e.status));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title} data-testid="directory-title">Annuaire</Text>

      {/* Search bar */}
      <View style={styles.searchRow} data-testid="directory-search-bar">
        <MaterialIcons name="search" size={20} color={colors.textLight} style={{ marginRight: spacing.sm }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un employe..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor={colors.textLight}
          data-testid="directory-search-input"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <MaterialIcons name="close" size={18} color={colors.textLight} />
          </TouchableOpacity>
        )}
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { borderLeftColor: '#059669' }]}><Text style={[styles.summaryValue, { color: '#059669' }]}>{active.length}</Text><Text style={styles.summaryLabel}>Actifs</Text></View>
        <View style={[styles.summaryCard, { borderLeftColor: '#F59E0B' }]}><Text style={[styles.summaryValue, { color: '#F59E0B' }]}>{absent.length}</Text><Text style={styles.summaryLabel}>Absents</Text></View>
        <View style={[styles.summaryCard, { borderLeftColor: colors.primary }]}><Text style={[styles.summaryValue, { color: colors.primary }]}>{filtered.length}</Text><Text style={styles.summaryLabel}>Total</Text></View>
      </View>

      {loading ? <ActivityIndicator size="large" color={colors.primary} /> : (
        <View style={styles.grid}>
          {filtered.map(emp => {
            const cfg = STATUS_CONFIG[emp.status] || STATUS_CONFIG.absent;
            return (
              <View key={emp.id} style={styles.card} data-testid={`directory-card-${emp.id}`}>
                <View style={styles.cardHeader}>
                  <View style={[styles.avatar, { backgroundColor: cfg.color + '22' }]}>
                    <Text style={[styles.avatarText, { color: cfg.color }]}>{emp.first_name[0]}{emp.last_name[0]}</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.empName}>{emp.first_name} {emp.last_name}</Text>
                    <Text style={styles.empRole}>{ROLE_LABELS[emp.role] || emp.role}</Text>
                  </View>
                  <View style={[styles.statusDot, { backgroundColor: cfg.color }]} />
                </View>
                <View style={styles.cardDetails}>
                  <View style={styles.detailRow}><MaterialIcons name="email" size={14} color={colors.textLight} /><Text style={styles.detailText}>{emp.email}</Text></View>
                  {emp.phone ? <View style={styles.detailRow}><MaterialIcons name="phone" size={14} color={colors.textLight} /><Text style={styles.detailText}>{emp.phone}</Text></View> : null}
                  {emp.department ? <View style={styles.detailRow}><MaterialIcons name="business" size={14} color={colors.textLight} /><Text style={styles.detailText}>{emp.department}</Text></View> : null}
                </View>
                <View style={styles.cardFooter}>
                  <View style={[styles.statusBadge, { backgroundColor: cfg.color + '18' }]}>
                    <MaterialIcons name={cfg.icon as any} size={14} color={cfg.color} />
                    <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                  {isManager && (
                    <TouchableOpacity style={styles.editBtn} onPress={() => handleEdit(emp)} data-testid={`edit-employee-${emp.id}`}>
                      <MaterialIcons name="edit" size={14} color={colors.primary} />
                      <Text style={styles.editBtnText}>Modifier</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Edit Modal */}
      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Modifier l'employe</Text>
              <TouchableOpacity onPress={() => { setShowModal(false); setEditEmp(null); }}>
                <MaterialIcons name="close" size={24} color={colors.textLight} />
              </TouchableOpacity>
            </View>
            {editEmp && (
              <>
                <Text style={styles.label}>Prenom</Text>
                <TextInput style={styles.input} value={editForm.first_name} onChangeText={v => setEditForm({ ...editForm, first_name: v })} placeholderTextColor={colors.textLight} data-testid="edit-first-name" />
                <Text style={styles.label}>Nom</Text>
                <TextInput style={styles.input} value={editForm.last_name} onChangeText={v => setEditForm({ ...editForm, last_name: v })} placeholderTextColor={colors.textLight} data-testid="edit-last-name" />
                <Text style={styles.label}>Telephone</Text>
                <TextInput style={styles.input} value={editForm.phone} onChangeText={v => setEditForm({ ...editForm, phone: v })} placeholder="+41 79 123 45 67" placeholderTextColor={colors.textLight} data-testid="edit-phone" />
                <Text style={styles.label}>Heures contrat / semaine</Text>
                <TextInput style={styles.input} value={editForm.contract_hours} onChangeText={v => setEditForm({ ...editForm, contract_hours: v })} placeholder="42" keyboardType="numeric" placeholderTextColor={colors.textLight} data-testid="edit-contract-hours" />
              </>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowModal(false); setEditEmp(null); }}>
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleSave} data-testid="save-employee">
                <Text style={styles.submitBtnText}>Sauvegarder</Text>
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
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
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
  summaryRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  summaryCard: { flex: 1, backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 4 },
  summaryValue: { fontSize: fontSize.xl, fontWeight: '800' },
  summaryLabel: { fontSize: fontSize.xs, color: colors.textLight },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, minWidth: 280, flex: 1, maxWidth: '48%', borderWidth: 1, borderColor: colors.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: fontSize.md, fontWeight: '800' },
  cardInfo: { flex: 1 },
  empName: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  empRole: { fontSize: fontSize.xs, color: colors.textLight },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  cardDetails: { gap: 4, marginBottom: spacing.sm },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontSize: fontSize.xs, color: colors.textLight },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xs },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start' },
  statusText: { fontSize: 11, fontWeight: '600' },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editBtnText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, width: '90%', maxWidth: 460 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.sm, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: fontSize.md, color: colors.text, marginBottom: spacing.md, backgroundColor: colors.background },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md, marginTop: spacing.sm },
  cancelBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.sm },
  cancelBtnText: { color: colors.textLight, fontSize: fontSize.md },
  submitBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.sm },
  submitBtnText: { color: '#FFF', fontSize: fontSize.md, fontWeight: '600' },
});
