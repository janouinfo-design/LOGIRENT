import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../src/store/authStore';
import { useThemeStore } from '../../../src/store/themeStore';

const API = process.env.EXPO_PUBLIC_API_URL || process.env.REACT_APP_BACKEND_URL || '';

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

  // Form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [nationality, setNationality] = useState('');
  const [dob, setDob] = useState('');
  const [license, setLicense] = useState('');
  const [licenseIssued, setLicenseIssued] = useState('');
  const [licenseExpiry, setLicenseExpiry] = useState('');

  // Result
  const [createdClient, setCreatedClient] = useState<any>(null);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [docPreviews, setDocPreviews] = useState<Record<string, string>>({});

  const resetForm = () => {
    setStep('form');
    setName(''); setPhone(''); setEmail(''); setAddress('');
    setNationality(''); setDob(''); setLicense('');
    setLicenseIssued(''); setLicenseExpiry('');
    setCreatedClient(null); setGeneratedPassword('');
    setDocPreviews({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const createClient = async () => {
    if (!name.trim()) {
      Alert.alert('Erreur', 'Le nom est obligatoire');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/admin/quick-client`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
          address: address.trim() || null,
          nationality: nationality.trim() || null,
          date_of_birth: dob.trim() || null,
          license_number: license.trim() || null,
          license_issue_date: licenseIssued.trim() || null,
          license_expiry_date: licenseExpiry.trim() || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCreatedClient(data.client);
        setGeneratedPassword(data.generated_password || '');
        setStep('documents');
      } else {
        Alert.alert('Erreur', data.detail || 'Erreur lors de la création');
      }
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de créer le client');
    } finally {
      setSaving(false);
    }
  };

  const uploadDocument = async (docType: string) => {
    if (!createdClient?.id || Platform.OS !== 'web') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(docType);

      // Preview
      const reader = new FileReader();
      reader.onload = (ev) => setDocPreviews(p => ({ ...p, [docType]: ev.target?.result as string }));
      reader.readAsDataURL(file);

      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(
          `${API}/api/admin/clients/${createdClient.id}/documents?doc_type=${docType}`,
          { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData }
        );
        if (!res.ok) {
          Alert.alert('Erreur', "Échec de l'upload");
          setDocPreviews(p => { const n = {...p}; delete n[docType]; return n; });
        }
      } catch (err) {
        Alert.alert('Erreur', "Échec de l'upload");
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

  const Field = ({ label, value, setter, placeholder, keyboardType }: any) => (
    <View style={s.field}>
      <Text style={[s.label, { color: C.textLight }]}>{label}</Text>
      <TextInput
        style={[s.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
        value={value} onChangeText={setter}
        placeholder={placeholder} placeholderTextColor={C.textLight + '60'}
        keyboardType={keyboardType}
      />
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={s.overlay}>
        <View style={[s.modal, { backgroundColor: C.card, borderColor: C.border }]}>
          {/* Header */}
          <View style={s.header}>
            <Ionicons name={step === 'done' ? 'checkmark-circle' : step === 'documents' ? 'camera' : 'person-add'} size={22} color={C.accent} />
            <Text style={[s.title, { color: C.text }]}>
              {step === 'form' ? 'Nouveau client' : step === 'documents' ? 'Documents' : 'Client créé'}
            </Text>
            <TouchableOpacity onPress={handleClose} testID="close-new-client">
              <Ionicons name="close" size={24} color={C.textLight} />
            </TouchableOpacity>
          </View>

          {/* Steps indicator */}
          <View style={s.steps}>
            {['Informations', 'Documents', 'Terminé'].map((label, i) => {
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

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 20 }}>
            {/* Step 1: Form */}
            {step === 'form' && (
              <>
                <Field label="Nom complet *" value={name} setter={setName} placeholder="Dupont Jean" />
                <View style={s.row}>
                  <View style={{ flex: 1 }}><Field label="Téléphone" value={phone} setter={setPhone} placeholder="+41 79..." keyboardType="phone-pad" /></View>
                  <View style={{ flex: 1 }}><Field label="Email *" value={email} setter={setEmail} placeholder="email@exemple.ch" keyboardType="email-address" /></View>
                </View>
                <Field label="Adresse" value={address} setter={setAddress} placeholder="Rue de l'Exemple 10, 1000 Lausanne" />
                <View style={s.row}>
                  <View style={{ flex: 1 }}><Field label="Nationalité" value={nationality} setter={setNationality} placeholder="Suisse" /></View>
                  <View style={{ flex: 1 }}><Field label="Date de naissance" value={dob} setter={setDob} placeholder="15-03-1985" /></View>
                </View>
                <View style={[s.divider, { backgroundColor: C.border }]} />
                <Text style={[s.sectionLabel, { color: C.text }]}>Permis de conduire</Text>
                <Field label="N° de permis" value={license} setter={setLicense} placeholder="CH-123456" />
                <View style={s.row}>
                  <View style={{ flex: 1 }}><Field label="Date d'émission" value={licenseIssued} setter={setLicenseIssued} placeholder="01-01-2015" /></View>
                  <View style={{ flex: 1 }}><Field label="Date d'expiration" value={licenseExpiry} setter={setLicenseExpiry} placeholder="01-01-2030" /></View>
                </View>

                <TouchableOpacity style={[s.primaryBtn, { backgroundColor: C.accent }]} onPress={createClient} disabled={saving} testID="create-client-btn">
                  {saving ? <ActivityIndicator color="#fff" /> : (
                    <><Ionicons name="arrow-forward" size={18} color="#fff" /><Text style={s.primaryBtnText}>Créer et continuer</Text></>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* Step 2: Documents */}
            {step === 'documents' && createdClient && (
              <>
                {/* Show generated password */}
                <View style={[s.passwordBox, { borderColor: '#10B981' }]}>
                  <Ionicons name="key" size={20} color="#10B981" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.text, fontSize: 12, fontWeight: '700' }}>Mot de passe généré</Text>
                    <Text style={{ color: '#10B981', fontSize: 18, fontWeight: '800', letterSpacing: 2, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined }}>
                      {generatedPassword}
                    </Text>
                    <Text style={{ color: C.textLight, fontSize: 10, marginTop: 2 }}>
                      {email ? 'Envoyé par email au client' : 'Notez ce mot de passe'}
                    </Text>
                  </View>
                </View>

                <Text style={[s.sectionLabel, { color: C.text, marginTop: 16 }]}>Scanner les documents</Text>
                <Text style={{ color: C.textLight, fontSize: 12, marginBottom: 12 }}>
                  Prenez en photo ou téléchargez le permis de conduire et la carte d'identité
                </Text>

                <View style={s.docGrid}>
                  {DOC_TYPES.map(doc => (
                    <TouchableOpacity
                      key={doc.key}
                      style={[s.docCard, { borderColor: docPreviews[doc.key] ? '#10B981' : C.border, backgroundColor: C.bg }]}
                      onPress={() => uploadDocument(doc.key)}
                      disabled={!!uploading}
                      testID={`upload-${doc.key}`}
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

                <TouchableOpacity style={[s.primaryBtn, { backgroundColor: '#10B981', marginTop: 20 }]} onPress={finishAndClose} testID="finish-client-btn">
                  <Ionicons name="checkmark" size={18} color="#fff" />
                  <Text style={s.primaryBtnText}>Terminer l'enregistrement</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[s.skipBtn]} onPress={finishAndClose} testID="skip-docs-btn">
                  <Text style={{ color: C.textLight, fontSize: 13 }}>Passer cette étape</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modal: { width: '100%', maxWidth: 540, maxHeight: '90%', borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  title: { flex: 1, fontSize: 17, fontWeight: '800' },
  steps: { flexDirection: 'row', justifyContent: 'center', gap: 20, paddingVertical: 12, paddingHorizontal: 16 },
  stepItem: { alignItems: 'center', gap: 4 },
  stepDot: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  field: { marginBottom: 10 },
  label: { fontSize: 11, fontWeight: '600', marginBottom: 3 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14 },
  row: { flexDirection: 'row', gap: 10 },
  divider: { height: 1, marginVertical: 12 },
  sectionLabel: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12, marginTop: 12 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  passwordBox: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 2, backgroundColor: '#F0FDF4' },
  docGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  docCard: { width: '47%', flexGrow: 1, flexBasis: '47%', aspectRatio: 1.5, borderWidth: 2, borderRadius: 12, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', position: 'relative' },
  docPreview: { width: '100%', height: '100%', borderRadius: 10 },
  docCheckmark: { position: 'absolute', top: 4, right: 4 },
  skipBtn: { alignItems: 'center', paddingVertical: 10, marginTop: 4 },
});
