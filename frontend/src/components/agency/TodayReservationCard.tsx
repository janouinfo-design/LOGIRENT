import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: 'Attente', color: '#F59E0B' },
  pending_cash: { label: 'Especes', color: '#A855F7' },
  confirmed: { label: 'Confirmee', color: '#10B981' },
  active: { label: 'Active', color: '#3B82F6' },
  completed: { label: 'Terminee', color: '#6B7280' },
  cancelled: { label: 'Annulee', color: '#EF4444' },
};

const PAYMENT_MAP: Record<string, { label: string; color: string }> = {
  paid: { label: 'Paye', color: '#10B981' },
  unpaid: { label: 'Non paye', color: '#F59E0B' },
  pending: { label: 'En cours', color: '#FBBF24' },
  refunded: { label: 'Rembourse', color: '#6B7280' },
};

interface TodayReservation {
  id: string;
  user_id?: string;
  user_name: string;
  vehicle_name: string;
  start_date: string;
  end_date: string;
  total_price: number;
  status: string;
  payment_status: string;
  docs_missing?: boolean;
}

interface Props {
  item: TodayReservation;
  C: any;
  onStatusChange: (id: string, status: string) => void;
  onActionPress: (item: TodayReservation) => void;
  onViewContract: (id: string) => void;
  onClientPress?: (userId: string) => void;
}

export const TodayReservationCard = ({ item, C, onStatusChange, onActionPress, onViewContract, onClientPress }: Props) => {
  const s = STATUS_MAP[item.status] || { label: item.status, color: '#6B7280' };
  const p = PAYMENT_MAP[item.payment_status] || { label: item.payment_status || 'N/A', color: '#6B7280' };

  const formatDate = (d: string) => {
    try { return format(new Date(d), 'dd MMM', { locale: fr }); }
    catch { return d; }
  };

  const formatTime = (d: string) => {
    try { return format(new Date(d), 'HH:mm'); }
    catch { return ''; }
  };

  const startTime = formatTime(item.start_date);
  const endTime = formatTime(item.end_date);

  return (
    <View style={[st.card, { backgroundColor: C.card, borderColor: C.border, borderLeftColor: s.color }]} data-testid={`today-res-${item.id}`}>
      {/* Header: Name + Status badge */}
      <View style={st.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 6 }}>
          <TouchableOpacity onPress={() => item.user_id && onClientPress?.(item.user_id)} style={{ flex: 1 }}>
            <Text style={[st.name, { color: C.accent, textDecorationLine: 'underline' }]} numberOfLines={1}>{item.user_name}</Text>
          </TouchableOpacity>
          {item.docs_missing && (
            <TouchableOpacity onPress={() => item.user_id && onClientPress?.(item.user_id)} style={st.docsBadge}>
              <Ionicons name="alert-circle" size={12} color="#EF4444" />
              <Text style={{ color: '#EF4444', fontSize: 9, fontWeight: '800' }}>DOCS</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={[st.badge, { backgroundColor: s.color + '20' }]}>
          <Text style={[st.badgeText, { color: s.color }]}>{s.label}</Text>
        </View>
      </View>

      {/* Vehicle */}
      <Text style={[st.vehicle, { color: C.textLight }]} numberOfLines={1}>{item.vehicle_name}</Text>

      {/* Dates with time */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <Ionicons name="calendar-outline" size={13} color={C.textLight} />
        <Text style={[st.dates, { marginBottom: 0 }]}>
          {formatDate(item.start_date)} - {formatDate(item.end_date)}
        </Text>
      </View>

      {/* Pickup & Return times */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
        <View style={[st.timeChip, { backgroundColor: '#10B98110', borderColor: '#10B98130' }]}>
          <Ionicons name="log-in-outline" size={12} color="#10B981" />
          <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '700' }}>Depart {startTime}</Text>
        </View>
        <View style={[st.timeChip, { backgroundColor: '#3B82F610', borderColor: '#3B82F630' }]}>
          <Ionicons name="log-out-outline" size={12} color="#3B82F6" />
          <Text style={{ color: '#3B82F6', fontSize: 11, fontWeight: '700' }}>Retour {endTime}</Text>
        </View>
      </View>

      {/* Price + Payment */}
      <View style={st.priceRow}>
        <Text style={[st.price, { color: C.accent }]}>CHF {item.total_price?.toFixed(0)}</Text>
        <View style={[st.payBadge, { backgroundColor: p.color + '18' }]}>
          <Text style={{ color: p.color, fontSize: 11, fontWeight: '700' }}>{p.label}</Text>
        </View>
      </View>

      {/* Quick status buttons */}
      <View style={st.statusRow}>
        {['confirmed', 'active', 'completed', 'cancelled'].map(status => {
          const active = item.status === status;
          const sc = STATUS_MAP[status]?.color || '#6B7280';
          return (
            <TouchableOpacity
              key={status}
              onPress={() => onStatusChange(item.id, status)}
              style={[st.statusBtn, { borderColor: active ? sc : C.border, backgroundColor: active ? sc + '20' : 'transparent' }]}
              data-testid={`today-status-${item.id}-${status}`}
            >
              <Text style={{ color: active ? sc : C.textLight, fontSize: 11, fontWeight: '700' }}>
                {(STATUS_MAP[status]?.label || status).slice(0, 5)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Actions row */}
      <View style={[st.actionsRow, { borderTopColor: C.border }]}>
        <TouchableOpacity style={st.actionBtn} onPress={() => onViewContract(item.id)} data-testid={`today-contract-${item.id}`}>
          <Ionicons name="document-text-outline" size={14} color={C.accent} />
          <Text style={{ color: C.accent, fontSize: 11, fontWeight: '600' }}>Contrat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={st.actionBtn} onPress={() => onActionPress(item)} data-testid={`today-actions-${item.id}`}>
          <Ionicons name="ellipsis-horizontal" size={14} color={C.accent} />
          <Text style={{ color: C.accent, fontSize: 11, fontWeight: '600' }}>Actions</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const st = StyleSheet.create({
  card: { borderRadius: 10, padding: 12, borderWidth: 1, borderLeftWidth: 4, width: '100%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  name: { fontSize: 15, fontWeight: '800', flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  docsBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  vehicle: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  dates: { fontSize: 12, marginBottom: 6 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  price: { fontSize: 16, fontWeight: '800' },
  payBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusRow: { flexDirection: 'row', gap: 4, marginBottom: 8, flexWrap: 'wrap' },
  statusBtn: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6, borderWidth: 1 },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 8, borderTopWidth: 1 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
});
