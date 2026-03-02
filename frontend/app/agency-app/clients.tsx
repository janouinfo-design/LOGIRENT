import React, { useEffect, useState, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, TextInput, Modal, ScrollView, Platform, Alert, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api/axios';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useThemeStore } from '../../src/store/themeStore';

const SCREEN_W = Dimensions.get('window').width;

interface Client {
  id: string; name: string; email: string; phone?: string;
  client_rating?: string; reservation_count?: number; created_at?: string;
  profile_photo?: string; address?: string; admin_notes?: string;
  total_spent?: number; total_reservations?: number;
  birth_place?: string; birth_year?: number; license_number?: string;
  license_issue_date?: string; license_expiry_date?: string; nationality?: string;
}

const RATINGS = [
  { value: 'vip', label: 'VIP', icon: 'star' as const, color: '#8B5CF6' },
  { value: 'good', label: 'Bon', icon: 'thumbs-up' as const, color: '#22c55e' },
  { value: 'neutral', label: 'Neutre', icon: 'remove-circle' as const, color: '#9ca3af' },
  { value: 'bad', label: 'Mauvais', icon: 'thumbs-down' as const, color: '#f59e0b' },
  { value: 'blocked', label: 'Bloqué', icon: 'ban' as const, color: '#ef4444' },
];

export default function AgencyClients() {
  const { colors: C } = useThemeStore();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editRating, setEditRating] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editBirthPlace, setEditBirthPlace] = useState('');
  const [editBirthYear, setEditBirthYear] = useState('');
  const [editLicenseNumber, setEditLicenseNumber] = useState('');
  const [editLicenseIssue, setEditLicenseIssue] = useState('');
  const [editLicenseExpiry, setEditLicenseExpiry] = useState('');
  const [editNationality, setEditNationality] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newBirthPlace, setNewBirthPlace] = useState('');
  const [newBirthYear, setNewBirthYear] = useState('');
  const [newLicenseNumber, setNewLicenseNumber] = useState('');
  const [newLicenseIssue, setNewLicenseIssue] = useState('');
  const [newLicenseExpiry, setNewLicenseExpiry] = useState('');
  const [newNationality, setNewNationality] = useState('');
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

  const openEditModal = async (client: Client) => {
    setEditClient(client);
    setEditName(client.name || '');
    setEditEmail(client.email || '');
    setEditPhone(client.phone || '');
    setEditAddress(client.address || '');
    setEditRating(client.client_rating || '');
    setEditNotes(client.admin_notes || '');
    setEditBirthPlace(client.birth_place || '');
    setEditBirthYear(client.birth_year ? String(client.birth_year) : '');
    setEditLicenseNumber(client.license_number || '');
    setEditLicenseIssue(client.license_issue_date || '');
    setEditLicenseExpiry(client.license_expiry_date || '');
    setEditNationality(client.nationality || '');
    setShowEditModal(true);
    // Fetch full details
    setLoadingDetail(true);
    try {
      const res = await api.get(`/api/admin/users/${client.id}`);
      const d = res.data;
      setEditAddress(d.address || '');
      setEditNotes(d.admin_notes || '');
      setEditBirthPlace(d.birth_place || '');
      setEditBirthYear(d.birth_year ? String(d.birth_year) : '');
      setEditLicenseNumber(d.license_number || '');
      setEditLicenseIssue(d.license_issue_date || '');
      setEditLicenseExpiry(d.license_expiry_date || '');
      setEditNationality(d.nationality || '');
      setEditClient({ ...client, ...d });
    } catch (e) { console.error(e); }
    finally { setLoadingDetail(false); }
  };

  const saveEdit = async () => {
    if (!editClient) return;
    // Validate required fields
    if (!editBirthPlace || !editBirthYear || !editLicenseNumber || !editLicenseIssue || !editLicenseExpiry || !editNationality) {
      const msg = 'Veuillez remplir tous les champs obligatoires (lieu/annee naissance, permis, nationalite)';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Champs manquants', msg);
      return;
    }
    setSaving(true);
    try {
      const payload: any = {};
      if (editName !== editClient.name) payload.name = editName;
      if (editEmail !== editClient.email) payload.email = editEmail;
      if (editPhone !== (editClient.phone || '')) payload.phone = editPhone;
      if (editAddress !== (editClient.address || '')) payload.address = editAddress;
      if (editNotes !== (editClient.admin_notes || '')) payload.admin_notes = editNotes;
      if (editRating !== (editClient.client_rating || '')) payload.client_rating = editRating || null;
      payload.birth_place = editBirthPlace;
      payload.birth_year = parseInt(editBirthYear) || null;
      payload.license_number = editLicenseNumber;
      payload.license_issue_date = editLicenseIssue;
      payload.license_expiry_date = editLicenseExpiry;
      payload.nationality = editNationality;

      await api.put(`/api/admin/users/${editClient.id}`, payload);
      setShowEditModal(false);
      fetchClients();
      Platform.OS === 'web' ? window.alert('Client mis a jour!') : Alert.alert('Succes', 'Client mis a jour!');
    } catch (e: any) {
      const msg = e.response?.data?.detail || 'Erreur';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Erreur', msg);
    } finally { setSaving(false); }
  };

  const createClient = async () => {
    if (!newName) {
      Platform.OS === 'web' ? window.alert('Le nom est obligatoire') : Alert.alert('Erreur', 'Le nom est obligatoire');
      return;
    }
    if (!newBirthPlace || !newBirthYear || !newLicenseNumber || !newLicenseIssue || !newLicenseExpiry || !newNationality) {
      const msg = 'Veuillez remplir tous les champs obligatoires';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Champs manquants', msg);
      return;
    }
    setCreating(true);
    try {
      await api.post('/api/admin/quick-client', {
        name: newName, phone: newPhone || null, email: newEmail || null,
        birth_place: newBirthPlace, birth_year: parseInt(newBirthYear) || null,
        license_number: newLicenseNumber, license_issue_date: newLicenseIssue,
        license_expiry_date: newLicenseExpiry, nationality: newNationality,
      });
      setShowNewModal(false);
      setNewName(''); setNewPhone(''); setNewEmail('');
      setNewBirthPlace(''); setNewBirthYear(''); setNewLicenseNumber('');
      setNewLicenseIssue(''); setNewLicenseExpiry(''); setNewNationality('');
      fetchClients();
      Platform.OS === 'web' ? window.alert('Client cree!') : Alert.alert('Succes', 'Client cree!');
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
    const found = RATINGS.find(rt => rt.value === r);
    return found || null;
  };

  if (loading) return <View style={[s.container, { backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={C.accent} /></View>;

  return (
    <View style={[s.container, { backgroundColor: C.bg }]}>
      {Platform.OS === 'web' && (
        <input ref={fileInputRef as any} type="file" accept=".xlsx,.xls,.csv,.zip" style={{ display: 'none' }} onChange={handleImportFile} />
      )}

      <View style={s.topRow}>
        <View style={[s.searchBar, { backgroundColor: C.card, borderColor: C.border }]}>
          <Ionicons name="search" size={18} color={C.textLight} />
          <TextInput style={[s.searchInput, { color: C.text }]} placeholder="Rechercher..." placeholderTextColor={C.textLight} value={search} onChangeText={setSearch} />
        </View>
        <TouchableOpacity style={[s.iconActionBtn, { backgroundColor: C.success + '30', borderWidth: 1, borderColor: C.success + '50' }]} onPress={() => setShowImportModal(true)} data-testid="import-clients-btn">
          <Ionicons name="cloud-upload" size={20} color={C.success} />
        </TouchableOpacity>
        <TouchableOpacity style={[s.addBtn, { backgroundColor: C.primary }]} onPress={() => setShowNewModal(true)} data-testid="new-client-btn">
          <Ionicons name="person-add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        numColumns={4}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        columnWrapperStyle={{ gap: 10, marginBottom: 10 }}
        ListEmptyComponent={<View style={s.empty}><Ionicons name="people-outline" size={40} color={C.textLight} /><Text style={[s.emptyText, { color: C.textLight }]}>Aucun client</Text></View>}
        renderItem={({ item }) => {
          const rating = ratingInfo(item.client_rating);
          const cardW = (SCREEN_W - 32 - 30) / 4;
          return (
            <TouchableOpacity
              style={[s.card, { backgroundColor: C.card, borderColor: C.border, width: cardW }]}
              onPress={() => openEditModal(item)}
              data-testid={`client-${item.id}`}
            >
              {/* Avatar */}
              <View style={[s.cardAvatar, { backgroundColor: C.accent + '15' }]}>
                {item.profile_photo ? (
                  <Image source={{ uri: item.profile_photo }} style={s.cardAvatarImg} />
                ) : (
                  <Ionicons name="person" size={28} color={C.accent} />
                )}
                {/* Rating badge overlay */}
                {rating && (
                  <View style={[s.ratingOverlay, { backgroundColor: rating.color }]}>
                    <Ionicons name={rating.icon} size={10} color="#fff" />
                  </View>
                )}
              </View>
              {/* Info */}
              <View style={s.cardBody}>
                <Text style={[s.cardName, { color: C.text }]} numberOfLines={1}>{item.name}</Text>
                <Text style={{ color: C.textLight, fontSize: 10, marginTop: 1 }} numberOfLines={1}>{item.email || '-'}</Text>
                {item.phone ? <Text style={{ color: C.textLight, fontSize: 10 }} numberOfLines={1}>{item.phone}</Text> : null}
                <View style={s.cardFooter}>
                  {item.reservation_count !== undefined && item.reservation_count > 0 ? (
                    <View style={[s.resCountBadge, { backgroundColor: C.accent + '15' }]}>
                      <Text style={{ color: C.accent, fontSize: 9, fontWeight: '700' }}>{item.reservation_count} res.</Text>
                    </View>
                  ) : (
                    <View style={[s.resCountBadge, { backgroundColor: C.border + '30' }]}>
                      <Text style={{ color: C.textLight, fontSize: 9 }}>0 res.</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Edit Client Modal */}
      <Modal visible={showEditModal} transparent animationType="slide" onRequestClose={() => setShowEditModal(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modal, { backgroundColor: C.card }]}>
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: C.text }]}>Modifier le client</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)} data-testid="close-edit-modal">
                <Ionicons name="close" size={24} color={C.text} />
              </TouchableOpacity>
            </View>
            {loadingDetail ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={C.accent} />
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Client avatar + name header */}
                {editClient && (
                  <View style={[s.editHeader, { backgroundColor: C.bg, borderColor: C.border }]}>
                    <View style={[s.editAvatar, { backgroundColor: C.accent + '20' }]}>
                      {editClient.profile_photo ? (
                        <Image source={{ uri: editClient.profile_photo }} style={s.editAvatarImg} />
                      ) : (
                        <Ionicons name="person" size={28} color={C.accent} />
                      )}
                    </View>
                    <View>
                      <Text style={[s.editHeaderName, { color: C.text }]}>{editClient.name}</Text>
                      <Text style={{ color: C.textLight, fontSize: 12 }}>
                        {editClient.total_reservations || editClient.reservation_count || 0} réservations
                      </Text>
                    </View>
                  </View>
                )}

                <Text style={[s.label, { color: C.textLight }]}>Nom</Text>
                <TextInput
                  style={[s.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Nom complet"
                  placeholderTextColor={C.textLight}
                  data-testid="edit-client-name"
                />

                <Text style={[s.label, { color: C.textLight }]}>Email</Text>
                <TextInput
                  style={[s.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]}
                  value={editEmail}
                  onChangeText={setEditEmail}
                  placeholder="email@example.com"
                  placeholderTextColor={C.textLight}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  data-testid="edit-client-email"
                />

                <Text style={[s.label, { color: C.textLight }]}>Téléphone</Text>
                <TextInput
                  style={[s.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="+41 XX XXX XX XX"
                  placeholderTextColor={C.textLight}
                  keyboardType="phone-pad"
                  data-testid="edit-client-phone"
                />

                <Text style={[s.label, { color: C.textLight }]}>Adresse</Text>
                <TextInput
                  style={[s.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]}
                  value={editAddress}
                  onChangeText={setEditAddress}
                  placeholder="Adresse du client"
                  placeholderTextColor={C.textLight}
                  data-testid="edit-client-address"
                />

                {/* === Identity & License Section === */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, marginBottom: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border }}>
                  <Ionicons name="id-card" size={16} color={C.accent} />
                  <Text style={{ color: C.text, fontSize: 14, fontWeight: '700' }}>Identite & Permis *</Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.label, { color: C.textLight }]}>Lieu de naissance *</Text>
                    <TextInput style={[s.input, { backgroundColor: C.bg, color: C.text, borderColor: !editBirthPlace ? '#EF444450' : C.border }]} value={editBirthPlace} onChangeText={setEditBirthPlace} placeholder="Geneve" placeholderTextColor={C.textLight} data-testid="edit-birth-place" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.label, { color: C.textLight }]}>Annee de naissance *</Text>
                    <TextInput style={[s.input, { backgroundColor: C.bg, color: C.text, borderColor: !editBirthYear ? '#EF444450' : C.border }]} value={editBirthYear} onChangeText={setEditBirthYear} placeholder="1990" placeholderTextColor={C.textLight} keyboardType="numeric" data-testid="edit-birth-year" />
                  </View>
                </View>

                <Text style={[s.label, { color: C.textLight, marginTop: 10 }]}>Nationalite *</Text>
                <TextInput style={[s.input, { backgroundColor: C.bg, color: C.text, borderColor: !editNationality ? '#EF444450' : C.border }]} value={editNationality} onChangeText={setEditNationality} placeholder="Suisse" placeholderTextColor={C.textLight} data-testid="edit-nationality" />

                <Text style={[s.label, { color: C.textLight, marginTop: 10 }]}>Permis No *</Text>
                <TextInput style={[s.input, { backgroundColor: C.bg, color: C.text, borderColor: !editLicenseNumber ? '#EF444450' : C.border }]} value={editLicenseNumber} onChangeText={setEditLicenseNumber} placeholder="GE-123456" placeholderTextColor={C.textLight} data-testid="edit-license-number" />

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.label, { color: C.textLight }]}>Date d'emission *</Text>
                    <TextInput style={[s.input, { backgroundColor: C.bg, color: C.text, borderColor: !editLicenseIssue ? '#EF444450' : C.border }]} value={editLicenseIssue} onChangeText={setEditLicenseIssue} placeholder="AAAA-MM-JJ" placeholderTextColor={C.textLight} data-testid="edit-license-issue" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.label, { color: C.textLight }]}>Date d'expiration *</Text>
                    <TextInput style={[s.input, { backgroundColor: C.bg, color: C.text, borderColor: !editLicenseExpiry ? '#EF444450' : C.border }]} value={editLicenseExpiry} onChangeText={setEditLicenseExpiry} placeholder="AAAA-MM-JJ" placeholderTextColor={C.textLight} data-testid="edit-license-expiry" />
                  </View>
                </View>

                <Text style={[s.label, { color: C.textLight, marginTop: 12 }]}>Classement</Text>
                <View style={s.ratingRow}>
                  {RATINGS.map((r) => (
                    <TouchableOpacity
                      key={r.value}
                      style={[
                        s.ratingOption,
                        { borderColor: editRating === r.value ? r.color : C.border, backgroundColor: editRating === r.value ? r.color + '15' : C.bg },
                      ]}
                      onPress={() => setEditRating(editRating === r.value ? '' : r.value)}
                      data-testid={`rating-${r.value}`}
                    >
                      <Ionicons name={r.icon} size={14} color={editRating === r.value ? r.color : C.textLight} />
                      <Text style={{ color: editRating === r.value ? r.color : C.textLight, fontSize: 11, fontWeight: '600' }}>{r.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[s.label, { color: C.textLight }]}>Notes admin</Text>
                <TextInput
                  style={[s.input, s.textArea, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]}
                  value={editNotes}
                  onChangeText={setEditNotes}
                  placeholder="Notes internes sur ce client..."
                  placeholderTextColor={C.textLight}
                  multiline
                  numberOfLines={3}
                  data-testid="edit-client-notes"
                />

                <TouchableOpacity
                  style={[s.saveBtn, { backgroundColor: C.primary }, saving && { opacity: 0.6 }]}
                  onPress={saveEdit}
                  disabled={saving}
                  data-testid="save-edit-client-btn"
                >
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                  <Text style={s.saveBtnText}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

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
                  <Text style={[s.infoDesc, { color: C.textLight }]}>Excel (.xlsx), CSV (.csv), ou ZIP contenant un Excel + photos</Text>
                </View>
              </View>
              <View style={[s.infoBox, { backgroundColor: C.primary + '10', borderColor: C.primary + '30' }]}>
                <Ionicons name="document-text" size={20} color={C.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.infoTitle, { color: C.text }]}>Colonnes Excel</Text>
                  <Text style={[s.infoDesc, { color: C.textLight }]}>nom, email, téléphone, adresse, photo{'\n'}(La colonne "photo" = nom du fichier image dans le ZIP)</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[s.importBtn, { backgroundColor: C.primary }, importing && { opacity: 0.6 }]}
                disabled={importing}
                onPress={() => fileInputRef.current?.click()}
                data-testid="import-file-btn"
              >
                {importing ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="cloud-upload" size={22} color="#fff" />}
                <Text style={s.importBtnText}>{importing ? 'Import en cours...' : 'Choisir un fichier'}</Text>
              </TouchableOpacity>
              {importResult && !importResult.error && (
                <View style={[s.resultBox, { backgroundColor: C.success + '15', borderColor: C.success + '40' }]} data-testid="import-result-success">
                  <View style={s.resultHeader}>
                    <Ionicons name="checkmark-circle" size={22} color={C.success} />
                    <Text style={[s.resultTitle, { color: C.success }]}>Import réussi</Text>
                  </View>
                  <View style={s.resultStats}>
                    <View style={s.resultStat}><Text style={[s.resultNum, { color: C.text }]}>{importResult.created}</Text><Text style={[s.resultStatLabel, { color: C.textLight }]}>créés</Text></View>
                    <View style={s.resultStat}><Text style={[s.resultNum, { color: C.text }]}>{importResult.photos_matched || 0}</Text><Text style={[s.resultStatLabel, { color: C.textLight }]}>photos</Text></View>
                    <View style={s.resultStat}><Text style={[s.resultNum, { color: C.text }]}>{importResult.skipped}</Text><Text style={[s.resultStatLabel, { color: C.textLight }]}>existants</Text></View>
                    <View style={s.resultStat}><Text style={[s.resultNum, { color: C.text }]}>{importResult.errors?.length || 0}</Text><Text style={[s.resultStatLabel, { color: C.textLight }]}>erreurs</Text></View>
                  </View>
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
              <Text style={[s.label, { color: C.textLight }]}>Telephone</Text>
              <TextInput style={[s.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]} placeholder="+41 XX XXX XX XX" placeholderTextColor={C.textLight} value={newPhone} onChangeText={setNewPhone} keyboardType="phone-pad" data-testid="modal-client-phone" />
              <Text style={[s.label, { color: C.textLight }]}>Email</Text>
              <TextInput style={[s.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]} placeholder="email@example.com" placeholderTextColor={C.textLight} value={newEmail} onChangeText={setNewEmail} keyboardType="email-address" autoCapitalize="none" data-testid="modal-client-email" />

              {/* Identity & License */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, marginBottom: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border }}>
                <Ionicons name="id-card" size={16} color={C.accent} />
                <Text style={{ color: C.text, fontSize: 14, fontWeight: '700' }}>Identite & Permis *</Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.label, { color: C.textLight }]}>Lieu de naissance *</Text>
                  <TextInput style={[s.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]} placeholder="Geneve" placeholderTextColor={C.textLight} value={newBirthPlace} onChangeText={setNewBirthPlace} data-testid="new-birth-place" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.label, { color: C.textLight }]}>Annee de naissance *</Text>
                  <TextInput style={[s.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]} placeholder="1990" placeholderTextColor={C.textLight} value={newBirthYear} onChangeText={setNewBirthYear} keyboardType="numeric" data-testid="new-birth-year" />
                </View>
              </View>

              <Text style={[s.label, { color: C.textLight }]}>Nationalite *</Text>
              <TextInput style={[s.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]} placeholder="Suisse" placeholderTextColor={C.textLight} value={newNationality} onChangeText={setNewNationality} data-testid="new-nationality" />

              <Text style={[s.label, { color: C.textLight }]}>Permis No *</Text>
              <TextInput style={[s.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]} placeholder="GE-123456" placeholderTextColor={C.textLight} value={newLicenseNumber} onChangeText={setNewLicenseNumber} data-testid="new-license-number" />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.label, { color: C.textLight }]}>Date d'emission *</Text>
                  <TextInput style={[s.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]} placeholder="AAAA-MM-JJ" placeholderTextColor={C.textLight} value={newLicenseIssue} onChangeText={setNewLicenseIssue} data-testid="new-license-issue" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.label, { color: C.textLight }]}>Date d'expiration *</Text>
                  <TextInput style={[s.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]} placeholder="AAAA-MM-JJ" placeholderTextColor={C.textLight} value={newLicenseExpiry} onChangeText={setNewLicenseExpiry} data-testid="new-license-expiry" />
                </View>
              </View>

              <TouchableOpacity style={[s.createBtn, { backgroundColor: C.primary }, creating && { opacity: 0.6 }]} onPress={createClient} disabled={creating} data-testid="modal-create-client-btn">
                <Ionicons name="person-add" size={18} color="#fff" />
                <Text style={s.createBtnText}>{creating ? 'Creation...' : 'Creer le client'}</Text>
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
  card: { borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
  cardAvatar: { width: '100%', height: 70, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  cardAvatarImg: { width: '100%', height: 70 },
  ratingOverlay: { position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cardBody: { padding: 8 },
  cardName: { fontSize: 12, fontWeight: '800' },
  cardFooter: { marginTop: 4 },
  resCountBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  editHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  editAvatar: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  editAvatarImg: { width: 50, height: 50, borderRadius: 25 },
  editHeaderName: { fontSize: 17, fontWeight: '800' },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, borderWidth: 1 },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  ratingRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ratingOption: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, paddingVertical: 14, marginTop: 20, marginBottom: 10 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
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
