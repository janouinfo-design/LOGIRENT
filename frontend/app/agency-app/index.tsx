import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator, Dimensions, Platform, Alert, Modal, TextInput } from 'react-native';
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
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [agency, setAgency] = useState<any>(null);
  const [docAlerts, setDocAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionModal, setActionModal] = useState<any>(null);
  const [returnModal, setReturnModal] = useState<any>(null);
  const [editClientModal, setEditClientModal] = useState<any>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [offerModal, setOfferModal] = useState<any>(null);
  const [offerPrice, setOfferPrice] = useState<string>('');
  const [offerMessage, setOfferMessage] = useState<string>('');
  const [sendingOffer, setSendingOffer] = useState(false);
  const [assignModal, setAssignModal] = useState<any>(null);
  const [assignVehicles, setAssignVehicles] = useState<any[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
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
      const [statsResp, resResp, todayResp, agenciesResp, alertsResp, pendingResp] = await Promise.all([
        api.get('/api/admin/stats'),
        api.get('/api/admin/reservations?limit=10'),
        api.get('/api/admin/reservations/today'),
        api.get('/api/agencies'),
        api.get('/api/admin/vehicles/document-alerts?days=30').catch(() => ({ data: { alerts: [] } })),
        api.get('/api/admin/reservations?status=pending&limit=20').catch(() => ({ data: { reservations: [] } })),
      ]);
      setStats(statsResp.data);
      setRecentReservations(resResp.data.reservations || []);
      setTodayReservations((todayResp.data.reservations || []).sort((a: any, b: any) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()));
      const agencies = agenciesResp.data;
      if (agencies?.length > 0) setAgency(agencies[0]);
      setDocAlerts(alertsResp.data.alerts || []);
      setPendingRequests((pendingResp.data.reservations || []).sort((a: any, b: any) => new Date(b.created_at || b.start_date).getTime() - new Date(a.created_at || a.start_date).getTime()));
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

  const confirmRequest = async (id: string) => {
    // Find the reservation in pending list
    const r = pendingRequests.find((x: any) => x.id === id);
    if (r && !r.vehicle_id) {
      // No vehicle assigned yet → open assignment modal
      openAssignModal(r);
      return;
    }
    setProcessingId(id);
    try {
      await updateStatus(id, 'confirmed');
    } finally {
      setProcessingId(null);
    }
  };

  const rejectRequest = async (id: string) => {
    const confirmed = Platform.OS === 'web'
      ? window.confirm('Refuser cette demande de réservation ? Le client sera notifié par e-mail.')
      : await new Promise<boolean>((resolve) => {
          Alert.alert('Refuser la demande', 'Le client sera notifié par e-mail.', [
            { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Refuser', style: 'destructive', onPress: () => resolve(true) },
          ]);
        });
    if (!confirmed) return;
    setProcessingId(id);
    try {
      await updateStatus(id, 'cancelled');
    } finally {
      setProcessingId(null);
    }
  };

  const formatRequestedAt = (iso?: string) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return "à l'instant";
      if (diffMin < 60) return `il y a ${diffMin} min`;
      const diffH = Math.floor(diffMin / 60);
      if (diffH < 24) return `il y a ${diffH}h`;
      const diffD = Math.floor(diffH / 24);
      if (diffD < 7) return `il y a ${diffD}j`;
      return format(d, 'dd/MM/yyyy', { locale: fr });
    } catch { return ''; }
  };

  const openOfferModal = (r: any) => {
    setOfferModal(r);
    setOfferPrice(String(r.total_price ?? ''));
    setOfferMessage('');
  };

  const sendOffer = async () => {
    if (!offerModal) return;
    const priceNum = parseFloat(offerPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      Platform.OS === 'web' ? window.alert('Prix invalide') : Alert.alert('Erreur', 'Prix invalide');
      return;
    }
    setSendingOffer(true);
    try {
      await api.post(`/api/admin/reservations/${offerModal.id}/send-offer`, {
        total_price: priceNum,
        message: offerMessage.trim(),
      });
      Platform.OS === 'web'
        ? window.alert('Offre envoyée au client par e-mail')
        : Alert.alert('Succès', 'Offre envoyée au client par e-mail');
      setOfferModal(null);
      setOfferPrice('');
      setOfferMessage('');
      fetchData();
    } catch (e: any) {
      const msg = e.response?.data?.detail || 'Erreur lors de l\'envoi';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Erreur', msg);
    } finally {
      setSendingOffer(false);
    }
  };

  const openAssignModal = async (r: any) => {
    setAssignModal(r);
    setAssignVehicles([]);
    setAssignLoading(true);
    try {
      const res = await api.get(`/api/admin/reservations/${r.id}/available-vehicles`);
      setAssignVehicles(res.data?.vehicles || []);
    } catch (e: any) {
      const msg = e.response?.data?.detail || 'Impossible de charger les véhicules';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Erreur', msg);
      setAssignModal(null);
    } finally {
      setAssignLoading(false);
    }
  };

  const assignVehicleToRes = async (vehicleId: string) => {
    if (!assignModal) return;
    setAssigning(true);
    try {
      await api.post(`/api/admin/reservations/${assignModal.id}/assign-vehicle`, {
        vehicle_id: vehicleId,
        confirm: true,
      });
      Platform.OS === 'web'
        ? window.alert('Véhicule assigné et réservation confirmée')
        : Alert.alert('Succès', 'Véhicule assigné et réservation confirmée');
      setAssignModal(null);
      setAssignVehicles([]);
      fetchData();
    } catch (e: any) {
      const msg = e.response?.data?.detail || "Erreur lors de l'assignation";
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Erreur', msg);
    } finally {
      setAssigning(false);
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

      {/* Demandes à traiter - pending reservation requests (above today's reservations for priority) */}
      {pendingRequests.length > 0 && (
        <View style={{ marginBottom: 24 }} data-testid="pending-requests-section">
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="hourglass" size={18} color="#F59E0B" />
              <Text style={[s.sectionTitle, { color: C.text, marginBottom: 0 }]}>Demandes à traiter</Text>
              <View style={s.pendingBadge}>
                <Text style={s.pendingBadgeText}>{pendingRequests.length}</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/agency-app/reservations?filter=pending' as any)}
              data-testid="pending-see-all"
            >
              <Text style={{ color: '#F59E0B', fontSize: 12, fontWeight: '600' }}>Voir tout</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {pendingRequests.map((r: any) => {
              const isProcessing = processingId === r.id;
              const start = new Date(r.start_date);
              const end = new Date(r.end_date);
              const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
              const startTime = (() => { try { return format(start, 'HH:mm'); } catch { return ''; } })();
              const endTime = (() => { try { return format(end, 'HH:mm'); } catch { return ''; } })();
              return (
                <View key={r.id} style={{ width: cardW }}>
                  <View
                    style={[s.pendingCardV2, { backgroundColor: C.card, borderColor: C.border }]}
                    data-testid={`pending-card-${r.id}`}
                  >
                    <View style={s.pendingV2Header}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 6 }}>
                        <TouchableOpacity onPress={() => r.user_id && openClientProfile(r.user_id)} style={{ flex: 1 }} data-testid={`pending-client-${r.id}`}>
                          <Text style={[s.pendingV2Name, { color: C.accent, textDecorationLine: 'underline' }]} numberOfLines={1}>
                            {r.user_name || r.user_email || 'Client'}
                          </Text>
                        </TouchableOpacity>
                        {r.docs_missing && (
                          <View style={s.pendingV2DocsBadge}>
                            <Ionicons name="alert-circle" size={12} color="#EF4444" />
                            <Text style={{ color: '#EF4444', fontSize: 9, fontWeight: '800' }}>DOCS</Text>
                          </View>
                        )}
                      </View>
                      <View style={[s.pendingV2Badge, { backgroundColor: '#F59E0B20' }]}>
                        <Text style={[s.pendingV2BadgeText, { color: '#F59E0B' }]}>Attente</Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                      <Ionicons name="time-outline" size={12} color={C.textLight} />
                      <Text style={{ color: C.textLight, fontSize: 11, fontWeight: '500' }}>{formatRequestedAt(r.created_at)}</Text>
                    </View>

                    <Text style={[s.pendingV2Vehicle, { color: C.textLight }]} numberOfLines={1}>
                      {r.vehicle_name || `${r.vehicle_brand || ''} ${r.vehicle_model || ''}`.trim() || 'Véhicule'}
                    </Text>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <Ionicons name="calendar-outline" size={13} color={C.textLight} />
                      <Text style={{ color: C.text, fontSize: 12, fontWeight: '600' }}>
                        {format(start, 'dd MMM', { locale: fr })} - {format(end, 'dd MMM', { locale: fr })}
                      </Text>
                      <Text style={{ color: C.textLight, fontSize: 11, fontWeight: '600' }}>· {days}j</Text>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
                      <View style={[s.pendingV2TimeChip, { backgroundColor: '#10B98110', borderColor: '#10B98130' }]}>
                        <Ionicons name="log-in-outline" size={11} color="#10B981" />
                        <Text style={{ color: '#10B981', fontSize: 10, fontWeight: '700' }}>Depart {startTime}</Text>
                      </View>
                      <View style={[s.pendingV2TimeChip, { backgroundColor: '#3B82F610', borderColor: '#3B82F630' }]}>
                        <Ionicons name="log-out-outline" size={11} color="#3B82F6" />
                        <Text style={{ color: '#3B82F6', fontSize: 10, fontWeight: '700' }}>Retour {endTime}</Text>
                      </View>
                    </View>

                    <View style={s.pendingV2PriceRow}>
                      <TouchableOpacity onPress={() => openOfferModal(r)} data-testid={`pending-amount-${r.id}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={[s.pendingV2Price, { color: C.accent }]}>CHF {Number(r.total_price || 0).toFixed(0)}</Text>
                        <Ionicons name="create-outline" size={13} color={C.accent} />
                      </TouchableOpacity>
                      <View style={[s.pendingV2PayBadge, { backgroundColor: (r.payment_method === 'cash' ? '#A855F7' : '#3B82F6') + '18' }]}>
                        <Ionicons name={r.payment_method === 'cash' ? 'cash-outline' : 'card-outline'} size={11} color={r.payment_method === 'cash' ? '#A855F7' : '#3B82F6'} />
                        <Text style={{ color: r.payment_method === 'cash' ? '#A855F7' : '#3B82F6', fontSize: 10, fontWeight: '700' }}>
                          {r.payment_method === 'cash' ? 'Especes' : 'Carte'}
                        </Text>
                      </View>
                    </View>

                    <View style={[s.pendingV2Actions, { borderTopColor: C.border }]}>
                      <TouchableOpacity
                        style={[s.pendingV2Btn, { backgroundColor: '#FEE2E2' }]}
                        onPress={() => rejectRequest(r.id)}
                        disabled={isProcessing}
                        data-testid={`pending-reject-${r.id}`}
                      >
                        <Ionicons name="close" size={14} color="#EF4444" />
                        <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '700' }}>Refuser</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.pendingV2Btn, { backgroundColor: '#3B82F615', borderWidth: 1, borderColor: '#3B82F640' }]}
                        onPress={() => openOfferModal(r)}
                        disabled={isProcessing}
                        data-testid={`pending-offer-${r.id}`}
                      >
                        <Ionicons name="pricetag" size={13} color="#3B82F6" />
                        <Text style={{ color: '#3B82F6', fontSize: 11, fontWeight: '700' }}>Modifier</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.pendingV2Btn, { backgroundColor: r.vehicle_id ? '#10B981' : '#7C3AED' }, isProcessing && { opacity: 0.6 }]}
                        onPress={() => confirmRequest(r.id)}
                        disabled={isProcessing}
                        data-testid={`pending-confirm-${r.id}`}
                      >
                        {isProcessing ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Ionicons name={r.vehicle_id ? 'checkmark' : 'car-sport'} size={14} color="#fff" />
                            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                              {r.vehicle_id ? 'Confirmer' : 'Assigner'}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
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

      {/* Offer modal - modify price and send to client */}
      <Modal visible={!!offerModal} transparent animationType="fade" onRequestClose={() => !sendingOffer && setOfferModal(null)}>
        <View style={s.modalOverlay}>
          <View style={[s.offerModal, { backgroundColor: C.card }]} data-testid="offer-modal">
            <View style={[s.offerHeader, { borderBottomColor: C.border }]}>
              <View style={s.offerHeaderIcon}>
                <Ionicons name="pricetag" size={22} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.offerTitle, { color: C.text }]}>Modifier et envoyer l'offre</Text>
                <Text style={[s.offerSub, { color: C.textLight }]} numberOfLines={1}>
                  {offerModal?.vehicle_name || `${offerModal?.vehicle_brand || ''} ${offerModal?.vehicle_model || ''}`.trim()} • {offerModal?.user_name}
                </Text>
              </View>
              <TouchableOpacity onPress={() => !sendingOffer && setOfferModal(null)} style={s.offerClose} data-testid="offer-close">
                <Ionicons name="close" size={22} color={C.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 500 }} contentContainerStyle={{ padding: 20 }}>
              <View style={[s.offerInfoBox, { backgroundColor: C.background, borderColor: C.border }]}>
                <View style={s.offerInfoRow}>
                  <Text style={[s.offerInfoLabel, { color: C.textLight }]}>Prix actuel</Text>
                  <Text style={[s.offerInfoValue, { color: C.text }]}>CHF {Number(offerModal?.total_price || 0).toFixed(2)}</Text>
                </View>
                <View style={s.offerInfoRow}>
                  <Text style={[s.offerInfoLabel, { color: C.textLight }]}>Période</Text>
                  <Text style={[s.offerInfoValue, { color: C.text }]}>
                    {offerModal && format(new Date(offerModal.start_date), 'dd MMM', { locale: fr })} → {offerModal && format(new Date(offerModal.end_date), 'dd MMM yyyy', { locale: fr })}
                  </Text>
                </View>
              </View>

              <Text style={[s.offerFieldLabel, { color: C.text }]}>Nouveau prix total (CHF)</Text>
              <View style={[s.offerPriceBox, { backgroundColor: C.background, borderColor: C.border }]}>
                <Text style={[s.offerCurrency, { color: C.textLight }]}>CHF</Text>
                <TextInput
                  value={offerPrice}
                  onChangeText={setOfferPrice}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={C.textLight}
                  style={[s.offerPriceInput, { color: C.text }]}
                  data-testid="offer-price-input"
                />
              </View>

              <Text style={[s.offerFieldLabel, { color: C.text, marginTop: 16 }]}>
                Message au client <Text style={{ color: C.textLight, fontWeight: '400' }}>(optionnel)</Text>
              </Text>
              <TextInput
                value={offerMessage}
                onChangeText={setOfferMessage}
                placeholder="Ex: Remise appliquée pour fidélité, supplément kilométrage..."
                placeholderTextColor={C.textLight}
                multiline
                numberOfLines={3}
                style={[s.offerMessageInput, { color: C.text, backgroundColor: C.background, borderColor: C.border }]}
                data-testid="offer-message-input"
              />

              <View style={[s.offerTipBox, { backgroundColor: '#3B82F610', borderColor: '#3B82F640' }]}>
                <Ionicons name="mail" size={16} color="#3B82F6" />
                <Text style={[s.offerTipText, { color: C.text }]}>
                  Le client recevra un e-mail avec le nouveau prix et pourra accepter ou refuser l'offre depuis son espace.
                </Text>
              </View>
            </ScrollView>

            <View style={[s.offerFooter, { borderTopColor: C.border }]}>
              <TouchableOpacity
                style={[s.offerBtn, s.offerBtnCancel, { borderColor: C.border }]}
                onPress={() => !sendingOffer && setOfferModal(null)}
                disabled={sendingOffer}
                data-testid="offer-cancel"
              >
                <Text style={[s.offerBtnCancelText, { color: C.text }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.offerBtn, s.offerBtnSend, sendingOffer && { opacity: 0.6 }]}
                onPress={sendOffer}
                disabled={sendingOffer}
                data-testid="offer-send"
              >
                {sendingOffer ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="paper-plane" size={15} color="#fff" />
                    <Text style={s.offerBtnSendText}>Envoyer l'offre</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Assign vehicle modal */}
      <Modal visible={!!assignModal} transparent animationType="fade" onRequestClose={() => !assigning && setAssignModal(null)}>
        <View style={s.modalOverlay}>
          <View style={[s.offerModal, { backgroundColor: C.card, maxWidth: 640 }]} data-testid="assign-modal">
            <View style={[s.offerHeader, { borderBottomColor: C.border }]}>
              <View style={[s.offerHeaderIcon, { backgroundColor: '#7C3AED' }]}>
                <Ionicons name="car-sport" size={22} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.offerTitle, { color: C.text }]}>Assigner un véhicule</Text>
                <Text style={[s.offerSub, { color: C.textLight }]} numberOfLines={1}>
                  {assignModal?.vehicle_name || `${assignModal?.vehicle_brand || ''} ${assignModal?.vehicle_model || ''}`.trim()} • {assignModal?.user_name}
                </Text>
              </View>
              <TouchableOpacity onPress={() => !assigning && setAssignModal(null)} style={s.offerClose} data-testid="assign-close">
                <Ionicons name="close" size={22} color={C.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ padding: 16 }}>
              {assignModal && (
                <View style={[s.offerInfoBox, { backgroundColor: C.background, borderColor: C.border }]}>
                  <View style={s.offerInfoRow}>
                    <Text style={[s.offerInfoLabel, { color: C.textLight }]}>Modèle demandé</Text>
                    <Text style={[s.offerInfoValue, { color: C.text }]}>
                      {assignModal.vehicle_name || `${assignModal.vehicle_brand} ${assignModal.vehicle_model}`}
                    </Text>
                  </View>
                  <View style={s.offerInfoRow}>
                    <Text style={[s.offerInfoLabel, { color: C.textLight }]}>Période</Text>
                    <Text style={[s.offerInfoValue, { color: C.text }]}>
                      {format(new Date(assignModal.start_date), 'dd MMM', { locale: fr })} → {format(new Date(assignModal.end_date), 'dd MMM yyyy', { locale: fr })}
                    </Text>
                  </View>
                </View>
              )}

              <Text style={[s.offerFieldLabel, { color: C.text, marginBottom: 10 }]}>
                Véhicules physiques disponibles ({assignVehicles.filter((v: any) => v.assignable).length}/{assignVehicles.length})
              </Text>

              {assignLoading ? (
                <View style={{ padding: 30, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={C.accent} />
                </View>
              ) : assignVehicles.length === 0 ? (
                <View style={[s.offerInfoBox, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}>
                  <Text style={{ color: '#991B1B', fontSize: 13, fontWeight: '600' }}>
                    Aucun véhicule de ce modèle dans la flotte. Vous pouvez choisir un véhicule similaire d'une autre catégorie ou refuser la demande.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  {assignVehicles.map((v: any) => (
                    <TouchableOpacity
                      key={v.id}
                      disabled={!v.assignable || assigning}
                      style={[
                        s.assignCard,
                        { backgroundColor: C.background, borderColor: C.border },
                        v.assignable && { borderColor: '#10B98140', backgroundColor: '#10B98108' },
                        !v.assignable && { opacity: 0.5 },
                      ]}
                      onPress={() => assignVehicleToRes(v.id)}
                      data-testid={`assign-vehicle-${v.id}`}
                    >
                      <View style={[s.assignCardIcon, { backgroundColor: v.assignable ? '#10B981' : '#9CA3AF' }]}>
                        <Ionicons name="car-sport" size={20} color="#fff" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <Text style={[{ color: C.text, fontSize: 14, fontWeight: '800' }]}>
                            {v.brand} {v.model}
                          </Text>
                          <View style={[s.assignPlateBadge, { backgroundColor: C.text + '15' }]}>
                            <Text style={{ color: C.text, fontSize: 11, fontWeight: '800' }}>{v.plate_number || 'NO-PLATE'}</Text>
                          </View>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
                          <Text style={{ color: C.textLight, fontSize: 11, fontWeight: '600' }}>
                            <Ionicons name="speedometer-outline" size={11} color={C.textLight} /> {(v.mileage ?? 0).toLocaleString('fr-CH')} km
                          </Text>
                          <View style={[s.assignStatusChip, {
                            backgroundColor: v.status === 'available' ? '#10B98115' : v.status === 'maintenance' ? '#F59E0B15' : '#EF444415',
                          }]}>
                            <Text style={{
                              fontSize: 10, fontWeight: '700',
                              color: v.status === 'available' ? '#10B981' : v.status === 'maintenance' ? '#F59E0B' : '#EF4444',
                            }}>
                              {v.status === 'available' ? 'Disponible' : v.status === 'maintenance' ? 'Maintenance' : v.status === 'reserved' ? 'Réservé' : v.status === 'rented' ? 'En location' : 'Inactif'}
                            </Text>
                          </View>
                          {v.has_overlap && (
                            <View style={[s.assignStatusChip, { backgroundColor: '#EF444415' }]}>
                              <Ionicons name="warning" size={10} color="#EF4444" />
                              <Text style={{ color: '#EF4444', fontSize: 10, fontWeight: '700' }}>Chevauchement</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      {v.assignable ? (
                        <View style={[s.assignBtn, { backgroundColor: '#10B981' }]}>
                          {assigning ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <>
                              <Ionicons name="checkmark" size={14} color="#fff" />
                              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>Choisir</Text>
                            </>
                          )}
                        </View>
                      ) : (
                        <View style={[s.assignBtn, { backgroundColor: C.border }]}>
                          <Ionicons name="ban" size={14} color={C.textLight} />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={[s.offerTipBox, { backgroundColor: '#3B82F610', borderColor: '#3B82F640', marginTop: 14 }]}>
                <Ionicons name="information-circle" size={16} color="#3B82F6" />
                <Text style={[s.offerTipText, { color: C.text }]}>
                  Cliquez sur "Choisir" pour assigner ce véhicule et confirmer la réservation. Le client recevra un e-mail de confirmation avec la plaque.
                </Text>
              </View>
            </ScrollView>

            <View style={[s.offerFooter, { borderTopColor: C.border }]}>
              <TouchableOpacity
                style={[s.offerBtn, s.offerBtnCancel, { borderColor: C.border, flex: 1 }]}
                onPress={() => !assigning && setAssignModal(null)}
                disabled={assigning}
                data-testid="assign-cancel"
              >
                <Text style={[s.offerBtnCancelText, { color: C.text }]}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

  // Demandes à traiter (pending requests) - grid style matching TodayReservationCard
  pendingBadge: { backgroundColor: '#EF4444', paddingHorizontal: 8, paddingVertical: 1, borderRadius: 10, minWidth: 22, alignItems: 'center' },
  pendingBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  pendingCardV2: { borderRadius: 10, padding: 12, borderWidth: 1, borderLeftWidth: 4, borderLeftColor: '#F59E0B', width: '100%' },
  pendingV2Header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  pendingV2Name: { fontSize: 15, fontWeight: '800', flex: 1, marginRight: 8 },
  pendingV2Badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  pendingV2BadgeText: { fontSize: 11, fontWeight: '700' },
  pendingV2DocsBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  pendingV2Vehicle: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  pendingV2TimeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  pendingV2PriceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  pendingV2Price: { fontSize: 16, fontWeight: '800' },
  pendingV2PayBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  pendingV2Actions: { flexDirection: 'row', gap: 5, paddingTop: 8, borderTopWidth: 1 },
  pendingV2Btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 6 },

  // Offer modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  offerModal: { width: '100%', maxWidth: 520, borderRadius: 16, overflow: 'hidden' },
  offerHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, borderBottomWidth: 1 },
  offerHeaderIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center' },
  offerTitle: { fontSize: 17, fontWeight: '800' },
  offerSub: { fontSize: 12, marginTop: 2, fontWeight: '500' },
  offerClose: { padding: 4 },
  offerInfoBox: { padding: 14, borderRadius: 10, borderWidth: 1, marginBottom: 18, gap: 8 },
  offerInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  offerInfoLabel: { fontSize: 12, fontWeight: '600' },
  offerInfoValue: { fontSize: 13, fontWeight: '700' },
  offerFieldLabel: { fontSize: 13, fontWeight: '700', marginBottom: 6 },
  offerPriceBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, height: 52 },
  offerCurrency: { fontSize: 14, fontWeight: '700', marginRight: 10 },
  offerPriceInput: { flex: 1, fontSize: 22, fontWeight: '800', outlineWidth: 0 } as any,
  offerMessageInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 13, minHeight: 80, textAlignVertical: 'top', outlineWidth: 0 } as any,
  offerTipBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, marginTop: 16 },
  offerTipText: { flex: 1, fontSize: 12, lineHeight: 16, fontWeight: '500' },
  offerFooter: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1 },
  offerBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10 },
  offerBtnCancel: { borderWidth: 1 },
  offerBtnCancelText: { fontSize: 14, fontWeight: '700' },
  offerBtnSend: { backgroundColor: '#3B82F6' },
  offerBtnSendText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Assign vehicle modal
  assignCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 10, borderWidth: 1 },
  assignCardIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  assignPlateBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, fontFamily: 'monospace' as any },
  assignStatusChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  assignBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
});
