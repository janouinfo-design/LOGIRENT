import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface BreakButtonProps {
  isOnBreak: boolean;
  onPress: () => void;
  disabled?: boolean;
}

export default function BreakButton({ isOnBreak, onPress, disabled }: BreakButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        isOnBreak ? styles.breakActive : styles.breakInactive,
        disabled && styles.disabled
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <Ionicons 
          name={isOnBreak ? 'play' : 'pause'} 
          size={24} 
          color={isOnBreak ? '#F59E0B' : '#FFFFFF'} 
        />
        <Text style={[
          styles.text,
          isOnBreak && styles.textActive
        ]}>
          {isOnBreak ? 'Fin de pause' : 'Pause'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 160,
  },
  breakInactive: {
    backgroundColor: '#F59E0B',
  },
  breakActive: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  disabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  textActive: {
    color: '#F59E0B',
  },
});
