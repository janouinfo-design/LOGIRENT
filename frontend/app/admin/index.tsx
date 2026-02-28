import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Dimensions, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api/axios';
import { useThemeStore } from '../../src/store/themeStore';

const { width } = Dimensions.get('window');

interface Stats {
  total_vehicles: number;
  total_users: number;
  total_reservations: number;
  total_payments: number;
  total_revenue: number;
  reservations_by_status: Record<string, number>;
  top_vehicles: Array<{ id: string; name: string; rental_count: number }>;
  revenue_by_month: Array<{ month: string; revenue: number; reservations: number }>;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { colors: C } = useThemeStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/api/admin/stats');
      setStats(response.data);
    } catch (error: any) {
      console.error('Error fetching stats:', error.response?.data || error.message);
      if (error.response?.status === 401) {
        Alert.alert('Session expirée', 'Veuillez vous reconnecter');
        router.replace('/(auth)/login');
      }
    } finally { setLoading(false); }
  };

  const onRefresh = async () => { setRefreshing(true); await fetchStats(); setRefreshing(false); };

  const menuItems = [
    { icon: 'car', label: 'Véhicules', count: stats?.total_vehicles || 0, route: '/admin/vehicles', color: C.accent },
    { icon: 'calendar', label: 'Réservations', count: stats?.total_reservations || 0, route: '/admin/reservations', color: C.warning },
    { icon: 'people', label: 'Utilisateurs', count: stats?.total_users || 0, route: '/admin/users', color: C.success },
    { icon: 'card', label: 'Paiements', count: stats?.total_payments || 0, route: '/admin/payments', color: C.info },
    { icon: 'locate', label: 'Suivi GPS', count: 0, route: '/admin/tracking', color: '#06b6d4' },
  ];

  if (loading) return <View style={[s.container, { backgroundColor: C.bg }]}><View style={s.center}><Text style={{ color: C.textLight }}>Chargement...</Text></View></View>;

  return (
    <ScrollView style={[s.container, { backgroundColor: C.bg }]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}>
      {/* Revenue Card */}
      <View style={[s.revenueCard, { backgroundColor: C.accent }]}>
        <View style={s.revenueHeader}>
          <Text style={s.revenueLabel}>Chiffre d'Affaires Total</Text>
          <Ionicons name="trending-up" size={24} color="#FFFFFF" />
        </View>
        <Text style={s.revenueAmount}>CHF {(stats?.total_revenue || 0).toFixed(2)}</Text>
        <Text style={s.revenueSub}>{stats?.total_reservations || 0} réservations au total</Text>
      </View>

      {/* Quick Stats Grid */}
      <View style={s.statsGrid}>
        {menuItems.map((item) => (
          <TouchableOpacity key={item.label} style={[s.statCard, { backgroundColor: C.card, borderColor: C.border }]} onPress={() => router.push(item.route as any)}>
            <View style={[s.statIcon, { backgroundColor: item.color + '20' }]}>
              <Ionicons name={item.icon as any} size={24} color={item.color} />
            </View>
            <Text style={[s.statCount, { color: C.text }]}>{item.count}</Text>
            <Text style={[s.statLabel, { color: C.textLight }]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Reservations by Status */}
      <View style={s.section}>
        <Text style={[s.sectionTitle, { color: C.text }]}>Réservations par Statut</Text>
        <View style={[s.card, { backgroundColor: C.card, borderColor: C.border }]}>
          {Object.entries(stats?.reservations_by_status || {}).map(([status, count]) => (
            <View key={status} style={s.statusItem}>
              <View style={[s.statusDot, { backgroundColor: status === 'confirmed' ? C.success : status === 'pending' ? C.warning : status === 'cancelled' ? C.error : C.textLight }]} />
              <Text style={[s.statusName, { color: C.text }]}>{status}</Text>
              <Text style={[s.statusCount, { color: C.text }]}>{count}</Text>
            </View>
          ))}
          {Object.keys(stats?.reservations_by_status || {}).length === 0 && <Text style={{ color: C.textLight, textAlign: 'center', padding: 20 }}>Aucune réservation</Text>}
        </View>
      </View>

      {/* Top Vehicles */}
      <View style={s.section}>
        <Text style={[s.sectionTitle, { color: C.text }]}>Véhicules les Plus Loués</Text>
        <View style={[s.card, { backgroundColor: C.card, borderColor: C.border }]}>
          {(stats?.top_vehicles || []).map((vehicle, index) => (
            <View key={vehicle.id} style={[s.topVehicleItem, index > 0 && { borderTopWidth: 1, borderTopColor: C.border }]}>
              <View style={[s.topVehicleRank, { backgroundColor: C.accent + '20' }]}>
                <Text style={[s.rankText, { color: C.accent }]}>#{index + 1}</Text>
              </View>
              <Text style={[{ flex: 1, fontSize: 14, color: C.text }]}>{vehicle.name}</Text>
              <Text style={{ fontSize: 13, color: C.textLight }}>{vehicle.rental_count} locations</Text>
            </View>
          ))}
          {(stats?.top_vehicles || []).length === 0 && <Text style={{ color: C.textLight, textAlign: 'center', padding: 20 }}>Aucune donnée</Text>}
        </View>
      </View>

      {/* Quick Actions */}
      <View style={s.section}>
        <Text style={[s.sectionTitle, { color: C.text }]}>Actions Rapides</Text>
        <View style={s.actionsRow}>
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.card, borderColor: C.border }]} onPress={() => router.push('/admin/vehicles')}>
            <Ionicons name="add-circle" size={20} color={C.accent} />
            <Text style={{ fontSize: 14, fontWeight: '600', color: C.accent }}>Ajouter Véhicule</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.card, borderColor: C.border }]} onPress={() => router.push('/admin/reservations')}>
            <Ionicons name="eye" size={20} color={C.accent} />
            <Text style={{ fontSize: 14, fontWeight: '600', color: C.accent }}>Voir Tout</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  revenueCard: { margin: 16, padding: 24, borderRadius: 16 },
  revenueHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  revenueLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  revenueAmount: { fontSize: 36, fontWeight: '700', color: '#FFFFFF', marginTop: 8 },
  revenueSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 12 },
  statCard: { width: (width - 56) / 2, padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  statIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statCount: { fontSize: 28, fontWeight: '700' },
  statLabel: { fontSize: 13, marginTop: 4 },
  section: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  card: { borderRadius: 12, padding: 16, borderWidth: 1 },
  statusItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  statusName: { flex: 1, fontSize: 14, textTransform: 'capitalize' },
  statusCount: { fontSize: 16, fontWeight: '600' },
  topVehicleItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  topVehicleRank: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  rankText: { fontSize: 12, fontWeight: '700' },
  actionsRow: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, gap: 8, borderWidth: 1 },
});
