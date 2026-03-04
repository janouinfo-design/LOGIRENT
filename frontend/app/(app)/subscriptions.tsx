import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../../src/theme/constants';
import { getPlans, getCurrentSubscription } from '../../src/services/api';

export default function SubscriptionsScreen() {
  const [plans, setPlans] = useState<any[]>([]);
  const [current, setCurrent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getPlans(), getCurrentSubscription()])
      .then(([p, c]) => { setPlans(p.data); setCurrent(c.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const PLAN_COLORS: Record<string, string> = { basic: '#94A3B8', pro: colors.primary, enterprise: '#F59E0B' };
  const PLAN_ICONS: Record<string, string> = { basic: 'star-outline', pro: 'star-half', enterprise: 'star' };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Abonnement</Text>

      {current && (
        <View style={styles.currentCard}>
          <View style={styles.currentHeader}>
            <MaterialIcons name="verified" size={28} color={colors.primary} />
            <View>
              <Text style={styles.currentPlan}>Plan {current.plan.charAt(0).toUpperCase() + current.plan.slice(1)}</Text>
              <Text style={styles.currentStatus}>Statut: {current.status === 'active' ? 'Actif' : current.status}</Text>
            </View>
          </View>
          <View style={styles.currentMeta}>
            <View style={styles.metaItem}><Text style={styles.metaValue}>{current.employees}</Text><Text style={styles.metaLabel}>Employes</Text></View>
            <View style={styles.metaItem}><Text style={styles.metaValue}>{current.next_billing}</Text><Text style={styles.metaLabel}>Prochain paiement</Text></View>
          </View>
        </View>
      )}

      {loading ? <ActivityIndicator size="large" color={colors.primary} /> : (
        <View style={styles.plansRow}>
          {plans.map(plan => {
            const isActive = current?.plan === plan.id;
            const col = PLAN_COLORS[plan.id] || colors.primary;
            return (
              <View key={plan.id} style={[styles.planCard, isActive && { borderColor: col, borderWidth: 2 }]}>
                {isActive && <View style={[styles.activeBadge, { backgroundColor: col }]}><Text style={styles.activeBadgeText}>Actuel</Text></View>}
                <MaterialIcons name={(PLAN_ICONS[plan.id] || 'star') as any} size={36} color={col} />
                <Text style={styles.planName}>{plan.name}</Text>
                <View style={styles.priceRow}>
                  <Text style={[styles.planPrice, { color: col }]}>{plan.price}</Text>
                  <Text style={styles.planCurrency}>{plan.currency}</Text>
                </View>
                <Text style={styles.planPer}>/{plan.per}</Text>
                <View style={styles.featureList}>
                  {plan.features.map((f: string, i: number) => (
                    <View key={i} style={styles.featureRow}>
                      <MaterialIcons name="check" size={16} color={col} />
                      <Text style={styles.featureText}>{f}</Text>
                    </View>
                  ))}
                </View>
                <Pressable style={[styles.selectBtn, { backgroundColor: isActive ? '#E5E7EB' : col }]} disabled={isActive}>
                  <Text style={[styles.selectBtnText, isActive && { color: '#6B7280' }]}>{isActive ? 'Plan actif' : 'Choisir'}</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, marginBottom: spacing.lg },
  currentCard: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.lg, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.primary, borderLeftWidth: 4 },
  currentHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  currentPlan: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text },
  currentStatus: { fontSize: fontSize.sm, color: colors.success, fontWeight: '600' },
  currentMeta: { flexDirection: 'row', gap: spacing.xl },
  metaItem: {},
  metaValue: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  metaLabel: { fontSize: fontSize.xs, color: colors.textLight },
  plansRow: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  planCard: { flex: 1, minWidth: 260, backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  activeBadge: { position: 'absolute', top: 12, right: 12, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  activeBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  planName: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text, marginTop: spacing.sm },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: spacing.xs },
  planPrice: { fontSize: 40, fontWeight: '900' },
  planCurrency: { fontSize: fontSize.md, fontWeight: '600', color: colors.textLight, marginLeft: 4 },
  planPer: { fontSize: fontSize.sm, color: colors.textLight, marginBottom: spacing.md },
  featureList: { gap: spacing.sm, width: '100%', marginBottom: spacing.lg },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  featureText: { fontSize: fontSize.sm, color: colors.text },
  selectBtn: { paddingVertical: 12, paddingHorizontal: spacing.xl, borderRadius: borderRadius.md, width: '100%', alignItems: 'center' },
  selectBtnText: { color: '#FFF', fontSize: fontSize.md, fontWeight: '700' },
});
