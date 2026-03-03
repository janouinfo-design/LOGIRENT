import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert, Modal, Image, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../../src/api/axios';
import { Vehicle } from '../../src/store/vehicleStore';
import { useAuthStore } from '../../src/store/authStore';
import Button from '../../src/components/Button';
import { useThemeStore } from '../../src/store/themeStore';
import { VehicleForm, PhotoManagementModal } from '../../src/components/admin/VehicleComponents';

const SCREEN_W = Dimensions.get('window').width;

const getVehicleStatusColor = (status: string, C: any) => {
  switch (status) {
    case 'available': return C.success;
    case 'rented': return C.accent;
    case 'maintenance': return C.error;
    default: return C.textLight;
  }
};

const getVehicleStatusLabel = (status: string) => {
  switch (status) { case 'available': return 'Disponible'; case 'rented': return 'En location'; case 'maintenance': return 'Maintenance'; default: return status; }
};

export default function AdminVehicles() {
  const { colors: C } = useThemeStore();
  const { user } = useAuthStore();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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

  useEffect(() => { fetchVehicles(); }, []);

  const fetchVehicles = async () => {
    try {
      setIsLoading(true);
      const params: any = {};
      if (user?.role === 'admin' && user?.agency_id) params.agency_id = user.agency_id;
      const resp = await api.get('/api/vehicles', { params });
      setVehicles(resp.data);
    } catch { Alert.alert('Erreur', 'Impossible de charger les vehicules'); }
    finally { setIsLoading(false); }
  };

  const resetForm = () => {
    setBrand(''); setModel(''); setYear('2024'); setPrice(''); setDescription('');
    setType('berline'); setLocation('Geneva'); setSeats('5'); setTransmission('automatic'); setFuelType('essence');
    setEditingVehicle(null);
  };

  const updateStatus = async (vehicleId: string, status: string) => {
    try {
      await api.put(`/api/admin/vehicles/${vehicleId}/status?status=${status}`);
      fetchVehicles();
    } catch (e: any) { alert('Erreur: ' + (e.response?.data?.detail || 'Erreur')); }
  };

  const handleStatusChange = (v: Vehicle) => {
    if (Platform.OS === 'web') {
      const c = window.prompt(`Changer le statut de ${v.brand} ${v.model}\nActuel: ${getVehicleStatusLabel(v.status)}\n\n1. Disponible\n2. En location\n3. Maintenance`);
      if (c === '1') updateStatus(v.id, 'available');
      else if (c === '2') updateStatus(v.id, 'rented');
      else if (c === '3') updateStatus(v.id, 'maintenance');
    } else {
      Alert.alert('Statut', `Actuel: ${v.status}`, [
        { text: 'Disponible', onPress: () => updateStatus(v.id, 'available') },
        { text: 'En location', onPress: () => updateStatus(v.id, 'rented') },
        { text: 'Maintenance', onPress: () => updateStatus(v.id, 'maintenance') },
        { text: 'Annuler', style: 'cancel' },
      ]);
    }
  };

  const openEditModal = (v: Vehicle) => {
    setEditingVehicle(v);
    setBrand(v.brand); setModel(v.model); setYear(v.year.toString());
    setType(v.type); setPrice(v.price_per_day.toString()); setLocation(v.location);
    setDescription(v.description || ''); setSeats(v.seats.toString());
    setTransmission(v.transmission); setFuelType(v.fuel_type);
    setShowEditModal(true);
  };

  const handleSave = async (isEdit: boolean) => {
    if (!brand || !model || !year || !price) { alert('Remplissez tous les champs obligatoires'); return; }
    setSubmitting(true);
    try {
      const data = {
        brand, model, year: parseInt(year), type, price_per_day: parseFloat(price),
        location, description: description || `${brand} ${model} disponible.`,
        seats: parseInt(seats), transmission, fuel_type: fuelType,
        photos: isEdit && editingVehicle ? editingVehicle.photos || [] : [],
        options: isEdit && editingVehicle ? editingVehicle.options || [] : [
          { name: 'GPS', price_per_day: 10.0 }, { name: 'Siege Bebe', price_per_day: 15.0 }
        ],
      };
      if (isEdit && editingVehicle) await api.put(`/api/admin/vehicles/${editingVehicle.id}`, data);
      else await api.post('/api/admin/vehicles', data);
      alert(isEdit ? 'Vehicule modifie !' : 'Vehicule ajoute !');
      isEdit ? setShowEditModal(false) : setShowAddModal(false);
      resetForm(); fetchVehicles();
    } catch (e: any) { alert('Erreur: ' + (e.response?.data?.detail || 'Erreur')); }
    finally { setSubmitting(false); }
  };

  const handleDelete = (v: Vehicle) => {
    if (Platform.OS === 'web') {
      if (window.confirm(`Supprimer ${v.brand} ${v.model} ?`)) {
        api.delete(`/api/admin/vehicles/${v.id}`).then(() => { alert('Vehicule supprime'); fetchVehicles(); }).catch(() => alert('Erreur'));
      }
    } else {
      Alert.alert('Supprimer', `${v.brand} ${v.model} ?`, [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => api.delete(`/api/admin/vehicles/${v.id}`).then(() => fetchVehicles()) },
      ]);
    }
  };

  const formProps = { brand, setBrand, model, setModel, year, setYear, type, setType, price, setPrice, location, setLocation, description, setDescription, seats, setSeats, transmission, setTransmission, fuelType, setFuelType, C };

  const renderItem = ({ item }: { item: Vehicle }) => {
    const sc = getVehicleStatusColor(item.status, C);
    const cardW = (SCREEN_W - 32 - 24) / 3;
    return (
      <View style={[st.card, { backgroundColor: C.card, width: cardW }]} data-testid={`vehicle-card-${item.id}`}>
        {/* Photo */}
        <View style={{ position: 'relative' }}>
          {item.photos?.length ? (
            <Image source={{ uri: item.photos[0] }} style={{ width: '100%', height: 80, borderTopLeftRadius: 10, borderTopRightRadius: 10 }} resizeMode="cover" />
          ) : (
            <View style={[st.imgPlaceholder, { backgroundColor: C.bg, height: 80 }]}><Ionicons name="car" size={28} color={C.textLight} /></View>
          )}
          <TouchableOpacity style={[st.statusBadge, { backgroundColor: sc + '20', position: 'absolute', bottom: 4, left: 4 }]} onPress={() => handleStatusChange(item)}>
            <View style={[st.dot, { backgroundColor: sc }]} />
          <Text style={{ fontSize: 14, fontWeight: '700', color: sc }}>{getVehicleStatusLabel(item.status)}</Text>
          </TouchableOpacity>
        </View>
        {/* Info */}
        <View style={{ padding: 10 }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: C.text }} numberOfLines={1}>{item.brand} {item.model}</Text>
          <Text style={{ fontSize: 14, color: C.textLight, marginTop: 2 }}>{item.year} | {item.type} | {item.seats}pl</Text>
          <Text style={{ fontSize: 17, fontWeight: '800', color: C.accent, marginTop: 4 }}>CHF {item.price_per_day}/j</Text>
        </View>
        {/* Actions */}
        <View style={{ flexDirection: 'row', gap: 4, paddingHorizontal: 6, paddingBottom: 8 }}>
          <TouchableOpacity style={[st.actBtn, { backgroundColor: '#8B5CF610', flex: 1, paddingVertical: 6 }]} onPress={() => { setSelectedVehicleForPhotos(item); setShowPhotoModal(true); }}>
            <Ionicons name="camera" size={13} color="#8B5CF6" />
          </TouchableOpacity>
          <TouchableOpacity style={[st.actBtn, { backgroundColor: C.accent + '10', flex: 1, paddingVertical: 6 }]} onPress={() => openEditModal(item)}>
            <Ionicons name="pencil" size={13} color={C.accent} />
          </TouchableOpacity>
          <TouchableOpacity style={[st.actBtn, { backgroundColor: C.error + '10', flex: 1, paddingVertical: 6 }]} onPress={() => handleDelete(item)}>
            <Ionicons name="trash" size={13} color={C.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderFormModal = (visible: boolean, title: string, isEdit: boolean, onClose: () => void) => (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={[st.modalHeader, { backgroundColor: C.card, borderBottomColor: C.border }]}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: C.text }}>{title}</Text>
          <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={C.text} /></TouchableOpacity>
        </View>
        <VehicleForm {...formProps} />
        <View style={[st.modalFooter, { backgroundColor: C.card, borderTopColor: C.border }]}>
          <Button title="Annuler" onPress={onClose} variant="outline" style={{ flex: 1 }} />
          <Button title={isEdit ? 'Enregistrer' : 'Ajouter'} onPress={() => handleSave(isEdit)} loading={submitting} style={{ flex: 1 }} />
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <FlatList data={vehicles} renderItem={renderItem} keyExtractor={i => i.id}
        numColumns={3}
        contentContainerStyle={{ padding: 16 }}
        columnWrapperStyle={{ gap: 10, marginBottom: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await fetchVehicles(); setRefreshing(false); }} />}
        ListHeaderComponent={
          <TouchableOpacity style={[st.addBtn, { borderColor: C.accent, backgroundColor: C.card }]} onPress={() => { resetForm(); setShowAddModal(true); }} data-testid="add-vehicle-btn">
            <Ionicons name="add-circle" size={24} color={C.accent} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: C.accent }}>Ajouter un Vehicule</Text>
          </TouchableOpacity>
        }
        ListEmptyComponent={!isLoading ? (
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Ionicons name="car-outline" size={48} color={C.textLight} />
            <Text style={{ fontSize: 16, color: C.textLight, marginTop: 12 }}>Aucun vehicule</Text>
          </View>
        ) : null}
      />
      {renderFormModal(showAddModal, 'Nouveau Vehicule', false, () => setShowAddModal(false))}
      {renderFormModal(showEditModal, 'Modifier le Vehicule', true, () => setShowEditModal(false))}
      <PhotoManagementModal visible={showPhotoModal} vehicle={selectedVehicleForPhotos} C={C}
        onClose={() => setShowPhotoModal(false)} onRefresh={fetchVehicles} />
    </View>
  );
}

const st = StyleSheet.create({
  card: { borderRadius: 10, overflow: 'hidden' },
  imgPlaceholder: { width: '100%', borderTopLeftRadius: 10, borderTopRightRadius: 10, justifyContent: 'center', alignItems: 'center' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, gap: 3 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  actBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 6, gap: 4 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 20, borderRadius: 12, marginBottom: 16, gap: 10, borderWidth: 2, borderStyle: 'dashed' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  modalFooter: { flexDirection: 'row', padding: 20, gap: 12, borderTopWidth: 1 },
});
