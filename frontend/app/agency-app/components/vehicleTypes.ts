import { StyleSheet, Dimensions } from 'react-native';

const SCREEN_W = Dimensions.get('window').width;

export interface VehicleDocument {
  id: string;
  original_filename: string;
  content_type: string;
  size: number;
  doc_type: string;
  doc_type_label: string;
  expiry_date?: string;
  uploaded_at: string;
  is_deleted: boolean;
}

export interface Vehicle {
  id: string; brand: string; model: string; year: number; price_per_day: number;
  type: string; seats: number; transmission: string; fuel_type: string; status: string;
  description?: string; location?: string; photos?: string[];
  plate_number?: string; chassis_number?: string; color?: string;
  documents?: VehicleDocument[];
}

export const STATUS_CONFIG: Record<string, { icon: string; label: string; bg: string; text: string; border: string }> = {
  available: { icon: 'checkmark-circle', label: 'Disponible', bg: '#10B98120', text: '#10B981', border: '#10B98150' },
  rented: { icon: 'car', label: 'Loue', bg: '#FBBF2420', text: '#FBBF24', border: '#FBBF2450' },
  maintenance: { icon: 'construct', label: 'Maintenance', bg: '#EF444420', text: '#EF4444', border: '#EF444450' },
};

export const DOC_TYPES = [
  { v: 'carte_grise', l: 'Carte Grise', icon: 'document-text' },
  { v: 'assurance', l: 'Assurance', icon: 'shield-checkmark' },
  { v: 'controle_technique', l: 'Controle Technique', icon: 'clipboard' },
  { v: 'photo', l: 'Photo', icon: 'camera' },
  { v: 'autre', l: 'Autre', icon: 'attach' },
];

export const TYPES = ['Berline', 'SUV', 'Citadine', 'Utilitaire', 'Luxe', 'Van', 'Electrique'];
export const TRANSMISSIONS = [{ v: 'automatic', l: 'Automatique' }, { v: 'manual', l: 'Manuel' }];
export const FUELS = ['Essence', 'Diesel', 'Electrique', 'Hybride'];
export const STATUSES = [{ v: 'available', l: 'Disponible' }, { v: 'rented', l: 'Loue' }, { v: 'maintenance', l: 'Maintenance' }];

export const getStatus = (s: string) => STATUS_CONFIG[s] || { icon: 'help-circle', label: s, bg: '#6B728020', text: '#6B7280', border: '#6B728050' };
export const getDocIcon = (docType: string) => DOC_TYPES.find(d => d.v === docType)?.icon || 'document';
export const formatFileSize = (bytes: number) => bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;
export const getExpiryStatus = (expiry?: string) => {
  if (!expiry) return null;
  const now = new Date();
  const exp = new Date(expiry);
  const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: 'Expire', color: '#EF4444', icon: 'alert-circle' };
  if (diffDays <= 30) return { label: `${diffDays}j`, color: '#F59E0B', icon: 'warning' };
  return { label: expiry.slice(0, 10), color: '#10B981', icon: 'checkmark-circle' };
};

export const vst = StyleSheet.create({
  // Card styles
  card: { borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
  photoBox: { position: 'relative' },
  photo: { width: '100%', height: 90, borderTopLeftRadius: 10, borderTopRightRadius: 10 },
  photoPlaceholder: { width: '100%', height: 90, justifyContent: 'center', alignItems: 'center', borderTopLeftRadius: 10, borderTopRightRadius: 10 },
  statusOverlay: { position: 'absolute', bottom: 4, left: 4, flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  docCountBadge: { position: 'absolute', top: 4, right: 4, flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 8 },
  cardInfo: { padding: 8 },
  vehicleName: { fontSize: 14, fontWeight: '800' },
  plateTag: { marginTop: 3, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, alignSelf: 'flex-start', borderWidth: 1 },
  cardMeta: { marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2, marginTop: 4 },
  price: { fontSize: 14, fontWeight: '800' },
  editBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 8, marginTop: 8 },
  editBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // Modal shared styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalBox: { width: '100%', maxWidth: 560, borderRadius: 16, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 16, marginTop: 16, marginBottom: 10, borderTopWidth: 1 },
  sectionTitle: { fontSize: 14, fontWeight: '700' },
  fieldLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 },
  textArea: { minHeight: 60, textAlignVertical: 'top' },
  statusRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statusOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10, borderWidth: 1 },
  saveBtn: { borderWidth: 0 },

  // Photo/Doc styles
  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  photoThumb: { position: 'relative', width: 90, height: 70, borderRadius: 8, overflow: 'hidden' },
  photoThumbImg: { width: '100%', height: '100%' },
  photoDeleteBtn: { position: 'absolute', top: -4, right: -4, backgroundColor: '#fff', borderRadius: 11 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderStyle: 'dashed', marginBottom: 4 },
  docUploadRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  docItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  docIconBox: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  docActionBtn: { padding: 6, marginLeft: 4 },
  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  previewImage: { width: SCREEN_W * 0.9, height: SCREEN_W * 0.65, borderRadius: 12 },
  previewCloseBtn: { position: 'absolute', top: 40, right: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
});
