import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Image, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../src/api/axios';
import { formatDateInput } from '../../../src/utils/dateMask';
import { WebcamCapture } from '../../../src/components/WebcamCapture';

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
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
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
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [webcamDocType, setWebcamDocType] = useState<string | null>(null);

  const handleWebcamCapture = async (dataUri: string) => {
    if (!client || !webcamDocType) return;
    const type = webcamDocType as 'id' | 'id_back' | 'license' | 'license_back';
    setUploadingDoc(type);
    try {
      const resp = await api.post(`/api/admin/client/${client.id}/document`, { image_data: dataUri, doc_type: type });
      const v = resp.data.verification || {};
      const msg = v.is_valid === false ? `Document rejete: ${v.reason || 'Invalide'}` : `Document uploade (${v.confidence || 0}% confiance)`;
      window.alert(msg);
      if (fullClient) {
        const field = type === 'id' ? 'id_photo' : type === 'id_back' ? 'id_photo_back' : type === 'license' ? 'license_photo' : 'license_photo_back';
        setFullClient({ ...fullClient, [field]: dataUri });
      }
    } catch (err: any) { window.alert(err?.response?.data?.detail || 'Erreur upload'); }
    finally { setUploadingDoc(null); setWebcamDocType(null); }
  };
  const idFrontRef = useRef<HTMLInputElement | null>(null);
  const idBackRef = useRef<HTMLInputElement | null>(null);
  const licenseFrontRef = useRef<HTMLInputElement | null>(null);
  const licenseBackRef = useRef<HTMLInputElement | null>(null);
  const idFrontCamRef = useRef<HTMLInputElement | null>(null);
  const idBackCamRef = useRef<HTMLInputElement | null>(null);
  const licenseFrontCamRef = useRef<HTMLInputElement | null>(null);
  const licenseBackCamRef = useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (visible && client) {
      setEditName(client.name || '');
      const fn = client.first_name || '';
      const ln = client.last_name || '';
      if (!fn && !ln && client.name) {
        const parts = client.name.trim().split(' ');
        if (parts.length >= 2) {
          setEditFirstName(parts.slice(0, -1).join(' '));
          setEditLastName(parts[parts.length - 1]);
        } else {
          setEditLastName(parts[0] || '');
          setEditFirstName('');
        }
      } else {
        setEditFirstName(fn);
        setEditLastName(ln);
      }
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
      setLoadingDetail(true);
      api.get(`/api/admin/users/${client.id}`).then(res => {
        const d = res.data;
        setEditAddress(d.address || '');
        if (d.first_name || d.last_name) {
          setEditFirstName(d.first_name || '');
          setEditLastName(d.last_name || '');
        } else if (d.name) {
          const parts = d.name.trim().split(' ');
          if (parts.length >= 2) {
            setEditFirstName(parts.slice(0, -1).join(' '));
            setEditLastName(parts[parts.length - 1]);
          } else {
            setEditLastName(parts[0] || '');
          }
        }
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
    if (!accepted.includes(file.type)) { window.alert('Format non accepte. JPG, PNG ou WebP.'); e.target.value = ''; return; }
    if (file.size > 10 * 1024 * 1024) { window.alert('Fichier trop volumineux (max 10 MB).'); e.target.value = ''; return; }
    setUploadingDoc(type);
    try {
      const reader = new FileReader();
      const dataUri: string = await new Promise((res, rej) => { reader.onload = () => res(reader.result as string); reader.onerror = () => rej(new Error('Read error')); reader.readAsDataURL(file); });
      const resp = await api.post(`/api/admin/client/${client.id}/document`, { image_data: dataUri, doc_type: type });
      const v = resp.data.verification || {};
      const msg = v.is_valid === false ? `Document rejete: ${v.reason || 'Invalide'}` : `Document uploade (${v.confidence || 0}% confiance)${v.reason ? '\n' + v.reason : ''}`;
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
      const composedName = [editFirstName, editLastName].filter(Boolean).join(' ') || editName;
      payload.name = composedName;
      payload.first_name = editFirstName;
      payload.last_name = editLastName;
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

  const deleteClient = async () => {
    if (!client) return;
    const confirm = Platform.OS === 'web'
      ? window.confirm(`Supprimer definitivement ${client.name} ? Cette action est irreversible.`)
      : true;
    if (!confirm) return;
    try {
      await api.delete(`/api/admin/users/${client.id}`);
      Platform.OS === 'web' ? window.alert('Client supprime') : Alert.alert('Succes', 'Client supprime');
      onClose();
      onSaved();
    } catch (e: any) {
      const msg = e.response?.data?.detail || 'Erreur lors de la suppression';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Erreur', msg);
    }
  };

  return (
  <>
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={st.overlay}>
        <View style={[st.modal, { backgroundColor: C.card }]}>
          {/* Header - like vehicle modal */}
          <View style={st.header}>
            <Text style={[st.title, { color: C.text }]}>Modifier le client</Text>
            <TouchableOpacity onPress={onClose} data-testid="close-edit-modal">
              <Ionicons name="close" size={24} color={C.text} />
            </TouchableOpacity>
          </View>

          {loadingDetail ? (
            <View style={{ padding: 20, alignItems: 'center' }}><ActivityIndicator size="small" color={C.accent} /></View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 30 }}>

              {/* Classement - like vehicle Status selector */}
              <Text style={[st.upperLabel, { color: C.textLight }]}>CLASSEMENT</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                {RATINGS.map((r) => (
                  <TouchableOpacity key={r.value}
                    style={[st.ratingBtn, { borderColor: editRating === r.value ? r.color : C.border, backgroundColor: editRating === r.value ? r.color + '15' : C.bg }]}
                    onPress={() => setEditRating(editRating === r.value ? '' : r.value)}
                    data-testid={`rating-${r.value}`}>
                    <Ionicons name={r.icon} size={14} color={editRating === r.value ? r.color : C.textLight} />
                    <Text style={{ color: editRating === r.value ? r.color : C.textLight, fontSize: 12, fontWeight: '700' }}>{r.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* NOM / PRENOM - two columns */}
              <View style={st.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[st.upperLabel, { color: C.textLight }]}>NOM</Text>
                  <TextInput style={[st.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]} value={editLastName} onChangeText={setEditLastName} placeholder="Nom de famille" placeholderTextColor={C.textLight + '80'} data-testid="edit-client-lastname" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[st.upperLabel, { color: C.textLight }]}>PRENOM</Text>
                  <TextInput style={[st.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]} value={editFirstName} onChangeText={setEditFirstName} placeholder="Prenom" placeholderTextColor={C.textLight + '80'} data-testid="edit-client-firstname" />
                </View>
              </View>

              {/* EMAIL / TELEPHONE - two columns */}
              <View style={st.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[st.upperLabel, { color: C.textLight }]}>EMAIL</Text>
                  <TextInput style={[st.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]} value={editEmail} onChangeText={setEditEmail} placeholder="email@example.com" placeholderTextColor={C.textLight + '80'} keyboardType="email-address" autoCapitalize="none" data-testid="edit-client-email" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[st.upperLabel, { color: C.textLight }]}>TELEPHONE</Text>
                  <TextInput style={[st.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]} value={editPhone} onChangeText={setEditPhone} placeholder="+41 XX XXX XX XX" placeholderTextColor={C.textLight + '80'} keyboardType="phone-pad" data-testid="edit-client-phone" />
                </View>
              </View>

              {/* ADRESSE - full width */}
              <Text style={[st.upperLabel, { color: C.textLight }]}>ADRESSE</Text>
              <TextInput style={[st.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]} value={editAddress} onChangeText={setEditAddress} placeholder="Adresse du client" placeholderTextColor={C.textLight + '80'} data-testid="edit-client-address" />

              {/* ===== Section: Identite & Permis ===== */}
              <View style={[st.sectionDivider, { borderTopColor: C.border }]}>
                <Ionicons name="id-card" size={16} color={C.accent} />
                <Text style={[st.sectionTitle, { color: C.text }]}>Identite & Permis</Text>
              </View>

              <View style={st.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[st.upperLabel, { color: C.textLight }]}>LIEU DE NAISSANCE *</Text>
                  <TextInput style={[st.input, { backgroundColor: C.bg, color: C.text, borderColor: !editBirthPlace ? '#EF444450' : C.border }]} value={editBirthPlace} onChangeText={setEditBirthPlace} placeholder="Geneve" placeholderTextColor={C.textLight + '80'} data-testid="edit-birth-place" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[st.upperLabel, { color: C.textLight }]}>DATE DE NAISSANCE *</Text>
                  <TextInput style={[st.input, { backgroundColor: C.bg, color: C.text, borderColor: !editBirthDate ? '#EF444450' : C.border }]} value={editBirthDate} onChangeText={(v) => setEditBirthDate(formatDateInput(v))} placeholder="JJ-MM-AAAA" placeholderTextColor={C.textLight + '80'} data-testid="edit-birth-date" />
                </View>
              </View>

              <View style={st.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[st.upperLabel, { color: C.textLight }]}>NATIONALITE *</Text>
                  <TextInput style={[st.input, { backgroundColor: C.bg, color: C.text, borderColor: !editNationality ? '#EF444450' : C.border }]} value={editNationality} onChangeText={setEditNationality} placeholder="Suisse" placeholderTextColor={C.textLight + '80'} data-testid="edit-nationality" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[st.upperLabel, { color: C.textLight }]}>NUMERO DE PERMIS *</Text>
                  <TextInput style={[st.input, { backgroundColor: C.bg, color: C.text, borderColor: !editLicenseNumber ? '#EF444450' : C.border }]} value={editLicenseNumber} onChangeText={setEditLicenseNumber} placeholder="GE-123456" placeholderTextColor={C.textLight + '80'} data-testid="edit-license-number" />
                </View>
              </View>

              <View style={st.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[st.upperLabel, { color: C.textLight }]}>DATE D'EMISSION *</Text>
                  <TextInput style={[st.input, { backgroundColor: C.bg, color: C.text, borderColor: !editLicenseIssue ? '#EF444450' : C.border }]} value={editLicenseIssue} onChangeText={(v) => setEditLicenseIssue(formatDateInput(v))} placeholder="JJ-MM-AAAA" placeholderTextColor={C.textLight + '80'} data-testid="edit-license-issue" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[st.upperLabel, { color: C.textLight }]}>DATE D'EXPIRATION *</Text>
                  <TextInput style={[st.input, { backgroundColor: C.bg, color: C.text, borderColor: !editLicenseExpiry ? '#EF444450' : C.border }]} value={editLicenseExpiry} onChangeText={(v) => setEditLicenseExpiry(formatDateInput(v))} placeholder="JJ-MM-AAAA" placeholderTextColor={C.textLight + '80'} data-testid="edit-license-expiry" />
                </View>
              </View>

              {/* ===== Section: Documents ===== */}
              <View style={[st.sectionDivider, { borderTopColor: C.border }]}>
                <Ionicons name="document-attach" size={16} color={C.accent} />
                <Text style={[st.sectionTitle, { color: C.text }]}>Documents (Photos)</Text>
              </View>
              {Platform.OS === 'web' && (
                <>
                  <input ref={(el: any) => { idFrontRef.current = el; }} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={(e: any) => handleDocUpload(e, 'id')} />
                  <input ref={(el: any) => { idBackRef.current = el; }} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={(e: any) => handleDocUpload(e, 'id_back')} />
                  <input ref={(el: any) => { licenseFrontRef.current = el; }} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={(e: any) => handleDocUpload(e, 'license')} />
                  <input ref={(el: any) => { licenseBackRef.current = el; }} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={(e: any) => handleDocUpload(e, 'license_back')} />
                  <input ref={(el: any) => { idFrontCamRef.current = el; }} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e: any) => handleDocUpload(e, 'id')} />
                  <input ref={(el: any) => { idBackCamRef.current = el; }} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e: any) => handleDocUpload(e, 'id_back')} />
                  <input ref={(el: any) => { licenseFrontCamRef.current = el; }} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e: any) => handleDocUpload(e, 'license')} />
                  <input ref={(el: any) => { licenseBackCamRef.current = el; }} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e: any) => handleDocUpload(e, 'license_back')} />
                </>
              )}

              <Text style={[st.upperLabel, { color: C.textLight }]}>PIECE D'IDENTITE</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                {[
                  { label: 'Recto', field: 'id_photo', ref: idFrontRef, camRef: idFrontCamRef, type: 'id' as const },
                  { label: 'Verso', field: 'id_photo_back', ref: idBackRef, camRef: idBackCamRef, type: 'id_back' as const },
                ].map(doc => (
                  <View key={doc.field} style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ color: C.textLight, fontSize: 11, marginBottom: 4 }}>{doc.label}</Text>
                    {(fullClient as any)?.[doc.field] ? (
                      <TouchableOpacity onPress={() => setPreviewPhoto((fullClient as any)[doc.field]!)} activeOpacity={0.8} style={{ width: '100%', height: 100, borderRadius: 8, overflow: 'hidden' }}>
                        <Image source={{ uri: (fullClient as any)[doc.field] }} style={{ width: '100%', height: 100, borderRadius: 8 }} resizeMode="cover" />
                        <View style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
                          <Ionicons name="expand" size={10} color="#fff" />
                        </View>
                      </TouchableOpacity>
                    ) : (
                      <View style={{ width: '100%', height: 100, borderRadius: 8, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed' }}>
                        <Ionicons name="card-outline" size={22} color="#9CA3AF" />
                      </View>
                    )}
                    {uploadingDoc === doc.type ? <ActivityIndicator size="small" color="#7C3AED" style={{ marginTop: 6 }} /> : (
                      <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                        <TouchableOpacity style={{ backgroundColor: '#7C3AED', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }} onPress={() => setWebcamDocType(doc.type)}>
                          <Ionicons name="camera" size={12} color="#FFF" />
                          <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '600' }}>Photo</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={{ backgroundColor: '#EDE9FE', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }} onPress={() => doc.ref.current?.click()}>
                          <Ionicons name="folder-open" size={12} color="#7C3AED" />
                          <Text style={{ color: '#7C3AED', fontSize: 10, fontWeight: '600' }}>Fichier</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
              </View>

              <Text style={[st.upperLabel, { color: C.textLight }]}>PERMIS DE CONDUIRE</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
                {[
                  { label: 'Recto', field: 'license_photo', ref: licenseFrontRef, camRef: licenseFrontCamRef, type: 'license' as const },
                  { label: 'Verso', field: 'license_photo_back', ref: licenseBackRef, camRef: licenseBackCamRef, type: 'license_back' as const },
                ].map(doc => (
                  <View key={doc.field} style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ color: C.textLight, fontSize: 11, marginBottom: 4 }}>{doc.label}</Text>
                    {(fullClient as any)?.[doc.field] ? (
                      <TouchableOpacity onPress={() => setPreviewPhoto((fullClient as any)[doc.field]!)} activeOpacity={0.8} style={{ width: '100%', height: 100, borderRadius: 8, overflow: 'hidden' }}>
                        <Image source={{ uri: (fullClient as any)[doc.field] }} style={{ width: '100%', height: 100, borderRadius: 8 }} resizeMode="cover" />
                        <View style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
                          <Ionicons name="expand" size={10} color="#fff" />
                        </View>
                      </TouchableOpacity>
                    ) : (
                      <View style={{ width: '100%', height: 100, borderRadius: 8, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed' }}>
                        <Ionicons name="id-card-outline" size={22} color="#9CA3AF" />
                      </View>
                    )}
                    {uploadingDoc === doc.type ? <ActivityIndicator size="small" color="#7C3AED" style={{ marginTop: 6 }} /> : (
                      <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                        <TouchableOpacity style={{ backgroundColor: '#7C3AED', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }} onPress={() => setWebcamDocType(doc.type)}>
                          <Ionicons name="camera" size={12} color="#FFF" />
                          <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '600' }}>Photo</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={{ backgroundColor: '#EDE9FE', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }} onPress={() => doc.ref.current?.click()}>
                          <Ionicons name="folder-open" size={12} color="#7C3AED" />
                          <Text style={{ color: '#7C3AED', fontSize: 10, fontWeight: '600' }}>Fichier</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
              </View>
              <Text style={{ color: C.textLight, fontSize: 10, marginBottom: 8 }}>Formats acceptes: JPG, PNG, WebP (max 10 MB). Verification IA automatique.</Text>

              {/* ===== Section: Notes ===== */}
              <View style={[st.sectionDivider, { borderTopColor: C.border }]}>
                <Ionicons name="chatbox-ellipses" size={16} color={C.accent} />
                <Text style={[st.sectionTitle, { color: C.text }]}>Notes admin</Text>
              </View>
              <TextInput style={[st.input, st.textArea, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]} value={editNotes} onChangeText={setEditNotes} placeholder="Notes internes..." placeholderTextColor={C.textLight + '80'} multiline numberOfLines={3} data-testid="edit-client-notes" />

              {/* ===== Bottom Buttons - like vehicle modal ===== */}
              <View style={st.bottomBtns}>
                <TouchableOpacity style={[st.cancelBtn, { borderColor: C.border }]} onPress={onClose}>
                  <Text style={{ color: C.textLight, fontSize: 14, fontWeight: '600' }}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[st.saveBtn, { backgroundColor: C.primary || C.accent }, saving && { opacity: 0.6 }]} onPress={saveEdit} disabled={saving} data-testid="save-edit-client-btn">
                  {saving ? <ActivityIndicator size="small" color="#fff" /> : (
                    <>
                      <Ionicons name="checkmark" size={18} color="#fff" />
                      <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Sauvegarder</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Delete */}
              <TouchableOpacity style={st.deleteBtn} onPress={deleteClient} data-testid="delete-client-btn">
                <Ionicons name="trash" size={16} color="#EF4444" />
                <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '700' }}>Supprimer ce client</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>

    {/* Webcam Capture Modal */}
    <WebcamCapture
      visible={!!webcamDocType}
      onClose={() => setWebcamDocType(null)}
      onCapture={handleWebcamCapture}
      title={webcamDocType?.includes('id') ? "Photographier la piece d'identite" : "Photographier le permis de conduire"}
    />

    {/* Photo Preview Modal */}
    <Modal visible={!!previewPhoto} transparent animationType="fade" onRequestClose={() => setPreviewPhoto(null)}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 16, paddingTop: Platform.OS === 'web' ? 16 : 40 }}>
          <TouchableOpacity onPress={() => setPreviewPhoto(null)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' }} data-testid="close-doc-preview">
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          {previewPhoto && <Image source={{ uri: previewPhoto }} style={{ width: '90%', height: '80%' }} resizeMode="contain" />}
        </View>
      </View>
    </Modal>
  </>
  );
};

const st = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%', overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  title: { fontSize: 18, fontWeight: '800' },
  upperLabel: { fontSize: 11, fontWeight: '700', marginBottom: 4, marginTop: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, borderWidth: 1 },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 10 },
  sectionDivider: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, marginBottom: 4, paddingTop: 14, borderTopWidth: 1 },
  sectionTitle: { fontSize: 14, fontWeight: '700' },
  ratingBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5 },
  bottomBtns: { flexDirection: 'row', gap: 10, marginTop: 24 },
  cancelBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1 },
  saveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, marginTop: 12, borderRadius: 10, borderWidth: 1, borderColor: '#EF444440' },
});
