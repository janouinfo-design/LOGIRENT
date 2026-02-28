import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api/axios';
import { useThemeStore } from '../../src/store/themeStore';
import Svg, { Rect, Text as SvgText, Line, G, Path } from 'react-native-svg';

const { width: SCREEN_W } = Dimensions.get('window');

interface AdvancedStats {
  revenue_this_month: number;
  revenue_last_month: number;
  revenue_change_pct: number;
  reservations_this_month: number;
  reservations_last_month: number;
  avg_booking_duration: number;
  avg_revenue_per_reservation: number;
  vehicle_utilization: Array<{ id: string; name: string; utilization: number; booked_days: number }>;
  revenue_per_vehicle: Array<{ id: string; name: string; revenue: number; bookings: number }>;
  daily_revenue: Array<{ date: string; revenue: number; bookings: number }>;
  new_clients_30d: number;
  payment_methods: Array<{ method: string; count: number; total: number }>;
  cancellation_rate: number;
  weekly_trends: Array<{ week: number; bookings: number; revenue: number }>;
}

function BarChart({ data, labelKey, valueKey, color, textColor, gridColor, height = 140 }: any) {
  if (!data || data.length === 0) return <Text style={{ color: textColor, textAlign: 'center', padding: 20 }}>Aucune donnée</Text>;
  const chartW = SCREEN_W - 80;
  const maxVal = Math.max(...data.map((d: any) => d[valueKey]), 1);
  const barW = Math.min(36, (chartW - 20) / data.length - 4);
  const ml = 46;
  return (
    <Svg width={chartW + ml} height={height + 26}>
      {[0, 0.5, 1].map((p, i) => (
        <G key={i}>
          <Line x1={ml} y1={height - p * height} x2={chartW + ml} y2={height - p * height} stroke={gridColor} strokeWidth={0.5} />
          <SvgText x={ml - 4} y={height - p * height + 3} fill={textColor} fontSize={9} textAnchor="end">{Math.round(maxVal * p)}</SvgText>
        </G>
      ))}
      {data.map((d: any, i: number) => {
        const barH = (d[valueKey] / maxVal) * (height - 8);
        const x = ml + 8 + i * ((chartW - 16) / data.length);
        return (
          <G key={i}>
            <Rect x={x} y={height - barH} width={barW} height={barH} rx={3} fill={color} opacity={0.8} />
            <SvgText x={x + barW / 2} y={height + 13} fill={textColor} fontSize={7} textAnchor="middle">{d[labelKey]?.toString().slice(-5) || ''}</SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

function DonutChart({ segments, size = 100, textColor }: any) {
  const total = segments.reduce((s: number, seg: any) => s + seg.value, 0) || 1;
  const r = (size - 20) / 2;
  const cx = size / 2; const cy = size / 2;
  let cum = -90;
  const arcs = segments.map((seg: any) => {
    const angle = (seg.value / total) * 360;
    const start = cum; cum += angle;
    const end = cum;
    const lg = angle > 180 ? 1 : 0;
    const rad = (a: number) => (a * Math.PI) / 180;
    return { ...seg, path: `M ${cx + r * Math.cos(rad(start))} ${cy + r * Math.sin(rad(start))} A ${r} ${r} 0 ${lg} 1 ${cx + r * Math.cos(rad(end))} ${cy + r * Math.sin(rad(end))}` };
  });
  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        {arcs.map((a: any, i: number) => <Path key={i} d={a.path} fill="none" stroke={a.color} strokeWidth={14} strokeLinecap="round" />)}
        <SvgText x={cx} y={cy + 4} fill={textColor} fontSize={13} fontWeight="bold" textAnchor="middle">{total}</SvgText>
      </Svg>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 6 }}>
        {segments.map((seg: any, i: number) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: seg.color }} />
            <Text style={{ color: textColor, fontSize: 10 }}>{seg.label}: {seg.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function AgencyStatistics() {
  const { colors: C } = useThemeStore();
  const [stats, setStats] = useState<AdvancedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const resp = await api.get('/api/admin/stats/advanced');
      setStats(resp.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  if (loading) return <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={C.accent} /></View>;
  if (!stats) return <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: C.textLight }}>Erreur de chargement</Text></View>;

  const pmColors: Record<string, string> = { card: C.accent, cash: '#fbbf24', twint: '#06b6d4' };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}>
      <Text style={{ color: C.text, fontSize: 20, fontWeight: '800', marginBottom: 4 }}>Statistiques</Text>
      <Text style={{ color: C.textLight, fontSize: 12, marginBottom: 16 }}>Vue détaillée de votre activité</Text>

      {/* KPI Cards */}
      <View style={st.kpiRow}>
        {[
          { icon: 'cash', label: 'Revenu mois', value: `CHF ${stats.revenue_this_month.toFixed(0)}`, color: C.success, trend: stats.revenue_change_pct },
          { icon: 'calendar', label: 'Réservations', value: `${stats.reservations_this_month}`, color: C.warning, sub: `${stats.reservations_last_month} mois dernier` },
          { icon: 'time', label: 'Durée moy.', value: `${stats.avg_booking_duration}j`, color: C.info },
          { icon: 'wallet', label: 'Panier moy.', value: `CHF ${stats.avg_revenue_per_reservation.toFixed(0)}`, color: C.accent },
        ].map((kpi, i) => (
          <View key={i} style={[st.kpiCard, { backgroundColor: C.card, borderColor: C.border, borderLeftColor: kpi.color }]} data-testid={`agency-kpi-${i}`}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: kpi.color + '20', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name={kpi.icon as any} size={14} color={kpi.color} />
              </View>
              <Text style={{ color: C.textLight, fontSize: 10 }}>{kpi.label}</Text>
            </View>
            <Text style={{ color: C.text, fontSize: 20, fontWeight: '800', marginTop: 4 }}>{kpi.value}</Text>
            {kpi.trend !== undefined && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Ionicons name={kpi.trend >= 0 ? 'arrow-up' : 'arrow-down'} size={10} color={kpi.trend >= 0 ? C.success : C.error} />
                <Text style={{ color: kpi.trend >= 0 ? C.success : C.error, fontSize: 10, fontWeight: '700' }}>{Math.abs(kpi.trend)}%</Text>
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Daily Revenue Chart */}
      <Text style={{ color: C.text, fontSize: 15, fontWeight: '700', marginBottom: 8, marginTop: 8 }}>Revenu Journalier (30j)</Text>
      <View style={[st.chartCard, { backgroundColor: C.card, borderColor: C.border }]}>
        <BarChart data={stats.daily_revenue} labelKey="date" valueKey="revenue" color={C.accent} textColor={C.textLight} gridColor={C.border} />
      </View>

      {/* Vehicle Utilization */}
      <Text style={{ color: C.text, fontSize: 15, fontWeight: '700', marginBottom: 8, marginTop: 16 }}>Utilisation des Véhicules</Text>
      <View style={[st.chartCard, { backgroundColor: C.card, borderColor: C.border }]}>
        {stats.vehicle_utilization.slice(0, 6).map((v, i) => (
          <View key={v.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: i < 5 ? 8 : 0 }}>
            <Text style={{ color: C.textLight, fontSize: 11, width: 80 }} numberOfLines={1}>{v.name}</Text>
            <View style={{ flex: 1, height: 16, backgroundColor: C.border + '40', borderRadius: 8, overflow: 'hidden' }}>
              <View style={{ width: `${Math.max(2, v.utilization)}%`, height: '100%', backgroundColor: v.utilization >= 70 ? C.success : v.utilization >= 40 ? C.warning : C.error, borderRadius: 8 }} />
            </View>
            <Text style={{ color: C.text, fontSize: 11, fontWeight: '700', width: 36, textAlign: 'right' }}>{v.utilization}%</Text>
          </View>
        ))}
        {stats.vehicle_utilization.length === 0 && <Text style={{ color: C.textLight, textAlign: 'center', padding: 16 }}>Aucun véhicule</Text>}
      </View>

      {/* Revenue per Vehicle + Payment Methods */}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.text, fontSize: 15, fontWeight: '700', marginBottom: 8 }}>Top Revenus</Text>
          <View style={[st.chartCard, { backgroundColor: C.card, borderColor: C.border }]}>
            {stats.revenue_per_vehicle.slice(0, 4).map((v, i) => (
              <View key={v.id} style={[{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }, i > 0 && { borderTopWidth: 1, borderTopColor: C.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, fontSize: 11, fontWeight: '600' }} numberOfLines={1}>{v.name}</Text>
                  <Text style={{ color: C.textLight, fontSize: 9 }}>{v.bookings} loc.</Text>
                </View>
                <Text style={{ color: '#fbbf24', fontSize: 12, fontWeight: '800' }}>CHF {v.revenue.toFixed(0)}</Text>
              </View>
            ))}
            {stats.revenue_per_vehicle.length === 0 && <Text style={{ color: C.textLight, textAlign: 'center', padding: 12, fontSize: 11 }}>-</Text>}
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.text, fontSize: 15, fontWeight: '700', marginBottom: 8 }}>Paiements</Text>
          <View style={[st.chartCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <DonutChart
              textColor={C.text}
              segments={stats.payment_methods.map(pm => ({
                label: pm.method === 'cash' ? 'Espèces' : pm.method === 'card' ? 'Carte' : pm.method,
                value: pm.count,
                color: pmColors[pm.method] || C.textLight,
              }))}
              size={100}
            />
          </View>
        </View>
      </View>

      {/* Bottom stats */}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
        <View style={[st.miniCard, { backgroundColor: C.card, borderColor: C.error + '30' }]}>
          <Ionicons name="close-circle" size={18} color={C.error} />
          <Text style={{ color: C.text, fontSize: 20, fontWeight: '800' }}>{stats.cancellation_rate}%</Text>
          <Text style={{ color: C.textLight, fontSize: 9, textAlign: 'center' }}>Taux d'annulation</Text>
        </View>
        <View style={[st.miniCard, { backgroundColor: C.card, borderColor: C.success + '30' }]}>
          <Ionicons name="people" size={18} color={C.success} />
          <Text style={{ color: C.text, fontSize: 20, fontWeight: '800' }}>{stats.new_clients_30d}</Text>
          <Text style={{ color: C.textLight, fontSize: 9, textAlign: 'center' }}>Nouveaux clients (30j)</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kpiCard: { flex: 1, minWidth: 140, borderRadius: 12, padding: 12, borderWidth: 1, borderLeftWidth: 3, gap: 2 },
  chartCard: { borderRadius: 12, padding: 14, borderWidth: 1 },
  miniCard: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center', gap: 4, borderWidth: 1 },
});
