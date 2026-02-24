import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Dimensions, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api/axios';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#1E3A8A',
  secondary: '#F59E0B',
  background: '#F8FAFC',
  card: '#FFFFFF',
  text: '#1E293B',
  textLight: '#64748B',
  border: '#E2E8F0',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
};

interface Stats {
  total_vehicles: number;
  total_users: number;
  total_reservations: number;
  total_revenue: number;
  reservations_by_status: Record<string, number>;
  top_vehicles: Array<{ id: string; name: string; rental_count: number }>;
  revenue_by_month: Array<{ month: string; revenue: number; reservations: number }>;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadToken();
  }, []);

  const loadToken = async () => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchStats();
    } else {
      router.replace('/(auth)/login');
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  const menuItems = [
    { icon: 'car', label: 'Vehicles', count: stats?.total_vehicles || 0, route: '/admin/vehicles', color: COLORS.primary },
    { icon: 'calendar', label: 'Reservations', count: stats?.total_reservations || 0, route: '/admin/reservations', color: COLORS.secondary },
    { icon: 'people', label: 'Users', count: stats?.total_users || 0, route: '/admin/users', color: COLORS.success },
    { icon: 'card', label: 'Payments', count: 0, route: '/admin/payments', color: '#8B5CF6' },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Revenue Card */}
        <View style={styles.revenueCard}>
          <View style={styles.revenueHeader}>
            <Text style={styles.revenueLabel}>Total Revenue</Text>
            <Ionicons name="trending-up" size={24} color="#FFFFFF" />
          </View>
          <Text style={styles.revenueAmount}>CHF {(stats?.total_revenue || 0).toFixed(2)}</Text>
          <Text style={styles.revenueSubtext}>{stats?.total_reservations || 0} total reservations</Text>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsGrid}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.statCard}
              onPress={() => router.push(item.route as any)}
            >
              <View style={[styles.statIcon, { backgroundColor: item.color + '20' }]}>
                <Ionicons name={item.icon as any} size={24} color={item.color} />
              </View>
              <Text style={styles.statCount}>{item.count}</Text>
              <Text style={styles.statLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Reservations by Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reservations by Status</Text>
          <View style={styles.statusGrid}>
            {Object.entries(stats?.reservations_by_status || {}).map(([status, count]) => (
              <View key={status} style={styles.statusItem}>
                <View style={[
                  styles.statusDot,
                  { backgroundColor: 
                    status === 'confirmed' ? COLORS.success :
                    status === 'pending' ? COLORS.warning :
                    status === 'cancelled' ? COLORS.error :
                    COLORS.textLight
                  }
                ]} />
                <Text style={styles.statusName}>{status}</Text>
                <Text style={styles.statusCount}>{count}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Top Vehicles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Rented Vehicles</Text>
          <View style={styles.topVehiclesCard}>
            {(stats?.top_vehicles || []).map((vehicle, index) => (
              <View key={vehicle.id} style={[
                styles.topVehicleItem,
                index < (stats?.top_vehicles.length || 0) - 1 && styles.topVehicleItemBorder
              ]}>
                <View style={styles.topVehicleRank}>
                  <Text style={styles.rankText}>#{index + 1}</Text>
                </View>
                <Text style={styles.topVehicleName}>{vehicle.name}</Text>
                <Text style={styles.topVehicleCount}>{vehicle.rental_count} rentals</Text>
              </View>
            ))}
            {(stats?.top_vehicles || []).length === 0 && (
              <Text style={styles.emptyText}>No rental data yet</Text>
            )}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/admin/vehicles')}
            >
              <Ionicons name="add-circle" size={20} color={COLORS.primary} />
              <Text style={styles.actionText}>Add Vehicle</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/admin/reservations')}
            >
              <Ionicons name="eye" size={20} color={COLORS.primary} />
              <Text style={styles.actionText}>View All</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Back to App */}
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.push('/(tabs)')}
        >
          <Ionicons name="arrow-back" size={20} color={COLORS.primary} />
          <Text style={styles.backText}>Back to App</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  revenueCard: {
    backgroundColor: COLORS.primary,
    margin: 20,
    padding: 24,
    borderRadius: 16,
  },
  revenueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  revenueLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  revenueAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 8,
  },
  revenueSubtext: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 12,
  },
  statCard: {
    width: (width - 56) / 2,
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statCount: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 4,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  statusGrid: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  statusName: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    textTransform: 'capitalize',
  },
  statusCount: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  topVehiclesCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
  },
  topVehicleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  topVehicleItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  topVehicleRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  topVehicleName: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  topVehicleCount: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textLight,
    paddingVertical: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    padding: 16,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    gap: 8,
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
