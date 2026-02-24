import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../src/store/authStore';
import Input from '../../src/components/Input';
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
  error: '#EF4444',
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, updateProfile, uploadLicense, uploadIdCard, isAuthenticated, loadUser, isLoading } = useAuthStore();
  
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingLicense, setUploadingLicense] = useState(false);
  const [uploadingId, setUploadingId] = useState(false);

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setAddress(user.address || '');
    }
  }, [user]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Chargement du profil...</Text>
      </View>
    );
  }

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateProfile({ name, phone, address });
      setEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    // On web, use window.confirm instead of Alert
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Êtes-vous sûr de vouloir vous déconnecter?');
      if (confirmed) {
        await logout();
        router.replace('/');
      }
    } else {
      Alert.alert(
        'Déconnexion',
        'Êtes-vous sûr de vouloir vous déconnecter?',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Déconnexion',
            style: 'destructive',
            onPress: async () => {
              await logout();
              router.replace('/');
            },
          },
        ]
      );
    }
  };

  const handleUploadLicense = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions to upload your license.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setUploadingLicense(true);
      try {
        await uploadLicense(result.assets[0].uri);
        Alert.alert('Success', 'License uploaded successfully');
      } catch (error: any) {
        Alert.alert('Error', error.message);
      } finally {
        setUploadingLicense(false);
      }
    }
  };

  const menuItems = [
    { icon: 'settings', label: 'Admin Dashboard', onPress: () => router.push('/admin') },
    { icon: 'card', label: 'Payment Methods', onPress: () => {} },
    { icon: 'notifications', label: 'Notifications', onPress: () => {} },
    { icon: 'shield-checkmark', label: 'Privacy & Security', onPress: () => {} },
    { icon: 'help-circle', label: 'Help & Support', onPress: () => {} },
    { icon: 'document-text', label: 'Terms of Service', onPress: () => {} },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        <Text style={styles.userName}>{user?.name}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        
        {!editing && (
          <TouchableOpacity style={styles.editButton} onPress={() => setEditing(true)}>
            <Ionicons name="pencil" size={16} color={COLORS.primary} />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Profile Form */}
      {editing && (
        <View style={styles.section}>
          <Input
            label="Full Name"
            value={name}
            onChangeText={setName}
            icon="person"
          />
          <Input
            label="Phone"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            icon="call"
          />
          <Input
            label="Address"
            value={address}
            onChangeText={setAddress}
            icon="location"
          />
          
          <View style={styles.buttonRow}>
            <Button
              title="Cancel"
              onPress={() => setEditing(false)}
              variant="outline"
              style={{ flex: 1 }}
            />
            <Button
              title="Save"
              onPress={handleSave}
              loading={loading}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      )}

      {/* License Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Driving License</Text>
        <View style={styles.licenseCard}>
          {user?.license_photo ? (
            <View style={styles.licenseImageContainer}>
              <Image
                source={{ uri: user.license_photo }}
                style={styles.licenseImage}
                resizeMode="cover"
              />
              <View style={styles.licenseStatus}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                <Text style={styles.licenseStatusText}>Verified</Text>
              </View>
            </View>
          ) : (
            <View style={styles.noLicense}>
              <Ionicons name="id-card-outline" size={48} color={COLORS.textLight} />
              <Text style={styles.noLicenseText}>No license uploaded</Text>
              <Text style={styles.noLicenseSubtext}>Upload your license to rent vehicles</Text>
            </View>
          )}
          <Button
            title={user?.license_photo ? 'Update License' : 'Upload License'}
            onPress={handleUploadLicense}
            loading={uploadingLicense}
            variant={user?.license_photo ? 'outline' : 'primary'}
            style={{ marginTop: 16 }}
          />
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.menuCard}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.label}
              style={[
                styles.menuItem,
                index < menuItems.length - 1 && styles.menuItemBorder,
              ]}
              onPress={item.onPress}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name={item.icon as any} size={22} color={COLORS.primary} />
                <Text style={styles.menuItemText}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Logout */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out" size={22} color={COLORS.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  header: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
  },
  userEmail: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(30, 58, 138, 0.1)',
    gap: 6,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  licenseCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
  },
  licenseImageContainer: {
    alignItems: 'center',
  },
  licenseImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
  },
  licenseStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  licenseStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.success,
  },
  noLicense: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  noLicenseText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 12,
  },
  noLicenseSubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
  },
  menuCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontSize: 15,
    color: COLORS.text,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 16,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.error,
  },
});
