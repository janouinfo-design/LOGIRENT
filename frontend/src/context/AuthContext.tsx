import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAuthToken, loginUser, registerUser, getMe } from '../services/api';
import { router } from 'expo-router';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  contract_hours: number;
  department_id?: string;
  department_name?: string;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        setAuthToken(token);
        const res = await getMe();
        setUser(res.data);
      }
    } catch {
      await AsyncStorage.removeItem('auth_token');
      setAuthToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (email: string, password: string) => {
    const res = await loginUser(email, password);
    const { token, user: userData } = res.data;
    await AsyncStorage.setItem('auth_token', token);
    setAuthToken(token);
    setUser(userData);
    router.replace('/(app)');
  };

  const register = async (data: any) => {
    const res = await registerUser(data);
    const { token, user: userData } = res.data;
    await AsyncStorage.setItem('auth_token', token);
    setAuthToken(token);
    setUser(userData);
    router.replace('/(app)');
  };

  const logout = async () => {
    await AsyncStorage.removeItem('auth_token');
    setAuthToken(null);
    setUser(null);
    router.replace('/login');
  };

  const refreshUser = async () => {
    try {
      const res = await getMe();
      setUser(res.data);
    } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
