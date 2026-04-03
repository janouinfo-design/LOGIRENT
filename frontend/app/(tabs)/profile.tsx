import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../src/store/authStore';
import Input from '../../src/components/Input';
import Button from '../../src/components/Button';
import { useThemeStore } from '../../src/store/themeStore';
import { formatDateInput } from '../../src/utils/dateMask';
import api from '../../src/api/axios';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const _C = {
  purple: '#7C3AED',
  purpleDark: '#5B21B6',
  purpleLight: '#EDE9FE',
  dark: '#1A1A2E',
  gray: '#6B7280',
  grayLight: '#F3F4F6',
  border: '#E5E7EB',
  card: '#FFFFFF',
  bg: '#FAFAFA',
  success: '#10B981',
  error: '#EF4444',
};

export default function ProfileScreen() {
  const { colors: C } = useThemeStore();
  const router = useRouter();
  const { user, logout, updateProfile, uploadLicense, uploadIdCard, uploadLicenseBack, uploadIdCardBack, isAuthenticated, isLoading } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [birthPlace, setBirthPlace] = useState(user?.birth_place || '');
  const [dateOfBirth, setDateOfBirth] = useState(user?.date_of_birth || '');
  const [licenseNumber, setLicenseNumber] = useState(user?.license_number || '');
  const [licenseIssueDate, setLicenseIssueDate] = useState(user?.license_issue_date || '');
  const [licenseExpiryDate, setLicenseExpiryDate] = useState(user?.license_expiry_date || '');
  const [nationality, setNationality] = useState(user?.nationality || '');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingLicense, setUploadingLicense] = useState(false);
  const [uploadingId, setUploadingId] = useState(false);
  const [uploadingIdBack, setUploadingIdBack] = useState(false);
  const [uploadingLicenseBack, setUploadingLicenseBack] = useState(false);
  const [uploadModal, setUploadModal] = useState<null | 'id' | 'license' | 'id_back' | 'license_back'>(null);
  const [lastVerification, setLastVerification] = useState<any>(null);
  const [clientReservations, setClientReservations] = useState<any[]>([]);
  const [loadingReservations, setLoadingReservations] = useState(false);
  const idInputRef = useRef<HTMLInputElement | null>(null);
  const licenseInputRef = useRef<HTMLInputElement | null>(null);
  const idBackInputRef = useRef<HTMLInputElement | null>(null);
  const licenseBackInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isAuthenticated && !isLoading) router.replace('/(auth)/login');
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchClientReservations();
    }
  }, [isAuthenticated, user]);

  const fetchClientReservations = async () => {
    setLoadingReservations(true);
    try {
      const resp = await api.get('/api/client/reservations');
      setClientReservations(resp.data.reservations || []);
    } catch (err) {
      console.error('Failed to fetch reservations:', err);
    } finally {
      setLoadingReservations(false);
    }
  };

  const downloadContractPdf = async (contractId: string) => {
    try {
      const pdfResp = await api.get(`/api/contracts/${contractId}/pdf`, { responseType: 'blob' });
      if (Platform.OS === 'web') {
        const blob = new Blob([pdfResp.data], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `contrat_${contractId.slice(0, 8)}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      Platform.OS === 'web' ? window.alert('Erreur telechargement PDF') : Alert.alert('Erreur');
    }
  };

  const viewContract = async (contractId: string) => {
    try {
      const pdfResp = await api.get(`/api/contracts/${contractId}/pdf`, { responseType: 'blob' });
      if (Platform.OS === 'web') {
        const blob = new Blob([pdfResp.data], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      }
    } catch (err: any) {
      Platform.OS === 'web' ? window.alert('Erreur visualisation contrat') : Alert.alert('Erreur');
    }
  };

  const resStatusColor = (s: string) => {
    const map: Record<string, string> = { pending: '#FBBF24', pending_cash: '#A855F7', confirmed: '#10B981', active: '#3B82F6', completed: '#6B7280', cancelled: '#EF4444' };
    return map[s] || '#6B7280';
  };
  const resStatusLabel = (s: string) => {
    const map: Record<string, string> = { pending: 'Confirmee', pending_cash: 'Especes', confirmed: 'Confirmee', active: 'Active', completed: 'Terminee', cancelled: 'Annulee', signed: 'Signe' };
    return map[s] || s;
  };

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setAddress(user.address || '');
      setBirthPlace(user.birth_place || '');
      setDateOfBirth(user.date_of_birth || '');
      setLicenseNumber(user.license_number || '');
      setLicenseIssueDate(user.license_issue_date || '');
      setLicenseExpiryDate(user.license_expiry_date || '');
      setNationality(user.nationality || '');
    }
  }, [user]);

  if (isLoading || !user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={C.purple} />
        <Text style={styles.loadingText}>Chargement du profil...</Text>
      </View>
    );
  }

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateProfile({
        name, phone, address,
        birth_place: birthPlace,
        date_of_birth: dateOfBirth,
        license_number: licenseNumber,
        license_issue_date: licenseIssueDate,
        license_expiry_date: licenseExpiryDate,
        nationality,
      });
      setEditing(false);
      if (Platform.OS === 'web') {
        window.alert('Profil mis à jour avec succès');
      } else {
        Alert.alert('Succès', 'Profil mis à jour');
      }
    } catch (error: any) {
      const msg = error.message || 'Erreur';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Erreur', msg);
      }
    } finally { setLoading(false); }
  };

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
        await logout();
      }
    } else {
      Alert.alert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter ?', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Déconnexion', style: 'destructive', onPress: async () => { await logout(); } },
      ]);
    }
  };

  const getUploadFn = (type: string) => {
    switch(type) {
      case 'id': return uploadIdCard;
      case 'id_back': return uploadIdCardBack;
      case 'license': return uploadLicense;
      case 'license_back': return uploadLicenseBack;
      default: return uploadIdCard;
    }
  };

  const getUploadSetter = (type: string) => {
    switch(type) {
      case 'id': return setUploadingId;
      case 'id_back': return setUploadingIdBack;
      case 'license': return setUploadingLicense;
      case 'license_back': return setUploadingLicenseBack;
      default: return setUploadingId;
    }
  };

  const showVerificationResult = (v: any) => {
    if (!v) return;
    setLastVerification(v);
    const statusIcon = v.is_valid ? 'Document valide' : 'Document rejeté';
    let msg = `${statusIcon}\nConfiance: ${v.confidence}%`;
    if (v.reason) msg += `\n${v.reason}`;
    if (v.is_blurry) msg += '\nImage floue detectée';
    if (v.is_expired) msg += '\nDocument expiré!';
    if (v.is_wrong_document) msg += '\nMauvais type de document';
    if (v.warnings?.length) msg += `\n${v.warnings.join('\n')}`;
    if (v.rejection_reasons?.length) msg += `\nRaisons: ${v.rejection_reasons.join(', ')}`;
    if (Platform.OS === 'web') window.alert(msg);
    else Alert.alert('Vérification IA', msg);
  };

  const handleWebFileChange = async (e: any, type: 'id' | 'license' | 'id_back' | 'license_back') => {
    const file = e.target?.files?.[0];
    if (!file) return;
    const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    if (!acceptedTypes.includes(file.type)) {
      window.alert('Format non accepté. Veuillez utiliser JPG, PNG ou WebP.');
      e.target.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      window.alert('Fichier trop volumineux (max 10 MB).');
      e.target.value = '';
      return;
    }
    const setter = getUploadSetter(type);
    const uploader = getUploadFn(type);
    setter(true);
    try {
      const verification = await uploader(file);
      showVerificationResult(verification);
    } catch (err: any) {
      window.alert(err.message || 'Erreur lors du téléchargement');
    } finally {
      setter(false);
      e.target.value = '';
    }
  };

  const uploadFromUri = async (dataUri: string, type: 'id' | 'license' | 'id_back' | 'license_back') => {
    const setter = getUploadSetter(type);
    const uploader = getUploadFn(type);
    setter(true);
    try {
      const verification = await uploader(dataUri);
      showVerificationResult(verification);
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    } finally {
      setter(false);
    }
  };

  const takePhoto = async (type: 'id' | 'license' | 'id_back' | 'license_back') => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission requise', 'Veuillez autoriser l\'accès à la caméra.'); return; }
    try {
      const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.5, base64: true });
      if (result.canceled) return;
      const asset = result.assets[0];
      const dataUri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
      await uploadFromUri(dataUri, type);
    } catch (err: any) {
      Alert.alert('Erreur', 'Impossible d\'ouvrir la caméra.');
    }
  };

  const pickFromGallery = async (type: 'id' | 'license' | 'id_back' | 'license_back') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission requise', 'Veuillez autoriser l\'accès à la galerie.'); return; }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.5, base64: true });
      if (result.canceled) return;
      const asset = result.assets[0];
      const dataUri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
      await uploadFromUri(dataUri, type);
    } catch (err: any) {
      Alert.alert('Erreur', 'Impossible d\'ouvrir la galerie.');
    }
  };

  const pickAndUpload = async (type: 'id' | 'license' | 'id_back' | 'license_back') => {
    if (Platform.OS === 'web') {
      const refs: any = { id: idInputRef, license: licenseInputRef, id_back: idBackInputRef, license_back: licenseBackInputRef };
      refs[type]?.current?.click();
      return;
    }
    setUploadModal(type);
  };

  const handleUploadChoice = async (choice: 'camera' | 'gallery') => {
    const type = uploadModal;
    setUploadModal(null);
    if (!type) return;
    if (choice === 'camera') {
      await takePhoto(type);
    } else {
      await pickFromGallery(type);
    }
  };

  const menuItems = [
    { icon: 'receipt', label: 'Mes factures', action: () => router.push('/my-invoices' as any) },
    { icon: 'scan', label: 'Mes documents', action: () => router.push('/my-documents' as any) },
    { icon: 'card', label: 'Moyens de paiement' },
    { icon: 'notifications', label: 'Notifications' },
    { icon: 'shield-checkmark', label: 'Confidentialité' },
    { icon: 'help-circle', label: 'Aide & Support' },
    { icon: 'document-text', label: 'Conditions d\'utilisation' },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: C.bg }]} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
      {/* Navigation Menu */}

      <View style={styles.content}>
        {/* Profile Header */}
        <View style={[styles.header, { backgroundColor: C.bg }]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user.name?.charAt(0).toUpperCase() || 'U'}</Text>
          </View>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          {!editing && (
            <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)} data-testid="edit-profile-btn">
              <Ionicons name="pencil" size={14} color={C.purple} />
              <Text style={styles.editBtnText}>Modifier le profil</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Edit Form */}
        {editing && (
          <View style={styles.section}>
            <Input label="Nom complet" value={name} onChangeText={setName} icon="person" />
            <Input label="Téléphone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" icon="call" />
            <Input label="Adresse" value={address} onChangeText={setAddress} icon="location" />

            <View style={styles.identitySection}>
              <View style={styles.identitySectionHeader}>
                <Ionicons name="id-card" size={16} color={_C.purple} />
                <Text style={styles.identitySectionTitle}>Identité & Permis</Text>
              </View>

              <View style={styles.fieldRow}>
                <View style={{ flex: 1 }}>
                  <Input label="Lieu de naissance" value={birthPlace} onChangeText={setBirthPlace} icon="location-outline" />
                </View>
                <View style={{ flex: 1 }}>
                  <Input label="Date de naissance (JJ-MM-AAAA)" value={dateOfBirth} onChangeText={(v: string) => setDateOfBirth(formatDateInput(v))} icon="calendar-outline" />
                </View>
              </View>

              <Input label="Nationalité" value={nationality} onChangeText={setNationality} icon="globe-outline" />
              <Input label="N° Permis de conduire" value={licenseNumber} onChangeText={setLicenseNumber} icon="car-outline" />

              <View style={styles.fieldRow}>
                <View style={{ flex: 1 }}>
                  <Input label="Date d'émission permis" value={licenseIssueDate} onChangeText={(v: string) => setLicenseIssueDate(formatDateInput(v))} icon="calendar-outline" />
                </View>
                <View style={{ flex: 1 }}>
                  <Input label="Date d'expiration permis" value={licenseExpiryDate} onChangeText={(v: string) => setLicenseExpiryDate(formatDateInput(v))} icon="calendar-outline" />
                </View>
              </View>
            </View>

            <View style={styles.btnRow}>
              <Button title="Annuler" onPress={() => setEditing(false)} variant="outline" style={{ flex: 1 }} />
              <Button title="Enregistrer" onPress={handleSave} loading={loading} style={{ flex: 1 }} />
            </View>
          </View>
        )}

        {/* Identity Info (read-only) */}
        {!editing && (user?.birth_place || user?.date_of_birth || user?.license_number || user?.nationality) && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>Informations d'identité</Text>
            <View style={[styles.infoCard, { backgroundColor: C.card, borderColor: C.border }]}>
              {user.date_of_birth && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Date de naissance</Text>
                  <Text style={[styles.infoValue, { color: C.text }]}>{user.date_of_birth}</Text>
                </View>
              )}
              {user.birth_place && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Lieu de naissance</Text>
                  <Text style={[styles.infoValue, { color: C.text }]}>{user.birth_place}</Text>
                </View>
              )}
              {user.nationality && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Nationalité</Text>
                  <Text style={[styles.infoValue, { color: C.text }]}>{user.nationality}</Text>
                </View>
              )}
              {user.license_number && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>N° Permis</Text>
                  <Text style={[styles.infoValue, { color: C.text }]}>{user.license_number}</Text>
                </View>
              )}
              {user.license_issue_date && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Émission permis</Text>
                  <Text style={[styles.infoValue, { color: C.text }]}>{user.license_issue_date}</Text>
                </View>
              )}
              {user.license_expiry_date && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Expiration permis</Text>
                  <Text style={[styles.infoValue, { color: C.text }]}>{user.license_expiry_date}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Documents */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>Mes Reservations</Text>
          {loadingReservations ? (
            <ActivityIndicator size="small" color={C.accent} style={{ marginVertical: 20 }} />
          ) : clientReservations.length === 0 ? (
            <View style={[styles.infoCard, { backgroundColor: C.card, borderColor: C.border, alignItems: 'center', padding: 20 }]}>
              <Ionicons name="calendar-outline" size={28} color={C.textLight} />
              <Text style={{ color: C.textLight, fontSize: 13, marginTop: 8 }}>Aucune reservation</Text>
            </View>
          ) : (
            clientReservations.slice(0, 10).map((r: any) => {
              const sc = resStatusColor(r.status);
              const formatDt = (d: string) => {
                try { return format(new Date(d), 'dd MMM yyyy', { locale: fr }); } catch { return d; }
              };
              return (
                <View key={r.id} style={[styles.resCard, { backgroundColor: C.card, borderColor: C.border, borderLeftColor: sc }]} data-testid={`my-res-${r.id}`}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ color: C.text, fontSize: 15, fontWeight: '700', flex: 1 }} numberOfLines={1}>{r.vehicle_name}</Text>
                    <View style={{ backgroundColor: sc + '20', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                      <Text style={{ color: sc, fontSize: 11, fontWeight: '700' }}>{resStatusLabel(r.contract_status === 'signed' ? 'signed' : r.status)}</Text>
                    </View>
                  </View>
                  <Text style={{ color: C.textLight, fontSize: 12, marginBottom: 4 }}>
                    {formatDt(r.start_date)} - {formatDt(r.end_date)}
                  </Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: C.accent, fontSize: 15, fontWeight: '800' }}>CHF {r.total_price?.toFixed(2)}</Text>
                    {r.contract_id && (
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.accent + '15', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
                          onPress={() => viewContract(r.contract_id)}
                          data-testid={`view-contract-${r.id}`}
                        >
                          <Ionicons name="eye-outline" size={14} color={C.accent} />
                          <Text style={{ color: C.accent, fontSize: 11, fontWeight: '600' }}>Voir contrat</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#10B98115', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
                          onPress={() => downloadContractPdf(r.contract_id)}
                          data-testid={`download-pdf-${r.id}`}
                        >
                          <Ionicons name="download-outline" size={14} color="#10B981" />
                          <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '600' }}>PDF</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Documents */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>Documents Obligatoires</Text>
          {/* Hidden file inputs for web */}
          {Platform.OS === 'web' && (
            <>
              <input ref={(el: any) => { idInputRef.current = el; }} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={(e: any) => handleWebFileChange(e, 'id')} data-testid="input-id-front" />
              <input ref={(el: any) => { idBackInputRef.current = el; }} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={(e: any) => handleWebFileChange(e, 'id_back')} data-testid="input-id-back" />
              <input ref={(el: any) => { licenseInputRef.current = el; }} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={(e: any) => handleWebFileChange(e, 'license')} data-testid="input-license-front" />
              <input ref={(el: any) => { licenseBackInputRef.current = el; }} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={(e: any) => handleWebFileChange(e, 'license_back')} data-testid="input-license-back" />
            </>
          )}
          {(!user.id_photo || !user.license_photo) && (
            <View style={styles.alert}>
              <Ionicons name="warning" size={20} color="#F59E0B" />
              <Text style={styles.alertText}>Documents requis pour effectuer une réservation. Formats acceptés: JPG, PNG, WebP (max 10 MB).</Text>
            </View>
          )}

          {/* ID Card */}
          <View style={[styles.docFullCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <View style={styles.docHeader}>
              <Ionicons name="card" size={20} color="#7C3AED" />
              <Text style={[styles.docTitle, { color: C.text }]}>Pièce d'Identité</Text>
              {user.id_photo && user.id_photo_back && (
                <View style={[styles.badge, { backgroundColor: '#D1FAE5' }]}><Ionicons name="checkmark-circle" size={14} color="#10B981" /><Text style={[styles.badgeText, { color: '#10B981' }]}>Complet</Text></View>
              )}
            </View>
            <View style={styles.docRow}>
              <View style={styles.docSide}>
                <Text style={[styles.docSideLabel, { color: C.textLight }]}>Recto</Text>
                {user.id_photo ? (
                  <Image source={{ uri: user.id_photo }} style={styles.docImageSmall} resizeMode="cover" />
                ) : (
                  <View style={styles.noDocSmall}><Ionicons name="card-outline" size={28} color="#9CA3AF" /></View>
                )}
                <TouchableOpacity style={[styles.docBtnSmall, { backgroundColor: user.id_photo ? '#EDE9FE' : '#7C3AED' }]} onPress={() => pickAndUpload('id')} data-testid="upload-id-front-btn">
                  {uploadingId ? <ActivityIndicator size="small" color="#7C3AED" /> : (
                    <Text style={{ color: user.id_photo ? '#7C3AED' : '#FFF', fontSize: 12, fontWeight: '600' }}>{user.id_photo ? 'Modifier' : 'Ajouter'}</Text>
                  )}
                </TouchableOpacity>
              </View>
              <View style={styles.docSide}>
                <Text style={[styles.docSideLabel, { color: C.textLight }]}>Verso</Text>
                {user.id_photo_back ? (
                  <Image source={{ uri: user.id_photo_back }} style={styles.docImageSmall} resizeMode="cover" />
                ) : (
                  <View style={styles.noDocSmall}><Ionicons name="card-outline" size={28} color="#9CA3AF" /></View>
                )}
                <TouchableOpacity style={[styles.docBtnSmall, { backgroundColor: user.id_photo_back ? '#EDE9FE' : '#7C3AED' }]} onPress={() => pickAndUpload('id_back')} data-testid="upload-id-back-btn">
                  {uploadingIdBack ? <ActivityIndicator size="small" color="#7C3AED" /> : (
                    <Text style={{ color: user.id_photo_back ? '#7C3AED' : '#FFF', fontSize: 12, fontWeight: '600' }}>{user.id_photo_back ? 'Modifier' : 'Ajouter'}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
            {user.id_verification && (
              <View style={[styles.verificationBox, { backgroundColor: user.id_verification.is_valid ? '#D1FAE5' : '#FEE2E2' }]}>
                <Ionicons name={user.id_verification.is_valid ? "checkmark-circle" : "close-circle"} size={16} color={user.id_verification.is_valid ? "#10B981" : "#EF4444"} />
                <Text style={{ color: user.id_verification.is_valid ? '#065F46' : '#991B1B', fontSize: 12, flex: 1 }}>
                  {user.id_verification.reason} ({user.id_verification.confidence}%)
                </Text>
              </View>
            )}
          </View>

          {/* License */}
          <View style={[styles.docFullCard, { backgroundColor: C.card, borderColor: C.border, marginTop: 12 }]}>
            <View style={styles.docHeader}>
              <Ionicons name="car" size={20} color="#7C3AED" />
              <Text style={[styles.docTitle, { color: C.text }]}>Permis de Conduire</Text>
              {user.license_photo && user.license_photo_back && (
                <View style={[styles.badge, { backgroundColor: '#D1FAE5' }]}><Ionicons name="checkmark-circle" size={14} color="#10B981" /><Text style={[styles.badgeText, { color: '#10B981' }]}>Complet</Text></View>
              )}
            </View>
            <View style={styles.docRow}>
              <View style={styles.docSide}>
                <Text style={[styles.docSideLabel, { color: C.textLight }]}>Recto</Text>
                {user.license_photo ? (
                  <Image source={{ uri: user.license_photo }} style={styles.docImageSmall} resizeMode="cover" />
                ) : (
                  <View style={styles.noDocSmall}><Ionicons name="id-card-outline" size={28} color="#9CA3AF" /></View>
                )}
                <TouchableOpacity style={[styles.docBtnSmall, { backgroundColor: user.license_photo ? '#EDE9FE' : '#7C3AED' }]} onPress={() => pickAndUpload('license')} data-testid="upload-license-front-btn">
                  {uploadingLicense ? <ActivityIndicator size="small" color="#7C3AED" /> : (
                    <Text style={{ color: user.license_photo ? '#7C3AED' : '#FFF', fontSize: 12, fontWeight: '600' }}>{user.license_photo ? 'Modifier' : 'Ajouter'}</Text>
                  )}
                </TouchableOpacity>
              </View>
              <View style={styles.docSide}>
                <Text style={[styles.docSideLabel, { color: C.textLight }]}>Verso</Text>
                {user.license_photo_back ? (
                  <Image source={{ uri: user.license_photo_back }} style={styles.docImageSmall} resizeMode="cover" />
                ) : (
                  <View style={styles.noDocSmall}><Ionicons name="id-card-outline" size={28} color="#9CA3AF" /></View>
                )}
                <TouchableOpacity style={[styles.docBtnSmall, { backgroundColor: user.license_photo_back ? '#EDE9FE' : '#7C3AED' }]} onPress={() => pickAndUpload('license_back')} data-testid="upload-license-back-btn">
                  {uploadingLicenseBack ? <ActivityIndicator size="small" color="#7C3AED" /> : (
                    <Text style={{ color: user.license_photo_back ? '#7C3AED' : '#FFF', fontSize: 12, fontWeight: '600' }}>{user.license_photo_back ? 'Modifier' : 'Ajouter'}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
            {user.license_verification && (
              <View style={[styles.verificationBox, { backgroundColor: user.license_verification.is_valid ? '#D1FAE5' : '#FEE2E2' }]}>
                <Ionicons name={user.license_verification.is_valid ? "checkmark-circle" : "close-circle"} size={16} color={user.license_verification.is_valid ? "#10B981" : "#EF4444"} />
                <Text style={{ color: user.license_verification.is_valid ? '#065F46' : '#991B1B', fontSize: 12, flex: 1 }}>
                  {user.license_verification.reason} ({user.license_verification.confidence}%)
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Menu */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>Paramètres</Text>
          <View style={[styles.menuCard, { backgroundColor: C.card, borderColor: C.border }]}>
            {menuItems.map((item, i) => (
              <TouchableOpacity key={item.label} style={[styles.menuItem, i < menuItems.length - 1 && styles.menuBorder]} onPress={() => item.action && item.action()} data-testid={`menu-${i}`}>
                <View style={styles.menuLeft}>
                  <View style={styles.menuIcon}><Ionicons name={item.icon as any} size={18} color={C.purple} /></View>
                  <Text style={styles.menuText}>{item.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.gray} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: C.error }]} onPress={handleLogout} data-testid="logout-btn">
          <Ionicons name="log-out" size={20} color={C.error} />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </View>

      {/* Upload Choice Modal */}
      {uploadModal && (
        <View style={uploadModalStyles.overlay}>
          <View style={uploadModalStyles.card}>
            <Text style={uploadModalStyles.title}>
              {uploadModal === 'id' ? 'Pièce d\'identité (Recto)' : uploadModal === 'id_back' ? 'Pièce d\'identité (Verso)' : uploadModal === 'license' ? 'Permis de conduire (Recto)' : 'Permis de conduire (Verso)'}
            </Text>
            <Text style={uploadModalStyles.subtitle}>Comment souhaitez-vous ajouter votre document ?</Text>
            <TouchableOpacity style={uploadModalStyles.btn} onPress={() => handleUploadChoice('camera')}>
              <Ionicons name="camera" size={24} color="#7C3AED" />
              <Text style={uploadModalStyles.btnText}>Prendre une photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={uploadModalStyles.btn} onPress={() => handleUploadChoice('gallery')}>
              <Ionicons name="images" size={24} color="#7C3AED" />
              <Text style={uploadModalStyles.btnText}>Choisir depuis la galerie</Text>
            </TouchableOpacity>
            <TouchableOpacity style={uploadModalStyles.cancelBtn} onPress={() => setUploadModal(null)}>
              <Text style={uploadModalStyles.cancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { maxWidth: 800, width: '100%', alignSelf: 'center' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14 },
  header: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20, borderBottomWidth: 1 },
  avatar: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#FFF' },
  userName: { fontSize: 20, fontWeight: '700' },
  userEmail: { fontSize: 13, marginTop: 2 },
  editBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 14, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, gap: 6 },
  editBtnText: { fontSize: 13, fontWeight: '600' },
  section: { padding: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 14 },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  fieldRow: { flexDirection: 'row', gap: 12 },
  identitySection: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  identitySectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  identitySectionTitle: { fontSize: 15, fontWeight: '700', color: '#7C3AED' },
  infoCard: { borderRadius: 14, borderWidth: 1, padding: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  infoLabel: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  infoValue: { fontSize: 14, fontWeight: '600' },
  alert: { flexDirection: 'row', backgroundColor: '#FEF3C7', borderRadius: 12, padding: 14, marginBottom: 16, alignItems: 'center', gap: 10 },
  alertText: { flex: 1, fontSize: 13, color: '#92400E', lineHeight: 18 },
  docsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  docCard: { borderRadius: 14, padding: 16, borderWidth: 1, width: 340, maxWidth: '100%', flexGrow: 1 },
  docFullCard: { borderRadius: 14, padding: 16, borderWidth: 1 },
  docHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  docTitle: { flex: 1, fontSize: 14, fontWeight: '600' },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, gap: 4 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  docRow: { flexDirection: 'row', gap: 12 },
  docSide: { flex: 1, alignItems: 'center' },
  docSideLabel: { fontSize: 12, fontWeight: '600', marginBottom: 8 },
  docImageSmall: { width: '100%', height: 100, borderRadius: 10 },
  noDocSmall: { width: '100%', height: 100, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed' },
  docBtnSmall: { marginTop: 8, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12, alignItems: 'center' },
  verificationBox: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, marginTop: 12, gap: 8 },
  docImage: { width: '100%', height: 140, borderRadius: 10 },
  noDoc: { alignItems: 'center', paddingVertical: 24, borderRadius: 10 },
  noDocText: { fontSize: 13, marginTop: 6 },
  docBtn: { marginTop: 12, borderRadius: 10, paddingVertical: 10, alignItems: 'center', backgroundColor: '#7C3AED' },
  docBtnOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#7C3AED' },
  docBtnText: { fontSize: 13, fontWeight: '600', color: '#FFF' },
  docBtnTextOutline: { color: '#7C3AED' },
  menuCard: { borderRadius: 14, overflow: 'hidden', borderWidth: 1 },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  menuBorder: { borderBottomWidth: 1 },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  menuText: { fontSize: 14 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 20, padding: 14, borderRadius: 14, gap: 8, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
  logoutText: { fontSize: 14, fontWeight: '600' },
  resCard: { borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderLeftWidth: 4 },
});

const uploadModalStyles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: 320,
    maxWidth: '90%',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3EEFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    gap: 14,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7C3AED',
  },
  cancelBtn: {
    alignItems: 'center',
    padding: 14,
    marginTop: 4,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },
});
