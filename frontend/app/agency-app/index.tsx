import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-qr-code';
import api from '../../src/api/axios';
import { useAuthStore } from '../../src/store/authStore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const C = { bg: '#0B0F1A', card: '#141926', primary: '#6C2BD9', accent: '#A78BFA', text: '#fff', textLight: '#8B95A8', border: '#1E2536', success: '#10B981', warning: '#F59E0B', error: '#EF4444', info: '#06b6d4' };

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function AgencyAppHome() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [recentReservations, setRecentReservations] = useState<any[]>([]);
  const [agency, setAgency] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [statsResp, resResp, agenciesResp] = await Promise.all([
        api.get('/api/admin/stats'),
        api.get('/api/admin/reservations?limit=5'),
        api.get('/api/agencies'),
      ]);
      setStats(statsResp.data);
      setRecentReservations(resResp.data.reservations || []);
      const agencies = agenciesResp.data;
      if (agencies?.length > 0) setAgency(agencies[0]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  const statusColor = (s: string) => {
    switch (s) {
      case 'confirmed': case 'active': return C.success;
      case 'pending': case 'pending_cash': return C.warning;
      case 'cancelled': return C.error;
      default: return C.textLight;
    }
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case 'pending': return 'En attente';
      case 'pending_cash': return 'Espèces';
      case 'confirmed': return 'Confirmée';
      case 'active': return 'Active';
      case 'completed': return 'Terminée';
      case 'cancelled': return 'Annulée';
      default: return s;
    }
  };

  if (loading) return <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={C.accent} /></View>;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}>
      {/* Quick Actions */}
      <TouchableOpacity style={s.bookBtn} onPress={() => router.push('/agency-app/book')} data-testid="quick-book-btn">
        <Ionicons name="add-circle" size={24} color="#fff" />
        <Text style={s.bookBtnText}>Nouvelle réservation</Text>
        <Text style={s.bookBtnSub}>Réserver pour un client par téléphone</Text>
      </TouchableOpacity>

      {/* Stats */}
      <View style={s.statsRow}>
        <View style={s.statCard}>
          <Ionicons name="car" size={22} color={C.info} />
          <Text style={s.statNum}>{stats?.total_vehicles || 0}</Text>
          <Text style={s.statLabel}>Véhicules</Text>
        </View>
        <View style={s.statCard}>
          <Ionicons name="calendar" size={22} color={C.warning} />
          <Text style={s.statNum}>{stats?.total_reservations || 0}</Text>
          <Text style={s.statLabel}>Réservations</Text>
        </View>
        <View style={s.statCard}>
          <Ionicons name="people" size={22} color={C.success} />
          <Text style={s.statNum}>{stats?.total_users || 0}</Text>
          <Text style={s.statLabel}>Clients</Text>
        </View>
        <View style={s.statCard}>
          <Ionicons name="cash" size={22} color={C.accent} />
          <Text style={s.statNum}>{stats?.total_revenue ? `${stats.total_revenue.toFixed(0)}` : '0'}</Text>
          <Text style={s.statLabel}>CHF Rev.</Text>
        </View>
      </View>

      {/* Recent Reservations */}
      <Text style={s.sectionTitle}>Dernières réservations</Text>
      {recentReservations.length === 0 ? (
        <View style={s.emptyCard}><Text style={s.emptyText}>Aucune réservation récente</Text></View>
      ) : (
        recentReservations.map((r) => (
          <View key={r.id} style={s.resCard} data-testid={`recent-res-${r.id}`}>
            <View style={s.resHeader}>
              <Text style={s.resClient}>{r.user_name}</Text>
              <View style={[s.statusBadge, { backgroundColor: statusColor(r.status) + '20' }]}>
                <Text style={[s.statusText, { color: statusColor(r.status) }]}>{statusLabel(r.status)}</Text>
              </View>
            </View>
            <Text style={s.resVehicle}>{r.vehicle_name}</Text>
            <View style={s.resFooter}>
              <Text style={s.resDate}>
                {r.start_date ? format(new Date(r.start_date), 'dd MMM', { locale: fr }) : ''} - {r.end_date ? format(new Date(r.end_date), 'dd MMM yyyy', { locale: fr }) : ''}
              </Text>
              <Text style={s.resPrice}>CHF {r.total_price?.toFixed(2)}</Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingBottom: 32 },
  bookBtn: { backgroundColor: C.primary, borderRadius: 14, padding: 20, marginBottom: 20, alignItems: 'center', gap: 6 },
  bookBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  bookBtnSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: C.card, borderRadius: 12, padding: 14, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: C.border },
  statNum: { color: C.text, fontSize: 22, fontWeight: '800' },
  statLabel: { color: C.textLight, fontSize: 11 },
  sectionTitle: { color: C.text, fontSize: 17, fontWeight: '700', marginBottom: 12 },
  emptyCard: { backgroundColor: C.card, borderRadius: 12, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  emptyText: { color: C.textLight, fontSize: 14 },
  resCard: { backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  resHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  resClient: { color: C.text, fontSize: 15, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '700' },
  resVehicle: { color: C.textLight, fontSize: 13, marginBottom: 6 },
  resFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resDate: { color: C.textLight, fontSize: 12 },
  resPrice: { color: C.accent, fontSize: 14, fontWeight: '700' },
});
