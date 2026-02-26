import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const C = {
  purple: '#7C3AED',
  purpleDark: '#5B21B6',
  dark: '#1A1A2E',
  gray: '#6B7280',
  card: '#FFFFFF',
  bg: '#000000',
};

export default function ScanQR() {
  const router = useRouter();
  const scannerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let scanner: any = null;

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        scanner = new Html5Qrcode('qr-reader');
        scannerRef.current = scanner;
        setScanning(true);

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText: string) => {
            scanner.stop().catch(() => {});
            handleScan(decodedText);
          },
          () => {}
        );
      } catch (err: any) {
        setError("Impossible d'acc\u00e9der \u00e0 la cam\u00e9ra. V\u00e9rifiez les permissions.");
      }
    };

    startScanner();

    return () => {
      if (scanner && scanner.isScanning) {
        scanner.stop().catch(() => {});
      }
    };
  }, []);

  const handleScan = (data: string) => {
    setScanning(false);
    // Extract slug from URL: .../a/slug or just slug
    let slug = data;
    const match = data.match(/\/a\/([a-z0-9-]+)/i);
    if (match) {
      slug = match[1];
    }
    router.replace(`/a/${slug}` as any);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} data-testid="scan-back-btn">
          <Ionicons name="arrow-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scanner le QR Code</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.scanArea}>
        {Platform.OS === 'web' ? (
          <View style={styles.cameraContainer}>
            <div id="qr-reader" style={{ width: '100%', maxWidth: 400 }} ref={(el) => { containerRef.current = el; }} />
            {!scanning && !error && (
              <View style={styles.loadingOverlay}>
                <Ionicons name="camera-outline" size={48} color="#FFF" />
                <Text style={styles.loadingText}>Chargement de la cam\u00e9ra...</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.nativeMessage}>
            <Ionicons name="qr-code-outline" size={64} color={C.gray} />
            <Text style={styles.messageText}>Scanner QR disponible uniquement sur le web</Text>
          </View>
        )}

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={24} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => { setError(''); router.replace('/scan-qr'); }}>
              <Text style={styles.retryText}>R\u00e9essayer</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      <View style={styles.instructions}>
        <Ionicons name="scan-outline" size={24} color={C.purple} />
        <Text style={styles.instructionText}>
          Pointez votre cam\u00e9ra vers le QR code affich\u00e9 dans l'agence
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, paddingTop: 20 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#FFF' },
  scanArea: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  cameraContainer: { width: '100%', maxWidth: 400, borderRadius: 16, overflow: 'hidden' },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  loadingText: { color: '#FFF', fontSize: 14, marginTop: 8 },
  nativeMessage: { alignItems: 'center', gap: 12 },
  messageText: { fontSize: 14, color: C.gray },
  errorBox: { alignItems: 'center', backgroundColor: 'rgba(239,68,68,0.1)', padding: 20, borderRadius: 12, marginTop: 20, gap: 8 },
  errorText: { color: '#EF4444', fontSize: 14, textAlign: 'center' },
  retryBtn: { backgroundColor: C.purple, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, marginTop: 8 },
  retryText: { color: '#FFF', fontWeight: '600' },
  instructions: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 24, paddingVertical: 20, backgroundColor: 'rgba(255,255,255,0.05)', margin: 16, borderRadius: 12 },
  instructionText: { flex: 1, fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 20 },
});
