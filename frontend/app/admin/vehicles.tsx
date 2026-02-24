import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert, Modal, ScrollView, TextInput, Image, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../../src/api/axios';
import { Vehicle } from '../../src/store/vehicleStore';
import Button from '../../src/components/Button';

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
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [selectedVehicleForPhotos, setSelectedVehicleForPhotos] = useState<Vehicle | null>(null);

  // Form state
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('2024');
  const [type, setType] = useState('berline');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('Geneva');
  const [description, setDescription] = useState('');
  const [seats, setSeats] = useState('5');
  const [transmission, setTransmission] = useState('automatic');
  const [fuelType, setFuelType] = useState('essence');

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/api/vehicles');
      setVehicles(response.data);
    } catch (error: any) {
      console.error('Error fetching vehicles:', error.response?.data || error.message);
      Alert.alert('Erreur', 'Impossible de charger les véhicules');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchVehicles();
    setRefreshing(false);
  };

  const updateVehicleStatus = async (vehicleId: string, status: string) => {
    try {
      await api.put(`/api/admin/vehicles/${vehicleId}/status?status=${status}`);
      Alert.alert('Succès', `Statut du véhicule changé à ${status}`);
      fetchVehicles();
    } catch (error: any) {
      console.error('Error updating status:', error.response?.data || error.message);
      Alert.alert('Erreur', error.response?.data?.detail || 'Impossible de modifier le statut');
    }
  };

  const handleStatusChange = (vehicle: Vehicle) => {
    Alert.alert(
      'Changer le Statut',
      `Statut actuel: ${vehicle.status}`,
      [
        { text: 'Disponible', onPress: () => updateVehicleStatus(vehicle.id, 'available') },
        { text: 'En location', onPress: () => updateVehicleStatus(vehicle.id, 'rented') },
        { text: 'Maintenance', onPress: () => updateVehicleStatus(vehicle.id, 'maintenance') },
        { text: 'Annuler', style: 'cancel' },
      ]
    );
  };

  const openEditModal = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setBrand(vehicle.brand);
    setModel(vehicle.model);
    setYear(vehicle.year.toString());
    setType(vehicle.type);
    setPrice(vehicle.price_per_day.toString());
    setLocation(vehicle.location);
    setDescription(vehicle.description || '');
    setSeats(vehicle.seats.toString());
    setTransmission(vehicle.transmission);
    setFuelType(vehicle.fuel_type);
    setShowEditModal(true);
  };

  const handleEditVehicle = async () => {
    if (!editingVehicle) return;
    
    if (!brand || !model || !year || !price) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    setSubmitting(true);
    try {
      const vehicleData = {
        brand,
        model,
        year: parseInt(year),
        type,
        price_per_day: parseFloat(price),
        location,
        description: description || `${brand} ${model} disponible à la location.`,
        seats: parseInt(seats),
        transmission,
        fuel_type: fuelType,
        photos: editingVehicle.photos || [],
        options: editingVehicle.options || [],
      };

      await api.put(`/api/admin/vehicles/${editingVehicle.id}`, vehicleData);
      
      Alert.alert('Succès', 'Véhicule modifié avec succès!');
      setShowEditModal(false);
      resetForm();
      fetchVehicles();
    } catch (error: any) {
      console.error('Error updating vehicle:', error.response?.data || error.message);
      Alert.alert('Erreur', error.response?.data?.detail || 'Impossible de modifier le véhicule');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddVehicle = async () => {
    if (!brand || !model || !year || !price) {
      if (Platform.OS === 'web') {
        window.alert('Veuillez remplir tous les champs obligatoires');
      } else {
        Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      }
      return;
    }

    setSubmitting(true);
    try {
      const vehicleData = {
        brand,
        model,
        year: parseInt(year),
        type,
        price_per_day: parseFloat(price),
        location,
        description: description || `${brand} ${model} disponible à la location.`,
        photos: [],
        seats: parseInt(seats),
        transmission,
        fuel_type: fuelType,
        options: [
          { name: 'GPS', price_per_day: 10.0 },
          { name: 'Siège Bébé', price_per_day: 15.0 },
        ],
      };

      console.log('Adding vehicle:', vehicleData);
      const response = await api.post('/api/admin/vehicles', vehicleData);
      console.log('Vehicle added:', response.data);
      
      if (Platform.OS === 'web') {
        window.alert('Véhicule ajouté avec succès!');
      } else {
        Alert.alert('Succès', 'Véhicule ajouté avec succès!');
      }
      setShowAddModal(false);
      resetForm();
      fetchVehicles();
    } catch (error: any) {
      console.error('Error adding vehicle:', error.response?.data || error.message);
      const errorMsg = error.response?.data?.detail || 'Impossible d\'ajouter le véhicule';
      if (Platform.OS === 'web') {
        window.alert('Erreur: ' + errorMsg);
      } else {
        Alert.alert('Erreur', errorMsg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteVehicle = (vehicle: Vehicle) => {
    Alert.alert(
      'Supprimer le véhicule',
      `Êtes-vous sûr de vouloir supprimer ${vehicle.brand} ${vehicle.model}?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/admin/vehicles/${vehicle.id}`);
              Alert.alert('Succès', 'Véhicule supprimé');
              fetchVehicles();
            } catch (error: any) {
              Alert.alert('Erreur', error.response?.data?.detail || 'Impossible de supprimer');
            }
          }
        },
      ]
    );
  };

  const resetForm = () => {
    setBrand('');
    setModel('');
    setYear('2024');
    setPrice('');
    setDescription('');
    setType('berline');
    setLocation('Geneva');
    setSeats('5');
    setTransmission('automatic');
    setFuelType('essence');
    setEditingVehicle(null);
  };

  // Photo management functions
  const openPhotoModal = (vehicle: Vehicle) => {
    setSelectedVehicleForPhotos(vehicle);
    setShowPhotoModal(true);
  };

  const handleUploadPhoto = async () => {
    if (!selectedVehicleForPhotos) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      if (Platform.OS === 'web') {
        window.alert('Permission requise pour accéder à la galerie');
      } else {
        Alert.alert('Permission requise', 'Veuillez autoriser l\'accès à la galerie');
      }
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
      base64: true, // Get base64 for web compatibility
    });

    if (!result.canceled && result.assets[0]) {
      setUploadingPhoto(true);
      try {
        const asset = result.assets[0];
        console.log('Asset:', { uri: asset.uri?.substring(0, 50), base64: asset.base64?.substring(0, 50), mimeType: asset.mimeType });
        
        // For web or if base64 is available, use base64 endpoint
        if (asset.base64) {
          console.log('Using base64 upload...');
          const response = await api.post(
            `/api/admin/vehicles/${selectedVehicleForPhotos.id}/photos/base64`,
            { 
              image: asset.base64,
              content_type: asset.mimeType || 'image/jpeg'
            }
          );

          // Update local state
          const updatedVehicle = {
            ...selectedVehicleForPhotos,
            photos: [...(selectedVehicleForPhotos.photos || []), response.data.photo]
          };
          setSelectedVehicleForPhotos(updatedVehicle);
          fetchVehicles();

          if (Platform.OS === 'web') {
            window.alert('Photo ajoutée avec succès!');
          } else {
            Alert.alert('Succès', 'Photo ajoutée avec succès!');
          }
        } else if (asset.uri && asset.uri.startsWith('data:')) {
          // URI is already a data URI (common on web)
          console.log('URI is data URI, extracting base64...');
          const base64Match = asset.uri.match(/^data:([^;]+);base64,(.+)$/);
          if (base64Match) {
            const contentType = base64Match[1];
            const base64Data = base64Match[2];
            
            const response = await api.post(
              `/api/admin/vehicles/${selectedVehicleForPhotos.id}/photos/base64`,
              { 
                image: base64Data,
                content_type: contentType
              }
            );

            const updatedVehicle = {
              ...selectedVehicleForPhotos,
              photos: [...(selectedVehicleForPhotos.photos || []), response.data.photo]
            };
            setSelectedVehicleForPhotos(updatedVehicle);
            fetchVehicles();

            if (Platform.OS === 'web') {
              window.alert('Photo ajoutée avec succès!');
            } else {
              Alert.alert('Succès', 'Photo ajoutée avec succès!');
            }
          }
        } else {
          // For mobile with file URI, use FormData
          console.log('Using FormData upload...');
          const formData = new FormData();
          const uri = asset.uri;
          const filename = uri.split('/').pop() || 'photo.jpg';
          const match = /\.([\w]+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : 'image/jpeg';
          
          formData.append('file', {
            uri,
            name: filename,
            type,
          } as any);

          const response = await api.post(
            `/api/admin/vehicles/${selectedVehicleForPhotos.id}/photos`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } }
          );

          // Update local state
          const updatedVehicle = {
            ...selectedVehicleForPhotos,
            photos: [...(selectedVehicleForPhotos.photos || []), response.data.photo]
          };
          setSelectedVehicleForPhotos(updatedVehicle);
          fetchVehicles();

          Alert.alert('Succès', 'Photo ajoutée avec succès!');
        }
      } catch (error: any) {
        console.error('Error uploading photo:', error.response?.data || error);
        if (Platform.OS === 'web') {
          window.alert('Erreur lors de l\'upload de la photo: ' + (error.response?.data?.detail || error.message));
        } else {
          Alert.alert('Erreur', 'Impossible d\'uploader la photo');
        }
      } finally {
        setUploadingPhoto(false);
      }
    }
  };

  const handleDeletePhoto = async (photoIndex: number) => {
    if (!selectedVehicleForPhotos) return;

    const confirmDelete = Platform.OS === 'web' 
      ? window.confirm('Supprimer cette photo?')
      : await new Promise((resolve) => {
          Alert.alert('Confirmer', 'Supprimer cette photo?', [
            { text: 'Annuler', onPress: () => resolve(false) },
            { text: 'Supprimer', style: 'destructive', onPress: () => resolve(true) },
          ]);
        });

    if (!confirmDelete) return;

    try {
      await api.delete(`/api/admin/vehicles/${selectedVehicleForPhotos.id}/photos/${photoIndex}`);
      
      // Update local state
      const updatedPhotos = [...(selectedVehicleForPhotos.photos || [])];
      updatedPhotos.splice(photoIndex, 1);
      setSelectedVehicleForPhotos({ ...selectedVehicleForPhotos, photos: updatedPhotos });
      fetchVehicles();

      if (Platform.OS === 'web') {
        window.alert('Photo supprimée');
      } else {
        Alert.alert('Succès', 'Photo supprimée');
      }
    } catch (error: any) {
      console.error('Error deleting photo:', error);
      if (Platform.OS === 'web') {
        window.alert('Erreur lors de la suppression');
      } else {
        Alert.alert('Erreur', 'Impossible de supprimer la photo');
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return COLORS.success;
      case 'rented': return COLORS.primary;
      case 'maintenance': return COLORS.error;
      default: return COLORS.textLight;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available': return 'Disponible';
      case 'rented': return 'En location';
      case 'maintenance': return 'Maintenance';
      default: return status;
    }
  };

  const renderVehicleForm = (isEdit: boolean) => (
    <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Marque *</Text>
        <TextInput
          style={styles.input}
          value={brand}
          onChangeText={setBrand}
          placeholder="ex: BMW, Mercedes, Audi..."
          placeholderTextColor={COLORS.textLight}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Modèle *</Text>
        <TextInput
          style={styles.input}
          value={model}
          onChangeText={setModel}
          placeholder="ex: Series 3, Classe C, Q5..."
          placeholderTextColor={COLORS.textLight}
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.inputLabel}>Année *</Text>
          <TextInput
            style={styles.input}
            value={year}
            onChangeText={setYear}
            placeholder="2024"
            placeholderTextColor={COLORS.textLight}
            keyboardType="numeric"
          />
        </View>
        <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
          <Text style={styles.inputLabel}>Prix/Jour (CHF) *</Text>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            placeholder="120"
            placeholderTextColor={COLORS.textLight}
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.inputLabel}>Places</Text>
          <TextInput
            style={styles.input}
            value={seats}
            onChangeText={setSeats}
            placeholder="5"
            placeholderTextColor={COLORS.textLight}
            keyboardType="numeric"
          />
        </View>
        <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
          <Text style={styles.inputLabel}>Transmission</Text>
          <View style={styles.smallOptions}>
            <TouchableOpacity
              style={[styles.smallOption, transmission === 'automatic' && styles.smallOptionActive]}
              onPress={() => setTransmission('automatic')}
            >
              <Text style={[styles.smallOptionText, transmission === 'automatic' && styles.smallOptionTextActive]}>Auto</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.smallOption, transmission === 'manual' && styles.smallOptionActive]}
              onPress={() => setTransmission('manual')}
            >
              <Text style={[styles.smallOptionText, transmission === 'manual' && styles.smallOptionTextActive]}>Manuel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Type de Véhicule</Text>
        <View style={styles.typeOptions}>
          {['berline', 'SUV', 'citadine', 'utilitaire'].map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.typeOption, type === t && styles.typeOptionActive]}
              onPress={() => setType(t)}
            >
              <Text style={[styles.typeOptionText, type === t && styles.typeOptionTextActive]}>
                {t === 'berline' ? 'Berline' : t === 'citadine' ? 'Citadine' : t === 'utilitaire' ? 'Utilitaire' : t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Carburant</Text>
        <View style={styles.typeOptions}>
          {['essence', 'diesel', 'electric', 'hybrid'].map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.typeOption, fuelType === f && styles.typeOptionActive]}
              onPress={() => setFuelType(f)}
            >
              <Text style={[styles.typeOptionText, fuelType === f && styles.typeOptionTextActive]}>
                {f === 'essence' ? 'Essence' : f === 'diesel' ? 'Diesel' : f === 'electric' ? 'Électrique' : 'Hybride'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Localisation</Text>
        <View style={styles.typeOptions}>
          {['Geneva', 'Zurich', 'Lausanne', 'Bern'].map((loc) => (
            <TouchableOpacity
              key={loc}
              style={[styles.typeOption, location === loc && styles.typeOptionActive]}
              onPress={() => setLocation(loc)}
            >
              <Text style={[styles.typeOptionText, location === loc && styles.typeOptionTextActive]}>
                {loc === 'Geneva' ? 'Genève' : loc}
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
          placeholder="Description du véhicule..."
          placeholderTextColor={COLORS.textLight}
          multiline
          numberOfLines={4}
        />
      </View>
    </ScrollView>
  );

  const renderItem = ({ item }: { item: Vehicle }) => (
    <View style={styles.vehicleCard}>
      <View style={styles.vehicleHeader}>
        {item.photos && item.photos.length > 0 ? (
          <Image source={{ uri: item.photos[0] }} style={styles.vehicleImage} />
        ) : (
          <View style={styles.vehiclePlaceholder}>
            <Ionicons name="car" size={32} color={COLORS.textLight} />
          </View>
        )}
        <View style={styles.vehicleInfo}>
          <Text style={styles.vehicleName}>{item.brand} {item.model}</Text>
          <Text style={styles.vehicleYear}>{item.year} • {item.type} • {item.seats} places</Text>
          <Text style={styles.vehiclePrice}>CHF {item.price_per_day}/jour</Text>
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
            {getStatusLabel(item.status)}
          </Text>
          <Ionicons name="chevron-down" size={14} color={getStatusColor(item.status)} />
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.actionBtn, styles.photoBtn]}
          onPress={() => openPhotoModal(item)}
        >
          <Ionicons name="camera" size={16} color="#8B5CF6" />
          <Text style={[styles.actionBtnText, { color: '#8B5CF6' }]}>Photos ({item.photos?.length || 0})</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionBtn, styles.editBtn]}
          onPress={() => openEditModal(item)}
        >
          <Ionicons name="pencil" size={16} color={COLORS.primary} />
          <Text style={[styles.actionBtnText, { color: COLORS.primary }]}>Modifier</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionBtn, styles.deleteBtn]}
          onPress={() => handleDeleteVehicle(item)}
        >
          <Ionicons name="trash" size={16} color={COLORS.error} />
          <Text style={[styles.actionBtnText, { color: COLORS.error }]}>Supprimer</Text>
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
            onPress={() => { resetForm(); setShowAddModal(true); }}
          >
            <Ionicons name="add-circle" size={24} color={COLORS.primary} />
            <Text style={styles.addButtonText}>Ajouter un Véhicule</Text>
          </TouchableOpacity>
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="car-outline" size={48} color={COLORS.textLight} />
              <Text style={styles.emptyText}>Aucun véhicule</Text>
            </View>
          ) : null
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
            <Text style={styles.modalTitle}>Nouveau Véhicule</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          {renderVehicleForm(false)}
          <View style={styles.modalFooter}>
            <Button
              title="Annuler"
              onPress={() => setShowAddModal(false)}
              variant="outline"
              style={{ flex: 1 }}
            />
            <Button
              title="Ajouter"
              onPress={handleAddVehicle}
              loading={submitting}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </Modal>

      {/* Edit Vehicle Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Modifier le Véhicule</Text>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          {renderVehicleForm(true)}
          <View style={styles.modalFooter}>
            <Button
              title="Annuler"
              onPress={() => setShowEditModal(false)}
              variant="outline"
              style={{ flex: 1 }}
            />
            <Button
              title="Enregistrer"
              onPress={handleEditVehicle}
              loading={submitting}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </Modal>

      {/* Photo Management Modal */}
      <Modal
        visible={showPhotoModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPhotoModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Photos - {selectedVehicleForPhotos?.brand} {selectedVehicleForPhotos?.model}
            </Text>
            <TouchableOpacity onPress={() => setShowPhotoModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {/* Upload Button */}
            <TouchableOpacity 
              style={styles.uploadPhotoBtn}
              onPress={handleUploadPhoto}
              disabled={uploadingPhoto}
            >
              {uploadingPhoto ? (
                <ActivityIndicator color={COLORS.primary} />
              ) : (
                <>
                  <Ionicons name="cloud-upload" size={32} color={COLORS.primary} />
                  <Text style={styles.uploadPhotoBtnText}>Ajouter une photo</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Photos Grid */}
            {selectedVehicleForPhotos?.photos && selectedVehicleForPhotos.photos.length > 0 ? (
              <View style={styles.photosGrid}>
                {selectedVehicleForPhotos.photos.map((photo, index) => (
                  <View key={index} style={styles.photoItem}>
                    <Image source={{ uri: photo }} style={styles.photoImage} />
                    <TouchableOpacity 
                      style={styles.deletePhotoBtn}
                      onPress={() => handleDeletePhoto(index)}
                    >
                      <Ionicons name="trash" size={16} color="#fff" />
                    </TouchableOpacity>
                    {index === 0 && (
                      <View style={styles.mainPhotoBadge}>
                        <Text style={styles.mainPhotoBadgeText}>Principale</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.noPhotos}>
                <Ionicons name="images-outline" size={48} color={COLORS.textLight} />
                <Text style={styles.noPhotosText}>Aucune photo</Text>
                <Text style={styles.noPhotosSubtext}>Ajoutez des photos pour attirer plus de clients</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button
              title="Fermer"
              onPress={() => setShowPhotoModal(false)}
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
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  photoBtn: {
    backgroundColor: '#8B5CF6' + '15',
  },
  editBtn: {
    backgroundColor: COLORS.primary + '15',
  },
  deleteBtn: {
    backgroundColor: COLORS.error + '15',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textLight,
    marginTop: 12,
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
    marginBottom: 20,
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
    gap: 10,
  },
  typeOption: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 25,
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
    fontWeight: '500',
  },
  typeOptionTextActive: {
    color: '#FFFFFF',
  },
  smallOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  smallOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  smallOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  smallOptionText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },
  smallOptionTextActive: {
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
  uploadPhotoBtn: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    padding: 30,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    gap: 10,
  },
  uploadPhotoBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoItem: {
    width: '48%',
    aspectRatio: 16/9,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  deletePhotoBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.error,
    borderRadius: 20,
    padding: 8,
  },
  mainPhotoBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  mainPhotoBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  noPhotos: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  noPhotosText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  noPhotosSubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 8,
    textAlign: 'center',
  },
});
