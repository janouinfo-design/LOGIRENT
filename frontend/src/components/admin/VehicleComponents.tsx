import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, TextInput, Image, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../../api/axios';
import Button from '../Button';

interface VehicleFormProps {
  brand: string; setBrand: (v: string) => void;
  model: string; setModel: (v: string) => void;
  year: string; setYear: (v: string) => void;
  type: string; setType: (v: string) => void;
  price: string; setPrice: (v: string) => void;
  location: string; setLocation: (v: string) => void;
  description: string; setDescription: (v: string) => void;
  seats: string; setSeats: (v: string) => void;
  transmission: string; setTransmission: (v: string) => void;
  fuelType: string; setFuelType: (v: string) => void;
  C: any;
}

export function VehicleForm(p: VehicleFormProps) {
  const { C } = p;
  const OptionRow = ({ label, options, value, onChange }: { label: string; options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) => (
    <View style={{ marginBottom: 16 }}>
      <Text style={[st.label, { color: C.text }]}>{label}</Text>
      <View style={st.optRow}>
        {options.map(o => (
          <TouchableOpacity key={o.value}
            style={[st.opt, { borderColor: value === o.value ? C.accent : C.border, backgroundColor: value === o.value ? C.accent + '15' : 'transparent' }]}
            onPress={() => onChange(o.value)}>
            <Text style={{ fontSize: 13, fontWeight: '500', color: value === o.value ? C.accent : C.textLight }}>{o.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, padding: 20 }} keyboardShouldPersistTaps="handled">
      {[
        { label: 'Marque *', val: p.brand, set: p.setBrand, ph: 'ex: BMW, Mercedes...' },
        { label: 'Modele *', val: p.model, set: p.setModel, ph: 'ex: Series 3, Classe C...' },
      ].map((f, i) => (
        <View key={i} style={{ marginBottom: 16 }}>
          <Text style={[st.label, { color: C.text }]}>{f.label}</Text>
          <TextInput style={[st.input, { color: C.text, backgroundColor: C.bg, borderColor: C.border }]}
            value={f.val} onChangeText={f.set} placeholder={f.ph} placeholderTextColor={C.textLight} />
        </View>
      ))}
      <View style={st.row}>
        <View style={{ flex: 1 }}>
          <Text style={[st.label, { color: C.text }]}>Annee *</Text>
          <TextInput style={[st.input, { color: C.text, backgroundColor: C.bg, borderColor: C.border }]}
            value={p.year} onChangeText={p.setYear} keyboardType="numeric" placeholder="2024" placeholderTextColor={C.textLight} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[st.label, { color: C.text }]}>Prix/Jour (CHF) *</Text>
          <TextInput style={[st.input, { color: C.text, backgroundColor: C.bg, borderColor: C.border }]}
            value={p.price} onChangeText={p.setPrice} keyboardType="numeric" placeholder="120" placeholderTextColor={C.textLight} />
        </View>
      </View>
      <View style={st.row}>
        <View style={{ flex: 1 }}>
          <Text style={[st.label, { color: C.text }]}>Places</Text>
          <TextInput style={[st.input, { color: C.text, backgroundColor: C.bg, borderColor: C.border }]}
            value={p.seats} onChangeText={p.setSeats} keyboardType="numeric" placeholder="5" placeholderTextColor={C.textLight} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[st.label, { color: C.text }]}>Transmission</Text>
          <View style={st.optRow}>
            {[{ value: 'automatic', label: 'Auto' }, { value: 'manual', label: 'Manuel' }].map(o => (
              <TouchableOpacity key={o.value}
                style={[st.opt, { borderColor: p.transmission === o.value ? C.accent : C.border, backgroundColor: p.transmission === o.value ? C.accent + '15' : 'transparent' }]}
                onPress={() => p.setTransmission(o.value)}>
                <Text style={{ fontSize: 13, fontWeight: '500', color: p.transmission === o.value ? C.accent : C.textLight }}>{o.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
      <OptionRow label="Type" value={p.type} onChange={p.setType}
        options={[{ value: 'berline', label: 'Berline' }, { value: 'SUV', label: 'SUV' }, { value: 'citadine', label: 'Citadine' }, { value: 'utilitaire', label: 'Utilitaire' }]} />
      <OptionRow label="Carburant" value={p.fuelType} onChange={p.setFuelType}
        options={[{ value: 'essence', label: 'Essence' }, { value: 'diesel', label: 'Diesel' }, { value: 'electric', label: 'Electrique' }, { value: 'hybrid', label: 'Hybride' }]} />
      <OptionRow label="Localisation" value={p.location} onChange={p.setLocation}
        options={[{ value: 'Geneva', label: 'Geneve' }, { value: 'Zurich', label: 'Zurich' }, { value: 'Lausanne', label: 'Lausanne' }, { value: 'Bern', label: 'Bern' }]} />
      <View style={{ marginBottom: 16 }}>
        <Text style={[st.label, { color: C.text }]}>Description</Text>
        <TextInput style={[st.input, { color: C.text, backgroundColor: C.bg, borderColor: C.border, height: 80, textAlignVertical: 'top' }]}
          value={p.description} onChangeText={p.setDescription} placeholder="Description..." placeholderTextColor={C.textLight} multiline numberOfLines={4} />
      </View>
    </ScrollView>
  );
}

interface Vehicle {
  id: string; brand: string; model: string; year: number; type: string;
  price_per_day: number; location: string; status: string; seats: number;
  photos?: string[]; description?: string; transmission: string; fuel_type: string;
  options?: any[];
}

export function PhotoManagementModal({ visible, vehicle, C, onClose, onRefresh }: {
  visible: boolean; vehicle: Vehicle | null; C: any; onClose: () => void; onRefresh: () => void;
}) {
  const [photos, setPhotos] = useState<string[]>(vehicle?.photos || []);
  const [uploading, setUploading] = useState(false);

  React.useEffect(() => { if (vehicle) setPhotos(vehicle.photos || []); }, [vehicle]);

  const handleUpload = async () => {
    if (!vehicle) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { alert('Permission requise'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [16, 9], quality: 0.8, base64: true });
    if (result.canceled || !result.assets[0]) return;
    setUploading(true);
    try {
      const asset = result.assets[0];
      let base64Data = asset.base64;
      let contentType = asset.mimeType || 'image/jpeg';
      if (!base64Data && asset.uri?.startsWith('data:')) {
        const m = asset.uri.match(/^data:([^;]+);base64,(.+)$/);
        if (m) { contentType = m[1]; base64Data = m[2]; }
      }
      if (base64Data) {
        const resp = await (await import('../../api/axios')).default.post(`/api/admin/vehicles/${vehicle.id}/photos/base64`, { image: base64Data, content_type: contentType });
        setPhotos(prev => [...prev, resp.data.photo]);
        onRefresh();
        alert('Photo ajoutee !');
      }
    } catch (e: any) { alert('Erreur: ' + (e.response?.data?.detail || e.message)); }
    finally { setUploading(false); }
  };

  const handleDelete = async (idx: number) => {
    if (!vehicle) return;
    const ok = Platform.OS === 'web' ? window.confirm('Supprimer ?') : true;
    if (!ok) return;
    try {
      await (await import('../../api/axios')).default.delete(`/api/admin/vehicles/${vehicle.id}/photos/${idx}`);
      setPhotos(prev => prev.filter((_, i) => i !== idx));
      onRefresh();
    } catch { alert('Erreur de suppression'); }
  };

  if (!visible || !vehicle) return null;
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={[st.modalHeader, { backgroundColor: C.card, borderBottomColor: C.border }]}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: C.text }}>Photos - {vehicle.brand} {vehicle.model}</Text>
          <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={C.text} /></TouchableOpacity>
        </View>
        <ScrollView style={{ flex: 1, padding: 20 }}>
          <TouchableOpacity style={[st.uploadBtn, { borderColor: C.accent }]} onPress={handleUpload} disabled={uploading}>
            {uploading ? <ActivityIndicator color={C.accent} /> : (
              <><Ionicons name="cloud-upload" size={32} color={C.accent} /><Text style={{ color: C.accent, fontWeight: '600', marginTop: 8 }}>Ajouter une photo</Text></>
            )}
          </TouchableOpacity>
          {photos.length > 0 ? (
            <View style={st.grid}>
              {photos.map((photo, i) => (
                <View key={i} style={st.photoItem}>
                  <Image source={{ uri: photo }} style={{ width: '100%', height: 120, borderRadius: 8 }} />
                  <TouchableOpacity style={st.delPhotoBtn} onPress={() => handleDelete(i)}>
                    <Ionicons name="trash" size={14} color="#fff" />
                  </TouchableOpacity>
                  {i === 0 && <View style={st.mainBadge}><Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>Principale</Text></View>}
                </View>
              ))}
            </View>
          ) : (
            <View style={{ alignItems: 'center', paddingTop: 40 }}>
              <Ionicons name="images-outline" size={48} color={C.textLight} />
              <Text style={{ color: C.textLight, marginTop: 12 }}>Aucune photo</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 15 },
  row: { flexDirection: 'row', marginBottom: 16 },
  optRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  opt: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  uploadBtn: { alignItems: 'center', justifyContent: 'center', padding: 24, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', marginBottom: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoItem: { width: '48%', position: 'relative' },
  delPhotoBtn: { position: 'absolute', top: 6, right: 6, backgroundColor: '#EF4444', width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  mainBadge: { position: 'absolute', bottom: 6, left: 6, backgroundColor: '#10B981', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
});
