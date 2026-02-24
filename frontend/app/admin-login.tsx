import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../src/store/authStore';
import Input from '../src/components/Input';
import Button from '../src/components/Button';

const COLORS = {
  primary: '#1E3A8A',
  secondary: '#F59E0B',
  background: '#F8FAFC',
  card: '#FFFFFF',
  text: '#1E293B',
  textLight: '#64748B',
  border: '#E2E8F0',
  error: '#EF4444',
  success: '#10B981',
};

export default function AdminLoginScreen() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading, loadUser } = useAuthStore();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/admin');
    }
  }, [isAuthenticated]);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login(email, password);
      router.replace('/admin');
    } catch (err: any) {
      setError(err.message || 'Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Chargement...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo Section */}
          <View style={styles.logoSection}>
            <View style={styles.logoContainer}>
              <Ionicons name="settings" size={48} color={COLORS.card} />
            </View>
            <Text style={styles.title}>Administration</Text>
            <Text style={styles.subtitle}>RentDrive Back-Office</Text>
          </View>

          {/* Login Form */}
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Connexion Admin</Text>
            <Text style={styles.formSubtitle}>
              Accédez au panneau d'administration
            </Text>

            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color={COLORS.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="admin@rentdrive.ch"
              keyboardType="email-address"
              autoCapitalize="none"
              icon="mail"
            />

            <Input
              label="Mot de passe"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              icon="lock-closed"
            />

            <Button
              title="Se connecter"
              onPress={handleLogin}
              loading={loading}
              style={styles.loginButton}
            />

            <Button
              title="Retour au site client"
              onPress={() => router.push('/')}
              variant="outline"
              style={styles.backButton}
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Ionicons name="shield-checkmark" size={16} color={COLORS.textLight} />
            <Text style={styles.footerText}>Accès sécurisé réservé aux administrateurs</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  formContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 24,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    flex: 1,
  },
  loginButton: {
    marginTop: 8,
  },
  backButton: {
    marginTop: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
});
