import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../../src/theme/constants';
import { useAuth } from '../../src/context/AuthContext';
import { getAnalyticsDashboard } from '../../src/services/api';

const BAR_MAX_H = 120;

export default function AnalyticsScreen() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAnalyticsDashboard({ months: 6 }).then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.primary} /></View>;
  if (!data) return <View style={styles.loadingContainer}><Text style={styles.emptyText}>Aucune donnee</Text></View>;

  const maxHours = Math.max(...data.monthly.map((m: any) => m.total_hours), 1);
  const maxProjHours = Math.max(...data.project_hours.map((p: any) => p.hours), 1);
  const totalLoc = (data.location_distribution.office || 0) + (data.location_distribution.home || 0) + (data.location_distribution.onsite || 0) || 1;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Tableau de bord analytique</Text>

      {/* KPI Cards */}
      <View style={styles.kpiRow}>
        <View style={[styles.kpiCard, { borderLeftColor: colors.primary }]}><Text style={[styles.kpiValue, { color: colors.primary }]}>{data.total_employees}</Text><Text style={styles.kpiLabel}>Employes</Text></View>
        <View style={[styles.kpiCard, { borderLeftColor: '#059669' }]}><Text style={[styles.kpiValue, { color: '#059669' }]}>{data.active_projects}</Text><Text style={styles.kpiLabel}>Projets actifs</Text></View>
        <View style={[styles.kpiCard, { borderLeftColor: '#F59E0B' }]}><Text style={[styles.kpiValue, { color: '#F59E0B' }]}>{data.monthly[data.monthly.length - 1]?.total_hours || 0}h</Text><Text style={styles.kpiLabel}>Heures ce mois</Text></View>
        <View style={[styles.kpiCard, { borderLeftColor: '#DC2626' }]}><Text style={[styles.kpiValue, { color: '#DC2626' }]}>{data.monthly[data.monthly.length - 1]?.absence_rate || 0}%</Text><Text style={styles.kpiLabel}>Taux absenteisme</Text></View>
      </View>

      {/* Monthly Hours Chart */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Heures mensuelles</Text>
        <View style={styles.barChart}>
          {data.monthly.map((m: any, i: number) => (
            <View key={i} style={styles.barGroup}>
              <View style={styles.barStack}>
                <View style={[styles.bar, styles.barBillable, { height: Math.max(4, (m.billable_hours / maxHours) * BAR_MAX_H) }]} />
                <View style={[styles.bar, styles.barTotal, { height: Math.max(4, ((m.total_hours - m.billable_hours) / maxHours) * BAR_MAX_H) }]} />
              </View>
              <Text style={styles.barLabel}>{m.month}</Text>
              <Text style={styles.barValue}>{m.total_hours}h</Text>
            </View>
          ))}
        </View>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.primary }]} /><Text style={styles.legendText}>Facturables</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#94A3B8' }]} /><Text style={styles.legendText}>Non-facturables</Text></View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        {/* Project Hours */}
        <View style={[styles.chartCard, { flex: 1 }]}>
          <Text style={styles.chartTitle}>Heures par projet</Text>
          {data.project_hours.map((p: any, i: number) => (
            <View key={i} style={styles.hBarRow}>
              <Text style={styles.hBarLabel} numberOfLines={1}>{p.name}</Text>
              <View style={styles.hBarTrack}>
                <View style={[styles.hBarFill, { width: `${(p.hours / maxProjHours) * 100}%` }]} />
              </View>
              <Text style={styles.hBarValue}>{p.hours}h</Text>
            </View>
          ))}
          {data.project_hours.length === 0 && <Text style={styles.emptyText}>Aucune donnee</Text>}
        </View>

        {/* Location Distribution */}
        <View style={[styles.chartCard, { flex: 1 }]}>
          <Text style={styles.chartTitle}>Repartition des lieux</Text>
          <View style={styles.donutContainer}>
            {[
              { key: 'office', label: 'Bureau', color: '#2563EB', val: data.location_distribution.office || 0 },
              { key: 'home', label: 'Teletravail', color: '#7C3AED', val: data.location_distribution.home || 0 },
              { key: 'onsite', label: 'Chantier', color: '#059669', val: data.location_distribution.onsite || 0 },
            ].map(loc => (
              <View key={loc.key} style={styles.donutRow}>
                <View style={[styles.donutBar, { backgroundColor: loc.color + '22' }]}>
                  <View style={[styles.donutFill, { backgroundColor: loc.color, width: `${(loc.val / totalLoc) * 100}%` }]} />
                </View>
                <View style={styles.donutInfo}>
                  <Text style={[styles.donutValue, { color: loc.color }]}>{Math.round((loc.val / totalLoc) * 100)}%</Text>
                  <Text style={styles.donutLabel}>{loc.label} ({loc.val})</Text>
                </View>
              </View>
            ))}
          </View>

          <Text style={[styles.chartTitle, { marginTop: spacing.lg }]}>Taux d'absenteisme</Text>
          {data.monthly.map((m: any, i: number) => (
            <View key={i} style={styles.absRow}>
              <Text style={styles.absMonth}>{m.month}</Text>
              <View style={styles.absBarTrack}>
                <View style={[styles.absBarFill, { width: `${Math.min(100, m.absence_rate * 5)}%`, backgroundColor: m.absence_rate > 5 ? '#DC2626' : m.absence_rate > 3 ? '#F59E0B' : '#059669' }]} />
              </View>
              <Text style={styles.absValue}>{m.absence_rate}%</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, marginBottom: spacing.lg },
  emptyText: { color: colors.textLight, fontSize: fontSize.sm, textAlign: 'center', padding: spacing.md },
  kpiRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  kpiCard: { flex: 1, backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 4 },
  kpiValue: { fontSize: fontSize.xl, fontWeight: '800' },
  kpiLabel: { fontSize: fontSize.xs, color: colors.textLight },
  chartCard: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border },
  chartTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: BAR_MAX_H + 40 },
  barGroup: { alignItems: 'center', gap: 4 },
  barStack: { flexDirection: 'column-reverse' },
  bar: { width: 32, borderRadius: 4 },
  barBillable: { backgroundColor: colors.primary },
  barTotal: { backgroundColor: '#94A3B8' },
  barLabel: { fontSize: 11, color: colors.textLight, fontWeight: '600' },
  barValue: { fontSize: 10, color: colors.text, fontWeight: '700' },
  legendRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, color: colors.textLight },
  hBarRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  hBarLabel: { width: 100, fontSize: fontSize.xs, color: colors.text, fontWeight: '500' },
  hBarTrack: { flex: 1, height: 12, backgroundColor: colors.borderLight, borderRadius: 6, overflow: 'hidden' },
  hBarFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 6 },
  hBarValue: { width: 50, fontSize: fontSize.xs, color: colors.text, fontWeight: '700', textAlign: 'right' },
  donutContainer: { gap: spacing.md },
  donutRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  donutBar: { flex: 1, height: 20, borderRadius: 10, overflow: 'hidden' },
  donutFill: { height: '100%', borderRadius: 10 },
  donutInfo: { width: 100 },
  donutValue: { fontSize: fontSize.md, fontWeight: '800' },
  donutLabel: { fontSize: 10, color: colors.textLight },
  absRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 6 },
  absMonth: { width: 30, fontSize: 11, color: colors.textLight, fontWeight: '600' },
  absBarTrack: { flex: 1, height: 8, backgroundColor: colors.borderLight, borderRadius: 4, overflow: 'hidden' },
  absBarFill: { height: '100%', borderRadius: 4 },
  absValue: { width: 40, fontSize: 11, color: colors.text, fontWeight: '600', textAlign: 'right' },
});
