import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, TextInput, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api/axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CardSkeleton } from '../../src/components/Skeleton';
import { useThemeStore } from '../../src/store/themeStore';
import { EditClientModal } from '../../src/components/agency/EditClientModal';
import { NewClientModal } from '../../src/components/agency/NewClientModal';
import { ImportClientModal } from '../../src/components/agency/ImportClientModal';

const SCREEN_W = Dimensions.get('window').width;

interface Client {
  id: string; name: string; email: string; phone?: string;
  client_rating?: string; reservation_count?: number; created_at?: string;
  profile_photo?: string; address?: string; admin_notes?: string;
  total_spent?: number; total_reservations?: number;
  birth_place?: string; date_of_birth?: string; license_number?: string;
  license_issue_date?: string; license_expiry_date?: string; nationality?: string;
}

const RATINGS = [
  { value: 'vip', label: 'VIP', icon: 'star' as const, color: '#8B5CF6' },
  { value: 'good', label: 'Bon', icon: 'thumbs-up' as const, color: '#22c55e' },
  { value: 'neutral', label: 'Neutre', icon: 'remove-circle' as const, color: '#9ca3af' },
  { value: 'bad', label: 'Mauvais', icon: 'thumbs-down' as const, color: '#f59e0b' },
  { value: 'blocked', label: 'Bloque', icon: 'ban' as const, color: '#ef4444' },
];

export default function AgencyClients() {
  const { colors: C } = useThemeStore();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);

  const fetchClients = async () => {
    try {
      if (clients.length === 0) {
        const cached = await AsyncStorage.getItem('cache_clients');
        if (cached) { try { setClients(JSON.parse(cached)); } catch {} }
      }
      const res = await api.get('/api/admin/users');
      const data = res.data.users || [];
      setClients(data);
      AsyncStorage.setItem('cache_clients', JSON.stringify(data)).catch(() => {});
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

  const ratingInfo = (r?: string) => RATINGS.find(rt => rt.value === r) || null;

  const openEditModal = (client: Client) => {
    setEditClient(client);
    setShowEditModal(true);
  };

  if (loading && clients.length === 0) return <View style={[s.container, { backgroundColor: C.bg }]}><CardSkeleton count={5} /></View>;

  return (
    <View style={[s.container, { backgroundColor: C.bg }]}>
      <View style={s.topRow}>
        <View style={[s.searchBar, { backgroundColor: C.card, borderColor: C.border }]}>
          <Ionicons name="search" size={18} color={C.textLight} />
          <TextInput style={[s.searchInput, { color: C.text }]} placeholder="Rechercher..." placeholderTextColor={C.textLight} value={search} onChangeText={setSearch} />
        </View>
        <TouchableOpacity style={[s.iconActionBtn, { backgroundColor: C.success + '30', borderWidth: 1, borderColor: C.success + '50' }]} onPress={() => setShowImportModal(true)} data-testid="import-clients-btn">
          <Ionicons name="cloud-upload" size={20} color={C.success} />
        </TouchableOpacity>
        <TouchableOpacity style={[s.addBtn, { backgroundColor: C.primary }]} onPress={() => setShowNewModal(true)} testID="new-client-btn">
          <Ionicons name="person-add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        numColumns={5}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        columnWrapperStyle={{ gap: 10, marginBottom: 10 }}
        ListEmptyComponent={<View style={s.empty}><Ionicons name="people-outline" size={40} color={C.textLight} /><Text style={[s.emptyText, { color: C.textLight }]}>Aucun client</Text></View>}
        renderItem={({ item }) => {
          const rating = ratingInfo(item.client_rating);
          const cardW = (SCREEN_W - 32 - 40) / 5;
          return (
            <TouchableOpacity style={[s.card, { backgroundColor: C.card, borderColor: C.border, width: cardW }]} onPress={() => openEditModal(item)} data-testid={`client-${item.id}`}>
              <View style={[s.cardAvatar, { backgroundColor: C.accent + '15' }]}>
                {item.profile_photo ? <Image source={{ uri: item.profile_photo }} style={s.cardAvatarImg} /> : <Ionicons name="person" size={28} color={C.accent} />}
                {rating && (
                  <View style={[s.ratingOverlay, { backgroundColor: rating.color }]}>
                    <Ionicons name={rating.icon} size={10} color="#fff" />
                  </View>
                )}
              </View>
              <View style={s.cardBody}>
                <Text style={[s.cardName, { color: C.text }]} numberOfLines={1}>{item.name}</Text>
                <Text style={{ color: C.textLight, fontSize: 15, marginTop: 2 }} numberOfLines={1}>{item.email || '-'}</Text>
                {item.phone ? <Text style={{ color: C.textLight, fontSize: 14, marginTop: 1 }} numberOfLines={1}>{item.phone}</Text> : null}
                <View style={s.cardFooter}>
                  {item.reservation_count !== undefined && item.reservation_count > 0 ? (
                    <View style={[s.resCountBadge, { backgroundColor: C.accent + '15' }]}>
                      <Text style={{ color: C.accent, fontSize: 15, fontWeight: '700' }}>{item.reservation_count} res.</Text>
                    </View>
                  ) : (
                    <View style={[s.resCountBadge, { backgroundColor: C.border + '30' }]}>
                      <Text style={{ color: C.textLight, fontSize: 15 }}>0 res.</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <EditClientModal visible={showEditModal} onClose={() => setShowEditModal(false)} client={editClient} C={C} onSaved={fetchClients} />
      <ImportClientModal visible={showImportModal} onClose={() => setShowImportModal(false)} C={C} onImported={fetchClients} />
      <NewClientModal visible={showNewModal} onClose={() => setShowNewModal(false)} onCreated={fetchClients} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 0, gap: 10 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 12, gap: 8, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 10 },
  iconActionBtn: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  addBtn: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 14 },
  card: { borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
  cardAvatar: { width: '100%', height: 70, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  cardAvatarImg: { width: '100%', height: 70 },
  ratingOverlay: { position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cardBody: { padding: 8 },
  cardName: { fontSize: 18, fontWeight: '800' },
  cardFooter: { marginTop: 4 },
  resCountBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' },
});
