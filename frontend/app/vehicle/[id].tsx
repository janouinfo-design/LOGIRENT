import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useVehicleStore } from '../../src/store/vehicleStore';
import { useAuthStore } from '../../src/store/authStore';
import Button from '../../src/components/Button';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#1E3A8A',
  secondary: '#F59E0B',
  background: '#F8FAFC',
  card: '#FFFFFF',
  text: '#1E293B',
  textLight: '#64748B',
  border: '#E2E8F0',
  success: '#10B981',
};

export default function VehicleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { selectedVehicle, fetchVehicle, isLoading } = useVehicleStore();
  const { isAuthenticated } = useAuthStore();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (id) {
      fetchVehicle(id);
    }
  }, [id]);

  const handleBookNow = () => {
    if (!isAuthenticated) {
      Alert.alert(
        'Login Required',
        'Please login to book a vehicle',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => router.push('/(auth)/login') },
        ]
      );
      return;
    }
    router.push(`/booking/${id}`);
  };

  if (isLoading || !selectedVehicle) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const vehicle = selectedVehicle;

  const getTransmissionLabel = (trans: string) => {
    return trans === 'automatic' ? 'Automatic' : 'Manual';
  };

  const getFuelIcon = (fuel: string) => {
    switch (fuel.toLowerCase()) {
      case 'electric': return 'flash';
      case 'hybrid': return 'leaf';
      default: return 'water';
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image Gallery */}
        <View style={styles.imageContainer}>
          {vehicle.photos.length > 0 ? (
            <Image
              source={{ uri: vehicle.photos[currentImageIndex] }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="car" size={64} color={COLORS.textLight} />
            </View>
          )}
          {vehicle.photos.length > 1 && (
            <View style={styles.imageDots}>
              {vehicle.photos.map((_, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dot,
                    currentImageIndex === index && styles.dotActive,
                  ]}
                  onPress={() => setCurrentImageIndex(index)}
                />
              ))}
            </View>
          )}
        </View>

        {/* Vehicle Info */}
        <View style={styles.content}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{vehicle.brand} {vehicle.model}</Text>
              <Text style={styles.year}>{vehicle.year}</Text>
            </View>
            <View style={styles.typeBadge}>
              <Text style={styles.typeText}>{vehicle.type}</Text>
            </View>
          </View>

          {/* Location */}
          <View style={styles.locationRow}>
            <Ionicons name="location" size={18} color={COLORS.primary} />
            <Text style={styles.locationText}>{vehicle.location}</Text>
          </View>

          {/* Description */}
          {vehicle.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{vehicle.description}</Text>
            </View>
          )}

          {/* Specifications */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Specifications</Text>
            <View style={styles.specsGrid}>
              <View style={styles.specItem}>
                <View style={styles.specIcon}>
                  <Ionicons name="people" size={20} color={COLORS.primary} />
                </View>
                <Text style={styles.specLabel}>Seats</Text>
                <Text style={styles.specValue}>{vehicle.seats}</Text>
              </View>
              <View style={styles.specItem}>
                <View style={styles.specIcon}>
                  <Ionicons name="cog" size={20} color={COLORS.primary} />
                </View>
                <Text style={styles.specLabel}>Transmission</Text>
                <Text style={styles.specValue}>{getTransmissionLabel(vehicle.transmission)}</Text>
              </View>
              <View style={styles.specItem}>
                <View style={styles.specIcon}>
                  <Ionicons name={getFuelIcon(vehicle.fuel_type)} size={20} color={COLORS.primary} />
                </View>
                <Text style={styles.specLabel}>Fuel</Text>
                <Text style={styles.specValue}>{vehicle.fuel_type}</Text>
              </View>
              <View style={styles.specItem}>
                <View style={styles.specIcon}>
                  <Ionicons name="speedometer" size={20} color={COLORS.primary} />
                </View>
                <Text style={styles.specLabel}>Status</Text>
                <Text style={[styles.specValue, { color: COLORS.success }]}>{vehicle.status}</Text>
              </View>
            </View>
          </View>

          {/* Options */}
          {vehicle.options.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Available Options</Text>
              {vehicle.options.map((option, index) => (
                <View key={index} style={styles.optionItem}>
                  <View style={styles.optionLeft}>
                    <Ionicons name="add-circle" size={20} color={COLORS.primary} />
                    <Text style={styles.optionName}>{option.name}</Text>
                  </View>
                  <Text style={styles.optionPrice}>+CHF {option.price_per_day}/day</Text>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.priceInfo}>
          <Text style={styles.priceLabel}>Price per day</Text>
          <Text style={styles.price}>CHF {vehicle.price_per_day}</Text>
        </View>
        <Button
          title="Book Now"
          onPress={handleBookNow}
          style={styles.bookButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    height: 280,
    backgroundColor: COLORS.card,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.border,
  },
  imageDots: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
    width: 24,
  },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  year: {
    fontSize: 16,
    color: COLORS.textLight,
    marginTop: 4,
  },
  typeBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  typeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 6,
  },
  locationText: {
    fontSize: 15,
    color: COLORS.textLight,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: COLORS.textLight,
    lineHeight: 24,
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  specItem: {
    width: (width - 52) / 2,
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  specIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(30, 58, 138, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  specLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  specValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    textTransform: 'capitalize',
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  optionName: {
    fontSize: 15,
    color: COLORS.text,
  },
  optionPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  priceInfo: {},
  priceLabel: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  price: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
  },
  bookButton: {
    paddingHorizontal: 40,
  },
});
