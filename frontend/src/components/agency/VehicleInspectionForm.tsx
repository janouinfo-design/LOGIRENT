import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axios';

const C = { accent: '#7C3AED', bg: '#F9FAFB', card: '#FFF', text: '#111827', textLight: '#6B7280', border: '#E5E7EB', success: '#10B981', error: '#EF4444', warning: '#F59E0B', blue: '#2563EB' };

const FUEL_LEVELS = ['full', '3/4', '1/2', '1/4', 'empty'];
const FUEL_LABELS: Record<string, string> = { full: 'Plein', '3/4': '3/4', '1/2': '1/2', '1/4': '1/4', empty: 'Vide' };
const CONDITIONS: Record<string, { label: string; color: string }> = {
  ok: { label: 'OK', color: C.success },
  damaged: { label: 'Endommage', color: C.error },
  missing: { label: 'Manquant', color: C.warning },
};

interface InspectionItem { name: string; checked: boolean; condition: string; notes: string; }
interface Props { reservationId: string; vehicleId: string; type: 'checkout' | 'checkin'; onComplete?: () => void; }

export default function VehicleInspectionForm({ reservationId, vehicleId, type, onComplete }: Props) {
  const [items, setItems] = useState<InspectionItem[]>([]);
  const [kmReading, setKmReading] = useState('');
  const [fuelLevel, setFuelLevel] = useState('full');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState<any>(null);
  const [signatureData, setSignatureData] = useState('');
  const canvasRef = useRef<any>(null);

  useEffect(() => { loadData(); }, [reservationId]);

  const loadData = async () => {
    try {
      const { data: inspResp } = await api.get(`/api/inspections/reservation/${reservationId}`);
      const found = inspResp.inspections?.find((i: any) => i.type === type);
      if (found) {
        setExisting(found);
        setItems(found.items || []);
        setKmReading(String(found.km_reading || ''));
        setFuelLevel(found.fuel_level || 'full');
        setNotes(found.notes || '');
      } else {
        const { data: defaults } = await api.get('/api/inspections/defaults');
        setItems(defaults.items || []);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const toggleItem = (index: number) => {
    const updated = [...items];
    updated[index].checked = !updated[index].checked;
    setItems(updated);
  };

  const setCondition = (index: number, condition: string) => {
    const updated = [...items];
    updated[index].condition = condition;
    setItems(updated);
  };

  const setItemNotes = (index: number, text: string) => {
    const updated = [...items];
    updated[index].notes = text;
    setItems(updated);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      if (existing) {
        await api.put(`/api/inspections/${existing.id}`, {
          items, km_reading: parseInt(kmReading) || null, fuel_level: fuelLevel, notes, signature_data: signatureData || undefined,
        });
      } else {
        await api.post('/api/inspections', {
          reservation_id: reservationId, vehicle_id: vehicleId, type,
          items, km_reading: parseInt(kmReading) || null, fuel_level: fuelLevel, notes, signature_data: signatureData || undefined,
        });
      }
      onComplete?.();
    } catch (e: any) {
      console.error(e.response?.data || e.message);
    }
    setSaving(false);
  };

  const allChecked = items.every(i => i.checked);
  const typeLabel = type === 'checkout' ? 'Depart' : 'Retour';
  const isReadOnly = !!existing;

  if (loading) return <ActivityIndicator color={C.accent} style={{ marginVertical: 40 }} />;

  return (
    <ScrollView style={s.container} data-testid={`inspection-form-${type}`}>
      <View style={s.topBanner}>
        <Ionicons name={type === 'checkout' ? 'log-out-outline' : 'log-in-outline'} size={22} color={C.blue} />
        <Text style={s.topTitle}>Etat des lieux - {typeLabel}</Text>
        {existing && <View style={s.completedBadge}><Ionicons name="checkmark-circle" size={14} color={C.success} /><Text style={s.completedText}>Complete</Text></View>}
      </View>

      {/* KM + Fuel */}
      <View style={s.metricsRow}>
        <View style={s.metricCard}>
          <Text style={s.metricLabel}>Kilometrage</Text>
          <TextInput style={s.metricInput} value={kmReading} onChangeText={setKmReading} keyboardType="numeric" placeholder="Ex: 45200" placeholderTextColor={C.textLight} editable={!isReadOnly} data-testid="km-input" />
          <Text style={s.metricUnit}>km</Text>
        </View>
        <View style={s.metricCard}>
          <Text style={s.metricLabel}>Niveau carburant</Text>
          <View style={s.fuelRow}>
            {FUEL_LEVELS.map(level => (
              <TouchableOpacity key={level} style={[s.fuelBtn, fuelLevel === level && s.fuelBtnActive]} onPress={() => !isReadOnly && setFuelLevel(level)} data-testid={`fuel-${level}`}>
                <Text style={[s.fuelText, fuelLevel === level && s.fuelTextActive]}>{FUEL_LABELS[level]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Checklist */}
      <Text style={s.sectionTitle}>Checklist vehicule</Text>
      {items.map((item, i) => (
        <View key={i} style={[s.checkItem, item.condition === 'damaged' && s.checkItemDamaged]} data-testid={`check-item-${i}`}>
          <TouchableOpacity style={s.checkRow} onPress={() => !isReadOnly && toggleItem(i)}>
            <Ionicons name={item.checked ? 'checkbox' : 'square-outline'} size={22} color={item.checked ? C.success : C.textLight} />
            <Text style={[s.checkName, item.checked && s.checkNameDone]}>{item.name}</Text>
          </TouchableOpacity>
          <View style={s.conditionRow}>
            {Object.entries(CONDITIONS).map(([key, val]) => (
              <TouchableOpacity key={key} style={[s.condBtn, item.condition === key && { backgroundColor: val.color, borderColor: val.color }]} onPress={() => !isReadOnly && setCondition(i, key)}>
                <Text style={[s.condText, item.condition === key && { color: '#FFF' }]}>{val.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {(item.condition !== 'ok' || item.notes) && (
            <TextInput style={s.itemNotes} placeholder="Notes..." placeholderTextColor={C.textLight} value={item.notes} onChangeText={v => !isReadOnly && setItemNotes(i, v)} multiline data-testid={`item-notes-${i}`} />
          )}
        </View>
      ))}

      {/* General Notes */}
      <Text style={s.sectionTitle}>Remarques generales</Text>
      <TextInput style={s.generalNotes} placeholder="Notes supplementaires..." placeholderTextColor={C.textLight} value={notes} onChangeText={v => !isReadOnly && setNotes(v)} multiline numberOfLines={3} editable={!isReadOnly} data-testid="general-notes" />

      {/* Submit */}
      {!isReadOnly && (
        <TouchableOpacity style={[s.submitBtn, !allChecked && s.submitBtnDisabled]} onPress={handleSubmit} disabled={saving || !allChecked} data-testid="submit-inspection">
          {saving ? <ActivityIndicator size="small" color="#FFF" /> : (
            <>
              <Ionicons name="checkmark-done" size={18} color="#FFF" />
              <Text style={s.submitText}>Valider l'etat des lieux</Text>
            </>
          )}
        </TouchableOpacity>
      )}
      {!allChecked && !isReadOnly && (
        <Text style={s.hint}>Cochez tous les elements pour valider</Text>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  topBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderColor: C.border },
  topTitle: { fontSize: 18, fontWeight: '700', color: C.text, flex: 1 },
  completedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  completedText: { fontSize: 11, fontWeight: '600', color: C.success },
  metricsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  metricCard: { flex: 1, backgroundColor: C.card, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: C.border },
  metricLabel: { fontSize: 10, fontWeight: '600', color: C.textLight, textTransform: 'uppercase', marginBottom: 6 },
  metricInput: { fontSize: 20, fontWeight: '700', color: C.text, borderBottomWidth: 1, borderColor: C.border, paddingBottom: 4 },
  metricUnit: { fontSize: 10, color: C.textLight, marginTop: 2 },
  fuelRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  fuelBtn: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg },
  fuelBtnActive: { backgroundColor: C.blue, borderColor: C.blue },
  fuelText: { fontSize: 10, fontWeight: '600', color: C.textLight },
  fuelTextActive: { color: '#FFF' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 8, marginTop: 4 },
  checkItem: { backgroundColor: C.card, borderRadius: 8, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: C.border },
  checkItemDamaged: { borderColor: C.error, backgroundColor: '#FEF2F2' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkName: { fontSize: 13, color: C.text, flex: 1 },
  checkNameDone: { color: C.success },
  conditionRow: { flexDirection: 'row', gap: 4, marginTop: 6, marginLeft: 30 },
  condBtn: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, borderWidth: 1, borderColor: C.border },
  condText: { fontSize: 9, fontWeight: '600', color: C.textLight },
  itemNotes: { fontSize: 11, color: C.text, borderWidth: 1, borderColor: C.border, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, marginTop: 6, marginLeft: 30, backgroundColor: C.bg },
  generalNotes: { fontSize: 12, color: C.text, borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 10, backgroundColor: C.card, minHeight: 60, textAlignVertical: 'top' },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.success, paddingVertical: 14, borderRadius: 10, marginTop: 16 },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  hint: { fontSize: 11, color: C.textLight, textAlign: 'center', marginTop: 6 },
});
