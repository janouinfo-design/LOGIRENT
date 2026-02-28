import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, TextInput, ScrollView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../src/api/axios';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useThemeStore } from '../../src/store/themeStore';

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
  user_phone?: string;
  vehicle_name: string;
  start_date: string;
  end_date: string;
  total_days: number;
  total_price: number;
  status: string;
  payment_status: string;
  payment_method?: string;
  created_at: string;
}

const STATUS_OPTIONS = [
  { value: null, label: 'Toutes', icon: 'list' },
  { value: 'pending', label: 'En attente', icon: 'time' },
  { value: 'pending_cash', label: 'Espèces', icon: 'cash' },
  { value: 'confirmed', label: 'Confirmées', icon: 'checkmark-circle' },
  { value: 'active', label: 'Actives', icon: 'car' },
  { value: 'completed', label: 'Terminées', icon: 'checkmark-done' },
  { value: 'cancelled', label: 'Annulées', icon: 'close-circle' },
];

export default function AdminReservations() {
  const { colors: _c } = useThemeStore();
  const COLORS = { primary: _c.accent, secondary: _c.warning, background: _c.bg, card: _c.card, text: _c.text, textLight: _c.textLight, border: _c.border, success: _c.success, warning: _c.warning, error: _c.error };
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [actionModal, setActionModal] = useState<{ type: 'status' | 'payment'; reservation: Reservation } | null>(null);
  
  // Date range filter
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [dateFilterType, setDateFilterType] = useState<'all' | 'created' | 'rental'>('all');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [activeDateFilter, setActiveDateFilter] = useState<{ start: string; end: string; type: string } | null>(null);

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      const response = await api.get('/api/admin/reservations');
      setReservations(response.data.reservations);
    } catch (error: any) {
      console.error('Error fetching reservations:', error.response?.data || error.message);
      if (Platform.OS === 'web') {
        window.alert('Impossible de charger les réservations');
      }
    } finally {
      setLoading(false);
    }
  };

  // Filter and search reservations
  const filteredReservations = useMemo(() => {
    let result = [...reservations];

    // Filter by status
    if (statusFilter) {
      result = result.filter(r => r.status === statusFilter);
    }

    // Filter by date range
    if (activeDateFilter && activeDateFilter.start && activeDateFilter.end) {
      const filterStart = startOfDay(new Date(activeDateFilter.start));
      const filterEnd = endOfDay(new Date(activeDateFilter.end));
      
      result = result.filter(r => {
        try {
          if (activeDateFilter.type === 'created') {
            // Filter by creation date
            const createdDate = new Date(r.created_at);
            return isWithinInterval(createdDate, { start: filterStart, end: filterEnd });
          } else {
            // Filter by rental period (default)
            const rentalStart = new Date(r.start_date);
            const rentalEnd = new Date(r.end_date);
            // Check if rental period overlaps with filter period
            return (rentalStart <= filterEnd && rentalEnd >= filterStart);
          }
        } catch {
          return true;
        }
      });
    }

    // Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(r => 
        r.user_name?.toLowerCase().includes(query) ||
        r.user_email?.toLowerCase().includes(query) ||
        r.vehicle_name?.toLowerCase().includes(query) ||
        r.id.toLowerCase().includes(query)
      );
    }

    // Sort
    result.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [reservations, statusFilter, searchQuery, sortOrder, activeDateFilter]);

  const applyDateFilter = () => {
    if (startDateFilter && endDateFilter) {
      setActiveDateFilter({
        start: startDateFilter,
        end: endDateFilter,
        type: dateFilterType
      });
      setShowDateFilter(false);
    } else {
      if (Platform.OS === 'web') {
        window.alert('Veuillez sélectionner les deux dates');
      }
    }
  };

  const clearDateFilter = () => {
    setActiveDateFilter(null);
    setStartDateFilter('');
    setEndDateFilter('');
    setDateFilterType('all');
  };

  const updateStatus = async (reservationId: string, newStatus: string) => {
    try {
      await api.put(`/api/admin/reservations/${reservationId}/status?status=${newStatus}`);
      if (Platform.OS === 'web') {
        window.alert(`Statut changé à ${getStatusLabel(newStatus)}`);
      }
      fetchReservations();
    } catch (error: any) {
      console.error('Error updating status:', error.response?.data || error.message);
      if (Platform.OS === 'web') {
        window.alert('Erreur: ' + (error.response?.data?.detail || 'Impossible de modifier le statut'));
      }
    }
  };

  const updatePaymentStatus = async (reservationId: string, newPaymentStatus: string) => {
    try {
      await api.put(`/api/admin/reservations/${reservationId}/payment-status?payment_status=${newPaymentStatus}`);
      if (Platform.OS === 'web') {
        window.alert(`Statut de paiement changé à ${getPaymentLabel(newPaymentStatus)}`);
      }
      fetchReservations();
    } catch (error: any) {
      console.error('Error updating payment status:', error.response?.data || error.message);
      if (Platform.OS === 'web') {
        window.alert('Erreur: ' + (error.response?.data?.detail || 'Impossible de modifier le statut de paiement'));
      }
    }
  };

  const handleStatusChange = (reservation: Reservation) => {
    setActionModal({ type: 'status', reservation });
  };

  const handlePaymentStatusChange = (reservation: Reservation) => {
    setActionModal({ type: 'payment', reservation });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return COLORS.success;
      case 'active': return COLORS.primary;
      case 'pending': return COLORS.warning;
      case 'pending_cash': return '#D97706';
      case 'cancelled': return COLORS.error;
      case 'completed': return COLORS.textLight;
      default: return COLORS.textLight;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmée';
      case 'active': return 'Active';
      case 'pending': return 'En attente';
      case 'pending_cash': return 'Espèces';
      case 'cancelled': return 'Annulée';
      case 'completed': return 'Terminée';
      default: return status;
    }
  };

  const getPaymentColor = (status: string) => {
    switch (status) {
      case 'paid': return COLORS.success;
      case 'pending': return COLORS.warning;
      case 'unpaid': return COLORS.error;
      case 'refunded': return '#6B7280';
      default: return COLORS.textLight;
    }
  };

  const getPaymentLabel = (status: string) => {
    switch (status) {
      case 'paid': return '✓ Payé';
      case 'pending': return 'En attente';
      case 'unpaid': return 'Non payé';
      case 'refunded': return 'Remboursé';
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'dd MMM yyyy', { locale: fr });
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      return format(parseISO(dateString), "dd MMM yyyy 'à' HH:mm", { locale: fr });
    } catch {
      return dateString;
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    const total = filteredReservations.length;
    const confirmed = filteredReservations.filter(r => r.status === 'confirmed' || r.status === 'active').length;
    const revenue = filteredReservations
      .filter(r => r.payment_status === 'paid')
      .reduce((sum, r) => sum + r.total_price, 0);
    return { total, confirmed, revenue };
  }, [filteredReservations]);

  const renderReservationCard = (item: Reservation) => (
    <View key={item.id} style={styles.card}>
      {/* Header with ID and Date */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.reservationId}>#{item.id.slice(0, 8)}</Text>
          <Text style={styles.createdDate}>Créée le {formatDateTime(item.created_at)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}
          onPress={() => handleStatusChange(item)}
          data-testid={`reservation-status-${item.id}`}
        >
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {getStatusLabel(item.status)}
          </Text>
          <Ionicons name="chevron-down" size={12} color={getStatusColor(item.status)} />
        </TouchableOpacity>
      </View>

      {/* Client Info */}
      <View style={styles.clientSection}>
        <Ionicons name="person" size={18} color={COLORS.primary} />
        <View style={styles.clientInfo}>
          <Text style={styles.clientName}>{item.user_name}</Text>
          <Text style={styles.clientEmail}>{item.user_email}</Text>
        </View>
      </View>

      {/* Vehicle Info */}
      <View style={styles.vehicleSection}>
        <Ionicons name="car" size={18} color={COLORS.secondary} />
        <Text style={styles.vehicleName}>{item.vehicle_name}</Text>
      </View>

      {/* Dates */}
      <View style={styles.datesSection}>
        <View style={styles.dateBox}>
          <Text style={styles.dateLabel}>DÉBUT</Text>
          <Text style={styles.dateValue}>{formatDate(item.start_date)}</Text>
        </View>
        <View style={styles.dateArrow}>
          <Ionicons name="arrow-forward" size={20} color={COLORS.textLight} />
          <Text style={styles.daysCount}>{item.total_days} jours</Text>
        </View>
        <View style={styles.dateBox}>
          <Text style={styles.dateLabel}>FIN</Text>
          <Text style={styles.dateValue}>{formatDate(item.end_date)}</Text>
        </View>
      </View>

      {/* Footer with payment */}
      <View style={styles.cardFooter}>
        <TouchableOpacity
          style={[styles.paymentBadge, { backgroundColor: getPaymentColor(item.payment_status) + '20' }]}
          onPress={() => handlePaymentStatusChange(item)}
          data-testid={`reservation-payment-${item.id}`}
        >
          <Text style={[styles.paymentText, { color: getPaymentColor(item.payment_status) }]}>
            {getPaymentLabel(item.payment_status)}
          </Text>
          <Ionicons name="chevron-down" size={10} color={getPaymentColor(item.payment_status)} />
        </TouchableOpacity>
        {item.payment_method === 'cash' && (
          <View style={styles.cashBadge}>
            <Ionicons name="cash" size={12} color="#D97706" />
            <Text style={styles.cashText}>Espèces</Text>
          </View>
        )}
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primary + '15', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}
          onPress={() => handleContractAction(item.id)}
          data-testid={`contract-btn-${item.id}`}
        >
          <Ionicons name="document-text" size={14} color={COLORS.primary} />
          <Text style={{ color: COLORS.primary, fontSize: 11, fontWeight: '600' }}>Contrat</Text>
        </TouchableOpacity>
        <Text style={styles.price}>CHF {item.total_price.toFixed(2)}</Text>
      </View>
    </View>
  );

  return (
  <View style={{ flex: 1 }}>
    <ScrollView style={styles.container} data-testid="admin-reservations-page">
      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={COLORS.textLight} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher par nom, email, véhicule..."
            placeholderTextColor={COLORS.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
            data-testid="reservation-search-input"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.textLight} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.dateFilterButton, activeDateFilter && styles.dateFilterButtonActive]}
          onPress={() => setShowDateFilter(true)}
          data-testid="date-filter-button"
        >
          <Ionicons name="calendar" size={18} color={activeDateFilter ? COLORS.card : COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
          data-testid="sort-button"
        >
          <Ionicons 
            name={sortOrder === 'newest' ? 'arrow-down' : 'arrow-up'} 
            size={18} 
            color={COLORS.primary} 
          />
        </TouchableOpacity>
      </View>

      {/* Active Date Filter Badge */}
      {activeDateFilter && (
        <View style={styles.activeDateFilterBadge}>
          <Ionicons name="calendar" size={16} color={COLORS.primary} />
          <Text style={styles.activeDateFilterText}>
            {activeDateFilter.type === 'created' ? 'Créées' : 'Location'}: {format(new Date(activeDateFilter.start), 'dd/MM/yy')} → {format(new Date(activeDateFilter.end), 'dd/MM/yy')}
          </Text>
          <TouchableOpacity onPress={clearDateFilter}>
            <Ionicons name="close-circle" size={18} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      )}

      {/* Stats */}
      <View style={styles.statsSection}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Réservations</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: COLORS.success }]}>{stats.confirmed}</Text>
          <Text style={styles.statLabel}>Actives</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: COLORS.primary }]}>CHF {stats.revenue.toFixed(0)}</Text>
          <Text style={styles.statLabel}>Revenus</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContainer}
      >
        {STATUS_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.value || 'all'}
            style={[
              styles.filterTab,
              statusFilter === option.value && styles.filterTabActive
            ]}
            onPress={() => setStatusFilter(option.value)}
            data-testid={`filter-tab-${option.value || 'all'}`}
          >
            <Ionicons 
              name={option.icon as any} 
              size={16} 
              color={statusFilter === option.value ? COLORS.card : COLORS.textLight} 
            />
            <Text style={[
              styles.filterTabText,
              statusFilter === option.value && styles.filterTabTextActive
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Results count */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount} data-testid="results-count">
          {filteredReservations.length} résultat{filteredReservations.length > 1 ? 's' : ''}
          {searchQuery && ` pour "${searchQuery}"`}
        </Text>
      </View>

      {/* Reservation Cards */}
      <View style={styles.listContent}>
        {filteredReservations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color={COLORS.textLight} />
            <Text style={styles.emptyText}>Aucune réservation trouvée</Text>
            {searchQuery && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Text style={styles.clearSearch}>Effacer la recherche</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredReservations.map(item => renderReservationCard(item))
        )}
      </View>

      {/* Date Filter Modal */}
      <Modal
        visible={showDateFilter}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDateFilter(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filtrer par date</Text>
            <TouchableOpacity onPress={() => setShowDateFilter(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Filter Type */}
            <View style={styles.filterTypeSection}>
              <Text style={styles.filterTypeLabel}>Filtrer par :</Text>
              <View style={styles.filterTypeOptions}>
                <TouchableOpacity
                  style={[styles.filterTypeOption, dateFilterType === 'rental' && styles.filterTypeOptionActive]}
                  onPress={() => setDateFilterType('rental')}
                >
                  <Ionicons name="car" size={20} color={dateFilterType === 'rental' ? COLORS.card : COLORS.primary} />
                  <Text style={[styles.filterTypeText, dateFilterType === 'rental' && styles.filterTypeTextActive]}>
                    Période de location
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterTypeOption, dateFilterType === 'created' && styles.filterTypeOptionActive]}
                  onPress={() => setDateFilterType('created')}
                >
                  <Ionicons name="time" size={20} color={dateFilterType === 'created' ? COLORS.card : COLORS.primary} />
                  <Text style={[styles.filterTypeText, dateFilterType === 'created' && styles.filterTypeTextActive]}>
                    Date de création
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Date Inputs */}
            <View style={styles.dateInputsSection}>
              <View style={styles.dateInputGroup}>
                <Text style={styles.dateInputLabel}>Date de début</Text>
                <TextInput
                  style={styles.dateInput}
                  value={startDateFilter}
                  onChangeText={setStartDateFilter}
                  placeholder="AAAA-MM-JJ"
                  placeholderTextColor={COLORS.textLight}
                />
                <Text style={styles.dateInputHint}>Exemple: 2026-02-01</Text>
              </View>
              <View style={styles.dateInputGroup}>
                <Text style={styles.dateInputLabel}>Date de fin</Text>
                <TextInput
                  style={styles.dateInput}
                  value={endDateFilter}
                  onChangeText={setEndDateFilter}
                  placeholder="AAAA-MM-JJ"
                  placeholderTextColor={COLORS.textLight}
                />
                <Text style={styles.dateInputHint}>Exemple: 2026-02-28</Text>
              </View>
            </View>

            {/* Quick Select */}
            <View style={styles.quickSelectSection}>
              <Text style={styles.quickSelectLabel}>Sélection rapide</Text>
              <View style={styles.quickSelectOptions}>
                <TouchableOpacity
                  style={styles.quickSelectButton}
                  onPress={() => {
                    const today = new Date();
                    setStartDateFilter(format(today, 'yyyy-MM-dd'));
                    setEndDateFilter(format(today, 'yyyy-MM-dd'));
                  }}
                >
                  <Text style={styles.quickSelectText}>Aujourd'hui</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickSelectButton}
                  onPress={() => {
                    const today = new Date();
                    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                    setStartDateFilter(format(weekAgo, 'yyyy-MM-dd'));
                    setEndDateFilter(format(today, 'yyyy-MM-dd'));
                  }}
                >
                  <Text style={styles.quickSelectText}>7 derniers jours</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickSelectButton}
                  onPress={() => {
                    const today = new Date();
                    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                    setStartDateFilter(format(monthAgo, 'yyyy-MM-dd'));
                    setEndDateFilter(format(today, 'yyyy-MM-dd'));
                  }}
                >
                  <Text style={styles.quickSelectText}>30 derniers jours</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickSelectButton}
                  onPress={() => {
                    const today = new Date();
                    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                    setStartDateFilter(format(firstDay, 'yyyy-MM-dd'));
                    setEndDateFilter(format(today, 'yyyy-MM-dd'));
                  }}
                >
                  <Text style={styles.quickSelectText}>Ce mois</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.clearButton} onPress={clearDateFilter}>
              <Text style={styles.clearButtonText}>Effacer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={applyDateFilter}>
              <Ionicons name="checkmark" size={20} color={COLORS.card} />
              <Text style={styles.applyButtonText}>Appliquer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>

    {/* Status / Payment Modal */}
    {actionModal && (
      <Modal visible transparent animationType="fade" onRequestClose={() => setActionModal(null)}>
        <TouchableOpacity style={styles.actionModalOverlay} activeOpacity={1} onPress={() => setActionModal(null)}>
          <TouchableOpacity activeOpacity={1} style={styles.actionModalBox}>
            <View style={styles.actionModalHeader}>
              <Text style={styles.actionModalTitle}>
                {actionModal.type === 'status' ? 'Statut de réservation' : 'Statut de paiement'}
              </Text>
              <TouchableOpacity onPress={() => setActionModal(null)} data-testid="close-action-modal">
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.actionModalSub}>
              {actionModal.reservation.user_name} — {actionModal.reservation.vehicle_name}
            </Text>
            <Text style={styles.actionModalSub}>
              CHF {actionModal.reservation.total_price.toFixed(2)}
            </Text>

            {actionModal.type === 'status' ? (
              <View style={styles.actionModalOptions}>
                {[
                  { value: 'pending', label: 'En attente', icon: 'time', color: '#F59E0B' },
                  { value: 'pending_cash', label: 'Espèces en attente', icon: 'cash', color: '#D97706' },
                  { value: 'confirmed', label: 'Confirmée', icon: 'checkmark-circle', color: '#10B981' },
                  { value: 'active', label: 'Active', icon: 'car', color: '#1E3A8A' },
                  { value: 'completed', label: 'Terminée', icon: 'checkmark-done', color: '#6B7280' },
                  { value: 'cancelled', label: 'Annulée', icon: 'close-circle', color: '#EF4444' },
                ].map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.actionModalBtn, actionModal.reservation.status === opt.value && { backgroundColor: opt.color + '18', borderColor: opt.color }]}
                    onPress={() => { updateStatus(actionModal.reservation.id, opt.value); setActionModal(null); }}
                    data-testid={`status-${opt.value}`}
                  >
                    <Ionicons name={opt.icon as any} size={18} color={opt.color} />
                    <Text style={[styles.actionModalBtnText, { color: opt.color }]}>{opt.label}</Text>
                    {actionModal.reservation.status === opt.value && <Ionicons name="checkmark" size={16} color={opt.color} />}
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.actionModalOptions}>
                {[
                  { value: 'unpaid', label: 'Non payé', icon: 'close-circle', color: '#EF4444' },
                  { value: 'pending', label: 'En attente', icon: 'time', color: '#F59E0B' },
                  { value: 'paid', label: 'Payé', icon: 'checkmark-circle', color: '#10B981' },
                  { value: 'refunded', label: 'Remboursé', icon: 'return-down-back', color: '#6B7280' },
                ].map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.actionModalBtn, actionModal.reservation.payment_status === opt.value && { backgroundColor: opt.color + '18', borderColor: opt.color }]}
                    onPress={() => { updatePaymentStatus(actionModal.reservation.id, opt.value); setActionModal(null); }}
                    data-testid={`payment-${opt.value}`}
                  >
                    <Ionicons name={opt.icon as any} size={18} color={opt.color} />
                    <Text style={[styles.actionModalBtnText, { color: opt.color }]}>{opt.label}</Text>
                    {actionModal.reservation.payment_status === opt.value && <Ionicons name="checkmark" size={16} color={opt.color} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    )}
  </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchSection: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 8,
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    width: 46,
    height: 46,
    borderRadius: 12,
  },
  dateFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    width: 46,
    height: 46,
    borderRadius: 12,
  },
  dateFilterButtonActive: {
    backgroundColor: COLORS.primary,
  },
  activeDateFilterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '15',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 10,
    borderRadius: 10,
    gap: 8,
  },
  activeDateFilterText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
  },
  sortButtonText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  statsSection: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  statItem: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 2,
  },
  filterScroll: {
    maxHeight: 50,
  },
  filterContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    gap: 6,
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
  },
  filterTabText: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: COLORS.card,
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  resultsCount: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  headerLeft: {},
  reservationId: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  createdDate: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  clientSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  clientEmail: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  vehicleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  vehicleName: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  datesSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  dateBox: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  dateArrow: {
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  daysCount: {
    fontSize: 10,
    color: COLORS.textLight,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  paymentText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cashBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  cashText: {
    fontSize: 11,
    color: '#D97706',
    fontWeight: '500',
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
  clearSearch: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 12,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  filterTypeSection: {
    marginBottom: 24,
  },
  filterTypeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  filterTypeOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  filterTypeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.primary,
    gap: 8,
  },
  filterTypeOptionActive: {
    backgroundColor: COLORS.primary,
  },
  filterTypeText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  filterTypeTextActive: {
    color: COLORS.card,
  },
  dateInputsSection: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  dateInputGroup: {
    marginBottom: 16,
  },
  dateInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  dateInput: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateInputHint: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
  },
  quickSelectSection: {
    marginBottom: 24,
  },
  quickSelectLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  quickSelectOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickSelectButton: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickSelectText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  clearButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  applyButton: {
    flex: 2,
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  applyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.card,
  },
  actionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionModalBox: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 24,
    width: 360,
    maxWidth: '90%',
  },
  actionModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  actionModalSub: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  actionModalOptions: {
    marginTop: 16,
    gap: 8,
  },
  actionModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  actionModalBtnText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
});
