import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api/axios';
import { useThemeStore } from '../../src/store/themeStore';
import { t } from '../../src/i18n';

interface ModelPerf {
  model_id: string;
  name: string;
  type: string;
  price_per_day: number;
  fleet_count: number;
  avg_mileage: number;
  occupancy_rate: number;
  booked_days: number;
  revenue: number;
  bookings: number;
  unmet_demand: number;
}

interface PerfData {
  days: number;
  models: ModelPerf[];
  totals: { revenue: number; avg_occupancy: number; unmet_demand: number };
}

const PERIODS = [
  { days: 30, label: '30 jours' },
  { days: 90, label: '90 jours' },
  { days: 365, label: '1 an' },
];

function occColor(rate: number) {
  if (rate >= 60) return '#10B981';
  if (rate >= 30) return '#F59E0B';
  return '#EF4444';
}

export default function ModelPerformance() {
  const { colors: C } = useThemeStore();
  const [data, setData] = useState<PerfData | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (d: number) => {
    try {
      const res = await api.get(`/api/admin/models/performance?days=${d}`);
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load(days);
  }, [days, load]);

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: C.bg }]}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  const models = data?.models || [];
  const totals = data?.totals || { revenue: 0, avg_occupancy: 0, unmet_demand: 0 };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(days); }} />}
      data-testid="model-performance-page"
    >
      <View style={s.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[s.title, { color: C.text }]}>{t("Performance par modèle")}</Text>
          <Text style={[s.subtitle, { color: C.textLight }]}>{t("Occupation, revenus et demande non satisfaite")}</Text>
        </View>
      </View>

      {/* Period selector */}
      <View style={s.periodRow}>
        {PERIODS.map(p => (
          <TouchableOpacity
            key={p.days}
            onPress={() => setDays(p.days)}
            style={[s.periodBtn, { borderColor: C.border, backgroundColor: C.card }, days === p.days && s.periodBtnActive]}
            data-testid={`perf-period-${p.days}`}
          >
            <Text style={[s.periodTxt, { color: days === p.days ? '#fff' : C.textLight }]}>{t(p.label)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary cards */}
      <View style={s.kpiRow}>
        <View style={[s.kpiCard, { backgroundColor: C.card, borderColor: C.border }]} data-testid="perf-kpi-revenue">
          <Ionicons name="cash-outline" size={18} color="#10B981" />
          <Text style={[s.kpiValue, { color: C.text }]}>CHF {totals.revenue.toLocaleString('fr-CH')}</Text>
          <Text style={[s.kpiLabel, { color: C.textLight }]}>{t("Revenus")}</Text>
        </View>
        <View style={[s.kpiCard, { backgroundColor: C.card, borderColor: C.border }]} data-testid="perf-kpi-occupancy">
          <Ionicons name="speedometer-outline" size={18} color="#7C3AED" />
          <Text style={[s.kpiValue, { color: C.text }]}>{totals.avg_occupancy}%</Text>
          <Text style={[s.kpiLabel, { color: C.textLight }]}>{t("Occupation moyenne")}</Text>
        </View>
        <View style={[s.kpiCard, { backgroundColor: C.card, borderColor: C.border }]} data-testid="perf-kpi-unmet">
          <Ionicons name="alert-circle-outline" size={18} color="#EF4444" />
          <Text style={[s.kpiValue, { color: totals.unmet_demand > 0 ? '#EF4444' : C.text }]}>{totals.unmet_demand}</Text>
          <Text style={[s.kpiLabel, { color: C.textLight }]}>{t("Demandes refusées")}</Text>
        </View>
      </View>

      {/* Model cards */}
      {models.length === 0 ? (
        <View style={[s.empty, { backgroundColor: C.card, borderColor: C.border }]}>
          <Ionicons name="car-outline" size={36} color={C.textLight} />
          <Text style={{ color: C.textLight, marginTop: 8 }}>{t("Aucun modèle dans le catalogue")}</Text>
        </View>
      ) : models.map(m => (
        <View key={m.model_id} style={[s.card, { backgroundColor: C.card, borderColor: C.border }]} data-testid={`perf-model-${m.model_id}`}>
          <View style={s.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[s.modelName, { color: C.text }]}>{m.name}</Text>
              <View style={s.metaRow}>
                <View style={[s.typeBadge, { backgroundColor: '#7C3AED15' }]}>
                  <Text style={{ color: '#7C3AED', fontSize: 10, fontWeight: '700' }}>{t(m.type)}</Text>
                </View>
                <Text style={{ color: C.textLight, fontSize: 11 }}>
                  {m.fleet_count} {t("véhicule(s)")} · CHF {m.price_per_day}{t("/jour")}
                </Text>
              </View>
            </View>
            {m.unmet_demand > 0 && (
              <View style={s.unmetBadge} data-testid={`perf-unmet-${m.model_id}`}>
                <Ionicons name="trending-down" size={12} color="#fff" />
                <Text style={s.unmetTxt}>{m.unmet_demand} {t("refusée(s)")}</Text>
              </View>
            )}
          </View>

          {/* Occupancy bar */}
          <View style={s.occRow}>
            <Text style={[s.occLabel, { color: C.textLight }]}>{t("Taux d'occupation")}</Text>
            <Text style={[s.occValue, { color: occColor(m.occupancy_rate) }]}>{m.occupancy_rate}%</Text>
          </View>
          <View style={[s.barBg, { backgroundColor: C.border }]}>
            <View style={[s.barFill, { width: `${m.occupancy_rate}%`, backgroundColor: occColor(m.occupancy_rate) }]} />
          </View>

          <View style={s.statsRow}>
            <View style={s.statItem}>
              <Text style={[s.statValue, { color: '#10B981' }]}>CHF {m.revenue.toLocaleString('fr-CH')}</Text>
              <Text style={[s.statLabel, { color: C.textLight }]}>{t("Revenus")}</Text>
            </View>
            <View style={s.statItem}>
              <Text style={[s.statValue, { color: C.text }]}>{m.bookings}</Text>
              <Text style={[s.statLabel, { color: C.textLight }]}>{t("Locations")}</Text>
            </View>
            <View style={s.statItem}>
              <Text style={[s.statValue, { color: C.text }]}>{m.booked_days}{t("j")}</Text>
              <Text style={[s.statLabel, { color: C.textLight }]}>{t("Jours loués")}</Text>
            </View>
            <View style={s.statItem}>
              <Text style={[s.statValue, { color: C.text }]}>{m.avg_mileage.toLocaleString('fr-CH')}</Text>
              <Text style={[s.statLabel, { color: C.textLight }]}>{t("KM moyen")}</Text>
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  title: { fontSize: 20, fontWeight: '800' },
  subtitle: { fontSize: 12, marginTop: 2 },
  periodRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  periodBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  periodBtnActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  periodTxt: { fontSize: 12, fontWeight: '700' },
  kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  kpiCard: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 12, alignItems: 'center', gap: 4 },
  kpiValue: { fontSize: 15, fontWeight: '800' },
  kpiLabel: { fontSize: 10, textAlign: 'center' },
  empty: { borderWidth: 1, borderRadius: 12, padding: 32, alignItems: 'center' },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  modelName: { fontSize: 15, fontWeight: '800' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  unmetBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EF4444', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  unmetTxt: { color: '#fff', fontSize: 10, fontWeight: '800' },
  occRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  occLabel: { fontSize: 11 },
  occValue: { fontSize: 12, fontWeight: '800' },
  barBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  statsRow: { flexDirection: 'row', marginTop: 12 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 13, fontWeight: '800' },
  statLabel: { fontSize: 10, marginTop: 2 },
});
