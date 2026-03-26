import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUS_MAP: Record<string, { label: string; short: string; color: string }> = {
  pending: { label: 'Confirmee', short: 'Conf', color: '#10B981' },
  pending_cash: { label: 'Especes', short: 'Espec', color: '#A855F7' },
  confirmed: { label: 'Confirmee', short: 'Confi', color: '#10B981' },
  active: { label: 'Active', short: 'Activ', color: '#3B82F6' },
  completed: { label: 'Terminee', short: 'Termi', color: '#6B7280' },
  cancelled: { label: 'Annulee', short: 'Annul', color: '#EF4444' },
};

const PAYMENT_MAP: Record<string, { label: string; color: string }> = {
  paid: { label: 'Paye', color: '#10B981' },
  unpaid: { label: 'Non paye', color: '#F59E0B' },
  pending: { label: 'En cours', color: '#FBBF24' },
  refunded: { label: 'Rembourse', color: '#6B7280' },
};

interface ReservationItem {
  id: string;
  user_name: string;
  vehicle_name: string;
  start_date: string;
  end_date: string;
  total_price: number;
  status: string;
  payment_status: string;
}

interface Props {
  item: ReservationItem;
  C: any;
  statusColor: (s: string) => string;
  updateStatus: (id: string, status: string) => void;
  onActionPress: (item: ReservationItem) => void;
}

export const ReservationCard = ({ item, C, statusColor, updateStatus, onActionPress }: Props) => {
  const s = STATUS_MAP[item.status] || { label: item.status, short: item.status?.slice(0, 5), color: '#6B7280' };
  const p = PAYMENT_MAP[item.payment_status] || { label: item.payment_status || 'N/A', color: '#6B7280' };

  const formatDate = (d: string) => {
    try { return format(new Date(d), 'dd MMM', { locale: fr }); }
    catch { return d; }
  };

  return (
    <View style={[st.card, { backgroundColor: C.card, borderColor: C.border, borderLeftColor: s.color }]} data-testid={`res-card-${item.id}`}>
      {/* Header: Client name + Status badge */}
      <View style={st.header}>
        <Text style={[st.name, { color: C.text }]} numberOfLines={1}>{item.user_name}</Text>
        <View style={[st.badge, { backgroundColor: s.color + '20' }]}>
          <Text style={[st.badgeText, { color: s.color }]}>{s.label}</Text>
        </View>
      </View>

      {/* Vehicle */}
      <Text style={[st.vehicle, { color: C.textLight }]} numberOfLines={1}>{item.vehicle_name}</Text>

      {/* Dates */}
      <Text style={[st.dates, { color: C.textLight }]}>
        {formatDate(item.start_date)} - {formatDate(item.end_date)}
      </Text>

      {/* Price + Payment */}
      <View style={st.priceRow}>
        <Text style={[st.price, { color: C.accent }]}>CHF {item.total_price?.toFixed(0)}</Text>
        <View style={[st.payBadge, { backgroundColor: p.color + '18' }]}>
          <Text style={{ color: p.color, fontSize: 11, fontWeight: '700' }}>{p.label}</Text>
        </View>
      </View>

      {/* Quick status buttons */}
      <View style={st.statusRow}>
        {[
          { key: 'confirmed', label: 'Confi' },
          { key: 'active', label: 'Activ' },
          { key: 'completed', label: 'Termi' },
          { key: 'cancelled', label: 'Annul' },
        ].map(({ key, label }) => {
          const active = item.status === key;
          const sc = STATUS_MAP[key]?.color || '#6B7280';
          return (
            <TouchableOpacity
              key={key}
              onPress={() => updateStatus(item.id, key)}
              style={[st.statusBtn, { borderColor: active ? sc : C.border, backgroundColor: active ? sc + '20' : 'transparent' }]}
              data-testid={`status-btn-${item.id}-${key}`}
            >
              <Text style={{ color: active ? sc : C.textLight, fontSize: 11, fontWeight: '700' }}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Actions button */}
      <TouchableOpacity style={[st.actionsBtn, { borderTopColor: C.border }]} onPress={() => onActionPress(item)} data-testid={`actions-btn-${item.id}`}>
        <Ionicons name="ellipsis-horizontal" size={16} color={C.accent} />
        <Text style={{ color: C.accent, fontSize: 12, fontWeight: '600' }}>Actions</Text>
      </TouchableOpacity>
    </View>
  );
};

const st = StyleSheet.create({
  card: { flex: 1, borderRadius: 10, padding: 12, borderWidth: 1, borderLeftWidth: 4, maxWidth: '33%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  name: { fontSize: 14, fontWeight: '800', flex: 1, marginRight: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  vehicle: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  dates: { fontSize: 12, marginBottom: 6 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  price: { fontSize: 16, fontWeight: '800' },
  payBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusRow: { flexDirection: 'row', gap: 4, marginBottom: 8, flexWrap: 'wrap' },
  statusBtn: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6, borderWidth: 1 },
  actionsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: 8, borderTopWidth: 1 },
});
