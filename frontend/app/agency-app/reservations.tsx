import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, TextInput, ScrollView, Platform, Alert, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../../src/api/axios';
import { format, addMonths, startOfMonth, endOfMonth, formatDistanceToNow } from 'date-fns';
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
  created_at?: string; user_phone?: string; days_overdue?: number;
}

interface VehicleSchedule {
  id: string; brand: string; model: string; price_per_day: number;
  reservations: { id: string; start: string; end: string; status: string; user_name?: string }[];
}

const STATUS_FILTERS = [
  { value: null, label: 'Toutes', icon: 'list' },
  { value: 'confirmed', label: 'Confirmees', icon: 'checkmark-circle' },
  { value: 'active', label: 'En cours', icon: 'car' },
  { value: 'completed', label: 'Terminees', icon: 'checkmark-done' },
  { value: 'cancelled', label: 'Annulees', icon: 'close-circle' },
  { value: 'pending', label: 'En attente', icon: 'time' },
  { value: 'pending_cash', label: 'Especes', icon: 'cash' },
];

const RES_COLORS: Record<string, string> = {
  confirmed: '#10B981', active: '#3B82F6', pending: '#FBBF24', pending_cash: '#A855F7',
  completed: '#6B7280', cancelled: '#EF4444',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Confirmee', pending_cash: 'Especes', confirmed: 'Confirmee',
  active: 'En cours', completed: 'Terminee', cancelled: 'Annulee',
};

type ViewMode = 'today' | 'gestion' | 'planning';

export default function AgencyReservations() {
  const { colors: C } = useThemeStore();
  const params = useLocalSearchParams<{ highlight?: string; month?: string; tab?: string }>();
  const [viewMode, setViewMode] = useState<ViewMode>('gestion');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [schedule, setSchedule] = useState<VehicleSchedule[]>([]);
  const [orphanReservations, setOrphanReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [actionModal, setActionModal] = useState<Reservation | null>(null);
  const [sendingLink, setSendingLink] = useState(false);
  const [planningMonth, setPlanningMonth] = useState(startOfMonth(new Date()));
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [showAllVehicles, setShowAllVehicles] = useState(true);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const highlightAnim = useRef(new Animated.Value(1)).current;
  const router = useRouter();

  // Today tab state
  const [todayData, setTodayData] = useState<any>(null);
  const [overdueData, setOverdueData] = useState<any>(null);
  const [statsData, setStatsData] = useState<any>(null);
  const [todayLoading, setTodayLoading] = useState(false);

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
    if (params.tab === 'planning') setViewMode('planning');
  }, [params.highlight, params.month, params.tab]);

  const fetchReservations = async () => {
    try {
      const res = await api.get('/api/admin/reservations?limit=200');
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
      setOrphanReservations(res.data.orphan_reservations || []);
    } catch (e) { console.error(e); }
    finally { setScheduleLoading(false); }
  }, [planningMonth]);

  const fetchTodayData = async () => {
    setTodayLoading(true);
    try {
      const [todayRes, overdueRes, statsRes] = await Promise.all([
        api.get('/api/admin/reservations/today'),
        api.get('/api/admin/overdue'),
        api.get('/api/admin/stats'),
      ]);
      setTodayData(todayRes.data);
      setOverdueData(overdueRes.data);
      setStatsData(statsRes.data);
    } catch (e) { console.error(e); }
    finally { setTodayLoading(false); }
  };

  useEffect(() => { fetchReservations(); }, []);
  useEffect(() => { if (viewMode === 'planning') fetchSchedule(); }, [viewMode, fetchSchedule]);
  useEffect(() => { if (viewMode === 'today') fetchTodayData(); }, [viewMode]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReservations();
    if (viewMode === 'planning') await fetchSchedule();
    if (viewMode === 'today') await fetchTodayData();
    setRefreshing(false);
  };

  const filtered = useMemo(() => {
    let list = reservations;
    if (filter) list = list.filter(r => r.status === filter);
    if (search) list = list.filter(r =>
      r.user_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.vehicle_name?.toLowerCase().includes(search.toLowerCase())
    );
    list = [...list].sort((a, b) => {
      const da = new Date(a.start_date).getTime();
      const db = new Date(b.start_date).getTime();
      return sortOrder === 'desc' ? db - da : da - db;
    });
    return list;
  }, [reservations, filter, search, sortOrder]);

  // Pagination for Gestion
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const paginatedList = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);
  const totalPages = Math.ceil(filtered.length / pageSize);
  useEffect(() => { setPage(1); }, [filter, search, sortOrder]);

  const statusColor = (s: string) => RES_COLORS[s] || C.textLight;
  const statusLabel = (s: string) => STATUS_LABELS[s] || s;

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.put(`/api/admin/reservations/${id}/status?status=${status}`);
      setActionModal(null);
      fetchReservations();
      fetchSchedule();
      if (status === 'confirmed') {
        try {
          const contractResp = await api.get(`/api/contracts/by-reservation/${id}`);
          if (contractResp.data) {
            router.push(`/contract/${contractResp.data.id}` as any);
          } else {
            const genResp = await api.post('/api/admin/contracts/generate', { reservation_id: id, language: 'fr' });
            Platform.OS === 'web' ? window.alert('Contrat genere automatiquement !') : Alert.alert('Succes', 'Contrat genere !');
            router.push(`/contract/${genResp.data.contract_id}` as any);
          }
        } catch (contractErr: any) {
          const msg = contractErr.response?.data?.detail || 'Reservation confirmee, erreur contrat';
          Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Info', msg);
        }
      }
    } catch (e: any) {
      const msg = e.response?.data?.detail || 'Erreur';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Erreur', msg);
    }
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

  const goToPlanning = (resId?: string) => {
    setViewMode('planning');
    if (resId) setHighlightId(resId);
  };

  // ======== Computed values (MUST be before early return) ========
  const todayCount = todayData?.total || 0;
  const activeCount = statsData?.reservations_by_status?.active || 0;
  const upcomingCount = (statsData?.reservations_by_status?.confirmed || 0) + (statsData?.reservations_by_status?.pending || 0);
  const overdueCount = overdueData?.total || 0;

  const recentReservations = useMemo(() => {
    return [...reservations].sort((a, b) => {
      const da = new Date(a.created_at || a.start_date).getTime();
      const db = new Date(b.created_at || b.start_date).getTime();
      return db - da;
    }).slice(0, 6);
  }, [reservations]);

  const pendingPayments = useMemo(() => {
    return reservations.filter(r => r.payment_status === 'unpaid' && r.status !== 'cancelled').slice(0, 3);
  }, [reservations]);

  if (loading) return (
    <View style={[st.container, { backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color={C.accent} />
    </View>
  );

  return (
    <View style={[st.container, { backgroundColor: C.bg }]}>
      {/* ====== TAB BAR ====== */}
      <View style={[st.tabBar, { backgroundColor: C.card, borderColor: C.border }]}>
        {([
          { key: 'today', label: "Aujourd'hui", icon: 'sunny-outline' },
          { key: 'gestion', label: 'Gestion', icon: 'briefcase-outline' },
          { key: 'planning', label: 'Planning', icon: 'calendar-outline' },
        ] as { key: ViewMode; label: string; icon: string }[]).map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[st.tabBtn, viewMode === tab.key && { backgroundColor: C.accent, borderColor: C.accent }]}
            onPress={() => setViewMode(tab.key)}
            data-testid={`tab-${tab.key}`}
          >
            <Ionicons name={tab.icon as any} size={16} color={viewMode === tab.key ? '#fff' : C.textLight} />
            <Text style={[st.tabLabel, { color: viewMode === tab.key ? '#fff' : C.textLight }]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ====== AUJOURD'HUI VIEW ====== */}
      {viewMode === 'today' && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
        >
          {todayLoading ? (
            <ActivityIndicator size="large" color={C.accent} style={{ marginTop: 60 }} />
          ) : (
            <>
              {/* KPI Cards */}
              <View style={st.kpiRow} data-testid="today-kpis">
                {[
                  { label: "Reservations aujourd'hui", value: todayCount, icon: 'car-sport', color: '#3B82F6', bg: '#EFF6FF' },
                  { label: 'En cours', value: activeCount, icon: 'play-circle', color: '#10B981', bg: '#ECFDF5' },
                  { label: 'A venir', value: upcomingCount, icon: 'calendar', color: '#8B5CF6', bg: '#F5F3FF' },
                  { label: 'Retards', value: overdueCount, icon: 'warning', color: '#EF4444', bg: '#FEF2F2' },
                ].map((kpi, i) => (
                  <View key={i} style={[st.kpiCard, { backgroundColor: kpi.bg, borderColor: kpi.color + '30' }]} data-testid={`kpi-${i}`}>
                    <View style={[st.kpiIconWrap, { backgroundColor: kpi.color + '20' }]}>
                      <Ionicons name={kpi.icon as any} size={20} color={kpi.color} />
                    </View>
                    <Text style={[st.kpiValue, { color: kpi.color }]}>{kpi.value}</Text>
                    <Text style={st.kpiLabel}>{kpi.label}</Text>
                  </View>
                ))}
              </View>

              {/* Activite Recente */}
              <View style={[st.section, { backgroundColor: C.card, borderColor: C.border }]} data-testid="recent-activity">
                <View style={st.sectionHeader}>
                  <Ionicons name="pulse" size={18} color={C.accent} />
                  <Text style={[st.sectionTitle, { color: C.text }]}>Activite Recente</Text>
                </View>
                {todayData?.reservations?.length ? (
                  todayData.reservations.slice(0, 5).map((r: any) => {
                    const isActive = r.status === 'active';
                    const isOverdue = r.status === 'active' && new Date(r.end_date) < new Date();
                    const dotColor = isOverdue ? '#EF4444' : isActive ? '#10B981' : r.status === 'confirmed' ? '#3B82F6' : '#F59E0B';
                    const label = isOverdue ? 'Vehicule en retard' : isActive ? 'Location en cours' : r.status === 'confirmed' ? 'Depart prevu' : 'Reservation en attente';
                    return (
                      <TouchableOpacity key={r.id} style={st.activityRow} onPress={() => setActionModal(r)} data-testid={`activity-${r.id}`}>
                        <View style={[st.activityDot, { backgroundColor: dotColor }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={[st.activityLabel, { color: C.text }]}>
                            <Text style={{ fontWeight: '800' }}>{label}</Text>{' '}{r.user_name} - {r.vehicle_name}
                          </Text>
                          <Text style={{ color: C.textLight, fontSize: 11 }}>
                            {format(new Date(r.start_date), 'dd/MM', { locale: fr })} - {format(new Date(r.end_date), 'dd/MM', { locale: fr })}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={14} color={C.textLight} />
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <Text style={{ color: C.textLight, fontSize: 13, padding: 16, textAlign: 'center' }}>Aucune activite aujourd'hui</Text>
                )}
              </View>

              {/* Dernieres Reservations (table) */}
              <View style={[st.section, { backgroundColor: C.card, borderColor: C.border }]} data-testid="recent-reservations-table">
                <View style={st.sectionHeader}>
                  <Ionicons name="documents" size={18} color={C.accent} />
                  <Text style={[st.sectionTitle, { color: C.text }]}>Dernieres Reservations</Text>
                </View>
                {/* Table header */}
                <View style={[st.tableRow, { backgroundColor: C.bg, borderTopLeftRadius: 8, borderTopRightRadius: 8 }]}>
                  <Text style={[st.tableHeaderCell, { flex: 1.2, color: C.textLight }]}>Client</Text>
                  <Text style={[st.tableHeaderCell, { flex: 1.2, color: C.textLight }]}>Vehicule</Text>
                  <Text style={[st.tableHeaderCell, { flex: 0.8, color: C.textLight }]}>Debut</Text>
                  <Text style={[st.tableHeaderCell, { flex: 0.7, color: C.textLight }]}>Statut</Text>
                  <Text style={[st.tableHeaderCell, { flex: 1, color: C.textLight }]}>Actions</Text>
                </View>
                {recentReservations.map((r, i) => (
                  <View key={r.id} style={[st.tableRow, i % 2 === 0 ? {} : { backgroundColor: C.bg + '60' }]} data-testid={`table-row-${r.id}`}>
                    <Text style={[st.tableCell, { flex: 1.2, color: C.text, fontWeight: '600' }]} numberOfLines={1}>{r.user_name}</Text>
                    <Text style={[st.tableCell, { flex: 1.2, color: C.text }]} numberOfLines={1}>{r.vehicle_name}</Text>
                    <Text style={[st.tableCell, { flex: 0.8, color: C.textLight }]}>{format(new Date(r.start_date), 'dd/MM/yy')}</Text>
                    <View style={{ flex: 0.7, paddingVertical: 8, paddingHorizontal: 4 }}>
                      <View style={[st.statusPill, { backgroundColor: statusColor(r.status) + '18' }]}>
                        <Text style={[st.statusPillText, { color: statusColor(r.status) }]}>{statusLabel(r.status)}</Text>
                      </View>
                    </View>
                    <View style={{ flex: 1, flexDirection: 'row', gap: 4, alignItems: 'center', paddingVertical: 6 }}>
                      <TouchableOpacity style={st.miniBtn} onPress={() => setActionModal(r)} data-testid={`voir-${r.id}`}>
                        <Text style={st.miniBtnText}>Voir</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[st.miniBtn, { backgroundColor: '#8B5CF610', borderColor: '#8B5CF640' }]} onPress={() => goToPlanning(r.id)} data-testid={`planning-${r.id}`}>
                        <Ionicons name="calendar-outline" size={11} color="#8B5CF6" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
                <TouchableOpacity style={st.seeAllBtn} onPress={() => setViewMode('gestion')} data-testid="see-all-reservations">
                  <Text style={[st.seeAllText, { color: C.accent }]}>Voir toutes les reservations</Text>
                </TouchableOpacity>
              </View>

              {/* Alert Cards */}
              {(overdueCount > 0 || pendingPayments.length > 0) && (
                <View style={st.alertRow} data-testid="alert-cards">
                  {overdueData?.overdue?.slice(0, 2).map((o: any) => (
                    <TouchableOpacity key={o.id} style={[st.alertCard, { backgroundColor: '#FEF2F2', borderColor: '#FCA5A530' }]} onPress={() => setActionModal(o)} data-testid={`alert-overdue-${o.id}`}>
                      <View style={[st.alertIconWrap, { backgroundColor: '#EF444420' }]}>
                        <Ionicons name="car" size={18} color="#EF4444" />
                      </View>
                      <Text style={[st.alertTitle, { color: '#B91C1C' }]}>Vehicule non rendu</Text>
                      <Text style={st.alertDesc}>{o.vehicle_name} - {o.days_overdue}j retard</Text>
                    </TouchableOpacity>
                  ))}
                  {pendingPayments.slice(0, 1).map(p => (
                    <TouchableOpacity key={p.id} style={[st.alertCard, { backgroundColor: '#FFF7ED', borderColor: '#FDBA7430' }]} onPress={() => setActionModal(p)} data-testid={`alert-payment-${p.id}`}>
                      <View style={[st.alertIconWrap, { backgroundColor: '#F59E0B20' }]}>
                        <Ionicons name="card" size={18} color="#D97706" />
                      </View>
                      <Text style={[st.alertTitle, { color: '#92400E' }]}>Paiement en attente</Text>
                      <Text style={st.alertDesc}>{p.user_name} - CHF {p.total_price}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* ====== GESTION VIEW ====== */}
      {viewMode === 'gestion' && (
        <>
          {/* Search + Sort */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 12 }}>
            <View style={[st.searchBar, { backgroundColor: C.card, borderColor: C.border, flex: 1 }]}>
              <Ionicons name="search" size={18} color={C.textLight} />
              <TextInput
                style={[st.searchInput, { color: C.text }]}
                placeholder="Rechercher client, vehicule..."
                placeholderTextColor={C.textLight}
                value={search}
                onChangeText={setSearch}
              />
            </View>
            <TouchableOpacity
              style={[st.sortBtn, { backgroundColor: C.card, borderColor: C.border }]}
              onPress={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              data-testid="sort-toggle"
            >
              <Ionicons name={sortOrder === 'desc' ? 'arrow-down' : 'arrow-up'} size={16} color={C.accent} />
              <Text style={{ color: C.accent, fontSize: 12, fontWeight: '700' }}>Date</Text>
            </TouchableOpacity>
          </View>

          {/* Status filters */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, marginTop: 12, marginBottom: 4, paddingBottom: 4 }}>
            {STATUS_FILTERS.map((f) => (
              <TouchableOpacity
                key={f.label}
                onPress={() => setFilter(f.value)}
                style={[st.filterPill, {
                  borderColor: filter === f.value ? C.accent : C.border,
                  backgroundColor: filter === f.value ? C.accent : C.card,
                }]}
                data-testid={`filter-${f.value || 'all'}`}
              >
                <Ionicons name={f.icon as any} size={14} color={filter === f.value ? '#FFFFFF' : C.textLight} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: filter === f.value ? '#FFFFFF' : C.text }}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Results count + pagination info */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 6 }}>
            <Text style={{ color: C.textLight, fontSize: 12, fontWeight: '600' }}>{filtered.length} reservation(s)</Text>
            {totalPages > 1 && (
              <Text style={{ color: C.textLight, fontSize: 12 }}>Page {page} / {totalPages}</Text>
            )}
          </View>

          {/* Reservation cards (3 columns) */}
          <FlatList
            data={paginatedList}
            keyExtractor={(item) => item.id}
            numColumns={3}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
            contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 32 }}
            columnWrapperStyle={{ gap: 10, marginBottom: 10 }}
            ListEmptyComponent={
              <View style={st.empty}>
                <Ionicons name="calendar-outline" size={40} color={C.textLight} />
                <Text style={{ color: C.textLight, fontSize: 14 }}>Aucune reservation</Text>
              </View>
            }
            renderItem={({ item }) => (
              <ReservationCard item={item} C={C} statusColor={statusColor} updateStatus={updateStatus} onActionPress={setActionModal} />
            )}
            ListFooterComponent={
              totalPages > 1 ? (
                <View style={st.paginationRow}>
                  <TouchableOpacity
                    style={[st.pageBtn, { opacity: page <= 1 ? 0.4 : 1, borderColor: C.border, backgroundColor: C.card }]}
                    onPress={() => setPage(Math.max(1, page - 1))}
                    disabled={page <= 1}
                    data-testid="prev-page"
                  >
                    <Ionicons name="chevron-back" size={16} color={C.accent} />
                  </TouchableOpacity>
                  <Text style={{ color: C.text, fontSize: 13, fontWeight: '700' }}>Page {page} / {totalPages}</Text>
                  <TouchableOpacity
                    style={[st.pageBtn, { opacity: page >= totalPages ? 0.4 : 1, borderColor: C.border, backgroundColor: C.card }]}
                    onPress={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page >= totalPages}
                    data-testid="next-page"
                  >
                    <Ionicons name="chevron-forward" size={16} color={C.accent} />
                  </TouchableOpacity>
                </View>
              ) : null
            }
          />
        </>
      )}

      {/* ====== PLANNING VIEW ====== */}
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
            C={C} schedule={schedule} orphanReservations={orphanReservations} planningMonth={planningMonth}
            scheduleLoading={scheduleLoading} refreshing={refreshing} onRefresh={onRefresh}
            vehicleSearch={vehicleSearch} setVehicleSearch={setVehicleSearch}
            showAllVehicles={showAllVehicles} setShowAllVehicles={setShowAllVehicles}
            highlightId={highlightId} highlightAnim={highlightAnim}
            updateStatus={updateStatus}
          />
        </View>
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
  // Tab bar
  tabBar: { flexDirection: 'row', marginHorizontal: 16, marginTop: 12, marginBottom: 4, borderRadius: 12, borderWidth: 1, overflow: 'hidden', gap: 2, padding: 3 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  tabLabel: { fontSize: 13, fontWeight: '700' },
  // KPI
  kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 16, flexWrap: 'wrap' },
  kpiCard: { flex: 1, minWidth: 150, borderRadius: 14, padding: 14, borderWidth: 1, alignItems: 'center', gap: 4 },
  kpiIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  kpiValue: { fontSize: 28, fontWeight: '900' },
  kpiLabel: { fontSize: 11, fontWeight: '600', color: '#6B7280', textAlign: 'center' },
  // Section
  section: { borderRadius: 14, borderWidth: 1, marginBottom: 16, overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, paddingBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '800' },
  // Activity
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 0.5, borderColor: '#E5E7EB' },
  activityDot: { width: 10, height: 10, borderRadius: 5 },
  activityLabel: { fontSize: 13 },
  // Table
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  tableHeaderCell: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', paddingVertical: 10, paddingHorizontal: 4 },
  tableCell: { fontSize: 12, paddingVertical: 8, paddingHorizontal: 4 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  statusPillText: { fontSize: 10, fontWeight: '800' },
  miniBtn: { backgroundColor: '#3B82F610', borderWidth: 1, borderColor: '#3B82F640', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  miniBtnText: { fontSize: 11, fontWeight: '700', color: '#3B82F6' },
  seeAllBtn: { padding: 12, alignItems: 'center', borderTopWidth: 0.5, borderColor: '#E5E7EB' },
  seeAllText: { fontSize: 13, fontWeight: '700' },
  // Alert cards
  alertRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  alertCard: { flex: 1, minWidth: 200, borderRadius: 14, padding: 14, borderWidth: 1, gap: 6 },
  alertIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  alertTitle: { fontSize: 13, fontWeight: '800' },
  alertDesc: { fontSize: 12, color: '#6B7280' },
  // Gestion
  searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 12, gap: 8, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 10 },
  sortBtn: { borderWidth: 1, borderRadius: 10, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 4 },
  filterPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  paginationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 16 },
  pageBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  // Planning
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  // Shared
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
});
