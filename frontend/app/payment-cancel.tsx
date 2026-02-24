import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Button from '../src/components/Button';

const COLORS = {
  primary: '#1E3A8A',
  secondary: '#F59E0B',
  background: '#F8FAFC',
  card: '#FFFFFF',
  text: '#1E293B',
  textLight: '#64748B',
  warning: '#F59E0B',
};

export default function PaymentCancelScreen() {
  const { reservation_id } = useLocalSearchParams<{ reservation_id: string }>();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="warning" size={80} color={COLORS.warning} />
        </View>
        <Text style={styles.title}>Payment Cancelled</Text>
        <Text style={styles.subtitle}>
          Your payment was cancelled. Your reservation is saved but not confirmed.
        </Text>
        <View style={styles.buttons}>
          <Button
            title="Try Again"
            onPress={() => router.back()}
          />
          <Button
            title="View My Reservations"
            onPress={() => router.replace('/(tabs)/reservations')}
            variant="outline"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  buttons: {
    width: '100%',
    gap: 12,
  },
});
