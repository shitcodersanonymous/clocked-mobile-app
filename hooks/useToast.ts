import { create } from 'zustand';
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import colors from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastStore {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  showToast: (message, type = 'info', duration = 3000) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type, duration }],
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, duration);
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

export function useToast() {
  const { toasts, showToast } = useToastStore();
  return { toasts, showToast };
}

const TOAST_COLORS: Record<ToastType, { bg: string; border: string }> = {
  success: { bg: 'rgba(68, 204, 136, 0.95)', border: colors.dark.green },
  error: { bg: 'rgba(255, 68, 68, 0.95)', border: colors.dark.red },
  info: { bg: 'rgba(68, 136, 255, 0.95)', border: colors.dark.blue },
  warning: { bg: 'rgba(255, 170, 0, 0.95)', border: colors.dark.amber },
};

function ToastItem({ toast }: { toast: Toast }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();

    const fadeOut = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -20,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }, toast.duration - 300);

    return () => clearTimeout(fadeOut);
  }, []);

  const colorScheme = TOAST_COLORS[toast.type];

  return React.createElement(
    Animated.View,
    {
      style: [
        styles.toast,
        {
          backgroundColor: colorScheme.bg,
          borderLeftColor: colorScheme.border,
          opacity,
          transform: [{ translateY }],
        },
      ],
    },
    React.createElement(Text, { style: styles.toastText }, toast.message)
  );
}

export function ToastContainer() {
  const { toasts } = useToastStore();

  if (toasts.length === 0) return null;

  return React.createElement(
    View,
    {
      style: styles.container,
      pointerEvents: 'none',
    },
    toasts.map((toast) =>
      React.createElement(ToastItem, { key: toast.id, toast })
    )
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 80 : 60,
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: 'center',
  },
  toast: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderLeftWidth: 4,
    marginBottom: 8,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
});
