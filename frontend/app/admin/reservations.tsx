import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api/axios';
import { format } from 'date-fns';

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

interface Reservation {
  id: string;
  user_name: string;
  user_email: string;
  vehicle_name: string;
  start_date: string;
  end_date: string;
  total_days: number;
  total_price: number;
  status: string;
  payment_status: string;
  created_at: string;
}

export default function AdminReservations() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  useEffect(() => {
    fetchReservations();
  }, [statusFilter]);

  const fetchReservations = async () => {
    try {
      const params = statusFilter ? `?status=${statusFilter}` : '';
      const response = await api.get(`/api/admin/reservations${params}`);
      setReservations(response.data.reservations);
    } catch (error: any) {
      console.error('Error fetching reservations:', error.response?.data || error.message);
      Alert.alert('Erreur', 'Impossible de charger les réservations');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReservations();
    setRefreshing(false);
  };

  const updateStatus = async (reservationId: string, newStatus: string) => {
    try {
      await api.put(`/api/admin/reservations/${reservationId}/status?status=${newStatus}`);
      Alert.alert('Succès', `Statut changé à ${newStatus}`);
      fetchReservations();
    } catch (error: any) {
      console.error('Error updating status:', error.response?.data || error.message);
      Alert.alert('Erreur', error.response?.data?.detail || 'Impossible de modifier le statut');
    }
  };

  const updatePaymentStatus = async (reservationId: string, newPaymentStatus: string) => {
    try {
      await api.put(`/api/admin/reservations/${reservationId}/payment-status?payment_status=${newPaymentStatus}`);
      Alert.alert('Succès', `Statut de paiement changé à ${newPaymentStatus}`);
      fetchReservations();
    } catch (error: any) {
      console.error('Error updating payment status:', error.response?.data || error.message);
      Alert.alert('Erreur', error.response?.data?.detail || 'Impossible de modifier le statut de paiement');
    }
  };

  const handleStatusChange = (reservation: Reservation) => {
    Alert.alert(
      'Changer le Statut',
      `Statut actuel: ${reservation.status}`,
      [
        { text: 'En attente', onPress: () => updateStatus(reservation.id, 'pending') },
        { text: 'En attente (espèces)', onPress: () => updateStatus(reservation.id, 'pending_cash') },
        { text: 'Confirmé', onPress: () => updateStatus(reservation.id, 'confirmed') },
        { text: 'Actif', onPress: () => updateStatus(reservation.id, 'active') },
        { text: 'Terminé', onPress: () => updateStatus(reservation.id, 'completed') },
        { text: 'Annulé', onPress: () => updateStatus(reservation.id, 'cancelled'), style: 'destructive' },
        { text: 'Fermer', style: 'cancel' },
      ]
    );
  };

  const handlePaymentStatusChange = (reservation: Reservation) => {
    Alert.alert(
      'Changer le Statut de Paiement',
      `Statut actuel: ${reservation.payment_status}`,
      [
        { text: 'Non payé', onPress: () => updatePaymentStatus(reservation.id, 'unpaid') },
        { text: 'En attente', onPress: () => updatePaymentStatus(reservation.id, 'pending') },
        { text: 'Payé ✓', onPress: () => updatePaymentStatus(reservation.id, 'paid') },
        { text: 'Remboursé', onPress: () => updatePaymentStatus(reservation.id, 'refunded') },
        { text: 'Fermer', style: 'cancel' },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return COLORS.success;
      case 'active': return COLORS.primary;
      case 'pending': return COLORS.warning;
      case 'pending_cash': return '#D97706';  // Orange darker for cash
      case 'cancelled': return COLORS.error;
      case 'completed': return COLORS.textLight;
      default: return COLORS.textLight;
    }
  };

  const getPaymentColor = (status: string) => {
    switch (status) {
      case 'paid': return COLORS.success;
      case 'pending': return COLORS.warning;
      case 'unpaid': return COLORS.error;
      default: return COLORS.textLight;
    }
  };

  const filterOptions = [null, 'pending', 'pending_cash', 'confirmed', 'active', 'completed', 'cancelled'];

  const renderItem = ({ item }: { item: Reservation }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.vehicleName}>{item.vehicle_name}</Text>
          <Text style={styles.userName}>{item.user_name}</Text>
          <Text style={styles.userEmail}>{item.user_email}</Text>
        </View>
        <TouchableOpacity
          style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}
          onPress={() => handleStatusChange(item)}
        >
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status}
          </Text>
          <Ionicons name="chevron-down" size={12} color={getStatusColor(item.status)} />
        </TouchableOpacity>
      </View>

      <View style={styles.dateRow}>
        <View style={styles.dateItem}>
          <Ionicons name="calendar" size={14} color={COLORS.textLight} />
          <Text style={styles.dateText}>
            {format(new Date(item.start_date), 'dd MMM')} - {format(new Date(item.end_date), 'dd MMM yyyy')}
          </Text>
        </View>
        <Text style={styles.daysText}>{item.total_days} jours</Text>
      </View>

      <View style={styles.cardFooter}>
        <View style={[styles.paymentBadge, { backgroundColor: getPaymentColor(item.payment_status) + '20' }]}>
          <Text style={[styles.paymentText, { color: getPaymentColor(item.payment_status) }]}>
            {item.payment_status === 'paid' ? 'Payé' : item.payment_status === 'pending' ? 'En attente' : 'Non payé'}
          </Text>
        </View>
        <Text style={styles.price}>CHF {item.total_price.toFixed(2)}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Status Filter */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filterOptions}
          keyExtractor={(item) => item || 'all'}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterOption,
                statusFilter === item && styles.filterOptionActive,
              ]}
              onPress={() => setStatusFilter(item)}
            >
              <Text style={[
                styles.filterText,
                statusFilter === item && styles.filterTextActive,
              ]}>
                {item === null ? 'Tous' : item}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.filterList}
        />
      </View>

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
            <Ionicons name="calendar-outline" size={48} color={COLORS.textLight} />
            <Text style={styles.emptyText}>Aucune réservation</Text>
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
  filterContainer: {
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterList: {
    padding: 12,
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    marginRight: 8,
  },
  filterOptionActive: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    fontSize: 13,
    color: COLORS.text,
    textTransform: 'capitalize',
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  userName: {
    fontSize: 14,
    color: COLORS.text,
    marginTop: 4,
  },
  userEmail: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 13,
    color: COLORS.text,
  },
  daysText: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  paymentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  paymentText: {
    fontSize: 11,
    fontWeight: '600',
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textLight,
    marginTop: 12,
  },
});
