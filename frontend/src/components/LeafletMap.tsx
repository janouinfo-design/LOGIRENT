import React, { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

interface MapViewProps {
  projectLat: number;
  projectLng: number;
  radius: number;
  userLat?: number | null;
  userLng?: number | null;
  height?: number;
}

export const LeafletMap = ({ projectLat, projectLng, radius, userLat, userLng, height = 250 }: MapViewProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const projectMarkerRef = useRef<any>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || !containerRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    // Init map
    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, {
        zoomControl: true,
        attributionControl: false,
      }).setView([projectLat, projectLng], 16);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(mapRef.current);
    } else {
      mapRef.current.setView([projectLat, projectLng], 16);
    }

    // Project circle (geofence zone)
    if (circleRef.current) circleRef.current.remove();
    circleRef.current = L.circle([projectLat, projectLng], {
      radius: radius,
      color: '#2563EB',
      fillColor: '#2563EB',
      fillOpacity: 0.12,
      weight: 2,
      dashArray: '8, 4',
    }).addTo(mapRef.current);

    // Project marker
    if (projectMarkerRef.current) projectMarkerRef.current.remove();
    const projectIcon = L.divIcon({
      html: '<div style="background:#2563EB;width:32px;height:32px;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3)"><svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div>',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      className: '',
    });
    projectMarkerRef.current = L.marker([projectLat, projectLng], { icon: projectIcon })
      .addTo(mapRef.current)
      .bindPopup(`<b>Projet</b><br/>Zone: ${radius}m`);

    // Fit bounds to show both markers
    const bounds = L.latLngBounds([[projectLat, projectLng]]);
    if (userLat && userLng) {
      bounds.extend([userLat, userLng]);
    }
    bounds.extend(circleRef.current.getBounds());
    mapRef.current.fitBounds(bounds, { padding: [30, 30] });

    return () => {};
  }, [projectLat, projectLng, radius]);

  // Update user marker separately
  useEffect(() => {
    if (Platform.OS !== 'web' || !mapRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    if (userMarkerRef.current) userMarkerRef.current.remove();

    if (userLat && userLng) {
      // Calculate distance
      const R = 6371000;
      const dLat = (projectLat - userLat) * Math.PI / 180;
      const dLon = (projectLng - userLng) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(userLat * Math.PI / 180) * Math.cos(projectLat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
      const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const isInZone = distance <= radius;

      const color = isInZone ? '#10B981' : '#EF4444';
      const userIcon = L.divIcon({
        html: `<div style="background:${color};width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
        className: '',
      });

      userMarkerRef.current = L.marker([userLat, userLng], { icon: userIcon })
        .addTo(mapRef.current)
        .bindPopup(`<b>Vous</b><br/>${Math.round(distance)}m du projet<br/>${isInZone ? '✅ Dans la zone' : '❌ Hors zone'}`);

      // Also add accuracy circle around user
      L.circle([userLat, userLng], {
        radius: 15,
        color: color,
        fillColor: color,
        fillOpacity: 0.15,
        weight: 1,
      }).addTo(mapRef.current);
    }
  }, [userLat, userLng, projectLat, projectLng, radius]);

  if (Platform.OS !== 'web') return null;

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: height,
        borderRadius: 10,
        overflow: 'hidden',
      }}
    />
  );
};
