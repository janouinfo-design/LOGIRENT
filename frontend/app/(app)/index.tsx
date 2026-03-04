import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { colors, fontSize, spacing, borderRadius } from '../../src/theme/constants';
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
  const [actionLoading, setActionLoading] = useState('');
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

  useEffect(() => { loadData(); }, [loadData]);

  const handleAction = async (action: string) => {
    setActionLoading(action);
    try {
      if (action === 'clockin') await clockIn({});
      else if (action === 'clockout') await clockOut({});
      else if (action === 'break') {
        if (current?.on_break) await endBreak();
        else await startBreak();
      }
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erreur');
    } finally {
      setActionLoading('');
    }
  };

  const formatTime = (d: Date) =>
    `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;

  const formatDate = (d: Date) => {
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const getElapsedTime = () => {
    if (!current?.active || !current.entry) return '00:00:00';
    const start = new Date(current.entry.clock_in).getTime();
    const elapsed = Math.floor((now.getTime() - start) / 1000);
    const h = Math.floor(elapsed / 3600);
    const m = Math.floor((elapsed % 3600) / 60);
    const s = elapsed % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isActive = current?.active || false;
  const isOnBreak = current?.on_break || false;
  const isManager = user?.role === 'manager' || user?.role === 'admin';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Bonjour, {user?.first_name}</Text>
          <Text style={styles.dateText}>{formatDate(now)}</Text>
        </View>
        <View style={styles.liveClockBox}>
          <Text style={styles.liveClockText}>{formatTime(now)}</Text>
        </View>
      </View>

      {/* Pointage Card - New Design */}
      <View style={styles.punchCard} data-testid="clock-section">
        {/* Status + Timer */}
        <View style={styles.timerSection}>
          <View style={styles.timerLeft}>
            <View style={[styles.statusIndicator, isActive ? (isOnBreak ? styles.statusBreak : styles.statusOn) : styles.statusOff]}>
              <MaterialIcons
                name={isActive ? (isOnBreak ? 'pause' : 'play-arrow') : 'power-settings-new'}
                size={28}
                color="#FFF"
              />
            </View>
            <View style={styles.statusTextContainer}>
              <Text style={styles.statusTitle}>
                {isActive ? (isOnBreak ? 'En pause' : 'En service') : 'Hors service'}
              </Text>
              <Text style={styles.statusSubtitle}>
                {isActive
                  ? `Depuis ${new Date(current!.entry!.clock_in).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' })}`
                  : 'Pointez pour commencer'}
              </Text>
            </View>
          </View>
          <View style={styles.timerRight}>
            <Text style={[styles.timerText, isActive && styles.timerTextActive]}>
              {getElapsedTime()}
            </Text>
            <Text style={styles.timerLabel}>Temps écoulé</Text>
          </View>
        </View>

        {/* Shift Details - Always visible */}
        <View style={styles.shiftDetails}>
          <View style={styles.shiftItem}>
            <MaterialIcons name="login" size={18} color={colors.textLight} />
            <View style={styles.shiftItemText}>
              <Text style={styles.shiftLabel}>Arrivée</Text>
              <Text style={styles.shiftValue}>
                {isActive ? new Date(current!.entry!.clock_in).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
              </Text>
            </View>
          </View>
          <View style={styles.shiftDivider} />
          <View style={styles.shiftItem}>
            <MaterialIcons name="schedule" size={18} color={colors.textLight} />
            <View style={styles.shiftItemText}>
              <Text style={styles.shiftLabel}>Heures</Text>
              <Text style={styles.shiftValue}>
                {isActive ? `${current!.entry!.total_hours.toFixed(1)}h` : '0.0h'}
              </Text>
            </View>
          </View>
          <View style={styles.shiftDivider} />
          <View style={styles.shiftItem}>
            <MaterialIcons name="free-breakfast" size={18} color={colors.textLight} />
            <View style={styles.shiftItemText}>
              <Text style={styles.shiftLabel}>Pause</Text>
              <Text style={styles.shiftValue}>
                {isActive ? `${current!.entry!.break_hours.toFixed(1)}h` : '0.0h'}
              </Text>
            </View>
          </View>
          <View style={styles.shiftDivider} />
          <View style={styles.shiftItem}>
            <MaterialIcons name="folder-open" size={18} color={colors.textLight} />
            <View style={styles.shiftItemText}>
              <Text style={styles.shiftLabel}>Projet</Text>
              <Text style={styles.shiftValue} numberOfLines={1}>
                {isActive && current!.entry!.project_name ? current!.entry!.project_name : 'Aucun'}
              </Text>
            </View>
          </View>
        </View>

        {/* 3 Action Buttons - Always visible */}
        <View style={styles.actionButtons}>
          {/* Pointer l'arrivée */}
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnGreen, isActive && styles.actionBtnDisabled]}
            onPress={() => handleAction('clockin')}
            disabled={isActive || actionLoading !== ''}
            data-testid="clock-in-button"
          >
            {actionLoading === 'clockin' ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <MaterialIcons name="login" size={24} color={isActive ? 'rgba(255,255,255,0.5)' : '#FFF'} />
            )}
            <Text style={[styles.actionBtnLabel, isActive && styles.actionBtnLabelDisabled]}>
              Arrivée
            </Text>
          </TouchableOpacity>

          {/* Pause */}
          <TouchableOpacity
            style={[
              styles.actionBtn,
              styles.actionBtnOrange,
              !isActive && styles.actionBtnDisabled,
              isOnBreak && styles.actionBtnOrangeActive,
            ]}
            onPress={() => handleAction('break')}
            disabled={!isActive || actionLoading !== ''}
            data-testid="break-button"
          >
            {actionLoading === 'break' ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <MaterialIcons
                name={isOnBreak ? 'play-arrow' : 'pause'}
                size={24}
                color={!isActive ? 'rgba(255,255,255,0.5)' : '#FFF'}
              />
            )}
            <Text style={[styles.actionBtnLabel, !isActive && styles.actionBtnLabelDisabled]}>
              {isOnBreak ? 'Reprendre' : 'Pause'}
            </Text>
          </TouchableOpacity>

          {/* Pointer le départ */}
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnRed, !isActive && styles.actionBtnDisabled]}
            onPress={() => handleAction('clockout')}
            disabled={!isActive || actionLoading !== ''}
            data-testid="clock-out-button"
          >
            {actionLoading === 'clockout' ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <MaterialIcons name="logout" size={24} color={!isActive ? 'rgba(255,255,255,0.5)' : '#FFF'} />
            )}
            <Text style={[styles.actionBtnLabel, !isActive && styles.actionBtnLabelDisabled]}>
              Départ
            </Text>
          </TouchableOpacity>
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
              <View style={styles.statusBadge}>
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
  container: { flex: 1, backgroundColor: colors.background },
  contentContainer: { padding: spacing.lg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  greeting: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  dateText: { fontSize: fontSize.sm, color: colors.textLight, marginTop: 2 },
  liveClockBox: {
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  liveClockText: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: '#FFF',
    fontVariant: ['tabular-nums'],
  },

  /* Punch Card */
  punchCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },

  timerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  timerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  statusIndicator: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusOn: { backgroundColor: colors.success },
  statusOff: { backgroundColor: '#94A3B8' },
  statusBreak: { backgroundColor: colors.warning },
  statusTextContainer: {},
  statusTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  statusSubtitle: { fontSize: fontSize.sm, color: colors.textLight, marginTop: 2 },

  timerRight: { alignItems: 'flex-end' },
  timerText: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textLight,
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  timerTextActive: { color: colors.text },
  timerLabel: { fontSize: fontSize.xs, color: colors.textLight, marginTop: 2 },

  /* Shift Details */
  shiftDetails: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  shiftItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  shiftItemText: {},
  shiftLabel: { fontSize: fontSize.xs, color: colors.textLight, textTransform: 'uppercase' },
  shiftValue: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  shiftDivider: { width: 1, backgroundColor: colors.border, marginHorizontal: spacing.sm },

  /* Action Buttons */
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  actionBtnGreen: { backgroundColor: '#10B981' },
  actionBtnOrange: { backgroundColor: '#F59E0B' },
  actionBtnOrangeActive: { backgroundColor: '#D97706' },
  actionBtnRed: { backgroundColor: '#EF4444' },
  actionBtnDisabled: { opacity: 0.35 },
  actionBtnLabel: {
    color: '#FFF',
    fontSize: fontSize.sm,
    fontWeight: '700',
    marginTop: 2,
  },
  actionBtnLabelDisabled: { color: 'rgba(255,255,255,0.6)' },

  /* Stats Grid */
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
    borderWidth: 1,
    borderColor: colors.border,
  },
  statCardBlue: { borderLeftWidth: 4, borderLeftColor: colors.primary },
  statCardGreen: { borderLeftWidth: 4, borderLeftColor: colors.success },
  statCardYellow: { borderLeftWidth: 4, borderLeftColor: colors.warning },
  statCardRed: { borderLeftWidth: 4, borderLeftColor: colors.error },
  statValue: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.text, marginBottom: spacing.xs },
  statLabel: { fontSize: fontSize.sm, color: colors.textLight },
  progressBar: { height: 6, backgroundColor: colors.borderLight, borderRadius: 3, marginTop: spacing.sm, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },

  sectionTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  section: { marginBottom: spacing.lg },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  entryInfo: { flex: 1 },
  entryName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  entryDate: { fontSize: fontSize.sm, color: colors.textLight },
  entryHours: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, marginRight: spacing.md },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.warningLight,
  },
  statusBadgeText: { fontSize: fontSize.xs, fontWeight: '600', color: '#92400E' },
});
