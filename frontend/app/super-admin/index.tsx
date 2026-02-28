import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api/axios';
import { useThemeStore } from '../../src/store/themeStore';

const _C = { bg: '#0a0a12', card: '#14141f', text: '#fff', textLight: '#9ca3af', border: '#1f1f2e', accent: '#f87171', gold: '#fbbf24', success: '#22c55e', info: '#06b6d4', purple: '#a78bfa' };

interface AgencyStats {
  id: string;
  name: string;
  slug?: string;
  vehicle_count: number;
  reservation_count: number;
  admin_count: number;
  navixy_api_url?: string;
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const { colors: _t } = useThemeStore();
  const C = { bg: _t.bg, card: _t.card, text: _t.text, textLight: _t.textLight, border: _t.border, accent: '#f87171', gold: '#fbbf24', success: _t.success, info: _t.info, purple: _t.accent };
  const [agencies, setAgencies] = useState<AgencyStats[]>([]);
  const [globalStats, setGlobalStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [agenciesResp, statsResp] = await Promise.all([
        api.get('/api/agencies'),
        api.get('/api/admin/stats'),
      ]);
      setAgencies(agenciesResp.data);
      setGlobalStats(statsResp.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  const totalVehicles = agencies.reduce((s, a) => s + (a.vehicle_count || 0), 0);
  const totalReservations = agencies.reduce((s, a) => s + (a.reservation_count || 0), 0);
  const totalAdmins = agencies.reduce((s, a) => s + (a.admin_count || 0), 0);

  if (loading) return <View style={[s.container, { backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={C.accent} /></View>;

  return (
    <ScrollView style={[s.container, { backgroundColor: C.bg }]} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}>
      <Text style={[s.title, { color: C.text }]}>Vue Globale</Text>
      <Text style={[s.subtitle, { color: C.textLight }]}>{agencies.length} agences actives</Text>

      {/* Global Stats */}
      <View style={s.statsRow}>
        <View style={[s.statCard, { borderTopColor: C.accent }]}>
          <Ionicons name="business" size={24} color={C.accent} />
          <Text style={s.statNum}>{agencies.length}</Text>
          <Text style={s.statLabel}>Agences</Text>
        </View>
        <View style={[s.statCard, { borderTopColor: C.info }]}>
          <Ionicons name="car" size={24} color={C.info} />
          <Text style={s.statNum}>{totalVehicles}</Text>
          <Text style={s.statLabel}>Véhicules</Text>
        </View>
        <View style={[s.statCard, { borderTopColor: C.gold }]}>
          <Ionicons name="calendar" size={24} color={C.gold} />
          <Text style={s.statNum}>{totalReservations}</Text>
          <Text style={s.statLabel}>Réservations</Text>
        </View>
        <View style={[s.statCard, { borderTopColor: C.success }]}>
          <Ionicons name="people" size={24} color={C.success} />
          <Text style={s.statNum}>{globalStats?.total_users || 0}</Text>
          <Text style={s.statLabel}>Utilisateurs</Text>
        </View>
      </View>

      {/* Per-Agency Breakdown */}
      <Text style={s.sectionTitle}>Statistiques par Agence</Text>
      {agencies.map((agency) => (
        <View key={agency.id} style={s.agencyCard} data-testid={`sa-agency-${agency.id}`}>
          <View style={s.agencyHeader}>
            <View style={s.agencyNameRow}>
              <Ionicons name="business" size={18} color={C.purple} />
              <Text style={s.agencyName}>{agency.name}</Text>
            </View>
            {agency.navixy_api_url && (
              <View style={s.gpsBadge}><Ionicons name="locate" size={12} color={C.info} /><Text style={s.gpsText}>GPS</Text></View>
            )}
          </View>
          <View style={s.agencyStats}>
            <View style={s.agencyStat}>
              <Text style={s.agencyStatNum}>{agency.vehicle_count}</Text>
              <Text style={s.agencyStatLabel}>Véhicules</Text>
            </View>
            <View style={s.agencyStat}>
              <Text style={s.agencyStatNum}>{agency.reservation_count}</Text>
              <Text style={s.agencyStatLabel}>Réservations</Text>
            </View>
            <View style={s.agencyStat}>
              <Text style={s.agencyStatNum}>{agency.admin_count}</Text>
              <Text style={s.agencyStatLabel}>Admins</Text>
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '800' },
  subtitle: { fontSize: 14, marginTop: 4, marginBottom: 20 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  statCard: { flex: 1, minWidth: 140, borderRadius: 12, padding: 16, borderTopWidth: 3, alignItems: 'center', gap: 6 },
  statNum: { fontSize: 28, fontWeight: '800' },
  statLabel: { fontSize: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 14 },
  agencyCard: { borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1 },
  agencyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  agencyNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  agencyName: { fontSize: 16, fontWeight: '700' },
  gpsBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(6,182,212,0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  gpsText: { color: _C.info, fontSize: 11, fontWeight: '600' },
  agencyStats: { flexDirection: 'row', gap: 20 },
  agencyStat: { alignItems: 'center' },
  agencyStatNum: { fontSize: 22, fontWeight: '700' },
  agencyStatLabel: { fontSize: 11, marginTop: 2 },
});
