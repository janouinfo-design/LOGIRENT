import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Vehicle } from '../store/vehicleStore';

interface Props {
  vehicle: Vehicle;
  onPress: () => void;
}

const COLORS = {
  primary: '#1E3A8A',
  secondary: '#F59E0B',
  background: '#F8FAFC',
  card: '#FFFFFF',
  text: '#1E293B',
  textLight: '#64748B',
  success: '#10B981',
  border: '#E2E8F0',
};

export default function VehicleCard({ vehicle, onPress }: Props) {
  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'suv': return 'car-sport';
      case 'citadine': return 'car';
      case 'berline': return 'car-outline';
      case 'utilitaire': return 'cube';
      default: return 'car';
    }
  };

  const getFuelIcon = (fuel: string) => {
    switch (fuel.toLowerCase()) {
      case 'electric': return 'flash';
      case 'hybrid': return 'leaf';
      default: return 'water';
    }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.imageContainer}>
        {vehicle.photos.length > 0 ? (
          <Image
            source={{ uri: vehicle.photos[0] }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="car" size={48} color={COLORS.textLight} />
          </View>
        )}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{vehicle.type}</Text>
        </View>
      </View>
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{vehicle.brand} {vehicle.model}</Text>
          <Text style={styles.year}>{vehicle.year}</Text>
        </View>
        
        <View style={styles.features}>
          <View style={styles.feature}>
            <Ionicons name="people" size={16} color={COLORS.textLight} />
            <Text style={styles.featureText}>{vehicle.seats}</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="cog" size={16} color={COLORS.textLight} />
            <Text style={styles.featureText}>{vehicle.transmission === 'automatic' ? 'Auto' : 'Manual'}</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name={getFuelIcon(vehicle.fuel_type)} size={16} color={COLORS.textLight} />
            <Text style={styles.featureText}>{vehicle.fuel_type}</Text>
          </View>
        </View>
        
        <View style={styles.footer}>
          <View style={styles.location}>
            <Ionicons name="location" size={14} color={COLORS.textLight} />
            <Text style={styles.locationText}>{vehicle.location}</Text>
          </View>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>CHF {vehicle.price_per_day}</Text>
            <Text style={styles.perDay}>/day</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  imageContainer: {
    height: 160,
    backgroundColor: COLORS.background,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  year: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  features: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 16,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  featureText: {
    fontSize: 13,
    color: COLORS.textLight,
    textTransform: 'capitalize',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  perDay: {
    fontSize: 13,
    color: COLORS.textLight,
    marginLeft: 2,
  },
});
