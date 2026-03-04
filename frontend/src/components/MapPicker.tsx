import React, { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

interface MapPickerProps {
  latitude: number | null;
  longitude: number | null;
  radius: number;
  onLocationChange: (lat: number, lng: number) => void;
  height?: number;
}

export const MapPicker = ({ latitude, longitude, radius, onLocationChange, height = 300 }: MapPickerProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // Init map
  useEffect(() => {
    if (Platform.OS !== 'web' || !containerRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    if (!mapRef.current) {
      const center = latitude && longitude ? [latitude, longitude] : [46.9481, 7.4474]; // Bern default
      mapRef.current = L.map(containerRef.current, {
        zoomControl: true,
        attributionControl: false,
      }).setView(center, latitude ? 16 : 8);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(mapRef.current);

      mapRef.current.on('click', (e: any) => {
        onLocationChange(parseFloat(e.latlng.lat.toFixed(6)), parseFloat(e.latlng.lng.toFixed(6)));
      });
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update marker + circle when lat/lng/radius change
  useEffect(() => {
    if (Platform.OS !== 'web' || !mapRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    if (markerRef.current) markerRef.current.remove();
    if (circleRef.current) circleRef.current.remove();

    if (latitude && longitude) {
      const icon = L.divIcon({
        html: '<div style="background:#2563EB;width:28px;height:28px;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3)"><svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div>',
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        className: '',
      });

      markerRef.current = L.marker([latitude, longitude], { icon, draggable: true })
        .addTo(mapRef.current);

      markerRef.current.on('dragend', (e: any) => {
        const pos = e.target.getLatLng();
        onLocationChange(parseFloat(pos.lat.toFixed(6)), parseFloat(pos.lng.toFixed(6)));
      });

      circleRef.current = L.circle([latitude, longitude], {
        radius: radius,
        color: '#2563EB',
        fillColor: '#2563EB',
        fillOpacity: 0.12,
        weight: 2,
        dashArray: '8, 4',
      }).addTo(mapRef.current);

      mapRef.current.fitBounds(circleRef.current.getBounds(), { padding: [30, 30] });
    }
  }, [latitude, longitude, radius]);

  if (Platform.OS !== 'web') return null;

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: height,
        borderRadius: 10,
        overflow: 'hidden',
        border: '1px solid #E2E8F0',
      }}
    />
  );
};
