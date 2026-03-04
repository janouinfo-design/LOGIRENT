import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../../src/theme/constants';
import { getInvoices, createInvoice, updateInvoiceStatus, getClients, getProjects, getTimeEntries } from '../../src/services/api';

const STATUS_COLORS: Record<string, string> = { draft: '#94A3B8', sent: '#2563EB', paid: '#059669', overdue: '#DC2626' };
const STATUS_LABELS: Record<string, string> = { draft: 'Brouillon', sent: 'Envoyee', paid: 'Payee', overdue: 'En retard' };

export default function InvoicesScreen() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [invRes, cliRes, projRes] = await Promise.all([getInvoices(), getClients(), getProjects({ active_only: true })]);
      setInvoices(invRes.data);
      setClients(cliRes.data);
      setProjects(projRes.data);
    } catch (err) { console.log(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const loadEntries = async () => {
    try {
      const res = await getTimeEntries({ status: 'approved', billable: true });
      setEntries(res.data);
    } catch (err) { console.log(err); }
  };

  const handleCreateInvoice = async () => {
    if (!selectedClient) return alert('Client requis');
    try {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      await createInvoice({
        client_id: selectedClient,
        project_id: selectedProject || null,
        timesheet_ids: selectedEntries,
        due_date: dueDate.toISOString(),
        notes: ''
      });
      setShowModal(false);
      setSelectedClient('');
      setSelectedProject('');
      setSelectedEntries([]);
      await loadData();
    } catch (err: any) { alert(err.response?.data?.detail || 'Erreur'); }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateInvoiceStatus(id, status);
      await loadData();
    } catch (err: any) { alert(err.response?.data?.detail || 'Erreur'); }
  };

  const totalAmount = invoices.reduce((s, i) => s + i.amount, 0);
  const paidAmount = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
  const pendingAmount = invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.amount, 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Factures</Text>
        <Pressable style={styles.addBtn} onPress={() => { setShowModal(true); loadEntries(); }} data-testid="create-invoice-btn">
          <Text style={styles.addBtnText}>+ Nouvelle facture</Text>
        </Pressable>
      </View>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { borderLeftColor: '#059669' }]}><Text style={[styles.summaryValue, { color: '#059669' }]}>{paidAmount.toFixed(0)} CHF</Text><Text style={styles.summaryLabel}>Payees</Text></View>
        <View style={[styles.summaryCard, { borderLeftColor: '#F59E0B' }]}><Text style={[styles.summaryValue, { color: '#F59E0B' }]}>{pendingAmount.toFixed(0)} CHF</Text><Text style={styles.summaryLabel}>En cours</Text></View>
        <View style={[styles.summaryCard, { borderLeftColor: colors.primary }]}><Text style={[styles.summaryValue, { color: colors.primary }]}>{totalAmount.toFixed(0)} CHF</Text><Text style={styles.summaryLabel}>Total</Text></View>
      </View>

      {loading ? <ActivityIndicator size="large" color={colors.primary} /> : invoices.length === 0 ? (
        <View style={styles.empty}><MaterialIcons name="receipt" size={48} color={colors.borderLight} /><Text style={styles.emptyText}>Aucune facture</Text></View>
      ) : (
        invoices.map(inv => (
          <View key={inv.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.invoiceNum}>{inv.invoice_number}</Text>
                <Text style={styles.clientName}>{inv.client_name}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[inv.status] || '#94A3B8') + '22' }]}>
                <Text style={[styles.statusText, { color: STATUS_COLORS[inv.status] || '#94A3B8' }]}>{STATUS_LABELS[inv.status] || inv.status}</Text>
              </View>
            </View>
            <View style={styles.cardBody}>
              <View style={styles.cardRow}><Text style={styles.cardLabel}>Montant</Text><Text style={styles.cardValue}>{inv.amount.toFixed(2)} CHF</Text></View>
              <View style={styles.cardRow}><Text style={styles.cardLabel}>Heures</Text><Text style={styles.cardValue}>{inv.hours}h</Text></View>
              {inv.project_name && <View style={styles.cardRow}><Text style={styles.cardLabel}>Projet</Text><Text style={styles.cardValue}>{inv.project_name}</Text></View>}
            </View>
            <View style={styles.actionRow}>
              {inv.status === 'draft' && <Pressable style={[styles.statusBtn, { backgroundColor: '#2563EB' }]} onPress={() => handleStatusChange(inv.id, 'sent')}><Text style={styles.statusBtnText}>Envoyer</Text></Pressable>}
              {inv.status === 'sent' && <Pressable style={[styles.statusBtn, { backgroundColor: '#059669' }]} onPress={() => handleStatusChange(inv.id, 'paid')}><Text style={styles.statusBtnText}>Payer</Text></Pressable>}
              {(inv.status === 'sent' || inv.status === 'draft') && <Pressable style={[styles.statusBtn, { backgroundColor: '#DC2626' }]} onPress={() => handleStatusChange(inv.id, 'overdue')}><Text style={styles.statusBtnText}>En retard</Text></Pressable>}
            </View>
          </View>
        ))
      )}

      {/* Create Invoice Modal */}
      <Modal visible={showModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowModal(false)}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modal} onStartShouldSetResponder={() => true}>
              <Text style={styles.modalTitle}>Nouvelle facture</Text>
              <Text style={styles.label}>Client</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                {clients.map((c: any) => (
                  <Pressable key={c.id} style={[styles.chip, selectedClient === c.id && styles.chipActive]} onPress={() => setSelectedClient(c.id)}>
                    <Text style={[styles.chipText, selectedClient === c.id && styles.chipTextActive]}>{c.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Text style={styles.label}>Projet (optionnel)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                <Pressable style={[styles.chip, !selectedProject && styles.chipActive]} onPress={() => setSelectedProject('')}>
                  <Text style={[styles.chipText, !selectedProject && styles.chipTextActive]}>Aucun</Text>
                </Pressable>
                {projects.map((p: any) => (
                  <Pressable key={p.id} style={[styles.chip, selectedProject === p.id && styles.chipActive]} onPress={() => setSelectedProject(p.id)}>
                    <Text style={[styles.chipText, selectedProject === p.id && styles.chipTextActive]}>{p.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Text style={styles.label}>Pointages facturables ({entries.length} disponibles)</Text>
              <ScrollView style={{ maxHeight: 200, marginBottom: spacing.md }}>
                {entries.map(e => (
                  <Pressable key={e.id} style={[styles.entryItem, selectedEntries.includes(e.id) && styles.entryItemActive]} onPress={() => setSelectedEntries(prev => prev.includes(e.id) ? prev.filter(x => x !== e.id) : [...prev, e.id])}>
                    <MaterialIcons name={selectedEntries.includes(e.id) ? 'check-box' : 'check-box-outline-blank'} size={20} color={selectedEntries.includes(e.id) ? colors.primary : colors.textLight} />
                    <Text style={styles.entryText}>{e.date} - {e.user_name} - {e.duration.toFixed(1)}h</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <View style={styles.modalActions}>
                <Pressable style={styles.cancelBtn} onPress={() => setShowModal(false)}><Text style={styles.cancelText}>Annuler</Text></Pressable>
                <Pressable style={styles.submitBtn} onPress={handleCreateInvoice}><Text style={styles.submitText}>Creer</Text></Pressable>
              </View>
            </View>
          </ScrollView>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  addBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.sm },
  addBtnText: { color: '#FFF', fontSize: fontSize.sm, fontWeight: '600' },
  summaryRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  summaryCard: { flex: 1, backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 4 },
  summaryValue: { fontSize: fontSize.lg, fontWeight: '800' },
  summaryLabel: { fontSize: fontSize.xs, color: colors.textLight },
  empty: { alignItems: 'center', paddingVertical: 60, gap: spacing.sm },
  emptyText: { color: colors.textLight, fontSize: fontSize.md },
  card: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  invoiceNum: { fontSize: fontSize.md, fontWeight: '800', color: colors.text },
  clientName: { fontSize: fontSize.sm, color: colors.primary },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: fontSize.xs, fontWeight: '700' },
  cardBody: { gap: 4, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cardLabel: { fontSize: fontSize.sm, color: colors.textLight },
  cardValue: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  statusBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: borderRadius.sm },
  statusBtnText: { color: '#FFF', fontSize: fontSize.sm, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalScrollContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.md },
  modal: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, width: '100%', maxWidth: 520 },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.lg },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, marginRight: spacing.sm },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: fontSize.sm, color: colors.textLight },
  chipTextActive: { color: '#FFF', fontWeight: '600' },
  entryItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 8, paddingHorizontal: spacing.sm, borderRadius: borderRadius.sm },
  entryItemActive: { backgroundColor: colors.primaryLight },
  entryText: { fontSize: fontSize.sm, color: colors.text },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md, marginTop: spacing.md },
  cancelBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  cancelText: { color: colors.textLight, fontSize: fontSize.md },
  submitBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.sm },
  submitText: { color: '#FFF', fontSize: fontSize.md, fontWeight: '600' },
});
