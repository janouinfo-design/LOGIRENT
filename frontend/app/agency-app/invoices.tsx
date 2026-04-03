import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, useWindowDimensions, Modal, TextInput, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeStore } from '../../src/store/themeStore';
import api from '../../src/api/axios';

const ACCENT = '#7C3AED';

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: '#6B728018', text: '#6B7280', label: 'Brouillon' },
  pending: { bg: '#F59E0B18', text: '#B45309', label: 'En attente' },
  partially_paid: { bg: '#3B82F618', text: '#1D4ED8', label: 'Partiel' },
  paid: { bg: '#10B98118', text: '#059669', label: 'Paye' },
  overdue: { bg: '#EF444418', text: '#DC2626', label: 'En retard' },
  cancelled: { bg: '#6B728018', text: '#6B7280', label: 'Annulee' },
  refunded: { bg: '#8B5CF618', text: '#7C3AED', label: 'Rembourse' },
};

const TYPE_LABELS: Record<string, string> = {
  deposit: 'Acompte',
  reservation: 'Reservation',
  final: 'Finale',
  penalty: 'Penalite',
  credit_note: 'Avoir',
};

export default function InvoicesScreen() {
  const { colors: C } = useThemeStore();
  const { token } = useAuthStore();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [reservations, setReservations] = useState<any[]>([]);
  const [selectedResId, setSelectedResId] = useState('');
  const [invoiceType, setInvoiceType] = useState('reservation');
  const [creating, setCreating] = useState(false);
  const [showPenalty, setShowPenalty] = useState<string | null>(null);
  const [penaltyLabel, setPenaltyLabel] = useState('');
  const [penaltyAmount, setPenaltyAmount] = useState('');

  const fetchInvoices = async () => {
    try {
      const res = await api.get('/api/invoices');
      setInvoices(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchInvoices(); }, []);

  const filtered = useMemo(() => {
    let list = invoices;
    if (filter !== 'all') list = list.filter(i => i.status === filter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        i.invoice_number?.toLowerCase().includes(q) ||
        i.customer_name?.toLowerCase().includes(q) ||
        i.vehicle_name?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [invoices, filter, search]);

  const totalPending = invoices.filter(i => ['pending', 'overdue'].includes(i.status)).reduce((s, i) => s + (i.balance_due || 0), 0);
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total_incl_tax || 0), 0);

  const handleCreate = async () => {
    if (!selectedResId) return;
    setCreating(true);
    try {
      await api.post('/api/invoices/create-from-reservation', {
        reservation_id: selectedResId,
        invoice_type: invoiceType,
      });
      setShowCreate(false);
      setSelectedResId('');
      fetchInvoices();
    } catch (e: any) {
      Alert.alert('Erreur', e.response?.data?.detail || 'Erreur de creation');
    }
    setCreating(false);
  };

  const handleDownloadPdf = async (inv: any) => {
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

  const handleSendEmail = async (invId: string) => {
    try {
      await api.post(`/api/invoices/${invId}/send`);
      Alert.alert('Succes', 'Facture envoyee par email');
    } catch (e: any) {
      Alert.alert('Erreur', e.response?.data?.detail || 'Erreur');
    }
  };

  const handleMarkPaid = async (invId: string) => {
    try {
      await api.post(`/api/invoices/${invId}/mark-paid`, { payment_method: 'cash' });
      fetchInvoices();
    } catch (e: any) {
      Alert.alert('Erreur', e.response?.data?.detail || 'Erreur');
    }
  };

  const handleCreditNote = async (invId: string) => {
    try {
      await api.post(`/api/invoices/${invId}/credit-note`);
      fetchInvoices();
    } catch (e: any) {
      Alert.alert('Erreur', e.response?.data?.detail || 'Erreur');
    }
  };

  const handleAddPenalty = async () => {
    if (!showPenalty || !penaltyLabel || !penaltyAmount) return;
    try {
      await api.post(`/api/invoices/${showPenalty}/add-penalty`, {
        items: [{ code: 'PENALTY', label: penaltyLabel, quantity: 1, unit_price: parseFloat(penaltyAmount) }],
      });
      setShowPenalty(null);
      setPenaltyLabel('');
      setPenaltyAmount('');
      fetchInvoices();
    } catch (e: any) {
      Alert.alert('Erreur', e.response?.data?.detail || 'Erreur');
    }
  };

  const loadReservations = async () => {
    try {
      const res = await api.get('/api/admin/reservations');
      const data = res.data.reservations || res.data;
      setReservations(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  };

  if (loading) return <View style={[st.center, { backgroundColor: C.bg }]}><ActivityIndicator size="large" color={ACCENT} /></View>;

  return (
    <View style={[st.container, { backgroundColor: C.bg }]} data-testid="invoices-page">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
        {/* Header */}
        <View style={st.header}>
          <View>
            <Text style={[st.title, { color: C.text }]}>Factures</Text>
            <Text style={{ color: C.textLight, fontSize: 13 }}>{invoices.length} factures</Text>
          </View>
          <TouchableOpacity
            style={st.createBtn}
            onPress={() => { loadReservations(); setShowCreate(true); }}
            data-testid="create-invoice-btn"
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={st.createBtnText}>Nouvelle facture</Text>
          </TouchableOpacity>
        </View>

        {/* Summary Cards */}
        <View style={[st.summaryRow, !isWide && { flexDirection: 'column' }]}>
          <View style={[st.summaryCard, { backgroundColor: '#10B98112', borderColor: '#10B98130' }]}>
            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            <View>
              <Text style={{ color: '#6B7280', fontSize: 12 }}>Total paye</Text>
              <Text style={{ color: '#059669', fontSize: 20, fontWeight: '900' }}>CHF {totalPaid.toFixed(2)}</Text>
            </View>
          </View>
          <View style={[st.summaryCard, { backgroundColor: '#F59E0B12', borderColor: '#F59E0B30' }]}>
            <Ionicons name="time" size={24} color="#F59E0B" />
            <View>
              <Text style={{ color: '#6B7280', fontSize: 12 }}>En attente</Text>
              <Text style={{ color: '#B45309', fontSize: 20, fontWeight: '900' }}>CHF {totalPending.toFixed(2)}</Text>
            </View>
          </View>
          <View style={[st.summaryCard, { backgroundColor: ACCENT + '12', borderColor: ACCENT + '30' }]}>
            <Ionicons name="document-text" size={24} color={ACCENT} />
            <View>
              <Text style={{ color: '#6B7280', fontSize: 12 }}>Total factures</Text>
              <Text style={{ color: ACCENT, fontSize: 20, fontWeight: '900' }}>{invoices.length}</Text>
            </View>
          </View>
        </View>

        {/* Filters */}
        <View style={st.filtersRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {[
              { key: 'all', label: 'Toutes' },
              { key: 'pending', label: 'En attente' },
              { key: 'paid', label: 'Payees' },
              { key: 'overdue', label: 'En retard' },
              { key: 'cancelled', label: 'Annulees' },
            ].map(f => (
              <TouchableOpacity
                key={f.key}
                style={[st.filterPill, filter === f.key && { backgroundColor: ACCENT, borderColor: ACCENT }]}
                onPress={() => setFilter(f.key)}
                data-testid={`filter-${f.key}`}
              >
                <Text style={[st.filterText, filter === f.key && { color: '#fff' }]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={[st.searchBar, { borderColor: C.border }]}>
            <Ionicons name="search" size={16} color={C.textLight} />
            <TextInput
              style={[st.searchInput, { color: C.text }]}
              placeholder="Rechercher..."
              placeholderTextColor={C.textLight}
              value={search}
              onChangeText={setSearch}
              data-testid="invoice-search"
            />
          </View>
        </View>

        {/* Invoice List */}
        {filtered.length === 0 ? (
          <View style={st.emptyState}>
            <Ionicons name="document-text-outline" size={48} color={C.textLight} />
            <Text style={{ color: C.textLight, fontSize: 16, fontWeight: '600', marginTop: 12 }}>Aucune facture</Text>
          </View>
        ) : (
          filtered.map(inv => {
            const sc = STATUS_COLORS[inv.status] || STATUS_COLORS.draft;
            return (
              <View key={inv.id} style={[st.invoiceCard, { backgroundColor: C.card, borderColor: C.border }]} data-testid={`invoice-${inv.id}`}>
                <View style={st.invHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={[st.invNumber, { color: C.text }]}>{inv.invoice_number}</Text>
                      <View style={[st.statusBadge, { backgroundColor: sc.bg }]}>
                        <Text style={{ color: sc.text, fontSize: 11, fontWeight: '700' }}>{sc.label}</Text>
                      </View>
                      <View style={[st.typeBadge, { borderColor: C.border }]}>
                        <Text style={{ color: C.textLight, fontSize: 10, fontWeight: '600' }}>{TYPE_LABELS[inv.invoice_type] || inv.invoice_type}</Text>
                      </View>
                    </View>
                    <Text style={{ color: C.textLight, fontSize: 12, marginTop: 2 }}>
                      {inv.customer_name} {inv.vehicle_name ? `· ${inv.vehicle_name}` : ''}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[st.invAmount, { color: C.text }]}>CHF {inv.total_incl_tax?.toFixed(2)}</Text>
                    {inv.balance_due > 0 && inv.status !== 'paid' && (
                      <Text style={{ color: '#DC2626', fontSize: 11, fontWeight: '700' }}>Solde: CHF {inv.balance_due.toFixed(2)}</Text>
                    )}
                  </View>
                </View>
                <View style={[st.invMeta, { borderTopColor: C.border }]}>
                  <Text style={{ color: C.textLight, fontSize: 11 }}>Emise: {inv.issue_date}</Text>
                  <Text style={{ color: C.textLight, fontSize: 11 }}>Echeance: {inv.due_date}</Text>
                </View>
                <View style={st.invActions}>
                  <TouchableOpacity style={[st.actionBtn, { borderColor: C.border }]} onPress={() => handleDownloadPdf(inv)} data-testid={`pdf-${inv.id}`}>
                    <Ionicons name="download-outline" size={16} color={ACCENT} />
                    <Text style={{ color: ACCENT, fontSize: 12, fontWeight: '600' }}>PDF</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[st.actionBtn, { borderColor: C.border }]} onPress={() => handleSendEmail(inv.id)} data-testid={`send-${inv.id}`}>
                    <Ionicons name="mail-outline" size={16} color="#3B82F6" />
                    <Text style={{ color: '#3B82F6', fontSize: 12, fontWeight: '600' }}>Email</Text>
                  </TouchableOpacity>
                  {inv.status !== 'paid' && inv.status !== 'refunded' && inv.status !== 'cancelled' && (
                    <TouchableOpacity style={[st.actionBtn, { borderColor: '#10B98140', backgroundColor: '#10B98108' }]} onPress={() => handleMarkPaid(inv.id)} data-testid={`mark-paid-${inv.id}`}>
                      <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                      <Text style={{ color: '#059669', fontSize: 12, fontWeight: '600' }}>Paye</Text>
                    </TouchableOpacity>
                  )}
                  {inv.status !== 'refunded' && inv.status !== 'cancelled' && inv.invoice_type !== 'credit_note' && (
                    <TouchableOpacity style={[st.actionBtn, { borderColor: '#EF444440' }]} onPress={() => setShowPenalty(inv.id)}>
                      <Ionicons name="warning" size={16} color="#EF4444" />
                      <Text style={{ color: '#DC2626', fontSize: 12, fontWeight: '600' }}>Penalite</Text>
                    </TouchableOpacity>
                  )}
                  {inv.status === 'paid' && inv.invoice_type !== 'credit_note' && (
                    <TouchableOpacity style={[st.actionBtn, { borderColor: ACCENT + '40' }]} onPress={() => handleCreditNote(inv.id)}>
                      <Ionicons name="return-down-back" size={16} color={ACCENT} />
                      <Text style={{ color: ACCENT, fontSize: 12, fontWeight: '600' }}>Avoir</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Create Invoice Modal */}
      <Modal visible={showCreate} transparent animationType="fade" onRequestClose={() => setShowCreate(false)}>
        <View style={st.modalOverlay}>
          <View style={[st.modalContent, { backgroundColor: C.card }]}>
            <View style={st.modalHeader}>
              <Text style={[st.modalTitle, { color: C.text }]}>Nouvelle facture</Text>
              <TouchableOpacity onPress={() => setShowCreate(false)}><Ionicons name="close" size={24} color={C.text} /></TouchableOpacity>
            </View>
            <Text style={{ color: C.textLight, fontSize: 13, marginBottom: 8 }}>Type de facture</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {['reservation', 'deposit', 'final'].map(t => (
                <TouchableOpacity
                  key={t}
                  style={[st.typePill, invoiceType === t && { backgroundColor: ACCENT, borderColor: ACCENT }]}
                  onPress={() => setInvoiceType(t)}
                >
                  <Text style={[st.typePillText, invoiceType === t && { color: '#fff' }]}>{TYPE_LABELS[t]}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={{ color: C.textLight, fontSize: 13, marginBottom: 8 }}>Reservation</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {reservations.map(r => (
                <TouchableOpacity
                  key={r.id}
                  style={[st.resItem, { borderColor: C.border }, selectedResId === r.id && { borderColor: ACCENT, backgroundColor: ACCENT + '08' }]}
                  onPress={() => setSelectedResId(r.id)}
                >
                  <Text style={{ color: C.text, fontWeight: '700', fontSize: 14 }}>{r.vehicle_name || r.vehicle_id}</Text>
                  <Text style={{ color: C.textLight, fontSize: 12 }}>{r.user_name} · CHF {r.total_price?.toFixed(2)}</Text>
                  <Text style={{ color: C.textLight, fontSize: 11 }}>{r.status} · {r.payment_status}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[st.submitBtn, (!selectedResId || creating) && { opacity: 0.5 }]}
              onPress={handleCreate}
              disabled={!selectedResId || creating}
              data-testid="submit-create-invoice"
            >
              {creating ? <ActivityIndicator color="#fff" size="small" /> : <Text style={st.submitBtnText}>Creer la facture</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Penalty Modal */}
      <Modal visible={!!showPenalty} transparent animationType="fade" onRequestClose={() => setShowPenalty(null)}>
        <View style={st.modalOverlay}>
          <View style={[st.modalContent, { backgroundColor: C.card }]}>
            <View style={st.modalHeader}>
              <Text style={[st.modalTitle, { color: C.text }]}>Ajouter une penalite</Text>
              <TouchableOpacity onPress={() => setShowPenalty(null)}><Ionicons name="close" size={24} color={C.text} /></TouchableOpacity>
            </View>
            <Text style={{ color: C.textLight, fontSize: 13, marginBottom: 4 }}>Description</Text>
            <TextInput
              style={[st.input, { borderColor: C.border, color: C.text }]}
              placeholder="Ex: Retard retour, dommage constate..."
              placeholderTextColor={C.textLight}
              value={penaltyLabel}
              onChangeText={setPenaltyLabel}
            />
            <Text style={{ color: C.textLight, fontSize: 13, marginBottom: 4, marginTop: 12 }}>Montant (CHF)</Text>
            <TextInput
              style={[st.input, { borderColor: C.border, color: C.text }]}
              placeholder="Ex: 150"
              placeholderTextColor={C.textLight}
              value={penaltyAmount}
              onChangeText={setPenaltyAmount}
              keyboardType="numeric"
            />
            <TouchableOpacity
              style={[st.submitBtn, { backgroundColor: '#EF4444', marginTop: 16 }]}
              onPress={handleAddPenalty}
            >
              <Text style={st.submitBtnText}>Creer facture penalite</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '900' },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: ACCENT, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  createBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  summaryCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 14, borderWidth: 1 },
  filtersRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' },
  filterPill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  filterText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, minWidth: 180 },
  searchInput: { flex: 1, fontSize: 13 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  invoiceCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  invHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  invNumber: { fontSize: 15, fontWeight: '800' },
  invAmount: { fontSize: 18, fontWeight: '900' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  invMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTopWidth: 1 },
  invActions: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 500, borderRadius: 16, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  typePill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  typePillText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  resItem: { padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 },
  submitBtn: { backgroundColor: ACCENT, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
