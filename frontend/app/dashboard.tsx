import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import StatsCard from '../src/components/StatsCard';
import EntryCard from '../src/components/EntryCard';
import {
  getDashboardStats,
  getTimeEntries,
  getAbsences,
  approveEntry,
  rejectEntry,
  approveAbsence,
  rejectAbsence,
  DashboardStats,
  TimeEntry,
  Absence,
} from '../src/services/api';

type TabType = 'overview' | 'entries' | 'absences';

export default function DashboardScreen() {
  const router = useRouter();
  const { isManager } = useAuth();
  
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pendingEntries, setPendingEntries] = useState<TimeEntry[]>([]);
  const [pendingAbsences, setPendingAbsences] = useState<Absence[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, entriesRes, absencesRes] = await Promise.all([
        getDashboardStats(),
        getTimeEntries({ status: 'pending' }),
        getAbsences({ status: 'pending' }),
      ]);
      
      setStats(statsRes.data);
      setPendingEntries(entriesRes.data);
      setPendingAbsences(absencesRes.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    }
  }, []);

  useEffect(() => {
    if (!isManager) {
      // Redirect to home only if we're sure user is loaded
      const timer = setTimeout(() => {
        if (!isManager) {
          router.replace('/home');
        }
      }, 500);
      return () => clearTimeout(timer);
    }
    fetchData();
  }, [fetchData, isManager]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleApproveEntry = async (id: string) => {
    try {
      await approveEntry(id);
      Alert.alert('Succès', 'Entrée approuvée');
      fetchData();
    } catch (error) {
      Alert.alert('Erreur', "Erreur lors de l'approbation");
    }
  };

  const handleRejectEntry = async (id: string) => {
    try {
      await rejectEntry(id);
      Alert.alert('Succès', 'Entrée refusée');
      fetchData();
    } catch (error) {
      Alert.alert('Erreur', 'Erreur lors du refus');
    }
  };

  const handleApproveAbsence = async (id: string) => {
    try {
      await approveAbsence(id);
      Alert.alert('Succès', 'Absence approuvée');
      fetchData();
    } catch (error) {
      Alert.alert('Erreur', "Erreur lors de l'approbation");
    }
  };

  const handleRejectAbsence = async (id: string) => {
    try {
      await rejectAbsence(id);
      Alert.alert('Succès', 'Absence refusée');
      fetchData();
    } catch (error) {
      Alert.alert('Erreur', 'Erreur lors du refus');
    }
  };

  const getAbsenceTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      vacation: 'Vacances',
      sick: 'Maladie',
      training: 'Formation',
      holiday: 'Jour férié',
    };
    return types[type] || type;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Gestion</Text>
        <TouchableOpacity onPress={() => router.push('/projects')} style={styles.headerBtn}>
          <Ionicons name="briefcase-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {(['overview', 'entries', 'absences'] as TabType[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'overview' ? 'Vue générale' : tab === 'entries' ? 'Pointages' : 'Absences'}
            </Text>
            {tab === 'entries' && pendingEntries.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingEntries.length}</Text>
              </View>
            )}
            {tab === 'absences' && pendingAbsences.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingAbsences.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22C55E" />
        }
      >
        {activeTab === 'overview' && stats && (
          <View style={styles.statsGrid}>
            <StatsCard
              title="Employés"
              value={stats.total_employees}
              icon="people-outline"
              color="#3B82F6"
            />
            <StatsCard
              title="Actifs aujourd'hui"
              value={stats.active_today}
              icon="pulse-outline"
              color="#22C55E"
            />
            <StatsCard
              title="Pointages en attente"
              value={stats.pending_entries}
              icon="time-outline"
              color="#F59E0B"
            />
            <StatsCard
              title="Absences en attente"
              value={stats.pending_absences}
              icon="calendar-outline"
              color="#EF4444"
            />
          </View>
        )}

        {activeTab === 'entries' && (
          <View>
            {pendingEntries.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle" size={48} color="#22C55E" />
                <Text style={styles.emptyText}>Aucun pointage en attente</Text>
              </View>
            ) : (
              pendingEntries.map((entry) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  showUser={true}
                  showActions={true}
                  onApprove={() => handleApproveEntry(entry.id)}
                  onReject={() => handleRejectEntry(entry.id)}
                />
              ))
            )}
          </View>
        )}

        {activeTab === 'absences' && (
          <View>
            {pendingAbsences.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle" size={48} color="#22C55E" />
                <Text style={styles.emptyText}>Aucune absence en attente</Text>
              </View>
            ) : (
              pendingAbsences.map((absence) => (
                <View key={absence.id} style={styles.absenceCard}>
                  <View style={styles.absenceHeader}>
                    <View>
                      <Text style={styles.absenceUser}>{absence.user_name}</Text>
                      <Text style={styles.absenceType}>{getAbsenceTypeLabel(absence.type)}</Text>
                    </View>
                    <View style={styles.statusBadge}>
                      <Ionicons name="time" size={14} color="#F59E0B" />
                      <Text style={styles.statusText}>En attente</Text>
                    </View>
                  </View>
                  
                  <View style={styles.absenceDates}>
                    <Ionicons name="calendar-outline" size={16} color="#9CA3AF" />
                    <Text style={styles.absenceDateText}>
                      {absence.start_date} → {absence.end_date}
                    </Text>
                  </View>
                  
                  {absence.comment && (
                    <Text style={styles.absenceComment}>{absence.comment}</Text>
                  )}
                  
                  <View style={styles.absenceActions}>
                    <TouchableOpacity
                      style={styles.approveBtn}
                      onPress={() => handleApproveAbsence(absence.id)}
                    >
                      <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                      <Text style={styles.actionText}>Approuver</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() => handleRejectAbsence(absence.id)}
                    >
                      <Ionicons name="close" size={18} color="#FFFFFF" />
                      <Text style={styles.actionText}>Refuser</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/home')}>
          <Ionicons name="home-outline" size={24} color="#6B7280" />
          <Text style={styles.navLabel}>Accueil</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/history')}>
          <Ionicons name="list-outline" size={24} color="#6B7280" />
          <Text style={styles.navLabel}>Historique</Text>
        </TouchableOpacity>
        <View style={[styles.navItem, styles.navItemActive]}>
          <Ionicons name="stats-chart" size={24} color="#22C55E" />
          <Text style={[styles.navLabel, styles.navLabelActive]}>Gestion</Text>
        </View>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/profile')}>
          <Ionicons name="person-outline" size={24} color="#6B7280" />
          <Text style={styles.navLabel}>Profil</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#1F2937',
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#22C55E',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  badge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  statsGrid: {
    gap: 0,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
  },
  absenceCard: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  absenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  absenceUser: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  absenceType: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
  },
  absenceDates: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  absenceDateText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  absenceComment: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  absenceActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22C55E',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  actionText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#1F2937',
    paddingVertical: 12,
    paddingHorizontal: 20,
    paddingBottom: 28,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  navItemActive: {},
  navLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  navLabelActive: {
    color: '#22C55E',
  },
});
