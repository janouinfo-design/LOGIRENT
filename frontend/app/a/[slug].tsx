import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import VehicleCard from '../../src/components/VehicleCard';
import { Vehicle } from '../../src/store/vehicleStore';
import { useAuthStore } from '../../src/store/authStore';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

const C = {
  purple: '#7C3AED',
  purpleDark: '#5B21B6',
  purpleLight: '#EDE9FE',
  dark: '#1A1A2E',
  gray: '#6B7280',
  grayLight: '#F3F4F6',
  card: '#FFFFFF',
  bg: '#FAFAFA',
  border: '#E5E7EB',
};

interface AgencyInfo {
  id: string;
  name: string;
  slug: string;
  address?: string;
  phone?: string;
  email?: string;
  vehicle_count: number;
}

export default function AgencyPage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const { user, isAuthenticated } = useAuthStore();

  const [agency, setAgency] = useState<AgencyInfo | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (slug) loadAgency();
  }, [slug]);

  const loadAgency = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/public/agency/${slug}`);
      setAgency(res.data);
      const vehicleRes = await axios.get(`${API_URL}/api/vehicles?agency_id=${res.data.id}`);
      setVehicles(vehicleRes.data);
    } catch {
      setError('Agence introuvable');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = () => {
    if (agency) {
      router.push(`/(auth)/register?agency_id=${agency.id}&agency_name=${encodeURIComponent(agency.name)}`);
    }
  };

  const handleLogin = () => {
    if (agency) {
      router.push(`/(auth)/login?agency_id=${agency.id}&agency_name=${encodeURIComponent(agency.name)}`);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={C.purple} />
      </View>
    );
  }

  if (error || !agency) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color={C.gray} />
        <Text style={styles.errorText}>{error || 'Agence introuvable'}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.push('/')}>
          <Text style={styles.backBtnText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.heroOverlay}>
          <Text style={styles.heroLabel}>BIENVENUE CHEZ</Text>
          <Text style={[styles.heroTitle, isMobile && styles.heroTitleMobile]}>{agency.name}</Text>
          {agency.address && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color={C.purpleLight} />
              <Text style={styles.locationText}>{agency.address}</Text>
            </View>
          )}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statNum}>{agency.vehicle_count}</Text>
              <Text style={styles.statLabel}>Véhicules</Text>
            </View>
            {agency.phone && (
              <View style={styles.stat}>
                <Ionicons name="call-outline" size={16} color="#FFF" />
                <Text style={styles.statLabel}>{agency.phone}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Auth Section */}
      {!isAuthenticated && (
        <View style={styles.authSection} data-testid="agency-auth-section">
          <Text style={styles.authTitle}>Rejoignez {agency.name}</Text>
          <Text style={styles.authSub}>Créez votre compte pour réserver nos véhicules</Text>
          <View style={styles.authBtns}>
            <TouchableOpacity style={styles.registerBtn} onPress={handleRegister} data-testid="agency-register-btn">
              <Ionicons name="person-add-outline" size={16} color="#FFF" />
              <Text style={styles.registerBtnText}>Créer un compte</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} data-testid="agency-login-btn">
              <Text style={styles.loginBtnText}>Déjà inscrit ? Se connecter</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {isAuthenticated && user?.agency_id === agency.id && (
        <View style={styles.welcomeBack}>
          <Ionicons name="checkmark-circle" size={20} color={C.purple} />
          <Text style={styles.welcomeText}>Bienvenue, {user.name} !</Text>
        </View>
      )}

      {/* Vehicles */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Nos véhicules</Text>
        <Text style={styles.sectionCount}>{vehicles.length} disponibles</Text>
      </View>

      <View style={[styles.vehicleGrid, isMobile ? styles.vehicleGridMobile : styles.vehicleGridDesktop]}>
        {vehicles.map((vehicle, index) => (
          <View key={vehicle.id} style={isMobile ? { width: '100%' } : { width: '32%', minWidth: 300 }}>
            <VehicleCard
              vehicle={vehicle}
              onPress={() => router.push(`/vehicle/${vehicle.id}`)}
              index={index}
            />
          </View>
        ))}
      </View>

      {vehicles.length === 0 && (
        <View style={styles.empty}>
          <Ionicons name="car-outline" size={48} color={C.gray} />
          <Text style={styles.emptyText}>Aucun véhicule disponible</Text>
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        {agency.email && (
          <Text style={styles.footerText}>{agency.email}</Text>
        )}
        {agency.phone && (
          <Text style={styles.footerText}>{agency.phone}</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: 16, color: C.gray, marginTop: 12 },
  backBtn: { marginTop: 20, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: C.purple, borderRadius: 20 },
  backBtnText: { color: '#FFF', fontWeight: '600' },
  hero: { backgroundColor: C.dark, minHeight: 200 },
  heroOverlay: { padding: 24, paddingTop: 40 },
  heroLabel: { fontSize: 11, fontWeight: '600', color: C.purpleLight, letterSpacing: 2 },
  heroTitle: { fontSize: 32, fontWeight: '800', color: '#FFF', marginTop: 4 },
  heroTitleMobile: { fontSize: 26 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  locationText: { fontSize: 13, color: C.purpleLight },
  statsRow: { flexDirection: 'row', gap: 24, marginTop: 16 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statNum: { fontSize: 22, fontWeight: '800', color: '#FFF' },
  statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  authSection: { backgroundColor: C.card, marginHorizontal: 16, marginTop: -20, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: C.border },
  authTitle: { fontSize: 18, fontWeight: '700', color: C.dark },
  authSub: { fontSize: 13, color: C.gray, marginTop: 4 },
  authBtns: { marginTop: 14, gap: 10 },
  registerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.purple, paddingVertical: 12, borderRadius: 12 },
  registerBtnText: { fontSize: 15, fontWeight: '600', color: '#FFF' },
  loginBtn: { alignItems: 'center', paddingVertical: 10 },
  loginBtnText: { fontSize: 13, fontWeight: '500', color: C.purple },
  welcomeBack: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.purpleLight, marginHorizontal: 16, marginTop: 12, padding: 12, borderRadius: 12 },
  welcomeText: { fontSize: 14, fontWeight: '600', color: C.purpleDark },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 24, marginBottom: 12 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: C.dark },
  sectionCount: { fontSize: 13, color: C.gray },
  vehicleGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 14, maxWidth: 1200, alignSelf: 'center', width: '100%' },
  vehicleGridMobile: { flexDirection: 'column', alignItems: 'stretch' },
  vehicleGridDesktop: { justifyContent: 'flex-start', gap: 16 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 15, color: C.gray, marginTop: 10 },
  footer: { alignItems: 'center', paddingVertical: 24, marginTop: 20, borderTopWidth: 1, borderTopColor: C.border, gap: 4 },
  footerText: { fontSize: 12, color: C.gray },
});
