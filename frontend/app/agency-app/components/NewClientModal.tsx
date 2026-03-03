import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, TextInput, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../src/api/axios';

interface Props {
  visible: boolean;
  onClose: () => void;
  C: any;
  onCreated: () => void;
}

export const NewClientModal = ({ visible, onClose, C, onCreated }: Props) => {
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newBirthPlace, setNewBirthPlace] = useState('');
  const [newBirthDate, setNewBirthDate] = useState('');
  const [newLicenseNumber, setNewLicenseNumber] = useState('');
  const [newLicenseIssue, setNewLicenseIssue] = useState('');
  const [newLicenseExpiry, setNewLicenseExpiry] = useState('');
  const [newNationality, setNewNationality] = useState('');
  const [creating, setCreating] = useState(false);

  const resetForm = () => {
    setNewName(''); setNewPhone(''); setNewEmail('');
    setNewBirthPlace(''); setNewBirthDate(''); setNewLicenseNumber('');
    setNewLicenseIssue(''); setNewLicenseExpiry(''); setNewNationality('');
  };

  const createClient = async () => {
    if (!newName) {
      Platform.OS === 'web' ? window.alert('Le nom est obligatoire') : Alert.alert('Erreur', 'Le nom est obligatoire');
      return;
    }
    if (!newBirthPlace || !newBirthDate || !newLicenseNumber || !newLicenseIssue || !newLicenseExpiry || !newNationality) {
      const msg = 'Veuillez remplir tous les champs obligatoires';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Champs manquants', msg);
      return;
    }
    setCreating(true);
    try {
      await api.post('/api/admin/quick-client', {
        name: newName, phone: newPhone || null, email: newEmail || null,
        birth_place: newBirthPlace, date_of_birth: newBirthDate,
        license_number: newLicenseNumber, license_issue_date: newLicenseIssue,
        license_expiry_date: newLicenseExpiry, nationality: newNationality,
      });
      resetForm();
      onClose();
      onCreated();
      Platform.OS === 'web' ? window.alert('Client cree!') : Alert.alert('Succes', 'Client cree!');
    } catch (e: any) {
      const msg = e.response?.data?.detail || 'Erreur';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Erreur', msg);
    } finally { setCreating(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={st.modalOverlay}>
        <View style={[st.modal, { backgroundColor: C.card }]}>
          <View style={st.modalHeader}>
            <Text style={[st.modalTitle, { color: C.text }]}>Nouveau client</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={C.text} /></TouchableOpacity>
          </View>
          <ScrollView>
            <Text style={[st.label, { color: C.textLight }]}>Nom *</Text>
            <TextInput style={[st.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]} placeholder="Nom complet" placeholderTextColor={C.textLight} value={newName} onChangeText={setNewName} data-testid="modal-client-name" />
            <Text style={[st.label, { color: C.textLight }]}>Telephone</Text>
            <TextInput style={[st.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]} placeholder="+41 XX XXX XX XX" placeholderTextColor={C.textLight} value={newPhone} onChangeText={setNewPhone} keyboardType="phone-pad" data-testid="modal-client-phone" />
            <Text style={[st.label, { color: C.textLight }]}>Email</Text>
            <TextInput style={[st.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]} placeholder="email@example.com" placeholderTextColor={C.textLight} value={newEmail} onChangeText={setNewEmail} keyboardType="email-address" autoCapitalize="none" data-testid="modal-client-email" />

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, marginBottom: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border }}>
              <Ionicons name="id-card" size={16} color={C.accent} />
              <Text style={{ color: C.text, fontSize: 14, fontWeight: '700' }}>Identite & Permis *</Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={[st.label, { color: C.textLight }]}>Lieu de naissance *</Text>
                <TextInput style={[st.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]} placeholder="Geneve" placeholderTextColor={C.textLight} value={newBirthPlace} onChangeText={setNewBirthPlace} data-testid="new-birth-place" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[st.label, { color: C.textLight }]}>Date de naissance *</Text>
                <TextInput style={[st.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]} placeholder="JJ-MM-AAAA" placeholderTextColor={C.textLight} value={newBirthDate} onChangeText={setNewBirthDate} data-testid="new-birth-date" />
              </View>
            </View>

            <Text style={[st.label, { color: C.textLight }]}>Nationalite *</Text>
            <TextInput style={[st.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]} placeholder="Suisse" placeholderTextColor={C.textLight} value={newNationality} onChangeText={setNewNationality} data-testid="new-nationality" />

            <Text style={[st.label, { color: C.textLight }]}>Permis No *</Text>
            <TextInput style={[st.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]} placeholder="GE-123456" placeholderTextColor={C.textLight} value={newLicenseNumber} onChangeText={setNewLicenseNumber} data-testid="new-license-number" />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={[st.label, { color: C.textLight }]}>Date d'emission *</Text>
                <TextInput style={[st.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]} placeholder="AAAA-MM-JJ" placeholderTextColor={C.textLight} value={newLicenseIssue} onChangeText={setNewLicenseIssue} data-testid="new-license-issue" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[st.label, { color: C.textLight }]}>Date d'expiration *</Text>
                <TextInput style={[st.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]} placeholder="AAAA-MM-JJ" placeholderTextColor={C.textLight} value={newLicenseExpiry} onChangeText={setNewLicenseExpiry} data-testid="new-license-expiry" />
              </View>
            </View>

            <TouchableOpacity style={[st.createBtn, { backgroundColor: C.primary }, creating && { opacity: 0.6 }]} onPress={createClient} disabled={creating} data-testid="modal-create-client-btn">
              <Ionicons name="person-add" size={18} color="#fff" />
              <Text style={st.createBtnText}>{creating ? 'Creation...' : 'Creer le client'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const st = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, borderWidth: 1 },
  createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, paddingVertical: 14, marginTop: 20 },
  createBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
