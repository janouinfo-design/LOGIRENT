import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type ClockState = 'idle' | 'working' | 'break';

interface ClockButtonProps {
  state: ClockState;
  onPress: () => void;
  isLoading?: boolean;
  elapsedTime?: string;
}

export default function ClockButton({ state, onPress, isLoading, elapsedTime }: ClockButtonProps) {
  const getButtonConfig = () => {
    switch (state) {
      case 'idle':
        return {
          color: '#22C55E',
          icon: 'play' as const,
          label: 'Commencer',
          subLabel: 'Début de journée'
        };
      case 'working':
        return {
          color: '#EF4444',
          icon: 'stop' as const,
          label: 'Terminer',
          subLabel: 'Fin de journée'
        };
      case 'break':
        return {
          color: '#F59E0B',
          icon: 'refresh' as const,
          label: 'Reprendre',
          subLabel: 'Fin de pause'
        };
    }
  };

  const config = getButtonConfig();

  return (
    <View style={styles.container}>
      {elapsedTime && (
        <View style={styles.timeContainer}>
          <Text style={styles.elapsedLabel}>Temps écoulé</Text>
          <Text style={styles.elapsedTime}>{elapsedTime}</Text>
        </View>
      )}
      
      <TouchableOpacity
        style={[styles.button, { backgroundColor: config.color }]}
        onPress={onPress}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator size="large" color="#FFFFFF" />
        ) : (
          <Ionicons name={config.icon} size={60} color="#FFFFFF" />
        )}
      </TouchableOpacity>
      
      <Text style={styles.label}>{config.label}</Text>
      <Text style={styles.subLabel}>{config.subLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  timeContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  elapsedLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  elapsedTime: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#111827',
    fontVariant: ['tabular-nums'],
  },
  button: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  label: {
    marginTop: 16,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  subLabel: {
    marginTop: 4,
    fontSize: 14,
    color: '#6B7280',
  },
});
