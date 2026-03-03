import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Image, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../src/api/axios';

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
  birth_place?: string; birth_year?: number; license_number?: string;
  license_issue_date?: string; license_expiry_date?: string; nationality?: string;
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
  const [editBirthYear, setEditBirthYear] = useState('');
  const [editLicenseNumber, setEditLicenseNumber] = useState('');
  const [editLicenseIssue, setEditLicenseIssue] = useState('');
  const [editLicenseExpiry, setEditLicenseExpiry] = useState('');
  const [editNationality, setEditNationality] = useState('');
  const [fullClient, setFullClient] = useState<Client | null>(null);

  React.useEffect(() => {
    if (visible && client) {
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
      setFullClient(client);
      // Fetch full details
      setLoadingDetail(true);
      api.get(`/api/admin/users/${client.id}`).then(res => {
        const d = res.data;
        setEditAddress(d.address || '');
        setEditNotes(d.admin_notes || '');
        setEditBirthPlace(d.birth_place || '');
        setEditBirthYear(d.birth_year ? String(d.birth_year) : '');
        setEditLicenseNumber(d.license_number || '');
        setEditLicenseIssue(d.license_issue_date || '');
        setEditLicenseExpiry(d.license_expiry_date || '');
        setEditNationality(d.nationality || '');
        setFullClient({ ...client, ...d });
      }).catch(console.error).finally(() => setLoadingDetail(false));
    }
  }, [visible, client?.id]);

  const saveEdit = async () => {
    if (!client) return;
    if (!editBirthPlace || !editBirthYear || !editLicenseNumber || !editLicenseIssue || !editLicenseExpiry || !editNationality) {
      const msg = 'Veuillez remplir tous les champs obligatoires (lieu/annee naissance, permis, nationalite)';
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
      payload.birth_year = parseInt(editBirthYear) || null;
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
                  <Text style={[st.label, { color: C.textLight }]}>Annee de naissance *</Text>
                  <TextInput style={[st.input, { backgroundColor: C.bg, color: C.text, borderColor: !editBirthYear ? '#EF444450' : C.border }]} value={editBirthYear} onChangeText={setEditBirthYear} placeholder="1990" placeholderTextColor={C.textLight} keyboardType="numeric" data-testid="edit-birth-year" />
                </View>
              </View>

              <Text style={[st.label, { color: C.textLight, marginTop: 10 }]}>Nationalite *</Text>
              <TextInput style={[st.input, { backgroundColor: C.bg, color: C.text, borderColor: !editNationality ? '#EF444450' : C.border }]} value={editNationality} onChangeText={setEditNationality} placeholder="Suisse" placeholderTextColor={C.textLight} data-testid="edit-nationality" />

              <Text style={[st.label, { color: C.textLight, marginTop: 10 }]}>Permis No *</Text>
              <TextInput style={[st.input, { backgroundColor: C.bg, color: C.text, borderColor: !editLicenseNumber ? '#EF444450' : C.border }]} value={editLicenseNumber} onChangeText={setEditLicenseNumber} placeholder="GE-123456" placeholderTextColor={C.textLight} data-testid="edit-license-number" />

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[st.label, { color: C.textLight }]}>Date d'emission *</Text>
                  <TextInput style={[st.input, { backgroundColor: C.bg, color: C.text, borderColor: !editLicenseIssue ? '#EF444450' : C.border }]} value={editLicenseIssue} onChangeText={setEditLicenseIssue} placeholder="AAAA-MM-JJ" placeholderTextColor={C.textLight} data-testid="edit-license-issue" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[st.label, { color: C.textLight }]}>Date d'expiration *</Text>
                  <TextInput style={[st.input, { backgroundColor: C.bg, color: C.text, borderColor: !editLicenseExpiry ? '#EF444450' : C.border }]} value={editLicenseExpiry} onChangeText={setEditLicenseExpiry} placeholder="AAAA-MM-JJ" placeholderTextColor={C.textLight} data-testid="edit-license-expiry" />
                </View>
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
