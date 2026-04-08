import React, { useMemo, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Animated, Modal, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, parseISO, isSameDay, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../../api/axios';

const RES_COLORS: Record<string, string> = {
  confirmed: '#10B981', active: '#3B82F6', pending: '#FBBF24', pending_cash: '#A855F7',
  completed: '#6B7280', cancelled: '#EF4444',
};

const statusLabel = (s: string) => {
  const map: Record<string, string> = { pending: 'En attente', pending_cash: 'Especes', confirmed: 'Confirmee', active: 'En cours', completed: 'Terminee', cancelled: 'Annulee' };
  return map[s] || s;
};

interface Res { id: string; start: string; end: string; status: string; user_name?: string }
interface VehicleSchedule {
  id: string; brand: string; model: string; price_per_day: number;
  reservations: Res[];
}

type ViewType = 'day' | 'week' | 'month';
type StatusFilter = 'all' | 'confirmed' | 'active' | 'overdue';

interface DragState {
  res: Res;
  vehicle: VehicleSchedule;
  originDayIndex: number;
  currentDayOffset: number;
  durationDays: number;
}

interface GanttChartProps {
  C: any;
  schedule: VehicleSchedule[];
  orphanReservations?: Res[];
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
  onOpenReservation?: (res: any) => void;
  onCreateReservation?: (vehicleId: string, date: string) => void;
  onNavigateMonth?: (dir: number) => void;
  onFilterChange?: (statusFilter: string, viewType: string) => void;
}

export const GanttChart = ({
  C, schedule, orphanReservations = [], planningMonth, scheduleLoading, refreshing, onRefresh,
  vehicleSearch, setVehicleSearch, showAllVehicles, setShowAllVehicles,
  highlightId, highlightAnim, updateStatus, onOpenReservation, onCreateReservation, onNavigateMonth, onFilterChange,
}: GanttChartProps) => {

  const [viewType, setViewType] = useState<ViewType>('month');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [zoom, setZoom] = useState(1);
  const [popup, setPopup] = useState<{ res: Res; vehicle: VehicleSchedule } | null>(null);

  // Notify parent of filter changes
  const handleViewType = (v: ViewType) => { setViewType(v); onFilterChange?.(statusFilter, v); };
  const handleStatusFilter = (f: StatusFilter) => { setStatusFilter(f); onFilterChange?.(f, viewType); };

  // Drag & Drop state
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dragPreviewOffset, setDragPreviewOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dropFeedback, setDropFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const dragStartX = useRef(0);
  const dragTimer = useRef<any>(null);
  const gridRef = useRef<View>(null);
  const gridLayoutRef = useRef({ x: 0, y: 0, width: 0 });

  const today = new Date();
  const CELL_W = Math.round(32 * zoom);
  const LABEL_W = Math.round(130 * zoom);
  const ROW_H = Math.round(42 * zoom);

  const days = useMemo(() => {
    if (viewType === 'day') return [today];
    if (viewType === 'week') {
      const ws = startOfWeek(today, { weekStartsOn: 1 });
      return eachDayOfInterval({ start: ws, end: endOfWeek(today, { weekStartsOn: 1 }) });
    }
    return eachDayOfInterval({ start: planningMonth, end: endOfMonth(planningMonth) });
  }, [viewType, planningMonth]);

  const conflicts = useMemo(() => {
    const found: Set<string> = new Set();
    schedule.forEach(v => {
      const res = v.reservations.filter(r => r.status !== 'cancelled' && r.status !== 'completed');
      for (let i = 0; i < res.length; i++) {
        for (let j = i + 1; j < res.length; j++) {
          try {
            const aStart = parseISO(res[i].start).getTime();
            const aEnd = parseISO(res[i].end).getTime();
            const bStart = parseISO(res[j].start).getTime();
            const bEnd = parseISO(res[j].end).getTime();
            if (aStart < bEnd && bStart < aEnd) {
              found.add(res[i].id);
              found.add(res[j].id);
            }
          } catch {}
        }
      }
    });
    return found;
  }, [schedule]);

  const alerts = useMemo(() => {
    let overdue = 0, conflictCount = conflicts.size, unpaid = 0;
    schedule.forEach(v => v.reservations.forEach(r => {
      if (r.status === 'active') {
        try { if (parseISO(r.end).getTime() < today.getTime()) overdue++; } catch {}
      }
    }));
    schedule.forEach(v => v.reservations.forEach(r => {
      if (r.status === 'pending' || r.status === 'pending_cash') unpaid++;
    }));
    return { overdue, conflictCount, unpaid };
  }, [schedule, conflicts]);

  const filteredSchedule = useMemo(() => {
    let list = schedule;
    if (!showAllVehicles) list = list.filter(v => v.reservations.length > 0);
    if (vehicleSearch) list = list.filter(v => `${v.brand} ${v.model}`.toLowerCase().includes(vehicleSearch.toLowerCase()));
    if (statusFilter !== 'all') {
      list = list.map(v => ({
        ...v,
        reservations: v.reservations.filter(r => {
          if (statusFilter === 'confirmed') return r.status === 'confirmed';
          if (statusFilter === 'active') return r.status === 'active';
          if (statusFilter === 'overdue') {
            try { return r.status === 'active' && parseISO(r.end).getTime() < today.getTime(); } catch { return false; }
          }
          return true;
        }),
      })).filter(v => showAllVehicles || v.reservations.length > 0);
    }
    return list;
  }, [schedule, showAllVehicles, vehicleSearch, statusFilter]);

  const todayIndex = useMemo(() => days.findIndex(d => isSameDay(d, today)), [days]);

  // === DRAG & DROP HANDLERS (web pointer events) ===
  const canDrag = (res: Res) => res.status !== 'completed' && res.status !== 'cancelled' && res.status !== 'active';

  const handleDragStart = (res: Res, vehicle: VehicleSchedule, dayIndex: number, e: any) => {
    if (!canDrag(res)) return;
    const clientX = e.nativeEvent?.pageX ?? e.pageX ?? 0;
    dragStartX.current = clientX;
    // Long press to start drag
    dragTimer.current = setTimeout(() => {
      try {
        const durationDays = Math.max(1, differenceInDays(parseISO(res.end), parseISO(res.start)));
        setDrag({ res, vehicle, originDayIndex: dayIndex, currentDayOffset: 0, durationDays });
        setIsDragging(true);
        setDragPreviewOffset(0);
      } catch {}
    }, 300);
  };

  const handleDragMove = (e: any) => {
    if (!isDragging || !drag) return;
    const clientX = e.nativeEvent?.pageX ?? e.pageX ?? 0;
    const diff = clientX - dragStartX.current;
    const cellOffset = Math.round(diff / CELL_W);
    setDragPreviewOffset(cellOffset);
  };

  const handleDragEnd = async () => {
    if (dragTimer.current) { clearTimeout(dragTimer.current); dragTimer.current = null; }
    if (!isDragging || !drag) { setIsDragging(false); setDrag(null); return; }

    const newDayIndex = drag.originDayIndex + dragPreviewOffset;
    if (dragPreviewOffset === 0 || newDayIndex < 0 || newDayIndex >= days.length) {
      setIsDragging(false); setDrag(null); setDragPreviewOffset(0);
      return;
    }

    const newStart = days[newDayIndex];
    const newEnd = addDays(newStart, drag.durationDays);

    try {
      await api.put(`/api/admin/reservations/${drag.res.id}/reschedule?new_start=${format(newStart, 'yyyy-MM-dd')}&new_end=${format(newEnd, 'yyyy-MM-dd')}`);
      setDropFeedback({ success: true, message: `Deplace au ${format(newStart, 'dd/MM')} - ${format(newEnd, 'dd/MM')}` });
      onRefresh();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Erreur lors du deplacement';
      setDropFeedback({ success: false, message: msg });
    }

    setIsDragging(false); setDrag(null); setDragPreviewOffset(0);
    setTimeout(() => setDropFeedback(null), 3000);
  };

  const handleDragCancel = () => {
    if (dragTimer.current) { clearTimeout(dragTimer.current); dragTimer.current = null; }
    setIsDragging(false); setDrag(null); setDragPreviewOffset(0);
  };

  const handleCellPress = (vehicle: VehicleSchedule, day: Date, res: Res | null) => {
    if (isDragging) return;
    if (res) {
      if (onOpenReservation) onOpenReservation(res);
      else setPopup({ res, vehicle });
    } else if (onCreateReservation) {
      onCreateReservation(vehicle.id, format(day, 'yyyy-MM-dd'));
    }
  };

  const goToday = useCallback(() => {
    if (onNavigateMonth) onNavigateMonth(0);
    setViewType('month');
  }, [onNavigateMonth]);

  if (scheduleLoading) return <ActivityIndicator size="large" color={C.accent} style={{ marginTop: 40 }} />;

  return (
    <>
      {/* Drop feedback toast */}
      {dropFeedback && (
        <View style={[g.feedbackToast, { backgroundColor: dropFeedback.success ? '#10B981' : '#EF4444' }]}>
          <Ionicons name={dropFeedback.success ? 'checkmark-circle' : 'alert-circle'} size={16} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', flex: 1 }}>{dropFeedback.message}</Text>
        </View>
      )}

      {/* Drag mode indicator */}
      {isDragging && (
        <View style={g.dragIndicator}>
          <Ionicons name="move" size={14} color="#3B82F6" />
          <Text style={{ color: '#3B82F6', fontSize: 12, fontWeight: '700' }}>
            Glissez pour deplacer ({dragPreviewOffset > 0 ? '+' : ''}{dragPreviewOffset}j)
          </Text>
          <TouchableOpacity onPress={handleDragCancel} style={g.dragCancelBtn}>
            <Ionicons name="close" size={14} color="#EF4444" />
            <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '700' }}>Annuler</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ===== ALERT BAR ===== */}
      {(alerts.overdue > 0 || alerts.conflictCount > 0 || alerts.unpaid > 0) && (
        <View style={g.alertBar}>
          {alerts.overdue > 0 && (
            <View style={[g.alertChip, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
              <Ionicons name="time" size={14} color="#EF4444" />
              <Text style={{ color: '#DC2626', fontSize: 12, fontWeight: '700' }}>{alerts.overdue} retard(s)</Text>
            </View>
          )}
          {alerts.conflictCount > 0 && (
            <View style={[g.alertChip, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }]}>
              <Ionicons name="alert-circle" size={14} color="#EA580C" />
              <Text style={{ color: '#EA580C', fontSize: 12, fontWeight: '700' }}>{alerts.conflictCount} conflit(s)</Text>
            </View>
          )}
          {alerts.unpaid > 0 && (
            <View style={[g.alertChip, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
              <Ionicons name="card" size={14} color="#D97706" />
              <Text style={{ color: '#D97706', fontSize: 12, fontWeight: '700' }}>{alerts.unpaid} paiement(s)</Text>
            </View>
          )}
        </View>
      )}

      {/* ===== TOOLBAR ===== */}
      <View style={g.toolbar}>
        <View style={g.viewSwitch}>
          {(['day', 'week', 'month'] as ViewType[]).map(v => (
            <TouchableOpacity key={v} style={[g.viewBtn, viewType === v && { backgroundColor: C.accent }]} onPress={() => handleViewType(v)}>
              <Text style={{ color: viewType === v ? '#fff' : C.textLight, fontSize: 11, fontWeight: '700' }}>
                {v === 'day' ? 'Jour' : v === 'week' ? 'Semaine' : 'Mois'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={[g.todayBtn, { borderColor: C.accent }]} onPress={goToday}>
          <Ionicons name="today" size={14} color={C.accent} />
          <Text style={{ color: C.accent, fontSize: 12, fontWeight: '700' }}>Aujourd'hui</Text>
        </TouchableOpacity>

        <View style={g.zoomWrap}>
          <TouchableOpacity onPress={() => setZoom(Math.max(0.7, zoom - 0.15))} style={g.zoomBtn}>
            <Ionicons name="remove" size={14} color={C.textLight} />
          </TouchableOpacity>
          <Text style={{ color: C.textLight, fontSize: 11, fontWeight: '600' }}>{Math.round(zoom * 100)}%</Text>
          <TouchableOpacity onPress={() => setZoom(Math.min(1.5, zoom + 0.15))} style={g.zoomBtn}>
            <Ionicons name="add" size={14} color={C.textLight} />
          </TouchableOpacity>
        </View>

        <View style={g.statusFilters}>
          {([
            { value: 'all', label: 'Tous', icon: 'grid' },
            { value: 'confirmed', label: 'Confirmes', icon: 'checkmark-circle' },
            { value: 'active', label: 'En cours', icon: 'car' },
            { value: 'overdue', label: 'Retards', icon: 'warning' },
          ] as { value: StatusFilter; label: string; icon: string }[]).map(f => (
            <TouchableOpacity key={f.value} style={[g.sfBtn, statusFilter === f.value && { backgroundColor: C.accent + '20', borderColor: C.accent }]} onPress={() => handleStatusFilter(f.value)}>
              <Ionicons name={f.icon as any} size={12} color={statusFilter === f.value ? C.accent : C.textLight} />
              <Text style={{ color: statusFilter === f.value ? C.accent : C.textLight, fontSize: 11, fontWeight: '600' }}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[g.searchWrap, { borderColor: C.border, backgroundColor: C.card }]}>
          <Ionicons name="search" size={14} color={C.textLight} />
          <TextInput style={[g.searchInput, { color: C.text }]} placeholder="Vehicule..." placeholderTextColor={C.textLight} value={vehicleSearch} onChangeText={setVehicleSearch} />
        </View>
      </View>

      {/* ===== LEGEND ===== */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12, marginBottom: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: '#D1FAE5', borderWidth: 1, borderColor: '#A7F3D0' }} />
          <Text style={{ color: C.textLight, fontSize: 10, fontWeight: '600' }}>Disponible</Text>
        </View>
        {Object.entries(RES_COLORS).filter(([k]) => k !== 'completed' && k !== 'cancelled').map(([k, color]) => (
          <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: color }} />
            <Text style={{ color: C.textLight, fontSize: 10, fontWeight: '600' }}>{statusLabel(k)}</Text>
          </View>
        ))}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: '#EF4444', borderWidth: 2, borderColor: '#B91C1C' }} />
          <Text style={{ color: C.textLight, fontSize: 10, fontWeight: '600' }}>Conflit</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="move" size={14} color="#3B82F6" />
          <Text style={{ color: C.textLight, fontSize: 10, fontWeight: '600' }}>Drag & Drop (maintenir)</Text>
        </View>
      </ScrollView>

      {/* ===== GANTT GRID ===== */}
      <View style={{ maxHeight: 350, overflow: 'scroll' } as any}>
        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
          <View
            ref={gridRef}
            {...(Platform.OS === 'web' ? {
              onMouseMove: handleDragMove,
              onMouseUp: handleDragEnd,
              onMouseLeave: handleDragCancel,
            } : {})}
          >
            {/* Header row */}
            <View style={{ flexDirection: 'row' }}>
              <View style={[g.labelCell, { width: LABEL_W, height: ROW_H, backgroundColor: '#1E3A5F', borderColor: '#2D4A6F' }]}>
                <Text style={{ color: '#CBD5E1', fontSize: 11, fontWeight: '800' }}>VEHICULE</Text>
              </View>
              {days.map((day, i) => {
                const isToday = isSameDay(day, today);
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                return (
                  <View key={i} style={[g.dayHeaderCell, {
                    width: CELL_W, height: ROW_H,
                    backgroundColor: isToday ? '#3B82F6' : isWeekend ? '#F1F5F9' : '#F8FAFC',
                    borderColor: '#E2E8F0',
                  }]}>
                    <Text style={{ color: isToday ? '#fff' : '#94A3B8', fontSize: Math.max(7, 8 * zoom), fontWeight: '600' }}>
                      {format(day, 'EEE', { locale: fr }).slice(0, 2).toUpperCase()}
                    </Text>
                    <Text style={{ color: isToday ? '#fff' : '#334155', fontSize: Math.max(10, 12 * zoom), fontWeight: isToday ? '900' : '700' }}>
                      {format(day, 'd')}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Vehicle rows */}
            {filteredSchedule.map((vehicle, vi) => (
              <View key={vehicle.id} style={{ flexDirection: 'row' }}>
                <View style={[g.labelCell, {
                  width: LABEL_W, height: ROW_H,
                  backgroundColor: vi % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                  borderColor: '#E2E8F0',
                }]}>
                  <Text style={{ color: '#1E293B', fontSize: Math.max(10, 11 * zoom), fontWeight: '800' }} numberOfLines={1}>
                    {vehicle.brand} {vehicle.model}
                  </Text>
                  <Text style={{ color: '#94A3B8', fontSize: Math.max(8, 9 * zoom) }}>CHF {vehicle.price_per_day}/j</Text>
                </View>

                {days.map((day, di) => {
                  const dayTs = day.getTime();
                  const isToday = isSameDay(day, today);
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                  let resForDay: Res | null = null;
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

                  const isConflict = resForDay && conflicts.has(resForDay.id);
                  const isOverdue = resForDay && resForDay.status === 'active' && (() => { try { return parseISO(resForDay!.end).getTime() < today.getTime(); } catch { return false; } })();
                  const barColor = isConflict ? '#EF4444' : isOverdue ? '#DC2626' : resForDay ? (RES_COLORS[resForDay.status] || '#6B7280') : 'transparent';
                  const isAvailable = !resForDay && !isWeekend;

                  // Drag preview: is this cell the ghost position?
                  const isDragTarget = isDragging && drag && drag.vehicle.id === vehicle.id && drag.res.id === resForDay?.id;
                  const isGhostCell = isDragging && drag && drag.vehicle.id === vehicle.id && !resForDay;
                  const ghostStartIdx = drag ? drag.originDayIndex + dragPreviewOffset : -1;
                  const ghostEndIdx = drag ? ghostStartIdx + drag.durationDays : -1;
                  const isInGhostRange = isGhostCell && di >= ghostStartIdx && di < ghostEndIdx;

                  return (
                    <View
                      key={di}
                      style={[g.dayCell, {
                        width: CELL_W, height: ROW_H,
                        backgroundColor: isInGhostRange ? '#BFDBFE' : isAvailable ? '#ECFDF5' : isWeekend && !resForDay ? '#F1F5F9' : vi % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                        borderColor: isInGhostRange ? '#3B82F6' : '#E2E8F0',
                        borderWidth: isInGhostRange ? 1.5 : 0.5,
                        opacity: isDragTarget ? 0.4 : 1,
                      }]}
                    >
                      {isToday && (
                        <View style={{ position: 'absolute', left: CELL_W / 2 - 1, top: 0, bottom: 0, width: 2, backgroundColor: '#EF4444', zIndex: 10 }} />
                      )}

                      {resForDay && (
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => handleCellPress(vehicle, day, resForDay)}
                          {...(Platform.OS === 'web' && canDrag(resForDay) ? {
                            onMouseDown: (e: any) => handleDragStart(resForDay!, vehicle, di, e),
                          } : {})}
                          style={{
                            position: 'absolute', top: 3, bottom: 3, left: isStart ? 2 : 0, right: isEnd ? 2 : 0,
                            backgroundColor: barColor,
                            borderTopLeftRadius: isStart ? 6 : 0, borderBottomLeftRadius: isStart ? 6 : 0,
                            borderTopRightRadius: isEnd ? 6 : 0, borderBottomRightRadius: isEnd ? 6 : 0,
                            justifyContent: 'center', overflow: 'hidden',
                            ...(canDrag(resForDay) ? { cursor: 'grab' } as any : {}),
                            ...(isConflict ? { borderWidth: 2, borderColor: '#B91C1C' } : {}),
                            ...(highlightId && resForDay.id === highlightId ? { borderWidth: 2, borderColor: '#fff' } : {}),
                          }}
                        >
                          {isStart && (
                            <Text style={{ color: '#fff', fontSize: Math.max(8, 10 * zoom), fontWeight: '900', paddingLeft: 3, textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }} numberOfLines={1}>
                              {resForDay.user_name?.split(' ')[0] || statusLabel(resForDay.status)}
                            </Text>
                          )}
                          {isStart && canDrag(resForDay) && (
                            <View style={g.dragHandle}>
                              <Ionicons name="move" size={8} color="rgba(255,255,255,0.7)" />
                            </View>
                          )}
                        </TouchableOpacity>
                      )}

                      {!resForDay && !isInGhostRange && (
                        <TouchableOpacity
                          activeOpacity={0.5}
                          onPress={() => handleCellPress(vehicle, day, null)}
                          style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'center', alignItems: 'center' }}
                        >
                          {isAvailable && (
                            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#34D399', opacity: 0.5 }} />
                          )}
                        </TouchableOpacity>
                      )}

                      {isInGhostRange && di === ghostStartIdx && (
                        <View style={{ position: 'absolute', top: 6, left: 4, zIndex: 20 }}>
                          <Ionicons name="arrow-forward" size={12} color="#3B82F6" />
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* ===== RESERVATION POPUP ===== */}
      {popup && (
        <Modal transparent animationType="fade" visible={!!popup} onRequestClose={() => setPopup(null)}>
          <Pressable style={g.popupOverlay} onPress={() => setPopup(null)}>
            <Pressable style={[g.popupCard, { backgroundColor: C.card }]} onPress={e => e.stopPropagation()}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <View style={[g.popupIcon, { backgroundColor: (RES_COLORS[popup.res.status] || '#6B7280') + '20' }]}>
                  <Ionicons name="car-sport" size={20} color={RES_COLORS[popup.res.status] || '#6B7280'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, fontSize: 16, fontWeight: '800' }}>{popup.vehicle.brand} {popup.vehicle.model}</Text>
                  <Text style={{ color: C.textLight, fontSize: 13 }}>{popup.res.user_name || 'Client inconnu'}</Text>
                </View>
                <TouchableOpacity onPress={() => setPopup(null)}>
                  <Ionicons name="close" size={22} color={C.textLight} />
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <View style={[g.badge, { backgroundColor: RES_COLORS[popup.res.status] || '#6B7280' }]}>
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>{statusLabel(popup.res.status)}</Text>
                </View>
                {conflicts.has(popup.res.id) && (
                  <View style={[g.badge, { backgroundColor: '#EF4444' }]}>
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>CONFLIT</Text>
                  </View>
                )}
                {canDrag(popup.res) && (
                  <View style={[g.badge, { backgroundColor: '#3B82F6' }]}>
                    <Ionicons name="move" size={10} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800', marginLeft: 4 }}>DEPLACABLE</Text>
                  </View>
                )}
              </View>

              <View style={{ flexDirection: 'row', gap: 16, marginBottom: 16 }}>
                <View>
                  <Text style={{ color: C.textLight, fontSize: 11, fontWeight: '600' }}>DEBUT</Text>
                  <Text style={{ color: C.text, fontSize: 14, fontWeight: '700' }}>{popup.res.start?.slice(0, 10)}</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color={C.textLight} style={{ marginTop: 14 }} />
                <View>
                  <Text style={{ color: C.textLight, fontSize: 11, fontWeight: '600' }}>FIN</Text>
                  <Text style={{ color: C.text, fontSize: 14, fontWeight: '700' }}>{popup.res.end?.slice(0, 10)}</Text>
                </View>
              </View>

              <Text style={{ color: C.textLight, fontSize: 11, fontWeight: '700', marginBottom: 8 }}>ACTIONS RAPIDES</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {popup.res.status !== 'confirmed' && popup.res.status !== 'completed' && popup.res.status !== 'cancelled' && (
                  <TouchableOpacity style={[g.actionBtn, { backgroundColor: '#10B98115', borderColor: '#10B98140' }]} onPress={() => { updateStatus(popup.res.id, 'confirmed'); setPopup(null); }}>
                    <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                    <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '700' }}>Confirmer</Text>
                  </TouchableOpacity>
                )}
                {popup.res.status !== 'active' && popup.res.status !== 'completed' && popup.res.status !== 'cancelled' && (
                  <TouchableOpacity style={[g.actionBtn, { backgroundColor: '#3B82F615', borderColor: '#3B82F640' }]} onPress={() => { updateStatus(popup.res.id, 'active'); setPopup(null); }}>
                    <Ionicons name="play-circle" size={14} color="#3B82F6" />
                    <Text style={{ color: '#3B82F6', fontSize: 12, fontWeight: '700' }}>Demarrer</Text>
                  </TouchableOpacity>
                )}
                {popup.res.status !== 'completed' && popup.res.status !== 'cancelled' && (
                  <TouchableOpacity style={[g.actionBtn, { backgroundColor: '#6B728015', borderColor: '#6B728040' }]} onPress={() => { updateStatus(popup.res.id, 'completed'); setPopup(null); }}>
                    <Ionicons name="checkmark-done" size={14} color="#6B7280" />
                    <Text style={{ color: '#6B7280', fontSize: 12, fontWeight: '700' }}>Terminer</Text>
                  </TouchableOpacity>
                )}
                {popup.res.status !== 'cancelled' && popup.res.status !== 'completed' && (
                  <TouchableOpacity style={[g.actionBtn, { backgroundColor: '#EF444415', borderColor: '#EF444440' }]} onPress={() => { updateStatus(popup.res.id, 'cancelled'); setPopup(null); }}>
                    <Ionicons name="close-circle" size={14} color="#EF4444" />
                    <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '700' }}>Annuler</Text>
                  </TouchableOpacity>
                )}
                {onOpenReservation && (
                  <TouchableOpacity style={[g.actionBtn, { backgroundColor: '#8B5CF615', borderColor: '#8B5CF640' }]} onPress={() => { onOpenReservation(popup.res); setPopup(null); }}>
                    <Ionicons name="open" size={14} color="#8B5CF6" />
                    <Text style={{ color: '#8B5CF6', fontSize: 12, fontWeight: '700' }}>Details</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </>
  );
};

const g = StyleSheet.create({
  alertBar: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 8, flexWrap: 'wrap' },
  alertChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginBottom: 8, flexWrap: 'wrap' },
  viewSwitch: { flexDirection: 'row', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' },
  viewBtn: { paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#F8FAFC' },
  todayBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  zoomWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  zoomBtn: { width: 26, height: 26, borderRadius: 6, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  statusFilters: { flexDirection: 'row', gap: 2 },
  sfBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#E2E8F0' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, paddingHorizontal: 8, borderWidth: 1, minWidth: 120 },
  searchInput: { flex: 1, fontSize: 12, paddingVertical: 6 },
  labelCell: { paddingHorizontal: 8, paddingVertical: 4, justifyContent: 'center', borderRightWidth: 1, borderBottomWidth: 1 },
  dayHeaderCell: { alignItems: 'center', justifyContent: 'center', paddingVertical: 2, borderRightWidth: 0.5, borderBottomWidth: 1 },
  dayCell: { justifyContent: 'center', alignItems: 'center', borderRightWidth: 0.5, borderBottomWidth: 0.5, position: 'relative' },
  popupOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  popupCard: { width: 420, maxWidth: '90%', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 },
  popupIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  feedbackToast: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  dragIndicator: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE' },
  dragCancelBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 'auto', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#FECACA', backgroundColor: '#FEF2F2' },
  dragHandle: { position: 'absolute', top: 2, right: 2, opacity: 0.7 },
});
