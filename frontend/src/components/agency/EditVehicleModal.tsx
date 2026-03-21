import React, { useState, useEffect } from 'react';
import { View, Text, Modal, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Platform, Alert, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../src/api/axios';
import { Vehicle, VehicleDocument, TYPES, TRANSMISSIONS, FUELS, STATUSES, DOC_TYPES, getStatus, getDocIcon, formatFileSize, getExpiryStatus, getPhotoUrl, vst } from './vehicleTypes';
import { VehiclePricingManager } from './VehiclePricingManager';

interface Props {
  vehicle: Vehicle | null;
  colors: any;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditVehicleModal({ vehicle, colors: C, onClose, onSaved }: Props) {
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState('carte_grise');
  const [docExpiryDate, setDocExpiryDate] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [currentVehicle, setCurrentVehicle] = useState<Vehicle | null>(null);

  useEffect(() => {
    if (vehicle) {
      setCurrentVehicle(vehicle);
      setEditForm({
        brand: vehicle.brand, model: vehicle.model, year: String(vehicle.year), type: vehicle.type,
        price_per_day: String(vehicle.price_per_day), seats: String(vehicle.seats),
        transmission: vehicle.transmission, fuel_type: vehicle.fuel_type, status: vehicle.status,
        location: vehicle.location || '', description: vehicle.description || '',
        plate_number: vehicle.plate_number || '', chassis_number: vehicle.chassis_number || '',
        color: vehicle.color || '',
      });
    }
  }, [vehicle]);

  const saveEdit = async () => {
    if (!currentVehicle) return;
    setSaving(true);
    try {
      await api.put(`/api/admin/vehicles/${currentVehicle.id}`, {
        brand: editForm.brand, model: editForm.model, year: parseInt(editForm.year),
        type: editForm.type, price_per_day: parseFloat(editForm.price_per_day),
        seats: parseInt(editForm.seats), transmission: editForm.transmission,
        fuel_type: editForm.fuel_type, status: editForm.status,
        location: editForm.location, description: editForm.description,
        plate_number: editForm.plate_number || null,
        chassis_number: editForm.chassis_number || null,
        color: editForm.color || null,
      });
      onClose();
      onSaved();
    } catch (e: any) {
      const msg = e.response?.data?.detail || 'Erreur lors de la sauvegarde';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Erreur', msg);
    } finally { setSaving(false); }
  };

  const refreshVehicle = async () => {
    if (!currentVehicle) return;
    const vRes = await api.get(`/api/vehicles/${currentVehicle.id}`);
    setCurrentVehicle(vRes.data);
  };

  const handlePhotoUpload = async () => {
    if (!currentVehicle || Platform.OS !== 'web') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    input.multiple = true;
    input.onchange = async (e: any) => {
      const files = Array.from(e.target.files || []) as File[];
      if (!files.length) return;
      setUploadingPhoto(true);
      try {
        for (const file of files) {
          if (file.size > 5 * 1024 * 1024) { window.alert(`${file.name} trop volumineux (max 5 MB)`); continue; }
          const formData = new FormData();
          formData.append('file', file);
          await api.post(`/api/admin/vehicles/${currentVehicle.id}/photos`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        }
        await refreshVehicle();
        onSaved();
      } catch (e: any) {
        window.alert(e.response?.data?.detail || 'Erreur lors de l\'upload photo');
      } finally { setUploadingPhoto(false); }
    };
    input.click();
  };

  const handleDeletePhoto = async (photoIndex: number) => {
    if (!currentVehicle) return;
    const confirmed = Platform.OS === 'web'
      ? window.confirm('Supprimer cette photo ?')
      : await new Promise(resolve => Alert.alert('Confirmer', 'Supprimer cette photo ?', [{ text: 'Non', onPress: () => resolve(false) }, { text: 'Oui', onPress: () => resolve(true) }]));
    if (!confirmed) return;
    try {
      const photos = [...(currentVehicle.photos || [])];
      photos.splice(photoIndex, 1);
      await api.put(`/api/admin/vehicles/${currentVehicle.id}`, { photos });
      await refreshVehicle();
      onSaved();
    } catch (e: any) {
      const msg = e.response?.data?.detail || 'Erreur';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Erreur', msg);
    }
  };

  const handleDocumentUpload = async () => {
    if (!currentVehicle || Platform.OS !== 'web') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.jpg,.jpeg,.png,.webp,.doc,.docx';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) { window.alert('Fichier trop volumineux (max 10 MB)'); return; }
      setUploadingDoc(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        const params = new URLSearchParams({ doc_type: selectedDocType });
        if (docExpiryDate) params.append('expiry_date', docExpiryDate);
        await api.post(`/api/admin/vehicles/${currentVehicle.id}/documents?${params.toString()}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        setDocExpiryDate('');
        await refreshVehicle();
        onSaved();
      } catch (e: any) {
        window.alert(e.response?.data?.detail || 'Erreur lors de l\'upload');
      } finally { setUploadingDoc(false); }
    };
    input.click();
  };

  const handleViewDocument = async (doc: VehicleDocument) => {
    if (!currentVehicle) return;
    try {
      const res = await api.get(`/api/vehicles/${currentVehicle.id}/documents/${doc.id}/download`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: doc.content_type });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (e: any) {
      const msg = e.response?.data?.detail || 'Erreur lors du telechargement';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Erreur', msg);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!currentVehicle) return;
    const confirmed = Platform.OS === 'web'
      ? window.confirm('Supprimer ce document ?')
      : await new Promise(resolve => Alert.alert('Confirmer', 'Supprimer ce document ?', [{ text: 'Non', onPress: () => resolve(false) }, { text: 'Oui', onPress: () => resolve(true) }]));
    if (!confirmed) return;
    try {
      await api.delete(`/api/admin/vehicles/${currentVehicle.id}/documents/${docId}`);
      await refreshVehicle();
      onSaved();
    } catch (e: any) {
      const msg = e.response?.data?.detail || 'Erreur lors de la suppression';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Erreur', msg);
    }
  };

  const activeDocuments = currentVehicle?.documents?.filter(d => !d.is_deleted) || [];

  return (
    <>
      <Modal visible={!!vehicle} animationType="slide" transparent>
        <View style={vst.modalOverlay}>
          <View style={[vst.modalBox, { backgroundColor: C.card, maxHeight: Dimensions.get('window').height * 0.85, display: 'flex', flexDirection: 'column' }]}>
            <View style={vst.modalHeader}>
              <Text style={[vst.modalTitle, { color: C.text }]}>Modifier le vehicule</Text>
              <TouchableOpacity onPress={onClose} data-testid="close-edit-modal">
                <Ionicons name="close" size={24} color={C.textLight} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={true} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
              {/* Status */}
              <Text style={[vst.fieldLabel, { color: C.textLight }]}>Statut</Text>
              <View style={vst.statusRow}>
                {STATUSES.map(s => {
                  const sc2 = getStatus(s.v);
                  const sel = editForm.status === s.v;
                  return (
                    <TouchableOpacity key={s.v} onPress={() => setEditForm({ ...editForm, status: s.v })}
                      style={[vst.statusOption, { backgroundColor: sel ? sc2.bg : 'transparent', borderColor: sel ? sc2.text : C.border }]}
                      data-testid={`status-option-${s.v}`}>
                      <Ionicons name={sc2.icon as any} size={18} color={sel ? sc2.text : C.textLight} />
                      <Text style={{ color: sel ? sc2.text : C.textLight, fontSize: 12, fontWeight: sel ? '700' : '500' }}>{s.l}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Fields */}
              <View style={vst.fieldRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[vst.fieldLabel, { color: C.textLight }]}>Marque</Text>
                  <TextInput style={[vst.input, { color: C.text, borderColor: C.border }]} value={editForm.brand} onChangeText={v => setEditForm({ ...editForm, brand: v })} data-testid="edit-brand" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[vst.fieldLabel, { color: C.textLight }]}>Modele</Text>
                  <TextInput style={[vst.input, { color: C.text, borderColor: C.border }]} value={editForm.model} onChangeText={v => setEditForm({ ...editForm, model: v })} data-testid="edit-model" />
                </View>
              </View>

              <View style={vst.fieldRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[vst.fieldLabel, { color: C.textLight }]}>Annee</Text>
                  <TextInput style={[vst.input, { color: C.text, borderColor: C.border }]} value={editForm.year} keyboardType="numeric" onChangeText={v => setEditForm({ ...editForm, year: v })} data-testid="edit-year" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[vst.fieldLabel, { color: C.textLight }]}>Prix/jour (CHF)</Text>
                  <TextInput style={[vst.input, { color: C.text, borderColor: C.border }]} value={editForm.price_per_day} keyboardType="numeric" onChangeText={v => setEditForm({ ...editForm, price_per_day: v })} data-testid="edit-price" />
                </View>
              </View>

              <View style={vst.fieldRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[vst.fieldLabel, { color: C.textLight }]}>Places</Text>
                  <TextInput style={[vst.input, { color: C.text, borderColor: C.border }]} value={editForm.seats} keyboardType="numeric" onChangeText={v => setEditForm({ ...editForm, seats: v })} data-testid="edit-seats" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[vst.fieldLabel, { color: C.textLight }]}>Lieu</Text>
                  <TextInput style={[vst.input, { color: C.text, borderColor: C.border }]} value={editForm.location} onChangeText={v => setEditForm({ ...editForm, location: v })} data-testid="edit-location" />
                </View>
              </View>

              {/* Identification */}
              <View style={[vst.sectionHeader, { borderTopColor: C.border }]}>
                <Ionicons name="card" size={16} color={C.accent} />
                <Text style={[vst.sectionTitle, { color: C.text }]}>Identification</Text>
              </View>

              <View style={vst.fieldRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[vst.fieldLabel, { color: C.textLight }]}>Plaque d'immatriculation</Text>
                  <TextInput style={[vst.input, { color: C.text, borderColor: C.border }]} value={editForm.plate_number} onChangeText={v => setEditForm({ ...editForm, plate_number: v })} placeholder="GE 12345" placeholderTextColor={C.textLight + '80'} data-testid="edit-plate-number" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[vst.fieldLabel, { color: C.textLight }]}>Couleur</Text>
                  <TextInput style={[vst.input, { color: C.text, borderColor: C.border }]} value={editForm.color} onChangeText={v => setEditForm({ ...editForm, color: v })} placeholder="Noir, Blanc..." placeholderTextColor={C.textLight + '80'} data-testid="edit-color" />
                </View>
              </View>

              <View style={{ marginBottom: 12 }}>
                <Text style={[vst.fieldLabel, { color: C.textLight }]}>Numero de chassis</Text>
                <TextInput style={[vst.input, { color: C.text, borderColor: C.border }]} value={editForm.chassis_number} onChangeText={v => setEditForm({ ...editForm, chassis_number: v })} placeholder="WBA1234567890" placeholderTextColor={C.textLight + '80'} data-testid="edit-chassis-number" />
              </View>

              {/* Type */}
              <Text style={[vst.fieldLabel, { color: C.textLight }]}>Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {TYPES.map(t => (
                    <TouchableOpacity key={t} onPress={() => setEditForm({ ...editForm, type: t })}
                      style={[vst.chip, { backgroundColor: editForm.type === t ? C.accent + '20' : 'transparent', borderColor: editForm.type === t ? C.accent : C.border }]}>
                      <Text style={{ color: editForm.type === t ? C.accent : C.textLight, fontSize: 12, fontWeight: editForm.type === t ? '700' : '500' }}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Transmission */}
              <Text style={[vst.fieldLabel, { color: C.textLight }]}>Transmission</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                {TRANSMISSIONS.map(t => (
                  <TouchableOpacity key={t.v} onPress={() => setEditForm({ ...editForm, transmission: t.v })}
                    style={[vst.chip, { flex: 1, backgroundColor: editForm.transmission === t.v ? C.accent + '20' : 'transparent', borderColor: editForm.transmission === t.v ? C.accent : C.border }]}>
                    <Text style={{ color: editForm.transmission === t.v ? C.accent : C.textLight, fontSize: 12, fontWeight: editForm.transmission === t.v ? '700' : '500', textAlign: 'center' }}>{t.l}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Fuel */}
              <Text style={[vst.fieldLabel, { color: C.textLight }]}>Carburant</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {FUELS.map(f => (
                    <TouchableOpacity key={f} onPress={() => setEditForm({ ...editForm, fuel_type: f.toLowerCase() })}
                      style={[vst.chip, { backgroundColor: editForm.fuel_type?.toLowerCase() === f.toLowerCase() ? C.accent + '20' : 'transparent', borderColor: editForm.fuel_type?.toLowerCase() === f.toLowerCase() ? C.accent : C.border }]}>
                      <Text style={{ color: editForm.fuel_type?.toLowerCase() === f.toLowerCase() ? C.accent : C.textLight, fontSize: 12, fontWeight: editForm.fuel_type?.toLowerCase() === f.toLowerCase() ? '700' : '500' }}>{f}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Description */}
              <Text style={[vst.fieldLabel, { color: C.textLight }]}>Description</Text>
              <TextInput style={[vst.input, vst.textArea, { color: C.text, borderColor: C.border }]} value={editForm.description} onChangeText={v => setEditForm({ ...editForm, description: v })} multiline numberOfLines={3} data-testid="edit-description" />

              {/* Photos */}
              <View style={[vst.sectionHeader, { borderTopColor: C.border }]}>
                <Ionicons name="images" size={16} color={C.accent} />
                <Text style={[vst.sectionTitle, { color: C.text }]}>Photos ({currentVehicle?.photos?.length || 0})</Text>
              </View>

              {currentVehicle?.photos && currentVehicle.photos.length > 0 ? (
                <View style={vst.photosGrid}>
                  {currentVehicle.photos.map((photo, idx) => (
                    <View key={idx} style={vst.photoThumb}>
                      <TouchableOpacity onPress={() => setPreviewPhoto(getPhotoUrl(photo))} activeOpacity={0.8}>
                        <Image source={{ uri: getPhotoUrl(photo) }} style={vst.photoThumbImg} resizeMode="cover" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeletePhoto(idx)} style={vst.photoDeleteBtn} data-testid={`delete-photo-${idx}`}>
                        <Ionicons name="close-circle" size={22} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={{ alignItems: 'center', paddingVertical: 12, opacity: 0.5 }}>
                  <Ionicons name="images-outline" size={28} color={C.textLight} />
                  <Text style={{ color: C.textLight, fontSize: 12, marginTop: 4 }}>Aucune photo</Text>
                </View>
              )}

              <TouchableOpacity onPress={handlePhotoUpload} disabled={uploadingPhoto} style={[vst.uploadBtn, { borderColor: '#10B981', backgroundColor: '#10B98110' }]} data-testid="upload-photo-btn">
                {uploadingPhoto ? <ActivityIndicator size="small" color="#10B981" /> : (
                  <>
                    <Ionicons name="camera" size={18} color="#10B981" />
                    <Text style={{ color: '#10B981', fontSize: 13, fontWeight: '700' }}>Ajouter des photos</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Pricing Tiers */}
              {currentVehicle && <VehiclePricingManager vehicleId={currentVehicle.id} C={C} />}

              {/* Documents */}
              <View style={[vst.sectionHeader, { borderTopColor: C.border }]}>
                <Ionicons name="folder-open" size={16} color={C.accent} />
                <Text style={[vst.sectionTitle, { color: C.text }]}>Documents ({activeDocuments.length})</Text>
              </View>

              <View style={vst.docUploadRow}>
                <View style={{ flex: 1 }}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {DOC_TYPES.map(dt => (
                        <TouchableOpacity key={dt.v} onPress={() => setSelectedDocType(dt.v)}
                          style={[vst.chip, { backgroundColor: selectedDocType === dt.v ? C.accent + '20' : 'transparent', borderColor: selectedDocType === dt.v ? C.accent : C.border, flexDirection: 'row', gap: 4, alignItems: 'center' }]}
                          data-testid={`doc-type-${dt.v}`}>
                          <Ionicons name={dt.icon as any} size={12} color={selectedDocType === dt.v ? C.accent : C.textLight} />
                          <Text style={{ color: selectedDocType === dt.v ? C.accent : C.textLight, fontSize: 11, fontWeight: selectedDocType === dt.v ? '700' : '500' }}>{dt.l}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </View>

              <View style={vst.fieldRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[vst.fieldLabel, { color: C.textLight }]}>Date d'expiration (optionnel)</Text>
                  <TextInput style={[vst.input, { color: C.text, borderColor: C.border }]} value={docExpiryDate} onChangeText={setDocExpiryDate} placeholder="AAAA-MM-JJ" placeholderTextColor={C.textLight + '80'} data-testid="doc-expiry-date" />
                </View>
              </View>

              <TouchableOpacity onPress={handleDocumentUpload} disabled={uploadingDoc} style={[vst.uploadBtn, { borderColor: C.accent, backgroundColor: C.accent + '10' }]} data-testid="upload-document-btn">
                {uploadingDoc ? <ActivityIndicator size="small" color={C.accent} /> : (
                  <>
                    <Ionicons name="cloud-upload" size={18} color={C.accent} />
                    <Text style={{ color: C.accent, fontSize: 13, fontWeight: '700' }}>Ajouter un document</Text>
                  </>
                )}
              </TouchableOpacity>

              {activeDocuments.length > 0 ? (
                <View style={{ gap: 6, marginTop: 8 }}>
                  {activeDocuments.map(doc => {
                    const expStatus = getExpiryStatus(doc.expiry_date);
                    return (
                      <View key={doc.id} style={[vst.docItem, { backgroundColor: C.bg, borderColor: expStatus?.color === '#EF4444' ? '#EF444450' : C.border }]} data-testid={`doc-item-${doc.id}`}>
                        <View style={[vst.docIconBox, { backgroundColor: C.accent + '15' }]}>
                          <Ionicons name={getDocIcon(doc.doc_type) as any} size={18} color={C.accent} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={{ color: C.text, fontSize: 12, fontWeight: '600' }} numberOfLines={1}>{doc.original_filename}</Text>
                          <View style={{ flexDirection: 'row', gap: 8, marginTop: 2, alignItems: 'center' }}>
                            <Text style={{ color: C.textLight, fontSize: 10 }}>{doc.doc_type_label}</Text>
                            <Text style={{ color: C.textLight, fontSize: 10 }}>{formatFileSize(doc.size)}</Text>
                            {expStatus && (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, backgroundColor: expStatus.color + '18' }}>
                                <Ionicons name={expStatus.icon as any} size={9} color={expStatus.color} />
                                <Text style={{ color: expStatus.color, fontSize: 9, fontWeight: '700' }}>{expStatus.label}</Text>
                              </View>
                            )}
                          </View>
                        </View>
                        <TouchableOpacity onPress={() => handleViewDocument(doc)} style={vst.docActionBtn} data-testid={`view-doc-${doc.id}`}>
                          <Ionicons name="eye" size={16} color={C.accent} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteDocument(doc.id)} style={vst.docActionBtn} data-testid={`delete-doc-${doc.id}`}>
                          <Ionicons name="trash" size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={{ alignItems: 'center', paddingVertical: 16, opacity: 0.5 }}>
                  <Ionicons name="document-outline" size={28} color={C.textLight} />
                  <Text style={{ color: C.textLight, fontSize: 12, marginTop: 4 }}>Aucun document</Text>
                </View>
              )}
            </ScrollView>

            {/* Actions */}
            <View style={vst.modalActions}>
              <TouchableOpacity onPress={onClose} style={[vst.actionBtn, { borderColor: C.border }]} data-testid="cancel-edit">
                <Text style={{ color: C.textLight, fontSize: 14, fontWeight: '600' }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveEdit} disabled={saving} style={[vst.actionBtn, vst.saveBtn, { backgroundColor: C.accent }]} data-testid="save-edit">
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <>
                  <Ionicons name="checkmark" size={18} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Sauvegarder</Text>
                </>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Photo Preview Modal */}
      <Modal visible={!!previewPhoto} transparent animationType="fade" onRequestClose={() => setPreviewPhoto(null)}>
        <TouchableOpacity style={vst.previewOverlay} activeOpacity={1} onPress={() => setPreviewPhoto(null)}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <Image source={{ uri: previewPhoto || '' }} style={vst.previewImage} resizeMode="contain" />
          </TouchableOpacity>
          <TouchableOpacity style={vst.previewCloseBtn} onPress={() => setPreviewPhoto(null)} data-testid="close-preview">
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
