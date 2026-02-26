import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, Platform, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useReservationStore, Reservation } from '../../src/store/reservationStore';
import { useVehicleStore } from '../../src/store/vehicleStore';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, isToday, addMonths, subMonths, isBefore, startOfDay } from 'date-fns';
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
  confirmed: 'Confirm\u00e9e',
  active: 'En cours',
  pending: 'En attente',
  pending_cash: 'Esp\u00e8ces en attente',
  cancelled: 'Annul\u00e9e',
  completed: 'Termin\u00e9e',
};

const paymentLabels: Record<string, string> = {
  paid: 'Pay\u00e9',
  pending: 'En attente',
  unpaid: 'Non pay\u00e9',
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'confirmed': return C.success;
    case 'active': return C.purple;
    case 'pending': return C.warning;
    case 'pending_cash': return C.warning;
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

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function ReservationCard({ item, vehicle, onCancel }: { item: Reservation; vehicle: any; onCancel: (id: string) => void }) {
  const canCancel = ['pending', 'confirmed'].includes(item.status) && item.payment_status !== 'paid';
  const statusColor = getStatusColor(item.status);
  const paymentColor = getPaymentColor(item.payment_status);

  return (
    <View style={styles.card} data-testid={`reservation-${item.id}`}>
      <View style={styles.cardHeader}>
        {vehicle?.image_url ? (
          <Image source={{ uri: vehicle.image_url }} style={styles.vehicleThumb} resizeMode="cover" />
        ) : (
          <View style={[styles.vehicleThumb, styles.vehicleThumbPlaceholder]}>
            <Ionicons name="car" size={20} color={C.gray} />
          </View>
        )}
        <View style={styles.cardHeaderInfo}>
          <Text style={styles.vehicleName}>{vehicle ? `${vehicle.brand} ${vehicle.model}` : 'V\u00e9hicule'}</Text>
          <Text style={styles.vehicleYear}>{vehicle?.year}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}>
          <View style={[styles.badgeDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.badgeText, { color: statusColor }]}>{statusLabels[item.status] || item.status}</Text>
        </View>
      </View>

      <View style={styles.datesRow}>
        <View style={styles.dateBox}>
          <Text style={styles.dateLabel}>D\u00e9but</Text>
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

      <View style={styles.priceRow}>
        <View style={[styles.statusBadge, { backgroundColor: paymentColor + '18' }]}>
          <View style={[styles.badgeDot, { backgroundColor: paymentColor }]} />
          <Text style={[styles.badgeText, { color: paymentColor }]}>{paymentLabels[item.payment_status] || item.payment_status}</Text>
        </View>
        <View style={styles.priceBox}>
          <Text style={styles.priceLabel}>Total</Text>
          <Text style={styles.priceValue}>CHF {item.total_price.toFixed(2)}</Text>
        </View>
      </View>

      {canCancel && (
        <TouchableOpacity style={styles.cancelBtn} onPress={() => onCancel(item.id)} data-testid={`cancel-${item.id}`}>
          <Ionicons name="close-circle-outline" size={16} color={C.error} />
          <Text style={styles.cancelText}>Annuler la r\u00e9servation</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function CalendarView({ reservations, vehicles }: { reservations: Reservation[]; vehicles: any[] }) {
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const isCurrentMonth = isSameMonth(currentMonth, new Date());

  const getVehicle = (vehicleId: string) => vehicles.find(v => v.id === vehicleId);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days: Date[] = [];
    let day = calStart;
    while (day <= calEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  const getReservationsForDate = (date: Date) => {
    return reservations.filter(r => {
      if (r.status === 'cancelled') return false;
      const start = new Date(r.start_date);
      const end = new Date(r.end_date);
      const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const sDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const eDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      return day >= sDay && day <= eDay;
    });
  };

  const selectedReservations = useMemo(() => {
    if (!selectedDate) return [];
    return getReservationsForDate(selectedDate);
  }, [selectedDate, reservations]);

  const weeks: Date[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  return (
    <View>
      {/* Month Navigation */}
      <View style={calStyles.monthNav} data-testid="calendar-month-nav">
        <TouchableOpacity onPress={() => setCurrentMonth(subMonths(currentMonth, 1))} style={calStyles.navBtn} data-testid="cal-prev-month">
          <Ionicons name="chevron-back" size={20} color={C.purple} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { setCurrentMonth(new Date()); setSelectedDate(new Date()); }}
          disabled={isCurrentMonth}
          data-testid="cal-today-btn"
        >
          <Text style={calStyles.monthTitle}>
            {format(currentMonth, 'MMMM yyyy', { locale: fr })}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setCurrentMonth(addMonths(currentMonth, 1))} style={calStyles.navBtn} data-testid="cal-next-month">
          <Ionicons name="chevron-forward" size={20} color={C.purple} />
        </TouchableOpacity>
      </View>

      {/* Today Button */}
      {!isCurrentMonth && (
        <TouchableOpacity
          style={calStyles.todayBtn}
          onPress={() => { setCurrentMonth(new Date()); setSelectedDate(new Date()); }}
          data-testid="cal-goto-today"
        >
          <Ionicons name="today-outline" size={14} color={C.purple} />
          <Text style={calStyles.todayBtnText}>Aujourd'hui</Text>
        </TouchableOpacity>
      )}

      {/* Weekday Headers */}
      <View style={calStyles.weekRow}>
        {WEEKDAYS.map(d => (
          <View key={d} style={calStyles.weekCell}>
            <Text style={calStyles.weekText}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Calendar Grid */}
      {weeks.map((week, wi) => (
        <View key={wi} style={calStyles.weekRow}>
          {week.map(date => {
            const inMonth = isSameMonth(date, currentMonth);
            const today = isToday(date);
            const selected = selectedDate && isSameDay(date, selectedDate);
            const dayRes = getReservationsForDate(date);
            const hasRes = dayRes.length > 0;
            const hasActive = dayRes.some(r => r.status === 'active');
            const hasPending = dayRes.some(r => r.status === 'pending' || r.status === 'pending_cash');

            return (
              <TouchableOpacity
                key={date.toISOString()}
                style={[
                  calStyles.dayCell,
                  !inMonth && calStyles.dayCellOutside,
                  today && calStyles.dayCellToday,
                  selected && calStyles.dayCellSelected,
                ]}
                onPress={() => setSelectedDate(date)}
                data-testid={`cal-day-${format(date, 'yyyy-MM-dd')}`}
              >
                <Text style={[
                  calStyles.dayNum,
                  !inMonth && calStyles.dayNumOutside,
                  today && calStyles.dayNumToday,
                  selected && calStyles.dayNumSelected,
                ]}>
                  {format(date, 'd')}
                </Text>
                {hasRes && (
                  <View style={calStyles.dotsRow}>
                    {hasActive && <View style={[calStyles.dot, { backgroundColor: C.purple }]} />}
                    {hasPending && <View style={[calStyles.dot, { backgroundColor: C.warning }]} />}
                    {!hasActive && !hasPending && <View style={[calStyles.dot, { backgroundColor: C.success }]} />}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      {/* Legend */}
      <View style={calStyles.legend}>
        <View style={calStyles.legendItem}>
          <View style={[calStyles.legendDot, { backgroundColor: C.purple }]} />
          <Text style={calStyles.legendText}>En cours</Text>
        </View>
        <View style={calStyles.legendItem}>
          <View style={[calStyles.legendDot, { backgroundColor: C.warning }]} />
          <Text style={calStyles.legendText}>En attente</Text>
        </View>
        <View style={calStyles.legendItem}>
          <View style={[calStyles.legendDot, { backgroundColor: C.success }]} />
          <Text style={calStyles.legendText}>Confirm\u00e9e</Text>
        </View>
      </View>

      {/* Selected Date Events */}
      {selectedDate && (
        <View style={calStyles.selectedSection} data-testid="calendar-selected-date-events">
          <Text style={calStyles.selectedTitle}>
            {format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
          </Text>
          {selectedReservations.length === 0 ? (
            <View style={calStyles.emptyDay}>
              <Ionicons name="calendar-outline" size={28} color={C.gray} />
              <Text style={calStyles.emptyDayText}>Aucune r\u00e9servation</Text>
            </View>
          ) : (
            selectedReservations.map(res => {
              const vehicle = getVehicle(res.vehicle_id);
              const statusColor = getStatusColor(res.status);
              return (
                <View key={res.id} style={calStyles.eventCard} data-testid={`cal-event-${res.id}`}>
                  <View style={[calStyles.eventBorder, { backgroundColor: statusColor }]} />
                  <View style={calStyles.eventContent}>
                    <View style={calStyles.eventHeader}>
                      <Text style={calStyles.eventVehicle}>
                        {vehicle ? `${vehicle.brand} ${vehicle.model}` : 'V\u00e9hicule'}
                      </Text>
                      <View style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}>
                        <Text style={[styles.badgeText, { color: statusColor }]}>{statusLabels[res.status] || res.status}</Text>
                      </View>
                    </View>
                    <Text style={calStyles.eventDates}>
                      {format(new Date(res.start_date), 'd MMM', { locale: fr })} - {format(new Date(res.end_date), 'd MMM yyyy', { locale: fr })}
                    </Text>
                    <View style={calStyles.eventFooter}>
                      <Text style={calStyles.eventDays}>{res.total_days} jour{res.total_days > 1 ? 's' : ''}</Text>
                      <Text style={calStyles.eventPrice}>CHF {res.total_price.toFixed(2)}</Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}
    </View>
  );
}

export default function ReservationsScreen() {
  const router = useRouter();
  const { reservations, fetchReservations, cancelReservation, isLoading } = useReservationStore();
  const { vehicles, fetchVehicles } = useVehicleStore();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  useEffect(() => { fetchReservations(); fetchVehicles(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchReservations(), fetchVehicles()]);
    setRefreshing(false);
  };

  const handleCancel = (id: string) => {
    if (Platform.OS === 'web') {
      if (window.confirm('Voulez-vous annuler cette r\u00e9servation ?')) {
        cancelReservation(id).then(() => fetchReservations());
      }
    } else {
      Alert.alert('Annuler la r\u00e9servation', 'Voulez-vous annuler cette r\u00e9servation ?', [
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
    { id: 'confirmed', label: 'Confirm\u00e9es' },
    { id: 'active', label: 'En cours' },
    { id: 'completed', label: 'Termin\u00e9es' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Mes Locations</Text>
            <Text style={styles.subtitle}>{reservations.length} r\u00e9servation{reservations.length !== 1 ? 's' : ''}</Text>
          </View>
          {/* View Mode Toggle */}
          <View style={styles.viewToggle} data-testid="view-mode-toggle">
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
              onPress={() => setViewMode('list')}
              data-testid="view-mode-list"
            >
              <Ionicons name="list" size={16} color={viewMode === 'list' ? '#FFF' : C.gray} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'calendar' && styles.toggleBtnActive]}
              onPress={() => setViewMode('calendar')}
              data-testid="view-mode-calendar"
            >
              <Ionicons name="calendar" size={16} color={viewMode === 'calendar' ? '#FFF' : C.gray} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Filters - only show in list mode */}
      {viewMode === 'list' && (
        <View style={styles.filterBar}>
          {filters.map(f => (
            <TouchableOpacity key={f.id} style={[styles.filterChip, filter === f.id && styles.filterChipActive]}
              onPress={() => setFilter(f.id)} data-testid={`filter-${f.id}`}>
              <Text style={[styles.filterText, filter === f.id && styles.filterTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Content */}
      <ScrollView style={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.content}>
          {viewMode === 'calendar' ? (
            <CalendarView reservations={reservations} vehicles={vehicles} />
          ) : (
            <>
              {filteredReservations.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="calendar-outline" size={56} color={C.gray} />
                  <Text style={styles.emptyText}>Aucune r\u00e9servation</Text>
                  <Text style={styles.emptySubtext}>R\u00e9servez votre premier v\u00e9hicule</Text>
                  <Button title="Voir les v\u00e9hicules" onPress={() => router.push('/(tabs)/vehicles')} style={{ marginTop: 20 }} />
                </View>
              ) : (
                filteredReservations.map((item) => (
                  <ReservationCard key={item.id} item={item} vehicle={getVehicle(item.vehicle_id)} onCancel={handleCancel} />
                ))
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, backgroundColor: C.card },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: C.dark },
  subtitle: { fontSize: 13, color: C.gray, marginTop: 2 },
  viewToggle: { flexDirection: 'row', backgroundColor: C.grayLight, borderRadius: 10, padding: 3 },
  toggleBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  toggleBtnActive: { backgroundColor: C.purple },
  filterBar: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border, paddingHorizontal: 16, paddingVertical: 8, gap: 6 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: C.grayLight },
  filterChipActive: { backgroundColor: C.purple },
  filterText: { fontSize: 12, fontWeight: '500', color: C.gray },
  filterTextActive: { color: '#FFF', fontWeight: '600' },
  scroll: { flex: 1 },
  content: { maxWidth: 800, width: '100%', alignSelf: 'center', padding: 16 },
  card: { backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  vehicleThumb: { width: 40, height: 40, borderRadius: 8, overflow: 'hidden' },
  vehicleThumbPlaceholder: { backgroundColor: C.grayLight, justifyContent: 'center', alignItems: 'center' },
  cardHeaderInfo: { flex: 1 },
  vehicleName: { fontSize: 15, fontWeight: '700', color: C.dark },
  vehicleYear: { fontSize: 11, color: C.gray, marginTop: 1 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, gap: 4 },
  badgeDot: { width: 5, height: 5, borderRadius: 3 },
  badgeText: { fontSize: 10, fontWeight: '600' },
  datesRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.border },
  dateBox: { flex: 1 },
  dateLabel: { fontSize: 10, color: C.gray, marginBottom: 1 },
  dateValue: { fontSize: 13, fontWeight: '600', color: C.dark },
  dateTime: { fontSize: 11, fontWeight: '600', color: C.purple, marginTop: 1 },
  dateArrow: { alignItems: 'center', paddingHorizontal: 10 },
  daysCount: { fontSize: 9, color: C.gray, marginTop: 1 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  priceBox: { alignItems: 'flex-end' },
  priceLabel: { fontSize: 10, color: C.gray },
  priceValue: { fontSize: 18, fontWeight: '800', color: C.purple },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border, gap: 5 },
  cancelText: { fontSize: 12, fontWeight: '600', color: C.error },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 18, fontWeight: '600', color: C.dark, marginTop: 16 },
  emptySubtext: { fontSize: 14, color: C.gray, marginTop: 6 },
});

const calStyles = StyleSheet.create({
  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  navBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.border },
  monthTitle: { fontSize: 17, fontWeight: '700', color: C.dark, textTransform: 'capitalize' },
  weekRow: { flexDirection: 'row' },
  weekCell: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  weekText: { fontSize: 11, fontWeight: '600', color: C.gray, textTransform: 'uppercase' },
  dayCell: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8, minHeight: 44 },
  dayCellOutside: { opacity: 0.3 },
  dayCellToday: { backgroundColor: C.purpleLight },
  dayCellSelected: { backgroundColor: C.purple },
  dayNum: { fontSize: 14, fontWeight: '500', color: C.dark },
  dayNumOutside: { color: C.gray },
  dayNumToday: { fontWeight: '700', color: C.purple },
  dayNumSelected: { color: '#FFF', fontWeight: '700' },
  dotsRow: { flexDirection: 'row', gap: 3, marginTop: 3 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.border, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: C.gray },
  selectedSection: { marginTop: 12, backgroundColor: C.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.border },
  selectedTitle: { fontSize: 15, fontWeight: '700', color: C.dark, marginBottom: 10, textTransform: 'capitalize' },
  emptyDay: { alignItems: 'center', paddingVertical: 20 },
  emptyDayText: { fontSize: 13, color: C.gray, marginTop: 6 },
  eventCard: { flexDirection: 'row', backgroundColor: C.bg, borderRadius: 10, marginBottom: 8, overflow: 'hidden' },
  eventBorder: { width: 4, alignSelf: 'stretch' },
  eventContent: { flex: 1, padding: 10 },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eventVehicle: { fontSize: 14, fontWeight: '600', color: C.dark },
  eventDates: { fontSize: 12, color: C.gray, marginTop: 4 },
  eventFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  eventDays: { fontSize: 11, color: C.gray },
  eventPrice: { fontSize: 15, fontWeight: '700', color: C.purple },
});
