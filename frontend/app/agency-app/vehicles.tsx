import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, TextInput, Modal, ScrollView, Alert, Platform, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api/axios';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeStore } from '../../src/store/themeStore';

const SCREEN_W = Dimensions.get('window').width;

interface Vehicle {
  id: string; brand: string; model: string; year: number; price_per_day: number;
  type: string; seats: number; transmission: string; fuel_type: string; status: string;
  description?: string; location?: string; photos?: string[];
}

const STATUS_CONFIG: Record<string, { icon: string; label: string; bg: string; text: string; border: string }> = {
  available: { icon: 'checkmark-circle', label: 'Disponible', bg: '#10B98120', text: '#10B981', border: '#10B98150' },
  rented: { icon: 'car', label: 'Loue', bg: '#FBBF2420', text: '#FBBF24', border: '#FBBF2450' },
  maintenance: { icon: 'construct', label: 'Maintenance', bg: '#EF444420', text: '#EF4444', border: '#EF444450' },
};

const TYPES = ['Berline', 'SUV', 'Citadine', 'Utilitaire', 'Luxe', 'Van', 'Electrique'];
const TRANSMISSIONS = [{ v: 'automatic', l: 'Automatique' }, { v: 'manual', l: 'Manuel' }];
const FUELS = ['Essence', 'Diesel', 'Electrique', 'Hybride'];
const STATUSES = [{ v: 'available', l: 'Disponible' }, { v: 'rented', l: 'Loue' }, { v: 'maintenance', l: 'Maintenance' }];

export default function AgencyVehicles() {
  const { user } = useAuthStore();
  const { colors: C } = useThemeStore();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchVehicles = useCallback(async () => {
    try {
      const params: any = {};
      if (user?.agency_id) params.agency_id = user.agency_id;
      const res = await api.get('/api/vehicles', { params });
      setVehicles(res.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);
  const onRefresh = async () => { setRefreshing(true); await fetchVehicles(); setRefreshing(false); };

  const filtered = useMemo(() => {
    let list = vehicles;
    if (statusFilter !== 'all') list = list.filter(v => v.status === statusFilter);
    if (search) list = list.filter(v =>
      `${v.brand} ${v.model}`.toLowerCase().includes(search.toLowerCase()) ||
      v.type?.toLowerCase().includes(search.toLowerCase())
    );
    return list;
  }, [vehicles, search, statusFilter]);

  const openEdit = (v: Vehicle) => {
    setEditVehicle(v);
    setEditForm({ brand: v.brand, model: v.model, year: String(v.year), type: v.type, price_per_day: String(v.price_per_day), seats: String(v.seats), transmission: v.transmission, fuel_type: v.fuel_type, status: v.status, location: v.location || '', description: v.description || '' });
  };

  const saveEdit = async () => {
    if (!editVehicle) return;
    setSaving(true);
    try {
      await api.put(`/api/admin/vehicles/${editVehicle.id}`, {
        brand: editForm.brand, model: editForm.model, year: parseInt(editForm.year),
        type: editForm.type, price_per_day: parseFloat(editForm.price_per_day),
        seats: parseInt(editForm.seats), transmission: editForm.transmission,
        fuel_type: editForm.fuel_type, status: editForm.status,
        location: editForm.location, description: editForm.description,
      });
      setEditVehicle(null);
      await fetchVehicles();
    } catch (e: any) {
      const msg = e.response?.data?.detail || 'Erreur lors de la sauvegarde';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Erreur', msg);
    } finally { setSaving(false); }
  };

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: vehicles.length, available: 0, rented: 0, maintenance: 0 };
    vehicles.forEach(v => { if (counts[v.status] !== undefined) counts[v.status]++; });
    return counts;
  }, [vehicles]);

  const getStatus = (s: string) => STATUS_CONFIG[s] || { icon: 'help-circle', label: s, bg: '#6B728020', text: '#6B7280', border: '#6B728050' };

  const CARD_GAP = 10;
  const PADDING = 16;
  const NUM_COLS = 4;
  const cardW = (SCREEN_W - PADDING * 2 - CARD_GAP * (NUM_COLS - 1)) / NUM_COLS;

  if (loading) return <View style={[st.container, { backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={C.accent} /></View>;

  return (
    <View style={[st.container, { backgroundColor: C.bg }]}>
      {/* Search */}
      <View style={[st.searchBar, { backgroundColor: C.card, borderColor: C.border }]}>
        <Ionicons name="search" size={18} color={C.textLight} />
        <TextInput style={[st.searchInput, { color: C.text }]} placeholder="Rechercher..." placeholderTextColor={C.textLight} value={search} onChangeText={setSearch} data-testid="vehicle-search" />
      </View>

      {/* Status Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 8 }}>
        {[{ v: 'all', l: 'Tous', icon: 'grid', color: C.accent }, ...STATUSES.map(s => ({ v: s.v, l: s.l, icon: getStatus(s.v).icon, color: getStatus(s.v).text }))].map(f => (
          <TouchableOpacity key={f.v} onPress={() => setStatusFilter(f.v)} data-testid={`filter-${f.v}`}
            style={[st.filterTab, { backgroundColor: statusFilter === f.v ? f.color + '20' : C.card, borderColor: statusFilter === f.v ? f.color : C.border }]}>
            <Ionicons name={f.icon as any} size={14} color={statusFilter === f.v ? f.color : C.textLight} />
            <Text style={{ color: statusFilter === f.v ? f.color : C.textLight, fontSize: 12, fontWeight: statusFilter === f.v ? '700' : '500' }}>{f.l}</Text>
            <View style={[st.countBadge, { backgroundColor: f.color + '30' }]}>
              <Text style={{ color: f.color, fontSize: 10, fontWeight: '800' }}>{statusCounts[f.v] || 0}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Vehicle Grid - 4 columns */}
      <FlatList data={filtered} keyExtractor={(item) => item.id} numColumns={4}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
        contentContainerStyle={{ padding: PADDING, paddingTop: 8, paddingBottom: 32 }}
        columnWrapperStyle={{ gap: CARD_GAP, marginBottom: CARD_GAP }}
        ListEmptyComponent={<View style={st.empty}><Ionicons name="car-outline" size={40} color={C.textLight} /><Text style={{ color: C.textLight, fontSize: 14 }}>Aucun vehicule</Text></View>}
        renderItem={({ item }) => {
          const sc = getStatus(item.status);
          const photo = item.photos?.[0];
          return (
            <TouchableOpacity onPress={() => openEdit(item)} style={[st.card, { width: cardW, backgroundColor: C.card, borderColor: C.border }]} data-testid={`vehicle-card-${item.id}`}>
              {/* Photo */}
              <View style={st.photoBox}>
                {photo ? (
                  <Image source={{ uri: photo }} style={st.photo} resizeMode="cover" />
                ) : (
                  <View style={[st.photoPlaceholder, { backgroundColor: C.border + '40' }]}>
                    <Ionicons name="car-sport" size={28} color={C.textLight} />
                  </View>
                )}
                {/* Status badge overlay */}
                <View style={[st.statusOverlay, { backgroundColor: sc.bg, borderColor: sc.border }]} data-testid={`vehicle-status-${item.id}`}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: sc.text }} />
                  <Text style={{ color: sc.text, fontSize: 9, fontWeight: '800' }}>{sc.label}</Text>
                </View>
              </View>

              {/* Info */}
              <View style={st.cardInfo}>
                <Text style={[st.vehicleName, { color: C.text }]} numberOfLines={1}>{item.brand} {item.model}</Text>
                <Text style={{ color: C.textLight, fontSize: 10, marginTop: 1 }}>{item.year} | {item.type}</Text>
                <View style={st.cardMeta}>
                  <Text style={{ color: C.textLight, fontSize: 9 }}>{item.seats}pl | {item.transmission === 'automatic' ? 'Auto' : 'Man.'}</Text>
                </View>
                <View style={st.priceRow}>
                  <Text style={[st.price, { color: C.accent }]}>CHF {item.price_per_day}</Text>
                  <Text style={{ color: C.textLight, fontSize: 9 }}>/jour</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Edit Modal */}
      <Modal visible={!!editVehicle} animationType="slide" transparent>
        <View style={st.modalOverlay}>
          <View style={[st.modalBox, { backgroundColor: C.card }]}>
            <View style={st.modalHeader}>
              <Text style={[st.modalTitle, { color: C.text }]}>Modifier le vehicule</Text>
              <TouchableOpacity onPress={() => setEditVehicle(null)} data-testid="close-edit-modal">
                <Ionicons name="close" size={24} color={C.textLight} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }}>
              {/* Status Selection */}
              <Text style={[st.fieldLabel, { color: C.textLight }]}>Statut</Text>
              <View style={st.statusRow}>
                {STATUSES.map(s => {
                  const sc2 = getStatus(s.v);
                  const sel = editForm.status === s.v;
                  return (
                    <TouchableOpacity key={s.v} onPress={() => setEditForm({ ...editForm, status: s.v })}
                      style={[st.statusOption, { backgroundColor: sel ? sc2.bg : 'transparent', borderColor: sel ? sc2.text : C.border }]}
                      data-testid={`status-option-${s.v}`}>
                      <Ionicons name={sc2.icon as any} size={18} color={sel ? sc2.text : C.textLight} />
                      <Text style={{ color: sel ? sc2.text : C.textLight, fontSize: 12, fontWeight: sel ? '700' : '500' }}>{s.l}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Fields */}
              <View style={st.fieldRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[st.fieldLabel, { color: C.textLight }]}>Marque</Text>
                  <TextInput style={[st.input, { color: C.text, borderColor: C.border }]} value={editForm.brand} onChangeText={v => setEditForm({ ...editForm, brand: v })} data-testid="edit-brand" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[st.fieldLabel, { color: C.textLight }]}>Modele</Text>
                  <TextInput style={[st.input, { color: C.text, borderColor: C.border }]} value={editForm.model} onChangeText={v => setEditForm({ ...editForm, model: v })} data-testid="edit-model" />
                </View>
              </View>

              <View style={st.fieldRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[st.fieldLabel, { color: C.textLight }]}>Annee</Text>
                  <TextInput style={[st.input, { color: C.text, borderColor: C.border }]} value={editForm.year} keyboardType="numeric" onChangeText={v => setEditForm({ ...editForm, year: v })} data-testid="edit-year" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[st.fieldLabel, { color: C.textLight }]}>Prix/jour (CHF)</Text>
                  <TextInput style={[st.input, { color: C.text, borderColor: C.border }]} value={editForm.price_per_day} keyboardType="numeric" onChangeText={v => setEditForm({ ...editForm, price_per_day: v })} data-testid="edit-price" />
                </View>
              </View>

              <View style={st.fieldRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[st.fieldLabel, { color: C.textLight }]}>Places</Text>
                  <TextInput style={[st.input, { color: C.text, borderColor: C.border }]} value={editForm.seats} keyboardType="numeric" onChangeText={v => setEditForm({ ...editForm, seats: v })} data-testid="edit-seats" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[st.fieldLabel, { color: C.textLight }]}>Lieu</Text>
                  <TextInput style={[st.input, { color: C.text, borderColor: C.border }]} value={editForm.location} onChangeText={v => setEditForm({ ...editForm, location: v })} data-testid="edit-location" />
                </View>
              </View>

              {/* Type */}
              <Text style={[st.fieldLabel, { color: C.textLight }]}>Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {TYPES.map(t => (
                    <TouchableOpacity key={t} onPress={() => setEditForm({ ...editForm, type: t })}
                      style={[st.chip, { backgroundColor: editForm.type === t ? C.accent + '20' : 'transparent', borderColor: editForm.type === t ? C.accent : C.border }]}>
                      <Text style={{ color: editForm.type === t ? C.accent : C.textLight, fontSize: 12, fontWeight: editForm.type === t ? '700' : '500' }}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Transmission */}
              <Text style={[st.fieldLabel, { color: C.textLight }]}>Transmission</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                {TRANSMISSIONS.map(t => (
                  <TouchableOpacity key={t.v} onPress={() => setEditForm({ ...editForm, transmission: t.v })}
                    style={[st.chip, { flex: 1, backgroundColor: editForm.transmission === t.v ? C.accent + '20' : 'transparent', borderColor: editForm.transmission === t.v ? C.accent : C.border }]}>
                    <Text style={{ color: editForm.transmission === t.v ? C.accent : C.textLight, fontSize: 12, fontWeight: editForm.transmission === t.v ? '700' : '500', textAlign: 'center' }}>{t.l}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Fuel */}
              <Text style={[st.fieldLabel, { color: C.textLight }]}>Carburant</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {FUELS.map(f => (
                    <TouchableOpacity key={f} onPress={() => setEditForm({ ...editForm, fuel_type: f.toLowerCase() })}
                      style={[st.chip, { backgroundColor: editForm.fuel_type?.toLowerCase() === f.toLowerCase() ? C.accent + '20' : 'transparent', borderColor: editForm.fuel_type?.toLowerCase() === f.toLowerCase() ? C.accent : C.border }]}>
                      <Text style={{ color: editForm.fuel_type?.toLowerCase() === f.toLowerCase() ? C.accent : C.textLight, fontSize: 12, fontWeight: editForm.fuel_type?.toLowerCase() === f.toLowerCase() ? '700' : '500' }}>{f}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Description */}
              <Text style={[st.fieldLabel, { color: C.textLight }]}>Description</Text>
              <TextInput style={[st.input, st.textArea, { color: C.text, borderColor: C.border }]} value={editForm.description} onChangeText={v => setEditForm({ ...editForm, description: v })} multiline numberOfLines={3} data-testid="edit-description" />
            </ScrollView>

            {/* Actions */}
            <View style={st.modalActions}>
              <TouchableOpacity onPress={() => setEditVehicle(null)} style={[st.actionBtn, { borderColor: C.border }]} data-testid="cancel-edit">
                <Text style={{ color: C.textLight, fontSize: 14, fontWeight: '600' }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveEdit} disabled={saving} style={[st.actionBtn, st.saveBtn, { backgroundColor: C.accent }]} data-testid="save-edit">
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <>
                  <Ionicons name="checkmark" size={18} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Sauvegarder</Text>
                </>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  searchBar: { flexDirection: 'row', alignItems: 'center', margin: 16, marginBottom: 8, borderRadius: 10, paddingHorizontal: 12, gap: 8, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 10 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  filterTab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  countBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10, minWidth: 20, alignItems: 'center' },
  card: { borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
  photoBox: { position: 'relative' },
  photo: { width: '100%', height: 90, borderTopLeftRadius: 10, borderTopRightRadius: 10 },
  photoPlaceholder: { width: '100%', height: 90, justifyContent: 'center', alignItems: 'center', borderTopLeftRadius: 10, borderTopRightRadius: 10 },
  statusOverlay: { position: 'absolute', bottom: 4, left: 4, flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  cardInfo: { padding: 8 },
  vehicleName: { fontSize: 12, fontWeight: '800' },
  cardMeta: { marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2, marginTop: 4 },
  price: { fontSize: 14, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalBox: { width: '100%', maxWidth: 500, borderRadius: 16, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  fieldLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 },
  textArea: { minHeight: 60, textAlignVertical: 'top' },
  statusRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statusOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10, borderWidth: 1 },
  saveBtn: { borderWidth: 0 },
});
