import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api/axios';
import { useThemeStore } from '../../src/store/themeStore';
import Svg, { Rect, Text as SvgText, Line, G, Path } from 'react-native-svg';

const { width: SCREEN_W } = Dimensions.get('window');

const _C = { bg: '#0a0a12', card: '#14141f', text: '#fff', textLight: '#9ca3af', border: '#1f1f2e', accent: '#f87171', gold: '#fbbf24', success: '#22c55e', info: '#06b6d4', purple: '#a78bfa', error: '#ef4444' };

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

function BarChart({ data, labelKey, valueKey, color, height = 150, C }: any) {
  if (!data || data.length === 0) return <Text style={{ color: C.textLight, textAlign: 'center', padding: 20 }}>Aucune donnée</Text>;
  const chartW = SCREEN_W - 80;
  const maxVal = Math.max(...data.map((d: any) => d[valueKey]), 1);
  const barW = Math.min(36, (chartW - 20) / data.length - 4);
  const ml = 50;
  return (
    <Svg width={chartW + ml} height={height + 26}>
      {[0, 0.5, 1].map((p, i) => (
        <G key={i}>
          <Line x1={ml} y1={height - p * height} x2={chartW + ml} y2={height - p * height} stroke={C.border} strokeWidth={0.5} />
          <SvgText x={ml - 4} y={height - p * height + 3} fill={C.textLight} fontSize={9} textAnchor="end">{Math.round(maxVal * p).toLocaleString()}</SvgText>
        </G>
      ))}
      {data.map((d: any, i: number) => {
        const barH = (d[valueKey] / maxVal) * (height - 8);
        const x = ml + 8 + i * ((chartW - 16) / data.length);
        return (
          <G key={i}>
            <Rect x={x} y={height - barH} width={barW} height={barH} rx={3} fill={color} opacity={0.85} />
            <SvgText x={x + barW / 2} y={height + 13} fill={C.textLight} fontSize={7} textAnchor="middle">{d[labelKey]?.toString().slice(-5) || ''}</SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

function DonutChart({ segments, size = 120, C }: any) {
  const total = segments.reduce((s: number, seg: any) => s + seg.value, 0) || 1;
  const r = (size - 20) / 2; const cx = size / 2; const cy = size / 2;
  let cum = -90;
  const arcs = segments.map((seg: any) => {
    const angle = (seg.value / total) * 360;
    const start = cum; cum += angle; const end = cum;
    const lg = angle > 180 ? 1 : 0;
    const rad = (a: number) => (a * Math.PI) / 180;
    return { ...seg, path: `M ${cx + r * Math.cos(rad(start))} ${cy + r * Math.sin(rad(start))} A ${r} ${r} 0 ${lg} 1 ${cx + r * Math.cos(rad(end))} ${cy + r * Math.sin(rad(end))}` };
  });
  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        {arcs.map((a: any, i: number) => <Path key={i} d={a.path} fill="none" stroke={a.color} strokeWidth={16} strokeLinecap="round" />)}
        <SvgText x={cx} y={cy + 5} fill={C.text} fontSize={14} fontWeight="bold" textAnchor="middle">{total}</SvgText>
      </Svg>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 8 }}>
        {segments.map((seg: any, i: number) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: seg.color }} />
            <Text style={{ color: C.textLight, fontSize: 10 }}>{seg.label}: {seg.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function SuperAdminStatistics() {
  const { colors: _t } = useThemeStore();
  const C = { bg: _t.bg, card: _t.card, text: _t.text, textLight: _t.textLight, border: _t.border, accent: '#f87171', gold: '#fbbf24', success: _t.success, info: _t.info, purple: _t.accent, error: _t.error };
  const [stats, setStats] = useState<AdvancedStats | null>(null);
  const [basicStats, setBasicStats] = useState<any>(null);
  const [agencies, setAgencies] = useState<any[]>([]);
  const [topClients, setTopClients] = useState<any[]>([]);
  const [agencyComparison, setAgencyComparison] = useState<any[]>([]);
  const [forecastData, setForecastData] = useState<any>(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchForecast = useCallback(async () => {
    setForecastLoading(true);
    try {
      const resp = await api.get('/api/admin/stats/revenue-forecast');
      setForecastData(resp.data);
    } catch (err) { console.error('Forecast error:', err); }
    finally { setForecastLoading(false); }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [advResp, basicResp, agResp, tcResp, acResp] = await Promise.all([
        api.get('/api/admin/stats/advanced'),
        api.get('/api/admin/stats'),
        api.get('/api/agencies'),
        api.get('/api/admin/stats/top-clients'),
        api.get('/api/admin/stats/agency-comparison'),
      ]);
      setStats(advResp.data);
      setBasicStats(basicResp.data);
      setAgencies(agResp.data || []);
      setTopClients(tcResp.data || []);
      setAgencyComparison(acResp.data || []);
      fetchForecast();
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [fetchForecast]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  if (loading) return <View style={[s.container, { backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={C.accent} /></View>;
  if (!stats) return <View style={[s.container, { backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' }]}><Text style={{ color: C.textLight }}>Erreur</Text></View>;

  const pmColors: Record<string, string> = { card: C.purple, cash: C.gold, twint: C.info };

  return (
    <ScrollView style={[s.container, { backgroundColor: C.bg }]} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}>
      <Text style={[s.title, { color: C.text }]}>Statistiques Globales</Text>
      <Text style={[s.subtitle, { color: C.textLight }]}>Vue d'ensemble de toutes les agences</Text>

      {/* KPIs */}
      <View style={s.kpiRow}>
        {[
          { icon: 'cash', label: 'Revenu (mois)', value: `CHF ${stats.revenue_this_month.toFixed(0)}`, color: C.success, trend: stats.revenue_change_pct },
          { icon: 'calendar', label: 'Réservations', value: `${stats.reservations_this_month}`, color: C.gold },
          { icon: 'time', label: 'Durée moy.', value: `${stats.avg_booking_duration}j`, color: C.info },
          { icon: 'wallet', label: 'Panier moy.', value: `CHF ${stats.avg_revenue_per_reservation.toFixed(0)}`, color: C.purple },
          { icon: 'business', label: 'Agences', value: `${agencies.length}`, color: C.accent },
          { icon: 'people', label: 'Nvx clients (30j)', value: `${stats.new_clients_30d}`, color: C.success },
        ].map((kpi, i) => (
          <View key={i} style={[s.kpiCard, { borderTopColor: kpi.color }]} data-testid={`sa-kpi-${i}`}>
            <Ionicons name={kpi.icon as any} size={20} color={kpi.color} />
            <Text style={s.kpiLabel}>{kpi.label}</Text>
            <Text style={s.kpiValue}>{kpi.value}</Text>
            {kpi.trend !== undefined && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Ionicons name={kpi.trend >= 0 ? 'trending-up' : 'trending-down'} size={12} color={kpi.trend >= 0 ? C.success : C.error} />
                <Text style={{ fontSize: 10, fontWeight: '700', color: kpi.trend >= 0 ? C.success : C.error }}>{Math.abs(kpi.trend)}%</Text>
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Daily Revenue Chart */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Revenu Journalier (30 derniers jours)</Text>
        <View style={s.chartCard}>
          <BarChart data={stats.daily_revenue} labelKey="date" valueKey="revenue" color={C.accent} C={C} />
        </View>
      </View>

      {/* Weekly Trends */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Tendances Hebdomadaires</Text>
        <View style={s.chartCard}>
          <BarChart data={stats.weekly_trends} labelKey="week" valueKey="revenue" color={C.info} height={120} C={C} />
        </View>
      </View>

      {/* Utilization */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Taux d'Utilisation des Véhicules</Text>
        <View style={s.chartCard}>
          {stats.vehicle_utilization.slice(0, 10).map((v, i) => (
            <View key={v.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: i < 9 ? 8 : 0 }}>
              <Text style={{ color: C.textLight, fontSize: 11, width: 100 }} numberOfLines={1}>{v.name}</Text>
              <View style={{ flex: 1, height: 18, backgroundColor: C.border + '60', borderRadius: 9, overflow: 'hidden' }}>
                <View style={{ width: `${Math.max(2, v.utilization)}%`, height: '100%', backgroundColor: v.utilization >= 70 ? C.success : v.utilization >= 40 ? C.gold : C.error, borderRadius: 9 }} />
              </View>
              <Text style={{ color: C.text, fontSize: 11, fontWeight: '700', width: 40, textAlign: 'right' }}>{v.utilization}%</Text>
            </View>
          ))}
          {stats.vehicle_utilization.length === 0 && <Text style={{ color: C.textLight, textAlign: 'center', padding: 20 }}>Aucune donnée</Text>}
        </View>
      </View>

      {/* Revenue per vehicle + Payment Methods + Cancellation */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={s.sectionTitle}>Top Revenus par Véhicule</Text>
          <View style={s.chartCard}>
            {stats.revenue_per_vehicle.slice(0, 5).map((v, i) => (
              <View key={v.id} style={[{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }, i > 0 && { borderTopWidth: 1, borderTopColor: C.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, fontSize: 12, fontWeight: '600' }} numberOfLines={1}>{v.name}</Text>
                  <Text style={{ color: C.textLight, fontSize: 10 }}>{v.bookings} locations</Text>
                </View>
                <Text style={{ color: C.gold, fontSize: 14, fontWeight: '800' }}>CHF {v.revenue.toFixed(0)}</Text>
              </View>
            ))}
            {stats.revenue_per_vehicle.length === 0 && <Text style={{ color: C.textLight, textAlign: 'center', padding: 16 }}>-</Text>}
          </View>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={s.sectionTitle}>Modes de Paiement</Text>
          <View style={s.chartCard}>
            <DonutChart segments={stats.payment_methods.map(pm => ({
              label: pm.method === 'cash' ? 'Espèces' : pm.method === 'card' ? 'Carte' : pm.method,
              value: pm.count,
              color: pmColors[pm.method] || C.textLight,
            }))} C={C} />
          </View>

          <View style={[s.chartCard, { marginTop: 12, alignItems: 'center', paddingVertical: 16 }]}>
            <Ionicons name="close-circle" size={22} color={C.error} />
            <Text style={{ color: C.text, fontSize: 24, fontWeight: '800', marginTop: 4 }}>{stats.cancellation_rate}%</Text>
            <Text style={{ color: C.textLight, fontSize: 11 }}>Taux d'annulation</Text>
          </View>
        </View>
      </View>

      {/* Revenue by month from basic stats */}
      {basicStats?.revenue_by_month?.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Revenu Mensuel (6 mois)</Text>
          <View style={s.chartCard}>
            <BarChart data={basicStats.revenue_by_month} labelKey="month" valueKey="revenue" color={C.success} height={130} C={C} />
          </View>
        </View>
      )}

      {/* Agency Comparison */}
      {agencyComparison.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Comparaison par Agence</Text>
          <View style={s.chartCard}>
            {agencyComparison.filter(a => a.revenue > 0 || a.bookings > 0 || a.vehicles > 0).map((a, i) => (
              <View key={a.id} style={[{ paddingVertical: 12 }, i > 0 && { borderTopWidth: 1, borderTopColor: C.border }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="business" size={16} color={C.purple} />
                    <Text style={{ color: C.text, fontSize: 14, fontWeight: '700' }}>{a.name}</Text>
                  </View>
                  <Text style={{ color: C.gold, fontSize: 16, fontWeight: '800' }}>CHF {a.revenue.toFixed(0)}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="calendar" size={12} color={C.textLight} />
                    <Text style={{ color: C.textLight, fontSize: 11 }}>{a.bookings} locations</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="car" size={12} color={C.textLight} />
                    <Text style={{ color: C.textLight, fontSize: 11 }}>{a.vehicles} vehicules</Text>
                  </View>
                </View>
                {/* Revenue bar */}
                <View style={{ marginTop: 6, height: 6, backgroundColor: C.border + '40', borderRadius: 3, overflow: 'hidden' }}>
                  <View style={{ width: `${Math.max(2, agencyComparison[0]?.revenue > 0 ? (a.revenue / agencyComparison[0].revenue * 100) : 0)}%`, height: '100%', backgroundColor: C.accent, borderRadius: 3 }} />
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Top Clients */}
      {topClients.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Top Clients</Text>
          <View style={s.chartCard}>
            {topClients.slice(0, 8).map((c, i) => {
              const rColors: Record<string, string> = { vip: '#8B5CF6', good: C.success, neutral: '#6B7280', bad: C.gold, blocked: C.error };
              return (
                <View key={c.id} style={[{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }, i > 0 && { borderTopWidth: 1, borderTopColor: C.border }]}>
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: (rColors[c.rating] || '#6B7280') + '25', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: rColors[c.rating] || '#6B7280' }}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.text, fontSize: 13, fontWeight: '600' }}>{c.name}</Text>
                    <Text style={{ color: C.textLight, fontSize: 10 }}>{c.email} - {c.bookings} loc.</Text>
                  </View>
                  <Text style={{ color: C.gold, fontSize: 14, fontWeight: '800' }}>CHF {c.total_spent.toFixed(0)}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* AI Revenue Forecast */}
      <View style={s.section} data-testid="sa-revenue-forecast">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Ionicons name="sparkles" size={18} color={C.purple} />
          <Text style={s.sectionTitle}>Prévisions de Revenus (IA)</Text>
        </View>
        <View style={[s.chartCard, { borderColor: C.purple + '40' }]}>
          {forecastLoading ? (
            <View style={{ alignItems: 'center', padding: 24 }}>
              <ActivityIndicator size="small" color={C.purple} />
              <Text style={{ color: C.textLight, fontSize: 11, marginTop: 8 }}>Analyse IA en cours...</Text>
            </View>
          ) : forecastData ? (
            <>
              {/* Combined chart: historical + forecast */}
              {(() => {
                const allData = [
                  ...(forecastData.historical || []).map((h: any) => ({ ...h, type: 'historical' })),
                  ...(forecastData.forecast || []).map((f: any) => ({ ...f, type: 'forecast' })),
                ];
                if (allData.length === 0) return <Text style={{ color: C.textLight, textAlign: 'center', padding: 20 }}>Aucune donnée</Text>;
                const chartW = SCREEN_W - 80;
                const chartH = 140;
                const maxVal = Math.max(...allData.map(d => d.revenue), 1);
                const barW = Math.min(40, (chartW - 60) / allData.length - 6);
                const ml = 55;
                return (
                  <Svg width={chartW + ml} height={chartH + 40}>
                    {[0, 0.5, 1].map((p, i) => (
                      <G key={i}>
                        <Line x1={ml} y1={chartH - p * chartH} x2={chartW + ml} y2={chartH - p * chartH} stroke={C.border} strokeWidth={0.5} />
                        <SvgText x={ml - 4} y={chartH - p * chartH + 3} fill={C.textLight} fontSize={9} textAnchor="end">CHF {Math.round(maxVal * p).toLocaleString()}</SvgText>
                      </G>
                    ))}
                    {allData.map((d: any, i: number) => {
                      const barH = (d.revenue / maxVal) * (chartH - 8);
                      const x = ml + 8 + i * ((chartW - 16) / allData.length);
                      const isForecast = d.type === 'forecast';
                      return (
                        <G key={i}>
                          <Rect x={x} y={chartH - barH} width={barW} height={barH} rx={3} fill={isForecast ? C.purple : C.accent} opacity={isForecast ? 0.6 : 0.85} />
                          {isForecast && <Rect x={x} y={chartH - barH} width={barW} height={barH} rx={3} fill="none" stroke={C.purple} strokeWidth={1.5} strokeDasharray="4,2" />}
                          <SvgText x={x + barW / 2} y={chartH + 13} fill={C.textLight} fontSize={7} textAnchor="middle">{d.month?.slice(-5)}</SvgText>
                          <SvgText x={x + barW / 2} y={chartH + 25} fill={isForecast ? C.purple : C.textLight} fontSize={7} textAnchor="middle" fontWeight={isForecast ? 'bold' : 'normal'}>{isForecast ? 'prev.' : ''}</SvgText>
                        </G>
                      );
                    })}
                  </Svg>
                );
              })()}

              {/* Legend */}
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 12, height: 8, borderRadius: 2, backgroundColor: C.accent }} />
                  <Text style={{ color: C.textLight, fontSize: 10 }}>Historique</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 12, height: 8, borderRadius: 2, backgroundColor: C.purple, opacity: 0.6 }} />
                  <Text style={{ color: C.textLight, fontSize: 10 }}>Prévision IA</Text>
                </View>
              </View>

              {/* Trend + Analysis */}
              <View style={{ marginTop: 12, padding: 12, borderRadius: 8, backgroundColor: C.purple + '10' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Ionicons name={forecastData.trend === 'up' ? 'trending-up' : forecastData.trend === 'down' ? 'trending-down' : 'remove'} size={16} color={forecastData.trend === 'up' ? C.success : forecastData.trend === 'down' ? C.error : C.gold} />
                  <Text style={{ color: C.text, fontSize: 13, fontWeight: '700' }}>
                    Tendance: {forecastData.trend === 'up' ? 'Hausse' : forecastData.trend === 'down' ? 'Baisse' : 'Stable'}
                  </Text>
                </View>
                <Text style={{ color: C.textLight, fontSize: 11, lineHeight: 16 }}>{forecastData.analysis}</Text>
              </View>

              {/* Forecast details */}
              {forecastData.forecast?.length > 0 && (
                <View style={{ marginTop: 10 }}>
                  {forecastData.forecast.map((f: any, i: number) => (
                    <View key={i} style={[{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, justifyContent: 'space-between' }, i > 0 && { borderTopWidth: 1, borderTopColor: C.border }]}>
                      <Text style={{ color: C.text, fontSize: 12, fontWeight: '600' }}>{f.month}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ color: C.textLight, fontSize: 10 }}>{f.bookings} rés.</Text>
                        <Text style={{ color: C.purple, fontSize: 13, fontWeight: '800' }}>CHF {f.revenue?.toLocaleString()}</Text>
                        {f.confidence && (
                          <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, backgroundColor: (f.confidence > 0.6 ? C.success : f.confidence > 0.4 ? C.gold : C.error) + '20' }}>
                            <Text style={{ fontSize: 9, fontWeight: '700', color: f.confidence > 0.6 ? C.success : f.confidence > 0.4 ? C.gold : C.error }}>{Math.round(f.confidence * 100)}%</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </>
          ) : (
            <Text style={{ color: C.textLight, textAlign: 'center', padding: 20 }}>Prévision non disponible</Text>
          )}
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 2, marginBottom: 20 },
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  kpiCard: { flex: 1, minWidth: 130, borderRadius: 12, padding: 14, borderTopWidth: 3, alignItems: 'center', gap: 4 },
  kpiLabel: { fontSize: 10 },
  kpiValue: { fontSize: 22, fontWeight: '800' },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  chartCard: { borderRadius: 12, padding: 14, borderWidth: 1 },
});
