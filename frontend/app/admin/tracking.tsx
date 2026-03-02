import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeStore } from '../../src/store/themeStore';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

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

const DEFAULT_LAT = 46.8182;
const DEFAULT_LNG = 8.2275;
const DEFAULT_ZOOM_BBOX = 2.0;
const SELECTED_ZOOM_BBOX = 0.008;

function buildMapUrl(lat: number, lng: number, zoom: number, markerLat?: number, markerLng?: number) {
  const bbox = `${lng - zoom},${lat - zoom},${lng + zoom},${lat + zoom}`;
  let url = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik`;
  if (markerLat !== undefined && markerLng !== undefined) {
    url += `&marker=${markerLat},${markerLng}`;
  }
  return url;
}

export default function TrackingScreen() {
  const { colors: _c } = useThemeStore();
  const C = { bg: _c.bg, card: _c.card, accent: _c.accent, primary: _c.primary, border: _c.border, text: _c.text, textLight: _c.textLight, success: _c.success, warning: _c.warning, error: _c.error };
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
    intervalRef.current = setInterval(fetchPositions, 30000);
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

  const getMapUrl = () => {
    if (selectedTracker?.lat && selectedTracker?.lng) {
      return buildMapUrl(selectedTracker.lat, selectedTracker.lng, SELECTED_ZOOM_BBOX, selectedTracker.lat, selectedTracker.lng);
    }
    const firstWithPos = positions.find(p => p.lat && p.lng);
    if (firstWithPos?.lat && firstWithPos?.lng) {
      return buildMapUrl(firstWithPos.lat, firstWithPos.lng, 0.05);
    }
    return buildMapUrl(DEFAULT_LAT, DEFAULT_LNG, DEFAULT_ZOOM_BBOX);
  };

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: C.bg }]}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={{ color: C.textLight, marginTop: 12, fontSize: 14 }}>Chargement des positions GPS...</Text>
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: C.bg }]} data-testid="admin-tracking-page">
      {/* Fixed Map at top */}
      {Platform.OS === 'web' && (
        <View style={[s.mapContainer, { backgroundColor: C.card, borderColor: C.border }]} data-testid="map-container">
          {selectedTracker ? (
            <View style={[s.mapLabel, { backgroundColor: C.accent }]}>
              <Ionicons name="location" size={14} color="#fff" />
              <Text style={s.mapLabelText}>{selectedTracker.label}</Text>
              <TouchableOpacity onPress={() => setSelectedTracker(null)} data-testid="clear-selection-btn">
                <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.8)" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[s.mapLabel, { backgroundColor: C.card }]}>
              <Ionicons name="map" size={14} color={C.textLight} />
              <Text style={[s.mapLabelTextDef, { color: C.textLight }]}>Sélectionnez un véhicule pour le localiser</Text>
            </View>
          )}
          <iframe
            key={selectedTracker?.tracker_id || 'default'}
            src={getMapUrl()}
            style={{ width: '100%', height: 300, border: 'none' } as any}
            title="GPS Map"
          />
        </View>
      )}

      {/* Scrollable content */}
      <ScrollView style={s.scrollArea} contentContainerStyle={s.scrollContent}>
        {/* Header */}
        <View style={s.headerRow}>
          <View>
            <TouchableOpacity onPress={() => router.back()} data-testid="back-btn">
              <Text style={{ color: C.primary, fontSize: 14, marginBottom: 4 }}>Retour</Text>
            </TouchableOpacity>
            <Text style={[s.title, { color: C.text }]}>Suivi GPS Flotte</Text>
            <Text style={{ color: C.textLight, fontSize: 11, marginTop: 2 }}>MAJ: {lastRefresh}</Text>
          </View>
          <View style={s.headerActions}>
            <TouchableOpacity style={[s.iconBtn, { backgroundColor: C.card, borderColor: C.border }]} onPress={fetchPositions} data-testid="refresh-btn">
              <Ionicons name="refresh" size={18} color={C.accent} />
            </TouchableOpacity>
            {user?.role === 'super_admin' && (
              <TouchableOpacity
                style={[s.syncBtn, { backgroundColor: C.accent }, syncing && { opacity: 0.6 }]}
                onPress={syncVehicles}
                disabled={syncing}
                data-testid="sync-btn"
              >
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>
                  {syncing ? 'Sync...' : 'Sync véhicules'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Stats Cards */}
        <View style={s.statsRow}>
          <View style={[s.statCard, { backgroundColor: C.card, borderColor: C.border, borderLeftColor: C.success }]}>
            <Text style={[s.statNum, { color: C.text }]}>{movingCount}</Text>
            <Text style={[s.statLabel, { color: C.textLight }]}>En mouvement</Text>
          </View>
          <View style={[s.statCard, { backgroundColor: C.card, borderColor: C.border, borderLeftColor: C.warning }]}>
            <Text style={[s.statNum, { color: C.text }]}>{parkedCount}</Text>
            <Text style={[s.statLabel, { color: C.textLight }]}>Stationnés</Text>
          </View>
          <View style={[s.statCard, { backgroundColor: C.card, borderColor: C.border, borderLeftColor: C.error }]}>
            <Text style={[s.statNum, { color: C.text }]}>{offlineCount}</Text>
            <Text style={[s.statLabel, { color: C.textLight }]}>Hors ligne</Text>
          </View>
        </View>

        {/* Vehicle List */}
        <Text style={[s.sectionTitle, { color: C.text }]}>Véhicules ({positions.length})</Text>
        {positions.map((p) => (
          <TouchableOpacity
            key={p.tracker_id}
            style={[
              s.vehicleCard,
              { backgroundColor: C.card, borderColor: selectedTracker?.tracker_id === p.tracker_id ? C.accent : C.border },
              selectedTracker?.tracker_id === p.tracker_id && { borderWidth: 2 }
            ]}
            onPress={() => setSelectedTracker(p)}
            data-testid={`tracker-${p.tracker_id}`}
          >
            <View style={s.vehicleHeader}>
              <View style={[s.statusDot, { backgroundColor: getStatusColor(p) }]} />
              <Text style={[s.vehicleName, { color: C.text }]} numberOfLines={1}>{p.label}</Text>
              <View style={[s.statusBadge, { backgroundColor: getStatusColor(p) + '20' }]}>
                <Text style={[s.statusText, { color: getStatusColor(p) }]}>{getStatusLabel(p)}</Text>
              </View>
            </View>
            <View style={s.vehicleDetails}>
              {p.lat && p.lng ? (
                <Text style={[s.detailText, { color: C.textLight }]}>
                  {p.lat?.toFixed(4)}, {p.lng?.toFixed(4)} | {p.speed} km/h
                </Text>
              ) : (
                <Text style={[s.detailText, { color: C.textLight }]}>Position non disponible</Text>
              )}
              <Text style={[s.detailText, { color: C.textLight }]}>
                Moteur: {p.ignition ? 'Allumé' : 'Éteint'} | MAJ: {p.last_update || 'N/A'}
              </Text>
            </View>
            {selectedTracker?.tracker_id === p.tracker_id && (
              <View style={[s.selectedIndicator, { backgroundColor: C.accent + '15' }]}>
                <Ionicons name="location" size={14} color={C.accent} />
                <Text style={{ color: C.accent, fontSize: 11, fontWeight: '600' }}>Affiché sur la carte</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}

        {positions.length === 0 && (
          <View style={s.emptyState}>
            <Ionicons name="car-outline" size={40} color={C.textLight} />
            <Text style={{ color: C.textLight, marginTop: 8, fontSize: 14 }}>Aucun véhicule GPS trouvé</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  mapContainer: { borderBottomWidth: 1, overflow: 'hidden' },
  mapLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8 },
  mapLabelText: { flex: 1, color: '#fff', fontSize: 13, fontWeight: '600' },
  mapLabelTextDef: { flex: 1, fontSize: 13, fontWeight: '600' },
  scrollArea: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  iconBtn: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  syncBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  title: { fontSize: 20, fontWeight: '800' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 10, padding: 14, borderWidth: 1, borderLeftWidth: 3 },
  statNum: { fontSize: 26, fontWeight: '800' },
  statLabel: { fontSize: 11, marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  vehicleCard: { borderRadius: 10, padding: 14, marginBottom: 10, borderWidth: 1 },
  vehicleHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  vehicleName: { flex: 1, fontWeight: '600', fontSize: 14 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600' },
  vehicleDetails: { paddingLeft: 18 },
  detailText: { fontSize: 12, marginBottom: 2 },
  selectedIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  emptyState: { alignItems: 'center', paddingTop: 40 },
});
