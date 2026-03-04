import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../../src/theme/constants';
import { getInvoices, createInvoice, updateInvoiceStatus, getClients, getProjects, getTimeEntries } from '../../src/services/api';

const STATUS_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  draft: { icon: 'edit-note', color: '#94A3B8', label: 'Brouillon' },
  sent: { icon: 'send', color: '#2563EB', label: 'Envoyee' },
  paid: { icon: 'check-circle', color: '#059669', label: 'Payee' },
  overdue: { icon: 'warning', color: '#DC2626', label: 'En retard' },
};

export default function InvoicesScreen() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [invRes, cliRes, projRes] = await Promise.all([getInvoices(), getClients(), getProjects({ active_only: true })]);
      setInvoices(invRes.data); setClients(cliRes.data); setProjects(projRes.data);
    } catch (err) { console.log(err); } finally { setLoading(false); }
  }, []);
  useEffect(() => { loadData(); }, [loadData]);

  const loadEntries = async () => { try { const res = await getTimeEntries({ status: 'approved', billable: true }); setEntries(res.data); } catch (err) { console.log(err); } };

  const handleCreate = async () => {
    if (!selectedClient) return alert('Client requis');
    try {
      const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + 30);
      await createInvoice({ client_id: selectedClient, project_id: selectedProject || null, timesheet_ids: selectedEntries, due_date: dueDate.toISOString(), notes: '' });
      setShowModal(false); setSelectedClient(''); setSelectedProject(''); setSelectedEntries([]); await loadData();
    } catch (err: any) { alert(err.response?.data?.detail || 'Erreur'); }
  };

  const handleStatus = async (id: string, status: string) => { try { await updateInvoiceStatus(id, status); await loadData(); } catch (err: any) { alert(err.response?.data?.detail || 'Erreur'); } };

  const totalAmount = invoices.reduce((s, i) => s + i.amount, 0);
  const paidAmount = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
  const pendingAmount = invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.amount, 0);

  const statusFilters = [{ key: 'all', label: 'Tous' }, { key: 'draft', label: 'Brouillons' }, { key: 'sent', label: 'Envoyees' }, { key: 'paid', label: 'Payees' }, { key: 'overdue', label: 'En retard' }];

  const filtered = invoices.filter(inv => {
    const matchSearch = `${inv.invoice_number} ${inv.client_name} ${inv.project_name || ''} ${inv.amount}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || inv.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title} data-testid="invoices-title">Factures</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => { setShowModal(true); loadEntries(); }} data-testid="create-invoice-btn">
          <Text style={styles.addBtnText}>+ Nouvelle facture</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { borderLeftColor: '#059669' }]}><Text style={[styles.summaryValue, { color: '#059669' }]}>{paidAmount.toFixed(0)} CHF</Text><Text style={styles.summaryLabel}>Payees</Text></View>
        <View style={[styles.summaryCard, { borderLeftColor: '#F59E0B' }]}><Text style={[styles.summaryValue, { color: '#F59E0B' }]}>{pendingAmount.toFixed(0)} CHF</Text><Text style={styles.summaryLabel}>En cours</Text></View>
        <View style={[styles.summaryCard, { borderLeftColor: colors.primary }]}><Text style={[styles.summaryValue, { color: colors.primary }]}>{totalAmount.toFixed(0)} CHF</Text><Text style={styles.summaryLabel}>Total</Text></View>
      </View>

      <View style={styles.searchRow} data-testid="invoices-search-bar">
        <MaterialIcons name="search" size={20} color={colors.textLight} style={{ marginRight: spacing.sm }} />
        <TextInput style={styles.searchInput} placeholder="Rechercher par numero, client, projet..." value={search} onChangeText={setSearch} placeholderTextColor={colors.textLight} data-testid="invoices-search-input" />
        {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')}><MaterialIcons name="close" size={18} color={colors.textLight} /></TouchableOpacity>}
      </View>

      <View style={styles.filterRow}>
        {statusFilters.map(f => (
          <TouchableOpacity key={f.key} style={[styles.filterChip, filterStatus === f.key && styles.filterChipActive]} onPress={() => setFilterStatus(f.key)}>
            <Text style={[styles.filterChipText, filterStatus === f.key && styles.filterChipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} /> : filtered.length === 0 ? (
        <View style={styles.empty}><MaterialIcons name="receipt" size={48} color={colors.borderLight} /><Text style={styles.emptyText}>Aucune facture</Text></View>
      ) : (
        <View style={styles.grid}>
          {filtered.map(inv => {
            const sc = STATUS_CONFIG[inv.status] || STATUS_CONFIG.draft;
            return (
              <View key={inv.id} style={styles.card} data-testid={`invoice-card-${inv.id}`}>
                <View style={styles.cardTop}>
                  <View style={[styles.typeIcon, { backgroundColor: sc.color + '18' }]}>
                    <MaterialIcons name={sc.icon as any} size={20} color={sc.color} />
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: sc.color + '18' }]}>
                    <Text style={[styles.statusText, { color: sc.color }]}>{sc.label}</Text>
                  </View>
                </View>
                <Text style={styles.cardNum}>{inv.invoice_number}</Text>
                <Text style={styles.cardClient}>{inv.client_name}</Text>
                <Text style={styles.cardAmount}>{inv.amount.toFixed(2)} CHF</Text>
                <View style={styles.cardMeta}>
                  <View style={styles.metaItem}><MaterialIcons name="schedule" size={12} color={colors.textLight} /><Text style={styles.metaText}>{inv.hours}h</Text></View>
                  {inv.project_name && <View style={styles.metaItem}><MaterialIcons name="folder" size={12} color={colors.textLight} /><Text style={styles.metaText}>{inv.project_name}</Text></View>}
                </View>
                <View style={styles.cardFooter}>
                  {inv.status === 'draft' && <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#2563EB' }]} onPress={() => handleStatus(inv.id, 'sent')}><MaterialIcons name="send" size={14} color="#FFF" /><Text style={styles.actionBtnText}>Envoyer</Text></TouchableOpacity>}
                  {inv.status === 'sent' && <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#059669' }]} onPress={() => handleStatus(inv.id, 'paid')}><MaterialIcons name="check" size={14} color="#FFF" /><Text style={styles.actionBtnText}>Payer</Text></TouchableOpacity>}
                  {(inv.status === 'sent' || inv.status === 'draft') && <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#DC2626' }]} onPress={() => handleStatus(inv.id, 'overdue')}><MaterialIcons name="warning" size={14} color="#FFF" /><Text style={styles.actionBtnText}>En retard</Text></TouchableOpacity>}
                </View>
              </View>
            );
          })}
        </View>
      )}

      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modal}>
              <View style={styles.modalHeader}><Text style={styles.modalTitle}>Nouvelle facture</Text><TouchableOpacity onPress={() => setShowModal(false)}><MaterialIcons name="close" size={24} color={colors.textLight} /></TouchableOpacity></View>
              <Text style={styles.label}>Client</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                {clients.map((c: any) => (<TouchableOpacity key={c.id} style={[styles.chip, selectedClient === c.id && styles.chipActive]} onPress={() => setSelectedClient(c.id)}><Text style={[styles.chipText, selectedClient === c.id && styles.chipTextActive]}>{c.name}</Text></TouchableOpacity>))}
              </ScrollView>
              <Text style={styles.label}>Projet (optionnel)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                <TouchableOpacity style={[styles.chip, !selectedProject && styles.chipActive]} onPress={() => setSelectedProject('')}><Text style={[styles.chipText, !selectedProject && styles.chipTextActive]}>Aucun</Text></TouchableOpacity>
                {projects.map((p: any) => (<TouchableOpacity key={p.id} style={[styles.chip, selectedProject === p.id && styles.chipActive]} onPress={() => setSelectedProject(p.id)}><Text style={[styles.chipText, selectedProject === p.id && styles.chipTextActive]}>{p.name}</Text></TouchableOpacity>))}
              </ScrollView>
              <Text style={styles.label}>Pointages ({entries.length} disponibles)</Text>
              <ScrollView style={{ maxHeight: 200, marginBottom: spacing.md }}>
                {entries.map(e => (<TouchableOpacity key={e.id} style={[styles.entryItem, selectedEntries.includes(e.id) && styles.entryItemActive]} onPress={() => setSelectedEntries(prev => prev.includes(e.id) ? prev.filter(x => x !== e.id) : [...prev, e.id])}><MaterialIcons name={selectedEntries.includes(e.id) ? 'check-box' : 'check-box-outline-blank'} size={20} color={selectedEntries.includes(e.id) ? colors.primary : colors.textLight} /><Text style={styles.entryText}>{e.date} - {e.user_name} - {e.duration.toFixed(1)}h</Text></TouchableOpacity>))}
              </ScrollView>
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}><Text style={styles.cancelBtnText}>Annuler</Text></TouchableOpacity>
                <TouchableOpacity style={styles.submitBtn} onPress={handleCreate} data-testid="submit-invoice"><Text style={styles.submitBtnText}>Creer</Text></TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  addBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.sm },
  addBtnText: { color: '#FFF', fontSize: fontSize.sm, fontWeight: '600' },
  summaryRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  summaryCard: { flex: 1, backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 4 },
  summaryValue: { fontSize: fontSize.lg, fontWeight: '800' },
  summaryLabel: { fontSize: fontSize.xs, color: colors.textLight },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, marginBottom: spacing.md },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: fontSize.md, color: colors.text },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontSize: fontSize.sm, color: colors.textLight, fontWeight: '500' },
  filterChipTextActive: { color: '#FFF', fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: spacing.sm },
  emptyText: { color: colors.textLight, fontSize: fontSize.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.lg, minWidth: 280, flex: 1, maxWidth: '48%', borderWidth: 1, borderColor: colors.border },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  typeIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.full },
  statusText: { fontSize: fontSize.xs, fontWeight: '600' },
  cardNum: { fontSize: fontSize.md, fontWeight: '800', color: colors.text },
  cardClient: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '500', marginBottom: spacing.xs },
  cardAmount: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
  cardMeta: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: fontSize.xs, color: colors.textLight },
  cardFooter: { flexDirection: 'row', gap: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: borderRadius.sm },
  actionBtnText: { color: '#FFF', fontSize: fontSize.xs, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalScrollContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.md },
  modal: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, width: '100%', maxWidth: 520 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
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
  cancelBtnText: { color: colors.textLight, fontSize: fontSize.md },
  submitBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.sm },
  submitBtnText: { color: '#FFF', fontSize: fontSize.md, fontWeight: '600' },
});
