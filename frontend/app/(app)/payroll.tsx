import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../../src/theme/constants';
import { getPayrollVariables, exportPayroll } from '../../src/services/api';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function PayrollScreen() {
  const [payroll, setPayroll] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [exporting, setExporting] = useState('');

  useEffect(() => {
    setLoading(true);
    getPayrollVariables({ month, year }).then(r => setPayroll(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [month, year]);

  const handleExport = async (format: string) => {
    setExporting(format);
    try {
      const res = await exportPayroll(format, { month, year });
      if (Platform.OS === 'web') {
        const types: Record<string,string> = { cresus: 'text/csv', abacus: 'application/xml', winbiz: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
        const exts: Record<string,string> = { cresus: 'csv', abacus: 'xml', winbiz: 'xlsx' };
        const blob = new Blob([res.data], { type: types[format] });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url;
        a.download = `${format}_paie_${month}_${year}.${exts[format]}`;
        a.click(); URL.revokeObjectURL(url);
      }
    } catch(e: any) { alert(e.response?.data?.detail || 'Erreur'); }
    finally { setExporting(''); }
  };

  const totals = payroll.reduce((acc, p) => ({
    hours: acc.hours + p.total_hours, overtime: acc.overtime + p.overtime_hours,
    expenses: acc.expenses + p.expense_total, gross: acc.gross + p.gross_salary
  }), { hours: 0, overtime: 0, expenses: 0, gross: 0 });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Variables de paie</Text>

      {/* Period Selector */}
      <View style={styles.filterCard}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {MONTHS.map((m, i) => (
            <Pressable key={i} style={[styles.chip, month === i + 1 && styles.chipActive]} onPress={() => setMonth(i + 1)}>
              <Text style={[styles.chipText, month === i + 1 && styles.chipTextActive]}>{m}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
          {[2025, 2026].map(y => (
            <Pressable key={y} style={[styles.chip, year === y && styles.chipActive]} onPress={() => setYear(y)}>
              <Text style={[styles.chipText, year === y && styles.chipTextActive]}>{y}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { borderLeftColor: colors.primary }]}><Text style={[styles.summaryValue, { color: colors.primary }]}>{totals.hours.toFixed(0)}h</Text><Text style={styles.summaryLabel}>Heures totales</Text></View>
        <View style={[styles.summaryCard, { borderLeftColor: '#F59E0B' }]}><Text style={[styles.summaryValue, { color: '#F59E0B' }]}>{totals.overtime.toFixed(0)}h</Text><Text style={styles.summaryLabel}>Supplementaires</Text></View>
        <View style={[styles.summaryCard, { borderLeftColor: '#059669' }]}><Text style={[styles.summaryValue, { color: '#059669' }]}>{totals.gross.toFixed(0)} CHF</Text><Text style={styles.summaryLabel}>Brut total</Text></View>
      </View>

      {/* Export Buttons */}
      <View style={styles.exportSection}>
        <Text style={styles.exportTitle}>Exporter vers logiciel de paie</Text>
        <View style={styles.exportRow}>
          {[{id:'cresus',name:'Cresus',icon:'description',color:'#2563EB'},{id:'abacus',name:'Abacus',icon:'code',color:'#059669'},{id:'winbiz',name:'WinBiz',icon:'table-chart',color:'#7C3AED'}].map(sw => (
            <Pressable key={sw.id} style={[styles.exportBtn, { backgroundColor: sw.color }]} onPress={() => handleExport(sw.id)} disabled={exporting !== ''}>
              {exporting === sw.id ? <ActivityIndicator size="small" color="#FFF" /> : <MaterialIcons name={sw.icon as any} size={20} color="#FFF" />}
              <Text style={styles.exportBtnText}>{sw.name}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Payroll Table */}
      {loading ? <ActivityIndicator size="large" color={colors.primary} /> : (
        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
          <View>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={[styles.tableCell, styles.cellName, styles.headerText]}>Employe</Text>
              <Text style={[styles.tableCell, styles.cellNum, styles.headerText]}>Contrat</Text>
              <Text style={[styles.tableCell, styles.cellNum, styles.headerText]}>Heures</Text>
              <Text style={[styles.tableCell, styles.cellNum, styles.headerText]}>Supp.</Text>
              <Text style={[styles.tableCell, styles.cellNum, styles.headerText]}>Nuit</Text>
              <Text style={[styles.tableCell, styles.cellNum, styles.headerText]}>Maladie</Text>
              <Text style={[styles.tableCell, styles.cellNum, styles.headerText]}>Vacances</Text>
              <Text style={[styles.tableCell, styles.cellNum, styles.headerText]}>Frais</Text>
              <Text style={[styles.tableCell, styles.cellNum, styles.headerText]}>Taux</Text>
              <Text style={[styles.tableCell, styles.cellNum, styles.headerText]}>Brut</Text>
            </View>
            {payroll.map((p, i) => (
              <View key={p.user_id} style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}>
                <View style={[styles.tableCell, styles.cellName]}><Text style={styles.cellNameText}>{p.name}</Text>{p.department && <Text style={styles.cellDept}>{p.department}</Text>}</View>
                <Text style={[styles.tableCell, styles.cellNum]}>{p.contract_hours}h</Text>
                <Text style={[styles.tableCell, styles.cellNum, { fontWeight: '700' }]}>{p.total_hours}h</Text>
                <Text style={[styles.tableCell, styles.cellNum, p.overtime_hours > 0 && { color: '#F59E0B' }]}>{p.overtime_hours}h</Text>
                <Text style={[styles.tableCell, styles.cellNum]}>{p.night_hours}h</Text>
                <Text style={[styles.tableCell, styles.cellNum, p.sick_days > 0 && { color: '#DC2626' }]}>{p.sick_days}j</Text>
                <Text style={[styles.tableCell, styles.cellNum]}>{p.vacation_days}j</Text>
                <Text style={[styles.tableCell, styles.cellNum]}>{p.expense_total} CHF</Text>
                <Text style={[styles.tableCell, styles.cellNum]}>{p.hourly_rate}</Text>
                <Text style={[styles.tableCell, styles.cellNum, { fontWeight: '800', color: colors.primary }]}>{p.gross_salary} CHF</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, marginBottom: spacing.lg },
  filterCard: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, marginRight: spacing.xs },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: fontSize.sm, color: colors.textLight },
  chipTextActive: { color: '#FFF', fontWeight: '600' },
  summaryRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  summaryCard: { flex: 1, backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 4 },
  summaryValue: { fontSize: fontSize.xl, fontWeight: '800' },
  summaryLabel: { fontSize: fontSize.xs, color: colors.textLight },
  exportSection: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border },
  exportTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  exportRow: { flexDirection: 'row', gap: spacing.sm },
  exportBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: 14, borderRadius: borderRadius.md },
  exportBtnText: { color: '#FFF', fontSize: fontSize.md, fontWeight: '700' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  tableRowAlt: { backgroundColor: '#F8FAFC' },
  tableHeader: { backgroundColor: colors.secondary },
  headerText: { color: '#FFF', fontWeight: '700' },
  tableCell: { paddingVertical: 10, paddingHorizontal: 8, fontSize: fontSize.sm, color: colors.text },
  cellName: { width: 180 },
  cellNameText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  cellDept: { fontSize: 10, color: colors.textLight },
  cellNum: { width: 90, textAlign: 'center' },
});
