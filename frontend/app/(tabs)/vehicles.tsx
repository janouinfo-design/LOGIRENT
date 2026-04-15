import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Modal, TextInput, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useVehicleStore } from '../../src/store/vehicleStore';
import VehicleCard from '../../src/components/VehicleCard';
import Button from '../../src/components/Button';
import { useThemeStore } from '../../src/store/themeStore';

const vehicleTypes = ['Tous', 'SUV', 'Berline', 'Citadine', 'Utilitaire'];
const transmissions = ['Toutes', 'Automatique', 'Manuel'];

export default function VehiclesScreen() {
  const { colors: C } = useThemeStore();
  const router = useRouter();
  const { vehicles, fetchVehicles, isLoading, setFilters, clearFilters } = useVehicleStore();
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedType, setSelectedType] = useState('Tous');
  const [selectedTransmission, setSelectedTransmission] = useState('Toutes');
  const [search, setSearch] = useState('');
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const numCols = width >= 1200 ? 3 : width >= 768 ? 2 : 1;

  useEffect(() => { fetchVehicles(); }, []);

  const onRefresh = async () => { setRefreshing(true); await fetchVehicles(); setRefreshing(false); };

  const handleTypeSelect = (type: string) => {
    setSelectedType(type);
    const newFilters: any = {};
    if (type !== 'Tous') newFilters.type = type.toLowerCase();
    if (selectedTransmission !== 'Toutes') newFilters.transmission = selectedTransmission === 'Automatique' ? 'automatic' : 'manual';
    setFilters(newFilters);
    fetchVehicles(newFilters);
  };

  const applyFilters = () => {
    const newFilters: any = {};
    if (selectedType !== 'Tous') newFilters.type = selectedType.toLowerCase();
    if (selectedTransmission !== 'Toutes') newFilters.transmission = selectedTransmission === 'Automatique' ? 'automatic' : 'manual';
    setFilters(newFilters);
    fetchVehicles(newFilters);
    setShowFilters(false);
  };

  const resetFilters = () => {
    setSelectedType('Tous'); setSelectedTransmission('Toutes'); setSearch('');
    clearFilters(); fetchVehicles({}); setShowFilters(false);
  };

  const filteredVehicles = useMemo(() => {
    let filtered = vehicles.filter(v => v.status !== 'maintenance');
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(v => `${v.brand} ${v.model}`.toLowerCase().includes(q) || v.type?.toLowerCase().includes(q));
    }
    return filtered;
  }, [vehicles, search]);

  // Use fleet_count for availability display (no grouping needed with fleet_count)
  const groupedVehicles = useMemo(() => {
    return filteredVehicles.map(v => ({
      representative: v,
      count: v.fleet_count || 1,
      availableCount: v.fleet_count || 1, // Will be dynamically calculated if needed
      ids: [v.id],
      minPrice: v.price_per_day,
    }));
  }, [filteredVehicles]);

  const activeFiltersCount = [selectedType, selectedTransmission].filter(f => f !== 'Tous' && f !== 'Toutes').length;
  const gap = 14;
  const pad = 16;
  const cardW = numCols > 1 ? (width - pad * 2 - gap * (numCols - 1)) / numCols : undefined;

  return (
    <View style={[st.container, { backgroundColor: C.bg }]}>
      {/* Compact Top Bar: Categories LEFT, Search RIGHT */}
      <View style={[st.topBar, { backgroundColor: C.card, borderColor: C.border }]}>
        <View style={st.topBarInner}>
          {/* Left: Title + Categories */}
          <View style={st.leftSection}>
            <View style={st.titleRow}>
              <Text style={[st.title, { color: C.text }]}>Notre Flotte</Text>
              <Text style={[st.count, { color: C.textLight }]}>{groupedVehicles.length} modeles ({filteredVehicles.length} vehicules)</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.catRow}>
              {vehicleTypes.map(type => {
                const active = selectedType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[st.catPill, { backgroundColor: active ? '#7C3AED' : C.bg, borderColor: active ? '#7C3AED' : C.border }]}
                    onPress={() => handleTypeSelect(type)}
                    data-testid={`filter-${type.toLowerCase()}`}
                  >
                    <Text style={[st.catText, { color: active ? '#fff' : C.text }]}>{type}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Right: Search + Filters */}
          <View style={st.rightSection}>
            <View style={[st.searchBar, { borderColor: C.border, backgroundColor: C.bg }]}>
              <Ionicons name="search" size={16} color={C.textLight} />
              <TextInput
                style={[st.searchInput, { color: C.text }]}
                placeholder="Rechercher..."
                placeholderTextColor={C.textLight}
                value={search}
                onChangeText={setSearch}
                data-testid="vehicle-search"
              />
              {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={16} color={C.textLight} /></TouchableOpacity> : null}
            </View>
            <TouchableOpacity
              style={[st.filterBtn, { borderColor: C.border }]}
              onPress={() => setShowFilters(true)}
              data-testid="filters-btn"
            >
              <Ionicons name="options" size={16} color="#7C3AED" />
              {activeFiltersCount > 0 && (
                <View style={st.filterBadge}><Text style={st.filterBadgeText}>{activeFiltersCount}</Text></View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Vehicle Grid */}
      <ScrollView
        contentContainerStyle={{ padding: pad, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {groupedVehicles.length === 0 ? (
          <View style={st.empty}>
            <Ionicons name="car-outline" size={48} color={C.textLight} />
            <Text style={[st.emptyText, { color: C.textLight }]}>Aucun véhicule trouvé</Text>
            <Text style={[st.emptySub, { color: C.textLight }]}>Essayez d'ajuster vos filtres</Text>
          </View>
        ) : (
          <View style={[st.grid, { gap }]}>
            {groupedVehicles.map((group, index) => (
              <View key={`${group.representative.id}-grp`} style={cardW ? { width: cardW } : { width: '100%' }}>
                <View style={{ position: 'relative' }}>
                  <VehicleCard vehicle={group.representative} onPress={() => router.push(`/vehicle/${group.representative.id}`)} index={index} />
                  {group.count > 1 && (
                    <View style={{ position: 'absolute', top: 8, left: 8, flexDirection: 'row', gap: 4 }}>
                      <View style={{ backgroundColor: '#7C3AED', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{group.availableCount} dispo / {group.count}</Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Filter Modal */}
      <Modal visible={showFilters} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowFilters(false)}>
        <View style={[st.modal, { backgroundColor: C.bg }]}>
          <View style={[st.modalHeader, { borderColor: C.border }]}>
            <Text style={[st.modalTitle, { color: C.text }]}>Filtres avancés</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)} data-testid="close-filters"><Ionicons name="close" size={24} color={C.text} /></TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1, padding: 20 }}>
            <Text style={[st.filterLabel, { color: C.text }]}>Type de véhicule</Text>
            <View style={st.filterOptions}>
              {vehicleTypes.map(type => (
                <TouchableOpacity key={type} style={[st.filterOpt, { borderColor: C.border }, selectedType === type && { backgroundColor: '#7C3AED', borderColor: '#7C3AED' }]} onPress={() => setSelectedType(type)}>
                  <Text style={[st.filterOptText, { color: C.text }, selectedType === type && { color: '#fff' }]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[st.filterLabel, { color: C.text, marginTop: 20 }]}>Transmission</Text>
            <View style={st.filterOptions}>
              {transmissions.map(trans => (
                <TouchableOpacity key={trans} style={[st.filterOpt, { borderColor: C.border }, selectedTransmission === trans && { backgroundColor: '#7C3AED', borderColor: '#7C3AED' }]} onPress={() => setSelectedTransmission(trans)}>
                  <Text style={[st.filterOptText, { color: C.text }, selectedTransmission === trans && { color: '#fff' }]}>{trans}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <View style={[st.modalFooter, { borderColor: C.border }]}>
            <Button title="Réinitialiser" onPress={resetFilters} variant="outline" style={{ flex: 1 }} />
            <Button title="Appliquer" onPress={applyFilters} style={{ flex: 1 }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },

  // Top Bar
  topBar: { borderBottomWidth: 1, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 },
  topBarInner: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' },
  leftSection: { flex: 1, minWidth: 200 },
  rightSection: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '800' },
  count: { fontSize: 12, fontWeight: '500' },

  // Categories
  catRow: { gap: 6 },
  catPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 18, borderWidth: 1 },
  catText: { fontSize: 12, fontWeight: '600' },

  // Search
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, minWidth: 200 },
  searchInput: { flex: 1, fontSize: 13, paddingVertical: 0 },
  filterBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  filterBadge: { position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' },
  filterBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },

  // Grid
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, fontWeight: '600', marginTop: 12 },
  emptySub: { fontSize: 13, marginTop: 4 },

  // Modal
  modal: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  filterLabel: { fontSize: 15, fontWeight: '600', marginBottom: 10 },
  filterOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterOpt: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, borderWidth: 1 },
  filterOptText: { fontSize: 13, fontWeight: '500' },
  modalFooter: { flexDirection: 'row', padding: 20, gap: 12, borderTopWidth: 1 },
});
