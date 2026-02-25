import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, Platform, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useReservationStore, Reservation } from '../../src/store/reservationStore';
import { useVehicleStore } from '../../src/store/vehicleStore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Button from '../../src/components/Button';

const C = {
  purple: '#7C3AED',
  purpleDark: '#5B21B6',
  purpleLight: '#EDE9FE',
  dark: '#1A1A2E',
  gray: '#6B7280',
  grayLight: '#F3F4F6',
  border: '#E5E7EB',
  card: '#FFFFFF',
  bg: '#FAFAFA',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
};

const statusLabels: Record<string, string> = {
  confirmed: 'Confirmée',
  active: 'En cours',
  pending: 'En attente',
  pending_cash: 'Espèces en attente',
  cancelled: 'Annulée',
  completed: 'Terminée',
};

const paymentLabels: Record<string, string> = {
  paid: 'Payé',
  pending: 'En attente',
  unpaid: 'Non payé',
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'confirmed': return C.success;
    case 'active': return C.purple;
    case 'pending': return C.warning;
    case 'cancelled': return C.error;
    case 'completed': return C.gray;
    default: return C.gray;
  }
};

const getPaymentColor = (status: string) => {
  switch (status) {
    case 'paid': return C.success;
    case 'pending': return C.warning;
    case 'unpaid': return C.error;
    default: return C.gray;
  }
};

export default function ReservationsScreen() {
  const router = useRouter();
  const { reservations, fetchReservations, cancelReservation, isLoading } = useReservationStore();
  const { vehicles, fetchVehicles } = useVehicleStore();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => { fetchReservations(); fetchVehicles(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchReservations(), fetchVehicles()]);
    setRefreshing(false);
  };

  const handleCancel = (id: string) => {
    if (Platform.OS === 'web') {
      if (window.confirm('Voulez-vous annuler cette réservation ?')) {
        cancelReservation(id).then(() => fetchReservations());
      }
    } else {
      Alert.alert('Annuler la réservation', 'Voulez-vous annuler cette réservation ?', [
        { text: 'Non', style: 'cancel' },
        { text: 'Oui, annuler', style: 'destructive', onPress: () => cancelReservation(id).then(() => fetchReservations()) },
      ]);
    }
  };

  const getVehicle = (vehicleId: string) => vehicles.find(v => v.id === vehicleId);

  const filteredReservations = filter === 'all'
    ? reservations
    : reservations.filter(r => r.status === filter);

  const filters = [
    { id: 'all', label: 'Toutes' },
    { id: 'pending', label: 'En attente' },
    { id: 'confirmed', label: 'Confirmées' },
    { id: 'active', label: 'En cours' },
    { id: 'completed', label: 'Terminées' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Mes Locations</Text>
        <Text style={styles.subtitle}>{reservations.length} réservation{reservations.length !== 1 ? 's' : ''}</Text>
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterContent}>
        {filters.map(f => (
          <TouchableOpacity key={f.id} style={[styles.filterChip, filter === f.id && styles.filterChipActive]}
            onPress={() => setFilter(f.id)} data-testid={`filter-${f.id}`}>
            <Text style={[styles.filterText, filter === f.id && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Reservations List */}
      <ScrollView style={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.content}>
          {filteredReservations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={56} color={C.gray} />
              <Text style={styles.emptyText}>Aucune réservation</Text>
              <Text style={styles.emptySubtext}>Réservez votre premier véhicule</Text>
              <Button title="Voir les véhicules" onPress={() => router.push('/(tabs)/vehicles')} style={{ marginTop: 20 }} />
            </View>
          ) : (
            filteredReservations.map((item) => {
              const vehicle = getVehicle(item.vehicle_id);
              const canCancel = ['pending', 'confirmed'].includes(item.status) && item.payment_status !== 'paid';
              const statusColor = getStatusColor(item.status);
              const paymentColor = getPaymentColor(item.payment_status);

              return (
                <View key={item.id} style={styles.card} data-testid={`reservation-${item.id}`}>
                  {/* Card Header */}
                  <View style={styles.cardHeader}>
                    {vehicle?.image_url ? (
                      <Image source={{ uri: vehicle.image_url }} style={styles.vehicleThumb} resizeMode="cover" />
                    ) : (
                      <View style={[styles.vehicleThumb, styles.vehicleThumbPlaceholder]}>
                        <Ionicons name="car" size={20} color={C.gray} />
                      </View>
                    )}
                    <View style={styles.cardHeaderInfo}>
                      <Text style={styles.vehicleName}>{vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Véhicule'}</Text>
                      <Text style={styles.vehicleYear}>{vehicle?.year}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: statusColor + '18' }]}>
                      <View style={[styles.badgeDot, { backgroundColor: statusColor }]} />
                      <Text style={[styles.badgeText, { color: statusColor }]}>{statusLabels[item.status] || item.status}</Text>
                    </View>
                  </View>

                  {/* Dates */}
                  <View style={styles.datesRow}>
                    <View style={styles.dateBox}>
                      <Text style={styles.dateLabel}>Début</Text>
                      <Text style={styles.dateValue}>{format(new Date(item.start_date), 'd MMM yyyy', { locale: fr })}</Text>
                      <Text style={styles.dateTime}>{format(new Date(item.start_date), 'HH:mm')}</Text>
                    </View>
                    <View style={styles.dateArrow}>
                      <Ionicons name="arrow-forward" size={16} color={C.gray} />
                      <Text style={styles.daysCount}>{item.total_days} jour{item.total_days > 1 ? 's' : ''}</Text>
                    </View>
                    <View style={[styles.dateBox, { alignItems: 'flex-end' }]}>
                      <Text style={styles.dateLabel}>Fin</Text>
                      <Text style={styles.dateValue}>{format(new Date(item.end_date), 'd MMM yyyy', { locale: fr })}</Text>
                      <Text style={styles.dateTime}>{format(new Date(item.end_date), 'HH:mm')}</Text>
                    </View>
                  </View>

                  {/* Price & Payment */}
                  <View style={styles.priceRow}>
                    <View style={[styles.badge, { backgroundColor: paymentColor + '18' }]}>
                      <View style={[styles.badgeDot, { backgroundColor: paymentColor }]} />
                      <Text style={[styles.badgeText, { color: paymentColor }]}>{paymentLabels[item.payment_status] || item.payment_status}</Text>
                    </View>
                    <View style={styles.priceBox}>
                      <Text style={styles.priceLabel}>Total</Text>
                      <Text style={styles.priceValue}>CHF {item.total_price.toFixed(2)}</Text>
                    </View>
                  </View>

                  {/* Cancel */}
                  {canCancel && (
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(item.id)} data-testid={`cancel-${item.id}`}>
                      <Ionicons name="close-circle-outline" size={16} color={C.error} />
                      <Text style={styles.cancelText}>Annuler la réservation</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8, backgroundColor: C.card },
  title: { fontSize: 28, fontWeight: '800', color: C.dark },
  subtitle: { fontSize: 14, color: C.gray, marginTop: 4 },
  filterBar: { backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  filterContent: { paddingHorizontal: 20, paddingVertical: 10, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 18, backgroundColor: C.grayLight },
  filterChipActive: { backgroundColor: C.purple },
  filterText: { fontSize: 13, fontWeight: '500', color: C.gray },
  filterTextActive: { color: '#FFF', fontWeight: '600' },
  scroll: { flex: 1 },
  content: { maxWidth: 800, width: '100%', alignSelf: 'center', padding: 20 },
  card: { backgroundColor: C.card, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 12 },
  vehicleThumb: { width: 48, height: 48, borderRadius: 10, overflow: 'hidden' },
  vehicleThumbPlaceholder: { backgroundColor: C.grayLight, justifyContent: 'center', alignItems: 'center' },
  cardHeaderInfo: { flex: 1 },
  vehicleName: { fontSize: 16, fontWeight: '700', color: C.dark },
  vehicleYear: { fontSize: 12, color: C.gray, marginTop: 1 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 5 },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  datesRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.border },
  dateBox: { flex: 1 },
  dateLabel: { fontSize: 11, color: C.gray, marginBottom: 2 },
  dateValue: { fontSize: 14, fontWeight: '600', color: C.dark },
  dateArrow: { alignItems: 'center', paddingHorizontal: 12 },
  daysCount: { fontSize: 10, color: C.gray, marginTop: 2 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  priceBox: { alignItems: 'flex-end' },
  priceLabel: { fontSize: 11, color: C.gray },
  priceValue: { fontSize: 20, fontWeight: '800', color: C.purple },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border, gap: 6 },
  cancelText: { fontSize: 13, fontWeight: '600', color: C.error },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 18, fontWeight: '600', color: C.dark, marginTop: 16 },
  emptySubtext: { fontSize: 14, color: C.gray, marginTop: 6 },
});
