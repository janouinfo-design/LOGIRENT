import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Vehicle } from '../store/vehicleStore';
import { useI18n } from '../i18n';
import { getPhotoUrl } from '../utils/photoUrl';

interface Props {
  vehicle: Vehicle;
  onPress: () => void;
  index?: number;
}

const ACCENT = '#7C3AED';

export default function VehicleCard({ vehicle, onPress, index = 0 }: Props) {
  const router = useRouter();
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isAvailable = vehicle.status === 'available';
  const hasPhoto = vehicle.photos?.length > 0;
  const photoCount = vehicle.photos?.length || 0;
  const fuelLabel = vehicle.fuel_type === 'electric' ? 'Elec.' : vehicle.fuel_type === 'hybrid' ? 'Hybride' : vehicle.fuel_type === 'diesel' ? 'Diesel' : 'Essence';
  const transLabel = vehicle.transmission === 'automatic' ? 'Auto' : 'Manuel';

  const goDetail = () => router.push(`/vehicle/${vehicle.id}`);
  const goBook = () => router.push(`/booking/${vehicle.id}`);

  return (
    <View style={[s.card]} data-testid={`vehicle-card-${vehicle.id}`}>
      {/* Photo */}
      <TouchableOpacity onPress={goDetail} activeOpacity={0.9} style={[s.photoZone, isMobile && { height: 200 }]}>
        {hasPhoto ? (
          <View style={{ flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' }}>
            <Image source={{ uri: getPhotoUrl(vehicle.photos[0]) }} style={s.photo} resizeMode="contain" />
          </View>
        ) : (
          <View style={s.placeholder}><Ionicons name="car-sport-outline" size={40} color="#D1D5DB" /></View>
        )}
        <View style={[s.statusBadge, { backgroundColor: isAvailable ? '#10B98118' : '#EF444418', borderColor: isAvailable ? '#10B98140' : '#EF444440' }]}>
          <View style={[s.statusDot, { backgroundColor: isAvailable ? '#10B981' : '#EF4444' }]} />
          <Text style={{ fontSize: 11, fontWeight: '700', color: isAvailable ? '#059669' : '#DC2626' }}>{isAvailable ? 'Disponible' : 'Indisponible'}</Text>
        </View>
        {photoCount > 1 && (
          <View style={s.photoBadge}><Ionicons name="camera" size={11} color="#fff" /><Text style={s.photoBadgeText}>{photoCount}</Text></View>
        )}
      </TouchableOpacity>

      {/* Info */}
      <View style={s.info}>
        <Text style={s.brand}>{vehicle.brand} · {vehicle.year}</Text>
        <Text style={[s.model, isMobile && { fontSize: 18 }]} numberOfLines={1}>{vehicle.model}</Text>
        <View style={s.specsRow}>
          <Text style={s.spec}>{vehicle.seats} pl.</Text>
          <Text style={s.spec}>{transLabel}</Text>
          <Text style={s.spec}>{fuelLabel}</Text>
        </View>
        <View style={s.priceRow}>
          <Text style={s.price}>CHF {vehicle.price_per_day}</Text>
          <Text style={s.priceUnit}> /jour</Text>
        </View>
      </View>

      {/* CTA */}
      <View style={s.cta}>
        <TouchableOpacity onPress={goDetail} style={s.btnSec} data-testid={`details-btn-${vehicle.id}`} activeOpacity={0.7}>
          <Ionicons name="information-circle-outline" size={15} color="#6B7280" />
          <Text style={s.btnSecText}>Details</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={goBook} style={s.btnPrim} data-testid={`reserve-btn-${vehicle.id}`} activeOpacity={0.8}>
          <Text style={s.btnPrimText}>Reserver</Text>
          <Ionicons name="arrow-forward" size={14} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' } as any,
  photoZone: { position: 'relative', height: 200, overflow: 'hidden', backgroundColor: '#F8FAFC' },
  photo: { width: '100%', height: '100%' },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' },
  statusBadge: { position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  photoBadge: { position: 'absolute', bottom: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.6)' },
  photoBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  info: { padding: 12, gap: 3 },
  brand: { fontSize: 12, fontWeight: '500', color: '#6B7280' },
  model: { fontSize: 16, fontWeight: '800', color: '#111827', letterSpacing: -0.2 },
  specsRow: { flexDirection: 'row', gap: 5, marginTop: 6 },
  spec: { fontSize: 11, fontWeight: '600', color: '#6B7280', backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overflow: 'hidden' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 6 },
  price: { fontSize: 20, fontWeight: '900', color: '#111827' },
  priceUnit: { fontSize: 12, fontWeight: '500', color: '#9CA3AF' },
  cta: { flexDirection: 'row', gap: 8, padding: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  btnSec: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5, borderColor: '#E5E7EB' },
  btnSecText: { fontSize: 13, fontWeight: '700', color: '#111827' },
  btnPrim: { flex: 1.4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: 10, backgroundColor: ACCENT },
  btnPrimText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
