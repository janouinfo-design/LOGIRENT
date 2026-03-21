import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axios';

interface PricingTier {
  id: string;
  name: string;
  kilometers: number | null;
  price: number;
  period: string;
  order: number;
  active: boolean;
}

interface Props {
  vehicleId: string;
  C: any;
}

export const VehiclePricingManager = ({ vehicleId, C }: Props) => {
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => { fetchPricing(); }, [vehicleId]);

  const fetchPricing = async () => {
    setLoading(true);
    try {
      const resp = await api.get(`/api/admin/vehicles/${vehicleId}/pricing`);
      setTiers(resp.data.pricing_tiers || []);
    } catch { } finally { setLoading(false); }
  };

  const addTier = () => {
    setTiers([...tiers, {
      id: `new_${Date.now()}`,
      name: '',
      kilometers: null,
      price: 0,
      period: 'jour',
      order: tiers.length,
      active: true,
    }]);
    setEditMode(true);
  };

  const updateTier = (index: number, field: string, value: any) => {
    const updated = [...tiers];
    (updated[index] as any)[field] = value;
    setTiers(updated);
  };

  const removeTier = (index: number) => {
    setTiers(tiers.filter((_, i) => i !== index));
  };

  const moveTier = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === tiers.length - 1)) return;
    const updated = [...tiers];
    const swap = direction === 'up' ? index - 1 : index + 1;
    [updated[index], updated[swap]] = [updated[swap], updated[index]];
    updated.forEach((t, i) => t.order = i);
    setTiers(updated);
  };

  const savePricing = async () => {
    setSaving(true);
    try {
      const resp = await api.put(`/api/admin/vehicles/${vehicleId}/pricing`, {
        pricing_tiers: tiers.map((t, i) => ({ ...t, order: i })),
      });
      setTiers(resp.data.pricing_tiers);
      setEditMode(false);
      Platform.OS === 'web' ? window.alert('Tarifs sauvegardes !') : Alert.alert('Succes', 'Tarifs sauvegardes !');
    } catch (err: any) {
      Platform.OS === 'web' ? window.alert(err.response?.data?.detail || 'Erreur') : Alert.alert('Erreur');
    } finally { setSaving(false); }
  };

  if (loading) return <ActivityIndicator size="small" color={C.accent} style={{ marginVertical: 20 }} />;

  return (
    <View style={[st.container, { backgroundColor: C.card, borderColor: C.border }]} data-testid="pricing-manager">
      <View style={st.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="pricetags" size={18} color={C.accent} />
          <Text style={[st.title, { color: C.text }]}>Tarifs / Forfaits</Text>
          <View style={{ backgroundColor: C.accent + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
            <Text style={{ color: C.accent, fontSize: 11, fontWeight: '700' }}>{tiers.length}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {editMode && (
            <TouchableOpacity style={[st.saveBtn, { backgroundColor: '#10B981' }]} onPress={savePricing} disabled={saving} data-testid="save-pricing-btn">
              <Ionicons name="checkmark" size={16} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{saving ? 'Sauvegarde...' : 'Sauvegarder'}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[st.addBtn, { backgroundColor: C.accent + '15' }]} onPress={addTier} data-testid="add-tier-btn">
            <Ionicons name="add" size={16} color={C.accent} />
            <Text style={{ color: C.accent, fontSize: 12, fontWeight: '700' }}>Ajouter</Text>
          </TouchableOpacity>
        </View>
      </View>

      {tiers.length === 0 ? (
        <View style={{ alignItems: 'center', padding: 20 }}>
          <Ionicons name="pricetags-outline" size={28} color={C.textLight} />
          <Text style={{ color: C.textLight, fontSize: 13, marginTop: 8 }}>Aucun tarif configure</Text>
        </View>
      ) : (
        <View style={{ gap: 6 }}>
          {/* Table header */}
          <View style={[st.row, { backgroundColor: C.bg, borderColor: C.border }]}>
            <Text style={[st.colHeader, { color: C.textLight, flex: 2.5 }]}>Forfait</Text>
            <Text style={[st.colHeader, { color: C.textLight, flex: 1 }]}>Km</Text>
            <Text style={[st.colHeader, { color: C.textLight, flex: 1 }]}>Prix CHF</Text>
            <Text style={[st.colHeader, { color: C.textLight, flex: 1.2 }]}>Periode</Text>
            <Text style={[st.colHeader, { color: C.textLight, flex: 0.8, textAlign: 'center' }]}>Actif</Text>
            <Text style={[st.colHeader, { color: C.textLight, flex: 0.8, textAlign: 'center' }]}>Actions</Text>
          </View>

          {tiers.map((tier, i) => (
            <View key={tier.id} style={[st.row, { backgroundColor: tier.active ? C.card : C.bg, borderColor: C.border, opacity: tier.active ? 1 : 0.5 }]} data-testid={`tier-row-${i}`}>
              <TextInput
                style={[st.input, { color: C.text, borderColor: C.border, flex: 2.5 }]}
                value={tier.name}
                onChangeText={(v) => { updateTier(i, 'name', v); setEditMode(true); }}
                placeholder="Ex: 100 km / jour"
                placeholderTextColor={C.textLight}
              />
              <TextInput
                style={[st.input, { color: C.text, borderColor: C.border, flex: 1 }]}
                value={tier.kilometers?.toString() || ''}
                onChangeText={(v) => { updateTier(i, 'kilometers', v ? parseInt(v) || null : null); setEditMode(true); }}
                placeholder="km"
                placeholderTextColor={C.textLight}
                keyboardType="numeric"
              />
              <TextInput
                style={[st.input, { color: C.accent, borderColor: C.border, flex: 1, fontWeight: '700' }]}
                value={tier.price?.toString() || ''}
                onChangeText={(v) => { updateTier(i, 'price', parseFloat(v) || 0); setEditMode(true); }}
                placeholder="CHF"
                placeholderTextColor={C.textLight}
                keyboardType="numeric"
              />
              <View style={{ flex: 1.2 }}>
                <TouchableOpacity
                  style={[st.periodPicker, { borderColor: C.border }]}
                  onPress={() => {
                    const periods = ['jour', 'weekend', 'semaine', 'mois', 'custom'];
                    const idx = periods.indexOf(tier.period);
                    updateTier(i, 'period', periods[(idx + 1) % periods.length]);
                    setEditMode(true);
                  }}
                >
                  <Text style={{ color: C.text, fontSize: 12 }}>{tier.period}</Text>
                  <Ionicons name="chevron-down" size={12} color={C.textLight} />
                </TouchableOpacity>
              </View>
              <View style={{ flex: 0.8, alignItems: 'center' }}>
                <TouchableOpacity onPress={() => { updateTier(i, 'active', !tier.active); setEditMode(true); }}>
                  <Ionicons name={tier.active ? 'checkmark-circle' : 'close-circle'} size={20} color={tier.active ? '#10B981' : '#EF4444'} />
                </TouchableOpacity>
              </View>
              <View style={{ flex: 0.8, flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
                <TouchableOpacity onPress={() => moveTier(i, 'up')}>
                  <Ionicons name="chevron-up" size={16} color={C.textLight} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => moveTier(i, 'down')}>
                  <Ionicons name="chevron-down" size={16} color={C.textLight} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { removeTier(i); setEditMode(true); }}>
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const st = StyleSheet.create({
  container: { borderRadius: 12, padding: 14, borderWidth: 1, marginTop: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 15, fontWeight: '800' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 4, borderRadius: 6, borderWidth: 1 },
  colHeader: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  input: { fontSize: 13, paddingHorizontal: 6, paddingVertical: 4, borderWidth: 1, borderRadius: 6 },
  periodPicker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6, paddingVertical: 5, borderWidth: 1, borderRadius: 6 },
});
