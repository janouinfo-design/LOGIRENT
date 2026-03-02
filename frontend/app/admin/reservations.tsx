import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { format, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import api from '../../src/api/axios';
import { useThemeStore } from '../../src/store/themeStore';
import { STATUS_OPTIONS } from '../../src/utils/admin-helpers';
import { ReservationCard, StatusActionModal, DateFilterModal } from '../../src/components/admin/ReservationComponents';

interface Reservation {
  id: string; user_name: string; user_email: string; user_phone?: string;
  vehicle_name: string; start_date: string; end_date: string; total_days: number;
  total_price: number; status: string; payment_status: string; payment_method?: string; created_at: string;
}

export default function AdminReservations() {
  const { colors: C } = useThemeStore();
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [actionModal, setActionModal] = useState<{ type: 'status' | 'payment'; reservation: Reservation } | null>(null);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [activeDateFilter, setActiveDateFilter] = useState<{ start: string; end: string; type: string } | null>(null);

  useEffect(() => { fetchReservations(); }, []);

  const fetchReservations = async () => {
    try {
      const r = await api.get('/api/admin/reservations');
      setReservations(r.data.reservations);
    } catch { if (Platform.OS === 'web') window.alert('Impossible de charger les reservations'); }
    finally { setLoading(false); }
  };

  const filteredReservations = useMemo(() => {
    let result = [...reservations];
    if (statusFilter) result = result.filter(r => r.status === statusFilter);
    if (activeDateFilter?.start && activeDateFilter?.end) {
      const fStart = startOfDay(new Date(activeDateFilter.start));
      const fEnd = endOfDay(new Date(activeDateFilter.end));
      result = result.filter(r => {
        try {
          if (activeDateFilter.type === 'created') return isWithinInterval(new Date(r.created_at), { start: fStart, end: fEnd });
          return new Date(r.start_date) <= fEnd && new Date(r.end_date) >= fStart;
        } catch { return true; }
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r => r.user_name?.toLowerCase().includes(q) || r.user_email?.toLowerCase().includes(q) || r.vehicle_name?.toLowerCase().includes(q) || r.id.toLowerCase().includes(q));
    }
    result.sort((a, b) => sortOrder === 'newest' ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime() : new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return result;
  }, [reservations, statusFilter, searchQuery, sortOrder, activeDateFilter]);

  const stats = useMemo(() => ({
    total: filteredReservations.length,
    confirmed: filteredReservations.filter(r => r.status === 'confirmed' || r.status === 'active').length,
    revenue: filteredReservations.filter(r => r.payment_status === 'paid').reduce((s, r) => s + r.total_price, 0),
  }), [filteredReservations]);

  const updateStatus = async (id: string, s: string) => {
    try { await api.put(`/api/admin/reservations/${id}/status?status=${s}`); fetchReservations(); }
    catch (e: any) { if (Platform.OS === 'web') window.alert('Erreur: ' + (e.response?.data?.detail || 'Erreur')); }
  };

  const updatePayment = async (id: string, s: string) => {
    try { await api.put(`/api/admin/reservations/${id}/payment-status?payment_status=${s}`); fetchReservations(); }
    catch (e: any) { if (Platform.OS === 'web') window.alert('Erreur: ' + (e.response?.data?.detail || 'Erreur')); }
  };

  const handleContract = async (reservationId: string) => {
    try {
      const resp = await api.get(`/api/contracts/by-reservation/${reservationId}`);
      const contract = resp.data;
      if (Platform.OS === 'web') {
        const action = window.prompt(`Contrat existant (${contract.status === 'signed' ? 'Signe' : contract.status === 'sent' ? 'Envoye' : 'Brouillon'})\n\n1 = Voir\n2 = Envoyer\n3 = PDF\n\nChoisissez:`, '1');
        if (action === '1') router.push(`/contract/${contract.id}` as any);
        else if (action === '2') { await api.put(`/api/contracts/${contract.id}/send`); window.alert('Contrat envoye !'); }
        else if (action === '3') {
          const pdf = await api.get(`/api/contracts/${contract.id}/pdf`, { responseType: 'blob' });
          const url = URL.createObjectURL(new Blob([pdf.data], { type: 'application/pdf' }));
          const a = document.createElement('a'); a.href = url; a.download = `contrat_${contract.id.slice(0, 8)}.pdf`; a.click();
        }
      }
    } catch (err: any) {
      if (err.response?.status === 404 && Platform.OS === 'web') {
        const lang = window.prompt('Langue ?\n1 = Francais\n2 = English', '1') === '2' ? 'en' : 'fr';
        try {
          const gen = await api.post('/api/admin/contracts/generate', { reservation_id: reservationId, language: lang });
          window.alert('Contrat genere !');
          router.push(`/contract/${gen.data.contract_id}` as any);
        } catch (e: any) { window.alert('Erreur: ' + (e.response?.data?.detail || 'Erreur')); }
      }
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1, backgroundColor: C.bg }} data-testid="admin-reservations-page">
        {/* Search */}
        <View style={{ flexDirection: 'row', padding: 16, paddingBottom: 8, gap: 10 }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 12, paddingHorizontal: 14, height: 46, gap: 10 }}>
            <Ionicons name="search" size={20} color={C.textLight} />
            <TextInput style={{ flex: 1, fontSize: 15, color: C.text }} placeholder="Rechercher..." placeholderTextColor={C.textLight}
              value={searchQuery} onChangeText={setSearchQuery} data-testid="reservation-search-input" />
            {searchQuery.length > 0 && <TouchableOpacity onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={20} color={C.textLight} /></TouchableOpacity>}
          </View>
          <TouchableOpacity style={{ alignItems: 'center', justifyContent: 'center', backgroundColor: activeDateFilter ? C.accent : C.card, width: 46, height: 46, borderRadius: 12 }}
            onPress={() => setShowDateFilter(true)} data-testid="date-filter-button">
            <Ionicons name="calendar" size={18} color={activeDateFilter ? '#fff' : C.accent} />
          </TouchableOpacity>
          <TouchableOpacity style={{ alignItems: 'center', justifyContent: 'center', backgroundColor: C.card, width: 46, height: 46, borderRadius: 12 }}
            onPress={() => setSortOrder(s => s === 'newest' ? 'oldest' : 'newest')} data-testid="sort-button">
            <Ionicons name={sortOrder === 'newest' ? 'arrow-down' : 'arrow-up'} size={18} color={C.accent} />
          </TouchableOpacity>
        </View>

        {/* Active date filter badge */}
        {activeDateFilter && (
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.accent + '15', marginHorizontal: 16, marginBottom: 8, padding: 10, borderRadius: 10, gap: 8 }}>
            <Ionicons name="calendar" size={16} color={C.accent} />
            <Text style={{ flex: 1, fontSize: 13, color: C.accent, fontWeight: '500' }}>
              {activeDateFilter.type === 'created' ? 'Creees' : 'Location'}: {format(new Date(activeDateFilter.start), 'dd/MM/yy')} - {format(new Date(activeDateFilter.end), 'dd/MM/yy')}
            </Text>
            <TouchableOpacity onPress={() => setActiveDateFilter(null)}><Ionicons name="close-circle" size={18} color={C.error} /></TouchableOpacity>
          </View>
        )}

        {/* Stats */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 12 }}>
          {[
            { val: stats.total, label: 'Reservations', color: C.text },
            { val: stats.confirmed, label: 'Actives', color: C.success },
            { val: `CHF ${stats.revenue.toFixed(0)}`, label: 'Revenus', color: C.accent },
          ].map((s, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: C.card, borderRadius: 12, padding: 12, alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: s.color }}>{s.val}</Text>
              <Text style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Filter tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }} style={{ maxHeight: 50 }}>
          {STATUS_OPTIONS.map(opt => (
            <TouchableOpacity key={opt.value || 'all'}
              style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: statusFilter === opt.value ? C.accent : C.card, gap: 6 }}
              onPress={() => setStatusFilter(opt.value)} data-testid={`filter-tab-${opt.value || 'all'}`}>
              <Ionicons name={opt.icon as any} size={16} color={statusFilter === opt.value ? '#fff' : C.textLight} />
              <Text style={{ fontSize: 13, fontWeight: '500', color: statusFilter === opt.value ? '#fff' : C.textLight }}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Results */}
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
          <Text style={{ fontSize: 13, color: C.textLight }} data-testid="results-count">
            {filteredReservations.length} resultat{filteredReservations.length > 1 ? 's' : ''}{searchQuery && ` pour "${searchQuery}"`}
          </Text>
        </View>

        {/* Cards */}
        <View style={{ padding: 16, paddingTop: 8 }}>
          {filteredReservations.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Ionicons name="calendar-outline" size={48} color={C.textLight} />
              <Text style={{ fontSize: 16, color: C.textLight, marginTop: 12 }}>Aucune reservation trouvee</Text>
            </View>
          ) : filteredReservations.map(item => (
            <ReservationCard key={item.id} item={item} C={C}
              onStatusPress={() => setActionModal({ type: 'status', reservation: item })}
              onPaymentPress={() => setActionModal({ type: 'payment', reservation: item })}
              onContractPress={() => handleContract(item.id)} />
          ))}
        </View>
      </ScrollView>

      <StatusActionModal visible={!!actionModal} type={actionModal?.type || 'status'} reservation={actionModal?.reservation || null} C={C}
        onClose={() => setActionModal(null)} onStatusChange={updateStatus} onPaymentChange={updatePayment} />

      <DateFilterModal visible={showDateFilter} C={C} onClose={() => setShowDateFilter(false)}
        onApply={(s, e, t) => setActiveDateFilter({ start: s, end: e, type: t })}
        onClear={() => setActiveDateFilter(null)} />
    </View>
  );
}
