import React from 'react';
import { Text } from 'react-native';
import { renderHook, act } from '@testing-library/react-hooks';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { colors } from '../constants/colors';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// Mock useColorScheme
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  useColorScheme: () => 'dark',
}));

describe('ThemeContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  it('provides dark theme by default', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );

    const { result, waitForNextUpdate } = renderHook(() => useTheme(), { wrapper });

    // Wait for theme to load
    await waitForNextUpdate();

    expect(result.current.themeMode).toBe('dark');
    expect(result.current.isDark).toBe(true);
    expect(result.current.theme).toEqual(colors.dark);
  });

  it('can switch to light theme', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );

    const { result, waitForNextUpdate } = renderHook(() => useTheme(), { wrapper });

    await waitForNextUpdate();

    act(() => {
      result.current.setThemeMode('light');
    });

    expect(result.current.themeMode).toBe('light');
    expect(result.current.isDark).toBe(false);
    expect(result.current.theme).toEqual(colors.light);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@clocked_theme_preference', 'light');
  });

  it('loads saved theme preference from storage', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('light');

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );

    const { result, waitForNextUpdate } = renderHook(() => useTheme(), { wrapper });

    await waitForNextUpdate();

    expect(result.current.themeMode).toBe('light');
    expect(result.current.theme).toEqual(colors.light);
  });

  it('persists theme changes to storage', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );

    const { result, waitForNextUpdate } = renderHook(() => useTheme(), { wrapper });

    await waitForNextUpdate();

    await act(async () => {
      await result.current.setThemeMode('light');
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@clocked_theme_preference', 'light');

    await act(async () => {
      await result.current.setThemeMode('dark');
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@clocked_theme_preference', 'dark');
  });
});

describe('Color Themes', () => {
  it('dark theme has correct colors', () => {
    expect(colors.dark.background).toBe('#0A0A0A');
    expect(colors.dark.text).toBe('#FFFFFF');
    expect(colors.dark.primary).toBeDefined();
  });

  it('light theme has correct colors', () => {
    expect(colors.light.background).toBe('#FFFFFF');
    expect(colors.light.text).toBe('#0A0A0A');
    expect(colors.light.primary).toBeDefined();
  });

  it('both themes have matching structure', () => {
    const darkKeys = Object.keys(colors.dark).sort();
    const lightKeys = Object.keys(colors.light).sort();
    expect(darkKeys).toEqual(lightKeys);
  });
});
