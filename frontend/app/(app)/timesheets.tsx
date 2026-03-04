import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { colors, fontSize, spacing, borderRadius, shadows } from '../../src/theme/constants';
import { getTimeEntries, approveEntry, rejectEntry, approveAllEntries } from '../../src/services/api';

export default function TimesheetsScreen() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const isManager = user?.role === 'manager' || user?.role === 'admin';

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filter !== 'all') params.status = filter;
      const res = await getTimeEntries(params);
      setEntries(res.data);
    } catch (err) {
      console.log('Error loading entries:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const handleApprove = async (id: string) => {
    try {
      await approveEntry(id);
      await loadEntries();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erreur');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectEntry(id);
      await loadEntries();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erreur');
    }
  };

  const handleApproveAll = async () => {
    try {
      await approveAllEntries();
      await loadEntries();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erreur');
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'approved': return { bg: colors.successLight, text: '#065F46' };
      case 'rejected': return { bg: colors.errorLight, text: '#991B1B' };
      case 'pending': return { bg: colors.warningLight, text: '#92400E' };
      default: return { bg: colors.borderLight, text: colors.textLight };
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'approved': return 'Approuvé';
      case 'rejected': return 'Refusé';
      case 'pending': return 'En attente';
      default: return status;
    }
  };

  const filters = [
    { key: 'all', label: 'Tous' },
    { key: 'pending', label: 'En attente' },
    { key: 'approved', label: 'Approuvés' },
    { key: 'rejected', label: 'Refusés' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Feuilles de temps</Text>
        {isManager && (
          <TouchableOpacity style={styles.approveAllBtn} onPress={handleApproveAll} data-testid="approve-all-button">
            <Text style={styles.approveAllBtnText}>Tout approuver</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterRow}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterBtnText, filter === f.key && styles.filterBtnTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : entries.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Aucune feuille de temps trouvée</Text>
        </View>
      ) : (
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            {isManager && <Text style={[styles.th, { flex: 2 }]}>Employé</Text>}
            <Text style={[styles.th, { flex: 1.5 }]}>Date</Text>
            <Text style={[styles.th, { flex: 1 }]}>Arrivée</Text>
            <Text style={[styles.th, { flex: 1 }]}>Départ</Text>
            <Text style={[styles.th, { flex: 1 }]}>Durée</Text>
            <Text style={[styles.th, { flex: 1 }]}>Projet</Text>
            <Text style={[styles.th, { flex: 1 }]}>Statut</Text>
            {isManager && <Text style={[styles.th, { flex: 1.5 }]}>Actions</Text>}
          </View>

          {entries.map((entry) => {
            const sc = statusColor(entry.status);
            return (
              <View key={entry.id} style={styles.tableRow}>
                {isManager && <Text style={[styles.td, { flex: 2 }]}>{entry.user_name}</Text>}
                <Text style={[styles.td, { flex: 1.5 }]}>{entry.date}</Text>
                <Text style={[styles.td, { flex: 1 }]}>
                  {entry.clock_in ? new Date(entry.clock_in).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' }) : '-'}
                </Text>
                <Text style={[styles.td, { flex: 1 }]}>
                  {entry.clock_out ? new Date(entry.clock_out).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' }) : '-'}
                </Text>
                <Text style={[styles.td, { flex: 1, fontWeight: '600' }]}>{entry.duration.toFixed(1)}h</Text>
                <Text style={[styles.td, { flex: 1 }]}>{entry.project_name || '-'}</Text>
                <View style={[styles.td, { flex: 1 }]}>
                  <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.badgeText, { color: sc.text }]}>{statusLabel(entry.status)}</Text>
                  </View>
                </View>
                {isManager && (
                  <View style={[styles.td, { flex: 1.5, flexDirection: 'row', gap: 8 }]}>
                    {entry.status === 'pending' && (
                      <>
                        <TouchableOpacity
                          style={styles.actionBtnApprove}
                          onPress={() => handleApprove(entry.id)}
                          data-testid={`approve-${entry.id}`}
                        >
                          <Text style={styles.actionBtnText}>\u2713</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionBtnReject}
                          onPress={() => handleReject(entry.id)}
                          data-testid={`reject-${entry.id}`}
                        >
                          <Text style={styles.actionBtnText}>\u2717</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                )}
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
  contentContainer: { padding: spacing.lg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  approveAllBtn: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  approveAllBtnText: { color: '#FFF', fontSize: fontSize.sm, fontWeight: '600' },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  filterBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterBtnText: { fontSize: fontSize.sm, color: colors.textLight },
  filterBtnTextActive: { color: '#FFF', fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyText: { fontSize: fontSize.md, color: colors.textLight },
  table: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    ...shadows.sm,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.borderLight,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
  },
  th: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.textLight,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  td: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  badgeText: { fontSize: fontSize.xs, fontWeight: '600' },
  actionBtnApprove: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnReject: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: { fontSize: fontSize.md, fontWeight: '700' },
});
