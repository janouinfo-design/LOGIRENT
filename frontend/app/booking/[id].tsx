import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays, differenceInDays, startOfDay, isBefore } from 'date-fns';
import { fr } from 'date-fns/locale';
import * as WebBrowser from 'expo-web-browser';
import { useVehicleStore } from '../../src/store/vehicleStore';
import { useReservationStore } from '../../src/store/reservationStore';
import { useAuthStore } from '../../src/store/authStore';
import api from '../../src/api/axios';
import MiniCalendar from '../../src/components/MiniCalendar';
import { VehiclePricingDisplay } from '../../src/components/VehiclePricingDisplay';

const C = {
  primary: '#1E3A8A',
  primaryLight: '#3B5FCC',
  secondary: '#F59E0B',
  bg: '#F8FAFC',
  card: '#FFFFFF',
  text: '#1E293B',
  textLight: '#64748B',
  border: '#E2E8F0',
  success: '#10B981',
  error: '#EF4444',
  twint: '#000000',
};

const DEFAULT_OPTIONS = [
  { name: 'GPS', price_per_day: 10, icon: 'navigate' },
  { name: 'Siège enfant', price_per_day: 8, icon: 'happy' },
  { name: 'Conducteur supplémentaire', price_per_day: 15, icon: 'people' },
];

const STEPS = ['Sélection', 'Validation', 'Paiement', 'Confirmation'];

// ==================== Step Indicator ====================
function StepIndicator({ current }: { current: number }) {
  return (
    <View style={si.container} data-testid="step-indicator">
      {STEPS.map((label, idx) => {
        const stepNum = idx + 1;
        const isActive = stepNum === current;
        const isDone = stepNum < current;
        return (
          <View key={label} style={si.stepWrap}>
            <View style={[si.circle, isActive && si.circleActive, isDone && si.circleDone]}>
              {isDone ? (
                <Ionicons name="checkmark" size={14} color="#fff" />
              ) : (
                <Text style={[si.num, (isActive || isDone) && si.numActive]}>{stepNum}</Text>
              )}
            </View>
            <Text style={[si.label, isActive && si.labelActive]}>{label}</Text>
            {idx < STEPS.length - 1 && <View style={[si.line, isDone && si.lineDone]} />}
          </View>
        );
      })}
    </View>
  );
}

const si = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 16, backgroundColor: C.card, borderBottomWidth: 1, borderColor: C.border },
  stepWrap: { alignItems: 'center', flex: 1, position: 'relative' },
  circle: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.border, alignItems: 'center', justifyContent: 'center' },
  circleActive: { backgroundColor: C.primary },
  circleDone: { backgroundColor: C.success },
  num: { fontSize: 13, fontWeight: '700', color: C.textLight },
  numActive: { color: '#fff' },
  label: { fontSize: 10, color: C.textLight, marginTop: 4, fontWeight: '500', textAlign: 'center' },
  labelActive: { color: C.primary, fontWeight: '700' },
  line: { position: 'absolute', top: 14, left: '60%', right: '-40%', height: 2, backgroundColor: C.border },
  lineDone: { backgroundColor: C.success },
});

// ==================== Main Component ====================
export default function BookingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { selectedVehicle, fetchVehicle } = useVehicleStore();
  const { createReservation, initiatePayment, isLoading } = useReservationStore();
  const { user } = useAuthStore();

  const [step, setStep] = useState(1);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(addDays(new Date(), 2));
  const [startHour, setStartHour] = useState(8);
  const [startMin] = useState(0);
  const [endHour, setEndHour] = useState(18);
  const [endMin] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [showDatePicker, setShowDatePicker] = useState<'start' | 'end' | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'twint' | 'cash'>('card');
  const [errorMsg, setErrorMsg] = useState('');
  const [agencyOptions, setAgencyOptions] = useState<any[]>([]);
  const [createdReservation, setCreatedReservation] = useState<any>(null);
  const [contractId, setContractId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);

  const hasDocuments = user?.id_photo && user?.license_photo;

  useEffect(() => { if (id) fetchVehicle(id); }, [id]);

  const vehicle = selectedVehicle;

  useEffect(() => {
    if (vehicle?.agency_id) {
      api.get(`/api/agencies/${vehicle.agency_id}/booking-options`)
        .then(res => setAgencyOptions(res.data.options || []))
        .catch(() => setAgencyOptions(DEFAULT_OPTIONS));
    }
  }, [vehicle?.agency_id]);

  const allOptions = useMemo(() => {
    const vehicleOpts = vehicle?.options || [];
    const names = new Set(vehicleOpts.map((o: any) => o.name));
    const merged = [...vehicleOpts];
    const src = agencyOptions.length > 0 ? agencyOptions : DEFAULT_OPTIONS;
    for (const o of src) { if (!names.has(o.name)) merged.push(o); }
    return merged;
  }, [vehicle, agencyOptions]);

  if (!vehicle) {
    return <View style={s.loading}><ActivityIndicator size="large" color={C.primary} /></View>;
  }

  const totalDays = Math.max(differenceInDays(endDate, startDate), 1);
  const selectedTier = selectedTierId ? vehicle.pricing_tiers?.find((t: any) => t.id === selectedTierId && t.active) : null;
  const basePrice = selectedTier ? selectedTier.price : vehicle.price_per_day * totalDays;
  const optionsPrice = selectedOptions.reduce((t, name) => {
    const o = allOptions.find((x: any) => x.name === name);
    return t + (o ? o.price_per_day * totalDays : 0);
  }, 0);
  const totalPrice = basePrice + optionsPrice;

  const toggleOption = (name: string) =>
    setSelectedOptions(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);

  const incrementDays = (type: 'start' | 'end', inc: number) => {
    const today = startOfDay(new Date());
    if (type === 'start') {
      const d = addDays(startDate, inc);
      if (d >= today && d < endDate) setStartDate(d);
    } else {
      const d = addDays(endDate, inc);
      if (d > startDate) setEndDate(d);
    }
  };

  const handleCalendarDateSelect = (date: Date) => {
    if (isBefore(date, startOfDay(new Date()))) return;
    if (showDatePicker === 'start') {
      setStartDate(date);
      if (date >= endDate) setEndDate(addDays(date, 1));
    } else if (showDatePicker === 'end') {
      if (date <= startDate) return;
      setEndDate(date);
    }
    setShowDatePicker(null);
  };

  const handleConfirmBooking = async () => {
    setErrorMsg('');
    setIsGenerating(true);
    try {
      const sd = new Date(startDate); sd.setHours(startHour, startMin, 0, 0);
      const ed = new Date(endDate); ed.setHours(endHour, endMin, 0, 0);
      const effectivePayment = paymentMethod === 'twint' ? 'card' : paymentMethod;

      const reservation = await createReservation({
        vehicle_id: id!,
        start_date: sd.toISOString(),
        end_date: ed.toISOString(),
        options: selectedOptions,
        payment_method: effectivePayment,
        selected_tier_id: selectedTierId || undefined,
      });

      setCreatedReservation(reservation);

      // Auto-generate contract
      try {
        const contractRes = await api.post(`/api/contracts/auto-generate/${reservation.id}`);
        setContractId(contractRes.data.contract_id);
      } catch { /* Contract generation is optional */ }

      // Handle payment
      if (paymentMethod === 'cash') {
        setStep(4);
      } else {
        const originUrl = typeof window !== 'undefined' ? window.location.origin : (process.env.EXPO_PUBLIC_BACKEND_URL || '');
        const pmType = paymentMethod === 'twint' ? 'twint' : 'card';
        const paymentData = await initiatePayment(reservation.id, originUrl, pmType);
        if (Platform.OS === 'web') {
          window.location.href = paymentData.url;
        } else {
          await WebBrowser.openBrowserAsync(paymentData.url);
          setStep(4);
        }
      }
    } catch (error: any) {
      setErrorMsg(error.message || 'Erreur lors de la réservation.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadContract = async () => {
    if (!contractId) return;
    try {
      const resp = await api.get(`/api/contracts/${contractId}/pdf`, { responseType: 'blob' });
      if (Platform.OS === 'web') {
        const blob = new Blob([resp.data], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `contrat_${contractId.slice(0, 8)}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  // ==================== STEP 1: Sélection ====================
  const renderStep1 = () => (
    <>
      {/* Document Warning */}
      {!hasDocuments && (
        <TouchableOpacity style={s.warning} onPress={() => router.push('/(tabs)/profile')} data-testid="doc-warning">
          <Ionicons name="warning" size={20} color="#92400E" />
          <Text style={s.warningText}>Documents manquants. Uploadez votre permis et pièce d'identité avant de réserver.</Text>
          <Ionicons name="chevron-forward" size={16} color="#92400E" />
        </TouchableOpacity>
      )}

      {/* Dates */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Dates de location</Text>
        <View style={s.dateRow}>
          <TouchableOpacity style={s.dateCard} onPress={() => setShowDatePicker('start')} data-testid="start-date-card">
            <Text style={s.dateLabel}>Date de départ</Text>
            <View style={s.dateSelector}>
              <TouchableOpacity style={s.dateBtn} onPress={() => incrementDays('start', -1)}><Ionicons name="remove" size={20} color={C.primary} /></TouchableOpacity>
              <View style={s.dateDisplay}>
                <Text style={s.dateDay}>{format(startDate, 'd')}</Text>
                <Text style={s.dateMonth}>{format(startDate, 'MMM yyyy', { locale: fr })}</Text>
              </View>
              <TouchableOpacity style={s.dateBtn} onPress={() => incrementDays('start', 1)}><Ionicons name="add" size={20} color={C.primary} /></TouchableOpacity>
            </View>
            <View style={s.timePicker}>
              <Ionicons name="time-outline" size={14} color={C.primary} />
              <TouchableOpacity style={s.timeBtn} onPress={() => setStartHour(h => h > 0 ? h - 1 : 23)}><Ionicons name="chevron-down" size={14} color={C.textLight} /></TouchableOpacity>
              <Text style={s.timeText}>{String(startHour).padStart(2, '0')}:{String(startMin).padStart(2, '0')}</Text>
              <TouchableOpacity style={s.timeBtn} onPress={() => setStartHour(h => h < 23 ? h + 1 : 0)}><Ionicons name="chevron-up" size={14} color={C.textLight} /></TouchableOpacity>
            </View>
          </TouchableOpacity>

          <Ionicons name="arrow-forward" size={24} color={C.textLight} />

          <TouchableOpacity style={s.dateCard} onPress={() => setShowDatePicker('end')} data-testid="return-date-card">
            <Text style={s.dateLabel}>Date de retour</Text>
            <View style={s.dateSelector}>
              <TouchableOpacity style={s.dateBtn} onPress={() => incrementDays('end', -1)}><Ionicons name="remove" size={20} color={C.primary} /></TouchableOpacity>
              <View style={s.dateDisplay}>
                <Text style={s.dateDay}>{format(endDate, 'd')}</Text>
                <Text style={s.dateMonth}>{format(endDate, 'MMM yyyy', { locale: fr })}</Text>
              </View>
              <TouchableOpacity style={s.dateBtn} onPress={() => incrementDays('end', 1)}><Ionicons name="add" size={20} color={C.primary} /></TouchableOpacity>
            </View>
            <View style={s.timePicker}>
              <Ionicons name="time-outline" size={14} color={C.primary} />
              <TouchableOpacity style={s.timeBtn} onPress={() => setEndHour(h => h > 0 ? h - 1 : 23)}><Ionicons name="chevron-down" size={14} color={C.textLight} /></TouchableOpacity>
              <Text style={s.timeText}>{String(endHour).padStart(2, '0')}:{String(endMin).padStart(2, '0')}</Text>
              <TouchableOpacity style={s.timeBtn} onPress={() => setEndHour(h => h < 23 ? h + 1 : 0)}><Ionicons name="chevron-up" size={14} color={C.textLight} /></TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>

        <View style={s.durationBadge}>
          <Ionicons name="time" size={18} color={C.primary} />
          <Text style={s.durationText}>{totalDays} {totalDays === 1 ? 'jour' : 'jours'}</Text>
        </View>
      </View>

      <MiniCalendar
        visible={showDatePicker !== null}
        onClose={() => setShowDatePicker(null)}
        onSelectDate={handleCalendarDateSelect}
        selectedDate={showDatePicker === 'start' ? startDate : endDate}
        minDate={showDatePicker === 'end' ? addDays(startDate, 1) : undefined}
        title={showDatePicker === 'start' ? 'Date de départ' : 'Date de retour'}
        vehicleId={id}
      />

      {/* Pricing Tiers */}
      {vehicle.pricing_tiers?.length > 0 && (
        <View style={s.section}>
          <VehiclePricingDisplay
            tiers={vehicle.pricing_tiers}
            C={C}
            selectedTierId={selectedTierId}
            onSelectTier={setSelectedTierId}
            defaultPrice={vehicle.price_per_day * totalDays}
            totalDays={totalDays}
          />
        </View>
      )}

      {/* Options */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Options supplémentaires</Text>
        {allOptions.map((opt: any) => {
          const sel = selectedOptions.includes(opt.name);
          const total = opt.price_per_day * totalDays;
          return (
            <TouchableOpacity key={opt.name} style={[s.optionCard, sel && s.optionCardSel]} onPress={() => toggleOption(opt.name)} data-testid={`option-${opt.name.toLowerCase().replace(/\s+/g, '-')}`}>
              <View style={s.optionLeft}>
                <View style={[s.checkbox, sel && s.checkboxSel]}>
                  {sel && <Ionicons name="checkmark" size={16} color="#fff" />}
                </View>
                <Ionicons name={(opt.icon || 'options') as any} size={18} color={sel ? C.primary : C.textLight} style={{ marginRight: 6 }} />
                <Text style={s.optionName}>{opt.name}</Text>
              </View>
              <View style={s.optionRight}>
                <Text style={s.optionUnit}>CHF {opt.price_per_day}/jour</Text>
                <Text style={s.optionTotal}>CHF {total.toFixed(2)}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Quick Price Preview */}
      <View style={s.section}>
        <View style={s.pricePreview}>
          <Text style={s.pricePreviewLabel}>Estimation</Text>
          <Text style={s.pricePreviewVal}>CHF {totalPrice.toFixed(2)}</Text>
        </View>
      </View>
    </>
  );

  // ==================== STEP 2: Validation / Récapitulatif ====================
  const renderStep2 = () => (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Récapitulatif de la réservation</Text>

      {/* Vehicle */}
      <View style={s.recapCard} data-testid="recap-vehicle">
        <View style={s.recapRow}>
          <Ionicons name="car-sport" size={20} color={C.primary} />
          <Text style={s.recapLabel}>Véhicule</Text>
        </View>
        <Text style={s.recapValue}>{vehicle.brand} {vehicle.model}</Text>
        <Text style={s.recapSub}>CHF {vehicle.price_per_day}/jour</Text>
      </View>

      {/* Dates */}
      <View style={s.recapCard} data-testid="recap-dates">
        <View style={s.recapRow}>
          <Ionicons name="calendar" size={20} color={C.primary} />
          <Text style={s.recapLabel}>Période</Text>
        </View>
        <Text style={s.recapValue}>
          {format(startDate, 'dd MMM yyyy', { locale: fr })} ({String(startHour).padStart(2, '0')}h) {' → '} 
          {format(endDate, 'dd MMM yyyy', { locale: fr })} ({String(endHour).padStart(2, '0')}h)
        </Text>
        <Text style={s.recapSub}>{totalDays} jour{totalDays > 1 ? 's' : ''}</Text>
      </View>

      {/* Options */}
      {selectedOptions.length > 0 && (
        <View style={s.recapCard} data-testid="recap-options">
          <View style={s.recapRow}>
            <Ionicons name="options" size={20} color={C.primary} />
            <Text style={s.recapLabel}>Options</Text>
          </View>
          {selectedOptions.map(name => {
            const o = allOptions.find((x: any) => x.name === name);
            return (
              <View key={name} style={s.recapOptRow}>
                <Text style={s.recapOptName}>{name}</Text>
                <Text style={s.recapOptPrice}>CHF {o ? (o.price_per_day * totalDays).toFixed(2) : '-'}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Price Breakdown */}
      <View style={[s.recapCard, { backgroundColor: C.primary + '08' }]} data-testid="recap-price">
        <View style={s.recapRow}>
          <Ionicons name="receipt" size={20} color={C.primary} />
          <Text style={s.recapLabel}>Détail du prix</Text>
        </View>
        <View style={s.priceRow}>
          <Text style={s.priceLabel}>{selectedTier ? `Forfait: ${selectedTier.name}` : `Base (${totalDays}j x CHF ${vehicle.price_per_day})`}</Text>
          <Text style={s.priceVal}>CHF {basePrice.toFixed(2)}</Text>
        </View>
        {optionsPrice > 0 && (
          <View style={s.priceRow}>
            <Text style={s.priceLabel}>Options</Text>
            <Text style={s.priceVal}>CHF {optionsPrice.toFixed(2)}</Text>
          </View>
        )}
        <View style={[s.priceRow, s.totalRow]}>
          <Text style={s.totalLabel}>Total</Text>
          <Text style={s.totalVal}>CHF {totalPrice.toFixed(2)}</Text>
        </View>
      </View>

      {/* Conditions */}
      <View style={s.recapCard}>
        <View style={s.recapRow}>
          <Ionicons name="shield-checkmark" size={20} color={C.success} />
          <Text style={s.recapLabel}>Conditions</Text>
        </View>
        <View style={s.policyItem}><Ionicons name="checkmark-circle" size={16} color={C.success} /><Text style={s.policyText}>Annulation gratuite 24h avant</Text></View>
        <View style={s.policyItem}><Ionicons name="checkmark-circle" size={16} color={C.success} /><Text style={s.policyText}>Assurance complète incluse</Text></View>
        <View style={s.policyItem}><Ionicons name="checkmark-circle" size={16} color={C.success} /><Text style={s.policyText}>Assistance routière 24/7</Text></View>
      </View>
    </View>
  );

  // ==================== STEP 3: Paiement ====================
  const renderStep3 = () => (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Mode de paiement</Text>

      <TouchableOpacity style={[s.payCard, paymentMethod === 'card' && s.payCardActive]} onPress={() => setPaymentMethod('card')} data-testid="payment-card">
        <View style={[s.payRadio, paymentMethod === 'card' && s.payRadioActive]}>
          {paymentMethod === 'card' && <View style={s.payRadioInner} />}
        </View>
        <Ionicons name="card" size={28} color={paymentMethod === 'card' ? C.primary : C.textLight} />
        <View style={{ flex: 1 }}>
          <Text style={[s.payTitle, paymentMethod === 'card' && { color: C.primary }]}>Carte bancaire</Text>
          <Text style={s.paySub}>Visa, Mastercard, Apple Pay</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={[s.payCard, paymentMethod === 'twint' && { borderColor: C.twint, backgroundColor: '#F5F5F5' }]} onPress={() => setPaymentMethod('twint')} data-testid="payment-twint">
        <View style={[s.payRadio, paymentMethod === 'twint' && { borderColor: C.twint }]}>
          {paymentMethod === 'twint' && <View style={[s.payRadioInner, { backgroundColor: C.twint }]} />}
        </View>
        <View style={s.twintIcon}><Text style={s.twintText}>T</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={[s.payTitle, paymentMethod === 'twint' && { color: C.twint }]}>TWINT</Text>
          <Text style={s.paySub}>Paiement mobile suisse</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={[s.payCard, paymentMethod === 'cash' && { borderColor: C.secondary, backgroundColor: '#FFFBEB' }]} onPress={() => setPaymentMethod('cash')} data-testid="payment-cash">
        <View style={[s.payRadio, paymentMethod === 'cash' && { borderColor: C.secondary }]}>
          {paymentMethod === 'cash' && <View style={[s.payRadioInner, { backgroundColor: C.secondary }]} />}
        </View>
        <Ionicons name="cash" size={28} color={paymentMethod === 'cash' ? C.secondary : C.textLight} />
        <View style={{ flex: 1 }}>
          <Text style={[s.payTitle, paymentMethod === 'cash' && { color: '#92400E' }]}>Espèces</Text>
          <Text style={s.paySub}>Payer lors de la prise du véhicule</Text>
        </View>
      </TouchableOpacity>

      {/* Price Reminder */}
      <View style={s.payTotal}>
        <Text style={s.payTotalLabel}>Montant à payer</Text>
        <Text style={s.payTotalVal}>CHF {totalPrice.toFixed(2)}</Text>
      </View>

      {errorMsg ? (
        <View style={s.errorBanner} data-testid="error-banner">
          <Ionicons name="alert-circle" size={18} color={C.error} />
          <Text style={s.errorText}>{errorMsg}</Text>
        </View>
      ) : null}
    </View>
  );

  // ==================== STEP 4: Confirmation ====================
  const renderStep4 = () => (
    <View style={s.section}>
      <View style={s.confirmCenter} data-testid="confirmation-screen">
        <View style={s.confirmIcon}>
          <Ionicons name="checkmark-circle" size={80} color={C.success} />
        </View>
        <Text style={s.confirmTitle}>Réservation confirmée !</Text>
        <Text style={s.confirmSub}>
          Votre réservation pour le {vehicle.brand} {vehicle.model} a été enregistrée avec succès.
        </Text>

        {/* Reservation Details */}
        <View style={s.confirmCard}>
          <View style={s.confirmRow}>
            <Text style={s.confirmLabel}>Référence</Text>
            <Text style={s.confirmVal}>{createdReservation?.id?.slice(0, 8).toUpperCase() || '-'}</Text>
          </View>
          <View style={s.confirmRow}>
            <Text style={s.confirmLabel}>Véhicule</Text>
            <Text style={s.confirmVal}>{vehicle.brand} {vehicle.model}</Text>
          </View>
          <View style={s.confirmRow}>
            <Text style={s.confirmLabel}>Période</Text>
            <Text style={s.confirmVal}>{format(startDate, 'dd/MM/yyyy')} - {format(endDate, 'dd/MM/yyyy')}</Text>
          </View>
          <View style={s.confirmRow}>
            <Text style={s.confirmLabel}>Paiement</Text>
            <Text style={s.confirmVal}>{paymentMethod === 'cash' ? 'Espèces' : paymentMethod === 'twint' ? 'TWINT' : 'Carte'}</Text>
          </View>
          <View style={[s.confirmRow, { borderBottomWidth: 0 }]}>
            <Text style={s.confirmLabel}>Total</Text>
            <Text style={[s.confirmVal, { fontWeight: '800', color: C.primary, fontSize: 18 }]}>CHF {totalPrice.toFixed(2)}</Text>
          </View>
        </View>

        {/* Contract Download */}
        {contractId ? (
          <TouchableOpacity style={s.contractBtn} onPress={handleDownloadContract} data-testid="download-contract-btn">
            <Ionicons name="document-text" size={22} color="#fff" />
            <Text style={s.contractBtnText}>Télécharger le contrat</Text>
          </TouchableOpacity>
        ) : (
          <View style={s.contractPending}>
            <Ionicons name="document-text-outline" size={18} color={C.textLight} />
            <Text style={s.contractPendingText}>Le contrat sera disponible prochainement</Text>
          </View>
        )}

        {/* Actions */}
        <TouchableOpacity style={s.backToResBtn} onPress={() => router.push('/(tabs)/reservations')} data-testid="back-to-reservations-btn">
          <Ionicons name="list" size={18} color={C.primary} />
          <Text style={s.backToResText}>Voir mes réservations</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ==================== Bottom Navigation ====================
  const canGoNext = () => {
    if (step === 1) return totalDays > 0;
    if (step === 2) return true;
    if (step === 3) return !!paymentMethod;
    return false;
  };

  return (
    <View style={s.container}>
      {/* Vehicle Header */}
      <View style={s.vehicleHeader}>
        <TouchableOpacity onPress={() => step > 1 && step < 4 ? setStep(step - 1) : router.back()} style={s.backBtn} data-testid="back-button">
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={s.vehicleName}>{vehicle.brand} {vehicle.model}</Text>
          <Text style={s.vehiclePrice}>CHF {vehicle.price_per_day}/jour</Text>
        </View>
      </View>

      {/* Step Indicator */}
      <StepIndicator current={step} />

      {/* Content */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: step < 4 ? 100 : 40 }}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </ScrollView>

      {/* Bottom Navigation (hidden on step 4) */}
      {step < 4 && (
        <View style={s.bottomBar}>
          <View style={s.bottomInner}>
            {step > 1 ? (
              <TouchableOpacity style={s.prevBtn} onPress={() => setStep(step - 1)} data-testid="prev-step-btn">
                <Ionicons name="arrow-back" size={18} color={C.primary} />
                <Text style={s.prevBtnText}>Précédent</Text>
              </TouchableOpacity>
            ) : <View />}

            {step < 3 ? (
              <TouchableOpacity
                style={[s.nextBtn, !canGoNext() && { opacity: 0.5 }]}
                onPress={() => canGoNext() && setStep(step + 1)}
                disabled={!canGoNext()}
                data-testid="next-step-btn"
              >
                <Text style={s.nextBtnText}>{step === 2 ? 'Choisir le paiement' : 'Valider la sélection'}</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[s.confirmBtn, (isLoading || isGenerating) && { opacity: 0.7 }]}
                onPress={handleConfirmBooking}
                disabled={isLoading || isGenerating}
                data-testid="confirm-booking-btn"
              >
                {(isLoading || isGenerating) ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={s.confirmBtnText}>
                      {paymentMethod === 'cash' ? 'Confirmer la réservation' : paymentMethod === 'twint' ? 'Payer par TWINT' : 'Payer par carte'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

// ==================== Styles ====================
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  vehicleHeader: { backgroundColor: C.primary, padding: 16, paddingTop: 50, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  vehicleName: { fontSize: 18, fontWeight: '700', color: '#fff' },
  vehiclePrice: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },

  // Section
  section: { padding: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 14 },

  // Warning
  warning: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF3C7', padding: 12, margin: 16, borderRadius: 10 },
  warningText: { flex: 1, fontSize: 12, color: '#92400E', fontWeight: '500' },

  // Dates
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  dateCard: { flex: 1, backgroundColor: C.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  dateLabel: { fontSize: 11, fontWeight: '600', color: C.textLight, textTransform: 'uppercase', marginBottom: 6 },
  dateSelector: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.primary + '10', alignItems: 'center', justifyContent: 'center' },
  dateDisplay: { alignItems: 'center' },
  dateDay: { fontSize: 28, fontWeight: '800', color: C.text },
  dateMonth: { fontSize: 12, color: C.textLight, fontWeight: '500' },
  timePicker: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, backgroundColor: C.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  timeBtn: { padding: 2 },
  timeText: { fontSize: 16, fontWeight: '700', color: C.text, minWidth: 50, textAlign: 'center' },
  durationBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, backgroundColor: C.primary + '10', padding: 8, borderRadius: 8 },
  durationText: { fontSize: 14, fontWeight: '700', color: C.primary },

  // Options
  optionCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.card, borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  optionCardSel: { borderColor: C.primary, backgroundColor: C.primary + '06' },
  optionLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  checkboxSel: { backgroundColor: C.primary, borderColor: C.primary },
  optionName: { fontSize: 14, fontWeight: '600', color: C.text },
  optionRight: { alignItems: 'flex-end' },
  optionUnit: { fontSize: 11, color: C.textLight },
  optionTotal: { fontSize: 14, fontWeight: '700', color: C.text },

  // Price Preview
  pricePreview: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.card, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: C.border },
  pricePreviewLabel: { fontSize: 14, color: C.textLight, fontWeight: '600' },
  pricePreviewVal: { fontSize: 20, fontWeight: '800', color: C.primary },

  // Recap
  recapCard: { backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  recapRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  recapLabel: { fontSize: 13, fontWeight: '700', color: C.text },
  recapValue: { fontSize: 15, fontWeight: '600', color: C.text, marginBottom: 2 },
  recapSub: { fontSize: 12, color: C.textLight },
  recapOptRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  recapOptName: { fontSize: 13, color: C.text },
  recapOptPrice: { fontSize: 13, fontWeight: '600', color: C.text },

  // Price
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  priceLabel: { fontSize: 13, color: C.textLight },
  priceVal: { fontSize: 13, fontWeight: '600', color: C.text },
  totalRow: { borderTopWidth: 1, borderColor: C.border, marginTop: 6, paddingTop: 10 },
  totalLabel: { fontSize: 16, fontWeight: '800', color: C.text },
  totalVal: { fontSize: 20, fontWeight: '800', color: C.primary },

  // Policies
  policyItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
  policyText: { fontSize: 12, color: C.textLight },

  // Payment
  payCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.card, borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 2, borderColor: C.border },
  payCardActive: { borderColor: C.primary, backgroundColor: C.primary + '06' },
  payRadio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  payRadioActive: { borderColor: C.primary },
  payRadioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: C.primary },
  payTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  paySub: { fontSize: 11, color: C.textLight },
  twintIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  twintText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  payTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.primary + '08', borderRadius: 12, padding: 16, marginTop: 8 },
  payTotalLabel: { fontSize: 14, color: C.textLight, fontWeight: '600' },
  payTotalVal: { fontSize: 22, fontWeight: '800', color: C.primary },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEE2E2', borderRadius: 10, padding: 12, marginTop: 10 },
  errorText: { fontSize: 13, color: C.error, flex: 1, fontWeight: '500' },

  // Confirmation
  confirmCenter: { alignItems: 'center', paddingVertical: 20 },
  confirmIcon: { marginBottom: 16 },
  confirmTitle: { fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 8 },
  confirmSub: { fontSize: 14, color: C.textLight, textAlign: 'center', paddingHorizontal: 30, marginBottom: 24, lineHeight: 20 },
  confirmCard: { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, width: '100%', padding: 16 },
  confirmRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderColor: C.border },
  confirmLabel: { fontSize: 13, color: C.textLight },
  confirmVal: { fontSize: 13, fontWeight: '600', color: C.text },
  contractBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.primary, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, marginTop: 20 },
  contractBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  contractPending: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 },
  contractPendingText: { fontSize: 12, color: C.textLight },
  backToResBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, paddingVertical: 10 },
  backToResText: { fontSize: 14, color: C.primary, fontWeight: '600' },

  // Bottom Bar
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: C.card, borderTopWidth: 1, borderColor: C.border, paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 24 },
  bottomInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  prevBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: C.border },
  prevBtnText: { fontSize: 14, fontWeight: '600', color: C.primary },
  nextBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.primary, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12 },
  nextBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.success, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12 },
  confirmBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
