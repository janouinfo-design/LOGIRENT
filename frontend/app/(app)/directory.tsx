import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../../src/theme/constants';
import { getDirectory } from '../../src/services/api';

const STATUS_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  office: { icon: 'business', color: '#2563EB', label: 'Au bureau' },
  home: { icon: 'home', color: '#7C3AED', label: 'Teletravail' },
  onsite: { icon: 'construction', color: '#059669', label: 'Sur chantier' },
  vacation: { icon: 'beach-access', color: '#F59E0B', label: 'Vacances' },
  sick: { icon: 'local-hospital', color: '#EF4444', label: 'Maladie' },
  accident: { icon: 'warning', color: '#DC2626', label: 'Accident' },
  training: { icon: 'school', color: '#6366F1', label: 'Formation' },
  maternity: { icon: 'child-friendly', color: '#EC4899', label: 'Maternite' },
  paternity: { icon: 'child-friendly', color: '#8B5CF6', label: 'Paternite' },
  special: { icon: 'event-busy', color: '#F97316', label: 'Conge special' },
  absent: { icon: 'person-off', color: '#94A3B8', label: 'Absent' },
};
const ROLE_LABELS: Record<string, string> = { admin: 'Admin', manager: 'Manager', employee: 'Employe' };

export default function DirectoryScreen() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getDirectory().then(r => setEmployees(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = employees.filter(e => `${e.first_name} ${e.last_name} ${e.email} ${e.department || ''}`.toLowerCase().includes(search.toLowerCase()));
  const active = filtered.filter(e => ['office', 'home', 'onsite'].includes(e.status));
  const absent = filtered.filter(e => !['office', 'home', 'onsite'].includes(e.status));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Annuaire</Text>
      <TextInput style={styles.searchInput} placeholder="Rechercher un employe..." value={search} onChangeText={setSearch} placeholderTextColor={colors.textLight} />

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { borderLeftColor: '#059669' }]}><Text style={[styles.summaryValue, { color: '#059669' }]}>{active.length}</Text><Text style={styles.summaryLabel}>Actifs</Text></View>
        <View style={[styles.summaryCard, { borderLeftColor: '#F59E0B' }]}><Text style={[styles.summaryValue, { color: '#F59E0B' }]}>{absent.length}</Text><Text style={styles.summaryLabel}>Absents</Text></View>
        <View style={[styles.summaryCard, { borderLeftColor: colors.primary }]}><Text style={[styles.summaryValue, { color: colors.primary }]}>{filtered.length}</Text><Text style={styles.summaryLabel}>Total</Text></View>
      </View>

      {loading ? <ActivityIndicator size="large" color={colors.primary} /> : (
        <View style={styles.grid}>
          {filtered.map(emp => {
            const cfg = STATUS_CONFIG[emp.status] || STATUS_CONFIG.absent;
            return (
              <View key={emp.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={[styles.avatar, { backgroundColor: cfg.color + '22' }]}>
                    <Text style={[styles.avatarText, { color: cfg.color }]}>{emp.first_name[0]}{emp.last_name[0]}</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.empName}>{emp.first_name} {emp.last_name}</Text>
                    <Text style={styles.empRole}>{ROLE_LABELS[emp.role] || emp.role}</Text>
                  </View>
                  <View style={[styles.statusDot, { backgroundColor: cfg.color }]} />
                </View>
                <View style={styles.cardDetails}>
                  <View style={styles.detailRow}><MaterialIcons name="email" size={14} color={colors.textLight} /><Text style={styles.detailText}>{emp.email}</Text></View>
                  {emp.phone ? <View style={styles.detailRow}><MaterialIcons name="phone" size={14} color={colors.textLight} /><Text style={styles.detailText}>{emp.phone}</Text></View> : null}
                  {emp.department ? <View style={styles.detailRow}><MaterialIcons name="business" size={14} color={colors.textLight} /><Text style={styles.detailText}>{emp.department}</Text></View> : null}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: cfg.color + '18' }]}>
                  <MaterialIcons name={cfg.icon as any} size={14} color={cfg.color} />
                  <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
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
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  searchInput: { borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: fontSize.md, color: colors.text, marginBottom: spacing.md, backgroundColor: colors.surface },
  summaryRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  summaryCard: { flex: 1, backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 4 },
  summaryValue: { fontSize: fontSize.xl, fontWeight: '800' },
  summaryLabel: { fontSize: fontSize.xs, color: colors.textLight },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, minWidth: 280, flex: 1, maxWidth: '48%', borderWidth: 1, borderColor: colors.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: fontSize.md, fontWeight: '800' },
  cardInfo: { flex: 1 },
  empName: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  empRole: { fontSize: fontSize.xs, color: colors.textLight },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  cardDetails: { gap: 4, marginBottom: spacing.sm },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontSize: fontSize.xs, color: colors.textLight },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start' },
  statusText: { fontSize: 11, fontWeight: '600' },
});
