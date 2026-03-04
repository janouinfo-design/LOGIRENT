import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TextInput,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import ClockButton from '../src/components/ClockButton';
import BreakButton from '../src/components/BreakButton';
import StatsCard from '../src/components/StatsCard';
import ProjectPicker, { ProjectSelectorButton } from '../src/components/ProjectPicker';
import {
  getCurrentEntry,
  clockIn,
  clockOut,
  startBreak,
  endBreak,
  getProjects,
  getWeeklyStats,
  getDashboardStats,
  Project,
  CurrentEntry,
  WeeklyStats,
  DashboardStats,
} from '../src/services/api';

export default function HomeScreen() {
  const router = useRouter();
  const { user, logout, isManager } = useAuth();
  
  const [currentEntry, setCurrentEntry] = useState<CurrentEntry | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');

  const fetchData = useCallback(async () => {
    try {
      const [projectsRes, statsRes] = await Promise.all([
        getProjects(),
        getWeeklyStats(),
      ]);
      
      setProjects(projectsRes.data);
      setWeeklyStats(statsRes.data);
      
      // Only fetch current entry for non-managers
      if (!isManager) {
        const entryRes = await getCurrentEntry();
        setCurrentEntry(entryRes.data);
        if (entryRes.data.entry?.project_id) {
          setSelectedProjectId(entryRes.data.entry.project_id);
        }
        if (entryRes.data.entry?.comment) {
          setComment(entryRes.data.entry.comment);
        }
      } else {
        // Fetch dashboard stats for managers
        const dashRes = await getDashboardStats();
        setDashboardStats(dashRes.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }, [isManager]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update elapsed time (only for employees)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (!isManager && currentEntry?.active && currentEntry.entry?.clock_in) {
      const updateTime = () => {
        const clockIn = new Date(currentEntry.entry!.clock_in);
        const now = new Date();
        let diff = Math.floor((now.getTime() - clockIn.getTime()) / 1000);
        
        if (currentEntry.on_break && currentEntry.entry?.break_start) {
          const breakStart = new Date(currentEntry.entry.break_start);
          diff -= Math.floor((now.getTime() - breakStart.getTime()) / 1000);
        }
        if (currentEntry.entry?.break_start && currentEntry.entry?.break_end) {
          const breakDuration = Math.floor(
            (new Date(currentEntry.entry.break_end).getTime() - 
             new Date(currentEntry.entry.break_start).getTime()) / 1000
          );
          diff -= breakDuration;
        }
        
        const hours = Math.floor(diff / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        const seconds = diff % 60;
        setElapsedTime(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      };
      
      updateTime();
      interval = setInterval(updateTime, 1000);
    } else {
      setElapsedTime('00:00:00');
    }
    
    return () => clearInterval(interval);
  }, [currentEntry, isManager]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleClockAction = async () => {
    setIsLoading(true);
    try {
      if (!currentEntry?.active) {
        await clockIn({ project_id: selectedProjectId || undefined, comment: comment || undefined });
        Alert.alert('Succès', 'Pointage début enregistré');
      } else {
        await clockOut({ project_id: selectedProjectId || undefined, comment: comment || undefined });
        Alert.alert('Succès', 'Pointage fin enregistré');
        setComment('');
      }
      await fetchData();
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Erreur lors du pointage';
      Alert.alert('Erreur', message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBreakAction = async () => {
    setIsLoading(true);
    try {
      if (!currentEntry?.on_break) {
        await startBreak();
        Alert.alert('Pause', 'Pause commencée');
      } else {
        await endBreak();
        Alert.alert('Pause', 'Pause terminée');
      }
      await fetchData();
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Erreur lors de la pause';
      Alert.alert('Erreur', message);
    } finally {
      setIsLoading(false);
    }
  };

  const getClockState = (): 'idle' | 'working' | 'break' => {
    if (!currentEntry?.active) return 'idle';
    if (currentEntry.on_break) return 'break';
    return 'working';
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Navigation */}
      <View style={styles.topNav}>
        <TouchableOpacity style={[styles.navItem, styles.navItemActive]}>
          <Ionicons name="home" size={22} color="#22C55E" />
          <Text style={[styles.navLabel, styles.navLabelActive]}>Accueil</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/history')}>
          <Ionicons name="list" size={22} color="#6B7280" />
          <Text style={styles.navLabel}>Historique</Text>
        </TouchableOpacity>
        {isManager && (
          <TouchableOpacity style={styles.navItem} onPress={() => router.push('/dashboard')}>
            <Ionicons name="stats-chart" size={22} color="#6B7280" />
            <Text style={styles.navLabel}>Gestion</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/profile')}>
          <Ionicons name="person" size={22} color="#6B7280" />
          <Text style={styles.navLabel}>Profil</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22C55E" />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Bonjour,</Text>
            <Text style={styles.userName}>{user?.first_name} {user?.last_name}</Text>
          </View>
          {isManager && (
            <View style={styles.managerBadge}>
              <Ionicons name="shield-checkmark" size={16} color="#FFFFFF" />
              <Text style={styles.managerText}>Manager</Text>
            </View>
          )}
        </View>

        {/* Manager Dashboard View */}
        {isManager && dashboardStats && (
          <View style={styles.managerSection}>
            <Text style={styles.sectionTitle}>Vue d'ensemble</Text>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Ionicons name="people" size={28} color="#3B82F6" />
                <Text style={styles.statValue}>{dashboardStats.total_employees}</Text>
                <Text style={styles.statLabel}>Employés</Text>
              </View>
              <View style={styles.statBox}>
                <Ionicons name="pulse" size={28} color="#22C55E" />
                <Text style={styles.statValue}>{dashboardStats.active_today}</Text>
                <Text style={styles.statLabel}>Actifs</Text>
              </View>
              <View style={styles.statBox}>
                <Ionicons name="time" size={28} color="#F59E0B" />
                <Text style={styles.statValue}>{dashboardStats.pending_entries}</Text>
                <Text style={styles.statLabel}>En attente</Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.managerButton}
              onPress={() => router.push('/dashboard')}
            >
              <Text style={styles.managerButtonText}>Voir les pointages en attente</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.projectButton}
              onPress={() => router.push('/projects')}
            >
              <Ionicons name="briefcase-outline" size={20} color="#22C55E" />
              <Text style={styles.projectButtonText}>Gérer les projets</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Employee Clock View */}
        {!isManager && (
          <>
            <View style={styles.clockSection}>
              <ClockButton
                state={getClockState()}
                onPress={handleClockAction}
                isLoading={isLoading}
                elapsedTime={currentEntry?.active ? elapsedTime : undefined}
              />
              
              {currentEntry?.active && (
                <View style={styles.breakSection}>
                  <BreakButton
                    isOnBreak={currentEntry.on_break || false}
                    onPress={handleBreakAction}
                    disabled={isLoading}
                  />
                </View>
              )}
            </View>

            {/* Project & Comment */}
            <View style={styles.inputSection}>
              <ProjectSelectorButton
                project={selectedProject || null}
                onPress={() => setShowProjectPicker(true)}
              />
              
              <View style={styles.commentContainer}>
                <Ionicons name="chatbubble-outline" size={20} color="#6B7280" />
                <TextInput
                  style={styles.commentInput}
                  placeholder="Ajouter un commentaire..."
                  placeholderTextColor="#9CA3AF"
                  value={comment}
                  onChangeText={setComment}
                  multiline
                />
              </View>
            </View>
          </>
        )}

        {/* Weekly Stats */}
        {weeklyStats && (
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Cette semaine</Text>
            <View style={styles.weeklyStatsRow}>
              <View style={styles.weeklyStatCard}>
                <Ionicons name="time-outline" size={24} color="#22C55E" />
                <Text style={styles.weeklyStatValue}>{weeklyStats.total_hours.toFixed(1)}h</Text>
                <Text style={styles.weeklyStatLabel}>Travaillées</Text>
              </View>
              <View style={styles.weeklyStatCard}>
                <Ionicons name="trending-up-outline" size={24} color="#F59E0B" />
                <Text style={styles.weeklyStatValue}>{weeklyStats.overtime_hours.toFixed(1)}h</Text>
                <Text style={styles.weeklyStatLabel}>Supplémentaires</Text>
              </View>
              <View style={styles.weeklyStatCard}>
                <Ionicons name="calendar-outline" size={24} color="#3B82F6" />
                <Text style={styles.weeklyStatValue}>{weeklyStats.days_worked}</Text>
                <Text style={styles.weeklyStatLabel}>Jours</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {!isManager && (
        <ProjectPicker
          projects={projects}
          selectedId={selectedProjectId}
          onSelect={setSelectedProjectId}
          visible={showProjectPicker}
          onClose={() => setShowProjectPicker(false)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  topNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  navItemActive: {},
  navLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  navLabelActive: {
    color: '#22C55E',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 14,
    color: '#6B7280',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  managerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22C55E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  managerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  managerSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  managerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22C55E',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  managerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  projectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#22C55E',
    gap: 8,
  },
  projectButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#22C55E',
  },
  clockSection: {
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  breakSection: {
    marginTop: 24,
  },
  inputSection: {
    gap: 12,
    marginBottom: 24,
  },
  commentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  commentInput: {
    flex: 1,
    color: '#111827',
    fontSize: 15,
    minHeight: 40,
    maxHeight: 80,
  },
  statsSection: {
    marginTop: 8,
  },
  weeklyStatsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  weeklyStatCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  weeklyStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 8,
  },
  weeklyStatLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
});
