import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, TextInput, Modal, ScrollView, Platform, Alert, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../src/api/axios';
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, parseISO, differenceInDays, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useThemeStore } from '../../src/store/themeStore';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const SCREEN_W = Dimensions.get('window').width;

interface Reservation {
  id: string; user_name: string; user_email: string; vehicle_name: string;
  start_date: string; end_date: string; total_days: number; total_price: number;
  status: string; payment_status: string; payment_method?: string;
}

interface VehicleSchedule {
  id: string; brand: string; model: string; price_per_day: number;
  reservations: { id: string; start: string; end: string; status: string; user_name?: string }[];
}

const STATUS_FILTERS = [
  { value: null, label: 'Toutes' },
  { value: 'pending', label: 'En attente' },
  { value: 'pending_cash', label: 'Espèces' },
  { value: 'confirmed', label: 'Confirmées' },
  { value: 'active', label: 'Actives' },
  { value: 'completed', label: 'Terminées' },
  { value: 'cancelled', label: 'Annulées' },
];

const RES_COLORS: Record<string, string> = {
  confirmed: '#10B981', active: '#3B82F6', pending: '#FBBF24', pending_cash: '#A855F7',
  completed: '#6B7280', cancelled: '#EF4444',
};

export default function AgencyReservations() {
  const { colors: C } = useThemeStore();
  const [viewMode, setViewMode] = useState<'list' | 'planning'>('planning');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [schedule, setSchedule] = useState<VehicleSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [actionModal, setActionModal] = useState<Reservation | null>(null);
  const [sendingLink, setSendingLink] = useState(false);
  const [contractLoading, setContractLoading] = useState(false);
  const [planningMonth, setPlanningMonth] = useState(startOfMonth(new Date()));
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [showAllVehicles, setShowAllVehicles] = useState(false);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const router = useRouter();

  const fetchReservations = async () => {
    try {
      const res = await api.get('/api/admin/reservations?limit=100');
      setReservations(res.data.reservations || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchSchedule = useCallback(async () => {
    setScheduleLoading(true);
    try {
      const sd = format(planningMonth, 'yyyy-MM-dd');
      const ed = format(endOfMonth(planningMonth), 'yyyy-MM-dd');
      const res = await api.get(`/api/admin/vehicle-schedule?start_date=${sd}&end_date=${ed}`);
      const data = res.data;
      setSchedule(data.vehicles || data || []);
    } catch (e) { console.error(e); }
    finally { setScheduleLoading(false); }
  }, [planningMonth]);

  useEffect(() => { fetchReservations(); }, []);
  useEffect(() => { if (viewMode === 'planning') fetchSchedule(); }, [viewMode, fetchSchedule]);

  const onRefresh = async () => { setRefreshing(true); await fetchReservations(); if (viewMode === 'planning') await fetchSchedule(); setRefreshing(false); };

  const filtered = useMemo(() => {
    let list = reservations;
    if (filter) list = list.filter(r => r.status === filter);
    if (search) list = list.filter(r => r.user_name?.toLowerCase().includes(search.toLowerCase()) || r.vehicle_name?.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [reservations, filter, search]);

  const statusColor = (s: string) => RES_COLORS[s] || C.textLight;
  const statusLabel = (s: string) => {
    const map: Record<string, string> = { pending: 'En attente', pending_cash: 'Espèces', confirmed: 'Confirmée', active: 'Active', completed: 'Terminée', cancelled: 'Annulée' };
    return map[s] || s;
  };

  const updateStatus = async (id: string, status: string) => {
    try { await api.put(`/api/admin/reservations/${id}/status?status=${status}`); setActionModal(null); fetchReservations(); fetchSchedule(); }
    catch (e: any) { const msg = e.response?.data?.detail || 'Erreur'; Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Erreur', msg); }
  };
  const updatePayment = async (id: string, status: string) => {
    try { await api.put(`/api/admin/reservations/${id}/payment-status?payment_status=${status}`); setActionModal(null); fetchReservations(); }
    catch (e: any) { const msg = e.response?.data?.detail || 'Erreur'; Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Erreur', msg); }
  };
  const sendPaymentLink = async (id: string) => {
    setSendingLink(true);
    try { await api.post(`/api/admin/reservations/${id}/send-payment-link`, { origin_url: API_URL }); Platform.OS === 'web' ? window.alert('Lien envoyé!') : Alert.alert('Succès', 'Lien envoyé!'); setActionModal(null); }
    catch (e: any) { Platform.OS === 'web' ? window.alert(e.response?.data?.detail || 'Erreur') : Alert.alert('Erreur'); }
    finally { setSendingLink(false); }
  };

  // Planning calculations
  const monthDays = useMemo(() => eachDayOfInterval({ start: planningMonth, end: endOfMonth(planningMonth) }), [planningMonth]);
  const CELL_W = 32;
  const LABEL_W = 120;
  const ROW_H = 40;
  const today = new Date();

  if (loading) return <View style={[st.container, { backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={C.accent} /></View>;

  return (
    <View style={[st.container, { backgroundColor: C.bg }]}>
      {/* View mode toggle */}
      <View style={[st.toggleRow, { backgroundColor: C.card, borderColor: C.border }]}>
        <TouchableOpacity style={[st.toggleBtn, viewMode === 'planning' && { backgroundColor: C.accent }]} onPress={() => setViewMode('planning')} data-testid="view-planning">
          <Ionicons name="calendar" size={16} color={viewMode === 'planning' ? '#fff' : C.textLight} />
          <Text style={{ color: viewMode === 'planning' ? '#fff' : C.textLight, fontSize: 13, fontWeight: '700' }}>Planning</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[st.toggleBtn, viewMode === 'list' && { backgroundColor: C.accent }]} onPress={() => setViewMode('list')} data-testid="view-list">
          <Ionicons name="list" size={16} color={viewMode === 'list' ? '#fff' : C.textLight} />
          <Text style={{ color: viewMode === 'list' ? '#fff' : C.textLight, fontSize: 13, fontWeight: '700' }}>Liste</Text>
        </TouchableOpacity>
      </View>

      {/* ─── PLANNING VIEW ─── */}
      {viewMode === 'planning' && (
        <View style={{ flex: 1 }}>
          {/* Month navigation */}
          <View style={[st.monthNav, { borderColor: C.border }]}>
            <TouchableOpacity onPress={() => setPlanningMonth(addMonths(planningMonth, -1))} data-testid="prev-month">
              <Ionicons name="chevron-back" size={22} color={C.accent} />
            </TouchableOpacity>
            <Text style={{ color: C.text, fontSize: 16, fontWeight: '800', textTransform: 'capitalize' }}>
              {format(planningMonth, 'MMMM yyyy', { locale: fr })}
            </Text>
            <TouchableOpacity onPress={() => setPlanningMonth(addMonths(planningMonth, 1))} data-testid="next-month">
              <Ionicons name="chevron-forward" size={22} color={C.accent} />
            </TouchableOpacity>
          </View>

          {/* Legend */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10, paddingBottom: 8 }}>
            {Object.entries(RES_COLORS).filter(([k]) => k !== 'completed' && k !== 'cancelled').map(([k, color]) => (
              <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
                <Text style={{ color: C.textLight, fontSize: 10 }}>{statusLabel(k)}</Text>
              </View>
            ))}
          </ScrollView>

          {/* Vehicle search + toggle */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 8, marginBottom: 8 }}>
            <View style={[st.searchBar, { flex: 1, margin: 0, backgroundColor: C.card, borderColor: C.border }]}>
              <Ionicons name="search" size={16} color={C.textLight} />
              <TextInput style={[st.searchInput, { color: C.text, paddingVertical: 6 }]} placeholder="Filtrer vehicule..." placeholderTextColor={C.textLight} value={vehicleSearch} onChangeText={setVehicleSearch} data-testid="vehicle-search-planning" />
            </View>
            <TouchableOpacity onPress={() => setShowAllVehicles(!showAllVehicles)} style={[st.filterTab, { backgroundColor: showAllVehicles ? C.accent + '20' : C.card, borderColor: showAllVehicles ? C.accent : C.border }]} data-testid="toggle-all-vehicles">
              <Ionicons name={showAllVehicles ? 'eye' : 'eye-off'} size={14} color={showAllVehicles ? C.accent : C.textLight} />
              <Text style={{ color: showAllVehicles ? C.accent : C.textLight, fontSize: 11, fontWeight: '600' }}>{showAllVehicles ? 'Tous' : 'Avec res.'}</Text>
            </TouchableOpacity>
          </View>

          {scheduleLoading ? <ActivityIndicator size="large" color={C.accent} style={{ marginTop: 40 }} /> : (
            <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}>
              <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                <View>
                  {/* Header row: days */}
                  <View style={{ flexDirection: 'row' }}>
                    <View style={[st.labelCell, { width: LABEL_W, backgroundColor: C.card, borderColor: C.border }]}>
                      <Text style={{ color: C.textLight, fontSize: 11, fontWeight: '700' }}>Vehicule</Text>
                    </View>
                    {monthDays.map((day, i) => {
                      const isToday = isSameDay(day, today);
                      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                      return (
                        <View key={i} style={[st.dayHeaderCell, { width: CELL_W, backgroundColor: isToday ? C.accent + '20' : isWeekend ? C.card : C.bg, borderColor: C.border }]}>
                          <Text style={{ color: isToday ? C.accent : C.textLight, fontSize: 8, fontWeight: '600' }}>{format(day, 'EEE', { locale: fr }).slice(0, 2)}</Text>
                          <Text style={{ color: isToday ? C.accent : C.text, fontSize: 12, fontWeight: isToday ? '800' : '600' }}>{format(day, 'd')}</Text>
                        </View>
                      );
                    })}
                  </View>

                  {/* Vehicle rows */}
                  {schedule
                    .filter(v => showAllVehicles || v.reservations.length > 0)
                    .filter(v => !vehicleSearch || `${v.brand} ${v.model}`.toLowerCase().includes(vehicleSearch.toLowerCase()))
                    .map((vehicle, vi) => (
                    <View key={vehicle.id} style={{ flexDirection: 'row' }}>
                      {/* Vehicle label */}
                      <View style={[st.labelCell, { width: LABEL_W, backgroundColor: vi % 2 === 0 ? C.card : C.bg, borderColor: C.border, height: ROW_H }]}>
                        <Text style={{ color: C.text, fontSize: 11, fontWeight: '700' }} numberOfLines={1}>{vehicle.brand} {vehicle.model}</Text>
                        <Text style={{ color: C.textLight, fontSize: 9 }}>CHF {vehicle.price_per_day}/j</Text>
                      </View>

                      {/* Day cells with reservation bars */}
                      {monthDays.map((day, di) => {
                        const dayTs = day.getTime();
                        const isToday = isSameDay(day, today);
                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                        let resForDay: typeof vehicle.reservations[0] | null = null;
                        let isStart = false;
                        let isEnd = false;
                        let spanDays = 0;

                        for (const r of vehicle.reservations) {
                          try {
                            const rs = parseISO(r.start);
                            const re = parseISO(r.end);
                            if (dayTs >= rs.getTime() && dayTs < re.getTime()) {
                              resForDay = r;
                              isStart = isSameDay(day, rs);
                              isEnd = isSameDay(day, new Date(re.getTime() - 86400000));
                              if (isStart) spanDays = Math.max(1, differenceInDays(re, rs));
                              break;
                            }
                          } catch {}
                        }

                        const color = resForDay ? (RES_COLORS[resForDay.status] || C.textLight) : 'transparent';

                        return (
                          <View key={di} style={[st.dayCell, {
                            width: CELL_W,
                            backgroundColor: isToday ? C.accent + '08' : isWeekend ? C.card + '60' : vi % 2 === 0 ? C.card + '30' : 'transparent',
                            borderColor: C.border,
                            height: ROW_H,
                          }]}>
                            {resForDay && (
                              <View style={{
                                position: 'absolute', top: 3, bottom: 3, left: isStart ? 2 : 0, right: isEnd ? 2 : 0,
                                backgroundColor: color,
                                borderTopLeftRadius: isStart ? 6 : 0, borderBottomLeftRadius: isStart ? 6 : 0,
                                borderTopRightRadius: isEnd ? 6 : 0, borderBottomRightRadius: isEnd ? 6 : 0,
                                justifyContent: 'center', overflow: 'hidden',
                              }}>
                                {isStart && (
                                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '900', paddingLeft: 4, textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 }} numberOfLines={1}>
                                    {statusLabel(resForDay.status)}
                                  </Text>
                                )}
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  ))}
                </View>
              </ScrollView>

              {/* Reservation details below the chart */}
              <View style={{ padding: 16 }}>
                <Text style={{ color: C.text, fontSize: 15, fontWeight: '800', marginBottom: 10 }}>
                  Reservations du mois ({schedule.reduce((sum, v) => sum + v.reservations.length, 0)})
                </Text>
                {schedule.map(v => v.reservations.map(r => {
                  const color = RES_COLORS[r.status] || C.textLight;
                  return (
                    <View key={r.id} style={[st.resItem, { backgroundColor: C.card, borderColor: C.border }]}>
                      <View style={[st.resItemDot, { backgroundColor: color }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: C.text, fontSize: 13, fontWeight: '700' }}>{v.brand} {v.model}</Text>
                        <Text style={{ color: C.textLight, fontSize: 11 }}>
                          {r.start?.slice(0, 10)} → {r.end?.slice(0, 10)} {r.user_name ? `| ${r.user_name}` : ''}
                        </Text>
                      </View>
                      <View style={[st.resItemBadge, { backgroundColor: color + '20' }]}>
                        <Text style={{ color, fontSize: 10, fontWeight: '700' }}>{statusLabel(r.status)}</Text>
                      </View>
                    </View>
                  );
                })).flat()}
              </View>
            </ScrollView>
          )}
        </View>
      )}

      {/* ─── LIST VIEW ─── */}
      {viewMode === 'list' && (
        <>
          {/* Search */}
          <View style={[st.searchBar, { backgroundColor: C.card, borderColor: C.border }]}>
            <Ionicons name="search" size={18} color={C.textLight} />
            <TextInput style={[st.searchInput, { color: C.text }]} placeholder="Rechercher..." placeholderTextColor={C.textLight} value={search} onChangeText={setSearch} />
          </View>

          {/* Filters */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginTop: 12, marginBottom: 4 }}>
            {STATUS_FILTERS.map((f) => (
              <TouchableOpacity key={f.label} onPress={() => setFilter(f.value)}
                style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 2,
                  borderColor: filter === f.value ? C.accent : C.border,
                  backgroundColor: filter === f.value ? C.accent : C.card }}
                data-testid={`filter-${f.value || 'all'}`}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: filter === f.value ? '#FFFFFF' : C.text }}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <FlatList data={filtered} keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
            contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
            ListEmptyComponent={<View style={st.empty}><Ionicons name="calendar-outline" size={40} color={C.textLight} /><Text style={{ color: C.textLight, fontSize: 14 }}>Aucune reservation</Text></View>}
            renderItem={({ item }) => (
              <TouchableOpacity style={[st.card, { backgroundColor: C.card, borderColor: C.border }]} onPress={() => setActionModal(item)} data-testid={`res-${item.id}`}>
                <View style={st.cardHeader}>
                  <Text style={[st.clientName, { color: C.text }]}>{item.user_name}</Text>
                  <View style={[st.badge, { backgroundColor: statusColor(item.status) + '20' }]}>
                    <Text style={{ color: statusColor(item.status), fontSize: 11, fontWeight: '700' }}>{statusLabel(item.status)}</Text>
                  </View>
                </View>
                <Text style={{ color: C.textLight, fontSize: 13, marginBottom: 8 }}>{item.vehicle_name}</Text>
                <View style={st.cardFooter}>
                  <Text style={{ color: C.textLight, fontSize: 12 }}>
                    {item.start_date ? format(new Date(item.start_date), 'dd MMM', { locale: fr }) : ''} - {item.end_date ? format(new Date(item.end_date), 'dd MMM', { locale: fr }) : ''}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ color: item.payment_status === 'paid' ? C.success : C.warning, fontSize: 11, fontWeight: '600' }}>
                      {item.payment_status === 'paid' ? 'Paye' : 'Non paye'}
                    </Text>
                    <Text style={{ color: C.accent, fontSize: 14, fontWeight: '700' }}>CHF {item.total_price?.toFixed(2)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
        </>
      )}

      {/* Action Modal */}
      <Modal visible={!!actionModal} transparent animationType="slide" onRequestClose={() => setActionModal(null)}>
        <View style={st.modalOverlay}>
          <View style={[st.modal, { backgroundColor: C.card }]}>
            <View style={st.modalHeader}>
              <Text style={{ color: C.text, fontSize: 18, fontWeight: '800' }}>Actions</Text>
              <TouchableOpacity onPress={() => setActionModal(null)}><Ionicons name="close" size={24} color={C.text} /></TouchableOpacity>
            </View>
            {actionModal && (
              <ScrollView>
                <Text style={{ color: C.textLight, fontSize: 14, marginBottom: 4 }}>{actionModal.user_name} - {actionModal.vehicle_name}</Text>
                <Text style={{ color: C.text, fontSize: 20, fontWeight: '800', marginBottom: 16 }}>CHF {actionModal.total_price?.toFixed(2)}</Text>

                <Text style={[st.modalSection, { color: C.textLight }]}>Contrat</Text>
                <TouchableOpacity style={[st.actionBtn, { borderColor: C.border }]}
                  onPress={async () => {
                    setContractLoading(true);
                    try {
                      const resp = await api.get(`/api/contracts/by-reservation/${actionModal.id}`);
                      setActionModal(null); router.push(`/contract/${resp.data.id}` as any);
                    } catch (err: any) {
                      if (err.response?.status === 404) {
                        try {
                          const genResp = await api.post('/api/admin/contracts/generate', { reservation_id: actionModal.id, language: 'fr' });
                          Platform.OS === 'web' ? window.alert('Contrat genere !') : Alert.alert('Succes', 'Contrat genere !');
                          setActionModal(null); router.push(`/contract/${genResp.data.contract_id}` as any);
                        } catch (genErr: any) { Platform.OS === 'web' ? window.alert(genErr.response?.data?.detail || 'Erreur') : Alert.alert('Erreur'); }
                      } else { Platform.OS === 'web' ? window.alert('Erreur') : Alert.alert('Erreur'); }
                    } finally { setContractLoading(false); }
                  }} data-testid="contract-view-btn">
                  <Ionicons name="document-text" size={18} color={C.accent} />
                  <Text style={{ color: C.text, fontSize: 14 }}>{contractLoading ? 'Chargement...' : 'Voir / Generer le contrat'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[st.actionBtn, { borderColor: C.border }]}
                  onPress={async () => {
                    try {
                      const resp = await api.get(`/api/contracts/by-reservation/${actionModal.id}`);
                      await api.put(`/api/contracts/${resp.data.id}/send`);
                      Platform.OS === 'web' ? window.alert('Contrat envoye!') : Alert.alert('Succes', 'Contrat envoye!');
                    } catch (err: any) { Platform.OS === 'web' ? window.alert(err.response?.status === 404 ? 'Generez d\'abord le contrat' : 'Erreur') : Alert.alert('Erreur'); }
                  }} data-testid="contract-send-btn">
                  <Ionicons name="send" size={18} color={C.success} />
                  <Text style={{ color: C.text, fontSize: 14 }}>Envoyer le contrat au client</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[st.actionBtn, { borderColor: C.border }]}
                  onPress={async () => {
                    try {
                      const resp = await api.get(`/api/contracts/by-reservation/${actionModal.id}`);
                      const pdfResp = await api.get(`/api/contracts/${resp.data.id}/pdf`, { responseType: 'blob' });
                      if (Platform.OS === 'web') {
                        const blob = new Blob([pdfResp.data], { type: 'application/pdf' });
                        const url = URL.createObjectURL(blob); const a = document.createElement('a');
                        a.href = url; a.download = `contrat_${resp.data.id.slice(0, 8)}.pdf`; a.click(); URL.revokeObjectURL(url);
                      }
                    } catch (err: any) { Platform.OS === 'web' ? window.alert(err.response?.status === 404 ? 'Generez d\'abord le contrat' : 'Erreur') : Alert.alert('Erreur'); }
                  }} data-testid="contract-pdf-btn">
                  <Ionicons name="download" size={18} color={C.accent} />
                  <Text style={{ color: C.text, fontSize: 14 }}>Telecharger le PDF</Text>
                </TouchableOpacity>

                <Text style={[st.modalSection, { color: C.textLight }]}>Statut</Text>
                {['confirmed', 'active', 'completed', 'cancelled'].map(s => (
                  <TouchableOpacity key={s} style={[st.actionBtn, { borderColor: C.border }]} onPress={() => updateStatus(actionModal.id, s)}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: statusColor(s) }} />
                    <Text style={{ color: C.text, fontSize: 14 }}>{statusLabel(s)}</Text>
                  </TouchableOpacity>
                ))}

                <Text style={[st.modalSection, { color: C.textLight }]}>Paiement</Text>
                <TouchableOpacity style={[st.actionBtn, { borderColor: C.border }]} onPress={() => updatePayment(actionModal.id, 'paid')}>
                  <Ionicons name="checkmark-circle" size={18} color={C.success} />
                  <Text style={{ color: C.text, fontSize: 14 }}>Marquer comme paye</Text>
                </TouchableOpacity>
                {actionModal.payment_status !== 'paid' && (
                  <TouchableOpacity style={[st.actionBtn, { borderColor: C.border, borderBottomWidth: 0 }]} onPress={() => sendPaymentLink(actionModal.id)} disabled={sendingLink}>
                    <Ionicons name="link" size={18} color={C.accent} />
                    <Text style={{ color: C.accent, fontSize: 14 }}>{sendingLink ? 'Envoi...' : 'Envoyer lien de paiement'}</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  toggleRow: { flexDirection: 'row', margin: 16, marginBottom: 0, borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  labelCell: { paddingHorizontal: 8, paddingVertical: 6, justifyContent: 'center', borderRightWidth: 1, borderBottomWidth: 1 },
  dayHeaderCell: { alignItems: 'center', justifyContent: 'center', paddingVertical: 4, borderRightWidth: 0.5, borderBottomWidth: 1 },
  dayCell: { justifyContent: 'center', alignItems: 'center', borderRightWidth: 0.5, borderBottomWidth: 0.5 },
  resBar: { position: 'absolute', top: 4, bottom: 4, left: 0, right: 0, justifyContent: 'center' },
  resItem: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, borderWidth: 1, marginBottom: 6, gap: 10 },
  resItemDot: { width: 8, height: 8, borderRadius: 4 },
  resItemBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  searchBar: { flexDirection: 'row', alignItems: 'center', margin: 16, marginBottom: 0, borderRadius: 10, paddingHorizontal: 12, gap: 8, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 14 },
  filterTab: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  card: { borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  clientName: { fontSize: 15, fontWeight: '700' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalSection: { fontSize: 12, fontWeight: '600', marginTop: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1 },
});
