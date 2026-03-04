import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../../src/theme/constants';
import { useAuth } from '../../src/context/AuthContext';
import { getDocuments, createDocument, deleteDocument, getUsers } from '../../src/services/api';

const CATEGORIES = ['Contrat', 'Certificat', 'Formation', 'Evaluation', 'Medical', 'Administratif', 'Autre'];
const CAT_ICONS: Record<string, string> = { Contrat: 'description', Certificat: 'verified', Formation: 'school', Evaluation: 'star', Medical: 'local-hospital', Administratif: 'folder', Autre: 'insert-drive-file' };

export default function DocumentsScreen() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterCat, setFilterCat] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [form, setForm] = useState({ title: '', category: 'Contrat', content: '', target_user_id: '' });
  const isManager = user?.role === 'manager' || user?.role === 'admin';

  const loadData = useCallback(async () => {
    try {
      const params: any = {};
      if (filterCat) params.category = filterCat;
      if (filterUser) params.target_user_id = filterUser;
      const [docRes, usrRes] = await Promise.all([getDocuments(params), isManager ? getUsers() : Promise.resolve({ data: [] })]);
      setDocs(docRes.data);
      setUsers(usrRes.data);
    } catch(e) { console.log(e); }
    finally { setLoading(false); }
  }, [filterCat, filterUser]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    if (!form.title) return alert('Titre requis');
    try {
      await createDocument(form);
      setShowModal(false);
      setForm({ title: '', category: 'Contrat', content: '', target_user_id: '' });
      await loadData();
    } catch(e: any) { alert(e.response?.data?.detail || 'Erreur'); }
  };

  const filtered = docs.filter(d => !filterCat || d.category === filterCat);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Dossier RH</Text>
        <Pressable style={styles.addBtn} onPress={() => setShowModal(true)}><Text style={styles.addBtnText}>+ Nouveau document</Text></Pressable>
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
        <Pressable style={[styles.chip, !filterCat && styles.chipActive]} onPress={() => setFilterCat('')}><Text style={[styles.chipText, !filterCat && styles.chipTextActive]}>Tous</Text></Pressable>
        {CATEGORIES.map(c => (
          <Pressable key={c} style={[styles.chip, filterCat === c && styles.chipActive]} onPress={() => setFilterCat(c)}>
            <Text style={[styles.chipText, filterCat === c && styles.chipTextActive]}>{c}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {isManager && users.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
          <Pressable style={[styles.chip, !filterUser && styles.chipActive]} onPress={() => setFilterUser('')}><Text style={[styles.chipText, !filterUser && styles.chipTextActive]}>Tous</Text></Pressable>
          {users.map(u => (
            <Pressable key={u.id} style={[styles.chip, filterUser === u.id && styles.chipActive]} onPress={() => setFilterUser(u.id)}>
              <Text style={[styles.chipText, filterUser === u.id && styles.chipTextActive]}>{u.first_name} {u.last_name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {loading ? <ActivityIndicator size="large" color={colors.primary} /> : filtered.length === 0 ? (
        <View style={styles.empty}><MaterialIcons name="folder-open" size={48} color={colors.borderLight} /><Text style={styles.emptyText}>Aucun document</Text></View>
      ) : (
        <View style={styles.grid}>
          {filtered.map(doc => (
            <View key={doc.id} style={styles.card}>
              <View style={styles.cardIcon}><MaterialIcons name={(CAT_ICONS[doc.category] || 'insert-drive-file') as any} size={28} color={colors.primary} /></View>
              <Text style={styles.cardTitle}>{doc.title}</Text>
              <View style={styles.catBadge}><Text style={styles.catBadgeText}>{doc.category}</Text></View>
              {doc.content ? <Text style={styles.cardContent} numberOfLines={2}>{doc.content}</Text> : null}
              <View style={styles.cardMeta}>
                <Text style={styles.metaText}>{doc.user_name}</Text>
                <Text style={styles.metaText}>{new Date(doc.created_at).toLocaleDateString('fr-CH')}</Text>
              </View>
              {isManager && <Pressable style={styles.deleteBtn} onPress={async () => { await deleteDocument(doc.id); loadData(); }}><MaterialIcons name="delete-outline" size={18} color={colors.error} /></Pressable>}
            </View>
          ))}
        </View>
      )}

      <Modal visible={showModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowModal(false)}>
          <View style={styles.modal} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Nouveau document</Text>
            <TextInput style={styles.input} placeholder="Titre" value={form.title} onChangeText={v => setForm({...form, title: v})} placeholderTextColor={colors.textLight} />
            <Text style={styles.label}>Categorie</Text>
            <View style={styles.catRow}>
              {CATEGORIES.map(c => (
                <Pressable key={c} style={[styles.chip, form.category === c && styles.chipActive]} onPress={() => setForm({...form, category: c})}>
                  <Text style={[styles.chipText, form.category === c && styles.chipTextActive]}>{c}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput style={[styles.input, { height: 100, textAlignVertical: 'top' }]} placeholder="Contenu / Notes" value={form.content} onChangeText={v => setForm({...form, content: v})} multiline placeholderTextColor={colors.textLight} />
            {isManager && users.length > 0 && (
              <><Text style={styles.label}>Employe</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                <Pressable style={[styles.chip, !form.target_user_id && styles.chipActive]} onPress={() => setForm({...form, target_user_id: ''})}><Text style={[styles.chipText, !form.target_user_id && styles.chipTextActive]}>Moi</Text></Pressable>
                {users.map(u => (
                  <Pressable key={u.id} style={[styles.chip, form.target_user_id === u.id && styles.chipActive]} onPress={() => setForm({...form, target_user_id: u.id})}>
                    <Text style={[styles.chipText, form.target_user_id === u.id && styles.chipTextActive]}>{u.first_name} {u.last_name}</Text>
                  </Pressable>
                ))}
              </ScrollView></>
            )}
            <View style={styles.actions}>
              <Pressable style={styles.cancelBtn} onPress={() => setShowModal(false)}><Text style={styles.cancelText}>Annuler</Text></Pressable>
              <Pressable style={styles.submitBtn} onPress={handleCreate}><Text style={styles.submitText}>Creer</Text></Pressable>
            </View>
          </View>
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
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, marginRight: spacing.sm, marginBottom: 4 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: fontSize.sm, color: colors.textLight },
  chipTextActive: { color: '#FFF', fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: spacing.sm },
  emptyText: { color: colors.textLight, fontSize: fontSize.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, minWidth: 250, flex: 1, maxWidth: '32%', borderWidth: 1, borderColor: colors.border },
  cardIcon: { marginBottom: spacing.sm },
  cardTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  catBadge: { backgroundColor: colors.primaryLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, alignSelf: 'flex-start', marginBottom: spacing.sm },
  catBadgeText: { fontSize: 11, fontWeight: '600', color: colors.primary },
  cardContent: { fontSize: fontSize.xs, color: colors.textLight, marginBottom: spacing.sm },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: spacing.sm },
  metaText: { fontSize: fontSize.xs, color: colors.textLight },
  deleteBtn: { position: 'absolute', top: 10, right: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, width: '90%', maxWidth: 500 },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.lg },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.sm, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: fontSize.md, color: colors.text, marginBottom: spacing.md, backgroundColor: colors.background },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md, marginTop: spacing.md },
  cancelBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  cancelText: { color: colors.textLight, fontSize: fontSize.md },
  submitBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.sm },
  submitText: { color: '#FFF', fontSize: fontSize.md, fontWeight: '600' },
});
