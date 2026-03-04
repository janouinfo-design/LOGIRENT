import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../src/context/AuthContext';
import { colors, fontSize, spacing, borderRadius, shadows } from '../src/theme/constants';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Veuillez remplir tous les champs');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.leftPanel}>
        <View style={styles.brandContent}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoText}>TS</Text>
          </View>
          <Text style={styles.brandTitle}>TimeSheet</Text>
          <Text style={styles.brandSubtitle}>Plateforme de gestion du temps{"\n"}pour entreprises suisses</Text>
          <View style={styles.features}>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>{'✓'}</Text>
              <Text style={styles.featureText}>Pointage & suivi du temps</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>{'✓'}</Text>
              <Text style={styles.featureText}>Gestion de projets & clients</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>{'✓'}</Text>
              <Text style={styles.featureText}>Rapports & facturation</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>{'✓'}</Text>
              <Text style={styles.featureText}>Conforme au droit suisse</Text>
            </View>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.rightPanel}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Connexion</Text>
          <Text style={styles.formSubtitle}>Accédez à votre espace de travail</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Adresse email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="nom@entreprise.ch"
              placeholderTextColor={colors.textLight}
              keyboardType="email-address"
              autoCapitalize="none"
              data-testid="login-email-input"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mot de passe</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Votre mot de passe"
              placeholderTextColor={colors.textLight}
              secureTextEntry
              data-testid="login-password-input"
            />
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            data-testid="login-submit-button"
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.loginBtnText}>Se connecter</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.background,
  },
  leftPanel: {
    flex: 1,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  brandContent: {
    maxWidth: 400,
  },
  logoIcon: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  logoText: {
    color: '#FFF',
    fontSize: fontSize.xxl,
    fontWeight: '800',
  },
  brandTitle: {
    color: '#FFF',
    fontSize: fontSize.xxxl,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  brandSubtitle: {
    color: '#94A3B8',
    fontSize: fontSize.md,
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  features: {
    gap: spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  featureIcon: {
    color: colors.success,
    fontSize: fontSize.md,
    marginRight: spacing.sm,
    fontWeight: '700',
  },
  featureText: {
    color: '#CBD5E1',
    fontSize: fontSize.sm,
  },
  rightPanel: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
    backgroundColor: colors.surface,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
  },
  formTitle: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  formSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    marginBottom: spacing.xl,
  },
  errorBox: {
    backgroundColor: colors.errorLight,
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSize.sm,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: fontSize.md,
    color: colors.text,
    backgroundColor: colors.background,
  },
  loginBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  loginBtnDisabled: {
    opacity: 0.7,
  },
  loginBtnText: {
    color: '#FFF',
    fontSize: fontSize.md,
    fontWeight: '700',
  },
});
