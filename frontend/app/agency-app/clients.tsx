import React, { useEffect, useState, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, TextInput, Modal, ScrollView, Platform, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api/axios';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useThemeStore } from '../../src/store/themeStore';

interface Client {
  id: string; name: string; email: string; phone?: string;
  client_rating?: string; reservation_count?: number; created_at?: string;
  profile_photo?: string;
}

export default function AgencyClients() {
  const { colors: C } = useThemeStore();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchClients = async () => {
    try {
      const res = await api.get('/api/admin/users');
      setClients(res.data.users || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchClients(); }, []);
  const onRefresh = async () => { setRefreshing(true); await fetchClients(); setRefreshing(false); };

  const filtered = useMemo(() => {
    if (!search) return clients;
    return clients.filter(c =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search)
    );
  }, [clients, search]);

  const createClient = async () => {
    if (!newName) {
      Platform.OS === 'web' ? window.alert('Le nom est obligatoire') : Alert.alert('Erreur', 'Le nom est obligatoire');
      return;
    }
    setCreating(true);
    try {
      await api.post('/api/admin/quick-client', { name: newName, phone: newPhone || null, email: newEmail || null });
      setShowNewModal(false);
      setNewName(''); setNewPhone(''); setNewEmail('');
      fetchClients();
      Platform.OS === 'web' ? window.alert('Client créé!') : Alert.alert('Succès', 'Client créé!');
    } catch (e: any) {
      const msg = e.response?.data?.detail || 'Erreur';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Erreur', msg);
    } finally { setCreating(false); }
  };

  const handleImportFile = async (event: any) => {
    const file = event?.target?.files?.[0];
    if (!file) return;
    
    const validExts = ['.xlsx', '.xls', '.csv', '.zip'];
    const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!validExts.includes(ext)) {
      window.alert('Format non supporté. Utilisez .xlsx, .csv ou .zip');
      return;
    }
    
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/api/admin/import-users', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportResult(res.data);
      fetchClients();
    } catch (e: any) {
      const msg = e.response?.data?.detail || 'Erreur lors de l\'import';
      setImportResult({ error: msg });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const ratingInfo = (r?: string) => {
    switch (r) {
      case 'vip': return { color: '#8B5CF6', label: 'VIP', icon: 'star' as const };
      case 'good': return { color: C.success, label: 'Bon', icon: 'thumbs-up' as const };
      case 'bad': return { color: C.warning, label: 'Mauvais', icon: 'thumbs-down' as const };
      case 'blocked': return { color: C.error, label: 'Bloqué', icon: 'ban' as const };
      default: return null;
    }
  };

  if (loading) return <View style={[s.container, { backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={C.accent} /></View>;

  return (
    <View style={[s.container, { backgroundColor: C.bg }]}>
      {/* Hidden file input for web */}
      {Platform.OS === 'web' && (
        <input
          ref={fileInputRef as any}
          type="file"
          accept=".xlsx,.xls,.csv,.zip"
          style={{ display: 'none' }}
          onChange={handleImportFile}
        />
      )}

      <View style={s.topRow}>
        <View style={[s.searchBar, { backgroundColor: C.card, borderColor: C.border }]}>
          <Ionicons name="search" size={18} color={C.textLight} />
          <TextInput style={[s.searchInput, { color: C.text }]} placeholder="Rechercher..." placeholderTextColor={C.textLight} value={search} onChangeText={setSearch} />
        </View>
        <TouchableOpacity style={[s.iconActionBtn, { backgroundColor: C.accent + '20' }]} onPress={() => setShowImportModal(true)} data-testid="import-clients-btn">
          <Ionicons name="cloud-upload" size={20} color={C.accent} />
        </TouchableOpacity>
        <TouchableOpacity style={[s.addBtn, { backgroundColor: C.primary }]} onPress={() => setShowNewModal(true)} data-testid="new-client-btn">
          <Ionicons name="person-add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        ListEmptyComponent={<View style={s.empty}><Ionicons name="people-outline" size={40} color={C.textLight} /><Text style={[s.emptyText, { color: C.textLight }]}>Aucun client</Text></View>}
        renderItem={({ item }) => {
          const rating = ratingInfo(item.client_rating);
          return (
            <View style={[s.card, { backgroundColor: C.card, borderColor: C.border }]} data-testid={`client-${item.id}`}>
              <View style={s.cardHeader}>
                <View style={[s.avatar, { backgroundColor: C.accent + '20' }]}>
                  {item.profile_photo ? (
                    <Image source={{ uri: item.profile_photo }} style={s.avatarImg} />
                  ) : (
                    <Ionicons name="person" size={20} color={C.accent} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.nameRow}>
                    <Text style={[s.clientName, { color: C.text }]}>{item.name}</Text>
                    {rating && (
                      <View style={[s.ratingBadge, { backgroundColor: rating.color + '20' }]}>
                        <Ionicons name={rating.icon} size={10} color={rating.color} />
                        <Text style={[s.ratingText, { color: rating.color }]}>{rating.label}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[s.clientEmail, { color: C.textLight }]}>{item.email}</Text>
                  {item.phone && <Text style={[s.clientPhone, { color: C.textLight }]}>{item.phone}</Text>}
                </View>
                {item.reservation_count !== undefined && (
                  <View style={s.countBadge}>
                    <Text style={[s.countText, { color: C.accent }]}>{item.reservation_count}</Text>
                    <Text style={[s.countLabel, { color: C.textLight }]}>rés.</Text>
                  </View>
                )}
              </View>
            </View>
          );
        }}
      />

      {/* Import Modal */}
      <Modal visible={showImportModal} transparent animationType="slide" onRequestClose={() => { setShowImportModal(false); setImportResult(null); }}>
        <View style={s.modalOverlay}>
          <View style={[s.modal, { backgroundColor: C.card }]}>
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: C.text }]}>Importer des clients</Text>
              <TouchableOpacity onPress={() => { setShowImportModal(false); setImportResult(null); }}><Ionicons name="close" size={24} color={C.text} /></TouchableOpacity>
            </View>
            <ScrollView>
              <View style={[s.infoBox, { backgroundColor: C.accent + '10', borderColor: C.accent + '30' }]}>
                <Ionicons name="information-circle" size={20} color={C.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.infoTitle, { color: C.text }]}>Formats acceptés</Text>
                  <Text style={[s.infoDesc, { color: C.textLight }]}>
                    Excel (.xlsx), CSV (.csv), ou ZIP contenant un Excel + photos
                  </Text>
                </View>
              </View>

              <View style={[s.infoBox, { backgroundColor: C.primary + '10', borderColor: C.primary + '30' }]}>
                <Ionicons name="document-text" size={20} color={C.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.infoTitle, { color: C.text }]}>Colonnes Excel</Text>
                  <Text style={[s.infoDesc, { color: C.textLight }]}>
                    nom, email, téléphone, adresse, photo{'\n'}
                    (La colonne "photo" = nom du fichier image dans le ZIP)
                  </Text>
                </View>
              </View>

              <View style={[s.infoBox, { backgroundColor: C.success + '10', borderColor: C.success + '30' }]}>
                <Ionicons name="images" size={20} color={C.success} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.infoTitle, { color: C.text }]}>Import avec photos</Text>
                  <Text style={[s.infoDesc, { color: C.textLight }]}>
                    Créez un .zip avec le fichier Excel + les photos.{'\n'}
                    Colonne "photo" = nom du fichier (ex: jean.jpg)
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[s.importBtn, { backgroundColor: C.primary }, importing && { opacity: 0.6 }]}
                disabled={importing}
                onPress={() => fileInputRef.current?.click()}
                data-testid="import-file-btn"
              >
                {importing ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Ionicons name="cloud-upload" size={22} color="#fff" />
                )}
                <Text style={s.importBtnText}>
                  {importing ? 'Import en cours...' : 'Choisir un fichier'}
                </Text>
              </TouchableOpacity>

              {importResult && !importResult.error && (
                <View style={[s.resultBox, { backgroundColor: C.success + '15', borderColor: C.success + '40' }]} data-testid="import-result-success">
                  <View style={s.resultHeader}>
                    <Ionicons name="checkmark-circle" size={22} color={C.success} />
                    <Text style={[s.resultTitle, { color: C.success }]}>Import réussi</Text>
                  </View>
                  <View style={s.resultStats}>
                    <View style={s.resultStat}>
                      <Text style={[s.resultNum, { color: C.text }]}>{importResult.created}</Text>
                      <Text style={[s.resultStatLabel, { color: C.textLight }]}>créés</Text>
                    </View>
                    <View style={s.resultStat}>
                      <Text style={[s.resultNum, { color: C.text }]}>{importResult.photos_matched || 0}</Text>
                      <Text style={[s.resultStatLabel, { color: C.textLight }]}>photos</Text>
                    </View>
                    <View style={s.resultStat}>
                      <Text style={[s.resultNum, { color: C.text }]}>{importResult.skipped}</Text>
                      <Text style={[s.resultStatLabel, { color: C.textLight }]}>existants</Text>
                    </View>
                    <View style={s.resultStat}>
                      <Text style={[s.resultNum, { color: C.text }]}>{importResult.errors?.length || 0}</Text>
                      <Text style={[s.resultStatLabel, { color: C.textLight }]}>erreurs</Text>
                    </View>
                  </View>
                  {importResult.errors?.length > 0 && (
                    <View style={{ marginTop: 10 }}>
                      {importResult.errors.map((e: string, i: number) => (
                        <Text key={i} style={[s.errorLine, { color: C.error }]}>{e}</Text>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {importResult?.error && (
                <View style={[s.resultBox, { backgroundColor: C.error + '15', borderColor: C.error + '40' }]} data-testid="import-result-error">
                  <View style={s.resultHeader}>
                    <Ionicons name="alert-circle" size={22} color={C.error} />
                    <Text style={[s.resultTitle, { color: C.error }]}>{importResult.error}</Text>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* New Client Modal */}
      <Modal visible={showNewModal} transparent animationType="slide" onRequestClose={() => setShowNewModal(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modal, { backgroundColor: C.card }]}>
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: C.text }]}>Nouveau client</Text>
              <TouchableOpacity onPress={() => setShowNewModal(false)}><Ionicons name="close" size={24} color={C.text} /></TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={[s.label, { color: C.textLight }]}>Nom *</Text>
              <TextInput style={[s.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]} placeholder="Nom complet" placeholderTextColor={C.textLight} value={newName} onChangeText={setNewName} data-testid="modal-client-name" />
              <Text style={[s.label, { color: C.textLight }]}>Téléphone</Text>
              <TextInput style={[s.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]} placeholder="+41 XX XXX XX XX" placeholderTextColor={C.textLight} value={newPhone} onChangeText={setNewPhone} keyboardType="phone-pad" data-testid="modal-client-phone" />
              <Text style={[s.label, { color: C.textLight }]}>Email</Text>
              <TextInput style={[s.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]} placeholder="email@example.com" placeholderTextColor={C.textLight} value={newEmail} onChangeText={setNewEmail} keyboardType="email-address" autoCapitalize="none" data-testid="modal-client-email" />
              <TouchableOpacity style={[s.createBtn, { backgroundColor: C.primary }, creating && { opacity: 0.6 }]} onPress={createClient} disabled={creating} data-testid="modal-create-client-btn">
                <Ionicons name="person-add" size={18} color="#fff" />
                <Text style={s.createBtnText}>{creating ? 'Création...' : 'Créer le client'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 0, gap: 10 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 12, gap: 8, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 10 },
  iconActionBtn: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  addBtn: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 14 },
  card: { borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: 40, height: 40, borderRadius: 20 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  clientName: { fontSize: 15, fontWeight: '700' },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  ratingText: { fontSize: 10, fontWeight: '600' },
  clientEmail: { fontSize: 12, marginTop: 2 },
  clientPhone: { fontSize: 12 },
  countBadge: { alignItems: 'center' },
  countText: { fontSize: 18, fontWeight: '800' },
  countLabel: { fontSize: 9 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, borderWidth: 1 },
  createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, paddingVertical: 14, marginTop: 20 },
  createBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: 10, borderWidth: 1, marginBottom: 10 },
  infoTitle: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  infoDesc: { fontSize: 12, lineHeight: 18 },
  importBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 12, paddingVertical: 16, marginTop: 10, marginBottom: 10 },
  importBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resultBox: { borderRadius: 12, padding: 16, borderWidth: 1, marginTop: 10 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  resultTitle: { fontSize: 15, fontWeight: '700' },
  resultStats: { flexDirection: 'row', justifyContent: 'space-around' },
  resultStat: { alignItems: 'center' },
  resultNum: { fontSize: 22, fontWeight: '800' },
  resultStatLabel: { fontSize: 11, marginTop: 2 },
  errorLine: { fontSize: 11, marginTop: 3 },
});
