import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api/axios';
import { useAuthStore } from '../../src/store/authStore';

const C = { bg: '#0B0F1A', card: '#141926', primary: '#6C2BD9', accent: '#A78BFA', text: '#fff', textLight: '#8B95A8', border: '#1E2536', success: '#10B981', warning: '#F59E0B', error: '#EF4444' };

interface Vehicle {
  id: string; brand: string; model: string; year: number; price_per_day: number;
  type: string; seats: number; transmission: string; fuel_type: string; status: string;
}

export default function AgencyVehicles() {
  const { user } = useAuthStore();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const fetchVehicles = async () => {
    try {
      const params: any = {};
      if (user?.agency_id) params.agency_id = user.agency_id;
      const res = await api.get('/api/vehicles', { params });
      setVehicles(res.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchVehicles(); }, []);
  const onRefresh = async () => { setRefreshing(true); await fetchVehicles(); setRefreshing(false); };

  const filtered = useMemo(() => {
    if (!search) return vehicles;
    return vehicles.filter(v =>
      `${v.brand} ${v.model}`.toLowerCase().includes(search.toLowerCase()) ||
      v.type.toLowerCase().includes(search.toLowerCase())
    );
  }, [vehicles, search]);

  const statusIcon = (s: string) => {
    switch (s) {
      case 'available': return { icon: 'checkmark-circle' as const, color: C.success, label: 'Disponible' };
      case 'rented': return { icon: 'car' as const, color: C.warning, label: 'Loué' };
      case 'maintenance': return { icon: 'construct' as const, color: C.error, label: 'Maintenance' };
      default: return { icon: 'help-circle' as const, color: C.textLight, label: s };
    }
  };

  if (loading) return <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={C.accent} /></View>;

  return (
    <View style={s.container}>
      <View style={s.searchBar}>
        <Ionicons name="search" size={18} color={C.textLight} />
        <TextInput style={s.searchInput} placeholder="Rechercher un véhicule..." placeholderTextColor={C.textLight} value={search} onChangeText={setSearch} />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        ListEmptyComponent={<View style={s.empty}><Ionicons name="car-outline" size={40} color={C.textLight} /><Text style={s.emptyText}>Aucun véhicule</Text></View>}
        renderItem={({ item }) => {
          const st = statusIcon(item.status);
          return (
            <View style={s.card} data-testid={`vehicle-${item.id}`}>
              <View style={s.cardHeader}>
                <View>
                  <Text style={s.vehicleName}>{item.brand} {item.model}</Text>
                  <Text style={s.vehicleYear}>{item.year} | {item.type}</Text>
                </View>
                <View style={[s.statusBadge, { backgroundColor: st.color + '20' }]}>
                  <Ionicons name={st.icon} size={14} color={st.color} />
                  <Text style={[s.statusText, { color: st.color }]}>{st.label}</Text>
                </View>
              </View>
              <View style={s.cardDetails}>
                <View style={s.detail}>
                  <Ionicons name="people-outline" size={14} color={C.textLight} />
                  <Text style={s.detailText}>{item.seats} places</Text>
                </View>
                <View style={s.detail}>
                  <Ionicons name="cog-outline" size={14} color={C.textLight} />
                  <Text style={s.detailText}>{item.transmission === 'automatic' ? 'Auto' : 'Manuel'}</Text>
                </View>
                <View style={s.detail}>
                  <Ionicons name="flash-outline" size={14} color={C.textLight} />
                  <Text style={s.detailText}>{item.fuel_type}</Text>
                </View>
              </View>
              <View style={s.cardFooter}>
                <Text style={s.price}>CHF {item.price_per_day}<Text style={s.priceLabel}>/jour</Text></Text>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, margin: 16, marginBottom: 0, borderRadius: 10, paddingHorizontal: 12, gap: 8, borderWidth: 1, borderColor: C.border },
  searchInput: { flex: 1, color: C.text, fontSize: 14, paddingVertical: 10 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { color: C.textLight, fontSize: 14 },
  card: { backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  vehicleName: { color: C.text, fontSize: 16, fontWeight: '700' },
  vehicleYear: { color: C.textLight, fontSize: 12, marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '600' },
  cardDetails: { flexDirection: 'row', gap: 16, marginBottom: 10 },
  detail: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { color: C.textLight, fontSize: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'flex-end' },
  price: { color: C.accent, fontSize: 18, fontWeight: '800' },
  priceLabel: { fontSize: 12, fontWeight: '500', color: C.textLight },
});
