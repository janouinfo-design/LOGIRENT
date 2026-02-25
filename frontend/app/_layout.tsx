import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../src/store/authStore';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { I18nProvider } from '../src/i18n';

const COLORS = {
  primary: '#6B21A8',
  background: '#FAFAFA',
};

export default function RootLayout() {
  const { loadUser, isLoading } = useAuthStore();

  useEffect(() => {
    loadUser();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <I18nProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.primary,
          headerTitleStyle: { fontWeight: '600' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: COLORS.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/login" options={{ title: 'Login', headerShown: false }} />
        <Stack.Screen name="(auth)/register" options={{ title: 'Create Account', headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="vehicle/[id]" options={{ title: 'Détails' }} />
        <Stack.Screen name="booking/[id]" options={{ title: 'Réservation' }} />
        <Stack.Screen name="payment-success" options={{ title: 'Payment', headerShown: false }} />
        <Stack.Screen name="payment-cancel" options={{ title: 'Payment Cancelled' }} />
      </Stack>
    </I18nProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
});
