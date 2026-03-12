import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: ThemeMode;
  effectiveTheme: 'light' | 'dark';
  setTheme: (theme: ThemeMode) => void;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@clocked_theme_preference';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('dark');
  const [isLoading, setIsLoading] = useState(true);
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(
    Appearance.getColorScheme() === 'light' ? 'light' : 'dark'
  );

  // Listen to system theme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemTheme(colorScheme === 'light' ? 'light' : 'dark');
    });

    return () => subscription.remove();
  }, []);

  // Load saved theme preference on mount
  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system')) {
        setThemeState(savedTheme as ThemeMode);
      }
    } catch (error) {
      console.error('Failed to load theme preference:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setTheme = async (newTheme: ThemeMode) => {
    try {
      setThemeState(newTheme);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  // Determine effective theme (resolve 'system' to actual theme)
  const effectiveTheme = theme === 'system' ? systemTheme : theme;

  return (
    <ThemeContext.Provider value={{ theme, effectiveTheme, setTheme, isLoading }}>
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
