import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Vehicle, getStatus, getPhotoUrl } from './vehicleTypes';

interface Props {
  item: Vehicle;
  cardW: number;
  colors: any;
  onEdit: (v: Vehicle) => void;
  onDelete?: (v: Vehicle) => void;
  onPhotoPress: (v: Vehicle) => void;
}

export default function VehicleCard({ item, cardW, colors: C, onEdit, onDelete, onPhotoPress }: Props) {
  const router = useRouter();
  const sc = getStatus(item.status);
  const photo = item.photos?.[0] ? getPhotoUrl(item.photos[0]) : null;
  const photoCount = item.photos?.length || 0;
  const fuelLabel = item.fuel_type === 'electric' ? 'Elec.' : item.fuel_type === 'hybrid' ? 'Hybride' : item.fuel_type === 'diesel' ? 'Diesel' : 'Essence';
  const transLabel = item.transmission === 'automatic' ? 'Auto' : 'Manuel';

  const goDetail = () => router.push({ pathname: '/agency-app/vehicle-detail', params: { id: item.id } });

  return (
    <View style={[s.card, { width: cardW, backgroundColor: C.card, borderColor: C.border }]} data-testid={`vehicle-card-${item.id}`}>

      {/* Photo - cliquable pour galerie */}
      <TouchableOpacity
        onPress={() => photoCount > 0 ? onPhotoPress(item) : goDetail()}
        activeOpacity={0.9}
        style={s.photoZone}
        data-testid={`photo-zone-${item.id}`}
      >
        {photo ? (
          <Image source={{ uri: photo }} style={s.photo} resizeMode="cover" />
        ) : (
          <View style={[s.photoPlaceholder, { backgroundColor: C.bg }]}>
            <Ionicons name="car-sport-outline" size={40} color={C.textLight + '50'} />
          </View>
        )}
        <View style={[s.badge, { backgroundColor: sc.bg, borderColor: sc.border }]} data-testid={`vehicle-status-${item.id}`}>
          <View style={[s.dot, { backgroundColor: sc.text }]} />
          <Text style={[s.badgeText, { color: sc.text }]}>{sc.label}</Text>
        </View>
        {photoCount > 1 && (
          <View style={s.photoBadge}>
            <Ionicons name="camera" size={11} color="#fff" />
            <Text style={s.photoBadgeText}>{photoCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Info */}
      <View style={s.info}>
        <Text style={[s.brandYear, { color: C.textLight }]}>{item.brand} · {item.year}</Text>
        <Text style={[s.model, { color: C.text }]} numberOfLines={1}>{item.model}</Text>
        <View style={s.specsRow}>
          <Text style={[s.spec, { color: C.textLight, backgroundColor: C.bg }]}>{item.seats}pl</Text>
          <Text style={[s.spec, { color: C.textLight, backgroundColor: C.bg }]}>{transLabel}</Text>
          <Text style={[s.spec, { color: C.textLight, backgroundColor: C.bg }]}>{fuelLabel}</Text>
        </View>
        <View style={s.priceRow}>
          <Text style={[s.price, { color: C.text }]}>CHF {item.price_per_day}</Text>
          <Text style={[s.priceUnit, { color: C.textLight }]}> /jour</Text>
        </View>
      </View>

      {/* CTA */}
      <View style={[s.cta, { borderTopColor: C.border }]}>
        <TouchableOpacity onPress={() => onEdit(item)} style={[s.btnEdit, { borderColor: '#F59E0B40', backgroundColor: '#F59E0B10' }]} data-testid={`edit-btn-${item.id}`} activeOpacity={0.7}>
          <Ionicons name="create-outline" size={15} color="#D97706" />
          <Text style={{ color: '#D97706', fontSize: 12, fontWeight: '700' }}>Modifier</Text>
        </TouchableOpacity>
        {onDelete && (
          <TouchableOpacity onPress={() => onDelete(item)} style={[s.btnEdit, { borderColor: '#EF444440', backgroundColor: '#EF444410' }]} data-testid={`delete-btn-${item.id}`} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={15} color="#EF4444" />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={goDetail} style={[s.btnSec, { borderColor: C.border }]} data-testid={`details-btn-${item.id}`} activeOpacity={0.7}>
          <Ionicons name="information-circle-outline" size={15} color={C.textLight} />
          <Text style={[s.btnSecText, { color: C.text }]}>Details</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={goDetail} style={s.btnPrim} data-testid={`reserve-btn-${item.id}`} activeOpacity={0.8}>
          <Text style={s.btnPrimText}>Reserver</Text>
          <Ionicons name="arrow-forward" size={14} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 14, borderWidth: 1, overflow: 'hidden',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  } as any,

  photoZone: { position: 'relative', height: 140, overflow: 'hidden', backgroundColor: '#1a1a2e' },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  badge: { position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  photoBadge: { position: 'absolute', bottom: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.6)' },
  photoBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  info: { padding: 12, gap: 3 },
  brandYear: { fontSize: 12, fontWeight: '500' },
  model: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  specsRow: { flexDirection: 'row', gap: 5, marginTop: 6 },
  spec: { fontSize: 11, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overflow: 'hidden' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 6 },
  price: { fontSize: 20, fontWeight: '900' },
  priceUnit: { fontSize: 12, fontWeight: '500' },

  cta: { flexDirection: 'row', gap: 6, padding: 12, paddingTop: 12, borderTopWidth: 1 },
  btnEdit: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1 },
  btnSec: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5 },
  btnSecText: { fontSize: 13, fontWeight: '700' },
  btnPrim: { flex: 1.4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: 10, backgroundColor: '#7C3AED' },
  btnPrimText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
