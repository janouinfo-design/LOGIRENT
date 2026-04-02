import React, { useState, useMemo } from 'react';
import { View, Text, Modal, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Platform, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../src/api/axios';
import { vst } from './vehicleTypes';

interface Props {
  visible: boolean;
  colors: any;
  onClose: () => void;
  onCreated: () => void;
}

const BRANDS_DATA = [
  { name: 'Mercedes', color: '#222', models: ['Classe A', 'Classe B', 'Classe C', 'Classe E', 'Classe S', 'CLA', 'CLS', 'GLA', 'GLB', 'GLC', 'GLE', 'GLS', 'AMG GT', 'EQA', 'EQC', 'EQS', 'Sprinter', 'Vito', 'Citan'] },
  { name: 'BMW', color: '#0066B1', models: ['Serie 1', 'Serie 2', 'Serie 3', 'Serie 4', 'Serie 5', 'Serie 7', 'Serie 8', 'X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'Z4', 'M2', 'M3', 'M4', 'M5', 'iX', 'iX3', 'i4', 'i5', 'i7'] },
  { name: 'Audi', color: '#BB0A1E', models: ['A1', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'Q2', 'Q3', 'Q5', 'Q7', 'Q8', 'RS3', 'RS4', 'RS5', 'RS6', 'e-tron', 'e-tron GT', 'TT', 'R8'] },
  { name: 'Volkswagen', color: '#003399', models: ['Polo', 'Golf', 'Passat', 'Arteon', 'T-Cross', 'T-Roc', 'Tiguan', 'Touareg', 'ID.3', 'ID.4', 'ID.5', 'Caddy', 'Transporter', 'Multivan'] },
  { name: 'Mini', color: '#2C2C2C', models: ['Cooper', 'Cooper S', 'Cooper SE', 'Countryman', 'Clubman', 'John Cooper Works'] },
  { name: 'Mazda', color: '#910000', models: ['Mazda2', 'Mazda3', 'Mazda6', 'CX-3', 'CX-30', 'CX-5', 'CX-60', 'MX-5', 'MX-30'] },
  { name: 'Mitsubishi', color: '#E60012', models: ['ASX', 'Eclipse Cross', 'Outlander', 'L200', 'Space Star', 'Colt'] },
  { name: 'Toyota', color: '#EB0A1E', models: ['Yaris', 'Corolla', 'Camry', 'RAV4', 'C-HR', 'Highlander', 'Land Cruiser', 'Supra', 'GR86', 'Prius', 'Aygo X', 'Proace'] },
  { name: 'Renault', color: '#FFCC00', models: ['Clio', 'Megane', 'Captur', 'Kadjar', 'Austral', 'Arkana', 'Scenic', 'Espace', 'Kangoo', 'Trafic', 'Master', 'Twingo', 'Zoe'] },
  { name: 'Peugeot', color: '#1B3C6B', models: ['208', '308', '408', '508', '2008', '3008', '5008', 'Partner', 'Rifter', 'Expert', 'Boxer', 'e-208', 'e-308', 'e-2008'] },
  { name: 'Citroen', color: '#A71930', models: ['C3', 'C4', 'C5 X', 'Berlingo', 'SpaceTourer', 'Ami', 'e-C4', 'C3 Aircross', 'C5 Aircross'] },
  { name: 'Ford', color: '#003399', models: ['Fiesta', 'Focus', 'Mondeo', 'Puma', 'Kuga', 'Explorer', 'Mustang', 'Mustang Mach-E', 'Transit', 'Ranger', 'Bronco'] },
  { name: 'Hyundai', color: '#002C5F', models: ['i10', 'i20', 'i30', 'Tucson', 'Kona', 'Santa Fe', 'IONIQ 5', 'IONIQ 6', 'Bayon'] },
  { name: 'Kia', color: '#05141F', models: ['Picanto', 'Rio', 'Ceed', 'Sportage', 'Sorento', 'Stonic', 'Niro', 'EV6', 'EV9'] },
  { name: 'Volvo', color: '#003057', models: ['XC40', 'XC60', 'XC90', 'S60', 'S90', 'V60', 'V90', 'C40', 'EX30', 'EX90'] },
  { name: 'Tesla', color: '#CC0000', models: ['Model 3', 'Model Y', 'Model S', 'Model X', 'Cybertruck'] },
  { name: 'Nissan', color: '#C3002F', models: ['Micra', 'Juke', 'Qashqai', 'X-Trail', 'Leaf', 'Ariya', 'Navara', 'Townstar'] },
  { name: 'Fiat', color: '#8B0000', models: ['500', '500X', '500L', 'Panda', 'Tipo', 'Doblo', '600e', 'Topolino'] },
  { name: 'Skoda', color: '#4BA82E', models: ['Fabia', 'Octavia', 'Superb', 'Kamiq', 'Karoq', 'Kodiaq', 'Scala', 'Enyaq'] },
  { name: 'Seat', color: '#82001A', models: ['Ibiza', 'Leon', 'Arona', 'Ateca', 'Tarraco'] },
  { name: 'Opel', color: '#FFD700', models: ['Corsa', 'Astra', 'Mokka', 'Crossland', 'Grandland', 'Combo', 'Vivaro', 'Movano'] },
  { name: 'Porsche', color: '#A7001E', models: ['911', 'Cayenne', 'Macan', 'Panamera', 'Taycan', 'Boxster', 'Cayman'] },
  { name: 'Land Rover', color: '#005A2B', models: ['Defender', 'Discovery', 'Discovery Sport', 'Range Rover', 'Range Rover Sport', 'Range Rover Evoque', 'Range Rover Velar'] },
  { name: 'Jaguar', color: '#1A1A1A', models: ['F-Pace', 'E-Pace', 'I-Pace', 'XE', 'XF', 'F-Type'] },
  { name: 'Alfa Romeo', color: '#981E32', models: ['Giulia', 'Stelvio', 'Tonale', 'Giulietta'] },
  { name: 'Autre', color: '#666', models: [] },
];

const VEHICLE_TYPES = [
  'Berline', 'Citadine', 'Compacte', 'Break', 'Coupe', 'Cabriolet', 'Roadster',
  'SUV', 'Crossover', '4x4', 'Pick-up', 'Monospace', 'Minivan', 'Limousine',
  'Microcar', 'Voiture electrique', 'Voiture hybride', 'Hybride rechargeable',
  'Sportive', 'Supercar', 'Utilitaire',
];

const YEARS = Array.from({ length: 10 }, (_, i) => 2026 - i);
const TRANSMISSIONS = [{ v: 'automatic', l: 'Automatique' }, { v: 'manual', l: 'Manuelle' }];
const FUELS = [
  { v: 'essence', l: 'Essence' }, { v: 'diesel', l: 'Diesel' },
  { v: 'electric', l: 'Electrique' }, { v: 'hybrid', l: 'Hybride' },
];

export default function NewVehicleModal({ visible, colors: C, onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    brand: '', model: '', year: 2024, type: 'Berline',
    price_per_day: 0, seats: 5, transmission: 'automatic', fuel_type: 'essence',
    plate_number: '', color: '', location: '', description: ''
  });
  const [loading, setLoading] = useState(false);
  const [showBrands, setShowBrands] = useState(false);
  const [showModels, setShowModels] = useState(false);
  const [showTypes, setShowTypes] = useState(false);
  const [showYears, setShowYears] = useState(false);
  const [brandSearch, setBrandSearch] = useState('');
  const [modelSearch, setModelSearch] = useState('');
  const [typeSearch, setTypeSearch] = useState('');

  const resetForm = () => {
    setForm({ brand: '', model: '', year: 2024, type: 'Berline', price_per_day: 0, seats: 5, transmission: 'automatic', fuel_type: 'essence', plate_number: '', color: '', location: '', description: '' });
    setBrandSearch(''); setModelSearch(''); setTypeSearch('');
    setShowBrands(false); setShowModels(false); setShowTypes(false); setShowYears(false);
  };

  const selectedBrand = useMemo(() => BRANDS_DATA.find(b => b.name === form.brand), [form.brand]);

  const filteredBrands = useMemo(() => {
    if (!brandSearch) return BRANDS_DATA;
    return BRANDS_DATA.filter(b => b.name.toLowerCase().includes(brandSearch.toLowerCase()));
  }, [brandSearch]);

  const filteredModels = useMemo(() => {
    const models = selectedBrand?.models || [];
    if (!modelSearch) return models;
    const q = modelSearch.toLowerCase();
    return [...models].sort((a, b) => {
      const aMatch = a.toLowerCase().startsWith(q) ? 0 : 1;
      const bMatch = b.toLowerCase().startsWith(q) ? 0 : 1;
      return aMatch - bMatch || a.localeCompare(b);
    }).filter(m => m.toLowerCase().includes(q));
  }, [selectedBrand, modelSearch]);

  const filteredTypes = useMemo(() => {
    if (!typeSearch) return VEHICLE_TYPES;
    return VEHICLE_TYPES.filter(t => t.toLowerCase().includes(typeSearch.toLowerCase()));
  }, [typeSearch]);

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

  const DropdownField = ({ label, value, placeholder, onPress, required }: { label: string; value: string; placeholder: string; onPress: () => void; required?: boolean }) => (
    <View style={{ flex: 1 }}>
      <Text style={[s.fieldLabel, { color: C.text }]}>{label}{required ? ' *' : ''}</Text>
      <TouchableOpacity onPress={onPress} style={[s.dropdown, { borderColor: value ? '#7C3AED' : C.border, backgroundColor: C.bg }]}>
        <Text style={{ color: value ? C.text : C.textLight, fontSize: 14, flex: 1, fontWeight: value ? '600' : '400' }}>{value || placeholder}</Text>
        <Ionicons name="chevron-down" size={16} color={C.textLight} />
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={vst.modalOverlay}>
        <View style={[vst.modalBox, { backgroundColor: C.card, maxHeight: '90%', maxWidth: 600 }]}>
          <View style={vst.modalHeader}>
            <View>
              <Text style={[vst.modalTitle, { color: C.text, fontSize: 20 }]}>Nouveau vehicule</Text>
              <Text style={{ color: C.textLight, fontSize: 12, marginTop: 2 }}>Remplissez les informations du vehicule</Text>
            </View>
            <TouchableOpacity onPress={handleClose} data-testid="close-add-modal">
              <Ionicons name="close" size={24} color={C.textLight} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={true} contentContainerStyle={{ paddingBottom: 20 }}>
            <View style={{ gap: 16 }}>
              {/* Section: Vehicule */}
              <Text style={[s.section, { color: '#7C3AED' }]}>Identification</Text>

              {/* Brand Dropdown */}
              <View>
                <Text style={[s.fieldLabel, { color: C.text }]}>Marque *</Text>
                <TouchableOpacity onPress={() => { setShowBrands(!showBrands); setShowModels(false); setShowTypes(false); setShowYears(false); }} style={[s.dropdown, { borderColor: form.brand ? '#7C3AED' : C.border, backgroundColor: C.bg }]} data-testid="brand-dropdown">
                  {form.brand ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                      <View style={[s.brandBadge, { backgroundColor: selectedBrand?.color || '#666' }]}>
                        <Text style={s.brandBadgeText}>{form.brand.substring(0, 2).toUpperCase()}</Text>
                      </View>
                      <Text style={{ color: C.text, fontSize: 14, fontWeight: '700' }}>{form.brand}</Text>
                    </View>
                  ) : (
                    <Text style={{ color: C.textLight, fontSize: 14, flex: 1 }}>Choisir une marque</Text>
                  )}
                  <Ionicons name={showBrands ? 'chevron-up' : 'chevron-down'} size={16} color={C.textLight} />
                </TouchableOpacity>

                {showBrands && (
                  <View style={[s.dropdownList, { backgroundColor: C.card, borderColor: C.border }]}>
                    <View style={[s.searchInDropdown, { borderColor: C.border, backgroundColor: C.bg }]}>
                      <Ionicons name="search" size={14} color={C.textLight} />
                      <TextInput style={[s.searchInput, { color: C.text }]} placeholder="Rechercher..." placeholderTextColor={C.textLight} value={brandSearch} onChangeText={setBrandSearch} autoFocus />
                    </View>
                    <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                      {filteredBrands.map(b => (
                        <TouchableOpacity key={b.name} onPress={() => { setForm(p => ({ ...p, brand: b.name, model: '' })); setShowBrands(false); setBrandSearch(''); }} style={[s.dropdownItem, form.brand === b.name && { backgroundColor: '#7C3AED10' }]} data-testid={`brand-${b.name}`}>
                          <View style={[s.brandBadge, { backgroundColor: b.color }]}>
                            <Text style={s.brandBadgeText}>{b.name.substring(0, 2).toUpperCase()}</Text>
                          </View>
                          <Text style={{ color: C.text, fontSize: 14, fontWeight: form.brand === b.name ? '700' : '500' }}>{b.name}</Text>
                          {b.models.length > 0 && <Text style={{ color: C.textLight, fontSize: 11, marginLeft: 'auto' }}>{b.models.length} modeles</Text>}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Model Dropdown */}
              {form.brand && (
                <View>
                  <Text style={[s.fieldLabel, { color: C.text }]}>Modele *</Text>
                  {selectedBrand && selectedBrand.models.length > 0 ? (
                    <>
                      <TouchableOpacity onPress={() => { setShowModels(!showModels); setShowBrands(false); setShowTypes(false); setShowYears(false); }} style={[s.dropdown, { borderColor: form.model ? '#7C3AED' : C.border, backgroundColor: C.bg }]} data-testid="model-dropdown">
                        <Text style={{ color: form.model ? C.text : C.textLight, fontSize: 14, flex: 1, fontWeight: form.model ? '600' : '400' }}>{form.model || 'Choisir un modele'}</Text>
                        <Ionicons name={showModels ? 'chevron-up' : 'chevron-down'} size={16} color={C.textLight} />
                      </TouchableOpacity>
                      {showModels && (
                        <View style={[s.dropdownList, { backgroundColor: C.card, borderColor: C.border }]}>
                          <View style={[s.searchInDropdown, { borderColor: C.border, backgroundColor: C.bg }]}>
                            <Ionicons name="search" size={14} color={C.textLight} />
                            <TextInput style={[s.searchInput, { color: C.text }]} placeholder="Rechercher un modele..." placeholderTextColor={C.textLight} value={modelSearch} onChangeText={setModelSearch} autoFocus />
                          </View>
                          <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                            {filteredModels.map(m => (
                              <TouchableOpacity key={m} onPress={() => { setForm(p => ({ ...p, model: m })); setShowModels(false); setModelSearch(''); }} style={[s.dropdownItem, form.model === m && { backgroundColor: '#7C3AED10' }]} data-testid={`model-${m}`}>
                                <Text style={{ color: C.text, fontSize: 14, fontWeight: form.model === m ? '700' : '500' }}>{m}</Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                    </>
                  ) : (
                    <TextInput style={[s.dropdown, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]} value={form.model} onChangeText={v => setForm(p => ({ ...p, model: v }))} placeholder="Saisir le modele" placeholderTextColor={C.textLight} />
                  )}
                </View>
              )}

              {/* Year + Type Row */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.fieldLabel, { color: C.text }]}>Annee</Text>
                  <TouchableOpacity onPress={() => { setShowYears(!showYears); setShowBrands(false); setShowModels(false); setShowTypes(false); }} style={[s.dropdown, { borderColor: C.border, backgroundColor: C.bg }]} data-testid="year-dropdown">
                    <Text style={{ color: C.text, fontSize: 14, fontWeight: '600', flex: 1 }}>{form.year}</Text>
                    <Ionicons name="chevron-down" size={16} color={C.textLight} />
                  </TouchableOpacity>
                  {showYears && (
                    <View style={[s.dropdownList, { backgroundColor: C.card, borderColor: C.border }]}>
                      <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                        {YEARS.map(y => (
                          <TouchableOpacity key={y} onPress={() => { setForm(p => ({ ...p, year: y })); setShowYears(false); }} style={[s.dropdownItem, form.year === y && { backgroundColor: '#7C3AED10' }]}>
                            <Text style={{ color: C.text, fontSize: 14, fontWeight: form.year === y ? '700' : '500' }}>{y}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[s.fieldLabel, { color: C.text }]}>Type *</Text>
                  <TouchableOpacity onPress={() => { setShowTypes(!showTypes); setShowBrands(false); setShowModels(false); setShowYears(false); }} style={[s.dropdown, { borderColor: form.type ? '#7C3AED' : C.border, backgroundColor: C.bg }]} data-testid="type-dropdown">
                    <Text style={{ color: form.type ? C.text : C.textLight, fontSize: 14, fontWeight: '600', flex: 1 }}>{form.type || 'Choisir'}</Text>
                    <Ionicons name="chevron-down" size={16} color={C.textLight} />
                  </TouchableOpacity>
                  {showTypes && (
                    <View style={[s.dropdownList, { backgroundColor: C.card, borderColor: C.border, zIndex: 100 }]}>
                      <View style={[s.searchInDropdown, { borderColor: C.border, backgroundColor: C.bg }]}>
                        <Ionicons name="search" size={14} color={C.textLight} />
                        <TextInput style={[s.searchInput, { color: C.text }]} placeholder="Rechercher..." placeholderTextColor={C.textLight} value={typeSearch} onChangeText={setTypeSearch} autoFocus />
                      </View>
                      <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                        {filteredTypes.map(t => (
                          <TouchableOpacity key={t} onPress={() => { setForm(p => ({ ...p, type: t })); setShowTypes(false); setTypeSearch(''); }} style={[s.dropdownItem, form.type === t && { backgroundColor: '#7C3AED10' }]}>
                            <Text style={{ color: C.text, fontSize: 14, fontWeight: form.type === t ? '700' : '500' }}>{t}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              </View>

              {/* Section: Tarification */}
              <Text style={[s.section, { color: '#7C3AED' }]}>Tarification et caracteristiques</Text>

              {/* Price, Seats, Plate */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.fieldLabel, { color: C.text }]}>Prix/jour (CHF) *</Text>
                  <TextInput style={[s.dropdown, { color: C.text, borderColor: C.border, backgroundColor: C.bg, fontSize: 16, fontWeight: '700' }]} value={String(form.price_per_day || '')} onChangeText={v => setForm(p => ({ ...p, price_per_day: parseFloat(v) || 0 }))} keyboardType="numeric" placeholder="120" placeholderTextColor={C.textLight} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.fieldLabel, { color: C.text }]}>Places</Text>
                  <TextInput style={[s.dropdown, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]} value={String(form.seats)} onChangeText={v => setForm(p => ({ ...p, seats: parseInt(v) || 5 }))} keyboardType="numeric" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.fieldLabel, { color: C.text }]}>Plaque</Text>
                  <TextInput style={[s.dropdown, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]} value={form.plate_number} onChangeText={v => setForm(p => ({ ...p, plate_number: v }))} placeholder="GE 123456" placeholderTextColor={C.textLight} />
                </View>
              </View>

              {/* Transmission */}
              <View>
                <Text style={[s.fieldLabel, { color: C.text }]}>Transmission</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  {TRANSMISSIONS.map(t => (
                    <TouchableOpacity key={t.v} onPress={() => setForm(p => ({ ...p, transmission: t.v }))} style={[s.chip, { backgroundColor: form.transmission === t.v ? '#7C3AED' : C.bg, borderColor: form.transmission === t.v ? '#7C3AED' : C.border }]}>
                      <Ionicons name={t.v === 'automatic' ? 'swap-horizontal' : 'cog'} size={14} color={form.transmission === t.v ? '#fff' : C.textLight} />
                      <Text style={{ fontSize: 13, fontWeight: '600', color: form.transmission === t.v ? '#fff' : C.text }}>{t.l}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Fuel */}
              <View>
                <Text style={[s.fieldLabel, { color: C.text }]}>Carburant</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                  {FUELS.map(t => (
                    <TouchableOpacity key={t.v} onPress={() => setForm(p => ({ ...p, fuel_type: t.v }))} style={[s.chip, { backgroundColor: form.fuel_type === t.v ? '#7C3AED' : C.bg, borderColor: form.fuel_type === t.v ? '#7C3AED' : C.border }]}>
                      <Ionicons name={t.v === 'electric' ? 'flash' : t.v === 'hybrid' ? 'leaf' : 'flame'} size={14} color={form.fuel_type === t.v ? '#fff' : C.textLight} />
                      <Text style={{ fontSize: 13, fontWeight: '600', color: form.fuel_type === t.v ? '#fff' : C.text }}>{t.l}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Section: Localisation */}
              <Text style={[s.section, { color: '#7C3AED' }]}>Localisation</Text>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.fieldLabel, { color: C.text }]}>Couleur</Text>
                  <TextInput style={[s.dropdown, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]} value={form.color} onChangeText={v => setForm(p => ({ ...p, color: v }))} placeholder="Noir" placeholderTextColor={C.textLight} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.fieldLabel, { color: C.text }]}>Localisation</Text>
                  <TextInput style={[s.dropdown, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]} value={form.location} onChangeText={v => setForm(p => ({ ...p, location: v }))} placeholder="Geneve" placeholderTextColor={C.textLight} />
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={{ flexDirection: 'row', gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border }}>
            <TouchableOpacity onPress={handleClose} style={[s.actionBtn, { borderWidth: 1, borderColor: C.border }]}>
              <Text style={{ color: C.text, fontSize: 14, fontWeight: '600' }}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleCreate} disabled={loading} style={[s.actionBtn, { backgroundColor: '#7C3AED', opacity: loading ? 0.6 : 1 }]} data-testid="save-add-vehicle-btn">
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

const s = StyleSheet.create({
  section: { fontSize: 13, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginTop: 4, marginBottom: -4 },
  fieldLabel: { fontSize: 12, fontWeight: '700', marginBottom: 4, letterSpacing: 0.3 },
  dropdown: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, gap: 8 },
  dropdownList: { borderWidth: 1, borderRadius: 10, marginTop: 4, overflow: 'hidden' },
  searchInDropdown: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, borderBottomWidth: 1, margin: 6, marginBottom: 0, borderRadius: 8, paddingVertical: 6 },
  searchInput: { flex: 1, fontSize: 13, paddingVertical: 4 },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  brandBadge: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  brandBadgeText: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, flex: 1, justifyContent: 'center' },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 10 },
});
