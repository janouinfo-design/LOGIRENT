import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator, Platform } from 'react-native';
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

      {/* Pointage Card */}
      <View style={styles.punchCard} testID="clock-section">
        {/* Status + Timer Row */}
        <View style={styles.timerRow}>
          <View style={styles.timerLeft}>
            <View style={[styles.statusDot, isActive ? (isOnBreak ? styles.dotBreak : styles.dotOn) : styles.dotOff]}>
              <MaterialIcons
                name={isActive ? (isOnBreak ? 'pause' : 'play-arrow') : 'power-settings-new'}
                size={22}
                color="#FFF"
              />
            </View>
            <View>
              <Text style={styles.statusTitle}>
                {isActive ? (isOnBreak ? 'En pause' : 'En service') : 'Hors service'}
              </Text>
              <Text style={styles.statusSub}>
                {isActive
                  ? `Depuis ${new Date(current!.entry!.clock_in).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' })}`
                  : 'Pointez pour commencer votre journée'}
              </Text>
            </View>
          </View>
          <View style={styles.timerRight}>
            <Text style={[styles.timerText, isActive && styles.timerTextLive]}>
              {getElapsedTime()}
            </Text>
          </View>
        </View>

        {/* Shift Info Grid - 2x2 on small, 4-col on large */}
        <View style={styles.shiftGrid}>
          <View style={styles.shiftCell}>
            <MaterialIcons name="login" size={20} color={colors.primary} />
            <Text style={styles.shiftCellLabel}>Arrivée</Text>
            <Text style={styles.shiftCellValue}>
              {isActive ? new Date(current!.entry!.clock_in).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
            </Text>
          </View>
          <View style={styles.shiftCell}>
            <MaterialIcons name="schedule" size={20} color={colors.success} />
            <Text style={styles.shiftCellLabel}>Heures</Text>
            <Text style={styles.shiftCellValue}>
              {isActive ? `${current!.entry!.total_hours.toFixed(1)}h` : '0.0h'}
            </Text>
          </View>
          <View style={styles.shiftCell}>
            <MaterialIcons name="free-breakfast" size={20} color={colors.warning} />
            <Text style={styles.shiftCellLabel}>Pause</Text>
            <Text style={styles.shiftCellValue}>
              {isActive ? `${current!.entry!.break_hours.toFixed(1)}h` : '0.0h'}
            </Text>
          </View>
          <View style={styles.shiftCell}>
            <MaterialIcons name="folder-open" size={20} color="#8B5CF6" />
            <Text style={styles.shiftCellLabel}>Projet</Text>
            <Text style={styles.shiftCellValue} numberOfLines={1}>
              {isActive && current!.entry!.project_name ? current!.entry!.project_name : 'Aucun'}
            </Text>
          </View>
        </View>

        {/* 3 Action Buttons - Always visible, high contrast */}
        <View style={styles.actionRow}>
          {/* Arrivée */}
          <Pressable
            style={[styles.actionBtn, isActive ? styles.btnGreenDisabled : styles.btnGreen]}
            onPress={() => handleAction('clockin')}
            disabled={isActive || actionLoading !== ''}
            testID="clock-in-button"
          >
            {actionLoading === 'clockin' ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <MaterialIcons name="login" size={26} color={isActive ? '#9CA3AF' : '#FFF'} />
            )}
            <Text style={[styles.actionLabel, isActive && styles.actionLabelDisabled]}>
              Arrivée
            </Text>
          </Pressable>

          {/* Pause */}
          <Pressable
            style={[styles.actionBtn, !isActive ? styles.btnOrangeDisabled : (isOnBreak ? styles.btnOrangeActive : styles.btnOrange)]}
            onPress={() => handleAction('break')}
            disabled={!isActive || actionLoading !== ''}
            testID="break-button"
          >
            {actionLoading === 'break' ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <MaterialIcons
                name={isOnBreak ? 'play-arrow' : 'pause'}
                size={26}
                color={!isActive ? '#9CA3AF' : '#FFF'}
              />
            )}
            <Text style={[styles.actionLabel, !isActive && styles.actionLabelDisabled]}>
              {isOnBreak ? 'Reprendre' : 'Pause'}
            </Text>
          </Pressable>

          {/* Départ */}
          <Pressable
            style={[styles.actionBtn, !isActive ? styles.btnRedDisabled : styles.btnRed]}
            onPress={() => handleAction('clockout')}
            disabled={!isActive || actionLoading !== ''}
            testID="clock-out-button"
          >
            {actionLoading === 'clockout' ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <MaterialIcons name="logout" size={26} color={!isActive ? '#9CA3AF' : '#FFF'} />
            )}
            <Text style={[styles.actionLabel, !isActive && styles.actionLabelDisabled]}>
              Départ
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Weekly Stats */}
      {weekStats && (
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{weekStats.total_hours.toFixed(1)}h</Text>
            <Text style={styles.statLabel}>Heures / semaine</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${Math.min(100, (weekStats.total_hours / weekStats.contract_hours) * 100)}%` }]} />
            </View>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{weekStats.billable_hours.toFixed(1)}h</Text>
            <Text style={styles.statLabel}>Facturables</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, weekStats.overtime_hours > 0 && { color: colors.warning }]}>
              {weekStats.overtime_hours.toFixed(1)}h
            </Text>
            <Text style={styles.statLabel}>Supplémentaires</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{weekStats.days_worked}</Text>
            <Text style={styles.statLabel}>Jours travaillés</Text>
          </View>
        </View>
      )}

      {/* Manager Stats */}
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
              <Text style={styles.statLabel}>Absences</Text>
            </View>
          </View>
        </View>
      )}

      {/* Pending Entries */}
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
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>En attente</Text>
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
  contentContainer: { padding: spacing.md },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  /* Header */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  greeting: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  dateText: { fontSize: fontSize.sm, color: colors.textLight, marginTop: 2 },
  liveClockBox: {
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
  },
  liveClockText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: '#FFF',
    fontVariant: ['tabular-nums'],
  },

  /* Punch Card */
  punchCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },

  /* Timer Row */
  timerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  timerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  statusDot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotOn: { backgroundColor: colors.success },
  dotOff: { backgroundColor: '#94A3B8' },
  dotBreak: { backgroundColor: colors.warning },
  statusTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  statusSub: { fontSize: fontSize.xs, color: colors.textLight, marginTop: 1 },

  timerRight: {},
  timerText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#CBD5E1',
    fontVariant: ['tabular-nums'],
  },
  timerTextLive: { color: colors.text },

  /* Shift Info Grid */
  shiftGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  shiftCell: {
    flex: 1,
    minWidth: 100,
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    alignItems: 'center',
    gap: 4,
  },
  shiftCellLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  shiftCellValue: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },

  /* Action Buttons */
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  /* Active button styles - solid, high contrast */
  btnGreen: { backgroundColor: '#059669' },
  btnOrange: { backgroundColor: '#D97706' },
  btnOrangeActive: { backgroundColor: '#B45309' },
  btnRed: { backgroundColor: '#DC2626' },
  /* Disabled button styles - light bg with dark text border */
  btnGreenDisabled: { backgroundColor: '#E5E7EB', borderWidth: 1, borderColor: '#D1D5DB' },
  btnOrangeDisabled: { backgroundColor: '#E5E7EB', borderWidth: 1, borderColor: '#D1D5DB' },
  btnRedDisabled: { backgroundColor: '#E5E7EB', borderWidth: 1, borderColor: '#D1D5DB' },

  actionLabel: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  actionLabelDisabled: {
    color: '#6B7280',
  },

  /* Stats Grid */
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  statCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statCardBlue: { borderLeftWidth: 4, borderLeftColor: colors.primary },
  statCardGreen: { borderLeftWidth: 4, borderLeftColor: colors.success },
  statCardYellow: { borderLeftWidth: 4, borderLeftColor: colors.warning },
  statCardRed: { borderLeftWidth: 4, borderLeftColor: colors.error },
  statValue: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text, marginBottom: 2 },
  statLabel: { fontSize: fontSize.xs, color: colors.textLight },
  progressBar: { height: 5, backgroundColor: colors.borderLight, borderRadius: 3, marginTop: spacing.sm, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },

  sectionTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  section: { marginBottom: spacing.md },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  entryInfo: { flex: 1 },
  entryName: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  entryDate: { fontSize: fontSize.xs, color: colors.textLight },
  entryHours: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text, marginRight: spacing.sm },
  pendingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    backgroundColor: colors.warningLight,
  },
  pendingBadgeText: { fontSize: 10, fontWeight: '600', color: '#92400E' },
});
