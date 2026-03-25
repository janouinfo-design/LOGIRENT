import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useFocusEffect } from 'expo-router';
import api from '../../src/services/api';

const C = {
  bg: '#F0F4F8',
  card: '#FFFFFF',
  primary: '#2563EB',
  primaryLight: '#DBEAFE',
  success: '#16A34A',
  successLight: '#DCFCE7',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#DC2626',
  dangerLight: '#FEE2E2',
  orange: '#EA580C',
  orangeLight: '#FFF7ED',
  text: '#1E293B',
  textSec: '#64748B',
  textLight: '#94A3B8',
  border: '#E2E8F0',
  shadow: 'rgba(15,23,42,0.06)',
};

type UserType = { id: string; first_name: string; last_name: string; role: string; contract_hours: number; };
type ProjectType = { id: string; name: string; client_name?: string; };
type EntryType = { active: boolean; on_break?: boolean; entry?: any; };
type WeeklyType = { total_hours: number; billable_hours: number; overtime_hours: number; contract_hours: number; days_worked: number; };
type BalancesType = { vacation_remaining: number; sick_days: number; overtime_hours: number; month_hours: number; month_target: number; };

export default function DashboardScreen() {
  const [user, setUser] = useState<UserType | null>(null);
  const [projects, setProjects] = useState<ProjectType[]>([]);
  const [currentEntry, setCurrentEntry] = useState<EntryType>({ active: false });
  const [weekly, setWeekly] = useState<WeeklyType | null>(null);
  const [balances, setBalances] = useState<BalancesType | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [elapsed, setElapsed] = useState('00:00:00');
  const timerRef = useRef<any>(null);

  const loadData = useCallback(async () => {
    try {
      // api already has auth token set via setAuthToken in AuthContext
      const projRes = await api.get('/projects');
      if (Array.isArray(projRes.data)) {
        setProjects(projRes.data);
        if (projRes.data.length > 0 && !selectedProject) {
          setSelectedProject(projRes.data[0].id);
        }
      }

      const [userRes, entryRes, weekRes, balRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/timeentries/current'),
        api.get('/stats/weekly'),
        api.get('/stats/balances'),
      ]);
      setUser(userRes.data);
      setCurrentEntry(entryRes.data);
      setWeekly(weekRes.data);
      setBalances(balRes.data);
      if (entryRes.data?.entry?.project_id) {
        setSelectedProject(entryRes.data.entry.project_id);
      }
    } catch (e: any) {
      console.error('Dashboard load error:', e?.message || e);
    } finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (currentEntry.active && currentEntry.entry?.clock_in) {
      const updateTimer = () => {
        const clockIn = new Date(currentEntry.entry.clock_in).getTime();
        let diff = Math.floor((Date.now() - clockIn) / 1000);
        if (currentEntry.on_break && currentEntry.entry?.break_start) {
          // don't count break time in display
        }
        const h = Math.floor(diff / 3600);
        const m = Math.floor((diff % 3600) / 60);
        const s = diff % 60;
        setElapsed(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      };
      updateTimer();
      timerRef.current = setInterval(updateTimer, 1000);
    } else {
      setElapsed('00:00:00');
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [currentEntry]);

  const handleClockIn = async () => {
    if (!selectedProject) return;
    setActionLoading(true);
    try {
      await api.post('/timeentries/clock-in', { project_id: selectedProject, billable: true });
      await loadData();
    } catch (e: any) { console.error(e?.response?.data?.detail || e); } finally { setActionLoading(false); }
  };

  const handleClockOut = async () => {
    setActionLoading(true);
    try {
      await api.post('/timeentries/clock-out', { project_id: currentEntry.entry?.project_id, billable: true });
      await loadData();
    } catch (e: any) { console.error(e?.response?.data?.detail || e); } finally { setActionLoading(false); }
  };

  const handleBreakToggle = async () => {
    setActionLoading(true);
    try {
      if (currentEntry.on_break) {
        await api.post('/timeentries/break-end', {});
      } else {
        await api.post('/timeentries/break-start', {});
      }
      await loadData();
    } catch (e: any) { console.error(e?.response?.data?.detail || e); } finally { setActionLoading(false); }
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon apres-midi';
    return 'Bonsoir';
  };

  const getStatusInfo = () => {
    if (!currentEntry.active) return { label: 'Hors ligne', color: C.textLight, bg: C.border };
    if (currentEntry.on_break) return { label: 'En pause', color: C.warning, bg: C.warningLight };
    return { label: 'En cours', color: C.success, bg: C.successLight };
  };

  if (loading) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  const status = getStatusInfo();
  const progressPercent = weekly ? Math.min((weekly.total_hours / weekly.contract_hours) * 100, 100) : 0;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={s.header} data-testid="dashboard-header">
        <View>
          <Text style={s.greeting}>{getGreeting()},</Text>
          <Text style={s.userName}>{user?.first_name} {user?.last_name}</Text>
        </View>
        <View style={[s.statusBadge, { backgroundColor: status.bg }]}>
          <View style={[s.statusDot, { backgroundColor: status.color }]} />
          <Text style={[s.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      {/* Timer Card */}
      <View style={s.timerCard} data-testid="timer-card">
        <Text style={s.timerLabel}>
          {currentEntry.active ? (currentEntry.on_break ? 'Pause en cours' : 'Temps de travail') : 'Pret a commencer'}
        </Text>
        <Text style={[s.timerDisplay, currentEntry.on_break && { color: C.warning }]} data-testid="timer-display">
          {elapsed}
        </Text>
        {currentEntry.active && currentEntry.entry?.project_name && (
          <View style={s.projectTag}>
            <Text style={s.projectTagText}>{currentEntry.entry.project_name}</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={s.actionRow}>
          {!currentEntry.active ? (
            <Pressable
              style={[s.mainBtn, { backgroundColor: C.primary }]}
              onPress={handleClockIn}
              disabled={actionLoading || !selectedProject}
              data-testid="clock-in-btn"
            >
              {actionLoading ? <ActivityIndicator color="#FFF" /> : (
                <>
                  <Text style={s.mainBtnIcon}>&#9654;</Text>
                  <Text style={s.mainBtnText}>Commencer</Text>
                </>
              )}
            </Pressable>
          ) : (
            <>
              <Pressable
                style={[s.actionBtn, { backgroundColor: currentEntry.on_break ? C.success : C.warning }]}
                onPress={handleBreakToggle}
                disabled={actionLoading}
                data-testid="break-toggle-btn"
              >
                {actionLoading ? <ActivityIndicator color="#FFF" size="small" /> : (
                  <>
                    <Text style={s.actionBtnIcon}>{currentEntry.on_break ? '\u25B6' : '\u275A\u275A'}</Text>
                    <Text style={s.actionBtnText}>{currentEntry.on_break ? 'Reprendre' : 'Pause'}</Text>
                  </>
                )}
              </Pressable>
              <Pressable
                style={[s.actionBtn, { backgroundColor: C.danger }]}
                onPress={handleClockOut}
                disabled={actionLoading}
                data-testid="clock-out-btn"
              >
                {actionLoading ? <ActivityIndicator color="#FFF" size="small" /> : (
                  <>
                    <Text style={s.actionBtnIcon}>&#9632;</Text>
                    <Text style={s.actionBtnText}>Terminer</Text>
                  </>
                )}
              </Pressable>
            </>
          )}
        </View>
      </View>

      {/* Project Selector */}
      {!currentEntry.active && (
        <View style={s.sectionCard} testID="project-selector">
          <Text style={s.sectionTitle}>Projet</Text>
          {projects.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingTop: 10 }}>
              {projects.slice(0, 6).map((p) => {
                const isSelected = selectedProject === p.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => setSelectedProject(p.id)}
                    activeOpacity={0.7}
                    style={{
                      display: 'flex',
                      paddingLeft: 16, paddingRight: 16, paddingTop: 8, paddingBottom: 8,
                      borderRadius: 20,
                      backgroundColor: isSelected ? '#DBEAFE' : '#F0F4F8',
                      marginBottom: 8,
                      marginRight: 8,
                      borderWidth: 2,
                      borderColor: isSelected ? '#2563EB' : '#E2E8F0',
                      alignSelf: 'flex-start',
                    }}
                  >
                    <Text style={{
                      fontSize: 13,
                      fontWeight: isSelected ? '600' : '500',
                      color: isSelected ? '#2563EB' : '#64748B',
                    }}>
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <Text style={{ color: C.textLight, marginTop: 8, fontSize: 13 }}>Chargement des projets...</Text>
          )}
        </View>
      )}

      {/* Weekly Progress */}
      <View style={s.sectionCard} data-testid="weekly-progress">
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Semaine en cours</Text>
          <Text style={s.sectionMeta}>{weekly?.days_worked || 0} jours</Text>
        </View>
        <View style={s.progressBarBg}>
          <View style={[s.progressBarFill, { width: `${progressPercent}%` }]} />
        </View>
        <View style={s.progressLabels}>
          <Text style={s.progressValue}>{weekly?.total_hours?.toFixed(1) || '0.0'}h</Text>
          <Text style={s.progressTarget}>/ {weekly?.contract_hours || 42}h</Text>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={s.statsGrid} data-testid="stats-grid">
        <View style={[s.statCard, { borderLeftColor: C.primary }]}>
          <Text style={s.statValue}>{weekly?.billable_hours?.toFixed(1) || '0.0'}h</Text>
          <Text style={s.statLabel}>Facturables</Text>
        </View>
        <View style={[s.statCard, { borderLeftColor: C.orange }]}>
          <Text style={s.statValue}>{weekly?.overtime_hours?.toFixed(1) || '0.0'}h</Text>
          <Text style={s.statLabel}>Heures sup.</Text>
        </View>
        <View style={[s.statCard, { borderLeftColor: C.success }]}>
          <Text style={s.statValue}>{balances?.vacation_remaining ?? 25}j</Text>
          <Text style={s.statLabel}>Vacances</Text>
        </View>
        <View style={[s.statCard, { borderLeftColor: C.danger }]}>
          <Text style={s.statValue}>{balances?.sick_days ?? 0}j</Text>
          <Text style={s.statLabel}>Maladie</Text>
        </View>
      </View>

      {/* Month Progress */}
      {balances && (
        <View style={s.sectionCard} data-testid="month-progress">
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Ce mois</Text>
            <Text style={s.sectionMeta}>
              {balances.month_hours?.toFixed(0)}h / {balances.month_target?.toFixed(0)}h
            </Text>
          </View>
          <View style={s.progressBarBg}>
            <View style={[s.progressBarFill, { width: `${Math.min((balances.month_hours / balances.month_target) * 100, 100)}%`, backgroundColor: C.success }]} />
          </View>
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, maxWidth: 480, alignSelf: 'center', width: '100%' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greeting: { fontSize: 14, color: C.textSec, letterSpacing: 0.3 },
  userName: { fontSize: 22, fontWeight: '700', color: C.text, marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 12, fontWeight: '600' },

  // Timer Card
  timerCard: {
    backgroundColor: C.card, borderRadius: 20, padding: 28, alignItems: 'center',
    marginBottom: 16,
    shadowColor: C.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 4,
  },
  timerLabel: { fontSize: 13, color: C.textSec, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  timerDisplay: { fontSize: 48, fontWeight: '200', color: C.text, letterSpacing: 2, fontVariant: ['tabular-nums'] },
  projectTag: { backgroundColor: C.primaryLight, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 12, marginTop: 12 },
  projectTagText: { color: C.primary, fontSize: 12, fontWeight: '600' },

  // Action Buttons
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 24, width: '100%', justifyContent: 'center' },
  mainBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, paddingHorizontal: 48, borderRadius: 16, gap: 10,
    minWidth: 200,
  },
  mainBtnIcon: { color: '#FFF', fontSize: 18 },
  mainBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  actionBtn: {
    flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, paddingHorizontal: 20, borderRadius: 16, flex: 1, gap: 4,
  },
  actionBtnIcon: { color: '#FFF', fontSize: 16 },
  actionBtnText: { color: '#FFF', fontSize: 13, fontWeight: '600' },

  // Section Card
  sectionCard: {
    backgroundColor: C.card, borderRadius: 16, padding: 20, marginBottom: 12,
    shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  sectionMeta: { fontSize: 13, color: C.textSec, fontWeight: '500' },

  // Progress Bar
  progressBarBg: { height: 8, backgroundColor: C.bg, borderRadius: 4, marginTop: 14, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: C.primary, borderRadius: 4 },
  progressLabels: { flexDirection: 'row', alignItems: 'baseline', marginTop: 8, gap: 4 },
  progressValue: { fontSize: 20, fontWeight: '700', color: C.text },
  progressTarget: { fontSize: 14, color: C.textSec },

  // Stats Grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12, justifyContent: 'space-between' },
  statCard: {
    backgroundColor: C.card, borderRadius: 14, padding: 16, 
    flexBasis: '48%', minWidth: 140,
    borderLeftWidth: 4,
    shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2,
  },
  statValue: { fontSize: 22, fontWeight: '700', color: C.text },
  statLabel: { fontSize: 12, color: C.textSec, marginTop: 4, fontWeight: '500' },
});
