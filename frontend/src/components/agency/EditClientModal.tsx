import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Image, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../src/api/axios';
import { formatDateInput } from '../../../src/utils/dateMask';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

const RATINGS = [
  { value: 'vip', label: 'VIP', icon: 'star' as const, color: '#8B5CF6' },
  { value: 'good', label: 'Bon', icon: 'thumbs-up' as const, color: '#22c55e' },
  { value: 'neutral', label: 'Neutre', icon: 'remove-circle' as const, color: '#9ca3af' },
  { value: 'bad', label: 'Mauvais', icon: 'thumbs-down' as const, color: '#f59e0b' },
  { value: 'blocked', label: 'Bloque', icon: 'ban' as const, color: '#ef4444' },
];

interface Client {
  id: string; name: string; email: string; phone?: string;
  client_rating?: string; reservation_count?: number; created_at?: string;
  profile_photo?: string; address?: string; admin_notes?: string;
  total_spent?: number; total_reservations?: number;
  birth_place?: string; date_of_birth?: string; license_number?: string;
  license_issue_date?: string; license_expiry_date?: string; nationality?: string;
  id_photo?: string; id_photo_back?: string; license_photo?: string; license_photo_back?: string;
  id_verification?: any; license_verification?: any;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  client: Client | null;
  C: any;
  onSaved: () => void;
}

export const EditClientModal = ({ visible, onClose, client, C, onSaved }: Props) => {
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editRating, setEditRating] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editBirthPlace, setEditBirthPlace] = useState('');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editLicenseNumber, setEditLicenseNumber] = useState('');
  const [editLicenseIssue, setEditLicenseIssue] = useState('');
  const [editLicenseExpiry, setEditLicenseExpiry] = useState('');
  const [editNationality, setEditNationality] = useState('');
  const [fullClient, setFullClient] = useState<Client | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const idFrontRef = useRef<HTMLInputElement | null>(null);
  const idBackRef = useRef<HTMLInputElement | null>(null);
  const licenseFrontRef = useRef<HTMLInputElement | null>(null);
  const licenseBackRef = useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (visible && client) {
      setEditName(client.name || '');
      setEditEmail(client.email || '');
      setEditPhone(client.phone || '');
      setEditAddress(client.address || '');
      setEditRating(client.client_rating || '');
      setEditNotes(client.admin_notes || '');
      setEditBirthPlace(client.birth_place || '');
      setEditBirthDate(client.date_of_birth || '');
      setEditLicenseNumber(client.license_number || '');
      setEditLicenseIssue(client.license_issue_date || '');
      setEditLicenseExpiry(client.license_expiry_date || '');
      setEditNationality(client.nationality || '');
      setFullClient(client);
      // Fetch full details
      setLoadingDetail(true);
      api.get(`/api/admin/users/${client.id}`).then(res => {
        const d = res.data;
        setEditAddress(d.address || '');
        setEditNotes(d.admin_notes || '');
        setEditBirthPlace(d.birth_place || '');
        setEditBirthDate(d.date_of_birth || '');
        setEditLicenseNumber(d.license_number || '');
        setEditLicenseIssue(d.license_issue_date || '');
        setEditLicenseExpiry(d.license_expiry_date || '');
        setEditNationality(d.nationality || '');
        setFullClient({ ...client, ...d });
      }).catch(console.error).finally(() => setLoadingDetail(false));
    }
  }, [visible, client?.id]);

  const handleDocUpload = async (e: any, type: 'id' | 'id_back' | 'license' | 'license_back') => {
    if (!client) return;
    const file = e.target?.files?.[0];
    if (!file) return;
    const accepted = ['image/jpeg', 'image/png', 'image/webp'];
    if (!accepted.includes(file.type)) { window.alert('Format non accepté. JPG, PNG ou WebP.'); e.target.value = ''; return; }
    if (file.size > 10 * 1024 * 1024) { window.alert('Fichier trop volumineux (max 10 MB).'); e.target.value = ''; return; }
    setUploadingDoc(type);
    try {
      const reader = new FileReader();
      const dataUri: string = await new Promise((res, rej) => { reader.onload = () => res(reader.result as string); reader.onerror = () => rej(new Error('Read error')); reader.readAsDataURL(file); });
      const endpointMap: Record<string, string> = { id: 'upload-id-b64', id_back: 'upload-id-back-b64', license: 'upload-license-b64', license_back: 'upload-license-back-b64' };
      const resp = await api.post(`/api/admin/client/${client.id}/document`, { image_data: dataUri, doc_type: type });
      const v = resp.data.verification || {};
      const msg = v.is_valid === false ? `Document rejeté: ${v.reason || 'Invalide'}` : `Document uploadé (${v.confidence || 0}% confiance)${v.reason ? '\n' + v.reason : ''}`;
      window.alert(msg);
      if (fullClient) {
        const field = type === 'id' ? 'id_photo' : type === 'id_back' ? 'id_photo_back' : type === 'license' ? 'license_photo' : 'license_photo_back';
        setFullClient({ ...fullClient, [field]: dataUri });
      }
    } catch (err: any) { window.alert(err?.response?.data?.detail || err.message || 'Erreur upload'); }
    finally { setUploadingDoc(null); e.target.value = ''; }
  };

  const saveEdit = async () => {
    if (!client) return;
    if (!editBirthPlace || !editBirthDate || !editLicenseNumber || !editLicenseIssue || !editLicenseExpiry || !editNationality) {
      const msg = 'Veuillez remplir tous les champs obligatoires (lieu/date naissance, permis, nationalite)';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Champs manquants', msg);
      return;
    }
    setSaving(true);
    try {
      const payload: any = {};
      const ref = fullClient || client;
      if (editName !== ref.name) payload.name = editName;
      if (editEmail !== ref.email) payload.email = editEmail;
      if (editPhone !== (ref.phone || '')) payload.phone = editPhone;
      if (editAddress !== (ref.address || '')) payload.address = editAddress;
      if (editNotes !== (ref.admin_notes || '')) payload.admin_notes = editNotes;
      if (editRating !== (ref.client_rating || '')) payload.client_rating = editRating || null;
      payload.birth_place = editBirthPlace;
      payload.date_of_birth = editBirthDate;
      payload.license_number = editLicenseNumber;
      payload.license_issue_date = editLicenseIssue;
      payload.license_expiry_date = editLicenseExpiry;
      payload.nationality = editNationality;

      await api.put(`/api/admin/users/${client.id}`, payload);
      onClose();
      onSaved();
      Platform.OS === 'web' ? window.alert('Client mis a jour!') : Alert.alert('Succes', 'Client mis a jour!');
    } catch (e: any) {
      const msg = e.response?.data?.detail || 'Erreur';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Erreur', msg);
    } finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={st.modalOverlay}>
        <View style={[st.modal, { backgroundColor: C.card }]}>
          <View style={st.modalHeader}>
            <Text style={[st.modalTitle, { color: C.text }]}>Modifier le client</Text>
            <TouchableOpacity onPress={onClose} data-testid="close-edit-modal">
              <Ionicons name="close" size={24} color={C.text} />
            </TouchableOpacity>
          </View>
          {loadingDetail ? (
            <View style={{ padding: 20, alignItems: 'center' }}><ActivityIndicator size="small" color={C.accent} /></View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {fullClient && (
                <View style={[st.editHeader, { backgroundColor: C.bg, borderColor: C.border }]}>
                  <View style={[st.editAvatar, { backgroundColor: C.accent + '20' }]}>
                    {fullClient.profile_photo ? <Image source={{ uri: fullClient.profile_photo }} style={st.editAvatarImg} /> : <Ionicons name="person" size={28} color={C.accent} />}
                  </View>
                  <View>
                    <Text style={[st.editHeaderName, { color: C.text }]}>{fullClient.name}</Text>
                    <Text style={{ color: C.textLight, fontSize: 12 }}>{fullClient.total_reservations || fullClient.reservation_count || 0} reservations</Text>
                  </View>
                </View>
              )}

              <Text style={[st.label, { color: C.textLight }]}>Nom</Text>
              <TextInput style={[st.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]} value={editName} onChangeText={setEditName} placeholder="Nom complet" placeholderTextColor={C.textLight} data-testid="edit-client-name" />

              <Text style={[st.label, { color: C.textLight }]}>Email</Text>
              <TextInput style={[st.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]} value={editEmail} onChangeText={setEditEmail} placeholder="email@example.com" placeholderTextColor={C.textLight} keyboardType="email-address" autoCapitalize="none" data-testid="edit-client-email" />

              <Text style={[st.label, { color: C.textLight }]}>Telephone</Text>
              <TextInput style={[st.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]} value={editPhone} onChangeText={setEditPhone} placeholder="+41 XX XXX XX XX" placeholderTextColor={C.textLight} keyboardType="phone-pad" data-testid="edit-client-phone" />

              <Text style={[st.label, { color: C.textLight }]}>Adresse</Text>
              <TextInput style={[st.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]} value={editAddress} onChangeText={setEditAddress} placeholder="Adresse du client" placeholderTextColor={C.textLight} data-testid="edit-client-address" />

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, marginBottom: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border }}>
                <Ionicons name="id-card" size={16} color={C.accent} />
                <Text style={{ color: C.text, fontSize: 14, fontWeight: '700' }}>Identite & Permis *</Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[st.label, { color: C.textLight }]}>Lieu de naissance *</Text>
                  <TextInput style={[st.input, { backgroundColor: C.bg, color: C.text, borderColor: !editBirthPlace ? '#EF444450' : C.border }]} value={editBirthPlace} onChangeText={setEditBirthPlace} placeholder="Geneve" placeholderTextColor={C.textLight} data-testid="edit-birth-place" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[st.label, { color: C.textLight }]}>Date de naissance *</Text>
                  <TextInput style={[st.input, { backgroundColor: C.bg, color: C.text, borderColor: !editBirthDate ? '#EF444450' : C.border }]} value={editBirthDate} onChangeText={(v) => setEditBirthDate(formatDateInput(v))} placeholder="JJ-MM-AAAA" placeholderTextColor={C.textLight} data-testid="edit-birth-date" />
                </View>
              </View>

              <Text style={[st.label, { color: C.textLight, marginTop: 10 }]}>Nationalite *</Text>
              <TextInput style={[st.input, { backgroundColor: C.bg, color: C.text, borderColor: !editNationality ? '#EF444450' : C.border }]} value={editNationality} onChangeText={setEditNationality} placeholder="Suisse" placeholderTextColor={C.textLight} data-testid="edit-nationality" />

              <Text style={[st.label, { color: C.textLight, marginTop: 10 }]}>Permis No *</Text>
              <TextInput style={[st.input, { backgroundColor: C.bg, color: C.text, borderColor: !editLicenseNumber ? '#EF444450' : C.border }]} value={editLicenseNumber} onChangeText={setEditLicenseNumber} placeholder="GE-123456" placeholderTextColor={C.textLight} data-testid="edit-license-number" />

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[st.label, { color: C.textLight }]}>Date d'emission *</Text>
                  <TextInput style={[st.input, { backgroundColor: C.bg, color: C.text, borderColor: !editLicenseIssue ? '#EF444450' : C.border }]} value={editLicenseIssue} onChangeText={(v) => setEditLicenseIssue(formatDateInput(v))} placeholder="JJ-MM-AAAA" placeholderTextColor={C.textLight} data-testid="edit-license-issue" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[st.label, { color: C.textLight }]}>Date d'expiration *</Text>
                  <TextInput style={[st.input, { backgroundColor: C.bg, color: C.text, borderColor: !editLicenseExpiry ? '#EF444450' : C.border }]} value={editLicenseExpiry} onChangeText={(v) => setEditLicenseExpiry(formatDateInput(v))} placeholder="JJ-MM-AAAA" placeholderTextColor={C.textLight} data-testid="edit-license-expiry" />
                </View>
              </View>

              {/* Document Upload Section */}
              <View style={{ marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Ionicons name="document-attach" size={16} color={C.accent} />
                  <Text style={{ color: C.text, fontSize: 14, fontWeight: '700' }}>Documents (Photos)</Text>
                </View>
                {Platform.OS === 'web' && (
                  <>
                    <input ref={(el: any) => { idFrontRef.current = el; }} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={(e: any) => handleDocUpload(e, 'id')} />
                    <input ref={(el: any) => { idBackRef.current = el; }} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={(e: any) => handleDocUpload(e, 'id_back')} />
                    <input ref={(el: any) => { licenseFrontRef.current = el; }} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={(e: any) => handleDocUpload(e, 'license')} />
                    <input ref={(el: any) => { licenseBackRef.current = el; }} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={(e: any) => handleDocUpload(e, 'license_back')} />
                  </>
                )}

                <Text style={[st.label, { color: C.textLight }]}>Piece d'Identite</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ color: C.textLight, fontSize: 11, marginBottom: 4 }}>Recto</Text>
                    {fullClient?.id_photo ? (
                      <Image source={{ uri: fullClient.id_photo }} style={{ width: '100%', height: 80, borderRadius: 8 }} resizeMode="cover" />
                    ) : (
                      <View style={{ width: '100%', height: 80, borderRadius: 8, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed' }}>
                        <Ionicons name="card-outline" size={24} color="#9CA3AF" />
                      </View>
                    )}
                    <TouchableOpacity style={{ marginTop: 6, backgroundColor: fullClient?.id_photo ? '#EDE9FE' : '#7C3AED', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 10 }} onPress={() => idFrontRef.current?.click()} data-testid="admin-upload-id-front">
                      {uploadingDoc === 'id' ? <ActivityIndicator size="small" color="#7C3AED" /> : (
                        <Text style={{ color: fullClient?.id_photo ? '#7C3AED' : '#FFF', fontSize: 11, fontWeight: '600' }}>{fullClient?.id_photo ? 'Modifier' : 'Ajouter'}</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ color: C.textLight, fontSize: 11, marginBottom: 4 }}>Verso</Text>
                    {fullClient?.id_photo_back ? (
                      <Image source={{ uri: fullClient.id_photo_back }} style={{ width: '100%', height: 80, borderRadius: 8 }} resizeMode="cover" />
                    ) : (
                      <View style={{ width: '100%', height: 80, borderRadius: 8, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed' }}>
                        <Ionicons name="card-outline" size={24} color="#9CA3AF" />
                      </View>
                    )}
                    <TouchableOpacity style={{ marginTop: 6, backgroundColor: fullClient?.id_photo_back ? '#EDE9FE' : '#7C3AED', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 10 }} onPress={() => idBackRef.current?.click()} data-testid="admin-upload-id-back">
                      {uploadingDoc === 'id_back' ? <ActivityIndicator size="small" color="#7C3AED" /> : (
                        <Text style={{ color: fullClient?.id_photo_back ? '#7C3AED' : '#FFF', fontSize: 11, fontWeight: '600' }}>{fullClient?.id_photo_back ? 'Modifier' : 'Ajouter'}</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={[st.label, { color: C.textLight }]}>Permis de Conduire</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ color: C.textLight, fontSize: 11, marginBottom: 4 }}>Recto</Text>
                    {fullClient?.license_photo ? (
                      <Image source={{ uri: fullClient.license_photo }} style={{ width: '100%', height: 80, borderRadius: 8 }} resizeMode="cover" />
                    ) : (
                      <View style={{ width: '100%', height: 80, borderRadius: 8, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed' }}>
                        <Ionicons name="id-card-outline" size={24} color="#9CA3AF" />
                      </View>
                    )}
                    <TouchableOpacity style={{ marginTop: 6, backgroundColor: fullClient?.license_photo ? '#EDE9FE' : '#7C3AED', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 10 }} onPress={() => licenseFrontRef.current?.click()} data-testid="admin-upload-license-front">
                      {uploadingDoc === 'license' ? <ActivityIndicator size="small" color="#7C3AED" /> : (
                        <Text style={{ color: fullClient?.license_photo ? '#7C3AED' : '#FFF', fontSize: 11, fontWeight: '600' }}>{fullClient?.license_photo ? 'Modifier' : 'Ajouter'}</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ color: C.textLight, fontSize: 11, marginBottom: 4 }}>Verso</Text>
                    {fullClient?.license_photo_back ? (
                      <Image source={{ uri: fullClient.license_photo_back }} style={{ width: '100%', height: 80, borderRadius: 8 }} resizeMode="cover" />
                    ) : (
                      <View style={{ width: '100%', height: 80, borderRadius: 8, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed' }}>
                        <Ionicons name="id-card-outline" size={24} color="#9CA3AF" />
                      </View>
                    )}
                    <TouchableOpacity style={{ marginTop: 6, backgroundColor: fullClient?.license_photo_back ? '#EDE9FE' : '#7C3AED', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 10 }} onPress={() => licenseBackRef.current?.click()} data-testid="admin-upload-license-back">
                      {uploadingDoc === 'license_back' ? <ActivityIndicator size="small" color="#7C3AED" /> : (
                        <Text style={{ color: fullClient?.license_photo_back ? '#7C3AED' : '#FFF', fontSize: 11, fontWeight: '600' }}>{fullClient?.license_photo_back ? 'Modifier' : 'Ajouter'}</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={{ color: C.textLight, fontSize: 10, marginTop: 8 }}>Formats acceptés: JPG, PNG, WebP (max 10 MB). Vérification IA automatique.</Text>
              </View>

              <Text style={[st.label, { color: C.textLight, marginTop: 12 }]}>Classement</Text>
              <View style={st.ratingRow}>
                {RATINGS.map((r) => (
                  <TouchableOpacity key={r.value}
                    style={[st.ratingOption, { borderColor: editRating === r.value ? r.color : C.border, backgroundColor: editRating === r.value ? r.color + '15' : C.bg }]}
                    onPress={() => setEditRating(editRating === r.value ? '' : r.value)}
                    data-testid={`rating-${r.value}`}>
                    <Ionicons name={r.icon} size={14} color={editRating === r.value ? r.color : C.textLight} />
                    <Text style={{ color: editRating === r.value ? r.color : C.textLight, fontSize: 11, fontWeight: '600' }}>{r.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[st.label, { color: C.textLight }]}>Notes admin</Text>
              <TextInput style={[st.input, st.textArea, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]} value={editNotes} onChangeText={setEditNotes} placeholder="Notes internes..." placeholderTextColor={C.textLight} multiline numberOfLines={3} data-testid="edit-client-notes" />

              <TouchableOpacity style={[st.saveBtn, { backgroundColor: C.primary }, saving && { opacity: 0.6 }]} onPress={saveEdit} disabled={saving} data-testid="save-edit-client-btn">
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={st.saveBtnText}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const st = StyleSheet.create({
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
});
