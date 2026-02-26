import React, { useMemo, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, isToday, addMonths, subMonths, isBefore, startOfDay, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const C = {
  purple: '#7C3AED',
  purpleDark: '#5B21B6',
  purpleLight: '#EDE9FE',
  dark: '#1A1A2E',
  gray: '#6B7280',
  grayLight: '#F3F4F6',
  border: '#E5E7EB',
  card: '#FFFFFF',
  booked: '#EF4444',
  bookedLight: '#FEE2E2',
  free: '#10B981',
  freeLight: '#D1FAE5',
};

const WEEKDAYS = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];
const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

interface MiniCalendarProps {
  visible: boolean;
  onClose: () => void;
  onSelectDate: (date: Date) => void;
  selectedDate: Date;
  minDate?: Date;
  title?: string;
  vehicleId?: string;
}

export default function MiniCalendar({ visible, onClose, onSelectDate, selectedDate, minDate, title = 'Sélectionner une date', vehicleId }: MiniCalendarProps) {
  const [calendarMonth, setCalendarMonth] = React.useState(selectedDate || new Date());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [bookedDates, setBookedDates] = useState<Set<string>>(new Set());
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  const today = startOfDay(new Date());
  const effectiveMinDate = minDate ? startOfDay(minDate) : today;

  // Fetch availability when month changes or modal opens
  useEffect(() => {
    if (visible && vehicleId) {
      fetchAvailability(calendarMonth.getMonth() + 1, calendarMonth.getFullYear());
    }
  }, [visible, vehicleId, calendarMonth]);

  const fetchAvailability = async (month: number, year: number) => {
    if (!vehicleId) return;
    try {
      setLoadingAvailability(true);
      const res = await axios.get(`${API_URL}/api/vehicles/${vehicleId}/availability?month=${month}&year=${year}`);
      setBookedDates(new Set(res.data.booked_dates));
    } catch {
      // silent fail
    } finally {
      setLoadingAvailability(false);
    }
  };

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(calendarMonth);
    const monthEnd = endOfMonth(calendarMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days: Date[] = [];
    let day = calStart;
    while (day <= calEnd) { days.push(day); day = addDays(day, 1); }
    return days;
  }, [calendarMonth]);

  const handleSelect = (date: Date) => {
    if (isBefore(date, effectiveMinDate)) return;
    const dateStr = format(date, 'yyyy-MM-dd');
    if (bookedDates.has(dateStr)) return; // Can't select booked dates
    onSelectDate(date);
    onClose();
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear + i);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={s.popup} onPress={e => e.stopPropagation()}>
          {/* Title */}
          <Text style={s.title}>{title}</Text>

          {/* Legend */}
          {vehicleId && (
            <View style={s.legend}>
              <View style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: C.booked }]} />
                <Text style={s.legendText}>Occupé</Text>
              </View>
              <View style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: C.free }]} />
                <Text style={s.legendText}>Libre</Text>
              </View>
              <View style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: '#D1D5DB' }]} />
                <Text style={s.legendText}>Passé</Text>
              </View>
            </View>
          )}

          {/* Month/Year Selectors */}
          {showMonthPicker ? (
            <View style={s.pickerGrid}>
              {MONTHS_FR.map((m, i) => (
                <TouchableOpacity key={m} style={[s.pickerItem, calendarMonth.getMonth() === i && s.pickerItemActive]}
                  onPress={() => { setCalendarMonth(new Date(calendarMonth.getFullYear(), i, 1)); setShowMonthPicker(false); }}>
                  <Text style={[s.pickerText, calendarMonth.getMonth() === i && s.pickerTextActive]}>{m.slice(0, 3)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : showYearPicker ? (
            <View style={s.pickerGrid}>
              {years.map(y => (
                <TouchableOpacity key={y} style={[s.pickerItem, calendarMonth.getFullYear() === y && s.pickerItemActive]}
                  onPress={() => { setCalendarMonth(new Date(y, calendarMonth.getMonth(), 1)); setShowYearPicker(false); }}>
                  <Text style={[s.pickerText, calendarMonth.getFullYear() === y && s.pickerTextActive]}>{y}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <>
              {/* Nav Header */}
              <View style={s.navRow}>
                <TouchableOpacity onPress={() => setCalendarMonth(subMonths(calendarMonth, 1))}>
                  <Ionicons name="chevron-back" size={20} color={C.dark} />
                </TouchableOpacity>
                <View style={s.navCenter}>
                  <TouchableOpacity style={s.navBtn} onPress={() => setShowMonthPicker(true)}>
                    <Text style={s.navBtnText}>{MONTHS_FR[calendarMonth.getMonth()]}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.navBtn} onPress={() => setShowYearPicker(true)}>
                    <Text style={s.navBtnText}>{calendarMonth.getFullYear()}</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => setCalendarMonth(addMonths(calendarMonth, 1))}>
                  <Ionicons name="chevron-forward" size={20} color={C.dark} />
                </TouchableOpacity>
              </View>

              {/* Loading */}
              {loadingAvailability && (
                <ActivityIndicator size="small" color={C.purple} style={{ marginBottom: 6 }} />
              )}

              {/* Weekday headers */}
              <View style={s.weekRow}>
                {WEEKDAYS.map(d => <Text key={d} style={s.weekLabel}>{d}</Text>)}
              </View>

              {/* Days grid */}
              <View style={s.daysGrid}>
                {calendarDays.map((day, i) => {
                  const inMonth = isSameMonth(day, calendarMonth);
                  const selected = isSameDay(day, selectedDate);
                  const disabled = isBefore(day, effectiveMinDate);
                  const todayMark = isToday(day);
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const isBooked = vehicleId ? bookedDates.has(dateStr) : false;
                  const isFree = vehicleId && inMonth && !disabled && !isBooked;

                  return (
                    <TouchableOpacity
                      key={i}
                      style={[
                        s.dayCell,
                        selected && s.dayCellSelected,
                        todayMark && !selected && s.dayCellToday,
                        isBooked && inMonth && s.dayCellBooked,
                        isFree && !selected && s.dayCellFree,
                      ]}
                      onPress={() => !disabled && !isBooked && handleSelect(day)}
                      disabled={disabled || isBooked}
                    >
                      <Text style={[
                        s.dayText,
                        !inMonth && s.dayTextOther,
                        disabled && s.dayTextDisabled,
                        selected && s.dayTextSelected,
                        todayMark && !selected && s.dayTextToday,
                        isBooked && inMonth && s.dayTextBooked,
                        isFree && !selected && s.dayTextFree,
                      ]}>{day.getDate()}</Text>
                      {isBooked && inMonth && (
                        <View style={s.bookedBar} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  popup: { backgroundColor: C.card, borderRadius: 16, padding: 20, width: 340, maxWidth: '92%' },
  title: { fontSize: 15, fontWeight: '700', color: C.dark, textAlign: 'center', marginBottom: 8 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: C.gray },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  navCenter: { flexDirection: 'row', gap: 6 },
  navBtn: { backgroundColor: C.grayLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  navBtnText: { fontSize: 13, fontWeight: '600', color: C.dark },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekLabel: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', color: C.gray, paddingVertical: 4 },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 20 },
  dayCellSelected: { backgroundColor: C.purple },
  dayCellToday: { borderWidth: 1, borderColor: C.purple },
  dayCellBooked: { backgroundColor: C.bookedLight, borderRadius: 20 },
  dayCellFree: { backgroundColor: C.freeLight, borderRadius: 20 },
  dayText: { fontSize: 13, color: C.dark },
  dayTextOther: { color: '#D1D5DB' },
  dayTextDisabled: { color: '#E5E7EB' },
  dayTextSelected: { color: '#FFF', fontWeight: '700' },
  dayTextToday: { color: C.purple, fontWeight: '600' },
  dayTextBooked: { color: C.booked, fontWeight: '600' },
  dayTextFree: { color: C.free, fontWeight: '600' },
  bookedBar: { position: 'absolute', bottom: 3, width: 12, height: 2, borderRadius: 1, backgroundColor: C.booked },
  pickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', paddingVertical: 8 },
  pickerItem: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: C.grayLight },
  pickerItemActive: { backgroundColor: C.purple },
  pickerText: { fontSize: 13, fontWeight: '500', color: C.dark },
  pickerTextActive: { color: '#FFF', fontWeight: '700' },
});
