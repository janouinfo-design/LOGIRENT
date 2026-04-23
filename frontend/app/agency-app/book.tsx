import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, Platform, Dimensions, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../src/api/axios';
import { format, addMonths, startOfMonth, endOfMonth, startOfWeek, addDays, isSameDay, isBefore, isAfter, parseISO, differenceInDays, isWithinInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useThemeStore } from '../../src/store/themeStore';
import { WebcamCapture } from '../../src/components/WebcamCapture';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface Client { id: string; name: string; email: string; phone?: string; }
interface VehicleSlot { id: string; user_name: string; start: string; end: string; status: string; }
interface VehicleSchedule { id: string; brand: string; model: string; price_per_day: number; type: string; seats: number; transmission: string; fuel_type: string; options?: any[]; reservations: VehicleSlot[]; }

type Step = 'client' | 'calendar' | 'vehicle' | 'options' | 'confirm';

const WEEKDAYS = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];

// ─── Calendar Month Grid ───
function CalendarMonth({ month, startDate, endDate, onSelectDate, busyDays, colors: C }: {
  month: Date; startDate: Date | null; endDate: Date | null;
  onSelectDate: (d: Date) => void; busyDays: Date[]; colors: any;
}) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const weeks: Date[][] = [];
  let day = calStart;
  while (day <= monthEnd || weeks.length < 6) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) { week.push(day); day = addDays(day, 1); }
    weeks.push(week);
    if (day > monthEnd && weeks.length >= 4) break;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isBusy = (d: Date) => busyDays.some(b => isSameDay(b, d));
  const isInRange = (d: Date) => {
    if (!startDate || !endDate) return false;
    return isAfter(d, startDate) && isBefore(d, endDate);
  };
  const isStart = (d: Date) => startDate ? isSameDay(d, startDate) : false;
  const isEnd = (d: Date) => endDate ? isSameDay(d, endDate) : false;

  return (
    <View style={cs.monthContainer}>
      <Text style={[cs.monthTitle, { color: C.text }]}>{format(month, 'MMMM yyyy', { locale: fr })}</Text>
      <View style={cs.weekdayRow}>
        {WEEKDAYS.map(w => <Text key={w} style={[cs.weekdayText, { color: C.textLight }]}>{w}</Text>)}
      </View>
      {weeks.map((week, wi) => (
        <View key={wi} style={cs.weekRow}>
          {week.map((d, di) => {
            const isCurrentMonth = d.getMonth() === month.getMonth();
            const isPast = isBefore(d, today);
            const busy = isBusy(d);
            const inRange = isInRange(d);
            const start = isStart(d);
            const end = isEnd(d);
            const selected = start || end;
            const disabled = !isCurrentMonth || isPast;

            return (
              <TouchableOpacity
                key={di}
                style={[
                  cs.dayCell,
                  inRange && { backgroundColor: C.accent + '15' },
                  start && { backgroundColor: C.accent, borderTopLeftRadius: 20, borderBottomLeftRadius: 20 },
                  end && { backgroundColor: C.accent, borderTopRightRadius: 20, borderBottomRightRadius: 20 },
                  (inRange && !start && !end) && { borderRadius: 0 },
                ]}
                onPress={() => !disabled && onSelectDate(d)}
                disabled={disabled}
              >
                <Text style={[
                  cs.dayText,
                  { color: disabled ? C.border : C.text },
                  selected && { color: '#fff', fontWeight: '800' },
                  inRange && !selected && { color: C.accent },
                  busy && !selected && { color: '#EF4444' },
                ]}>
                  {isCurrentMonth ? d.getDate() : ''}
                </Text>
                {busy && isCurrentMonth && !selected && (
                  <View style={[cs.busyDot, { backgroundColor: '#EF4444' }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

export default function BookingFlow() {
  const { colors: C } = useThemeStore();
  const router = useRouter();
  const [step, setStep] = useState<Step>('client');

  // Client
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Client[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showNewClient, setShowNewClient] = useState(false);
  const [newName, setNewName] = useState('');
  const [newFirstName, setNewFirstName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [creatingClient, setCreatingClient] = useState(false);
  const [clientSubStep, setClientSubStep] = useState<'search' | 'details' | 'ready'>('search');
  const [savingDetails, setSavingDetails] = useState(false);
  // Detail fields
  const [detBirthPlace, setDetBirthPlace] = useState('');
  const [detBirthDate, setDetBirthDate] = useState('');
  const [detNationality, setDetNationality] = useState('');
  const [detLicenseNum, setDetLicenseNum] = useState('');
  const [detLicenseIssue, setDetLicenseIssue] = useState('');
  const [detLicenseExpiry, setDetLicenseExpiry] = useState('');
  const [detAddress, setDetAddress] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [docPreviews, setDocPreviews] = useState<Record<string, string>>({});
  const [webcamDocType, setWebcamDocType] = useState<string | null>(null);

  // Calendar & Schedule
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [startHour, setStartHour] = useState(8);
  const [endHour, setEndHour] = useState(18);

  // Vehicles
  const [schedule, setSchedule] = useState<VehicleSchedule[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleSchedule | null>(null);

  // Options & Payment
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'send_link'>('cash');
  const [submitting, setSubmitting] = useState(false);

  const showAlert = (t: string, m: string) => Platform.OS === 'web' ? window.alert(m) : Alert.alert(t, m);

  // Search clients
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try { const r = await api.get(`/api/admin/search-clients?q=${encodeURIComponent(searchQuery)}`); setSearchResults(r.data.clients || []); }
      catch {} finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const createClient = async () => {
    if (!newName) { showAlert('Erreur', 'Le nom est obligatoire'); return; }
    if (!newEmail) { showAlert('Erreur', "L'email est obligatoire pour envoyer les identifiants"); return; }
    setCreatingClient(true);
    try {
      const fullName = [newFirstName.trim(), newName.trim()].filter(Boolean).join(' ');
      const r = await api.post('/api/admin/quick-client', {
        name: fullName,
        phone: newPhone || null,
        email: newEmail || null,
        password: newPassword || null,
      });
      setSelectedClient(r.data.client);
      setShowNewClient(false);
      if (r.data.is_new) {
        setClientSubStep('details');
      } else {
        setClientSubStep('ready');
      }
    } catch (e: any) { showAlert('Erreur', e.response?.data?.detail || 'Erreur'); }
    finally { setCreatingClient(false); }
  };

  const saveClientDetails = async () => {
    if (!selectedClient) return;
    setSavingDetails(true);
    try {
      await api.put(`/api/admin/users/${selectedClient.id}`, {
        name: selectedClient.name,
        address: detAddress || null,
        birth_place: detBirthPlace || null,
        date_of_birth: detBirthDate || null,
        nationality: detNationality || null,
        license_number: detLicenseNum || null,
        license_issue_date: detLicenseIssue || null,
        license_expiry_date: detLicenseExpiry || null,
      });
      setClientSubStep('ready');
    } catch (e: any) { showAlert('Erreur', e.response?.data?.detail || 'Erreur sauvegarde'); }
    finally { setSavingDetails(false); }
  };

  const handleDocUpload = (docType: string) => {
    if (!selectedClient || Platform.OS !== 'web') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) { window.alert('Fichier trop volumineux (max 10 MB)'); return; }
      setUploadingDoc(docType);
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUri = ev.target?.result as string;
        setDocPreviews(p => ({ ...p, [docType]: dataUri }));
        try {
          await api.post(`/api/admin/client/${selectedClient.id}/document`, { image_data: dataUri, doc_type: docType });
        } catch (err: any) {
          window.alert(err?.response?.data?.detail || "Echec de l'upload");
          setDocPreviews(p => { const n = { ...p }; delete n[docType]; return n; });
        } finally { setUploadingDoc(null); }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleDocCamera = (docType: string) => {
    setWebcamDocType(docType);
  };

  const handleWebcamCapture = async (dataUri: string) => {
    if (!selectedClient || !webcamDocType) return;
    setUploadingDoc(webcamDocType);
    setDocPreviews(p => ({ ...p, [webcamDocType]: dataUri }));
    try {
      await api.post(`/api/admin/client/${selectedClient.id}/document`, { image_data: dataUri, doc_type: webcamDocType });
    } catch (err: any) {
      window.alert(err?.response?.data?.detail || "Echec de l'upload");
      setDocPreviews(p => { const n = { ...p }; delete n[webcamDocType!]; return n; });
    } finally { setUploadingDoc(null); setWebcamDocType(null); }
  };

  // Fetch schedule when dates change
  const fetchSchedule = useCallback(async () => {
    if (!startDate || !endDate) return;
    setLoadingSchedule(true);
    try {
      const sd = format(addDays(startDate, -7), 'yyyy-MM-dd');
      const ed = format(addDays(endDate, 7), 'yyyy-MM-dd');
      const r = await api.get(`/api/admin/vehicle-schedule?start_date=${sd}&end_date=${ed}`);
      setSchedule(r.data.vehicles || []);
    } catch {} finally { setLoadingSchedule(false); }
  }, [startDate, endDate]);

  useEffect(() => { if (startDate && endDate) fetchSchedule(); }, [fetchSchedule]);

  // Calendar date selection
  const onSelectDate = (d: Date) => {
    if (!startDate || (startDate && endDate)) {
      setStartDate(d); setEndDate(null); setSelectedVehicle(null);
    } else {
      if (isBefore(d, startDate)) { setStartDate(d); setEndDate(null); }
      else { setEndDate(d); }
    }
  };

  // Busy days for selected vehicle
  const busyDaysForVehicle = useMemo(() => {
    if (!selectedVehicle) return [];
    const days: Date[] = [];
    for (const r of selectedVehicle.reservations) {
      try {
        let cur = parseISO(r.start); const end = parseISO(r.end);
        while (cur <= end) { days.push(new Date(cur)); cur = addDays(cur, 1); }
      } catch {}
    }
    return days;
  }, [selectedVehicle]);

  // Check vehicle availability
  // Pricing
  const totalDays = startDate && endDate ? Math.max(1, differenceInDays(endDate, startDate)) : 0;
  const basePrice = selectedVehicle ? selectedVehicle.price_per_day * totalDays : 0;
  const optionsPrice = selectedVehicle?.options?.filter(o => selectedOptions.includes(o.name)).reduce((s, o) => s + o.price_per_day * totalDays, 0) || 0;
  const totalPrice = basePrice + optionsPrice;

  // Submit
  const submitReservation = async () => {
    if (!selectedClient || !selectedVehicle || !startDate || !endDate) return;
    setSubmitting(true);
    try {
      const r = await api.post('/api/admin/create-reservation-for-client', {
        client_id: selectedClient.id, vehicle_id: selectedVehicle.id,
        start_date: `${format(startDate, 'yyyy-MM-dd')}T${String(startHour).padStart(2, '0')}:00:00`,
        end_date: `${format(endDate, 'yyyy-MM-dd')}T${String(endHour).padStart(2, '0')}:00:00`,
        options: selectedOptions, payment_method: paymentMethod,
      });
      const resId = r.data.reservation?.id;
      if (paymentMethod === 'send_link') {
        try { await api.post(`/api/admin/reservations/${resId}/send-payment-link`, { origin_url: API_URL }); } catch {}
      }
      // Generate contract and navigate to it
      try {
        const contractResp = await api.post('/api/admin/contracts/generate', { reservation_id: resId, language: 'fr' });
        const contractId = contractResp.data.contract_id;
        const monthParam = startDate ? format(startDate, 'yyyy-MM') : '';
        router.push(`/agency-app/complete-contract?contract_id=${contractId}&reservation_id=${resId}&month=${monthParam}` as any);
      } catch {
        // If contract generation fails, go directly to planning
        const monthParam = startDate ? format(startDate, 'yyyy-MM') : '';
        router.push(`/agency-app/reservations?highlight=${resId}&month=${monthParam}` as any);
      }
    } catch (e: any) { showAlert('Erreur', e.response?.data?.detail || 'Erreur'); }
    finally { setSubmitting(false); }
  };

  const resetFlow = () => {
    setStep('client'); setSelectedClient(null); setStartDate(null); setEndDate(null);
    setSelectedVehicle(null); setSelectedOptions([]); setPaymentMethod('cash');
    setSubmitting(false); setSearchQuery(''); setSearchResults([]);
    setStartHour(8); setEndHour(18);
  };

  const month2 = addMonths(calendarMonth, 1);

  // ─── SUCCESS ───
  return (
    <>
    <ScrollView style={[s.container, { backgroundColor: C.bg }]} contentContainerStyle={s.content}>
      {/* Steps */}
      <View style={[s.stepsBar, { backgroundColor: C.card, borderColor: C.border }]}>
        {(['client', 'calendar', 'vehicle', 'options', 'confirm'] as Step[]).map((st, i) => {
          const labels = ['Client', 'Dates', 'Véhicule', 'Options', 'Confirmer'];
          const icons: any[] = ['person', 'calendar', 'car-sport', 'settings', 'checkmark'];
          const curIdx = ['client', 'calendar', 'vehicle', 'options', 'confirm'].indexOf(step);
          const active = step === st;
          const past = curIdx > i;
          return (
            <TouchableOpacity key={st} style={s.stepItem} onPress={() => past && setStep(st)}>
              <View style={[s.stepDot, { backgroundColor: (active || past) ? C.accent : C.border }]}>
                <Ionicons name={icons[i]} size={14} color={(active || past) ? '#fff' : C.textLight} />
              </View>
              <Text style={[s.stepLabel, { color: (active || past) ? C.accent : C.textLight }]}>{labels[i]}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ─── STEP 1: Client ─── */}
      {step === 'client' && (
        <View>
          <Text style={[s.title, { color: C.text }]}>Selectionner un client</Text>

          {/* Sub-step: Search or Create */}
          {clientSubStep === 'search' && !selectedClient && (
            <>
              <View style={[s.searchRow, { backgroundColor: C.card, borderColor: C.border }]}>
                <Ionicons name="search" size={18} color={C.textLight} />
                <TextInput style={[s.searchInput, { color: C.text }]} placeholder="Rechercher nom, email, tel..." placeholderTextColor={C.textLight} value={searchQuery} onChangeText={setSearchQuery} />
                {searching && <ActivityIndicator size="small" color={C.accent} />}
              </View>
              {searchResults.map(c => (
                <TouchableOpacity key={c.id} style={[s.clientCard, { backgroundColor: C.card, borderColor: C.border }]} onPress={() => { setSelectedClient(c); setClientSubStep('ready'); }}>
                  <Ionicons name="person-circle" size={30} color={C.accent} />
                  <View style={{ flex: 1 }}><Text style={{ color: C.text, fontWeight: '600', fontSize: 14 }}>{c.display_name || c.name}</Text><Text style={{ color: C.textLight, fontSize: 12 }}>{c.email}</Text></View>
                  <Ionicons name="chevron-forward" size={18} color={C.textLight} />
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 }} onPress={() => setShowNewClient(!showNewClient)}>
                <Ionicons name={showNewClient ? 'chevron-up' : 'person-add'} size={18} color={C.accent} />
                <Text style={{ color: C.accent, fontWeight: '600' }}>{showNewClient ? 'Masquer' : 'Nouveau client'}</Text>
              </TouchableOpacity>
              {showNewClient && (
                <View style={[s.newForm, { backgroundColor: C.card, borderColor: C.border }]}>
                  <Text style={{ color: C.text, fontWeight: '700', fontSize: 15, marginBottom: 8 }}>Etape 1 : Informations de base</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput style={[s.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border, flex: 1 }]} placeholder="Nom *" placeholderTextColor={C.textLight} value={newName} onChangeText={setNewName} data-testid="book-new-name" />
                    <TextInput style={[s.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border, flex: 1 }]} placeholder="Prenom" placeholderTextColor={C.textLight} value={newFirstName} onChangeText={setNewFirstName} data-testid="book-new-firstname" />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput style={[s.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border, flex: 1 }]} placeholder="Email *" placeholderTextColor={C.textLight} value={newEmail} onChangeText={setNewEmail} autoCapitalize="none" keyboardType="email-address" data-testid="book-new-email" />
                    <TextInput style={[s.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border, flex: 1 }]} placeholder="Telephone" placeholderTextColor={C.textLight} value={newPhone} onChangeText={setNewPhone} keyboardType="phone-pad" data-testid="book-new-phone" />
                  </View>
                  <Text style={{ color: C.textLight, fontSize: 11, marginBottom: 8 }}>Un email de bienvenue avec les identifiants sera envoye automatiquement</Text>
                  <TouchableOpacity style={[s.primaryBtn, { backgroundColor: C.primary }]} onPress={createClient} disabled={creatingClient}>
                    <Text style={s.btnText}>{creatingClient ? 'Creation...' : 'Creer et continuer'}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          {/* Sub-step: Complete client details */}
          {clientSubStep === 'details' && selectedClient && (
            <View style={[s.newForm, { backgroundColor: C.card, borderColor: C.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="checkmark" size={18} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#10B981', fontWeight: '700', fontSize: 14 }}>Client cree - Email de bienvenue envoye</Text>
                  <Text style={{ color: C.textLight, fontSize: 12 }}>{selectedClient.name} ({newEmail})</Text>
                </View>
              </View>

              {/* Section: Identite & Permis */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.border }}>
                <Ionicons name="id-card" size={16} color={C.accent} />
                <Text style={{ color: C.text, fontWeight: '700', fontSize: 14 }}>Identite & Permis</Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.textLight, fontSize: 10, fontWeight: '700', marginBottom: 3, textTransform: 'uppercase' }}>LIEU DE NAISSANCE *</Text>
                  <TextInput style={[s.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]} placeholder="Geneve" placeholderTextColor={C.textLight} value={detBirthPlace} onChangeText={setDetBirthPlace} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.textLight, fontSize: 10, fontWeight: '700', marginBottom: 3, textTransform: 'uppercase' }}>DATE DE NAISSANCE *</Text>
                  <TextInput style={[s.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]} placeholder="JJ-MM-AAAA" placeholderTextColor={C.textLight} value={detBirthDate} onChangeText={setDetBirthDate} />
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.textLight, fontSize: 10, fontWeight: '700', marginBottom: 3, textTransform: 'uppercase' }}>NATIONALITE *</Text>
                  <TextInput style={[s.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]} placeholder="Suisse" placeholderTextColor={C.textLight} value={detNationality} onChangeText={setDetNationality} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.textLight, fontSize: 10, fontWeight: '700', marginBottom: 3, textTransform: 'uppercase' }}>NUMERO DE PERMIS *</Text>
                  <TextInput style={[s.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]} placeholder="GE-123456" placeholderTextColor={C.textLight} value={detLicenseNum} onChangeText={setDetLicenseNum} />
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.textLight, fontSize: 10, fontWeight: '700', marginBottom: 3, textTransform: 'uppercase' }}>DATE D'EMISSION *</Text>
                  <TextInput style={[s.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]} placeholder="JJ-MM-AAAA" placeholderTextColor={C.textLight} value={detLicenseIssue} onChangeText={setDetLicenseIssue} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.textLight, fontSize: 10, fontWeight: '700', marginBottom: 3, textTransform: 'uppercase' }}>DATE D'EXPIRATION *</Text>
                  <TextInput style={[s.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]} placeholder="JJ-MM-AAAA" placeholderTextColor={C.textLight} value={detLicenseExpiry} onChangeText={setDetLicenseExpiry} />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.textLight, fontSize: 10, fontWeight: '700', marginBottom: 3, textTransform: 'uppercase' }}>ADRESSE</Text>
                <TextInput style={[s.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]} placeholder="Rue de l'Exemple 10, Lausanne" placeholderTextColor={C.textLight} value={detAddress} onChangeText={setDetAddress} />
              </View>

              {/* Section: Documents (Photos) */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, marginBottom: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.border }}>
                <Ionicons name="document-attach" size={16} color={C.accent} />
                <Text style={{ color: C.text, fontWeight: '700', fontSize: 14 }}>Documents (Photos)</Text>
              </View>

              <Text style={{ color: C.textLight, fontSize: 10, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' }}>PIECE D'IDENTITE</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                {[{ key: 'id', label: 'Recto' }, { key: 'id_back', label: 'Verso' }].map(doc => (
                  <View key={doc.key} style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ color: C.textLight, fontSize: 11, marginBottom: 4 }}>{doc.label}</Text>
                    {docPreviews[doc.key] ? (
                      <Image source={{ uri: docPreviews[doc.key] }} style={{ width: '100%', height: 80, borderRadius: 8 }} resizeMode="cover" />
                    ) : (
                      <View style={{ width: '100%', height: 80, borderRadius: 8, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed' }}>
                        <Ionicons name="card-outline" size={22} color="#9CA3AF" />
                      </View>
                    )}
                    {uploadingDoc === doc.key ? <ActivityIndicator size="small" color="#7C3AED" style={{ marginTop: 6 }} /> : (
                      <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                        <TouchableOpacity style={{ backgroundColor: '#7C3AED', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }} onPress={() => handleDocCamera(doc.key)}>
                          <Ionicons name="camera" size={12} color="#FFF" />
                          <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '600' }}>Photo</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={{ backgroundColor: '#EDE9FE', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }} onPress={() => handleDocUpload(doc.key)}>
                          <Ionicons name="folder-open" size={12} color="#7C3AED" />
                          <Text style={{ color: '#7C3AED', fontSize: 10, fontWeight: '600' }}>Fichier</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
              </View>

              <Text style={{ color: C.textLight, fontSize: 10, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' }}>PERMIS DE CONDUIRE</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
                {[{ key: 'license', label: 'Recto' }, { key: 'license_back', label: 'Verso' }].map(doc => (
                  <View key={doc.key} style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ color: C.textLight, fontSize: 11, marginBottom: 4 }}>{doc.label}</Text>
                    {docPreviews[doc.key] ? (
                      <Image source={{ uri: docPreviews[doc.key] }} style={{ width: '100%', height: 80, borderRadius: 8 }} resizeMode="cover" />
                    ) : (
                      <View style={{ width: '100%', height: 80, borderRadius: 8, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed' }}>
                        <Ionicons name="id-card-outline" size={22} color="#9CA3AF" />
                      </View>
                    )}
                    {uploadingDoc === doc.key ? <ActivityIndicator size="small" color="#7C3AED" style={{ marginTop: 6 }} /> : (
                      <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                        <TouchableOpacity style={{ backgroundColor: '#7C3AED', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }} onPress={() => handleDocCamera(doc.key)}>
                          <Ionicons name="camera" size={12} color="#FFF" />
                          <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '600' }}>Photo</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={{ backgroundColor: '#EDE9FE', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }} onPress={() => handleDocUpload(doc.key)}>
                          <Ionicons name="folder-open" size={12} color="#7C3AED" />
                          <Text style={{ color: '#7C3AED', fontSize: 10, fontWeight: '600' }}>Fichier</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
              </View>
              <Text style={{ color: C.textLight, fontSize: 10, marginBottom: 8 }}>Formats acceptes: JPG, PNG, WebP (max 10 MB). Verification IA automatique.</Text>

              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <TouchableOpacity style={[s.primaryBtn, { backgroundColor: C.border, flex: 1 }]} onPress={() => setClientSubStep('ready')}>
                  <Text style={[s.btnText, { color: C.text }]}>Passer</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.primaryBtn, { backgroundColor: C.primary, flex: 1 }]} onPress={saveClientDetails} disabled={savingDetails}>
                  <Text style={s.btnText}>{savingDetails ? 'Sauvegarde...' : 'Valider et continuer'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Sub-step: Client ready - proceed */}
          {clientSubStep === 'ready' && selectedClient && (
            <View style={[s.newForm, { backgroundColor: C.card, borderColor: C.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.accent + '15', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="person" size={22} color={C.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, fontWeight: '700', fontSize: 16 }}>{selectedClient.name}</Text>
                  <Text style={{ color: C.textLight, fontSize: 13 }}>{selectedClient.email}</Text>
                </View>
                <TouchableOpacity onPress={() => { setSelectedClient(null); setClientSubStep('search'); setShowNewClient(false); }}>
                  <Text style={{ color: C.accent, fontSize: 13, fontWeight: '600' }}>Changer</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={[s.primaryBtn, { backgroundColor: C.primary, marginTop: 12 }]} onPress={() => setStep('calendar')}>
                <Text style={s.btnText}>Suivant : Choisir les dates</Text><Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* ─── STEP 2: Calendar ─── */}
      {step === 'calendar' && (
        <View>
          <Text style={[s.title, { color: C.text }]}>Choisissez vos dates</Text>

          {/* Date summary bar */}
          <View style={[s.dateSummaryBar, { backgroundColor: C.card, borderColor: C.border }]}>
            <TouchableOpacity style={[s.dateSummaryItem, startDate && !endDate && { borderColor: C.accent, borderWidth: 2 }]} onPress={() => { setStartDate(null); setEndDate(null); }}>
              <Text style={{ color: C.textLight, fontSize: 11, fontWeight: '600' }}>DÉBUT</Text>
              <Text style={[s.dateSummaryText, { color: startDate ? C.text : C.textLight }]}>{startDate ? format(startDate, 'd MMM yyyy', { locale: fr }) : 'Sélectionner'}</Text>
            </TouchableOpacity>
            <Ionicons name="arrow-forward" size={18} color={C.textLight} />
            <TouchableOpacity style={[s.dateSummaryItem, startDate && endDate && { borderColor: C.accent, borderWidth: 2 }]}>
              <Text style={{ color: C.textLight, fontSize: 11, fontWeight: '600' }}>FIN</Text>
              <Text style={[s.dateSummaryText, { color: endDate ? C.text : C.textLight }]}>{endDate ? format(endDate, 'd MMM yyyy', { locale: fr }) : 'Sélectionner'}</Text>
            </TouchableOpacity>
          </View>

          {/* Month navigation */}
          <View style={s.monthNav}>
            <TouchableOpacity onPress={() => setCalendarMonth(addMonths(calendarMonth, -1))} data-testid="prev-month">
              <Ionicons name="chevron-back" size={24} color={C.accent} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setCalendarMonth(addMonths(calendarMonth, 1))} data-testid="next-month">
              <Ionicons name="chevron-forward" size={24} color={C.accent} />
            </TouchableOpacity>
          </View>

          {/* Two months calendar */}
          <View style={s.calendarGrid}>
            <CalendarMonth month={calendarMonth} startDate={startDate} endDate={endDate} onSelectDate={onSelectDate} busyDays={busyDaysForVehicle} colors={C} />
            <CalendarMonth month={month2} startDate={startDate} endDate={endDate} onSelectDate={onSelectDate} busyDays={busyDaysForVehicle} colors={C} />
          </View>

          {/* Hour selectors */}
          {startDate && endDate && (
            <View style={[s.hourSection, { backgroundColor: C.card, borderColor: C.border }]}>
              <View style={s.hourGroup}>
                <Text style={{ color: C.textLight, fontSize: 12, fontWeight: '600', marginBottom: 6 }}>Heure de début</Text>
                <View style={[s.hourControl, { backgroundColor: C.bg, borderColor: C.border }]}>
                  <TouchableOpacity onPress={() => setStartHour(Math.max(0, startHour - 1))}><Ionicons name="remove-circle" size={26} color={C.textLight} /></TouchableOpacity>
                  <Text style={[s.hourValue, { color: C.text }]}>{String(startHour).padStart(2, '0')}:00</Text>
                  <TouchableOpacity onPress={() => setStartHour(Math.min(23, startHour + 1))}><Ionicons name="add-circle" size={26} color={C.accent} /></TouchableOpacity>
                </View>
              </View>
              <View style={s.hourGroup}>
                <Text style={{ color: C.textLight, fontSize: 12, fontWeight: '600', marginBottom: 6 }}>Heure de fin</Text>
                <View style={[s.hourControl, { backgroundColor: C.bg, borderColor: C.border }]}>
                  <TouchableOpacity onPress={() => setEndHour(Math.max(0, endHour - 1))}><Ionicons name="remove-circle" size={26} color={C.textLight} /></TouchableOpacity>
                  <Text style={[s.hourValue, { color: C.text }]}>{String(endHour).padStart(2, '0')}:00</Text>
                  <TouchableOpacity onPress={() => setEndHour(Math.min(23, endHour + 1))}><Ionicons name="add-circle" size={26} color={C.accent} /></TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Duration info */}
          {startDate && endDate && totalDays > 0 && (
            <View style={[s.durationBadge, { backgroundColor: C.accent + '12' }]}>
              <Ionicons name="time" size={16} color={C.accent} />
              <Text style={{ color: C.accent, fontWeight: '700', fontSize: 13 }}>{totalDays} jour(s) de location</Text>
            </View>
          )}

          {/* Next to Vehicle step */}
          {startDate && endDate && totalDays > 0 && (
            <TouchableOpacity style={[s.primaryBtn, { backgroundColor: C.primary, marginTop: 16 }]} onPress={() => setStep('vehicle')}>
              <Text style={s.btnText}>Suivant : Choisir un véhicule</Text><Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ─── STEP 3: Vehicle Selection ─── */}
      {step === 'vehicle' && (
        <View>
          <Text style={[s.title, { color: C.text }]}>Choisir un véhicule</Text>

          {/* Date recap */}
          <View style={[s.dateRecap, { backgroundColor: C.accent + '10', borderColor: C.accent + '30' }]}>
            <Ionicons name="calendar" size={16} color={C.accent} />
            <Text style={{ color: C.accent, fontSize: 13, fontWeight: '600' }}>
              {startDate && format(startDate, 'd MMM', { locale: fr })} - {endDate && format(endDate, 'd MMM yyyy', { locale: fr })} ({totalDays}j)
            </Text>
            <TouchableOpacity onPress={() => setStep('calendar')}><Text style={{ color: C.textLight, fontSize: 11, textDecorationLine: 'underline' }}>Modifier</Text></TouchableOpacity>
          </View>

          {loadingSchedule ? <ActivityIndicator size="large" color={C.accent} style={{ marginTop: 20 }} /> : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {schedule.map(v => {
                const selected = selectedVehicle?.id === v.id;
                const cardWidth = (Dimensions.get('window').width - 32 - 30) / 4;
                // Check if vehicle has overlapping reservation with selected dates
                const isBooked = startDate && endDate && v.reservations?.some((r: any) => {
                  try {
                    const rs = parseISO(r.start);
                    const re = parseISO(r.end);
                    return rs < endDate && re > startDate && ['pending', 'pending_cash', 'confirmed', 'active'].includes(r.status);
                  } catch { return false; }
                });
                return (
                  <TouchableOpacity
                    key={v.id}
                    style={[
                      {
                        width: cardWidth,
                        borderRadius: 10,
                        borderWidth: selected ? 2 : 1,
                        borderColor: isBooked ? '#EF4444' + '60' : selected ? C.accent : C.border,
                        backgroundColor: isBooked ? '#FEE2E2' + '30' : C.card,
                        overflow: 'hidden',
                        opacity: isBooked ? 0.6 : 1,
                      },
                    ]}
                    onPress={() => { if (!isBooked) setSelectedVehicle(v); else { Platform.OS === 'web' ? window.alert('Ce vehicule est deja reserve pour ces dates') : Alert.alert('Indisponible', 'Ce vehicule est deja reserve pour ces dates'); } }}
                    data-testid={`vehicle-${v.id}`}
                  >
                    {/* Photo placeholder */}
                    <View style={{ width: '100%', height: 70, backgroundColor: C.border + '30', justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name="car-sport" size={26} color={isBooked ? '#EF4444' : C.accent} />
                      {selected && (
                        <View style={{ position: 'absolute', top: 3, right: 3, width: 20, height: 20, borderRadius: 10, backgroundColor: C.accent, justifyContent: 'center', alignItems: 'center' }}>
                          <Ionicons name="checkmark" size={14} color="#fff" />
                        </View>
                      )}
                      {isBooked && (
                        <View style={{ position: 'absolute', top: 3, left: 3, backgroundColor: '#EF4444', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ color: '#fff', fontSize: 8, fontWeight: '800' }}>RESERVE</Text>
                        </View>
                      )}
                    </View>
                    {/* Info */}
                    <View style={{ padding: 6 }}>
                      <Text style={{ color: C.text, fontSize: 11, fontWeight: '800' }} numberOfLines={1}>{v.brand} {v.model}</Text>
                      <Text style={{ color: C.textLight, fontSize: 9, marginTop: 1 }}>{v.type} | {v.seats}pl</Text>
                      <Text style={{ color: C.textLight, fontSize: 9 }}>{v.transmission === 'automatic' ? 'Auto' : 'Manuel'}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2, marginTop: 4 }}>
                        <Text style={{ color: C.accent, fontSize: 13, fontWeight: '800' }}>CHF {v.price_per_day}</Text>
                        <Text style={{ color: C.textLight, fontSize: 8 }}>/j</Text>
                      </View>
                      {selected && totalDays > 0 && (
                        <View style={{ marginTop: 4, paddingVertical: 3, borderRadius: 5, backgroundColor: C.accent + '12' }}>
                          <Text style={{ color: C.accent, fontSize: 9, fontWeight: '700', textAlign: 'center' }}>Total: CHF {(v.price_per_day * totalDays).toFixed(0)}</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Next */}
          {selectedVehicle && (
            <View style={{ position: 'sticky' as any, bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 20, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.border, marginHorizontal: -20, marginBottom: -20, marginTop: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <View>
                  <Text style={{ color: C.text, fontSize: 14, fontWeight: '700' }}>{selectedVehicle.brand} {selectedVehicle.model}</Text>
                  <Text style={{ color: C.textLight, fontSize: 11 }}>{totalDays}j x CHF {selectedVehicle.price_per_day}</Text>
                </View>
                <Text style={{ color: C.accent, fontSize: 18, fontWeight: '800' }}>CHF {(selectedVehicle.price_per_day * totalDays).toFixed(0)}</Text>
              </View>
              <TouchableOpacity style={[s.primaryBtn, { backgroundColor: C.primary }]} onPress={() => setStep('options')} data-testid="next-to-options">
                <Text style={s.btnText}>Suivant : Options & Paiement</Text><Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* ─── STEP 4: Options & Payment ─── */}
      {step === 'options' && selectedVehicle && (
        <View>
          <Text style={[s.title, { color: C.text }]}>Options & Paiement</Text>
          {(selectedVehicle.options || []).length > 0 && (
            <>
              <Text style={[s.sectionTitle, { color: C.text }]}>Options disponibles</Text>
              {selectedVehicle.options!.map((opt: any) => (
                <TouchableOpacity key={opt.name} style={[s.optionCard, { backgroundColor: C.card, borderColor: selectedOptions.includes(opt.name) ? C.success : C.border }]} onPress={() => setSelectedOptions(p => p.includes(opt.name) ? p.filter(o => o !== opt.name) : [...p, opt.name])}>
                  <Ionicons name={selectedOptions.includes(opt.name) ? 'checkbox' : 'square-outline'} size={22} color={selectedOptions.includes(opt.name) ? C.success : C.textLight} />
                  <Text style={{ flex: 1, color: C.text, fontSize: 14 }}>{opt.name}</Text>
                  <Text style={{ color: C.accent, fontSize: 12 }}>+CHF {opt.price_per_day}/j</Text>
                </TouchableOpacity>
              ))}
            </>
          )}
          <Text style={[s.sectionTitle, { color: C.text, marginTop: 16 }]}>Mode de paiement</Text>
          <TouchableOpacity style={[s.payCard, { backgroundColor: C.card, borderColor: paymentMethod === 'cash' ? C.warning : C.border }]} onPress={() => setPaymentMethod('cash')}>
            <Ionicons name="cash" size={24} color={paymentMethod === 'cash' ? C.warning : C.textLight} />
            <View style={{ flex: 1 }}><Text style={{ color: C.text, fontWeight: '700', fontSize: 14 }}>Espèces</Text><Text style={{ color: C.textLight, fontSize: 11 }}>Le client paie au retrait</Text></View>
            {paymentMethod === 'cash' && <Ionicons name="checkmark-circle" size={22} color={C.success} />}
          </TouchableOpacity>
          <TouchableOpacity style={[s.payCard, { backgroundColor: C.card, borderColor: paymentMethod === 'send_link' ? C.accent : C.border }]} onPress={() => setPaymentMethod('send_link')}>
            <Ionicons name="link" size={24} color={paymentMethod === 'send_link' ? C.accent : C.textLight} />
            <View style={{ flex: 1 }}><Text style={{ color: C.text, fontWeight: '700', fontSize: 14 }}>Lien Stripe</Text><Text style={{ color: C.textLight, fontSize: 11 }}>Envoyé par email</Text></View>
            {paymentMethod === 'send_link' && <Ionicons name="checkmark-circle" size={22} color={C.success} />}
          </TouchableOpacity>
          <TouchableOpacity style={[s.primaryBtn, { backgroundColor: C.primary, marginTop: 16 }]} onPress={() => setStep('confirm')}>
            <Text style={s.btnText}>Voir le récapitulatif</Text><Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* ─── STEP 5: Confirm ─── */}
      {step === 'confirm' && selectedClient && selectedVehicle && startDate && endDate && (
        <View>
          <Text style={[s.title, { color: C.text }]}>Récapitulatif</Text>
          <View style={[s.summaryCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <SummaryRow label="Client" value={selectedClient.name} C={C} />
            <SummaryRow label="Véhicule" value={`${selectedVehicle.brand} ${selectedVehicle.model}`} C={C} />
            <SummaryRow label="Début" value={`${format(startDate, 'd MMM yyyy', { locale: fr })} à ${String(startHour).padStart(2, '0')}:00`} C={C} />
            <SummaryRow label="Fin" value={`${format(endDate, 'd MMM yyyy', { locale: fr })} à ${String(endHour).padStart(2, '0')}:00`} C={C} />
            <SummaryRow label="Durée" value={`${totalDays} jour(s)`} C={C} />
            <SummaryRow label="Prix base" value={`CHF ${basePrice.toFixed(2)}`} C={C} />
            {optionsPrice > 0 && <SummaryRow label="Options" value={`CHF ${optionsPrice.toFixed(2)}`} C={C} />}
            <View style={[s.divider, { backgroundColor: C.border }]} />
            <View style={s.summaryRow}><Text style={{ color: C.text, fontSize: 15, fontWeight: '800' }}>Total</Text><Text style={{ color: C.accent, fontSize: 22, fontWeight: '800' }}>CHF {totalPrice.toFixed(2)}</Text></View>
            <SummaryRow label="Paiement" value={paymentMethod === 'cash' ? 'Espèces' : 'Lien Stripe'} C={C} />
          </View>
          <TouchableOpacity style={[s.confirmBtn, { backgroundColor: C.success }, submitting && { opacity: 0.6 }]} onPress={submitReservation} disabled={submitting} data-testid="confirm-btn">
            {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="checkmark-circle" size={22} color="#fff" />}
            <Text style={s.btnText}>{submitting ? 'Création...' : 'Confirmer la réservation'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>

    <WebcamCapture
      visible={!!webcamDocType}
      onClose={() => setWebcamDocType(null)}
      onCapture={handleWebcamCapture}
      title={webcamDocType?.includes('id') ? "Photographier la piece d'identite" : "Photographier le permis de conduire"}
    />
    </>
  );
}

function SummaryRow({ label, value, C }: { label: string; value: string; C: any }) {
  return <View style={s.summaryRow}><Text style={{ color: C.textLight, fontSize: 13 }}>{label}</Text><Text style={{ color: C.text, fontSize: 13, fontWeight: '600' }}>{value}</Text></View>;
}

const cs = StyleSheet.create({
  monthContainer: { flex: 1, minWidth: 260 },
  monthTitle: { fontSize: 16, fontWeight: '800', textAlign: 'center', marginBottom: 10, textTransform: 'capitalize' },
  weekdayRow: { flexDirection: 'row' },
  weekdayText: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', marginBottom: 6 },
  weekRow: { flexDirection: 'row' },
  dayCell: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 40, borderRadius: 20 },
  dayText: { fontSize: 14, fontWeight: '500' },
  busyDot: { width: 5, height: 5, borderRadius: 3, position: 'absolute', bottom: 3 },
});

const s = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  stepsBar: { flexDirection: 'row', justifyContent: 'space-between', borderRadius: 12, padding: 12, borderWidth: 1, marginBottom: 20 },
  stepItem: { alignItems: 'center', gap: 4, flex: 1 },
  stepDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stepLabel: { fontSize: 10, fontWeight: '700' },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  searchRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 12, gap: 8, borderWidth: 1, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 12 },
  clientCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1 },
  selectedBox: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 10, padding: 14, marginBottom: 16, borderWidth: 1 },
  selName: { fontSize: 15, fontWeight: '700' },
  newForm: { borderRadius: 10, padding: 14, gap: 10, borderWidth: 1, marginBottom: 16 },
  input: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, borderWidth: 1 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 14 },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 16, marginTop: 16 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  dateSummaryBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 16 },
  dateSummaryItem: { flex: 1, alignItems: 'center', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: 'transparent' },
  dateSummaryText: { fontSize: 15, fontWeight: '700', marginTop: 4 },
  monthNav: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 4 },
  calendarGrid: { flexDirection: 'row', gap: 24, marginBottom: 16 },
  hourSection: { flexDirection: 'row', gap: 16, borderRadius: 12, padding: 16, borderWidth: 1, marginBottom: 12 },
  hourGroup: { flex: 1, alignItems: 'center' },
  hourControl: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
  hourValue: { fontSize: 18, fontWeight: '800', minWidth: 50, textAlign: 'center' },
  durationBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, alignSelf: 'flex-start' },
  dateRecap: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 14 },
  legendRow: { flexDirection: 'row', gap: 16, marginBottom: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  vehicleCard: { borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1 },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  vehicleName: { fontSize: 15, fontWeight: '700' },
  occupiedTag: { position: 'absolute', top: 0, right: 0, backgroundColor: '#EF444415', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  priceSummary: { marginTop: 10, padding: 10, borderRadius: 8 },
  optionCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 8, padding: 12, marginBottom: 8, borderWidth: 1 },
  payCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1.5 },
  summaryCard: { borderRadius: 12, padding: 16, borderWidth: 1, marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  divider: { height: 1, marginVertical: 8 },
  successTitle: { fontSize: 24, fontWeight: '800', marginTop: 16, marginBottom: 8 },
});
