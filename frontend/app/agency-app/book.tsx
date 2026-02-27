import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api/axios';
import { format } from 'date-fns';
import { useThemeStore } from '../../src/store/themeStore';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Client { id: string; name: string; email: string; phone?: string; }
interface Vehicle { id: string; brand: string; model: string; year: number; price_per_day: number; type: string; seats: number; transmission: string; fuel_type: string; options?: any[]; photos?: string[]; }

type Step = 'client' | 'vehicle' | 'dates' | 'confirm';

export default function BookingFlow() {
  const [step, setStep] = useState<Step>('client');

  // Client
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Client[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showNewClient, setShowNewClient] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [creatingClient, setCreatingClient] = useState(false);

  // Vehicle
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Dates
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'send_link'>('cash');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [createdReservation, setCreatedReservation] = useState<any>(null);

  // Search clients
  const searchClients = useCallback(async (q: string) => {
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await api.get(`/api/admin/search-clients?q=${encodeURIComponent(q)}`);
      setSearchResults(res.data.clients || []);
    } catch (e) { console.error(e); }
    finally { setSearching(false); }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchClients(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Create client
  const createClient = async () => {
    if (!newName) { showAlert('Erreur', 'Le nom est obligatoire'); return; }
    setCreatingClient(true);
    try {
      const res = await api.post('/api/admin/quick-client', { name: newName, phone: newPhone || null, email: newEmail || null });
      setSelectedClient(res.data.client);
      setShowNewClient(false);
      setStep('vehicle');
    } catch (e: any) { showAlert('Erreur', e.response?.data?.detail || 'Erreur'); }
    finally { setCreatingClient(false); }
  };

  // Fetch available vehicles
  const fetchVehicles = async () => {
    if (!startDate || !endDate) return;
    setLoadingVehicles(true);
    try {
      const res = await api.get(`/api/admin/available-vehicles?start_date=${startDate}T08:00:00&end_date=${endDate}T18:00:00`);
      setVehicles(res.data.vehicles || []);
    } catch (e) { console.error(e); }
    finally { setLoadingVehicles(false); }
  };

  // Submit reservation
  const submitReservation = async () => {
    if (!selectedClient || !selectedVehicle || !startDate || !endDate) return;
    setSubmitting(true);
    try {
      const res = await api.post('/api/admin/create-reservation-for-client', {
        client_id: selectedClient.id,
        vehicle_id: selectedVehicle.id,
        start_date: `${startDate}T08:00:00`,
        end_date: `${endDate}T18:00:00`,
        options: selectedOptions,
        payment_method: paymentMethod,
      });
      setCreatedReservation(res.data.reservation);

      if (paymentMethod === 'send_link') {
        try {
          await api.post(`/api/admin/reservations/${res.data.reservation.id}/send-payment-link`, {
            origin_url: API_URL,
          });
        } catch (e) { console.error('Payment link send failed:', e); }
      }
      setSuccess(true);
    } catch (e: any) { showAlert('Erreur', e.response?.data?.detail || 'Erreur lors de la création'); }
    finally { setSubmitting(false); }
  };

  const showAlert = (title: string, msg: string) => {
    if (Platform.OS === 'web') window.alert(msg);
    else Alert.alert(title, msg);
  };

  const totalDays = startDate && endDate ? Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000)) : 0;
  const basePrice = selectedVehicle ? selectedVehicle.price_per_day * totalDays : 0;
  const optionsPrice = selectedVehicle?.options?.filter(o => selectedOptions.includes(o.name)).reduce((sum, o) => sum + o.price_per_day * totalDays, 0) || 0;
  const totalPrice = basePrice + optionsPrice;

  // Reset
  const resetFlow = () => {
    setStep('client'); setSelectedClient(null); setSelectedVehicle(null);
    setStartDate(''); setEndDate(''); setSelectedOptions([]);
    setPaymentMethod('cash'); setSuccess(false); setCreatedReservation(null);
    setSearchQuery(''); setSearchResults([]); setShowNewClient(false);
    setNewName(''); setNewPhone(''); setNewEmail('');
  };

  // Success screen
  if (success) {
    return (
      <ScrollView style={s.container} contentContainerStyle={[s.content, { alignItems: 'center', justifyContent: 'center', paddingTop: 60 }]}>
        <View style={s.successIcon}><Ionicons name="checkmark-circle" size={64} color={C.success} /></View>
        <Text style={s.successTitle}>Réservation créée</Text>
        <Text style={s.successSub}>
          {selectedVehicle?.brand} {selectedVehicle?.model} pour {selectedClient?.name}
        </Text>
        <Text style={s.successPrice}>CHF {totalPrice.toFixed(2)}</Text>
        <Text style={s.successMethod}>
          {paymentMethod === 'cash' ? 'Paiement en espèces au retrait' : 'Lien de paiement envoyé par email'}
        </Text>
        <TouchableOpacity style={s.newBookBtn} onPress={resetFlow} data-testid="new-booking-btn">
          <Text style={s.newBookBtnText}>Nouvelle réservation</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      {/* Steps indicator */}
      <View style={s.steps}>
        {(['client', 'vehicle', 'dates', 'confirm'] as Step[]).map((st, i) => {
          const labels = ['Client', 'Véhicule', 'Dates', 'Confirmer'];
          const icons: any[] = ['person', 'car', 'calendar', 'checkmark'];
          const isActive = step === st;
          const isPast = ['client', 'vehicle', 'dates', 'confirm'].indexOf(step) > i;
          return (
            <TouchableOpacity key={st} style={[s.stepItem, isActive && s.stepActive]} onPress={() => isPast && setStep(st)}>
              <View style={[s.stepDot, (isActive || isPast) && s.stepDotActive]}>
                <Ionicons name={icons[i]} size={14} color={(isActive || isPast) ? '#fff' : C.textLight} />
              </View>
              <Text style={[s.stepLabel, (isActive || isPast) && s.stepLabelActive]}>{labels[i]}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* STEP: Client */}
      {step === 'client' && (
        <View>
          <Text style={s.title}>Sélectionner un client</Text>

          {selectedClient ? (
            <View style={s.selectedCard}>
              <View style={{ flex: 1 }}>
                <Text style={s.selectedName}>{selectedClient.name}</Text>
                <Text style={s.selectedSub}>{selectedClient.email}{selectedClient.phone ? ` | ${selectedClient.phone}` : ''}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedClient(null)}><Ionicons name="close-circle" size={24} color={C.error} /></TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={s.searchBox}>
                <Ionicons name="search" size={18} color={C.textLight} />
                <TextInput
                  style={s.searchInput}
                  placeholder="Rechercher par nom, email, téléphone..."
                  placeholderTextColor={C.textLight}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  data-testid="client-search-input"
                />
                {searching && <ActivityIndicator size="small" color={C.accent} />}
              </View>

              {searchResults.map((c) => (
                <TouchableOpacity key={c.id} style={s.resultCard} onPress={() => { setSelectedClient(c); setStep('vehicle'); }} data-testid={`client-${c.id}`}>
                  <Ionicons name="person-circle" size={32} color={C.accent} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.resultName}>{c.name}</Text>
                    <Text style={s.resultSub}>{c.email}{c.phone ? ` | ${c.phone}` : ''}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={C.textLight} />
                </TouchableOpacity>
              ))}

              <TouchableOpacity style={s.newClientBtn} onPress={() => setShowNewClient(!showNewClient)} data-testid="new-client-toggle">
                <Ionicons name={showNewClient ? 'chevron-up' : 'person-add'} size={18} color={C.accent} />
                <Text style={s.newClientBtnText}>{showNewClient ? 'Masquer' : 'Créer un nouveau client'}</Text>
              </TouchableOpacity>

              {showNewClient && (
                <View style={s.newClientForm}>
                  <TextInput style={s.input} placeholder="Nom *" placeholderTextColor={C.textLight} value={newName} onChangeText={setNewName} data-testid="new-client-name" />
                  <TextInput style={s.input} placeholder="Téléphone" placeholderTextColor={C.textLight} value={newPhone} onChangeText={setNewPhone} keyboardType="phone-pad" data-testid="new-client-phone" />
                  <TextInput style={s.input} placeholder="Email" placeholderTextColor={C.textLight} value={newEmail} onChangeText={setNewEmail} keyboardType="email-address" autoCapitalize="none" data-testid="new-client-email" />
                  <TouchableOpacity style={s.createBtn} onPress={createClient} disabled={creatingClient} data-testid="create-client-btn">
                    <Text style={s.createBtnText}>{creatingClient ? 'Création...' : 'Créer et continuer'}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          {selectedClient && (
            <TouchableOpacity style={s.nextBtn} onPress={() => setStep('vehicle')} data-testid="next-to-vehicle">
              <Text style={s.nextBtnText}>Suivant : Choisir un véhicule</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* STEP: Dates (moved before vehicle to filter availability) */}
      {step === 'vehicle' && (
        <View>
          <Text style={s.title}>Dates & Véhicule</Text>
          <Text style={s.subtitle}>Choisissez les dates pour voir les véhicules disponibles</Text>
          <View style={s.dateRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Date début</Text>
              <TextInput style={s.input} placeholder="AAAA-MM-JJ" placeholderTextColor={C.textLight} value={startDate} onChangeText={setStartDate} data-testid="start-date-input" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Date fin</Text>
              <TextInput style={s.input} placeholder="AAAA-MM-JJ" placeholderTextColor={C.textLight} value={endDate} onChangeText={setEndDate} data-testid="end-date-input" />
            </View>
          </View>

          {startDate && endDate && (
            <TouchableOpacity style={s.searchVehicleBtn} onPress={fetchVehicles} data-testid="search-vehicles-btn">
              <Ionicons name="search" size={18} color="#fff" />
              <Text style={s.searchVehicleBtnText}>Rechercher véhicules disponibles</Text>
            </TouchableOpacity>
          )}

          {loadingVehicles && <ActivityIndicator size="large" color={C.accent} style={{ marginTop: 20 }} />}

          {vehicles.map((v) => (
            <TouchableOpacity
              key={v.id}
              style={[s.vehicleCard, selectedVehicle?.id === v.id && s.vehicleCardSelected]}
              onPress={() => setSelectedVehicle(v)}
              data-testid={`vehicle-${v.id}`}
            >
              <View style={s.vehicleInfo}>
                <Text style={s.vehicleName}>{v.brand} {v.model} ({v.year})</Text>
                <Text style={s.vehicleDetail}>{v.type} | {v.seats} places | {v.transmission} | {v.fuel_type}</Text>
              </View>
              <View style={s.vehiclePrice}>
                <Text style={s.priceNum}>CHF {v.price_per_day}</Text>
                <Text style={s.priceLabel}>/jour</Text>
              </View>
              {selectedVehicle?.id === v.id && <Ionicons name="checkmark-circle" size={24} color={C.success} />}
            </TouchableOpacity>
          ))}

          {selectedVehicle && totalDays > 0 && (
            <TouchableOpacity style={s.nextBtn} onPress={() => setStep('dates')} data-testid="next-to-options">
              <Text style={s.nextBtnText}>Suivant : Options & Paiement</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* STEP: Options & Payment */}
      {step === 'dates' && selectedVehicle && (
        <View>
          <Text style={s.title}>Options & Paiement</Text>

          {(selectedVehicle.options || []).length > 0 && (
            <>
              <Text style={s.label}>Options disponibles</Text>
              {selectedVehicle.options!.map((opt: any) => (
                <TouchableOpacity
                  key={opt.name}
                  style={[s.optionCard, selectedOptions.includes(opt.name) && s.optionSelected]}
                  onPress={() => setSelectedOptions(prev => prev.includes(opt.name) ? prev.filter(o => o !== opt.name) : [...prev, opt.name])}
                  data-testid={`option-${opt.name}`}
                >
                  <Ionicons name={selectedOptions.includes(opt.name) ? 'checkbox' : 'square-outline'} size={22} color={selectedOptions.includes(opt.name) ? C.success : C.textLight} />
                  <Text style={s.optionName}>{opt.name}</Text>
                  <Text style={s.optionPrice}>+CHF {opt.price_per_day}/jour</Text>
                </TouchableOpacity>
              ))}
            </>
          )}

          <Text style={[s.label, { marginTop: 20 }]}>Mode de paiement</Text>
          <TouchableOpacity style={[s.payCard, paymentMethod === 'cash' && s.payCardActive]} onPress={() => setPaymentMethod('cash')} data-testid="pay-cash">
            <Ionicons name="cash" size={24} color={paymentMethod === 'cash' ? C.warning : C.textLight} />
            <View style={{ flex: 1 }}>
              <Text style={[s.payTitle, paymentMethod === 'cash' && { color: C.text }]}>Espèces</Text>
              <Text style={s.paySub}>Le client paie au retrait du véhicule</Text>
            </View>
            {paymentMethod === 'cash' && <Ionicons name="checkmark-circle" size={22} color={C.success} />}
          </TouchableOpacity>
          <TouchableOpacity style={[s.payCard, paymentMethod === 'send_link' && s.payCardActive]} onPress={() => setPaymentMethod('send_link')} data-testid="pay-link">
            <Ionicons name="link" size={24} color={paymentMethod === 'send_link' ? C.accent : C.textLight} />
            <View style={{ flex: 1 }}>
              <Text style={[s.payTitle, paymentMethod === 'send_link' && { color: C.text }]}>Envoyer un lien de paiement</Text>
              <Text style={s.paySub}>Un lien Stripe est envoyé par email au client</Text>
            </View>
            {paymentMethod === 'send_link' && <Ionicons name="checkmark-circle" size={22} color={C.success} />}
          </TouchableOpacity>

          <TouchableOpacity style={s.nextBtn} onPress={() => setStep('confirm')} data-testid="next-to-confirm">
            <Text style={s.nextBtnText}>Voir le récapitulatif</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* STEP: Confirm */}
      {step === 'confirm' && selectedClient && selectedVehicle && (
        <View>
          <Text style={s.title}>Récapitulatif</Text>

          <View style={s.summaryCard}>
            <View style={s.summaryRow}><Text style={s.summaryLabel}>Client</Text><Text style={s.summaryValue}>{selectedClient.name}</Text></View>
            <View style={s.summaryRow}><Text style={s.summaryLabel}>Véhicule</Text><Text style={s.summaryValue}>{selectedVehicle.brand} {selectedVehicle.model}</Text></View>
            <View style={s.summaryRow}><Text style={s.summaryLabel}>Dates</Text><Text style={s.summaryValue}>{startDate} au {endDate}</Text></View>
            <View style={s.summaryRow}><Text style={s.summaryLabel}>Durée</Text><Text style={s.summaryValue}>{totalDays} jour(s)</Text></View>
            <View style={s.summaryRow}><Text style={s.summaryLabel}>Prix de base</Text><Text style={s.summaryValue}>CHF {basePrice.toFixed(2)}</Text></View>
            {optionsPrice > 0 && <View style={s.summaryRow}><Text style={s.summaryLabel}>Options</Text><Text style={s.summaryValue}>CHF {optionsPrice.toFixed(2)}</Text></View>}
            <View style={s.divider} />
            <View style={s.summaryRow}><Text style={[s.summaryLabel, { fontWeight: '800', color: C.text }]}>Total</Text><Text style={[s.summaryValue, { fontSize: 20, color: C.accent }]}>CHF {totalPrice.toFixed(2)}</Text></View>
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Paiement</Text>
              <Text style={[s.summaryValue, { color: paymentMethod === 'cash' ? C.warning : C.accent }]}>
                {paymentMethod === 'cash' ? 'Espèces' : 'Lien par email'}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={[s.confirmBtn, submitting && { opacity: 0.6 }]} onPress={submitReservation} disabled={submitting} data-testid="confirm-booking-btn">
            {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="checkmark-circle" size={22} color="#fff" />}
            <Text style={s.confirmBtnText}>{submitting ? 'Création...' : 'Confirmer la réservation'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingBottom: 40 },
  steps: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, backgroundColor: C.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.border },
  stepItem: { alignItems: 'center', gap: 4, flex: 1 },
  stepActive: {},
  stepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.border, alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { backgroundColor: C.primary },
  stepLabel: { fontSize: 10, color: C.textLight, fontWeight: '600' },
  stepLabelActive: { color: C.accent },
  title: { color: C.text, fontSize: 20, fontWeight: '800', marginBottom: 6 },
  subtitle: { color: C.textLight, fontSize: 13, marginBottom: 16 },
  label: { color: C.textLight, fontSize: 12, fontWeight: '600', marginBottom: 6 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 10, paddingHorizontal: 12, gap: 8, borderWidth: 1, borderColor: C.border, marginBottom: 12 },
  searchInput: { flex: 1, color: C.text, fontSize: 14, paddingVertical: 12 },
  resultCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  resultName: { color: C.text, fontSize: 14, fontWeight: '700' },
  resultSub: { color: C.textLight, fontSize: 12 },
  selectedCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(108,43,217,0.15)', borderRadius: 10, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: C.primary },
  selectedName: { color: C.text, fontSize: 15, fontWeight: '700' },
  selectedSub: { color: C.textLight, fontSize: 12 },
  newClientBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  newClientBtnText: { color: C.accent, fontSize: 14, fontWeight: '600' },
  newClientForm: { backgroundColor: C.card, borderRadius: 10, padding: 14, gap: 10, borderWidth: 1, borderColor: C.border, marginBottom: 16 },
  input: { backgroundColor: C.bg, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: C.text, fontSize: 14, borderWidth: 1, borderColor: C.border },
  createBtn: { backgroundColor: C.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  createBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  nextBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.primary, borderRadius: 12, paddingVertical: 14, marginTop: 20 },
  nextBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  dateRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  searchVehicleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.accent, borderRadius: 10, paddingVertical: 12, marginBottom: 16 },
  searchVehicleBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  vehicleCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: C.border, gap: 10 },
  vehicleCardSelected: { borderColor: C.success, backgroundColor: 'rgba(16,185,129,0.08)' },
  vehicleInfo: { flex: 1 },
  vehicleName: { color: C.text, fontSize: 14, fontWeight: '700' },
  vehicleDetail: { color: C.textLight, fontSize: 11, marginTop: 2 },
  vehiclePrice: { alignItems: 'flex-end' },
  priceNum: { color: C.accent, fontSize: 16, fontWeight: '800' },
  priceLabel: { color: C.textLight, fontSize: 10 },
  optionCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderRadius: 8, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  optionSelected: { borderColor: C.success, backgroundColor: 'rgba(16,185,129,0.08)' },
  optionName: { flex: 1, color: C.text, fontSize: 14 },
  optionPrice: { color: C.textLight, fontSize: 12 },
  payCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  payCardActive: { borderColor: C.primary, backgroundColor: 'rgba(108,43,217,0.1)' },
  payTitle: { color: C.textLight, fontSize: 14, fontWeight: '700' },
  paySub: { color: C.textLight, fontSize: 11, marginTop: 2 },
  summaryCard: { backgroundColor: C.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: C.border, marginBottom: 20 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  summaryLabel: { color: C.textLight, fontSize: 13 },
  summaryValue: { color: C.text, fontSize: 13, fontWeight: '600' },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 8 },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.success, borderRadius: 12, paddingVertical: 16 },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  successIcon: { marginBottom: 16 },
  successTitle: { color: C.text, fontSize: 24, fontWeight: '800', marginBottom: 8 },
  successSub: { color: C.textLight, fontSize: 15, marginBottom: 4 },
  successPrice: { color: C.accent, fontSize: 28, fontWeight: '800', marginVertical: 12 },
  successMethod: { color: C.textLight, fontSize: 14, marginBottom: 24 },
  newBookBtn: { backgroundColor: C.primary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32 },
  newBookBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
