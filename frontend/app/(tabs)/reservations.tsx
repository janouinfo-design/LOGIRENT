import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useReservationStore, Reservation } from '../../src/store/reservationStore';
import { useVehicleStore } from '../../src/store/vehicleStore';
import { format } from 'date-fns';
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
  warning: '#F59E0B',
  error: '#EF4444',
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'confirmed': return COLORS.success;
    case 'active': return COLORS.primary;
    case 'pending': return COLORS.warning;
    case 'cancelled': return COLORS.error;
    case 'completed': return COLORS.textLight;
    default: return COLORS.textLight;
  }
};

const getPaymentStatusColor = (status: string) => {
  switch (status) {
    case 'paid': return COLORS.success;
    case 'pending': return COLORS.warning;
    case 'unpaid': return COLORS.error;
    default: return COLORS.textLight;
  }
};

export default function ReservationsScreen() {
  const router = useRouter();
  const { reservations, fetchReservations, cancelReservation, isLoading } = useReservationStore();
  const { vehicles, fetchVehicles } = useVehicleStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchReservations();
    fetchVehicles();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchReservations(), fetchVehicles()]);
    setRefreshing(false);
  };

  const handleCancel = (reservationId: string) => {
    Alert.alert(
      'Cancel Reservation',
      'Are you sure you want to cancel this reservation?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelReservation(reservationId);
              Alert.alert('Success', 'Reservation cancelled');
              fetchReservations();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const getVehicle = (vehicleId: string) => {
    return vehicles.find(v => v.id === vehicleId);
  };

  const renderItem = ({ item }: { item: Reservation }) => {
    const vehicle = getVehicle(item.vehicle_id);
    const canCancel = ['pending', 'confirmed'].includes(item.status) && item.payment_status !== 'paid';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.vehicleName}>
              {vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Vehicle'}
            </Text>
            <Text style={styles.vehicleYear}>{vehicle?.year}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.dateSection}>
          <View style={styles.dateItem}>
            <Ionicons name="calendar" size={16} color={COLORS.textLight} />
            <Text style={styles.dateLabel}>From</Text>
            <Text style={styles.dateValue}>{format(new Date(item.start_date), 'MMM d, yyyy')}</Text>
          </View>
          <Ionicons name="arrow-forward" size={16} color={COLORS.textLight} />
          <View style={styles.dateItem}>
            <Ionicons name="calendar" size={16} color={COLORS.textLight} />
            <Text style={styles.dateLabel}>To</Text>
            <Text style={styles.dateValue}>{format(new Date(item.end_date), 'MMM d, yyyy')}</Text>
          </View>
        </View>

        <View style={styles.priceSection}>
          <View>
            <Text style={styles.daysText}>{item.total_days} days</Text>
            <View style={[styles.paymentBadge, { backgroundColor: getPaymentStatusColor(item.payment_status) + '20' }]}>
              <Text style={[styles.paymentText, { color: getPaymentStatusColor(item.payment_status) }]}>
                {item.payment_status.charAt(0).toUpperCase() + item.payment_status.slice(1)}
              </Text>
            </View>
          </View>
          <View style={styles.priceContainer}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalPrice}>CHF {item.total_price.toFixed(2)}</Text>
          </View>
        </View>

        {canCancel && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => handleCancel(item.id)}
          >
            <Text style={styles.cancelButtonText}>Cancel Reservation</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={reservations}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color={COLORS.textLight} />
            <Text style={styles.emptyText}>No reservations yet</Text>
            <Text style={styles.emptySubtext}>Start by booking a vehicle</Text>
            <Button
              title="Browse Vehicles"
              onPress={() => router.push('/(tabs)/vehicles')}
              style={{ marginTop: 24 }}
            />
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  listContent: {
    padding: 20,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  vehicleYear: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dateSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dateItem: {
    alignItems: 'center',
    gap: 4,
  },
  dateLabel: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  priceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  daysText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  paymentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  paymentText: {
    fontSize: 11,
    fontWeight: '600',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  totalPrice: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.primary,
  },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  cancelButtonText: {
    color: COLORS.error,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 8,
  },
});
