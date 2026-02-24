import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api/axios';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, isToday, addMonths, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';

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
  overdue: '#DC2626',
  departure: '#3B82F6',
  return: '#8B5CF6',
};

interface CalendarEvent {
  id: string;
  user_name: string;
  user_email: string;
  user_phone: string;
  vehicle_name: string;
  vehicle_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  total_price: number;
  status: string;
  payment_status: string;
  payment_method: string;
  is_overdue: boolean;
  days_overdue: number;
}

interface OverdueItem {
  id: string;
  user_name: string;
  user_email: string;
  user_phone: string;
  vehicle_name: string;
  start_date: string;
  end_date: string;
  total_days: number;
  total_price: number;
  days_overdue: number;
  status: string;
  payment_status: string;
}

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export default function AdminCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [overdue, setOverdue] = useState<OverdueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    fetchCalendarData();
    fetchOverdue();
  }, [currentMonth]);

  const fetchCalendarData = async () => {
    try {
      const month = currentMonth.getMonth() + 1;
      const year = currentMonth.getFullYear();
      const response = await api.get(`/api/admin/calendar?month=${month}&year=${year}`);
      setEvents(response.data.events);
    } catch (error: any) {
      console.error('Error fetching calendar:', error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchOverdue = async () => {
    try {
      const response = await api.get('/api/admin/overdue');
      setOverdue(response.data.overdue);
    } catch (error: any) {
      console.error('Error fetching overdue:', error.response?.data || error.message);
    }
  };

  const getEventsForDate = (date: Date) => {
    const departures: CalendarEvent[] = [];
    const returns: CalendarEvent[] = [];
    const ongoing: CalendarEvent[] = [];

    events.forEach(event => {
      const start = new Date(event.start_date);
      const end = new Date(event.end_date);

      if (isSameDay(start, date)) {
        departures.push(event);
      }
      if (isSameDay(end, date)) {
        returns.push(event);
      }
      if (start < date && end > date) {
        ongoing.push(event);
      }
    });

    return { departures, returns, ongoing };
  };

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

  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return { departures: [], returns: [], ongoing: [] };
    return getEventsForDate(selectedDate);
  }, [selectedDate, events]);

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

  const renderCalendarDay = (date: Date) => {
    const inMonth = isSameMonth(date, currentMonth);
    const today = isToday(date);
    const isSelected = selectedDate && isSameDay(date, selectedDate);
    const dayEvents = getEventsForDate(date);
    const hasDeparture = dayEvents.departures.length > 0;
    const hasReturn = dayEvents.returns.length > 0;
    const hasOverdue = dayEvents.returns.some(e => e.is_overdue) || dayEvents.ongoing.some(e => e.is_overdue);
    const hasOngoing = dayEvents.ongoing.length > 0;

    return (
      <TouchableOpacity
        key={date.toISOString()}
        style={[
          styles.dayCell,
          !inMonth && styles.dayCellOutside,
          today && styles.dayCellToday,
          isSelected && styles.dayCellSelected,
          hasOverdue && styles.dayCellOverdue,
        ]}
        onPress={() => setSelectedDate(date)}
        data-testid={`calendar-day-${format(date, 'yyyy-MM-dd')}`}
      >
        <Text style={[
          styles.dayNumber,
          !inMonth && styles.dayNumberOutside,
          today && styles.dayNumberToday,
          isSelected && styles.dayNumberSelected,
        ]}>
          {format(date, 'd')}
        </Text>
        <View style={styles.dayIndicators}>
          {hasDeparture && (
            <View style={[styles.indicator, { backgroundColor: COLORS.departure }]}>
              <Text style={styles.indicatorText}>{dayEvents.departures.length}</Text>
            </View>
          )}
          {hasReturn && (
            <View style={[styles.indicator, { backgroundColor: hasOverdue ? COLORS.overdue : COLORS.return }]}>
              <Text style={styles.indicatorText}>{dayEvents.returns.length}</Text>
            </View>
          )}
          {hasOngoing && !hasDeparture && !hasReturn && (
            <View style={[styles.indicatorBar, { backgroundColor: COLORS.success + '40' }]} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={styles.container} data-testid="admin-calendar-page">
      {/* Overdue Alert Banner */}
      {overdue.length > 0 && (
        <View style={styles.overdueAlert} data-testid="overdue-alert-banner">
          <View style={styles.overdueAlertHeader}>
            <Ionicons name="warning" size={22} color={COLORS.card} />
            <Text style={styles.overdueAlertTitle}>
              {overdue.length} véhicule{overdue.length > 1 ? 's' : ''} en retard !
            </Text>
          </View>
          {overdue.map(item => (
            <View key={item.id} style={styles.overdueItem}>
              <View style={styles.overdueItemLeft}>
                <Text style={styles.overdueVehicle}>{item.vehicle_name}</Text>
                <Text style={styles.overdueClient}>{item.user_name} - {item.user_phone || item.user_email}</Text>
              </View>
              <View style={styles.overdueItemRight}>
                <Text style={styles.overdueDays}>+{item.days_overdue}j</Text>
                <Text style={styles.overdueDate}>
                  Retour prévu: {format(new Date(item.end_date), 'dd/MM', { locale: fr })}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Calendar Header */}
      <View style={styles.calendarHeader}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => setCurrentMonth(subMonths(currentMonth, 1))}
          data-testid="calendar-prev-month"
        >
          <Ionicons name="chevron-back" size={22} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>
          {format(currentMonth, 'MMMM yyyy', { locale: fr })}
        </Text>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => setCurrentMonth(addMonths(currentMonth, 1))}
          data-testid="calendar-next-month"
        >
          <Ionicons name="chevron-forward" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.departure }]} />
          <Text style={styles.legendText}>Départ</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.return }]} />
          <Text style={styles.legendText}>Retour</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.overdue }]} />
          <Text style={styles.legendText}>Retard</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.success + '40' }]} />
          <Text style={styles.legendText}>En cours</Text>
        </View>
      </View>

      {/* Weekday Headers */}
      <View style={styles.weekdayRow}>
        {WEEKDAYS.map(day => (
          <View key={day} style={styles.weekdayCell}>
            <Text style={styles.weekdayText}>{day}</Text>
          </View>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.calendarGrid}>
        {calendarDays.map(date => renderCalendarDay(date))}
      </View>

      {/* Selected Day Details */}
      {selectedDate && (
        <View style={styles.dayDetails} data-testid="selected-day-details">
          <Text style={styles.dayDetailsTitle}>
            {format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
          </Text>

          {/* Departures */}
          {selectedDateEvents.departures.length > 0 && (
            <View style={styles.eventSection}>
              <View style={styles.eventSectionHeader}>
                <Ionicons name="arrow-up-circle" size={18} color={COLORS.departure} />
                <Text style={[styles.eventSectionTitle, { color: COLORS.departure }]}>
                  Départs ({selectedDateEvents.departures.length})
                </Text>
              </View>
              {selectedDateEvents.departures.map(event => (
                <TouchableOpacity
                  key={`dep-${event.id}`}
                  style={styles.eventCard}
                  onPress={() => { setSelectedEvent(event); setShowDetailModal(true); }}
                  data-testid={`departure-event-${event.id}`}
                >
                  <View style={[styles.eventCardBorder, { backgroundColor: COLORS.departure }]} />
                  <View style={styles.eventCardContent}>
                    <Text style={styles.eventVehicle}>{event.vehicle_name}</Text>
                    <Text style={styles.eventClient}>{event.user_name}</Text>
                    <Text style={styles.eventDates}>
                      Retour: {format(new Date(event.end_date), 'dd MMM yyyy', { locale: fr })} ({event.total_days}j)
                    </Text>
                  </View>
                  <View style={[styles.eventStatus, { backgroundColor: getStatusColor(event.status) + '20' }]}>
                    <Text style={[styles.eventStatusText, { color: getStatusColor(event.status) }]}>
                      {getStatusLabel(event.status)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Returns */}
          {selectedDateEvents.returns.length > 0 && (
            <View style={styles.eventSection}>
              <View style={styles.eventSectionHeader}>
                <Ionicons name="arrow-down-circle" size={18} color={COLORS.return} />
                <Text style={[styles.eventSectionTitle, { color: COLORS.return }]}>
                  Retours ({selectedDateEvents.returns.length})
                </Text>
              </View>
              {selectedDateEvents.returns.map(event => (
                <TouchableOpacity
                  key={`ret-${event.id}`}
                  style={[styles.eventCard, event.is_overdue && styles.eventCardOverdue]}
                  onPress={() => { setSelectedEvent(event); setShowDetailModal(true); }}
                  data-testid={`return-event-${event.id}`}
                >
                  <View style={[styles.eventCardBorder, { backgroundColor: event.is_overdue ? COLORS.overdue : COLORS.return }]} />
                  <View style={styles.eventCardContent}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.eventVehicle}>{event.vehicle_name}</Text>
                      {event.is_overdue && (
                        <View style={styles.overdueBadge}>
                          <Text style={styles.overdueBadgeText}>+{event.days_overdue}j RETARD</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.eventClient}>{event.user_name}</Text>
                    <Text style={styles.eventDates}>
                      Départ: {format(new Date(event.start_date), 'dd MMM yyyy', { locale: fr })}
                    </Text>
                  </View>
                  <Text style={styles.eventPrice}>CHF {event.total_price.toFixed(0)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Ongoing */}
          {selectedDateEvents.ongoing.length > 0 && (
            <View style={styles.eventSection}>
              <View style={styles.eventSectionHeader}>
                <Ionicons name="car" size={18} color={COLORS.success} />
                <Text style={[styles.eventSectionTitle, { color: COLORS.success }]}>
                  En location ({selectedDateEvents.ongoing.length})
                </Text>
              </View>
              {selectedDateEvents.ongoing.map(event => (
                <TouchableOpacity
                  key={`ong-${event.id}`}
                  style={[styles.eventCard, event.is_overdue && styles.eventCardOverdue]}
                  onPress={() => { setSelectedEvent(event); setShowDetailModal(true); }}
                >
                  <View style={[styles.eventCardBorder, { backgroundColor: event.is_overdue ? COLORS.overdue : COLORS.success }]} />
                  <View style={styles.eventCardContent}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.eventVehicle}>{event.vehicle_name}</Text>
                      {event.is_overdue && (
                        <View style={styles.overdueBadge}>
                          <Text style={styles.overdueBadgeText}>RETARD +{event.days_overdue}j</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.eventClient}>{event.user_name}</Text>
                    <Text style={styles.eventDates}>
                      {format(new Date(event.start_date), 'dd/MM', { locale: fr })} - {format(new Date(event.end_date), 'dd/MM', { locale: fr })}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {selectedDateEvents.departures.length === 0 &&
           selectedDateEvents.returns.length === 0 &&
           selectedDateEvents.ongoing.length === 0 && (
            <View style={styles.noEvents}>
              <Ionicons name="calendar-outline" size={32} color={COLORS.textLight} />
              <Text style={styles.noEventsText}>Aucune réservation ce jour</Text>
            </View>
          )}
        </View>
      )}

      <View style={{ height: 40 }} />

      {/* Event Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}
      >
        {selectedEvent && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Détail de la réservation</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              {selectedEvent.is_overdue && (
                <View style={styles.modalOverdueAlert}>
                  <Ionicons name="warning" size={20} color={COLORS.card} />
                  <Text style={styles.modalOverdueText}>
                    RETARD DE {selectedEvent.days_overdue} JOUR{selectedEvent.days_overdue > 1 ? 'S' : ''} !
                  </Text>
                </View>
              )}

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Véhicule</Text>
                <Text style={styles.modalValue}>{selectedEvent.vehicle_name}</Text>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Client</Text>
                <Text style={styles.modalValue}>{selectedEvent.user_name}</Text>
                <Text style={styles.modalSubValue}>{selectedEvent.user_email}</Text>
                {selectedEvent.user_phone ? (
                  <Text style={styles.modalSubValue}>{selectedEvent.user_phone}</Text>
                ) : null}
              </View>

              <View style={styles.modalRow}>
                <View style={styles.modalHalf}>
                  <Text style={styles.modalSectionTitle}>Départ</Text>
                  <Text style={styles.modalValue}>
                    {format(new Date(selectedEvent.start_date), 'dd MMM yyyy', { locale: fr })}
                  </Text>
                </View>
                <View style={styles.modalHalf}>
                  <Text style={styles.modalSectionTitle}>Retour</Text>
                  <Text style={[styles.modalValue, selectedEvent.is_overdue && { color: COLORS.overdue }]}>
                    {format(new Date(selectedEvent.end_date), 'dd MMM yyyy', { locale: fr })}
                  </Text>
                </View>
              </View>

              <View style={styles.modalRow}>
                <View style={styles.modalHalf}>
                  <Text style={styles.modalSectionTitle}>Durée</Text>
                  <Text style={styles.modalValue}>{selectedEvent.total_days} jours</Text>
                </View>
                <View style={styles.modalHalf}>
                  <Text style={styles.modalSectionTitle}>Montant</Text>
                  <Text style={styles.modalValue}>CHF {selectedEvent.total_price.toFixed(2)}</Text>
                </View>
              </View>

              <View style={styles.modalRow}>
                <View style={styles.modalHalf}>
                  <Text style={styles.modalSectionTitle}>Statut</Text>
                  <View style={[styles.modalBadge, { backgroundColor: getStatusColor(selectedEvent.status) + '20' }]}>
                    <Text style={[styles.modalBadgeText, { color: getStatusColor(selectedEvent.status) }]}>
                      {getStatusLabel(selectedEvent.status)}
                    </Text>
                  </View>
                </View>
                <View style={styles.modalHalf}>
                  <Text style={styles.modalSectionTitle}>Paiement</Text>
                  <Text style={styles.modalValue}>
                    {selectedEvent.payment_status === 'paid' ? 'Payé' : 
                     selectedEvent.payment_status === 'pending' ? 'En attente' : 'Non payé'}
                    {selectedEvent.payment_method === 'cash' ? ' (Espèces)' : ' (Carte)'}
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  overdueAlert: {
    backgroundColor: COLORS.overdue,
    margin: 16,
    marginBottom: 8,
    borderRadius: 14,
    padding: 16,
  },
  overdueAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  overdueAlertTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.card,
  },
  overdueItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: 12,
    marginTop: 6,
  },
  overdueItemLeft: {
    flex: 1,
  },
  overdueVehicle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.card,
  },
  overdueClient: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  overdueItemRight: {
    alignItems: 'flex-end',
  },
  overdueDays: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FEE2E2',
  },
  overdueDate: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    textTransform: 'capitalize',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    color: COLORS.textLight,
  },
  weekdayRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
  },
  dayCell: {
    width: '14.28%',
    minHeight: 70,
    maxHeight: 90,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'flex-start',
    borderWidth: 0.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  dayCellOutside: {
    backgroundColor: COLORS.background,
  },
  dayCellToday: {
    backgroundColor: COLORS.primary + '08',
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  },
  dayCellSelected: {
    backgroundColor: COLORS.primary + '15',
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  dayCellOverdue: {
    backgroundColor: '#FEF2F2',
  },
  dayNumber: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text,
    marginTop: 2,
  },
  dayNumberOutside: {
    color: COLORS.textLight + '60',
  },
  dayNumberToday: {
    fontWeight: '700',
    color: COLORS.primary,
  },
  dayNumberSelected: {
    fontWeight: '700',
    color: COLORS.primary,
  },
  dayIndicators: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 2,
    alignItems: 'center',
  },
  indicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicatorText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.card,
  },
  indicatorBar: {
    width: 18,
    height: 4,
    borderRadius: 2,
  },
  dayDetails: {
    margin: 16,
    marginTop: 12,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
  },
  dayDetailsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 14,
    textTransform: 'capitalize',
  },
  eventSection: {
    marginBottom: 16,
  },
  eventSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  eventSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    marginBottom: 6,
    overflow: 'hidden',
  },
  eventCardOverdue: {
    backgroundColor: '#FEF2F2',
  },
  eventCardBorder: {
    width: 4,
    alignSelf: 'stretch',
  },
  eventCardContent: {
    flex: 1,
    padding: 10,
  },
  eventVehicle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  eventClient: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  eventDates: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 2,
  },
  eventStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 10,
  },
  eventStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  eventPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginRight: 12,
  },
  overdueBadge: {
    backgroundColor: COLORS.overdue,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  overdueBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.card,
  },
  noEvents: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  noEventsText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 8,
  },
  // Modal
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
  modalOverdueAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.overdue,
    padding: 14,
    borderRadius: 12,
    gap: 10,
    marginBottom: 20,
  },
  modalOverdueText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.card,
  },
  modalSection: {
    marginBottom: 18,
  },
  modalSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  modalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  modalSubValue: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  modalRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 18,
  },
  modalHalf: {
    flex: 1,
  },
  modalBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
  },
  modalBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
