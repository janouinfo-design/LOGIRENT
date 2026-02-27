import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, TextInput, Modal, ScrollView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api/axios';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const C = { bg: '#0B0F1A', card: '#141926', primary: '#6C2BD9', accent: '#A78BFA', text: '#fff', textLight: '#8B95A8', border: '#1E2536', success: '#10B981', warning: '#F59E0B', error: '#EF4444' };

interface Client {
  id: string; name: string; email: string; phone?: string;
  client_rating?: string; reservation_count?: number; created_at?: string;
}

export default function AgencyClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchClients = async () => {
    try {
      const res = await api.get('/api/admin/users');
      setClients(res.data.users || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchClients(); }, []);
  const onRefresh = async () => { setRefreshing(true); await fetchClients(); setRefreshing(false); };

  const filtered = useMemo(() => {
    if (!search) return clients;
    return clients.filter(c =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search)
    );
  }, [clients, search]);

  const createClient = async () => {
    if (!newName) {
      Platform.OS === 'web' ? window.alert('Le nom est obligatoire') : Alert.alert('Erreur', 'Le nom est obligatoire');
      return;
    }
    setCreating(true);
    try {
      await api.post('/api/admin/quick-client', { name: newName, phone: newPhone || null, email: newEmail || null });
      setShowNewModal(false);
      setNewName(''); setNewPhone(''); setNewEmail('');
      fetchClients();
      Platform.OS === 'web' ? window.alert('Client créé!') : Alert.alert('Succès', 'Client créé!');
    } catch (e: any) {
      const msg = e.response?.data?.detail || 'Erreur';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Erreur', msg);
    } finally { setCreating(false); }
  };

  const ratingInfo = (r?: string) => {
    switch (r) {
      case 'vip': return { color: '#8B5CF6', label: 'VIP', icon: 'star' as const };
      case 'good': return { color: C.success, label: 'Bon', icon: 'thumbs-up' as const };
      case 'bad': return { color: C.warning, label: 'Mauvais', icon: 'thumbs-down' as const };
      case 'blocked': return { color: C.error, label: 'Bloqué', icon: 'ban' as const };
      default: return null;
    }
  };

  if (loading) return <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={C.accent} /></View>;

  return (
    <View style={s.container}>
      <View style={s.topRow}>
        <View style={s.searchBar}>
          <Ionicons name="search" size={18} color={C.textLight} />
          <TextInput style={s.searchInput} placeholder="Rechercher..." placeholderTextColor={C.textLight} value={search} onChangeText={setSearch} />
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowNewModal(true)} data-testid="new-client-btn">
          <Ionicons name="person-add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        ListEmptyComponent={<View style={s.empty}><Ionicons name="people-outline" size={40} color={C.textLight} /><Text style={s.emptyText}>Aucun client</Text></View>}
        renderItem={({ item }) => {
          const rating = ratingInfo(item.client_rating);
          return (
            <View style={s.card} data-testid={`client-${item.id}`}>
              <View style={s.cardHeader}>
                <View style={s.avatar}>
                  <Ionicons name="person" size={20} color={C.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.nameRow}>
                    <Text style={s.clientName}>{item.name}</Text>
                    {rating && (
                      <View style={[s.ratingBadge, { backgroundColor: rating.color + '20' }]}>
                        <Ionicons name={rating.icon} size={10} color={rating.color} />
                        <Text style={[s.ratingText, { color: rating.color }]}>{rating.label}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.clientEmail}>{item.email}</Text>
                  {item.phone && <Text style={s.clientPhone}>{item.phone}</Text>}
                </View>
                {item.reservation_count !== undefined && (
                  <View style={s.countBadge}>
                    <Text style={s.countText}>{item.reservation_count}</Text>
                    <Text style={s.countLabel}>rés.</Text>
                  </View>
                )}
              </View>
            </View>
          );
        }}
      />

      {/* New Client Modal */}
      <Modal visible={showNewModal} transparent animationType="slide" onRequestClose={() => setShowNewModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Nouveau client</Text>
              <TouchableOpacity onPress={() => setShowNewModal(false)}><Ionicons name="close" size={24} color={C.text} /></TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={s.label}>Nom *</Text>
              <TextInput style={s.input} placeholder="Nom complet" placeholderTextColor={C.textLight} value={newName} onChangeText={setNewName} data-testid="modal-client-name" />
              <Text style={s.label}>Téléphone</Text>
              <TextInput style={s.input} placeholder="+41 XX XXX XX XX" placeholderTextColor={C.textLight} value={newPhone} onChangeText={setNewPhone} keyboardType="phone-pad" data-testid="modal-client-phone" />
              <Text style={s.label}>Email</Text>
              <TextInput style={s.input} placeholder="email@example.com" placeholderTextColor={C.textLight} value={newEmail} onChangeText={setNewEmail} keyboardType="email-address" autoCapitalize="none" data-testid="modal-client-email" />
              <TouchableOpacity style={[s.createBtn, creating && { opacity: 0.6 }]} onPress={createClient} disabled={creating} data-testid="modal-create-client-btn">
                <Ionicons name="person-add" size={18} color="#fff" />
                <Text style={s.createBtnText}>{creating ? 'Création...' : 'Créer le client'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  topRow: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 0, gap: 10 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 10, paddingHorizontal: 12, gap: 8, borderWidth: 1, borderColor: C.border },
  searchInput: { flex: 1, color: C.text, fontSize: 14, paddingVertical: 10 },
  addBtn: { width: 44, height: 44, borderRadius: 10, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { color: C.textLight, fontSize: 14 },
  card: { backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(108,43,217,0.15)', alignItems: 'center', justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  clientName: { color: C.text, fontSize: 15, fontWeight: '700' },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  ratingText: { fontSize: 10, fontWeight: '600' },
  clientEmail: { color: C.textLight, fontSize: 12, marginTop: 2 },
  clientPhone: { color: C.textLight, fontSize: 12 },
  countBadge: { alignItems: 'center' },
  countText: { color: C.accent, fontSize: 18, fontWeight: '800' },
  countLabel: { color: C.textLight, fontSize: 9 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: C.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: C.text, fontSize: 18, fontWeight: '800' },
  label: { color: C.textLight, fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: C.bg, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: C.text, fontSize: 14, borderWidth: 1, borderColor: C.border },
  createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.primary, borderRadius: 10, paddingVertical: 14, marginTop: 20 },
  createBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
