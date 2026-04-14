import React, { useState, useMemo } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axios';

const FUEL_LEVELS = [
  { value: 'full', label: 'Plein', icon: 'battery-full', pct: 100 },
  { value: '3/4', label: '3/4', icon: 'battery-half', pct: 75 },
  { value: '1/2', label: '1/2', icon: 'battery-half', pct: 50 },
  { value: '1/4', label: '1/4', icon: 'battery-dead', pct: 25 },
  { value: 'empty', label: 'Vide', icon: 'battery-dead', pct: 0 },
];

interface Props {
  visible: boolean;
  reservation: any;
  vehicle: any;
  onClose: () => void;
  onSuccess: () => void;
  colors: any;
}

export default function ReturnVehicleModal({ visible, reservation, vehicle, onClose, onSuccess, colors: C }: Props) {
  const [kmDep, setKmDep] = useState('');
  const [kmRet, setKmRet] = useState('');
  const [fuelDep, setFuelDep] = useState('full');
  const [fuelRet, setFuelRet] = useState('full');
  const [notes, setNotes] = useState('');
  const [kmLimit, setKmLimit] = useState('200');
  const [pricePerKm, setPricePerKm] = useState('0.50');
  const [fuelPenalty, setFuelPenalty] = useState('50');
  const [latePenalty, setLatePenalty] = useState('30');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Calculate late hours
  const lateHours = useMemo(() => {
    if (!reservation?.end_date) return 0;
    const endDate = new Date(reservation.end_date);
    const now = new Date();
    if (now <= endDate) return 0;
    const diffMs = now.getTime() - endDate.getTime();
    return Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
  }, [reservation]);

  // Live surcharge preview
  const preview = useMemo(() => {
    const kmD = parseInt(kmDep) || 0;
    const kmR = parseInt(kmRet) || 0;
    const kmDriven = Math.max(0, kmR - kmD);
    const totalDays = reservation?.total_days || 1;
    const kmAllowed = (parseInt(kmLimit) || 200) * totalDays;
    const kmExcess = Math.max(0, kmDriven - kmAllowed);
    const kmCost = kmExcess * (parseFloat(pricePerKm) || 0.5);

    const fuelLevels: Record<string, number> = { full: 1, '3/4': 0.75, '1/2': 0.5, '1/4': 0.25, empty: 0 };
    const fuelDiff = Math.max(0, (fuelLevels[fuelDep] || 1) - (fuelLevels[fuelRet] || 1));
    const fuelCost = fuelDiff * (parseFloat(fuelPenalty) || 50);

    const lateCost = lateHours * (parseFloat(latePenalty) || 30);

    return { kmDriven, kmAllowed, kmExcess, kmCost, fuelDiff, fuelCost, lateHours, lateCost, total: kmCost + fuelCost + lateCost };
  }, [kmDep, kmRet, fuelDep, fuelRet, kmLimit, pricePerKm, fuelPenalty, latePenalty, lateHours, reservation]);

  const handleSubmit = async () => {
    if (!kmDep || !kmRet) {
      if (Platform.OS === 'web') { window.alert('Veuillez saisir les kilometres depart et retour'); }
      else { Alert.alert('Erreur', 'Veuillez saisir les kilometres depart et retour'); }
      return;
    }
    if (parseInt(kmRet) < parseInt(kmDep)) {
      if (Platform.OS === 'web') { window.alert('Le km retour doit etre superieur au km depart'); }
      else { Alert.alert('Erreur', 'Le km retour doit etre superieur au km depart'); }
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post(`/api/admin/reservations/${reservation.id}/return`, {
        km_departure: parseInt(kmDep),
        km_return: parseInt(kmRet),
        fuel_level_departure: fuelDep,
        fuel_level_return: fuelRet,
        late_hours: lateHours,
        notes,
        km_limit_per_day: parseInt(kmLimit) || 200,
        price_per_extra_km: parseFloat(pricePerKm) || 0.5,
        fuel_penalty: parseFloat(fuelPenalty) || 50,
        late_penalty_per_hour: parseFloat(latePenalty) || 30,
      });
      setResult(res.data);
    } catch (e: any) {
      const msg = e?.response?.data?.detail || 'Erreur lors du retour';
      if (Platform.OS === 'web') { window.alert(msg); }
      else { Alert.alert('Erreur', msg); }
    } finally { setSubmitting(false); }
  };

  const vname = vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Vehicule';
  const totalDays = reservation?.total_days || 1;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 12 }}>
        <View style={{ width: '100%', maxWidth: 560, borderRadius: 20, backgroundColor: C.card, maxHeight: '95%', overflow: 'hidden' }} data-testid="return-vehicle-modal">
          {/* Header */}
          <View style={{ backgroundColor: '#1E3A5F', padding: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>Retour Vehicule</Text>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 }}>{vname}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' }} data-testid="close-return-modal">
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            {lateHours > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: '#EF444420', padding: 8, borderRadius: 8 }}>
                <Ionicons name="warning" size={16} color="#EF4444" />
                <Text style={{ color: '#FCA5A5', fontSize: 12, fontWeight: '700' }}>Retard: {lateHours}h apres la date de fin</Text>
              </View>
            )}
          </View>

          <ScrollView style={{ padding: 16 }} contentContainerStyle={{ paddingBottom: 24 }}>
            {!result ? (
              <>
                {/* Kilometrage */}
                <View style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <Ionicons name="speedometer" size={18} color="#3B82F6" />
                    <Text style={{ color: C.text, fontSize: 15, fontWeight: '800' }}>Kilometrage</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: C.textLight, fontSize: 11, marginBottom: 4, fontWeight: '600' }}>KM Depart</Text>
                      <TextInput
                        value={kmDep} onChangeText={setKmDep}
                        placeholder="Ex: 45000" placeholderTextColor="#94A3B8"
                        keyboardType="numeric"
                        style={{ borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, fontSize: 15, fontWeight: '700', color: C.text, backgroundColor: C.bg }}
                        data-testid="km-departure-input"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: C.textLight, fontSize: 11, marginBottom: 4, fontWeight: '600' }}>KM Retour</Text>
                      <TextInput
                        value={kmRet} onChangeText={setKmRet}
                        placeholder="Ex: 45350" placeholderTextColor="#94A3B8"
                        keyboardType="numeric"
                        style={{ borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, fontSize: 15, fontWeight: '700', color: C.text, backgroundColor: C.bg }}
                        data-testid="km-return-input"
                      />
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: C.textLight, fontSize: 10, marginBottom: 3 }}>Limite km/jour</Text>
                      <TextInput value={kmLimit} onChangeText={setKmLimit} keyboardType="numeric" style={{ borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 8, fontSize: 13, color: C.text, backgroundColor: C.bg }} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: C.textLight, fontSize: 10, marginBottom: 3 }}>CHF/km excedent</Text>
                      <TextInput value={pricePerKm} onChangeText={setPricePerKm} keyboardType="decimal-pad" style={{ borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 8, fontSize: 13, color: C.text, backgroundColor: C.bg }} />
                    </View>
                  </View>
                  {preview.kmDriven > 0 && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, padding: 8, backgroundColor: preview.kmExcess > 0 ? '#FEF2F2' : '#F0FDF4', borderRadius: 8 }}>
                      <Text style={{ fontSize: 11, color: preview.kmExcess > 0 ? '#DC2626' : '#059669', fontWeight: '600' }}>{preview.kmDriven} km parcourus / {preview.kmAllowed} km autorises</Text>
                      {preview.kmExcess > 0 && <Text style={{ fontSize: 11, color: '#DC2626', fontWeight: '800' }}>+CHF {preview.kmCost.toFixed(2)}</Text>}
                    </View>
                  )}
                </View>

                {/* Carburant */}
                <View style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <Ionicons name="water" size={18} color="#F59E0B" />
                    <Text style={{ color: C.text, fontSize: 15, fontWeight: '800' }}>Carburant</Text>
                  </View>
                  <Text style={{ color: C.textLight, fontSize: 11, marginBottom: 6, fontWeight: '600' }}>Niveau au depart</Text>
                  <View style={{ flexDirection: 'row', gap: 4, marginBottom: 10 }}>
                    {FUEL_LEVELS.map(f => (
                      <TouchableOpacity key={f.value} onPress={() => setFuelDep(f.value)} style={{ flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 2, borderColor: fuelDep === f.value ? '#F59E0B' : C.border, backgroundColor: fuelDep === f.value ? '#FEF3C7' : C.bg, alignItems: 'center' }} data-testid={`fuel-dep-${f.value}`}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: fuelDep === f.value ? '#92400E' : C.textLight }}>{f.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={{ color: C.textLight, fontSize: 11, marginBottom: 6, fontWeight: '600' }}>Niveau au retour</Text>
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    {FUEL_LEVELS.map(f => (
                      <TouchableOpacity key={f.value} onPress={() => setFuelRet(f.value)} style={{ flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 2, borderColor: fuelRet === f.value ? '#F59E0B' : C.border, backgroundColor: fuelRet === f.value ? '#FEF3C7' : C.bg, alignItems: 'center' }} data-testid={`fuel-ret-${f.value}`}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: fuelRet === f.value ? '#92400E' : C.textLight }}>{f.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: C.textLight, fontSize: 10, marginBottom: 3 }}>Penalite carburant (CHF)</Text>
                      <TextInput value={fuelPenalty} onChangeText={setFuelPenalty} keyboardType="decimal-pad" style={{ borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 8, fontSize: 13, color: C.text, backgroundColor: C.bg }} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: C.textLight, fontSize: 10, marginBottom: 3 }}>Penalite retard CHF/h</Text>
                      <TextInput value={latePenalty} onChangeText={setLatePenalty} keyboardType="decimal-pad" style={{ borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 8, fontSize: 13, color: C.text, backgroundColor: C.bg }} />
                    </View>
                  </View>
                  {preview.fuelDiff > 0 && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, padding: 8, backgroundColor: '#FEF2F2', borderRadius: 8 }}>
                      <Text style={{ fontSize: 11, color: '#DC2626', fontWeight: '600' }}>Carburant: {fuelDep} -> {fuelRet}</Text>
                      <Text style={{ fontSize: 11, color: '#DC2626', fontWeight: '800' }}>+CHF {preview.fuelCost.toFixed(2)}</Text>
                    </View>
                  )}
                </View>

                {/* Notes */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ color: C.textLight, fontSize: 11, marginBottom: 4, fontWeight: '600' }}>Notes (optionnel)</Text>
                  <TextInput value={notes} onChangeText={setNotes} multiline numberOfLines={3} placeholder="Remarques sur le vehicule..." placeholderTextColor="#94A3B8" style={{ borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, fontSize: 13, color: C.text, backgroundColor: C.bg, minHeight: 60, textAlignVertical: 'top' }} data-testid="return-notes" />
                </View>

                {/* Recap */}
                <View style={{ padding: 14, borderRadius: 12, backgroundColor: preview.total > 0 ? '#FEF2F2' : '#F0FDF4', borderWidth: 1, borderColor: preview.total > 0 ? '#FECACA' : '#A7F3D0', marginBottom: 16 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: C.text, marginBottom: 8 }}>Recapitulatif</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 12, color: C.textLight }}>Prix location ({totalDays}j)</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: C.text }}>CHF {(reservation?.total_price || 0).toFixed(2)}</Text>
                  </View>
                  {preview.kmCost > 0 && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 12, color: '#DC2626' }}>+ Km excedentaires ({preview.kmExcess} km)</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#DC2626' }}>CHF {preview.kmCost.toFixed(2)}</Text>
                    </View>
                  )}
                  {preview.fuelCost > 0 && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 12, color: '#DC2626' }}>+ Carburant manquant</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#DC2626' }}>CHF {preview.fuelCost.toFixed(2)}</Text>
                    </View>
                  )}
                  {preview.lateCost > 0 && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 12, color: '#DC2626' }}>+ Retard ({preview.lateHours}h)</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#DC2626' }}>CHF {preview.lateCost.toFixed(2)}</Text>
                    </View>
                  )}
                  <View style={{ borderTopWidth: 1, borderTopColor: C.border, paddingTop: 8, marginTop: 4, flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 14, fontWeight: '900', color: C.text }}>TOTAL</Text>
                    <Text style={{ fontSize: 14, fontWeight: '900', color: preview.total > 0 ? '#DC2626' : '#059669' }}>CHF {((reservation?.total_price || 0) + preview.total).toFixed(2)}</Text>
                  </View>
                </View>

                <TouchableOpacity onPress={handleSubmit} disabled={submitting} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#1E3A5F', paddingVertical: 14, borderRadius: 12 }} data-testid="confirm-return-btn">
                  {submitting ? <ActivityIndicator color="#fff" /> : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#fff" />
                      <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>Confirmer le retour</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              /* Success result */
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <Ionicons name="checkmark-circle" size={64} color="#10B981" />
                <Text style={{ color: C.text, fontSize: 18, fontWeight: '900', marginTop: 12 }}>Retour enregistre !</Text>
                <Text style={{ color: C.textLight, fontSize: 13, marginTop: 4, textAlign: 'center' }}>
                  {result.km_driven} km parcourus
                  {result.km_excess > 0 ? ` (${result.km_excess} km en excedent)` : ''}
                </Text>
                {result.surcharges?.length > 0 && (
                  <View style={{ width: '100%', marginTop: 16, padding: 12, backgroundColor: '#FEF2F2', borderRadius: 10 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#991B1B', marginBottom: 6 }}>Supplements appliques</Text>
                    {result.surcharges.map((s: any, i: number) => (
                      <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                        <Text style={{ fontSize: 12, color: '#DC2626' }}>{s.label}</Text>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#DC2626' }}>CHF {s.amount.toFixed(2)}</Text>
                      </View>
                    ))}
                    <View style={{ borderTopWidth: 1, borderTopColor: '#FECACA', paddingTop: 6, marginTop: 6, flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 14, fontWeight: '900', color: '#991B1B' }}>Total supplements</Text>
                      <Text style={{ fontSize: 14, fontWeight: '900', color: '#DC2626' }}>CHF {result.total_surcharge.toFixed(2)}</Text>
                    </View>
                  </View>
                )}
                {result.surcharges?.length === 0 && (
                  <View style={{ width: '100%', marginTop: 16, padding: 12, backgroundColor: '#F0FDF4', borderRadius: 10 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#059669', textAlign: 'center' }}>Aucun supplement. Retour conforme !</Text>
                  </View>
                )}
                <View style={{ width: '100%', marginTop: 16, padding: 12, backgroundColor: '#F8FAFC', borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: C.text }}>Nouveau total</Text>
                  <Text style={{ fontSize: 14, fontWeight: '900', color: '#1E3A5F' }}>CHF {result.new_total?.toFixed(2)}</Text>
                </View>
                <TouchableOpacity onPress={() => { setResult(null); onSuccess(); onClose(); }} style={{ marginTop: 20, backgroundColor: '#10B981', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 10 }} data-testid="close-return-success">
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>Fermer</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
