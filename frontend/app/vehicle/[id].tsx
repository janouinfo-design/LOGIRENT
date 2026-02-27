import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, isToday, addMonths, subMonths, isBefore, startOfDay, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import axios from 'axios';
import { useVehicleStore } from '../../src/store/vehicleStore';
import { useAuthStore } from '../../src/store/authStore';
import Button from '../../src/components/Button';
import { useThemeStore } from '../../src/store/themeStore';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const _C = {
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
  booked: '#FEE2E2',
  bookedText: '#EF4444',
};

const WEEKDAYS = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];
const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

export default function VehicleDetailScreen() {
  const { colors: C } = useThemeStore();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { selectedVehicle, fetchVehicle, isLoading } = useVehicleStore();
  const { isAuthenticated } = useAuthStore();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [calMonth, setCalMonth] = useState(new Date());
  const [bookedDates, setBookedDates] = useState<string[]>([]);
  const [loadingCal, setLoadingCal] = useState(false);

  useEffect(() => { if (id) fetchVehicle(id); }, [id]);

  useEffect(() => {
    if (id) fetchAvailability();
  }, [id, calMonth]);

  const fetchAvailability = async () => {
    setLoadingCal(true);
    try {
      const m = calMonth.getMonth() + 1;
      const y = calMonth.getFullYear();
      const res = await axios.get(`${API_URL}/api/vehicles/${id}/availability?month=${m}&year=${y}`);
      setBookedDates(res.data.booked_dates || []);
    } catch (e) { console.error(e); }
    setLoadingCal(false);
  };

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(calMonth);
    const monthEnd = endOfMonth(calMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days: Date[] = [];
    let day = calStart;
    while (day <= calEnd) { days.push(day); day = addDays(day, 1); }
    return days;
  }, [calMonth]);

  const isBooked = (date: Date) => bookedDates.includes(format(date, 'yyyy-MM-dd'));

  const handleBookNow = () => {
    if (!isAuthenticated) {
      Alert.alert('Connexion requise', 'Veuillez vous connecter pour réserver', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Se connecter', onPress: () => router.push('/(auth)/login') },
      ]);
      return;
    }
    router.push(`/booking/${id}`);
  };

  if (isLoading || !selectedVehicle) {
    return <View style={s.loading}><Text style={s.loadingText}>Chargement...</Text></View>;
  }

  const v = selectedVehicle;
  const transLabel = v.transmission === 'automatic' ? 'Automatique' : 'Manuel';
  const fuelIcon = v.fuel_type?.toLowerCase() === 'electric' ? 'flash' : v.fuel_type?.toLowerCase() === 'hybrid' ? 'leaf' : 'water';

  return (
    <View style={[s.container, { backgroundColor: C.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image */}
        <View style={s.imgBox}>
          {v.photos.length > 0 ? (
            <Image source={{ uri: v.photos[currentImageIndex] }} style={s.img} resizeMode="cover" />
          ) : (
            <View style={s.imgPlaceholder}><Ionicons name="car" size={56} color={C.gray} /></View>
          )}
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()} data-testid="back-btn">
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>
          {v.photos.length > 1 && (
            <View style={s.dots}>
              {v.photos.map((_, i) => (
                <TouchableOpacity key={i} style={[s.dot, currentImageIndex === i && s.dotActive]} onPress={() => setCurrentImageIndex(i)} />
              ))}
            </View>
          )}
        </View>

        <View style={s.content}>
          {/* Header */}
          <View style={[s.header, { backgroundColor: C.bg }]}>
            <View style={{ flex: 1 }}>
              <Text style={[s.title, { color: C.text }]}>{v.brand} {v.model}</Text>
              <Text style={s.year}>{v.year}</Text>
            </View>
            <View style={s.typeBadge}><Text style={s.typeText}>{v.type}</Text></View>
          </View>

          {v.location && (
            <View style={s.locRow}>
              <Ionicons name="location" size={16} color={C.purple} />
              <Text style={s.locText}>{v.location}</Text>
            </View>
          )}

          {v.description && (
            <View style={s.section}>
              <Text style={[s.sectionTitle, { color: C.text }]}>Description</Text>
              <Text style={[s.desc, { color: C.textLight }]}>{v.description}</Text>
            </View>
          )}

          {/* Specs */}
          <View style={s.section}>
            <Text style={[s.sectionTitle, { color: C.text }]}>Caractéristiques</Text>
            <View style={s.specsRow}>
              <View style={s.spec}><Ionicons name="people" size={18} color={C.purple} /><Text style={s.specVal}>{v.seats}</Text><Text style={s.specLbl}>Places</Text></View>
              <View style={s.spec}><Ionicons name="cog" size={18} color={C.purple} /><Text style={s.specVal}>{transLabel}</Text><Text style={s.specLbl}>Transmission</Text></View>
              <View style={s.spec}><Ionicons name={fuelIcon as any} size={18} color={C.purple} /><Text style={s.specVal}>{v.fuel_type}</Text><Text style={s.specLbl}>Carburant</Text></View>
            </View>
          </View>

          {/* Availability Calendar */}
          <View style={s.section}>
            <Text style={[s.sectionTitle, { color: C.text }]}>Disponibilité</Text>
            <View style={s.calCard}>
              {/* Month Nav */}
              <View style={s.calNav}>
                <TouchableOpacity onPress={() => setCalMonth(subMonths(calMonth, 1))} data-testid="cal-prev">
                  <Ionicons name="chevron-back" size={20} color={C.dark} />
                </TouchableOpacity>
                <Text style={s.calMonthLabel}>{MONTHS_FR[calMonth.getMonth()]} {calMonth.getFullYear()}</Text>
                <TouchableOpacity onPress={() => setCalMonth(addMonths(calMonth, 1))} data-testid="cal-next">
                  <Ionicons name="chevron-forward" size={20} color={C.dark} />
                </TouchableOpacity>
              </View>

              {/* Weekdays */}
              <View style={s.calWeekRow}>
                {WEEKDAYS.map(d => <Text key={d} style={s.calWeekLabel}>{d}</Text>)}
              </View>

              {/* Days */}
              <View style={s.calDaysGrid}>
                {calendarDays.map((day, i) => {
                  const inMonth = isSameMonth(day, calMonth);
                  const booked = isBooked(day);
                  const past = isBefore(day, startOfDay(new Date()));
                  const todayMark = isToday(day);
                  return (
                    <View key={i} style={[
                      s.calDay,
                      booked && s.calDayBooked,
                      todayMark && !booked && s.calDayToday,
                    ]}>
                      <Text style={[
                        s.calDayText,
                        !inMonth && { color: '#D1D5DB' },
                        past && !booked && { color: '#D1D5DB' },
                        booked && s.calDayTextBooked,
                        todayMark && !booked && s.calDayTextToday,
                      ]}>{day.getDate()}</Text>
                      {booked && <View style={s.calDayLine} />}
                    </View>
                  );
                })}
              </View>

              {/* Legend */}
              <View style={s.calLegend}>
                <View style={s.calLegendItem}>
                  <View style={[s.calLegendDot, { backgroundColor: C.success }]} />
                  <Text style={s.calLegendText}>Disponible</Text>
                </View>
                <View style={s.calLegendItem}>
                  <View style={[s.calLegendDot, { backgroundColor: C.bookedText }]} />
                  <Text style={s.calLegendText}>Réservé</Text>
                </View>
                <View style={s.calLegendItem}>
                  <View style={[s.calLegendDot, { backgroundColor: C.purple, borderWidth: 2, borderColor: C.purple, width: 10, height: 10 }]} />
                  <Text style={s.calLegendText}>Aujourd'hui</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Options */}
          {v.options.length > 0 && (
            <View style={s.section}>
              <Text style={[s.sectionTitle, { color: C.text }]}>Options disponibles</Text>
              {v.options.map((opt, i) => (
                <View key={i} style={s.optionItem}>
                  <View style={s.optionLeft}><Ionicons name="add-circle" size={18} color={C.purple} /><Text style={s.optionName}>{opt.name}</Text></View>
                  <Text style={s.optionPrice}>+CHF {opt.price_per_day}/jour</Text>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Bottom Bar */}
      <View style={s.bottomBar}>
        <View>
          <Text style={s.priceLbl}>Prix par jour</Text>
          <Text style={[s.price, { color: C.accent }]}>CHF {v.price_per_day}</Text>
        </View>
        <Button title="Réserver" onPress={handleBookNow} style={s.bookBtn} data-testid="book-now-btn" />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: {, fontSize: 14 },
  imgBox: { height: 280 },
  img: { width: '100%', height: '100%' },
  imgPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backBtn: { position: 'absolute', top: 16, left: 16, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  dots: { position: 'absolute', bottom: 14, alignSelf: 'center', flexDirection: 'row', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: '#FFF', width: 20 },
  content: { padding: 20, maxWidth: 800, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 24, fontWeight: '800' },
  year: { fontSize: 15, marginTop: 2 },
  typeBadge: {, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  typeText: { color: '#FFF', fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  locRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 4 },
  locText: { fontSize: 14 },
  section: { marginTop: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  desc: { fontSize: 14, lineHeight: 22 },
  specsRow: { flexDirection: 'row', gap: 12 },
  spec: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1 },
  specVal: { fontSize: 13, fontWeight: '600', marginTop: 6, textTransform: 'capitalize' },
  specLbl: { fontSize: 11, marginTop: 2 },
  // Calendar
  calCard: {, borderRadius: 14, padding: 16, borderWidth: 1 },
  calNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  calMonthLabel: { fontSize: 15, fontWeight: '700' },
  calWeekRow: { flexDirection: 'row', marginBottom: 4 },
  calWeekLabel: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', paddingVertical: 4 },
  calDaysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calDay: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 20 },
  calDayBooked: {, borderRadius: 8 },
  calDayToday: { borderWidth: 2 },
  calDayText: { fontSize: 13 },
  calDayTextBooked: {, fontWeight: '600', textDecorationLine: 'line-through' },
  calDayTextToday: {, fontWeight: '700' },
  calDayLine: { position: 'absolute', top: '50%', left: '20%', right: '20%', height: 1 },
  calLegend: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  calLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  calLegendDot: { width: 8, height: 8, borderRadius: 4 },
  calLegendText: { fontSize: 11 },
  // Options
  optionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 8, borderWidth: 1 },
  optionLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  optionName: { fontSize: 14 },
  optionPrice: { fontSize: 13, fontWeight: '600' },
  // Bottom bar
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingBottom: 28, borderTopWidth: 1 },
  priceLbl: { fontSize: 11 },
  price: { fontSize: 22, fontWeight: '800' },
  bookBtn: { paddingHorizontal: 36 },
});
