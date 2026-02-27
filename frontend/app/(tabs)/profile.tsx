import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../src/store/authStore';
import Input from '../../src/components/Input';
import Button from '../../src/components/Button';
import { useThemeStore } from '../../src/store/themeStore';

const _C = {
  purple: '#7C3AED',
  purpleDark: '#5B21B6',
  purpleLight: '#EDE9FE',
  dark: '#1A1A2E',
  gray: '#6B7280',
  grayLight: '#F3F4F6',
  border: '#E5E7EB',
  card: '#FFFFFF',
  bg: '#FAFAFA',
  success: '#10B981',
  error: '#EF4444',
};

export default function ProfileScreen() {
  const { colors: C } = useThemeStore();
  const router = useRouter();
  const { user, logout, updateProfile, uploadLicense, uploadIdCard, isAuthenticated, isLoading } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingLicense, setUploadingLicense] = useState(false);
  const [uploadingId, setUploadingId] = useState(false);
  const idInputRef = useRef<HTMLInputElement | null>(null);
  const licenseInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isAuthenticated && !isLoading) router.replace('/(auth)/login');
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    if (user) { setName(user.name || ''); setPhone(user.phone || ''); setAddress(user.address || ''); }
  }, [user]);

  if (isLoading || !user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={C.purple} />
        <Text style={styles.loadingText}>Chargement du profil...</Text>
      </View>
    );
  }

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateProfile({ name, phone, address });
      setEditing(false);
      Alert.alert('Succès', 'Profil mis à jour');
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    } finally { setLoading(false); }
  };

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
        await logout();
      }
    } else {
      Alert.alert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter ?', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Déconnexion', style: 'destructive', onPress: async () => { await logout(); } },
      ]);
    }
  };

  const handleWebFileChange = async (e: any, type: 'id' | 'license') => {
    const file = e.target?.files?.[0];
    if (!file) return;
    const setter = type === 'id' ? setUploadingId : setUploadingLicense;
    const uploader = type === 'id' ? uploadIdCard : uploadLicense;
    setter(true);
    try {
      const verification = await uploader(file);
      const v = verification || {};
      const validIcon = v.is_valid ? 'Document valide' : 'Document rejeté';
      const msg = v.reason ? `${validIcon}\nConfiance: ${v.confidence}%\n${v.reason}` : 'Document téléchargé';
      window.alert(msg);
    } catch (err: any) {
      window.alert(err.message || 'Erreur lors du téléchargement');
    } finally {
      setter(false);
      e.target.value = '';
    }
  };

  const uploadFromUri = async (dataUri: string, type: 'id' | 'license') => {
    const setter = type === 'id' ? setUploadingId : setUploadingLicense;
    const uploader = type === 'id' ? uploadIdCard : uploadLicense;
    setter(true);
    try {
      const verification = await uploader(dataUri);
      const v = verification || {};
      const validIcon = v.is_valid ? 'Document valide' : 'Document rejeté';
      const msg = v.reason ? `${validIcon}\nConfiance: ${v.confidence}%\n${v.reason}` : 'Document téléchargé';
      Alert.alert('Vérification IA', msg);
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    } finally {
      setter(false);
    }
  };

  const takePhoto = async (type: 'id' | 'license') => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission requise', 'Veuillez autoriser l\'accès à la caméra.'); return; }
    try {
      const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.5, base64: true });
      if (result.canceled) return;
      const asset = result.assets[0];
      const dataUri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
      await uploadFromUri(dataUri, type);
    } catch (err: any) {
      Alert.alert('Erreur', 'Impossible d\'ouvrir la caméra.');
    }
  };

  const pickFromGallery = async (type: 'id' | 'license') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission requise', 'Veuillez autoriser l\'accès à la galerie.'); return; }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.5, base64: true });
      if (result.canceled) return;
      const asset = result.assets[0];
      const dataUri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
      await uploadFromUri(dataUri, type);
    } catch (err: any) {
      Alert.alert('Erreur', 'Impossible d\'ouvrir la galerie.');
    }
  };

  const pickAndUpload = async (type: 'id' | 'license') => {
    if (Platform.OS === 'web') {
      const ref = type === 'id' ? idInputRef : licenseInputRef;
      ref.current?.click();
      return;
    }
    // Native: show choice between camera and gallery
    const title = type === 'id' ? 'Pièce d\'identité' : 'Permis de conduire';
    Alert.alert(title, 'Comment souhaitez-vous ajouter votre document ?', [
      { text: 'Prendre une photo', onPress: () => takePhoto(type) },
      { text: 'Choisir depuis la galerie', onPress: () => pickFromGallery(type) },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  const menuItems = [
    { icon: 'card', label: 'Moyens de paiement' },
    { icon: 'notifications', label: 'Notifications' },
    { icon: 'shield-checkmark', label: 'Confidentialité' },
    { icon: 'help-circle', label: 'Aide & Support' },
    { icon: 'document-text', label: 'Conditions d\'utilisation' },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user.name?.charAt(0).toUpperCase() || 'U'}</Text>
          </View>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          {!editing && (
            <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)} data-testid="edit-profile-btn">
              <Ionicons name="pencil" size={14} color={C.purple} />
              <Text style={styles.editBtnText}>Modifier le profil</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Edit Form */}
        {editing && (
          <View style={styles.section}>
            <Input label="Nom complet" value={name} onChangeText={setName} icon="person" />
            <Input label="Téléphone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" icon="call" />
            <Input label="Adresse" value={address} onChangeText={setAddress} icon="location" />
            <View style={styles.btnRow}>
              <Button title="Annuler" onPress={() => setEditing(false)} variant="outline" style={{ flex: 1 }} />
              <Button title="Enregistrer" onPress={handleSave} loading={loading} style={{ flex: 1 }} />
            </View>
          </View>
        )}

        {/* Documents */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Documents Obligatoires</Text>
          {/* Hidden file inputs for web */}
          {Platform.OS === 'web' && (
            <>
              <input
                ref={(el: any) => { idInputRef.current = el; }}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e: any) => handleWebFileChange(e, 'id')}
              />
              <input
                ref={(el: any) => { licenseInputRef.current = el; }}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e: any) => handleWebFileChange(e, 'license')}
              />
            </>
          )}
          {(!user.id_photo || !user.license_photo) && (
            <View style={styles.alert}>
              <Ionicons name="warning" size={20} color="#F59E0B" />
              <Text style={styles.alertText}>Veuillez télécharger votre pièce d'identité et votre permis de conduire pour effectuer une réservation.</Text>
            </View>
          )}
          <View style={styles.docsGrid}>
            {/* ID Card */}
            <View style={styles.docCard}>
              <View style={styles.docHeader}>
                <Ionicons name="card" size={20} color={C.purple} />
                <Text style={styles.docTitle}>Pièce d'Identité</Text>
                {user.id_photo && (
                  <View style={styles.badge}><Ionicons name="checkmark-circle" size={14} color={C.success} /><Text style={styles.badgeText}>OK</Text></View>
                )}
              </View>
              {user.id_photo ? (
                <Image source={{ uri: user.id_photo }} style={styles.docImage} resizeMode="cover" />
              ) : (
                <View style={styles.noDoc}><Ionicons name="card-outline" size={36} color={C.gray} /><Text style={styles.noDocText}>Non téléchargée</Text></View>
              )}
              <TouchableOpacity style={[styles.docBtn, user.id_photo && styles.docBtnOutline]} onPress={() => pickAndUpload('id')} data-testid="upload-id-btn">
                {uploadingId ? <ActivityIndicator size="small" color={user.id_photo ? C.purple : '#FFF'} /> : (
                  <Text style={[styles.docBtnText, user.id_photo && styles.docBtnTextOutline]}>{user.id_photo ? 'Modifier' : 'Télécharger'}</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* License */}
            <View style={styles.docCard}>
              <View style={styles.docHeader}>
                <Ionicons name="car" size={20} color={C.purple} />
                <Text style={styles.docTitle}>Permis de Conduire</Text>
                {user.license_photo && (
                  <View style={styles.badge}><Ionicons name="checkmark-circle" size={14} color={C.success} /><Text style={styles.badgeText}>OK</Text></View>
                )}
              </View>
              {user.license_photo ? (
                <Image source={{ uri: user.license_photo }} style={styles.docImage} resizeMode="cover" />
              ) : (
                <View style={styles.noDoc}><Ionicons name="id-card-outline" size={36} color={C.gray} /><Text style={styles.noDocText}>Non téléchargé</Text></View>
              )}
              <TouchableOpacity style={[styles.docBtn, user.license_photo && styles.docBtnOutline]} onPress={() => pickAndUpload('license')} data-testid="upload-license-btn">
                {uploadingLicense ? <ActivityIndicator size="small" color={user.license_photo ? C.purple : '#FFF'} /> : (
                  <Text style={[styles.docBtnText, user.license_photo && styles.docBtnTextOutline]}>{user.license_photo ? 'Modifier' : 'Télécharger'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Menu */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Paramètres</Text>
          <View style={styles.menuCard}>
            {menuItems.map((item, i) => (
              <TouchableOpacity key={item.label} style={[styles.menuItem, i < menuItems.length - 1 && styles.menuBorder]} data-testid={`menu-${i}`}>
                <View style={styles.menuLeft}>
                  <View style={styles.menuIcon}><Ionicons name={item.icon as any} size={18} color={C.purple} /></View>
                  <Text style={styles.menuText}>{item.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.gray} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} data-testid="logout-btn">
          <Ionicons name="log-out" size={20} color={C.error} />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: _C.bg },
  content: { maxWidth: 800, width: '100%', alignSelf: 'center' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: _C.bg, gap: 12 },
  loadingText: { fontSize: 14, color: _C.gray },
  header: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20, backgroundColor: _C.card, borderBottomWidth: 1, borderBottomColor: _C.border },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: _C.purple, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#FFF' },
  userName: { fontSize: 20, fontWeight: '700', color: _C.dark },
  userEmail: { fontSize: 13, color: _C.gray, marginTop: 2 },
  editBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 14, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: _C.purpleLight, gap: 6 },
  editBtnText: { fontSize: 13, fontWeight: '600', color: _C.purple },
  section: { padding: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: _C.dark, marginBottom: 14 },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  alert: { flexDirection: 'row', backgroundColor: '#FEF3C7', borderRadius: 12, padding: 14, marginBottom: 16, alignItems: 'center', gap: 10 },
  alertText: { flex: 1, fontSize: 13, color: '#92400E', lineHeight: 18 },
  docsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  docCard: { backgroundColor: _C.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: _C.border, width: 340, maxWidth: '100%', flexGrow: 1 },
  docHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  docTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: _C.dark },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16,185,129,0.1)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, gap: 4 },
  badgeText: { fontSize: 11, fontWeight: '600', color: _C.success },
  docImage: { width: '100%', height: 140, borderRadius: 10 },
  noDoc: { alignItems: 'center', paddingVertical: 24, backgroundColor: _C.grayLight, borderRadius: 10 },
  noDocText: { fontSize: 13, color: _C.gray, marginTop: 6 },
  docBtn: { marginTop: 12, backgroundColor: _C.purple, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  docBtnOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: _C.purple },
  docBtnText: { fontSize: 13, fontWeight: '600', color: '#FFF' },
  docBtnTextOutline: { color: _C.purple },
  menuCard: { backgroundColor: _C.card, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: _C.border },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: _C.border },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: _C.purpleLight, justifyContent: 'center', alignItems: 'center' },
  menuText: { fontSize: 14, color: _C.dark },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: _C.card, marginHorizontal: 20, padding: 14, borderRadius: 14, gap: 8, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
  logoutText: { fontSize: 14, fontWeight: '600', color: _C.error },
});
