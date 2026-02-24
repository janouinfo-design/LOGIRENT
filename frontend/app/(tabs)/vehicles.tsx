import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Modal, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useVehicleStore, Vehicle } from '../../src/store/vehicleStore';
import VehicleCard from '../../src/components/VehicleCard';
import Button from '../../src/components/Button';

const COLORS = {
  primary: '#1E3A8A',
  secondary: '#F59E0B',
  background: '#F8FAFC',
  card: '#FFFFFF',
  text: '#1E293B',
  textLight: '#64748B',
  border: '#E2E8F0',
};

const vehicleTypes = ['All', 'SUV', 'berline', 'citadine', 'utilitaire'];
const locations = ['All', 'Geneva', 'Zurich', 'Lausanne'];
const transmissions = ['All', 'automatic', 'manual'];

export default function VehiclesScreen() {
  const router = useRouter();
  const { vehicles, fetchVehicles, isLoading, filters, setFilters, clearFilters } = useVehicleStore();
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  const [selectedType, setSelectedType] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [selectedTransmission, setSelectedTransmission] = useState('All');

  useEffect(() => {
    fetchVehicles();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchVehicles();
    setRefreshing(false);
  };

  const applyFilters = () => {
    const newFilters: any = {};
    if (selectedType !== 'All') newFilters.type = selectedType;
    if (selectedLocation !== 'All') newFilters.location = selectedLocation;
    if (selectedTransmission !== 'All') newFilters.transmission = selectedTransmission;
    
    setFilters(newFilters);
    fetchVehicles(newFilters);
    setShowFilters(false);
  };

  const resetFilters = () => {
    setSelectedType('All');
    setSelectedLocation('All');
    setSelectedTransmission('All');
    clearFilters();
    fetchVehicles({});
    setShowFilters(false);
  };

  const activeFiltersCount = [selectedType, selectedLocation, selectedTransmission].filter(f => f !== 'All').length;

  const renderItem = ({ item }: { item: Vehicle }) => (
    <VehicleCard
      vehicle={item}
      onPress={() => router.push(`/vehicle/${item.id}`)}
    />
  );

  return (
    <View style={styles.container}>
      {/* Filter Bar */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons name="options" size={20} color={COLORS.primary} />
          <Text style={styles.filterButtonText}>Filters</Text>
          {activeFiltersCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        
        <Text style={styles.resultsText}>{vehicles.length} vehicles found</Text>
      </View>

      <FlatList
        data={vehicles}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="car-outline" size={64} color={COLORS.textLight} />
            <Text style={styles.emptyText}>No vehicles found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
          </View>
        }
      />

      {/* Filter Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filters</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Vehicle Type */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Vehicle Type</Text>
              <View style={styles.filterOptions}>
                {vehicleTypes.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.filterOption,
                      selectedType === type && styles.filterOptionActive,
                    ]}
                    onPress={() => setSelectedType(type)}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      selectedType === type && styles.filterOptionTextActive,
                    ]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Location */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Location</Text>
              <View style={styles.filterOptions}>
                {locations.map((loc) => (
                  <TouchableOpacity
                    key={loc}
                    style={[
                      styles.filterOption,
                      selectedLocation === loc && styles.filterOptionActive,
                    ]}
                    onPress={() => setSelectedLocation(loc)}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      selectedLocation === loc && styles.filterOptionTextActive,
                    ]}>
                      {loc}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Transmission */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Transmission</Text>
              <View style={styles.filterOptions}>
                {transmissions.map((trans) => (
                  <TouchableOpacity
                    key={trans}
                    style={[
                      styles.filterOption,
                      selectedTransmission === trans && styles.filterOptionActive,
                    ]}
                    onPress={() => setSelectedTransmission(trans)}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      selectedTransmission === trans && styles.filterOptionTextActive,
                    ]}>
                      {trans === 'All' ? 'All' : trans === 'automatic' ? 'Automatic' : 'Manual'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button
              title="Reset"
              onPress={resetFilters}
              variant="outline"
              style={{ flex: 1 }}
            />
            <Button
              title="Apply Filters"
              onPress={applyFilters}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  filterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(30, 58, 138, 0.1)',
    borderRadius: 20,
    gap: 8,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  filterBadge: {
    backgroundColor: COLORS.primary,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  resultsText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  listContent: {
    padding: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterOptionText: {
    fontSize: 14,
    color: COLORS.text,
  },
  filterOptionTextActive: {
    color: '#FFFFFF',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
});
