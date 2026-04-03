import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../src/store/themeStore';
import api from '../../src/api/axios';

const ACCENT = '#7C3AED';

export default function BillingSettingsScreen() {
  const { colors: C } = useThemeStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    company_name: '',
    street: '',
    house_number: '',
    pcode: '',
    city: '',
    country: 'CH',
    phone: '',
    email: '',
    website: '',
    iban: '',
    vat_number: '',
  });

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/api/admin/billing-settings');
        setForm(prev => ({ ...prev, ...res.data }));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/api/admin/billing-settings', form);
      Alert.alert('Succes', 'Parametres de facturation sauvegardes');
    } catch (e: any) {
      Alert.alert('Erreur', e.response?.data?.detail || 'Erreur de sauvegarde');
    }
    setSaving(false);
  };

  const updateField = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  if (loading) return <View style={[s.center, { backgroundColor: C.bg }]}><ActivityIndicator size="large" color={ACCENT} /></View>;

  const fields: { key: string; label: string; icon: string; placeholder: string; half?: boolean }[] = [
    { key: 'company_name', label: 'Raison sociale', icon: 'business', placeholder: 'LogiRent SA' },
    { key: 'street', label: 'Rue', icon: 'location', placeholder: 'Rue du Mont-Blanc' },
    { key: 'house_number', label: 'Numero', icon: 'keypad', placeholder: '12', half: true },
    { key: 'pcode', label: 'NPA', icon: 'navigate', placeholder: '1201', half: true },
    { key: 'city', label: 'Ville', icon: 'map', placeholder: 'Geneve' },
    { key: 'country', label: 'Pays', icon: 'globe', placeholder: 'CH', half: true },
    { key: 'phone', label: 'Telephone', icon: 'call', placeholder: '+41 22 123 45 67' },
    { key: 'email', label: 'Email facturation', icon: 'mail', placeholder: 'facturation@logirent.ch' },
    { key: 'website', label: 'Site web', icon: 'globe-outline', placeholder: 'www.logirent.ch' },
    { key: 'vat_number', label: 'Numero TVA', icon: 'receipt', placeholder: 'CHE-123.456.789 TVA' },
  ];

  return (
    <View style={[s.container, { backgroundColor: C.bg }]} data-testid="billing-settings-page">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
        <Text style={[s.title, { color: C.text }]}>Parametres de facturation</Text>
        <Text style={{ color: C.textLight, fontSize: 13, marginBottom: 20 }}>
          Ces informations apparaitront sur vos factures et QR-factures suisses.
        </Text>

        {/* IBAN Section - Highlighted */}
        <View style={s.ibanSection} data-testid="iban-section">
          <View style={s.ibanHeader}>
            <Ionicons name="card" size={22} color="#fff" />
            <Text style={s.ibanTitle}>IBAN / QR-IBAN</Text>
          </View>
          <Text style={s.ibanDesc}>
            Votre IBAN sera utilise pour generer les QR-factures suisses. Pour un QR-IBAN (references structurees), utilisez un compte avec prefixe 30000-31999.
          </Text>
          <TextInput
            style={s.ibanInput}
            placeholder="CH93 0076 2011 6238 5295 7"
            placeholderTextColor="#9CA3AF"
            value={form.iban}
            onChangeText={v => updateField('iban', v)}
            autoCapitalize="characters"
            data-testid="iban-input"
          />
          {form.iban && (
            <View style={s.ibanBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
              <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '600' }}>
                {form.iban.replace(/\s/g, '').length >= 21 ? 'IBAN valide' : 'IBAN incomplet'}
              </Text>
            </View>
          )}
        </View>

        {/* Company Info Fields */}
        <View style={s.fieldsSection}>
          <Text style={[s.sectionTitle, { color: C.text }]}>Coordonnees societe</Text>
          <View style={s.fieldsGrid}>
            {fields.map(f => (
              <View key={f.key} style={[s.fieldWrapper, f.half && { flex: 0.48 }]}>
                <Text style={[s.fieldLabel, { color: C.textLight }]}>{f.label}</Text>
                <View style={[s.fieldInput, { borderColor: C.border, backgroundColor: C.card }]}>
                  <Ionicons name={f.icon as any} size={16} color={C.textLight} />
                  <TextInput
                    style={[s.fieldText, { color: C.text }]}
                    placeholder={f.placeholder}
                    placeholderTextColor={C.textLight}
                    value={(form as any)[f.key]}
                    onChangeText={v => updateField(f.key, v)}
                    data-testid={`field-${f.key}`}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Preview */}
        {form.company_name && (
          <View style={[s.previewCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[s.sectionTitle, { color: C.text }]}>Apercu facture</Text>
            <View style={s.previewContent}>
              <Text style={{ color: C.text, fontWeight: '800', fontSize: 15 }}>{form.company_name}</Text>
              {form.street && <Text style={{ color: C.textLight, fontSize: 13 }}>{form.street} {form.house_number}</Text>}
              {form.pcode && <Text style={{ color: C.textLight, fontSize: 13 }}>{form.pcode} {form.city}</Text>}
              {form.phone && <Text style={{ color: C.textLight, fontSize: 13 }}>{form.phone}</Text>}
              {form.email && <Text style={{ color: C.textLight, fontSize: 13 }}>{form.email}</Text>}
              {form.iban && <Text style={{ color: ACCENT, fontSize: 13, fontWeight: '700', marginTop: 6 }}>IBAN: {form.iban}</Text>}
              {form.vat_number && <Text style={{ color: C.textLight, fontSize: 12 }}>{form.vat_number}</Text>}
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[s.saveBtn, saving && { opacity: 0.5 }]}
          onPress={handleSave}
          disabled={saving}
          data-testid="save-billing-btn"
        >
          {saving ? <ActivityIndicator color="#fff" size="small" /> : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={s.saveBtnText}>Sauvegarder</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '900', marginBottom: 4 },
  ibanSection: { backgroundColor: '#111827', borderRadius: 16, padding: 18, marginBottom: 20 },
  ibanHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  ibanTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },
  ibanDesc: { color: '#9CA3AF', fontSize: 12, marginBottom: 12, lineHeight: 18 },
  ibanInput: { backgroundColor: '#1F2937', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 1, borderWidth: 1, borderColor: '#374151' },
  ibanBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  fieldsSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 12 },
  fieldsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  fieldWrapper: { flex: 1, minWidth: 200, marginBottom: 4 },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  fieldInput: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  fieldText: { flex: 1, fontSize: 14 },
  previewCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 20 },
  previewContent: { marginTop: 8 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: ACCENT, paddingVertical: 16, borderRadius: 14 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
