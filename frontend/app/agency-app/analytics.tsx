import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Dimensions, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../src/store/themeStore';
import api from '../../src/api/axios';

const { width: SCREEN_W } = Dimensions.get('window');
const isWide = SCREEN_W > 900;

export default function AnalyticsPage() {
  const { colors: C } = useThemeStore();
  const [adv, setAdv] = useState<any>(null);
  const [tiers, setTiers] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [advResp, tierResp] = await Promise.all([
        api.get('/api/admin/stats/advanced'),
        api.get('/api/admin/stats/tier-analytics').catch(() => ({ data: { tier_stats: [], with_tier: 0, without_tier: 0 } })),
      ]);
      setAdv(advResp.data);
      setTiers(tierResp.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);
  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={C.accent} /></View>;

  const fmtCHF = (v: number) => `CHF ${(v || 0).toLocaleString('fr-CH', { minimumFractionDigits: 0 })}`;
  const pctChange = adv?.revenue_change_pct || 0;
  const pctColor = pctChange >= 0 ? '#10B981' : '#EF4444';
  const pctIcon = pctChange >= 0 ? 'trending-up' : 'trending-down';

  return (
    <ScrollView style={[s.page, { backgroundColor: C.bg }]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} data-testid="analytics-page">
      <Text style={[s.pageTitle, { color: C.text }]}>Tableau de bord analytique</Text>

      {/* KPI Cards */}
      <View style={s.kpiRow} data-testid="kpi-row">
        <KpiCard icon="cash-outline" label="Revenu ce mois" value={fmtCHF(adv?.revenue_this_month)} sub={`${pctChange > 0 ? '+' : ''}${pctChange}% vs mois dernier`} subColor={pctColor} subIcon={pctIcon} C={C} />
        <KpiCard icon="calendar-outline" label="Reservations" value={String(adv?.reservations_this_month || 0)} sub={`${adv?.reservations_last_month || 0} mois dernier`} C={C} />
        <KpiCard icon="time-outline" label="Duree moyenne" value={`${adv?.avg_booking_duration || 0} jours`} C={C} />
        <KpiCard icon="receipt-outline" label="Revenu moyen" value={fmtCHF(adv?.avg_revenue_per_reservation)} C={C} />
      </View>

      {/* Revenue per vehicle + Occupancy */}
      <View style={s.chartsRow}>
        <View style={[s.chartCard, { backgroundColor: C.card, borderColor: C.border }]} data-testid="revenue-per-vehicle">
          <Text style={[s.chartTitle, { color: C.text }]}>Revenu par vehicule</Text>
          {(adv?.revenue_per_vehicle || []).map((v: any, i: number) => (
            <View key={v.id} style={s.barRow}>
              <Text style={[s.barLabel, { color: C.text }]} numberOfLines={1}>{i + 1}. {v.name}</Text>
              <View style={s.barTrack}>
                <View style={[s.barFill, { width: `${Math.min(100, (v.revenue / Math.max(...(adv?.revenue_per_vehicle || []).map((x: any) => x.revenue), 1)) * 100)}%`, backgroundColor: '#7C3AED' }]} />
              </View>
              <Text style={[s.barValue, { color: C.text }]}>{fmtCHF(v.revenue)}</Text>
              <Text style={[s.barSub, { color: C.textLight }]}>{v.bookings} loc.</Text>
            </View>
          ))}
          {(!adv?.revenue_per_vehicle?.length) && <Text style={{ color: C.textLight, fontSize: 12 }}>Aucune donnee</Text>}
        </View>

        <View style={[s.chartCard, { backgroundColor: C.card, borderColor: C.border }]} data-testid="occupancy-chart">
          <Text style={[s.chartTitle, { color: C.text }]}>Taux d'occupation (30j)</Text>
          {(adv?.vehicle_utilization || []).map((v: any) => {
            const color = v.utilization > 70 ? '#10B981' : v.utilization > 40 ? '#F59E0B' : '#EF4444';
            return (
              <View key={v.id} style={s.barRow}>
                <Text style={[s.barLabel, { color: C.text }]} numberOfLines={1}>{v.name}</Text>
                <View style={s.barTrack}>
                  <View style={[s.barFill, { width: `${v.utilization}%`, backgroundColor: color }]} />
                </View>
                <Text style={[s.barValue, { color }]}>{v.utilization}%</Text>
                <Text style={[s.barSub, { color: C.textLight }]}>{v.booked_days}j</Text>
              </View>
            );
          })}
          {(!adv?.vehicle_utilization?.length) && <Text style={{ color: C.textLight, fontSize: 12 }}>Aucune donnee</Text>}
        </View>
      </View>

      {/* Tier analytics + Payment methods */}
      <View style={s.chartsRow}>
        <View style={[s.chartCard, { backgroundColor: C.card, borderColor: C.border }]} data-testid="tier-analytics">
          <Text style={[s.chartTitle, { color: C.text }]}>Forfaits les plus populaires</Text>
          <View style={s.tierSummary}>
            <View style={[s.tierBadge, { backgroundColor: '#EFF6FF' }]}><Text style={{ color: '#2563EB', fontSize: 11, fontWeight: '700' }}>{tiers?.with_tier || 0} avec forfait</Text></View>
            <View style={[s.tierBadge, { backgroundColor: '#F3F4F6' }]}><Text style={{ color: '#6B7280', fontSize: 11, fontWeight: '700' }}>{tiers?.without_tier || 0} sans forfait</Text></View>
          </View>
          {(tiers?.tier_stats || []).map((t: any, i: number) => (
            <View key={i} style={[s.tierRow, { borderColor: C.border }]}>
              <View style={s.tierRank}><Text style={s.tierRankText}>{i + 1}</Text></View>
              <View style={s.tierInfo}>
                <Text style={[s.tierName, { color: C.text }]}>{t.name}</Text>
                <Text style={{ color: C.textLight, fontSize: 10 }}>{t.bookings} reservations</Text>
              </View>
              <View style={s.tierRevenue}>
                <Text style={{ color: '#10B981', fontSize: 13, fontWeight: '700' }}>{fmtCHF(t.revenue)}</Text>
                <Text style={{ color: C.textLight, fontSize: 9 }}>moy. {fmtCHF(t.avg_price)}</Text>
              </View>
            </View>
          ))}
          {(!tiers?.tier_stats?.length) && <Text style={{ color: C.textLight, fontSize: 12, marginTop: 8 }}>Aucune reservation avec forfait</Text>}
        </View>

        <View style={[s.chartCard, { backgroundColor: C.card, borderColor: C.border }]} data-testid="payment-methods">
          <Text style={[s.chartTitle, { color: C.text }]}>Methodes de paiement</Text>
          {(adv?.payment_methods || []).map((pm: any) => {
            const pmLabels: Record<string, string> = { card: 'Carte', cash: 'Especes', bank_transfer: 'Virement', stripe: 'Stripe' };
            const pmIcons: Record<string, string> = { card: 'card-outline', cash: 'cash-outline', bank_transfer: 'swap-horizontal-outline', stripe: 'logo-usd' };
            return (
              <View key={pm.method} style={[s.pmRow, { borderColor: C.border }]}>
                <Ionicons name={(pmIcons[pm.method] || 'cash-outline') as any} size={18} color={C.accent} />
                <Text style={[s.pmLabel, { color: C.text }]}>{pmLabels[pm.method] || pm.method}</Text>
                <Text style={[s.pmCount, { color: C.textLight }]}>{pm.count} transactions</Text>
                <Text style={[s.pmTotal, { color: '#10B981' }]}>{fmtCHF(pm.total)}</Text>
              </View>
            );
          })}
          <View style={[s.pmRow, { borderColor: C.border, marginTop: 8 }]}>
            <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
            <Text style={[s.pmLabel, { color: C.text }]}>Taux d'annulation</Text>
            <Text style={{ color: '#EF4444', fontSize: 14, fontWeight: '700' }}>{adv?.cancellation_rate || 0}%</Text>
          </View>
        </View>
      </View>

      {/* Weekly trends */}
      <View style={[s.chartCard, { backgroundColor: C.card, borderColor: C.border, marginHorizontal: 16, marginBottom: 40 }]} data-testid="weekly-trends">
        <Text style={[s.chartTitle, { color: C.text }]}>Tendances hebdomadaires (8 semaines)</Text>
        <View style={s.weekGrid}>
          {(adv?.weekly_trends || []).map((w: any, i: number) => (
            <View key={i} style={s.weekCol}>
              <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '700' }}>{fmtCHF(w.revenue)}</Text>
              <View style={[s.weekBar, { height: Math.max(8, (w.revenue / Math.max(...(adv?.weekly_trends || []).map((x: any) => x.revenue), 1)) * 60), backgroundColor: '#7C3AED' }]} />
              <Text style={{ color: C.textLight, fontSize: 9 }}>S{w.week}</Text>
              <Text style={{ color: C.text, fontSize: 10, fontWeight: '600' }}>{w.bookings}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function KpiCard({ icon, label, value, sub, subColor, subIcon, C }: any) {
  return (
    <View style={[s.kpiCard, { backgroundColor: C.card, borderColor: C.border }]}>
      <Ionicons name={icon} size={20} color={C.accent} />
      <Text style={[s.kpiLabel, { color: C.textLight }]}>{label}</Text>
      <Text style={[s.kpiValue, { color: C.text }]}>{value}</Text>
      {sub && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
          {subIcon && <Ionicons name={subIcon} size={12} color={subColor || C.textLight} />}
          <Text style={{ color: subColor || C.textLight, fontSize: 10 }}>{sub}</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, paddingTop: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pageTitle: { fontSize: 22, fontWeight: '800', paddingHorizontal: 16, marginBottom: 16 },
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16, marginBottom: 16 },
  kpiCard: { flex: 1, minWidth: isWide ? 200 : 150, padding: 14, borderRadius: 12, borderWidth: 1, gap: 4 },
  kpiLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  kpiValue: { fontSize: 20, fontWeight: '800' },
  chartsRow: { flexDirection: isWide ? 'row' : 'column', gap: 12, paddingHorizontal: 16, marginBottom: 16 },
  chartCard: { flex: 1, padding: 16, borderRadius: 12, borderWidth: 1 },
  chartTitle: { fontSize: 14, fontWeight: '700', marginBottom: 12 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  barLabel: { width: isWide ? 140 : 100, fontSize: 11, fontWeight: '500' },
  barTrack: { flex: 1, height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  barValue: { fontSize: 11, fontWeight: '700', width: 70, textAlign: 'right' },
  barSub: { fontSize: 9, width: 35, textAlign: 'right' },
  tierSummary: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  tierBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1 },
  tierRank: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#7C3AED', justifyContent: 'center', alignItems: 'center' },
  tierRankText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  tierInfo: { flex: 1 },
  tierName: { fontSize: 13, fontWeight: '600' },
  tierRevenue: { alignItems: 'flex-end' },
  pmRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1 },
  pmLabel: { flex: 1, fontSize: 13, fontWeight: '500' },
  pmCount: { fontSize: 11 },
  pmTotal: { fontSize: 13, fontWeight: '700', width: 80, textAlign: 'right' },
  weekGrid: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', gap: 8, minHeight: 100, paddingTop: 10 },
  weekCol: { alignItems: 'center', gap: 4 },
  weekBar: { width: 24, borderRadius: 4 },
});
