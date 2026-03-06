import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, Platform, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../src/store/themeStore';
import api from '../../src/api/axios';
import SignatureCanvas from '../../src/components/SignatureCanvas';
import VehicleInspection from '../../src/components/VehicleInspection';

interface ContractData {
  id: string;
  status: string;
  language: string;
  signature_client: string | null;
  contract_data: Record<string, any>;
}

const FIELDS = [
  { section: 'vehicle', label: 'Vehicule', fields: [
    { key: 'vehicle_plate', label: 'Plaques', placeholder: 'Ex: VD-166068' },
    { key: 'vehicle_color', label: 'Couleur', placeholder: 'Ex: BLANC' },
  ]},
  { section: 'client', label: 'Client', fields: [
    { key: 'client_name', label: 'Nom', placeholder: 'Nom de famille' },
    { key: 'client_firstname', label: 'Prenom', placeholder: 'Prenom' },
    { key: 'client_address', label: 'Adresse', placeholder: 'Adresse complete' },
    { key: 'client_phone', label: 'Telephone', placeholder: '+41 79 ...' },
    { key: 'client_email', label: 'Email', placeholder: 'email@exemple.ch' },
    { key: 'client_nationality', label: 'Nationalite', placeholder: 'CH, FR, ...' },
    { key: 'client_dob', label: 'Date de naissance', placeholder: 'JJ.MM.AAAA' },
    { key: 'client_license', label: 'Permis No.', placeholder: 'Numero de permis' },
    { key: 'client_license_issued', label: "Date d'emission", placeholder: 'JJ.MM.AAAA' },
    { key: 'client_license_valid', label: "Date d'expiration", placeholder: 'JJ.MM.AAAA' },
  ]},
  { section: 'km', label: 'Kilometrage', fields: [
    { key: 'km_start', label: 'Km Depart', placeholder: 'Ex: 45230' },
  ]},
  { section: 'pricing', label: 'Tarification', fields: [
    { key: 'deposit', label: 'Caution (CHF)', placeholder: 'Ex: 1000' },
    { key: 'deductible', label: 'Franchise (CHF)', placeholder: 'Ex: 1000' },
  ]},
];

export default function CompleteContract() {
  const { contract_id, reservation_id, month } = useLocalSearchParams<{ contract_id: string; reservation_id?: string; month?: string }>();
  const router = useRouter();
  const { colors: C } = useThemeStore();

  const [contract, setContract] = useState<ContractData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editedFields, setEditedFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [signing, setSigning] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [signed, setSigned] = useState(false);

  const fetchContract = useCallback(async () => {
    try {
      const resp = await api.get(`/api/contracts/${contract_id}`);
      setContract(resp.data);
      setSigned(resp.data.status === 'signed');
    } catch {
      Alert.alert('Erreur', 'Contrat introuvable');
    } finally { setLoading(false); }
  }, [contract_id]);

  useEffect(() => { if (contract_id) fetchContract(); }, [contract_id, fetchContract]);

  const getValue = (key: string) => {
    if (editedFields[key] !== undefined) return editedFields[key];
    return contract?.contract_data?.[key] || '';
  };

  const setField = (key: string, val: string) => {
    setEditedFields(prev => ({ ...prev, [key]: val }));
  };

  const hasChanges = Object.keys(editedFields).length > 0;

  const saveFields = async () => {
    if (!hasChanges) return;
    setSaving(true);
    try {
      const resp = await api.put(`/api/admin/contracts/${contract_id}/update-fields`, editedFields);
      setContract(resp.data);
      setEditedFields({});
      if (Platform.OS === 'web') window.alert('Champs sauvegardés');
      else Alert.alert('Sauvegarde', 'Champs mis à jour');
    } catch (e: any) {
      const msg = e.response?.data?.detail || 'Erreur';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Erreur', msg);
    } finally { setSaving(false); }
  };

  const handleSign = async (signatureBase64: string) => {
    // Save pending edits first
    if (hasChanges) {
      try {
        await api.put(`/api/admin/contracts/${contract_id}/update-fields`, editedFields);
        setEditedFields({});
      } catch {}
    }
    try {
      setSigning(true);
      await api.put(`/api/contracts/${contract_id}/sign`, { signature_data: signatureBase64 });
      setShowSignModal(false);
      setSigned(true);
      fetchContract();
    } catch (e: any) {
      const msg = e.response?.data?.detail || 'Erreur';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Erreur', msg);
    } finally { setSigning(false); }
  };

  const handleDownloadPdf = async () => {
    try {
      const resp = await api.get(`/api/contracts/${contract_id}/pdf`, { responseType: 'blob' });
      if (Platform.OS === 'web') {
        const blob = new Blob([resp.data], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `contrat_${contract_id?.slice(0, 8)}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      Alert.alert('Erreur', 'Impossible de telecharger');
    }
  };

  if (loading) return <View style={st.center}><ActivityIndicator size="large" color={C.accent} /></View>;
  if (!contract) return <View style={st.center}><Text style={{ color: C.textLight }}>Contrat introuvable</Text></View>;

  const d = contract.contract_data;

  // After signing - success view
  if (signed) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 20, alignItems: 'center', paddingTop: 50 }}>
        <Ionicons name="checkmark-circle" size={64} color="#10B981" />
        <Text style={{ color: C.text, fontSize: 22, fontWeight: '800', marginTop: 16 }}>Contrat signe !</Text>
        <Text style={{ color: C.textLight, fontSize: 14, marginTop: 8, textAlign: 'center' }}>
          {d.vehicle_name} - {d.client_name} {d.client_firstname}
        </Text>
        <Text style={{ color: C.accent, fontSize: 24, fontWeight: '800', marginTop: 12 }}>
          CHF {Number(d.total_price || 0).toFixed(2)}
        </Text>

        <TouchableOpacity
          style={[st.actionBtn, { backgroundColor: C.accent, marginTop: 24, width: '100%' }]}
          onPress={handleDownloadPdf}
          data-testid="download-signed-pdf"
        >
          <Ionicons name="download" size={20} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Telecharger le PDF</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[st.actionBtn, { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, marginTop: 10, width: '100%' }]}
          onPress={() => {
            if (reservation_id) {
              const params = new URLSearchParams({ highlight: reservation_id });
              if (month) params.append('month', month);
              router.replace(`/agency-app/reservations?${params.toString()}` as any);
            } else {
              router.replace('/agency-app/reservations');
            }
          }}
          data-testid="go-to-planning-btn"
        >
          <Ionicons name="calendar" size={20} color={C.accent} />
          <Text style={{ color: C.accent, fontSize: 15, fontWeight: '600' }}>Voir sur le planning</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[st.actionBtn, { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, marginTop: 10, width: '100%' }]}
          onPress={() => router.replace('/agency-app/book')}
          data-testid="new-reservation-btn"
        >
          <Ionicons name="add-circle" size={20} color={C.accent} />
          <Text style={{ color: C.accent, fontSize: 15, fontWeight: '600' }}>Nouvelle reservation</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ marginTop: 16 }}
          onPress={() => router.replace('/agency-app')}
        >
          <Text style={{ color: C.textLight, fontSize: 13 }}>Retour a l'accueil</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        {/* Header */}
        <View style={st.header}>
          <TouchableOpacity onPress={() => router.back()} data-testid="complete-contract-back">
            <Ionicons name="arrow-back" size={24} color={C.accent} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ color: C.text, fontSize: 18, fontWeight: '800' }}>{d.agency_name}</Text>
            <Text style={{ color: C.textLight, fontSize: 12 }}>Contrat N° {d.contract_number} - {d.vehicle_name}</Text>
          </View>
        </View>

        {/* Info banner */}
        <View style={[st.infoBanner, { backgroundColor: '#3B82F610', borderColor: '#3B82F630' }]}>
          <Ionicons name="information-circle" size={20} color="#3B82F6" />
          <Text style={{ color: '#3B82F6', fontSize: 12, flex: 1 }}>
            Completez les champs manquants puis faites signer le client
          </Text>
        </View>

        {/* Contract summary */}
        <View style={[st.summaryBox, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={st.summaryRow}>
            <Text style={{ color: C.textLight, fontSize: 12 }}>Vehicule</Text>
            <Text style={{ color: C.text, fontSize: 13, fontWeight: '700' }}>{d.vehicle_name}</Text>
          </View>
          <View style={st.summaryRow}>
            <Text style={{ color: C.textLight, fontSize: 12 }}>Dates</Text>
            <Text style={{ color: C.text, fontSize: 13, fontWeight: '600' }}>{d.start_date} {d.start_time} - {d.end_date} {d.end_time}</Text>
          </View>
          <View style={st.summaryRow}>
            <Text style={{ color: C.textLight, fontSize: 12 }}>Total TTC</Text>
            <Text style={{ color: C.accent, fontSize: 15, fontWeight: '800' }}>CHF {Number(d.total_price || 0).toFixed(2)}</Text>
          </View>
        </View>

        {/* Editable fields */}
        {FIELDS.map(section => (
          <View key={section.section} style={[st.sectionCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[st.sectionTitle, { color: C.text }]}>{section.label}</Text>
            {section.fields.map(f => {
              const val = getValue(f.key);
              const isEmpty = !val || val === '—';
              return (
                <View key={f.key} style={st.fieldRow}>
                  <Text style={[st.fieldLabel, { color: C.textLight }]}>
                    {f.label}
                    {isEmpty && <Text style={{ color: '#EF4444' }}> *</Text>}
                  </Text>
                  <TextInput
                    style={[
                      st.fieldInput,
                      { color: C.text, backgroundColor: C.bg, borderColor: isEmpty ? '#EF444440' : C.border },
                    ]}
                    value={val === '—' ? '' : val}
                    onChangeText={v => setField(f.key, v)}
                    placeholder={f.placeholder}
                    placeholderTextColor={C.textLight}
                    data-testid={`field-${f.key}`}
                  />
                </View>
              );
            })}
          </View>
        ))}

        {/* Save button */}
        {hasChanges && (
          <TouchableOpacity
            style={[st.actionBtn, { backgroundColor: '#3B82F6' }]}
            onPress={saveFields}
            disabled={saving}
            data-testid="save-fields-btn"
          >
            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="save" size={18} color="#fff" />}
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>
              {saving ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Vehicle Inspection Diagram */}
        <View style={[st.sectionCard, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[st.sectionTitle, { color: C.text }]}>État du véhicule</Text>
          <VehicleInspection
            damages={(() => {
              const dmg = editedFields.damages || contract?.contract_data?.damages || {};
              return typeof dmg === 'string' ? JSON.parse(dmg) : dmg;
            })()}
            onUpdateDamage={(key, value) => {
              const current = editedFields.damages || contract?.contract_data?.damages || {};
              const parsed = typeof current === 'string' ? JSON.parse(current) : { ...current };
              if (value) {
                parsed[key] = value;
              } else {
                delete parsed[key];
              }
              setField('damages', JSON.stringify(parsed));
            }}
            editable={!signed}
            colors={C}
          />
        </View>
      </ScrollView>

      {/* Bottom: Sign button */}
      <View style={[st.bottomBar, { backgroundColor: C.navBg, borderTopColor: C.border }]}>
        <TouchableOpacity
          style={[st.actionBtn, { backgroundColor: '#10B981', flex: 1 }]}
          onPress={() => setShowSignModal(true)}
          data-testid="open-sign-modal-btn"
        >
          <Ionicons name="create" size={20} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Faire signer le client</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[st.actionBtn, { backgroundColor: C.card, borderWidth: 1, borderColor: C.border }]}
          onPress={handleDownloadPdf}
          data-testid="download-pdf-btn"
        >
          <Ionicons name="download" size={20} color={C.accent} />
        </TouchableOpacity>
      </View>

      {/* Signature Modal */}
      <Modal visible={showSignModal} animationType="slide" transparent>
        <View style={st.modalOverlay}>
          <View style={[st.modalContent, { backgroundColor: C.card, borderColor: C.border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ color: C.text, fontSize: 18, fontWeight: '800' }}>Signature du client</Text>
              <TouchableOpacity onPress={() => setShowSignModal(false)} data-testid="close-sign-modal">
                <Ionicons name="close" size={24} color={C.textLight} />
              </TouchableOpacity>
            </View>
            <Text style={{ color: C.textLight, fontSize: 12, marginBottom: 12 }}>
              Le client signe ci-dessous pour accepter les conditions du contrat
            </Text>
            <SignatureCanvas onSave={handleSign} saving={signing} colors={C} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  infoBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 12 },
  summaryBox: { borderRadius: 10, padding: 14, borderWidth: 1, marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  sectionCard: { borderRadius: 10, padding: 14, borderWidth: 1, marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  fieldRow: { marginBottom: 10 },
  fieldLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  fieldInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  bottomBar: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, borderWidth: 1, minHeight: 350 },
});
