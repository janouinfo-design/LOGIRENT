import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-qr-code';
import axios from 'axios';
import { useAuthStore } from '../../src/store/authStore';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const COLORS = {
  primary: '#6C2BD9',
  background: '#0F0B1A',
  card: '#1A1425',
  text: '#FFFFFF',
  textLight: '#9CA3AF',
  border: '#2D2640',
  accent: '#A78BFA',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
};

interface Agency {
  id: string;
  name: string;
  slug?: string;
  address?: string;
  phone?: string;
  email?: string;
  navixy_api_url?: string;
  navixy_hash?: string;
  vehicle_count: number;
  reservation_count: number;
  admin_count: number;
}

export default function AgenciesPage() {
  const { user } = useAuthStore();
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editAgency, setEditAgency] = useState<Agency | null>(null);
  const [form, setForm] = useState({ name: '', address: '', phone: '', email: '', admin_name: '', admin_email: '', admin_password: '', navixy_api_url: '', navixy_hash: '' });
  const [error, setError] = useState('');
  const [successInfo, setSuccessInfo] = useState<{name: string, email: string, password: string} | null>(null);
  const [qrAgency, setQrAgency] = useState<Agency | null>(null);
  const [qrType, setQrType] = useState<'both' | 'client' | 'admin'>('both');

  const isSuperAdmin = user?.role === 'super_admin';

  const fetchAgencies = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/agencies`);
      setAgencies(res.data);
    } catch (err) {
      console.error('Failed to fetch agencies', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAgencies(); }, []);

  const handleSave = async () => {
    setError('');
    if (!form.name.trim()) { setError('Le nom est requis'); return; }
    try {
      if (editAgency) {
        await axios.put(`${API_URL}/api/agencies/${editAgency.id}`, { name: form.name, address: form.address, phone: form.phone, email: form.email });
        setShowModal(false);
        setEditAgency(null);
        setForm({ name: '', address: '', phone: '', email: '', admin_name: '', admin_email: '', admin_password: '', navixy_api_url: '', navixy_hash: '' });
        fetchAgencies();
      } else {
        if (!form.admin_name || !form.admin_email || !form.admin_password) {
          setError('Les informations admin sont requises'); return;
        }
        const res = await axios.post(`${API_URL}/api/agencies`, form);
        setShowModal(false);
        setSuccessInfo({ name: res.data.admin_name, email: res.data.admin_email, password: form.admin_password });
        setForm({ name: '', address: '', phone: '', email: '', admin_name: '', admin_email: '', admin_password: '', navixy_api_url: '', navixy_hash: '' });
        fetchAgencies();
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Supprimer cette agence ?')) {
      try {
        await axios.delete(`${API_URL}/api/agencies/${id}`);
        fetchAgencies();
      } catch (err: any) {
        alert(err.response?.data?.detail || 'Erreur');
      }
    }
  };

  const openEdit = (agency: Agency) => {
    setEditAgency(agency);
    setForm({ name: agency.name, address: agency.address || '', phone: agency.phone || '', email: agency.email || '', admin_name: '', admin_email: '', admin_password: '', navixy_api_url: agency.navixy_api_url || '', navixy_hash: agency.navixy_hash || '' });
    setShowModal(true);
  };

  if (!isSuperAdmin) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="lock-closed" size={48} color={COLORS.textLight} />
          <Text style={styles.emptyText}>Accès réservé au super administrateur</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.pageTitle}>Gestion des Agences</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => { setEditAgency(null); setForm({ name: '', address: '', phone: '', email: '', admin_name: '', admin_email: '', admin_password: '' }); setError(''); setShowModal(true); }}
            data-testid="add-agency-btn"
          >
            <Ionicons name="add" size={20} color="#FFF" />
            <Text style={styles.addBtnText}>Nouvelle agence</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <Text style={styles.loadingText}>Chargement...</Text>
        ) : agencies.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="business-outline" size={48} color={COLORS.textLight} />
            <Text style={styles.emptyText}>Aucune agence</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {agencies.map((agency) => (
              <View key={agency.id} style={styles.agencyCard} data-testid={`agency-card-${agency.id}`}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardIcon}>
                    <Ionicons name="business" size={24} color={COLORS.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.agencyName}>{agency.name}</Text>
                    {agency.email && <Text style={styles.agencyEmail}>{agency.email}</Text>}
                  </View>
                  <View style={styles.cardActions}>
                    <TouchableOpacity onPress={() => openEdit(agency)} data-testid={`edit-agency-${agency.id}`}>
                      <Ionicons name="pencil" size={18} color={COLORS.accent} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(agency.id)} data-testid={`delete-agency-${agency.id}`}>
                      <Ionicons name="trash" size={18} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                </View>
                {agency.address && (
                  <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={14} color={COLORS.textLight} />
                    <Text style={styles.infoText}>{agency.address}</Text>
                  </View>
                )}
                {agency.phone && (
                  <View style={styles.infoRow}>
                    <Ionicons name="call-outline" size={14} color={COLORS.textLight} />
                    <Text style={styles.infoText}>{agency.phone}</Text>
                  </View>
                )}
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{agency.vehicle_count}</Text>
                    <Text style={styles.statLabel}>Véhicules</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{agency.reservation_count}</Text>
                    <Text style={styles.statLabel}>Réservations</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{agency.admin_count}</Text>
                    <Text style={styles.statLabel}>Admins</Text>
                  </View>
                </View>
                <View style={styles.linksSection}>
                  <Text style={styles.linksSectionTitle}>Liens d'acces</Text>
                  <View style={styles.linkItem}>
                    <Ionicons name="shield-checkmark" size={16} color={COLORS.warning} />
                    <Text style={styles.linkLabel}>Admin : </Text>
                    <Text style={styles.linkUrl} selectable>{API_URL}/admin-login</Text>
                  </View>
                  <View style={styles.linkItem}>
                    <Ionicons name="globe-outline" size={16} color={COLORS.success} />
                    <Text style={styles.linkLabel}>Client : </Text>
                    <Text style={styles.linkUrl} selectable>{API_URL}/a/{agency.slug || agency.id}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.qrBtn}
                    onPress={() => { setQrAgency(agency); setQrType('both'); }}
                    data-testid={`qr-agency-${agency.id}`}
                  >
                    <Ionicons name="qr-code-outline" size={16} color="#FFF" />
                    <Text style={styles.qrBtnText}>QR Codes</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Create/Edit Modal */}
      <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <ScrollView 
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={true}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editAgency ? 'Modifier l\'agence' : 'Nouvelle agence'}</Text>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <Ionicons name="close" size={24} color={COLORS.textLight} />
                </TouchableOpacity>
              </View>
              {error ? <Text style={styles.modalError}>{error}</Text> : null}
              <View style={styles.modalForm}>
                <Text style={styles.sectionLabel}>Informations agence</Text>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Nom de l'agence *</Text>
                  <TextInput style={styles.fieldInput} value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} placeholder="Nom de l'agence" placeholderTextColor={COLORS.textLight} data-testid="agency-form-name" />
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Adresse</Text>
                  <TextInput style={styles.fieldInput} value={form.address} onChangeText={(t) => setForm({ ...form, address: t })} placeholder="Adresse" placeholderTextColor={COLORS.textLight} data-testid="agency-form-address" />
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Telephone</Text>
                  <TextInput style={styles.fieldInput} value={form.phone} onChangeText={(t) => setForm({ ...form, phone: t })} placeholder="+41 22 000 0000" placeholderTextColor={COLORS.textLight} data-testid="agency-form-phone" />
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Email agence</Text>
                  <TextInput style={styles.fieldInput} value={form.email} onChangeText={(t) => setForm({ ...form, email: t })} placeholder="contact@agence.ch" placeholderTextColor={COLORS.textLight} data-testid="agency-form-email" />
                </View>

                {editAgency === null && (
                  <View style={styles.adminSection}>
                    <View style={styles.sectionDivider} />
                    <Text style={styles.sectionLabel}>Compte administrateur</Text>
                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Nom de l'admin *</Text>
                      <TextInput style={styles.fieldInput} value={form.admin_name} onChangeText={(t) => setForm({ ...form, admin_name: t })} placeholder="Jean Dupont" placeholderTextColor={COLORS.textLight} data-testid="agency-form-admin-name" />
                    </View>
                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Email admin *</Text>
                      <TextInput style={styles.fieldInput} value={form.admin_email} onChangeText={(t) => setForm({ ...form, admin_email: t })} placeholder="jean@agence.ch" placeholderTextColor={COLORS.textLight} autoCapitalize="none" keyboardType="email-address" data-testid="agency-form-admin-email" />
                    </View>
                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Mot de passe admin *</Text>
                      <TextInput style={styles.fieldInput} value={form.admin_password} onChangeText={(t) => setForm({ ...form, admin_password: t })} placeholder="Mot de passe" placeholderTextColor={COLORS.textLight} secureTextEntry data-testid="agency-form-admin-password" />
                    </View>
                  </View>
                )}

                {/* Navixy GPS Configuration */}
                <View style={styles.sectionHeader}>
                  <Ionicons name="locate" size={18} color="#06b6d4" />
                  <Text style={styles.sectionTitle}>Configuration Navixy GPS</Text>
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>URL API Navixy</Text>
                  <TextInput style={styles.fieldInput} value={form.navixy_api_url} onChangeText={(t) => setForm({ ...form, navixy_api_url: t })} placeholder="https://login.logitrak.fr/api-v2" placeholderTextColor={COLORS.textLight} data-testid="agency-form-navixy-url" />
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Clé API (Hash) Navixy</Text>
                  <TextInput style={styles.fieldInput} value={form.navixy_hash} onChangeText={(t) => setForm({ ...form, navixy_hash: t })} placeholder="a6a4d4c91182..." placeholderTextColor={COLORS.textLight} data-testid="agency-form-navixy-hash" />
                </View>

                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} data-testid="agency-form-save">
                  <Text style={styles.saveBtnText}>{editAgency !== null ? 'Mettre a jour' : 'Creer l\'agence + admin'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Success Confirmation Modal */}
      <Modal visible={!!successInfo} transparent animationType="fade" onRequestClose={() => setSuccessInfo(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successHeader}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark-circle" size={48} color={COLORS.success} />
              </View>
              <Text style={styles.modalTitle}>Agence creee avec succes !</Text>
            </View>
            <View style={styles.credentialsBox}>
              <Text style={styles.credentialsTitle}>Identifiants de connexion admin :</Text>
              <View style={styles.credentialRow}>
                <Ionicons name="person" size={16} color={COLORS.accent} />
                <Text style={styles.credentialLabel}>Nom :</Text>
                <Text style={styles.credentialValue}>{successInfo?.name}</Text>
              </View>
              <View style={styles.credentialRow}>
                <Ionicons name="mail" size={16} color={COLORS.accent} />
                <Text style={styles.credentialLabel}>Email :</Text>
                <Text style={styles.credentialValue}>{successInfo?.email}</Text>
              </View>
              <View style={styles.credentialRow}>
                <Ionicons name="lock-closed" size={16} color={COLORS.accent} />
                <Text style={styles.credentialLabel}>Mot de passe :</Text>
                <Text style={styles.credentialValue}>{successInfo?.password}</Text>
              </View>
            </View>
            <View style={styles.linksBox}>
              <Text style={styles.credentialsTitle}>Liens a communiquer :</Text>
              <View style={styles.credentialRow}>
                <Ionicons name="shield-checkmark" size={16} color={COLORS.warning} />
                <Text style={styles.credentialLabel}>Panel Admin :</Text>
                <Text style={styles.linkValue} selectable>{API_URL}/admin-login</Text>
              </View>
              <View style={styles.credentialRow}>
                <Ionicons name="globe-outline" size={16} color={COLORS.success} />
                <Text style={styles.credentialLabel}>App Client :</Text>
                <Text style={styles.linkValue} selectable>{API_URL}</Text>
              </View>
            </View>
            <Text style={styles.credentialsNote}>Communiquez ces identifiants et liens a l'administrateur de l'agence.</Text>
            <TouchableOpacity style={styles.saveBtn} onPress={() => setSuccessInfo(null)} data-testid="agency-success-close">
              <Text style={styles.saveBtnText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* QR Code Modal */}
      <Modal visible={!!qrAgency} transparent animationType="fade" onRequestClose={() => setQrAgency(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { alignItems: 'center' }]}>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setQrAgency(null)}>
              <Ionicons name="close" size={22} color={COLORS.text} />
            </TouchableOpacity>
            <Ionicons name="qr-code" size={32} color={COLORS.primary} />
            <Text style={[styles.modalTitle, { marginTop: 8 }]}>QR Code - {qrAgency?.name}</Text>
            <Text style={{ color: COLORS.textLight, fontSize: 12, marginBottom: 16, textAlign: 'center' }}>
              Imprimez ce QR code et affichez-le dans votre agence. Les clients le scannent pour s'inscrire.
            </Text>
            <View style={styles.qrContainer} data-testid="qr-code-display">
              <QRCode
                value={`${API_URL}/a/${qrAgency?.slug || qrAgency?.id}`}
                size={200}
                level="H"
                fgColor="#1A1A2E"
                bgColor="#FFFFFF"
              />
            </View>
            <Text style={styles.qrUrl} selectable>{API_URL}/a/{qrAgency?.slug || qrAgency?.id}</Text>
            <TouchableOpacity style={styles.saveBtn} onPress={() => setQrAgency(null)} data-testid="qr-modal-close">
              <Text style={styles.saveBtnText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  addBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  loadingText: { color: COLORS.textLight, fontSize: 14, textAlign: 'center', marginTop: 40 },
  emptyState: { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyText: { color: COLORS.textLight, fontSize: 16 },
  grid: { gap: 16 },
  agencyCard: { backgroundColor: COLORS.card, borderRadius: 14, padding: 18, borderWidth: 1, borderColor: COLORS.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  cardIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(108,43,217,0.15)', alignItems: 'center', justifyContent: 'center' },
  agencyName: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  agencyEmail: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  infoText: { color: COLORS.textLight, fontSize: 13 },
  statsRow: { flexDirection: 'row', marginTop: 12, gap: 16, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: COLORS.accent },
  statLabel: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  linksSection: { marginTop: 14, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 },
  linksSectionTitle: { fontSize: 12, fontWeight: '700', color: COLORS.accent, marginBottom: 8 },
  linkItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  linkLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textLight },
  linkUrl: { fontSize: 13, fontWeight: '600', color: COLORS.accent, textDecorationLine: 'underline' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalScroll: { flex: 1, width: '100%', maxHeight: '90%' },
  modalScrollContent: { flexGrow: 1, justifyContent: 'flex-start', alignItems: 'center', paddingVertical: 20, paddingHorizontal: 10 },
  adminSection: { width: '100%', gap: 14 },
  modalContent: { backgroundColor: COLORS.card, borderRadius: 16, padding: 24, width: '100%', maxWidth: 480, borderWidth: 1, borderColor: COLORS.border },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  modalError: { color: COLORS.error, fontSize: 13, marginBottom: 10 },
  modalForm: { gap: 14 },
  fieldGroup: { gap: 4 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textLight },
  fieldInput: { backgroundColor: COLORS.background, borderRadius: 10, paddingHorizontal: 14, height: 44, color: COLORS.text, fontSize: 14, borderWidth: 1, borderColor: COLORS.border },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 10, height: 46, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  saveBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: COLORS.accent, marginBottom: 4 },
  sectionDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },
  successHeader: { alignItems: 'center', marginBottom: 16, gap: 8 },
  successIcon: { marginBottom: 4 },
  credentialsBox: { backgroundColor: COLORS.background, borderRadius: 12, padding: 16, gap: 10, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  linksBox: { backgroundColor: COLORS.background, borderRadius: 12, padding: 16, gap: 10, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  credentialsTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  credentialRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  credentialLabel: { fontSize: 13, color: COLORS.textLight, width: 100 },
  credentialValue: { fontSize: 14, fontWeight: '700', color: COLORS.text, flex: 1 },
  linkValue: { fontSize: 13, fontWeight: '600', color: COLORS.accent, flex: 1 },
  credentialsNote: { fontSize: 12, color: COLORS.textLight, textAlign: 'center', marginBottom: 12, fontStyle: 'italic' },
  qrBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: COLORS.primary, paddingVertical: 10, borderRadius: 10, marginTop: 10 },
  qrBtnText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  qrContainer: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, marginBottom: 12 },
  qrUrl: { fontSize: 12, color: COLORS.textLight, textAlign: 'center', marginBottom: 16 },
  closeBtn: { position: 'absolute', top: 12, right: 12, zIndex: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, marginBottom: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#06b6d4' },
});
