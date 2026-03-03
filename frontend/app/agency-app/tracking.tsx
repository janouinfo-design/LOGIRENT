import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Platform, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api/axios';
import { useThemeStore } from '../../src/store/themeStore';

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

export default function AgencyTracking() {
  const { colors: C } = useThemeStore();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTracker, setSelectedTracker] = useState<Position | null>(null);
  const [lastRefresh, setLastRefresh] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [navixyUrl, setNavixyUrl] = useState('');
  const [navixyHash, setNavixyHash] = useState('');
  const [configured, setConfigured] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchConfig = async () => {
    try {
      const res = await api.get('/api/admin/my-agency/navixy');
      setNavixyUrl(res.data.navixy_api_url || '');
      setNavixyHash(res.data.navixy_hash || '');
      setConfigured(res.data.configured);
      return res.data.configured;
    } catch { return false; }
  };

  const fetchPositions = useCallback(async () => {
    try {
      setError('');
      const resp = await api.get('/api/navixy/positions');
      setPositions(resp.data);
      setLastRefresh(new Date().toLocaleTimeString('fr-CH'));
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Erreur de connexion GPS';
      setError(msg);
      setPositions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const isConfigured = await fetchConfig();
      if (isConfigured) {
        fetchPositions();
        intervalRef.current = setInterval(fetchPositions, 30000);
      } else {
        setLoading(false);
      }
    })();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const saveConfig = async () => {
    setSaving(true);
    try {
      await api.put('/api/admin/my-agency/navixy', {
        navixy_api_url: navixyUrl,
        navixy_hash: navixyHash,
      });
      setConfigured(true);
      setShowConfig(false);
      setLoading(true);
      fetchPositions();
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(fetchPositions, 30000);
    } catch (e: any) {
      const msg = e.response?.data?.detail || 'Erreur';
      if (Platform.OS === 'web') window.alert(msg);
    } finally { setSaving(false); }
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

  const filteredPositions = search.length > 0
    ? positions.filter(p => p.label.toLowerCase().includes(search.toLowerCase()))
    : positions;

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

  function renderConfigModal() {
    return (
      <Modal visible={showConfig} transparent animationType="slide" onRequestClose={() => setShowConfig(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modal, { backgroundColor: C.card }]}>
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: C.text }]}>Configuration Navixy</Text>
              <TouchableOpacity onPress={() => setShowConfig(false)}>
                <Ionicons name="close" size={24} color={C.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <View style={[s.infoBox, { backgroundColor: C.accent + '10', borderColor: C.accent + '30' }]}>
                <Ionicons name="information-circle" size={18} color={C.accent} />
                <Text style={[s.infoText, { color: C.textLight }]}>
                  Connectez-vous sur navixy.com pour obtenir votre URL API et votre clé (hash).
                </Text>
              </View>
              <Text style={[s.label, { color: C.textLight }]}>URL API Navixy</Text>
              <TextInput
                style={[s.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]}
                placeholder="https://api.navixy.com/v2"
                placeholderTextColor={C.textLight}
                value={navixyUrl}
                onChangeText={setNavixyUrl}
                autoCapitalize="none"
                data-testid="navixy-url-input"
              />
              <Text style={[s.label, { color: C.textLight }]}>Hash API (clé d'authentification)</Text>
              <TextInput
                style={[s.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]}
                placeholder="votre_hash_navixy"
                placeholderTextColor={C.textLight}
                value={navixyHash}
                onChangeText={setNavixyHash}
                autoCapitalize="none"
                secureTextEntry
                data-testid="navixy-hash-input"
              />
              <TouchableOpacity
                style={[s.saveBtn, { backgroundColor: C.primary }, saving && { opacity: 0.6 }]}
                onPress={saveConfig}
                disabled={saving || !navixyUrl || !navixyHash}
                data-testid="save-navixy-btn"
              >
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={s.saveBtnText}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: C.bg }]}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={[s.loadingText, { color: C.textLight }]}>Chargement GPS...</Text>
      </View>
    );
  }

  if (!configured && !error) {
    return (
      <View style={[s.center, { backgroundColor: C.bg }]}>
        <Ionicons name="navigate-circle-outline" size={64} color={C.textLight} />
        <Text style={[s.setupTitle, { color: C.text }]}>Suivi GPS</Text>
        <Text style={[s.setupDesc, { color: C.textLight }]}>
          Configurez votre clé API Navixy pour activer le suivi GPS de votre flotte.
        </Text>
        <TouchableOpacity style={[s.configBtn, { backgroundColor: C.primary }]} onPress={() => setShowConfig(true)} data-testid="setup-navixy-btn">
          <Ionicons name="settings" size={18} color="#fff" />
          <Text style={s.configBtnText}>Configurer Navixy</Text>
        </TouchableOpacity>
        {renderConfigModal()}
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: C.bg }]} data-testid="tracking-page">
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
              <Text style={[s.mapLabelText, { color: C.textLight }]}>Sélectionnez un véhicule</Text>
            </View>
          )}
          <iframe
            key={selectedTracker?.tracker_id || 'default'}
            src={getMapUrl()}
            style={{ width: '100%', height: 280, border: 'none' } as any}
            title="GPS Map"
          />
        </View>
      )}

      {/* Scrollable content */}
      <ScrollView style={s.scrollArea} contentContainerStyle={s.scrollContent}>
        {/* Header row */}
        <View style={s.headerRow}>
          <View>
            <Text style={[s.title, { color: C.text }]}>Suivi GPS</Text>
            <Text style={[s.subtitle, { color: C.textLight }]}>MAJ: {lastRefresh}</Text>
          </View>
          <View style={s.headerActions}>
            <TouchableOpacity style={[s.iconBtn, { backgroundColor: C.card, borderColor: C.border }]} onPress={fetchPositions} data-testid="refresh-gps-btn">
              <Ionicons name="refresh" size={18} color={C.accent} />
            </TouchableOpacity>
            <TouchableOpacity style={[s.iconBtn, { backgroundColor: C.card, borderColor: C.border }]} onPress={() => { fetchConfig(); setShowConfig(true); }} data-testid="config-navixy-btn">
              <Ionicons name="settings-outline" size={18} color={C.textLight} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Error */}
        {error ? (
          <View style={[s.errorBox, { backgroundColor: C.error + '15', borderColor: C.error + '30' }]}>
            <Ionicons name="alert-circle" size={18} color={C.error} />
            <Text style={[s.errorText, { color: C.error }]}>{error}</Text>
            <TouchableOpacity onPress={() => { fetchConfig(); setShowConfig(true); }}>
              <Text style={[s.errorLink, { color: C.accent }]}>Configurer</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Stats */}
        {!error && (
          <View style={s.statsRow}>
            <View style={[s.statCard, { backgroundColor: C.card, borderColor: C.border, borderLeftColor: C.success }]}>
              <Text style={[s.statNum, { color: C.text }]}>{movingCount}</Text>
              <Text style={[s.statLabel, { color: C.textLight }]}>En route</Text>
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
        )}

        {/* Search bar */}
        {!error && positions.length > 0 && (
          <View style={[s.searchBar, { backgroundColor: C.card, borderColor: C.border }]}>
            <Ionicons name="search" size={18} color={C.textLight} />
            <TextInput
              style={[s.searchInput, { color: C.text }]}
              placeholder="Rechercher un véhicule..."
              placeholderTextColor={C.textLight}
              value={search}
              onChangeText={setSearch}
              data-testid="gps-search-input"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color={C.textLight} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Vehicle list - 4 column grid */}
        {!error && filteredPositions.length > 0 && (
          <>
            <Text style={[s.sectionTitle, { color: C.text }]}>Véhicules ({filteredPositions.length}{search ? ` / ${positions.length}` : ''})</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {filteredPositions.map((p) => (
                <TouchableOpacity
                  key={p.tracker_id}
                  style={[
                    s.vehicleCard,
                    { backgroundColor: C.card, borderColor: selectedTracker?.tracker_id === p.tracker_id ? C.accent : C.border, width: '23.5%' },
                    selectedTracker?.tracker_id === p.tracker_id && { borderWidth: 2 }
                  ]}
                  onPress={() => setSelectedTracker(p)}
                  data-testid={`vehicle-tracker-${p.tracker_id}`}
                >
                  {/* Status icon top */}
                  <View style={{ alignItems: 'center', paddingVertical: 10, position: 'relative' }}>
                    <View style={[{ width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', backgroundColor: getStatusColor(p) + '20' }]}>
                      <Ionicons name={p.connection_status === 'active' ? (p.movement_status === 'moving' ? 'car-sport' : 'car') : 'cloud-offline'} size={18} color={getStatusColor(p)} />
                    </View>
                    {selectedTracker?.tracker_id === p.tracker_id && (
                      <View style={{ position: 'absolute', top: 4, right: 4, width: 16, height: 16, borderRadius: 8, backgroundColor: C.accent, justifyContent: 'center', alignItems: 'center' }}>
                        <Ionicons name="location" size={10} color="#fff" />
                      </View>
                    )}
                  </View>
                  {/* Info */}
                  <View style={{ paddingHorizontal: 8, paddingBottom: 8 }}>
                    <Text style={[s.vehicleName, { textAlign: 'center', fontSize: 13 }]} numberOfLines={1}>{p.label}</Text>
                    <View style={[s.badge, { backgroundColor: getStatusColor(p) + '20', alignSelf: 'center', marginTop: 4 }]}>
                      <Text style={[s.badgeText, { color: getStatusColor(p), fontSize: 12 }]}>{getStatusLabel(p)}</Text>
                    </View>
                    {p.lat && p.lng ? (
                      <Text style={[s.detailText, { color: C.textLight, textAlign: 'center', marginTop: 4, fontSize: 11 }]}>{p.speed} km/h</Text>
                    ) : null}
                    <Text style={[s.detailText, { color: C.textLight, textAlign: 'center', fontSize: 11, marginTop: 2 }]}>
                      {p.ignition ? 'Moteur ON' : 'Moteur OFF'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {!error && filteredPositions.length === 0 && search.length > 0 && (
          <View style={s.emptyState}>
            <Ionicons name="search-outline" size={40} color={C.textLight} />
            <Text style={[s.emptyText, { color: C.textLight }]}>Aucun résultat pour "{search}"</Text>
          </View>
        )}

        {!error && positions.length === 0 && configured && (
          <View style={s.emptyState}>
            <Ionicons name="car-outline" size={40} color={C.textLight} />
            <Text style={[s.emptyText, { color: C.textLight }]}>Aucun tracker trouvé</Text>
          </View>
        )}
      </ScrollView>

      {renderConfigModal()}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  loadingText: { marginTop: 12, fontSize: 14 },
  setupTitle: { fontSize: 22, fontWeight: '800', marginTop: 16, marginBottom: 8 },
  setupDesc: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  configBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  configBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  mapContainer: { borderBottomWidth: 1, overflow: 'hidden' },
  mapLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8 },
  mapLabelText: { flex: 1, color: '#fff', fontSize: 13, fontWeight: '600' },
  scrollArea: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  title: { fontSize: 20, fontWeight: '800' },
  subtitle: { fontSize: 11, marginTop: 2 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: 10, borderWidth: 1, marginBottom: 16 },
  errorText: { flex: 1, fontSize: 13 },
  errorLink: { fontSize: 13, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 10, padding: 14, borderWidth: 1, borderLeftWidth: 3 },
  statNum: { fontSize: 26, fontWeight: '800' },
  statLabel: { fontSize: 11, marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  vehicleCard: { borderRadius: 10, padding: 14, marginBottom: 10, borderWidth: 1 },
  vehicleHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  vehicleName: { flex: 1, fontWeight: '600', fontSize: 14 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  vehicleDetails: { paddingLeft: 18 },
  detailText: { fontSize: 12, marginBottom: 2 },
  selectedIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  emptyState: { alignItems: 'center', paddingTop: 40 },
  emptyText: { marginTop: 8, fontSize: 14 },
  searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 12, gap: 8, borderWidth: 1, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 16 },
  infoText: { flex: 1, fontSize: 12, lineHeight: 18 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, borderWidth: 1 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, paddingVertical: 14, marginTop: 20 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
