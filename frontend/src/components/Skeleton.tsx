import React from 'react';
import { View, Animated } from 'react-native';
import { useEffect, useRef } from 'react';

const SkeletonPulse = ({ style }: { style?: any }) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return <Animated.View style={[{ backgroundColor: '#E2E8F0', borderRadius: 8, opacity }, style]} />;
};

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <View style={{ padding: 16, gap: 12 }}>
      <SkeletonPulse style={{ height: 36, borderRadius: 8 }} />
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <SkeletonPulse style={{ flex: 1, height: 20 }} />
          <SkeletonPulse style={{ flex: 1.2, height: 20 }} />
          <SkeletonPulse style={{ flex: 0.8, height: 20 }} />
          <SkeletonPulse style={{ flex: 0.6, height: 20 }} />
          <SkeletonPulse style={{ flex: 0.8, height: 24, borderRadius: 12 }} />
        </View>
      ))}
    </View>
  );
}

export function KpiSkeleton() {
  return (
    <View style={{ flexDirection: 'row', gap: 10, margin: 16, marginBottom: 0 }}>
      {[1, 2, 3, 4].map(i => (
        <View key={i} style={{ flex: 1, minWidth: 140 }}>
          <SkeletonPulse style={{ height: 60, borderRadius: 12 }} />
        </View>
      ))}
    </View>
  );
}

export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View style={{ gap: 12, padding: 16 }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonPulse key={i} style={{ height: 80, borderRadius: 12 }} />
      ))}
    </View>
  );
}

export function GanttSkeleton() {
  return (
    <View style={{ padding: 16, gap: 6 }}>
      <SkeletonPulse style={{ height: 38, borderRadius: 8 }} />
      {Array.from({ length: 6 }).map((_, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 2 }}>
          <SkeletonPulse style={{ width: 180, height: 36 }} />
          <SkeletonPulse style={{ flex: 1, height: 36 }} />
        </View>
      ))}
    </View>
  );
}

export default SkeletonPulse;
