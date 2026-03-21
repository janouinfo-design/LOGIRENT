import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axios';

const C = { accent: '#7C3AED', bg: '#F9FAFB', card: '#FFF', text: '#111827', textLight: '#6B7280', border: '#E5E7EB', success: '#10B981', error: '#EF4444', blue: '#2563EB' };

interface SeasonalPrice {
  id?: string;
  name: string;
  start_date: string;
  end_date: string;
  modifier_type: 'percentage' | 'fixed_price';
  modifier_value: number;
  active: boolean;
}

interface Props { vehicleId: string; }

export default function SeasonalPricingManager({ vehicleId }: Props) {
  const [items, setItems] = useState<SeasonalPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, [vehicleId]);

  const load = async () => {
    try {
      const { data } = await api.get(`/api/admin/vehicles/${vehicleId}/seasonal-pricing`);
      setItems(data.seasonal_pricing || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put(`/api/admin/vehicles/${vehicleId}/seasonal-pricing`, { seasonal_pricing: items });
      setItems(data.seasonal_pricing || []);
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const addItem = () => {
    setItems([...items, { name: '', start_date: '', end_date: '', modifier_type: 'percentage', modifier_value: 0, active: true }]);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    setItems(updated);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  if (loading) return <ActivityIndicator color={C.accent} style={{ marginVertical: 20 }} />;

  return (
    <View style={s.container} data-testid="seasonal-pricing-manager">
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Ionicons name="calendar-outline" size={18} color={C.blue} />
          <Text style={s.title}>Tarifs saisonniers</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={addItem} data-testid="add-seasonal-price">
          <Ionicons name="add" size={16} color="#FFF" />
          <Text style={s.addBtnText}>Ajouter</Text>
        </TouchableOpacity>
      </View>

      {items.length === 0 ? (
        <Text style={s.empty}>Aucun tarif saisonnier configure</Text>
      ) : (
        items.map((item, i) => (
          <View key={item.id || i} style={s.card} data-testid={`seasonal-item-${i}`}>
            <View style={s.cardHeader}>
              <TextInput
                style={s.nameInput}
                placeholder="Nom (ex: Ete 2026)"
                placeholderTextColor={C.textLight}
                value={item.name}
                onChangeText={v => updateItem(i, 'name', v)}
              />
              <TouchableOpacity onPress={() => updateItem(i, 'active', !item.active)} data-testid={`toggle-seasonal-${i}`}>
                <Ionicons name={item.active ? 'toggle' : 'toggle-outline'} size={28} color={item.active ? C.success : C.textLight} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removeItem(i)} data-testid={`remove-seasonal-${i}`}>
                <Ionicons name="trash-outline" size={18} color={C.error} />
              </TouchableOpacity>
            </View>

            <View style={s.row}>
              <View style={s.dateField}>
                <Text style={s.label}>Debut</Text>
                <TextInput
                  style={s.input}
                  placeholder="AAAA-MM-JJ"
                  placeholderTextColor={C.textLight}
                  value={item.start_date}
                  onChangeText={v => updateItem(i, 'start_date', v)}
                />
              </View>
              <View style={s.dateField}>
                <Text style={s.label}>Fin</Text>
                <TextInput
                  style={s.input}
                  placeholder="AAAA-MM-JJ"
                  placeholderTextColor={C.textLight}
                  value={item.end_date}
                  onChangeText={v => updateItem(i, 'end_date', v)}
                />
              </View>
            </View>

            <View style={s.row}>
              <View style={s.typeField}>
                <Text style={s.label}>Type</Text>
                <View style={s.typeRow}>
                  <TouchableOpacity
                    style={[s.typeBtn, item.modifier_type === 'percentage' && s.typeBtnActive]}
                    onPress={() => updateItem(i, 'modifier_type', 'percentage')}
                  >
                    <Text style={[s.typeBtnText, item.modifier_type === 'percentage' && s.typeBtnTextActive]}>% Reduction</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.typeBtn, item.modifier_type === 'fixed_price' && s.typeBtnActive]}
                    onPress={() => updateItem(i, 'modifier_type', 'fixed_price')}
                  >
                    <Text style={[s.typeBtnText, item.modifier_type === 'fixed_price' && s.typeBtnTextActive]}>Prix fixe</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={s.valueField}>
                <Text style={s.label}>{item.modifier_type === 'percentage' ? 'Reduction (%)' : 'CHF / jour'}</Text>
                <TextInput
                  style={s.input}
                  placeholder={item.modifier_type === 'percentage' ? '-15' : '150'}
                  placeholderTextColor={C.textLight}
                  value={String(item.modifier_value || '')}
                  onChangeText={v => updateItem(i, 'modifier_value', parseFloat(v) || 0)}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>
        ))
      )}

      {items.length > 0 && (
        <TouchableOpacity style={s.saveBtn} onPress={save} disabled={saving} data-testid="save-seasonal-pricing">
          {saving ? <ActivityIndicator size="small" color="#FFF" /> : (
            <>
              <Ionicons name="checkmark" size={16} color="#FFF" />
              <Text style={s.saveBtnText}>Sauvegarder</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { marginTop: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 14, fontWeight: '700', color: C.text },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.blue, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  addBtnText: { fontSize: 11, fontWeight: '600', color: '#FFF' },
  empty: { fontSize: 12, color: C.textLight, textAlign: 'center', paddingVertical: 16 },
  card: { backgroundColor: C.bg, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  nameInput: { flex: 1, fontSize: 13, fontWeight: '600', color: C.text, borderBottomWidth: 1, borderColor: C.border, paddingBottom: 4 },
  row: { flexDirection: 'row', gap: 10, marginTop: 6 },
  dateField: { flex: 1 },
  typeField: { flex: 1.2 },
  valueField: { flex: 0.8 },
  label: { fontSize: 10, fontWeight: '600', color: C.textLight, marginBottom: 3, textTransform: 'uppercase' },
  input: { fontSize: 12, color: C.text, borderWidth: 1, borderColor: C.border, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: '#FFF' },
  typeRow: { flexDirection: 'row', gap: 4 },
  typeBtn: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: C.border, backgroundColor: '#FFF' },
  typeBtnActive: { backgroundColor: C.blue, borderColor: C.blue },
  typeBtnText: { fontSize: 10, fontWeight: '600', color: C.textLight },
  typeBtnTextActive: { color: '#FFF' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.blue, paddingVertical: 10, borderRadius: 8, marginTop: 6 },
  saveBtnText: { fontSize: 13, fontWeight: '600', color: '#FFF' },
});
