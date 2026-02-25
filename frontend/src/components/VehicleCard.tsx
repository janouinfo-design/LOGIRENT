import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Vehicle } from '../store/vehicleStore';
import { useI18n } from '../i18n';

interface Props {
  vehicle: Vehicle;
  onPress: () => void;
  index?: number;
}

const C = {
  purple: '#6B21A8',
  purpleLight: '#7C3AED',
  dark: '#1A1A2E',
  gray: '#6B7280',
  grayLight: '#9CA3AF',
  bg: '#F3F4F6',
  card: '#FFFFFF',
  text: '#111827',
  border: '#E5E7EB',
  success: '#10B981',
  error: '#EF4444',
};

export default function VehicleCard({ vehicle, onPress, index = 0 }: Props) {
  const { t } = useI18n();
  const isAvailable = vehicle.status === 'available';
  const hasPhoto = vehicle.photos?.length > 0;

  return (
    <View
      style={[styles.card]}
      data-testid={`vehicle-card-${vehicle.id}`}
    >
      {/* Top Row: Price + Details Button */}
      <View style={styles.topRow}>
        <View>
          <Text style={styles.price}>CHF {vehicle.price_per_day}</Text>
          <Text style={styles.perDay}>{t('perDay')}</Text>
        </View>
        <TouchableOpacity style={styles.detailsBtn} onPress={onPress} data-testid={`vehicle-details-${vehicle.id}`}>
          <Text style={styles.detailsBtnText}>{t('details')}</Text>
          <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Car Image */}
      <TouchableOpacity style={styles.imageContainer} onPress={onPress} activeOpacity={0.9}>
        {hasPhoto ? (
          <Image source={{ uri: vehicle.photos[0] }} style={styles.carImage} resizeMode="contain" />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="car-sport" size={48} color={C.grayLight} />
          </View>
        )}
        {/* Availability dot */}
        <View style={[styles.statusDot, { backgroundColor: isAvailable ? C.success : C.error }]} />
      </TouchableOpacity>

      {/* Bottom Info */}
      <View style={styles.bottomInfo}>
        <Text style={styles.brand}>{vehicle.brand}</Text>
        <Text style={styles.model}>{vehicle.model} {vehicle.year}</Text>
        <View style={styles.specsRow}>
          <View style={styles.specChip}>
            <Ionicons name="people-outline" size={12} color={C.purple} />
            <Text style={styles.specText}>{vehicle.seats} {t('seats')}</Text>
          </View>
          <View style={styles.specChip}>
            <Ionicons name="cog-outline" size={12} color={C.purple} />
            <Text style={styles.specText}>{vehicle.transmission === 'automatic' ? t('automatic') : t('manual')}</Text>
          </View>
          <View style={styles.specChip}>
            <Ionicons name="flash-outline" size={12} color={C.purple} />
            <Text style={styles.specText}>{vehicle.fuel_type}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
    width: 340,
    maxWidth: '100%',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 4,
  },
  price: {
    fontSize: 20,
    fontWeight: '800',
    color: C.dark,
  },
  perDay: {
    fontSize: 11,
    color: C.grayLight,
    marginTop: -2,
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.purple,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  detailsBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1.4,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  carImage: {
    width: '90%',
    height: '90%',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusDot: {
    position: 'absolute',
    top: 8,
    right: 12,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: C.card,
  },
  bottomInfo: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  brand: {
    fontSize: 11,
    fontWeight: '700',
    color: C.purple,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  model: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
    marginTop: 2,
  },
  specsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  specChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: C.bg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  specText: {
    fontSize: 10,
    fontWeight: '500',
    color: C.gray,
    textTransform: 'capitalize',
  },
});
