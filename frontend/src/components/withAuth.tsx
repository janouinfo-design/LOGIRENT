import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';

/**
 * Wrapper qui protege une page.
 * Affiche un loader pendant le chargement auth,
 * puis redirige vers /login si non authentifie.
 */
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthGuard(props: P) {
    const { isAuthenticated, isLoading } = useAuthStore();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        router.replace('/(auth)/login');
      }
    }, [isLoading, isAuthenticated]);

    if (isLoading) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
          <ActivityIndicator size="large" color="#7C3AED" />
        </View>
      );
    }

    if (!isAuthenticated) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
          <ActivityIndicator size="large" color="#7C3AED" />
        </View>
      );
    }

    return <Component {...props} />;
  };
}
