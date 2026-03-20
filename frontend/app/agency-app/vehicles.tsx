import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, TextInput, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api/axios';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeStore } from '../../src/store/themeStore';
import { Vehicle, STATUSES, getStatus } from '../../src/components/agency/vehicleTypes';
import VehicleCard from '../../src/components/agency/VehicleCard';
import EditVehicleModal from '../../src/components/agency/EditVehicleModal';
import NewVehicleModal from '../../src/components/agency/NewVehicleModal';
import PhotoGalleryModal from '../../src/components/agency/PhotoGalleryModal';

const GAP = 16;
const PAD = 20;

export default function AgencyVehicles() {
  const { user } = useAuthStore();
  const { colors: C } = useThemeStore();
  const { width } = useWindowDimensions();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [galleryVehicle, setGalleryVehicle] = useState<Vehicle | null>(null);

  // Responsive columns: 3 on desktop (>1200), 2 on tablet (>768), 1 on mobile
  const numCols = width >= 1200 ? 3 : width >= 768 ? 2 : 1;
  const cardW = (width - PAD * 2 - GAP * (numCols - 1)) / numCols;

  const openGallery = async (v: Vehicle) => {
    try { const res = await api.get(`/api/vehicles/${v.id}`); setGalleryVehicle(res.data); }
    catch { setGalleryVehicle(v); }
  };

  const openEdit = async (v: Vehicle) => {
    try { const res = await api.get(`/api/vehicles/${v.id}`); setEditVehicle(res.data); }
    catch { setEditVehicle(v); }
  };

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
      v.type?.toLowerCase().includes(search.toLowerCase()) ||
      v.plate_number?.toLowerCase().includes(search.toLowerCase())
    );
    return list;
  }, [vehicles, search, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: vehicles.length, available: 0, rented: 0, maintenance: 0 };
    vehicles.forEach(v => { if (counts[v.status] !== undefined) counts[v.status]++; });
    return counts;
  }, [vehicles]);

  if (loading) return <View style={[st.container, { backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color="#7C3AED" /></View>;

  return (
    <View style={[st.container, { backgroundColor: C.bg }]}>
      {/* Header */}
      <View style={st.header}>
        <Text style={[st.headerTitle, { color: C.text }]}>Véhicules</Text>
        <Text style={[st.headerCount, { color: C.textLight }]}>{vehicles.length} véhicules</Text>
      </View>

      {/* Search */}
      <View style={[st.searchBar, { backgroundColor: C.card, borderColor: C.border }]}>
        <Ionicons name="search" size={18} color={C.textLight} />
        <TextInput style={[st.searchInput, { color: C.text }]} placeholder="Rechercher (nom, plaque)..." placeholderTextColor={C.textLight} value={search} onChangeText={setSearch} data-testid="vehicle-search" />
        {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={18} color={C.textLight} /></TouchableOpacity> : null}
      </View>

      {/* Status Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.filterRow}>
        {[{ v: 'all', l: 'Tous', icon: 'grid', color: '#7C3AED' }, ...STATUSES.map(s => ({ v: s.v, l: s.l, icon: getStatus(s.v).icon, color: getStatus(s.v).text }))].map(f => (
          <TouchableOpacity key={f.v} onPress={() => setStatusFilter(f.v)} data-testid={`filter-${f.v}`}
            style={[st.filterTab, { backgroundColor: statusFilter === f.v ? f.color + '15' : C.card, borderColor: statusFilter === f.v ? f.color : C.border }]}>
            <Ionicons name={f.icon as any} size={14} color={statusFilter === f.v ? f.color : C.textLight} />
            <Text style={{ color: statusFilter === f.v ? f.color : C.textLight, fontSize: 12, fontWeight: statusFilter === f.v ? '700' : '500' }}>{f.l}</Text>
            <View style={[st.countBadge, { backgroundColor: f.color + '20' }]}>
              <Text style={{ color: f.color, fontSize: 10, fontWeight: '800' }}>{statusCounts[f.v] || 0}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Add Button */}
      <View style={{ paddingHorizontal: PAD, paddingBottom: 12 }}>
        <TouchableOpacity onPress={() => setShowAddModal(true)} style={st.addBtn} data-testid="add-vehicle-btn">
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text style={st.addBtnText}>Ajouter un véhicule</Text>
        </TouchableOpacity>
      </View>

      {/* Vehicle Grid */}
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: PAD, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C3AED" />}
      >
        <View style={[st.grid, { gap: GAP }]}>
          {filtered.map(item => (
            <VehicleCard key={item.id} item={item} cardW={cardW} colors={C} onEdit={openEdit} onPhotoPress={openGallery} />
          ))}
        </View>

        {filtered.length === 0 && (
          <View style={st.empty}>
            <Ionicons name="car-outline" size={48} color={C.textLight} />
            <Text style={{ color: C.textLight, fontSize: 14, marginTop: 8 }}>Aucun véhicule trouvé</Text>
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      <EditVehicleModal vehicle={editVehicle} colors={C} onClose={() => setEditVehicle(null)} onSaved={fetchVehicles} />
      <NewVehicleModal visible={showAddModal} colors={C} onClose={() => setShowAddModal(false)} onCreated={fetchVehicles} />
      <PhotoGalleryModal
        visible={!!galleryVehicle}
        photos={galleryVehicle?.photos || []}
        title={galleryVehicle ? `${galleryVehicle.brand} ${galleryVehicle.model}` : ''}
        onClose={() => setGalleryVehicle(null)}
      />
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: PAD, paddingTop: 16, paddingBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  headerTitle: { fontSize: 22, fontWeight: '900' },
  headerCount: { fontSize: 13, fontWeight: '500' },
  searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: PAD, marginBottom: 10, borderRadius: 12, paddingHorizontal: 14, gap: 8, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 11 },
  filterRow: { paddingHorizontal: PAD, gap: 8, paddingBottom: 12 },
  filterTab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  countBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10, minWidth: 20, alignItems: 'center' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, backgroundColor: '#7C3AED' },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  empty: { alignItems: 'center', paddingTop: 60 },
});
