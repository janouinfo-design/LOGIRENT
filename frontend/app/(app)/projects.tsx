import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, ScrollView, ActivityIndicator, Modal, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../../src/theme/constants';
import { useAuth } from '../../src/context/AuthContext';
import { getProjects, createProject, deleteProject, updateProject, getClients, getAllProjectsMonthlyHours } from '../../src/services/api';
import { MapPicker } from '../../src/components/MapPicker';

export default function ProjectsScreen() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [monthlyHours, setMonthlyHours] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', description: '', client_id: '', budget: '', hourly_rate: '', currency: 'CHF', location: '',
    latitude: '', longitude: '', geofence_radius: '100'
  });
  const isManager = user?.role === 'manager' || user?.role === 'admin';

  const loadData = useCallback(async () => {
    try {
      const [projRes, clientRes, hoursRes] = await Promise.all([
        getProjects({ active_only: false }),
        getClients(),
        getAllProjectsMonthlyHours()
      ]);
      setProjects(projRes.data);
      setClients(clientRes.data);
      setMonthlyHours(hoursRes.data);
    } catch (err) {
      console.log('Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const resetForm = () => {
    setForm({ name: '', description: '', client_id: '', budget: '', hourly_rate: '', currency: 'CHF', location: '', latitude: '', longitude: '', geofence_radius: '100' });
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

  const handleMapLocationChange = (lat: number, lng: number) => {
    setForm(f => ({ ...f, latitude: lat.toString(), longitude: lng.toString() }));
  };

  const handleCreate = async () => {
    try {
      const payload = {
        name: form.name,
        description: form.description,
        client_id: form.client_id || null,
        budget: parseFloat(form.budget) || 0,
        hourly_rate: parseFloat(form.hourly_rate) || 0,
        currency: form.currency || 'CHF',
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
      currency: p.currency || 'CHF',
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
  const parsedLat = form.latitude ? parseFloat(form.latitude) : null;
  const parsedLng = form.longitude ? parseFloat(form.longitude) : null;

  const formatCurrency = (val: number, currency: string) => {
    return `${val.toLocaleString('fr-CH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${currency}`;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title} data-testid="projects-title">Projets</Text>
        {isManager && (
          <Pressable style={styles.addBtn} onPress={() => { resetForm(); setShowModal(true); }} data-testid="add-project-button">
            <Text style={styles.addBtnText}>+ Nouveau projet</Text>
          </Pressable>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : projects.length === 0 ? (
        <View style={styles.empty}><Text style={styles.emptyText}>Aucun projet</Text></View>
      ) : (
        <View style={styles.grid}>
          {projects.map((p) => {
            const hrs = monthlyHours[p.id] || 0;
            const cur = p.currency || 'CHF';
            return (
              <View key={p.id} style={styles.card} data-testid={`project-card-${p.id}`}>
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

                {/* Summary Cards */}
                <View style={styles.summaryRow} data-testid={`project-summary-${p.id}`}>
                  <View style={[styles.summaryCard, { backgroundColor: '#EFF6FF' }]}>
                    <MaterialIcons name="account-balance-wallet" size={18} color="#2563EB" />
                    <Text style={styles.summaryLabel}>Budget total</Text>
                    <Text style={[styles.summaryValue, { color: '#2563EB' }]} data-testid={`project-budget-${p.id}`}>
                      {formatCurrency(p.budget || 0, cur)}
                    </Text>
                  </View>
                  <View style={[styles.summaryCard, { backgroundColor: '#F0FDF4' }]}>
                    <MaterialIcons name="attach-money" size={18} color="#16A34A" />
                    <Text style={styles.summaryLabel}>Taux horaire</Text>
                    <Text style={[styles.summaryValue, { color: '#16A34A' }]} data-testid={`project-rate-${p.id}`}>
                      {p.hourly_rate || 0} {cur}/h
                    </Text>
                  </View>
                  <View style={[styles.summaryCard, { backgroundColor: '#FFF7ED' }]}>
                    <MaterialIcons name="schedule" size={18} color="#EA580C" />
                    <Text style={styles.summaryLabel}>Heures ce mois</Text>
                    <Text style={[styles.summaryValue, { color: '#EA580C' }]} data-testid={`project-hours-${p.id}`}>
                      {hrs}h
                    </Text>
                  </View>
                </View>

                {p.location ? <Text style={styles.metaItem}>{p.location}</Text> : null}

                {/* GPS Info */}
                {p.latitude && p.longitude ? (
                  <View style={styles.gpsInfo}>
                    <MaterialIcons name="location-on" size={14} color={colors.primary} />
                    <Text style={styles.gpsText}>GPS: {p.latitude.toFixed(4)}, {p.longitude.toFixed(4)}</Text>
                    <View style={styles.radiusBadge}>
                      <Text style={styles.radiusBadgeText}>{p.geofence_radius}m</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.gpsInfo}>
                    <MaterialIcons name="location-off" size={14} color={colors.textLight} />
                    <Text style={[styles.gpsText, { color: colors.textLight }]}>Pas de georeperage</Text>
                  </View>
                )}
                {isManager && (
                  <View style={styles.cardActions}>
                    <Pressable style={styles.editBtn} onPress={() => handleEdit(p)} data-testid={`edit-project-${p.id}`}>
                      <MaterialIcons name="edit" size={16} color={colors.primary} />
                      <Text style={styles.editBtnText}>Modifier</Text>
                    </Pressable>
                    <Pressable onPress={() => handleDelete(p.id)} data-testid={`delete-project-${p.id}`}>
                      <Text style={styles.deleteBtnText}>Desactiver</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Create/Edit Modal */}
      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editId ? 'Modifier le projet' : 'Nouveau projet'}</Text>
                <Pressable onPress={() => { setShowModal(false); resetForm(); }}>
                  <MaterialIcons name="close" size={24} color={colors.textLight} />
                </Pressable>
              </View>

              <TextInput style={styles.input} placeholder="Nom du projet" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} placeholderTextColor={colors.textLight} data-testid="project-name-input" />
              <TextInput style={styles.input} placeholder="Description" value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} placeholderTextColor={colors.textLight} data-testid="project-description-input" />

              {/* Client selector */}
              <Text style={styles.label}>Client</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                <Pressable
                  style={[styles.clientChip, !form.client_id && styles.clientChipActive]}
                  onPress={() => setForm({ ...form, client_id: '' })}
                >
                  <Text style={[styles.clientChipText, !form.client_id && styles.clientChipTextActive]}>Aucun</Text>
                </Pressable>
                {clients.map((c: any) => (
                  <Pressable
                    key={c.id}
                    style={[styles.clientChip, form.client_id === c.id && styles.clientChipActive]}
                    onPress={() => setForm({ ...form, client_id: c.id })}
                  >
                    <Text style={[styles.clientChipText, form.client_id === c.id && styles.clientChipTextActive]}>{c.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <TextInput style={styles.input} placeholder="Lieu" value={form.location} onChangeText={(v) => setForm({ ...form, location: v })} placeholderTextColor={colors.textLight} />

              {/* Budget & Rate with Currency */}
              <Text style={styles.label}>Devise</Text>
              <View style={styles.currencyRow}>
                {['CHF', 'EUR', 'USD'].map((c) => (
                  <Pressable
                    key={c}
                    style={[styles.currencyChip, form.currency === c && styles.currencyChipActive]}
                    onPress={() => setForm({ ...form, currency: c })}
                    data-testid={`currency-${c}`}
                  >
                    <Text style={[styles.currencyChipText, form.currency === c && styles.currencyChipTextActive]}>{c}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Budget total ({form.currency})</Text>
                  <TextInput style={styles.input} placeholder="0" value={form.budget} onChangeText={(v) => setForm({ ...form, budget: v })} keyboardType="numeric" placeholderTextColor={colors.textLight} data-testid="project-budget-input" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Taux horaire ({form.currency}/h)</Text>
                  <TextInput style={styles.input} placeholder="0" value={form.hourly_rate} onChangeText={(v) => setForm({ ...form, hourly_rate: v })} keyboardType="numeric" placeholderTextColor={colors.textLight} data-testid="project-rate-input" />
                </View>
              </View>

              {/* GPS Section with Interactive Map */}
              <View style={styles.gpsSection}>
                <View style={styles.gpsSectionHeader}>
                  <MaterialIcons name="location-on" size={20} color={colors.primary} />
                  <Text style={styles.gpsSectionTitle}>Georeperage GPS</Text>
                </View>
                <Text style={styles.gpsSectionDesc}>
                  Cliquez sur la carte ou utilisez votre position pour definir la zone de pointage.
                </Text>

                {/* Interactive Map */}
                <View style={styles.mapWrapper}>
                  <MapPicker
                    latitude={parsedLat}
                    longitude={parsedLng}
                    radius={parseInt(form.geofence_radius) || 100}
                    onLocationChange={handleMapLocationChange}
                    height={250}
                  />
                </View>

                <Pressable style={styles.gpsBtn} onPress={handleGetLocation}>
                  <MaterialIcons name="my-location" size={18} color="#FFF" />
                  <Text style={styles.gpsBtnText}>Utiliser ma position actuelle</Text>
                </Pressable>

                {/* Coords display */}
                {parsedLat && parsedLng ? (
                  <View style={styles.coordsDisplay}>
                    <MaterialIcons name="check-circle" size={14} color={colors.success} />
                    <Text style={styles.coordsText}>
                      Position: {parsedLat.toFixed(6)}, {parsedLng.toFixed(6)}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.coordsDisplay}>
                    <MaterialIcons name="info" size={14} color={colors.textLight} />
                    <Text style={[styles.coordsText, { color: colors.textLight }]}>
                      Cliquez sur la carte pour placer le marqueur
                    </Text>
                  </View>
                )}

                <Text style={styles.label}>Rayon de georeperage</Text>
                <View style={styles.radiusRow}>
                  {radiusOptions.map((r) => (
                    <Pressable
                      key={r}
                      style={[styles.radiusOption, form.geofence_radius === r.toString() && styles.radiusOptionActive]}
                      onPress={() => setForm({ ...form, geofence_radius: r.toString() })}
                    >
                      <Text style={[styles.radiusOptionText, form.geofence_radius === r.toString() && styles.radiusOptionTextActive]}>
                        {r}m
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.modalActions}>
                <Pressable style={styles.cancelBtn} onPress={() => { setShowModal(false); resetForm(); }}>
                  <Text style={styles.cancelBtnText}>Annuler</Text>
                </Pressable>
                <Pressable style={styles.submitBtn} onPress={handleCreate} data-testid="submit-project">
                  <Text style={styles.submitBtnText}>{editId ? 'Sauvegarder' : 'Creer'}</Text>
                </Pressable>
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
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: fontSize.md, color: colors.textLight },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.lg, minWidth: 300, flex: 1, maxWidth: '48%', borderWidth: 1, borderColor: colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  cardTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.full },
  statusText: { fontSize: fontSize.xs, fontWeight: '600' },
  cardClient: { fontSize: fontSize.sm, color: colors.primary, marginBottom: spacing.xs },
  cardDesc: { fontSize: fontSize.sm, color: colors.textLight, marginBottom: spacing.sm },
  summaryRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, marginBottom: spacing.sm },
  summaryCard: {
    flex: 1,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    alignItems: 'center',
    gap: 4,
  },
  summaryLabel: { fontSize: 10, fontWeight: '600', color: colors.textLight, textAlign: 'center' },
  summaryValue: { fontSize: fontSize.sm, fontWeight: '800' },
  metaItem: { fontSize: fontSize.xs, color: colors.textLight, marginBottom: spacing.xs },
  gpsInfo: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight },
  gpsText: { fontSize: fontSize.xs, color: colors.primary, flex: 1 },
  radiusBadge: { backgroundColor: colors.primaryLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: borderRadius.full },
  radiusBadgeText: { fontSize: 10, fontWeight: '700', color: colors.primary },
  cardActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editBtnText: { fontSize: fontSize.sm, color: colors.primary },
  deleteBtnText: { fontSize: fontSize.sm, color: colors.error },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalScrollContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.md },
  modal: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, width: '100%', maxWidth: 560 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.sm, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: fontSize.md, color: colors.text, marginBottom: spacing.md, backgroundColor: colors.background },
  row: { flexDirection: 'row', gap: spacing.md },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.xs, marginTop: spacing.sm },
  clientChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
  },
  clientChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  clientChipText: { fontSize: fontSize.sm, color: colors.text, fontWeight: '500' },
  clientChipTextActive: { color: '#FFF' },
  currencyRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  currencyChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  currencyChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  currencyChipText: { fontSize: fontSize.sm, color: colors.text, fontWeight: '600' },
  currencyChipTextActive: { color: '#FFF' },
  gpsSection: { backgroundColor: '#F0F4FF', borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: '#DBEAFE' },
  gpsSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  gpsSectionTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  gpsSectionDesc: { fontSize: fontSize.xs, color: colors.textLight, marginBottom: spacing.md },
  mapWrapper: { borderRadius: borderRadius.md, overflow: 'hidden', marginBottom: spacing.md },
  gpsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, paddingVertical: 10, borderRadius: borderRadius.sm, marginBottom: spacing.sm },
  gpsBtnText: { color: '#FFF', fontSize: fontSize.sm, fontWeight: '600' },
  coordsDisplay: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  coordsText: { fontSize: fontSize.xs, color: colors.success },
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
