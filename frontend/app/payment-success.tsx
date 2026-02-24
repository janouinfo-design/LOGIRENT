import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useReservationStore } from '../src/store/reservationStore';
import Button from '../src/components/Button';

const COLORS = {
  primary: '#1E3A8A',
  secondary: '#F59E0B',
  background: '#F8FAFC',
  card: '#FFFFFF',
  text: '#1E293B',
  textLight: '#64748B',
  success: '#10B981',
  error: '#EF4444',
};

export default function PaymentSuccessScreen() {
  const { session_id } = useLocalSearchParams<{ session_id: string }>();
  const router = useRouter();
  const { checkPaymentStatus, fetchReservations } = useReservationStore();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (session_id) {
      pollPaymentStatus();
    }
  }, [session_id]);

  const pollPaymentStatus = async () => {
    const maxAttempts = 5;
    const pollInterval = 2000;

    if (attempts >= maxAttempts) {
      setStatus('error');
      return;
    }

    try {
      const result = await checkPaymentStatus(session_id!);
      
      if (result.payment_status === 'paid') {
        setStatus('success');
        fetchReservations();
        return;
      } else if (result.status === 'expired') {
        setStatus('error');
        return;
      }

      // Continue polling
      setAttempts(prev => prev + 1);
      setTimeout(pollPaymentStatus, pollInterval);
    } catch (error) {
      setStatus('error');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {status === 'loading' && (
          <>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.title}>Processing Payment</Text>
            <Text style={styles.subtitle}>Please wait while we confirm your payment...</Text>
          </>
        )}

        {status === 'success' && (
          <>
            <View style={styles.iconContainer}>
              <Ionicons name="checkmark-circle" size={80} color={COLORS.success} />
            </View>
            <Text style={styles.title}>Payment Successful!</Text>
            <Text style={styles.subtitle}>
              Your reservation has been confirmed. Check your email for details.
            </Text>
            <View style={styles.buttons}>
              <Button
                title="View My Reservations"
                onPress={() => router.replace('/(tabs)/reservations')}
              />
              <Button
                title="Back to Home"
                onPress={() => router.replace('/(tabs)')}
                variant="outline"
              />
            </View>
          </>
        )}

        {status === 'error' && (
          <>
            <View style={styles.iconContainer}>
              <Ionicons name="close-circle" size={80} color={COLORS.error} />
            </View>
            <Text style={styles.title}>Payment Issue</Text>
            <Text style={styles.subtitle}>
              We couldn't confirm your payment. Please contact support or try again.
            </Text>
            <View style={styles.buttons}>
              <Button
                title="View My Reservations"
                onPress={() => router.replace('/(tabs)/reservations')}
              />
              <Button
                title="Back to Home"
                onPress={() => router.replace('/(tabs)')}
                variant="outline"
              />
            </View>
          </>
        )}
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
