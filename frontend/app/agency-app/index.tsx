import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../src/api/axios';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeStore } from '../../src/store/themeStore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function AgencyAppHome() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { colors: C } = useThemeStore();
  const [stats, setStats] = useState<any>(null);
  const [recentReservations, setRecentReservations] = useState<any[]>([]);
  const [agency, setAgency] = useState<any>(null);
  const [docAlerts, setDocAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [statsResp, resResp, agenciesResp, alertsResp] = await Promise.all([
        api.get('/api/admin/stats'),
        api.get('/api/admin/reservations?limit=5'),
        api.get('/api/agencies'),
        api.get('/api/admin/vehicles/document-alerts?days=30').catch(() => ({ data: { alerts: [] } })),
      ]);
      setStats(statsResp.data);
      setRecentReservations(resResp.data.reservations || []);
      const agencies = agenciesResp.data;
      if (agencies?.length > 0) setAgency(agencies[0]);
      setDocAlerts(alertsResp.data.alerts || []);
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

  if (loading) return <View style={[s.container, { backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={C.accent} /></View>;

  return (
    <ScrollView style={[s.container, { backgroundColor: C.bg }]} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}>
      <TouchableOpacity activeOpacity={0.85} onPress={() => router.push('/agency-app/book')} data-testid="quick-book-btn" style={{ marginBottom: 20 }}>
        <LinearGradient colors={['#6366f1', '#8b5cf6', '#a855f7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.5 }} style={s.bookBtn}>
          <View style={s.bookIconWrap}>
            <Ionicons name="add" size={26} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.bookBtnText}>Nouvelle réservation</Text>
            <Text style={s.bookBtnSub}>Réserver rapidement pour un client</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.7)" />
        </LinearGradient>
      </TouchableOpacity>

      <View style={s.statsRow}>
        <TouchableOpacity style={[s.statCard, { backgroundColor: C.card, borderColor: C.border }]} onPress={() => router.push('/agency-app/vehicles')} testID="stat-vehicles">
          <Ionicons name="car" size={32} color={C.info} />
          <Text style={[s.statNum, { color: C.text }]}>{stats?.total_vehicles || 0}</Text>
          <Text style={[s.statLabel, { color: C.textLight }]}>Véhicules</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.statCard, { backgroundColor: C.card, borderColor: C.border }]} onPress={() => router.push('/agency-app/reservations')} testID="stat-reservations">
          <Ionicons name="calendar" size={32} color={C.warning} />
          <Text style={[s.statNum, { color: C.text }]}>{stats?.total_reservations || 0}</Text>
          <Text style={[s.statLabel, { color: C.textLight }]}>Réservations</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.statCard, { backgroundColor: C.card, borderColor: C.border }]} onPress={() => router.push('/agency-app/clients')} testID="stat-clients">
          <Ionicons name="people" size={32} color={C.success} />
          <Text style={[s.statNum, { color: C.text }]}>{stats?.total_users || 0}</Text>
          <Text style={[s.statLabel, { color: C.textLight }]}>Clients</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.statCard, { backgroundColor: C.card, borderColor: C.border }]} onPress={() => router.push('/agency-app/statistics')} testID="stat-revenue">
          <Ionicons name="cash" size={32} color={C.accent} />
          <Text style={[s.statNum, { color: C.text }]}>{stats?.total_revenue ? `${stats.total_revenue.toFixed(0)}` : '0'}</Text>
          <Text style={[s.statLabel, { color: C.textLight }]}>CHF Rev.</Text>
        </TouchableOpacity>
      </View>

      {/* Document Expiry Alerts */}
      {docAlerts.length > 0 && (
        <View style={{ marginBottom: 20 }} data-testid="doc-alerts-section">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Ionicons name="alert-circle" size={18} color="#EF4444" />
            <Text style={[s.sectionTitle, { color: C.text, marginBottom: 0 }]}>Alertes documents ({docAlerts.length})</Text>
          </View>
          {docAlerts.slice(0, 5).map((alert: any, i: number) => (
            <TouchableOpacity
              key={`${alert.vehicle_id}-${alert.doc_id}`}
              style={[s.resCard, { backgroundColor: C.card, borderColor: alert.severity === 'expired' ? '#EF444440' : '#F59E0B40', borderLeftWidth: 4, borderLeftColor: alert.severity === 'expired' ? '#EF4444' : '#F59E0B' }]}
              onPress={() => router.push('/agency-app/vehicles')}
              data-testid={`doc-alert-${i}`}
            >
              <View style={s.resHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name={alert.severity === 'expired' ? 'alert-circle' : 'warning'} size={16} color={alert.severity === 'expired' ? '#EF4444' : '#F59E0B'} />
                  <Text style={[s.resClient, { color: C.text, fontSize: 13 }]}>{alert.vehicle_name}</Text>
                  {alert.plate_number ? <Text style={{ color: C.textLight, fontSize: 10 }}>({alert.plate_number})</Text> : null}
                </View>
                <View style={[s.statusBadge, { backgroundColor: (alert.severity === 'expired' ? '#EF4444' : '#F59E0B') + '20' }]}>
                  <Text style={[s.statusText, { color: alert.severity === 'expired' ? '#EF4444' : '#F59E0B' }]}>
                    {alert.severity === 'expired' ? 'Expire' : 'Bientot'}
                  </Text>
                </View>
              </View>
              <Text style={{ color: C.textLight, fontSize: 12 }}>
                {alert.doc_type_label} - Expiration: {alert.expiry_date?.slice(0, 10)}
              </Text>
            </TouchableOpacity>
          ))}
          {docAlerts.length > 5 && (
            <TouchableOpacity onPress={() => router.push('/agency-app/vehicles')} style={{ alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ color: C.accent, fontSize: 12, fontWeight: '600' }}>Voir tous ({docAlerts.length})</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <Text style={[s.sectionTitle, { color: C.text }]}>Dernieres reservations</Text>
      {recentReservations.length === 0 ? (
        <View style={[s.emptyCard, { backgroundColor: C.card, borderColor: C.border }]}><Text style={{ color: C.textLight, fontSize: 14 }}>Aucune réservation récente</Text></View>
      ) : (
        recentReservations.map((r) => (
          <View key={r.id} style={[s.resCard, { backgroundColor: C.card, borderColor: C.border }]} data-testid={`recent-res-${r.id}`}>
            <View style={s.resHeader}>
              <Text style={[s.resClient, { color: C.text }]}>{r.user_name}</Text>
              <View style={[s.statusBadge, { backgroundColor: statusColor(r.status) + '20' }]}>
                <Text style={[s.statusText, { color: statusColor(r.status) }]}>{statusLabel(r.status)}</Text>
              </View>
            </View>
            <Text style={{ color: C.textLight, fontSize: 13, marginBottom: 6 }}>{r.vehicle_name}</Text>
            <View style={s.resFooter}>
              <Text style={{ color: C.textLight, fontSize: 12 }}>
                {r.start_date ? format(new Date(r.start_date), 'dd MMM', { locale: fr }) : ''} - {r.end_date ? format(new Date(r.end_date), 'dd MMM yyyy', { locale: fr }) : ''}
              </Text>
              <Text style={{ color: C.accent, fontSize: 14, fontWeight: '700' }}>CHF {r.total_price?.toFixed(2)}</Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  bookBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 18, gap: 14 },
  bookIconWrap: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)' },
  bookBtnText: { fontSize: 17, fontWeight: '800', color: '#fff' },
  bookBtnSub: { fontSize: 12, marginTop: 3, color: 'rgba(255,255,255,0.75)' },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  statCard: { flex: 1, minWidth: '45%', borderRadius: 12, padding: 18, alignItems: 'center', gap: 6, borderWidth: 1 },
  statNum: { fontSize: 28, fontWeight: '800' },
  statLabel: { fontSize: 13, fontWeight: '500' },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  emptyCard: { borderRadius: 12, padding: 24, alignItems: 'center', borderWidth: 1 },
  resCard: { borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1 },
  resHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  resClient: { fontSize: 15, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '700' },
  resFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  linksCard: { borderRadius: 12, padding: 14, marginBottom: 20, borderWidth: 1 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 },
  qrBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, paddingVertical: 10, marginTop: 10 },
  qrBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  qrSection: { alignItems: 'center', marginVertical: 8 },
  qrLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  qrLabelText: { fontSize: 14, fontWeight: '700' },
  qrBox: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 8 },
  qrDivider: { width: '60%', height: 1, marginVertical: 12 },
});
