import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
}

const periodLabel = (p: string) => {
  const map: Record<string, string> = { jour: '/jour', weekend: '/weekend', semaine: '/semaine', mois: '/mois', custom: '' };
  return map[p] || '';
};

export const VehiclePricingDisplay = ({ tiers, C }: Props) => {
  const activeTiers = tiers.filter(t => t.active);
  if (activeTiers.length === 0) return null;

  return (
    <View style={[st.container, { backgroundColor: C.card, borderColor: C.border }]} data-testid="pricing-display">
      <View style={st.header}>
        <Ionicons name="pricetags" size={16} color={C.accent} />
        <Text style={[st.title, { color: C.text }]}>Tarifs & Forfaits</Text>
      </View>
      <View style={st.table}>
        {activeTiers.map((tier, i) => (
          <View key={tier.id} style={[st.row, { borderBottomColor: C.border, backgroundColor: i % 2 === 0 ? 'transparent' : C.bg }]} data-testid={`pricing-row-${i}`}>
            <View style={{ flex: 3 }}>
              <Text style={[st.tierName, { color: C.text }]}>{tier.name}</Text>
            </View>
            {tier.kilometers && (
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={[st.km, { color: C.textLight }]}>{tier.kilometers} km</Text>
              </View>
            )}
            <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
              <Text style={[st.price, { color: C.accent }]}>
                CHF {tier.price.toFixed(0)}{periodLabel(tier.period)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const st = StyleSheet.create({
  container: { borderRadius: 12, borderWidth: 1, overflow: 'hidden', marginTop: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  title: { fontSize: 15, fontWeight: '700' },
  table: { paddingHorizontal: 4 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 10, borderBottomWidth: 0.5 },
  tierName: { fontSize: 14, fontWeight: '600' },
  km: { fontSize: 12, fontWeight: '500' },
  price: { fontSize: 15, fontWeight: '800' },
});
