import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Animated, Image, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useVehicleStore } from '../../src/store/vehicleStore';
import { useAuthStore } from '../../src/store/authStore';
import VehicleCard from '../../src/components/VehicleCard';
import { useI18n } from '../../src/i18n';
import { useThemeStore } from '../../src/store/themeStore';

const vehicleTypes = [
  { id: 'all', icon: 'grid-outline' },
  { id: 'SUV', icon: 'car-sport-outline' },
  { id: 'Grand SUV', icon: 'car-sport' },
  { id: 'Berline', icon: 'car-outline' },
  { id: 'Citadine', icon: 'car' },
  { id: 'Compact', icon: 'speedometer-outline' },
  { id: 'Utilitaire', icon: 'cube-outline' },
  { id: 'Luxe', icon: 'diamond-outline' },
  { id: 'Van', icon: 'bus-outline' },
  { id: 'Monospace', icon: 'people-outline' },
  { id: 'Cabriolet', icon: 'sunny-outline' },
  { id: 'Electrique', icon: 'flash-outline' },
];

const typeNameMap: Record<string, Record<string, string>> = {
  fr: { all: 'Tous', SUV: 'SUV', 'Grand SUV': 'Grand SUV', Berline: 'Berline', Citadine: 'Citadine', Compact: 'Compact', Utilitaire: 'Utilitaire', Luxe: 'Luxe', Van: 'Van', Monospace: 'Monospace', Cabriolet: 'Cabriolet', Electrique: 'Electrique' },
  en: { all: 'All', SUV: 'SUV', 'Grand SUV': 'Grand SUV', Berline: 'Sedan', Citadine: 'City Car', Compact: 'Compact', Utilitaire: 'Utility', Luxe: 'Luxury', Van: 'Van', Monospace: 'Minivan', Cabriolet: 'Convertible', Electrique: 'Electric' },
};

function AnimatedCard({ children, index }: { children: React.ReactNode; index: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay: index * 60, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, delay: index * 60, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>{children}</Animated.View>;
}

export default function HomeScreen() {
  const { colors: C } = useThemeStore();
  const router = useRouter();
  const { vehicles, fetchVehicles, setFilters } = useVehicleStore();
  const { user } = useAuthStore();
  const agencyId = user?.agency_id || undefined;
  const { lang, t } = useI18n();
  const [selectedType, setSelectedType] = React.useState('all');
  const [allVehicles, setAllVehicles] = React.useState<any[]>([]);
  const [refreshing, setRefreshing] = React.useState(false);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  useEffect(() => { fetchVehicles({}); }, []);

  // Keep a copy of ALL vehicles for category counts
  useEffect(() => {
    if (vehicles.length > 0 && selectedType === 'all') {
      setAllVehicles(vehicles);
    }
  }, [vehicles, selectedType]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchVehicles({});
    setRefreshing(false);
  };

  // Filter locally instead of calling backend
  const displayedVehicles = React.useMemo(() => {
    if (selectedType === 'all') return vehicles;
    return allVehicles.filter(v => (v.type || '').toLowerCase() === selectedType.toLowerCase());
  }, [selectedType, vehicles, allVehicles]);

  const handleTypeSelect = (typeId: string) => {
    setSelectedType(typeId);
    if (typeId === 'all') {
      fetchVehicles({});
    }
    // No backend call for category filter — just filter locally
  };

  // ==================== SEARCH SIDEBAR (Desktop) ====================
  const SearchPanel = () => (
    <View style={[st.searchPanel, { backgroundColor: C.card, borderColor: C.border }]} data-testid="search-panel">
      <Text style={[st.searchTitle, { color: C.text }]}>Rechercher un véhicule</Text>

      <TouchableOpacity
        style={[st.searchBar, { borderColor: C.border, backgroundColor: C.bg }]}
        onPress={() => router.push('/(tabs)/vehicles')}
        data-testid="hero-search"
      >
        <Ionicons name="search" size={18} color={C.textLight} />
        <Text style={[st.searchPlaceholder, { color: C.textLight }]}>{t('searchPlaceholder')}</Text>
      </TouchableOpacity>

      {/* Quick Filters */}
      <Text style={[st.filterLabel, { color: C.textLight }]}>Catégories</Text>
      <View style={st.filterGrid}>
        {vehicleTypes.map(type => {
          const active = selectedType === type.id;
          return (
            <TouchableOpacity
              key={type.id}
              style={[st.filterChip, { backgroundColor: active ? '#7C3AED' : C.bg, borderColor: active ? '#7C3AED' : C.border }]}
              onPress={() => handleTypeSelect(type.id)}
              data-testid={`category-${type.id}`}
            >
              <Ionicons name={type.icon as any} size={14} color={active ? '#fff' : '#7C3AED'} />
              <Text style={[st.filterChipText, { color: active ? '#fff' : C.text }]}>{typeNameMap[lang]?.[type.id] || type.id}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Stats */}
      <View style={[st.statsBox, { backgroundColor: C.bg }]}>
        <View style={st.stat}>
          <Text style={[st.statNum, { color: '#7C3AED' }]}>{vehicles.length}+</Text>
          <Text style={[st.statLabel, { color: C.textLight }]}>{lang === 'fr' ? 'Véhicules' : 'Vehicles'}</Text>
        </View>
        <View style={st.stat}>
          <Text style={[st.statNum, { color: '#7C3AED' }]}>24/7</Text>
          <Text style={[st.statLabel, { color: C.textLight }]}>Support</Text>
        </View>
      </View>

      {/* CTA */}
      <TouchableOpacity style={st.ctaBtn} onPress={() => router.push('/(tabs)/vehicles')}>
        <Text style={st.ctaBtnText}>{t('ctaButton')}</Text>
        <Ionicons name="arrow-forward" size={16} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  // ==================== MOBILE SEARCH BAR ====================
  const MobileSearch = () => (
    <View style={[st.mobileSearch, { backgroundColor: C.card, borderColor: C.border }]}>
      <TouchableOpacity
        style={[st.mobileSearchBar, { borderColor: C.border, backgroundColor: C.bg }]}
        onPress={() => router.push('/(tabs)/vehicles')}
        data-testid="hero-search"
      >
        <Ionicons name="search" size={18} color={C.textLight} />
        <Text style={[st.searchPlaceholder, { color: C.textLight }]}>{t('searchPlaceholder')}</Text>
        <View style={st.mobileSearchArrow}>
          <Ionicons name="arrow-forward" size={14} color="#fff" />
        </View>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[st.container, { backgroundColor: C.bg }]} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Compact Header */}
        <View style={[st.header, { backgroundColor: '#7C3AED' }]}>
          <View style={st.headerInner}>
            <View>
              <Text style={st.headerGreeting}>{t('greeting')}</Text>
              <Text style={st.headerTitle}>LogiRent</Text>
            </View>
            <View style={st.headerRight}>
              <Text style={st.headerSub}>{lang === 'fr' ? 'Location de véhicules' : 'Vehicle Rental'}</Text>
              <Text style={st.headerStat}>{vehicles.length} {lang === 'fr' ? 'véhicules disponibles' : 'vehicles available'}</Text>
            </View>
          </View>
        </View>

        {/* Mobile: search + categories inline */}
        {!isDesktop && (
          <>
            <MobileSearch />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.catRow}>
              {vehicleTypes.map(type => {
                const active = selectedType === type.id;
                return (
                  <TouchableOpacity
                    key={type.id}
                    style={[st.catPill, { backgroundColor: active ? '#7C3AED' : C.card, borderColor: active ? '#7C3AED' : C.border }]}
                    onPress={() => handleTypeSelect(type.id)}
                    data-testid={`category-${type.id}`}
                  >
                    <Ionicons name={type.icon as any} size={16} color={active ? '#fff' : '#7C3AED'} />
                    <Text style={[st.catText, { color: active ? '#fff' : C.text }]}>{typeNameMap[lang]?.[type.id] || type.id}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        )}

        {/* ===== Categories Scroller - Desktop & Mobile ===== */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 14, gap: 10 }}>
          {vehicleTypes.filter(type => {
            if (type.id === 'all') return true;
            return (allVehicles.length > 0 ? allVehicles : vehicles).some(v => (v.type || '').toLowerCase() === type.id.toLowerCase());
          }).map(type => {
            const active = selectedType === type.id;
            const label = typeNameMap[lang]?.[type.id] || type.id;
            const source = allVehicles.length > 0 ? allVehicles : vehicles;
            const count = type.id === 'all' ? source.length : source.filter(v => (v.type || '').toLowerCase() === type.id.toLowerCase()).length;
            return (
              <TouchableOpacity
                key={type.id}
                onPress={() => handleTypeSelect(type.id)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 8,
                  paddingHorizontal: 16, paddingVertical: 10,
                  borderRadius: 12, borderWidth: 1.5,
                  backgroundColor: active ? '#7C3AED' : C.card,
                  borderColor: active ? '#7C3AED' : C.border,
                }}
                data-testid={`cat-scroll-${type.id}`}
              >
                <Ionicons name={type.icon as any} size={18} color={active ? '#fff' : '#7C3AED'} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: active ? '#fff' : C.text }}>{label}</Text>
                <View style={{ backgroundColor: active ? 'rgba(255,255,255,0.25)' : '#7C3AED15', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: active ? '#fff' : '#7C3AED' }}>{count}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Main Content */}
        <View style={[st.main, isDesktop && st.mainDesktop]}>
          {/* Vehicle Grid - LEFT / PRIMARY */}
          <View style={[st.vehicleCol, isDesktop && { flex: 1 }]}>
            <View style={st.resultsRow}>
              <Text style={[st.resultsText, { color: C.text }]}>{displayedVehicles.length} {t('vehiclesCount')}</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/vehicles')}>
                <Text style={st.viewAll}>{t('viewAll')}</Text>
              </TouchableOpacity>
            </View>

            <View style={[st.grid, isDesktop ? st.gridDesktop : st.gridMobile]}>
              {displayedVehicles.map((vehicle, index) => (
                <View key={vehicle.id} style={isDesktop ? { width: '31.5%', minWidth: 260 } : { width: '100%' }}>
                  <AnimatedCard index={index}>
                    <VehicleCard
                      vehicle={vehicle}
                      onPress={() => router.push(`/vehicle/${vehicle.id}`)}
                      index={index}
                    />
                  </AnimatedCard>
                </View>
              ))}
            </View>

            {displayedVehicles.length === 0 && (
              <View style={st.empty}>
                <Ionicons name="car-outline" size={48} color={C.textLight} />
                <Text style={[st.emptyText, { color: C.textLight }]}>Aucun véhicule trouvé</Text>
              </View>
            )}
          </View>

          {/* Search Panel - RIGHT (Desktop only) */}
          {isDesktop && (
            <View style={st.sidebarCol}>
              <SearchPanel />

              {/* Benefits in sidebar */}
              <View style={[st.benefitsCard, { backgroundColor: C.card, borderColor: C.border }]}>
                <Text style={[st.benefitsTitle, { color: C.text }]}>{t('whyUs')}</Text>
                {[
                  { icon: 'car-sport', titleKey: 'benefit1Title' as const },
                  { icon: 'headset', titleKey: 'benefit2Title' as const },
                  { icon: 'pricetag', titleKey: 'benefit3Title' as const },
                  { icon: 'calendar-clear', titleKey: 'benefit4Title' as const },
                ].map((b, i) => (
                  <View key={i} style={st.benefitRow}>
                    <View style={st.benefitIcon}><Ionicons name={b.icon as any} size={16} color="#7C3AED" /></View>
                    <Text style={[st.benefitText, { color: C.text }]}>{t(b.titleKey)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Mobile: Benefits + CTA at bottom */}
        {!isDesktop && (
          <View style={st.mobileBenefits}>
            <Text style={[st.sectionTitle, { color: C.text }]}>{t('whyUs')}</Text>
            <View style={st.benefitsGrid}>
              {[
                { icon: 'car-sport', titleKey: 'benefit1Title' as const, descKey: 'benefit1Desc' as const },
                { icon: 'headset', titleKey: 'benefit2Title' as const, descKey: 'benefit2Desc' as const },
                { icon: 'pricetag', titleKey: 'benefit3Title' as const, descKey: 'benefit3Desc' as const },
                { icon: 'calendar-clear', titleKey: 'benefit4Title' as const, descKey: 'benefit4Desc' as const },
              ].map((b, i) => (
                <View key={i} style={[st.benefitCard, { backgroundColor: C.card, borderColor: C.border }]}>
                  <View style={st.benefitIconBig}><Ionicons name={b.icon as any} size={22} color="#7C3AED" /></View>
                  <Text style={[st.benefitCardTitle, { color: C.text }]}>{t(b.titleKey)}</Text>
                  <Text style={[st.benefitCardDesc, { color: C.textLight }]}>{t(b.descKey)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },

  // Compact Header
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14 },
  headerInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerGreeting: { fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#fff', marginTop: 2 },
  headerRight: { alignItems: 'flex-end' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  headerStat: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 },

  // Mobile Search
  mobileSearch: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  mobileSearchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  mobileSearchArrow: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' },
  searchPlaceholder: { fontSize: 13, flex: 1 },

  // Categories
  catRow: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  catPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  catText: { fontSize: 12, fontWeight: '600' },

  // Main Layout
  main: { paddingHorizontal: 16, marginTop: 4 },
  mainDesktop: { flexDirection: 'row', gap: 20, maxWidth: 1400, alignSelf: 'center', width: '100%' },
  vehicleCol: { flex: 1 },
  sidebarCol: { width: 280, paddingTop: 4 },

  // Results Row
  resultsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingHorizontal: 4 },
  resultsText: { fontSize: 14, fontWeight: '600' },
  viewAll: { fontSize: 13, fontWeight: '600', color: '#7C3AED' },

  // Vehicle Grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridMobile: { flexDirection: 'column' },
  gridDesktop: { justifyContent: 'flex-start' },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, marginTop: 10 },

  // Search Panel (Desktop Sidebar)
  searchPanel: { borderRadius: 14, borderWidth: 1, padding: 18, marginBottom: 14 },
  searchTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 14 },
  filterLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  filterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  filterChipText: { fontSize: 11, fontWeight: '600' },
  statsBox: { flexDirection: 'row', justifyContent: 'space-around', borderRadius: 10, padding: 12, marginBottom: 14 },
  stat: { alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 10, textTransform: 'uppercase', marginTop: 2 },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#7C3AED', borderRadius: 10, paddingVertical: 12 },
  ctaBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Benefits sidebar
  benefitsCard: { borderRadius: 14, borderWidth: 1, padding: 16 },
  benefitsTitle: { fontSize: 14, fontWeight: '700', marginBottom: 12 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  benefitIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(124, 58, 237, 0.08)', alignItems: 'center', justifyContent: 'center' },
  benefitText: { fontSize: 13, fontWeight: '500', flex: 1 },

  // Mobile Benefits
  mobileBenefits: { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  benefitsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  benefitCard: { width: '48%', minWidth: 150, borderRadius: 12, borderWidth: 1, padding: 14 },
  benefitIconBig: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(124, 58, 237, 0.08)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  benefitCardTitle: { fontSize: 13, fontWeight: '700', marginBottom: 3 },
  benefitCardDesc: { fontSize: 11, lineHeight: 15 },
});
