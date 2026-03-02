import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, PanResponder } from 'react-native';
import Svg, { Path as SvgPath } from 'react-native-svg';

interface Props {
  onSave: (base64: string) => void;
  saving?: boolean;
  colors: any;
}

export default function SignatureCanvas({ onSave, saving, colors: C }: Props) {
  const [paths, setPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState('');

  if (Platform.OS === 'web') {
    return <WebSignatureCanvas onSave={onSave} saving={saving} colors={C} />;
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        setCurrentPath(`M ${locationX} ${locationY}`);
      },
      onPanResponderMove: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        setCurrentPath(prev => prev + ` L ${locationX} ${locationY}`);
      },
      onPanResponderRelease: () => {
        if (currentPath) {
          setPaths(prev => [...prev, currentPath]);
          setCurrentPath('');
        }
      },
    })
  ).current;

  const handleClear = () => { setPaths([]); setCurrentPath(''); };

  return (
    <View>
      <Text style={{ color: C.textLight, fontSize: 12, marginBottom: 8 }}>Dessinez votre signature ci-dessous</Text>
      <View style={[st.canvasWrap, { borderColor: C.border }]} {...panResponder.panHandlers}>
        <Svg height={150} width="100%">
          {paths.map((p, i) => <SvgPath key={i} d={p} stroke="#1A1A2E" strokeWidth={2} fill="none" />)}
          {currentPath && <SvgPath d={currentPath} stroke="#1A1A2E" strokeWidth={2} fill="none" />}
        </Svg>
      </View>
      <View style={st.btnRow}>
        <TouchableOpacity style={[st.btn, { backgroundColor: C.border }]} onPress={handleClear}>
          <Text style={{ color: C.text, fontSize: 13 }}>Effacer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[st.btn, { backgroundColor: C.accent, opacity: paths.length === 0 ? 0.5 : 1 }]} onPress={() => {}} disabled={paths.length === 0 || saving}>
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{saving ? 'Envoi...' : 'Confirmer'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function WebSignatureCanvas({ onSave, saving, colors: C }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      if ('touches' in e && e.touches.length > 0) {
        return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
      }
      const me = e as MouseEvent;
      return { x: (me.clientX - rect.left) * scaleX, y: (me.clientY - rect.top) * scaleY };
    };

    const onStart = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
      drawingRef.current = true;
      setHasDrawn(true);
    };

    const onMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!drawingRef.current) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const { x, y } = getPos(e);
      ctx.lineTo(x, y);
      ctx.strokeStyle = '#1A1A2E';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    };

    const onEnd = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      drawingRef.current = false;
    };

    // Attach native DOM event listeners directly (bypasses React Native Web)
    canvas.addEventListener('mousedown', onStart, { passive: false });
    canvas.addEventListener('mousemove', onMove, { passive: false });
    canvas.addEventListener('mouseup', onEnd, { passive: false });
    canvas.addEventListener('mouseleave', onEnd, { passive: false });
    canvas.addEventListener('touchstart', onStart, { passive: false });
    canvas.addEventListener('touchmove', onMove, { passive: false });
    canvas.addEventListener('touchend', onEnd, { passive: false });

    return () => {
      canvas.removeEventListener('mousedown', onStart);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseup', onEnd);
      canvas.removeEventListener('mouseleave', onEnd);
      canvas.removeEventListener('touchstart', onStart);
      canvas.removeEventListener('touchmove', onMove);
      canvas.removeEventListener('touchend', onEnd);
    };
  }, []);

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleConfirm = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSave(canvas.toDataURL('image/png'));
  };

  return (
    <View>
      <Text style={{ color: C.textLight, fontSize: 12, marginBottom: 8 }}>Dessinez votre signature ci-dessous avec la souris</Text>
      <View style={[st.canvasWrap, { borderColor: C.border }]}>
        <canvas
          ref={(el: HTMLCanvasElement | null) => { canvasRef.current = el; }}
          width={500}
          height={150}
          style={{ width: '100%', height: 150, backgroundColor: '#FFFFFF', borderRadius: 8, cursor: 'crosshair', touchAction: 'none' }}
        />
      </View>
      <View style={st.btnRow}>
        <TouchableOpacity style={[st.btn, { backgroundColor: C.border }]} onPress={handleClear} data-testid="signature-clear-btn">
          <Text style={{ color: C.text, fontSize: 13 }}>Effacer</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[st.btn, { backgroundColor: '#10B981', opacity: !hasDrawn || saving ? 0.5 : 1 }]}
          onPress={handleConfirm}
          disabled={!hasDrawn || saving}
          data-testid="signature-confirm-btn"
        >
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{saving ? 'Envoi...' : 'Confirmer la signature'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  canvasWrap: { borderWidth: 1, borderRadius: 10, overflow: 'hidden', backgroundColor: '#FFFFFF', marginBottom: 12 },
  btnRow: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
});
