import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../src/store/authStore';

const COLORS = {
  primary: '#6C2BD9',
  primaryDark: '#5521B5',
  background: '#F8FAFC',
  card: '#FFFFFF',
  text: '#1E293B',
  textLight: '#64748B',
  border: '#E2E8F0',
  error: '#EF4444',
  accent: '#7C3AED',
};

export default function AdminLogin() {
  const router = useRouter();
  const { user, isAuthenticated, adminLogin, registerAdmin } = useAuthStore();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      const role = user.role || 'client';
      if (role === 'super_admin') {
        router.replace('/super-admin');
      } else if (role === 'admin') {
        router.replace('/agency-app');
      }
    }
  }, [isAuthenticated, user]);

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        if (!name || !agencyName) {
          setError('Veuillez remplir tous les champs');
          setLoading(false);
          return;
        }
        await registerAdmin(email, password, name, agencyName);
        router.replace('/admin');
      } else {
        await adminLogin(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} data-testid="admin-login-back-btn">
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="shield-checkmark" size={40} color={COLORS.accent} />
            </View>
            <Text style={styles.title}>Administration</Text>
            <Text style={styles.subtitle}>
              {isRegister ? 'Créer une nouvelle agence' : 'Connectez-vous à votre espace admin'}
            </Text>
          </View>

          {error ? (
            <View style={styles.errorBanner} data-testid="admin-login-error">
              <Ionicons name="alert-circle" size={18} color={COLORS.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            {isRegister && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Nom complet</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="person-outline" size={20} color={COLORS.textLight} />
                    <TextInput
                      style={styles.input}
                      placeholder="Votre nom"
                      placeholderTextColor={COLORS.textLight}
                      value={name}
                      onChangeText={setName}
                      data-testid="admin-register-name"
                    />
                  </View>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Nom de l'agence</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="business-outline" size={20} color={COLORS.textLight} />
                    <TextInput
                      style={styles.input}
                      placeholder="Ex: LogiRent Lausanne"
                      placeholderTextColor={COLORS.textLight}
                      value={agencyName}
                      onChangeText={setAgencyName}
                      data-testid="admin-register-agency"
                    />
                  </View>
                </View>
              </>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color={COLORS.textLight} />
                <TextInput
                  style={styles.input}
                  placeholder="admin@agence.ch"
                  placeholderTextColor={COLORS.textLight}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  data-testid="admin-login-email"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mot de passe</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.textLight} />
                <TextInput
                  style={styles.input}
                  placeholder="Mot de passe"
                  placeholderTextColor={COLORS.textLight}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  data-testid="admin-login-password"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn} data-testid="admin-password-toggle">
                  <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={COLORS.textLight} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              data-testid="admin-login-submit"
            >
              <Text style={styles.submitText}>
                {loading ? 'Chargement...' : isRegister ? 'Créer mon agence' : 'Se connecter'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchBtn}
              onPress={() => { setIsRegister(!isRegister); setError(''); }}
              data-testid="admin-login-switch"
            >
              <Text style={styles.switchText}>
                {isRegister ? 'Déjà admin ? Se connecter' : 'Nouvelle agence ? Créer un compte'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.superAdminBtn}
              onPress={() => router.push('/super-admin' as any)}
              data-testid="super-admin-link"
            >
              <Ionicons name="shield" size={16} color={COLORS.accent} />
              <Text style={styles.superAdminText}>Super Admin</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { flexGrow: 1, padding: 24 },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', marginBottom: 24, borderWidth: 1, borderColor: COLORS.border },
  header: { alignItems: 'center', marginBottom: 32 },
  iconContainer: { width: 80, height: 80, borderRadius: 20, backgroundColor: '#F3EEFF', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  subtitle: { fontSize: 15, color: COLORS.textLight, textAlign: 'center' },
  errorBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEE2E2', padding: 12, borderRadius: 10, marginBottom: 16, gap: 8 },
  errorText: { color: COLORS.error, fontSize: 14, flex: 1 },
  form: { gap: 16 },
  inputGroup: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, gap: 10, height: 52 },
  input: { flex: 1, color: COLORS.text, fontSize: 15 },
  eyeBtn: { padding: 4 },
  submitBtn: { backgroundColor: COLORS.primary, borderRadius: 12, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  switchBtn: { alignItems: 'center', paddingVertical: 12 },
  switchText: { color: COLORS.accent, fontSize: 14, fontWeight: '500' },
  superAdminBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, marginTop: 8 },
  superAdminText: { color: COLORS.accent, fontSize: 13, fontWeight: '600' },
});
