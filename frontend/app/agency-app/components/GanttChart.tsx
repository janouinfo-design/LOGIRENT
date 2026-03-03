import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, RefreshControl, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, eachDayOfInterval, endOfMonth, parseISO, differenceInDays, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';

const RES_COLORS: Record<string, string> = {
  confirmed: '#10B981', active: '#3B82F6', pending: '#FBBF24', pending_cash: '#A855F7',
  completed: '#6B7280', cancelled: '#EF4444',
};

const statusLabel = (s: string) => {
  const map: Record<string, string> = { pending: 'En attente', pending_cash: 'Especes', confirmed: 'Confirmee', active: 'Active', completed: 'Terminee', cancelled: 'Annulee' };
  return map[s] || s;
};

interface VehicleSchedule {
  id: string; brand: string; model: string; price_per_day: number;
  reservations: { id: string; start: string; end: string; status: string; user_name?: string }[];
}

interface GanttChartProps {
  C: any;
  schedule: VehicleSchedule[];
  planningMonth: Date;
  scheduleLoading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  vehicleSearch: string;
  setVehicleSearch: (v: string) => void;
  showAllVehicles: boolean;
  setShowAllVehicles: (v: boolean) => void;
  highlightId: string | null;
  highlightAnim: Animated.Value;
  updateStatus: (id: string, status: string) => void;
}

const CELL_W = 32;
const LABEL_W = 120;
const ROW_H = 40;

export const GanttChart = ({
  C, schedule, planningMonth, scheduleLoading, refreshing, onRefresh,
  vehicleSearch, setVehicleSearch, showAllVehicles, setShowAllVehicles,
  highlightId, highlightAnim, updateStatus,
}: GanttChartProps) => {
  const monthDays = useMemo(() => eachDayOfInterval({ start: planningMonth, end: endOfMonth(planningMonth) }), [planningMonth]);
  const today = new Date();

  if (scheduleLoading) return <ActivityIndicator size="large" color={C.accent} style={{ marginTop: 40 }} />;

  return (
    <>
      {/* Vehicle search + toggle */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 8, marginBottom: 8 }}>
        <View style={[st.searchBar, { flex: 1, margin: 0, backgroundColor: C.card, borderColor: C.border }]}>
          <Ionicons name="search" size={16} color={C.textLight} />
          <TextInput style={[st.searchInput, { color: C.text, paddingVertical: 6 }]} placeholder="Filtrer vehicule..." placeholderTextColor={C.textLight} value={vehicleSearch} onChangeText={setVehicleSearch} data-testid="vehicle-search-planning" />
        </View>
        <TouchableOpacity onPress={() => setShowAllVehicles(!showAllVehicles)} style={[st.filterTab, { backgroundColor: showAllVehicles ? C.accent + '20' : C.card, borderColor: showAllVehicles ? C.accent : C.border }]} data-testid="toggle-all-vehicles">
          <Ionicons name={showAllVehicles ? 'eye' : 'eye-off'} size={14} color={showAllVehicles ? C.accent : C.textLight} />
          <Text style={{ color: showAllVehicles ? C.accent : C.textLight, fontSize: 11, fontWeight: '600' }}>{showAllVehicles ? 'Tous' : 'Avec res.'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}>
        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
          <View>
            {/* Header row: days */}
            <View style={{ flexDirection: 'row' }}>
              <View style={[st.labelCell, { width: LABEL_W, backgroundColor: C.card, borderColor: C.border }]}>
                <Text style={{ color: C.textLight, fontSize: 11, fontWeight: '700' }}>Vehicule</Text>
              </View>
              {monthDays.map((day, i) => {
                const isToday = isSameDay(day, today);
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                return (
                  <View key={i} style={[st.dayHeaderCell, { width: CELL_W, backgroundColor: isToday ? C.accent + '20' : isWeekend ? C.card : C.bg, borderColor: C.border }]}>
                    <Text style={{ color: isToday ? C.accent : C.textLight, fontSize: 8, fontWeight: '600' }}>{format(day, 'EEE', { locale: fr }).slice(0, 2)}</Text>
                    <Text style={{ color: isToday ? C.accent : C.text, fontSize: 12, fontWeight: isToday ? '800' : '600' }}>{format(day, 'd')}</Text>
                  </View>
                );
              })}
            </View>

            {/* Vehicle rows */}
            {schedule
              .filter(v => showAllVehicles || v.reservations.length > 0)
              .filter(v => !vehicleSearch || `${v.brand} ${v.model}`.toLowerCase().includes(vehicleSearch.toLowerCase()))
              .map((vehicle, vi) => (
              <View key={vehicle.id} style={{ flexDirection: 'row' }}>
                <View style={[st.labelCell, { width: LABEL_W, backgroundColor: vi % 2 === 0 ? C.card : C.bg, borderColor: C.border, height: ROW_H }]}>
                  <Text style={{ color: C.text, fontSize: 11, fontWeight: '700' }} numberOfLines={1}>{vehicle.brand} {vehicle.model}</Text>
                  <Text style={{ color: C.textLight, fontSize: 9 }}>CHF {vehicle.price_per_day}/j</Text>
                </View>

                {monthDays.map((day, di) => {
                  const dayTs = day.getTime();
                  const isToday = isSameDay(day, today);
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                  let resForDay: typeof vehicle.reservations[0] | null = null;
                  let isStart = false;
                  let isEnd = false;

                  for (const r of vehicle.reservations) {
                    try {
                      const rs = parseISO(r.start);
                      const re = parseISO(r.end);
                      if (dayTs >= rs.getTime() && dayTs < re.getTime()) {
                        resForDay = r;
                        isStart = isSameDay(day, rs);
                        isEnd = isSameDay(day, new Date(re.getTime() - 86400000));
                        break;
                      }
                    } catch {}
                  }

                  const color = resForDay ? (RES_COLORS[resForDay.status] || C.textLight) : 'transparent';

                  return (
                    <View key={di} style={[st.dayCell, {
                      width: CELL_W,
                      backgroundColor: isToday ? C.accent + '08' : isWeekend ? C.card + '60' : vi % 2 === 0 ? C.card + '30' : 'transparent',
                      borderColor: C.border, height: ROW_H,
                    }]}>
                      {resForDay && (
                        <Animated.View style={{
                          position: 'absolute', top: 3, bottom: 3, left: isStart ? 2 : 0, right: isEnd ? 2 : 0,
                          backgroundColor: color,
                          borderTopLeftRadius: isStart ? 6 : 0, borderBottomLeftRadius: isStart ? 6 : 0,
                          borderTopRightRadius: isEnd ? 6 : 0, borderBottomRightRadius: isEnd ? 6 : 0,
                          justifyContent: 'center', overflow: 'hidden',
                          ...(highlightId && resForDay.id === highlightId ? { opacity: highlightAnim, borderWidth: 2, borderColor: '#fff' } : {}),
                        }}>
                          {isStart && (
                            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900', paddingLeft: 4, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }} numberOfLines={1}>
                              {statusLabel(resForDay.status)}
                            </Text>
                          )}
                        </Animated.View>
                      )}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Planning cards below the Gantt */}
        <View style={{ padding: 16, paddingTop: 12 }}>
          <Text style={{ color: C.text, fontSize: 14, fontWeight: '800', marginBottom: 10 }}>
            Reservations du mois ({schedule.reduce((sum, v) => sum + v.reservations.length, 0)})
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {schedule.map(v => v.reservations.map(r => {
              const color = RES_COLORS[r.status] || C.textLight;
              const isHighlighted = highlightId === r.id;
              return (
                <Animated.View key={r.id} style={{
                  width: '23.5%', backgroundColor: C.card, borderRadius: 10,
                  borderWidth: isHighlighted ? 2 : 1, borderColor: isHighlighted ? '#fff' : C.border,
                  borderLeftWidth: 3, borderLeftColor: color, padding: 8,
                  ...(isHighlighted ? { opacity: highlightAnim } : {}),
                }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                    <Text style={{ color: C.text, fontSize: 11, fontWeight: '800', flex: 1 }} numberOfLines={1}>{v.brand} {v.model}</Text>
                    <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, backgroundColor: color + '25' }}>
                      <Text style={{ color, fontSize: 11, fontWeight: '800' }}>{statusLabel(r.status)}</Text>
                    </View>
                  </View>
                  <Text style={{ color: C.textLight, fontSize: 10 }}>{r.start?.slice(5, 10)} -> {r.end?.slice(5, 10)}</Text>
                  {r.user_name ? <Text style={{ color: C.textLight, fontSize: 10 }} numberOfLines={1}>{r.user_name}</Text> : null}
                  <View style={{ flexDirection: 'row', gap: 3, marginTop: 5, flexWrap: 'wrap' }}>
                    {['confirmed', 'active', 'completed', 'cancelled'].map(s => (
                      <TouchableOpacity key={s} onPress={() => updateStatus(r.id, s)}
                        style={{
                          paddingHorizontal: 4, paddingVertical: 2, borderRadius: 3,
                          backgroundColor: r.status === s ? (RES_COLORS[s] || C.textLight) + '30' : 'transparent',
                          borderWidth: 1, borderColor: r.status === s ? (RES_COLORS[s] || C.textLight) : C.border,
                        }}>
                        <Text style={{ color: r.status === s ? (RES_COLORS[s] || C.textLight) : C.textLight, fontSize: 9, fontWeight: '700' }}>{statusLabel(s).slice(0, 5)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </Animated.View>
              );
            })).flat()}
          </View>
        </View>
      </ScrollView>
    </>
  );
};

const st = StyleSheet.create({
  searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 12, gap: 8, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 14 },
  filterTab: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  labelCell: { paddingHorizontal: 8, paddingVertical: 6, justifyContent: 'center', borderRightWidth: 1, borderBottomWidth: 1 },
  dayHeaderCell: { alignItems: 'center', justifyContent: 'center', paddingVertical: 4, borderRightWidth: 0.5, borderBottomWidth: 1 },
  dayCell: { justifyContent: 'center', alignItems: 'center', borderRightWidth: 0.5, borderBottomWidth: 0.5 },
});
