import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, TextInput, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api/axios';
import { WebcamCapture } from '../../src/components/WebcamCapture';

const ZONES = [
  { key: 'pare_chocs_avant', label: 'Pare-chocs avant', icon: 'car-outline' },
  { key: 'ailiere_gauche_avant', label: 'Ailiere G. avant', icon: 'arrow-back-outline' },
  { key: 'toit', label: 'Toit', icon: 'sunny-outline' },
  { key: 'ailiere_droit_avant', label: 'Ailiere D. avant', icon: 'arrow-forward-outline' },
  { key: 'porte_avant_gauche', label: 'Porte avant G.', icon: 'enter-outline' },
  { key: 'roof', label: 'Toit central', icon: 'albums-outline' },
  { key: 'porte_avant_droite', label: 'Porte avant D.', icon: 'exit-outline' },
  { key: 'porte_arriere_gauche', label: 'Porte arriere G.', icon: 'enter-outline' },
  { key: 'coffre', label: 'Coffre', icon: 'cube-outline' },
  { key: 'porte_arriere_droite', label: 'Porte arriere D.', icon: 'exit-outline' },
  { key: 'ailiere_gauche_arriere', label: 'Ailiere G. arriere', icon: 'arrow-back-outline' },
  { key: 'pare_chocs_arriere', label: 'Pare-chocs arriere', icon: 'car-outline' },
  { key: 'ailier_droit_arriere', label: 'Ailier D. arriere', icon: 'arrow-forward-outline' },
] as const;

interface DamageData {
  note?: string;
  photos?: string[];
}

interface Props {
  damages: Record<string, string | DamageData>;
  onUpdateDamage: (key: string, value: string) => void;
  editable: boolean;
  colors: any;
}

const getDamageInfo = (val: any): { note: string; photos: string[] } => {
  if (!val) return { note: '', photos: [] };
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return { note: parsed.note || '', photos: parsed.photos || [] };
      }
    } catch {}
    return { note: val, photos: [] };
  }
  return { note: val.note || '', photos: val.photos || [] };
};

export default function VehicleInspection({ damages, onUpdateDamage, editable, colors: C }: Props) {
  const [selectedZone, setSelectedZone] = useState<{ key: string; label: string } | null>(null);
  const [noteText, setNoteText] = useState('');
  const [zonePhotos, setZonePhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiGlobalAnalyzing, setAiGlobalAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [showGlobalWebcam, setShowGlobalWebcam] = useState(false);

  const openZone = (zone: { key: string; label: string }) => {
    if (!editable) return;
    setSelectedZone(zone);
    const info = getDamageInfo(damages[zone.key]);
    setNoteText(info.note);
    setZonePhotos(info.photos);
  };

  const saveNote = () => {
    if (selectedZone) {
      if (noteText.trim() || zonePhotos.length > 0) {
        const data = JSON.stringify({ note: noteText.trim(), photos: zonePhotos });
        onUpdateDamage(selectedZone.key, data);
      } else {
        onUpdateDamage(selectedZone.key, '');
      }
    }
    setSelectedZone(null);
    setNoteText('');
    setZonePhotos([]);
  };

  const removeNote = () => {
    if (selectedZone) onUpdateDamage(selectedZone.key, '');
    setSelectedZone(null);
    setNoteText('');
    setZonePhotos([]);
  };

  const addPhoto = (useCamera: boolean) => {
    if (Platform.OS !== 'web') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = useCamera ? 'image/*' : 'image/jpeg,image/png,image/webp';
    if (useCamera) input.setAttribute('capture', 'environment');
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(true);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUri = ev.target?.result as string;
        setZonePhotos(prev => [...prev, dataUri]);
        setUploading(false);
      };
      reader.onerror = () => setUploading(false);
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const removePhoto = (idx: number) => {
    setZonePhotos(prev => prev.filter((_, i) => i !== idx));
  };

  // AI: Analyze a single zone photo
  const aiAnalyzeZone = async () => {
    if (zonePhotos.length === 0 || !selectedZone) return;
    setAiAnalyzing(true);
    setAiResult(null);
    try {
      const res = await api.post('/api/admin/vehicle-inspection/ai-zone', {
        image_data: zonePhotos[zonePhotos.length - 1],
        zone_name: selectedZone.label,
      });
      const data = res.data;
      if (data.has_damage && data.description) {
        setNoteText(prev => prev ? `${prev}\n[IA] ${data.description}` : `[IA] ${data.description}`);
        setAiResult(`${data.severity === 'severe' ? 'SEVERE' : data.severity === 'medium' ? 'MOYEN' : 'LEGER'} - ${data.description} (${data.confidence}% confiance)`);
      } else {
        setAiResult('Aucun dommage detecte par l\'IA');
      }
    } catch { setAiResult('Erreur analyse IA'); }
    finally { setAiAnalyzing(false); }
  };

  // AI: Global scan from a full vehicle photo (file picker)
  const aiGlobalScan = () => {
    if (Platform.OS !== 'web') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      processGlobalImage(file);
    };
    input.click();
  };

  // AI: Global scan with camera
  const aiGlobalScanWithCamera = () => {
    setShowGlobalWebcam(true);
  };

  const handleGlobalWebcamCapture = (dataUri: string) => {
    setShowGlobalWebcam(false);
    processGlobalDataUri(dataUri);
  };

  const processGlobalImage = (file: File) => {
    setAiGlobalAnalyzing(true);
    const reader = new FileReader();
    reader.onload = (ev) => processGlobalDataUri(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const processGlobalDataUri = async (dataUri: string) => {
    setAiGlobalAnalyzing(true);
    try {
      const res = await api.post('/api/admin/vehicle-inspection/ai-global', { image_data: dataUri });
      const data = res.data;
      if (data.zones && data.zones.length > 0) {
        data.zones.forEach((z: any) => {
          const existingInfo = getDamageInfo(damages[z.zone_key]);
          const newNote = existingInfo.note ? `${existingInfo.note}\n[IA] ${z.description}` : `[IA] ${z.description}`;
          onUpdateDamage(z.zone_key, JSON.stringify({ note: newNote, photos: existingInfo.photos }));
        });
        Platform.OS === 'web' && window.alert(`IA: ${data.zones.length} zone(s) avec dommages detectees.\nEtat general: ${data.overall_condition}\n\n${data.summary}`);
      } else {
        Platform.OS === 'web' && window.alert(`IA: Aucun dommage detecte.\n${data.summary || 'Vehicule en bon etat.'}`);
      }
    } catch { Platform.OS === 'web' && window.alert('Erreur lors de l\'analyse IA globale'); }
    finally { setAiGlobalAnalyzing(false); }
  };

  const hasDamageCheck = (key: string) => {
    const info = getDamageInfo(damages[key]);
    return (info.note && info.note.trim()) || (info.photos && info.photos.length > 0);
  };

  const damageCount = Object.keys(damages).filter(k => hasDamageCheck(k)).length;

  return (
    <View>
      {/* Inspection Image */}
      <Image
        source={require('../../assets/images/inspection-fr.png')}
        style={{ width: '100%', height: 300, alignSelf: 'center' }}
        resizeMode="contain"
      />

      {/* Damage counter */}
      {damageCount > 0 && (
        <View style={[s.damageCounter, { borderColor: '#EF444440' }]} testID="damage-counter">
          <Ionicons name="warning" size={14} color="#EF4444" />
          <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '700' }}>
            {damageCount} dommage{damageCount > 1 ? 's' : ''} signale{damageCount > 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {/* Zone buttons grid */}
      {editable && (
        <View style={s.zoneGrid}>
          {/* AI Global Scan Buttons */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={[s.aiGlobalBtn, { borderColor: '#7C3AED', flex: 1 }]}
              onPress={() => aiGlobalScanWithCamera()}
              disabled={aiGlobalAnalyzing}
            >
              {aiGlobalAnalyzing ? (
                <><ActivityIndicator size="small" color="#7C3AED" /><Text style={{ color: '#7C3AED', fontSize: 12, fontWeight: '700' }}>Analyse IA...</Text></>
              ) : (
                <><Ionicons name="camera" size={18} color="#7C3AED" /><Text style={{ color: '#7C3AED', fontSize: 12, fontWeight: '700' }}>Scan IA (Camera)</Text></>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.aiGlobalBtn, { borderColor: '#7C3AED', flex: 1 }]}
              onPress={() => aiGlobalScan()}
              disabled={aiGlobalAnalyzing}
            >
              {aiGlobalAnalyzing ? (
                <><ActivityIndicator size="small" color="#7C3AED" /><Text style={{ color: '#7C3AED', fontSize: 12, fontWeight: '700' }}>Analyse IA...</Text></>
              ) : (
                <><Ionicons name="folder-open" size={18} color="#7C3AED" /><Text style={{ color: '#7C3AED', fontSize: 12, fontWeight: '700' }}>Scan IA (Fichier)</Text></>
              )}
            </TouchableOpacity>
          </View>

          <Text style={{ color: C.textLight, fontSize: 11, marginBottom: 8, marginTop: 10, textAlign: 'center' }}>
            Ou touchez une zone pour signaler manuellement
          </Text>
          <View style={s.gridWrap}>
            {ZONES.map(zone => {
              const hasDamage = hasDamageCheck(zone.key);
              const info = getDamageInfo(damages[zone.key]);
              const photoCount = info.photos?.length || 0;
              return (
                <TouchableOpacity
                  key={zone.key}
                  style={[
                    s.zoneBtn,
                    { borderColor: hasDamage ? '#EF4444' : C.border, backgroundColor: hasDamage ? '#FEF2F2' : C.card },
                  ]}
                  onPress={() => openZone(zone)}
                  testID={`zone-${zone.key}`}
                >
                  {hasDamage ? (
                    <Ionicons name="alert-circle" size={14} color="#EF4444" />
                  ) : (
                    <Ionicons name={zone.icon as any} size={14} color={C.textLight} />
                  )}
                  <Text style={[s.zoneBtnText, { color: hasDamage ? '#991B1B' : C.text }]} numberOfLines={1}>
                    {zone.label}
                  </Text>
                  {photoCount > 0 && (
                    <View style={{ backgroundColor: '#7C3AED', borderRadius: 8, paddingHorizontal: 4, paddingVertical: 1, marginLeft: 2 }}>
                      <Text style={{ color: '#fff', fontSize: 8, fontWeight: '800' }}>{photoCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Damage detail list */}
      {damageCount > 0 && (
        <View style={{ marginTop: 8 }}>
          {ZONES.filter(z => hasDamageCheck(z.key)).map(zone => {
            const info = getDamageInfo(damages[zone.key]);
            return (
              <View key={zone.key} style={[s.damageRow, { borderColor: '#FCA5A540' }]}>
                <Ionicons name="alert-circle" size={14} color="#EF4444" />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#991B1B', fontSize: 11, fontWeight: '700' }}>{zone.label}</Text>
                  {info.note ? <Text style={{ color: '#7F1D1D', fontSize: 12 }}>{info.note}</Text> : null}
                  {info.photos && info.photos.length > 0 && (
                    <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
                      {info.photos.map((p, i) => (
                        <Image key={i} source={{ uri: p }} style={{ width: 40, height: 40, borderRadius: 4 }} resizeMode="cover" />
                      ))}
                    </View>
                  )}
                </View>
                {editable && (
                  <TouchableOpacity onPress={() => openZone(zone)} testID={`edit-damage-${zone.key}`}>
                    <Ionicons name="create-outline" size={16} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Damage Note + Photo Modal */}
      <Modal visible={!!selectedZone} animationType="fade" transparent>
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { backgroundColor: C.card, borderColor: C.border }]}>
            <View style={s.modalHeader}>
              <Text style={{ color: C.text, fontSize: 16, fontWeight: '800', flex: 1 }}>
                {selectedZone?.label}
              </Text>
              <TouchableOpacity onPress={() => { setSelectedZone(null); setNoteText(''); setZonePhotos([]); }} testID="close-damage-modal">
                <Ionicons name="close" size={24} color={C.textLight} />
              </TouchableOpacity>
            </View>

            <Text style={{ color: C.textLight, fontSize: 12, marginBottom: 10 }}>
              Decrivez le dommage et ajoutez des photos
            </Text>
            <TextInput
              style={[s.noteInput, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
              value={noteText}
              onChangeText={setNoteText}
              placeholder="Ex: Rayure 10cm, bosse legere..."
              placeholderTextColor={C.textLight + '80'}
              multiline
              numberOfLines={3}
              testID="damage-note-input"
            />

            {/* Photos */}
            <Text style={{ color: C.textLight, fontSize: 11, fontWeight: '700', marginTop: 10, marginBottom: 6, textTransform: 'uppercase' }}>PHOTOS DE LA ZONE</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              {zonePhotos.map((photo, idx) => (
                <View key={idx} style={{ position: 'relative' }}>
                  <Image source={{ uri: photo }} style={{ width: 70, height: 70, borderRadius: 8 }} resizeMode="cover" />
                  <TouchableOpacity onPress={() => removePhoto(idx)} style={{ position: 'absolute', top: -4, right: -4, width: 20, height: 20, borderRadius: 10, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="close" size={12} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              {uploading && <ActivityIndicator size="small" color="#7C3AED" />}
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#7C3AED', paddingVertical: 8, borderRadius: 8 }} onPress={() => addPhoto(true)}>
                <Ionicons name="camera" size={16} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#EDE9FE', paddingVertical: 8, borderRadius: 8 }} onPress={() => addPhoto(false)}>
                <Ionicons name="folder-open" size={16} color="#7C3AED" />
                <Text style={{ color: '#7C3AED', fontSize: 12, fontWeight: '700' }}>Fichier</Text>
              </TouchableOpacity>
            </View>

            {/* AI Zone Analysis */}
            {zonePhotos.length > 0 && (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#F0FDF4', paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#10B98130', marginBottom: 8 }}
                onPress={aiAnalyzeZone}
                disabled={aiAnalyzing}
              >
                {aiAnalyzing ? (
                  <><ActivityIndicator size="small" color="#10B981" /><Text style={{ color: '#10B981', fontSize: 12, fontWeight: '700' }}>Analyse IA en cours...</Text></>
                ) : (
                  <><Ionicons name="sparkles" size={16} color="#10B981" /><Text style={{ color: '#10B981', fontSize: 12, fontWeight: '700' }}>Analyser avec IA</Text></>
                )}
              </TouchableOpacity>
            )}
            {aiResult && (
              <View style={{ backgroundColor: '#F0FDF4', padding: 8, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#10B98130' }}>
                <Text style={{ color: '#065F46', fontSize: 11, fontWeight: '600' }}>Resultat IA : {aiResult}</Text>
              </View>
            )}

            <View style={s.modalActions}>
              {(getDamageInfo(damages[selectedZone?.key || '']).note || getDamageInfo(damages[selectedZone?.key || '']).photos?.length) ? (
                <TouchableOpacity
                  style={[s.modalBtn, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}
                  onPress={removeNote}
                  testID="remove-damage-btn"
                >
                  <Ionicons name="trash" size={16} color="#EF4444" />
                  <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '700' }}>Supprimer</Text>
                </TouchableOpacity>
              ) : <View />}
              <TouchableOpacity
                style={[s.modalBtn, { backgroundColor: '#10B981' }]}
                onPress={saveNote}
                testID="save-damage-btn"
              >
                <Ionicons name="checkmark" size={16} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>
                  {(noteText.trim() || zonePhotos.length > 0) ? 'Enregistrer' : 'Aucun dommage'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Global Webcam for AI scan */}
      <WebcamCapture
        visible={showGlobalWebcam}
        onClose={() => setShowGlobalWebcam(false)}
        onCapture={handleGlobalWebcamCapture}
        title="Scan IA - Photographier le vehicule"
      />
    </View>
  );
}

const s = StyleSheet.create({
  damageCounter: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1,
    backgroundColor: '#EF444410', marginTop: 8,
  },
  zoneGrid: { marginTop: 10 },
  aiGlobalBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12, borderRadius: 10, borderWidth: 2, borderStyle: 'dashed',
    backgroundColor: '#7C3AED08',
  },
  gridWrap: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
  },
  zoneBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1.5,
    minWidth: '30%', flexGrow: 1, flexBasis: '30%',
  },
  zoneBtnText: { fontSize: 11, fontWeight: '600', flex: 1 },
  damageRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    padding: 8, borderRadius: 8, borderWidth: 1,
    backgroundColor: '#FEF2F2', marginBottom: 4,
  },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  modalContent: {
    width: '100%', maxWidth: 480,
    borderRadius: 16, padding: 20, borderWidth: 1,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  noteInput: {
    borderWidth: 1, borderRadius: 10, padding: 12,
    fontSize: 14, minHeight: 70, textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 8, gap: 10,
  },
  modalBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1, borderColor: 'transparent',
  },
});
