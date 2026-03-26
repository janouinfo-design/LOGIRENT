import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, Platform, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../api/axios';
import VehicleInspectionForm from './VehicleInspectionForm';

const RES_COLORS: Record<string, string> = {
  confirmed: '#10B981', active: '#3B82F6', pending: '#FBBF24', pending_cash: '#A855F7',
  completed: '#6B7280', cancelled: '#EF4444',
};

const statusLabel = (s: string) => {
  const map: Record<string, string> = { pending: 'Confirmee', pending_cash: 'Especes', confirmed: 'Confirmee', active: 'Active', completed: 'Terminee', cancelled: 'Annulee' };
  return map[s] || s;
};

interface Reservation {
  id: string; user_name: string; user_email: string; vehicle_name: string;
  start_date: string; end_date: string; total_days: number; total_price: number;
  status: string; payment_status: string; payment_method?: string; vehicle_id?: string;
}

interface Props {
  actionModal: Reservation | null;
  setActionModal: (r: Reservation | null) => void;
  C: any;
  statusColor: (s: string) => string;
  updateStatus: (id: string, status: string) => void;
  updatePayment: (id: string, status: string) => void;
  sendPaymentLink: (id: string) => void;
  sendingLink: boolean;
}

export const ReservationActionModal = ({ actionModal, setActionModal, C, statusColor, updateStatus, updatePayment, sendPaymentLink, sendingLink }: Props) => {
  const router = useRouter();
  const [contractLoading, setContractLoading] = useState(false);
  const [docCheck, setDocCheck] = useState<any>(null);
  const [docCheckLoading, setDocCheckLoading] = useState(false);
  const [showInspection, setShowInspection] = useState<'checkout' | 'checkin' | null>(null);
  const [inspections, setInspections] = useState<any[]>([]);
  const [inspLoading, setInspLoading] = useState(false);

  useEffect(() => {
    if (actionModal) {
      loadInspections(actionModal.id);
    } else {
      setInspections([]);
      setShowInspection(null);
    }
  }, [actionModal?.id]);

  const loadInspections = async (resId: string) => {
    setInspLoading(true);
    try {
      const { data } = await api.get(`/api/inspections/reservation/${resId}`);
      setInspections(data.inspections || []);
    } catch (e) { console.error(e); }
    setInspLoading(false);
  };

  const checkDocuments = async (reservationId: string) => {
    setDocCheckLoading(true);
    try {
      const resp = await api.get(`/api/admin/reservations/${reservationId}/check-documents`);
      setDocCheck(resp.data);
    } catch (err: any) {
      Platform.OS === 'web' ? window.alert('Erreur verification documents') : Alert.alert('Erreur');
    } finally {
      setDocCheckLoading(false);
    }
  };

  const handleConfirmWithDocCheck = async (reservationId: string) => {
    setDocCheckLoading(true);
    try {
      const resp = await api.get(`/api/admin/reservations/${reservationId}/check-documents`);
      if (!resp.data.documents_complete) {
        setDocCheck(resp.data);
        const missing = resp.data.missing_documents?.join(', ') || '';
        const msg = `Documents manquants pour ${resp.data.client_name}:\n${missing}\n\nVoulez-vous confirmer quand meme ?`;
        if (Platform.OS === 'web') {
          if (window.confirm(msg)) {
            updateStatus(reservationId, 'confirmed');
            setActionModal(null);
          }
        } else {
          Alert.alert('Documents manquants', msg, [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Confirmer', onPress: () => { updateStatus(reservationId, 'confirmed'); setActionModal(null); } },
          ]);
        }
      } else {
        updateStatus(reservationId, 'confirmed');
        setActionModal(null);
      }
    } catch {
      updateStatus(reservationId, 'confirmed');
      setActionModal(null);
    } finally {
      setDocCheckLoading(false);
    }
  };

  return (
    <Modal visible={!!actionModal} transparent animationType="slide" onRequestClose={() => { setActionModal(null); setDocCheck(null); }}>
      <View style={st.modalOverlay}>
        <View style={[st.modal, { backgroundColor: C.card }]}>
          <View style={st.modalHeader}>
            <Text style={{ color: C.text, fontSize: 18, fontWeight: '800' }}>Actions</Text>
            <TouchableOpacity onPress={() => { setActionModal(null); setDocCheck(null); }}><Ionicons name="close" size={24} color={C.text} /></TouchableOpacity>
          </View>
          {actionModal && (
            <ScrollView>
              <Text style={{ color: C.textLight, fontSize: 14, marginBottom: 4 }}>{actionModal.user_name} - {actionModal.vehicle_name}</Text>
              <Text style={{ color: C.text, fontSize: 20, fontWeight: '800', marginBottom: 4 }}>CHF {actionModal.total_price?.toFixed(2)}</Text>
              {(actionModal as any).selected_tier && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, backgroundColor: C.accent + '10', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                  <Ionicons name="pricetag" size={14} color={C.accent} />
                  <Text style={{ color: C.accent, fontSize: 12, fontWeight: '600' }}>Forfait: {(actionModal as any).selected_tier.name} - CHF {(actionModal as any).selected_tier.price}</Text>
                </View>
              )}

              {/* Document Verification */}
              <Text style={[st.modalSection, { color: C.textLight }]}>Documents client</Text>
              <TouchableOpacity style={[st.actionBtn, { borderColor: C.border }]}
                onPress={() => checkDocuments(actionModal.id)} data-testid="check-docs-btn">
                <Ionicons name="shield-checkmark" size={18} color={docCheck?.documents_complete ? '#10B981' : C.accent} />
                <Text style={{ color: C.text, fontSize: 14, flex: 1 }}>{docCheckLoading ? 'Verification...' : 'Verifier les documents'}</Text>
                {docCheckLoading && <ActivityIndicator size="small" color={C.accent} />}
              </TouchableOpacity>

              {docCheck && (
                <View style={[st.docCheckResult, { backgroundColor: docCheck.documents_complete ? '#10B98110' : '#EF444410', borderColor: docCheck.documents_complete ? '#10B981' : '#EF4444' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <Ionicons name={docCheck.documents_complete ? 'checkmark-circle' : 'alert-circle'} size={18} color={docCheck.documents_complete ? '#10B981' : '#EF4444'} />
                    <Text style={{ color: docCheck.documents_complete ? '#10B981' : '#EF4444', fontSize: 13, fontWeight: '700' }}>
                      {docCheck.documents_complete ? 'Tous les documents sont fournis' : 'Documents manquants'}
                    </Text>
                  </View>
                  {!docCheck.documents_complete && docCheck.missing_documents?.map((doc: string, i: number) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 24, marginTop: 2 }}>
                      <Ionicons name="close-circle" size={14} color="#EF4444" />
                      <Text style={{ color: '#EF4444', fontSize: 12 }}>{doc}</Text>
                    </View>
                  ))}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, marginLeft: 24 }}>
                    {[
                      { key: 'has_id', label: 'CI Recto' },
                      { key: 'has_id_back', label: 'CI Verso' },
                      { key: 'has_license', label: 'Permis Recto' },
                      { key: 'has_license_back', label: 'Permis Verso' },
                    ].map(({ key, label }) => (
                      <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name={docCheck[key] ? 'checkmark-circle' : 'close-circle'} size={14} color={docCheck[key] ? '#10B981' : '#EF4444'} />
                        <Text style={{ fontSize: 11, color: docCheck[key] ? '#10B981' : '#EF4444' }}>{label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Contract actions */}
              <Text style={[st.modalSection, { color: C.textLight }]}>Contrat</Text>
              <TouchableOpacity style={[st.actionBtn, { borderColor: C.border }]}
                onPress={async () => {
                  setContractLoading(true);
                  try {
                    const resp = await api.get(`/api/contracts/by-reservation/${actionModal.id}`);
                    if (resp.data) {
                      setActionModal(null); setDocCheck(null); router.push(`/contract/${resp.data.id}` as any);
                    } else {
                      const genResp = await api.post('/api/admin/contracts/generate', { reservation_id: actionModal.id, language: 'fr' });
                      Platform.OS === 'web' ? window.alert('Contrat genere !') : Alert.alert('Succes', 'Contrat genere !');
                      setActionModal(null); setDocCheck(null); router.push(`/contract/${genResp.data.contract_id}` as any);
                    }
                  } catch (err: any) {
                    Platform.OS === 'web' ? window.alert(err.response?.data?.detail || 'Erreur') : Alert.alert('Erreur');
                  } finally { setContractLoading(false); }
                }} data-testid="contract-view-btn">
                <Ionicons name="document-text" size={18} color={C.accent} />
                <Text style={{ color: C.text, fontSize: 14 }}>{contractLoading ? 'Chargement...' : 'Voir / Generer le contrat'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[st.actionBtn, { borderColor: C.border }]}
                onPress={async () => {
                  try {
                    const resp = await api.get(`/api/contracts/by-reservation/${actionModal.id}`);
                    if (!resp.data) { Platform.OS === 'web' ? window.alert('Generez d\'abord le contrat') : Alert.alert('Info', 'Generez d\'abord le contrat'); return; }
                    await api.put(`/api/contracts/${resp.data.id}/send`);
                    Platform.OS === 'web' ? window.alert('Contrat envoye!') : Alert.alert('Succes', 'Contrat envoye!');
                  } catch (err: any) { Platform.OS === 'web' ? window.alert(err.response?.data?.detail || 'Erreur') : Alert.alert('Erreur'); }
                }} data-testid="contract-send-btn">
                <Ionicons name="send" size={18} color={C.success} />
                <Text style={{ color: C.text, fontSize: 14 }}>Envoyer le contrat au client</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[st.actionBtn, { borderColor: C.border }]}
                onPress={async () => {
                  try {
                    const resp = await api.get(`/api/contracts/by-reservation/${actionModal.id}`);
                    if (!resp.data) { Platform.OS === 'web' ? window.alert('Generez d\'abord le contrat') : Alert.alert('Info', 'Generez d\'abord le contrat'); return; }
                    const pdfResp = await api.get(`/api/contracts/${resp.data.id}/pdf`, { responseType: 'blob' });
                    if (Platform.OS === 'web') {
                      const blob = new Blob([pdfResp.data], { type: 'application/pdf' });
                      const url = URL.createObjectURL(blob); const a = document.createElement('a');
                      a.href = url; a.download = `contrat_${resp.data.id.slice(0, 8)}.pdf`; a.click(); URL.revokeObjectURL(url);
                    }
                  } catch (err: any) { Platform.OS === 'web' ? window.alert(err.response?.data?.detail || 'Erreur') : Alert.alert('Erreur'); }
                }} data-testid="contract-pdf-btn">
                <Ionicons name="download" size={18} color={C.accent} />
                <Text style={{ color: C.text, fontSize: 14 }}>Telecharger le PDF</Text>
              </TouchableOpacity>

              {/* Status */}
              <Text style={[st.modalSection, { color: C.textLight }]}>Etat des lieux</Text>
              {inspLoading ? <ActivityIndicator size="small" color={C.accent} /> : showInspection ? (
                <View>
                  <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 }} onPress={() => setShowInspection(null)}>
                    <Ionicons name="arrow-back" size={16} color={C.accent} />
                    <Text style={{ color: C.accent, fontSize: 12, fontWeight: '600' }}>Retour</Text>
                  </TouchableOpacity>
                  <VehicleInspectionForm
                    reservationId={actionModal.id}
                    vehicleId={actionModal.vehicle_id || ''}
                    type={showInspection}
                    onComplete={() => { setShowInspection(null); loadInspections(actionModal.id); }}
                  />
                </View>
              ) : (
                <View>
                  {(['checkout', 'checkin'] as const).map(t => {
                    const done = inspections.find((i: any) => i.type === t);
                    const label = t === 'checkout' ? 'Depart' : 'Retour';
                    const icon = t === 'checkout' ? 'log-out-outline' : 'log-in-outline';
                    return (
                      <TouchableOpacity key={t} style={[st.actionBtn, { borderColor: C.border }]}
                        onPress={() => setShowInspection(t)} data-testid={`inspection-${t}-btn`}>
                        <Ionicons name={icon as any} size={18} color={done ? '#10B981' : C.accent} />
                        <Text style={{ color: C.text, fontSize: 14, flex: 1 }}>Etat des lieux - {label}</Text>
                        {done && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#10B98120', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                          <Text style={{ color: '#10B981', fontSize: 10, fontWeight: '600' }}>Complete</Text>
                        </View>}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Statut reservation */}
              <Text style={[st.modalSection, { color: C.textLight }]}>Statut</Text>
              {['confirmed', 'active', 'completed', 'cancelled'].map(s => (
                <TouchableOpacity key={s} style={[st.actionBtn, { borderColor: C.border }]}
                  onPress={() => {
                    if (s === 'confirmed') {
                      handleConfirmWithDocCheck(actionModal.id);
                    } else {
                      updateStatus(actionModal.id, s);
                      setActionModal(null); setDocCheck(null);
                    }
                  }} data-testid={`modal-status-${s}`}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: statusColor(s) }} />
                  <Text style={{ color: C.text, fontSize: 14 }}>{statusLabel(s)}</Text>
                  {s === 'confirmed' && docCheckLoading && <ActivityIndicator size="small" color={C.accent} />}
                </TouchableOpacity>
              ))}

              {/* Payment */}
              <Text style={[st.modalSection, { color: C.textLight }]}>Paiement</Text>
              <TouchableOpacity style={[st.actionBtn, { borderColor: C.border }]} onPress={() => updatePayment(actionModal.id, 'paid')} data-testid="mark-paid-btn">
                <Ionicons name="checkmark-circle" size={18} color={C.success} />
                <Text style={{ color: C.text, fontSize: 14 }}>Marquer comme paye</Text>
              </TouchableOpacity>
              {actionModal.payment_status !== 'paid' && (
                <TouchableOpacity style={[st.actionBtn, { borderColor: C.border, borderBottomWidth: 0 }]} onPress={() => sendPaymentLink(actionModal.id)} disabled={sendingLink} data-testid="send-payment-link-btn">
                  <Ionicons name="link" size={18} color={C.accent} />
                  <Text style={{ color: C.accent, fontSize: 14 }}>{sendingLink ? 'Envoi...' : 'Envoyer lien de paiement'}</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const st = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalSection: { fontSize: 12, fontWeight: '600', marginTop: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1 },
  docCheckResult: { borderRadius: 8, padding: 10, marginTop: 4, borderWidth: 1 },
});
