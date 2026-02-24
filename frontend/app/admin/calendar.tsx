import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Modal, ScrollView, useWindowDimensions } from 'react-native';
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

// Inject CSS for calendar grid on web
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const styleId = 'cal-grid-css';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      #cal-grid-container {
        display: grid !important;
        grid-template-columns: repeat(7, 1fr) !important;
        gap: 1px !important;
        background: ${COLORS.border} !important;
        border: 1px solid ${COLORS.border} !important;
        border-radius: 8px !important;
        overflow: hidden !important;
        margin-bottom: 12px !important;
        flex-shrink: 0 !important;
        flex-grow: 0 !important;
      }
      #cal-grid-container > div {
        min-height: 56px !important;
        max-height: 56px !important;
        background: white !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: flex-start !important;
        padding: 4px 2px !important;
        cursor: pointer !important;
        overflow: hidden !important;
        flex-shrink: 0 !important;
        flex-grow: 0 !important;
      }
      #cal-grid-container > div:hover {
        background: #f0f5ff !important;
      }
      .cal-weekday-cell {
        min-height: 32px !important;
        max-height: 32px !important;
        background: #f0f4f8 !important;
        justify-content: center !important;
      }
      .cal-outside {
        opacity: 0.35 !important;
      }
      .cal-today {
        outline: 2px solid ${COLORS.primary} !important;
        outline-offset: -2px !important;
        background: #eef2ff !important;
      }
      .cal-selected {
        background: #dbeafe !important;
      }
      .cal-has-overdue {
        background: #fef2f2 !important;
      }
    `;
    document.head.appendChild(style);
  }
}

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
      if (isSameDay(start, date)) departures.push(event);
      if (isSameDay(end, date)) returns.push(event);
      if (start < date && end > date) ongoing.push(event);
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
    const map: Record<string, string> = {
      confirmed: 'Confirmée', active: 'Active', pending: 'En attente',
      pending_cash: 'Espèces', cancelled: 'Annulée', completed: 'Terminée',
    };
    return map[status] || status;
  };

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      confirmed: COLORS.success, active: COLORS.primary, pending: COLORS.warning,
      pending_cash: '#D97706', cancelled: COLORS.error, completed: COLORS.textLight,
    };
    return map[status] || COLORS.textLight;
  };

  // Apply CSS class names to cells after render
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Apply classes to calendar cells
      calendarDays.forEach(date => {
        const id = `day-${format(date, 'yyyy-MM-dd')}`;
        const el = document.getElementById(id);
        if (el) {
          el.className = '';
          if (!isSameMonth(date, currentMonth)) el.classList.add('cal-outside');
          if (isToday(date)) el.classList.add('cal-today');
          if (selectedDate && isSameDay(date, selectedDate)) el.classList.add('cal-selected');
          const dayEvents = getEventsForDate(date);
          const hasOverdueEvent = dayEvents.returns.some(e => e.is_overdue) || dayEvents.ongoing.some(e => e.is_overdue);
          if (hasOverdueEvent) el.classList.add('cal-has-overdue');
        }
      });
      // Apply weekday class
      WEEKDAYS.forEach((_, i) => {
        const el = document.getElementById(`weekday-${i}`);
        if (el) el.classList.add('cal-weekday-cell');
      });
    }
  }, [calendarDays, selectedDate, events, currentMonth]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.background }} contentContainerStyle={{ maxWidth: 1000, alignSelf: 'center', width: '100%', padding: 16, flexGrow: 0 }}>

      {/* Overdue Alert Banner */}
      {overdue.length > 0 && (
        <View style={styles.overdueAlert} data-testid="overdue-alert-banner">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Ionicons name="warning" size={22} color={COLORS.card} />
            <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.card }}>
              {overdue.length} véhicule{overdue.length > 1 ? 's' : ''} en retard !
            </Text>
          </View>
          {overdue.map(item => (
            <View key={item.id} style={styles.overdueItem}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.card }}>{item.vehicle_name}</Text>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>{item.user_name} - {item.user_phone || item.user_email}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#FEE2E2' }}>+{item.days_overdue}j</Text>
                <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
                  Retour prévu: {format(new Date(item.end_date), 'dd/MM', { locale: fr })}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Calendar Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 }}>
        <TouchableOpacity style={styles.navButton} onPress={() => setCurrentMonth(subMonths(currentMonth, 1))} data-testid="calendar-prev-month">
          <Ionicons name="chevron-back" size={22} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.text, textTransform: 'capitalize' }}>
          {format(currentMonth, 'MMMM yyyy', { locale: fr })}
        </Text>
        <TouchableOpacity style={styles.navButton} onPress={() => setCurrentMonth(addMonths(currentMonth, 1))} data-testid="calendar-next-month">
          <Ionicons name="chevron-forward" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Legend */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, paddingBottom: 12 }}>
        {[
          { color: COLORS.departure, label: 'Départ' },
          { color: COLORS.return, label: 'Retour' },
          { color: COLORS.overdue, label: 'Retard' },
          { color: COLORS.success + '60', label: 'En cours' },
        ].map(item => (
          <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.color }} />
            <Text style={{ fontSize: 11, color: COLORS.textLight }}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Calendar Grid with nativeID for CSS targeting */}
      <View nativeID="cal-grid-container">
        {/* Weekday Headers */}
        {WEEKDAYS.map((day, i) => (
          <View key={day} nativeID={`weekday-${i}`}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.textLight }}>{day}</Text>
          </View>
        ))}
        {/* Day Cells */}
        {calendarDays.map(date => {
          const dayEvents = getEventsForDate(date);
          const hasDep = dayEvents.departures.length > 0;
          const hasRet = dayEvents.returns.length > 0;
          const hasOverdueE = dayEvents.returns.some(e => e.is_overdue) || dayEvents.ongoing.some(e => e.is_overdue);
          const hasOngoing = dayEvents.ongoing.length > 0;

          return (
            <View
              key={date.toISOString()}
              nativeID={`day-${format(date, 'yyyy-MM-dd')}`}
            >
              <TouchableOpacity
                onPress={() => setSelectedDate(date)}
                style={{ alignItems: 'center' }}
                data-testid={`calendar-day-${format(date, 'yyyy-MM-dd')}`}
              >
                <Text style={{
                  fontSize: 13,
                  fontWeight: isToday(date) ? '700' : '500',
                  color: isToday(date) ? COLORS.primary : COLORS.text,
                  marginBottom: 2,
                }}>
                  {format(date, 'd')}
                </Text>
                <View style={{ flexDirection: 'row', gap: 3, alignItems: 'center' }}>
                  {hasDep && (
                    <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.departure, justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={{ fontSize: 9, fontWeight: '700', color: 'white' }}>{dayEvents.departures.length}</Text>
                    </View>
                  )}
                  {hasRet && (
                    <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: hasOverdueE ? COLORS.overdue : COLORS.return, justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={{ fontSize: 9, fontWeight: '700', color: 'white' }}>{dayEvents.returns.length}</Text>
                    </View>
                  )}
                  {hasOngoing && !hasDep && !hasRet && (
                    <View style={{ width: 20, height: 4, borderRadius: 2, backgroundColor: COLORS.success + '60' }} />
                  )}
                </View>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      {/* Selected Day Details */}
      {selectedDate && (
        <View style={styles.dayDetails} data-testid="selected-day-details">
          <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 14, textTransform: 'capitalize' }}>
            {format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
          </Text>

          {selectedDateEvents.departures.length > 0 && (
            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Ionicons name="arrow-up-circle" size={18} color={COLORS.departure} />
                <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.departure }}>
                  Départs ({selectedDateEvents.departures.length})
                </Text>
              </View>
              {selectedDateEvents.departures.map(event => (
                <TouchableOpacity key={`dep-${event.id}`} style={styles.eventCard}
                  onPress={() => { setSelectedEvent(event); setShowDetailModal(true); }}>
                  <View style={[styles.eventCardBorder, { backgroundColor: COLORS.departure }]} />
                  <View style={{ flex: 1, padding: 10 }}>
                    <Text style={styles.eventVehicle}>{event.vehicle_name}</Text>
                    <Text style={styles.eventClient}>{event.user_name}</Text>
                    <Text style={styles.eventDates}>Retour: {format(new Date(event.end_date), 'dd MMM yyyy', { locale: fr })} ({event.total_days}j)</Text>
                  </View>
                  <View style={[styles.eventStatus, { backgroundColor: getStatusColor(event.status) + '20' }]}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: getStatusColor(event.status) }}>{getStatusLabel(event.status)}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {selectedDateEvents.returns.length > 0 && (
            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Ionicons name="arrow-down-circle" size={18} color={COLORS.return} />
                <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.return }}>Retours ({selectedDateEvents.returns.length})</Text>
              </View>
              {selectedDateEvents.returns.map(event => (
                <TouchableOpacity key={`ret-${event.id}`} style={[styles.eventCard, event.is_overdue && { backgroundColor: '#FEF2F2' }]}
                  onPress={() => { setSelectedEvent(event); setShowDetailModal(true); }}>
                  <View style={[styles.eventCardBorder, { backgroundColor: event.is_overdue ? COLORS.overdue : COLORS.return }]} />
                  <View style={{ flex: 1, padding: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.eventVehicle}>{event.vehicle_name}</Text>
                      {event.is_overdue && (
                        <View style={{ backgroundColor: COLORS.overdue, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: 'white' }}>+{event.days_overdue}j RETARD</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.eventClient}>{event.user_name}</Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.primary, marginRight: 12 }}>CHF {event.total_price.toFixed(0)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {selectedDateEvents.ongoing.length > 0 && (
            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Ionicons name="car" size={18} color={COLORS.success} />
                <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.success }}>En location ({selectedDateEvents.ongoing.length})</Text>
              </View>
              {selectedDateEvents.ongoing.map(event => (
                <TouchableOpacity key={`ong-${event.id}`} style={[styles.eventCard, event.is_overdue && { backgroundColor: '#FEF2F2' }]}
                  onPress={() => { setSelectedEvent(event); setShowDetailModal(true); }}>
                  <View style={[styles.eventCardBorder, { backgroundColor: event.is_overdue ? COLORS.overdue : COLORS.success }]} />
                  <View style={{ flex: 1, padding: 10 }}>
                    <Text style={styles.eventVehicle}>{event.vehicle_name}</Text>
                    <Text style={styles.eventClient}>{event.user_name}</Text>
                    <Text style={styles.eventDates}>
                      {format(new Date(event.start_date), 'dd/MM', { locale: fr })} - {format(new Date(event.end_date), 'dd/MM', { locale: fr })}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {selectedDateEvents.departures.length === 0 && selectedDateEvents.returns.length === 0 && selectedDateEvents.ongoing.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
              <Ionicons name="calendar-outline" size={32} color={COLORS.textLight} />
              <Text style={{ fontSize: 14, color: COLORS.textLight, marginTop: 8 }}>Aucune réservation ce jour</Text>
            </View>
          )}
        </View>
      )}

      <View style={{ height: 40 }} />

      {/* Event Detail Modal */}
      <Modal visible={showDetailModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowDetailModal(false)}>
        {selectedEvent && (
          <View style={{ flex: 1, backgroundColor: COLORS.background }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.text }}>Détail de la réservation</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1, padding: 20 }}>
              {selectedEvent.is_overdue && (
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.overdue, padding: 14, borderRadius: 12, gap: 10, marginBottom: 20 }}>
                  <Ionicons name="warning" size={20} color={COLORS.card} />
                  <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.card }}>RETARD DE {selectedEvent.days_overdue} JOUR{selectedEvent.days_overdue > 1 ? 'S' : ''} !</Text>
                </View>
              )}
              <View style={{ marginBottom: 18 }}>
                <Text style={styles.sectionTitle}>Véhicule</Text>
                <Text style={styles.sectionValue}>{selectedEvent.vehicle_name}</Text>
              </View>
              <View style={{ marginBottom: 18 }}>
                <Text style={styles.sectionTitle}>Client</Text>
                <Text style={styles.sectionValue}>{selectedEvent.user_name}</Text>
                <Text style={{ fontSize: 13, color: COLORS.textLight, marginTop: 2 }}>{selectedEvent.user_email}</Text>
                {selectedEvent.user_phone ? <Text style={{ fontSize: 13, color: COLORS.textLight, marginTop: 2 }}>{selectedEvent.user_phone}</Text> : null}
              </View>
              <View style={{ flexDirection: 'row', gap: 16, marginBottom: 18 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>Départ</Text>
                  <Text style={styles.sectionValue}>{format(new Date(selectedEvent.start_date), 'dd MMM yyyy', { locale: fr })}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>Retour</Text>
                  <Text style={[styles.sectionValue, selectedEvent.is_overdue && { color: COLORS.overdue }]}>
                    {format(new Date(selectedEvent.end_date), 'dd MMM yyyy', { locale: fr })}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 16, marginBottom: 18 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>Durée</Text>
                  <Text style={styles.sectionValue}>{selectedEvent.total_days} jours</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>Montant</Text>
                  <Text style={styles.sectionValue}>CHF {selectedEvent.total_price.toFixed(2)}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 16, marginBottom: 18 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>Statut</Text>
                  <View style={{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 4, backgroundColor: getStatusColor(selectedEvent.status) + '20' }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: getStatusColor(selectedEvent.status) }}>{getStatusLabel(selectedEvent.status)}</Text>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>Paiement</Text>
                  <Text style={styles.sectionValue}>
                    {selectedEvent.payment_status === 'paid' ? 'Payé' : selectedEvent.payment_status === 'pending' ? 'En attente' : 'Non payé'}
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
  overdueAlert: { backgroundColor: COLORS.overdue, borderRadius: 14, padding: 16, marginBottom: 12 },
  overdueItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: 12, marginTop: 6 },
  navButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.card, justifyContent: 'center', alignItems: 'center' },
  dayDetails: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginTop: 8 },
  eventCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, borderRadius: 10, marginBottom: 6, overflow: 'hidden' },
  eventCardBorder: { width: 4, alignSelf: 'stretch' },
  eventVehicle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  eventClient: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  eventDates: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  eventStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginRight: 10 },
  sectionTitle: { fontSize: 12, fontWeight: '600', color: COLORS.textLight, textTransform: 'uppercase', marginBottom: 4 },
  sectionValue: { fontSize: 16, fontWeight: '600', color: COLORS.text },
});
