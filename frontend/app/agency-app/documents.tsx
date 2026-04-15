import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, TextInput, Alert, Modal, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useThemeStore } from '../../src/store/themeStore';
import api from '../../src/api/axios';

const ACCENT = '#7C3AED';

const DOC_TYPES = [
  { key: 'id_card_front', label: 'Carte ID (recto)', icon: 'card' },
  { key: 'id_card_back', label: 'Carte ID (verso)', icon: 'card-outline' },
  { key: 'license_front', label: 'Permis (recto)', icon: 'car' },
  { key: 'license_back', label: 'Permis (verso)', icon: 'car-outline' },
];

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: '#F59E0B15', text: '#B45309', label: 'En attente' },
  validated: { bg: '#10B98115', text: '#059669', label: 'Valide' },
  rejected: { bg: '#EF444415', text: '#DC2626', label: 'Rejete' },
};

export default function DocumentScanScreen() {
  const { colors: C } = useThemeStore();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showValidate, setShowValidate] = useState<any>(null);
  const [extractedData, setExtractedData] = useState<Record<string, string>>({});
  const [searchClient, setSearchClient] = useState('');
  const [showPreview, setShowPreview] = useState<string | null>(null);
  const [ocrRunning, setOcrRunning] = useState<string | null>(null);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await api.get('/api/admin/users?role=client');
        const data = res.data.users || res.data;
        setClients(Array.isArray(data) ? data : []);
      } catch (e) { console.error(e); }
    };
    fetchClients();
  }, []);

  const fetchDocs = async (clientId: string) => {
    setLoading(true);
    try {
      const res = await api.get(`/api/documents/client/${clientId}`);
      setDocuments(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSelectClient = (client: any) => {
    setSelectedClient(client);
    fetchDocs(client.id);
  };

  const handleCapture = async (docType: string) => {
    if (Platform.OS === 'web') {
      // Web: use file input with capture attribute
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(docType);
        try {
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64 = (reader.result as string).split(',')[1];
            await uploadBase64(base64, docType, file.name || 'capture.jpg');
          };
          reader.readAsDataURL(file);
        } catch (err: any) {
          window.alert(err.message || 'Erreur camera');
          setUploading(null);
        }
      };
      input.click();
    } else {
      try {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission requise', 'Autorisez la camera pour scanner les documents.');
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
          await uploadBase64(result.assets[0].base64, docType, 'capture.jpg');
        }
      } catch (e: any) {
        Alert.alert('Erreur', e.message || 'Erreur camera');
      }
    }
  };

  const handleGallery = async (docType: string) => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(docType);
        try {
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64 = (reader.result as string).split(',')[1];
            await uploadBase64(base64, docType, file.name || 'photo.jpg');
          };
          reader.readAsDataURL(file);
        } catch (err: any) {
          window.alert(err.message || 'Erreur galerie');
          setUploading(null);
        }
      };
      input.click();
    } else {
      try {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.8,
          base64: true,
          allowsEditing: true,
          aspect: [3, 2],
        });
        if (!result.canceled && result.assets[0]?.base64) {
          await uploadBase64(result.assets[0].base64, docType, result.assets[0].fileName || 'photo.jpg');
        }
      } catch (e: any) {
        Alert.alert('Erreur', e.message || 'Erreur galerie');
      }
    }
  };

  const uploadBase64 = async (base64: string, docType: string, filename: string) => {
    if (!selectedClient) return;
    setUploading(true);
    try {
      await api.post('/api/documents/upload-base64', {
        image: base64,
        doc_type: docType,
        client_id: selectedClient.id,
        filename,
      });
      fetchDocs(selectedClient.id);
      Alert.alert('Succes', 'Document uploade - OCR en cours...');
      // Poll for OCR completion after a delay
      setTimeout(() => { if (selectedClient) fetchDocs(selectedClient.id); }, 5000);
      setTimeout(() => { if (selectedClient) fetchDocs(selectedClient.id); }, 12000);
    } catch (e: any) {
      Alert.alert('Erreur', e.response?.data?.detail || 'Erreur upload');
    }
    setUploading(false);
  };

  const triggerOcr = async (docId: string) => {
    setOcrRunning(docId);
    try {
      const res = await api.post(`/api/documents/${docId}/ocr`);
      if (res.data.extracted_data) {
        Alert.alert('OCR termine', `Confiance: ${res.data.confidence}%`);
      } else {
        Alert.alert('OCR', res.data.message || 'Extraction terminee');
      }
      if (selectedClient) fetchDocs(selectedClient.id);
    } catch (e: any) {
      Alert.alert('Erreur OCR', e.response?.data?.detail || 'Erreur');
    }
    setOcrRunning(null);
  };

  const handleValidate = async (status: string) => {
    if (!showValidate) return;
    try {
      await api.put(`/api/documents/${showValidate.id}/validate`, {
        status,
        extracted_data: extractedData,
      });
      setShowValidate(null);
      setExtractedData({});
      if (selectedClient) fetchDocs(selectedClient.id);
    } catch (e: any) {
      Alert.alert('Erreur', e.response?.data?.detail || 'Erreur validation');
    }
  };

  const filteredClients = clients.filter(c =>
    !searchClient || c.name?.toLowerCase().includes(searchClient.toLowerCase()) || c.email?.toLowerCase().includes(searchClient.toLowerCase())
  );

  return (
    <View style={[s.container, { backgroundColor: C.bg }]} data-testid="document-scan-page">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
        <Text style={[s.title, { color: C.text }]}>Scan de documents</Text>
        <Text style={{ color: C.textLight, fontSize: 13, marginBottom: 16 }}>
          Scannez les pieces d'identite et permis de vos clients. L'OCR IA extrait automatiquement les informations.
        </Text>

        <View style={[s.mainGrid, !isWide && { flexDirection: 'column' }]}>
          {/* Client Selector */}
          <View style={[s.clientPanel, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[s.panelTitle, { color: C.text }]}>Clients</Text>
            <View style={[s.searchBox, { borderColor: C.border }]}>
              <Ionicons name="search" size={16} color={C.textLight} />
              <TextInput
                style={[s.searchText, { color: C.text }]}
                placeholder="Rechercher..."
                placeholderTextColor={C.textLight}
                value={searchClient}
                onChangeText={setSearchClient}
              />
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {filteredClients.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[s.clientItem, { borderColor: C.border }, selectedClient?.id === c.id && { borderColor: ACCENT, backgroundColor: ACCENT + '08' }]}
                  onPress={() => handleSelectClient(c)}
                  data-testid={`client-${c.id}`}
                >
                  <View style={s.clientAvatar}>
                    <Text style={s.clientInitial}>{c.name?.[0]?.toUpperCase() || '?'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.text, fontWeight: '700', fontSize: 14 }}>{c.name}</Text>
                    <Text style={{ color: C.textLight, fontSize: 12 }}>{c.email}</Text>
                  </View>
                  {selectedClient?.id === c.id && <Ionicons name="checkmark-circle" size={20} color={ACCENT} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Document Area */}
          <View style={{ flex: 2 }}>
            {!selectedClient ? (
              <View style={s.emptyState}>
                <Ionicons name="person-circle-outline" size={64} color={C.textLight} />
                <Text style={{ color: C.textLight, fontSize: 16, fontWeight: '600', marginTop: 12 }}>Selectionnez un client</Text>
              </View>
            ) : (
              <>
                {/* Scan Buttons */}
                <View style={[s.scanSection, { backgroundColor: C.card, borderColor: C.border }]}>
                  <Text style={[s.panelTitle, { color: C.text }]}>Scanner un document pour {selectedClient.name}</Text>
                  {uploading && <ActivityIndicator color={ACCENT} style={{ marginVertical: 8 }} />}
                  <View style={s.docTypesGrid}>
                    {DOC_TYPES.map(dt => (
                      <View key={dt.key} style={[s.docTypeCard, { borderColor: C.border }]}>
                        <Ionicons name={dt.icon as any} size={24} color={ACCENT} />
                        <Text style={{ color: C.text, fontSize: 13, fontWeight: '700', textAlign: 'center' }}>{dt.label}</Text>
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                          <TouchableOpacity style={s.captureBtn} onPress={() => handleCapture(dt.key)} data-testid={`capture-${dt.key}`}>
                            <Ionicons name="camera" size={16} color="#fff" />
                            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>Camera</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={s.galleryBtn} onPress={() => handleGallery(dt.key)} data-testid={`gallery-${dt.key}`}>
                            <Ionicons name="images" size={16} color={ACCENT} />
                            <Text style={{ color: ACCENT, fontSize: 11, fontWeight: '700' }}>Galerie</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Existing Documents */}
                <View style={{ marginTop: 16 }}>
                  <Text style={[s.panelTitle, { color: C.text }]}>Documents ({documents.length})</Text>
                  {loading ? <ActivityIndicator color={ACCENT} /> : (
                    documents.length === 0 ? (
                      <View style={s.emptyDocs}>
                        <Ionicons name="documents-outline" size={36} color={C.textLight} />
                        <Text style={{ color: C.textLight, fontSize: 14 }}>Aucun document</Text>
                      </View>
                    ) : (
                      <View style={s.docsGrid}>
                        {documents.map(doc => {
                          const sc = STATUS_COLORS[doc.status] || STATUS_COLORS.pending;
                          return (
                            <View key={doc.id} style={[s.docCard, { backgroundColor: C.card, borderColor: C.border }]} data-testid={`doc-${doc.id}`}>
                              <TouchableOpacity onPress={() => setShowPreview(doc.url)} style={s.docImageWrap}>
                                <Image source={{ uri: doc.url }} style={s.docImage} resizeMode="cover" />
                                <View style={{ position: 'absolute', top: 6, left: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
                                  <Ionicons name="expand" size={12} color="#fff" />
                                </View>
                                <View style={[s.docStatusBadge, { backgroundColor: sc.bg }]}>
                                  <Text style={{ color: sc.text, fontSize: 10, fontWeight: '700' }}>{sc.label}</Text>
                                </View>
                                {doc.ocr_status && (
                                  <View style={[s.ocrBadge, {
                                    backgroundColor: doc.ocr_status === 'completed' ? '#10B98120' : doc.ocr_status === 'processing' ? '#F59E0B20' : '#EF444420'
                                  }]}>
                                    <Ionicons name={doc.ocr_status === 'completed' ? 'scan' : doc.ocr_status === 'processing' ? 'hourglass' : 'alert-circle'} size={10} color={doc.ocr_status === 'completed' ? '#059669' : doc.ocr_status === 'processing' ? '#B45309' : '#DC2626'} />
                                    <Text style={{ fontSize: 9, fontWeight: '700', color: doc.ocr_status === 'completed' ? '#059669' : doc.ocr_status === 'processing' ? '#B45309' : '#DC2626' }}>
                                      {doc.ocr_status === 'completed' ? `OCR ${doc.ocr_confidence || 0}%` : doc.ocr_status === 'processing' ? 'OCR...' : 'OCR echoue'}
                                    </Text>
                                  </View>
                                )}
                              </TouchableOpacity>
                              <View style={{ padding: 10 }}>
                                <Text style={{ color: C.text, fontSize: 13, fontWeight: '700' }}>
                                  {DOC_TYPES.find(d => d.key === doc.doc_type)?.label || doc.doc_type}
                                </Text>
                                <Text style={{ color: C.textLight, fontSize: 11 }}>{new Date(doc.created_at).toLocaleDateString('fr-CH')}</Text>
                                {doc.extracted_data && Object.keys(doc.extracted_data).length > 0 && (
                                  <View style={{ marginTop: 4 }}>
                                    {doc.extracted_data.name && <Text style={{ color: C.text, fontSize: 11 }}>{doc.extracted_data.name}</Text>}
                                    {doc.extracted_data.document_number && <Text style={{ color: C.textLight, fontSize: 10 }}>N° {doc.extracted_data.document_number}</Text>}
                                  </View>
                                )}
                                <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                                  {doc.status === 'pending' && (
                                    <TouchableOpacity
                                      style={s.validateBtn}
                                      onPress={() => { setShowValidate(doc); setExtractedData(doc.extracted_data || {}); }}
                                      data-testid={`validate-${doc.id}`}
                                    >
                                      <Ionicons name="create" size={14} color="#fff" />
                                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Valider</Text>
                                    </TouchableOpacity>
                                  )}
                                  {(!doc.ocr_status || doc.ocr_status === 'failed') && (
                                    <TouchableOpacity
                                      style={s.ocrBtn}
                                      onPress={() => triggerOcr(doc.id)}
                                      disabled={ocrRunning === doc.id}
                                      data-testid={`ocr-${doc.id}`}
                                    >
                                      {ocrRunning === doc.id ? (
                                        <ActivityIndicator size="small" color={ACCENT} />
                                      ) : (
                                        <>
                                          <Ionicons name="scan" size={14} color={ACCENT} />
                                          <Text style={{ color: ACCENT, fontSize: 12, fontWeight: '700' }}>OCR</Text>
                                        </>
                                      )}
                                    </TouchableOpacity>
                                  )}
                                </View>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    )
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Validation Modal */}
      <Modal visible={!!showValidate} transparent animationType="fade" onRequestClose={() => setShowValidate(null)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { backgroundColor: C.card }]}>
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: C.text }]}>Valider le document</Text>
              <TouchableOpacity onPress={() => setShowValidate(null)}><Ionicons name="close" size={24} color={C.text} /></TouchableOpacity>
            </View>
            {showValidate?.url && (
              <Image source={{ uri: showValidate.url }} style={s.modalImage} resizeMode="contain" />
            )}
            <Text style={{ color: C.textLight, fontSize: 13, marginBottom: 8, marginTop: 12 }}>
              {showValidate?.ocr_status === 'completed' ? 'Informations pre-remplies par OCR IA - Verifiez et corrigez si necessaire' : 'Saisie manuelle des informations'}
            </Text>
            {showValidate?.ocr_confidence > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, backgroundColor: '#10B98110', padding: 8, borderRadius: 8 }}>
                <Ionicons name="scan" size={16} color="#059669" />
                <Text style={{ color: '#059669', fontSize: 12, fontWeight: '700' }}>OCR Confiance: {showValidate.ocr_confidence}%</Text>
              </View>
            )}

            {[
              { key: 'name', label: 'Nom complet', placeholder: 'Jean Dupont' },
              { key: 'date_of_birth', label: 'Date de naissance', placeholder: '01.01.1990' },
              { key: 'nationality', label: 'Nationalite', placeholder: 'Suisse' },
              { key: 'document_number', label: 'N° document', placeholder: '12345678' },
              { key: 'license_number', label: 'N° permis', placeholder: 'G123456' },
              { key: 'license_expiry_date', label: 'Expiration permis', placeholder: '01.01.2030' },
              { key: 'expiry_date', label: 'Date expiration doc', placeholder: '01.01.2030' },
              { key: 'place_of_birth', label: 'Lieu de naissance', placeholder: 'Geneve' },
              { key: 'license_categories', label: 'Categories permis', placeholder: 'B, B1' },
            ].map(f => (
              <View key={f.key} style={{ marginBottom: 8 }}>
                <Text style={{ color: C.textLight, fontSize: 11, fontWeight: '600' }}>{f.label}</Text>
                <TextInput
                  style={[s.modalInput, { borderColor: C.border, color: C.text }]}
                  placeholder={f.placeholder}
                  placeholderTextColor={C.textLight}
                  value={extractedData[f.key] || ''}
                  onChangeText={v => setExtractedData(prev => ({ ...prev, [f.key]: v }))}
                  data-testid={`extract-${f.key}`}
                />
              </View>
            ))}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <TouchableOpacity style={[s.rejectBtn]} onPress={() => handleValidate('rejected')}>
                <Ionicons name="close-circle" size={18} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '700' }}>Rejeter</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.approveBtn]} onPress={() => handleValidate('validated')}>
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '700' }}>Valider</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Image Preview Modal - Enhanced */}
      <Modal visible={!!showPreview} transparent animationType="fade" onRequestClose={() => setShowPreview(null)}>
        <View style={s.previewOverlay}>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 16, paddingTop: Platform.OS === 'web' ? 16 : 40 }}>
            <TouchableOpacity onPress={() => setShowPreview(null)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' }} data-testid="close-preview">
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            {showPreview && <Image source={{ uri: showPreview }} style={s.previewImage} resizeMode="contain" />}
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'center', paddingBottom: 20 }}>Appuyez X pour fermer</Text>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 22, fontWeight: '900', marginBottom: 4 },
  mainGrid: { flexDirection: 'row', gap: 16 },
  clientPanel: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 14, maxWidth: 320 },
  panelTitle: { fontSize: 16, fontWeight: '800', marginBottom: 10 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 10 },
  searchText: { flex: 1, fontSize: 13 },
  clientItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 6 },
  clientAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: ACCENT + '20', alignItems: 'center', justifyContent: 'center' },
  clientInitial: { color: ACCENT, fontWeight: '800', fontSize: 16 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, flex: 1 },
  scanSection: { borderRadius: 14, borderWidth: 1, padding: 14 },
  docTypesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  docTypeCard: { flex: 1, minWidth: 140, alignItems: 'center', gap: 6, padding: 14, borderRadius: 12, borderWidth: 1 },
  captureBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: ACCENT, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  galleryBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: ACCENT, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  emptyDocs: { alignItems: 'center', paddingVertical: 30 },
  docsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  docCard: { width: 200, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  docImageWrap: { position: 'relative' },
  docImage: { width: '100%', height: 130 },
  docStatusBadge: { position: 'absolute', top: 6, right: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  validateBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: ACCENT, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start' },
  ocrBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: ACCENT, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start' },
  ocrBadge: { position: 'absolute', bottom: 6, left: 6, flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 500, borderRadius: 16, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalImage: { width: '100%', height: 200, borderRadius: 10 },
  modalInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#EF4444', paddingVertical: 12, borderRadius: 10 },
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#10B981', paddingVertical: 12, borderRadius: 10 },
  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  previewImage: { width: '90%', height: '80%' },
});
