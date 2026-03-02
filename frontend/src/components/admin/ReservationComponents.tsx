import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { getStatusColor, getStatusLabel, getPaymentColor, getPaymentLabel, formatDate, formatDateTime } from '../../utils/admin-helpers';

interface Reservation {
  id: string;
  user_name: string;
  user_email: string;
  user_phone?: string;
  vehicle_name: string;
  start_date: string;
  end_date: string;
  total_days: number;
  total_price: number;
  status: string;
  payment_status: string;
  payment_method?: string;
  created_at: string;
}

export function ReservationCard({ item, C, onStatusPress, onPaymentPress, onContractPress }: {
  item: Reservation; C: any;
  onStatusPress: () => void; onPaymentPress: () => void; onContractPress: () => void;
}) {
  const statusColor = getStatusColor(item.status, C);
  const paymentColor = getPaymentColor(item.payment_status, C);
  return (
    <View style={[st.card, { backgroundColor: C.card }]} data-testid={`reservation-card-${item.id}`}>
      <View style={st.cardHeader}>
        <View>
          <Text style={[st.resId, { color: C.text }]}>#{item.id.slice(0, 8)}</Text>
          <Text style={{ fontSize: 12, color: C.textLight, marginTop: 2 }}>Creee le {formatDateTime(item.created_at)}</Text>
        </View>
        <TouchableOpacity style={[st.badge, { backgroundColor: statusColor + '20' }]} onPress={onStatusPress} data-testid={`reservation-status-${item.id}`}>
          <View style={[st.dot, { backgroundColor: statusColor }]} />
          <Text style={{ fontSize: 12, fontWeight: '600', color: statusColor }}>{getStatusLabel(item.status)}</Text>
          <Ionicons name="chevron-down" size={12} color={statusColor} />
        </TouchableOpacity>
      </View>
      <View style={st.row}>
        <Ionicons name="person" size={18} color={C.accent} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: C.text }}>{item.user_name}</Text>
          <Text style={{ fontSize: 13, color: C.textLight }}>{item.user_email}</Text>
        </View>
      </View>
      <View style={[st.row, { marginBottom: 14 }]}>
        <Ionicons name="car" size={18} color={C.warning} />
        <Text style={{ fontSize: 14, color: C.text, fontWeight: '500' }}>{item.vehicle_name}</Text>
      </View>
      <View style={[st.datesSection, { backgroundColor: C.bg }]}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 10, fontWeight: '600', color: C.textLight, marginBottom: 4 }}>DEBUT</Text>
          <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>{formatDate(item.start_date)}</Text>
        </View>
        <View style={{ alignItems: 'center', paddingHorizontal: 10 }}>
          <Ionicons name="arrow-forward" size={20} color={C.textLight} />
          <Text style={{ fontSize: 10, color: C.textLight, marginTop: 2 }}>{item.total_days} jours</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 10, fontWeight: '600', color: C.textLight, marginBottom: 4 }}>FIN</Text>
          <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>{formatDate(item.end_date)}</Text>
        </View>
      </View>
      <View style={st.footer}>
        <TouchableOpacity style={[st.badge, { backgroundColor: paymentColor + '20' }]} onPress={onPaymentPress} data-testid={`reservation-payment-${item.id}`}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: paymentColor }}>{getPaymentLabel(item.payment_status)}</Text>
          <Ionicons name="chevron-down" size={10} color={paymentColor} />
        </TouchableOpacity>
        {item.payment_method === 'cash' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 }}>
            <Ionicons name="cash" size={12} color="#D97706" />
            <Text style={{ fontSize: 11, color: '#D97706', fontWeight: '500' }}>Especes</Text>
          </View>
        )}
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.accent + '15', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}
          onPress={onContractPress} data-testid={`contract-btn-${item.id}`}>
          <Ionicons name="document-text" size={14} color={C.accent} />
          <Text style={{ color: C.accent, fontSize: 11, fontWeight: '600' }}>Contrat</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: C.accent }}>CHF {item.total_price.toFixed(2)}</Text>
      </View>
    </View>
  );
}

export function StatusActionModal({ visible, type, reservation, C, onClose, onStatusChange, onPaymentChange }: {
  visible: boolean; type: 'status' | 'payment'; reservation: Reservation | null; C: any;
  onClose: () => void; onStatusChange: (id: string, s: string) => void; onPaymentChange: (id: string, s: string) => void;
}) {
  if (!visible || !reservation) return null;
  const statusOpts = [
    { value: 'pending', label: 'En attente', icon: 'time', color: '#F59E0B' },
    { value: 'pending_cash', label: 'Especes en attente', icon: 'cash', color: '#D97706' },
    { value: 'confirmed', label: 'Confirmee', icon: 'checkmark-circle', color: '#10B981' },
    { value: 'active', label: 'Active', icon: 'car', color: '#1E3A8A' },
    { value: 'completed', label: 'Terminee', icon: 'checkmark-done', color: '#6B7280' },
    { value: 'cancelled', label: 'Annulee', icon: 'close-circle', color: '#EF4444' },
  ];
  const paymentOpts = [
    { value: 'unpaid', label: 'Non paye', icon: 'close-circle', color: '#EF4444' },
    { value: 'pending', label: 'En attente', icon: 'time', color: '#F59E0B' },
    { value: 'paid', label: 'Paye', icon: 'checkmark-circle', color: '#10B981' },
    { value: 'refunded', label: 'Rembourse', icon: 'return-down-back', color: '#6B7280' },
  ];
  const opts = type === 'status' ? statusOpts : paymentOpts;
  const currentVal = type === 'status' ? reservation.status : reservation.payment_status;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={st.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[st.modalBox, { backgroundColor: C.card }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: C.text }}>
              {type === 'status' ? 'Statut de reservation' : 'Statut de paiement'}
            </Text>
            <TouchableOpacity onPress={onClose} data-testid="close-action-modal"><Ionicons name="close" size={22} color={C.text} /></TouchableOpacity>
          </View>
          <Text style={{ fontSize: 13, color: C.textLight }}>{reservation.user_name} - {reservation.vehicle_name}</Text>
          <Text style={{ fontSize: 13, color: C.textLight, marginBottom: 2 }}>CHF {reservation.total_price.toFixed(2)}</Text>
          <View style={{ marginTop: 16, gap: 8 }}>
            {opts.map(opt => (
              <TouchableOpacity key={opt.value}
                style={[st.optBtn, { borderColor: currentVal === opt.value ? opt.color : C.border, backgroundColor: currentVal === opt.value ? opt.color + '18' : 'transparent' }]}
                onPress={() => { type === 'status' ? onStatusChange(reservation.id, opt.value) : onPaymentChange(reservation.id, opt.value); onClose(); }}
                data-testid={`${type === 'status' ? 'status' : 'payment'}-${opt.value}`}>
                <Ionicons name={opt.icon as any} size={18} color={opt.color} />
                <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: opt.color }}>{opt.label}</Text>
                {currentVal === opt.value && <Ionicons name="checkmark" size={16} color={opt.color} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

export function DateFilterModal({ visible, C, onClose, onApply, onClear }: {
  visible: boolean; C: any; onClose: () => void;
  onApply: (start: string, end: string, type: string) => void; onClear: () => void;
}) {
  const [start, setStart] = React.useState('');
  const [end, setEnd] = React.useState('');
  const [filterType, setFilterType] = React.useState<'rental' | 'created'>('rental');

  const quickSet = (daysBack: number) => {
    const today = new Date();
    const from = daysBack === 0 ? today : new Date(today.getTime() - daysBack * 86400000);
    setStart(format(from, 'yyyy-MM-dd'));
    setEnd(format(today, 'yyyy-MM-dd'));
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: C.text }}>Filtrer par date</Text>
          <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={C.text} /></TouchableOpacity>
        </View>
        <ScrollView style={{ flex: 1, padding: 20 }}>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
            {[{ val: 'rental' as const, icon: 'car', label: 'Periode de location' }, { val: 'created' as const, icon: 'time', label: 'Date de creation' }].map(o => (
              <TouchableOpacity key={o.val}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 12, backgroundColor: filterType === o.val ? C.accent : C.card, borderWidth: 2, borderColor: C.accent, gap: 8 }}
                onPress={() => setFilterType(o.val)}>
                <Ionicons name={o.icon as any} size={20} color={filterType === o.val ? '#fff' : C.accent} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: filterType === o.val ? '#fff' : C.accent }}>{o.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ backgroundColor: C.card, borderRadius: 12, padding: 16, marginBottom: 24 }}>
            {[{ label: 'Date de debut', val: start, set: setStart }, { label: 'Date de fin', val: end, set: setEnd }].map((f, i) => (
              <View key={i} style={{ marginBottom: i === 0 ? 16 : 0 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 8 }}>{f.label}</Text>
                <TextInput style={{ backgroundColor: C.bg, borderRadius: 10, padding: 14, fontSize: 16, color: C.text, borderWidth: 1, borderColor: C.border }}
                  value={f.val} onChangeText={f.set} placeholder="AAAA-MM-JJ" placeholderTextColor={C.textLight} />
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
            {[{ label: "Aujourd'hui", d: 0 }, { label: '7 derniers jours', d: 7 }, { label: '30 derniers jours', d: 30 }].map(q => (
              <TouchableOpacity key={q.label} style={{ backgroundColor: C.card, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: C.border }}
                onPress={() => quickSet(q.d)}>
                <Text style={{ fontSize: 13, color: C.text, fontWeight: '500' }}>{q.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
        <View style={{ flexDirection: 'row', padding: 20, gap: 12, backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border }}>
          <TouchableOpacity style={{ flex: 1, padding: 14, borderRadius: 12, backgroundColor: C.bg, alignItems: 'center' }} onPress={() => { onClear(); onClose(); }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: C.textLight }}>Effacer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ flex: 2, flexDirection: 'row', padding: 14, borderRadius: 12, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', gap: 8 }}
            onPress={() => { if (start && end) { onApply(start, end, filterType); onClose(); } }}>
            <Ionicons name="checkmark" size={20} color="#fff" />
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>Appliquer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  resId: { fontSize: 14, fontWeight: '700' },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  datesSection: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 12, marginBottom: 14 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { borderRadius: 16, padding: 24, width: 360, maxWidth: '90%' },
  optBtn: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, gap: 10 },
});
