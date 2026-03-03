import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'dark' | 'light';

export const lightTheme = {
  bg: '#FAFAFA',
  card: '#FFFFFF',
  primary: '#7C3AED',
  accent: '#6C2BD9',
  text: '#1A1A2E',
  textLight: '#6B7280',
  border: '#E5E7EB',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#06b6d4',
  inputBg: '#F3F4F6',
  navBg: '#FFFFFF',
  navBorder: '#E5E7EB',
};

export const darkTheme = {
  bg: '#0B0F1A',
  card: '#141926',
  primary: '#6C2BD9',
  accent: '#A78BFA',
  text: '#FFFFFF',
  textLight: '#8B95A8',
  border: '#1E2536',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#06b6d4',
  inputBg: '#0B0F1A',
  navBg: '#141926',
  navBorder: '#1E2536',
};

interface ThemeState {
  mode: ThemeMode;
  colors: typeof lightTheme;
  toggleTheme: () => void;
  loadTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'light',
  colors: lightTheme,

  toggleTheme: async () => {
    // Dark mode disabled - always light
  },

  loadTheme: async () => {
    // Always force light mode
    set({ mode: 'light', colors: lightTheme });
    try { await AsyncStorage.setItem('theme_mode', 'light'); } catch {}
  },
}));
