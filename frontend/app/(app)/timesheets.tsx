import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { colors, fontSize, spacing, borderRadius } from '../../src/theme/constants';
import { getTimeEntries, approveEntry, rejectEntry, approveAllEntries } from '../../src/services/api';

type Period = 'day' | 'week' | 'month' | 'custom';

const formatDate = (d: Date) => d.toISOString().split('T')[0];
const dayLabel = (d: Date) => d.toLocaleDateString('fr-CH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const weekLabel = (start: Date, end: Date) => `${start.toLocaleDateString('fr-CH', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('fr-CH', { day: 'numeric', month: 'short', year: 'numeric' })}`;
const monthLabel = (d: Date) => d.toLocaleDateString('fr-CH', { month: 'long', year: 'numeric' });

const getWeekStart = (d: Date) => { const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1); return new Date(d.getFullYear(), d.getMonth(), diff); };
const getWeekEnd = (start: Date) => { const end = new Date(start); end.setDate(end.getDate() + 6); return end; };
const getMonthStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const getMonthEnd = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

export default function TimesheetsScreen() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<Period>('week');
  const [refDate, setRefDate] = useState(new Date());
  const [customStart, setCustomStart] = useState(formatDate(new Date()));
  const [customEnd, setCustomEnd] = useState(formatDate(new Date()));
  const isManager = user?.role === 'manager' || user?.role === 'admin';

  const getDateRange = useCallback(() => {
    if (period === 'day') return { start: formatDate(refDate), end: formatDate(refDate) };
    if (period === 'week') { const ws = getWeekStart(refDate); return { start: formatDate(ws), end: formatDate(getWeekEnd(ws)) }; }
    if (period === 'month') return { start: formatDate(getMonthStart(refDate)), end: formatDate(getMonthEnd(refDate)) };
    return { start: customStart, end: customEnd };
  }, [period, refDate, customStart, customEnd]);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filter !== 'all') params.status = filter;
      const res = await getTimeEntries(params);
      setEntries(res.data);
    } catch (err) { console.log(err); } finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const navigate = (dir: number) => {
    const d = new Date(refDate);
    if (period === 'day') d.setDate(d.getDate() + dir);
    else if (period === 'week') d.setDate(d.getDate() + dir * 7);
    else if (period === 'month') d.setMonth(d.getMonth() + dir);
    setRefDate(d);
  };

  const goToday = () => setRefDate(new Date());

  const range = getDateRange();
  const periodLabel = period === 'day' ? dayLabel(refDate) : period === 'week' ? weekLabel(getWeekStart(refDate), getWeekEnd(getWeekStart(refDate))) : period === 'month' ? monthLabel(refDate) : `${customStart} → ${customEnd}`;

  // Filter entries by date range and search
  const filtered = entries.filter(e => {
    const inRange = e.date >= range.start && e.date <= range.end;
    const matchStatus = filter === 'all' || e.status === filter;
    const matchSearch = `${e.user_name || ''} ${e.project_name || ''} ${e.date} ${e.work_location || ''}`.toLowerCase().includes(search.toLowerCase());
    return inRange && matchStatus && matchSearch;
  });

  const totalHours = filtered.reduce((s, e) => s + (e.duration || 0), 0);
  const pendingCount = filtered.filter(e => e.status === 'pending').length;

  const statusColor = (s: string) => {
    switch (s) { case 'approved': return { bg: '#D1FAE5', text: '#065F46', label: 'Approuve' }; case 'rejected': return { bg: '#FEE2E2', text: '#991B1B', label: 'Refuse' }; default: return { bg: '#FEF3C7', text: '#92400E', label: 'En attente' }; }
  };

  const periods: { key: Period; label: string; icon: string }[] = [
    { key: 'day', label: 'Jour', icon: 'today' },
    { key: 'week', label: 'Semaine', icon: 'date-range' },
    { key: 'month', label: 'Mois', icon: 'calendar-month' },
    { key: 'custom', label: 'Personnalise', icon: 'tune' },
  ];

  const statusFilters = [{ key: 'all', label: 'Tous' }, { key: 'pending', label: 'En attente' }, { key: 'approved', label: 'Approuves' }, { key: 'rejected', label: 'Refuses' }];

  const locationIcon = (loc: string) => {
    switch (loc) { case 'home': return 'home'; case 'onsite': return 'construction'; default: return 'business'; }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title} data-testid="timesheets-title">Feuilles de temps</Text>
        {isManager && (
          <TouchableOpacity style={styles.approveAllBtn} onPress={async () => { await approveAllEntries(); loadEntries(); }} data-testid="approve-all-button">
            <MaterialIcons name="done-all" size={16} color="#FFF" />
            <Text style={styles.approveAllText}>Tout approuver</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Period selector */}
      <View style={styles.periodRow} data-testid="period-selector">
        {periods.map(p => (
          <TouchableOpacity key={p.key} style={[styles.periodBtn, period === p.key && styles.periodBtnActive]} onPress={() => setPeriod(p.key)} data-testid={`period-${p.key}`}>
            <MaterialIcons name={p.icon as any} size={16} color={period === p.key ? '#FFF' : colors.textLight} />
            <Text style={[styles.periodText, period === p.key && styles.periodTextActive]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Date navigation */}
      {period !== 'custom' ? (
        <View style={styles.dateNav}>
          <TouchableOpacity style={styles.navBtn} onPress={() => navigate(-1)} data-testid="nav-prev">
            <MaterialIcons name="chevron-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={goToday} style={styles.dateLabelBtn}>
            <Text style={styles.dateLabel}>{periodLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={() => navigate(1)} data-testid="nav-next">
            <MaterialIcons name="chevron-right" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.todayBtn} onPress={goToday} data-testid="nav-today">
            <Text style={styles.todayText}>Aujourd'hui</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.customRange}>
          <View style={styles.customField}>
            <Text style={styles.customLabel}>Du</Text>
            <TextInput style={styles.customInput} value={customStart} onChangeText={setCustomStart} placeholder="AAAA-MM-JJ" placeholderTextColor={colors.textLight} data-testid="custom-start" />
          </View>
          <View style={styles.customField}>
            <Text style={styles.customLabel}>Au</Text>
            <TextInput style={styles.customInput} value={customEnd} onChangeText={setCustomEnd} placeholder="AAAA-MM-JJ" placeholderTextColor={colors.textLight} data-testid="custom-end" />
          </View>
        </View>
      )}

      {/* Summary cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { borderLeftColor: colors.primary }]}>
          <Text style={[styles.summaryValue, { color: colors.primary }]}>{filtered.length}</Text>
          <Text style={styles.summaryLabel}>Entrees</Text>
        </View>
        <View style={[styles.summaryCard, { borderLeftColor: '#059669' }]}>
          <Text style={[styles.summaryValue, { color: '#059669' }]}>{totalHours.toFixed(1)}h</Text>
          <Text style={styles.summaryLabel}>Total heures</Text>
        </View>
        <View style={[styles.summaryCard, { borderLeftColor: '#F59E0B' }]}>
          <Text style={[styles.summaryValue, { color: '#F59E0B' }]}>{pendingCount}</Text>
          <Text style={styles.summaryLabel}>En attente</Text>
        </View>
      </View>

      {/* Search + Status */}
      <View style={styles.searchRow} data-testid="timesheets-search-bar">
        <MaterialIcons name="search" size={20} color={colors.textLight} style={{ marginRight: spacing.sm }} />
        <TextInput style={styles.searchInput} placeholder="Rechercher par employe, projet, lieu..." value={search} onChangeText={setSearch} placeholderTextColor={colors.textLight} data-testid="timesheets-search-input" />
        {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')}><MaterialIcons name="close" size={18} color={colors.textLight} /></TouchableOpacity>}
      </View>

      <View style={styles.filterRow}>
        {statusFilters.map(f => (
          <TouchableOpacity key={f.key} style={[styles.filterChip, filter === f.key && styles.filterChipActive]} onPress={() => setFilter(f.key)} data-testid={`filter-${f.key}`}>
            <Text style={[styles.filterChipText, filter === f.key && styles.filterChipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Table */}
      {loading ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} /> : filtered.length === 0 ? (
        <View style={styles.empty}><MaterialIcons name="schedule" size={48} color={colors.borderLight} /><Text style={styles.emptyText}>Aucune entree pour cette periode</Text></View>
      ) : (
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            {isManager && <Text style={[styles.th, { flex: 2 }]}>EMPLOYE</Text>}
            <Text style={[styles.th, { flex: 1.2 }]}>DATE</Text>
            <Text style={[styles.th, { flex: 0.8 }]}>ARRIVEE</Text>
            <Text style={[styles.th, { flex: 0.8 }]}>DEPART</Text>
            <Text style={[styles.th, { flex: 0.7 }]}>DUREE</Text>
            <Text style={[styles.th, { flex: 1.2 }]}>PROJET</Text>
            <Text style={[styles.th, { flex: 0.6 }]}>LIEU</Text>
            <Text style={[styles.th, { flex: 0.8 }]}>STATUT</Text>
            {isManager && <Text style={[styles.th, { flex: 1 }]}>ACTIONS</Text>}
          </View>
          {filtered.map((e, idx) => {
            const sc = statusColor(e.status);
            return (
              <View key={e.id} style={[styles.row, idx % 2 === 0 && styles.rowAlt]} data-testid={`entry-row-${e.id}`}>
                {isManager && <Text style={[styles.td, { flex: 2, fontWeight: '600' }]}>{e.user_name}</Text>}
                <Text style={[styles.td, { flex: 1.2 }]}>{e.date}</Text>
                <Text style={[styles.td, { flex: 0.8, color: '#059669' }]}>{e.clock_in ? new Date(e.clock_in).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' }) : '-'}</Text>
                <Text style={[styles.td, { flex: 0.8, color: '#DC2626' }]}>{e.clock_out ? new Date(e.clock_out).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' }) : '-'}</Text>
                <Text style={[styles.td, { flex: 0.7, fontWeight: '700' }]}>{e.duration.toFixed(1)}h</Text>
                <Text style={[styles.td, { flex: 1.2 }]} numberOfLines={1}>{e.project_name || '-'}</Text>
                <View style={[styles.td, { flex: 0.6, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                  {e.work_location && <MaterialIcons name={locationIcon(e.work_location) as any} size={14} color={colors.textLight} />}
                </View>
                <View style={[styles.td, { flex: 0.8 }]}>
                  <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.badgeText, { color: sc.text }]}>{sc.label}</Text>
                  </View>
                </View>
                {isManager && (
                  <View style={[styles.td, { flex: 1, flexDirection: 'row', gap: 6 }]}>
                    {e.status === 'pending' && (
                      <>
                        <TouchableOpacity style={styles.actionApprove} onPress={() => { approveEntry(e.id).then(loadEntries); }} data-testid={`approve-${e.id}`}>
                          <MaterialIcons name="check" size={16} color="#065F46" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionReject} onPress={() => { rejectEntry(e.id).then(loadEntries); }} data-testid={`reject-${e.id}`}>
                          <MaterialIcons name="close" size={16} color="#991B1B" />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  approveAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.success, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.sm },
  approveAllText: { color: '#FFF', fontSize: fontSize.sm, fontWeight: '600' },
  periodRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  periodBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: borderRadius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  periodBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  periodText: { fontSize: fontSize.sm, color: colors.textLight, fontWeight: '500' },
  periodTextActive: { color: '#FFF', fontWeight: '600' },
  dateNav: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md, backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.sm, borderWidth: 1, borderColor: colors.border },
  navBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  dateLabelBtn: { flex: 1, alignItems: 'center' },
  dateLabel: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, textTransform: 'capitalize' },
  todayBtn: { backgroundColor: colors.primaryLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: borderRadius.sm },
  todayText: { fontSize: fontSize.xs, fontWeight: '600', color: colors.primary },
  customRange: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  customField: { flex: 1 },
  customLabel: { fontSize: fontSize.xs, fontWeight: '600', color: colors.textLight, marginBottom: 4 },
  customInput: { borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.sm, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: fontSize.sm, color: colors.text, backgroundColor: colors.surface },
  summaryRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  summaryCard: { flex: 1, backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 4 },
  summaryValue: { fontSize: fontSize.lg, fontWeight: '800' },
  summaryLabel: { fontSize: fontSize.xs, color: colors.textLight },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, marginBottom: spacing.md },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: fontSize.md, color: colors.text },
  filterRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontSize: fontSize.sm, color: colors.textLight, fontWeight: '500' },
  filterChipTextActive: { color: '#FFF', fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: spacing.sm },
  emptyText: { color: colors.textLight, fontSize: fontSize.md },
  table: { backgroundColor: colors.surface, borderRadius: borderRadius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  tableHeader: { flexDirection: 'row', backgroundColor: '#F1F5F9', paddingVertical: 12, paddingHorizontal: spacing.md },
  th: { fontSize: 11, fontWeight: '700', color: colors.textLight, letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  rowAlt: { backgroundColor: '#FAFBFC' },
  td: { fontSize: fontSize.sm, color: colors.text },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.full },
  badgeText: { fontSize: 10, fontWeight: '600' },
  actionApprove: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center' },
  actionReject: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
});
