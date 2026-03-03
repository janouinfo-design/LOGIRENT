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
  Project,
  CurrentEntry,
  WeeklyStats,
} from '../src/services/api';

export default function HomeScreen() {
  const router = useRouter();
  const { user, logout, isManager } = useAuth();
  
  const [currentEntry, setCurrentEntry] = useState<CurrentEntry | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');

  const fetchData = useCallback(async () => {
    try {
      const [entryRes, projectsRes, statsRes] = await Promise.all([
        getCurrentEntry(),
        getProjects(),
        getWeeklyStats(),
      ]);
      
      setCurrentEntry(entryRes.data);
      setProjects(projectsRes.data);
      setWeeklyStats(statsRes.data);
      
      if (entryRes.data.entry?.project_id) {
        setSelectedProjectId(entryRes.data.entry.project_id);
      }
      if (entryRes.data.entry?.comment) {
        setComment(entryRes.data.entry.comment);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update elapsed time
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (currentEntry?.active && currentEntry.entry?.clock_in) {
      const updateTime = () => {
        const clockIn = new Date(currentEntry.entry!.clock_in);
        const now = new Date();
        let diff = Math.floor((now.getTime() - clockIn.getTime()) / 1000);
        
        // Subtract break time if on break
        if (currentEntry.on_break && currentEntry.entry?.break_start) {
          const breakStart = new Date(currentEntry.entry.break_start);
          diff -= Math.floor((now.getTime() - breakStart.getTime()) / 1000);
        }
        // Subtract completed break time
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
  }, [currentEntry]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleClockAction = async () => {
    setIsLoading(true);
    try {
      if (!currentEntry?.active) {
        // Clock in
        await clockIn({ project_id: selectedProjectId || undefined, comment: comment || undefined });
        Alert.alert('Succès', 'Pointage début enregistré');
      } else {
        // Clock out
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
          <View style={styles.headerRight}>
            {isManager && (
              <Ionicons 
                name="shield-checkmark" 
                size={20} 
                color="#22C55E" 
                style={styles.managerBadge}
              />
            )}
          </View>
        </View>

        {/* Clock Button */}
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
              placeholderTextColor="#6B7280"
              value={comment}
              onChangeText={setComment}
              multiline
            />
          </View>
        </View>

        {/* Weekly Stats */}
        {weeklyStats && (
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Cette semaine</Text>
            <StatsCard
              title="Heures travaillées"
              value={`${weeklyStats.total_hours.toFixed(1)}h`}
              subtitle={`sur ${weeklyStats.contract_hours}h`}
              icon="time-outline"
              color="#22C55E"
            />
            <StatsCard
              title="Heures supplémentaires"
              value={`${weeklyStats.overtime_hours.toFixed(1)}h`}
              icon="trending-up-outline"
              color="#F59E0B"
            />
            <StatsCard
              title="Jours travaillés"
              value={weeklyStats.days_worked}
              subtitle="cette semaine"
              icon="calendar-outline"
              color="#3B82F6"
            />
          </View>
        )}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <View style={[styles.navItem, styles.navItemActive]}>
          <Ionicons name="home" size={24} color="#22C55E" />
          <Text style={[styles.navLabel, styles.navLabelActive]}>Accueil</Text>
        </View>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/history')}>
          <Ionicons name="list" size={24} color="#6B7280" />
          <Text style={styles.navLabel}>Historique</Text>
        </TouchableOpacity>
        {isManager && (
          <TouchableOpacity style={styles.navItem} onPress={() => router.push('/dashboard')}>
            <Ionicons name="stats-chart" size={24} color="#6B7280" />
            <Text style={styles.navLabel}>Gestion</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/profile')}>
          <Ionicons name="person" size={24} color="#6B7280" />
          <Text style={styles.navLabel}>Profil</Text>
        </TouchableOpacity>
      </View>

      <ProjectPicker
        projects={projects}
        selectedId={selectedProjectId}
        onSelect={setSelectedProjectId}
        visible={showProjectPicker}
        onClose={() => setShowProjectPicker(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  greeting: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  managerBadge: {
    marginLeft: 8,
  },
  clockSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  breakSection: {
    marginTop: 24,
  },
  inputSection: {
    gap: 12,
    marginBottom: 32,
  },
  commentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  commentInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    minHeight: 40,
    maxHeight: 80,
  },
  statsSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
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
