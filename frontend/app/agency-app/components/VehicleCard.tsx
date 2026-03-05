import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Vehicle, getStatus, vst } from './vehicleTypes';

interface Props {
  item: Vehicle;
  cardW: number;
  colors: any;
  onEdit: (v: Vehicle) => void;
  onPhotoPress: (v: Vehicle) => void;
}

export default function VehicleCard({ item, cardW, colors: C, onEdit, onPhotoPress }: Props) {
  const sc = getStatus(item.status);
  const photo = item.photos?.[0];
  const docCount = item.documents?.filter(d => !d.is_deleted).length || 0;
  const hasPhotos = item.photos && item.photos.length > 0;

  return (
    <View style={[vst.card, { width: cardW, backgroundColor: C.card, borderColor: C.border }]} data-testid={`vehicle-card-${item.id}`}>
      <TouchableOpacity onPress={() => hasPhotos ? onPhotoPress(item) : onEdit(item)} activeOpacity={0.8} style={vst.photoBox}>
        {photo ? (
          <Image source={{ uri: photo }} style={vst.photo} resizeMode="cover" />
        ) : (
          <View style={[vst.photoPlaceholder, { backgroundColor: C.border + '40' }]}>
            <Ionicons name="car-sport" size={28} color={C.textLight} />
          </View>
        )}
        <View style={[vst.statusOverlay, { backgroundColor: sc.bg, borderColor: sc.border }]} data-testid={`vehicle-status-${item.id}`}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: sc.text }} />
          <Text style={{ color: sc.text, fontSize: 11, fontWeight: '800' }}>{sc.label}</Text>
        </View>
        {docCount > 0 && (
          <View style={[vst.docCountBadge, { backgroundColor: '#3B82F6' }]} data-testid={`doc-count-${item.id}`}>
            <Ionicons name="document-attach" size={11} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{docCount}</Text>
          </View>
        )}
        {hasPhotos && (
          <View style={{ position: 'absolute', top: 4, left: 4, flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <Ionicons name="images" size={10} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{item.photos!.length}</Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={vst.cardInfo}>
        <Text style={[vst.vehicleName, { color: C.text }]} numberOfLines={1}>{item.brand} {item.model}</Text>
        <Text style={{ color: C.textLight, fontSize: 12, marginTop: 2 }}>{item.year} | {item.type}</Text>
        {item.plate_number ? (
          <View style={[vst.plateTag, { backgroundColor: C.accent + '15', borderColor: C.accent + '40' }]}>
            <Text style={{ color: C.accent, fontSize: 11, fontWeight: '700' }}>{item.plate_number}</Text>
          </View>
        ) : null}
        <View style={vst.cardMeta}>
          <Text style={{ color: C.textLight, fontSize: 11 }}>{item.seats}pl | {item.transmission === 'automatic' ? 'Auto' : 'Man.'}</Text>
        </View>
        <View style={vst.priceRow}>
          <Text style={[vst.price, { color: C.accent }]}>CHF {item.price_per_day}</Text>
          <Text style={{ color: C.textLight, fontSize: 11 }}>/jour</Text>
        </View>
        <TouchableOpacity onPress={() => onEdit(item)} style={[vst.editBtn, { backgroundColor: C.accent }]} data-testid={`edit-vehicle-${item.id}`}>
          <Ionicons name="create-outline" size={14} color="#fff" />
          <Text style={vst.editBtnText}>Modifier</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
