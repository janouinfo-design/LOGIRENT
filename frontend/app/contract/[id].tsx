import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Modal, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../src/store/themeStore';
import api from '../../src/api/axios';
import SignatureCanvas from '../../src/components/SignatureCanvas';

interface ContractData {
  id: string;
  reservation_id: string;
  status: string;
  language: string;
  signature_client: string | null;
  signature_date: string | null;
  contract_data: {
    agency_name: string;
    contract_number: string;
    client_name: string;
    client_firstname: string;
    client_email: string;
    client_phone: string;
    client_address: string;
    client_nationality: string;
    client_dob: string;
    client_license: string;
    client_license_issued: string;
    client_license_valid: string;
    vehicle_name: string;
    vehicle_plate: string;
    vehicle_color: string;
    start_date: string;
    start_time: string;
    end_date: string;
    end_time: string;
    km_start: string;
    km_return: string;
    price_per_day: number;
    total_price: number;
    deposit: number;
    deductible: string;
    agency_address: string;
    agency_phone: string;
    agency_email: string;
    language: string;
  };
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

  const fetchContract = useCallback(async () => {
    try {
      const resp = await api.get(`/api/contracts/${id}`);
      setContract(resp.data);
    } catch {
      Alert.alert('Erreur', 'Contrat introuvable');
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { if (id) fetchContract(); }, [id, fetchContract]);

  const handleSign = async (signatureBase64: string) => {
    try {
      setSigning(true);
      await api.put(`/api/contracts/${id}/sign`, { signature_data: signatureBase64 });
      setShowSignModal(false);
      Alert.alert('Succes', 'Contrat signe !');
      fetchContract();
    } catch (err: any) {
      Alert.alert('Erreur', err.response?.data?.detail || 'Erreur');
    } finally { setSigning(false); }
  };

  const handleDownloadPdf = async () => {
    try {
      const resp = await api.get(`/api/contracts/${id}/pdf`, { responseType: 'blob' });
      if (Platform.OS === 'web') {
        const blob = new Blob([resp.data], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `contrat_${id?.slice(0, 8)}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      Alert.alert('Erreur', 'Impossible de telecharger le PDF');
    }
  };

  if (loading) return <View style={st.center}><ActivityIndicator size="large" color={C.accent} /></View>;
  if (!contract) return <View style={st.center}><Text style={{ color: C.textLight }}>Contrat introuvable</Text></View>;

  const lang = (contract.language || 'fr') as 'fr' | 'en';
  const t = T[lang] || T.fr;
  const d = contract.contract_data;
  const isSigned = contract.status === 'signed';

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
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
              {isSigned ? (lang === 'fr' ? 'Signe' : 'Signed') : (lang === 'fr' ? 'En attente' : 'Pending')}
            </Text>
          </View>
        </View>

        {/* Contract Number */}
        {d.contract_number && (
          <Text style={[st.contractNo, { color: C.textLight }]} data-testid="contract-number">
            {t.contractNo} : {d.contract_number}
          </Text>
        )}

        {/* Vehicle Section */}
        <SectionBox title="" C={C} accent>
          <FieldGrid data={[
            { label: t.vehicle, value: d.vehicle_name },
            { label: t.plates, value: d.vehicle_plate },
            { label: t.color, value: d.vehicle_color },
          ]} C={C} />
        </SectionBox>

        {/* Tenant Section */}
        <SectionBox title={t.responsible} C={C}>
          <FieldGrid data={[
            { label: t.nom, value: d.client_name },
            { label: t.prenom, value: d.client_firstname },
            { label: t.adresse, value: d.client_address },
            { label: t.tel, value: d.client_phone },
            { label: t.email, value: d.client_email },
            { label: t.nationalite, value: d.client_nationality },
            { label: t.naissance, value: d.client_dob },
            { label: t.permis, value: d.client_license },
            { label: t.emission, value: d.client_license_issued },
            { label: t.expiration, value: d.client_license_valid },
          ]} C={C} />
        </SectionBox>

        {/* Dates & Km Section */}
        <SectionBox title="" C={C}>
          <View style={st.datesGrid}>
            <DateBlock label={t.datePrise} date={d.start_date} time={d.start_time} C={C} />
            <DateBlock label={t.dateRetour} date={d.end_date} time={d.end_time} C={C} />
          </View>
          <View style={[st.kmRow, { borderTopColor: C.border }]}>
            <KmItem label={t.kmDepart} value={d.km_start} C={C} />
            <KmItem label={t.kmRetour} value={d.km_return || "—"} C={C} />
            <KmItem label={t.difference} value="—" C={C} />
          </View>
        </SectionBox>

        {/* Pricing Section */}
        <SectionBox title="" C={C}>
          <FieldRow label={t.prixJour} value={d.price_per_day ? `CHF ${Number(d.price_per_day).toFixed(2)}` : '—'} C={C} />
          <FieldRow label={t.total} value={`CHF ${(d.total_price || 0).toFixed(2)}`} C={C} bold />
          <FieldRow label={t.depot} value={`CHF ${(d.deposit || 0).toFixed(2)}`} C={C} />
          <FieldRow label={t.franchise} value={`CHF ${d.deductible || '1000'}.-`} C={C} />
        </SectionBox>

        {/* Conditions */}
        <SectionBox title="" C={C}>
          <Text style={[st.conditionsText, { color: C.textLight }]}>{t.conditions}</Text>
        </SectionBox>

        {/* Signature */}
        {isSigned && contract.signature_client && (
          <SectionBox title="" C={C}>
            <Text style={{ color: '#10B981', fontSize: 13, fontWeight: '700', marginBottom: 8 }}>
              {t.signed} - {contract.signature_date?.split('T')[0] || ''}
            </Text>
            <View style={st.sigBox}>
              {Platform.OS === 'web' && (
                <img src={contract.signature_client} alt="Signature" style={{ maxWidth: 220, maxHeight: 90 }} />
              )}
            </View>
          </SectionBox>
        )}
      </ScrollView>

      {/* Bottom Actions */}
      <View style={[st.bottomBar, { backgroundColor: C.navBg, borderTopColor: C.border }]}>
        {!isSigned && contract.status === 'sent' && (
          <TouchableOpacity style={[st.actionBtn, { backgroundColor: C.accent }]} onPress={() => setShowSignModal(true)} data-testid="contract-sign-btn">
            <Ionicons name="create" size={18} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>{t.signBtn}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[st.actionBtn, { backgroundColor: C.card, borderWidth: 1, borderColor: C.border }]} onPress={handleDownloadPdf} data-testid="contract-download-btn">
          <Ionicons name="download" size={18} color={C.accent} />
          <Text style={{ color: C.accent, fontSize: 14, fontWeight: '600' }}>{t.downloadPdf}</Text>
        </TouchableOpacity>
      </View>

      {/* Signature Modal */}
      <Modal visible={showSignModal} animationType="slide" transparent>
        <View style={st.modalOverlay}>
          <View style={[st.modalContent, { backgroundColor: C.card, borderColor: C.border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ color: C.text, fontSize: 16, fontWeight: '700' }}>
                {lang === 'fr' ? 'Votre signature' : 'Your signature'}
              </Text>
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

function SectionBox({ title, children, C, accent }: { title: string; children: React.ReactNode; C: any; accent?: boolean }) {
  return (
    <View style={[st.section, { backgroundColor: accent ? C.accent + '08' : C.card, borderColor: accent ? C.accent + '30' : C.border }]}>
      {title ? <Text style={[st.sectionTitle, { color: C.text }]}>{title}</Text> : null}
      {children}
    </View>
  );
}

function FieldGrid({ data, C }: { data: { label: string; value: string }[]; C: any }) {
  return (
    <View style={st.fieldGrid}>
      {data.map((item, i) => (
        <View key={i} style={[st.fieldItem, { borderBottomColor: C.border + '50' }]}>
          <Text style={[st.fieldLabel, { color: C.textLight }]}>{item.label}</Text>
          <Text style={[st.fieldValue, { color: C.text }]}>{item.value || '—'}</Text>
        </View>
      ))}
    </View>
  );
}

function FieldRow({ label, value, C, bold }: { label: string; value: string; C: any; bold?: boolean }) {
  return (
    <View style={[st.fRow, { borderBottomColor: C.border + '50' }]}>
      <Text style={{ color: C.textLight, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: C.text, fontSize: 12, fontWeight: bold ? '800' : '600' }}>{value || '—'}</Text>
    </View>
  );
}

function DateBlock({ label, date, time, C }: { label: string; date: string; time: string; C: any }) {
  return (
    <View style={[st.dateBlock, { borderColor: C.border }]}>
      <Text style={{ color: C.textLight, fontSize: 10, fontWeight: '700', marginBottom: 4 }}>{label}</Text>
      <Text style={{ color: C.text, fontSize: 14, fontWeight: '700' }}>{date || '—'}</Text>
      <Text style={{ color: C.accent, fontSize: 12, fontWeight: '600' }}>{time || '—'}</Text>
    </View>
  );
}

function KmItem({ label, value, C }: { label: string; value: string; C: any }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingVertical: 8 }}>
      <Text style={{ color: C.textLight, fontSize: 10, fontWeight: '600' }}>{label}</Text>
      <Text style={{ color: C.text, fontSize: 14, fontWeight: '700', marginTop: 2 }}>{value || '—'}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  agencyName: { fontSize: 18, fontWeight: '800' },
  contractTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  contractNo: { fontSize: 11, textAlign: 'right', marginBottom: 10 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  section: { borderRadius: 10, padding: 14, marginBottom: 10, borderWidth: 1 },
  sectionTitle: { fontSize: 13, fontWeight: '700', marginBottom: 10 },
  fieldGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  fieldItem: { width: '50%', paddingVertical: 5, paddingRight: 8, borderBottomWidth: 0.5 },
  fieldLabel: { fontSize: 10, fontWeight: '600', marginBottom: 1 },
  fieldValue: { fontSize: 12, fontWeight: '600' },
  fRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 0.5 },
  datesGrid: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  dateBlock: { flex: 1, borderWidth: 1, borderRadius: 8, padding: 10, alignItems: 'center' },
  kmRow: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 4 },
  conditionsText: { fontSize: 11, lineHeight: 16 },
  sigBox: { backgroundColor: '#fff', borderRadius: 8, padding: 8, alignItems: 'center' },
  bottomBar: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, borderWidth: 1, minHeight: 350 },
});
