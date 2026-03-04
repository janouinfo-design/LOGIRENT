import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { colors, fontSize, spacing, borderRadius, shadows } from '../../src/theme/constants';
import { getCurrentEntry, clockIn, clockOut, startBreak, endBreak, getWeeklyStats, getDashboardStats, getTimeEntries } from '../../src/services/api';

interface CurrentEntry {
  active: boolean;
  on_break?: boolean;
  entry?: {
    id: string;
    clock_in: string;
    clock_out: string | null;
    project_name: string | null;
    activity_name: string | null;
    total_hours: number;
    break_hours: number;
    status: string;
  };
}

interface WeeklyStats {
  total_hours: number;
  billable_hours: number;
  overtime_hours: number;
  contract_hours: number;
  days_worked: number;
}

interface DashboardStats {
  total_employees: number;
  active_today: number;
  pending_entries: number;
  pending_leaves: number;
  billable_hours_month: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [current, setCurrent] = useState<CurrentEntry | null>(null);
  const [weekStats, setWeekStats] = useState<WeeklyStats | null>(null);
  const [dashStats, setDashStats] = useState<DashboardStats | null>(null);
  const [recentEntries, setRecentEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [currentRes, weekRes] = await Promise.all([
        getCurrentEntry(),
        getWeeklyStats(),
      ]);
      setCurrent(currentRes.data);
      setWeekStats(weekRes.data);

      if (user?.role === 'manager' || user?.role === 'admin') {
        const [dashRes, entriesRes] = await Promise.all([
          getDashboardStats(),
          getTimeEntries({ status: 'pending' }),
        ]);
        setDashStats(dashRes.data);
        setRecentEntries(entriesRes.data.slice(0, 5));
      }
    } catch (err) {
      console.log('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleClockIn = async () => {
    setActionLoading(true);
    try {
      await clockIn({});
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erreur');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockOut = async () => {
    setActionLoading(true);
    try {
      await clockOut({});
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erreur');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBreak = async () => {
    setActionLoading(true);
    try {
      if (current?.on_break) {
        await endBreak();
      } else {
        await startBreak();
      }
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erreur');
    } finally {
      setActionLoading(false);
    }
  };

  const formatTime = (d: Date) =>
    `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;

  const formatDate = (d: Date) => {
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isManager = user?.role === 'manager' || user?.role === 'admin';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Bonjour, {user?.first_name}</Text>
          <Text style={styles.dateText}>{formatDate(now)}</Text>
        </View>
        <View style={styles.clock}>
          <Text style={styles.clockText}>{formatTime(now)}</Text>
        </View>
      </View>

      {/* Clock In/Out Section */}
      <View style={styles.clockSection} data-testid="clock-section">
        <View style={styles.clockCard}>
          <View style={styles.clockCardHeader}>
            <Text style={styles.clockCardTitle}>
              {current?.active ? 'En service' : 'Hors service'}
            </Text>
            <View style={[styles.statusDot, current?.active ? styles.statusActive : styles.statusInactive]} />
          </View>

          {current?.active && current.entry && (
            <View style={styles.clockInfo}>
              <View style={styles.clockInfoItem}>
                <Text style={styles.clockInfoLabel}>Début</Text>
                <Text style={styles.clockInfoValue}>
                  {new Date(current.entry.clock_in).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <View style={styles.clockInfoItem}>
                <Text style={styles.clockInfoLabel}>Heures</Text>
                <Text style={styles.clockInfoValue}>{current.entry.total_hours.toFixed(1)}h</Text>
              </View>
              <View style={styles.clockInfoItem}>
                <Text style={styles.clockInfoLabel}>Pause</Text>
                <Text style={styles.clockInfoValue}>{current.entry.break_hours.toFixed(1)}h</Text>
              </View>
              {current.entry.project_name && (
                <View style={styles.clockInfoItem}>
                  <Text style={styles.clockInfoLabel}>Projet</Text>
                  <Text style={styles.clockInfoValue}>{current.entry.project_name}</Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.clockActions}>
            {!current?.active ? (
              <TouchableOpacity
                style={styles.clockInBtn}
                onPress={handleClockIn}
                disabled={actionLoading}
                data-testid="clock-in-button"
              >
                {actionLoading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.clockBtnText}>Pointer l'arrivée</Text>
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.clockBtnRow}>
                <TouchableOpacity
                  style={[styles.breakBtn, current.on_break && styles.breakBtnActive]}
                  onPress={handleBreak}
                  disabled={actionLoading}
                  data-testid="break-button"
                >
                  <Text style={[styles.breakBtnText, current.on_break && styles.breakBtnTextActive]}>
                    {current.on_break ? 'Fin de pause' : 'Pause'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.clockOutBtn}
                  onPress={handleClockOut}
                  disabled={actionLoading}
                  data-testid="clock-out-button"
                >
                  {actionLoading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.clockBtnText}>Pointer le départ</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Weekly Stats */}
      {weekStats && (
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{weekStats.total_hours.toFixed(1)}h</Text>
            <Text style={styles.statLabel}>Heures cette semaine</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${Math.min(100, (weekStats.total_hours / weekStats.contract_hours) * 100)}%` }]} />
            </View>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{weekStats.billable_hours.toFixed(1)}h</Text>
            <Text style={styles.statLabel}>Heures facturables</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, weekStats.overtime_hours > 0 && { color: colors.warning }]}>
              {weekStats.overtime_hours.toFixed(1)}h
            </Text>
            <Text style={styles.statLabel}>Heures supplémentaires</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{weekStats.days_worked}</Text>
            <Text style={styles.statLabel}>Jours travaillés</Text>
          </View>
        </View>
      )}

      {/* Manager Dashboard Stats */}
      {isManager && dashStats && (
        <View>
          <Text style={styles.sectionTitle}>Vue d'ensemble</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, styles.statCardBlue]}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{dashStats.total_employees}</Text>
              <Text style={styles.statLabel}>Employés</Text>
            </View>
            <View style={[styles.statCard, styles.statCardGreen]}>
              <Text style={[styles.statValue, { color: colors.success }]}>{dashStats.active_today}</Text>
              <Text style={styles.statLabel}>Actifs aujourd'hui</Text>
            </View>
            <View style={[styles.statCard, styles.statCardYellow]}>
              <Text style={[styles.statValue, { color: colors.warning }]}>{dashStats.pending_entries}</Text>
              <Text style={styles.statLabel}>En attente</Text>
            </View>
            <View style={[styles.statCard, styles.statCardRed]}>
              <Text style={[styles.statValue, { color: colors.error }]}>{dashStats.pending_leaves}</Text>
              <Text style={styles.statLabel}>Absences en attente</Text>
            </View>
          </View>
        </View>
      )}

      {/* Recent Pending Entries for Managers */}
      {isManager && recentEntries.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pointages en attente</Text>
          {recentEntries.map((entry) => (
            <View key={entry.id} style={styles.entryRow}>
              <View style={styles.entryInfo}>
                <Text style={styles.entryName}>{entry.user_name}</Text>
                <Text style={styles.entryDate}>{entry.date}</Text>
              </View>
              <Text style={styles.entryHours}>{entry.duration.toFixed(1)}h</Text>
              <View style={[styles.statusBadge, styles.statusPending]}>
                <Text style={styles.statusBadgeText}>En attente</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  greeting: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  dateText: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    marginTop: 2,
  },
  clock: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    ...shadows.sm,
  },
  clockText: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  clockSection: {
    marginBottom: spacing.lg,
  },
  clockCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  clockCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  clockCardTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: colors.success,
  },
  statusInactive: {
    backgroundColor: colors.textLight,
  },
  clockInfo: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  clockInfoItem: {},
  clockInfoLabel: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  clockInfoValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  clockActions: {},
  clockInBtn: {
    backgroundColor: colors.success,
    paddingVertical: 16,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  clockOutBtn: {
    flex: 1,
    backgroundColor: colors.error,
    paddingVertical: 16,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  clockBtnText: {
    color: '#FFF',
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  clockBtnRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  breakBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: 16,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.warning,
  },
  breakBtnActive: {
    backgroundColor: colors.warningLight,
  },
  breakBtnText: {
    color: colors.warning,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  breakBtnTextActive: {
    color: '#92400E',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
    flexWrap: 'wrap',
  },
  statCard: {
    flex: 1,
    minWidth: 180,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    ...shadows.sm,
  },
  statCardBlue: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  statCardGreen: {
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  statCardYellow: {
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  statCardRed: {
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  statValue: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textLight,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.borderLight,
    borderRadius: 3,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  entryInfo: {
    flex: 1,
  },
  entryName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  entryDate: {
    fontSize: fontSize.sm,
    color: colors.textLight,
  },
  entryHours: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    marginRight: spacing.md,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusPending: {
    backgroundColor: colors.warningLight,
  },
  statusBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: '#92400E',
  },
});
