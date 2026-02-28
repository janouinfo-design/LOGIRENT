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
    client_name: string;
    client_firstname: string;
    client_email: string;
    client_phone: string;
    client_address: string;
    client_license: string;
    vehicle_name: string;
    vehicle_plate: string;
    start_date: string;
    end_date: string;
    total_price: number;
    deposit: number;
    language: string;
  };
}

const TEMPLATES = {
  fr: {
    title: 'CONTRAT DE LOCATION DE VÉHICULE',
    sections: ['1. Informations du Locataire', '2. Véhicule', '3. Prix et Paiement', '4. Caution', '5. Assurance et Responsabilité', '6. Reconnaissance de Dette', '7. For Juridique'],
    conditionsTitle: 'CONDITIONS GÉNÉRALES DE LOCATION',
    conditions: [
      'Article 1 – Paiement intégral avant remise des clés.',
      'Article 2 – Le Locataire répond de tout dommage matériel et immatériel.',
      'Article 3 – Retard = facturation jour complet + pénalité.',
      'Article 4 – Conducteurs non autorisés exclus de couverture.',
      'Article 5 – Sortie du territoire interdite sans autorisation écrite.',
      'Article 6 – Véhicule équipé GPS pouvant servir de preuve.',
      'Article 7 – Clause pénale en cas de violation grave.',
    ],
    fields: { name: 'Nom', firstname: 'Prénom', phone: 'Téléphone', email: 'Email', address: 'Adresse', license: 'Permis n°', brandModel: 'Marque / Modèle', plate: 'Plaque', dateStart: 'Date départ', dateEnd: 'Date retour', total: 'Montant total', deposit: 'Caution', insuranceText: 'Franchise minimale : CHF 1\'000.– par sinistre.\nExclusion en cas d\'alcool, drogues, conducteur non autorisé ou usage illégal.', debtText: 'Le présent contrat vaut reconnaissance de dette au sens de l\'art. 82 LP.', jurisdictionText: 'Droit suisse applicable. For exclusif : Lausanne.', signBtn: 'Signer le contrat', signed: 'Contrat signé', downloadPdf: 'Télécharger PDF', paymentNote: 'Paiement exigible immédiatement. Intérêt moratoire 5% en cas de retard.' },
  },
  en: {
    title: 'VEHICLE RENTAL CONTRACT',
    sections: ['1. Tenant Information', '2. Vehicle', '3. Price and Payment', '4. Deposit', '5. Insurance and Liability', '6. Debt Acknowledgment', '7. Jurisdiction'],
    conditionsTitle: 'GENERAL RENTAL CONDITIONS',
    conditions: [
      'Article 1 – Full payment required before key handover.',
      'Article 2 – The Tenant is liable for all material and immaterial damage.',
      'Article 3 – Delay = full day billing + penalty.',
      'Article 4 – Unauthorized drivers excluded from coverage.',
      'Article 5 – Leaving the territory prohibited without written authorization.',
      'Article 6 – Vehicle equipped with GPS that may serve as evidence.',
      'Article 7 – Penalty clause in case of serious violation.',
    ],
    fields: { name: 'Last Name', firstname: 'First Name', phone: 'Phone', email: 'Email', address: 'Address', license: 'License No.', brandModel: 'Brand / Model', plate: 'Plate', dateStart: 'Start date', dateEnd: 'Return date', total: 'Total amount', deposit: 'Deposit', insuranceText: 'Minimum deductible: CHF 1,000.– per claim.\nExclusion for alcohol, drugs, unauthorized driver or illegal use.', debtText: 'This contract constitutes a debt acknowledgment per art. 82 LP.', jurisdictionText: 'Swiss law applicable. Exclusive jurisdiction: Lausanne.', signBtn: 'Sign contract', signed: 'Contract signed', downloadPdf: 'Download PDF', paymentNote: 'Payment due immediately. 5% default interest in case of delay.' },
  }
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
    } catch (err) {
      console.error('Contract fetch error:', err);
      Alert.alert('Erreur', 'Contrat introuvable');
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { if (id) fetchContract(); }, [id, fetchContract]);

  const handleSign = async (signatureBase64: string) => {
    try {
      setSigning(true);
      await api.put(`/api/contracts/${id}/sign`, { signature_data: signatureBase64 });
      setShowSignModal(false);
      Alert.alert('Succès', 'Contrat signé avec succès !');
      fetchContract();
    } catch (err: any) {
      Alert.alert('Erreur', err.response?.data?.detail || 'Erreur lors de la signature');
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
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de télécharger le PDF');
    }
  };

  if (loading) return <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={C.accent} /></View>;
  if (!contract) return <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: C.textLight }}>Contrat introuvable</Text></View>;

  const lang = contract.language || 'fr';
  const tpl = TEMPLATES[lang as 'fr' | 'en'] || TEMPLATES.fr;
  const d = contract.contract_data;
  const isSigned = contract.status === 'signed';

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <TouchableOpacity onPress={() => router.back()} testID="contract-back-btn">
            <Ionicons name="arrow-back" size={24} color={C.accent} />
          </TouchableOpacity>
          <Text style={{ color: C.text, fontSize: 18, fontWeight: '700', marginLeft: 12, flex: 1 }}>{tpl.title}</Text>
          <View style={[st.statusBadge, { backgroundColor: isSigned ? '#10B98120' : '#F59E0B20' }]}>
            <Ionicons name={isSigned ? 'checkmark-circle' : 'time'} size={14} color={isSigned ? '#10B981' : '#F59E0B'} />
            <Text style={{ color: isSigned ? '#10B981' : '#F59E0B', fontSize: 11, fontWeight: '700' }}>
              {isSigned ? (lang === 'fr' ? 'Signé' : 'Signed') : (lang === 'fr' ? 'En attente' : 'Pending')}
            </Text>
          </View>
        </View>

        {/* Agency Name */}
        <View style={[st.card, { backgroundColor: C.accent + '12', borderColor: C.accent + '30' }]}>
          <Text style={{ color: C.accent, fontSize: 16, fontWeight: '800', textAlign: 'center' }}>{d.agency_name}</Text>
        </View>

        {/* Section 1 - Tenant Info */}
        <View style={[st.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[st.sectionTitle, { color: C.text }]}>{tpl.sections[0]}</Text>
          <FieldRow label={tpl.fields.name} value={d.client_name} C={C} />
          <FieldRow label={tpl.fields.phone} value={d.client_phone} C={C} />
          <FieldRow label={tpl.fields.email} value={d.client_email} C={C} />
          <FieldRow label={tpl.fields.address} value={d.client_address} C={C} />
          <FieldRow label={tpl.fields.license} value={d.client_license} C={C} />
        </View>

        {/* Section 2 - Vehicle */}
        <View style={[st.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[st.sectionTitle, { color: C.text }]}>{tpl.sections[1]}</Text>
          <FieldRow label={tpl.fields.brandModel} value={d.vehicle_name} C={C} />
          <FieldRow label={tpl.fields.plate} value={d.vehicle_plate} C={C} />
          <FieldRow label={tpl.fields.dateStart} value={d.start_date} C={C} />
          <FieldRow label={tpl.fields.dateEnd} value={d.end_date} C={C} />
        </View>

        {/* Section 3 - Price */}
        <View style={[st.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[st.sectionTitle, { color: C.text }]}>{tpl.sections[2]}</Text>
          <FieldRow label={tpl.fields.total} value={`CHF ${d.total_price?.toFixed(2)} TTC`} C={C} bold />
          <Text style={{ color: C.textLight, fontSize: 11, marginTop: 6 }}>{tpl.fields.paymentNote}</Text>
        </View>

        {/* Section 4 - Deposit */}
        <View style={[st.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[st.sectionTitle, { color: C.text }]}>{tpl.sections[3]}</Text>
          <FieldRow label={tpl.fields.deposit} value={`CHF ${(d.deposit || 0).toFixed(2)}`} C={C} />
        </View>

        {/* Section 5 - Insurance */}
        <View style={[st.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[st.sectionTitle, { color: C.text }]}>{tpl.sections[4]}</Text>
          <Text style={{ color: C.textLight, fontSize: 12, lineHeight: 18 }}>{tpl.fields.insuranceText}</Text>
        </View>

        {/* Section 6 - Debt */}
        <View style={[st.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[st.sectionTitle, { color: C.text }]}>{tpl.sections[5]}</Text>
          <Text style={{ color: C.textLight, fontSize: 12, lineHeight: 18 }}>{tpl.fields.debtText}</Text>
        </View>

        {/* Section 7 - Jurisdiction */}
        <View style={[st.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[st.sectionTitle, { color: C.text }]}>{tpl.sections[6]}</Text>
          <Text style={{ color: C.textLight, fontSize: 12, lineHeight: 18 }}>{tpl.fields.jurisdictionText}</Text>
        </View>

        {/* Conditions */}
        <View style={[st.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[st.sectionTitle, { color: C.text, textAlign: 'center' }]}>{tpl.conditionsTitle}</Text>
          {tpl.conditions.map((c, i) => (
            <Text key={i} style={{ color: C.textLight, fontSize: 12, lineHeight: 18, marginBottom: 6 }}>{c}</Text>
          ))}
        </View>

        {/* Signature */}
        {isSigned && contract.signature_client && (
          <View style={[st.card, { backgroundColor: C.card, borderColor: C.success + '40' }]}>
            <Text style={{ color: C.success, fontSize: 14, fontWeight: '700', marginBottom: 8 }}>
              {tpl.fields.signed} - {contract.signature_date?.split('T')[0] || ''}
            </Text>
            <View style={{ backgroundColor: '#fff', borderRadius: 8, padding: 8, alignItems: 'center' }}>
              {Platform.OS === 'web' && (
                <img src={contract.signature_client} alt="Signature" style={{ maxWidth: 250, maxHeight: 100 }} />
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Action Buttons */}
      <View style={[st.bottomBar, { backgroundColor: C.navBg, borderTopColor: C.border }]}>
        {!isSigned && contract.status === 'sent' && (
          <TouchableOpacity style={[st.actionBtn, { backgroundColor: C.accent }]} onPress={() => setShowSignModal(true)} testID="contract-sign-btn">
            <Ionicons name="create" size={18} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>{tpl.fields.signBtn}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[st.actionBtn, { backgroundColor: C.card, borderWidth: 1, borderColor: C.border }]} onPress={handleDownloadPdf} testID="contract-download-btn">
          <Ionicons name="download" size={18} color={C.accent} />
          <Text style={{ color: C.accent, fontSize: 14, fontWeight: '600' }}>{tpl.fields.downloadPdf}</Text>
        </TouchableOpacity>
      </View>

      {/* Signature Modal */}
      <Modal visible={showSignModal} animationType="slide" transparent>
        <View style={[st.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
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

function FieldRow({ label, value, C, bold }: { label: string; value: string; C: any; bold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: C.border + '60' }}>
      <Text style={{ color: C.textLight, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: C.text, fontSize: 12, fontWeight: bold ? '800' : '600', maxWidth: '60%', textAlign: 'right' }}>{value || '—'}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  card: { borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1 },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  bottomBar: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, borderWidth: 1, minHeight: 350 },
});
