import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Platform, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
import { useThemeStore } from '../../src/store/themeStore';
const C = { bg: '#0f0f14', card: '#1a1a24', accent: '#7c3aed', accentLight: '#a78bfa', border: '#2a2a3a', text: '#fff', textSecondary: '#9ca3af', success: '#22c55e', warning: '#f59e0b', error: '#ef4444' };

type Position = {
  tracker_id: number;
  label: string;
  lat: number | null;
  lng: number | null;
  speed: number;
  heading: number;
  connection_status: string;
  movement_status: string;
  ignition: boolean;
  last_update: string;
};

export default function TrackingScreen() {
  const router = useRouter();
  const { token, user } = useAuthStore();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedTracker, setSelectedTracker] = useState<Position | null>(null);
  const [lastRefresh, setLastRefresh] = useState('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchPositions = useCallback(async () => {
    try {
      const resp = await axios.get(`${API_URL}/api/navixy/positions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPositions(resp.data);
      setLastRefresh(new Date().toLocaleTimeString('fr-CH'));
    } catch (err) {
      console.error('Failed to fetch positions', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPositions();
    intervalRef.current = setInterval(fetchPositions, 30000); // refresh every 30s
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchPositions]);

  const syncVehicles = async () => {
    setSyncing(true);
    try {
      const resp = await axios.post(`${API_URL}/api/navixy/sync-vehicles`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (Platform.OS === 'web') window.alert(resp.data.message);
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Erreur de synchronisation';
      if (Platform.OS === 'web') window.alert(msg);
    } finally {
      setSyncing(false);
    }
  };

  const getStatusColor = (p: Position) => {
    if (p.connection_status !== 'active') return C.error;
    if (p.movement_status === 'moving') return C.success;
    return C.warning;
  };

  const getStatusLabel = (p: Position) => {
    if (p.connection_status !== 'active') return 'Hors ligne';
    if (p.movement_status === 'moving') return 'En mouvement';
    return 'Stationné';
  };

  const movingCount = positions.filter(p => p.movement_status === 'moving' && p.connection_status === 'active').length;
  const parkedCount = positions.filter(p => p.movement_status !== 'moving' && p.connection_status === 'active').length;
  const offlineCount = positions.filter(p => p.connection_status !== 'active').length;

  if (loading) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={[s.text, { marginTop: 12 }]}>Chargement des positions GPS...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} data-testid="back-btn">
          <Text style={s.backText}>Retour</Text>
        </TouchableOpacity>
        <Text style={s.title}>Suivi GPS Flotte</Text>
        <Text style={s.subtitle}>Dernière mise à jour: {lastRefresh}</Text>
      </View>

      {/* Stats Cards */}
      <View style={s.statsRow}>
        <View style={[s.statCard, { borderLeftColor: C.success }]}>
          <Text style={s.statNum}>{movingCount}</Text>
          <Text style={s.statLabel}>En mouvement</Text>
        </View>
        <View style={[s.statCard, { borderLeftColor: C.warning }]}>
          <Text style={s.statNum}>{parkedCount}</Text>
          <Text style={s.statLabel}>Stationnés</Text>
        </View>
        <View style={[s.statCard, { borderLeftColor: C.error }]}>
          <Text style={s.statNum}>{offlineCount}</Text>
          <Text style={s.statLabel}>Hors ligne</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={s.actionsRow}>
        <TouchableOpacity style={s.refreshBtn} onPress={fetchPositions} data-testid="refresh-btn">
          <Text style={s.refreshText}>Actualiser</Text>
        </TouchableOpacity>
        {user?.role === 'super_admin' && (
          <TouchableOpacity style={s.syncBtn} onPress={syncVehicles} disabled={syncing} data-testid="sync-btn">
            <Text style={s.syncText}>{syncing ? 'Synchronisation...' : 'Synchroniser véhicules'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Map placeholder with embedded iframe */}
      {selectedTracker && selectedTracker.lat && selectedTracker.lng && Platform.OS === 'web' && (
        <View style={s.mapContainer} data-testid="map-container">
          <View style={s.mapHeader}>
            <Text style={s.mapTitle}>{selectedTracker.label}</Text>
            <TouchableOpacity onPress={() => setSelectedTracker(null)}>
              <Text style={s.closeMap}>Fermer</Text>
            </TouchableOpacity>
          </View>
          <iframe
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${selectedTracker.lng - 0.01},${selectedTracker.lat - 0.01},${selectedTracker.lng + 0.01},${selectedTracker.lat + 0.01}&layer=mapnik&marker=${selectedTracker.lat},${selectedTracker.lng}`}
            style={{ width: '100%', height: 300, border: 'none', borderRadius: 8 } as any}
          />
        </View>
      )}

      {/* Vehicle List */}
      <Text style={s.sectionTitle}>Véhicules ({positions.length})</Text>
      {positions.map((p) => (
        <TouchableOpacity
          key={p.tracker_id}
          style={[s.vehicleCard, selectedTracker?.tracker_id === p.tracker_id && s.vehicleCardSelected]}
          onPress={() => setSelectedTracker(p)}
          data-testid={`tracker-${p.tracker_id}`}
        >
          <View style={s.vehicleHeader}>
            <View style={[s.statusDot, { backgroundColor: getStatusColor(p) }]} />
            <Text style={s.vehicleName} numberOfLines={1}>{p.label}</Text>
            <View style={[s.statusBadge, { backgroundColor: getStatusColor(p) + '20' }]}>
              <Text style={[s.statusText, { color: getStatusColor(p) }]}>{getStatusLabel(p)}</Text>
            </View>
          </View>
          <View style={s.vehicleDetails}>
            {p.lat && p.lng ? (
              <>
                <Text style={s.detailText}>Lat: {p.lat?.toFixed(5)} | Lng: {p.lng?.toFixed(5)}</Text>
                <Text style={s.detailText}>Vitesse: {p.speed} km/h</Text>
              </>
            ) : (
              <Text style={s.detailText}>Position non disponible</Text>
            )}
            <Text style={s.detailText}>
              Moteur: {p.ignition ? 'Allumé' : 'Éteint'} | MAJ: {p.last_update || 'N/A'}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingBottom: 40 },
  header: { marginBottom: 20 },
  backText: { color: C.accentLight, fontSize: 14, marginBottom: 8 },
  title: { color: C.text, fontSize: 24, fontWeight: '700' },
  subtitle: { color: C.textSecondary, fontSize: 12, marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: C.card, borderRadius: 10, padding: 14, borderLeftWidth: 3 },
  statNum: { color: C.text, fontSize: 28, fontWeight: '700' },
  statLabel: { color: C.textSecondary, fontSize: 11, marginTop: 2 },
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  refreshBtn: { flex: 1, backgroundColor: C.card, borderRadius: 8, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  refreshText: { color: C.accentLight, fontWeight: '600', fontSize: 14 },
  syncBtn: { flex: 1, backgroundColor: C.accent, borderRadius: 8, padding: 12, alignItems: 'center' },
  syncText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  mapContainer: { backgroundColor: C.card, borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
  mapHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 },
  mapTitle: { color: C.text, fontWeight: '600', fontSize: 14 },
  closeMap: { color: C.error, fontSize: 13 },
  sectionTitle: { color: C.text, fontSize: 16, fontWeight: '600', marginBottom: 12 },
  vehicleCard: { backgroundColor: C.card, borderRadius: 10, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  vehicleCardSelected: { borderColor: C.accent },
  vehicleHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  vehicleName: { flex: 1, color: C.text, fontWeight: '600', fontSize: 14 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600' },
  vehicleDetails: { paddingLeft: 18 },
  detailText: { color: C.textSecondary, fontSize: 12, marginBottom: 2 },
  text: { color: C.textSecondary },
});
