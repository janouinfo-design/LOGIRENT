import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, RefreshControl, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useVehicleStore } from '../../src/store/vehicleStore';
import VehicleCard from '../../src/components/VehicleCard';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#0F172A',
  gold: '#D4A853',
  goldLight: '#F5E6C8',
  bg: '#FAFBFC',
  card: '#FFFFFF',
  text: '#0F172A',
  textLight: '#64748B',
  border: '#E2E8F0',
};

const vehicleTypes = [
  { id: 'all', name: 'Tous', icon: 'grid-outline' },
  { id: 'SUV', name: 'SUV', icon: 'car-sport-outline' },
  { id: 'berline', name: 'Berline', icon: 'car-outline' },
  { id: 'citadine', name: 'Citadine', icon: 'car' },
  { id: 'utilitaire', name: 'Utilitaire', icon: 'cube-outline' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { vehicles, fetchVehicles, setFilters } = useVehicleStore();
  const [selectedType, setSelectedType] = React.useState('all');
  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => { fetchVehicles(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchVehicles();
    setRefreshing(false);
  };

  const handleTypeSelect = (typeId: string) => {
    setSelectedType(typeId);
    const type = typeId === 'all' ? undefined : typeId;
    setFilters({ type });
    fetchVehicles({ type });
  };

  const firstName = user?.name?.split(' ')[0] || 'Client';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 30 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Hero Header */}
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.greeting}>Bonjour, {firstName}</Text>
              <Text style={styles.heroTitle}>Trouvez votre{'\n'}voiture idéale</Text>
            </View>
            <TouchableOpacity style={styles.profileBtn} onPress={() => router.push('/(tabs)/profile')}>
              <View style={styles.profileAvatar}>
                <Text style={styles.profileInitial}>{firstName.charAt(0).toUpperCase()}</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <TouchableOpacity
            style={styles.searchBar}
            onPress={() => router.push('/(tabs)/vehicles')}
            data-testid="search-bar"
          >
            <Ionicons name="search" size={18} color={COLORS.gold} />
            <Text style={styles.searchText}>Rechercher un véhicule...</Text>
            <View style={styles.searchFilter}>
              <Ionicons name="options-outline" size={16} color={COLORS.primary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Catégories</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          >
            {vehicleTypes.map((type) => {
              const active = selectedType === type.id;
              return (
                <TouchableOpacity
                  key={type.id}
                  style={[styles.catPill, active && styles.catPillActive]}
                  onPress={() => handleTypeSelect(type.id)}
                  data-testid={`category-${type.id}`}
                >
                  <Ionicons
                    name={type.icon as any}
                    size={18}
                    color={active ? '#FFFFFF' : COLORS.primary}
                  />
                  <Text style={[styles.catText, active && styles.catTextActive]}>
                    {type.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Vehicle Count + View Toggle */}
        <View style={styles.resultsRow}>
          <Text style={styles.resultsText}>
            {vehicles.length} véhicule{vehicles.length > 1 ? 's' : ''}
            {selectedType !== 'all' && <Text style={{ color: COLORS.gold }}> - {vehicleTypes.find(t => t.id === selectedType)?.name}</Text>}
          </Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/vehicles')}>
            <Text style={styles.viewAll}>Voir tout</Text>
          </TouchableOpacity>
        </View>

        {/* Vehicle Grid - Square Cards */}
        <View style={styles.vehicleGrid}>
          {vehicles.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              onPress={() => router.push(`/vehicle/${vehicle.id}`)}
            />
          ))}
        </View>

        {vehicles.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="car-outline" size={48} color={COLORS.textLight} />
            <Text style={styles.emptyText}>Aucun véhicule trouvé</Text>
            <TouchableOpacity onPress={() => handleTypeSelect('all')}>
              <Text style={styles.emptyAction}>Réinitialiser les filtres</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Promo Banner */}
        <View style={styles.promo}>
          <View style={styles.promoLeft}>
            <View style={styles.promoBadge}>
              <Ionicons name="star" size={12} color={COLORS.gold} />
              <Text style={styles.promoBadgeText}>Offre spéciale</Text>
            </View>
            <Text style={styles.promoTitle}>Première location ?</Text>
            <Text style={styles.promoSub}>Profitez de -15% sur votre première réservation</Text>
            <TouchableOpacity style={styles.promoBtn}>
              <Text style={styles.promoBtnText}>Réserver maintenant</Text>
              <Ionicons name="arrow-forward" size={14} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  hero: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 13,
    color: COLORS.gold,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 6,
    lineHeight: 32,
  },
  profileBtn: {
    marginTop: 4,
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.gold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  searchText: {
    flex: 1,
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
  searchFilter: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.gold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    backgroundColor: COLORS.card,
    marginRight: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  catPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  catText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  catTextActive: {
    color: '#FFFFFF',
  },
  resultsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 14,
  },
  resultsText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textLight,
  },
  viewAll: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gold,
  },
  vehicleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textLight,
    marginTop: 10,
  },
  emptyAction: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gold,
    marginTop: 8,
  },
  promo: {
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    padding: 22,
    overflow: 'hidden',
  },
  promoLeft: {},
  promoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(212, 168, 83, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 12,
  },
  promoBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.gold,
  },
  promoTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  promoSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 18,
    marginBottom: 16,
  },
  promoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.gold,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  promoBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
});
