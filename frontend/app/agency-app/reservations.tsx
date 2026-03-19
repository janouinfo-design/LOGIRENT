import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, TextInput, ScrollView, Platform, Alert, Dimensions, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../../src/api/axios';
import { format, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useThemeStore } from '../../src/store/themeStore';
import { GanttChart } from '../../src/components/agency/GanttChart';
import { ReservationCard } from '../../src/components/agency/ReservationCard';
import { ReservationActionModal } from '../../src/components/agency/ReservationActionModal';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

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
  { value: 'pending_cash', label: 'Especes' },
  { value: 'confirmed', label: 'Confirmees' },
  { value: 'active', label: 'Actives' },
  { value: 'completed', label: 'Terminees' },
  { value: 'cancelled', label: 'Annulees' },
];

const RES_COLORS: Record<string, string> = {
  confirmed: '#10B981', active: '#3B82F6', pending: '#FBBF24', pending_cash: '#A855F7',
  completed: '#6B7280', cancelled: '#EF4444',
};

export default function AgencyReservations() {
  const { colors: C } = useThemeStore();
  const params = useLocalSearchParams<{ highlight?: string; month?: string }>();
  const [viewMode, setViewMode] = useState<'list' | 'planning'>('planning');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [schedule, setSchedule] = useState<VehicleSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [actionModal, setActionModal] = useState<Reservation | null>(null);
  const [sendingLink, setSendingLink] = useState(false);
  const [planningMonth, setPlanningMonth] = useState(startOfMonth(new Date()));
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [showAllVehicles, setShowAllVehicles] = useState(false);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const highlightAnim = useRef(new Animated.Value(1)).current;
  const router = useRouter();

  // Handle highlight param from booking flow
  useEffect(() => {
    if (params.highlight) {
      setHighlightId(params.highlight);
      setViewMode('planning');
      setShowAllVehicles(true);
      if (params.month) {
        try {
          const [y, m] = params.month.split('-').map(Number);
          setPlanningMonth(startOfMonth(new Date(y, m - 1)));
        } catch {}
      }
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(highlightAnim, { toValue: 0.3, duration: 500, useNativeDriver: false }),
          Animated.timing(highlightAnim, { toValue: 1, duration: 500, useNativeDriver: false }),
        ]),
        { iterations: 4 }
      );
      pulse.start();
      const timer = setTimeout(() => { setHighlightId(null); pulse.stop(); highlightAnim.setValue(1); }, 4000);
      return () => { clearTimeout(timer); pulse.stop(); };
    }
  }, [params.highlight, params.month]);

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
      setSchedule(res.data.vehicles || res.data || []);
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
    const map: Record<string, string> = { pending: 'En attente', pending_cash: 'Especes', confirmed: 'Confirmee', active: 'Active', completed: 'Terminee', cancelled: 'Annulee' };
    return map[s] || s;
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.put(`/api/admin/reservations/${id}/status?status=${status}`);
      setActionModal(null);
      fetchReservations();
      fetchSchedule();

      // Auto-generate contract when confirming a reservation
      if (status === 'confirmed') {
        try {
          // Check if contract already exists
          const contractResp = await api.get(`/api/contracts/by-reservation/${id}`);
          if (contractResp.data) {
            // Contract exists, navigate to it
            router.push(`/contract/${contractResp.data.id}` as any);
          } else {
            // Generate new contract
            const genResp = await api.post('/api/admin/contracts/generate', { reservation_id: id, language: 'fr' });
            Platform.OS === 'web' ? window.alert('Contrat genere automatiquement !') : Alert.alert('Succes', 'Contrat genere !');
            router.push(`/contract/${genResp.data.contract_id}` as any);
          }
        } catch (contractErr: any) {
          // Contract generation failed, but reservation status is updated
          const msg = contractErr.response?.data?.detail || 'Reservation confirmee, mais erreur lors de la generation du contrat';
          Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Info', msg);
        }
      }
    }
    catch (e: any) { const msg = e.response?.data?.detail || 'Erreur'; Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Erreur', msg); }
  };
  const updatePayment = async (id: string, status: string) => {
    try { await api.put(`/api/admin/reservations/${id}/payment-status?payment_status=${status}`); setActionModal(null); fetchReservations(); }
    catch (e: any) { const msg = e.response?.data?.detail || 'Erreur'; Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Erreur', msg); }
  };
  const sendPaymentLink = async (id: string) => {
    setSendingLink(true);
    try { await api.post(`/api/admin/reservations/${id}/send-payment-link`, { origin_url: API_URL }); Platform.OS === 'web' ? window.alert('Lien envoye!') : Alert.alert('Succes', 'Lien envoye!'); setActionModal(null); }
    catch (e: any) { Platform.OS === 'web' ? window.alert(e.response?.data?.detail || 'Erreur') : Alert.alert('Erreur'); }
    finally { setSendingLink(false); }
  };

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

      {/* PLANNING VIEW */}
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

          {/* Highlight success banner */}
          {highlightId && (
            <Animated.View style={{ opacity: highlightAnim, flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 8, padding: 10, borderRadius: 10, backgroundColor: '#10B981' }} data-testid="highlight-banner">
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', flex: 1 }}>Reservation creee avec succes !</Text>
            </Animated.View>
          )}

          {/* Legend */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10, paddingBottom: 8 }}>
            {Object.entries(RES_COLORS).filter(([k]) => k !== 'completed' && k !== 'cancelled').map(([k, color]) => (
              <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
                <Text style={{ color: C.textLight, fontSize: 10 }}>{statusLabel(k)}</Text>
              </View>
            ))}
          </ScrollView>

          <GanttChart
            C={C} schedule={schedule} planningMonth={planningMonth}
            scheduleLoading={scheduleLoading} refreshing={refreshing} onRefresh={onRefresh}
            vehicleSearch={vehicleSearch} setVehicleSearch={setVehicleSearch}
            showAllVehicles={showAllVehicles} setShowAllVehicles={setShowAllVehicles}
            highlightId={highlightId} highlightAnim={highlightAnim}
            updateStatus={updateStatus}
          />
        </View>
      )}

      {/* LIST VIEW */}
      {viewMode === 'list' && (
        <>
          <View style={[st.searchBar, { backgroundColor: C.card, borderColor: C.border }]}>
            <Ionicons name="search" size={18} color={C.textLight} />
            <TextInput style={[st.searchInput, { color: C.text }]} placeholder="Rechercher..." placeholderTextColor={C.textLight} value={search} onChangeText={setSearch} />
          </View>

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
            numColumns={3}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
            contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
            columnWrapperStyle={{ gap: 10, marginBottom: 10 }}
            ListEmptyComponent={<View style={st.empty}><Ionicons name="calendar-outline" size={40} color={C.textLight} /><Text style={{ color: C.textLight, fontSize: 14 }}>Aucune reservation</Text></View>}
            renderItem={({ item }) => (
              <ReservationCard item={item} C={C} statusColor={statusColor} updateStatus={updateStatus} onActionPress={setActionModal} />
            )}
          />
        </>
      )}

      {/* Action Modal */}
      <ReservationActionModal
        actionModal={actionModal} setActionModal={setActionModal}
        C={C} statusColor={statusColor}
        updateStatus={updateStatus} updatePayment={updatePayment}
        sendPaymentLink={sendPaymentLink} sendingLink={sendingLink}
      />
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  toggleRow: { flexDirection: 'row', margin: 16, marginBottom: 0, borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  searchBar: { flexDirection: 'row', alignItems: 'center', margin: 16, marginBottom: 0, borderRadius: 10, paddingHorizontal: 12, gap: 8, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 10 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
});
