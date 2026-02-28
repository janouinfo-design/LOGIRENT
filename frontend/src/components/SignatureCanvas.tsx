import React, { useRef, useState, useCallback } from 'react';
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
  const canvasRef = useRef<any>(null);

  // For Web: use a canvas element
  if (Platform.OS === 'web') {
    return <WebSignatureCanvas onSave={onSave} saving={saving} colors={C} />;
  }

  // For Native: use SVG + PanResponder
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

// Web-only canvas signature
function WebSignatureCanvas({ onSave, saving, colors: C }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const getPos = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDraw = useCallback((e: any) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setDrawing(true);
    setHasDrawn(true);
  }, []);

  const draw = useCallback((e: any) => {
    e.preventDefault();
    if (!drawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#1A1A2E';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }, [drawing]);

  const endDraw = useCallback((e: any) => {
    e.preventDefault();
    setDrawing(false);
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
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  };

  return (
    <View>
      <Text style={{ color: C.textLight, fontSize: 12, marginBottom: 8 }}>Dessinez votre signature ci-dessous</Text>
      <View style={[st.canvasWrap, { borderColor: C.border }]}>
        <canvas
          ref={canvasRef}
          width={500}
          height={150}
          style={{ width: '100%', height: 150, backgroundColor: '#FFFFFF', borderRadius: 8, cursor: 'crosshair', touchAction: 'none' }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
      </View>
      <View style={st.btnRow}>
        <TouchableOpacity style={[st.btn, { backgroundColor: C.border }]} onPress={handleClear}>
          <Text style={{ color: C.text, fontSize: 13 }}>Effacer</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[st.btn, { backgroundColor: C.accent, opacity: !hasDrawn || saving ? 0.5 : 1 }]}
          onPress={handleConfirm}
          disabled={!hasDrawn || saving}
          testID="signature-confirm-btn"
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
