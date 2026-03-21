import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PricingTier {
  id: string;
  name: string;
  kilometers: number | null;
  price: number;
  period: string;
  active: boolean;
}

interface Props {
  tiers: PricingTier[];
  C: any;
  selectedTierId?: string | null;
  onSelectTier?: (tierId: string | null) => void;
  defaultPrice?: number;
  totalDays?: number;
}

const periodLabel = (p: string) => {
  const map: Record<string, string> = { jour: '/jour', weekend: '/weekend', semaine: '/semaine', mois: '/mois', custom: '' };
  return map[p] || '';
};

export const VehiclePricingDisplay = ({ tiers, C, selectedTierId, onSelectTier, defaultPrice, totalDays }: Props) => {
  const activeTiers = tiers.filter(t => t.active);
  if (activeTiers.length === 0) return null;

  const selectable = !!onSelectTier;

  return (
    <View style={[st.container, { backgroundColor: C.card, borderColor: C.border }]} data-testid="pricing-display">
      <View style={st.header}>
        <Ionicons name="pricetags" size={16} color={C.accent} />
        <Text style={[st.title, { color: C.text }]}>Tarifs & Forfaits</Text>
        {selectable && <Text style={{ color: C.textLight, fontSize: 11 }}>Selectionnez un forfait</Text>}
      </View>

      {/* Default price option (no tier) */}
      {selectable && defaultPrice != null && totalDays != null && (
        <TouchableOpacity
          style={[st.tierRow, {
            borderColor: !selectedTierId ? C.accent : C.border,
            backgroundColor: !selectedTierId ? C.accent + '10' : 'transparent',
          }]}
          onPress={() => onSelectTier?.(null)}
          data-testid="pricing-default"
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
            <View style={[st.radio, { borderColor: !selectedTierId ? C.accent : C.border }]}>
              {!selectedTierId && <View style={[st.radioInner, { backgroundColor: C.accent }]} />}
            </View>
            <View>
              <Text style={[st.tierName, { color: C.text }]}>Tarif standard</Text>
              <Text style={{ color: C.textLight, fontSize: 11 }}>{totalDays} jour{totalDays > 1 ? 's' : ''} x CHF {(defaultPrice / totalDays).toFixed(0)}/jour</Text>
            </View>
          </View>
          <Text style={[st.price, { color: !selectedTierId ? C.accent : C.text }]}>CHF {defaultPrice.toFixed(0)}</Text>
        </TouchableOpacity>
      )}

      {activeTiers.map((tier, i) => {
        const isSelected = selectedTierId === tier.id;
        return (
          <TouchableOpacity
            key={tier.id}
            style={[st.tierRow, {
              borderColor: isSelected ? C.accent : C.border,
              backgroundColor: isSelected ? C.accent + '10' : i % 2 === 0 ? 'transparent' : C.bg,
            }]}
            onPress={() => selectable ? onSelectTier?.(tier.id) : null}
            activeOpacity={selectable ? 0.7 : 1}
            data-testid={`pricing-tier-${i}`}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              {selectable && (
                <View style={[st.radio, { borderColor: isSelected ? C.accent : C.border }]}>
                  {isSelected && <View style={[st.radioInner, { backgroundColor: C.accent }]} />}
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={[st.tierName, { color: C.text }]}>{tier.name}</Text>
                {tier.kilometers && <Text style={{ color: C.textLight, fontSize: 11 }}>{tier.kilometers} km inclus</Text>}
              </View>
            </View>
            <Text style={[st.price, { color: isSelected ? C.accent : C.text }]}>
              CHF {tier.price.toFixed(0)}{periodLabel(tier.period)}
            </Text>
          </TouchableOpacity>
        );
      })}

      {selectable && selectedTierId && (
        <View style={[st.selectedBanner, { backgroundColor: C.accent + '15' }]}>
          <Ionicons name="checkmark-circle" size={16} color={C.accent} />
          <Text style={{ color: C.accent, fontSize: 12, fontWeight: '600' }}>
            Forfait selectionne : {activeTiers.find(t => t.id === selectedTierId)?.name}
          </Text>
        </View>
      )}
    </View>
  );
};

const st = StyleSheet.create({
  container: { borderRadius: 12, borderWidth: 1, overflow: 'hidden', marginTop: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  title: { fontSize: 15, fontWeight: '700', flex: 1 },
  tierRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 0.5, borderWidth: 1, borderRadius: 8, marginHorizontal: 6, marginVertical: 3 },
  tierName: { fontSize: 14, fontWeight: '600' },
  price: { fontSize: 15, fontWeight: '800' },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  selectedBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, marginTop: 4 },
});
