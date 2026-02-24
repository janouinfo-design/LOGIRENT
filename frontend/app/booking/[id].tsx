import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays, differenceInDays } from 'date-fns';
import * as WebBrowser from 'expo-web-browser';
import { useVehicleStore } from '../../src/store/vehicleStore';
import { useReservationStore } from '../../src/store/reservationStore';
import Button from '../../src/components/Button';

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

export default function BookingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { selectedVehicle, fetchVehicle } = useVehicleStore();
  const { createReservation, initiatePayment, isLoading } = useReservationStore();

  const [startDate, setStartDate] = useState(addDays(new Date(), 1));
  const [endDate, setEndDate] = useState(addDays(new Date(), 3));
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [showDatePicker, setShowDatePicker] = useState<'start' | 'end' | null>(null);

  useEffect(() => {
    if (id) {
      fetchVehicle(id);
    }
  }, [id]);

  const vehicle = selectedVehicle;

  if (!vehicle) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const totalDays = differenceInDays(endDate, startDate);
  const basePrice = vehicle.price_per_day * totalDays;
  const optionsPrice = selectedOptions.reduce((total, optName) => {
    const option = vehicle.options.find(o => o.name === optName);
    return total + (option ? option.price_per_day * totalDays : 0);
  }, 0);
  const totalPrice = basePrice + optionsPrice;

  const toggleOption = (optionName: string) => {
    setSelectedOptions(prev =>
      prev.includes(optionName)
        ? prev.filter(o => o !== optionName)
        : [...prev, optionName]
    );
  };

  const incrementDays = (type: 'start' | 'end', increment: number) => {
    if (type === 'start') {
      const newStart = addDays(startDate, increment);
      if (newStart >= new Date() && newStart < endDate) {
        setStartDate(newStart);
      }
    } else {
      const newEnd = addDays(endDate, increment);
      if (newEnd > startDate) {
        setEndDate(newEnd);
      }
    }
  };

  const handleBookNow = async () => {
    if (totalDays <= 0) {
      Alert.alert('Invalid Dates', 'End date must be after start date');
      return;
    }

    try {
      // Create reservation
      const reservation = await createReservation({
        vehicle_id: id!,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        options: selectedOptions,
      });

      // Initiate payment
      const originUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://rent-hub-20.preview.emergentagent.com';

      const paymentData = await initiatePayment(reservation.id, originUrl);

      // Open Stripe checkout
      if (Platform.OS === 'web') {
        window.location.href = paymentData.url;
      } else {
        const result = await WebBrowser.openBrowserAsync(paymentData.url);
        if (result.type === 'cancel') {
          Alert.alert('Payment Cancelled', 'Your reservation is saved but not confirmed.');
        }
        router.push('/(tabs)/reservations');
      }
    } catch (error: any) {
      Alert.alert('Booking Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Vehicle Summary */}
        <View style={styles.vehicleSummary}>
          <Text style={styles.vehicleName}>{vehicle.brand} {vehicle.model}</Text>
          <Text style={styles.vehiclePrice}>CHF {vehicle.price_per_day}/day</Text>
        </View>

        {/* Date Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Dates</Text>
          
          <View style={styles.dateRow}>
            <View style={styles.dateCard}>
              <Text style={styles.dateLabel}>Pick-up Date</Text>
              <View style={styles.dateSelector}>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => incrementDays('start', -1)}
                >
                  <Ionicons name="remove" size={20} color={COLORS.primary} />
                </TouchableOpacity>
                <View style={styles.dateDisplay}>
                  <Text style={styles.dateDay}>{format(startDate, 'd')}</Text>
                  <Text style={styles.dateMonth}>{format(startDate, 'MMM yyyy')}</Text>
                </View>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => incrementDays('start', 1)}
                >
                  <Ionicons name="add" size={20} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            </View>

            <Ionicons name="arrow-forward" size={24} color={COLORS.textLight} />

            <View style={styles.dateCard}>
              <Text style={styles.dateLabel}>Return Date</Text>
              <View style={styles.dateSelector}>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => incrementDays('end', -1)}
                >
                  <Ionicons name="remove" size={20} color={COLORS.primary} />
                </TouchableOpacity>
                <View style={styles.dateDisplay}>
                  <Text style={styles.dateDay}>{format(endDate, 'd')}</Text>
                  <Text style={styles.dateMonth}>{format(endDate, 'MMM yyyy')}</Text>
                </View>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => incrementDays('end', 1)}
                >
                  <Ionicons name="add" size={20} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.durationBadge}>
            <Ionicons name="time" size={18} color={COLORS.primary} />
            <Text style={styles.durationText}>{totalDays} {totalDays === 1 ? 'day' : 'days'}</Text>
          </View>
        </View>

        {/* Options */}
        {vehicle.options.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Options</Text>
            {vehicle.options.map((option) => {
              const isSelected = selectedOptions.includes(option.name);
              const optionTotal = option.price_per_day * totalDays;
              return (
                <TouchableOpacity
                  key={option.name}
                  style={[
                    styles.optionCard,
                    isSelected && styles.optionCardSelected,
                  ]}
                  onPress={() => toggleOption(option.name)}
                >
                  <View style={styles.optionLeft}>
                    <View style={[
                      styles.checkbox,
                      isSelected && styles.checkboxSelected,
                    ]}>
                      {isSelected && (
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      )}
                    </View>
                    <Text style={styles.optionName}>{option.name}</Text>
                  </View>
                  <View style={styles.optionRight}>
                    <Text style={styles.optionUnitPrice}>CHF {option.price_per_day}/day</Text>
                    <Text style={styles.optionTotal}>CHF {optionTotal.toFixed(2)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Price Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price Summary</Text>
          <View style={styles.priceCard}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Base Price ({totalDays} days)</Text>
              <Text style={styles.priceValue}>CHF {basePrice.toFixed(2)}</Text>
            </View>
            {optionsPrice > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Options</Text>
                <Text style={styles.priceValue}>CHF {optionsPrice.toFixed(2)}</Text>
              </View>
            )}
            <View style={[styles.priceRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>CHF {totalPrice.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Policies */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rental Policies</Text>
          <View style={styles.policyCard}>
            <View style={styles.policyItem}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={styles.policyText}>Free cancellation up to 24h before</Text>
            </View>
            <View style={styles.policyItem}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={styles.policyText}>Full insurance included</Text>
            </View>
            <View style={styles.policyItem}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={styles.policyText}>24/7 roadside assistance</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.totalContainer}>
          <Text style={styles.bottomLabel}>Total Price</Text>
          <Text style={styles.bottomPrice}>CHF {totalPrice.toFixed(2)}</Text>
        </View>
        <Button
          title="Continue to Payment"
          onPress={handleBookNow}
          loading={isLoading}
          style={styles.payButton}
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
  vehicleSummary: {
    backgroundColor: COLORS.primary,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vehicleName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  vehiclePrice: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 8,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(30, 58, 138, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateDisplay: {
    alignItems: 'center',
    minWidth: 60,
  },
  dateDay: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
  },
  dateMonth: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(30, 58, 138, 0.1)',
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 16,
  },
  durationText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  optionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(30, 58, 138, 0.05)',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionName: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '500',
  },
  optionRight: {
    alignItems: 'flex-end',
  },
  optionUnitPrice: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  optionTotal: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
  priceCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  policyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  policyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  policyText: {
    fontSize: 14,
    color: COLORS.text,
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
  totalContainer: {},
  bottomLabel: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  bottomPrice: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.primary,
  },
  payButton: {
    paddingHorizontal: 32,
  },
});
