import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../../src/api/axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const RES_COLORS: Record<string, string> = {
  confirmed: '#10B981', active: '#3B82F6', pending: '#FBBF24', pending_cash: '#A855F7',
  completed: '#6B7280', cancelled: '#EF4444',
};

const statusLabel = (s: string) => {
  const map: Record<string, string> = { pending: 'En attente', pending_cash: 'Especes', confirmed: 'Confirmee', active: 'Active', completed: 'Terminee', cancelled: 'Annulee' };
  return map[s] || s;
};

interface Reservation {
  id: string; user_name: string; user_email: string; vehicle_name: string;
  start_date: string; end_date: string; total_days: number; total_price: number;
  status: string; payment_status: string; payment_method?: string;
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

  return (
    <Modal visible={!!actionModal} transparent animationType="slide" onRequestClose={() => setActionModal(null)}>
      <View style={st.modalOverlay}>
        <View style={[st.modal, { backgroundColor: C.card }]}>
          <View style={st.modalHeader}>
            <Text style={{ color: C.text, fontSize: 18, fontWeight: '800' }}>Actions</Text>
            <TouchableOpacity onPress={() => setActionModal(null)}><Ionicons name="close" size={24} color={C.text} /></TouchableOpacity>
          </View>
          {actionModal && (
            <ScrollView>
              <Text style={{ color: C.textLight, fontSize: 14, marginBottom: 4 }}>{actionModal.user_name} - {actionModal.vehicle_name}</Text>
              <Text style={{ color: C.text, fontSize: 20, fontWeight: '800', marginBottom: 16 }}>CHF {actionModal.total_price?.toFixed(2)}</Text>

              <Text style={[st.modalSection, { color: C.textLight }]}>Contrat</Text>
              <TouchableOpacity style={[st.actionBtn, { borderColor: C.border }]}
                onPress={async () => {
                  setContractLoading(true);
                  try {
                    const resp = await api.get(`/api/contracts/by-reservation/${actionModal.id}`);
                    setActionModal(null); router.push(`/contract/${resp.data.id}` as any);
                  } catch (err: any) {
                    if (err.response?.status === 404) {
                      try {
                        const genResp = await api.post('/api/admin/contracts/generate', { reservation_id: actionModal.id, language: 'fr' });
                        Platform.OS === 'web' ? window.alert('Contrat genere !') : Alert.alert('Succes', 'Contrat genere !');
                        setActionModal(null); router.push(`/contract/${genResp.data.contract_id}` as any);
                      } catch (genErr: any) { Platform.OS === 'web' ? window.alert(genErr.response?.data?.detail || 'Erreur') : Alert.alert('Erreur'); }
                    } else { Platform.OS === 'web' ? window.alert('Erreur') : Alert.alert('Erreur'); }
                  } finally { setContractLoading(false); }
                }} data-testid="contract-view-btn">
                <Ionicons name="document-text" size={18} color={C.accent} />
                <Text style={{ color: C.text, fontSize: 14 }}>{contractLoading ? 'Chargement...' : 'Voir / Generer le contrat'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[st.actionBtn, { borderColor: C.border }]}
                onPress={async () => {
                  try {
                    const resp = await api.get(`/api/contracts/by-reservation/${actionModal.id}`);
                    await api.put(`/api/contracts/${resp.data.id}/send`);
                    Platform.OS === 'web' ? window.alert('Contrat envoye!') : Alert.alert('Succes', 'Contrat envoye!');
                  } catch (err: any) { Platform.OS === 'web' ? window.alert(err.response?.status === 404 ? 'Generez d\'abord le contrat' : 'Erreur') : Alert.alert('Erreur'); }
                }} data-testid="contract-send-btn">
                <Ionicons name="send" size={18} color={C.success} />
                <Text style={{ color: C.text, fontSize: 14 }}>Envoyer le contrat au client</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[st.actionBtn, { borderColor: C.border }]}
                onPress={async () => {
                  try {
                    const resp = await api.get(`/api/contracts/by-reservation/${actionModal.id}`);
                    const pdfResp = await api.get(`/api/contracts/${resp.data.id}/pdf`, { responseType: 'blob' });
                    if (Platform.OS === 'web') {
                      const blob = new Blob([pdfResp.data], { type: 'application/pdf' });
                      const url = URL.createObjectURL(blob); const a = document.createElement('a');
                      a.href = url; a.download = `contrat_${resp.data.id.slice(0, 8)}.pdf`; a.click(); URL.revokeObjectURL(url);
                    }
                  } catch (err: any) { Platform.OS === 'web' ? window.alert(err.response?.status === 404 ? 'Generez d\'abord le contrat' : 'Erreur') : Alert.alert('Erreur'); }
                }} data-testid="contract-pdf-btn">
                <Ionicons name="download" size={18} color={C.accent} />
                <Text style={{ color: C.text, fontSize: 14 }}>Telecharger le PDF</Text>
              </TouchableOpacity>

              <Text style={[st.modalSection, { color: C.textLight }]}>Statut</Text>
              {['confirmed', 'active', 'completed', 'cancelled'].map(s => (
                <TouchableOpacity key={s} style={[st.actionBtn, { borderColor: C.border }]} onPress={() => updateStatus(actionModal.id, s)}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: statusColor(s) }} />
                  <Text style={{ color: C.text, fontSize: 14 }}>{statusLabel(s)}</Text>
                </TouchableOpacity>
              ))}

              <Text style={[st.modalSection, { color: C.textLight }]}>Paiement</Text>
              <TouchableOpacity style={[st.actionBtn, { borderColor: C.border }]} onPress={() => updatePayment(actionModal.id, 'paid')}>
                <Ionicons name="checkmark-circle" size={18} color={C.success} />
                <Text style={{ color: C.text, fontSize: 14 }}>Marquer comme paye</Text>
              </TouchableOpacity>
              {actionModal.payment_status !== 'paid' && (
                <TouchableOpacity style={[st.actionBtn, { borderColor: C.border, borderBottomWidth: 0 }]} onPress={() => sendPaymentLink(actionModal.id)} disabled={sendingLink}>
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
});
