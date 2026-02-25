import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Vehicle } from '../store/vehicleStore';

interface Props {
  vehicle: Vehicle;
  onPress: () => void;
}

const CARD_GAP = 12;
const SCREEN_PADDING = 16;
const cardWidth = (Dimensions.get('window').width - SCREEN_PADDING * 2 - CARD_GAP) / 2;

const COLORS = {
  primary: '#0F172A',
  gold: '#D4A853',
  goldLight: '#F5E6C8',
  card: '#FFFFFF',
  text: '#0F172A',
  textLight: '#64748B',
  success: '#10B981',
  error: '#EF4444',
  bg: '#F8FAFC',
  border: '#E2E8F0',
};

export default function VehicleCard({ vehicle, onPress }: Props) {
  const isAvailable = vehicle.status === 'available';

  return (
    <TouchableOpacity
      style={[styles.card, { width: cardWidth > 180 ? cardWidth : '48%' }]}
      onPress={onPress}
      activeOpacity={0.92}
      data-testid={`vehicle-card-${vehicle.id}`}
    >
      {/* Square Photo */}
      <View style={styles.imageBox}>
        {vehicle.photos.length > 0 ? (
          <Image source={{ uri: vehicle.photos[0] }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="car-sport" size={36} color={COLORS.textLight} />
          </View>
        )}
        {/* Availability Badge */}
        <View style={[styles.availBadge, { backgroundColor: isAvailable ? COLORS.success : COLORS.error }]}>
          <View style={[styles.availDot, { backgroundColor: isAvailable ? '#6EE7B7' : '#FCA5A5' }]} />
          <Text style={styles.availText}>{isAvailable ? 'Disponible' : 'Indisponible'}</Text>
        </View>
        {/* Type Badge */}
        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>{vehicle.type}</Text>
        </View>
      </View>

      {/* Info below */}
      <View style={styles.info}>
        <Text style={styles.brand} numberOfLines={1}>{vehicle.brand}</Text>
        <Text style={styles.model} numberOfLines={1}>{vehicle.model} {vehicle.year}</Text>
        
        <View style={styles.specs}>
          <View style={styles.spec}>
            <Ionicons name="people-outline" size={12} color={COLORS.textLight} />
            <Text style={styles.specText}>{vehicle.seats}</Text>
          </View>
          <View style={styles.spec}>
            <Ionicons name="cog-outline" size={12} color={COLORS.textLight} />
            <Text style={styles.specText}>{vehicle.transmission === 'automatic' ? 'Auto' : 'Man.'}</Text>
          </View>
          <View style={styles.spec}>
            <Ionicons name="flash-outline" size={12} color={COLORS.textLight} />
            <Text style={styles.specText}>{vehicle.fuel_type}</Text>
          </View>
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.price}>CHF {vehicle.price_per_day}</Text>
          <Text style={styles.perDay}>/jour</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: CARD_GAP,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  imageBox: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#F1F5F9',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  availBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  availDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  availText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  typeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  info: {
    padding: 10,
  },
  brand: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.gold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  model: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 1,
  },
  specs: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  spec: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  specText: {
    fontSize: 10,
    color: COLORS.textLight,
    textTransform: 'capitalize',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  price: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
  },
  perDay: {
    fontSize: 11,
    color: COLORS.textLight,
    marginLeft: 2,
  },
});
