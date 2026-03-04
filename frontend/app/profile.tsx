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
      {/* Top Navigation */}
      <View style={styles.topNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/home')}>
          <Ionicons name="home-outline" size={22} color="#6B7280" />
          <Text style={styles.navLabel}>Accueil</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/history')}>
          <Ionicons name="list-outline" size={22} color="#6B7280" />
          <Text style={styles.navLabel}>Historique</Text>
        </TouchableOpacity>
        {isManager && (
          <TouchableOpacity style={styles.navItem} onPress={() => router.push('/dashboard')}>
            <Ionicons name="stats-chart-outline" size={22} color="#6B7280" />
            <Text style={styles.navLabel}>Gestion</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.navItem, styles.navItemActive]}>
          <Ionicons name="person" size={22} color="#22C55E" />
          <Text style={[styles.navLabel, styles.navLabelActive]}>Profil</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
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
              <Ionicons name="time-outline" size={20} color="#6B7280" />
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
            <View style={[styles.actionIconContainer, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="calendar-outline" size={24} color="#3B82F6" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Demander une absence</Text>
              <Text style={styles.actionSubtitle}>Vacances, maladie, formation...</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push('/history')}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="document-text-outline" size={24} color="#22C55E" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Mes rapports</Text>
              <Text style={styles.actionSubtitle}>Consulter l'historique</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>
      </ScrollView>

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
                <Ionicons name="close" size={24} color="#111827" />
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
                      color={absenceType === type.value ? '#22C55E' : '#6B7280'} 
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
                placeholderTextColor="#9CA3AF"
                value={absenceStartDate}
                onChangeText={setAbsenceStartDate}
              />
              
              <Text style={styles.fieldLabel}>Date de fin (AAAA-MM-JJ)</Text>
              <TextInput
                style={styles.dateInput}
                placeholder="2025-07-20"
                placeholderTextColor="#9CA3AF"
                value={absenceEndDate}
                onChangeText={setAbsenceEndDate}
              />
              
              <Text style={styles.fieldLabel}>Commentaire (optionnel)</Text>
              <TextInput
                style={[styles.dateInput, styles.commentInput]}
                placeholder="Raison de l'absence..."
                placeholderTextColor="#9CA3AF"
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
    backgroundColor: '#F9FAFB',
  },
  topNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  navItemActive: {},
  navLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  navLabelActive: {
    color: '#22C55E',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
    color: '#111827',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 12,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
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
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
    color: '#111827',
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
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
    color: '#111827',
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
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EF4444',
    gap: 8,
    marginTop: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
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
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalBody: {
    padding: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
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
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  typeCardActive: {
    backgroundColor: '#D1FAE5',
    borderColor: '#22C55E',
  },
  typeLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  typeLabelActive: {
    color: '#22C55E',
    fontWeight: '600',
  },
  dateInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    color: '#111827',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
