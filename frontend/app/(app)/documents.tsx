import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../../src/theme/constants';
import { useAuth } from '../../src/context/AuthContext';
import { getDocuments, createDocument, deleteDocument, getUsers } from '../../src/services/api';

const CATEGORIES = [
  { key: 'Contrat', icon: 'description', color: '#2563EB' },
  { key: 'Certificat', icon: 'verified', color: '#059669' },
  { key: 'Formation', icon: 'school', color: '#6366F1' },
  { key: 'Evaluation', icon: 'star', color: '#F59E0B' },
  { key: 'Medical', icon: 'local-hospital', color: '#EF4444' },
  { key: 'Administratif', icon: 'folder', color: '#8B5CF6' },
  { key: 'Autre', icon: 'insert-drive-file', color: '#94A3B8' },
];

export default function DocumentsScreen() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [form, setForm] = useState({ title: '', category: 'Contrat', content: '', target_user_id: '' });
  const isManager = user?.role === 'manager' || user?.role === 'admin';

  const loadData = useCallback(async () => {
    try {
      const params: any = {};
      if (filterCat) params.category = filterCat;
      const [docRes, usrRes] = await Promise.all([getDocuments(params), isManager ? getUsers() : Promise.resolve({ data: [] })]);
      setDocs(docRes.data); setUsers(usrRes.data);
    } catch (e) { console.log(e); } finally { setLoading(false); }
  }, [filterCat]);
  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    if (!form.title) return alert('Titre requis');
    try { await createDocument(form); setShowModal(false); setForm({ title: '', category: 'Contrat', content: '', target_user_id: '' }); await loadData(); } catch (e: any) { alert(e.response?.data?.detail || 'Erreur'); }
  };

  const getCatCfg = (cat: string) => CATEGORIES.find(c => c.key === cat) || CATEGORIES[6];

  const filtered = docs.filter(d => {
    const matchCat = !filterCat || d.category === filterCat;
    const matchSearch = `${d.title} ${d.category} ${d.user_name || ''} ${d.content || ''}`.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const catFilters = [{ key: '', label: 'Tous' }, ...CATEGORIES.map(c => ({ key: c.key, label: c.key }))];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title} data-testid="documents-title">Dossier RH</Text>
        {isManager && <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)} data-testid="add-document-btn"><Text style={styles.addBtnText}>+ Nouveau document</Text></TouchableOpacity>}
      </View>

      <View style={styles.searchRow} data-testid="documents-search-bar">
        <MaterialIcons name="search" size={20} color={colors.textLight} style={{ marginRight: spacing.sm }} />
        <TextInput style={styles.searchInput} placeholder="Rechercher par titre, categorie, employe..." value={search} onChangeText={setSearch} placeholderTextColor={colors.textLight} data-testid="documents-search-input" />
        {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')}><MaterialIcons name="close" size={18} color={colors.textLight} /></TouchableOpacity>}
      </View>

      <View style={styles.filterRow}>
        {catFilters.map(f => (
          <TouchableOpacity key={f.key} style={[styles.filterChip, filterCat === f.key && styles.filterChipActive]} onPress={() => setFilterCat(f.key)}>
            <Text style={[styles.filterChipText, filterCat === f.key && styles.filterChipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} /> : filtered.length === 0 ? (
        <View style={styles.empty}><MaterialIcons name="folder-open" size={48} color={colors.borderLight} /><Text style={styles.emptyText}>Aucun document</Text></View>
      ) : (
        <View style={styles.grid}>
          {filtered.map(doc => {
            const cfg = getCatCfg(doc.category);
            return (
              <View key={doc.id} style={styles.card} data-testid={`doc-card-${doc.id}`}>
                <View style={styles.cardTop}>
                  <View style={[styles.catIcon, { backgroundColor: cfg.color + '18' }]}>
                    <MaterialIcons name={cfg.icon as any} size={20} color={cfg.color} />
                  </View>
                  <View style={[styles.catBadge, { backgroundColor: cfg.color + '18' }]}>
                    <Text style={[styles.catBadgeText, { color: cfg.color }]}>{doc.category}</Text>
                  </View>
                </View>
                <Text style={styles.cardTitle}>{doc.title}</Text>
                {doc.content ? <Text style={styles.cardContent} numberOfLines={2}>{doc.content}</Text> : null}
                <View style={styles.cardMeta}>
                  <View style={styles.metaItem}><MaterialIcons name="person" size={12} color={colors.textLight} /><Text style={styles.metaText}>{doc.user_name}</Text></View>
                  <View style={styles.metaItem}><MaterialIcons name="date-range" size={12} color={colors.textLight} /><Text style={styles.metaText}>{new Date(doc.created_at).toLocaleDateString('fr-CH')}</Text></View>
                </View>
                {isManager && (
                  <View style={styles.cardFooter}>
                    <TouchableOpacity style={styles.deleteBtn} onPress={async () => { await deleteDocument(doc.id); loadData(); }} data-testid={`delete-doc-${doc.id}`}>
                      <MaterialIcons name="delete-outline" size={16} color={colors.error} />
                      <Text style={styles.deleteBtnText}>Supprimer</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Nouveau document</Text><TouchableOpacity onPress={() => setShowModal(false)}><MaterialIcons name="close" size={24} color={colors.textLight} /></TouchableOpacity></View>
            <TextInput style={styles.input} placeholder="Titre" value={form.title} onChangeText={v => setForm({ ...form, title: v })} placeholderTextColor={colors.textLight} data-testid="doc-title-input" />
            <Text style={styles.label}>Categorie</Text>
            <View style={styles.catRow}>
              {CATEGORIES.map(c => (<TouchableOpacity key={c.key} style={[styles.catChip, form.category === c.key && { backgroundColor: c.color, borderColor: c.color }]} onPress={() => setForm({ ...form, category: c.key })}><MaterialIcons name={c.icon as any} size={14} color={form.category === c.key ? '#FFF' : c.color} /><Text style={[styles.catChipText, form.category === c.key && { color: '#FFF', fontWeight: '600' }]}>{c.key}</Text></TouchableOpacity>))}
            </View>
            <TextInput style={[styles.input, { minHeight: 80 }]} placeholder="Contenu / Notes" value={form.content} onChangeText={v => setForm({ ...form, content: v })} multiline placeholderTextColor={colors.textLight} data-testid="doc-content-input" />
            {isManager && users.length > 0 && (
              <><Text style={styles.label}>Employe</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                <TouchableOpacity style={[styles.chip, !form.target_user_id && styles.chipActive]} onPress={() => setForm({ ...form, target_user_id: '' })}><Text style={[styles.chipText, !form.target_user_id && styles.chipTextActive]}>Moi</Text></TouchableOpacity>
                {users.map(u => (<TouchableOpacity key={u.id} style={[styles.chip, form.target_user_id === u.id && styles.chipActive]} onPress={() => setForm({ ...form, target_user_id: u.id })}><Text style={[styles.chipText, form.target_user_id === u.id && styles.chipTextActive]}>{u.first_name} {u.last_name}</Text></TouchableOpacity>))}
              </ScrollView></>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}><Text style={styles.cancelBtnText}>Annuler</Text></TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleCreate} data-testid="submit-doc"><Text style={styles.submitBtnText}>Creer</Text></TouchableOpacity>
            </View>
          </View>
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
  card: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.lg, minWidth: 260, flex: 1, maxWidth: '32%', borderWidth: 1, borderColor: colors.border },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  catIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  catBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.full },
  catBadgeText: { fontSize: fontSize.xs, fontWeight: '600' },
  cardTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  cardContent: { fontSize: fontSize.xs, color: colors.textLight, marginBottom: spacing.sm },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: fontSize.xs, color: colors.textLight },
  cardFooter: { paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight, marginTop: spacing.sm },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  deleteBtnText: { fontSize: fontSize.sm, color: colors.error, fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, width: '90%', maxWidth: 500 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.sm, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: fontSize.md, color: colors.text, marginBottom: spacing.md, backgroundColor: colors.background },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  catChipText: { fontSize: fontSize.sm, color: colors.textLight },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, marginRight: spacing.sm },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: fontSize.sm, color: colors.textLight },
  chipTextActive: { color: '#FFF', fontWeight: '600' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md, marginTop: spacing.md },
  cancelBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  cancelBtnText: { color: colors.textLight, fontSize: fontSize.md },
  submitBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.sm },
  submitBtnText: { color: '#FFF', fontSize: fontSize.md, fontWeight: '600' },
});
