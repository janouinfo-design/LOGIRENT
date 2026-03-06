import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, TextInput, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ZONES = [
  { key: 'pare_chocs_avant', label: 'Pare-chocs avant', top: '2%', left: '33%', width: '34%', height: '8%' },
  { key: 'ailiere_gauche_avant', label: 'Ailière gauche avant', top: '12%', left: '2%', width: '22%', height: '14%' },
  { key: 'toit', label: 'Toit', top: '10%', left: '28%', width: '44%', height: '12%' },
  { key: 'ailiere_droit_avant', label: 'Ailière droit avant', top: '12%', left: '76%', width: '22%', height: '14%' },
  { key: 'porte_avant_gauche', label: 'Porte avant gauche', top: '28%', left: '2%', width: '22%', height: '18%' },
  { key: 'roof', label: 'Roof / Toit central', top: '26%', left: '30%', width: '40%', height: '18%' },
  { key: 'porte_avant_droite', label: 'Porte avant droite', top: '28%', left: '76%', width: '22%', height: '18%' },
  { key: 'porte_arriere_gauche', label: 'Porte arrière gauche', top: '50%', left: '2%', width: '22%', height: '18%' },
  { key: 'coffre', label: 'Coffre', top: '48%', left: '28%', width: '44%', height: '20%' },
  { key: 'porte_arriere_droite', label: 'Porte arrière droite', top: '50%', left: '76%', width: '22%', height: '18%' },
  { key: 'ailiere_gauche_arriere', label: 'Ailière gauche arrière', top: '72%', left: '2%', width: '22%', height: '14%' },
  { key: 'pare_chocs_arriere', label: 'Pare-chocs arrière', top: '88%', left: '33%', width: '34%', height: '8%' },
  { key: 'ailier_droit_arriere', label: 'Ailier droit arrière', top: '72%', left: '76%', width: '22%', height: '14%' },
];

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
    if (selectedZone) {
      onUpdateDamage(selectedZone.key, noteText.trim());
    }
    setSelectedZone(null);
    setNoteText('');
  };

  const removeNote = () => {
    if (selectedZone) {
      onUpdateDamage(selectedZone.key, '');
    }
    setSelectedZone(null);
    setNoteText('');
  };

  const damageCount = Object.values(damages).filter(v => v && v.trim()).length;

  return (
    <View>
      {damageCount > 0 && (
        <View style={[s.damageCounter, { backgroundColor: '#EF444415', borderColor: '#EF444440' }]}>
          <Ionicons name="warning" size={14} color="#EF4444" />
          <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '700' }}>
            {damageCount} dommage{damageCount > 1 ? 's' : ''} signalé{damageCount > 1 ? 's' : ''}
          </Text>
        </View>
      )}

      <View style={s.imageContainer}>
        <Image
          source={require('../../assets/images/inspection-fr.png')}
          style={s.image}
          resizeMode="contain"
        />
        {ZONES.map(zone => {
          const hasDamage = damages[zone.key] && damages[zone.key].trim();
          return (
            <TouchableOpacity
              key={zone.key}
              style={[
                s.zone,
                { top: zone.top, left: zone.left, width: zone.width, height: zone.height },
                hasDamage && s.zoneDamaged,
                editable && s.zoneEditable,
              ]}
              onPress={() => openZone(zone)}
              activeOpacity={editable ? 0.6 : 1}
              data-testid={`zone-${zone.key}`}
            >
              {hasDamage && (
                <View style={s.damageIndicator}>
                  <Ionicons name="alert-circle" size={16} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Damage list */}
      {damageCount > 0 && (
        <View style={{ marginTop: 8 }}>
          {ZONES.filter(z => damages[z.key] && damages[z.key].trim()).map(zone => (
            <View key={zone.key} style={[s.damageRow, { backgroundColor: '#FEF2F2', borderColor: '#FCA5A540' }]}>
              <Ionicons name="alert-circle" size={14} color="#EF4444" />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#991B1B', fontSize: 11, fontWeight: '700' }}>{zone.label}</Text>
                <Text style={{ color: '#7F1D1D', fontSize: 12 }}>{damages[zone.key]}</Text>
              </View>
              {editable && (
                <TouchableOpacity onPress={() => openZone(zone)} data-testid={`edit-damage-${zone.key}`}>
                  <Ionicons name="create-outline" size={16} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}

      {editable && (
        <Text style={{ color: C.textLight, fontSize: 11, textAlign: 'center', marginTop: 6 }}>
          Touchez une zone pour signaler un dommage
        </Text>
      )}

      {/* Damage Note Modal */}
      <Modal visible={!!selectedZone} animationType="fade" transparent>
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { backgroundColor: C.card, borderColor: C.border }]}>
            <View style={s.modalHeader}>
              <Text style={{ color: C.text, fontSize: 16, fontWeight: '800', flex: 1 }}>
                {selectedZone?.label}
              </Text>
              <TouchableOpacity onPress={() => { setSelectedZone(null); setNoteText(''); }} data-testid="close-damage-modal">
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
              data-testid="damage-note-input"
            />

            <View style={s.modalActions}>
              {damages[selectedZone?.key || ''] ? (
                <TouchableOpacity
                  style={[s.modalBtn, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}
                  onPress={removeNote}
                  data-testid="remove-damage-btn"
                >
                  <Ionicons name="trash" size={16} color="#EF4444" />
                  <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '700' }}>Supprimer</Text>
                </TouchableOpacity>
              ) : <View />}
              <TouchableOpacity
                style={[s.modalBtn, { backgroundColor: '#10B981' }]}
                onPress={saveNote}
                data-testid="save-damage-btn"
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
  imageContainer: { position: 'relative', width: '100%', aspectRatio: 1 },
  image: { width: '100%', height: '100%' },
  zone: {
    position: 'absolute',
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoneEditable: {
    borderColor: '#6366F120',
    backgroundColor: '#6366F108',
  },
  zoneDamaged: {
    backgroundColor: '#EF444425',
    borderColor: '#EF4444',
    borderWidth: 2,
  },
  damageIndicator: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  damageCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  damageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    gap: 10,
  },
  modalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
});
