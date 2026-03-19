import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-qr-code';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeStore } from '../../src/store/themeStore';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const SCREEN_W = Dimensions.get('window').width;
const COLORS = {
  primary: '#6C2BD9',
  background: '#FAFAFA',
  card: '#FFFFFF',
  text: '#1A1A2E',
  textLight: '#6B7280',
  border: '#E5E7EB',
  accent: '#7C3AED',
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
  admin_id?: string;
  admin_email?: string;
  admin_name?: string;
  admin_password_display?: string;
  is_active?: boolean;
}

export default function AgenciesPage() {
  const { colors: _c } = useThemeStore();
  const COLORS = { primary: _c.accent, primaryDark: _c.primary, background: _c.bg, card: _c.card, text: _c.text, textLight: _c.textLight, border: _c.border, accent: _c.accent, success: _c.success, warning: _c.warning, error: _c.error };
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
  const [impersonating, setImpersonating] = useState<string | null>(null);

  const isSuperAdmin = user?.role === 'super_admin';

  const handleImpersonate = async (agency: Agency) => {
    if (!agency.admin_id) { alert('Aucun admin pour cette agence'); return; }
    setImpersonating(agency.id);
    const newWindow = typeof window !== 'undefined' ? window.open('', '_blank') : null;
    try {
      const storeToken = useAuthStore.getState().token;
      const res = await axios.post(`${API_URL}/api/admin/impersonate/${agency.admin_id}`, {}, {
        headers: { Authorization: `Bearer ${storeToken}` }
      });
      const { access_token } = res.data;
      if (newWindow) {
        newWindow.location.href = `${API_URL}/agency-app?imp_token=${access_token}`;
      }
    } catch (e: any) {
      if (newWindow) newWindow.close();
      alert(e.response?.data?.detail || 'Erreur d\'impersonation');
    } finally { setImpersonating(null); }
  };

  // Backup super admin token on mount
  useEffect(() => {
    // No longer needed since we don't swap tokens
  }, [isSuperAdmin]);

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

  const handleToggleActive = async (agency: Agency) => {
    const action = agency.is_active !== false ? 'désactiver' : 'activer';
    if (!confirm(`Voulez-vous ${action} l'agence ${agency.name} ?`)) return;
    try {
      const storeToken = useAuthStore.getState().token;
      await axios.put(`${API_URL}/api/admin/agencies/${agency.id}/toggle-active`, {}, {
        headers: { Authorization: `Bearer ${storeToken}` }
      });
      fetchAgencies();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erreur');
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
            {agencies.map((agency) => {
              const cardW = (SCREEN_W - 40 - 30) / 4;
              return (
                <View key={agency.id} style={[styles.agencyCard, { width: cardW, opacity: agency.is_active === false ? 0.6 : 1 }]} data-testid={`agency-card-${agency.id}`}>
                  {/* Status badge */}
                  {agency.is_active === false && (
                    <View style={{ backgroundColor: '#EF4444', paddingVertical: 4, alignItems: 'center' }}>
                      <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '800' }}>COMPTE DESACTIVE</Text>
                    </View>
                  )}
                  {/* Icon + Actions */}
                  <View style={{ alignItems: 'center', paddingTop: 14, paddingBottom: 8, position: 'relative' }}>
                    <View style={styles.cardIcon}>
                      <Ionicons name="business" size={22} color={COLORS.accent} />
                    </View>
                    <View style={{ position: 'absolute', top: 8, right: 8, flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity onPress={() => openEdit(agency)} data-testid={`edit-agency-${agency.id}`}>
                        <Ionicons name="pencil" size={15} color={COLORS.accent} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(agency.id)} data-testid={`delete-agency-${agency.id}`}>
                        <Ionicons name="trash" size={15} color={COLORS.error} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Name */}
                  <View style={{ paddingHorizontal: 10, paddingBottom: 8 }}>
                    <Text style={[styles.agencyName, { fontSize: 15 }]} numberOfLines={1}>{agency.name}</Text>
                    {agency.email && <Text style={[styles.agencyEmail, { fontSize: 12 }]} numberOfLines={1}>{agency.email}</Text>}
                    {agency.address && (
                      <View style={[styles.infoRow, { marginTop: 3, marginBottom: 0 }]}>
                        <Ionicons name="location-outline" size={12} color={COLORS.textLight} />
                        <Text style={[styles.infoText, { fontSize: 12 }]} numberOfLines={1}>{agency.address}</Text>
                      </View>
                    )}
                  </View>

                  {/* Stats */}
                  <View style={[styles.statsRow, { paddingHorizontal: 8, paddingTop: 6, paddingBottom: 8, gap: 4 }]}>
                    <View style={[styles.statItem]}>
                      <Text style={[styles.statValue, { fontSize: 17 }]}>{agency.vehicle_count}</Text>
                      <Text style={[styles.statLabel, { fontSize: 11 }]}>Veh.</Text>
                    </View>
                    <View style={[styles.statItem]}>
                      <Text style={[styles.statValue, { fontSize: 17 }]}>{agency.reservation_count}</Text>
                      <Text style={[styles.statLabel, { fontSize: 11 }]}>Res.</Text>
                    </View>
                    <View style={[styles.statItem]}>
                      <Text style={[styles.statValue, { fontSize: 17 }]}>{agency.admin_count}</Text>
                      <Text style={[styles.statLabel, { fontSize: 11 }]}>Adm.</Text>
                    </View>
                  </View>

                  {/* Impersonate + QR */}
                  <View style={{ paddingHorizontal: 8, paddingBottom: 10, gap: 4 }}>
                    {agency.admin_id && (
                      <TouchableOpacity
                        style={[styles.impersonateBtn, { paddingVertical: 7, borderRadius: 6 }]}
                        onPress={() => handleImpersonate(agency)}
                        disabled={impersonating === agency.id}
                        data-testid={`login-as-${agency.id}`}
                      >
                        {impersonating === agency.id ? (
                          <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                          <Ionicons name="log-in" size={14} color="#FFF" />
                        )}
                        <Text style={[styles.impersonateBtnText, { fontSize: 12 }]} numberOfLines={1}>
                          {impersonating === agency.id ? '...' : 'Connexion Admin'}
                        </Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.qrBtn, { paddingVertical: 7, borderRadius: 6, marginTop: 0 }]}
                      onPress={() => { setQrAgency(agency); setQrType('both'); }}
                      data-testid={`qr-agency-${agency.id}`}
                    >
                      <Ionicons name="qr-code-outline" size={13} color="#FFF" />
                      <Text style={[styles.qrBtnText, { fontSize: 12 }]}>QR Codes</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                        backgroundColor: agency.is_active !== false ? '#EF444420' : '#10B98120',
                        paddingVertical: 7, borderRadius: 6, borderWidth: 1,
                        borderColor: agency.is_active !== false ? '#EF4444' : '#10B981',
                      }}
                      onPress={() => handleToggleActive(agency)}
                      data-testid={`toggle-active-${agency.id}`}
                    >
                      <Ionicons name={agency.is_active !== false ? 'close-circle' : 'checkmark-circle'} size={14} color={agency.is_active !== false ? '#EF4444' : '#10B981'} />
                      <Text style={{ color: agency.is_active !== false ? '#EF4444' : '#10B981', fontSize: 12, fontWeight: '700' }}>
                        {agency.is_active !== false ? 'Désactiver' : 'Activer'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
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
                  <TextInput style={styles.fieldInput} value={form.navixy_api_url} onChangeText={(t) => setForm({ ...form, navixy_api_url: t })} placeholder="https://api.navixy.com/v2" placeholderTextColor={COLORS.textLight} data-testid="agency-form-navixy-url" />
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

      {/* Success Confirmation Modal with QR Codes */}
      <Modal visible={!!successInfo} transparent animationType="fade" onRequestClose={() => setSuccessInfo(null)}>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
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

              {/* QR Codes in success modal */}
              <View style={styles.credentialsBox}>
                <Text style={styles.credentialsTitle}>QR Codes de l'agence :</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-around', gap: 16, flexWrap: 'wrap', marginTop: 8 }}>
                  <View style={{ alignItems: 'center' }}>
                    <View style={styles.qrSectionHeader}>
                      <Ionicons name="phone-portrait-outline" size={14} color={COLORS.success} />
                      <Text style={{ color: COLORS.success, fontSize: 12, fontWeight: '700' }}>App Client</Text>
                    </View>
                    <View style={[styles.qrContainer, { padding: 12 }]}>
                      <QRCode value={`${API_URL}`} size={120} level="H" fgColor="#1A1A2E" bgColor="#FFFFFF" />
                    </View>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <View style={styles.qrSectionHeader}>
                      <Ionicons name="shield-checkmark-outline" size={14} color={COLORS.warning} />
                      <Text style={{ color: COLORS.warning, fontSize: 12, fontWeight: '700' }}>App Admin</Text>
                    </View>
                    <View style={[styles.qrContainer, { padding: 12 }]}>
                      <QRCode value={`${API_URL}/admin-login`} size={120} level="H" fgColor="#1A1A2E" bgColor="#FFFFFF" />
                    </View>
                  </View>
                </View>
              </View>

              <Text style={styles.credentialsNote}>Communiquez ces identifiants et QR codes a l'administrateur de l'agence.</Text>
              <TouchableOpacity style={styles.saveBtn} onPress={() => setSuccessInfo(null)} data-testid="agency-success-close">
                <Text style={styles.saveBtnText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* QR Code Modal - Both Client & Admin */}
      <Modal visible={!!qrAgency} transparent animationType="fade" onRequestClose={() => setQrAgency(null)}>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
            <View style={[styles.modalContent, { alignItems: 'center' }]}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setQrAgency(null)}>
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
              <Ionicons name="qr-code" size={32} color={COLORS.primary} />
              <Text style={[styles.modalTitle, { marginTop: 8 }]}>QR Codes - {qrAgency?.name}</Text>
              <Text style={{ color: COLORS.textLight, fontSize: 12, marginBottom: 20, textAlign: 'center' }}>
                Imprimez ces QR codes et affichez-les dans votre agence.
              </Text>

              {/* Client QR Code */}
              <View style={styles.qrSection} data-testid="qr-client-section">
                <View style={styles.qrSectionHeader}>
                  <Ionicons name="phone-portrait-outline" size={18} color={COLORS.success} />
                  <Text style={[styles.qrSectionTitle, { color: COLORS.success }]}>App Client</Text>
                </View>
                <Text style={styles.qrDescription}>Le client scanne ce code pour s'inscrire et acceder au catalogue de l'agence.</Text>
                <View style={styles.qrContainer} data-testid="qr-code-client">
                  <QRCode
                    value={`${API_URL}/a/${qrAgency?.slug || qrAgency?.id}`}
                    size={180}
                    level="H"
                    fgColor="#1A1A2E"
                    bgColor="#FFFFFF"
                  />
                </View>
                <Text style={styles.qrUrl} selectable>{API_URL}/a/{qrAgency?.slug || qrAgency?.id}</Text>
              </View>

              <View style={styles.qrDivider} />

              {/* Admin QR Code */}
              <View style={styles.qrSection} data-testid="qr-admin-section">
                <View style={styles.qrSectionHeader}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.warning} />
                  <Text style={[styles.qrSectionTitle, { color: COLORS.warning }]}>App Admin Agence</Text>
                </View>
                <Text style={styles.qrDescription}>L'admin scanne ce code pour acceder a l'application mobile de gestion de l'agence.</Text>
                <View style={styles.qrContainer} data-testid="qr-code-admin">
                  <QRCode
                    value={`${API_URL}/admin-login`}
                    size={180}
                    level="H"
                    fgColor="#1A1A2E"
                    bgColor="#FFFFFF"
                  />
                </View>
                <Text style={styles.qrUrl} selectable>{API_URL}/admin-login</Text>
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={() => setQrAgency(null)} data-testid="qr-modal-close">
                <Text style={styles.saveBtnText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  agencyCard: { backgroundColor: COLORS.card, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
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
  impersonateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#10B981', paddingVertical: 12, borderRadius: 10 },
  impersonateBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  qrContainer: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, marginBottom: 12 },
  qrUrl: { fontSize: 12, color: COLORS.textLight, textAlign: 'center', marginBottom: 16 },
  closeBtn: { position: 'absolute', top: 12, right: 12, zIndex: 1 },
  qrSection: { width: '100%', alignItems: 'center', marginBottom: 8 },
  qrSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  qrSectionTitle: { fontSize: 15, fontWeight: '700' },
  qrDescription: { color: COLORS.textLight, fontSize: 11, textAlign: 'center', marginBottom: 12 },
  qrDivider: { width: '80%', height: 1, backgroundColor: COLORS.border, marginVertical: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, marginBottom: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#06b6d4' },
});
