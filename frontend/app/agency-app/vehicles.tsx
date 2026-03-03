import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, TextInput, Modal, ScrollView, Alert, Platform, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api/axios';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeStore } from '../../src/store/themeStore';

const SCREEN_W = Dimensions.get('window').width;

interface VehicleDocument {
  id: string;
  original_filename: string;
  content_type: string;
  size: number;
  doc_type: string;
  doc_type_label: string;
  expiry_date?: string;
  uploaded_at: string;
  is_deleted: boolean;
}

interface Vehicle {
  id: string; brand: string; model: string; year: number; price_per_day: number;
  type: string; seats: number; transmission: string; fuel_type: string; status: string;
  description?: string; location?: string; photos?: string[];
  plate_number?: string; chassis_number?: string; color?: string;
  documents?: VehicleDocument[];
}

const STATUS_CONFIG: Record<string, { icon: string; label: string; bg: string; text: string; border: string }> = {
  available: { icon: 'checkmark-circle', label: 'Disponible', bg: '#10B98120', text: '#10B981', border: '#10B98150' },
  rented: { icon: 'car', label: 'Loue', bg: '#FBBF2420', text: '#FBBF24', border: '#FBBF2450' },
  maintenance: { icon: 'construct', label: 'Maintenance', bg: '#EF444420', text: '#EF4444', border: '#EF444450' },
};

const DOC_TYPES = [
  { v: 'carte_grise', l: 'Carte Grise', icon: 'document-text' },
  { v: 'assurance', l: 'Assurance', icon: 'shield-checkmark' },
  { v: 'controle_technique', l: 'Controle Technique', icon: 'clipboard' },
  { v: 'photo', l: 'Photo', icon: 'camera' },
  { v: 'autre', l: 'Autre', icon: 'attach' },
];

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
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState('carte_grise');
  const [docExpiryDate, setDocExpiryDate] = useState('');

  const [uploadingPhoto, setUploadingPhoto] = useState(false);

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

  const openEdit = (v: Vehicle) => {
    setEditVehicle(v);
    setEditForm({
      brand: v.brand, model: v.model, year: String(v.year), type: v.type,
      price_per_day: String(v.price_per_day), seats: String(v.seats),
      transmission: v.transmission, fuel_type: v.fuel_type, status: v.status,
      location: v.location || '', description: v.description || '',
      plate_number: v.plate_number || '', chassis_number: v.chassis_number || '',
      color: v.color || '',
    });
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
        plate_number: editForm.plate_number || null,
        chassis_number: editForm.chassis_number || null,
        color: editForm.color || null,
      });
      setEditVehicle(null);
      await fetchVehicles();
    } catch (e: any) {
      const msg = e.response?.data?.detail || 'Erreur lors de la sauvegarde';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Erreur', msg);
    } finally { setSaving(false); }
  };

  const handleDocumentUpload = async () => {
    if (!editVehicle) return;
    if (Platform.OS !== 'web') {
      Alert.alert('Info', 'Upload de documents disponible uniquement sur le web');
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.jpg,.jpeg,.png,.webp,.doc,.docx';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) {
        window.alert('Fichier trop volumineux (max 10 MB)');
        return;
      }
      setUploadingDoc(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        const params = new URLSearchParams({ doc_type: selectedDocType });
        if (docExpiryDate) params.append('expiry_date', docExpiryDate);
        const res = await api.post(
          `/api/admin/vehicles/${editVehicle.id}/documents?${params.toString()}`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        setDocExpiryDate('');
        // Refresh vehicle data
        const vRes = await api.get(`/api/vehicles/${editVehicle.id}`);
        setEditVehicle(vRes.data);
        await fetchVehicles();
      } catch (e: any) {
        const msg = e.response?.data?.detail || 'Erreur lors de l\'upload';
        window.alert(msg);
      } finally { setUploadingDoc(false); }
    };
    input.click();
  };

  const handlePhotoUpload = async () => {
    if (!editVehicle) return;
    if (Platform.OS !== 'web') {
      Alert.alert('Info', 'Upload de photos disponible uniquement sur le web');
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    input.multiple = true;
    input.onchange = async (e: any) => {
      const files = Array.from(e.target.files || []) as File[];
      if (!files.length) return;
      setUploadingPhoto(true);
      try {
        for (const file of files) {
          if (file.size > 5 * 1024 * 1024) {
            window.alert(`${file.name} trop volumineux (max 5 MB)`);
            continue;
          }
          const formData = new FormData();
          formData.append('file', file);
          await api.post(
            `/api/admin/vehicles/${editVehicle.id}/photos`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } }
          );
        }
        const vRes = await api.get(`/api/vehicles/${editVehicle.id}`);
        setEditVehicle(vRes.data);
        await fetchVehicles();
      } catch (e: any) {
        const msg = e.response?.data?.detail || 'Erreur lors de l\'upload photo';
        window.alert(msg);
      } finally { setUploadingPhoto(false); }
    };
    input.click();
  };

  const handleDeletePhoto = async (photoIndex: number) => {
    if (!editVehicle) return;
    const confirmed = Platform.OS === 'web'
      ? window.confirm('Supprimer cette photo ?')
      : await new Promise(resolve => Alert.alert('Confirmer', 'Supprimer cette photo ?', [{ text: 'Non', onPress: () => resolve(false) }, { text: 'Oui', onPress: () => resolve(true) }]));
    if (!confirmed) return;
    try {
      const photos = [...(editVehicle.photos || [])];
      photos.splice(photoIndex, 1);
      await api.put(`/api/admin/vehicles/${editVehicle.id}`, { photos });
      const vRes = await api.get(`/api/vehicles/${editVehicle.id}`);
      setEditVehicle(vRes.data);
      await fetchVehicles();
    } catch (e: any) {
      const msg = e.response?.data?.detail || 'Erreur';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Erreur', msg);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!editVehicle) return;
    const confirmed = Platform.OS === 'web'
      ? window.confirm('Supprimer ce document ?')
      : await new Promise(resolve => Alert.alert('Confirmer', 'Supprimer ce document ?', [{ text: 'Non', onPress: () => resolve(false) }, { text: 'Oui', onPress: () => resolve(true) }]));
    if (!confirmed) return;
    try {
      await api.delete(`/api/admin/vehicles/${editVehicle.id}/documents/${docId}`);
      const vRes = await api.get(`/api/vehicles/${editVehicle.id}`);
      setEditVehicle(vRes.data);
      await fetchVehicles();
    } catch (e: any) {
      const msg = e.response?.data?.detail || 'Erreur lors de la suppression';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Erreur', msg);
    }
  };

  const handleViewDocument = async (doc: VehicleDocument) => {
    if (!editVehicle) return;
    try {
      const res = await api.get(
        `/api/vehicles/${editVehicle.id}/documents/${doc.id}/download`,
        { responseType: 'blob' }
      );
      const blob = new Blob([res.data], { type: doc.content_type });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (e: any) {
      const msg = e.response?.data?.detail || 'Erreur lors du telechargement';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Erreur', msg);
    }
  };

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: vehicles.length, available: 0, rented: 0, maintenance: 0 };
    vehicles.forEach(v => { if (counts[v.status] !== undefined) counts[v.status]++; });
    return counts;
  }, [vehicles]);

  const getStatus = (s: string) => STATUS_CONFIG[s] || { icon: 'help-circle', label: s, bg: '#6B728020', text: '#6B7280', border: '#6B728050' };
  const getDocIcon = (docType: string) => DOC_TYPES.find(d => d.v === docType)?.icon || 'document';
  const formatFileSize = (bytes: number) => bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;
  const getExpiryStatus = (expiry?: string) => {
    if (!expiry) return null;
    const now = new Date();
    const exp = new Date(expiry);
    const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { label: 'Expire', color: '#EF4444', icon: 'alert-circle' };
    if (diffDays <= 30) return { label: `${diffDays}j`, color: '#F59E0B', icon: 'warning' };
    return { label: expiry.slice(0, 10), color: '#10B981', icon: 'checkmark-circle' };
  };

  const activeDocuments = editVehicle?.documents?.filter(d => !d.is_deleted) || [];

  const CARD_GAP = 10;
  const PADDING = 16;
  const NUM_COLS = 3;
  const cardW = (SCREEN_W - PADDING * 2 - CARD_GAP * (NUM_COLS - 1)) / NUM_COLS;

  if (loading) return <View style={[st.container, { backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={C.accent} /></View>;

  return (
    <View style={[st.container, { backgroundColor: C.bg }]}>
      {/* Search */}
      <View style={[st.searchBar, { backgroundColor: C.card, borderColor: C.border }]}>
        <Ionicons name="search" size={18} color={C.textLight} />
        <TextInput style={[st.searchInput, { color: C.text }]} placeholder="Rechercher (nom, plaque)..." placeholderTextColor={C.textLight} value={search} onChangeText={setSearch} data-testid="vehicle-search" />
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
      <FlatList data={filtered} keyExtractor={(item) => item.id} numColumns={3}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
        contentContainerStyle={{ padding: PADDING, paddingTop: 8, paddingBottom: 32 }}
        columnWrapperStyle={{ gap: CARD_GAP, marginBottom: CARD_GAP }}
        ListEmptyComponent={<View style={st.empty}><Ionicons name="car-outline" size={40} color={C.textLight} /><Text style={{ color: C.textLight, fontSize: 14 }}>Aucun vehicule</Text></View>}
        renderItem={({ item }) => {
          const sc = getStatus(item.status);
          const photo = item.photos?.[0];
          const docCount = item.documents?.filter(d => !d.is_deleted).length || 0;
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
                  <Text style={{ color: sc.text, fontSize: 11, fontWeight: '800' }}>{sc.label}</Text>
                </View>
                {/* Doc count badge */}
                {docCount > 0 && (
                  <View style={[st.docCountBadge, { backgroundColor: '#3B82F6' }]} data-testid={`doc-count-${item.id}`}>
                    <Ionicons name="document-attach" size={11} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{docCount}</Text>
                  </View>
                )}
              </View>

              {/* Info */}
              <View style={st.cardInfo}>
                <Text style={[st.vehicleName, { color: C.text }]} numberOfLines={1}>{item.brand} {item.model}</Text>
                <Text style={{ color: C.textLight, fontSize: 12, marginTop: 2 }}>{item.year} | {item.type}</Text>
                {item.plate_number ? (
                  <View style={[st.plateTag, { backgroundColor: C.accent + '15', borderColor: C.accent + '40' }]}>
                    <Text style={{ color: C.accent, fontSize: 11, fontWeight: '700' }}>{item.plate_number}</Text>
                  </View>
                ) : null}
                <View style={st.cardMeta}>
                  <Text style={{ color: C.textLight, fontSize: 11 }}>{item.seats}pl | {item.transmission === 'automatic' ? 'Auto' : 'Man.'}</Text>
                </View>
                <View style={st.priceRow}>
                  <Text style={[st.price, { color: C.accent }]}>CHF {item.price_per_day}</Text>
                  <Text style={{ color: C.textLight, fontSize: 11 }}>/jour</Text>
                </View>
                <TouchableOpacity onPress={() => openEdit(item)} style={[st.editBtn, { backgroundColor: C.accent }]} data-testid={`edit-vehicle-${item.id}`}>
                  <Ionicons name="create-outline" size={14} color="#fff" />
                  <Text style={st.editBtnText}>Modifier</Text>
                </TouchableOpacity>
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

            <ScrollView showsVerticalScrollIndicator={true} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
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

              {/* ===== NEW FIELDS: Plate, Chassis, Color ===== */}
              <View style={[st.sectionHeader, { borderTopColor: C.border }]}>
                <Ionicons name="card" size={16} color={C.accent} />
                <Text style={[st.sectionTitle, { color: C.text }]}>Identification</Text>
              </View>

              <View style={st.fieldRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[st.fieldLabel, { color: C.textLight }]}>Plaque d'immatriculation</Text>
                  <TextInput style={[st.input, { color: C.text, borderColor: C.border }]} value={editForm.plate_number} onChangeText={v => setEditForm({ ...editForm, plate_number: v })} placeholder="GE 12345" placeholderTextColor={C.textLight + '80'} data-testid="edit-plate-number" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[st.fieldLabel, { color: C.textLight }]}>Couleur</Text>
                  <TextInput style={[st.input, { color: C.text, borderColor: C.border }]} value={editForm.color} onChangeText={v => setEditForm({ ...editForm, color: v })} placeholder="Noir, Blanc..." placeholderTextColor={C.textLight + '80'} data-testid="edit-color" />
                </View>
              </View>

              <View style={{ marginBottom: 12 }}>
                <Text style={[st.fieldLabel, { color: C.textLight }]}>Numero de chassis</Text>
                <TextInput style={[st.input, { color: C.text, borderColor: C.border }]} value={editForm.chassis_number} onChangeText={v => setEditForm({ ...editForm, chassis_number: v })} placeholder="WBA1234567890" placeholderTextColor={C.textLight + '80'} data-testid="edit-chassis-number" />
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

              {/* ===== PHOTOS SECTION ===== */}
              <View style={[st.sectionHeader, { borderTopColor: C.border }]}>
                <Ionicons name="images" size={16} color={C.accent} />
                <Text style={[st.sectionTitle, { color: C.text }]}>Photos ({editVehicle?.photos?.length || 0})</Text>
              </View>

              {/* Photos Grid */}
              {editVehicle?.photos && editVehicle.photos.length > 0 ? (
                <View style={st.photosGrid}>
                  {editVehicle.photos.map((photo, idx) => (
                    <View key={idx} style={st.photoThumb}>
                      <Image source={{ uri: photo }} style={st.photoThumbImg} resizeMode="cover" />
                      <TouchableOpacity onPress={() => handleDeletePhoto(idx)} style={st.photoDeleteBtn} data-testid={`delete-photo-${idx}`}>
                        <Ionicons name="close-circle" size={22} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={{ alignItems: 'center', paddingVertical: 12, opacity: 0.5 }}>
                  <Ionicons name="images-outline" size={28} color={C.textLight} />
                  <Text style={{ color: C.textLight, fontSize: 12, marginTop: 4 }}>Aucune photo</Text>
                </View>
              )}

              <TouchableOpacity
                onPress={handlePhotoUpload}
                disabled={uploadingPhoto}
                style={[st.uploadBtn, { borderColor: '#10B981', backgroundColor: '#10B98110' }]}
                data-testid="upload-photo-btn"
              >
                {uploadingPhoto ? (
                  <ActivityIndicator size="small" color="#10B981" />
                ) : (
                  <>
                    <Ionicons name="camera" size={18} color="#10B981" />
                    <Text style={{ color: '#10B981', fontSize: 13, fontWeight: '700' }}>Ajouter des photos</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* ===== DOCUMENTS SECTION ===== */}
              <View style={[st.sectionHeader, { borderTopColor: C.border }]}>
                <Ionicons name="folder-open" size={16} color={C.accent} />
                <Text style={[st.sectionTitle, { color: C.text }]}>Documents ({activeDocuments.length})</Text>
              </View>

              {/* Document Type Selector + Upload Button */}
              <View style={st.docUploadRow}>
                <View style={{ flex: 1 }}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {DOC_TYPES.map(dt => (
                        <TouchableOpacity key={dt.v} onPress={() => setSelectedDocType(dt.v)}
                          style={[st.chip, { backgroundColor: selectedDocType === dt.v ? C.accent + '20' : 'transparent', borderColor: selectedDocType === dt.v ? C.accent : C.border, flexDirection: 'row', gap: 4, alignItems: 'center' }]}
                          data-testid={`doc-type-${dt.v}`}>
                          <Ionicons name={dt.icon as any} size={12} color={selectedDocType === dt.v ? C.accent : C.textLight} />
                          <Text style={{ color: selectedDocType === dt.v ? C.accent : C.textLight, fontSize: 11, fontWeight: selectedDocType === dt.v ? '700' : '500' }}>{dt.l}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </View>

              {/* Expiry date input */}
              <View style={st.fieldRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[st.fieldLabel, { color: C.textLight }]}>Date d'expiration (optionnel)</Text>
                  <TextInput
                    style={[st.input, { color: C.text, borderColor: C.border }]}
                    value={docExpiryDate}
                    onChangeText={setDocExpiryDate}
                    placeholder="AAAA-MM-JJ"
                    placeholderTextColor={C.textLight + '80'}
                    data-testid="doc-expiry-date"
                  />
                </View>
              </View>

              <TouchableOpacity
                onPress={handleDocumentUpload}
                disabled={uploadingDoc}
                style={[st.uploadBtn, { borderColor: C.accent, backgroundColor: C.accent + '10' }]}
                data-testid="upload-document-btn"
              >
                {uploadingDoc ? (
                  <ActivityIndicator size="small" color={C.accent} />
                ) : (
                  <>
                    <Ionicons name="cloud-upload" size={18} color={C.accent} />
                    <Text style={{ color: C.accent, fontSize: 13, fontWeight: '700' }}>Ajouter un document</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Document List */}
              {activeDocuments.length > 0 ? (
                <View style={{ gap: 6, marginTop: 8 }}>
                  {activeDocuments.map(doc => {
                    const expStatus = getExpiryStatus(doc.expiry_date);
                    return (
                      <View key={doc.id} style={[st.docItem, { backgroundColor: C.bg, borderColor: expStatus?.color === '#EF4444' ? '#EF444450' : C.border }]} data-testid={`doc-item-${doc.id}`}>
                        <View style={[st.docIconBox, { backgroundColor: C.accent + '15' }]}>
                          <Ionicons name={getDocIcon(doc.doc_type) as any} size={18} color={C.accent} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={{ color: C.text, fontSize: 12, fontWeight: '600' }} numberOfLines={1}>{doc.original_filename}</Text>
                          <View style={{ flexDirection: 'row', gap: 8, marginTop: 2, alignItems: 'center' }}>
                            <Text style={{ color: C.textLight, fontSize: 10 }}>{doc.doc_type_label}</Text>
                            <Text style={{ color: C.textLight, fontSize: 10 }}>{formatFileSize(doc.size)}</Text>
                            {expStatus && (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, backgroundColor: expStatus.color + '18' }}>
                                <Ionicons name={expStatus.icon as any} size={9} color={expStatus.color} />
                                <Text style={{ color: expStatus.color, fontSize: 9, fontWeight: '700' }}>{expStatus.label}</Text>
                              </View>
                            )}
                          </View>
                        </View>
                        <TouchableOpacity onPress={() => handleViewDocument(doc)} style={st.docActionBtn} data-testid={`view-doc-${doc.id}`}>
                          <Ionicons name="eye" size={16} color={C.accent} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteDocument(doc.id)} style={st.docActionBtn} data-testid={`delete-doc-${doc.id}`}>
                          <Ionicons name="trash" size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={{ alignItems: 'center', paddingVertical: 16, opacity: 0.5 }}>
                  <Ionicons name="document-outline" size={28} color={C.textLight} />
                  <Text style={{ color: C.textLight, fontSize: 12, marginTop: 4 }}>Aucun document</Text>
                </View>
              )}
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
  docCountBadge: { position: 'absolute', top: 4, right: 4, flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 8 },
  cardInfo: { padding: 8 },
  vehicleName: { fontSize: 14, fontWeight: '800' },
  plateTag: { marginTop: 3, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, alignSelf: 'flex-start', borderWidth: 1 },
  cardMeta: { marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2, marginTop: 4 },
  price: { fontSize: 14, fontWeight: '800' },
  editBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 8, marginTop: 8 },
  editBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  photoThumb: { position: 'relative', width: 90, height: 70, borderRadius: 8, overflow: 'hidden' },
  photoThumbImg: { width: '100%', height: '100%' },
  photoDeleteBtn: { position: 'absolute', top: -4, right: -4, backgroundColor: '#fff', borderRadius: 11 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalBox: { width: '100%', maxWidth: 560, borderRadius: 16, padding: 20, maxHeight: '85%', flex: 0 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 16, marginTop: 16, marginBottom: 10, borderTopWidth: 1 },
  sectionTitle: { fontSize: 14, fontWeight: '700' },
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
  docUploadRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderStyle: 'dashed', marginBottom: 4 },
  docItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  docIconBox: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  docActionBtn: { padding: 6, marginLeft: 4 },
});
