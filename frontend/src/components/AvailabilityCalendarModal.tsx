import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Modal, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/axios';

const ACCENT = '#7C3AED';
const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS_FR = ['Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'];

interface Reservation {
  start_date: string;
  end_date: string;
  status: string;
}

interface Props {
  visible: boolean;
  vehicleId: string;
  vehicleName: string;
  onClose: () => void;
  onSelectDate: (date: string) => void;
  colors: any;
}

export default function AvailabilityCalendarModal({ visible, vehicleId, vehicleName, onClose, onSelectDate, colors: C }: Props) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [bookedDates, setBookedDates] = useState<Set<string>>(new Set());
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const fetchAvailability = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/vehicles/${vehicleId}/availability?month=${month + 1}&year=${year}`);
      setBookedDates(new Set(res.data.booked_dates || []));
      setReservations(res.data.reservations || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [vehicleId, month, year]);

  useEffect(() => { if (visible) fetchAvailability(); }, [visible, fetchAvailability]);

  const goMonth = (dir: number) => {
    let m = month + dir;
    let y = year;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setMonth(m); setYear(y); setSelectedDay(null);
  };

  // Build calendar grid
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  // Monday=0 ... Sunday=6
  let startWeekday = firstDay.getDay() - 1;
  if (startWeekday < 0) startWeekday = 6;

  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const getDayStr = (d: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const isBooked = (d: number) => bookedDates.has(getDayStr(d));
  const isPast = (d: number) => getDayStr(d) < todayStr;
  const isToday = (d: number) => getDayStr(d) === todayStr;

  // Get reservations for a specific day
  const getReservationsForDay = (d: number): Reservation[] => {
    const dayStr = getDayStr(d);
    return reservations.filter(r => {
      const start = r.start_date.substring(0, 10);
      const end = r.end_date.substring(0, 10);
      return dayStr >= start && dayStr <= end;
    });
  };

  const formatTime = (isoStr: string) => {
    const d = new Date(isoStr);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const statusLabel: Record<string, string> = {
    confirmed: 'Confirmee', active: 'En cours', pending: 'En attente', pending_cash: 'Especes',
  };

  const statusColor: Record<string, string> = {
    confirmed: '#10B981', active: '#3B82F6', pending: '#FBBF24', pending_cash: '#A855F7',
  };

  // Can select: not past, not booked
  const canSelect = (d: number) => !isPast(d) && !isBooked(d);

  const handleDayPress = (d: number) => {
    const dayStr = getDayStr(d);
    if (canSelect(d)) {
      setSelectedDay(dayStr);
    } else if (isBooked(d)) {
      setSelectedDay(dayStr);
    }
  };

  const handleConfirm = () => {
    if (selectedDay && !bookedDates.has(selectedDay)) {
      onSelectDate(selectedDay);
      onClose();
    }
  };

  // Count available days this month (not past, not booked)
  let availableCount = 0;
  let bookedCount = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    if (isBooked(d)) bookedCount++;
    else if (!isPast(d)) availableCount++;
  }

  const selectedDayNum = selectedDay ? parseInt(selectedDay.split('-')[2]) : null;
  const selectedDayReservations = selectedDayNum && isBooked(selectedDayNum) ? getReservationsForDay(selectedDayNum) : [];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
        <View style={{ width: '100%', maxWidth: 480, borderRadius: 20, backgroundColor: C.card, overflow: 'hidden', maxHeight: '90%' }} data-testid="availability-calendar-modal">
          {/* Header */}
          <View style={{ backgroundColor: ACCENT, padding: 20, paddingBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>Disponibilite</Text>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 }} numberOfLines={1}>{vehicleName}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }} data-testid="close-availability">
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            {/* Stats */}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#34D399' }} />
                <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600' }}>{availableCount} disponible{availableCount > 1 ? 's' : ''}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#F87171' }} />
                <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600' }}>{bookedCount} reserve{bookedCount > 1 ? 's' : ''}</Text>
              </View>
            </View>
          </View>

          <ScrollView style={{ padding: 16 }} contentContainerStyle={{ paddingBottom: 20 }}>
            {/* Month Navigation */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <TouchableOpacity onPress={() => goMonth(-1)} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' }} data-testid="cal-prev-month">
                <Ionicons name="chevron-back" size={18} color={C.text} />
              </TouchableOpacity>
              <Text style={{ fontSize: 16, fontWeight: '800', color: C.text, textTransform: 'capitalize' }}>
                {MONTHS_FR[month]} {year}
              </Text>
              <TouchableOpacity onPress={() => goMonth(1)} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' }} data-testid="cal-next-month">
                <Ionicons name="chevron-forward" size={18} color={C.text} />
              </TouchableOpacity>
            </View>

            {loading && <ActivityIndicator color={ACCENT} style={{ marginVertical: 20 }} />}

            {!loading && (
              <>
                {/* Day headers */}
                <View style={{ flexDirection: 'row' }}>
                  {DAYS_FR.map(d => (
                    <View key={d} style={{ flex: 1, alignItems: 'center', paddingVertical: 6 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: C.textLight, textTransform: 'uppercase' }}>{d}</Text>
                    </View>
                  ))}
                </View>

                {/* Calendar grid */}
                {Array.from({ length: cells.length / 7 }, (_, week) => (
                  <View key={week} style={{ flexDirection: 'row' }}>
                    {cells.slice(week * 7, week * 7 + 7).map((day, idx) => {
                      if (day === null) return <View key={`e-${idx}`} style={{ flex: 1, height: 44 }} />;
                      const booked = isBooked(day);
                      const past = isPast(day);
                      const today = isToday(day);
                      const selected = selectedDay === getDayStr(day);
                      const selectable = canSelect(day);

                      let bgColor = 'transparent';
                      let textColor = C.text;
                      let borderColor = 'transparent';

                      if (past && !booked) {
                        textColor = C.textLight + '40';
                      } else if (booked) {
                        bgColor = '#FEE2E2';
                        textColor = '#DC2626';
                      } else if (selectable) {
                        bgColor = '#ECFDF5';
                        textColor = '#059669';
                      }

                      if (selected && selectable) {
                        bgColor = ACCENT;
                        textColor = '#fff';
                        borderColor = ACCENT;
                      } else if (selected && booked) {
                        borderColor = '#DC2626';
                      }

                      if (today && !selected) {
                        borderColor = ACCENT;
                      }

                      return (
                        <TouchableOpacity
                          key={day}
                          onPress={() => handleDayPress(day)}
                          style={{
                            flex: 1, height: 44, justifyContent: 'center', alignItems: 'center',
                            borderRadius: 10, margin: 1.5,
                            backgroundColor: bgColor,
                            borderWidth: today || selected ? 2 : 0,
                            borderColor,
                          }}
                          disabled={past && !booked}
                          data-testid={`cal-day-${day}`}
                        >
                          <Text style={{ fontSize: 14, fontWeight: today || selected ? '800' : '600', color: textColor }}>{day}</Text>
                          {booked && (
                            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#EF4444', marginTop: 1 }} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}

                {/* Legend */}
                <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.border }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <View style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0' }} />
                    <Text style={{ fontSize: 11, color: C.textLight }}>Disponible</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <View style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FECACA' }} />
                    <Text style={{ fontSize: 11, color: C.textLight }}>Reserve</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <View style={{ width: 14, height: 14, borderRadius: 4, borderWidth: 2, borderColor: ACCENT }} />
                    <Text style={{ fontSize: 11, color: C.textLight }}>Aujourd'hui</Text>
                  </View>
                </View>

                {/* Selected day detail */}
                {selectedDay && selectedDayNum && isBooked(selectedDayNum) && selectedDayReservations.length > 0 && (
                  <View style={{ marginTop: 14, padding: 12, borderRadius: 12, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <Ionicons name="calendar" size={14} color="#DC2626" />
                      <Text style={{ color: '#991B1B', fontSize: 13, fontWeight: '700' }}>
                        {selectedDayNum} {MONTHS_FR[month]} - Reservations
                      </Text>
                    </View>
                    {selectedDayReservations.map((r, i) => (
                      <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderTopWidth: i > 0 ? 0.5 : 0, borderTopColor: '#FECACA' }}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: statusColor[r.status] || '#6B7280' }} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#991B1B' }}>
                            {formatTime(r.start_date)} - {formatTime(r.end_date)}
                          </Text>
                          <Text style={{ fontSize: 10, color: '#B91C1C' }}>{statusLabel[r.status] || r.status}</Text>
                        </View>
                        <View style={{ backgroundColor: (statusColor[r.status] || '#6B7280') + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: statusColor[r.status] || '#6B7280' }}>
                            {new Date(r.start_date).toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit' })} - {new Date(r.end_date).toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit' })}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Selected available day → confirm */}
                {selectedDay && selectedDayNum && canSelect(selectedDayNum) && (
                  <View style={{ marginTop: 14, padding: 12, borderRadius: 12, backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <Ionicons name="checkmark-circle" size={16} color="#059669" />
                      <Text style={{ color: '#065F46', fontSize: 13, fontWeight: '700' }}>
                        {selectedDayNum} {MONTHS_FR[month]} - Disponible
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={handleConfirm}
                      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: ACCENT, paddingVertical: 12, borderRadius: 10, marginTop: 4 }}
                      data-testid="confirm-date-btn"
                    >
                      <Ionicons name="arrow-forward" size={16} color="#fff" />
                      <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>Reserver cette date</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
