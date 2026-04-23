import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  visible: boolean;
  onClose: () => void;
  onCapture: (dataUri: string) => void;
  title?: string;
}

export function WebcamCapture({ visible, onClose, onCapture, title = 'Prendre une photo' }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible && Platform.OS === 'web') {
      startCamera();
    }
    return () => { stopCamera(); };
  }, [visible]);

  const startCamera = async () => {
    setStarting(true);
    setError('');
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.play();
      }
    } catch (e: any) {
      setError('Impossible d\'acceder a la camera. Verifiez les permissions.');
    } finally { setStarting(false); }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
  };

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUri = canvas.toDataURL('image/jpeg', 0.85);
    stopCamera();
    onCapture(dataUri);
    onClose();
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  if (Platform.OS !== 'web') return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={s.overlay}>
        <View style={s.modal}>
          <View style={s.header}>
            <Text style={s.title}>{title}</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={s.videoContainer}>
            {starting && <ActivityIndicator size="large" color="#7C3AED" style={{ position: 'absolute', zIndex: 1 }} />}
            {error ? (
              <View style={s.errorBox}>
                <Ionicons name="warning" size={32} color="#EF4444" />
                <Text style={s.errorText}>{error}</Text>
                <TouchableOpacity style={s.retryBtn} onPress={startCamera}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Reessayer</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <video
                ref={(el: any) => { videoRef.current = el; if (el && stream) { el.srcObject = stream; el.play(); } }}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }}
              />
            )}
          </View>

          <canvas ref={(el: any) => { canvasRef.current = el; }} style={{ display: 'none' }} />

          {!error && (
            <TouchableOpacity style={s.captureBtn} onPress={capture}>
              <View style={s.captureBtnInner}>
                <Ionicons name="camera" size={28} color="#fff" />
              </View>
            </TouchableOpacity>
          )}

          <Text style={s.hint}>Placez le document devant la camera puis appuyez sur le bouton</Text>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  modal: { width: '90%', maxWidth: 640, alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 16 },
  title: { color: '#fff', fontSize: 18, fontWeight: '800' },
  videoContainer: { width: '100%', aspectRatio: 16 / 9, borderRadius: 12, overflow: 'hidden', backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center' },
  errorBox: { alignItems: 'center', gap: 12, padding: 20 },
  errorText: { color: '#EF4444', fontSize: 14, textAlign: 'center' },
  retryBtn: { backgroundColor: '#7C3AED', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  captureBtn: { marginTop: 20, width: 70, height: 70, borderRadius: 35, borderWidth: 4, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  captureBtnInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#7C3AED', justifyContent: 'center', alignItems: 'center' },
  hint: { color: '#94A3B8', fontSize: 12, marginTop: 12, textAlign: 'center' },
});
