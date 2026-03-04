import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../../src/theme/constants';
import { getPlanning, getDepartments } from '../../src/services/api';

type Period = 'week' | 'month' | 'custom';

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const LOC_COLORS: Record<string, string> = { office: '#2563EB', home: '#7C3AED', onsite: '#059669', vacation: '#F59E0B', sick: '#EF4444', accident: '#DC2626', training: '#6366F1', maternity: '#EC4899', paternity: '#8B5CF6', special: '#F97316', absent: '#94A3B8' };
const LOC_LABELS: Record<string, string> = { office: 'Bureau', home: 'Teletravail', onsite: 'Chantier', vacation: 'Vacances', sick: 'Maladie', accident: 'Accident', training: 'Formation', maternity: 'Maternite', paternity: 'Paternite', special: 'Conge special' };
const LOC_ICONS: Record<string, string> = { office: 'business', home: 'home', onsite: 'construction', vacation: 'beach-access', sick: 'local-hospital', accident: 'warning', training: 'school', maternity: 'child-friendly', paternity: 'child-friendly', special: 'event-busy' };

const formatDate = (d: Date) => d.toISOString().split('T')[0];
const getWeekStart = (d: Date) => { const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1); return new Date(d.getFullYear(), d.getMonth(), diff); };
const getMonthStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const getMonthEnd = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const weekLabel = (start: Date) => { const end = new Date(start); end.setDate(end.getDate() + 6); return `${start.toLocaleDateString('fr-CH', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('fr-CH', { day: 'numeric', month: 'short', year: 'numeric' })}`; };
const monthLabel = (d: Date) => d.toLocaleDateString('fr-CH', { month: 'long', year: 'numeric' });

const formatTime = (iso: string | null) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' });
};

export default function PlanningScreen() {
  const [planning, setPlanning] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('week');
  const [refDate, setRefDate] = useState(new Date());
  const [customStart, setCustomStart] = useState(formatDate(new Date()));
  const [customEnd, setCustomEnd] = useState(formatDate(new Date()));
  const [filterDept, setFilterDept] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCell, setSelectedCell] = useState<{ userId: string; date: string; name: string } | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const getDateRange = useCallback(() => {
    if (period === 'week') {
      const ws = getWeekStart(refDate);
      const we = new Date(ws); we.setDate(we.getDate() + 6);
      return { start: formatDate(ws), end: formatDate(we) };
    }
    if (period === 'month') return { start: formatDate(getMonthStart(refDate)), end: formatDate(getMonthEnd(refDate)) };
    return { start: customStart, end: customEnd };
  }, [period, refDate, customStart, customEnd]);

  const range = getDateRange();

  const getDatesInRange = (start: string, end: string) => {
    const dates: string[] = [];
    const d = new Date(start + 'T00:00:00');
    const endD = new Date(end + 'T00:00:00');
    while (d <= endD) { dates.push(d.toISOString().split('T')[0]); d.setDate(d.getDate() + 1); }
    return dates;
  };

  const dates = getDatesInRange(range.start, range.end);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [planRes, deptRes] = await Promise.all([
        getPlanning({ start_date: range.start, end_date: range.end, department_id: filterDept || undefined }),
        getDepartments()
      ]);
      setPlanning(planRes.data); setDepartments(deptRes.data);
    } catch (err) { console.log(err); } finally { setLoading(false); }
  }, [range.start, range.end, filterDept]);

  useEffect(() => { loadData(); }, [loadData]);

  const navigate = (dir: number) => {
    const d = new Date(refDate);
    if (period === 'week') d.setDate(d.getDate() + dir * 7);
    else if (period === 'month') d.setMonth(d.getMonth() + dir);
    setRefDate(d);
    setSelectedCell(null);
  };

  const goToday = () => { setRefDate(new Date()); setSelectedCell(null); };
  const periodLabel = period === 'week' ? weekLabel(getWeekStart(refDate)) : period === 'month' ? monthLabel(refDate) : `${customStart} → ${customEnd}`;

  const filtered = planning.filter(p => `${p.name} ${p.department || ''}`.toLowerCase().includes(search.toLowerCase()));

  const totalHours = filtered.reduce((s, p) => s + Object.values(p.days as Record<string, any>).reduce((ss: number, d: any) => ss + (d.hours || 0), 0), 0);
  const activeCount = filtered.filter(p => Object.keys(p.days).length > 0).length;

  const getSelectedDetail = () => {
    if (!selectedCell) return null;
    const emp = planning.find(p => p.user_id === selectedCell.userId);
    if (!emp) return null;
    const day = emp.days[selectedCell.date];
    return { emp, day };
  };

  const detail = getSelectedDetail();

  const periods = [
    { key: 'week' as Period, label: 'Semaine', icon: 'date-range' },
    { key: 'month' as Period, label: 'Mois', icon: 'calendar-month' },
    { key: 'custom' as Period, label: 'Personnalise', icon: 'tune' },
  ];

  const formatDateFull = (d: string) => {
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('fr-CH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };
  const formatDateShort = (d: string) => { const dt = new Date(d + 'T00:00:00'); return `${dt.getDate()}/${dt.getMonth() + 1}`; };
  const getDayOfWeek = (d: string) => { const dt = new Date(d + 'T00:00:00'); const dow = dt.getDay(); return dow === 0 ? 6 : dow - 1; };

  return (
    <ScrollView ref={scrollRef} style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title} data-testid="planning-title">Planning</Text>
      </View>

      {/* Period selector */}
      <View style={styles.periodRow} data-testid="period-selector">
        {periods.map(p => (
          <TouchableOpacity key={p.key} style={[styles.periodBtn, period === p.key && styles.periodBtnActive]} onPress={() => { setPeriod(p.key); setSelectedCell(null); }} data-testid={`period-${p.key}`}>
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
          <View style={styles.customField}><Text style={styles.customLabel}>Du</Text><TextInput style={styles.customInput} value={customStart} onChangeText={setCustomStart} placeholder="AAAA-MM-JJ" placeholderTextColor={colors.textLight} data-testid="custom-start" /></View>
          <View style={styles.customField}><Text style={styles.customLabel}>Au</Text><TextInput style={styles.customInput} value={customEnd} onChangeText={setCustomEnd} placeholder="AAAA-MM-JJ" placeholderTextColor={colors.textLight} data-testid="custom-end" /></View>
        </View>
      )}

      {/* Summary cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { borderLeftColor: colors.primary }]}><Text style={[styles.summaryValue, { color: colors.primary }]}>{filtered.length}</Text><Text style={styles.summaryLabel}>Employes</Text></View>
        <View style={[styles.summaryCard, { borderLeftColor: '#059669' }]}><Text style={[styles.summaryValue, { color: '#059669' }]}>{totalHours.toFixed(1)}h</Text><Text style={styles.summaryLabel}>Total heures</Text></View>
        <View style={[styles.summaryCard, { borderLeftColor: '#F59E0B' }]}><Text style={[styles.summaryValue, { color: '#F59E0B' }]}>{activeCount}</Text><Text style={styles.summaryLabel}>Actifs</Text></View>
      </View>

      {/* Search + Department filter */}
      <View style={styles.searchRow} data-testid="planning-search-bar">
        <MaterialIcons name="search" size={20} color={colors.textLight} style={{ marginRight: spacing.sm }} />
        <TextInput style={styles.searchInput} placeholder="Rechercher un employe..." value={search} onChangeText={setSearch} placeholderTextColor={colors.textLight} data-testid="planning-search-input" />
        {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')}><MaterialIcons name="close" size={18} color={colors.textLight} /></TouchableOpacity>}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        <TouchableOpacity style={[styles.filterChip, !filterDept && styles.filterChipActive]} onPress={() => setFilterDept('')}><Text style={[styles.filterText, !filterDept && styles.filterTextActive]}>Tous</Text></TouchableOpacity>
        {departments.map((d: any) => (
          <TouchableOpacity key={d.id} style={[styles.filterChip, filterDept === d.id && styles.filterChipActive]} onPress={() => setFilterDept(d.id)}><Text style={[styles.filterText, filterDept === d.id && styles.filterTextActive]}>{d.name}</Text></TouchableOpacity>
        ))}
      </ScrollView>

      {/* Legend */}
      <View style={styles.legend}>
        {Object.entries(LOC_LABELS).map(([key, label]) => (
          <View key={key} style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: LOC_COLORS[key] }]} /><Text style={styles.legendText}>{label}</Text></View>
        ))}
      </View>

      {loading ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} /> : (
        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
          <View>
            {/* Header row */}
            <View style={styles.gridRow}>
              <View style={styles.nameCell}><Text style={styles.nameCellText}>Employe</Text></View>
              {dates.map((d, i) => {
                const dow = getDayOfWeek(d);
                const isToday = d === formatDate(new Date());
                return (
                  <View key={d} style={[styles.dayCell, dow >= 5 && styles.dayCellWeekend, isToday && styles.dayCellToday]}>
                    <Text style={[styles.dayName, isToday && styles.dayNameToday]}>{DAYS[dow]}</Text>
                    <Text style={[styles.dayDate, isToday && styles.dayDateToday]}>{formatDateShort(d)}</Text>
                  </View>
                );
              })}
            </View>
            {/* Data rows */}
            {filtered.map((p) => (
              <View key={p.user_id} style={styles.gridRow}>
                <View style={styles.nameCell}>
                  <Text style={styles.empName} numberOfLines={1}>{p.name}</Text>
                  {p.department && <Text style={styles.empDept}>{p.department}</Text>}
                </View>
                {dates.map((d) => {
                  const dow = getDayOfWeek(d);
                  const day = p.days[d];
                  const isToday = d === formatDate(new Date());
                  const isSelected = selectedCell?.userId === p.user_id && selectedCell?.date === d;
                  const bg = day ? (LOC_COLORS[day.type === 'work' ? day.location : day.type] || '#94A3B8') : 'transparent';
                  return (
                    <Pressable key={d} style={[styles.dayCell, dow >= 5 && styles.dayCellWeekend, isToday && styles.dayCellTodayBg, isSelected && styles.dayCellSelected]}
                      onPress={() => { if (day) { setSelectedCell({ userId: p.user_id, date: d, name: p.name }); setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150); } }}
                    >
                      {day ? (
                        <View style={[styles.dayBlock, { backgroundColor: bg + '22', borderColor: bg }]}>
                          {day.type === 'work' ? (
                            <Text style={[styles.dayHours, { color: bg }]}>{day.hours}h</Text>
                          ) : (
                            <MaterialIcons name={(LOC_ICONS[day.type] || 'event-busy') as any} size={16} color={bg} />
                          )}
                        </View>
                      ) : (
                        <Text style={styles.dayEmpty}>-</Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ))}
            {filtered.length === 0 && <Text style={styles.empty}>Aucune donnee pour cette periode</Text>}
          </View>
        </ScrollView>
      )}

      {/* Detail panel */}
      {selectedCell && detail && (
        <View style={styles.detailPanel} data-testid="detail-panel">
          <View style={styles.detailHeader}>
            <View>
              <Text style={styles.detailTitle}>{selectedCell.name}</Text>
              <Text style={styles.detailDate}>{formatDateFull(selectedCell.date)}</Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedCell(null)} data-testid="close-detail">
              <MaterialIcons name="close" size={22} color={colors.textLight} />
            </TouchableOpacity>
          </View>
          {detail.day ? (
            <View style={styles.detailContent}>
              {detail.day.type === 'work' ? (
                <>
                  <View style={styles.detailGrid}>
                    <View style={styles.detailCard}>
                      <MaterialIcons name="login" size={20} color="#059669" />
                      <Text style={styles.detailCardLabel}>Arrivee</Text>
                      <Text style={[styles.detailCardValue, { color: '#059669' }]}>{formatTime(detail.day.clock_in)}</Text>
                    </View>
                    <View style={styles.detailCard}>
                      <MaterialIcons name="logout" size={20} color="#DC2626" />
                      <Text style={styles.detailCardLabel}>Depart</Text>
                      <Text style={[styles.detailCardValue, { color: '#DC2626' }]}>{formatTime(detail.day.clock_out)}</Text>
                    </View>
                    <View style={styles.detailCard}>
                      <MaterialIcons name="schedule" size={20} color={colors.primary} />
                      <Text style={styles.detailCardLabel}>Duree</Text>
                      <Text style={[styles.detailCardValue, { color: colors.primary }]}>{detail.day.hours}h</Text>
                    </View>
                    <View style={styles.detailCard}>
                      <MaterialIcons name={(LOC_ICONS[detail.day.location] || 'business') as any} size={20} color={LOC_COLORS[detail.day.location] || '#94A3B8'} />
                      <Text style={styles.detailCardLabel}>Lieu</Text>
                      <Text style={[styles.detailCardValue, { color: LOC_COLORS[detail.day.location] || '#94A3B8' }]}>{LOC_LABELS[detail.day.location] || detail.day.location}</Text>
                    </View>
                  </View>
                  {detail.day.project_name && (
                    <View style={styles.detailRow}><MaterialIcons name="folder" size={16} color={colors.primary} /><Text style={styles.detailRowText}>Projet: <Text style={{ fontWeight: '700' }}>{detail.day.project_name}</Text></Text></View>
                  )}
                  {detail.day.break_start && (
                    <View style={styles.detailRow}><MaterialIcons name="free-breakfast" size={16} color="#F59E0B" /><Text style={styles.detailRowText}>Pause: {formatTime(detail.day.break_start)} - {formatTime(detail.day.break_end)}</Text></View>
                  )}
                  <View style={styles.detailRow}>
                    <MaterialIcons name={detail.day.status === 'approved' ? 'check-circle' : detail.day.status === 'rejected' ? 'cancel' : 'access-time'} size={16} color={detail.day.status === 'approved' ? '#059669' : detail.day.status === 'rejected' ? '#DC2626' : '#F59E0B'} />
                    <Text style={styles.detailRowText}>Statut: <Text style={{ fontWeight: '700' }}>{detail.day.status === 'approved' ? 'Approuve' : detail.day.status === 'rejected' ? 'Refuse' : 'En attente'}</Text></Text>
                  </View>
                </>
              ) : (
                <View style={styles.detailAbsence}>
                  <MaterialIcons name={(LOC_ICONS[detail.day.type] || 'event-busy') as any} size={32} color={LOC_COLORS[detail.day.type] || '#94A3B8'} />
                  <Text style={[styles.detailAbsenceType, { color: LOC_COLORS[detail.day.type] || '#94A3B8' }]}>{LOC_LABELS[detail.day.type] || detail.day.type}</Text>
                  <Text style={styles.detailAbsenceStatus}>Absence approuvee</Text>
                </View>
              )}
            </View>
          ) : (
            <Text style={styles.detailEmpty}>Aucune donnee pour ce jour</Text>
          )}
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
  filterRow: { marginBottom: spacing.md },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, marginRight: spacing.sm },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: fontSize.sm, color: colors.textLight },
  filterTextActive: { color: '#FFF', fontWeight: '600' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, color: colors.textLight },
  gridRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  nameCell: { width: 160, paddingVertical: 10, paddingHorizontal: spacing.sm, justifyContent: 'center', borderRightWidth: 1, borderRightColor: colors.borderLight, backgroundColor: colors.surface },
  nameCellText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textLight },
  empName: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  empDept: { fontSize: 10, color: colors.textLight },
  dayCell: { width: 80, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: colors.borderLight },
  dayCellWeekend: { backgroundColor: '#F8FAFC' },
  dayCellToday: { backgroundColor: '#EFF6FF' },
  dayCellTodayBg: { backgroundColor: '#EFF6FF' },
  dayCellSelected: { backgroundColor: '#DBEAFE', borderWidth: 2, borderColor: colors.primary },
  dayName: { fontSize: 11, fontWeight: '700', color: colors.textLight },
  dayNameToday: { color: colors.primary },
  dayDate: { fontSize: 10, color: colors.textLight },
  dayDateToday: { color: colors.primary, fontWeight: '700' },
  dayBlock: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: borderRadius.sm, borderWidth: 1.5 },
  dayHours: { fontSize: fontSize.sm, fontWeight: '700' },
  dayEmpty: { fontSize: fontSize.sm, color: '#D1D5DB' },
  empty: { padding: spacing.xl, textAlign: 'center', color: colors.textLight, fontSize: fontSize.md },
  // Detail panel
  detailPanel: { marginTop: spacing.lg, backgroundColor: colors.surface, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.primary, overflow: 'hidden' },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, backgroundColor: '#EFF6FF', borderBottomWidth: 1, borderBottomColor: colors.border },
  detailTitle: { fontSize: fontSize.md, fontWeight: '800', color: colors.text },
  detailDate: { fontSize: fontSize.sm, color: colors.primary, textTransform: 'capitalize' },
  detailContent: { padding: spacing.md },
  detailGrid: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  detailCard: { flex: 1, backgroundColor: colors.background, borderRadius: borderRadius.sm, padding: spacing.sm, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.border },
  detailCardLabel: { fontSize: 10, fontWeight: '600', color: colors.textLight },
  detailCardValue: { fontSize: fontSize.md, fontWeight: '800' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  detailRowText: { fontSize: fontSize.sm, color: colors.text },
  detailAbsence: { alignItems: 'center', paddingVertical: spacing.lg, gap: spacing.sm },
  detailAbsenceType: { fontSize: fontSize.lg, fontWeight: '700' },
  detailAbsenceStatus: { fontSize: fontSize.sm, color: colors.textLight },
  detailEmpty: { padding: spacing.lg, textAlign: 'center', color: colors.textLight },
});
