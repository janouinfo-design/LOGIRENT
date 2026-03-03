import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert, Modal, ScrollView, TextInput, Image, Platform, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../../src/api/axios';
import Button from '../../src/components/Button';
import { useThemeStore } from '../../src/store/themeStore';
import { USER_RATINGS } from '../../src/utils/admin-helpers';

const SCREEN_W = Dimensions.get('window').width;

interface User {
  id: string; name: string; email: string; phone?: string; address?: string;
  profile_photo?: string; id_photo?: string; license_photo?: string;
  client_rating?: string; admin_notes?: string; blocked?: boolean;
  reservation_count: number; created_at: string;
}

const getRating = (r?: string) => USER_RATINGS.find(x => x.value === r) || USER_RATINGS.find(x => x.value === 'neutral')!;

async function uploadBase64Photo(endpoint: string, aspect: [number, number] = [1, 1]) {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') { alert('Permission requise'); return null; }
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect, quality: 0.8, base64: true });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  let b64 = asset.base64;
  let ct = asset.mimeType || 'image/jpeg';
  if (!b64 && asset.uri?.startsWith('data:')) {
    const m = asset.uri.match(/^data:([^;]+);base64,(.+)$/);
    if (m) { ct = m[1]; b64 = m[2]; }
  }
  if (!b64) return null;
  const resp = await api.post(endpoint, { image: b64, content_type: ct });
  return resp.data.photo || resp.data;
}

export default function AdminUsers() {
  const { colors: C } = useThemeStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [sel, setSel] = useState<User | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [uploading, setUploading] = useState<string | null>(null);
  const importRef = React.useRef<HTMLInputElement | null>(null);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try { const r = await api.get('/api/admin/users'); setUsers(r.data.users); setTotal(r.data.total); }
    catch { alert('Impossible de charger les utilisateurs'); }
    finally { setLoading(false); }
  };

  const openModal = (u: User) => {
    setSel(u); setNotes(u.admin_notes || '');
    setEditName(u.name || ''); setEditEmail(u.email || '');
    setEditPhone(u.phone || ''); setEditAddress(u.address || '');
    setEditMode(false); setShowModal(true);
  };

  const saveInfo = async () => {
    if (!sel) return;
    setSaving(true);
    try {
      await api.put(`/api/admin/users/${sel.id}`, { name: editName, email: editEmail, phone: editPhone, address: editAddress, admin_notes: notes });
      setSel({ ...sel, name: editName, email: editEmail, phone: editPhone, address: editAddress, admin_notes: notes });
      setEditMode(false); fetchUsers(); alert('Sauvegarde !');
    } catch { alert('Erreur'); } finally { setSaving(false); }
  };

  const updateRating = async (rating: string) => {
    if (!sel) return;
    try { await api.put(`/api/admin/users/${sel.id}/rating?rating=${rating}`); setSel({ ...sel, client_rating: rating }); fetchUsers(); }
    catch (e: any) { alert('Erreur: ' + (e.response?.data?.detail || 'Erreur')); }
  };

  const handlePhoto = async (type: 'profile' | 'id' | 'license') => {
    if (!sel) return;
    setUploading(type);
    try {
      const ep = type === 'profile' ? `/api/admin/users/${sel.id}/photo` : `/api/admin/users/${sel.id}/${type === 'id' ? 'id-photo' : 'license-photo'}`;
      const photo = await uploadBase64Photo(ep, type === 'profile' ? [1, 1] : [4, 3]);
      if (photo) {
        const field = type === 'profile' ? 'profile_photo' : type === 'id' ? 'id_photo' : 'license_photo';
        setSel({ ...sel, [field]: photo }); fetchUsers();
      }
    } catch { alert('Erreur upload'); } finally { setUploading(null); }
  };

  const handleImport = async (e: any) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const r = await api.post('/api/admin/import-users', fd);
      let msg = r.data.message;
      if (r.data.errors?.length) msg += '\n\nErreurs:\n' + r.data.errors.join('\n');
      alert(msg); fetchUsers();
    } catch (e: any) { alert(e.response?.data?.detail || 'Erreur import'); }
    finally { setImporting(false); e.target.value = ''; }
  };

  const renderItem = ({ item }: { item: User }) => {
    const ri = getRating(item.client_rating);
    const cardW = (SCREEN_W - 32 - 24) / 3;
    return (
      <TouchableOpacity style={[st.card, { backgroundColor: C.card, width: cardW }]} onPress={() => openModal(item)} data-testid={`user-card-${item.id}`}>
        {/* Avatar */}
        <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 6, position: 'relative' }}>
          {item.profile_photo ? <Image source={{ uri: item.profile_photo }} style={st.avatar} /> :
            <View style={[st.avatar, { backgroundColor: C.bg }]}><Text style={{ fontSize: 18, fontWeight: '700', color: C.accent }}>{item.name.charAt(0).toUpperCase()}</Text></View>}
          <View style={[st.ratingDot, { backgroundColor: ri.color }]}><Ionicons name={ri.icon as any} size={10} color="#fff" /></View>
          {item.blocked && <View style={[st.blockedBadge, { backgroundColor: C.error + '20', position: 'absolute', top: 6, right: 6 }]}><Text style={{ color: C.error, fontSize: 10, fontWeight: '700' }}>Bloque</Text></View>}
        </View>
        {/* Info */}
        <View style={{ paddingHorizontal: 8, paddingBottom: 10 }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: C.text, textAlign: 'center' }} numberOfLines={1}>{item.name}</Text>
          <Text style={{ fontSize: 14, color: C.textLight, textAlign: 'center', marginTop: 2 }} numberOfLines={1}>{item.email}</Text>
          {item.phone && <Text style={{ fontSize: 14, color: C.textLight, textAlign: 'center' }} numberOfLines={1}>{item.phone}</Text>}
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Ionicons name="calendar" size={11} color={C.textLight} />
              <Text style={{ fontSize: 11, color: C.textLight }}>{item.reservation_count}</Text>
            </View>
            <View style={[st.ratingTag, { backgroundColor: ri.color + '20', paddingHorizontal: 6, paddingVertical: 2 }]}>
              <Ionicons name={ri.icon as any} size={10} color={ri.color} />
              <Text style={{ fontSize: 11, fontWeight: '600', color: ri.color }}>{ri.label}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={[st.header, { backgroundColor: C.card, borderBottomColor: C.border }]}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>{total} utilisateurs</Text>
        <TouchableOpacity style={[st.importBtn, { backgroundColor: C.accent }]} onPress={() => Platform.OS === 'web' ? importRef.current?.click() : alert('Import Excel disponible sur web')} disabled={importing} data-testid="import-excel-btn">
          <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>{importing ? 'Import...' : 'Importer Excel'}</Text>
        </TouchableOpacity>
        {Platform.OS === 'web' && <input ref={(el: any) => { importRef.current = el; }} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' } as any} onChange={handleImport} />}
      </View>
      <FlatList data={users} renderItem={renderItem} keyExtractor={i => i.id} contentContainerStyle={{ padding: 16 }}
        numColumns={3}
        columnWrapperStyle={{ gap: 10, marginBottom: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await fetchUsers(); setRefreshing(false); }} />}
        ListEmptyComponent={!loading ? <View style={{ alignItems: 'center', paddingTop: 60 }}><Ionicons name="people-outline" size={48} color={C.textLight} /><Text style={{ color: C.textLight, marginTop: 12 }}>Aucun utilisateur</Text></View> : null}
      />

      {/* User Detail Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <View style={{ flex: 1, backgroundColor: C.bg }}>
          <View style={[st.modalHeader, { backgroundColor: C.card, borderBottomColor: C.border }]}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: C.text }}>Details du client</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}><Ionicons name="close" size={24} color={C.text} /></TouchableOpacity>
          </View>
          {sel && (
            <ScrollView style={{ flex: 1, padding: 20 }}>
              {/* Profile Photo */}
              <View style={{ alignItems: 'center', marginBottom: 24 }}>
                <TouchableOpacity onPress={() => handlePhoto('profile')} disabled={uploading === 'profile'}>
                  {uploading === 'profile' ? <View style={[st.bigAvatar, { backgroundColor: C.bg }]}><ActivityIndicator color={C.accent} /></View>
                    : sel.profile_photo ? <Image source={{ uri: sel.profile_photo }} style={st.bigAvatar} />
                    : <View style={[st.bigAvatar, { backgroundColor: C.bg }]}><Text style={{ fontSize: 28, fontWeight: '700', color: C.accent }}>{sel.name.charAt(0).toUpperCase()}</Text></View>}
                  <View style={[st.camBtn, { backgroundColor: C.accent }]}><Ionicons name="camera" size={14} color="#fff" /></View>
                </TouchableOpacity>
                <Text style={{ fontSize: 18, fontWeight: '700', color: C.text, marginTop: 12 }}>{sel.name}</Text>
                <Text style={{ fontSize: 14, color: C.textLight }}>{sel.email}</Text>
              </View>

              {/* Rating */}
              <View style={[st.section, { backgroundColor: C.card }]}>
                <Text style={[st.sectionTitle, { color: C.text }]}>Evaluation</Text>
                <View style={st.ratingsWrap}>
                  {USER_RATINGS.map(r => (
                    <TouchableOpacity key={r.value}
                      style={[st.ratingOpt, { borderColor: r.color, backgroundColor: sel.client_rating === r.value ? r.color : 'transparent' }]}
                      onPress={() => updateRating(r.value)} data-testid={`rating-${r.value}`}>
                      <Ionicons name={r.icon as any} size={18} color={sel.client_rating === r.value ? '#fff' : r.color} />
                      <Text style={{ fontSize: 12, fontWeight: '600', color: sel.client_rating === r.value ? '#fff' : r.color }}>{r.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Notes */}
              <View style={[st.section, { backgroundColor: C.card }]}>
                <Text style={[st.sectionTitle, { color: C.text }]}>Notes</Text>
                <TextInput style={[st.notesInput, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]} value={notes} onChangeText={setNotes}
                  placeholder="Notes sur ce client..." placeholderTextColor={C.textLight} multiline numberOfLines={4} />
                <Button title="Sauvegarder" onPress={saveInfo} loading={saving} variant="outline" style={{ marginTop: 12 }} />
              </View>

              {/* Documents */}
              <View style={[st.section, { backgroundColor: C.card }]}>
                <Text style={[st.sectionTitle, { color: C.text }]}>Documents</Text>
                <View style={st.docsGrid}>
                  {[{ type: 'id' as const, label: "Piece d'identite", photo: sel.id_photo }, { type: 'license' as const, label: 'Permis de conduire', photo: sel.license_photo }].map(doc => (
                    <View key={doc.type} style={{ width: '48%' }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: C.textLight, marginBottom: 8 }}>{doc.label}</Text>
                      <TouchableOpacity onPress={() => handlePhoto(doc.type)} disabled={uploading === doc.type}>
                        {uploading === doc.type ? <View style={[st.docPlaceholder, { borderColor: C.border }]}><ActivityIndicator color={C.accent} /></View>
                          : doc.photo ? <View><Image source={{ uri: doc.photo }} style={st.docImg} /><View style={st.docOverlay}><Ionicons name="camera" size={20} color="#fff" /></View></View>
                          : <View style={[st.docPlaceholder, { borderColor: C.border }]}><Ionicons name="add-circle" size={28} color={C.accent} /><Text style={{ color: C.accent, fontSize: 11, marginTop: 4 }}>Ajouter</Text></View>}
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>

              {/* User Info */}
              <View style={[st.section, { backgroundColor: C.card }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={[st.sectionTitle, { color: C.text, marginBottom: 0 }]}>Informations</Text>
                  <TouchableOpacity onPress={() => editMode ? saveInfo() : setEditMode(true)}>
                    <Text style={{ color: C.accent, fontWeight: '600' }}>{editMode ? 'Sauvegarder' : 'Modifier'}</Text>
                  </TouchableOpacity>
                </View>
                {editMode ? (
                  <View style={{ gap: 12 }}>
                    {[{ label: 'Nom', val: editName, set: setEditName }, { label: 'Email', val: editEmail, set: setEditEmail },
                      { label: 'Telephone', val: editPhone, set: setEditPhone }, { label: 'Adresse', val: editAddress, set: setEditAddress }].map((f, i) => (
                      <View key={i}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: C.textLight, marginBottom: 4 }}>{f.label}</Text>
                        <TextInput style={[st.editInput, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]} value={f.val} onChangeText={f.set} />
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={{ gap: 10 }}>
                    {[{ icon: 'person', val: sel.name }, { icon: 'mail', val: sel.email }, { icon: 'call', val: sel.phone }, { icon: 'location', val: sel.address }].map((f, i) => (
                      <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Ionicons name={f.icon as any} size={18} color={C.textLight} />
                        <Text style={{ fontSize: 14, color: C.text }}>{f.val || '—'}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  card: { borderRadius: 10, overflow: 'hidden' },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  ratingDot: { position: 'absolute', bottom: 4, right: -2, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  blockedBadge: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  ratingTag: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 4 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  importBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, gap: 6 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  bigAvatar: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center' },
  camBtn: { position: 'absolute', bottom: 0, right: -4, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  section: { borderRadius: 12, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  ratingsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ratingOpt: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1, gap: 6 },
  notesInput: { borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 14, minHeight: 80, textAlignVertical: 'top' },
  docsGrid: { flexDirection: 'row', gap: 12 },
  docImg: { width: '100%', height: 100, borderRadius: 10 },
  docPlaceholder: { width: '100%', height: 100, borderRadius: 10, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  docOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  editInput: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 14 },
});
