import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput, ScrollView, Platform, Alert, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../../src/api/axios';
import { format, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useThemeStore } from '../../src/store/themeStore';
import { GanttChart } from '../../src/components/agency/GanttChart';
import { ReservationActionModal } from '../../src/components/agency/ReservationActionModal';
import ReturnVehicleModal from '../../src/components/agency/ReturnVehicleModal';

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

const QUICK_FILTERS = [
  { value: null, label: "Aujourd'hui" },
  { value: 'active', label: 'En cours' },
  { value: 'upcoming', label: 'A venir' },
  { value: 'overdue', label: 'Retards' },
  { value: 'cancelled', label: 'Annules' },
];

const RES_COLORS: Record<string, string> = {
  confirmed: '#10B981', active: '#3B82F6', pending: '#FBBF24', pending_cash: '#A855F7',
  completed: '#6B7280', cancelled: '#EF4444',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente', pending_cash: 'Especes', confirmed: 'Confirmee',
  active: 'En cours', completed: 'Terminee', cancelled: 'Annulee',
};

type ViewMode = 'gestion' | 'planning';

export default function AgencyReservations() {
  const { colors: C } = useThemeStore();
  const params = useLocalSearchParams<{ highlight?: string; month?: string; tab?: string }>();
  const [viewMode, setViewMode] = useState<ViewMode>('gestion');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [schedule, setSchedule] = useState<VehicleSchedule[]>([]);
  const [orphanReservations, setOrphanReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [quickFilter, setQuickFilter] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [actionModal, setActionModal] = useState<Reservation | null>(null);
  const [sendingLink, setSendingLink] = useState(false);
  const [planningMonth, setPlanningMonth] = useState(startOfMonth(new Date()));
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [showAllVehicles, setShowAllVehicles] = useState(true);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [sortCol, setSortCol] = useState<'start' | 'end' | 'price'>('start');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [returnModal, setReturnModal] = useState<any>(null);
  const highlightAnim = useRef(new Animated.Value(1)).current;
  const tableRef = useRef<View>(null);
  const scrollRef = useRef<ScrollView>(null);
  const router = useRouter();

  const scrollToTable = () => {
    if (Platform.OS === 'web' && tableRef.current) {
      (tableRef.current as any).scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    }
  };  const [todayData, setTodayData] = useState<any>(null);
  const [overdueData, setOverdueData] = useState<any>(null);
  const [statsData, setStatsData] = useState<any>(null);

  // Page for full table
  const [tablePage, setTablePage] = useState(1);
  const pageSize = 10;

  // Gantt filter sync (from GanttChart child)
  const [ganttStatusFilter, setGanttStatusFilter] = useState('all');
  const [ganttViewType, setGanttViewType] = useState('month');

  // Expanded alert in Gestion
  const [expandedAlert, setExpandedAlert] = useState<'overdue' | 'pending' | 'late' | null>(null);

  // Handle highlight param
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

  const fetchStats = async () => {
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
  };

  useEffect(() => { fetchReservations(); fetchStats(); }, []);
  useEffect(() => { if (viewMode === 'planning') fetchSchedule(); }, [viewMode, fetchSchedule]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchReservations(), fetchStats(), viewMode === 'planning' ? fetchSchedule() : Promise.resolve()]);
    setRefreshing(false);
  };

  // Derived data
  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');

  const filtered = useMemo(() => {
    let list = reservations;

    // Quick filter
    if (quickFilter === 'active') list = list.filter(r => r.status === 'active');
    else if (quickFilter === 'upcoming') list = list.filter(r => ['confirmed', 'pending', 'pending_cash'].includes(r.status));
    else if (quickFilter === 'overdue') list = list.filter(r => r.status === 'active' && new Date(r.end_date) < now);
    else if (quickFilter === 'cancelled') list = list.filter(r => r.status === 'cancelled');
    // null = today: show today's reservations
    else list = list.filter(r => {
      const sd = r.start_date?.substring(0, 10);
      const ed = r.end_date?.substring(0, 10);
      return sd <= todayStr && ed >= todayStr;
    });

    // Search
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r => r.user_name?.toLowerCase().includes(q) || r.vehicle_name?.toLowerCase().includes(q));
    }

    // Sort
    list = [...list].sort((a, b) => {
      let va: number, vb: number;
      if (sortCol === 'start') { va = new Date(a.start_date).getTime(); vb = new Date(b.start_date).getTime(); }
      else if (sortCol === 'end') { va = new Date(a.end_date).getTime(); vb = new Date(b.end_date).getTime(); }
      else { va = a.total_price; vb = b.total_price; }
      return sortDir === 'desc' ? vb - va : va - vb;
    });
    return list;
  }, [reservations, quickFilter, search, sortCol, sortDir, todayStr]);

  // Pagination
  const paged = useMemo(() => {
    const s = (tablePage - 1) * pageSize;
    return filtered.slice(s, s + pageSize);
  }, [filtered, tablePage]);
  const totalPages = Math.ceil(filtered.length / pageSize);
  useEffect(() => { setTablePage(1); }, [quickFilter, search, sortCol, sortDir]);

  // Recent reservations (last 5 created)
  const recent = useMemo(() => {
    return [...reservations].sort((a, b) => new Date(b.created_at || b.start_date).getTime() - new Date(a.created_at || a.start_date).getTime()).slice(0, 5);
  }, [reservations]);

  // Overdue
  const overdueList = overdueData?.overdue || [];
  const pendingPayments = useMemo(() => reservations.filter(r => r.payment_status === 'unpaid' && r.status !== 'cancelled'), [reservations]);

  // Planning reservation cards - filtered by schedule data
  const planningCards = useMemo(() => {
    if (!schedule.length) return [];
    const mStart = planningMonth.getTime();
    const mEnd = endOfMonth(planningMonth).getTime();
    const now = new Date();
    let cards: any[] = [];
    schedule.forEach(v => {
      (v.reservations || []).forEach(r => {
        try {
          const rStart = new Date(r.start).getTime();
          const rEnd = new Date(r.end).getTime();
          if (rStart <= mEnd && rEnd >= mStart) {
            cards.push({
              ...r, vehicle_brand: v.brand, vehicle_model: v.model,
              vehicle_name: `${v.brand} ${v.model}`, vehicle_id: v.id,
              price_per_day: v.price_per_day, start_date: r.start, end_date: r.end,
              total_days: Math.max(1, Math.ceil((rEnd - rStart) / 86400000)),
              isOverdue: r.status === 'active' && rEnd < now.getTime(),
            });
          }
        } catch {}
      });
    });
    if (ganttStatusFilter === 'confirmed') cards = cards.filter(r => r.status === 'confirmed');
    else if (ganttStatusFilter === 'active') cards = cards.filter(r => r.status === 'active');
    else if (ganttStatusFilter === 'overdue') cards = cards.filter(r => r.isOverdue);
    if (vehicleSearch) cards = cards.filter(r => r.vehicle_name.toLowerCase().includes(vehicleSearch.toLowerCase()));
    cards.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
    return cards;
  }, [schedule, planningMonth, ganttStatusFilter, vehicleSearch]);


  // KPI
  const kpiToday = todayData?.total || 0;
  const kpiActive = statsData?.reservations_by_status?.active || 0;
  const kpiUpcoming = (statsData?.reservations_by_status?.confirmed || 0) + (statsData?.reservations_by_status?.pending || 0);
  const kpiOverdue = overdueData?.total || 0;

  // Activity events
  const activityEvents = useMemo(() => {
    const events: { type: string; label: string; desc: string; color: string; res?: Reservation }[] = [];
    const today = new Date();
    // Overdue
    overdueList.slice(0, 1).forEach((o: any) => events.push({ type: 'overdue', label: 'Vehicule en retard', desc: `${o.vehicle_name} en retard`, color: '#EF4444', res: o }));
    // Recent created
    recent.slice(0, 1).forEach(r => {
      const created = new Date(r.created_at || r.start_date);
      const mins = Math.round((today.getTime() - created.getTime()) / 60000);
      events.push({ type: 'new', label: 'Nouvelle reservation', desc: mins < 60 ? `creee il y a ${mins} min` : `creee le ${format(created, 'dd/MM')}`, color: '#3B82F6', res: r });
    });
    // Active
    reservations.filter(r => r.status === 'active').slice(0, 1).forEach(r => events.push({ type: 'active', label: 'Location demarree', desc: `${r.user_name} a pris le vehicule`, color: '#10B981', res: r }));
    // Pending payment
    pendingPayments.slice(0, 1).forEach(r => events.push({ type: 'payment', label: 'Paiement en attente', desc: 'Paiement non recu', color: '#F59E0B', res: r }));
    return events;
  }, [overdueList, recent, reservations, pendingPayments]);

  const statusColor = (s: string) => RES_COLORS[s] || C.textLight;
  const statusLabel = (s: string) => STATUS_LABELS[s] || s;

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.put(`/api/admin/reservations/${id}/status?status=${status}`);
      setActionModal(null);
      fetchReservations(); fetchStats();
      if (status === 'confirmed') {
        try {
          const cr = await api.get(`/api/contracts/by-reservation/${id}`);
          if (cr.data) router.push(`/contract/${cr.data.id}` as any);
          else {
            const gen = await api.post('/api/admin/contracts/generate', { reservation_id: id, language: 'fr' });
            router.push(`/contract/${gen.data.contract_id}` as any);
          }
        } catch (err: any) {
          const m = err.response?.data?.detail || 'Confirmee, erreur contrat';
          Platform.OS === 'web' ? window.alert(m) : Alert.alert('Info', m);
        }
      }
    } catch (e: any) {
      const m = e.response?.data?.detail || 'Erreur';
      Platform.OS === 'web' ? window.alert(m) : Alert.alert('Erreur', m);
    }
  };

  const updatePayment = async (id: string, status: string) => {
    try { await api.put(`/api/admin/reservations/${id}/payment-status?payment_status=${status}`); setActionModal(null); fetchReservations(); fetchStats(); }
    catch (e: any) { Platform.OS === 'web' ? window.alert(e.response?.data?.detail || 'Erreur') : Alert.alert('Erreur'); }
  };

  const sendPaymentLink = async (id: string) => {
    setSendingLink(true);
    try { await api.post(`/api/admin/reservations/${id}/send-payment-link`, { origin_url: API_URL }); Platform.OS === 'web' ? window.alert('Lien envoye!') : Alert.alert('Succes', 'Lien envoye!'); setActionModal(null); }
    catch (e: any) { Platform.OS === 'web' ? window.alert(e.response?.data?.detail || 'Erreur') : Alert.alert('Erreur'); }
    finally { setSendingLink(false); }
  };

  const toggleSort = (col: 'start' | 'end' | 'price') => {
    if (sortCol === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  if (loading) return (
    <View style={[s.container, { backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color={C.accent} />
    </View>
  );

  return (
    <View style={[s.container, { backgroundColor: C.bg }]}>
      {/* ===== TAB BAR ===== */}
      <View style={[s.tabBar, { backgroundColor: C.card, borderColor: C.border }]}>
        {([
          { key: 'gestion', label: 'Gestion', icon: 'briefcase-outline' },
          { key: 'planning', label: 'Planning', icon: 'calendar-outline' },
        ] as { key: ViewMode; label: string; icon: string }[]).map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[s.tabBtn, viewMode === tab.key && { backgroundColor: C.accent }]}
            onPress={() => setViewMode(tab.key)}
          >
            <Ionicons name={tab.icon as any} size={16} color={viewMode === tab.key ? '#fff' : C.textLight} />
            <Text style={[s.tabLabel, { color: viewMode === tab.key ? '#fff' : C.textLight }]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ===== GESTION VIEW ===== */}
      {viewMode === 'gestion' && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
        >
          {/* Top bar: Search + Quick Filters + Create */}
          <View style={[s.topBar, { backgroundColor: '#1E3A5F' }]}>
            <View style={s.searchWrap}>
              <Ionicons name="search" size={16} color="#94A3B8" />
              <TextInput
                style={s.searchInput}
                placeholder="Rechercher..."
                placeholderTextColor="#94A3B8"
                value={search}
                onChangeText={setSearch}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: 2 }}>
              {QUICK_FILTERS.map(f => (
                <TouchableOpacity
                  key={f.label}
                  style={[s.qfBtn, quickFilter === f.value && s.qfBtnActive]}
                  onPress={() => { setQuickFilter(f.value); setTimeout(scrollToTable, 100); }}
                  data-testid={`filter-${f.value || 'today'}`}
                >
                  <Text style={[s.qfLabel, quickFilter === f.value && s.qfLabelActive]}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={s.createBtn} onPress={() => router.push('/agency-app/book' as any)}>
              <Text style={s.createBtnText}>Creer Reservation</Text>
            </TouchableOpacity>
          </View>

          {/* KPI Cards */}
          <View style={s.kpiRow}>
            {[
              { icon: 'car-sport', label: "Reservations aujourd'hui", value: kpiToday, color: '#1E3A5F', bg: '#F0F4F8', filter: null as string | null },
              { icon: 'play-circle', label: 'En cours', value: kpiActive, color: '#10B981', bg: '#ECFDF5', filter: 'active' },
              { icon: 'calendar', label: 'A venir', value: kpiUpcoming, color: '#3B82F6', bg: '#EFF6FF', filter: 'upcoming' },
              { icon: 'warning', label: 'Problemes / Retards', value: kpiOverdue, color: '#EF4444', bg: '#FEF2F2', filter: 'overdue' },
            ].map((k, i) => (
              <TouchableOpacity key={i} style={[s.kpiCard, { backgroundColor: k.bg }, quickFilter === k.filter && { borderWidth: 2, borderColor: k.color }]} onPress={() => { setQuickFilter(k.filter); setTimeout(scrollToTable, 100); }} activeOpacity={0.7} data-testid={`kpi-${k.filter || 'today'}`}>
                <Ionicons name={k.icon as any} size={20} color={k.color} />
                <Text style={[s.kpiLabel, { color: '#475569' }]}>{k.label}</Text>
                <Text style={[s.kpiValue, { color: k.color }]}>{k.value}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Activite Recente */}
          <View style={[s.card, { backgroundColor: C.card, borderColor: C.border }]}>
            <View style={s.cardHeader}>
              <Text style={[s.cardTitle, { color: C.text }]}>Activite Recente</Text>
              <TouchableOpacity onPress={() => setQuickFilter(null)}>
                <Text style={{ color: C.accent, fontSize: 13, fontWeight: '600' }}>Voir toutes &gt;</Text>
              </TouchableOpacity>
            </View>
            {activityEvents.length > 0 ? activityEvents.map((ev, i) => (
              <TouchableOpacity key={i} style={s.activityRow} onPress={() => ev.res && setActionModal(ev.res)}>
                <View style={[s.activityDot, { backgroundColor: ev.color }]} />
                <Text style={[s.activityText, { color: C.text }]}>
                  <Text style={{ fontWeight: '800' }}>{ev.label}</Text>{'  '}{ev.desc}
                </Text>
              </TouchableOpacity>
            )) : (
              <Text style={{ color: C.textLight, fontSize: 13, padding: 16, textAlign: 'center' }}>Aucune activite recente</Text>
            )}
          </View>

          {/* Dernieres Reservations (table) */}
          <View style={[s.card, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[s.cardTitle, { color: C.text, padding: 16, paddingBottom: 8 }]}>Dernieres Reservations</Text>
            {/* Header */}
            <View style={[s.tRow, { backgroundColor: '#F1F5F9' }]}>
              <Text style={[s.tH, { flex: 1.2 }]}>Client</Text>
              <Text style={[s.tH, { flex: 1.2 }]}>Vehicule</Text>
              <Text style={[s.tH, { flex: 0.7 }]}>Debut</Text>
              <Text style={[s.tH, { flex: 0.5 }]}>Heure</Text>
              <Text style={[s.tH, { flex: 0.6 }]}>Creee le</Text>
              <Text style={[s.tH, { flex: 0.8 }]}>Statut</Text>
              <Text style={[s.tH, { flex: 1.6 }]}>Actions</Text>
            </View>
            {recent.map((r, i) => (
              <View key={r.id} style={[s.tRow, i % 2 === 0 ? {} : { backgroundColor: '#F8FAFC' }]}>
                <Text style={[s.tC, { flex: 1.2, fontWeight: '700', color: C.text }]} numberOfLines={1}>{r.user_name}</Text>
                <Text style={[s.tC, { flex: 1.2, color: C.text }]} numberOfLines={1}>{r.vehicle_name}</Text>
                <Text style={[s.tC, { flex: 0.7, color: C.textLight }]}>
                  {format(new Date(r.start_date), 'dd/MM/yy')}
                </Text>
                <View style={{ flex: 0.5, flexDirection: 'row', gap: 3, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 2 }}>
                  <View style={{ backgroundColor: '#10B98112', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4 }}>
                    <Text style={{ color: '#10B981', fontSize: 10, fontWeight: '700' }}>{format(new Date(r.start_date), 'HH:mm')}</Text>
                  </View>
                  <Text style={{ color: C.textLight, fontSize: 9 }}>-</Text>
                  <View style={{ backgroundColor: '#3B82F612', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4 }}>
                    <Text style={{ color: '#3B82F6', fontSize: 10, fontWeight: '700' }}>{format(new Date(r.end_date), 'HH:mm')}</Text>
                  </View>
                </View>
                <Text style={[s.tC, { flex: 0.6, color: C.textLight, fontSize: 11 }]}>
                  {r.created_at ? format(new Date(r.created_at), 'dd/MM HH:mm') : '-'}
                </Text>
                <View style={{ flex: 0.8, paddingVertical: 8, paddingHorizontal: 4 }}>
                  <View style={[s.badge, { backgroundColor: statusColor(r.status) }]}>
                    <Text style={s.badgeText}>{statusLabel(r.status)}</Text>
                  </View>
                </View>
                <View style={{ flex: 1.6, flexDirection: 'row', gap: 4, alignItems: 'center', paddingVertical: 6, flexWrap: 'wrap' }}>
                  <TouchableOpacity style={s.actionBtn} onPress={() => setActionModal(r)}>
                    <Text style={s.actionBtnText}>Voir</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.actionBtn, { borderColor: '#F59E0B40' }]} onPress={() => setActionModal(r)}>
                    <Text style={[s.actionBtnText, { color: '#D97706' }]}>Modifier</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.actionBtn, { borderColor: '#EF444440' }]} onPress={() => updateStatus(r.id, 'cancelled')}>
                    <Text style={[s.actionBtnText, { color: '#EF4444' }]}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{ padding: 4 }} onPress={() => setActionModal(r)}>
                    <Ionicons name="ellipsis-horizontal" size={16} color={C.textLight} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <TouchableOpacity style={s.seeAll} onPress={() => { /* scroll to full table */ }}>
              <Text style={{ color: C.accent, fontSize: 13, fontWeight: '700' }}>Voir toutes les reservations</Text>
            </TouchableOpacity>
          </View>

          {/* Alert Cards - Expandable */}
          {(overdueList.length > 0 || pendingPayments.length > 0) && (
            <View>
              <View style={s.alertRow}>
                {overdueList.length > 0 && (
                  <TouchableOpacity style={[s.alertCard, { backgroundColor: '#FEF3C7', borderColor: expandedAlert === 'overdue' ? '#D97706' : '#FDE68A' }]} onPress={() => setExpandedAlert(expandedAlert === 'overdue' ? null : 'overdue')}>
                    <View style={[s.alertIcon, { backgroundColor: '#F59E0B20' }]}>
                      <Ionicons name="car" size={20} color="#D97706" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '700', color: '#92400E', fontSize: 13 }}>Vehicule non rendu</Text>
                      <Text style={{ color: '#78716C', fontSize: 12 }}>{overdueList.length} vehicule(s) en retard</Text>
                    </View>
                    <Ionicons name={expandedAlert === 'overdue' ? 'chevron-up' : 'chevron-down'} size={18} color="#D97706" />
                  </TouchableOpacity>
                )}
                {pendingPayments.length > 0 && (
                  <TouchableOpacity style={[s.alertCard, { backgroundColor: '#E0E7FF', borderColor: expandedAlert === 'pending' ? '#3B82F6' : '#C7D2FE' }]} onPress={() => setExpandedAlert(expandedAlert === 'pending' ? null : 'pending')}>
                    <View style={[s.alertIcon, { backgroundColor: '#3B82F620' }]}>
                      <Ionicons name="card" size={20} color="#3B82F6" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '700', color: '#1E3A8A', fontSize: 13 }}>Paiement en attente</Text>
                      <Text style={{ color: '#78716C', fontSize: 12 }}>{pendingPayments.length} paiement(s) en attente</Text>
                    </View>
                    <Ionicons name={expandedAlert === 'pending' ? 'chevron-up' : 'chevron-down'} size={18} color="#3B82F6" />
                  </TouchableOpacity>
                )}
                {overdueList.length > 0 && (
                  <TouchableOpacity style={[s.alertCard, { backgroundColor: '#FEE2E2', borderColor: expandedAlert === 'late' ? '#EF4444' : '#FECACA' }]} onPress={() => setExpandedAlert(expandedAlert === 'late' ? null : 'late')}>
                    <View style={[s.alertIcon, { backgroundColor: '#EF444420' }]}>
                      <Ionicons name="location" size={20} color="#EF4444" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '700', color: '#991B1B', fontSize: 13 }}>Client en retard</Text>
                      <Text style={{ color: '#78716C', fontSize: 12 }}>{overdueList.length} client(s) en retard</Text>
                    </View>
                    <Ionicons name={expandedAlert === 'late' ? 'chevron-up' : 'chevron-down'} size={18} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Expanded alert list */}
              {expandedAlert === 'overdue' && overdueList.length > 0 && (
                <View style={[s.card, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A', marginHorizontal: 16, marginBottom: 12, padding: 0 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: 12, borderBottomWidth: 1, borderColor: '#FDE68A' }}>
                    <Ionicons name="car" size={16} color="#D97706" />
                    <Text style={{ color: '#92400E', fontSize: 13, fontWeight: '800' }}>Vehicules non rendus ({overdueList.length})</Text>
                  </View>
                  {overdueList.map((o: any) => (
                    <TouchableOpacity key={o.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderBottomWidth: 0.5, borderColor: '#FDE68A' }} onPress={() => setActionModal(o)}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#1E293B', fontSize: 13, fontWeight: '700' }}>{o.vehicle_name}</Text>
                        <Text style={{ color: '#78716C', fontSize: 11 }}>{o.user_name} - Retard de {o.days_overdue || '?'}j</Text>
                      </View>
                      <Text style={{ color: '#D97706', fontSize: 12, fontWeight: '700' }}>CHF {o.total_price}</Text>
                      <Ionicons name="chevron-forward" size={16} color="#D97706" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {expandedAlert === 'pending' && pendingPayments.length > 0 && (
                <View style={[s.card, { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE', marginHorizontal: 16, marginBottom: 12, padding: 0 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: 12, borderBottomWidth: 1, borderColor: '#C7D2FE' }}>
                    <Ionicons name="card" size={16} color="#3B82F6" />
                    <Text style={{ color: '#1E3A8A', fontSize: 13, fontWeight: '800' }}>Paiements en attente ({pendingPayments.length})</Text>
                  </View>
                  {pendingPayments.map((p: any) => (
                    <TouchableOpacity key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderBottomWidth: 0.5, borderColor: '#C7D2FE' }} onPress={() => setActionModal(p)}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#3B82F6' }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#1E293B', fontSize: 13, fontWeight: '700' }}>{p.user_name}</Text>
                        <Text style={{ color: '#78716C', fontSize: 11 }}>{p.vehicle_name} - {format(new Date(p.start_date), 'dd/MM')} au {format(new Date(p.end_date), 'dd/MM')}</Text>
                      </View>
                      <Text style={{ color: '#3B82F6', fontSize: 12, fontWeight: '700' }}>CHF {p.total_price}</Text>
                      <Ionicons name="chevron-forward" size={16} color="#3B82F6" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {expandedAlert === 'late' && overdueList.length > 0 && (
                <View style={[s.card, { backgroundColor: '#FEF2F2', borderColor: '#FECACA', marginHorizontal: 16, marginBottom: 12, padding: 0 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: 12, borderBottomWidth: 1, borderColor: '#FECACA' }}>
                    <Ionicons name="location" size={16} color="#EF4444" />
                    <Text style={{ color: '#991B1B', fontSize: 13, fontWeight: '800' }}>Clients en retard ({overdueList.length})</Text>
                  </View>
                  {overdueList.map((o: any) => (
                    <TouchableOpacity key={`late-${o.id}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderBottomWidth: 0.5, borderColor: '#FECACA' }} onPress={() => setActionModal(o)}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#1E293B', fontSize: 13, fontWeight: '700' }}>{o.user_name}</Text>
                        <Text style={{ color: '#78716C', fontSize: 11 }}>{o.vehicle_name} - Retard de {o.days_overdue || '?'}j</Text>
                      </View>
                      <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '700' }}>+{o.days_overdue || '?'}j</Text>
                      <Ionicons name="chevron-forward" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* ===== TOUTES LES RESERVATIONS (Full table) ===== */}
          <View ref={tableRef} style={[s.card, { backgroundColor: C.card, borderColor: C.border }]} data-testid="all-reservations-table">
            <Text style={[s.cardTitle, { color: C.text, padding: 16, paddingBottom: 8 }]}>Toutes les Reservations</Text>
            {/* Header */}
            <View style={[s.tRow, { backgroundColor: '#F1F5F9' }]}>
              <Text style={[s.tH, { flex: 1.2 }]}>Vehicule</Text>
              <Text style={[s.tH, { flex: 1 }]}>Client</Text>
              <TouchableOpacity style={{ flex: 0.9, flexDirection: 'row', alignItems: 'center', gap: 2 }} onPress={() => toggleSort('start')}>
                <Text style={s.tH}>Date debut</Text>
                {sortCol === 'start' && <Ionicons name={sortDir === 'desc' ? 'caret-down' : 'caret-up'} size={10} color="#64748B" />}
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 0.9, flexDirection: 'row', alignItems: 'center', gap: 2 }} onPress={() => toggleSort('end')}>
                <Text style={s.tH}>Date fin</Text>
                {sortCol === 'end' && <Ionicons name={sortDir === 'desc' ? 'caret-down' : 'caret-up'} size={10} color="#64748B" />}
              </TouchableOpacity>
              <Text style={[s.tH, { flex: 0.7 }]}>Statut</Text>
              <TouchableOpacity style={{ flex: 0.7, flexDirection: 'row', alignItems: 'center', gap: 2 }} onPress={() => toggleSort('price')}>
                <Text style={s.tH}>Prix</Text>
                {sortCol === 'price' && <Ionicons name={sortDir === 'desc' ? 'caret-down' : 'caret-up'} size={10} color="#64748B" />}
              </TouchableOpacity>
              <Text style={[s.tH, { flex: 1.2 }]}>Actions</Text>
            </View>
            {paged.map((r, i) => (
              <View key={r.id} style={[s.tRow, i % 2 === 0 ? {} : { backgroundColor: '#F8FAFC' }]}>
                <View style={{ flex: 1.2, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 4 }}>
                  <Ionicons name="car-sport-outline" size={14} color={C.textLight} />
                  <Text style={{ color: C.text, fontSize: 12, fontWeight: '700' }} numberOfLines={1}>{r.vehicle_name}</Text>
                </View>
                <Text style={[s.tC, { flex: 1, color: C.text }]} numberOfLines={1}>{r.user_name}</Text>
                <View style={{ flex: 0.9, paddingVertical: 8, paddingHorizontal: 4 }}>
                  <Text style={{ color: C.textLight, fontSize: 12 }}>{format(new Date(r.start_date), 'dd/MM/yyyy')}</Text>
                  <Text style={{ color: '#10B981', fontSize: 10, fontWeight: '700' }}>{format(new Date(r.start_date), 'HH:mm')}</Text>
                </View>
                <View style={{ flex: 0.9, paddingVertical: 8, paddingHorizontal: 4 }}>
                  <Text style={{ color: C.textLight, fontSize: 12 }}>{format(new Date(r.end_date), 'dd/MM/yyyy')}</Text>
                  <Text style={{ color: '#3B82F6', fontSize: 10, fontWeight: '700' }}>{format(new Date(r.end_date), 'HH:mm')}</Text>
                </View>
                <View style={{ flex: 0.7, paddingVertical: 8, paddingHorizontal: 4 }}>
                  <View style={[s.badge, { backgroundColor: statusColor(r.status) }]}>
                    <Text style={s.badgeText}>{statusLabel(r.status)}</Text>
                  </View>
                </View>
                <Text style={[s.tC, { flex: 0.7, fontWeight: '700', color: C.text }]}>CHF {r.total_price}</Text>
                <View style={{ flex: 1.2, flexDirection: 'row', gap: 4, alignItems: 'center', paddingVertical: 6, flexWrap: 'wrap' }}>
                  <TouchableOpacity style={s.actionBtn} onPress={() => setActionModal(r)}>
                    <Text style={s.actionBtnText}>Voir</Text>
                  </TouchableOpacity>
                  {(r.status === 'active' || r.status === 'confirmed') && (
                    <TouchableOpacity style={[s.actionBtn, { borderColor: '#10B98140', backgroundColor: '#F0FDF4' }]} onPress={() => setReturnModal(r)} data-testid={`return-btn-${r.id}`}>
                      <Text style={[s.actionBtnText, { color: '#059669' }]}>Retour</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={[s.actionBtn, { borderColor: '#F59E0B40' }]} onPress={() => setActionModal(r)}>
                    <Text style={[s.actionBtnText, { color: '#D97706' }]}>Modifier</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{ padding: 4 }} onPress={() => setActionModal(r)}>
                    <Ionicons name="ellipsis-horizontal" size={16} color={C.textLight} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <View style={s.pagination}>
                <TouchableOpacity style={[s.pageBtn, { borderColor: C.border, backgroundColor: C.card, opacity: tablePage <= 1 ? 0.4 : 1 }]} onPress={() => setTablePage(Math.max(1, tablePage - 1))} disabled={tablePage <= 1}>
                  <Ionicons name="chevron-back" size={16} color={C.accent} />
                </TouchableOpacity>
                <Text style={{ color: C.text, fontSize: 13, fontWeight: '700' }}>Page {tablePage} / {totalPages}</Text>
                <TouchableOpacity style={[s.pageBtn, { borderColor: C.border, backgroundColor: C.card, opacity: tablePage >= totalPages ? 0.4 : 1 }]} onPress={() => setTablePage(Math.min(totalPages, tablePage + 1))} disabled={tablePage >= totalPages}>
                  <Ionicons name="chevron-forward" size={16} color={C.accent} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* ===== PLANNING VIEW ===== */}
      {viewMode === 'planning' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={[s.monthNav, { borderColor: C.border }]}>
            <TouchableOpacity onPress={() => setPlanningMonth(addMonths(planningMonth, -1))}>
              <Ionicons name="chevron-back" size={22} color={C.accent} />
            </TouchableOpacity>
            <Text style={{ color: C.text, fontSize: 16, fontWeight: '800', textTransform: 'capitalize' }}>
              {format(planningMonth, 'MMMM yyyy', { locale: fr })}
            </Text>
            <TouchableOpacity onPress={() => setPlanningMonth(addMonths(planningMonth, 1))}>
              <Ionicons name="chevron-forward" size={22} color={C.accent} />
            </TouchableOpacity>
          </View>

          {highlightId && (
            <Animated.View style={{ opacity: highlightAnim, flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 8, padding: 10, borderRadius: 10, backgroundColor: '#10B981' }}>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', flex: 1 }}>Reservation creee avec succes !</Text>
            </Animated.View>
          )}

          <GanttChart
            C={C} schedule={schedule} orphanReservations={orphanReservations} planningMonth={planningMonth}
            scheduleLoading={scheduleLoading} refreshing={refreshing} onRefresh={onRefresh}
            vehicleSearch={vehicleSearch} setVehicleSearch={setVehicleSearch}
            showAllVehicles={showAllVehicles} setShowAllVehicles={setShowAllVehicles}
            highlightId={highlightId} highlightAnim={highlightAnim}
            updateStatus={updateStatus}
            onOpenReservation={(res) => {
              const full = reservations.find((r: any) => r.id === res.id);
              setActionModal(full || res as any);
            }}
            onCreateReservation={(vehicleId, date) => router.push(`/agency-app/book?vehicle_id=${vehicleId}&date=${date}` as any)}
            onNavigateMonth={() => setPlanningMonth(startOfMonth(new Date()))}
            onFilterChange={(sf, vt) => { setGanttStatusFilter(sf); setGanttViewType(vt); }}
          />

          {/* ===== PLANNING RESERVATION CARDS ===== */}
          <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="list" size={16} color={C.accent} />
                <Text style={{ color: C.text, fontSize: 15, fontWeight: '800' }}>Reservations du mois</Text>
              </View>
              <View style={{ backgroundColor: C.accent + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                <Text style={{ color: C.accent, fontSize: 12, fontWeight: '700' }}>{planningCards.length} resultat(s)</Text>
              </View>
            </View>
            {planningCards.length === 0 && (
              <Text style={{ color: C.textLight, fontSize: 13, textAlign: 'center', paddingVertical: 16 }}>Aucune reservation pour cette periode</Text>
            )}
            {(() => {
              const screenW = Dimensions.get('window').width;
              const cardW = Math.floor((screenW - 32 - 24) / 4); // 32px padding, 24px gaps (3 gaps of 8px)
              const rows: any[][] = [];
              for (let i = 0; i < planningCards.length; i += 4) {
                rows.push(planningCards.slice(i, i + 4));
              }
              return rows.map((row, ri) => (
                <View key={ri} style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                  {row.map((r: any) => (
                    <TouchableOpacity
                      key={r.id}
                      style={{
                        width: cardW,
                        backgroundColor: C.card, borderWidth: 1, borderColor: r.isOverdue ? '#FECACA' : C.border,
                        borderRadius: 10, padding: 10,
                        borderTopWidth: 3, borderTopColor: RES_COLORS[r.status] || '#6B7280',
                      }}
                      onPress={() => {
                        const full = reservations.find((res: any) => res.id === r.id);
                        setActionModal(full || { ...r, total_price: r.price_per_day * r.total_days } as any);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <View style={{ backgroundColor: RES_COLORS[r.status] || '#6B7280', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>{STATUS_LABELS[r.status] || r.status}</Text>
                        </View>
                        <Text style={{ color: C.textLight, fontSize: 10 }}>{r.total_days}j</Text>
                      </View>
                      <Text style={{ color: C.text, fontSize: 12, fontWeight: '800', marginBottom: 2 }} numberOfLines={1}>{r.vehicle_name}</Text>
                      <Text style={{ color: C.accent, fontSize: 11, fontWeight: '700', marginBottom: 4 }} numberOfLines={1}>{r.user_name || 'Client inconnu'}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="calendar-outline" size={11} color={C.textLight} />
                        <Text style={{ color: C.textLight, fontSize: 10, fontWeight: '600' }}>
                          {format(new Date(r.start_date), 'dd/MM')} - {format(new Date(r.end_date), 'dd/MM')}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <Ionicons name="time-outline" size={11} color={C.textLight} />
                        <Text style={{ color: '#10B981', fontSize: 9, fontWeight: '700' }}>{format(new Date(r.start_date), 'HH:mm')}</Text>
                        <Text style={{ color: C.textLight, fontSize: 9 }}>-</Text>
                        <Text style={{ color: '#3B82F6', fontSize: 9, fontWeight: '700' }}>{format(new Date(r.end_date), 'HH:mm')}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ));
            })()}
          </View>
        </ScrollView>
      )}

      <ReservationActionModal
        actionModal={actionModal} setActionModal={setActionModal}
        C={C} statusColor={statusColor}
        updateStatus={updateStatus} updatePayment={updatePayment}
        sendPaymentLink={sendPaymentLink} sendingLink={sendingLink}
      />

      <ReturnVehicleModal
        visible={!!returnModal}
        reservation={returnModal}
        vehicle={returnModal ? { brand: returnModal.vehicle_brand || 'Vehicule', model: returnModal.vehicle_model || '' } : null}
        onClose={() => setReturnModal(null)}
        onSuccess={fetchReservations}
        colors={C}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  // Tabs
  tabBar: { flexDirection: 'row', marginHorizontal: 16, marginTop: 12, marginBottom: 4, borderRadius: 12, borderWidth: 1, overflow: 'hidden', gap: 2, padding: 3 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  tabLabel: { fontSize: 13, fontWeight: '700' },
  // Top bar
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, marginHorizontal: 16, marginTop: 10, borderRadius: 12, flexWrap: 'wrap' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#2D4A6F', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, minWidth: 160 },
  searchInput: { color: '#fff', fontSize: 13, flex: 1, paddingVertical: 0 },
  qfBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  qfBtnActive: { backgroundColor: '#3B82F6' },
  qfLabel: { color: '#CBD5E1', fontSize: 13, fontWeight: '600' },
  qfLabelActive: { color: '#fff' },
  createBtn: { backgroundColor: '#3B82F6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, marginLeft: 'auto' },
  createBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  // KPI
  kpiRow: { flexDirection: 'row', gap: 10, margin: 16, marginBottom: 0, flexWrap: 'wrap' },
  kpiCard: { flex: 1, minWidth: 160, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  kpiLabel: { fontSize: 12, fontWeight: '600', flex: 1 },
  kpiValue: { fontSize: 24, fontWeight: '900' },
  // Card
  card: { marginHorizontal: 16, marginTop: 16, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '800' },
  // Activity
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 0.5, borderColor: '#E2E8F0' },
  activityDot: { width: 10, height: 10, borderRadius: 5 },
  activityText: { fontSize: 13, flex: 1 },
  // Table
  tRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderBottomWidth: 0.5, borderColor: '#E2E8F0' },
  tH: { fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', paddingVertical: 10, paddingHorizontal: 4 },
  tC: { fontSize: 12, paddingVertical: 8, paddingHorizontal: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  actionBtn: { borderWidth: 1, borderColor: '#3B82F640', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  actionBtnText: { fontSize: 11, fontWeight: '700', color: '#3B82F6' },
  seeAll: { padding: 14, alignItems: 'center', borderTopWidth: 0.5, borderColor: '#E2E8F0' },
  // Alert
  alertRow: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: 16, flexWrap: 'wrap' },
  alertCard: { flex: 1, minWidth: 200, borderRadius: 12, padding: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  alertIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  // Pagination
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 16 },
  pageBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  // Planning
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
});
