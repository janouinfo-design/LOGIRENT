import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert, Modal, ScrollView, TextInput, Image, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../../src/api/axios';
import { format } from 'date-fns';
import Button from '../../src/components/Button';

const COLORS = {
  primary: '#1E3A8A',
  secondary: '#F59E0B',
  background: '#F8FAFC',
  card: '#FFFFFF',
  text: '#1E293B',
  textLight: '#64748B',
  border: '#E2E8F0',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  vip: '#8B5CF6',
};

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  profile_photo?: string;
  id_photo?: string;
  license_photo?: string;
  client_rating?: string;
  admin_notes?: string;
  blocked?: boolean;
  reservation_count: number;
  created_at: string;
}

const RATINGS = [
  { value: 'vip', label: 'VIP', color: COLORS.vip, icon: 'star' },
  { value: 'good', label: 'Bon client', color: COLORS.success, icon: 'thumbs-up' },
  { value: 'neutral', label: 'Neutre', color: COLORS.textLight, icon: 'remove' },
  { value: 'bad', label: 'Mauvais client', color: COLORS.warning, icon: 'thumbs-down' },
  { value: 'blocked', label: 'Bloqué', color: COLORS.error, icon: 'ban' },
];

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingIdPhoto, setUploadingIdPhoto] = useState(false);
  const [uploadingLicensePhoto, setUploadingLicensePhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const importInputRef = React.useRef<HTMLInputElement | null>(null);
  
  // Edit user info
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/api/admin/users');
      setUsers(response.data.users);
      setTotal(response.data.total);
    } catch (error: any) {
      console.error('Error fetching users:', error.response?.data || error.message);
      if (Platform.OS === 'web') {
        window.alert('Impossible de charger les utilisateurs');
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  };

  const handleImportFile = async (e: any) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const resp = await api.post('/api/admin/import-users', formData);
      const d = resp.data;
      let msg = d.message;
      if (d.errors && d.errors.length > 0) {
        msg += '\n\nErreurs:\n' + d.errors.join('\n');
      }
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Import', msg);
      await fetchUsers();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Erreur lors de l\'import';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Erreur', msg);
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const triggerImport = () => {
    if (Platform.OS === 'web') {
      importInputRef.current?.click();
    } else {
      Alert.alert('Import', 'L\'import Excel est disponible uniquement sur la version web.');
    }
  };

  const openUserModal = (user: User) => {
    setSelectedUser(user);
    setAdminNotes(user.admin_notes || '');
    setEditName(user.name || '');
    setEditEmail(user.email || '');
    setEditPhone(user.phone || '');
    setEditAddress(user.address || '');
    setEditMode(false);
    setShowUserModal(true);
  };

  const saveUserInfo = async () => {
    if (!selectedUser) return;
    
    setSaving(true);
    try {
      await api.put(`/api/admin/users/${selectedUser.id}`, {
        name: editName,
        email: editEmail,
        phone: editPhone,
        address: editAddress,
        admin_notes: adminNotes,
      });
      setSelectedUser({ 
        ...selectedUser, 
        name: editName,
        email: editEmail,
        phone: editPhone,
        address: editAddress,
        admin_notes: adminNotes 
      });
      setEditMode(false);
      fetchUsers();
      if (Platform.OS === 'web') {
        window.alert('Informations sauvegardées');
      }
    } catch (error: any) {
      console.error('Error saving user info:', error);
      if (Platform.OS === 'web') {
        window.alert('Erreur lors de la sauvegarde');
      }
    } finally {
      setSaving(false);
    }
  };

  const updateRating = async (rating: string) => {
    if (!selectedUser) return;
    
    try {
      await api.put(`/api/admin/users/${selectedUser.id}/rating?rating=${rating}`);
      setSelectedUser({ ...selectedUser, client_rating: rating });
      fetchUsers();
      if (Platform.OS === 'web') {
        window.alert(`Client marqué comme "${RATINGS.find(r => r.value === rating)?.label}"`);
      }
    } catch (error: any) {
      console.error('Error updating rating:', error);
      if (Platform.OS === 'web') {
        window.alert('Erreur: ' + (error.response?.data?.detail || 'Impossible de mettre à jour'));
      }
    }
  };

  const saveNotes = async () => {
    if (!selectedUser) return;
    
    setSaving(true);
    try {
      await api.put(`/api/admin/users/${selectedUser.id}`, { admin_notes: adminNotes });
      setSelectedUser({ ...selectedUser, admin_notes: adminNotes });
      fetchUsers();
      if (Platform.OS === 'web') {
        window.alert('Notes sauvegardées');
      }
    } catch (error: any) {
      console.error('Error saving notes:', error);
      if (Platform.OS === 'web') {
        window.alert('Erreur lors de la sauvegarde');
      }
    } finally {
      setSaving(false);
    }
  };

  const uploadDocumentPhoto = async (type: 'id' | 'license') => {
    if (!selectedUser) return;

    const setUploading = type === 'id' ? setUploadingIdPhoto : setUploadingLicensePhoto;
    const endpoint = type === 'id' ? 'id-photo' : 'license-photo';
    const fieldName = type === 'id' ? 'id_photo' : 'license_photo';

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      if (Platform.OS === 'web') {
        window.alert('Permission requise');
      }
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setUploading(true);
      try {
        const asset = result.assets[0];
        let base64Data = asset.base64;
        let contentType = asset.mimeType || 'image/jpeg';

        if (!base64Data && asset.uri && asset.uri.startsWith('data:')) {
          const match = asset.uri.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            contentType = match[1];
            base64Data = match[2];
          }
        }

        if (base64Data) {
          const response = await api.post(`/api/admin/users/${selectedUser.id}/${endpoint}`, {
            image: base64Data,
            content_type: contentType,
          });

          setSelectedUser({ ...selectedUser, [fieldName]: response.data.photo });
          fetchUsers();
          if (Platform.OS === 'web') {
            window.alert(`${type === 'id' ? 'Pièce d\'identité' : 'Permis de conduire'} mis à jour`);
          }
        }
      } catch (error: any) {
        console.error('Error uploading document:', error);
        if (Platform.OS === 'web') {
          window.alert('Erreur lors de l\'upload');
        }
      } finally {
        setUploading(false);
      }
    }
  };

  const handleUploadPhoto = async () => {
    if (!selectedUser) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      if (Platform.OS === 'web') {
        window.alert('Permission requise');
      }
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setUploadingPhoto(true);
      try {
        const asset = result.assets[0];
        let base64Data = asset.base64;
        let contentType = asset.mimeType || 'image/jpeg';

        // Handle data URI
        if (!base64Data && asset.uri && asset.uri.startsWith('data:')) {
          const match = asset.uri.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            contentType = match[1];
            base64Data = match[2];
          }
        }

        if (base64Data) {
          const response = await api.post(`/api/admin/users/${selectedUser.id}/photo`, {
            image: base64Data,
            content_type: contentType,
          });

          setSelectedUser({ ...selectedUser, profile_photo: response.data.photo });
          fetchUsers();
          if (Platform.OS === 'web') {
            window.alert('Photo mise à jour');
          }
        }
      } catch (error: any) {
        console.error('Error uploading photo:', error);
        if (Platform.OS === 'web') {
          window.alert('Erreur lors de l\'upload');
        }
      } finally {
        setUploadingPhoto(false);
      }
    }
  };

  const getRatingInfo = (rating?: string) => {
    return RATINGS.find(r => r.value === rating) || RATINGS.find(r => r.value === 'neutral')!;
  };

  const renderItem = ({ item }: { item: User }) => {
    const ratingInfo = getRatingInfo(item.client_rating);
    
    return (
      <TouchableOpacity style={styles.card} onPress={() => openUserModal(item)}>
        <View style={styles.cardHeader}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            {item.profile_photo ? (
              <Image source={{ uri: item.profile_photo }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            {/* Rating Badge */}
            <View style={[styles.ratingBadge, { backgroundColor: ratingInfo.color }]}>
              <Ionicons name={ratingInfo.icon as any} size={10} color="#fff" />
            </View>
          </View>

          <View style={styles.userInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.userName}>{item.name}</Text>
              {item.blocked && (
                <View style={styles.blockedBadge}>
                  <Text style={styles.blockedText}>Bloqué</Text>
                </View>
              )}
            </View>
            <Text style={styles.userEmail}>{item.email}</Text>
            {item.phone && <Text style={styles.userPhone}>{item.phone}</Text>}
          </View>
          
          <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="calendar" size={14} color={COLORS.textLight} />
            <Text style={styles.statText}>{item.reservation_count} locations</Text>
          </View>
          <View style={[styles.ratingTag, { backgroundColor: ratingInfo.color + '20' }]}>
            <Ionicons name={ratingInfo.icon as any} size={12} color={ratingInfo.color} />
            <Text style={[styles.ratingTagText, { color: ratingInfo.color }]}>{ratingInfo.label}</Text>
          </View>
        </View>

        {item.admin_notes && (
          <View style={styles.notesPreview}>
            <Ionicons name="document-text" size={14} color={COLORS.textLight} />
            <Text style={styles.notesPreviewText} numberOfLines={1}>{item.admin_notes}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>{total} utilisateurs au total</Text>
      </View>

      <FlatList
        data={users}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color={COLORS.textLight} />
            <Text style={styles.emptyText}>Aucun utilisateur</Text>
          </View>
        }
      />

      {/* User Detail Modal */}
      <Modal
        visible={showUserModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowUserModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Détails du client</Text>
            <TouchableOpacity onPress={() => setShowUserModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedUser && (
              <>
                {/* Profile Photo Section */}
                <View style={styles.photoSection}>
                  <TouchableOpacity onPress={handleUploadPhoto} disabled={uploadingPhoto}>
                    {uploadingPhoto ? (
                      <View style={[styles.modalAvatar, styles.avatarPlaceholder]}>
                        <ActivityIndicator color={COLORS.primary} />
                      </View>
                    ) : selectedUser.profile_photo ? (
                      <Image source={{ uri: selectedUser.profile_photo }} style={styles.modalAvatar} />
                    ) : (
                      <View style={[styles.modalAvatar, styles.avatarPlaceholder]}>
                        <Text style={styles.modalAvatarText}>{selectedUser.name.charAt(0).toUpperCase()}</Text>
                      </View>
                    )}
                    <View style={styles.editPhotoBtn}>
                      <Ionicons name="camera" size={16} color="#fff" />
                    </View>
                  </TouchableOpacity>
                  <Text style={styles.modalUserName}>{selectedUser.name}</Text>
                  <Text style={styles.modalUserEmail}>{selectedUser.email}</Text>
                </View>

                {/* Client Rating */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Évaluation du client</Text>
                  <View style={styles.ratingsContainer}>
                    {RATINGS.map((rating) => (
                      <TouchableOpacity
                        key={rating.value}
                        style={[
                          styles.ratingOption,
                          selectedUser.client_rating === rating.value && styles.ratingOptionActive,
                          { borderColor: rating.color }
                        ]}
                        onPress={() => updateRating(rating.value)}
                      >
                        <Ionicons 
                          name={rating.icon as any} 
                          size={20} 
                          color={selectedUser.client_rating === rating.value ? '#fff' : rating.color} 
                        />
                        <Text style={[
                          styles.ratingOptionText,
                          { color: selectedUser.client_rating === rating.value ? '#fff' : rating.color }
                        ]}>
                          {rating.label}
                        </Text>
                        {selectedUser.client_rating === rating.value && (
                          <View style={[styles.ratingOptionBg, { backgroundColor: rating.color }]} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Admin Notes */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Notes administratives</Text>
                  <TextInput
                    style={styles.notesInput}
                    value={adminNotes}
                    onChangeText={setAdminNotes}
                    placeholder="Ajouter des notes sur ce client..."
                    placeholderTextColor={COLORS.textLight}
                    multiline
                    numberOfLines={4}
                  />
                  <Button
                    title="Sauvegarder les notes"
                    onPress={saveNotes}
                    loading={saving}
                    variant="outline"
                    style={{ marginTop: 12 }}
                  />
                </View>

                {/* Documents */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Documents</Text>
                  <View style={styles.documentsGrid}>
                    <View style={styles.documentItem}>
                      <Text style={styles.documentLabel}>Pièce d'identité</Text>
                      <TouchableOpacity onPress={() => uploadDocumentPhoto('id')} disabled={uploadingIdPhoto}>
                        {uploadingIdPhoto ? (
                          <View style={styles.noDocument}>
                            <ActivityIndicator color={COLORS.primary} />
                          </View>
                        ) : selectedUser.id_photo ? (
                          <View>
                            <Image source={{ uri: selectedUser.id_photo }} style={styles.documentImage} />
                            <View style={styles.documentOverlay}>
                              <Ionicons name="camera" size={20} color="#fff" />
                            </View>
                          </View>
                        ) : (
                          <View style={styles.noDocument}>
                            <Ionicons name="add-circle" size={32} color={COLORS.primary} />
                            <Text style={styles.addDocumentText}>Ajouter</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>
                    <View style={styles.documentItem}>
                      <Text style={styles.documentLabel}>Permis de conduire</Text>
                      <TouchableOpacity onPress={() => uploadDocumentPhoto('license')} disabled={uploadingLicensePhoto}>
                        {uploadingLicensePhoto ? (
                          <View style={styles.noDocument}>
                            <ActivityIndicator color={COLORS.primary} />
                          </View>
                        ) : selectedUser.license_photo ? (
                          <View>
                            <Image source={{ uri: selectedUser.license_photo }} style={styles.documentImage} />
                            <View style={styles.documentOverlay}>
                              <Ionicons name="camera" size={20} color="#fff" />
                            </View>
                          </View>
                        ) : (
                          <View style={styles.noDocument}>
                            <Ionicons name="add-circle" size={32} color={COLORS.primary} />
                            <Text style={styles.addDocumentText}>Ajouter</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* User Info - Editable */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Informations</Text>
                    <TouchableOpacity onPress={() => setEditMode(!editMode)}>
                      <Text style={styles.editLink}>{editMode ? 'Annuler' : 'Modifier'}</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {editMode ? (
                    <>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Nom</Text>
                        <TextInput
                          style={styles.textInput}
                          value={editName}
                          onChangeText={setEditName}
                          placeholder="Nom complet"
                        />
                      </View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Email</Text>
                        <TextInput
                          style={styles.textInput}
                          value={editEmail}
                          onChangeText={setEditEmail}
                          placeholder="Email"
                          keyboardType="email-address"
                          autoCapitalize="none"
                        />
                      </View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Téléphone</Text>
                        <TextInput
                          style={styles.textInput}
                          value={editPhone}
                          onChangeText={setEditPhone}
                          placeholder="Numéro de téléphone"
                          keyboardType="phone-pad"
                        />
                      </View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Adresse</Text>
                        <TextInput
                          style={styles.textInput}
                          value={editAddress}
                          onChangeText={setEditAddress}
                          placeholder="Adresse complète"
                        />
                      </View>
                      <Button
                        title="Sauvegarder les modifications"
                        onPress={saveUserInfo}
                        loading={saving}
                        style={{ marginTop: 12 }}
                      />
                    </>
                  ) : (
                    <>
                      <View style={styles.infoRow}>
                        <Ionicons name="person" size={18} color={COLORS.textLight} />
                        <Text style={styles.infoText}>{selectedUser.name}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Ionicons name="mail" size={18} color={COLORS.textLight} />
                        <Text style={styles.infoText}>{selectedUser.email}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Ionicons name="call" size={18} color={COLORS.textLight} />
                        <Text style={styles.infoText}>{selectedUser.phone || 'Non renseigné'}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Ionicons name="location" size={18} color={COLORS.textLight} />
                        <Text style={styles.infoText}>{selectedUser.address || 'Non renseignée'}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Ionicons name="calendar" size={18} color={COLORS.textLight} />
                        <Text style={styles.infoText}>Inscrit le {format(new Date(selectedUser.created_at), 'dd/MM/yyyy')}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Ionicons name="car" size={18} color={COLORS.textLight} />
                        <Text style={styles.infoText}>{selectedUser.reservation_count} locations effectuées</Text>
                      </View>
                    </>
                  )}
                </View>
              </>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button
              title="Fermer"
              onPress={() => setShowUserModal(false)}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  ratingBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.card,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  blockedBadge: {
    backgroundColor: COLORS.error + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  blockedText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.error,
  },
  userEmail: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 2,
  },
  userPhone: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  ratingTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  ratingTagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  notesPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    padding: 10,
    backgroundColor: COLORS.background,
    borderRadius: 8,
  },
  notesPreviewText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textLight,
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textLight,
    marginTop: 12,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  modalAvatarText: {
    fontSize: 36,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  editPhotoBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.background,
  },
  modalUserName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 12,
  },
  modalUserEmail: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
  },
  section: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  ratingsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  ratingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    gap: 6,
    position: 'relative',
    overflow: 'hidden',
  },
  ratingOptionActive: {
    backgroundColor: 'transparent',
  },
  ratingOptionBg: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },
  ratingOptionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  notesInput: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: COLORS.text,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  documentsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  documentItem: {
    flex: 1,
  },
  documentLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textLight,
    marginBottom: 8,
  },
  documentImage: {
    width: '100%',
    height: 100,
    borderRadius: 8,
  },
  noDocument: {
    width: '100%',
    height: 100,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  noDocumentText: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
  },
  addDocumentText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  documentOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  editLink: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textLight,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.text,
  },
  modalFooter: {
    padding: 20,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
});
