import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useVehicleStore } from '../../src/store/vehicleStore';
import VehicleCard from '../../src/components/VehicleCard';
import { useI18n } from '../../src/i18n';

const LOGO_URL = 'https://static.prod-images.emergentagent.com/jobs/5f87ba17-413e-4204-98d4-1c8f25a6208a/images/6552fb693c88f79e17c59c43f1efe1446e03b6ddd3093a08b690934bdc28ae75.png';

const C = {
  purple: '#6B21A8',
  purpleLight: '#7C3AED',
  purpleDark: '#4C1D95',
  dark: '#1A1A2E',
  gray: '#6B7280',
  grayLight: '#9CA3AF',
  bg: '#FAFAFA',
  card: '#FFFFFF',
  text: '#111827',
  border: '#E5E7EB',
};

const vehicleTypes = [
  { id: 'all', icon: 'grid-outline' },
  { id: 'SUV', icon: 'car-sport-outline' },
  { id: 'berline', icon: 'car-outline' },
  { id: 'citadine', icon: 'car' },
  { id: 'utilitaire', icon: 'cube-outline' },
];

const typeNameMap: Record<string, Record<string, string>> = {
  fr: { all: 'Tous', SUV: 'SUV', berline: 'Berline', citadine: 'Citadine', utilitaire: 'Utilitaire' },
  en: { all: 'All', SUV: 'SUV', berline: 'Sedan', citadine: 'City Car', utilitaire: 'Utility' },
};

// Animated card wrapper for scroll animations
function AnimatedCard({ children, index }: { children: React.ReactNode; index: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    const delay = index * 80;
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, delay, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      {children}
    </Animated.View>
  );
}

function AnimatedSection({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, delay, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      {children}
    </Animated.View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { vehicles, fetchVehicles, setFilters } = useVehicleStore();
  const { lang, t } = useI18n();
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >

        {/* Hero Section */}
        <AnimatedSection delay={0}>
          <View style={styles.hero}>
            <View style={styles.heroBg} />
            <View style={styles.heroInner}>
              {/* Left Content */}
              <View style={styles.heroLeft}>
                <Text style={styles.heroGreeting}>{t('greeting')}</Text>
                <Text style={styles.heroTitle}>LogiRent</Text>
                <Text style={styles.heroSubtitle}>{t('heroSubtitle')}</Text>

                {/* Search Bar */}
                <View style={styles.heroSearch}>
                  <Ionicons name="search" size={18} color={C.gray} />
                  <TouchableOpacity
                    style={styles.heroSearchInput}
                    onPress={() => router.push('/(tabs)/vehicles')}
                    data-testid="hero-search"
                  >
                    <Text style={styles.heroSearchPlaceholder}>{t('searchPlaceholder')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.heroSearchBtn}
                    onPress={() => router.push('/(tabs)/vehicles')}
                  >
                    <Ionicons name="arrow-forward" size={16} color="#FFF" />
                  </TouchableOpacity>
                </View>

                {/* Stats */}
                <View style={styles.heroStats}>
                  <View style={styles.heroStat}>
                    <Text style={styles.heroStatNum}>{vehicles.length}+</Text>
                    <Text style={styles.heroStatLabel}>{lang === 'fr' ? 'Véhicules' : 'Vehicles'}</Text>
                  </View>
                  <View style={styles.heroStatDivider} />
                  <View style={styles.heroStat}>
                    <Text style={styles.heroStatNum}>500+</Text>
                    <Text style={styles.heroStatLabel}>{lang === 'fr' ? 'Clients' : 'Clients'}</Text>
                  </View>
                  <View style={styles.heroStatDivider} />
                  <View style={styles.heroStat}>
                    <Text style={styles.heroStatNum}>24/7</Text>
                    <Text style={styles.heroStatLabel}>{lang === 'fr' ? 'Support' : 'Support'}</Text>
                  </View>
                </View>
              </View>

              {/* Right Image */}
              <View style={styles.heroRight}>
                <Image
                  source={{ uri: 'https://images.unsplash.com/photo-1762602671608-06e044a71448?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTF8MHwxfHNlYXJjaHwyfHxsdXh1cnklMjBjYXIlMjByZW50YWwlMjBwcmVtaXVtfGVufDB8fHx8MTc3MjAxMzA3MXww&ixlib=rb-4.1.0&q=85' }}
                  style={styles.heroImage}
                  resizeMode="cover"
                />
              </View>
            </View>
          </View>
        </AnimatedSection>

        {/* Categories */}
        <AnimatedSection delay={200}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('categories')}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20 }}
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
                    <Ionicons name={type.icon as any} size={18} color={active ? '#FFFFFF' : C.purple} />
                    <Text style={[styles.catText, active && styles.catTextActive]}>
                      {typeNameMap[lang]?.[type.id] || type.id}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </AnimatedSection>

        {/* Vehicle Count */}
        <AnimatedSection delay={350}>
          <View style={styles.resultsRow}>
            <Text style={styles.resultsText}>
              {vehicles.length} {t('vehiclesCount')}
            </Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/vehicles')}>
              <Text style={styles.viewAll}>{t('viewAll')}</Text>
            </TouchableOpacity>
          </View>
        </AnimatedSection>

        {/* Vehicle Grid */}
        <View style={styles.vehicleGrid}>
          {vehicles.map((vehicle, index) => (
            <AnimatedCard key={vehicle.id} index={index}>
              <VehicleCard
                vehicle={vehicle}
                onPress={() => router.push(`/vehicle/${vehicle.id}`)}
                index={index}
              />
            </AnimatedCard>
          ))}
        </View>

        {vehicles.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="car-outline" size={48} color={C.grayLight} />
            <Text style={styles.emptyText}>Aucun véhicule trouvé</Text>
          </View>
        )}

        {/* Why LogiRent Section */}
        <AnimatedSection delay={500}>
          <View style={styles.whySection}>
            <Text style={styles.sectionTitle}>{t('whyUs')}</Text>
            <View style={styles.benefitsGrid}>
              {[
                { icon: 'car-sport', titleKey: 'benefit1Title' as const, descKey: 'benefit1Desc' as const },
                { icon: 'headset', titleKey: 'benefit2Title' as const, descKey: 'benefit2Desc' as const },
                { icon: 'pricetag', titleKey: 'benefit3Title' as const, descKey: 'benefit3Desc' as const },
                { icon: 'calendar-clear', titleKey: 'benefit4Title' as const, descKey: 'benefit4Desc' as const },
              ].map((benefit, i) => (
                <View key={i} style={styles.benefitCard}>
                  <View style={styles.benefitIcon}>
                    <Ionicons name={benefit.icon as any} size={24} color={C.purpleLight} />
                  </View>
                  <Text style={styles.benefitTitle}>{t(benefit.titleKey)}</Text>
                  <Text style={styles.benefitDesc}>{t(benefit.descKey)}</Text>
                </View>
              ))}
            </View>
          </View>
        </AnimatedSection>

        {/* CTA Banner */}
        <AnimatedSection delay={650}>
          <View style={styles.cta}>
            <Text style={styles.ctaTitle}>{t('ctaTitle')}</Text>
            <Text style={styles.ctaSub}>{t('ctaSubtitle')}</Text>
            <TouchableOpacity style={styles.ctaButton} onPress={() => router.push('/(tabs)/vehicles')}>
              <Text style={styles.ctaButtonText}>{t('ctaButton')}</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </AnimatedSection>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoImage: { width: 36, height: 36, borderRadius: 8 },
  logoText: { fontSize: 22, fontWeight: '800', color: C.dark },
  langSwitch: { flexDirection: 'row', gap: 6 },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  notifBtn: { position: 'relative', padding: 4 },
  notifBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notifBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '700' },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
  },
  langBtnActive: { backgroundColor: C.purpleDark, borderColor: C.purpleDark },
  langFlag: { fontSize: 14 },
  langLabel: { fontSize: 12, fontWeight: '600', color: C.gray },
  langLabelActive: { color: '#FFFFFF' },
  hero: {
    margin: 20,
    marginBottom: 0,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: C.dark,
    minHeight: 200,
  },
  heroBg: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '50%',
    height: '100%',
    backgroundColor: C.purpleDark,
    opacity: 0.3,
    borderTopLeftRadius: 100,
  },
  heroContent: { padding: 28 },
  heroGreeting: { fontSize: 13, color: C.grayLight, letterSpacing: 1, textTransform: 'uppercase' },
  heroTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 4,
    marginBottom: 10,
  },
  heroSubtitle: { fontSize: 14, color: C.grayLight, lineHeight: 20, maxWidth: 400 },
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
  },
  heroButtonText: { fontSize: 14, fontWeight: '700', color: C.dark },
  section: { marginTop: 28 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.text,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 25,
    backgroundColor: C.card,
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  catPillActive: { backgroundColor: C.purple, borderColor: C.purple },
  catText: { fontSize: 13, fontWeight: '600', color: C.text },
  catTextActive: { color: '#FFFFFF' },
  resultsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 28,
    marginBottom: 16,
  },
  resultsText: { fontSize: 14, fontWeight: '500', color: C.gray },
  viewAll: { fontSize: 13, fontWeight: '600', color: C.purpleLight },
  vehicleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 16,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    justifyContent: 'center',
  },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 15, color: C.grayLight, marginTop: 10 },
  whySection: { marginTop: 40 },
  benefitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 14,
  },
  benefitCard: {
    width: '47%',
    minWidth: 150,
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
  },
  benefitIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(107, 33, 168, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitTitle: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 4 },
  benefitDesc: { fontSize: 12, color: C.gray, lineHeight: 16 },
  cta: {
    margin: 20,
    backgroundColor: C.purple,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
  },
  ctaTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' },
  ctaSub: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 8, textAlign: 'center' },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
  },
  ctaButtonText: { fontSize: 14, fontWeight: '700', color: C.purple },
});
