import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const RES_COLORS: Record<string, string> = {
  confirmed: '#10B981', active: '#3B82F6', pending: '#FBBF24', pending_cash: '#A855F7',
  completed: '#6B7280', cancelled: '#EF4444',
};

const statusLabel = (s: string) => {
  const map: Record<string, string> = { pending: 'En attente', pending_cash: 'Especes', confirmed: 'Confirmee', active: 'Active', completed: 'Terminee', cancelled: 'Annulee' };
  return map[s] || s;
};

interface Reservation {
  id: string; user_name: string; user_email: string; vehicle_name: string;
  start_date: string; end_date: string; total_days: number; total_price: number;
  status: string; payment_status: string; payment_method?: string;
}

interface ReservationCardProps {
  item: Reservation;
  C: any;
  statusColor: (s: string) => string;
  updateStatus: (id: string, status: string) => void;
  onActionPress: (item: Reservation) => void;
}

export const ReservationCard = ({ item, C, statusColor, updateStatus, onActionPress }: ReservationCardProps) => {
  const sc = statusColor(item.status);
  const cardW = (Dimensions.get('window').width - 32 - 16) / 2;

  return (
    <View style={[st.card, { backgroundColor: C.card, borderColor: C.border, width: cardW, borderLeftWidth: 4, borderLeftColor: sc }]} data-testid={`res-${item.id}`}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <Text style={{ color: C.text, fontSize: 18, fontWeight: '800', flex: 1 }} numberOfLines={1}>{item.user_name}</Text>
        <View style={[st.badge, { backgroundColor: sc + '25' }]}>
          <Text style={{ color: sc, fontSize: 16, fontWeight: '800' }}>{statusLabel(item.status)}</Text>
        </View>
      </View>
      <Text style={{ color: C.textLight, fontSize: 15, marginBottom: 4, fontWeight: '600' }} numberOfLines={1}>{item.vehicle_name}</Text>
      <Text style={{ color: C.textLight, fontSize: 14 }}>
        {item.start_date ? format(new Date(item.start_date), 'dd MMM', { locale: fr }) : ''} - {item.end_date ? format(new Date(item.end_date), 'dd MMM', { locale: fr }) : ''}
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <Text style={{ color: C.accent, fontSize: 17, fontWeight: '800' }}>CHF {item.total_price?.toFixed(0)}</Text>
        <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: item.payment_status === 'paid' ? '#10B98118' : '#F59E0B18' }}>
          <Text style={{ color: item.payment_status === 'paid' ? '#10B981' : '#F59E0B', fontSize: 13, fontWeight: '700' }}>
            {item.payment_status === 'paid' ? 'Paye' : 'Non paye'}
          </Text>
        </View>
      </View>
      {/* Inline status change */}
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
        {['confirmed', 'active', 'completed', 'cancelled'].map(s => (
          <TouchableOpacity key={s} onPress={() => updateStatus(item.id, s)}
            style={{
              paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6,
              backgroundColor: item.status === s ? statusColor(s) + '30' : 'transparent',
              borderWidth: 1, borderColor: item.status === s ? statusColor(s) : C.border,
            }}
            data-testid={`status-${item.id}-${s}`}>
            <Text style={{ color: item.status === s ? statusColor(s) : C.textLight, fontSize: 14, fontWeight: '700' }}>{statusLabel(s).slice(0, 5)}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.border }}
        onPress={() => onActionPress(item)}
        data-testid={`actions-${item.id}`}>
        <Ionicons name="ellipsis-horizontal" size={18} color={C.accent} />
        <Text style={{ color: C.accent, fontSize: 14, fontWeight: '600' }}>Actions</Text>
      </TouchableOpacity>
    </View>
  );
};

const st = StyleSheet.create({
  card: { borderRadius: 10, padding: 10, borderWidth: 1, overflow: 'hidden' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
});
