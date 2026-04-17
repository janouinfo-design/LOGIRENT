import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../src/api/axios';
import { useAuthStore } from '../../../src/store/authStore';
import { useThemeStore } from '../../../src/store/themeStore';
import { formatDateInput } from '../../../src/utils/dateMask';

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated: (client: any) => void;
}

const DOC_TYPES = [
  { key: 'license_front', label: 'Permis (recto)', icon: 'card-outline' },
  { key: 'license_back', label: 'Permis (verso)', icon: 'card-outline' },
  { key: 'id_front', label: 'Carte ID (recto)', icon: 'id-card-outline' },
  { key: 'id_back', label: 'Carte ID (verso)', icon: 'id-card-outline' },
] as const;

export function NewClientModal({ visible, onClose, onCreated }: Props) {
  const { token } = useAuthStore();
  const { colors: C } = useThemeStore();
  const [step, setStep] = useState<'form' | 'documents' | 'done'>('form');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form fields
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [address, setAddress] = useState('');
  const [nationality, setNationality] = useState('');
  const [dob, setDob] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  const [license, setLicense] = useState('');
  const [licenseIssued, setLicenseIssued] = useState('');
  const [licenseExpiry, setLicenseExpiry] = useState('');

  // Result
  const [createdClient, setCreatedClient] = useState<any>(null);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [docPreviews, setDocPreviews] = useState<Record<string, string>>({});

  const resetForm = () => {
    setStep('form');
    setLastName(''); setFirstName(''); setPhone(''); setEmail('');
    setPassword(''); setAddress(''); setNationality(''); setDob('');
    setBirthPlace(''); setLicense(''); setLicenseIssued(''); setLicenseExpiry('');
    setCreatedClient(null); setGeneratedPassword('');
    setDocPreviews({}); setShowPassword(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const createClient = async () => {
    if (!lastName.trim()) {
      const msg = 'Le nom de famille est obligatoire';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Erreur', msg);
      return;
    }
    if (!email.trim()) {
      const msg = "L'email est obligatoire";
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Erreur', msg);
      return;
    }
    setSaving(true);
    try {
      const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');
      const res = await api.post('/api/admin/quick-client', {
        name: fullName,
        phone: phone.trim() || null,
        email: email.trim() || null,
        password: password.trim() || null,
        address: address.trim() || null,
        nationality: nationality.trim() || null,
        date_of_birth: dob.trim() || null,
        birth_place: birthPlace.trim() || null,
        license_number: license.trim() || null,
        license_issue_date: licenseIssued.trim() || null,
        license_expiry_date: licenseExpiry.trim() || null,
      });
      const data = res.data;
      if (!data.is_new) {
        const msg = 'Un client avec cet email existe deja.';
        Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Info', msg);
        setSaving(false);
        return;
      }
      setCreatedClient(data.client);
      setGeneratedPassword(data.generated_password || '');
      setStep('documents');
    } catch (e: any) {
      const msg = e?.response?.data?.detail || 'Impossible de creer le client';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Erreur', msg);
    } finally {
      setSaving(false);
    }
  };

  const uploadDocument = async (docType: string) => {
    if (!createdClient?.id || Platform.OS !== 'web') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(docType);
      const reader = new FileReader();
      reader.onload = (ev) => setDocPreviews(p => ({ ...p, [docType]: ev.target?.result as string }));
      reader.readAsDataURL(file);
      try {
        const formData = new FormData();
        formData.append('file', file);
        await api.post(
          `/api/admin/clients/${createdClient.id}/documents?doc_type=${docType}`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
      } catch {
        const msg = "Echec de l'upload";
        Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Erreur', msg);
        setDocPreviews(p => { const n = { ...p }; delete n[docType]; return n; });
      } finally {
        setUploading(null);
      }
    };
    input.click();
  };

  const finishAndClose = () => {
    if (createdClient) onCreated(createdClient);
    handleClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={s.overlay}>
        <View style={[s.modal, { backgroundColor: C.card }]}>
          {/* Header */}
          <View style={s.header}>
            <Text style={[s.title, { color: C.text }]}>
              {step === 'form' ? 'Nouveau client' : step === 'documents' ? 'Documents' : 'Termine'}
            </Text>
            <TouchableOpacity onPress={handleClose} data-testid="close-new-client">
              <Ionicons name="close" size={24} color={C.text} />
            </TouchableOpacity>
          </View>

          {/* Steps indicator */}
          <View style={s.steps}>
            {['Informations', 'Documents', 'Termine'].map((label, i) => {
              const active = (step === 'form' && i === 0) || (step === 'documents' && i === 1) || (step === 'done' && i === 2);
              const done = (step === 'documents' && i === 0) || (step === 'done' && i <= 1);
              return (
                <View key={label} style={s.stepItem}>
                  <View style={[s.stepDot, { backgroundColor: active ? C.accent : done ? '#10B981' : C.border }]}>
                    {done ? <Ionicons name="checkmark" size={12} color="#fff" /> :
                      <Text style={{ color: active ? '#fff' : C.textLight, fontSize: 10, fontWeight: '700' }}>{i + 1}</Text>}
                  </View>
                  <Text style={{ color: active ? C.text : C.textLight, fontSize: 10, fontWeight: active ? '700' : '400' }}>{label}</Text>
                </View>
              );
            })}
          </View>

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 30 }}>
            {/* ===== STEP 1: FORM ===== */}
            {step === 'form' && (
              <>
                {/* Nom / Prenom Row */}
                <View style={s.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.label, { color: C.textLight }]}>NOM *</Text>
                    <TextInput
                      style={[s.input, { backgroundColor: C.bg, color: C.text, borderColor: !lastName.trim() ? '#EF444450' : C.border }]}
                      value={lastName} onChangeText={setLastName}
                      placeholder="Dupont" placeholderTextColor={C.textLight + '80'}
                      data-testid="new-client-lastname"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.label, { color: C.textLight }]}>PRENOM</Text>
                    <TextInput
                      style={[s.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]}
                      value={firstName} onChangeText={setFirstName}
                      placeholder="Jean" placeholderTextColor={C.textLight + '80'}
                      data-testid="new-client-firstname"
                    />
                  </View>
                </View>

                {/* Email / Telephone Row */}
                <View style={s.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.label, { color: C.textLight }]}>EMAIL *</Text>
                    <TextInput
                      style={[s.input, { backgroundColor: C.bg, color: C.text, borderColor: !email.trim() ? '#EF444450' : C.border }]}
                      value={email} onChangeText={setEmail}
                      placeholder="email@exemple.ch" placeholderTextColor={C.textLight + '80'}
                      keyboardType="email-address" autoCapitalize="none"
                      data-testid="new-client-email"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.label, { color: C.textLight }]}>TELEPHONE</Text>
                    <TextInput
                      style={[s.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]}
                      value={phone} onChangeText={setPhone}
                      placeholder="+41 79..." placeholderTextColor={C.textLight + '80'}
                      keyboardType="phone-pad"
                      data-testid="new-client-phone"
                    />
                  </View>
                </View>

                {/* Password */}
                <Text style={[s.label, { color: C.textLight }]}>MOT DE PASSE</Text>
                <View style={{ position: 'relative' }}>
                  <TextInput
                    style={[s.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border, paddingRight: 44 }]}
                    value={password} onChangeText={setPassword}
                    placeholder="Laisser vide = auto-genere" placeholderTextColor={C.textLight + '80'}
                    secureTextEntry={!showPassword}
                    data-testid="new-client-password"
                  />
                  <TouchableOpacity
                    style={{ position: 'absolute', right: 10, top: 10 }}
                    onPress={() => setShowPassword(!showPassword)}
                    data-testid="toggle-password-visibility"
                  >
                    <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={C.textLight} />
                  </TouchableOpacity>
                </View>
                <Text style={{ color: C.textLight, fontSize: 10, marginTop: 2, marginBottom: 4 }}>
                  Si vide, un mot de passe sera genere automatiquement
                </Text>

                <Text style={[s.label, { color: C.textLight }]}>ADRESSE</Text>
                <TextInput
                  style={[s.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]}
                  value={address} onChangeText={setAddress}
                  placeholder="Rue de l'Exemple 10, 1000 Lausanne" placeholderTextColor={C.textLight + '80'}
                  data-testid="new-client-address"
                />

                {/* Section Identite */}
                <View style={[s.sectionDivider, { borderTopColor: C.border }]}>
                  <Ionicons name="id-card" size={16} color={C.accent} />
                  <Text style={[s.sectionTitle, { color: C.text }]}>Identite & Permis</Text>
                </View>

                <View style={s.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.label, { color: C.textLight }]}>LIEU DE NAISSANCE</Text>
                    <TextInput
                      style={[s.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]}
                      value={birthPlace} onChangeText={setBirthPlace}
                      placeholder="Geneve" placeholderTextColor={C.textLight + '80'}
                      data-testid="new-client-birth-place"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.label, { color: C.textLight }]}>DATE DE NAISSANCE</Text>
                    <TextInput
                      style={[s.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]}
                      value={dob} onChangeText={(v) => setDob(formatDateInput(v))}
                      placeholder="JJ-MM-AAAA" placeholderTextColor={C.textLight + '80'}
                      data-testid="new-client-dob"
                    />
                  </View>
                </View>

                <View style={s.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.label, { color: C.textLight }]}>NATIONALITE</Text>
                    <TextInput
                      style={[s.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]}
                      value={nationality} onChangeText={setNationality}
                      placeholder="Suisse" placeholderTextColor={C.textLight + '80'}
                      data-testid="new-client-nationality"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.label, { color: C.textLight }]}>N. DE PERMIS</Text>
                    <TextInput
                      style={[s.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]}
                      value={license} onChangeText={setLicense}
                      placeholder="CH-123456" placeholderTextColor={C.textLight + '80'}
                      data-testid="new-client-license"
                    />
                  </View>
                </View>

                <View style={s.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.label, { color: C.textLight }]}>DATE D'EMISSION</Text>
                    <TextInput
                      style={[s.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]}
                      value={licenseIssued} onChangeText={(v) => setLicenseIssued(formatDateInput(v))}
                      placeholder="JJ-MM-AAAA" placeholderTextColor={C.textLight + '80'}
                      data-testid="new-client-license-issued"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.label, { color: C.textLight }]}>DATE D'EXPIRATION</Text>
                    <TextInput
                      style={[s.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]}
                      value={licenseExpiry} onChangeText={(v) => setLicenseExpiry(formatDateInput(v))}
                      placeholder="JJ-MM-AAAA" placeholderTextColor={C.textLight + '80'}
                      data-testid="new-client-license-expiry"
                    />
                  </View>
                </View>

                {/* Bottom Buttons */}
                <View style={s.bottomBtns}>
                  <TouchableOpacity style={[s.cancelBtn, { borderColor: C.border }]} onPress={handleClose} data-testid="cancel-new-client">
                    <Text style={{ color: C.textLight, fontSize: 14, fontWeight: '600' }}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.saveBtn, { backgroundColor: C.accent }]} onPress={createClient} disabled={saving} data-testid="create-client-btn">
                    {saving ? <ActivityIndicator color="#fff" size="small" /> : (
                      <>
                        <Ionicons name="checkmark" size={18} color="#fff" />
                        <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Creer et continuer</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* ===== STEP 2: DOCUMENTS ===== */}
            {step === 'documents' && createdClient && (
              <>
                {/* Show generated/set password */}
                <View style={[s.passwordBox, { borderColor: '#10B981' }]}>
                  <Ionicons name="key" size={20} color="#10B981" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.text, fontSize: 12, fontWeight: '700' }}>Mot de passe du client</Text>
                    <Text style={{ color: '#10B981', fontSize: 18, fontWeight: '800', letterSpacing: 2, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined }}>
                      {generatedPassword}
                    </Text>
                    <Text style={{ color: C.textLight, fontSize: 10, marginTop: 2 }}>
                      {email ? 'Un email de bienvenue a ete envoye au client' : 'Notez ce mot de passe'}
                    </Text>
                  </View>
                </View>

                <View style={[s.sectionDivider, { borderTopColor: C.border }]}>
                  <Ionicons name="camera" size={16} color={C.accent} />
                  <Text style={[s.sectionTitle, { color: C.text }]}>Scanner les documents</Text>
                </View>
                <Text style={{ color: C.textLight, fontSize: 12, marginBottom: 12 }}>
                  Prenez en photo ou telechargez le permis de conduire et la carte d'identite
                </Text>

                <View style={s.docGrid}>
                  {DOC_TYPES.map(doc => (
                    <TouchableOpacity
                      key={doc.key}
                      style={[s.docCard, { borderColor: docPreviews[doc.key] ? '#10B981' : C.border, backgroundColor: C.bg }]}
                      onPress={() => uploadDocument(doc.key)}
                      disabled={!!uploading}
                      data-testid={`upload-${doc.key}`}
                    >
                      {uploading === doc.key ? (
                        <ActivityIndicator color={C.accent} />
                      ) : docPreviews[doc.key] ? (
                        <Image source={{ uri: docPreviews[doc.key] }} style={s.docPreview} resizeMode="cover" />
                      ) : (
                        <>
                          <Ionicons name={doc.icon as any} size={28} color={C.textLight} />
                          <Text style={{ color: C.textLight, fontSize: 11, textAlign: 'center', marginTop: 4 }}>{doc.label}</Text>
                        </>
                      )}
                      {docPreviews[doc.key] && (
                        <View style={s.docCheckmark}>
                          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={[s.bottomBtns, { marginTop: 20 }]}>
                  <TouchableOpacity style={[s.cancelBtn, { borderColor: C.border }]} onPress={finishAndClose} data-testid="skip-docs-btn">
                    <Text style={{ color: C.textLight, fontSize: 14 }}>Passer</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.saveBtn, { backgroundColor: '#10B981' }]} onPress={finishAndClose} data-testid="finish-client-btn">
                    <Ionicons name="checkmark" size={18} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Terminer</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%', overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4 },
  title: { fontSize: 18, fontWeight: '800' },
  steps: { flexDirection: 'row', justifyContent: 'center', gap: 20, paddingVertical: 12, paddingHorizontal: 16 },
  stepItem: { alignItems: 'center', gap: 4 },
  stepDot: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 11, fontWeight: '700', marginBottom: 4, marginTop: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, borderWidth: 1 },
  row: { flexDirection: 'row', gap: 10 },
  sectionDivider: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, marginBottom: 4, paddingTop: 14, borderTopWidth: 1 },
  sectionTitle: { fontSize: 14, fontWeight: '700' },
  bottomBtns: { flexDirection: 'row', gap: 10, marginTop: 24 },
  cancelBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1 },
  saveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  passwordBox: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 2, backgroundColor: '#F0FDF4' },
  docGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  docCard: { width: '47%', flexGrow: 1, flexBasis: '47%', aspectRatio: 1.5, borderWidth: 2, borderRadius: 12, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', position: 'relative' },
  docPreview: { width: '100%', height: '100%', borderRadius: 10 },
  docCheckmark: { position: 'absolute', top: 4, right: 4 },
});
