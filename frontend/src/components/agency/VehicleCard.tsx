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
  const photoCount = item.photos?.length || 0;
  const fuelLabel = item.fuel_type === 'electric' ? 'Electrique' : item.fuel_type === 'hybrid' ? 'Hybride' : item.fuel_type === 'diesel' ? 'Diesel' : 'Essence';
  const transLabel = item.transmission === 'automatic' ? 'Automatique' : 'Manuelle';

  return (
    <View style={[s.card, { width: cardW, backgroundColor: C.card, borderColor: C.border }]} data-testid={`vehicle-card-${item.id}`}>

      {/* === PHOTO ZONE (cliquable -> galerie) === */}
      <TouchableOpacity
        onPress={() => photoCount > 0 ? onPhotoPress(item) : onEdit(item)}
        activeOpacity={0.9}
        style={s.photoZone}
        data-testid={`photo-zone-${item.id}`}
      >
        {photo ? (
          <Image source={{ uri: photo }} style={s.photo} resizeMode="cover" />
        ) : (
          <View style={[s.photoPlaceholder, { backgroundColor: C.bg }]}>
            <Ionicons name="car-sport-outline" size={40} color={C.textLight + '50'} />
            <Text style={{ color: C.textLight + '70', fontSize: 11, marginTop: 4 }}>Aucune photo</Text>
          </View>
        )}

        {/* Status badge */}
        <View style={[s.badge, { backgroundColor: sc.bg, borderColor: sc.border }]} data-testid={`vehicle-status-${item.id}`}>
          <View style={[s.dot, { backgroundColor: sc.text }]} />
          <Text style={[s.badgeText, { color: sc.text }]}>{sc.label}</Text>
        </View>

        {/* Photo count badge */}
        {photoCount > 1 && (
          <View style={s.photoBadge}>
            <Ionicons name="camera" size={12} color="#fff" />
            <Text style={s.photoBadgeText}>{photoCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* === INFO === */}
      <View style={s.info}>
        <Text style={[s.brandYear, { color: C.textLight }]}>{item.brand} · {item.year}</Text>
        <Text style={[s.model, { color: C.text }]} numberOfLines={1}>{item.model}</Text>

        {/* Specs row */}
        <View style={s.specs}>
          <View style={[s.spec, { backgroundColor: C.bg }]}>
            <Ionicons name="people-outline" size={12} color={C.textLight} />
            <Text style={[s.specText, { color: C.textLight }]}>{item.seats} pl.</Text>
          </View>
          <View style={[s.spec, { backgroundColor: C.bg }]}>
            <Ionicons name="cog-outline" size={12} color={C.textLight} />
            <Text style={[s.specText, { color: C.textLight }]}>{transLabel}</Text>
          </View>
          <View style={[s.spec, { backgroundColor: C.bg }]}>
            <Ionicons name="speedometer-outline" size={12} color={C.textLight} />
            <Text style={[s.specText, { color: C.textLight }]}>{fuelLabel}</Text>
          </View>
        </View>

        {/* Price */}
        <View style={s.priceRow}>
          <Text style={[s.priceFrom, { color: C.textLight }]}>A partir de</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={[s.price, { color: C.text }]}>CHF {item.price_per_day}</Text>
            <Text style={[s.priceUnit, { color: C.textLight }]}> /jour</Text>
          </View>
        </View>
      </View>

      {/* === CTA BUTTONS === */}
      <View style={[s.cta, { borderTopColor: C.border }]}>
        <TouchableOpacity
          onPress={() => onEdit(item)}
          style={[s.btnSecondary, { borderColor: C.border }]}
          data-testid={`details-btn-${item.id}`}
          activeOpacity={0.7}
        >
          <Ionicons name="information-circle-outline" size={16} color={C.textLight} />
          <Text style={[s.btnSecondaryText, { color: C.text }]}>Details</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onEdit(item)}
          style={s.btnPrimary}
          data-testid={`reserve-btn-${item.id}`}
          activeOpacity={0.8}
        >
          <Text style={s.btnPrimaryText}>Reserver</Text>
          <Ionicons name="arrow-forward" size={14} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    transition: 'box-shadow 0.2s ease, transform 0.2s ease',
  } as any,

  // Photo
  photoZone: { position: 'relative', height: 160, overflow: 'hidden' } as any,
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  badge: {
    position: 'absolute', top: 10, left: 10,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  photoBadge: {
    position: 'absolute', bottom: 10, right: 10,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.6)',
  },
  photoBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // Info
  info: { padding: 14, gap: 4 },
  brandYear: { fontSize: 12, fontWeight: '500' },
  model: { fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },

  specs: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  spec: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
  specText: { fontSize: 11, fontWeight: '600' },

  priceRow: { marginTop: 10 },
  priceFrom: { fontSize: 10, fontWeight: '500', marginBottom: 1 },
  price: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  priceUnit: { fontSize: 13, fontWeight: '500' },

  // CTA
  cta: { flexDirection: 'row', gap: 8, padding: 12, paddingTop: 12, borderTopWidth: 1 },
  btnSecondary: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5,
  },
  btnSecondaryText: { fontSize: 13, fontWeight: '700' },
  btnPrimary: {
    flex: 1.4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 10, borderRadius: 10, backgroundColor: '#7C3AED',
  },
  btnPrimaryText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
