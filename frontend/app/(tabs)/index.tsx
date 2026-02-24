import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useVehicleStore, Vehicle } from '../../src/store/vehicleStore';
import VehicleCard from '../../src/components/VehicleCard';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#1E3A8A',
  secondary: '#F59E0B',
  background: '#F8FAFC',
  card: '#FFFFFF',
  text: '#1E293B',
  textLight: '#64748B',
  border: '#E2E8F0',
};

const vehicleTypes = [
  { id: 'all', name: 'All', icon: 'car' },
  { id: 'SUV', name: 'SUV', icon: 'car-sport' },
  { id: 'berline', name: 'Sedan', icon: 'car-outline' },
  { id: 'citadine', name: 'City', icon: 'car' },
  { id: 'utilitaire', name: 'Van', icon: 'cube' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { vehicles, fetchVehicles, isLoading, setFilters } = useVehicleStore();
  const [selectedType, setSelectedType] = React.useState('all');
  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchVehicles();
    setRefreshing(false);
  };

  const handleTypeSelect = (typeId: string) => {
    setSelectedType(typeId);
    if (typeId === 'all') {
      setFilters({ type: undefined });
      fetchVehicles({ type: undefined });
    } else {
      setFilters({ type: typeId });
      fetchVehicles({ type: typeId });
    }
  };

  const featuredVehicles = vehicles.slice(0, 3);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0] || 'Guest'}</Text>
            <Text style={styles.headerTitle}>Find Your Perfect Ride</Text>
          </View>
          <TouchableOpacity style={styles.notificationBtn}>
            <Ionicons name="notifications-outline" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <TouchableOpacity 
          style={styles.searchBar}
          onPress={() => router.push('/(tabs)/vehicles')}
        >
          <Ionicons name="search" size={20} color={COLORS.textLight} />
          <Text style={styles.searchText}>Search vehicles...</Text>
        </TouchableOpacity>

        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
          >
            {vehicleTypes.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.categoryItem,
                  selectedType === type.id && styles.categoryItemActive,
                ]}
                onPress={() => handleTypeSelect(type.id)}
              >
                <View style={[
                  styles.categoryIcon,
                  selectedType === type.id && styles.categoryIconActive,
                ]}>
                  <Ionicons
                    name={type.icon as any}
                    size={24}
                    color={selectedType === type.id ? '#FFFFFF' : COLORS.primary}
                  />
                </View>
                <Text style={[
                  styles.categoryText,
                  selectedType === type.id && styles.categoryTextActive,
                ]}>
                  {type.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Featured Vehicles */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Vehicles</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/vehicles')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          
          {featuredVehicles.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              onPress={() => router.push(`/vehicle/${vehicle.id}`)}
            />
          ))}
        </View>

        {/* Promo Banner */}
        <View style={styles.promoBanner}>
          <View style={styles.promoContent}>
            <Text style={styles.promoTitle}>First Rental?</Text>
            <Text style={styles.promoSubtitle}>Get 15% off your first booking!</Text>
            <TouchableOpacity style={styles.promoButton}>
              <Text style={styles.promoButtonText}>Book Now</Text>
            </TouchableOpacity>
          </View>
          <Ionicons name="gift" size={80} color="rgba(255,255,255,0.3)" style={styles.promoIcon} />
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  greeting: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 4,
  },
  notificationBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    marginHorizontal: 20,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 12,
  },
  searchText: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  seeAll: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  categoriesContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: 16,
  },
  categoryItemActive: {},
  categoryIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(30, 58, 138, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryIconActive: {
    backgroundColor: COLORS.primary,
  },
  categoryText: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  categoryTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  promoBanner: {
    backgroundColor: COLORS.primary,
    marginHorizontal: 20,
    marginTop: 24,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  promoContent: {
    flex: 1,
  },
  promoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  promoSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 16,
  },
  promoButton: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  promoButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  promoIcon: {
    position: 'absolute',
    right: -10,
    bottom: -10,
  },
});
