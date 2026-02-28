import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api/axios';
import Svg, { Rect, Text as SvgText, Line, Circle, Path, G } from 'react-native-svg';

const { width: SCREEN_W } = Dimensions.get('window');

const C = {
  bg: '#0F0B1A',
  card: '#1A1425',
  text: '#FFFFFF',
  textLight: '#9CA3AF',
  border: '#2D2640',
  accent: '#A78BFA',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#06b6d4',
  purple: '#7C3AED',
  gold: '#fbbf24',
};

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

function BarChart({ data, labelKey, valueKey, color, height = 160 }: { data: any[]; labelKey: string; valueKey: string; color: string; height?: number }) {
  if (!data || data.length === 0) return <Text style={{ color: C.textLight, textAlign: 'center', padding: 20 }}>Aucune donnée</Text>;
  const chartW = SCREEN_W - 80;
  const maxVal = Math.max(...data.map(d => d[valueKey]), 1);
  const barW = Math.min(40, (chartW - 20) / data.length - 4);
  const marginLeft = 50;

  return (
    <Svg width={chartW + marginLeft} height={height + 30} viewBox={`0 0 ${chartW + marginLeft} ${height + 30}`}>
      {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
        <G key={i}>
          <Line x1={marginLeft} y1={height - pct * height} x2={chartW + marginLeft} y2={height - pct * height} stroke={C.border} strokeWidth={0.5} />
          <SvgText x={marginLeft - 6} y={height - pct * height + 4} fill={C.textLight} fontSize={9} textAnchor="end">
            {Math.round(maxVal * pct).toLocaleString()}
          </SvgText>
        </G>
      ))}
      {data.map((d, i) => {
        const barH = (d[valueKey] / maxVal) * (height - 10);
        const x = marginLeft + 10 + i * ((chartW - 20) / data.length);
        return (
          <G key={i}>
            <Rect x={x} y={height - barH} width={barW} height={barH} rx={3} fill={color} opacity={0.85} />
            <SvgText x={x + barW / 2} y={height + 14} fill={C.textLight} fontSize={8} textAnchor="middle">
              {d[labelKey]?.toString().slice(-5) || ''}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

function HorizontalBarChart({ data, maxVal: extMax }: { data: Array<{ name: string; value: number; color: string }>; maxVal?: number }) {
  if (!data || data.length === 0) return <Text style={{ color: C.textLight, textAlign: 'center', padding: 20 }}>Aucune donnée</Text>;
  const maxVal = extMax || Math.max(...data.map(d => d.value), 1);
  const barMaxW = SCREEN_W - 160;

  return (
    <View style={{ gap: 8 }}>
      {data.map((d, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ color: C.textLight, fontSize: 11, width: 80 }} numberOfLines={1}>{d.name}</Text>
          <View style={{ flex: 1, height: 18, backgroundColor: C.border + '40', borderRadius: 9, overflow: 'hidden' }}>
            <View style={{ width: `${Math.max(2, (d.value / maxVal) * 100)}%`, height: '100%', backgroundColor: d.color, borderRadius: 9 }} />
          </View>
          <Text style={{ color: C.text, fontSize: 11, fontWeight: '700', width: 50, textAlign: 'right' }}>{d.value}%</Text>
        </View>
      ))}
    </View>
  );
}

function DonutChart({ segments, size = 120 }: { segments: Array<{ label: string; value: number; color: string }>; size?: number }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const r = (size - 20) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const strokeW = 16;
  let cumulativeAngle = -90;

  const arcs = segments.map((seg) => {
    const angle = (seg.value / total) * 360;
    const startAngle = cumulativeAngle;
    cumulativeAngle += angle;
    const endAngle = cumulativeAngle;
    const largeArc = angle > 180 ? 1 : 0;
    const rad = (a: number) => (a * Math.PI) / 180;
    const x1 = cx + r * Math.cos(rad(startAngle));
    const y1 = cy + r * Math.sin(rad(startAngle));
    const x2 = cx + r * Math.cos(rad(endAngle));
    const y2 = cy + r * Math.sin(rad(endAngle));
    return { ...seg, path: `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}` };
  });

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        {arcs.map((arc, i) => (
          <Path key={i} d={arc.path} fill="none" stroke={arc.color} strokeWidth={strokeW} strokeLinecap="round" />
        ))}
        <SvgText x={cx} y={cy + 4} fill={C.text} fontSize={14} fontWeight="bold" textAnchor="middle">{total}</SvgText>
      </Svg>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 8 }}>
        {segments.map((seg, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: seg.color }} />
            <Text style={{ color: C.textLight, fontSize: 10 }}>{seg.label}: {seg.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function KPICard({ icon, label, value, sub, color, trend }: { icon: string; label: string; value: string; sub?: string; color: string; trend?: number }) {
  return (
    <View style={[s.kpiCard, { borderLeftColor: color }]} data-testid={`kpi-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={[s.kpiIcon, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon as any} size={18} color={color} />
        </View>
        <Text style={s.kpiLabel}>{label}</Text>
      </View>
      <Text style={s.kpiValue}>{value}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {trend !== undefined && (
          <View style={[s.trendBadge, { backgroundColor: trend >= 0 ? C.success + '20' : C.error + '20' }]}>
            <Ionicons name={trend >= 0 ? 'arrow-up' : 'arrow-down'} size={10} color={trend >= 0 ? C.success : C.error} />
            <Text style={{ color: trend >= 0 ? C.success : C.error, fontSize: 10, fontWeight: '700' }}>{Math.abs(trend)}%</Text>
          </View>
        )}
        {sub && <Text style={s.kpiSub}>{sub}</Text>}
      </View>
    </View>
  );
}

export default function AdminStatistics() {
  const [stats, setStats] = useState<AdvancedStats | null>(null);
  const [basicStats, setBasicStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [advResp, basicResp] = await Promise.all([
        api.get('/api/admin/stats/advanced'),
        api.get('/api/admin/stats'),
      ]);
      setStats(advResp.data);
      setBasicStats(basicResp.data);
    } catch (err) {
      console.error('Stats fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  if (loading) return <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={C.accent} /></View>;
  if (!stats) return <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}><Text style={{ color: C.textLight }}>Erreur de chargement</Text></View>;

  const pmColors: Record<string, string> = { card: C.accent, cash: C.gold, twint: C.info };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}>
      <Text style={s.title}>Statistiques Avancées</Text>
      <Text style={s.subtitle}>Analyse détaillée de votre activité</Text>

      {/* KPIs Row */}
      <View style={s.kpiRow}>
        <KPICard icon="cash" label="Revenu ce mois" value={`CHF ${stats.revenue_this_month.toFixed(0)}`} trend={stats.revenue_change_pct} color={C.success} sub="vs mois précédent" />
        <KPICard icon="calendar" label="Réservations" value={`${stats.reservations_this_month}`} color={C.warning} sub={`${stats.reservations_last_month} mois dernier`} />
        <KPICard icon="time" label="Durée moyenne" value={`${stats.avg_booking_duration}j`} color={C.info} sub="par réservation" />
        <KPICard icon="wallet" label="Panier moyen" value={`CHF ${stats.avg_revenue_per_reservation.toFixed(0)}`} color={C.purple} sub="par location" />
      </View>

      {/* Revenue Chart */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Revenu Journalier (30 jours)</Text>
        <View style={s.chartCard}>
          <BarChart data={stats.daily_revenue} labelKey="date" valueKey="revenue" color={C.accent} height={140} />
        </View>
      </View>

      {/* Weekly Trends */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Tendance Hebdomadaire</Text>
        <View style={s.chartCard}>
          <BarChart data={stats.weekly_trends} labelKey="week" valueKey="bookings" color={C.info} height={120} />
        </View>
      </View>

      {/* Vehicle Utilization */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Taux d'Utilisation des Véhicules</Text>
        <View style={s.chartCard}>
          <HorizontalBarChart
            data={stats.vehicle_utilization.slice(0, 8).map(v => ({
              name: v.name,
              value: v.utilization,
              color: v.utilization >= 70 ? C.success : v.utilization >= 40 ? C.warning : C.error,
            }))}
            maxVal={100}
          />
        </View>
      </View>

      {/* Revenue Per Vehicle & Payment Methods side by side */}
      <View style={s.twoCol}>
        <View style={[s.section, { flex: 1 }]}>
          <Text style={s.sectionTitle}>Revenu par Véhicule</Text>
          <View style={s.chartCard}>
            {stats.revenue_per_vehicle.slice(0, 5).map((v, i) => (
              <View key={v.id} style={[s.rvRow, i > 0 && { borderTopWidth: 1, borderTopColor: C.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, fontSize: 12, fontWeight: '600' }} numberOfLines={1}>{v.name}</Text>
                  <Text style={{ color: C.textLight, fontSize: 10 }}>{v.bookings} locations</Text>
                </View>
                <Text style={{ color: C.gold, fontSize: 14, fontWeight: '800' }}>CHF {v.revenue.toFixed(0)}</Text>
              </View>
            ))}
            {stats.revenue_per_vehicle.length === 0 && <Text style={{ color: C.textLight, textAlign: 'center', padding: 16 }}>Aucune donnée</Text>}
          </View>
        </View>

        <View style={[s.section, { flex: 1 }]}>
          <Text style={s.sectionTitle}>Modes de Paiement</Text>
          <View style={s.chartCard}>
            <DonutChart
              segments={stats.payment_methods.map(pm => ({
                label: pm.method === 'cash' ? 'Espèces' : pm.method === 'card' ? 'Carte' : pm.method,
                value: pm.count,
                color: pmColors[pm.method] || C.textLight,
              }))}
              size={110}
            />
          </View>
        </View>
      </View>

      {/* Bottom KPIs */}
      <View style={s.bottomRow}>
        <View style={[s.miniCard, { borderColor: C.error + '40' }]}>
          <Ionicons name="close-circle" size={20} color={C.error} />
          <Text style={s.miniVal}>{stats.cancellation_rate}%</Text>
          <Text style={s.miniLabel}>Taux d'annulation</Text>
        </View>
        <View style={[s.miniCard, { borderColor: C.success + '40' }]}>
          <Ionicons name="people" size={20} color={C.success} />
          <Text style={s.miniVal}>{stats.new_clients_30d}</Text>
          <Text style={s.miniLabel}>Nouveaux clients (30j)</Text>
        </View>
        <View style={[s.miniCard, { borderColor: C.accent + '40' }]}>
          <Ionicons name="car" size={20} color={C.accent} />
          <Text style={s.miniVal}>{basicStats?.total_vehicles || 0}</Text>
          <Text style={s.miniLabel}>Flotte totale</Text>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingBottom: 40 },
  title: { color: C.text, fontSize: 22, fontWeight: '800' },
  subtitle: { color: C.textLight, fontSize: 13, marginTop: 2, marginBottom: 16 },
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  kpiCard: { flex: 1, minWidth: 150, backgroundColor: C.card, borderRadius: 12, padding: 14, borderLeftWidth: 3, gap: 6 },
  kpiIcon: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  kpiLabel: { color: C.textLight, fontSize: 11 },
  kpiValue: { color: C.text, fontSize: 22, fontWeight: '800' },
  kpiSub: { color: C.textLight, fontSize: 10 },
  trendBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  section: { marginBottom: 16 },
  sectionTitle: { color: C.text, fontSize: 15, fontWeight: '700', marginBottom: 8 },
  chartCard: { backgroundColor: C.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.border },
  twoCol: { flexDirection: 'row', gap: 10 },
  rvRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  bottomRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  miniCard: { flex: 1, backgroundColor: C.card, borderRadius: 12, padding: 14, alignItems: 'center', gap: 4, borderWidth: 1 },
  miniVal: { color: C.text, fontSize: 22, fontWeight: '800' },
  miniLabel: { color: C.textLight, fontSize: 10, textAlign: 'center' },
});
