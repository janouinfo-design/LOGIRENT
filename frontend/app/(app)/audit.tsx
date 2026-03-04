import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../../src/theme/constants';
import { getAuditLogs } from '../../src/services/api';

const ACTION_COLORS: Record<string, string> = { CREATE: '#059669', UPDATE: '#2563EB', DELETE: '#DC2626', APPROVE: '#059669', REJECT: '#DC2626', APPROVE_ALL: '#059669', UPDATE_STATUS: '#F59E0B' };
const ACTION_ICONS: Record<string, string> = { CREATE: 'add-circle', UPDATE: 'edit', DELETE: 'delete', APPROVE: 'check-circle', REJECT: 'cancel', APPROVE_ALL: 'done-all', UPDATE_STATUS: 'swap-horiz' };

export default function AuditScreen() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAuditLogs({ limit: 200 }).then(r => setLogs(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Journal d'audit</Text>
      <Text style={styles.subtitle}>{logs.length} actions enregistrees</Text>

      {loading ? <ActivityIndicator size="large" color={colors.primary} /> : logs.length === 0 ? (
        <View style={styles.empty}><MaterialIcons name="history" size={48} color={colors.borderLight} /><Text style={styles.emptyText}>Aucun log</Text></View>
      ) : (
        logs.map((log, idx) => {
          const col = ACTION_COLORS[log.action] || '#94A3B8';
          const icon = ACTION_ICONS[log.action] || 'info';
          return (
            <View key={log.id || idx} style={styles.logRow}>
              <View style={[styles.iconCircle, { backgroundColor: col + '18' }]}>
                <MaterialIcons name={icon as any} size={18} color={col} />
              </View>
              <View style={styles.logContent}>
                <View style={styles.logHeader}>
                  <Text style={styles.logAction}>{log.action}</Text>
                  <Text style={styles.logEntity}>{log.entity}</Text>
                </View>
                <Text style={styles.logUser}>{log.user_name}</Text>
                {log.details && <Text style={styles.logDetails}>{log.details}</Text>}
                <Text style={styles.logTime}>{new Date(log.timestamp).toLocaleString('fr-CH')}</Text>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: fontSize.sm, color: colors.textLight, marginBottom: spacing.lg },
  empty: { alignItems: 'center', paddingVertical: 60, gap: spacing.sm },
  emptyText: { color: colors.textLight, fontSize: fontSize.md },
  logRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  iconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  logContent: { flex: 1 },
  logHeader: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  logAction: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text },
  logEntity: { fontSize: fontSize.xs, color: colors.primary, backgroundColor: colors.primaryLight, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  logUser: { fontSize: fontSize.xs, color: colors.textLight, marginTop: 2 },
  logDetails: { fontSize: fontSize.xs, color: colors.textLight, fontStyle: 'italic' },
  logTime: { fontSize: 10, color: colors.textLight, marginTop: 2 },
});
