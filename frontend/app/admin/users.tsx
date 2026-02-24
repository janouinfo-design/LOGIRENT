import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
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

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  license_photo?: string;
  blocked?: boolean;
  reservation_count: number;
  created_at: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/api/admin/users');
      setUsers(response.data.users);
      setTotal(response.data.total);
    } catch (error: any) {
      console.error('Error fetching users:', error.response?.data || error.message);
      Alert.alert('Erreur', 'Impossible de charger les utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  };

  const toggleBlockUser = async (userId: string, currentlyBlocked: boolean) => {
    const action = currentlyBlocked ? 'débloquer' : 'bloquer';
    Alert.alert(
      `${action.charAt(0).toUpperCase() + action.slice(1)} l'utilisateur`,
      `Êtes-vous sûr de vouloir ${action} cet utilisateur?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: action.charAt(0).toUpperCase() + action.slice(1),
          style: currentlyBlocked ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await api.put(`/api/admin/users/${userId}/block`);
              Alert.alert('Succès', `Utilisateur ${currentlyBlocked ? 'débloqué' : 'bloqué'}`);
              fetchUsers();
            } catch (error: any) {
              console.error('Error blocking user:', error.response?.data || error.message);
              Alert.alert('Erreur', error.response?.data?.detail || `Impossible de ${action} l'utilisateur`);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: User }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.userName}>{item.name}</Text>
            {item.blocked && (
              <View style={styles.blockedBadge}>
                <Text style={styles.blockedText}>Bloqué</Text>
              </View>
            )}
          </View>
          <Text style={styles.userEmail}>{item.email}</Text>
          {item.phone && <Text style={styles.userPhone}>{item.phone}</Text>}
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Ionicons name="calendar" size={16} color={COLORS.textLight} />
          <Text style={styles.statText}>{item.reservation_count} locations</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="time" size={16} color={COLORS.textLight} />
          <Text style={styles.statText}>Inscrit le {format(new Date(item.created_at), 'dd/MM/yyyy')}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.licenseStatus}>
          {item.license_photo ? (
            <>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
              <Text style={[styles.licenseText, { color: COLORS.success }]}>Permis vérifié</Text>
            </>
          ) : (
            <>
              <Ionicons name="alert-circle" size={16} color={COLORS.warning} />
              <Text style={[styles.licenseText, { color: COLORS.warning }]}>Pas de permis</Text>
            </>
          )}
        </View>
        <TouchableOpacity
          style={[styles.blockButton, item.blocked && styles.unblockButton]}
          onPress={() => toggleBlockUser(item.id, item.blocked || false)}
        >
          <Ionicons
            name={item.blocked ? 'lock-open' : 'ban'}
            size={16}
            color={item.blocked ? COLORS.success : COLORS.error}
          />
          <Text style={[
            styles.blockButtonText,
            { color: item.blocked ? COLORS.success : COLORS.error }
          ]}>
            {item.blocked ? 'Débloquer' : 'Bloquer'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>{total} utilisateurs au total</Text>
      </View>

      <FlatList
        data={users}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color={COLORS.textLight} />
            <Text style={styles.emptyText}>Aucun utilisateur</Text>
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
  header: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerText: {
    fontSize: 14,
    color: COLORS.textLight,
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
    marginBottom: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  blockedBadge: {
    backgroundColor: COLORS.error + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  blockedText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.error,
  },
  userEmail: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 2,
  },
  userPhone: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  licenseStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  licenseText: {
    fontSize: 13,
    fontWeight: '500',
  },
  blockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.error + '10',
    gap: 4,
  },
  unblockButton: {
    backgroundColor: COLORS.success + '10',
  },
  blockButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textLight,
    marginTop: 12,
  },
});
