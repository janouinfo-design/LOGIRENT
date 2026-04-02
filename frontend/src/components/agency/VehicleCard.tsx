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
  const fuelIcon = item.fuel_type === 'electric' ? 'flash' : item.fuel_type === 'hybrid' ? 'leaf' : 'flame';
  const fuelLabel = item.fuel_type === 'electric' ? 'Electrique' : item.fuel_type === 'hybrid' ? 'Hybride' : item.fuel_type === 'diesel' ? 'Diesel' : 'Essence';
  const transLabel = item.transmission === 'automatic' ? 'Auto' : 'Manuel';

  return (
    <View
      style={[cs.card, { width: cardW, backgroundColor: C.card, borderColor: C.border }]}
      data-testid={`vehicle-card-${item.id}`}
    >
      {/* Image Section */}
      <TouchableOpacity
        onPress={() => hasPhotos ? onPhotoPress(item) : onEdit(item)}
        activeOpacity={0.9}
        style={cs.imageWrap}
      >
        {photo ? (
          <View style={[cs.imageContainer, { backgroundColor: '#111318' }]}>
            <Image source={{ uri: photo }} style={cs.image} resizeMode="contain" />
          </View>
        ) : (
          <View style={[cs.imagePlaceholder, { backgroundColor: C.bg }]}>
            <View style={cs.placeholderInner}>
              <Ionicons name="car-sport" size={52} color={C.textLight + '40'} />
              <Text style={{ color: C.textLight + '60', fontSize: 12, marginTop: 6, fontWeight: '500' }}>Aucune photo</Text>
            </View>
          </View>
        )}

        {/* Status Badge */}
        <View style={[cs.statusBadge, { backgroundColor: sc.bg, borderColor: sc.border }]} data-testid={`vehicle-status-${item.id}`}>
          <Ionicons name={sc.icon as any} size={11} color={sc.text} />
          <Text style={[cs.statusText, { color: sc.text }]}>{sc.label}</Text>
        </View>

        {/* Photo Count */}
        {hasPhotos && (
          <View style={cs.photoCount}>
            <Ionicons name="images" size={11} color="#fff" />
            <Text style={cs.photoCountText}>{item.photos!.length}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Content Section */}
      <View style={cs.content}>
        {/* Brand + Year */}
        <View style={cs.brandRow}>
          <Text style={[cs.brand, { color: '#7C3AED' }]}>{item.brand.toUpperCase()}</Text>
          <Text style={[cs.year, { color: C.textLight }]}>{item.year}</Text>
        </View>

        {/* Model */}
        <Text style={[cs.model, { color: C.text }]} numberOfLines={1}>{item.model}</Text>

        {/* Plate Number - Prominent */}
        {item.plate_number && (
          <View style={cs.plateWrap}>
            <View style={[cs.plateBadge, { backgroundColor: '#1a1f36', borderColor: '#2d3354' }]}>
              <View style={cs.plateCountryStripe} />
              <Text style={cs.plateText}>{item.plate_number}</Text>
            </View>
          </View>
        )}

        {/* Price */}
        <View style={cs.priceRow}>
          <Text style={[cs.price, { color: C.text }]}>CHF {item.price_per_day}</Text>
          <Text style={[cs.priceUnit, { color: C.textLight }]}>/jour</Text>
        </View>

        {/* Feature Tags */}
        <View style={cs.tagsRow}>
          <View style={[cs.tag, { backgroundColor: C.bg, borderColor: C.border }]}>
            <Ionicons name="people-outline" size={12} color={C.textLight} />
            <Text style={[cs.tagText, { color: C.text }]}>{item.seats}</Text>
          </View>
          <View style={[cs.tag, { backgroundColor: C.bg, borderColor: C.border }]}>
            <Ionicons name="cog-outline" size={12} color={C.textLight} />
            <Text style={[cs.tagText, { color: C.text }]}>{transLabel}</Text>
          </View>
          <View style={[cs.tag, { backgroundColor: C.bg, borderColor: C.border }]}>
            <Ionicons name={fuelIcon as any} size={12} color={C.textLight} />
            <Text style={[cs.tagText, { color: C.text }]}>{fuelLabel}</Text>
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={cs.detailsBtn}
          onPress={() => onEdit(item)}
          data-testid={`edit-vehicle-${item.id}`}
          activeOpacity={0.8}
        >
          <Text style={cs.detailsBtnText}>Voir les details</Text>
          <Ionicons name="arrow-forward" size={15} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const cs = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  } as any,

  // Image
  imageWrap: { position: 'relative' },
  imageContainer: { width: '100%', height: 220, justifyContent: 'center', alignItems: 'center' },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { width: '100%', height: 220, justifyContent: 'center', alignItems: 'center' },
  placeholderInner: { alignItems: 'center' },

  statusBadge: {
    position: 'absolute', top: 10, left: 10,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1,
  },
  statusText: { fontSize: 11, fontWeight: '700' },

  photoCount: {
    position: 'absolute', bottom: 10, right: 10,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.6)',
  },
  photoCountText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // Content
  content: { padding: 16, gap: 6 },

  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { fontSize: 13, fontWeight: '800', letterSpacing: 1.8 },
  year: { fontSize: 13, fontWeight: '600' },

  model: { fontSize: 22, fontWeight: '900', letterSpacing: -0.3, marginBottom: 2 },

  // Plate
  plateWrap: { marginTop: 2, marginBottom: 4, alignSelf: 'flex-start' },
  plateBadge: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 5, borderWidth: 1.5,
    overflow: 'hidden',
  },
  plateCountryStripe: {
    width: 8, height: '100%',
    backgroundColor: '#003DA5',
  },
  plateText: {
    color: '#fff', fontSize: 14, fontWeight: '800',
    letterSpacing: 2, paddingHorizontal: 12, paddingVertical: 5,
  },

  // Price
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2, marginTop: 4 },
  price: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  priceUnit: { fontSize: 14, fontWeight: '500' },

  // Tags
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1,
  },
  tagText: { fontSize: 12, fontWeight: '600' },

  // Action
  detailsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 10,
    backgroundColor: '#7C3AED', marginTop: 10,
  },
  detailsBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
