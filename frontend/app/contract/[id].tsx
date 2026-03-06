import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Modal, Platform, TextInput, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../src/store/themeStore';
import api from '../../src/api/axios';
import SignatureCanvas from '../../src/components/SignatureCanvas';
import VehicleInspection from '../../src/components/VehicleInspection';

interface ContractData {
  id: string;
  reservation_id: string;
  status: string;
  language: string;
  signature_client: string | null;
  signature_date: string | null;
  contract_data: Record<string, any>;
}

const T = {
  fr: {
    title: 'CONTRAT DE LOCATION',
    vehicle: 'Vehicule', plates: 'Plaques', color: 'Couleur',
    responsible: 'Responsable de la location',
    nom: 'Nom', prenom: 'Prenom', adresse: 'Adresse', tel: 'Tel', email: 'Email',
    nationalite: 'Nationalite', naissance: 'Date de naissance',
    permis: 'Permis No.', emission: "Date d'emission", expiration: "Date d'expiration",
    datePrise: 'Date de Prise', dateRetour: 'Date de Retour', heure: 'Heure',
    kmDepart: 'Km Depart', kmRetour: 'Km Retour', difference: 'Difference',
    prixJour: 'Prix/jour', total: 'Total TTC', depot: 'Depot (caution)',
    franchise: 'Franchise', signBtn: 'Signer le contrat', signed: 'Contrat signe',
    downloadPdf: 'Telecharger PDF', contractNo: 'N deg contrat',
    save: 'Sauvegarder', editing: 'Mode edition', saved: 'Contrat sauvegarde !',
    conditions: "Le/la soussigne(e) s'engage a respecter les conditions generales. " +
      "Franchise minimale par sinistre. Tout dommage non couvert sera a la charge du locataire. " +
      "Le present document vaut reconnaissance de dette (art. 82 LP).",
  },
  en: {
    title: 'RENTAL CONTRACT',
    vehicle: 'Vehicle', plates: 'Plates', color: 'Color',
    responsible: 'Rental Responsible',
    nom: 'Last Name', prenom: 'First Name', adresse: 'Address', tel: 'Phone', email: 'Email',
    nationalite: 'Nationality', naissance: 'Date of Birth',
    permis: 'License No.', emission: 'Issue Date', expiration: 'Expiry Date',
    datePrise: 'Pickup Date', dateRetour: 'Return Date', heure: 'Time',
    kmDepart: 'Start Km', kmRetour: 'Return Km', difference: 'Difference',
    prixJour: 'Price/day', total: 'Total incl. VAT', depot: 'Deposit',
    franchise: 'Deductible', signBtn: 'Sign contract', signed: 'Contract signed',
    downloadPdf: 'Download PDF', contractNo: 'Contract No.',
    save: 'Save', editing: 'Editing mode', saved: 'Contract saved!',
    conditions: "The undersigned agrees to respect the general conditions. " +
      "Minimum deductible per claim. Any uncovered damage will be borne by the tenant. " +
      "This document constitutes a debt acknowledgment (art. 82 LP).",
  },
};

export default function ContractView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors: C } = useThemeStore();
  const [contract, setContract] = useState<ContractData | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  const fetchContract = useCallback(async () => {
    try {
      const resp = await api.get(`/api/contracts/${id}`);
      setContract(resp.data);
      setEditData(resp.data?.contract_data || {});
    } catch {
      Platform.OS === 'web' ? window.alert('Contrat introuvable') : Alert.alert('Erreur', 'Contrat introuvable');
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { if (id) fetchContract(); }, [id, fetchContract]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/api/admin/contracts/${id}/update-fields`, editData);
      await fetchContract();
      setEditing(false);
      Platform.OS === 'web' ? window.alert('Contrat sauvegarde !') : Alert.alert('Succes', 'Contrat sauvegarde !');
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Erreur lors de la sauvegarde';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Erreur', msg);
    } finally { setSaving(false); }
  };

  const handleSign = async (signatureBase64: string) => {
    try {
      setSigning(true);
      await api.put(`/api/contracts/${id}/sign`, { signature_data: signatureBase64 });
      setShowSignModal(false);
      Platform.OS === 'web' ? window.alert('Contrat signe !') : Alert.alert('Succes', 'Contrat signe !');
      fetchContract();
    } catch (err: any) {
      Platform.OS === 'web' ? window.alert(err.response?.data?.detail || 'Erreur') : Alert.alert('Erreur');
    } finally { setSigning(false); }
  };

  const handleDownloadPdf = async () => {
    try {
      const resp = await api.get(`/api/contracts/${id}/pdf`, { responseType: 'blob' });
      if (Platform.OS === 'web') {
        const blob = new Blob([resp.data], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `contrat_${id?.slice(0, 8)}.pdf`; a.click(); URL.revokeObjectURL(url);
      }
    } catch {
      Platform.OS === 'web' ? window.alert('Impossible de telecharger le PDF') : Alert.alert('Erreur');
    }
  };

  const updateField = (key: string, value: string) => {
    setEditData(prev => ({ ...prev, [key]: value }));
  };

  if (loading) return <View style={st.center}><ActivityIndicator size="large" color={C.accent} /></View>;
  if (!contract) return <View style={st.center}><Text style={{ color: C.textLight }}>Contrat introuvable</Text></View>;

  const lang = (contract.language || 'fr') as 'fr' | 'en';
  const t = T[lang] || T.fr;
  const d = editing ? editData : contract.contract_data;
  const isSigned = contract.status === 'signed';

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        {/* Header */}
        <View style={st.header}>
          <TouchableOpacity onPress={() => router.back()} data-testid="contract-back-btn">
            <Ionicons name="arrow-back" size={24} color={C.accent} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[st.agencyName, { color: C.text }]}>{d.agency_name}</Text>
            <Text style={[st.contractTitle, { color: C.text }]}>{t.title}</Text>
          </View>
          <View style={[st.badge, { backgroundColor: isSigned ? '#10B98120' : '#F59E0B20' }]}>
            <Ionicons name={isSigned ? 'checkmark-circle' : 'time'} size={12} color={isSigned ? '#10B981' : '#F59E0B'} />
            <Text style={{ color: isSigned ? '#10B981' : '#F59E0B', fontSize: 10, fontWeight: '700' }}>
              {isSigned ? 'Signe' : 'En attente'}
            </Text>
          </View>
        </View>

        {/* Edit mode toggle */}
        {!isSigned && (
          <TouchableOpacity
            onPress={() => setEditing(!editing)}
            style={[st.editToggle, { backgroundColor: editing ? '#F59E0B20' : C.accent + '15', borderColor: editing ? '#F59E0B' : C.accent }]}
            data-testid="contract-edit-toggle"
          >
            <Ionicons name={editing ? 'create' : 'create-outline'} size={16} color={editing ? '#F59E0B' : C.accent} />
            <Text style={{ color: editing ? '#F59E0B' : C.accent, fontSize: 13, fontWeight: '700' }}>
              {editing ? t.editing : 'Modifier le contrat'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Contract Number */}
        {d.contract_number && (
          <Text style={[st.contractNo, { color: C.textLight }]} data-testid="contract-number">
            {t.contractNo} : {d.contract_number}
          </Text>
        )}

        {/* Vehicle Section */}
        <Section title={t.vehicle} C={C} accent>
          <Field label={t.plates} field="vehicle_plate" d={d} C={C} editing={editing} onChange={updateField} />
          <Field label={t.color} field="vehicle_color" d={d} C={C} editing={editing} onChange={updateField} />
        </Section>

        {/* Tenant Section */}
        <Section title={t.responsible} C={C}>
          <Field label={t.nom} field="client_name" d={d} C={C} editing={editing} onChange={updateField} />
          <Field label={t.prenom} field="client_firstname" d={d} C={C} editing={editing} onChange={updateField} />
          <Field label={t.adresse} field="client_address" d={d} C={C} editing={editing} onChange={updateField} />
          <Field label={t.tel} field="client_phone" d={d} C={C} editing={editing} onChange={updateField} />
          <Field label={t.email} field="client_email" d={d} C={C} editing={editing} onChange={updateField} />
          <Field label={t.nationalite} field="client_nationality" d={d} C={C} editing={editing} onChange={updateField} />
          <Field label={t.naissance} field="client_dob" d={d} C={C} editing={editing} onChange={updateField} />
          <Field label={t.permis} field="client_license" d={d} C={C} editing={editing} onChange={updateField} />
          <Field label={t.emission} field="client_license_issued" d={d} C={C} editing={editing} onChange={updateField} />
          <Field label={t.expiration} field="client_license_valid" d={d} C={C} editing={editing} onChange={updateField} />
        </Section>

        {/* Dates & Km Section */}
        <Section title="Dates & Km" C={C}>
          <View style={st.row}>
            <View style={{ flex: 1 }}>
              <Text style={[st.dateLabel, { color: C.textLight }]}>{t.datePrise}</Text>
              <Text style={[st.dateValue, { color: C.text }]}>{d.start_date}</Text>
              <Text style={[st.timeValue, { color: C.textLight }]}>{d.start_time}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[st.dateLabel, { color: C.textLight }]}>{t.dateRetour}</Text>
              <Text style={[st.dateValue, { color: C.text }]}>{d.end_date}</Text>
              <Text style={[st.timeValue, { color: C.textLight }]}>{d.end_time}</Text>
            </View>
          </View>
          <View style={[st.row, { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border }]}>
            <Field label={t.kmDepart} field="km_start" d={d} C={C} editing={editing} onChange={updateField} keyboard="numeric" />
            <Field label={t.kmRetour} field="km_return" d={d} C={C} editing={editing} onChange={updateField} keyboard="numeric" />
          </View>
        </Section>

        {/* Pricing Section */}
        <Section title="Tarification" C={C}>
          <Field label={t.prixJour} field="price_per_day" d={d} C={C} editing={editing} onChange={updateField} keyboard="numeric" prefix="CHF " />
          <View style={[st.totalRow, { borderTopColor: C.border }]}>
            <Text style={[st.totalLabel, { color: C.text }]}>{t.total}</Text>
            <Text style={[st.totalValue, { color: C.accent }]}>CHF {Number(d.total_price || 0).toFixed(2)}</Text>
          </View>
          <Field label={t.depot} field="deposit" d={d} C={C} editing={editing} onChange={updateField} keyboard="numeric" prefix="CHF " />
          <Field label={t.franchise} field="deductible" d={d} C={C} editing={editing} onChange={updateField} prefix="CHF " />
        </Section>

        {/* Conditions */}
        <Section title="Conditions" C={C}>
          <Text style={[st.conditionsText, { color: C.textLight }]}>{t.conditions}</Text>
        </Section>

        {/* Vehicle Inspection Diagram */}
        <Section title={lang === 'fr' ? "État du véhicule" : "Vehicle Condition"} C={C}>
          <VehicleInspection
            damages={d.damages || {}}
            onUpdateDamage={(key, value) => {
              const currentDamages = { ...(editData.damages || d.damages || {}) };
              if (value) {
                currentDamages[key] = value;
              } else {
                delete currentDamages[key];
              }
              setEditData(prev => ({ ...prev, damages: currentDamages }));
              if (!editing) setEditing(true);
            }}
            editable={!isSigned}
            colors={C}
          />
        </Section>

        {/* Signature */}
        {isSigned && contract.signature_client && (
          <Section title="Signature" C={C}>
            <Text style={{ color: '#10B981', fontSize: 13, fontWeight: '700', marginBottom: 8 }}>
              {t.signed} - {contract.signature_date?.split('T')[0] || ''}
            </Text>
            <View style={st.sigBox}>
              {Platform.OS === 'web' && (
                <img src={contract.signature_client} alt="Signature" style={{ maxWidth: 220, maxHeight: 90 }} />
              )}
            </View>
          </Section>
        )}
      </ScrollView>

      {/* Bottom Actions */}
      <View style={[st.bottomBar, { backgroundColor: C.navBg, borderTopColor: C.border }]}>
        {editing ? (
          <TouchableOpacity style={[st.actionBtn, { backgroundColor: '#10B981' }]} onPress={handleSave} disabled={saving} data-testid="contract-save-btn">
            {saving ? <ActivityIndicator size="small" color="#fff" /> : (
              <>
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>{t.save}</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <>
            {!isSigned && (
              <TouchableOpacity style={[st.actionBtn, { backgroundColor: C.accent }]} onPress={() => setShowSignModal(true)} data-testid="contract-sign-btn">
                <Ionicons name="create" size={18} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>{t.signBtn}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[st.actionBtn, { backgroundColor: C.card, borderWidth: 1, borderColor: C.border }]} onPress={handleDownloadPdf} data-testid="contract-download-btn">
              <Ionicons name="download" size={18} color={C.accent} />
              <Text style={{ color: C.accent, fontSize: 14, fontWeight: '600' }}>{t.downloadPdf}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Signature Modal */}
      <Modal visible={showSignModal} animationType="slide" transparent>
        <View style={st.modalOverlay}>
          <View style={[st.modalContent, { backgroundColor: C.card, borderColor: C.border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ color: C.text, fontSize: 16, fontWeight: '700' }}>Votre signature</Text>
              <TouchableOpacity onPress={() => setShowSignModal(false)}>
                <Ionicons name="close" size={24} color={C.textLight} />
              </TouchableOpacity>
            </View>
            <SignatureCanvas onSave={handleSign} saving={signing} colors={C} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ── Sub-components ── */

function Section({ title, children, C, accent }: { title: string; children: React.ReactNode; C: any; accent?: boolean }) {
  return (
    <View style={[st.section, { backgroundColor: accent ? C.accent + '08' : C.card, borderColor: accent ? C.accent + '30' : C.border }]}>
      {title ? <Text style={[st.sectionTitle, { color: C.text }]}>{title}</Text> : null}
      {children}
    </View>
  );
}

function Field({ label, field, d, C, editing, onChange, keyboard, prefix }: {
  label: string; field: string; d: Record<string, any>; C: any;
  editing: boolean; onChange: (k: string, v: string) => void;
  keyboard?: string; prefix?: string;
}) {
  const value = d[field] || '';
  const displayValue = prefix && value && !editing ? `${prefix}${value}` : String(value || '—');

  return (
    <View style={st.fieldRow}>
      <Text style={[st.fieldLabel, { color: C.textLight }]}>{label}</Text>
      {editing ? (
        <TextInput
          style={[st.fieldInput, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
          value={String(value || '')}
          onChangeText={(v) => onChange(field, v)}
          placeholder={label}
          placeholderTextColor={C.textLight + '60'}
          keyboardType={keyboard === 'numeric' ? 'numeric' : 'default'}
          data-testid={`field-${field}`}
        />
      ) : (
        <Text style={[st.fieldValue, { color: C.text }]}>{displayValue}</Text>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  agencyName: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  contractTitle: { fontSize: 18, fontWeight: '800', marginTop: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  contractNo: { fontSize: 12, textAlign: 'center', marginBottom: 12 },
  editToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, marginBottom: 12 },
  section: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  row: { flexDirection: 'row', gap: 12 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, minHeight: 36 },
  fieldLabel: { fontSize: 12, fontWeight: '600', flex: 1 },
  fieldValue: { fontSize: 13, fontWeight: '500', flex: 1.5, textAlign: 'right' },
  fieldInput: { flex: 1.5, fontSize: 13, borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, textAlign: 'right' },
  dateLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  dateValue: { fontSize: 15, fontWeight: '700' },
  timeValue: { fontSize: 12, marginTop: 2 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, marginTop: 8, borderTopWidth: 1 },
  totalLabel: { fontSize: 14, fontWeight: '700' },
  totalValue: { fontSize: 18, fontWeight: '800' },
  conditionsText: { fontSize: 11, lineHeight: 16 },
  inspectionImage: { width: '100%', height: 350, alignSelf: 'center' },
  sigBox: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 8, alignItems: 'center' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 28, borderTopWidth: 1 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalContent: { width: '100%', maxWidth: 480, borderRadius: 16, padding: 20, borderWidth: 1 },
});
