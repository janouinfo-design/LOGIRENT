import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Platform, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api/axios';
import { useThemeStore } from '../../src/store/themeStore';

const PRESETS = [
  { label: 'Gmail', host: 'smtp.gmail.com', port: 587, tls: true, note: 'Utilisez un mot de passe d\'application Google' },
  { label: 'Outlook/Office 365', host: 'smtp.office365.com', port: 587, tls: true, note: '' },
  { label: 'Infomaniak', host: 'mail.infomaniak.com', port: 587, tls: true, note: '' },
  { label: 'OVH', host: 'ssl0.ovh.net', port: 587, tls: true, note: '' },
  { label: 'Personnalise', host: '', port: 587, tls: true, note: '' },
];

export default function EmailSettingsScreen() {
  const C = useThemeStore(s => s.colors);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [agencyName, setAgencyName] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('587');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordSet, setPasswordSet] = useState(false);
  const [useTls, setUseTls] = useState(true);
  const [senderName, setSenderName] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await api.get('/api/admin/smtp-config');
      const smtp = res.data.smtp_config || {};
      setAgencyName(res.data.agency_name || '');
      setHost(smtp.host || '');
      setPort(String(smtp.port || 587));
      setEmail(smtp.email || '');
      setUseTls(smtp.use_tls !== false);
      setSenderName(smtp.sender_name || '');
      setPasswordSet(!!smtp.password_set);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!host || !email) {
      const msg = 'Veuillez remplir au moins le serveur SMTP et l\'email';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Erreur', msg);
      return;
    }
    setSaving(true);
    try {
      await api.put('/api/admin/smtp-config', { host, port: parseInt(port), email, password, use_tls: useTls, sender_name: senderName });
      const msg = 'Configuration SMTP sauvegardee !';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Succes', msg);
      setPasswordSet(true);
      setPassword('');
    } catch (e: any) {
      const msg = e?.response?.data?.detail || 'Erreur';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Erreur', msg);
    } finally { setSaving(false); }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.post('/api/admin/smtp-test', { host, port: parseInt(port), email, password, use_tls: useTls, sender_name: senderName, test_email: testEmail || undefined });
      setTestResult({ success: true, message: res.data.message });
    } catch (e: any) {
      setTestResult({ success: false, message: e?.response?.data?.detail || 'Echec du test' });
    } finally { setTesting(false); }
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    if (preset.host) setHost(preset.host);
    setPort(String(preset.port));
    setUseTls(preset.tls);
  };

  if (loading) return <View style={[s.container, { backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={C.accent} /></View>;

  return (
    <ScrollView style={[s.container, { backgroundColor: C.bg }]} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {/* Header */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{ color: C.text, fontSize: 22, fontWeight: '900' }}>Configuration Email</Text>
        <Text style={{ color: C.textLight, fontSize: 13, marginTop: 4 }}>
          Configurez le serveur SMTP de votre agence pour envoyer les emails depuis votre propre adresse
        </Text>
      </View>

      {/* Status */}
      <View style={[s.card, { backgroundColor: C.card, borderColor: C.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: host && email && passwordSet ? '#F0FDF4' : '#FEF2F2', justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name={host && email && passwordSet ? 'checkmark-circle' : 'warning'} size={22} color={host && email && passwordSet ? '#10B981' : '#EF4444'} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.text, fontSize: 14, fontWeight: '700' }}>{agencyName}</Text>
            <Text style={{ color: host && email && passwordSet ? '#10B981' : '#EF4444', fontSize: 12, fontWeight: '600' }}>
              {host && email && passwordSet ? `SMTP configure: ${email}` : 'SMTP non configure - les emails utilisent le serveur par defaut'}
            </Text>
          </View>
        </View>
      </View>

      {/* Presets */}
      <View style={[s.card, { backgroundColor: C.card, borderColor: C.border }]}>
        <Text style={[s.sectionTitle, { color: C.text }]}>Preselection du serveur</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {PRESETS.map((p, i) => (
            <TouchableOpacity key={i} onPress={() => applyPreset(p)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: host === p.host ? '#3B82F6' : C.border, backgroundColor: host === p.host ? '#EFF6FF' : C.bg }} data-testid={`preset-${p.label.toLowerCase().replace(/[^a-z]/g, '')}`}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: host === p.host ? '#3B82F6' : C.textLight }}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* SMTP Config */}
      <View style={[s.card, { backgroundColor: C.card, borderColor: C.border }]}>
        <Text style={[s.sectionTitle, { color: C.text }]}>Serveur SMTP</Text>

        <Text style={[s.label, { color: C.textLight }]}>Nom d'expediteur</Text>
        <TextInput value={senderName} onChangeText={setSenderName} placeholder="Ex: AbiCar Location" placeholderTextColor="#94A3B8" style={[s.input, { borderColor: C.border, color: C.text, backgroundColor: C.bg }]} data-testid="sender-name-input" />

        <Text style={[s.label, { color: C.textLight }]}>Serveur SMTP</Text>
        <TextInput value={host} onChangeText={setHost} placeholder="smtp.gmail.com" placeholderTextColor="#94A3B8" style={[s.input, { borderColor: C.border, color: C.text, backgroundColor: C.bg }]} data-testid="smtp-host-input" />

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={[s.label, { color: C.textLight }]}>Port</Text>
            <TextInput value={port} onChangeText={setPort} keyboardType="numeric" style={[s.input, { borderColor: C.border, color: C.text, backgroundColor: C.bg }]} data-testid="smtp-port-input" />
          </View>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 20 }}>
            <Text style={{ color: C.text, fontSize: 13, fontWeight: '600' }}>TLS/STARTTLS</Text>
            <Switch value={useTls} onValueChange={setUseTls} trackColor={{ false: '#E2E8F0', true: '#3B82F6' }} />
          </View>
        </View>

        <Text style={[s.label, { color: C.textLight }]}>Adresse email</Text>
        <TextInput value={email} onChangeText={setEmail} placeholder="contact@votreagence.ch" placeholderTextColor="#94A3B8" keyboardType="email-address" autoCapitalize="none" style={[s.input, { borderColor: C.border, color: C.text, backgroundColor: C.bg }]} data-testid="smtp-email-input" />

        <Text style={[s.label, { color: C.textLight }]}>Mot de passe {passwordSet && !password ? '(deja configure)' : ''}</Text>
        <TextInput value={password} onChangeText={setPassword} placeholder={passwordSet ? '••••••••' : 'Mot de passe SMTP'} placeholderTextColor="#94A3B8" secureTextEntry style={[s.input, { borderColor: C.border, color: C.text, backgroundColor: C.bg }]} data-testid="smtp-password-input" />

        <TouchableOpacity onPress={handleSave} disabled={saving} style={[s.primaryBtn, { opacity: saving ? 0.6 : 1 }]} data-testid="save-smtp-btn">
          {saving ? <ActivityIndicator color="#fff" size="small" /> : (
            <>
              <Ionicons name="save" size={18} color="#fff" />
              <Text style={s.primaryBtnText}>Sauvegarder</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Test */}
      <View style={[s.card, { backgroundColor: C.card, borderColor: C.border }]}>
        <Text style={[s.sectionTitle, { color: C.text }]}>Tester la configuration</Text>

        <Text style={[s.label, { color: C.textLight }]}>Email de test (optionnel)</Text>
        <TextInput value={testEmail} onChangeText={setTestEmail} placeholder="votre@email.com" placeholderTextColor="#94A3B8" keyboardType="email-address" autoCapitalize="none" style={[s.input, { borderColor: C.border, color: C.text, backgroundColor: C.bg }]} data-testid="test-email-input" />

        <TouchableOpacity onPress={handleTest} disabled={testing} style={[s.secondaryBtn, { borderColor: C.border, opacity: testing ? 0.6 : 1 }]} data-testid="test-smtp-btn">
          {testing ? <ActivityIndicator color="#3B82F6" size="small" /> : (
            <>
              <Ionicons name="send" size={16} color="#3B82F6" />
              <Text style={{ color: '#3B82F6', fontSize: 14, fontWeight: '700' }}>Envoyer un email de test</Text>
            </>
          )}
        </TouchableOpacity>

        {testResult && (
          <View style={{ padding: 12, borderRadius: 10, backgroundColor: testResult.success ? '#F0FDF4' : '#FEF2F2', marginTop: 10, borderWidth: 1, borderColor: testResult.success ? '#A7F3D0' : '#FECACA' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name={testResult.success ? 'checkmark-circle' : 'close-circle'} size={18} color={testResult.success ? '#10B981' : '#EF4444'} />
              <Text style={{ color: testResult.success ? '#059669' : '#DC2626', fontSize: 13, fontWeight: '700', flex: 1 }}>{testResult.message}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={[s.card, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          <Ionicons name="information-circle" size={20} color="#3B82F6" />
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#334155', fontSize: 13, fontWeight: '700', marginBottom: 4 }}>Comment ca fonctionne ?</Text>
            <Text style={{ color: '#64748B', fontSize: 12, lineHeight: 18 }}>
              Les emails (confirmations, rappels, factures) seront envoyes depuis votre adresse email.
              Vos clients verront votre nom et pourront repondre directement a votre agence.
              {'\n\n'}Si la configuration SMTP echoue, le systeme utilise automatiquement le serveur par defaut.
              {'\n\n'}Pour Gmail: activez la verification en 2 etapes puis creez un "Mot de passe d'application" dans les parametres de securite Google.
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  card: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '800', marginBottom: 12 },
  label: { fontSize: 11, fontWeight: '600', marginBottom: 4, marginTop: 10 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#1E3A5F', paddingVertical: 14, borderRadius: 12, marginTop: 16 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, paddingVertical: 12, borderRadius: 10 },
});
