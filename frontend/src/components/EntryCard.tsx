import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { TimeEntry } from '../services/api';

interface EntryCardProps {
  entry: TimeEntry;
  showUser?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  showActions?: boolean;
}

export default function EntryCard({ entry, showUser, onApprove, onReject, showActions }: EntryCardProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'approved':
        return { color: '#22C55E', bgColor: '#D1FAE5', label: 'Approuvé', icon: 'checkmark-circle' as const };
      case 'rejected':
        return { color: '#EF4444', bgColor: '#FEE2E2', label: 'Refusé', icon: 'close-circle' as const };
      default:
        return { color: '#F59E0B', bgColor: '#FEF3C7', label: 'En attente', icon: 'time' as const };
    }
  };

  const statusConfig = getStatusConfig(entry.status);
  
  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '--:--';
    try {
      return format(parseISO(dateStr), 'HH:mm');
    } catch {
      return '--:--';
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'EEEE d MMMM', { locale: fr });
    } catch {
      return dateStr;
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.date}>{formatDate(entry.date)}</Text>
          {showUser && entry.user_name && (
            <Text style={styles.userName}>{entry.user_name}</Text>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
          <Ionicons name={statusConfig.icon} size={14} color={statusConfig.color} />
          <Text style={[styles.statusText, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
        </View>
      </View>

      <View style={styles.timeRow}>
        <View style={styles.timeBlock}>
          <Text style={styles.timeLabel}>Arrivée</Text>
          <Text style={styles.timeValue}>{formatTime(entry.clock_in)}</Text>
        </View>
        <View style={styles.timeDivider} />
        <View style={styles.timeBlock}>
          <Text style={styles.timeLabel}>Départ</Text>
          <Text style={styles.timeValue}>{formatTime(entry.clock_out)}</Text>
        </View>
        <View style={styles.timeDivider} />
        <View style={styles.timeBlock}>
          <Text style={styles.timeLabel}>Pause</Text>
          <Text style={styles.timeValue}>{entry.break_hours.toFixed(1)}h</Text>
        </View>
        <View style={styles.timeDivider} />
        <View style={styles.timeBlock}>
          <Text style={styles.timeLabel}>Total</Text>
          <Text style={[styles.timeValue, styles.totalHours]}>{entry.total_hours.toFixed(1)}h</Text>
        </View>
      </View>

      {entry.project_name && (
        <View style={styles.projectRow}>
          <Ionicons name="briefcase-outline" size={16} color="#6B7280" />
          <Text style={styles.projectName}>{entry.project_name}</Text>
        </View>
      )}

      {entry.comment && (
        <View style={styles.commentRow}>
          <Ionicons name="chatbubble-outline" size={14} color="#9CA3AF" />
          <Text style={styles.comment}>{entry.comment}</Text>
        </View>
      )}

      {entry.overtime_hours > 0 && (
        <View style={styles.overtimeRow}>
          <Ionicons name="trending-up" size={14} color="#F59E0B" />
          <Text style={styles.overtimeText}>+{entry.overtime_hours.toFixed(1)}h supplémentaires</Text>
        </View>
      )}

      {showActions && entry.status === 'pending' && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.approveBtn} onPress={onApprove}>
            <Ionicons name="checkmark" size={18} color="#FFFFFF" />
            <Text style={styles.actionText}>Approuver</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rejectBtn} onPress={onReject}>
            <Ionicons name="close" size={18} color="#FFFFFF" />
            <Text style={styles.actionText}>Refuser</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  date: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    textTransform: 'capitalize',
  },
  userName: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
  },
  timeBlock: {
    flex: 1,
    alignItems: 'center',
  },
  timeDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E5E7EB',
  },
  timeLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  totalHours: {
    color: '#22C55E',
  },
  projectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  projectName: {
    fontSize: 14,
    color: '#6B7280',
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    gap: 8,
  },
  comment: {
    fontSize: 13,
    color: '#9CA3AF',
    flex: 1,
  },
  overtimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  overtimeText: {
    fontSize: 13,
    color: '#F59E0B',
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
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
});
