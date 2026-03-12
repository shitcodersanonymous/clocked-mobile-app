import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, Theme, ThemeMode } from '@/constants/colors';

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@clocked_theme_preference';

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const deviceColorScheme = useDeviceColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');
  const [isLoading, setIsLoading] = useState(true);

  // Load theme preference from storage on mount
  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const storedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (storedTheme === 'light' || storedTheme === 'dark') {
        setThemeModeState(storedTheme);
      } else {
        // Default to dark mode for boxing aesthetic
        setThemeModeState('dark');
      }
    } catch (error) {
      console.error('Failed to load theme preference:', error);
      setThemeModeState('dark');
    } finally {
      setIsLoading(false);
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
      setThemeModeState(mode);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  const theme = themeMode === 'dark' ? colors.dark : colors.light;
  const isDark = themeMode === 'dark';

  // Don't render children until theme is loaded to prevent flash
  if (isLoading) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, themeMode, setThemeMode, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
