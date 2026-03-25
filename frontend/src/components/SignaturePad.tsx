import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axios';

interface Props {
  contractId: string;
  onSigned?: () => void;
  readOnly?: boolean;
  existingSignature?: string | null;
}

export default function SignaturePad({ contractId, onSigned, readOnly, existingSignature }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [saving, setSaving] = useState(false);
  const [signed, setSigned] = useState(!!existingSignature);

  useEffect(() => {
    if (Platform.OS === 'web' && canvasRef.current && !readOnly && !existingSignature) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#1a1a2e';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
    if (existingSignature && canvasRef.current) {
      const img = new Image();
      img.onload = () => {
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) ctx.drawImage(img, 0, 0, canvasRef.current!.width, canvasRef.current!.height);
      };
      img.src = existingSignature;
    }
  }, [existingSignature]);

  const getPos = (e: any) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if (e.touches) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: any) => {
    if (readOnly || signed) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    setIsDrawing(true);
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    e.preventDefault?.();
  };

  const draw = (e: any) => {
    if (!isDrawing || readOnly || signed) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasSignature(true);
    e.preventDefault?.();
  };

  const endDraw = () => { setIsDrawing(false); };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#1a1a2e';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
    setHasSignature(false);
  };

  const submitSignature = async () => {
    if (!canvasRef.current || !hasSignature) return;
    setSaving(true);
    try {
      const signatureData = canvasRef.current.toDataURL('image/png');
      await api.put(`/api/contracts/${contractId}/sign`, { signature_data: signatureData });
      setSigned(true);
      onSigned?.();
    } catch (e: any) {
      console.error('Sign error:', e.response?.data || e.message);
      alert(e.response?.data?.detail || 'Erreur lors de la signature');
    }
    setSaving(false);
  };

  if (Platform.OS !== 'web') {
    return <Text style={s.fallback}>La signature electronique est disponible sur la version web</Text>;
  }

  return (
    <View style={s.container} data-testid="signature-pad">
      <View style={s.header}>
        <Ionicons name="create-outline" size={18} color="#2563EB" />
        <Text style={s.title}>Signature electronique</Text>
        {signed && <View style={s.signedBadge}><Ionicons name="checkmark-circle" size={14} color="#10B981" /><Text style={s.signedText}>Signe</Text></View>}
      </View>

      <View style={s.canvasWrap}>
        <canvas
          ref={canvasRef}
          width={460}
          height={160}
          style={{ border: '1.5px dashed #CBD5E1', borderRadius: 10, background: signed ? '#F0FDF4' : '#FAFBFC', cursor: signed || readOnly ? 'default' : 'crosshair', touchAction: 'none' }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        {!hasSignature && !signed && (
          <View style={s.placeholder}>
            <Text style={s.placeholderText}>Signez ici avec la souris ou le doigt</Text>
          </View>
        )}
      </View>

      {!signed && !readOnly && (
        <View style={s.actions}>
          <TouchableOpacity style={s.clearBtn} onPress={clearCanvas} data-testid="clear-signature">
            <Ionicons name="refresh" size={14} color="#6B7280" />
            <Text style={s.clearText}>Effacer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.signBtn, !hasSignature && s.signBtnDisabled]} onPress={submitSignature} disabled={saving || !hasSignature} data-testid="submit-signature">
            {saving ? <ActivityIndicator size="small" color="#FFF" /> : (
              <>
                <Ionicons name="checkmark-done" size={16} color="#FFF" />
                <Text style={s.signText}>Signer le contrat</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { marginTop: 16, backgroundColor: '#FFF', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  title: { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1 },
  signedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  signedText: { fontSize: 11, fontWeight: '700', color: '#10B981' },
  canvasWrap: { position: 'relative' as any, alignItems: 'center' },
  placeholder: { position: 'absolute' as any, top: '50%', left: '50%', transform: [{ translateX: -100 }, { translateY: -8 }] },
  placeholderText: { color: '#9CA3AF', fontSize: 12 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  clearText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  signBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#10B981', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  signBtnDisabled: { opacity: 0.4 },
  signText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  fallback: { fontSize: 13, color: '#6B7280', textAlign: 'center', padding: 20 },
});
