import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../../src/theme/constants';
import { useAuth } from '../../src/context/AuthContext';
import { downloadPdfReport, downloadExcelReport, getUsers, getMonthlyStats } from '../../src/services/api';

const MONTHS = ['Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'];

export default function ReportsScreen() {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedUser, setSelectedUser] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [monthStats, setMonthStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState('');
  const isManager = user?.role === 'manager' || user?.role === 'admin';

  useEffect(() => {
    if (isManager) {
      getUsers().then(r => setUsers(r.data)).catch(() => {});
    }
    loadStats();
  }, [selectedMonth, selectedYear, selectedUser]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const params: any = { month: selectedMonth, year: selectedYear };
      if (selectedUser) params.user_id = selectedUser;
      const res = await getMonthlyStats(params);
      setMonthStats(res.data);
    } catch (err) { console.log(err); }
    finally { setLoading(false); }
  };

  const handleDownload = async (format: 'pdf' | 'excel') => {
    setDownloading(format);
    try {
      const params: any = { month: selectedMonth, year: selectedYear };
      if (selectedUser) params.user_id = selectedUser;
      const res = format === 'pdf' ? await downloadPdfReport(params) : await downloadExcelReport(params);
      if (Platform.OS === 'web') {
        const blob = new Blob([res.data], { type: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url;
        a.download = `rapport_${selectedMonth}_${selectedYear}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
        a.click(); URL.revokeObjectURL(url);
      }
    } catch (err: any) { alert(err.response?.data?.detail || 'Erreur de telechargement'); }
    finally { setDownloading(''); }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Rapports</Text>

      {/* Filters */}
      <View style={styles.filterCard}>
        <Text style={styles.filterLabel}>Periode</Text>
        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
            {MONTHS.map((m, i) => (
              <Pressable key={i} style={[styles.chip, selectedMonth === i + 1 && styles.chipActive]} onPress={() => setSelectedMonth(i + 1)}>
                <Text style={[styles.chipText, selectedMonth === i + 1 && styles.chipTextActive]}>{m.substring(0, 3)}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
        <View style={styles.filterRow}>
          {[2024, 2025, 2026].map(y => (
            <Pressable key={y} style={[styles.chip, selectedYear === y && styles.chipActive]} onPress={() => setSelectedYear(y)}>
              <Text style={[styles.chipText, selectedYear === y && styles.chipTextActive]}>{y}</Text>
            </Pressable>
          ))}
        </View>
        {isManager && users.length > 0 && (
          <View>
            <Text style={styles.filterLabel}>Employe</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Pressable style={[styles.chip, !selectedUser && styles.chipActive]} onPress={() => setSelectedUser('')}>
                <Text style={[styles.chipText, !selectedUser && styles.chipTextActive]}>Moi</Text>
              </Pressable>
              {users.map(u => (
                <Pressable key={u.id} style={[styles.chip, selectedUser === u.id && styles.chipActive]} onPress={() => setSelectedUser(u.id)}>
                  <Text style={[styles.chipText, selectedUser === u.id && styles.chipTextActive]}>{u.first_name} {u.last_name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Stats Summary */}
      {loading ? <ActivityIndicator size="large" color={colors.primary} /> : monthStats && (
        <View style={styles.statsGrid}>
          <View style={styles.statCard}><Text style={styles.statValue}>{monthStats.total_hours}h</Text><Text style={styles.statLabel}>Heures totales</Text></View>
          <View style={styles.statCard}><Text style={[styles.statValue, { color: colors.primary }]}>{monthStats.billable_hours}h</Text><Text style={styles.statLabel}>Facturables</Text></View>
          <View style={styles.statCard}><Text style={[styles.statValue, { color: colors.warning }]}>{monthStats.overtime_hours}h</Text><Text style={styles.statLabel}>Supplementaires</Text></View>
          <View style={styles.statCard}><Text style={styles.statValue}>{monthStats.days_worked}</Text><Text style={styles.statLabel}>Jours travailles</Text></View>
        </View>
      )}

      {/* Download Buttons */}
      <View style={styles.downloadSection}>
        <Text style={styles.downloadTitle}>Telecharger le rapport</Text>
        <View style={styles.downloadRow}>
          <Pressable style={[styles.downloadBtn, styles.pdfBtn]} onPress={() => handleDownload('pdf')} disabled={downloading !== ''}>
            {downloading === 'pdf' ? <ActivityIndicator color="#FFF" size="small" /> : <MaterialIcons name="picture-as-pdf" size={24} color="#FFF" />}
            <Text style={styles.downloadBtnText}>Rapport PDF</Text>
          </Pressable>
          <Pressable style={[styles.downloadBtn, styles.excelBtn]} onPress={() => handleDownload('excel')} disabled={downloading !== ''}>
            {downloading === 'excel' ? <ActivityIndicator color="#FFF" size="small" /> : <MaterialIcons name="table-chart" size={24} color="#FFF" />}
            <Text style={styles.downloadBtnText}>Export Excel</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, marginBottom: spacing.lg },
  filterCard: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.lg, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border },
  filterLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.sm, marginTop: spacing.sm },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, marginRight: spacing.xs, marginBottom: spacing.xs },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: fontSize.sm, color: colors.textLight },
  chipTextActive: { color: '#FFF', fontWeight: '600' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  statCard: { flex: 1, minWidth: 140, backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  statValue: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: fontSize.xs, color: colors.textLight, marginTop: 2 },
  downloadSection: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  downloadTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  downloadRow: { flexDirection: 'row', gap: spacing.md },
  downloadBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: 16, borderRadius: borderRadius.md },
  pdfBtn: { backgroundColor: '#DC2626' },
  excelBtn: { backgroundColor: '#059669' },
  downloadBtnText: { color: '#FFF', fontSize: fontSize.md, fontWeight: '700' },
});
