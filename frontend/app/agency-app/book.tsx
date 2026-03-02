import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api/axios';
import { format, addMonths, startOfMonth, endOfMonth, startOfWeek, addDays, isSameDay, isBefore, isAfter, parseISO, differenceInDays, isWithinInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useThemeStore } from '../../src/store/themeStore';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Client { id: string; name: string; email: string; phone?: string; }
interface VehicleSlot { id: string; user_name: string; start: string; end: string; status: string; }
interface VehicleSchedule { id: string; brand: string; model: string; price_per_day: number; type: string; seats: number; transmission: string; fuel_type: string; options?: any[]; reservations: VehicleSlot[]; }

type Step = 'client' | 'calendar' | 'options' | 'confirm';

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
  const [success, setSuccess] = useState(false);

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
    setCreatingClient(true);
    try {
      const r = await api.post('/api/admin/quick-client', { name: newName, phone: newPhone || null, email: newEmail || null });
      setSelectedClient(r.data.client); setShowNewClient(false); setStep('calendar');
    } catch (e: any) { showAlert('Erreur', e.response?.data?.detail || 'Erreur'); }
    finally { setCreatingClient(false); }
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
  const isVehicleFree = (v: VehicleSchedule) => {
    if (!startDate || !endDate) return true;
    const sd = startDate.getTime();
    const ed = endDate.getTime();
    for (const r of v.reservations) {
      try {
        const rs = parseISO(r.start).getTime();
        const re = parseISO(r.end).getTime();
        if (sd < re && ed > rs) return false;
      } catch {}
    }
    return true;
  };

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
      if (paymentMethod === 'send_link') {
        try { await api.post(`/api/admin/reservations/${r.data.reservation.id}/send-payment-link`, { origin_url: API_URL }); } catch {}
      }
      setSuccess(true);
    } catch (e: any) { showAlert('Erreur', e.response?.data?.detail || 'Erreur'); }
    finally { setSubmitting(false); }
  };

  const resetFlow = () => {
    setStep('client'); setSelectedClient(null); setStartDate(null); setEndDate(null);
    setSelectedVehicle(null); setSelectedOptions([]); setPaymentMethod('cash');
    setSuccess(false); setSearchQuery(''); setSearchResults([]);
    setStartHour(8); setEndHour(18);
  };

  const month2 = addMonths(calendarMonth, 1);

  // ─── SUCCESS ───
  if (success) {
    return (
      <ScrollView style={[s.container, { backgroundColor: C.bg }]} contentContainerStyle={[s.content, { alignItems: 'center', paddingTop: 60 }]}>
        <Ionicons name="checkmark-circle" size={64} color={C.success} />
        <Text style={[s.successTitle, { color: C.text }]}>Réservation créée !</Text>
        <Text style={{ color: C.textLight, fontSize: 15, marginBottom: 4 }}>{selectedVehicle?.brand} {selectedVehicle?.model} pour {selectedClient?.name}</Text>
        <Text style={{ color: C.accent, fontSize: 28, fontWeight: '800', marginVertical: 12 }}>CHF {totalPrice.toFixed(2)}</Text>
        <TouchableOpacity style={[s.primaryBtn, { backgroundColor: C.primary }]} onPress={resetFlow}><Text style={s.btnText}>Nouvelle réservation</Text></TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={[s.container, { backgroundColor: C.bg }]} contentContainerStyle={s.content}>
      {/* Steps */}
      <View style={[s.stepsBar, { backgroundColor: C.card, borderColor: C.border }]}>
        {(['client', 'calendar', 'options', 'confirm'] as Step[]).map((st, i) => {
          const labels = ['Client', 'Dates & Véhicule', 'Options', 'Confirmer'];
          const icons: any[] = ['person', 'calendar', 'settings', 'checkmark'];
          const curIdx = ['client', 'calendar', 'options', 'confirm'].indexOf(step);
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
          <Text style={[s.title, { color: C.text }]}>Sélectionner un client</Text>
          {selectedClient ? (
            <View style={[s.selectedBox, { backgroundColor: C.accent + '12', borderColor: C.accent + '30' }]}>
              <Ionicons name="person-circle" size={32} color={C.accent} />
              <View style={{ flex: 1 }}><Text style={[s.selName, { color: C.text }]}>{selectedClient.name}</Text><Text style={{ color: C.textLight, fontSize: 12 }}>{selectedClient.email}</Text></View>
              <TouchableOpacity onPress={() => setSelectedClient(null)}><Ionicons name="close-circle" size={22} color={C.error} /></TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={[s.searchRow, { backgroundColor: C.card, borderColor: C.border }]}>
                <Ionicons name="search" size={18} color={C.textLight} />
                <TextInput style={[s.searchInput, { color: C.text }]} placeholder="Rechercher nom, email, tél..." placeholderTextColor={C.textLight} value={searchQuery} onChangeText={setSearchQuery} />
                {searching && <ActivityIndicator size="small" color={C.accent} />}
              </View>
              {searchResults.map(c => (
                <TouchableOpacity key={c.id} style={[s.clientCard, { backgroundColor: C.card, borderColor: C.border }]} onPress={() => { setSelectedClient(c); setStep('calendar'); }}>
                  <Ionicons name="person-circle" size={30} color={C.accent} />
                  <View style={{ flex: 1 }}><Text style={{ color: C.text, fontWeight: '600', fontSize: 14 }}>{c.name}</Text><Text style={{ color: C.textLight, fontSize: 12 }}>{c.email}</Text></View>
                  <Ionicons name="chevron-forward" size={18} color={C.textLight} />
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 }} onPress={() => setShowNewClient(!showNewClient)}>
                <Ionicons name={showNewClient ? 'chevron-up' : 'person-add'} size={18} color={C.accent} />
                <Text style={{ color: C.accent, fontWeight: '600' }}>{showNewClient ? 'Masquer' : 'Nouveau client'}</Text>
              </TouchableOpacity>
              {showNewClient && (
                <View style={[s.newForm, { backgroundColor: C.card, borderColor: C.border }]}>
                  <TextInput style={[s.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]} placeholder="Nom *" placeholderTextColor={C.textLight} value={newName} onChangeText={setNewName} />
                  <TextInput style={[s.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]} placeholder="Téléphone" placeholderTextColor={C.textLight} value={newPhone} onChangeText={setNewPhone} />
                  <TextInput style={[s.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]} placeholder="Email" placeholderTextColor={C.textLight} value={newEmail} onChangeText={setNewEmail} autoCapitalize="none" />
                  <TouchableOpacity style={[s.primaryBtn, { backgroundColor: C.primary }]} onPress={createClient} disabled={creatingClient}>
                    <Text style={s.btnText}>{creatingClient ? 'Création...' : 'Créer et continuer'}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
          {selectedClient && (
            <TouchableOpacity style={[s.primaryBtn, { backgroundColor: C.primary }]} onPress={() => setStep('calendar')}>
              <Text style={s.btnText}>Suivant</Text><Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ─── STEP 2: Calendar & Vehicle ─── */}
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

          {/* Vehicle selection */}
          {startDate && endDate && (
            <View style={{ marginTop: 16 }}>
              <Text style={[s.sectionTitle, { color: C.text }]}>Choisir un véhicule</Text>
              <View style={s.legendRow}>
                <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: '#10B981' }]} /><Text style={{ color: C.textLight, fontSize: 11 }}>Disponible</Text></View>
                <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: '#EF4444' }]} /><Text style={{ color: C.textLight, fontSize: 11 }}>Occupé</Text></View>
              </View>
              {loadingSchedule ? <ActivityIndicator size="large" color={C.accent} style={{ marginTop: 20 }} /> : (
                schedule.map(v => {
                  const free = isVehicleFree(v);
                  const selected = selectedVehicle?.id === v.id;
                  return (
                    <TouchableOpacity
                      key={v.id}
                      style={[
                        s.vehicleCard,
                        { backgroundColor: C.card, borderColor: selected ? C.accent : C.border },
                        selected && { borderWidth: 2 },
                        !free && { opacity: 0.5 },
                      ]}
                      onPress={() => free ? setSelectedVehicle(v) : showAlert('Indisponible', 'Ce véhicule est occupé pour ces dates')}
                      data-testid={`vehicle-${v.id}`}
                    >
                      <View style={s.vehicleRow}>
                        <Ionicons name="car-sport" size={24} color={free ? C.accent : '#EF4444'} />
                        <View style={{ flex: 1 }}>
                          <Text style={[s.vehicleName, { color: C.text }]}>{v.brand} {v.model}</Text>
                          <Text style={{ color: C.textLight, fontSize: 11 }}>{v.type} | {v.seats} places | {v.transmission}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ color: C.accent, fontSize: 16, fontWeight: '800' }}>CHF {v.price_per_day}</Text>
                          <Text style={{ color: C.textLight, fontSize: 10 }}>/jour</Text>
                        </View>
                        {selected && <Ionicons name="checkmark-circle" size={22} color={C.success} style={{ marginLeft: 8 }} />}
                        {!free && <View style={s.occupiedTag}><Text style={{ color: '#EF4444', fontSize: 10, fontWeight: '700' }}>OCCUPÉ</Text></View>}
                      </View>
                      {selected && totalDays > 0 && (
                        <View style={[s.priceSummary, { backgroundColor: C.accent + '10' }]}>
                          <Text style={{ color: C.accent, fontWeight: '700', fontSize: 13 }}>Total : CHF {(v.price_per_day * totalDays).toFixed(2)} ({totalDays}j × CHF {v.price_per_day})</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          )}

          {/* Next */}
          {selectedVehicle && startDate && endDate && totalDays > 0 && isVehicleFree(selectedVehicle) && (
            <TouchableOpacity style={[s.primaryBtn, { backgroundColor: C.primary, marginTop: 16 }]} onPress={() => setStep('options')}>
              <Text style={s.btnText}>Suivant : Options & Paiement</Text><Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ─── STEP 3: Options & Payment ─── */}
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

      {/* ─── STEP 4: Confirm ─── */}
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
