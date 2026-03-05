import React, { useState } from 'react';
import { View, Text, Modal, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../src/api/axios';
import { vst } from './vehicleTypes';

interface Props {
  visible: boolean;
  colors: any;
  onClose: () => void;
  onCreated: () => void;
}

const ADD_TYPES = ['sedan', 'suv', 'utilitaire', 'citadine', 'berline', 'break'];
const ADD_TRANSMISSIONS = ['automatic', 'manual'];
const ADD_FUELS = ['essence', 'diesel', 'electric', 'hybrid'];

export default function NewVehicleModal({ visible, colors: C, onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    brand: '', model: '', year: new Date().getFullYear(), type: 'sedan',
    price_per_day: 0, seats: 5, transmission: 'automatic', fuel_type: 'essence',
    plate_number: '', color: '', location: '', description: ''
  });
  const [loading, setLoading] = useState(false);

  const resetForm = () => setForm({
    brand: '', model: '', year: new Date().getFullYear(), type: 'sedan',
    price_per_day: 0, seats: 5, transmission: 'automatic', fuel_type: 'essence',
    plate_number: '', color: '', location: '', description: ''
  });

  const handleCreate = async () => {
    if (!form.brand || !form.model || !form.price_per_day) {
      const msg = 'Veuillez remplir la marque, le modele et le prix';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Erreur', msg);
      return;
    }
    setLoading(true);
    try {
      await api.post('/api/admin/vehicles', {
        brand: form.brand, model: form.model, year: form.year, type: form.type,
        price_per_day: form.price_per_day, seats: form.seats,
        transmission: form.transmission, fuel_type: form.fuel_type,
        plate_number: form.plate_number || null, color: form.color || null,
        location: form.location || 'Geneva', description: form.description || '',
      });
      resetForm();
      onClose();
      onCreated();
    } catch (e: any) {
      const msg = e.response?.data?.detail || 'Erreur lors de la creation';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Erreur', msg);
    } finally { setLoading(false); }
  };

  const handleClose = () => { resetForm(); onClose(); };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={vst.modalOverlay}>
        <View style={[vst.modalBox, { backgroundColor: C.card, maxHeight: '90%' }]}>
          <View style={vst.modalHeader}>
            <Text style={[vst.modalTitle, { color: C.text }]}>Nouveau vehicule</Text>
            <TouchableOpacity onPress={handleClose} data-testid="close-add-modal">
              <Ionicons name="close" size={24} color={C.textLight} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={true} contentContainerStyle={{ paddingBottom: 20 }}>
            <View style={{ gap: 10 }}>
              {/* Row 1: Brand, Model, Year */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[vst.fieldLabel, { color: C.text }]}>Marque *</Text>
                  <TextInput style={[vst.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]} value={form.brand} onChangeText={v => setForm(p => ({ ...p, brand: v }))} placeholder="Ex: BMW" placeholderTextColor={C.textLight} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[vst.fieldLabel, { color: C.text }]}>Modele *</Text>
                  <TextInput style={[vst.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]} value={form.model} onChangeText={v => setForm(p => ({ ...p, model: v }))} placeholder="Ex: Series 3" placeholderTextColor={C.textLight} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[vst.fieldLabel, { color: C.text }]}>Annee</Text>
                  <TextInput style={[vst.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]} value={String(form.year)} onChangeText={v => setForm(p => ({ ...p, year: parseInt(v) || 2024 }))} keyboardType="numeric" />
                </View>
              </View>

              {/* Row 2: Price, Seats, Plate */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[vst.fieldLabel, { color: C.text }]}>Prix/jour (CHF) *</Text>
                  <TextInput style={[vst.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]} value={String(form.price_per_day || '')} onChangeText={v => setForm(p => ({ ...p, price_per_day: parseFloat(v) || 0 }))} keyboardType="numeric" placeholder="120" placeholderTextColor={C.textLight} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[vst.fieldLabel, { color: C.text }]}>Places</Text>
                  <TextInput style={[vst.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]} value={String(form.seats)} onChangeText={v => setForm(p => ({ ...p, seats: parseInt(v) || 5 }))} keyboardType="numeric" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[vst.fieldLabel, { color: C.text }]}>Plaque</Text>
                  <TextInput style={[vst.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]} value={form.plate_number} onChangeText={v => setForm(p => ({ ...p, plate_number: v }))} placeholder="GE 123456" placeholderTextColor={C.textLight} />
                </View>
              </View>

              {/* Row 3: Color, Location */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[vst.fieldLabel, { color: C.text }]}>Couleur</Text>
                  <TextInput style={[vst.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]} value={form.color} onChangeText={v => setForm(p => ({ ...p, color: v }))} placeholder="Noir" placeholderTextColor={C.textLight} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[vst.fieldLabel, { color: C.text }]}>Localisation</Text>
                  <TextInput style={[vst.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]} value={form.location} onChangeText={v => setForm(p => ({ ...p, location: v }))} placeholder="Geneve" placeholderTextColor={C.textLight} />
                </View>
              </View>

              {/* Type chips */}
              <View>
                <Text style={[vst.fieldLabel, { color: C.text }]}>Type</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {ADD_TYPES.map(t => (
                    <TouchableOpacity key={t} onPress={() => setForm(p => ({ ...p, type: t }))} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: form.type === t ? C.accent : C.border }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: form.type === t ? '#fff' : C.text }}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Transmission chips */}
              <View>
                <Text style={[vst.fieldLabel, { color: C.text }]}>Transmission</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  {ADD_TRANSMISSIONS.map(t => (
                    <TouchableOpacity key={t} onPress={() => setForm(p => ({ ...p, transmission: t }))} style={{ flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: form.transmission === t ? C.accent : C.border, alignItems: 'center' }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: form.transmission === t ? '#fff' : C.text }}>{t === 'automatic' ? 'Automatique' : 'Manuelle'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Fuel chips */}
              <View>
                <Text style={[vst.fieldLabel, { color: C.text }]}>Carburant</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {ADD_FUELS.map(t => (
                    <TouchableOpacity key={t} onPress={() => setForm(p => ({ ...p, fuel_type: t }))} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: form.fuel_type === t ? C.accent : C.border }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: form.fuel_type === t ? '#fff' : C.text }}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={{ flexDirection: 'row', gap: 10, paddingTop: 12 }}>
            <TouchableOpacity onPress={handleClose} style={[vst.actionBtn, { borderWidth: 1, borderColor: C.border }]}>
              <Text style={{ color: C.text, fontSize: 14, fontWeight: '600' }}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleCreate} disabled={loading} style={[vst.actionBtn, { backgroundColor: '#10B981', opacity: loading ? 0.6 : 1 }]} data-testid="save-add-vehicle-btn">
              {loading ? <ActivityIndicator size="small" color="#fff" /> : (
                <>
                  <Ionicons name="add-circle" size={18} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Creer le vehicule</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
