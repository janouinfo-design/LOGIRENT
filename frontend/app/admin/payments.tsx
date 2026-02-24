import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api/axios';
import { format } from 'date-fns';

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

interface Transaction {
  id: string;
  user_email: string;
  reservation_id: string;
  session_id: string;
  amount: number;
  currency: string;
  status: string;
  payment_status: string;
  created_at: string;
}

export default function AdminPayments() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setError(null);
    try {
      console.log('Fetching payments...');
      const response = await api.get('/api/admin/payments');
      console.log('Payments response:', response.data);
      setTransactions(response.data.transactions || []);
      setTotal(response.data.total || 0);
    } catch (error: any) {
      console.error('Error fetching transactions:', error.response?.data || error.message);
      setError(error.response?.data?.detail || 'Impossible de charger les transactions. Reconnectez-vous.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTransactions();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return COLORS.success;
      case 'initiated': return COLORS.warning;
      case 'pending': return COLORS.warning;
      case 'failed': return COLORS.error;
      default: return COLORS.textLight;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid': return 'Payé';
      case 'initiated': return 'Initié';
      case 'pending': return 'En attente';
      case 'failed': return 'Échoué';
      default: return status;
    }
  };

  const totalPaid = transactions
    .filter(t => t.payment_status === 'paid')
    .reduce((sum, t) => sum + t.amount, 0);

  const renderItem = ({ item }: { item: Transaction }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.amount}>CHF {item.amount.toFixed(2)}</Text>
          <Text style={styles.email}>{item.user_email}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {getStatusLabel(item.status)}
          </Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.footerItem}>
          <Ionicons name="time" size={14} color={COLORS.textLight} />
          <Text style={styles.footerText}>
            {format(new Date(item.created_at), 'dd/MM/yyyy HH:mm')}
          </Text>
        </View>
        <Text style={styles.sessionId}>...{item.session_id.slice(-12)}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Transactions</Text>
          <Text style={styles.summaryValue}>{total}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Collecté</Text>
          <Text style={[styles.summaryValue, { color: COLORS.success }]}>CHF {totalPaid.toFixed(2)}</Text>
        </View>
      </View>

      <FlatList
        data={transactions}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {error ? (
              <>
                <Ionicons name="alert-circle-outline" size={48} color={COLORS.error} />
                <Text style={[styles.emptyText, { color: COLORS.error }]}>{error}</Text>
                <Text style={styles.emptySubtext}>Veuillez vous déconnecter et vous reconnecter</Text>
              </>
            ) : (
              <>
                <Ionicons name="card-outline" size={48} color={COLORS.textLight} />
                <Text style={styles.emptyText}>Aucune transaction</Text>
              </>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  summary: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 16,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  amount: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  email: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  sessionId: {
    fontSize: 11,
    color: COLORS.textLight,
    fontFamily: 'monospace',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textLight,
    marginTop: 12,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 8,
    textAlign: 'center',
  },
});
