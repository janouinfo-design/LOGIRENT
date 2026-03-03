import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, Platform, Linking, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import QRCode from 'react-qr-code';
import api from '../../src/api/axios';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeStore } from '../../src/store/themeStore';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function AgencyProfile() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { colors: C, mode, toggleTheme } = useThemeStore();
  const [agency, setAgency] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState<'client' | 'admin' | 'super' | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (user?.agency_id) {
          const res = await api.get('/api/agencies');
          // API returns array, get the first (own agency for admin)
          if (res.data && res.data.length > 0) {
            setAgency(res.data[0]);
          }
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const clientLink = agency ? `${API_URL}/a/${agency.slug || agency.id}` : '';
  const adminLink = `${API_URL}/admin-login`;
  const superAdminLink = `${API_URL}/super-admin`;

  const copyToClipboard = (text: string) => {
    if (Platform.OS === 'web') {
      navigator.clipboard?.writeText(text);
      window.alert('Lien copié !');
    }
  };

  const shareLink = async (title: string, url: string) => {
    if (Platform.OS === 'web') {
      try { await navigator.share?.({ title, url }); } catch { copyToClipboard(url); }
    } else {
      Share.share({ message: url, title });
    }
  };

  if (loading) return <View style={[s.center, { backgroundColor: C.bg }]}><ActivityIndicator size="large" color={C.accent} /></View>;

  return (
    <ScrollView style={[s.container, { backgroundColor: C.bg }]} contentContainerStyle={s.content}>
      {/* Admin Info */}
      <View style={[s.profileCard, { backgroundColor: C.card, borderColor: C.border }]} testID="profile-card">
        <View style={[s.avatarCircle, { backgroundColor: C.primary + '20' }]}>
          <Ionicons name="person" size={32} color={C.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.adminName, { color: C.text }]}>{user?.name || 'Admin'}</Text>
          <Text style={[s.adminEmail, { color: C.textLight }]}>{user?.email}</Text>
          <View style={[s.roleBadge, { backgroundColor: C.accent + '15' }]}>
            <Ionicons name="shield-checkmark" size={12} color={C.accent} />
            <Text style={[s.roleText, { color: C.accent }]}>Admin Agence</Text>
          </View>
        </View>
      </View>

      {/* Agency Info */}
      {agency && (
        <View style={[s.section, { backgroundColor: C.card, borderColor: C.border }]} testID="agency-info-section">
          <View style={s.sectionHeader}>
            <Ionicons name="business" size={20} color={C.primary} />
            <Text style={[s.sectionTitle, { color: C.text }]}>Mon agence</Text>
          </View>
          <View style={[s.infoRow, { borderBottomColor: C.border }]}>
            <Text style={[s.infoLabel, { color: C.textLight }]}>Nom</Text>
            <Text style={[s.infoValue, { color: C.text }]}>{agency.name}</Text>
          </View>
          {agency.address && (
            <View style={[s.infoRow, { borderBottomColor: C.border }]}>
              <Text style={[s.infoLabel, { color: C.textLight }]}>Adresse</Text>
              <Text style={[s.infoValue, { color: C.text }]}>{agency.address}</Text>
            </View>
          )}
          {agency.phone && (
            <View style={[s.infoRow, { borderBottomColor: C.border }]}>
              <Text style={[s.infoLabel, { color: C.textLight }]}>Téléphone</Text>
              <Text style={[s.infoValue, { color: C.text }]}>{agency.phone}</Text>
            </View>
          )}
          {agency.email && (
            <View style={[s.infoRow, { borderBottomColor: C.border }]}>
              <Text style={[s.infoLabel, { color: C.textLight }]}>Email agence</Text>
              <Text style={[s.infoValue, { color: C.text }]}>{agency.email}</Text>
            </View>
          )}
        </View>
      )}

      {/* Links & QR Codes */}
      <View style={[s.section, { backgroundColor: C.card, borderColor: C.border }]} testID="agency-links-section">
        <View style={s.sectionHeader}>
          <Ionicons name="link" size={20} color={C.primary} />
          <Text style={[s.sectionTitle, { color: C.text }]}>Liens & QR Codes</Text>
        </View>

        {/* Client App Link */}
        <View style={[s.linkCard, { backgroundColor: C.bg, borderColor: C.border }]}>
          <View style={s.linkHeader}>
            <View style={[s.linkIcon, { backgroundColor: C.success + '15' }]}>
              <Ionicons name="globe-outline" size={18} color={C.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.linkTitle, { color: C.text }]}>App Client</Text>
              <Text style={[s.linkDesc, { color: C.textLight }]}>Les clients scannent pour réserver</Text>
            </View>
          </View>
          <Text style={[s.linkUrl, { color: C.accent }]} selectable numberOfLines={2}>{clientLink}</Text>
          <View style={s.linkActions}>
            <TouchableOpacity style={[s.linkBtn, { backgroundColor: C.success + '15' }]} onPress={() => copyToClipboard(clientLink)} testID="copy-client-link">
              <Ionicons name="copy-outline" size={16} color={C.success} />
              <Text style={[s.linkBtnText, { color: C.success }]}>Copier</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.linkBtn, { backgroundColor: C.primary + '15' }]} onPress={() => shareLink('App Client LogiRent', clientLink)} testID="share-client-link">
              <Ionicons name="share-outline" size={16} color={C.primary} />
              <Text style={[s.linkBtnText, { color: C.primary }]}>Partager</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.linkBtn, { backgroundColor: C.accent + '15' }]} onPress={() => setShowQR('client')} testID="qr-client-link">
              <Ionicons name="qr-code-outline" size={16} color={C.accent} />
              <Text style={[s.linkBtnText, { color: C.accent }]}>QR Code</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Admin App Link */}
        <View style={[s.linkCard, { backgroundColor: C.bg, borderColor: C.border }]}>
          <View style={s.linkHeader}>
            <View style={[s.linkIcon, { backgroundColor: C.warning + '15' }]}>
              <Ionicons name="shield-checkmark-outline" size={18} color={C.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.linkTitle, { color: C.text }]}>App Admin Agence</Text>
              <Text style={[s.linkDesc, { color: C.textLight }]}>Gestion de l'agence</Text>
            </View>
          </View>
          <Text style={[s.linkUrl, { color: C.accent }]} selectable numberOfLines={2}>{adminLink}</Text>
          <View style={s.linkActions}>
            <TouchableOpacity style={[s.linkBtn, { backgroundColor: C.warning + '15' }]} onPress={() => copyToClipboard(adminLink)} testID="copy-admin-link">
              <Ionicons name="copy-outline" size={16} color={C.warning} />
              <Text style={[s.linkBtnText, { color: C.warning }]}>Copier</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.linkBtn, { backgroundColor: C.primary + '15' }]} onPress={() => shareLink('Admin LogiRent', adminLink)} testID="share-admin-link">
              <Ionicons name="share-outline" size={16} color={C.primary} />
              <Text style={[s.linkBtnText, { color: C.primary }]}>Partager</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.linkBtn, { backgroundColor: C.accent + '15' }]} onPress={() => setShowQR('admin')} testID="qr-admin-link">
              <Ionicons name="qr-code-outline" size={16} color={C.accent} />
              <Text style={[s.linkBtnText, { color: C.accent }]}>QR Code</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Super Admin Link */}
        <View style={[s.linkCard, { backgroundColor: C.bg, borderColor: C.border }]}>
          <View style={s.linkHeader}>
            <View style={[s.linkIcon, { backgroundColor: C.error + '15' }]}>
              <Ionicons name="key-outline" size={18} color={C.error} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.linkTitle, { color: C.text }]}>Super Admin</Text>
              <Text style={[s.linkDesc, { color: C.textLight }]}>Gestion globale de toutes les agences</Text>
            </View>
          </View>
          <Text style={[s.linkUrl, { color: C.accent }]} selectable numberOfLines={2}>{superAdminLink}</Text>
          <View style={s.linkActions}>
            <TouchableOpacity style={[s.linkBtn, { backgroundColor: C.error + '15' }]} onPress={() => copyToClipboard(superAdminLink)} testID="copy-super-link">
              <Ionicons name="copy-outline" size={16} color={C.error} />
              <Text style={[s.linkBtnText, { color: C.error }]}>Copier</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.linkBtn, { backgroundColor: C.primary + '15' }]} onPress={() => shareLink('Super Admin LogiRent', superAdminLink)} testID="share-super-link">
              <Ionicons name="share-outline" size={16} color={C.primary} />
              <Text style={[s.linkBtnText, { color: C.primary }]}>Partager</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.linkBtn, { backgroundColor: C.accent + '15' }]} onPress={() => setShowQR('super')} testID="qr-super-link">
              <Ionicons name="qr-code-outline" size={16} color={C.accent} />
              <Text style={[s.linkBtnText, { color: C.accent }]}>QR Code</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Settings */}
      <View style={[s.section, { backgroundColor: C.card, borderColor: C.border }]} testID="settings-section">
        <View style={s.sectionHeader}>
          <Ionicons name="settings" size={20} color={C.primary} />
          <Text style={[s.sectionTitle, { color: C.text }]}>Paramètres</Text>
        </View>
        {/* Theme toggle removed - light mode only */}
        <TouchableOpacity style={[s.menuItem, { borderBottomColor: C.border }]} onPress={() => router.push('/agency-app/tracking')} testID="profile-gps-settings">
          <Ionicons name="navigate-outline" size={20} color={C.textLight} />
          <Text style={[s.menuText, { color: C.text }]}>Configuration GPS Navixy</Text>
          <Ionicons name="chevron-forward" size={18} color={C.textLight} />
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <TouchableOpacity style={[s.logoutBtn, { backgroundColor: C.error }]} onPress={() => { logout(); router.replace('/admin-login'); }} testID="profile-logout-btn">
        <Ionicons name="log-out-outline" size={20} color="#fff" />
        <Text style={s.logoutText}>Se déconnecter</Text>
      </TouchableOpacity>

      {/* QR Code Modal */}
      <Modal visible={showQR !== null} transparent animationType="slide" onRequestClose={() => setShowQR(null)}>
        <View style={s.modalOverlay}>
          <View style={[s.modal, { backgroundColor: C.card }]}>
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: C.text }]}>
                {showQR === 'client' ? 'QR Code - App Client' : showQR === 'admin' ? 'QR Code - App Admin' : 'QR Code - Super Admin'}
              </Text>
              <TouchableOpacity onPress={() => setShowQR(null)}>
                <Ionicons name="close-circle" size={28} color={C.error} />
              </TouchableOpacity>
            </View>
            <View style={s.qrCenter}>
              <View style={[s.qrIconBadge, { backgroundColor: showQR === 'client' ? C.success + '15' : showQR === 'admin' ? C.warning + '15' : C.error + '15' }]}>
                <Ionicons
                  name={showQR === 'client' ? 'globe-outline' : showQR === 'admin' ? 'shield-checkmark-outline' : 'key-outline'}
                  size={24}
                  color={showQR === 'client' ? C.success : showQR === 'admin' ? C.warning : C.error}
                />
              </View>
              <Text style={[s.qrLabel, { color: C.text }]}>
                {showQR === 'client' ? 'App Client' : showQR === 'admin' ? 'App Admin Agence' : 'Super Admin'}
              </Text>
              <Text style={[s.qrDesc, { color: C.textLight }]}>
                {showQR === 'client' ? 'Le client scanne ce code pour s\'inscrire et réserver' : showQR === 'admin' ? 'L\'admin scanne pour gérer l\'agence' : 'Accès à la gestion globale de toutes les agences'}
              </Text>
              <View style={s.qrBox}>
                <QRCode
                  value={showQR === 'client' ? clientLink : showQR === 'admin' ? adminLink : superAdminLink}
                  size={200}
                  level="H"
                  fgColor="#1A1A2E"
                  bgColor="#FFFFFF"
                />
              </View>
              <Text style={[s.qrUrl, { color: C.accent }]} selectable>
                {showQR === 'client' ? clientLink : showQR === 'admin' ? adminLink : superAdminLink}
              </Text>
              <View style={s.qrActions}>
                <TouchableOpacity
                  style={[s.qrActionBtn, { backgroundColor: C.primary }]}
                  onPress={() => copyToClipboard(showQR === 'client' ? clientLink : showQR === 'admin' ? adminLink : superAdminLink)}
                >
                  <Ionicons name="copy" size={16} color="#fff" />
                  <Text style={s.qrActionText}>Copier le lien</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.qrActionBtn, { backgroundColor: C.success }]}
                  onPress={() => shareLink(
                    showQR === 'client' ? 'App Client' : showQR === 'admin' ? 'App Admin' : 'Super Admin',
                    showQR === 'client' ? clientLink : showQR === 'admin' ? adminLink : superAdminLink
                  )}
                >
                  <Ionicons name="share" size={16} color="#fff" />
                  <Text style={s.qrActionText}>Partager</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 14, padding: 18, borderWidth: 1, marginBottom: 16 },
  avatarCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  adminName: { fontSize: 18, fontWeight: '800' },
  adminEmail: { fontSize: 13, marginTop: 2 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 6, alignSelf: 'flex-start' },
  roleText: { fontSize: 11, fontWeight: '700' },
  section: { borderRadius: 14, borderWidth: 1, marginBottom: 16, overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16, paddingBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  infoLabel: { fontSize: 13 },
  infoValue: { fontSize: 13, fontWeight: '600', flex: 1, textAlign: 'right' },
  linkCard: { margin: 12, marginTop: 0, borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 12 },
  linkHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  linkIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  linkTitle: { fontSize: 14, fontWeight: '700' },
  linkDesc: { fontSize: 11, marginTop: 1 },
  linkUrl: { fontSize: 12, marginBottom: 10, paddingHorizontal: 2 },
  linkActions: { flexDirection: 'row', gap: 8 },
  linkBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 8 },
  linkBtnText: { fontSize: 12, fontWeight: '600' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  menuText: { flex: 1, fontSize: 14, fontWeight: '500' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 16, marginTop: 4 },
  logoutText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  qrCenter: { alignItems: 'center', paddingBottom: 24 },
  qrIconBadge: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  qrLabel: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  qrDesc: { fontSize: 13, textAlign: 'center', marginBottom: 20, maxWidth: 280 },
  qrBox: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 12 },
  qrUrl: { fontSize: 12, textAlign: 'center', marginBottom: 16 },
  qrActions: { flexDirection: 'row', gap: 12 },
  qrActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  qrActionText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
