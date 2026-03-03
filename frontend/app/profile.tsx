import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { createAbsence } from '../src/services/api';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, isManager } = useAuth();
  const [showAbsenceModal, setShowAbsenceModal] = useState(false);
  const [absenceType, setAbsenceType] = useState<string>('vacation');
  const [absenceStartDate, setAbsenceStartDate] = useState('');
  const [absenceEndDate, setAbsenceEndDate] = useState('');
  const [absenceComment, setAbsenceComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login');
          },
        },
      ]
    );
  };

  const handleSubmitAbsence = async () => {
    if (!absenceStartDate || !absenceEndDate) {
      Alert.alert('Erreur', 'Veuillez remplir les dates');
      return;
    }
    
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(absenceStartDate) || !dateRegex.test(absenceEndDate)) {
      Alert.alert('Erreur', 'Format de date invalide. Utilisez AAAA-MM-JJ');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await createAbsence({
        type: absenceType,
        start_date: absenceStartDate,
        end_date: absenceEndDate,
        comment: absenceComment,
      });
      Alert.alert('Succès', 'Demande d\'absence soumise');
      setShowAbsenceModal(false);
      setAbsenceStartDate('');
      setAbsenceEndDate('');
      setAbsenceComment('');
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Erreur lors de la soumission';
      Alert.alert('Erreur', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleLabel = (role: string) => {
    const roles: Record<string, string> = {
      employee: 'Employé',
      manager: 'Manager',
      admin: 'Administrateur',
    };
    return roles[role] || role;
  };

  const absenceTypes = [
    { value: 'vacation', label: 'Vacances', icon: 'sunny-outline' },
    { value: 'sick', label: 'Maladie', icon: 'medkit-outline' },
    { value: 'training', label: 'Formation', icon: 'school-outline' },
    { value: 'holiday', label: 'Jour férié', icon: 'calendar-outline' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Profil</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </Text>
          </View>
          <Text style={styles.profileName}>{user?.first_name} {user?.last_name}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Ionicons 
              name={isManager ? 'shield-checkmark' : 'person'} 
              size={14} 
              color="#22C55E" 
            />
            <Text style={styles.roleText}>{getRoleLabel(user?.role || '')}</Text>
          </View>
        </View>

        {/* Contract Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations du contrat</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={20} color="#9CA3AF" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Heures contractuelles</Text>
                <Text style={styles.infoValue}>{user?.contract_hours}h / semaine</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => setShowAbsenceModal(true)}
          >
            <View style={styles.actionIconContainer}>
              <Ionicons name="calendar-outline" size={24} color="#3B82F6" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Demander une absence</Text>
              <Text style={styles.actionSubtitle}>Vacances, maladie, formation...</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6B7280" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push('/history')}
          >
            <View style={styles.actionIconContainer}>
              <Ionicons name="document-text-outline" size={24} color="#22C55E" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Mes rapports</Text>
              <Text style={styles.actionSubtitle}>Consulter l'historique</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/home')}>
          <Ionicons name="home-outline" size={24} color="#6B7280" />
          <Text style={styles.navLabel}>Accueil</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/history')}>
          <Ionicons name="list-outline" size={24} color="#6B7280" />
          <Text style={styles.navLabel}>Historique</Text>
        </TouchableOpacity>
        {isManager && (
          <TouchableOpacity style={styles.navItem} onPress={() => router.push('/dashboard')}>
            <Ionicons name="stats-chart-outline" size={24} color="#6B7280" />
            <Text style={styles.navLabel}>Gestion</Text>
          </TouchableOpacity>
        )}
        <View style={[styles.navItem, styles.navItemActive]}>
          <Ionicons name="person" size={24} color="#22C55E" />
          <Text style={[styles.navLabel, styles.navLabelActive]}>Profil</Text>
        </View>
      </View>

      {/* Absence Modal */}
      <Modal
        visible={showAbsenceModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAbsenceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Demander une absence</Text>
              <TouchableOpacity onPress={() => setShowAbsenceModal(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <Text style={styles.fieldLabel}>Type d'absence</Text>
              <View style={styles.typeGrid}>
                {absenceTypes.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.typeCard,
                      absenceType === type.value && styles.typeCardActive
                    ]}
                    onPress={() => setAbsenceType(type.value)}
                  >
                    <Ionicons 
                      name={type.icon as any} 
                      size={24} 
                      color={absenceType === type.value ? '#22C55E' : '#9CA3AF'} 
                    />
                    <Text style={[
                      styles.typeLabel,
                      absenceType === type.value && styles.typeLabelActive
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <Text style={styles.fieldLabel}>Date de début (AAAA-MM-JJ)</Text>
              <TextInput
                style={styles.dateInput}
                placeholder="2025-07-15"
                placeholderTextColor="#6B7280"
                value={absenceStartDate}
                onChangeText={setAbsenceStartDate}
              />
              
              <Text style={styles.fieldLabel}>Date de fin (AAAA-MM-JJ)</Text>
              <TextInput
                style={styles.dateInput}
                placeholder="2025-07-20"
                placeholderTextColor="#6B7280"
                value={absenceEndDate}
                onChangeText={setAbsenceEndDate}
              />
              
              <Text style={styles.fieldLabel}>Commentaire (optionnel)</Text>
              <TextInput
                style={[styles.dateInput, styles.commentInput]}
                placeholder="Raison de l'absence..."
                placeholderTextColor="#6B7280"
                value={absenceComment}
                onChangeText={setAbsenceComment}
                multiline
              />
              
              <TouchableOpacity 
                style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
                onPress={handleSubmitAbsence}
                disabled={isSubmitting}
              >
                <Text style={styles.submitBtnText}>
                  {isSubmitting ? 'Envoi en cours...' : 'Soumettre la demande'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 44,
  },
  profileCard: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22C55E20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22C55E',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EF4444',
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#1F2937',
    paddingVertical: 12,
    paddingHorizontal: 20,
    paddingBottom: 28,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  navItemActive: {},
  navLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  navLabelActive: {
    color: '#22C55E',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalBody: {
    padding: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 8,
    marginTop: 16,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  typeCard: {
    width: '47%',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  typeCardActive: {
    backgroundColor: '#22C55E20',
    borderWidth: 1,
    borderColor: '#22C55E',
  },
  typeLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  typeLabelActive: {
    color: '#22C55E',
    fontWeight: '600',
  },
  dateInput: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
  },
  commentInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: '#22C55E',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
