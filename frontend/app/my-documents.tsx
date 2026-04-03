import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import api from '../src/api/axios';

const ACCENT = '#7C3AED';

const DOC_TYPES = [
  { key: 'id_card_front', label: 'Carte identite (recto)', icon: 'card', color: '#3B82F6' },
  { key: 'id_card_back', label: 'Carte identite (verso)', icon: 'card-outline', color: '#3B82F6' },
  { key: 'license_front', label: 'Permis conduire (recto)', icon: 'car', color: '#10B981' },
  { key: 'license_back', label: 'Permis conduire (verso)', icon: 'car-outline', color: '#10B981' },
];

const STATUS_MAP: Record<string, { bg: string; text: string; label: string; icon: string }> = {
  pending: { bg: '#F59E0B15', text: '#B45309', label: 'En verification', icon: 'time-outline' },
  validated: { bg: '#10B98115', text: '#059669', label: 'Valide', icon: 'checkmark-circle' },
  rejected: { bg: '#EF444415', text: '#DC2626', label: 'Rejete', icon: 'close-circle' },
};

export default function MyDocumentsScreen() {
  const router = useRouter();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);

  const fetchDocs = async () => {
    try {
      const res = await api.get('/api/documents/my');
      setDocuments(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDocs(); }, []);

  const getDocForType = (type: string) => documents.find(d => d.doc_type === type);

  const handleCapture = async (docType: string) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'Autorisez la camera pour scanner vos documents.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        base64: true,
        allowsEditing: true,
        aspect: [3, 2],
      });
      if (!result.canceled && result.assets[0]?.base64) {
        await uploadDoc(result.assets[0].base64, docType);
      }
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Erreur camera');
    }
  };

  const handleGallery = async (docType: string) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        base64: true,
        allowsEditing: true,
        aspect: [3, 2],
      });
      if (!result.canceled && result.assets[0]?.base64) {
        await uploadDoc(result.assets[0].base64, docType);
      }
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Erreur galerie');
    }
  };

  const uploadDoc = async (base64: string, docType: string) => {
    setUploading(docType);
    try {
      await api.post('/api/documents/upload-base64', {
        image: base64,
        doc_type: docType,
        filename: `${docType}.jpg`,
      });
      await fetchDocs();
      Alert.alert('Succes', 'Document envoye pour verification');
    } catch (e: any) {
      Alert.alert('Erreur', e.response?.data?.detail || 'Erreur upload');
    }
    setUploading(null);
  };

  if (loading) return <View style={s.loadingContainer}><ActivityIndicator size="large" color={ACCENT} /></View>;

  const completedCount = DOC_TYPES.filter(dt => {
    const d = getDocForType(dt.key);
    return d && d.status === 'validated';
  }).length;

  return (
    <View style={s.container} data-testid="my-documents-page">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} data-testid="docs-back-btn">
            <Ionicons name="arrow-back" size={22} color="#374151" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Mes documents</Text>
            <Text style={s.subtitle}>Scannez vos pieces d'identite et permis</Text>
          </View>
        </View>

        {/* Progress Card */}
        <View style={s.progressCard}>
          <View style={s.progressHeader}>
            <Ionicons name="shield-checkmark" size={24} color="#fff" />
            <Text style={s.progressTitle}>Verification d'identite</Text>
          </View>
          <Text style={s.progressDesc}>
            {completedCount}/4 documents valides
          </Text>
          <View style={s.progressBar}>
            <View style={[s.progressFill, { width: `${(completedCount / 4) * 100}%` }]} />
          </View>
          {completedCount < 4 && (
            <Text style={s.progressHint}>
              Scannez vos documents pour completer votre verification et pouvoir reserver.
            </Text>
          )}
        </View>

        {/* Document Cards */}
        {DOC_TYPES.map(dt => {
          const existing = getDocForType(dt.key);
          const sm = existing ? (STATUS_MAP[existing.status] || STATUS_MAP.pending) : null;
          const isUploading = uploading === dt.key;

          return (
            <View key={dt.key} style={s.docCard} data-testid={`doc-card-${dt.key}`}>
              <View style={s.docHeader}>
                <View style={[s.docIconWrap, { backgroundColor: dt.color + '15' }]}>
                  <Ionicons name={dt.icon as any} size={22} color={dt.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.docLabel}>{dt.label}</Text>
                  {sm && (
                    <View style={[s.statusBadge, { backgroundColor: sm.bg }]}>
                      <Ionicons name={sm.icon as any} size={12} color={sm.text} />
                      <Text style={{ color: sm.text, fontSize: 11, fontWeight: '700' }}>{sm.label}</Text>
                    </View>
                  )}
                </View>
              </View>

              {existing?.url && (
                <Image source={{ uri: existing.url }} style={s.docPreview} resizeMode="cover" />
              )}

              {isUploading ? (
                <View style={s.uploadingState}>
                  <ActivityIndicator color={ACCENT} />
                  <Text style={{ color: '#6B7280', fontSize: 13 }}>Envoi en cours...</Text>
                </View>
              ) : (
                <View style={s.docActions}>
                  <TouchableOpacity style={s.cameraBtn} onPress={() => handleCapture(dt.key)} data-testid={`camera-${dt.key}`}>
                    <Ionicons name="camera" size={18} color="#fff" />
                    <Text style={s.cameraBtnText}>{existing ? 'Rescanner' : 'Scanner'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.galleryBtn} onPress={() => handleGallery(dt.key)} data-testid={`gallery-${dt.key}`}>
                    <Ionicons name="images" size={18} color={ACCENT} />
                    <Text style={s.galleryBtnText}>Galerie</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}

        {/* Info */}
        <View style={s.infoCard}>
          <Ionicons name="information-circle" size={20} color="#3B82F6" />
          <Text style={s.infoText}>
            Vos documents sont stockes de maniere securisee et seront verifies par notre equipe dans les 24h.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  title: { fontSize: 22, fontWeight: '900', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6B7280' },
  progressCard: { backgroundColor: ACCENT, borderRadius: 16, padding: 18, marginBottom: 20 },
  progressHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  progressTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },
  progressDesc: { color: '#E9D5FF', fontSize: 14, fontWeight: '700', marginBottom: 10 },
  progressBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 3 },
  progressFill: { height: 6, backgroundColor: '#fff', borderRadius: 3, minWidth: 10 },
  progressHint: { color: '#E9D5FF', fontSize: 12, marginTop: 10, lineHeight: 18 },
  docCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  docHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  docIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  docLabel: { fontSize: 15, fontWeight: '700', color: '#111827' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start', marginTop: 4 },
  docPreview: { width: '100%', height: 140, borderRadius: 10, marginBottom: 12 },
  uploadingState: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  docActions: { flexDirection: 'row', gap: 10 },
  cameraBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#111827', paddingVertical: 12, borderRadius: 10 },
  cameraBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  galleryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: ACCENT, paddingVertical: 12, borderRadius: 10 },
  galleryBtnText: { color: ACCENT, fontSize: 14, fontWeight: '700' },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#EFF6FF', borderRadius: 12, padding: 14, marginTop: 8 },
  infoText: { flex: 1, color: '#1E40AF', fontSize: 13, lineHeight: 20 },
});
