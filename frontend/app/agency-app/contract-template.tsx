import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api/axios';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeStore } from '../../src/store/themeStore';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

// ==================== Booking Options Section ====================
function BookingOptionsSection({ colors: C }: { colors: any }) {
  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  const fetchOptions = useCallback(async () => {
    try {
      const res = await api.get('/api/admin/booking-options');
      setOptions(res.data.options || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOptions(); }, [fetchOptions]);

  const saveOptions = async () => {
    setSaving(true);
    try {
      const res = await api.put('/api/admin/booking-options', { options });
      setOptions(res.data.options || []);
      setHasChanges(false);
      Alert.alert('Succès', 'Options de réservation mises à jour');
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de sauvegarder');
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = (idx: number) => {
    const updated = [...options];
    updated[idx] = { ...updated[idx], enabled: !updated[idx].enabled };
    setOptions(updated);
    setHasChanges(true);
  };

  const updateOptionPrice = (idx: number, val: string) => {
    const updated = [...options];
    updated[idx] = { ...updated[idx], price_per_day: parseFloat(val) || 0 };
    setOptions(updated);
    setHasChanges(true);
  };

  const updateOptionName = (idx: number, val: string) => {
    const updated = [...options];
    updated[idx] = { ...updated[idx], name: val };
    setOptions(updated);
    setHasChanges(true);
  };

  const removeOption = (idx: number) => {
    const updated = options.filter((_, i) => i !== idx);
    setOptions(updated);
    setHasChanges(true);
  };

  const addOption = () => {
    if (!newName.trim()) return;
    setOptions([...options, { name: newName.trim(), price_per_day: parseFloat(newPrice) || 0, enabled: true }]);
    setNewName('');
    setNewPrice('');
    setHasChanges(true);
  };

  if (loading) return <ActivityIndicator color={C.accent} style={{ marginVertical: 20 }} />;

  return (
    <View style={[optStyles.section, { backgroundColor: C.card, borderColor: C.border }]} data-testid="booking-options-section">
      <View style={optStyles.sectionHeader}>
        <Ionicons name="options-outline" size={18} color={C.accent} />
        <Text style={[optStyles.sectionTitle, { color: C.text }]}>Options de réservation</Text>
      </View>
      <Text style={[optStyles.hint, { color: C.textLight }]}>
        Options proposées aux clients lors de la réservation (GPS, siège enfant, etc.)
      </Text>

      {options.map((opt, idx) => (
        <View key={idx} style={[optStyles.optRow, { borderColor: C.border, backgroundColor: opt.enabled ? C.bg : C.bg + '80' }]} data-testid={`booking-option-row-${idx}`}>
          <TouchableOpacity onPress={() => toggleEnabled(idx)} style={optStyles.toggleBtn} data-testid={`toggle-option-${idx}`}>
            <Ionicons name={opt.enabled ? 'checkbox' : 'square-outline'} size={22} color={opt.enabled ? '#10B981' : C.textLight} />
          </TouchableOpacity>
          <View style={{ flex: 1, gap: 4 }}>
            <TextInput
              style={[optStyles.optNameInput, { color: C.text, borderColor: C.border }]}
              value={opt.name}
              onChangeText={v => updateOptionName(idx, v)}
              placeholder="Nom de l'option"
              placeholderTextColor={C.textLight + '60'}
              data-testid={`option-name-${idx}`}
            />
          </View>
          <View style={optStyles.priceWrap}>
            <Text style={[optStyles.priceLbl, { color: C.textLight }]}>CHF/jour</Text>
            <TextInput
              style={[optStyles.optPriceInput, { color: C.text, borderColor: C.border }]}
              value={String(opt.price_per_day || '')}
              onChangeText={v => updateOptionPrice(idx, v)}
              keyboardType="numeric"
              data-testid={`option-price-${idx}`}
            />
          </View>
          <TouchableOpacity onPress={() => removeOption(idx)} style={optStyles.removeBtn} data-testid={`remove-option-${idx}`}>
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      ))}

      {/* Add new option */}
      <View style={[optStyles.addRow, { borderColor: C.border }]}>
        <TextInput
          style={[optStyles.addInput, { color: C.text, borderColor: C.border, flex: 2 }]}
          value={newName}
          onChangeText={setNewName}
          placeholder="Nouvelle option"
          placeholderTextColor={C.textLight + '60'}
          data-testid="new-option-name"
        />
        <TextInput
          style={[optStyles.addInput, { color: C.text, borderColor: C.border, flex: 1 }]}
          value={newPrice}
          onChangeText={setNewPrice}
          placeholder="CHF/jour"
          placeholderTextColor={C.textLight + '60'}
          keyboardType="numeric"
          data-testid="new-option-price"
        />
        <TouchableOpacity style={[optStyles.addBtn, { backgroundColor: C.accent }]} onPress={addOption} data-testid="add-option-btn">
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {hasChanges && (
        <TouchableOpacity style={[optStyles.saveBtn, { backgroundColor: '#10B981' }]} onPress={saveOptions} disabled={saving} data-testid="save-options-btn">
          {saving ? <ActivityIndicator color="#fff" size="small" /> : (
            <>
              <Ionicons name="save" size={16} color="#fff" />
              <Text style={optStyles.saveBtnText}>Sauvegarder les options</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const optStyles = StyleSheet.create({
  section: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  hint: { fontSize: 11, marginBottom: 10 },
  optRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 8 },
  toggleBtn: { padding: 2 },
  optNameInput: { fontSize: 14, fontWeight: '600', borderBottomWidth: 1, paddingVertical: 2 },
  priceWrap: { alignItems: 'center', gap: 2 },
  priceLbl: { fontSize: 9, fontWeight: '600' },
  optPriceInput: { fontSize: 14, fontWeight: '700', textAlign: 'center', borderBottomWidth: 1, width: 60, paddingVertical: 2 },
  removeBtn: { padding: 4 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  addInput: { borderWidth: 1, borderRadius: 8, padding: 8, fontSize: 13 },
  addBtn: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, borderRadius: 10, marginTop: 10 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
// ==================== End Booking Options ====================

const PRICE_FIELDS = [
  { key: 'price_per_day', label: 'Par Jour (CHF)' },
  { key: 'price_weekend_fri', label: 'Week-end Ven-Lun' },
  { key: 'price_weekend_sat', label: 'Week-end Sam-Lun' },
  { key: 'price_hour', label: "A L'heure" },
  { key: 'price_week', label: 'Par Semaine' },
  { key: 'price_month_2000', label: 'Par Mois 2000 Km' },
  { key: 'price_month_3000', label: 'Par Mois 3000 Km' },
  { key: 'price_extra_km', label: 'Km Supplémentaire' },
];

export default function ContractTemplatePage() {
  const { token } = useAuthStore();
  const { colors: C } = useThemeStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [template, setTemplate] = useState<any>(null);
  const [legalText, setLegalText] = useState('');
  const [deductible, setDeductible] = useState('1000');
  const [website, setWebsite] = useState('');
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const fetchTemplate = useCallback(async () => {
    try {
      const res = await api.get('/api/admin/contract-template');
      const data = res.data;
      setTemplate(data);
      setLegalText(data.legal_text || '');
      setDeductible(data.deductible || '1000');
      setWebsite(data.agency_website || '');
      setPrices(data.default_prices || {});
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTemplate(); }, [fetchTemplate]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.put('/api/admin/contract-template', {
        legal_text: legalText,
        deductible,
        agency_website: website,
        default_prices: prices,
      });
      setTemplate(res.data);
      setHasChanges(false);
      Alert.alert('Succès', 'Modèle de contrat sauvegardé');
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de sauvegarder');
    } finally {
      setSaving(false);
    }
  };

  const uploadLogo = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingLogo(true);
        try {
          const formData = new FormData();
          formData.append('file', file);
          const res = await api.post('/api/admin/contract-template/logo', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          setTemplate((t: any) => ({ ...t, logo_path: res.data.logo_path }));
          Alert.alert('Succès', 'Logo téléchargé');
        } catch (err) {
          Alert.alert('Erreur', 'Upload échoué');
        } finally {
          setUploadingLogo(false);
        }
      };
      input.click();
    }
  };

  const deleteLogo = async () => {
    try {
      await api.delete('/api/admin/contract-template/logo');
      setTemplate((t: any) => ({ ...t, logo_path: null }));
    } catch (e) {}
  };

  const updatePrice = (key: string, val: string) => {
    setPrices(p => ({ ...p, [key]: val }));
    setHasChanges(true);
  };

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: C.bg }]}>
        <ActivityIndicator size="large" color={C.accent} />
      </View>
    );
  }

  const logoUrl = template?.logo_path
    ? `${API_URL}/api/vehicles/photo/${template.logo_path}`
    : null;

  return (
    <ScrollView style={[s.container, { backgroundColor: C.bg }]} contentContainerStyle={{ padding: 16, paddingBottom: 200 }}>
      <Text style={[s.pageTitle, { color: C.text }]} data-testid="template-page-title">Modèle de contrat</Text>
      <Text style={[s.pageSubtitle, { color: C.textLight }]}>
        Personnalisez le contrat pour votre agence
      </Text>

      {/* Logo Section */}
      <View style={[s.section, { backgroundColor: C.card, borderColor: C.border }]} data-testid="logo-section">
        <View style={s.sectionHeader}>
          <Ionicons name="image-outline" size={18} color={C.accent} />
          <Text style={[s.sectionTitle, { color: C.text }]}>Logo de l'agence</Text>
        </View>
        <Text style={[s.hint, { color: C.textLight }]}>
          Ce logo apparaîtra en haut du PDF du contrat
        </Text>
        {logoUrl ? (
          <View style={s.logoPreview}>
            <Image source={{ uri: logoUrl }} style={s.logoImg} resizeMode="contain" />
            <View style={s.logoActions}>
              <TouchableOpacity style={[s.btnSm, { backgroundColor: C.accent }]} onPress={uploadLogo} data-testid="change-logo-btn">
                <Ionicons name="swap-horizontal" size={14} color="#fff" />
                <Text style={s.btnSmText}>Changer</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btnSm, { backgroundColor: '#EF4444' }]} onPress={deleteLogo} data-testid="delete-logo-btn">
                <Ionicons name="trash" size={14} color="#fff" />
                <Text style={s.btnSmText}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={[s.uploadZone, { borderColor: C.border }]} onPress={uploadLogo} data-testid="upload-logo-btn">
            {uploadingLogo ? (
              <ActivityIndicator color={C.accent} />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={28} color={C.textLight} />
                <Text style={{ color: C.textLight, fontSize: 13, marginTop: 4 }}>Cliquez pour télécharger un logo</Text>
                <Text style={{ color: C.textLight, fontSize: 11 }}>PNG, JPG (max 5MB)</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Website & Deductible */}
      <View style={[s.section, { backgroundColor: C.card, borderColor: C.border }]}>
        <View style={s.sectionHeader}>
          <Ionicons name="globe-outline" size={18} color={C.accent} />
          <Text style={[s.sectionTitle, { color: C.text }]}>Informations agence</Text>
        </View>
        <View style={s.row}>
          <View style={s.fieldHalf}>
            <Text style={[s.label, { color: C.textLight }]}>Site web</Text>
            <TextInput
              style={[s.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
              value={website}
              onChangeText={v => { setWebsite(v); setHasChanges(true); }}
              placeholder="www.monagence.ch"
              placeholderTextColor={C.textLight + '60'}
              data-testid="website-input"
            />
          </View>
          <View style={s.fieldHalf}>
            <Text style={[s.label, { color: C.textLight }]}>Franchise (CHF)</Text>
            <TextInput
              style={[s.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
              value={deductible}
              onChangeText={v => { setDeductible(v); setHasChanges(true); }}
              placeholder="1000"
              placeholderTextColor={C.textLight + '60'}
              keyboardType="numeric"
              data-testid="deductible-input"
            />
          </View>
        </View>
      </View>

      {/* Default Prices */}
      <View style={[s.section, { backgroundColor: C.card, borderColor: C.border }]} data-testid="prices-section">
        <View style={s.sectionHeader}>
          <Ionicons name="cash-outline" size={18} color={C.accent} />
          <Text style={[s.sectionTitle, { color: C.text }]}>Tarifs par défaut</Text>
        </View>
        <Text style={[s.hint, { color: C.textLight }]}>
          Ces tarifs seront pré-remplis dans les nouveaux contrats
        </Text>
        <View style={s.priceGrid}>
          {PRICE_FIELDS.map(f => (
            <View key={f.key} style={s.priceField}>
              <Text style={[s.priceLabel, { color: C.textLight }]}>{f.label}</Text>
              <TextInput
                style={[s.priceInput, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
                value={prices[f.key] || ''}
                onChangeText={v => updatePrice(f.key, v)}
                placeholder="—"
                placeholderTextColor={C.textLight + '40'}
                keyboardType="numeric"
                data-testid={`price-${f.key}`}
              />
            </View>
          ))}
        </View>
      </View>

      {/* Booking Options */}
      <BookingOptionsSection colors={C} />

      {/* Legal Text */}
      <View style={[s.section, { backgroundColor: C.card, borderColor: C.border }]} data-testid="legal-section">
        <View style={s.sectionHeader}>
          <Ionicons name="document-text-outline" size={18} color={C.accent} />
          <Text style={[s.sectionTitle, { color: C.text }]}>Texte juridique</Text>
        </View>
        <Text style={[s.hint, { color: C.textLight }]}>
          Utilisez {'{website}'} et {'{franchise}'} comme variables dynamiques
        </Text>
        <TextInput
          style={[s.textarea, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
          value={legalText}
          onChangeText={v => { setLegalText(v); setHasChanges(true); }}
          multiline
          numberOfLines={10}
          textAlignVertical="top"
          data-testid="legal-text-input"
        />
      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={[s.saveBtn, { backgroundColor: hasChanges ? '#10B981' : C.textLight + '40' }]}
        onPress={save}
        disabled={saving || !hasChanges}
        data-testid="save-template-btn"
      >
        {saving ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Ionicons name="save" size={18} color="#fff" />
            <Text style={s.saveBtnText}>Sauvegarder le modèle</Text>
          </>
        )}
      </TouchableOpacity>

      {/* PDF Preview */}
      <View style={[s.section, { backgroundColor: C.card, borderColor: C.border, marginTop: 12 }]} data-testid="preview-section">
        <View style={s.sectionHeader}>
          <Ionicons name="eye-outline" size={18} color={C.accent} />
          <Text style={[s.sectionTitle, { color: C.text }]}>Aperçu du contrat PDF</Text>
        </View>
        <Text style={[s.hint, { color: C.textLight }]}>
          {hasChanges ? 'Sauvegardez d\'abord vos modifications, puis cliquez sur Aperçu' : 'Prévisualisation avec des données d\'exemple'}
        </Text>
        <TouchableOpacity
          style={[s.previewBtn, { backgroundColor: '#6366F1', opacity: hasChanges ? 0.5 : 1 }]}
          onPress={async () => {
            if (hasChanges) {
              Alert.alert('Attention', 'Sauvegardez d\'abord vos modifications avant de prévisualiser');
              return;
            }
            setLoadingPreview(true);
            try {
              const res = await api.get('/api/admin/contract-template/preview-pdf', {
                responseType: 'blob',
              });
              const url = URL.createObjectURL(res.data);
              setPreviewUrl(url);
            } catch (e) {
              Alert.alert('Erreur', 'Impossible de générer l\'aperçu');
            } finally {
              setLoadingPreview(false);
            }
          }}
          disabled={loadingPreview}
          data-testid="preview-btn"
        >
          {loadingPreview ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="document-outline" size={18} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>
                {previewUrl ? 'Rafraîchir l\'aperçu' : 'Générer l\'aperçu'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {previewUrl && Platform.OS === 'web' && (
          <View style={s.pdfFrame}>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8 }}
              onPress={() => window.open(previewUrl, '_blank')}
              data-testid="open-preview-tab"
            >
              <Ionicons name="open-outline" size={14} color="#6366F1" />
              <Text style={{ color: '#6366F1', fontSize: 12, fontWeight: '700' }}>Ouvrir dans un nouvel onglet</Text>
            </TouchableOpacity>
            {/* @ts-ignore - iframe works on web */}
            <iframe
              src={previewUrl}
              style={{ width: '100%', height: 800, border: '1px solid #E5E7EB', borderRadius: 8 }}
              title="Aperçu du contrat"
            />
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pageTitle: { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  pageSubtitle: { fontSize: 13, marginBottom: 16 },
  section: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  hint: { fontSize: 11, marginBottom: 10 },
  row: { flexDirection: 'row', gap: 12 },
  fieldHalf: { flex: 1 },
  label: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14 },
  textarea: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 13, minHeight: 200, lineHeight: 20 },
  priceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  priceField: { width: '48%', flexGrow: 1, flexBasis: '48%' },
  priceLabel: { fontSize: 11, fontWeight: '600', marginBottom: 3 },
  priceInput: { borderWidth: 1, borderRadius: 8, padding: 8, fontSize: 14, textAlign: 'center' },
  logoPreview: { alignItems: 'center', gap: 10 },
  logoImg: { width: 200, height: 80 },
  logoActions: { flexDirection: 'row', gap: 8 },
  btnSm: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  btnSmText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  uploadZone: { borderWidth: 2, borderStyle: 'dashed', borderRadius: 12, padding: 24, alignItems: 'center', justifyContent: 'center' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12, marginTop: 4 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  previewBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 10 },
  pdfFrame: { marginTop: 12, borderRadius: 8, overflow: 'hidden', height: 800 },
});
