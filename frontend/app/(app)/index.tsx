import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator, Modal, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { colors, fontSize, spacing, borderRadius } from '../../src/theme/constants';
import { getCurrentEntry, clockIn, clockOut, startBreak, endBreak, getWeeklyStats, getDashboardStats, getTimeEntries, getProjects, updateTimeEntry, getBalances } from '../../src/services/api';
import { LeafletMap } from '../../src/components/LeafletMap';

interface CurrentEntry {
  active: boolean;
  on_break?: boolean;
  entry?: {
    id: string;
    clock_in: string;
    clock_out: string | null;
    project_name: string | null;
    project_id: string | null;
    activity_name: string | null;
    total_hours: number;
    break_hours: number;
    status: string;
  };
}

interface WeeklyStats {
  total_hours: number;
  billable_hours: number;
  overtime_hours: number;
  contract_hours: number;
  days_worked: number;
}

interface DashboardStats {
  total_employees: number;
  active_today: number;
  pending_entries: number;
  pending_leaves: number;
  billable_hours_month: number;
}

interface Project {
  id: string;
  name: string;
  client_name?: string;
  is_active: boolean;
  latitude?: number | null;
  longitude?: number | null;
  geofence_radius?: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [current, setCurrent] = useState<CurrentEntry | null>(null);
  const [weekStats, setWeekStats] = useState<WeeklyStats | null>(null);
  const [dashStats, setDashStats] = useState<DashboardStats | null>(null);
  const [recentEntries, setRecentEntries] = useState<any[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [balances, setBalances] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [now, setNow] = useState(new Date());
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState('');
  // Project selected BEFORE clock-in
  const [preSelectedProjectId, setPreSelectedProjectId] = useState<string | null>(null);
  const [workLocation, setWorkLocation] = useState<string>('office');

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Watch GPS position
  useEffect(() => {
    if (Platform.OS === 'web' && navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setUserLat(pos.coords.latitude);
          setUserLng(pos.coords.longitude);
          setGpsError('');
        },
        () => setGpsError('GPS non disponible'),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [currentRes, weekRes, projRes, balRes] = await Promise.all([
        getCurrentEntry(),
        getWeeklyStats(),
        getProjects({ active_only: true }),
        getBalances(),
      ]);
      setCurrent(currentRes.data);
      setWeekStats(weekRes.data);
      setProjects(projRes.data);
      setBalances(balRes.data);

      if (user?.role === 'manager' || user?.role === 'admin') {
        const [dashRes, entriesRes] = await Promise.all([
          getDashboardStats(),
          getTimeEntries({ status: 'pending' }),
        ]);
        setDashStats(dashRes.data);
        setRecentEntries(entriesRes.data.slice(0, 5));
      }
    } catch (err) {
      console.log('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAction = async (action: string) => {
    setActionLoading(action);
    try {
      if (action === 'clockin') {
        await clockIn({
          project_id: preSelectedProjectId,
          latitude: userLat,
          longitude: userLng,
          work_location: workLocation
        });
        setPreSelectedProjectId(null);
      }
      else if (action === 'clockout') await clockOut({});
      else if (action === 'break') {
        if (current?.on_break) await endBreak();
        else await startBreak();
      }
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erreur');
    } finally {
      setActionLoading('');
    }
  };

  // Project picker for when already clocked in (change project on active entry)
  const handleSelectProject = async (projectId: string | null) => {
    setShowProjectPicker(false);
    if (!current?.active || !current.entry) return;
    try {
      await updateTimeEntry(current.entry.id, { project_id: projectId });
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erreur');
    }
  };

  // Determine which project to check for geofence
  const isActive = current?.active || false;
  const isOnBreak = current?.on_break || false;
  const isManager = user?.role === 'manager' || user?.role === 'admin';

  // The relevant project: if clocked in, use current entry's project; if not, use pre-selected
  const activeProjectId = isActive ? current?.entry?.project_id : preSelectedProjectId;
  const activeProject = projects.find(p => p.id === activeProjectId) as Project | undefined;
  const projectHasGeo = activeProject?.latitude && activeProject?.longitude;

  // Distance calculation
  const getDistance = (): number | null => {
    if (!projectHasGeo || !userLat || !userLng || !activeProject?.latitude || !activeProject?.longitude) return null;
    const R = 6371000;
    const dLat = (activeProject.latitude - userLat) * Math.PI / 180;
    const dLon = (activeProject.longitude - userLng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(userLat * Math.PI / 180) * Math.cos(activeProject.latitude * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const distance = getDistance();
  const geoRadius = activeProject?.geofence_radius || 100;
  const isInZone = distance !== null ? distance <= geoRadius : null;

  // Clock-in conditions: if project has geofencing, GPS must be available and user must be in zone
  const gpsRequired = projectHasGeo;
  const gpsAvailable = userLat !== null && userLng !== null;
  const canClockIn = !isActive && preSelectedProjectId !== null && (!gpsRequired || (gpsAvailable && isInZone === true));

  const currentProjectName = isActive && current?.entry?.project_name ? current.entry.project_name : 'Aucun';
  const preSelectedProject = projects.find(p => p.id === preSelectedProjectId);

  const formatTime = (d: Date) =>
    `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;

  const formatDate = (d: Date) => {
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const months = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];
    return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const getElapsedTime = () => {
    if (!current?.active || !current.entry) return '00:00:00';
    const start = new Date(current.entry.clock_in).getTime();
    const elapsed = Math.floor((now.getTime() - start) / 1000);
    const h = Math.floor(elapsed / 3600);
    const m = Math.floor((elapsed % 3600) / 60);
    const s = elapsed % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Bonjour, {user?.first_name}</Text>
          <Text style={styles.dateText}>{formatDate(now)}</Text>
        </View>
        <View style={styles.liveClockBox}>
          <Text style={styles.liveClockText}>{formatTime(now)}</Text>
        </View>
      </View>

      {/* Pointage Card */}
      <View style={styles.punchCard} data-testid="clock-section">
        {/* Status + Timer Row */}
        <View style={styles.timerRow}>
          <View style={styles.timerLeft}>
            <View style={[styles.statusDot, isActive ? (isOnBreak ? styles.dotBreak : styles.dotOn) : styles.dotOff]}>
              <MaterialIcons
                name={isActive ? (isOnBreak ? 'pause' : 'play-arrow') : 'power-settings-new'}
                size={22}
                color="#FFF"
              />
            </View>
            <View>
              <Text style={styles.statusTitle}>
                {isActive ? (isOnBreak ? 'En pause' : 'En service') : 'Hors service'}
              </Text>
              <Text style={styles.statusSub}>
                {isActive
                  ? `Depuis ${new Date(current!.entry!.clock_in).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' })}`
                  : 'Selectionnez un projet puis pointez'}
              </Text>
            </View>
          </View>
          <View style={styles.timerRight}>
            <Text style={[styles.timerText, isActive && styles.timerTextLive]}>
              {getElapsedTime()}
            </Text>
          </View>
        </View>

        {/* Shift Info Grid */}
        <View style={styles.shiftGrid}>
          <View style={styles.shiftCell}>
            <MaterialIcons name="login" size={20} color={colors.primary} />
            <Text style={styles.shiftCellLabel}>Arrivee</Text>
            <Text style={styles.shiftCellValue}>
              {isActive ? new Date(current!.entry!.clock_in).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
            </Text>
          </View>
          <View style={styles.shiftCell}>
            <MaterialIcons name="schedule" size={20} color={colors.success} />
            <Text style={styles.shiftCellLabel}>Heures</Text>
            <Text style={styles.shiftCellValue}>
              {isActive ? `${current!.entry!.total_hours.toFixed(1)}h` : '0.0h'}
            </Text>
          </View>
          <View style={styles.shiftCell}>
            <MaterialIcons name="free-breakfast" size={20} color={colors.warning} />
            <Text style={styles.shiftCellLabel}>Pause</Text>
            <Text style={styles.shiftCellValue}>
              {isActive ? `${current!.entry!.break_hours.toFixed(1)}h` : '0.0h'}
            </Text>
          </View>
          {/* Project cell */}
          <Pressable
            style={[styles.shiftCell, (isActive || !isActive) && styles.shiftCellClickable]}
            onPress={() => {
              if (isActive) {
                setShowProjectPicker(true);
              }
            }}
            data-testid="project-picker-trigger"
          >
            <MaterialIcons name="folder-open" size={20} color="#8B5CF6" />
            <Text style={styles.shiftCellLabel}>Projet</Text>
            <Text style={[styles.shiftCellValue, styles.shiftCellValueLink]} numberOfLines={1}>
              {isActive ? currentProjectName : (preSelectedProject?.name || 'Aucun')}
            </Text>
            {isActive && (
              <MaterialIcons name="expand-more" size={16} color={colors.primary} style={{ marginTop: 2 }} />
            )}
          </Pressable>
        </View>

        {/* Project Selection for Clock-in (shown when NOT active) */}
        {!isActive && (
          <View style={styles.projectSelectSection} data-testid="project-select-section">
            <Text style={styles.projectSelectLabel}>
              <MaterialIcons name="folder" size={16} color={colors.primary} /> Projet pour le pointage :
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.projectChips}>
              {projects.filter(p => p.is_active).map((project) => {
                const selected = preSelectedProjectId === project.id;
                return (
                  <Pressable
                    key={project.id}
                    style={[styles.projectChip, selected && styles.projectChipActive]}
                    onPress={() => setPreSelectedProjectId(selected ? null : project.id)}
                    data-testid={`project-chip-${project.id}`}
                  >
                    {project.latitude && project.longitude && (
                      <MaterialIcons name="location-on" size={14} color={selected ? '#FFF' : colors.primary} />
                    )}
                    <Text style={[styles.projectChipText, selected && styles.projectChipTextActive]}>
                      {project.name}
                    </Text>
                    {selected && <MaterialIcons name="check" size={14} color="#FFF" />}
                  </Pressable>
                );
              })}
              {projects.filter(p => p.is_active).length === 0 && (
                <Text style={styles.noProjectText}>Aucun projet actif disponible</Text>
              )}
            </ScrollView>
            {!preSelectedProjectId && (
              <Text style={styles.projectWarning}>
                <MaterialIcons name="warning" size={13} color={colors.warning} /> Selectionnez un projet pour pointer
              </Text>
            )}

            {/* Work Location Selector */}
            {preSelectedProjectId && (
              <View style={styles.locationRow}>
                <Text style={styles.locationLabel}>Lieu :</Text>
                {[{k:'office',l:'Bureau',i:'business'},{k:'home',l:'Teletravail',i:'home'},{k:'onsite',l:'Chantier',i:'construction'}].map(loc => (
                  <Pressable key={loc.k} style={[styles.locationChip, workLocation === loc.k && styles.locationChipActive]} onPress={() => setWorkLocation(loc.k)}>
                    <MaterialIcons name={loc.i as any} size={14} color={workLocation === loc.k ? '#FFF' : colors.textLight} />
                    <Text style={[styles.locationChipText, workLocation === loc.k && styles.locationChipTextActive]}>{loc.l}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}

        {/* GPS Geofence Section */}
        {!isActive && preSelectedProjectId && projectHasGeo && activeProject && (
          <View style={styles.geoSection} data-testid="geofence-section">
            <View style={styles.geoHeader}>
              <MaterialIcons name="location-on" size={18} color={colors.primary} />
              <Text style={styles.geoTitle}>Zone de pointage</Text>
              {isInZone === true && (
                <View style={[styles.geoBadge, styles.geoBadgeOk]}>
                  <MaterialIcons name="check-circle" size={14} color="#065F46" />
                  <Text style={styles.geoBadgeTextOk}>Dans la zone</Text>
                </View>
              )}
              {isInZone === false && (
                <View style={[styles.geoBadge, styles.geoBadgeNo]}>
                  <MaterialIcons name="cancel" size={14} color="#991B1B" />
                  <Text style={styles.geoBadgeTextNo}>Hors zone ({Math.round(distance!)}m)</Text>
                </View>
              )}
              {isInZone === null && !gpsError && (
                <View style={[styles.geoBadge, styles.geoBadgeWait]}>
                  <ActivityIndicator size={12} color={colors.warning} />
                  <Text style={styles.geoBadgeTextWait}>Localisation...</Text>
                </View>
              )}
              {gpsError && (
                <View style={[styles.geoBadge, styles.geoBadgeNo]}>
                  <MaterialIcons name="gps-off" size={14} color="#991B1B" />
                  <Text style={styles.geoBadgeTextNo}>{gpsError}</Text>
                </View>
              )}
            </View>

            {/* Map */}
            <View style={styles.mapContainer}>
              <LeafletMap
                projectLat={activeProject.latitude!}
                projectLng={activeProject.longitude!}
                radius={geoRadius}
                userLat={userLat}
                userLng={userLng}
                height={220}
              />
            </View>

            {distance !== null && (
              <Text style={styles.distanceText}>
                Distance: {distance < 1000 ? `${Math.round(distance)}m` : `${(distance / 1000).toFixed(1)}km`}
                {' '} / Rayon autorise: {geoRadius}m
              </Text>
            )}
          </View>
        )}

        {/* 3 Action Buttons */}
        <View style={styles.actionRow}>
          <Pressable
            style={[styles.actionBtn, isActive || !canClockIn ? styles.btnGreenDisabled : styles.btnGreen]}
            onPress={() => handleAction('clockin')}
            disabled={isActive || !canClockIn || actionLoading !== ''}
            data-testid="clock-in-button"
          >
            {actionLoading === 'clockin' ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <MaterialIcons name="login" size={26} color={isActive || !canClockIn ? '#9CA3AF' : '#FFF'} />
            )}
            <Text style={[styles.actionLabel, (isActive || !canClockIn) && styles.actionLabelDisabled]}>Arrivee</Text>
          </Pressable>

          <Pressable
            style={[styles.actionBtn, !isActive ? styles.btnOrangeDisabled : (isOnBreak ? styles.btnOrangeActive : styles.btnOrange)]}
            onPress={() => handleAction('break')}
            disabled={!isActive || actionLoading !== ''}
            data-testid="break-button"
          >
            {actionLoading === 'break' ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <MaterialIcons name={isOnBreak ? 'play-arrow' : 'pause'} size={26} color={!isActive ? '#9CA3AF' : '#FFF'} />
            )}
            <Text style={[styles.actionLabel, !isActive && styles.actionLabelDisabled]}>
              {isOnBreak ? 'Reprendre' : 'Pause'}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.actionBtn, !isActive ? styles.btnRedDisabled : styles.btnRed]}
            onPress={() => handleAction('clockout')}
            disabled={!isActive || actionLoading !== ''}
            data-testid="clock-out-button"
          >
            {actionLoading === 'clockout' ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <MaterialIcons name="logout" size={26} color={!isActive ? '#9CA3AF' : '#FFF'} />
            )}
            <Text style={[styles.actionLabel, !isActive && styles.actionLabelDisabled]}>Depart</Text>
          </Pressable>
        </View>
      </View>

      {/* Weekly Stats */}
      {weekStats && (
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{weekStats.total_hours.toFixed(1)}h</Text>
            <Text style={styles.statLabel}>Heures / semaine</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${Math.min(100, (weekStats.total_hours / weekStats.contract_hours) * 100)}%` }]} />
            </View>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{weekStats.billable_hours.toFixed(1)}h</Text>
            <Text style={styles.statLabel}>Facturables</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, weekStats.overtime_hours > 0 && { color: colors.warning }]}>
              {weekStats.overtime_hours.toFixed(1)}h
            </Text>
            <Text style={styles.statLabel}>Supplementaires</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{weekStats.days_worked}</Text>
            <Text style={styles.statLabel}>Jours travailles</Text>
          </View>
        </View>
      )}

      {/* Balances (Soldes) */}
      {balances && (
        <View>
          <Text style={styles.sectionTitle}>Mes soldes</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, styles.statCardGreen]}>
              <Text style={[styles.statValue, { color: colors.success }]}>{balances.vacation_remaining}</Text>
              <Text style={styles.statLabel}>Vacances restantes</Text>
              <Text style={styles.statSub}>{balances.vacation_used} / {balances.vacation_total} jours pris</Text>
            </View>
            <View style={[styles.statCard, styles.statCardYellow]}>
              <Text style={[styles.statValue, { color: colors.warning }]}>{balances.overtime_hours}h</Text>
              <Text style={styles.statLabel}>Heures supplementaires</Text>
            </View>
            <View style={[styles.statCard, styles.statCardBlue]}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{balances.month_hours}h</Text>
              <Text style={styles.statLabel}>Heures ce mois</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${Math.min(100, (balances.month_hours / balances.month_target) * 100)}%`, backgroundColor: colors.primary }]} />
              </View>
            </View>
            <View style={styles.statCard}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={[styles.statValue, { color: '#2563EB', fontSize: fontSize.md }]}>{balances.office_days}</Text>
                  <Text style={styles.statSub}>Bureau</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={[styles.statValue, { color: '#7C3AED', fontSize: fontSize.md }]}>{balances.telework_days}</Text>
                  <Text style={styles.statSub}>Teletravail</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={[styles.statValue, { color: '#059669', fontSize: fontSize.md }]}>{balances.onsite_days}</Text>
                  <Text style={styles.statSub}>Chantier</Text>
                </View>
              </View>
              <Text style={styles.statLabel}>Repartition mois</Text>
            </View>
          </View>
        </View>
      )}

      {/* Manager Stats */}
      {isManager && dashStats && (
        <View>
          <Text style={styles.sectionTitle}>Vue d'ensemble</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, styles.statCardBlue]}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{dashStats.total_employees}</Text>
              <Text style={styles.statLabel}>Employes</Text>
            </View>
            <View style={[styles.statCard, styles.statCardGreen]}>
              <Text style={[styles.statValue, { color: colors.success }]}>{dashStats.active_today}</Text>
              <Text style={styles.statLabel}>Actifs aujourd'hui</Text>
            </View>
            <View style={[styles.statCard, styles.statCardYellow]}>
              <Text style={[styles.statValue, { color: colors.warning }]}>{dashStats.pending_entries}</Text>
              <Text style={styles.statLabel}>En attente</Text>
            </View>
            <View style={[styles.statCard, styles.statCardRed]}>
              <Text style={[styles.statValue, { color: colors.error }]}>{dashStats.pending_leaves}</Text>
              <Text style={styles.statLabel}>Absences</Text>
            </View>
          </View>
        </View>
      )}

      {/* Pending Entries */}
      {isManager && recentEntries.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pointages en attente</Text>
          {recentEntries.map((entry) => (
            <View key={entry.id} style={styles.entryRow}>
              <View style={styles.entryInfo}>
                <Text style={styles.entryName}>{entry.user_name}</Text>
                <Text style={styles.entryDate}>{entry.date}</Text>
              </View>
              <Text style={styles.entryHours}>{entry.duration.toFixed(1)}h</Text>
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>En attente</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Project Picker Modal (when already clocked in) */}
      <Modal visible={showProjectPicker} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowProjectPicker(false)}>
          <View style={styles.pickerModal}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Changer le projet</Text>
              <Pressable onPress={() => setShowProjectPicker(false)}>
                <MaterialIcons name="close" size={24} color={colors.textLight} />
              </Pressable>
            </View>

            <ScrollView style={styles.pickerList}>
              {projects.filter(p => p.is_active).map((project) => {
                const isSelected = current?.entry?.project_id === project.id;
                return (
                  <Pressable
                    key={project.id}
                    style={[styles.pickerItem, isSelected && styles.pickerItemActive]}
                    onPress={() => handleSelectProject(project.id)}
                    data-testid={`project-option-${project.id}`}
                  >
                    <MaterialIcons name="folder" size={20} color={isSelected ? colors.primary : '#8B5CF6'} />
                    <View style={styles.pickerItemContent}>
                      <Text style={[styles.pickerItemText, isSelected && styles.pickerItemTextActive]}>
                        {project.name}
                      </Text>
                      {project.client_name && (
                        <Text style={styles.pickerItemSub}>{project.client_name}</Text>
                      )}
                    </View>
                    {isSelected && (
                      <MaterialIcons name="check" size={20} color={colors.primary} />
                    )}
                  </Pressable>
                );
              })}
              {projects.filter(p => p.is_active).length === 0 && (
                <Text style={styles.pickerEmpty}>Aucun projet disponible</Text>
              )}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  contentContainer: { padding: spacing.md },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  greeting: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  dateText: { fontSize: fontSize.sm, color: colors.textLight, marginTop: 2 },
  liveClockBox: {
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
  },
  liveClockText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: '#FFF',
    fontVariant: ['tabular-nums'],
  },

  punchCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },

  timerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  timerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  statusDot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotOn: { backgroundColor: colors.success },
  dotOff: { backgroundColor: '#94A3B8' },
  dotBreak: { backgroundColor: colors.warning },
  statusTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  statusSub: { fontSize: fontSize.xs, color: colors.textLight, marginTop: 1 },
  timerRight: {},
  timerText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#CBD5E1',
    fontVariant: ['tabular-nums'],
  },
  timerTextLive: { color: colors.text },

  shiftGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  shiftCell: {
    flex: 1,
    minWidth: 100,
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    alignItems: 'center',
    gap: 4,
  },
  shiftCellClickable: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  shiftCellLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  shiftCellValue: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  shiftCellValueLink: {
    color: colors.primary,
  },

  /* Project Selection (pre clock-in) */
  projectSelectSection: {
    backgroundColor: '#F0F4FF',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  projectSelectLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  projectChips: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  projectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
  },
  projectChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  projectChipText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  projectChipTextActive: {
    color: '#FFF',
  },
  noProjectText: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    fontStyle: 'italic',
  },
  projectWarning: {
    fontSize: fontSize.xs,
    color: colors.warning,
    marginTop: 4,
  },

  /* Work Location Selector */
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#DBEAFE',
  },
  locationLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  locationChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  locationChipText: { fontSize: fontSize.xs, color: colors.textLight, fontWeight: '600' },
  locationChipTextActive: { color: '#FFF' },

  /* Geofence Section */
  geoSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  geoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    flexWrap: 'wrap',
  },
  geoTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  geoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  geoBadgeOk: { backgroundColor: '#D1FAE5' },
  geoBadgeNo: { backgroundColor: '#FEE2E2' },
  geoBadgeWait: { backgroundColor: '#FEF3C7' },
  geoBadgeTextOk: { fontSize: 11, fontWeight: '600', color: '#065F46' },
  geoBadgeTextNo: { fontSize: 11, fontWeight: '600', color: '#991B1B' },
  geoBadgeTextWait: { fontSize: 11, fontWeight: '600', color: '#92400E' },
  mapContainer: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  distanceText: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: 4,
  },

  actionRow: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  btnGreen: { backgroundColor: '#059669' },
  btnOrange: { backgroundColor: '#D97706' },
  btnOrangeActive: { backgroundColor: '#B45309' },
  btnRed: { backgroundColor: '#DC2626' },
  btnGreenDisabled: { backgroundColor: '#E5E7EB', borderWidth: 1, borderColor: '#D1D5DB' },
  btnOrangeDisabled: { backgroundColor: '#E5E7EB', borderWidth: 1, borderColor: '#D1D5DB' },
  btnRedDisabled: { backgroundColor: '#E5E7EB', borderWidth: 1, borderColor: '#D1D5DB' },
  actionLabel: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  actionLabelDisabled: { color: '#6B7280' },

  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  statCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statCardBlue: { borderLeftWidth: 4, borderLeftColor: colors.primary },
  statCardGreen: { borderLeftWidth: 4, borderLeftColor: colors.success },
  statCardYellow: { borderLeftWidth: 4, borderLeftColor: colors.warning },
  statCardRed: { borderLeftWidth: 4, borderLeftColor: colors.error },
  statValue: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text, marginBottom: 2 },
  statLabel: { fontSize: fontSize.xs, color: colors.textLight },
  statSub: { fontSize: 10, color: colors.textLight, marginTop: 2 },
  progressBar: { height: 5, backgroundColor: colors.borderLight, borderRadius: 3, marginTop: spacing.sm, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },

  sectionTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  section: { marginBottom: spacing.md },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  entryInfo: { flex: 1 },
  entryName: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  entryDate: { fontSize: fontSize.xs, color: colors.textLight },
  entryHours: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text, marginRight: spacing.sm },
  pendingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    backgroundColor: colors.warningLight,
  },
  pendingBadgeText: { fontSize: 10, fontWeight: '600', color: '#92400E' },

  /* Project Picker Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerModal: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    width: '90%',
    maxWidth: 420,
    maxHeight: '70%',
    overflow: 'hidden',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  pickerItemActive: {
    backgroundColor: colors.primaryLight,
  },
  pickerItemContent: { flex: 1 },
  pickerItemText: { fontSize: fontSize.md, color: colors.text, fontWeight: '500' },
  pickerItemTextActive: { color: colors.primary, fontWeight: '700' },
  pickerItemSub: { fontSize: fontSize.xs, color: colors.textLight, marginTop: 1 },
  pickerDivider: { height: 1, backgroundColor: colors.border },
  pickerList: { maxHeight: 300 },
  pickerEmpty: { padding: spacing.lg, textAlign: 'center', color: colors.textLight, fontSize: fontSize.sm },
});
