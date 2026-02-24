import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert, TextInput, Modal, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { Vehicle, useVehicleStore } from '../../src/store/vehicleStore';
import Button from '../../src/components/Button';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const COLORS = {
  primary: '#1E3A8A',
  secondary: '#F59E0B',
  background: '#F8FAFC',
  card: '#FFFFFF',
  text: '#1E293B',
  textLight: '#64748B',
  border: '#E2E8F0',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
};

export default function AdminVehicles() {
  const router = useRouter();
  const { vehicles, fetchVehicles, isLoading } = useVehicleStore();
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Form state
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [type, setType] = useState('berline');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('Geneva');
  const [description, setDescription] = useState('');

  useEffect(() => {
    fetchVehicles();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchVehicles();
    setRefreshing(false);
  };

  const updateVehicleStatus = async (vehicleId: string, status: string) => {
    try {
      await axios.put(`${API_URL}/api/admin/vehicles/${vehicleId}/status?status=${status}`);
      Alert.alert('Success', `Vehicle status updated to ${status}`);
      fetchVehicles();
    } catch (error) {
      Alert.alert('Error', 'Failed to update vehicle status');
    }
  };

  const handleStatusChange = (vehicle: Vehicle) => {
    Alert.alert(
      'Change Status',
      `Current status: ${vehicle.status}`,
      [
        { text: 'Available', onPress: () => updateVehicleStatus(vehicle.id, 'available') },
        { text: 'Maintenance', onPress: () => updateVehicleStatus(vehicle.id, 'maintenance') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleAddVehicle = async () => {
    if (!brand || !model || !year || !price) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    try {
      await axios.post(`${API_URL}/api/admin/vehicles`, {
        brand,
        model,
        year: parseInt(year),
        type,
        price_per_day: parseFloat(price),
        location,
        description,
        photos: [],
        options: [
          { name: 'GPS', price_per_day: 10.0 },
          { name: 'Baby Seat', price_per_day: 15.0 },
        ],
      });
      Alert.alert('Success', 'Vehicle added successfully');
      setShowAddModal(false);
      resetForm();
      fetchVehicles();
    } catch (error) {
      Alert.alert('Error', 'Failed to add vehicle');
    }
  };

  const resetForm = () => {
    setBrand('');
    setModel('');
    setYear('');
    setPrice('');
    setDescription('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return COLORS.success;
      case 'rented': return COLORS.primary;
      case 'maintenance': return COLORS.error;
      default: return COLORS.textLight;
    }
  };

  const renderItem = ({ item }: { item: Vehicle }) => (
    <View style={styles.vehicleCard}>
      <View style={styles.vehicleHeader}>
        {item.photos.length > 0 ? (
          <Image source={{ uri: item.photos[0] }} style={styles.vehicleImage} />
        ) : (
          <View style={styles.vehiclePlaceholder}>
            <Ionicons name="car" size={32} color={COLORS.textLight} />
          </View>
        )}
        <View style={styles.vehicleInfo}>
          <Text style={styles.vehicleName}>{item.brand} {item.model}</Text>
          <Text style={styles.vehicleYear}>{item.year} • {item.type}</Text>
          <Text style={styles.vehiclePrice}>CHF {item.price_per_day}/day</Text>
        </View>
      </View>
      
      <View style={styles.vehicleFooter}>
        <View style={styles.locationRow}>
          <Ionicons name="location" size={14} color={COLORS.textLight} />
          <Text style={styles.locationText}>{item.location}</Text>
        </View>
        <TouchableOpacity
          style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}
          onPress={() => handleStatusChange(item)}
        >
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status}
          </Text>
          <Ionicons name="chevron-down" size={14} color={getStatusColor(item.status)} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={vehicles}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <Ionicons name="add-circle" size={20} color={COLORS.primary} />
            <Text style={styles.addButtonText}>Add New Vehicle</Text>
          </TouchableOpacity>
        }
      />

      {/* Add Vehicle Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New Vehicle</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Brand *</Text>
              <TextInput
                style={styles.input}
                value={brand}
                onChangeText={setBrand}
                placeholder="e.g., BMW"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Model *</Text>
              <TextInput
                style={styles.input}
                value={model}
                onChangeText={setModel}
                placeholder="e.g., Series 3"
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Year *</Text>
                <TextInput
                  style={styles.input}
                  value={year}
                  onChangeText={setYear}
                  placeholder="2024"
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                <Text style={styles.inputLabel}>Price/Day *</Text>
                <TextInput
                  style={styles.input}
                  value={price}
                  onChangeText={setPrice}
                  placeholder="120"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Type</Text>
              <View style={styles.typeOptions}>
                {['berline', 'SUV', 'citadine', 'utilitaire'].map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeOption, type === t && styles.typeOptionActive]}
                    onPress={() => setType(t)}
                  >
                    <Text style={[styles.typeOptionText, type === t && styles.typeOptionTextActive]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Location</Text>
              <View style={styles.typeOptions}>
                {['Geneva', 'Zurich', 'Lausanne'].map((loc) => (
                  <TouchableOpacity
                    key={loc}
                    style={[styles.typeOption, location === loc && styles.typeOptionActive]}
                    onPress={() => setLocation(loc)}
                  >
                    <Text style={[styles.typeOptionText, location === loc && styles.typeOptionTextActive]}>
                      {loc}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Vehicle description..."
                multiline
                numberOfLines={4}
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button
              title="Cancel"
              onPress={() => setShowAddModal(false)}
              variant="outline"
              style={{ flex: 1 }}
            />
            <Button
              title="Add Vehicle"
              onPress={handleAddVehicle}
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
  listContent: {
    padding: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  vehicleCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  vehicleHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  vehicleImage: {
    width: 80,
    height: 60,
    borderRadius: 8,
  },
  vehiclePlaceholder: {
    width: 80,
    height: 60,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehicleInfo: {
    flex: 1,
    marginLeft: 12,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  vehicleYear: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  vehiclePrice: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 4,
  },
  vehicleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
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
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: COLORS.text,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
  },
  typeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typeOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  typeOptionText: {
    fontSize: 14,
    color: COLORS.text,
  },
  typeOptionTextActive: {
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
