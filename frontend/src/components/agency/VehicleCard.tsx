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
  const fuelLabel = item.fuel_type === 'electric' ? 'Elec.' : item.fuel_type === 'hybrid' ? 'Hybride' : item.fuel_type === 'diesel' ? 'Diesel' : 'Essence';
  const transLabel = item.transmission === 'automatic' ? 'Auto' : 'Manuel';

  return (
    <TouchableOpacity
      onPress={() => onEdit(item)}
      activeOpacity={0.85}
      style={[cs.card, { width: cardW, backgroundColor: C.card, borderColor: C.border }]}
      data-testid={`vehicle-card-${item.id}`}
    >
      {/* Image */}
      <View style={cs.imageWrap}>
        {photo ? (
          <View style={[cs.imageContainer, { backgroundColor: '#f0f0f2' }]}>
            <Image source={{ uri: photo }} style={cs.image} resizeMode="cover" />
          </View>
        ) : (
          <View style={[cs.imagePlaceholder, { backgroundColor: C.bg }]}>
            <Ionicons name="car-sport" size={36} color={C.textLight + '40'} />
          </View>
        )}
        <View style={[cs.statusBadge, { backgroundColor: sc.bg, borderColor: sc.border }]} data-testid={`vehicle-status-${item.id}`}>
          <View style={[cs.statusDot, { backgroundColor: sc.text }]} />
          <Text style={[cs.statusText, { color: sc.text }]}>{sc.label}</Text>
        </View>
        {hasPhotos && item.photos!.length > 1 && (
          <View style={cs.photoCount}>
            <Ionicons name="images" size={10} color="#fff" />
            <Text style={cs.photoCountText}>{item.photos!.length}</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={cs.content}>
        <View style={cs.topLine}>
          <Text style={[cs.brand, { color: C.textLight }]}>{item.brand}</Text>
          <Text style={[cs.year, { color: C.textLight }]}>{item.year}</Text>
        </View>
        <Text style={[cs.model, { color: C.text }]} numberOfLines={1}>{item.model}</Text>
        <View style={cs.priceRow}>
          <Text style={[cs.price, { color: C.text }]}>CHF {item.price_per_day}</Text>
          <Text style={[cs.priceUnit, { color: C.textLight }]}> /jour</Text>
        </View>
        <View style={cs.tagsRow}>
          <Text style={[cs.tag, { color: C.textLight, backgroundColor: C.bg, borderColor: C.border }]}>{item.seats}pl</Text>
          <Text style={[cs.tag, { color: C.textLight, backgroundColor: C.bg, borderColor: C.border }]}>{transLabel}</Text>
          <Text style={[cs.tag, { color: C.textLight, backgroundColor: C.bg, borderColor: C.border }]}>{fuelLabel}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const cs = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    boxShadow: '0 1px 8px rgba(0,0,0,0.05)',
  } as any,

  imageWrap: { position: 'relative' },
  imageContainer: { width: '100%', height: 140 },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { width: '100%', height: 140, justifyContent: 'center', alignItems: 'center' },

  statusBadge: {
    position: 'absolute', top: 8, left: 8,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 6, borderWidth: 1,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },

  photoCount: {
    position: 'absolute', bottom: 8, right: 8,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 3,
    borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.55)',
  },
  photoCountText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  content: { padding: 12, gap: 2 },

  topLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 } as any,
  year: { fontSize: 11, fontWeight: '500' },

  model: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2, marginBottom: 2 },

  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 2 },
  price: { fontSize: 18, fontWeight: '900' },
  priceUnit: { fontSize: 12, fontWeight: '500' },

  tagsRow: { flexDirection: 'row', gap: 5, marginTop: 6 },
  tag: {
    fontSize: 11, fontWeight: '600',
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 6, borderWidth: 1,
    overflow: 'hidden',
  },
});
