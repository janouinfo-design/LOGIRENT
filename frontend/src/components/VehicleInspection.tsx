import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ZONES = [
  { key: 'pare_chocs_avant', label: 'Pare-chocs avant', icon: 'car-outline' },
  { key: 'ailiere_gauche_avant', label: 'Ailière G. avant', icon: 'arrow-back-outline' },
  { key: 'toit', label: 'Toit', icon: 'sunny-outline' },
  { key: 'ailiere_droit_avant', label: 'Ailière D. avant', icon: 'arrow-forward-outline' },
  { key: 'porte_avant_gauche', label: 'Porte avant G.', icon: 'enter-outline' },
  { key: 'roof', label: 'Toit central', icon: 'albums-outline' },
  { key: 'porte_avant_droite', label: 'Porte avant D.', icon: 'exit-outline' },
  { key: 'porte_arriere_gauche', label: 'Porte arrière G.', icon: 'enter-outline' },
  { key: 'coffre', label: 'Coffre', icon: 'cube-outline' },
  { key: 'porte_arriere_droite', label: 'Porte arrière D.', icon: 'exit-outline' },
  { key: 'ailiere_gauche_arriere', label: 'Ailière G. arrière', icon: 'arrow-back-outline' },
  { key: 'pare_chocs_arriere', label: 'Pare-chocs arrière', icon: 'car-outline' },
  { key: 'ailier_droit_arriere', label: 'Ailier D. arrière', icon: 'arrow-forward-outline' },
] as const;

interface Props {
  damages: Record<string, string>;
  onUpdateDamage: (key: string, value: string) => void;
  editable: boolean;
  colors: any;
}

export default function VehicleInspection({ damages, onUpdateDamage, editable, colors: C }: Props) {
  const [selectedZone, setSelectedZone] = useState<{ key: string; label: string } | null>(null);
  const [noteText, setNoteText] = useState('');

  const openZone = (zone: { key: string; label: string }) => {
    if (!editable) return;
    setSelectedZone(zone);
    setNoteText(damages[zone.key] || '');
  };

  const saveNote = () => {
    if (selectedZone) onUpdateDamage(selectedZone.key, noteText.trim());
    setSelectedZone(null);
    setNoteText('');
  };

  const removeNote = () => {
    if (selectedZone) onUpdateDamage(selectedZone.key, '');
    setSelectedZone(null);
    setNoteText('');
  };

  const damageCount = Object.values(damages).filter(v => v && v.trim()).length;

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
            {damageCount} dommage{damageCount > 1 ? 's' : ''} signalé{damageCount > 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {/* Zone buttons grid */}
      {editable && (
        <View style={s.zoneGrid}>
          <Text style={{ color: C.textLight, fontSize: 11, marginBottom: 8, textAlign: 'center' }}>
            Touchez une zone pour signaler un dommage
          </Text>
          <View style={s.gridWrap}>
            {ZONES.map(zone => {
              const hasDamage = damages[zone.key] && damages[zone.key].trim();
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
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Damage detail list */}
      {damageCount > 0 && (
        <View style={{ marginTop: 8 }}>
          {ZONES.filter(z => damages[z.key] && damages[z.key].trim()).map(zone => (
            <View key={zone.key} style={[s.damageRow, { borderColor: '#FCA5A540' }]}>
              <Ionicons name="alert-circle" size={14} color="#EF4444" />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#991B1B', fontSize: 11, fontWeight: '700' }}>{zone.label}</Text>
                <Text style={{ color: '#7F1D1D', fontSize: 12 }}>{damages[zone.key]}</Text>
              </View>
              {editable && (
                <TouchableOpacity onPress={() => openZone(zone)} testID={`edit-damage-${zone.key}`}>
                  <Ionicons name="create-outline" size={16} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Damage Note Modal */}
      <Modal visible={!!selectedZone} animationType="fade" transparent>
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { backgroundColor: C.card, borderColor: C.border }]}>
            <View style={s.modalHeader}>
              <Text style={{ color: C.text, fontSize: 16, fontWeight: '800', flex: 1 }}>
                {selectedZone?.label}
              </Text>
              <TouchableOpacity onPress={() => { setSelectedZone(null); setNoteText(''); }} testID="close-damage-modal">
                <Ionicons name="close" size={24} color={C.textLight} />
              </TouchableOpacity>
            </View>
            <Text style={{ color: C.textLight, fontSize: 12, marginBottom: 10 }}>
              Décrivez le dommage constaté sur cette zone
            </Text>
            <TextInput
              style={[s.noteInput, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
              value={noteText}
              onChangeText={setNoteText}
              placeholder="Ex: Rayure 10cm, bosse légère..."
              placeholderTextColor={C.textLight + '80'}
              multiline
              numberOfLines={3}
              autoFocus
              testID="damage-note-input"
            />
            <View style={s.modalActions}>
              {damages[selectedZone?.key || ''] ? (
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
                  {noteText.trim() ? 'Enregistrer' : 'Aucun dommage'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  gridWrap: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
  },
  zoneBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1.5,
    minWidth: '30%', flexGrow: 1, flexBasis: '30%',
  },
  zoneBtnText: { fontSize: 11, fontWeight: '600' },
  damageRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 8, borderRadius: 8, borderWidth: 1,
    backgroundColor: '#FEF2F2', marginBottom: 4,
  },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  modalContent: {
    width: '100%', maxWidth: 420,
    borderRadius: 16, padding: 20, borderWidth: 1,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  noteInput: {
    borderWidth: 1, borderRadius: 10, padding: 12,
    fontSize: 14, minHeight: 80, textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 14, gap: 10,
  },
  modalBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1, borderColor: 'transparent',
  },
});
