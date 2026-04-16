import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, TextInput, Dimensions, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api/axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CardSkeleton } from '../../src/components/Skeleton';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeStore } from '../../src/store/themeStore';
import { Vehicle, STATUSES, getStatus } from '../../src/components/agency/vehicleTypes';
import VehicleCard from '../../src/components/agency/VehicleCard';
import EditVehicleModal from '../../src/components/agency/EditVehicleModal';
import NewVehicleModal from '../../src/components/agency/NewVehicleModal';
import PhotoGalleryModal from '../../src/components/agency/PhotoGalleryModal';

const GAP = 14;
const PAD = 16;

export default function AgencyVehicles() {
  const { user } = useAuthStore();
  const { colors: C } = useThemeStore();
  const width = Dimensions.get('window').width;
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [galleryVehicle, setGalleryVehicle] = useState<Vehicle | null>(null);

  const screenW = Dimensions.get('window').width;
  const containerW = Math.max(screenW - 280, 600); // account for sidebar
  const numCols = 5;
  const cardW = Math.floor((containerW - PAD * 2 - GAP * (numCols - 1)) / numCols);

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
      if (vehicles.length === 0) {
        const cached = await AsyncStorage.getItem('cache_vehicles');
        if (cached) { try { setVehicles(JSON.parse(cached)); } catch {} }
      }
      const params: any = {};
      if (user?.agency_id) params.agency_id = user.agency_id;
      const res = await api.get('/api/vehicles', { params });
      setVehicles(res.data || []);
      AsyncStorage.setItem('cache_vehicles', JSON.stringify(res.data || [])).catch(() => {});
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);
  const onRefresh = async () => { setRefreshing(true); await fetchVehicles(); setRefreshing(false); };

  const deleteVehicle = async (v: any) => {
    const confirm = Platform.OS === 'web'
      ? window.confirm(`Supprimer ${v.brand} ${v.model} ? Cette action est irreversible.`)
      : true;
    if (!confirm) return;
    try {
      await api.delete(`/api/admin/vehicles/${v.id}`);
      Platform.OS === 'web' ? window.alert('Vehicule supprime') : Alert.alert('Succes', 'Vehicule supprime');
      fetchVehicles();
    } catch (e: any) {
      const msg = e?.response?.data?.detail || 'Erreur';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Erreur', msg);
    }
  };

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

  if (loading && vehicles.length === 0) return (
    <View style={[st.container, { backgroundColor: C.bg }]}>
      <CardSkeleton count={4} />
    </View>
  );

  return (
    <View style={[st.container, { backgroundColor: C.bg }]}>
      {/* Header */}
      <View style={st.header}>
        <View>
          <Text style={[st.headerTitle, { color: C.text }]}>Flotte de vehicules</Text>
          <Text style={[st.headerSub, { color: C.textLight }]}>{vehicles.length} vehicules enregistres</Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowAddModal(true)}
          style={st.addBtn}
          data-testid="add-vehicle-btn"
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={st.addBtnText}>Ajouter</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[st.searchBar, { backgroundColor: C.card, borderColor: C.border }]}>
        <Ionicons name="search" size={18} color={C.textLight} />
        <TextInput
          style={[st.searchInput, { color: C.text }]}
          placeholder="Rechercher par nom, plaque, type..."
          placeholderTextColor={C.textLight}
          value={search}
          onChangeText={setSearch}
          data-testid="vehicle-search"
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={C.textLight} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Status Filter Tabs */}
      <View style={st.filterRow}>
        {[
          { v: 'all', l: 'Tous', icon: 'grid', color: '#7C3AED' },
          ...STATUSES.map(s => ({ v: s.v, l: s.l, icon: getStatus(s.v).icon, color: getStatus(s.v).text }))
        ].map(f => {
          const isActive = statusFilter === f.v;
          return (
            <TouchableOpacity
              key={f.v}
              onPress={() => setStatusFilter(f.v)}
              data-testid={`filter-${f.v}`}
              style={[
                st.filterTab,
                {
                  backgroundColor: isActive ? f.color + '12' : C.card,
                  borderColor: isActive ? f.color : C.border,
                },
              ]}
            >
              <Ionicons name={f.icon as any} size={14} color={isActive ? f.color : C.textLight} />
              <Text style={{ color: isActive ? f.color : C.textLight, fontSize: 13, fontWeight: isActive ? '700' : '500' }}>
                {f.l}
              </Text>
              <View style={[st.countBadge, { backgroundColor: isActive ? f.color + '20' : C.bg }]}>
                <Text style={{ color: isActive ? f.color : C.textLight, fontSize: 11, fontWeight: '800' }}>
                  {statusCounts[f.v] || 0}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Vehicle Grid */}
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: PAD, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C3AED" />}
      >
        <View style={[st.grid, { gap: GAP }]}>
          {filtered.map(item => (
            <VehicleCard key={item.id} item={item} cardW={cardW} colors={C} onEdit={openEdit} onDelete={deleteVehicle} onPhotoPress={openGallery} />
          ))}
        </View>

        {filtered.length === 0 && (
          <View style={st.empty}>
            <Ionicons name="car-outline" size={52} color={C.textLight + '40'} />
            <Text style={{ color: C.textLight, fontSize: 15, marginTop: 10, fontWeight: '500' }}>Aucun vehicule trouve</Text>
            <Text style={{ color: C.textLight + '80', fontSize: 13, marginTop: 4 }}>Essayez de modifier vos filtres</Text>
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

  header: {
    paddingHorizontal: PAD, paddingTop: 20, paddingBottom: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  headerTitle: { fontSize: 26, fontWeight: '900', letterSpacing: -0.3 },
  headerSub: { fontSize: 14, fontWeight: '500', marginTop: 2 },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 18, paddingVertical: 11,
    borderRadius: 10, backgroundColor: '#7C3AED',
  },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: PAD, marginBottom: 12,
    borderRadius: 12, paddingHorizontal: 14, gap: 10, borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 12 },

  filterRow: { paddingHorizontal: PAD, gap: 8, paddingBottom: 18, paddingTop: 4, flexDirection: 'row', flexWrap: 'wrap' },
  filterTab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1.5,
  },
  countBadge: {
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 10, minWidth: 22, alignItems: 'center',
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },

  empty: { alignItems: 'center', paddingTop: 80 },
});
