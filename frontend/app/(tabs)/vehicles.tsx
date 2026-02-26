import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Modal, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useVehicleStore, Vehicle } from '../../src/store/vehicleStore';
import VehicleCard from '../../src/components/VehicleCard';
import Button from '../../src/components/Button';

const C = {
  purple: '#7C3AED',
  purpleDark: '#5B21B6',
  purpleLight: '#EDE9FE',
  dark: '#1A1A2E',
  gray: '#6B7280',
  grayLight: '#F3F4F6',
  border: '#E5E7EB',
  card: '#FFFFFF',
  bg: '#FAFAFA',
};

const vehicleTypes = ['Tous', 'SUV', 'Berline', 'Citadine', 'Utilitaire'];
const transmissions = ['Toutes', 'Automatique', 'Manuel'];

export default function VehiclesScreen() {
  const router = useRouter();
  const { vehicles, fetchVehicles, isLoading, setFilters, clearFilters } = useVehicleStore();
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedType, setSelectedType] = useState('Tous');
  const [selectedTransmission, setSelectedTransmission] = useState('Toutes');
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  useEffect(() => { fetchVehicles(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchVehicles();
    setRefreshing(false);
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
    setSelectedType('Tous');
    setSelectedTransmission('Toutes');
    clearFilters();
    fetchVehicles({});
    setShowFilters(false);
  };

  const activeFiltersCount = [selectedType, selectedTransmission].filter(f => f !== 'Tous' && f !== 'Toutes').length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Notre Flotte</Text>
        <Text style={styles.subtitle}>{vehicles.length} véhicules disponibles</Text>
      </View>

      {/* Filter Bar */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
          data-testid="filters-btn"
        >
          <Ionicons name="options" size={18} color={C.purple} />
          <Text style={styles.filterButtonText}>Filtres</Text>
          {activeFiltersCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Quick type filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickFilters}>
          {vehicleTypes.map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.quickChip, selectedType === type && styles.quickChipActive]}
              onPress={() => {
                setSelectedType(type);
                const newFilters: any = {};
                if (type !== 'Tous') newFilters.type = type.toLowerCase();
                if (selectedTransmission !== 'Toutes') newFilters.transmission = selectedTransmission === 'Automatique' ? 'automatic' : 'manual';
                setFilters(newFilters);
                fetchVehicles(newFilters);
              }}
              data-testid={`filter-${type.toLowerCase()}`}
            >
              <Text style={[styles.quickChipText, selectedType === type && styles.quickChipTextActive]}>{type}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Vehicle Grid */}
      <ScrollView
        style={styles.scrollArea}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {vehicles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="car-outline" size={64} color={C.gray} />
            <Text style={styles.emptyText}>Aucun véhicule trouvé</Text>
            <Text style={styles.emptySubtext}>Essayez d'ajuster vos filtres</Text>
          </View>
        ) : (
          <View style={[styles.vehicleGrid, isMobile ? styles.vehicleGridMobile : styles.vehicleGridDesktop]}>
            {vehicles.map((vehicle, index) => (
              <View key={vehicle.id} style={isMobile ? { width: '100%' } : { width: '31%', minWidth: 280 }}>
                <VehicleCard
                  vehicle={vehicle}
                  onPress={() => router.push(`/vehicle/${vehicle.id}`)}
                  index={index}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Filter Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filtres</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)} data-testid="close-filters">
              <Ionicons name="close" size={24} color={C.dark} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Type de véhicule</Text>
              <View style={styles.filterOptions}>
                {vehicleTypes.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.filterOption, selectedType === type && styles.filterOptionActive]}
                    onPress={() => setSelectedType(type)}
                  >
                    <Text style={[styles.filterOptionText, selectedType === type && styles.filterOptionTextActive]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Transmission</Text>
              <View style={styles.filterOptions}>
                {transmissions.map((trans) => (
                  <TouchableOpacity
                    key={trans}
                    style={[styles.filterOption, selectedTransmission === trans && styles.filterOptionActive]}
                    onPress={() => setSelectedTransmission(trans)}
                  >
                    <Text style={[styles.filterOptionText, selectedTransmission === trans && styles.filterOptionTextActive]}>
                      {trans}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button title="Réinitialiser" onPress={resetFilters} variant="outline" style={{ flex: 1 }} />
            <Button title="Appliquer" onPress={applyFilters} style={{ flex: 1 }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: C.card,
  },
  title: { fontSize: 28, fontWeight: '800', color: C.dark },
  subtitle: { fontSize: 14, color: C.gray, marginTop: 4 },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: C.purpleLight,
    borderRadius: 20,
    gap: 6,
  },
  filterButtonText: { fontSize: 13, fontWeight: '600', color: C.purple },
  filterBadge: {
    backgroundColor: C.purple,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  quickFilters: { flexDirection: 'row' },
  quickChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: C.grayLight,
    marginRight: 8,
  },
  quickChipActive: { backgroundColor: C.purple },
  quickChipText: { fontSize: 13, fontWeight: '500', color: C.gray },
  quickChipTextActive: { color: '#FFF', fontWeight: '600' },
  scrollArea: { flex: 1 },
  vehicleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    gap: 16,
    justifyContent: 'center',
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  emptyContainer: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 18, fontWeight: '600', color: C.dark, marginTop: 16 },
  emptySubtext: { fontSize: 14, color: C.gray, marginTop: 8 },
  modalContainer: { flex: 1, backgroundColor: C.bg },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.card,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: C.dark },
  modalContent: { flex: 1, padding: 20 },
  filterSection: { marginBottom: 24 },
  filterLabel: { fontSize: 16, fontWeight: '600', color: C.dark, marginBottom: 12 },
  filterOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  filterOptionActive: { backgroundColor: C.purple, borderColor: C.purple },
  filterOptionText: { fontSize: 14, color: C.dark },
  filterOptionTextActive: { color: '#FFF' },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.card,
  },
});
