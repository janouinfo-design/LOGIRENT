import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, TextInput, Modal, ScrollView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api/axios';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useThemeStore } from '../../src/store/themeStore';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Reservation {
  id: string; user_name: string; user_email: string; vehicle_name: string;
  start_date: string; end_date: string; total_days: number; total_price: number;
  status: string; payment_status: string; payment_method?: string;
}

const STATUS_FILTERS = [
  { value: null, label: 'Toutes' },
  { value: 'pending', label: 'En attente' },
  { value: 'pending_cash', label: 'Espèces' },
  { value: 'confirmed', label: 'Confirmées' },
  { value: 'active', label: 'Actives' },
  { value: 'completed', label: 'Terminées' },
  { value: 'cancelled', label: 'Annulées' },
];

export default function AgencyReservations() {
  const { colors: C } = useThemeStore();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [actionModal, setActionModal] = useState<Reservation | null>(null);
  const [sendingLink, setSendingLink] = useState(false);

  const fetchReservations = async () => {
    try {
      const res = await api.get('/api/admin/reservations?limit=100');
      setReservations(res.data.reservations || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchReservations(); }, []);
  const onRefresh = async () => { setRefreshing(true); await fetchReservations(); setRefreshing(false); };

  const filtered = useMemo(() => {
    let list = reservations;
    if (filter) list = list.filter(r => r.status === filter);
    if (search) list = list.filter(r => r.user_name?.toLowerCase().includes(search.toLowerCase()) || r.vehicle_name?.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [reservations, filter, search]);

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

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.put(`/api/admin/reservations/${id}/status?status=${status}`);
      setActionModal(null);
      fetchReservations();
    } catch (e: any) {
      const msg = e.response?.data?.detail || 'Erreur';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Erreur', msg);
    }
  };

  const updatePayment = async (id: string, status: string) => {
    try {
      await api.put(`/api/admin/reservations/${id}/payment-status?payment_status=${status}`);
      setActionModal(null);
      fetchReservations();
    } catch (e: any) {
      const msg = e.response?.data?.detail || 'Erreur';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Erreur', msg);
    }
  };

  const sendPaymentLink = async (id: string) => {
    setSendingLink(true);
    try {
      await api.post(`/api/admin/reservations/${id}/send-payment-link`, { origin_url: API_URL });
      Platform.OS === 'web' ? window.alert('Lien de paiement envoyé!') : Alert.alert('Succès', 'Lien de paiement envoyé!');
      setActionModal(null);
    } catch (e: any) {
      const msg = e.response?.data?.detail || 'Erreur';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Erreur', msg);
    } finally { setSendingLink(false); }
  };

  if (loading) return <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={C.accent} /></View>;

  return (
    <View style={[s.container, { backgroundColor: C.bg }]}>
      {/* Search */}
      <View style={[s.searchBar, { backgroundColor: C.card, borderColor: C.border }]}>
        <Ionicons name="search" size={18} color={C.textLight} />
        <TextInput style={[s.searchInput, { color: C.text }]} placeholder="Rechercher..." placeholderTextColor={C.textLight} value={search} onChangeText={setSearch} />
      </View>

      {/* Filters */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginTop: 12, marginBottom: 4 }}>
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.label}
            onPress={() => setFilter(f.value)}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 20,
              borderWidth: 2,
              borderColor: filter === f.value ? C.accent : C.border,
              backgroundColor: filter === f.value ? C.accent : C.card,
            }}
            data-testid={`filter-${f.value || 'all'}`}
          >
            <Text style={{
              fontSize: 13,
              fontWeight: '700',
              color: filter === f.value ? '#FFFFFF' : C.text,
            }}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        ListEmptyComponent={<View style={s.empty}><Ionicons name="calendar-outline" size={40} color={C.textLight} /><Text style={[s.emptyText, { color: C.textLight }]}>Aucune réservation</Text></View>}
        renderItem={({ item }) => (
          <TouchableOpacity style={[s.card, { backgroundColor: C.card, borderColor: C.border }]} onPress={() => setActionModal(item)} data-testid={`res-${item.id}`}>
            <View style={s.cardHeader}>
              <Text style={[s.clientName, { color: C.text }]}>{item.user_name}</Text>
              <View style={[s.badge, { backgroundColor: statusColor(item.status) + '20' }]}>
                <Text style={[s.badgeText, { color: statusColor(item.status) }]}>{statusLabel(item.status)}</Text>
              </View>
            </View>
            <Text style={[s.vehicleName, { color: C.textLight }]}>{item.vehicle_name}</Text>
            <View style={s.cardFooter}>
              <Text style={[s.dateText, { color: C.textLight }]}>
                {item.start_date ? format(new Date(item.start_date), 'dd MMM', { locale: fr }) : ''} - {item.end_date ? format(new Date(item.end_date), 'dd MMM', { locale: fr }) : ''}
              </Text>
              <View style={s.payInfo}>
                <Text style={[s.payBadge, { color: item.payment_status === 'paid' ? C.success : C.warning }]}>
                  {item.payment_status === 'paid' ? 'Payé' : 'Non payé'}
                </Text>
                <Text style={[s.price, { color: C.accent }]}>CHF {item.total_price?.toFixed(2)}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Action Modal */}
      <Modal visible={!!actionModal} transparent animationType="slide" onRequestClose={() => setActionModal(null)}>
        <View style={s.modalOverlay}>
          <View style={[s.modal, { backgroundColor: C.card }]}>
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: C.text }]}>Actions</Text>
              <TouchableOpacity onPress={() => setActionModal(null)}><Ionicons name="close" size={24} color={C.text} /></TouchableOpacity>
            </View>
            {actionModal && (
              <ScrollView>
                <Text style={s.modalSub}>{actionModal.user_name} - {actionModal.vehicle_name}</Text>
                <Text style={s.modalPrice}>CHF {actionModal.total_price?.toFixed(2)}</Text>

                <Text style={s.modalSection}>Statut</Text>
                {['confirmed', 'active', 'completed', 'cancelled'].map(st => (
                  <TouchableOpacity key={st} style={s.actionBtn} onPress={() => updateStatus(actionModal.id, st)}>
                    <View style={[s.dot, { backgroundColor: statusColor(st) }]} />
                    <Text style={s.actionText}>{statusLabel(st)}</Text>
                  </TouchableOpacity>
                ))}

                <Text style={s.modalSection}>Paiement</Text>
                <TouchableOpacity style={s.actionBtn} onPress={() => updatePayment(actionModal.id, 'paid')}>
                  <Ionicons name="checkmark-circle" size={18} color={C.success} />
                  <Text style={s.actionText}>Marquer comme payé</Text>
                </TouchableOpacity>
                {actionModal.payment_status !== 'paid' && (
                  <TouchableOpacity style={[s.actionBtn, s.linkBtn]} onPress={() => sendPaymentLink(actionModal.id)} disabled={sendingLink}>
                    <Ionicons name="link" size={18} color={C.accent} />
                    <Text style={[s.actionText, { color: C.accent }]}>{sendingLink ? 'Envoi...' : 'Envoyer lien de paiement'}</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const _C = { bg: '#0B0F1A', card: '#141926', primary: '#6C2BD9', accent: '#A78BFA', text: '#fff', textLight: '#8B95A8', border: '#1E2536', success: '#10B981', warning: '#F59E0B', error: '#EF4444' };

const s = StyleSheet.create({
  container: { flex: 1 },
  searchBar: { flexDirection: 'row', alignItems: 'center', margin: 16, marginBottom: 0, borderRadius: 10, paddingHorizontal: 12, gap: 8, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 10 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginTop: 12, marginBottom: 4 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  filterChipActive: { },
  filterText: { fontSize: 13, fontWeight: '700' },
  filterTextActive: { color: '#fff' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 14 },
  card: { borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  clientName: { fontSize: 15, fontWeight: '700' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  vehicleName: { fontSize: 13, marginBottom: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateText: { fontSize: 12 },
  payInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  payBadge: { fontSize: 11, fontWeight: '600' },
  price: { fontSize: 14, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalSub: { fontSize: 14, marginBottom: 4 },
  modalPrice: { fontSize: 20, fontWeight: '800', marginBottom: 16 },
  modalSection: { fontSize: 12, fontWeight: '600', marginTop: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1 },
  actionText: { fontSize: 14 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  linkBtn: { borderBottomWidth: 0, marginTop: 4 },
});
