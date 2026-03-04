import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '../src/context/AuthContext';
import EntryCard from '../src/components/EntryCard';
import { getTimeEntries, getMonthlyStats, TimeEntry, MonthlyStats } from '../src/services/api';

export default function HistoryScreen() {
  const router = useRouter();
  const { isManager } = useAuth();
  
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'week' | 'month' | 'all'>('week');

  const fetchData = useCallback(async () => {
    try {
      const now = new Date();
      let startDate: string | undefined;
      let endDate: string | undefined;
      
      if (filter === 'week') {
        const weekStart = startOfWeek(now, { weekStartsOn: 1 });
        startDate = format(weekStart, 'yyyy-MM-dd');
        endDate = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      } else if (filter === 'month') {
        startDate = format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');
        endDate = format(new Date(now.getFullYear(), now.getMonth() + 1, 0), 'yyyy-MM-dd');
      }
      
      const [entriesRes, statsRes] = await Promise.all([
        getTimeEntries({ start_date: startDate, end_date: endDate }),
        getMonthlyStats(),
      ]);
      
      setEntries(entriesRes.data);
      setMonthlyStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  }, [filter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const totalHours = entries.reduce((sum, e) => sum + e.total_hours, 0);
  const totalOvertime = entries.reduce((sum, e) => sum + e.overtime_hours, 0);

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Navigation */}
      <View style={styles.topNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/home')}>
          <Ionicons name="home-outline" size={22} color="#6B7280" />
          <Text style={styles.navLabel}>Accueil</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navItem, styles.navItemActive]}>
          <Ionicons name="list" size={22} color="#22C55E" />
          <Text style={[styles.navLabel, styles.navLabelActive]}>Historique</Text>
        </TouchableOpacity>
        {isManager && (
          <TouchableOpacity style={styles.navItem} onPress={() => router.push('/dashboard')}>
            <Ionicons name="stats-chart-outline" size={22} color="#6B7280" />
            <Text style={styles.navLabel}>Gestion</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/profile')}>
          <Ionicons name="person-outline" size={22} color="#6B7280" />
          <Text style={styles.navLabel}>Profil</Text>
        </TouchableOpacity>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Historique</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {(['week', 'month', 'all'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'week' ? 'Semaine' : f === 'month' ? 'Mois' : 'Tout'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Ionicons name="time" size={20} color="#22C55E" />
          <Text style={styles.summaryValue}>{totalHours.toFixed(1)}h</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        <View style={styles.summaryCard}>
          <Ionicons name="trending-up" size={20} color="#F59E0B" />
          <Text style={styles.summaryValue}>{totalOvertime.toFixed(1)}h</Text>
          <Text style={styles.summaryLabel}>Supplémentaires</Text>
        </View>
        <View style={styles.summaryCard}>
          <Ionicons name="calendar" size={20} color="#3B82F6" />
          <Text style={styles.summaryValue}>{entries.length}</Text>
          <Text style={styles.summaryLabel}>Jours</Text>
        </View>
      </View>

      {/* Entries List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22C55E" />
        }
      >
        {entries.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>Aucun pointage pour cette période</Text>
          </View>
        ) : (
          entries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))
        )}
      </ScrollView>
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
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterTabActive: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  summaryLabel: {
    fontSize: 10,
    color: '#6B7280',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 0,
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
});
