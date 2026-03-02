import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api/axios';
import { format, addDays, startOfWeek, isSameDay, isWithinInterval, parseISO, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useThemeStore } from '../../src/store/themeStore';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Client { id: string; name: string; email: string; phone?: string; }
interface VehicleSlot { id: string; user_name: string; start: string; end: string; status: string; }
interface VehicleSchedule { id: string; brand: string; model: string; year?: number; price_per_day: number; type: string; seats: number; transmission: string; fuel_type: string; options?: any[]; reservations: VehicleSlot[]; }

type Step = 'client' | 'vehicle' | 'dates' | 'confirm';

const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

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

  // Schedule
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [schedule, setSchedule] = useState<VehicleSchedule[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleSchedule | null>(null);

  // Dates with hours
  const [startDate, setStartDate] = useState('');
  const [startHour, setStartHour] = useState('08');
  const [endDate, setEndDate] = useState('');
  const [endHour, setEndHour] = useState('18');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'send_link'>('cash');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [createdReservation, setCreatedReservation] = useState<any>(null);

  const showAlert = (title: string, msg: string) => {
    if (Platform.OS === 'web') window.alert(msg);
    else Alert.alert(title, msg);
  };

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

  // Fetch schedule
  const fetchSchedule = useCallback(async () => {
    setLoadingSchedule(true);
    try {
      const sd = format(weekStart, 'yyyy-MM-dd');
      const ed = format(addDays(weekStart, 13), 'yyyy-MM-dd');
      const res = await api.get(`/api/admin/vehicle-schedule?start_date=${sd}&end_date=${ed}`);
      setSchedule(res.data.vehicles || []);
    } catch (e) { console.error(e); }
    finally { setLoadingSchedule(false); }
  }, [weekStart]);

  useEffect(() => {
    if (step === 'vehicle') fetchSchedule();
  }, [step, fetchSchedule]);

  // Week days
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  // Check if a vehicle has a reservation at a specific day
  const getSlotForDay = (vehicle: VehicleSchedule, day: Date): VehicleSlot | null => {
    for (const r of vehicle.reservations) {
      try {
        const rStart = parseISO(r.start);
        const rEnd = parseISO(r.end);
        if (day >= rStart && day < rEnd) return r;
        if (isSameDay(day, rStart) || isSameDay(day, rEnd)) return r;
      } catch { continue; }
    }
    return null;
  };

  const isVehicleFreeForDates = (vehicle: VehicleSchedule): boolean => {
    if (!startDate || !endDate) return true;
    const sd = parseISO(`${startDate}T${startHour}:00:00`);
    const ed = parseISO(`${endDate}T${endHour}:00:00`);
    for (const r of vehicle.reservations) {
      try {
        const rStart = parseISO(r.start);
        const rEnd = parseISO(r.end);
        if (sd < rEnd && ed > rStart) return false;
      } catch { continue; }
    }
    return true;
  };

  // Submit reservation
  const submitReservation = async () => {
    if (!selectedClient || !selectedVehicle || !startDate || !endDate) return;
    setSubmitting(true);
    try {
      const res = await api.post('/api/admin/create-reservation-for-client', {
        client_id: selectedClient.id,
        vehicle_id: selectedVehicle.id,
        start_date: `${startDate}T${startHour}:00:00`,
        end_date: `${endDate}T${endHour}:00:00`,
        options: selectedOptions,
        payment_method: paymentMethod,
      });
      setCreatedReservation(res.data.reservation);
      if (paymentMethod === 'send_link') {
        try { await api.post(`/api/admin/reservations/${res.data.reservation.id}/send-payment-link`, { origin_url: API_URL }); } catch {}
      }
      setSuccess(true);
    } catch (e: any) { showAlert('Erreur', e.response?.data?.detail || 'Erreur lors de la création'); }
    finally { setSubmitting(false); }
  };

  const totalDays = startDate && endDate ? Math.max(1, differenceInDays(parseISO(endDate), parseISO(startDate))) : 0;
  const basePrice = selectedVehicle ? selectedVehicle.price_per_day * totalDays : 0;
  const optionsPrice = selectedVehicle?.options?.filter(o => selectedOptions.includes(o.name)).reduce((sum, o) => sum + o.price_per_day * totalDays, 0) || 0;
  const totalPrice = basePrice + optionsPrice;

  const resetFlow = () => {
    setStep('client'); setSelectedClient(null); setSelectedVehicle(null);
    setStartDate(''); setEndDate(''); setStartHour('08'); setEndHour('18');
    setSelectedOptions([]); setPaymentMethod('cash'); setSuccess(false);
    setCreatedReservation(null); setSearchQuery(''); setSearchResults([]);
    setShowNewClient(false); setNewName(''); setNewPhone(''); setNewEmail('');
  };

  // Status color
  const statusColor = (status: string) => {
    switch (status) {
      case 'confirmed': case 'active': return '#EF4444';
      case 'pending': case 'pending_cash': return '#F59E0B';
      default: return '#9CA3AF';
    }
  };

  if (success) {
    return (
      <ScrollView style={[s.container, { backgroundColor: C.bg }]} contentContainerStyle={[s.content, { alignItems: 'center', paddingTop: 60 }]}>
        <Ionicons name="checkmark-circle" size={64} color={C.success} />
        <Text style={[s.successTitle, { color: C.text }]}>Réservation créée</Text>
        <Text style={[s.successSub, { color: C.textLight }]}>{selectedVehicle?.brand} {selectedVehicle?.model} pour {selectedClient?.name}</Text>
        <Text style={[s.successPrice, { color: C.accent }]}>CHF {totalPrice.toFixed(2)}</Text>
        <Text style={[s.successMethod, { color: C.textLight }]}>{paymentMethod === 'cash' ? 'Paiement en espèces' : 'Lien de paiement envoyé'}</Text>
        <TouchableOpacity style={[s.primaryBtn, { backgroundColor: C.primary }]} onPress={resetFlow} data-testid="new-booking-btn">
          <Text style={s.primaryBtnText}>Nouvelle réservation</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={[s.container, { backgroundColor: C.bg }]} contentContainerStyle={s.content}>
      {/* Steps indicator */}
      <View style={[s.steps, { backgroundColor: C.card, borderColor: C.border }]}>
        {(['client', 'vehicle', 'dates', 'confirm'] as Step[]).map((st, i) => {
          const labels = ['Client', 'Véhicule', 'Options', 'Confirmer'];
          const icons: any[] = ['person', 'car', 'settings', 'checkmark'];
          const isActive = step === st;
          const isPast = ['client', 'vehicle', 'dates', 'confirm'].indexOf(step) > i;
          return (
            <TouchableOpacity key={st} style={s.stepItem} onPress={() => isPast && setStep(st)}>
              <View style={[s.stepDot, { backgroundColor: (isActive || isPast) ? C.accent : C.border }]}>
                <Ionicons name={icons[i]} size={14} color={(isActive || isPast) ? '#fff' : C.textLight} />
              </View>
              <Text style={[s.stepLabel, { color: (isActive || isPast) ? C.accent : C.textLight }]}>{labels[i]}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* STEP: Client */}
      {step === 'client' && (
        <View>
          <Text style={[s.title, { color: C.text }]}>Sélectionner un client</Text>
          {selectedClient ? (
            <View style={[s.selectedCard, { backgroundColor: C.accent + '15', borderColor: C.accent + '30' }]}>
              <View style={{ flex: 1 }}>
                <Text style={[s.selectedName, { color: C.text }]}>{selectedClient.name}</Text>
                <Text style={{ color: C.textLight, fontSize: 12 }}>{selectedClient.email}{selectedClient.phone ? ` | ${selectedClient.phone}` : ''}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedClient(null)}><Ionicons name="close-circle" size={24} color={C.error} /></TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={[s.searchBox, { backgroundColor: C.card, borderColor: C.border }]}>
                <Ionicons name="search" size={18} color={C.textLight} />
                <TextInput style={[s.searchInput, { color: C.text }]} placeholder="Rechercher par nom, email, téléphone..." placeholderTextColor={C.textLight} value={searchQuery} onChangeText={setSearchQuery} data-testid="client-search-input" />
                {searching && <ActivityIndicator size="small" color={C.accent} />}
              </View>
              {searchResults.map((c) => (
                <TouchableOpacity key={c.id} style={[s.resultCard, { backgroundColor: C.card, borderColor: C.border }]} onPress={() => { setSelectedClient(c); setStep('vehicle'); }} data-testid={`client-${c.id}`}>
                  <Ionicons name="person-circle" size={32} color={C.accent} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.resultName, { color: C.text }]}>{c.name}</Text>
                    <Text style={{ color: C.textLight, fontSize: 12 }}>{c.email}{c.phone ? ` | ${c.phone}` : ''}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={C.textLight} />
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={s.newClientBtn} onPress={() => setShowNewClient(!showNewClient)} data-testid="new-client-toggle">
                <Ionicons name={showNewClient ? 'chevron-up' : 'person-add'} size={18} color={C.accent} />
                <Text style={[s.newClientBtnText, { color: C.accent }]}>{showNewClient ? 'Masquer' : 'Créer un nouveau client'}</Text>
              </TouchableOpacity>
              {showNewClient && (
                <View style={[s.newClientForm, { backgroundColor: C.card, borderColor: C.border }]}>
                  <TextInput style={[s.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]} placeholder="Nom *" placeholderTextColor={C.textLight} value={newName} onChangeText={setNewName} data-testid="new-client-name" />
                  <TextInput style={[s.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]} placeholder="Téléphone" placeholderTextColor={C.textLight} value={newPhone} onChangeText={setNewPhone} keyboardType="phone-pad" />
                  <TextInput style={[s.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]} placeholder="Email" placeholderTextColor={C.textLight} value={newEmail} onChangeText={setNewEmail} keyboardType="email-address" autoCapitalize="none" />
                  <TouchableOpacity style={[s.primaryBtn, { backgroundColor: C.primary }]} onPress={createClient} disabled={creatingClient}>
                    <Text style={s.primaryBtnText}>{creatingClient ? 'Création...' : 'Créer et continuer'}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
          {selectedClient && (
            <TouchableOpacity style={[s.primaryBtn, { backgroundColor: C.primary }]} onPress={() => setStep('vehicle')} data-testid="next-to-vehicle">
              <Text style={s.primaryBtnText}>Suivant : Planning & Véhicule</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* STEP: Vehicle with Schedule */}
      {step === 'vehicle' && (
        <View>
          <Text style={[s.title, { color: C.text }]}>Planning & Réservation</Text>
          <Text style={[s.subtitle, { color: C.textLight }]}>Visualisez les disponibilités et choisissez vos dates</Text>

          {/* Week Navigation */}
          <View style={[s.weekNav, { backgroundColor: C.card, borderColor: C.border }]}>
            <TouchableOpacity onPress={() => setWeekStart(addDays(weekStart, -7))} data-testid="prev-week">
              <Ionicons name="chevron-back" size={22} color={C.accent} />
            </TouchableOpacity>
            <Text style={[s.weekTitle, { color: C.text }]}>
              {format(weekStart, 'd MMM', { locale: fr })} - {format(addDays(weekStart, 6), 'd MMM yyyy', { locale: fr })}
            </Text>
            <TouchableOpacity onPress={() => setWeekStart(addDays(weekStart, 7))} data-testid="next-week">
              <Ionicons name="chevron-forward" size={22} color={C.accent} />
            </TouchableOpacity>
          </View>

          {/* Date + Hour Selection */}
          <View style={[s.dateSelectionBox, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[s.dateSelLabel, { color: C.text }]}>Période de location</Text>
            <View style={s.dateRow}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.textLight, fontSize: 11, marginBottom: 4 }}>Début</Text>
                <View style={s.dateTimeRow}>
                  <TextInput style={[s.dateInput, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]} placeholder="AAAA-MM-JJ" placeholderTextColor={C.textLight} value={startDate} onChangeText={setStartDate} data-testid="start-date-input" />
                  <View style={[s.hourPicker, { backgroundColor: C.bg, borderColor: C.border }]}>
                    <TouchableOpacity onPress={() => setStartHour(String(Math.max(0, parseInt(startHour) - 1)).padStart(2, '0'))}>
                      <Ionicons name="remove-circle-outline" size={18} color={C.textLight} />
                    </TouchableOpacity>
                    <Text style={[s.hourText, { color: C.text }]}>{startHour}:00</Text>
                    <TouchableOpacity onPress={() => setStartHour(String(Math.min(23, parseInt(startHour) + 1)).padStart(2, '0'))}>
                      <Ionicons name="add-circle-outline" size={18} color={C.accent} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.textLight, fontSize: 11, marginBottom: 4 }}>Fin</Text>
                <View style={s.dateTimeRow}>
                  <TextInput style={[s.dateInput, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]} placeholder="AAAA-MM-JJ" placeholderTextColor={C.textLight} value={endDate} onChangeText={setEndDate} data-testid="end-date-input" />
                  <View style={[s.hourPicker, { backgroundColor: C.bg, borderColor: C.border }]}>
                    <TouchableOpacity onPress={() => setEndHour(String(Math.max(0, parseInt(endHour) - 1)).padStart(2, '0'))}>
                      <Ionicons name="remove-circle-outline" size={18} color={C.textLight} />
                    </TouchableOpacity>
                    <Text style={[s.hourText, { color: C.text }]}>{endHour}:00</Text>
                    <TouchableOpacity onPress={() => setEndHour(String(Math.min(23, parseInt(endHour) + 1)).padStart(2, '0'))}>
                      <Ionicons name="add-circle-outline" size={18} color={C.accent} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
            {startDate && endDate && totalDays > 0 && (
              <Text style={{ color: C.accent, fontSize: 12, fontWeight: '600', marginTop: 6 }}>
                {totalDays} jour(s) de location
              </Text>
            )}
          </View>

          {/* Schedule Grid - Agenda */}
          {loadingSchedule ? (
            <ActivityIndicator size="large" color={C.accent} style={{ marginTop: 20 }} />
          ) : (
            <View style={{ marginTop: 12 }}>
              <Text style={[s.sectionTitle, { color: C.text }]}>Agenda des véhicules</Text>
              <View style={s.legendRow}>
                <View style={s.legendItem}>
                  <View style={[s.legendDot, { backgroundColor: '#10B981' }]} />
                  <Text style={{ color: C.textLight, fontSize: 11 }}>Disponible</Text>
                </View>
                <View style={s.legendItem}>
                  <View style={[s.legendDot, { backgroundColor: '#EF4444' }]} />
                  <Text style={{ color: C.textLight, fontSize: 11 }}>Occupé (confirmé)</Text>
                </View>
                <View style={s.legendItem}>
                  <View style={[s.legendDot, { backgroundColor: '#F59E0B' }]} />
                  <Text style={{ color: C.textLight, fontSize: 11 }}>En attente</Text>
                </View>
              </View>

              {/* Day headers */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                  <View style={s.gridHeader}>
                    <View style={[s.vehicleCol, { backgroundColor: C.card, borderColor: C.border }]}>
                      <Text style={[s.colHeaderText, { color: C.textLight }]}>Véhicule</Text>
                    </View>
                    {weekDays.map((day, i) => {
                      const isToday = isSameDay(day, new Date());
                      return (
                        <TouchableOpacity
                          key={i}
                          style={[s.dayCol, { backgroundColor: isToday ? C.accent + '15' : C.card, borderColor: C.border }]}
                          onPress={() => {
                            const d = format(day, 'yyyy-MM-dd');
                            if (!startDate) setStartDate(d);
                            else if (!endDate && d > startDate) setEndDate(d);
                            else { setStartDate(d); setEndDate(''); }
                          }}
                        >
                          <Text style={[s.dayName, { color: isToday ? C.accent : C.textLight }]}>{DAY_NAMES[i]}</Text>
                          <Text style={[s.dayNum, { color: isToday ? C.accent : C.text }]}>{format(day, 'd')}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Vehicle rows */}
                  {schedule.map((v) => {
                    const isFree = isVehicleFreeForDates(v);
                    const isSelected = selectedVehicle?.id === v.id;
                    return (
                      <TouchableOpacity
                        key={v.id}
                        style={[s.gridRow, isSelected && { backgroundColor: C.accent + '10' }]}
                        onPress={() => {
                          if (isFree || !startDate || !endDate) setSelectedVehicle(v);
                          else showAlert('Indisponible', 'Ce véhicule est occupé pour les dates sélectionnées');
                        }}
                        data-testid={`schedule-vehicle-${v.id}`}
                      >
                        <View style={[s.vehicleCol, s.vehicleColRow, { backgroundColor: C.card, borderColor: C.border }]}>
                          <Text style={[s.vehicleLabel, { color: C.text }]} numberOfLines={1}>{v.brand} {v.model}</Text>
                          <Text style={{ color: C.accent, fontSize: 11, fontWeight: '700' }}>CHF {v.price_per_day}/j</Text>
                          {isSelected && <Ionicons name="checkmark-circle" size={16} color={C.success} />}
                          {startDate && endDate && !isFree && <View style={[s.busyTag]}><Text style={s.busyTagText}>Occupé</Text></View>}
                        </View>
                        {weekDays.map((day, i) => {
                          const slot = getSlotForDay(v, day);
                          const bgColor = slot ? statusColor(slot.status) : '#10B981';
                          return (
                            <View key={i} style={[s.dayCell, { borderColor: C.border }]}>
                              <View style={[s.cellBar, { backgroundColor: slot ? bgColor + '30' : 'transparent', borderLeftColor: slot ? bgColor : 'transparent', borderLeftWidth: slot ? 3 : 0 }]}>
                                {slot ? (
                                  <Text style={[s.cellText, { color: bgColor }]} numberOfLines={1}>
                                    {slot.user_name?.split(' ')[0] || (slot.status === 'pending' ? 'Attente' : 'Réservé')}
                                  </Text>
                                ) : (
                                  <Text style={[s.cellFreeText, { color: '#10B981' }]}>-</Text>
                                )}
                              </View>
                            </View>
                          );
                        })}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Next button */}
          {selectedVehicle && startDate && endDate && totalDays > 0 && (
            <View style={[s.selectionSummary, { backgroundColor: C.card, borderColor: C.accent }]}>
              <View style={{ flex: 1 }}>
                <Text style={[s.selSummaryTitle, { color: C.text }]}>{selectedVehicle.brand} {selectedVehicle.model}</Text>
                <Text style={{ color: C.textLight, fontSize: 12 }}>{startDate} {startHour}:00 → {endDate} {endHour}:00 ({totalDays}j)</Text>
              </View>
              <Text style={[s.selSummaryPrice, { color: C.accent }]}>CHF {basePrice.toFixed(0)}</Text>
            </View>
          )}
          {selectedVehicle && startDate && endDate && totalDays > 0 && isVehicleFreeForDates(selectedVehicle) && (
            <TouchableOpacity style={[s.primaryBtn, { backgroundColor: C.primary }]} onPress={() => setStep('dates')} data-testid="next-to-options">
              <Text style={s.primaryBtnText}>Suivant : Options & Paiement</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* STEP: Options & Payment */}
      {step === 'dates' && selectedVehicle && (
        <View>
          <Text style={[s.title, { color: C.text }]}>Options & Paiement</Text>
          {(selectedVehicle.options || []).length > 0 && (
            <>
              <Text style={[s.sectionTitle, { color: C.text }]}>Options disponibles</Text>
              {selectedVehicle.options!.map((opt: any) => (
                <TouchableOpacity key={opt.name} style={[s.optionCard, { backgroundColor: C.card, borderColor: selectedOptions.includes(opt.name) ? C.success : C.border }]} onPress={() => setSelectedOptions(prev => prev.includes(opt.name) ? prev.filter(o => o !== opt.name) : [...prev, opt.name])}>
                  <Ionicons name={selectedOptions.includes(opt.name) ? 'checkbox' : 'square-outline'} size={22} color={selectedOptions.includes(opt.name) ? C.success : C.textLight} />
                  <Text style={[s.optionName, { color: C.text }]}>{opt.name}</Text>
                  <Text style={{ color: C.accent, fontSize: 12 }}>+CHF {opt.price_per_day}/j</Text>
                </TouchableOpacity>
              ))}
            </>
          )}
          <Text style={[s.sectionTitle, { color: C.text, marginTop: 16 }]}>Mode de paiement</Text>
          <TouchableOpacity style={[s.payCard, { backgroundColor: C.card, borderColor: paymentMethod === 'cash' ? C.warning : C.border }]} onPress={() => setPaymentMethod('cash')} data-testid="pay-cash">
            <Ionicons name="cash" size={24} color={paymentMethod === 'cash' ? C.warning : C.textLight} />
            <View style={{ flex: 1 }}>
              <Text style={[s.payTitle, { color: C.text }]}>Espèces</Text>
              <Text style={{ color: C.textLight, fontSize: 11 }}>Le client paie au retrait du véhicule</Text>
            </View>
            {paymentMethod === 'cash' && <Ionicons name="checkmark-circle" size={22} color={C.success} />}
          </TouchableOpacity>
          <TouchableOpacity style={[s.payCard, { backgroundColor: C.card, borderColor: paymentMethod === 'send_link' ? C.accent : C.border }]} onPress={() => setPaymentMethod('send_link')} data-testid="pay-link">
            <Ionicons name="link" size={24} color={paymentMethod === 'send_link' ? C.accent : C.textLight} />
            <View style={{ flex: 1 }}>
              <Text style={[s.payTitle, { color: C.text }]}>Lien de paiement</Text>
              <Text style={{ color: C.textLight, fontSize: 11 }}>Un lien Stripe envoyé par email</Text>
            </View>
            {paymentMethod === 'send_link' && <Ionicons name="checkmark-circle" size={22} color={C.success} />}
          </TouchableOpacity>
          <TouchableOpacity style={[s.primaryBtn, { backgroundColor: C.primary }]} onPress={() => setStep('confirm')} data-testid="next-to-confirm">
            <Text style={s.primaryBtnText}>Voir le récapitulatif</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* STEP: Confirm */}
      {step === 'confirm' && selectedClient && selectedVehicle && (
        <View>
          <Text style={[s.title, { color: C.text }]}>Récapitulatif</Text>
          <View style={[s.summaryCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <View style={s.summaryRow}><Text style={[s.summaryLabel, { color: C.textLight }]}>Client</Text><Text style={[s.summaryValue, { color: C.text }]}>{selectedClient.name}</Text></View>
            <View style={s.summaryRow}><Text style={[s.summaryLabel, { color: C.textLight }]}>Véhicule</Text><Text style={[s.summaryValue, { color: C.text }]}>{selectedVehicle.brand} {selectedVehicle.model}</Text></View>
            <View style={s.summaryRow}><Text style={[s.summaryLabel, { color: C.textLight }]}>Début</Text><Text style={[s.summaryValue, { color: C.text }]}>{startDate} à {startHour}:00</Text></View>
            <View style={s.summaryRow}><Text style={[s.summaryLabel, { color: C.textLight }]}>Fin</Text><Text style={[s.summaryValue, { color: C.text }]}>{endDate} à {endHour}:00</Text></View>
            <View style={s.summaryRow}><Text style={[s.summaryLabel, { color: C.textLight }]}>Durée</Text><Text style={[s.summaryValue, { color: C.text }]}>{totalDays} jour(s)</Text></View>
            <View style={s.summaryRow}><Text style={[s.summaryLabel, { color: C.textLight }]}>Prix de base</Text><Text style={[s.summaryValue, { color: C.text }]}>CHF {basePrice.toFixed(2)}</Text></View>
            {optionsPrice > 0 && <View style={s.summaryRow}><Text style={[s.summaryLabel, { color: C.textLight }]}>Options</Text><Text style={[s.summaryValue, { color: C.text }]}>CHF {optionsPrice.toFixed(2)}</Text></View>}
            <View style={[s.divider, { backgroundColor: C.border }]} />
            <View style={s.summaryRow}><Text style={[s.summaryLabel, { color: C.text, fontWeight: '800' }]}>Total</Text><Text style={[s.summaryValue, { fontSize: 20, color: C.accent }]}>CHF {totalPrice.toFixed(2)}</Text></View>
            <View style={s.summaryRow}><Text style={[s.summaryLabel, { color: C.textLight }]}>Paiement</Text><Text style={[s.summaryValue, { color: paymentMethod === 'cash' ? C.warning : C.accent }]}>{paymentMethod === 'cash' ? 'Espèces' : 'Lien par email'}</Text></View>
          </View>
          <TouchableOpacity style={[s.confirmBtn, { backgroundColor: C.success }, submitting && { opacity: 0.6 }]} onPress={submitReservation} disabled={submitting} data-testid="confirm-booking-btn">
            {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="checkmark-circle" size={22} color="#fff" />}
            <Text style={s.primaryBtnText}>{submitting ? 'Création...' : 'Confirmer la réservation'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  steps: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, borderRadius: 12, padding: 12, borderWidth: 1 },
  stepItem: { alignItems: 'center', gap: 4, flex: 1 },
  stepDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stepLabel: { fontSize: 10, fontWeight: '700' },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 6 },
  subtitle: { fontSize: 13, marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 12, gap: 8, borderWidth: 1, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 12 },
  resultCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1 },
  resultName: { fontSize: 14, fontWeight: '700' },
  selectedCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, padding: 14, marginBottom: 16, borderWidth: 1 },
  selectedName: { fontSize: 15, fontWeight: '700' },
  newClientBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  newClientBtnText: { fontSize: 14, fontWeight: '600' },
  newClientForm: { borderRadius: 10, padding: 14, gap: 10, borderWidth: 1, marginBottom: 16 },
  input: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, borderWidth: 1 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 14, marginTop: 16 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 16, marginTop: 16 },
  weekNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 10, padding: 12, borderWidth: 1, marginBottom: 12 },
  weekTitle: { fontSize: 14, fontWeight: '700' },
  dateSelectionBox: { borderRadius: 10, padding: 14, borderWidth: 1, marginBottom: 12 },
  dateSelLabel: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  dateRow: { flexDirection: 'row', gap: 12 },
  dateTimeRow: { flexDirection: 'row', gap: 6 },
  dateInput: { flex: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, borderWidth: 1 },
  hourPicker: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, paddingHorizontal: 8, borderWidth: 1 },
  hourText: { fontSize: 14, fontWeight: '700', minWidth: 38, textAlign: 'center' },
  legendRow: { flexDirection: 'row', gap: 16, marginBottom: 10, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  gridHeader: { flexDirection: 'row' },
  vehicleCol: { width: 130, padding: 8, borderWidth: 1, borderRightWidth: 2 },
  vehicleColRow: { justifyContent: 'center', gap: 2 },
  colHeaderText: { fontSize: 11, fontWeight: '700' },
  dayCol: { width: 80, alignItems: 'center', padding: 6, borderWidth: 1 },
  dayName: { fontSize: 10, fontWeight: '600' },
  dayNum: { fontSize: 16, fontWeight: '800' },
  gridRow: { flexDirection: 'row' },
  vehicleLabel: { fontSize: 12, fontWeight: '700' },
  busyTag: { backgroundColor: '#EF444420', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
  busyTagText: { color: '#EF4444', fontSize: 9, fontWeight: '700' },
  dayCell: { width: 80, height: 48, borderWidth: 1, padding: 2, justifyContent: 'center' },
  cellBar: { flex: 1, borderRadius: 4, justifyContent: 'center', paddingHorizontal: 4 },
  cellText: { fontSize: 9, fontWeight: '600' },
  cellFreeText: { fontSize: 11, textAlign: 'center' },
  selectionSummary: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, padding: 14, borderWidth: 2, marginTop: 12 },
  selSummaryTitle: { fontSize: 14, fontWeight: '700' },
  selSummaryPrice: { fontSize: 18, fontWeight: '800' },
  optionCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 8, padding: 12, marginBottom: 8, borderWidth: 1 },
  optionName: { flex: 1, fontSize: 14 },
  payCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1.5 },
  payTitle: { fontSize: 14, fontWeight: '700' },
  summaryCard: { borderRadius: 12, padding: 16, borderWidth: 1, marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  summaryLabel: { fontSize: 13 },
  summaryValue: { fontSize: 13, fontWeight: '600' },
  divider: { height: 1, marginVertical: 8 },
  successTitle: { fontSize: 24, fontWeight: '800', marginTop: 16, marginBottom: 8 },
  successSub: { fontSize: 15, marginBottom: 4 },
  successPrice: { fontSize: 28, fontWeight: '800', marginVertical: 12 },
  successMethod: { fontSize: 14, marginBottom: 24 },
});
