import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../src/api/axios';

interface Props {
  visible: boolean;
  onClose: () => void;
  C: any;
  onImported: () => void;
}

export const ImportClientModal = ({ visible, onClose, C, onImported }: Props) => {
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportFile = async (event: any) => {
    const file = event?.target?.files?.[0];
    if (!file) return;
    const validExts = ['.xlsx', '.xls', '.csv', '.zip'];
    const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!validExts.includes(ext)) {
      window.alert('Format non supporte. Utilisez .xlsx, .csv ou .zip');
      return;
    }
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/api/admin/import-users', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportResult(res.data);
      onImported();
    } catch (e: any) {
      const msg = e.response?.data?.detail || 'Erreur lors de l\'import';
      setImportResult({ error: msg });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    setImportResult(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={st.modalOverlay}>
        <View style={[st.modal, { backgroundColor: C.card }]}>
          {Platform.OS === 'web' && (
            <input ref={fileInputRef as any} type="file" accept=".xlsx,.xls,.csv,.zip" style={{ display: 'none' }} onChange={handleImportFile} />
          )}
          <View style={st.modalHeader}>
            <Text style={[st.modalTitle, { color: C.text }]}>Importer des clients</Text>
            <TouchableOpacity onPress={handleClose}><Ionicons name="close" size={24} color={C.text} /></TouchableOpacity>
          </View>
          <ScrollView>
            <View style={[st.infoBox, { backgroundColor: C.accent + '10', borderColor: C.accent + '30' }]}>
              <Ionicons name="information-circle" size={20} color={C.accent} />
              <View style={{ flex: 1 }}>
                <Text style={[st.infoTitle, { color: C.text }]}>Formats acceptes</Text>
                <Text style={[st.infoDesc, { color: C.textLight }]}>Excel (.xlsx), CSV (.csv), ou ZIP contenant un Excel + photos</Text>
              </View>
            </View>
            <View style={[st.infoBox, { backgroundColor: C.primary + '10', borderColor: C.primary + '30' }]}>
              <Ionicons name="document-text" size={20} color={C.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[st.infoTitle, { color: C.text }]}>Colonnes Excel</Text>
                <Text style={[st.infoDesc, { color: C.textLight }]}>nom, email, telephone, adresse, photo{'\n'}(La colonne "photo" = nom du fichier image dans le ZIP)</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[st.importBtn, { backgroundColor: C.primary }, importing && { opacity: 0.6 }]}
              disabled={importing}
              onPress={() => fileInputRef.current?.click()}
              data-testid="import-file-btn">
              {importing ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="cloud-upload" size={22} color="#fff" />}
              <Text style={st.importBtnText}>{importing ? 'Import en cours...' : 'Choisir un fichier'}</Text>
            </TouchableOpacity>
            {importResult && !importResult.error && (
              <View style={[st.resultBox, { backgroundColor: C.success + '15', borderColor: C.success + '40' }]} data-testid="import-result-success">
                <View style={st.resultHeader}>
                  <Ionicons name="checkmark-circle" size={22} color={C.success} />
                  <Text style={[st.resultTitle, { color: C.success }]}>Import reussi</Text>
                </View>
                <View style={st.resultStats}>
                  <View style={st.resultStat}><Text style={[st.resultNum, { color: C.text }]}>{importResult.created}</Text><Text style={[st.resultStatLabel, { color: C.textLight }]}>crees</Text></View>
                  <View style={st.resultStat}><Text style={[st.resultNum, { color: C.text }]}>{importResult.photos_matched || 0}</Text><Text style={[st.resultStatLabel, { color: C.textLight }]}>photos</Text></View>
                  <View style={st.resultStat}><Text style={[st.resultNum, { color: C.text }]}>{importResult.skipped}</Text><Text style={[st.resultStatLabel, { color: C.textLight }]}>existants</Text></View>
                  <View style={st.resultStat}><Text style={[st.resultNum, { color: C.text }]}>{importResult.errors?.length || 0}</Text><Text style={[st.resultStatLabel, { color: C.textLight }]}>erreurs</Text></View>
                </View>
              </View>
            )}
            {importResult?.error && (
              <View style={[st.resultBox, { backgroundColor: C.error + '15', borderColor: C.error + '40' }]} data-testid="import-result-error">
                <View style={st.resultHeader}>
                  <Ionicons name="alert-circle" size={22} color={C.error} />
                  <Text style={[st.resultTitle, { color: C.error }]}>{importResult.error}</Text>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const st = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: 10, borderWidth: 1, marginBottom: 10 },
  infoTitle: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  infoDesc: { fontSize: 12, lineHeight: 18 },
  importBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 12, paddingVertical: 16, marginTop: 10, marginBottom: 10 },
  importBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resultBox: { borderRadius: 12, padding: 16, borderWidth: 1, marginTop: 10 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  resultTitle: { fontSize: 15, fontWeight: '700' },
  resultStats: { flexDirection: 'row', justifyContent: 'space-around' },
  resultStat: { alignItems: 'center' },
  resultNum: { fontSize: 22, fontWeight: '800' },
  resultStatLabel: { fontSize: 11, marginTop: 2 },
});
