import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, ScrollView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../../api/axios';

const C = { accent: '#7C3AED', bg: '#F9FAFB', card: '#FFF', text: '#111827', textLight: '#6B7280', border: '#E5E7EB', success: '#10B981', error: '#EF4444', warning: '#F59E0B', blue: '#2563EB' };

const SEVERITY_COLORS: Record<string, { bg: string; text: string }> = {
  leger: { bg: '#FEF3C7', text: '#92400E' },
  modere: { bg: '#FED7AA', text: '#9A3412' },
  important: { bg: '#FEE2E2', text: '#991B1B' },
};

const CONDITION_COLORS: Record<string, string> = {
  excellent: '#10B981',
  bon: '#3B82F6',
  moyen: '#F59E0B',
  mauvais: '#EF4444',
};

interface Props {
  inspectionId?: string;
  context: 'checkout' | 'checkin' | 'general';
  onAnalysisComplete?: (result: any) => void;
}

export default function DamageAnalyzer({ inspectionId, context, onAnalysisComplete }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const pickPhoto = () => {
    if (Platform.OS !== 'web') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string;
        setPreview(base64);
        setResult(null);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const analyzePhoto = async () => {
    if (!preview) return;
    setAnalyzing(true);
    try {
      const { data } = await api.post('/api/inspections/analyze-damage', {
        image_data: preview,
        context,
        inspection_id: inspectionId,
      });
      setResult(data);
      onAnalysisComplete?.(data);
    } catch (e: any) {
      console.error(e.response?.data || e.message);
      setResult({ damages_detected: false, summary: 'Erreur lors de l\'analyse', confidence: 0 });
    }
    setAnalyzing(false);
  };

  return (
    <View style={s.container} data-testid="damage-analyzer">
      <View style={s.header}>
        <Ionicons name="scan-outline" size={18} color={C.blue} />
        <Text style={s.title}>Detection de dommages IA</Text>
      </View>

      {!preview ? (
        <TouchableOpacity style={s.uploadArea} onPress={pickPhoto} data-testid="upload-photo-btn">
          <Ionicons name="camera-outline" size={32} color={C.accent} />
          <Text style={s.uploadText}>Prendre ou importer une photo</Text>
          <Text style={s.uploadHint}>L'IA analysera automatiquement les dommages</Text>
        </TouchableOpacity>
      ) : (
        <View>
          <View style={s.previewWrap}>
            <Image source={{ uri: preview }} style={s.previewImage} resizeMode="cover" />
            <TouchableOpacity style={s.removeBtn} onPress={() => { setPreview(null); setResult(null); }}>
              <Ionicons name="close" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>

          {!result && (
            <TouchableOpacity style={s.analyzeBtn} onPress={analyzePhoto} disabled={analyzing} data-testid="analyze-btn">
              {analyzing ? (
                <>
                  <ActivityIndicator size="small" color="#FFF" />
                  <Text style={s.analyzeBtnText}>Analyse en cours...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="eye-outline" size={16} color="#FFF" />
                  <Text style={s.analyzeBtnText}>Analyser les dommages</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {result && (
            <View style={s.resultCard} data-testid="damage-result">
              {/* Overall condition */}
              <View style={s.conditionRow}>
                <Text style={s.conditionLabel}>Etat general:</Text>
                <View style={[s.conditionBadge, { backgroundColor: (CONDITION_COLORS[result.overall_condition] || C.textLight) + '20' }]}>
                  <View style={[s.conditionDot, { backgroundColor: CONDITION_COLORS[result.overall_condition] || C.textLight }]} />
                  <Text style={[s.conditionText, { color: CONDITION_COLORS[result.overall_condition] || C.textLight }]}>
                    {result.overall_condition?.charAt(0).toUpperCase() + result.overall_condition?.slice(1)}
                  </Text>
                </View>
                <Text style={s.confidence}>Confiance: {result.confidence}%</Text>
              </View>

              {/* Summary */}
              <Text style={s.summary}>{result.summary}</Text>

              {/* Damages list */}
              {result.damages_detected && result.damages?.length > 0 ? (
                <View style={s.damagesList}>
                  <Text style={s.damagesTitle}>{result.damages.length} dommage(s) detecte(s)</Text>
                  {result.damages.map((d: any, i: number) => {
                    const sev = SEVERITY_COLORS[d.severite] || SEVERITY_COLORS.leger;
                    return (
                      <View key={i} style={[s.damageItem, { borderLeftColor: sev.text }]} data-testid={`damage-item-${i}`}>
                        <View style={s.damageHeader}>
                          <View style={[s.severityBadge, { backgroundColor: sev.bg }]}>
                            <Text style={[s.severityText, { color: sev.text }]}>{d.severite}</Text>
                          </View>
                          <Text style={s.damageType}>{d.type}</Text>
                          <Text style={s.damageZone}>{d.zone?.replace('_', ' ')}</Text>
                        </View>
                        <Text style={s.damageDesc}>{d.description}</Text>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={s.noDamage}>
                  <Ionicons name="checkmark-circle" size={24} color={C.success} />
                  <Text style={s.noDamageText}>Aucun dommage detecte</Text>
                </View>
              )}

              {/* Recommendations */}
              {result.recommendations?.length > 0 && (
                <View style={s.recoSection}>
                  <Text style={s.recoTitle}>Recommandations</Text>
                  {result.recommendations.map((r: string, i: number) => (
                    <View key={i} style={s.recoItem}>
                      <Ionicons name="information-circle-outline" size={14} color={C.blue} />
                      <Text style={s.recoText}>{r}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* New photo button */}
              <TouchableOpacity style={s.newPhotoBtn} onPress={() => { setPreview(null); setResult(null); }} data-testid="new-photo-btn">
                <Ionicons name="camera" size={14} color={C.accent} />
                <Text style={s.newPhotoBtnText}>Analyser une autre photo</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { marginTop: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  title: { fontSize: 14, fontWeight: '700', color: C.text },
  uploadArea: { alignItems: 'center', justifyContent: 'center', padding: 30, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed' as any, borderColor: C.border, backgroundColor: C.bg, gap: 6 },
  uploadText: { fontSize: 13, fontWeight: '600', color: C.text },
  uploadHint: { fontSize: 11, color: C.textLight },
  previewWrap: { position: 'relative' as any, borderRadius: 10, overflow: 'hidden', marginBottom: 10 },
  previewImage: { width: '100%', height: 200, borderRadius: 10 },
  removeBtn: { position: 'absolute' as any, top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 14, width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
  analyzeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.blue, paddingVertical: 12, borderRadius: 8 },
  analyzeBtnText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  resultCard: { backgroundColor: C.bg, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: C.border },
  conditionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  conditionLabel: { fontSize: 11, fontWeight: '600', color: C.textLight },
  conditionBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  conditionDot: { width: 8, height: 8, borderRadius: 4 },
  conditionText: { fontSize: 12, fontWeight: '700' },
  confidence: { fontSize: 10, color: C.textLight, marginLeft: 'auto' as any },
  summary: { fontSize: 12, color: C.text, lineHeight: 18, marginBottom: 10 },
  damagesList: { marginBottom: 10 },
  damagesTitle: { fontSize: 12, fontWeight: '700', color: C.error, marginBottom: 6 },
  damageItem: { backgroundColor: C.card, borderRadius: 8, padding: 10, marginBottom: 6, borderLeftWidth: 3 },
  damageHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  severityBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  severityText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' as any },
  damageType: { fontSize: 12, fontWeight: '600', color: C.text },
  damageZone: { fontSize: 10, color: C.textLight, fontStyle: 'italic' as any },
  damageDesc: { fontSize: 11, color: C.text, lineHeight: 16 },
  noDamage: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, backgroundColor: '#ECFDF5', borderRadius: 8 },
  noDamageText: { fontSize: 14, fontWeight: '700', color: C.success },
  recoSection: { marginTop: 8, padding: 10, backgroundColor: '#EFF6FF', borderRadius: 8 },
  recoTitle: { fontSize: 11, fontWeight: '700', color: C.blue, marginBottom: 6 },
  recoItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginBottom: 4 },
  recoText: { fontSize: 11, color: '#1E40AF', flex: 1 },
  newPhotoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, marginTop: 8, borderWidth: 1, borderColor: C.border, borderRadius: 8 },
  newPhotoBtnText: { fontSize: 12, fontWeight: '600', color: C.accent },
});
