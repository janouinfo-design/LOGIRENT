import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Dimensions, Alert } from 'react-native';
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
  total_payments: number;
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
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/api/admin/stats');
      setStats(response.data);
    } catch (error: any) {
      console.error('Error fetching stats:', error.response?.data || error.message);
      if (error.response?.status === 401) {
        Alert.alert('Session expirée', 'Veuillez vous reconnecter');
        router.replace('/(auth)/login');
      }
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
    { icon: 'car', label: 'Véhicules', count: stats?.total_vehicles || 0, route: '/admin/vehicles', color: COLORS.primary },
    { icon: 'calendar', label: 'Réservations', count: stats?.total_reservations || 0, route: '/admin/reservations', color: COLORS.secondary },
    { icon: 'people', label: 'Utilisateurs', count: stats?.total_users || 0, route: '/admin/users', color: COLORS.success },
    { icon: 'card', label: 'Paiements', count: stats?.total_payments || 0, route: '/admin/payments', color: '#8B5CF6' },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Navigation Menu */}
      <View style={styles.topNav}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.push('/(tabs)/profile')}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.topNavTitle}>Administration</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Menu Tabs */}
      <View style={styles.menuTabs}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.menuTabsContent}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.menuTab}
              onPress={() => router.push(item.route as any)}
            >
              <View style={[styles.menuTabIcon, { backgroundColor: item.color + '20' }]}>
                <Ionicons name={item.icon as any} size={20} color={item.color} />
              </View>
              <Text style={styles.menuTabLabel}>{item.label}</Text>
              <View style={[styles.menuTabBadge, { backgroundColor: item.color }]}>
                <Text style={styles.menuTabBadgeText}>{item.count}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Revenue Card */}
        <View style={styles.revenueCard}>
          <View style={styles.revenueHeader}>
            <Text style={styles.revenueLabel}>Chiffre d'Affaires Total</Text>
            <Ionicons name="trending-up" size={24} color="#FFFFFF" />
          </View>
          <Text style={styles.revenueAmount}>CHF {(stats?.total_revenue || 0).toFixed(2)}</Text>
          <Text style={styles.revenueSubtext}>{stats?.total_reservations || 0} réservations au total</Text>
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
          <Text style={styles.sectionTitle}>Réservations par Statut</Text>
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
            {Object.keys(stats?.reservations_by_status || {}).length === 0 && (
              <Text style={styles.emptyText}>Aucune réservation</Text>
            )}
          </View>
        </View>

        {/* Top Vehicles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Véhicules les Plus Loués</Text>
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
                <Text style={styles.topVehicleCount}>{vehicle.rental_count} locations</Text>
              </View>
            ))}
            {(stats?.top_vehicles || []).length === 0 && (
              <Text style={styles.emptyText}>Aucune donnée de location</Text>
            )}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions Rapides</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/admin/vehicles')}
            >
              <Ionicons name="add-circle" size={20} color={COLORS.primary} />
              <Text style={styles.actionText}>Ajouter Véhicule</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/admin/reservations')}
            >
              <Ionicons name="eye" size={20} color={COLORS.primary} />
              <Text style={styles.actionText}>Voir Tout</Text>
            </TouchableOpacity>
          </View>
        </View>

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
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topNavTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  menuTabs: {
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuTabsContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  menuTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 25,
    marginRight: 10,
  },
  menuTabIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  menuTabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginRight: 8,
  },
  menuTabBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  menuTabBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  revenueCard: {
    backgroundColor: COLORS.primary,
    margin: 16,
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
    padding: 16,
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
});
