import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import Button from '../src/components/Button';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const COLORS = {
  primary: '#1E3A8A',
  secondary: '#F59E0B',
  background: '#F8FAFC',
  text: '#1E293B',
  textLight: '#64748B',
};

export default function WelcomeScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading]);

  return (
    <View style={styles.container}>
      <View style={styles.heroSection}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1598248649596-3fae8846c122?w=800' }}
          style={styles.heroImage}
          resizeMode="cover"
        />
        <View style={styles.overlay} />
        <View style={styles.heroContent}>
          <View style={styles.logoContainer}>
            <Ionicons name="car-sport" size={48} color="#FFFFFF" />
          </View>
          <Text style={styles.appName}>RentDrive</Text>
          <Text style={styles.tagline}>Premium Car Rental</Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Your Journey Starts Here</Text>
        <Text style={styles.subtitle}>
          Discover premium vehicles for every adventure. From city drives to mountain getaways.
        </Text>

        <View style={styles.features}>
          <View style={styles.feature}>
            <View style={styles.featureIcon}>
              <Ionicons name="shield-checkmark" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.featureText}>Insured Vehicles</Text>
          </View>
          <View style={styles.feature}>
            <View style={styles.featureIcon}>
              <Ionicons name="card" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.featureText}>Secure Payment</Text>
          </View>
          <View style={styles.feature}>
            <View style={styles.featureIcon}>
              <Ionicons name="location" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.featureText}>Multiple Locations</Text>
          </View>
        </View>

        <View style={styles.buttons}>
          <Button
            title="Get Started"
            onPress={() => router.push('/(auth)/register')}
            size="large"
          />
          <Button
            title="I already have an account"
            onPress={() => router.push('/(auth)/login')}
            variant="ghost"
            size="large"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  heroSection: {
    height: height * 0.4,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(30, 58, 138, 0.7)',
  },
  heroContent: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 24,
    paddingTop: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 40,
  },
  feature: {
    alignItems: 'center',
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(30, 58, 138, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '500',
  },
  buttons: {
    gap: 12,
  },
});
