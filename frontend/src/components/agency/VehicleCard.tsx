import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Vehicle, getStatus, getPhotoUrl } from './vehicleTypes';

interface Props {
  item: Vehicle;
  cardW: number;
  colors: any;
  onEdit: (v: Vehicle) => void;
  onPhotoPress: (v: Vehicle) => void;
}

export default function VehicleCard({ item, cardW, colors: C, onEdit, onPhotoPress }: Props) {
  const sc = getStatus(item.status);
  const photo = item.photos?.[0] ? getPhotoUrl(item.photos[0]) : null;
  const hasPhotos = item.photos && item.photos.length > 0;
  const fuelLabel = item.fuel_type === 'electric' ? 'Electrique' : item.fuel_type === 'hybrid' ? 'Hybride' : item.fuel_type === 'diesel' ? 'Diesel' : 'Essence';
  const transLabel = item.transmission === 'automatic' ? 'Automatique' : 'Manuel';

  return (
    <View style={[cs.card, { width: cardW, backgroundColor: C.card, borderColor: C.border }]} data-testid={`vehicle-card-${item.id}`}>
      {/* Top: Price + Détails */}
      <View style={cs.topRow}>
        <View>
          <Text style={[cs.price, { color: C.text }]}>CHF {item.price_per_day}</Text>
          <Text style={[cs.priceUnit, { color: C.textLight }]}>/jour</Text>
        </View>
        <TouchableOpacity style={cs.detailsBtn} onPress={() => onEdit(item)} data-testid={`edit-vehicle-${item.id}`}>
          <Text style={cs.detailsBtnText}>Détails</Text>
          <Ionicons name="arrow-forward" size={14} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Photo */}
      <TouchableOpacity onPress={() => hasPhotos ? onPhotoPress(item) : onEdit(item)} activeOpacity={0.85} style={cs.photoWrap}>
        {photo ? (
          <Image source={{ uri: photo }} style={cs.photo} resizeMode="cover" />
        ) : (
          <View style={[cs.photoPlaceholder, { backgroundColor: C.border + '30' }]}>
            <Ionicons name="car-sport" size={48} color={C.textLight} />
          </View>
        )}
        {/* Status dot */}
        <View style={[cs.statusDot, { backgroundColor: sc.text }]} data-testid={`vehicle-status-${item.id}`} />
        {/* Photo count */}
        {hasPhotos && (
          <View style={cs.photoCount}>
            <Ionicons name="images" size={10} color="#fff" />
            <Text style={cs.photoCountText}>{item.photos!.length}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Info */}
      <View style={cs.info}>
        <Text style={[cs.brand, { color: '#7C3AED' }]}>{item.brand.toUpperCase()}</Text>
        <Text style={[cs.model, { color: C.text }]} numberOfLines={1}>{item.model} {item.year}</Text>

        {/* Feature Badges */}
        <View style={cs.badges}>
          <View style={[cs.badge, { backgroundColor: C.bg, borderColor: C.border }]}>
            <Ionicons name="people-outline" size={12} color={C.textLight} />
            <Text style={[cs.badgeText, { color: C.text }]}>{item.seats} Places</Text>
          </View>
          <View style={[cs.badge, { backgroundColor: C.bg, borderColor: C.border }]}>
            <Ionicons name="cog-outline" size={12} color={C.textLight} />
            <Text style={[cs.badgeText, { color: C.text }]}>{transLabel}</Text>
          </View>
          <View style={[cs.badge, { backgroundColor: C.bg, borderColor: C.border }]}>
            <Ionicons name="flash-outline" size={12} color={C.textLight} />
            <Text style={[cs.badgeText, { color: C.text }]}>{fuelLabel}</Text>
          </View>
        </View>

        {/* Plate */}
        {item.plate_number && (
          <View style={[cs.plate, { borderColor: C.border }]}>
            <Text style={[cs.plateText, { color: C.textLight }]}>{item.plate_number}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const cs = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },

  // Top Row
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 14, paddingTop: 14, paddingBottom: 8 },
  price: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  priceUnit: { fontSize: 12, fontWeight: '500', marginTop: -2 },
  detailsBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#7C3AED', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  detailsBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Photo
  photoWrap: { position: 'relative', marginHorizontal: 0 },
  photo: { width: '100%', height: 220, backgroundColor: '#f0f0f0' },
  photoPlaceholder: { width: '100%', height: 220, justifyContent: 'center', alignItems: 'center' },
  statusDot: { position: 'absolute', top: 10, right: 10, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#fff' },
  photoCount: { position: 'absolute', bottom: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.55)' },
  photoCountText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  // Info
  info: { padding: 14, paddingTop: 10 },
  brand: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 },
  model: { fontSize: 17, fontWeight: '800', marginBottom: 10 },

  // Badges
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: '600' },

  // Plate
  plate: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, alignSelf: 'flex-start' },
  plateText: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
});
