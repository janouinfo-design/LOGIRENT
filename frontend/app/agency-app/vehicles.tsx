import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, TextInput, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api/axios';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeStore } from '../../src/store/themeStore';
import { Vehicle, STATUSES, getStatus } from './components/vehicleTypes';
import VehicleCard from './components/VehicleCard';
import EditVehicleModal from './components/EditVehicleModal';
import NewVehicleModal from './components/NewVehicleModal';

const SCREEN_W = Dimensions.get('window').width;
const CARD_GAP = 10;
const PADDING = 16;
const NUM_COLS = 3;
const cardW = (SCREEN_W - PADDING * 2 - CARD_GAP * (NUM_COLS - 1)) / NUM_COLS;

export default function AgencyVehicles() {
  const { user } = useAuthStore();
  const { colors: C } = useThemeStore();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

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

  if (loading) return <View style={[st.container, { backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={C.accent} /></View>;

  return (
    <View style={[st.container, { backgroundColor: C.bg }]}>
      {/* Search */}
      <View style={[st.searchBar, { backgroundColor: C.card, borderColor: C.border }]}>
        <Ionicons name="search" size={18} color={C.textLight} />
        <TextInput style={[st.searchInput, { color: C.text }]} placeholder="Rechercher (nom, plaque)..." placeholderTextColor={C.textLight} value={search} onChangeText={setSearch} data-testid="vehicle-search" />
      </View>

      {/* Status Filter */}
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

      {/* Add Button */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <TouchableOpacity onPress={() => setShowAddModal(true)} style={[st.addBtn, { backgroundColor: C.accent }]} data-testid="add-vehicle-btn">
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text style={st.addBtnText}>Ajouter un vehicule</Text>
        </TouchableOpacity>
      </View>

      {/* Vehicle Grid */}
      <FlatList data={filtered} keyExtractor={(item) => item.id} numColumns={3}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
        contentContainerStyle={{ padding: PADDING, paddingTop: 8, paddingBottom: 32 }}
        columnWrapperStyle={{ gap: CARD_GAP, marginBottom: CARD_GAP }}
        ListEmptyComponent={<View style={st.empty}><Ionicons name="car-outline" size={40} color={C.textLight} /><Text style={{ color: C.textLight, fontSize: 14 }}>Aucun vehicule</Text></View>}
        renderItem={({ item }) => (
          <VehicleCard item={item} cardW={cardW} colors={C} onEdit={setEditVehicle} />
        )}
      />

      {/* Modals */}
      <EditVehicleModal vehicle={editVehicle} colors={C} onClose={() => setEditVehicle(null)} onSaved={fetchVehicles} />
      <NewVehicleModal visible={showAddModal} colors={C} onClose={() => setShowAddModal(false)} onCreated={fetchVehicles} />
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
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 10 },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
