import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

const C = {
  primary: '#7C3AED',
  bg: '#F8FAFC',
  card: '#FFFFFF',
  text: '#1E293B',
  textLight: '#64748B',
  border: '#E2E8F0',
  error: '#EF4444',
  success: '#10B981',
};

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSendCode = async () => {
    if (!email) { setError('Veuillez entrer votre email'); return; }
    setError(''); setLoading(true);
    try {
      await axios.post(`${API_URL}/api/auth/forgot-password`, { email });
      setSuccess('Un code de réinitialisation a été envoyé à votre email');
      setStep('code');
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Erreur');
    } finally { setLoading(false); }
  };

  const handleResetPassword = async () => {
    if (!code || !newPassword) { setError('Veuillez remplir tous les champs'); return; }
    if (newPassword.length < 6) { setError('Le mot de passe doit contenir au moins 6 caractères'); return; }
    setError(''); setLoading(true);
    try {
      await axios.post(`${API_URL}/api/auth/reset-password`, { code: code.trim().toUpperCase(), new_password: newPassword });
      setSuccess('Mot de passe réinitialisé avec succès !');
      setTimeout(() => router.replace('/login' as any), 2000);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Code invalide ou expiré');
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()} data-testid="forgot-back-btn">
            <Ionicons name="arrow-back" size={24} color={C.text} />
          </TouchableOpacity>

          <View style={s.header}>
            <View style={s.iconWrap}>
              <Ionicons name="key" size={40} color={C.primary} />
            </View>
            <Text style={s.title}>Mot de passe oublié</Text>
            <Text style={s.subtitle}>
              {step === 'email'
                ? 'Entrez votre email pour recevoir un code de réinitialisation'
                : 'Entrez le code reçu par email et votre nouveau mot de passe'}
            </Text>
          </View>

          {error ? (
            <View style={s.banner}>
              <Ionicons name="alert-circle" size={18} color={C.error} />
              <Text style={s.bannerText}>{error}</Text>
            </View>
          ) : null}

          {success ? (
            <View style={[s.banner, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="checkmark-circle" size={18} color={C.success} />
              <Text style={[s.bannerText, { color: C.success }]}>{success}</Text>
            </View>
          ) : null}

          <View style={s.form}>
            {step === 'email' ? (
              <>
                <View style={s.inputGroup}>
                  <Text style={s.label}>Email</Text>
                  <View style={s.inputBox}>
                    <Ionicons name="mail-outline" size={20} color={C.textLight} />
                    <TextInput
                      style={s.input}
                      placeholder="votre@email.com"
                      placeholderTextColor={C.textLight}
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      data-testid="forgot-email-input"
                    />
                  </View>
                </View>
                <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleSendCode} disabled={loading} data-testid="forgot-send-btn">
                  <Text style={s.btnText}>{loading ? 'Envoi...' : 'Envoyer le code'}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={s.inputGroup}>
                  <Text style={s.label}>Code de réinitialisation</Text>
                  <View style={s.inputBox}>
                    <Ionicons name="shield-checkmark-outline" size={20} color={C.textLight} />
                    <TextInput
                      style={[s.input, { letterSpacing: 3, fontSize: 18, fontWeight: '700' }]}
                      placeholder="XXXXXXXX"
                      placeholderTextColor={C.textLight}
                      value={code}
                      onChangeText={setCode}
                      autoCapitalize="characters"
                      maxLength={8}
                      data-testid="forgot-code-input"
                    />
                  </View>
                </View>
                <View style={s.inputGroup}>
                  <Text style={s.label}>Nouveau mot de passe</Text>
                  <View style={s.inputBox}>
                    <Ionicons name="lock-closed-outline" size={20} color={C.textLight} />
                    <TextInput
                      style={s.input}
                      placeholder="Nouveau mot de passe"
                      placeholderTextColor={C.textLight}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showPassword}
                      data-testid="forgot-password-input"
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} data-testid="forgot-password-toggle">
                      <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={C.textLight} />
                    </TouchableOpacity>
                  </View>
                </View>
                <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleResetPassword} disabled={loading} data-testid="forgot-reset-btn">
                  <Text style={s.btnText}>{loading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.resendBtn} onPress={() => { setStep('email'); setError(''); setSuccess(''); }}>
                  <Text style={s.resendText}>Renvoyer le code</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity style={s.backLink} onPress={() => router.replace('/login' as any)}>
              <Ionicons name="arrow-back" size={16} color={C.primary} />
              <Text style={s.backLinkText}>Retour à la connexion</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, padding: 24 },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', marginBottom: 24, borderWidth: 1, borderColor: C.border },
  header: { alignItems: 'center', marginBottom: 32 },
  iconWrap: { width: 80, height: 80, borderRadius: 20, backgroundColor: '#F3EEFF', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', color: C.text, marginBottom: 8 },
  subtitle: { fontSize: 14, color: C.textLight, textAlign: 'center', lineHeight: 20 },
  banner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEE2E2', padding: 12, borderRadius: 10, marginBottom: 16, gap: 8 },
  bannerText: { color: C.error, fontSize: 13, flex: 1 },
  form: { gap: 16 },
  inputGroup: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: C.text },
  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, gap: 10, height: 52 },
  input: { flex: 1, color: C.text, fontSize: 15 },
  btn: { backgroundColor: C.primary, borderRadius: 12, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  resendBtn: { alignItems: 'center', paddingVertical: 10 },
  resendText: { color: C.primary, fontSize: 13, fontWeight: '600' },
  backLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, marginTop: 8 },
  backLinkText: { color: C.primary, fontSize: 14, fontWeight: '600' },
});
