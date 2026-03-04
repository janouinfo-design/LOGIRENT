import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView, ActivityIndicator, Modal, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../../src/theme/constants';
import { useAuth } from '../../src/context/AuthContext';
import { getProjects, createProject, deleteProject, updateProject, getClients } from '../../src/services/api';

export default function ProjectsScreen() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', description: '', client_id: '', budget: '', hourly_rate: '', location: '',
    latitude: '', longitude: '', geofence_radius: '100'
  });
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

  const resetForm = () => {
    setForm({ name: '', description: '', client_id: '', budget: '', hourly_rate: '', location: '', latitude: '', longitude: '', geofence_radius: '100' });
    setEditId(null);
  };

  const handleGetLocation = () => {
    if (Platform.OS === 'web' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setForm(f => ({
            ...f,
            latitude: pos.coords.latitude.toFixed(6),
            longitude: pos.coords.longitude.toFixed(6),
          }));
        },
        (err) => alert('Impossible d\'obtenir la position GPS: ' + err.message),
        { enableHighAccuracy: true }
      );
    }
  };

  const handleCreate = async () => {
    try {
      const payload = {
        name: form.name,
        description: form.description,
        client_id: form.client_id || null,
        budget: parseFloat(form.budget) || 0,
        hourly_rate: parseFloat(form.hourly_rate) || 0,
        location: form.location,
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
        geofence_radius: parseInt(form.geofence_radius) || 100,
      };

      if (editId) {
        await updateProject(editId, payload);
      } else {
        await createProject(payload);
      }
      setShowModal(false);
      resetForm();
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erreur');
    }
  };

  const handleEdit = (p: any) => {
    setForm({
      name: p.name,
      description: p.description || '',
      client_id: p.client_id || '',
      budget: p.budget?.toString() || '',
      hourly_rate: p.hourly_rate?.toString() || '',
      location: p.location || '',
      latitude: p.latitude?.toString() || '',
      longitude: p.longitude?.toString() || '',
      geofence_radius: p.geofence_radius?.toString() || '100',
    });
    setEditId(p.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    try { await deleteProject(id); await loadData(); } catch (err: any) { alert(err.response?.data?.detail || 'Erreur'); }
  };

  const radiusOptions = [50, 100, 150, 200, 300, 500];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Projets</Text>
        {isManager && (
          <TouchableOpacity style={styles.addBtn} onPress={() => { resetForm(); setShowModal(true); }} testID="add-project-button">
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
                <View style={[styles.statusBadge, { backgroundColor: p.is_active ? '#D1FAE5' : '#FEE2E2' }]}>
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
              {/* GPS Info */}
              {p.latitude && p.longitude ? (
                <View style={styles.gpsInfo}>
                  <MaterialIcons name="location-on" size={14} color={colors.primary} />
                  <Text style={styles.gpsText}>GPS: {p.latitude.toFixed(4)}, {p.longitude.toFixed(4)}</Text>
                  <View style={styles.radiusBadge}>
                    <Text style={styles.radiusText}>{p.geofence_radius}m</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.gpsInfo}>
                  <MaterialIcons name="location-off" size={14} color={colors.textLight} />
                  <Text style={[styles.gpsText, { color: colors.textLight }]}>Pas de géorepérage</Text>
                </View>
              )}
              {isManager && (
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.editBtn} onPress={() => handleEdit(p)}>
                    <MaterialIcons name="edit" size={16} color={colors.primary} />
                    <Text style={styles.editBtnText}>Modifier</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(p.id)}>
                    <Text style={styles.deleteBtnText}>Désactiver</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Create/Edit Modal */}
      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>{editId ? 'Modifier le projet' : 'Nouveau projet'}</Text>
              <TextInput style={styles.input} placeholder="Nom du projet" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} placeholderTextColor={colors.textLight} />
              <TextInput style={styles.input} placeholder="Description" value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} placeholderTextColor={colors.textLight} />
              <TextInput style={styles.input} placeholder="Lieu" value={form.location} onChangeText={(v) => setForm({ ...form, location: v })} placeholderTextColor={colors.textLight} />
              <View style={styles.row}>
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Budget (CHF)" value={form.budget} onChangeText={(v) => setForm({ ...form, budget: v })} keyboardType="numeric" placeholderTextColor={colors.textLight} />
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Taux horaire" value={form.hourly_rate} onChangeText={(v) => setForm({ ...form, hourly_rate: v })} keyboardType="numeric" placeholderTextColor={colors.textLight} />
              </View>

              {/* GPS Section */}
              <View style={styles.gpsSection}>
                <View style={styles.gpsSectionHeader}>
                  <MaterialIcons name="location-on" size={20} color={colors.primary} />
                  <Text style={styles.gpsSectionTitle}>Géorepérage GPS</Text>
                </View>
                <Text style={styles.gpsSectionDesc}>
                  Définissez la position du projet et le rayon dans lequel les employés peuvent pointer.
                </Text>
                <View style={styles.row}>
                  <TextInput style={[styles.input, { flex: 1 }]} placeholder="Latitude" value={form.latitude} onChangeText={(v) => setForm({ ...form, latitude: v })} keyboardType="numeric" placeholderTextColor={colors.textLight} />
                  <TextInput style={[styles.input, { flex: 1 }]} placeholder="Longitude" value={form.longitude} onChangeText={(v) => setForm({ ...form, longitude: v })} keyboardType="numeric" placeholderTextColor={colors.textLight} />
                </View>
                <TouchableOpacity style={styles.gpsBtn} onPress={handleGetLocation}>
                  <MaterialIcons name="my-location" size={18} color="#FFF" />
                  <Text style={styles.gpsBtnText}>Utiliser ma position actuelle</Text>
                </TouchableOpacity>

                <Text style={styles.label}>Rayon de géorepérage</Text>
                <View style={styles.radiusRow}>
                  {radiusOptions.map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.radiusOption, form.geofence_radius === r.toString() && styles.radiusOptionActive]}
                      onPress={() => setForm({ ...form, geofence_radius: r.toString() })}
                    >
                      <Text style={[styles.radiusOptionText, form.geofence_radius === r.toString() && styles.radiusOptionTextActive]}>
                        {r}m
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowModal(false); resetForm(); }}>
                  <Text style={styles.cancelBtnText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitBtn} onPress={handleCreate} testID="submit-project">
                  <Text style={styles.submitBtnText}>{editId ? 'Sauvegarder' : 'Créer'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
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
  card: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.lg, minWidth: 300, flex: 1, maxWidth: '48%', borderWidth: 1, borderColor: colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  cardTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.full },
  statusText: { fontSize: fontSize.xs, fontWeight: '600' },
  cardClient: { fontSize: fontSize.sm, color: colors.primary, marginBottom: spacing.xs },
  cardDesc: { fontSize: fontSize.sm, color: colors.textLight, marginBottom: spacing.sm },
  cardMeta: { gap: 4, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight },
  metaItem: { fontSize: fontSize.xs, color: colors.textLight },
  gpsInfo: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight },
  gpsText: { fontSize: fontSize.xs, color: colors.primary, flex: 1 },
  radiusBadge: { backgroundColor: colors.primaryLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: borderRadius.full },
  radiusText: { fontSize: 10, fontWeight: '700', color: colors.primary },
  cardActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editBtnText: { fontSize: fontSize.sm, color: colors.primary },
  deleteBtnText: { fontSize: fontSize.sm, color: colors.error },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalScrollContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.md },
  modal: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, width: '100%', maxWidth: 520 },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.lg },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.sm, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: fontSize.md, color: colors.text, marginBottom: spacing.md, backgroundColor: colors.background },
  row: { flexDirection: 'row', gap: spacing.md },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.xs, marginTop: spacing.sm },
  gpsSection: { backgroundColor: '#F0F4FF', borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: '#DBEAFE' },
  gpsSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  gpsSectionTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  gpsSectionDesc: { fontSize: fontSize.xs, color: colors.textLight, marginBottom: spacing.md },
  gpsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, paddingVertical: 10, borderRadius: borderRadius.sm, marginBottom: spacing.md },
  gpsBtnText: { color: '#FFF', fontSize: fontSize.sm, fontWeight: '600' },
  radiusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  radiusOption: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  radiusOptionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  radiusOptionText: { fontSize: fontSize.sm, color: colors.textLight, fontWeight: '600' },
  radiusOptionTextActive: { color: '#FFF' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md, marginTop: spacing.md },
  cancelBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.sm },
  cancelBtnText: { color: colors.textLight, fontSize: fontSize.md },
  submitBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.sm },
  submitBtnText: { color: '#FFF', fontSize: fontSize.md, fontWeight: '600' },
});
