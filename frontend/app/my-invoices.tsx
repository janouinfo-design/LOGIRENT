import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, useWindowDimensions, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import api from '../src/api/axios';

const ACCENT = '#7C3AED';
const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const STATUS_MAP: Record<string, { bg: string; text: string; label: string; icon: string }> = {
  draft: { bg: '#6B728015', text: '#6B7280', label: 'Brouillon', icon: 'document-outline' },
  pending: { bg: '#F59E0B15', text: '#B45309', label: 'En attente', icon: 'time-outline' },
  partially_paid: { bg: '#3B82F615', text: '#1D4ED8', label: 'Partiel', icon: 'card-outline' },
  paid: { bg: '#10B98115', text: '#059669', label: 'Paye', icon: 'checkmark-circle' },
  overdue: { bg: '#EF444415', text: '#DC2626', label: 'En retard', icon: 'alert-circle' },
  cancelled: { bg: '#6B728015', text: '#6B7280', label: 'Annulee', icon: 'close-circle-outline' },
  refunded: { bg: '#8B5CF615', text: '#7C3AED', label: 'Rembourse', icon: 'return-down-back' },
};

const TYPE_LABELS: Record<string, string> = {
  deposit: 'Acompte',
  reservation: 'Reservation',
  final: 'Finale',
  penalty: 'Penalite',
  credit_note: 'Avoir',
};

export default function MyInvoicesScreen() {
  const router = useRouter();
  const { token, user } = useAuthStore();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [paying, setPaying] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const res = await api.get('/api/invoices');
        setInvoices(res.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchInvoices();
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return invoices;
    if (filter === 'unpaid') return invoices.filter(i => ['pending', 'overdue', 'partially_paid'].includes(i.status));
    return invoices.filter(i => i.status === filter);
  }, [invoices, filter]);

  const totalOwed = invoices
    .filter(i => ['pending', 'overdue', 'partially_paid'].includes(i.status))
    .reduce((s, i) => s + (i.balance_due || 0), 0);

  const handleDownload = async (inv: any) => {
    try {
      const res = await api.get(`/api/invoices/${inv.id}/pdf`, { responseType: 'blob' });
      if (Platform.OS === 'web') {
        const blob = new Blob([res.data], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${inv.invoice_number}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de telecharger le PDF');
    }
  };

  const handlePay = async (invId: string, method: string) => {
    setPaying(invId);
    try {
      const origin = Platform.OS === 'web' ? window.location.origin : API_URL;
      const res = await api.post(`/api/invoices/${invId}/pay?payment_method=${method}&origin_url=${encodeURIComponent(origin || '')}`);
      if (res.data.url && Platform.OS === 'web') {
        window.location.href = res.data.url;
      }
    } catch (e: any) {
      Alert.alert('Erreur', e.response?.data?.detail || 'Erreur de paiement');
    }
    setPaying(null);
  };

  if (loading) return <View style={s.loadingContainer}><ActivityIndicator size="large" color={ACCENT} /></View>;

  return (
    <View style={s.container} data-testid="my-invoices-page">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} data-testid="invoices-back-btn">
            <Ionicons name="arrow-back" size={22} color="#374151" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Mes factures</Text>
            <Text style={s.subtitle}>{invoices.length} facture{invoices.length > 1 ? 's' : ''}</Text>
          </View>
        </View>

        {/* Balance Card */}
        {totalOwed > 0 && (
          <View style={s.balanceCard} data-testid="balance-card">
            <Ionicons name="wallet" size={28} color="#fff" />
            <View style={{ flex: 1 }}>
              <Text style={s.balanceLabel}>Solde a payer</Text>
              <Text style={s.balanceAmount}>CHF {totalOwed.toFixed(2)}</Text>
            </View>
          </View>
        )}

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
          {[
            { key: 'all', label: 'Toutes' },
            { key: 'unpaid', label: 'A payer' },
            { key: 'paid', label: 'Payees' },
          ].map(f => (
            <TouchableOpacity
              key={f.key}
              style={[s.filterPill, filter === f.key && s.filterActive]}
              onPress={() => setFilter(f.key)}
              data-testid={`client-filter-${f.key}`}
            >
              <Text style={[s.filterText, filter === f.key && s.filterTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Invoice List */}
        {filtered.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="receipt-outline" size={48} color="#D1D5DB" />
            <Text style={s.emptyText}>Aucune facture</Text>
          </View>
        ) : (
          filtered.map(inv => {
            const sm = STATUS_MAP[inv.status] || STATUS_MAP.draft;
            const canPay = ['pending', 'overdue', 'partially_paid'].includes(inv.status);
            return (
              <View key={inv.id} style={s.card} data-testid={`client-invoice-${inv.id}`}>
                <View style={s.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.invNumber}>{inv.invoice_number}</Text>
                    <Text style={s.invVehicle}>{inv.vehicle_name || 'Location vehicule'}</Text>
                  </View>
                  <View style={[s.statusBadge, { backgroundColor: sm.bg }]}>
                    <Ionicons name={sm.icon as any} size={14} color={sm.text} />
                    <Text style={{ color: sm.text, fontSize: 12, fontWeight: '700' }}>{sm.label}</Text>
                  </View>
                </View>

                <View style={s.cardMeta}>
                  <View style={s.metaRow}>
                    <Ionicons name="document-text-outline" size={14} color="#6B7280" />
                    <Text style={s.metaText}>{TYPE_LABELS[inv.invoice_type] || inv.invoice_type}</Text>
                  </View>
                  <View style={s.metaRow}>
                    <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                    <Text style={s.metaText}>{inv.issue_date}</Text>
                  </View>
                  {inv.start_date && (
                    <View style={s.metaRow}>
                      <Ionicons name="time-outline" size={14} color="#6B7280" />
                      <Text style={s.metaText}>{inv.start_date} - {inv.end_date}</Text>
                    </View>
                  )}
                </View>

                <View style={s.cardAmounts}>
                  <View>
                    <Text style={s.amountLabel}>Total TTC</Text>
                    <Text style={s.amountValue}>CHF {inv.total_incl_tax?.toFixed(2)}</Text>
                  </View>
                  {inv.balance_due > 0 && canPay && (
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={s.amountLabel}>Solde du</Text>
                      <Text style={[s.amountValue, { color: '#DC2626' }]}>CHF {inv.balance_due.toFixed(2)}</Text>
                    </View>
                  )}
                </View>

                <View style={s.cardActions}>
                  <TouchableOpacity style={s.downloadBtn} onPress={() => handleDownload(inv)} data-testid={`client-pdf-${inv.id}`}>
                    <Ionicons name="download-outline" size={16} color={ACCENT} />
                    <Text style={{ color: ACCENT, fontSize: 13, fontWeight: '700' }}>PDF / QR-Facture</Text>
                  </TouchableOpacity>

                  {canPay && (
                    <View style={s.payBtns}>
                      <TouchableOpacity
                        style={s.payCardBtn}
                        onPress={() => handlePay(inv.id, 'stripe_card')}
                        disabled={paying === inv.id}
                        data-testid={`pay-card-${inv.id}`}
                      >
                        {paying === inv.id ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <>
                            <Ionicons name="card" size={16} color="#fff" />
                            <Text style={s.payBtnText}>Carte</Text>
                          </>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={s.payTwintBtn}
                        onPress={() => handlePay(inv.id, 'stripe_twint')}
                        disabled={paying === inv.id}
                        data-testid={`pay-twint-${inv.id}`}
                      >
                        <Text style={s.twintText}>TWINT</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  title: { fontSize: 22, fontWeight: '900', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6B7280' },
  balanceCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#DC2626', borderRadius: 16, padding: 18, marginBottom: 16 },
  balanceLabel: { color: '#FECACA', fontSize: 13, fontWeight: '600' },
  balanceAmount: { color: '#fff', fontSize: 26, fontWeight: '900' },
  filterPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB' },
  filterActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  filterText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  filterTextActive: { color: '#fff' },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: '#9CA3AF', fontSize: 16, fontWeight: '600', marginTop: 12 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  invNumber: { fontSize: 16, fontWeight: '800', color: '#111827' },
  invVehicle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: '#6B7280', fontSize: 12 },
  cardAmounts: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  amountLabel: { color: '#6B7280', fontSize: 11, fontWeight: '600' },
  amountValue: { color: '#111827', fontSize: 20, fontWeight: '900' },
  cardActions: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  downloadBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: ACCENT + '40', backgroundColor: ACCENT + '08', marginBottom: 8 },
  payBtns: { flexDirection: 'row', gap: 8 },
  payCardBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#111827', paddingVertical: 12, borderRadius: 10 },
  payBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  payTwintBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#00A3E0', paddingVertical: 12, borderRadius: 10 },
  twintText: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 1 },
});
