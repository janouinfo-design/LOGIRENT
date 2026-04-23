import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator, Dimensions, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../src/api/axios';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeStore } from '../../src/store/themeStore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { TodayReservationCard } from '../../src/components/agency/TodayReservationCard';
import { ReservationActionModal } from '../../src/components/agency/ReservationActionModal';
import ReturnVehicleModal from '../../src/components/agency/ReturnVehicleModal';
import { EditClientModal } from '../../src/components/agency/EditClientModal';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function AgencyAppHome() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { colors: C } = useThemeStore();
  const [stats, setStats] = useState<any>(null);
  const [recentReservations, setRecentReservations] = useState<any[]>([]);
  const [todayReservations, setTodayReservations] = useState<any[]>([]);
  const [agency, setAgency] = useState<any>(null);
  const [docAlerts, setDocAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionModal, setActionModal] = useState<any>(null);
  const [returnModal, setReturnModal] = useState<any>(null);
  const [editClientModal, setEditClientModal] = useState<any>(null);
  const openClientProfile = async (userId: string) => {
    try {
      const res = await api.get(`/api/admin/users/${userId}`);
      setEditClientModal(res.data);
    } catch { }
  };

  const screenW = Dimensions.get('window').width;
  const cardW = screenW > 1000 ? (screenW - 80) / 3 : screenW > 700 ? (screenW - 60) / 2 : screenW - 40;

  const fetchData = useCallback(async () => {
    try {
      const [statsResp, resResp, todayResp, agenciesResp, alertsResp] = await Promise.all([
        api.get('/api/admin/stats'),
        api.get('/api/admin/reservations?limit=10'),
        api.get('/api/admin/reservations/today'),
        api.get('/api/agencies'),
        api.get('/api/admin/vehicles/document-alerts?days=30').catch(() => ({ data: { alerts: [] } })),
      ]);
      setStats(statsResp.data);
      setRecentReservations(resResp.data.reservations || []);
      setTodayReservations((todayResp.data.reservations || []).sort((a: any, b: any) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()));
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
    const map: Record<string, string> = { confirmed: '#10B981', active: '#3B82F6', pending: '#FBBF24', pending_cash: '#A855F7', completed: '#6B7280', cancelled: '#EF4444' };
    return map[s] || C.textLight;
  };

  const statusLabel = (s: string) => {
    const map: Record<string, string> = { pending: 'Confirmee', pending_cash: 'Especes', confirmed: 'Confirmee', active: 'Active', completed: 'Terminee', cancelled: 'Annulee' };
    return map[s] || s;
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.put(`/api/admin/reservations/${id}/status?status=${status}`);
      fetchData();
      if (status === 'confirmed') {
        try {
          const contractResp = await api.get(`/api/contracts/by-reservation/${id}`);
          if (!contractResp.data) {
            await api.post('/api/admin/contracts/generate', { reservation_id: id, language: 'fr' });
          }
        } catch {}
      }
    } catch (e: any) {
      const msg = e.response?.data?.detail || 'Erreur';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Erreur', msg);
    }
  };

  const handleViewContract = async (reservationId: string) => {
    try {
      const resp = await api.get(`/api/contracts/by-reservation/${reservationId}`);
      if (resp.data) {
        router.push(`/contract/${resp.data.id}` as any);
      } else {
        const genResp = await api.post('/api/admin/contracts/generate', { reservation_id: reservationId, language: 'fr' });
        router.push(`/contract/${genResp.data.contract_id}` as any);
      }
    } catch (err: any) {
      Platform.OS === 'web' ? window.alert(err.response?.data?.detail || 'Erreur') : Alert.alert('Erreur');
    }
  };

  const updatePayment = async (id: string, status: string) => {
    try {
      await api.put(`/api/admin/reservations/${id}/payment-status?payment_status=${status}`);
      fetchData();
    } catch (e: any) {
      const msg = e.response?.data?.detail || 'Erreur';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Erreur', msg);
    }
  };

  const sendPaymentLink = async (id: string) => {
    try {
      await api.post(`/api/admin/reservations/${id}/send-payment-link`);
      Platform.OS === 'web' ? window.alert('Lien de paiement envoyé') : Alert.alert('Succès', 'Lien envoyé');
    } catch (e: any) {
      const msg = e.response?.data?.detail || 'Erreur';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Erreur', msg);
    }
  };

  if (loading) return <View style={[s.container, { backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={C.accent} /></View>;

  return (
    <>
    <ScrollView style={[s.container, { backgroundColor: C.bg }]} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}>
      {/* New reservation button */}
      <TouchableOpacity activeOpacity={0.85} onPress={() => router.push('/agency-app/book')} data-testid="quick-book-btn" style={{ marginBottom: 20 }}>
        <LinearGradient colors={['#6366f1', '#8b5cf6', '#a855f7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.5 }} style={s.bookBtn}>
          <View style={s.bookIconWrap}>
            <Ionicons name="add" size={26} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.bookBtnText}>Nouvelle reservation</Text>
            <Text style={s.bookBtnSub}>Reserver rapidement pour un client</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.7)" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Stats cards */}
      <View style={s.statsRow}>
        <TouchableOpacity style={[s.statCard, { backgroundColor: C.card, borderColor: C.border }]} onPress={() => router.push('/agency-app/vehicles')} data-testid="stat-vehicles">
          <Ionicons name="car" size={32} color={C.info} />
          <Text style={[s.statNum, { color: C.text }]}>{stats?.total_vehicles || 0}</Text>
          <Text style={[s.statLabel, { color: C.textLight }]}>Vehicules</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.statCard, { backgroundColor: C.card, borderColor: C.border }]} onPress={() => router.push('/agency-app/reservations')} data-testid="stat-reservations">
          <Ionicons name="calendar" size={32} color={C.warning} />
          <Text style={[s.statNum, { color: C.text }]}>{stats?.total_reservations || 0}</Text>
          <Text style={[s.statLabel, { color: C.textLight }]}>Reservations</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.statCard, { backgroundColor: C.card, borderColor: C.border }]} onPress={() => router.push('/agency-app/clients')} data-testid="stat-clients">
          <Ionicons name="people" size={32} color={C.success} />
          <Text style={[s.statNum, { color: C.text }]}>{stats?.total_users || 0}</Text>
          <Text style={[s.statLabel, { color: C.textLight }]}>Clients</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.statCard, { backgroundColor: C.card, borderColor: C.border }]} onPress={() => router.push('/agency-app/statistics')} data-testid="stat-revenue">
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
          {docAlerts.slice(0, 3).map((alert: any, i: number) => (
            <TouchableOpacity
              key={`${alert.vehicle_id}-${alert.doc_id}`}
              style={[s.alertCard, { backgroundColor: C.card, borderColor: alert.severity === 'expired' ? '#EF444440' : '#F59E0B40', borderLeftColor: alert.severity === 'expired' ? '#EF4444' : '#F59E0B' }]}
              onPress={() => router.push('/agency-app/vehicles')}
              data-testid={`doc-alert-${i}`}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                  <Ionicons name={alert.severity === 'expired' ? 'alert-circle' : 'warning'} size={16} color={alert.severity === 'expired' ? '#EF4444' : '#F59E0B'} />
                  <Text style={{ color: C.text, fontSize: 13, fontWeight: '700' }}>{alert.vehicle_name}</Text>
                </View>
                <View style={[s.alertBadge, { backgroundColor: (alert.severity === 'expired' ? '#EF4444' : '#F59E0B') + '20' }]}>
                  <Text style={{ color: alert.severity === 'expired' ? '#EF4444' : '#F59E0B', fontSize: 10, fontWeight: '700' }}>
                    {alert.severity === 'expired' ? 'Expire' : 'Bientot'}
                  </Text>
                </View>
              </View>
              <Text style={{ color: C.textLight, fontSize: 11, marginTop: 2 }}>{alert.doc_type_label} - {alert.expiry_date?.slice(0, 10)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Today's reservations */}
      <View style={{ marginBottom: 24 }} data-testid="today-reservations-section">
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="today" size={18} color={C.accent} />
            <Text style={[s.sectionTitle, { color: C.text, marginBottom: 0 }]}>Reservations du jour</Text>
            {todayReservations.length > 0 && (
              <View style={{ backgroundColor: C.accent + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                <Text style={{ color: C.accent, fontSize: 12, fontWeight: '800' }}>{todayReservations.length}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={() => router.push('/agency-app/reservations')} data-testid="see-all-reservations">
            <Text style={{ color: C.accent, fontSize: 12, fontWeight: '600' }}>Voir tout</Text>
          </TouchableOpacity>
        </View>

        {todayReservations.length === 0 ? (
          <View style={[s.emptyCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <Ionicons name="calendar-outline" size={28} color={C.textLight} />
            <Text style={{ color: C.textLight, fontSize: 13 }}>Aucune reservation aujourd'hui</Text>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {todayReservations.map((r: any) => (
              <View key={r.id} style={{ width: cardW }}>
                <TodayReservationCard
                  item={r}
                  C={C}
                  onStatusChange={updateStatus}
                  onActionPress={(item) => setActionModal(item)}
                  onViewContract={handleViewContract}
                  onClientPress={openClientProfile}
                />
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Recent reservations - as cards */}
      <View style={{ marginBottom: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text style={[s.sectionTitle, { color: C.text, marginBottom: 0 }]}>Dernieres reservations</Text>
          <TouchableOpacity onPress={() => router.push('/agency-app/reservations')} data-testid="see-all-recent">
            <Text style={{ color: C.accent, fontSize: 12, fontWeight: '600' }}>Voir tout</Text>
          </TouchableOpacity>
        </View>
        {recentReservations.length === 0 ? (
          <View style={[s.emptyCard, { backgroundColor: C.card, borderColor: C.border }]}><Text style={{ color: C.textLight, fontSize: 14 }}>Aucune reservation recente</Text></View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {recentReservations.map((r: any) => (
              <View key={r.id} style={{ width: cardW }}>
                <TodayReservationCard
                  item={r}
                  C={C}
                  onStatusChange={updateStatus}
                  onActionPress={(item) => setActionModal(item)}
                  onViewContract={handleViewContract}
                  onClientPress={openClientProfile}
                />
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>

      <ReservationActionModal
        actionModal={actionModal} setActionModal={setActionModal}
        C={C} statusColor={statusColor}
        updateStatus={updateStatus} updatePayment={updatePayment}
        sendPaymentLink={sendPaymentLink} sendingLink={false}
        onReturnVehicle={(r) => setReturnModal(r)}
      />

      <ReturnVehicleModal
        visible={!!returnModal}
        reservation={returnModal}
        vehicle={returnModal ? { brand: returnModal.vehicle_brand || 'Vehicule', model: returnModal.vehicle_model || '' } : null}
        onClose={() => setReturnModal(null)}
        onSuccess={fetchData}
        colors={C}
      />

      <EditClientModal
        visible={!!editClientModal}
        onClose={() => setEditClientModal(null)}
        client={editClientModal}
        C={C}
        onSaved={() => { setEditClientModal(null); fetchData(); }}
      />
    </>
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
  emptyCard: { borderRadius: 12, padding: 24, alignItems: 'center', gap: 8, borderWidth: 1 },
  alertCard: { borderRadius: 10, padding: 10, marginBottom: 8, borderWidth: 1, borderLeftWidth: 4 },
  alertBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  resCard: { borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1 },
  resHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  resClient: { fontSize: 15, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '700' },
  resFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
