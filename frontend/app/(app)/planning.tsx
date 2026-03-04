import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../../src/theme/constants';
import { getPlanning, getDepartments } from '../../src/services/api';

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const LOC_COLORS: Record<string, string> = { office: '#2563EB', home: '#7C3AED', onsite: '#059669', vacation: '#F59E0B', sick: '#EF4444', accident: '#DC2626', training: '#6366F1', maternity: '#EC4899', paternity: '#8B5CF6', special: '#F97316', absent: '#94A3B8' };
const LOC_LABELS: Record<string, string> = { office: 'Bureau', home: 'Teletravail', onsite: 'Chantier', vacation: 'Vacances', sick: 'Maladie', accident: 'Accident', training: 'Formation', maternity: 'Maternite', paternity: 'Paternite', special: 'Conge special', work: 'Travail' };

export default function PlanningScreen() {
  const [planning, setPlanning] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [filterDept, setFilterDept] = useState('');

  const getWeekDates = (offset: number) => {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - now.getDay() + 1 + offset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d.toISOString().split('T')[0];
    });
  };

  const dates = getWeekDates(weekOffset);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [planRes, deptRes] = await Promise.all([
        getPlanning({ start_date: dates[0], end_date: dates[6], department_id: filterDept || undefined }),
        getDepartments()
      ]);
      setPlanning(planRes.data);
      setDepartments(deptRes.data);
    } catch (err) { console.log(err); }
    finally { setLoading(false); }
  }, [weekOffset, filterDept]);

  useEffect(() => { loadData(); }, [loadData]);

  const formatDateShort = (d: string) => { const dt = new Date(d + 'T00:00:00'); return `${dt.getDate()}/${dt.getMonth() + 1}`; };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Planning</Text>
        <View style={styles.weekNav}>
          <Pressable onPress={() => setWeekOffset(w => w - 1)} style={styles.navBtn}><MaterialIcons name="chevron-left" size={24} color={colors.text} /></Pressable>
          <Pressable onPress={() => setWeekOffset(0)} style={styles.todayBtn}><Text style={styles.todayBtnText}>Aujourd'hui</Text></Pressable>
          <Pressable onPress={() => setWeekOffset(w => w + 1)} style={styles.navBtn}><MaterialIcons name="chevron-right" size={24} color={colors.text} /></Pressable>
        </View>
      </View>

      {/* Department filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        <Pressable style={[styles.filterChip, !filterDept && styles.filterChipActive]} onPress={() => setFilterDept('')}>
          <Text style={[styles.filterText, !filterDept && styles.filterTextActive]}>Tous</Text>
        </Pressable>
        {departments.map((d: any) => (
          <Pressable key={d.id} style={[styles.filterChip, filterDept === d.id && styles.filterChipActive]} onPress={() => setFilterDept(d.id)}>
            <Text style={[styles.filterText, filterDept === d.id && styles.filterTextActive]}>{d.name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Legend */}
      <View style={styles.legend}>
        {Object.entries(LOC_LABELS).filter(([k]) => k !== 'work').map(([key, label]) => (
          <View key={key} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: LOC_COLORS[key] || '#94A3B8' }]} />
            <Text style={styles.legendText}>{label}</Text>
          </View>
        ))}
      </View>

      {loading ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} /> : (
        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
          <View>
            {/* Header row */}
            <View style={styles.gridRow}>
              <View style={styles.nameCell}><Text style={styles.nameCellText}>Employe</Text></View>
              {dates.map((d, i) => (
                <View key={d} style={[styles.dayCell, i >= 5 && styles.dayCellWeekend]}>
                  <Text style={styles.dayName}>{DAYS[i]}</Text>
                  <Text style={styles.dayDate}>{formatDateShort(d)}</Text>
                </View>
              ))}
            </View>
            {/* Data rows */}
            {planning.map((p) => (
              <View key={p.user_id} style={styles.gridRow}>
                <View style={styles.nameCell}>
                  <Text style={styles.empName} numberOfLines={1}>{p.name}</Text>
                  {p.department && <Text style={styles.empDept}>{p.department}</Text>}
                </View>
                {dates.map((d, i) => {
                  const day = p.days[d];
                  const bg = day ? (LOC_COLORS[day.type === 'work' ? day.location : day.type] || '#94A3B8') : 'transparent';
                  return (
                    <View key={d} style={[styles.dayCell, i >= 5 && styles.dayCellWeekend]}>
                      {day ? (
                        <View style={[styles.dayBlock, { backgroundColor: bg + '22', borderColor: bg }]}>
                          {day.type === 'work' ? (
                            <Text style={[styles.dayHours, { color: bg }]}>{day.hours}h</Text>
                          ) : (
                            <MaterialIcons name={day.type === 'vacation' ? 'beach-access' : day.type === 'sick' ? 'local-hospital' : 'event-busy'} size={16} color={bg} />
                          )}
                        </View>
                      ) : (
                        <Text style={styles.dayEmpty}>-</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            ))}
            {planning.length === 0 && <Text style={styles.empty}>Aucune donnee pour cette periode</Text>}
          </View>
        </ScrollView>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  weekNav: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  navBtn: { padding: 8, borderRadius: borderRadius.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  todayBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: borderRadius.sm, backgroundColor: colors.primary },
  todayBtnText: { color: '#FFF', fontSize: fontSize.sm, fontWeight: '600' },
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
  nameCell: { width: 160, paddingVertical: 10, paddingHorizontal: spacing.sm, justifyContent: 'center', borderRightWidth: 1, borderRightColor: colors.borderLight },
  nameCellText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textLight },
  empName: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  empDept: { fontSize: 10, color: colors.textLight },
  dayCell: { width: 80, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: colors.borderLight },
  dayCellWeekend: { backgroundColor: '#F8FAFC' },
  dayName: { fontSize: 11, fontWeight: '700', color: colors.textLight },
  dayDate: { fontSize: 10, color: colors.textLight },
  dayBlock: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: borderRadius.sm, borderWidth: 1.5 },
  dayHours: { fontSize: fontSize.sm, fontWeight: '700' },
  dayEmpty: { fontSize: fontSize.sm, color: '#D1D5DB' },
  empty: { padding: spacing.xl, textAlign: 'center', color: colors.textLight, fontSize: fontSize.md },
});
