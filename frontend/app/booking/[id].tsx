import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import * as WebBrowser from 'expo-web-browser';
import { useVehicleStore } from '../../src/store/vehicleStore';
import { useReservationStore } from '../../src/store/reservationStore';
import { useAuthStore } from '../../src/store/authStore';
import Button from '../../src/components/Button';
import MiniCalendar from '../../src/components/MiniCalendar';

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
  const { user } = useAuthStore();

  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(addDays(new Date(), 2));
  const [startHour, setStartHour] = useState(8);
  const [startMin, setStartMin] = useState(0);
  const [endHour, setEndHour] = useState(18);
  const [endMin, setEndMin] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [showDatePicker, setShowDatePicker] = useState<'start' | 'end' | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'twint' | 'cash'>('card');

  const handleCalendarDateSelect = (date: Date) => {
    const today = startOfDay(new Date());
    if (isBefore(date, today)) return;

    if (showDatePicker === 'start') {
      setStartDate(date);
      if (date >= endDate) {
        setEndDate(addDays(date, 1));
      }
    } else if (showDatePicker === 'end') {
      if (date <= startDate) return;
      setEndDate(date);
    }
    setShowDatePicker(null);
  };

  // Check if documents are uploaded
  const hasDocuments = user?.id_photo && user?.license_photo;

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
    const todayStart = startOfDay(new Date());
    if (type === 'start') {
      const newStart = addDays(startDate, increment);
      if (newStart >= todayStart && newStart < endDate) {
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
    // Check if documents are uploaded
    if (!hasDocuments) {
      Alert.alert(
        'Documents Requis',
        'Veuillez télécharger votre pièce d\'identité et votre permis de conduire dans votre profil avant de réserver.',
        [
          { text: 'Annuler', style: 'cancel' },
          { 
            text: 'Aller au Profil', 
            onPress: () => router.push('/(tabs)/profile')
          },
        ]
      );
      return;
    }

    if (totalDays <= 0) {
      Alert.alert('Dates Invalides', 'La date de fin doit être après la date de début');
      return;
    }

    try {
      // Combine date + time
      const startDateTime = new Date(startDate);
      startDateTime.setHours(startHour, startMin, 0, 0);
      const endDateTime = new Date(endDate);
      endDateTime.setHours(endHour, endMin, 0, 0);

      // Create reservation - TWINT goes through Stripe checkout like card
      const effectivePaymentMethod = paymentMethod === 'twint' ? 'card' : paymentMethod;
      const reservation = await createReservation({
        vehicle_id: id!,
        start_date: startDateTime.toISOString(),
        end_date: endDateTime.toISOString(),
        options: selectedOptions,
        payment_method: effectivePaymentMethod,
      });

      // If cash payment, show success and go to reservations
      if (paymentMethod === 'cash') {
        Alert.alert(
          'Réservation Confirmée',
          'Votre réservation a été enregistrée. Le paiement sera effectué en espèces lors de la prise du véhicule.',
          [
            {
              text: 'Voir mes réservations',
              onPress: () => router.push('/(tabs)/reservations'),
            },
          ]
        );
        return;
      }

      // Initiate payment (card or twint via Stripe)
      const originUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://rental-hub-dev-3.preview.emergentagent.com';
      const paymentMethodType = paymentMethod === 'twint' ? 'twint' : 'card';
      const paymentData = await initiatePayment(reservation.id, originUrl, paymentMethodType);

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
        {/* Documents Warning */}
        {!hasDocuments && (
          <TouchableOpacity 
            style={styles.documentsWarning}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Ionicons name="warning" size={24} color="#F59E0B" />
            <View style={styles.documentsWarningText}>
              <Text style={styles.documentsWarningTitle}>Documents manquants</Text>
              <Text style={styles.documentsWarningSubtitle}>
                Téléchargez votre pièce d'identité et permis de conduire pour réserver
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#F59E0B" />
          </TouchableOpacity>
        )}

        {/* Vehicle Summary */}
        <View style={styles.vehicleSummary}>
          <Text style={styles.vehicleName}>{vehicle.brand} {vehicle.model}</Text>
          <Text style={styles.vehiclePrice}>CHF {vehicle.price_per_day}/jour</Text>
        </View>

        {/* Date Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sélectionner les dates</Text>
          
          <View style={styles.dateRow}>
            <TouchableOpacity 
              style={styles.dateCard}
              onPress={() => setShowDatePicker('start')}
              data-testid="pickup-date-card"
            >
              <Text style={styles.dateLabel}>Date de départ</Text>
              <View style={styles.dateSelector}>
                <TouchableOpacity style={styles.dateButton} onPress={() => incrementDays('start', -1)}>
                  <Ionicons name="remove" size={20} color={COLORS.primary} />
                </TouchableOpacity>
                <View style={styles.dateDisplay}>
                  <Text style={styles.dateDay}>{format(startDate, 'd')}</Text>
                  <Text style={styles.dateMonth}>{format(startDate, 'MMM yyyy', { locale: fr })}</Text>
                </View>
                <TouchableOpacity style={styles.dateButton} onPress={() => incrementDays('start', 1)}>
                  <Ionicons name="add" size={20} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
              {/* Time Picker */}
              <View style={styles.timePicker}>
                <Ionicons name="time-outline" size={14} color={COLORS.primary} />
                <TouchableOpacity style={styles.timeBtn} onPress={() => setStartHour(h => h > 0 ? h - 1 : 23)}>
                  <Ionicons name="chevron-down" size={14} color={COLORS.textLight} />
                </TouchableOpacity>
                <Text style={styles.timeText}>{String(startHour).padStart(2, '0')}:{String(startMin).padStart(2, '0')}</Text>
                <TouchableOpacity style={styles.timeBtn} onPress={() => setStartHour(h => h < 23 ? h + 1 : 0)}>
                  <Ionicons name="chevron-up" size={14} color={COLORS.textLight} />
                </TouchableOpacity>
              </View>
              <View style={styles.calendarHint}>
                <Ionicons name="calendar-outline" size={14} color={COLORS.primary} />
                <Text style={styles.calendarHintText}>Ouvrir calendrier</Text>
              </View>
            </TouchableOpacity>

            <Ionicons name="arrow-forward" size={24} color={COLORS.textLight} />

            <TouchableOpacity 
              style={styles.dateCard}
              onPress={() => setShowDatePicker('end')}
              data-testid="return-date-card"
            >
              <Text style={styles.dateLabel}>Date de retour</Text>
              <View style={styles.dateSelector}>
                <TouchableOpacity style={styles.dateButton} onPress={() => incrementDays('end', -1)}>
                  <Ionicons name="remove" size={20} color={COLORS.primary} />
                </TouchableOpacity>
                <View style={styles.dateDisplay}>
                  <Text style={styles.dateDay}>{format(endDate, 'd')}</Text>
                  <Text style={styles.dateMonth}>{format(endDate, 'MMM yyyy', { locale: fr })}</Text>
                </View>
                <TouchableOpacity style={styles.dateButton} onPress={() => incrementDays('end', 1)}>
                  <Ionicons name="add" size={20} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
              {/* Time Picker */}
              <View style={styles.timePicker}>
                <Ionicons name="time-outline" size={14} color={COLORS.primary} />
                <TouchableOpacity style={styles.timeBtn} onPress={() => setEndHour(h => h > 0 ? h - 1 : 23)}>
                  <Ionicons name="chevron-down" size={14} color={COLORS.textLight} />
                </TouchableOpacity>
                <Text style={styles.timeText}>{String(endHour).padStart(2, '0')}:{String(endMin).padStart(2, '0')}</Text>
                <TouchableOpacity style={styles.timeBtn} onPress={() => setEndHour(h => h < 23 ? h + 1 : 0)}>
                  <Ionicons name="chevron-up" size={14} color={COLORS.textLight} />
                </TouchableOpacity>
              </View>
              <View style={styles.calendarHint}>
                <Ionicons name="calendar-outline" size={14} color={COLORS.primary} />
                <Text style={styles.calendarHintText}>Ouvrir calendrier</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.durationBadge}>
            <Ionicons name="time" size={18} color={COLORS.primary} />
            <Text style={styles.durationText}>{totalDays} {totalDays === 1 ? 'jour' : 'jours'}</Text>
          </View>
        </View>

        {/* Mini Calendar */}
        <MiniCalendar
          visible={showDatePicker !== null}
          onClose={() => setShowDatePicker(null)}
          onSelectDate={handleCalendarDateSelect}
          selectedDate={showDatePicker === 'start' ? startDate : endDate}
          minDate={showDatePicker === 'end' ? addDays(startDate, 1) : undefined}
          title={showDatePicker === 'start' ? 'Date de départ' : 'Date de retour'}
        />

        {/* Options */}
        {vehicle.options.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Options supplémentaires</Text>
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

        {/* Payment Method Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mode de Paiement</Text>
          <View style={styles.paymentMethodsContainer}>
            <TouchableOpacity
              style={[
                styles.paymentMethodCard,
                paymentMethod === 'card' && styles.paymentMethodSelected,
              ]}
              onPress={() => setPaymentMethod('card')}
              data-testid="payment-card"
            >
              <View style={[
                styles.paymentRadio,
                paymentMethod === 'card' && styles.paymentRadioSelected,
              ]}>
                {paymentMethod === 'card' && <View style={styles.paymentRadioInner} />}
              </View>
              <Ionicons 
                name="card" 
                size={24} 
                color={paymentMethod === 'card' ? COLORS.primary : COLORS.textLight} 
              />
              <View style={styles.paymentMethodInfo}>
                <Text style={[
                  styles.paymentMethodTitle,
                  paymentMethod === 'card' && styles.paymentMethodTitleSelected,
                ]}>Carte bancaire</Text>
                <Text style={styles.paymentMethodSubtitle}>Visa, Mastercard, Apple Pay</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.paymentMethodCard,
                paymentMethod === 'twint' && styles.paymentMethodSelectedTwint,
              ]}
              onPress={() => setPaymentMethod('twint')}
              data-testid="payment-twint"
            >
              <View style={[
                styles.paymentRadio,
                paymentMethod === 'twint' && styles.paymentRadioSelectedTwint,
              ]}>
                {paymentMethod === 'twint' && <View style={styles.paymentRadioInnerTwint} />}
              </View>
              <View style={styles.twintIconBox}>
                <Text style={styles.twintIconText}>T</Text>
              </View>
              <View style={styles.paymentMethodInfo}>
                <Text style={[
                  styles.paymentMethodTitle,
                  paymentMethod === 'twint' && styles.paymentMethodTitleTwint,
                ]}>TWINT</Text>
                <Text style={styles.paymentMethodSubtitle}>Paiement mobile suisse</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.paymentMethodCard,
                paymentMethod === 'cash' && styles.paymentMethodSelected,
              ]}
              onPress={() => setPaymentMethod('cash')}
              data-testid="payment-cash"
            >
              <View style={[
                styles.paymentRadio,
                paymentMethod === 'cash' && styles.paymentRadioSelected,
              ]}>
                {paymentMethod === 'cash' && <View style={styles.paymentRadioInner} />}
              </View>
              <Ionicons 
                name="cash" 
                size={24} 
                color={paymentMethod === 'cash' ? COLORS.secondary : COLORS.textLight} 
              />
              <View style={styles.paymentMethodInfo}>
                <Text style={[
                  styles.paymentMethodTitle,
                  paymentMethod === 'cash' && styles.paymentMethodTitleCash,
                ]}>Espèces</Text>
                <Text style={styles.paymentMethodSubtitle}>Payer lors de la prise du véhicule</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Price Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Résumé du prix</Text>
          <View style={styles.priceCard}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Prix de base ({totalDays} jours)</Text>
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
          <Text style={styles.sectionTitle}>Conditions de location</Text>
          <View style={styles.policyCard}>
            <View style={styles.policyItem}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={styles.policyText}>Annulation gratuite jusqu'à 24h avant</Text>
            </View>
            <View style={styles.policyItem}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={styles.policyText}>Assurance complète incluse</Text>
            </View>
            <View style={styles.policyItem}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={styles.policyText}>Assistance routière 24h/24</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.totalContainer}>
          <Text style={styles.bottomLabel}>Prix Total</Text>
          <Text style={styles.bottomPrice}>CHF {totalPrice.toFixed(2)}</Text>
        </View>
        <Button
          title={paymentMethod === 'cash' ? 'Réserver (Espèces)' : paymentMethod === 'twint' ? 'Payer par TWINT' : 'Payer par Carte'}
          onPress={handleBookNow}
          loading={isLoading}
          style={[styles.payButton, paymentMethod === 'cash' && styles.cashButton, paymentMethod === 'twint' && styles.twintButton]}
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
    fontWeight: '500',
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
  cashButton: {
    backgroundColor: COLORS.secondary,
  },
  twintButton: {
    backgroundColor: '#000000',
  },
  twintIconBox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  twintIconText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  paymentMethodSelectedTwint: {
    borderColor: '#000000',
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
  paymentRadioSelectedTwint: {
    borderColor: '#000000',
  },
  paymentRadioInnerTwint: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#000000',
  },
  paymentMethodTitleTwint: {
    color: '#000000',
    fontWeight: '700',
  },
  paymentMethodsContainer: {
    gap: 12,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 12,
  },
  paymentMethodSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(30, 58, 138, 0.05)',
  },
  paymentRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentRadioSelected: {
    borderColor: COLORS.primary,
  },
  paymentRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  paymentMethodTitleSelected: {
    color: COLORS.primary,
  },
  paymentMethodTitleCash: {
    color: COLORS.secondary,
  },
  paymentMethodSubtitle: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  documentsWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    margin: 16,
    marginBottom: 0,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  documentsWarningText: {
    flex: 1,
  },
  documentsWarningTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#92400E',
  },
  documentsWarningSubtitle: {
    fontSize: 13,
    color: '#A16207',
    marginTop: 2,
  },
  calendarHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  calendarHintText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '500',
  },
  timePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  timeBtn: {
    padding: 4,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    minWidth: 46,
    textAlign: 'center',
  },
  calModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  calModalContent: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 380,
  },
  calModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  calNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calMonthTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    textTransform: 'capitalize',
  },
  calWeekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  calWeekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
    paddingVertical: 6,
  },
  calDaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  calDayOutside: {
    opacity: 0.2,
  },
  calDayInRange: {
    backgroundColor: 'rgba(30, 58, 138, 0.08)',
    borderRadius: 0,
  },
  calDaySelected: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
  },
  calDayToday: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  calDayDisabled: {
    opacity: 0.3,
  },
  calDayText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  calDayTextOutside: {
    color: COLORS.textLight,
  },
  calDayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  calDayTextToday: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  calDayTextDisabled: {
    color: COLORS.textLight,
  },
  calQuickSelect: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  calQuickBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(30, 58, 138, 0.08)',
  },
  calQuickBtnActive: {
    backgroundColor: COLORS.primary,
  },
  calQuickBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  calQuickBtnTextActive: {
    color: '#FFFFFF',
  },
});
