import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemedColors } from '@/hooks/useThemedColors';

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  trend?: {
    direction: 'up' | 'down';
    value: string;
  };
  style?: ViewStyle;
}

export function StatCard({ icon, label, value, trend, style }: StatCardProps) {
  const colors = useThemedColors();

  return (
    <View style={[
      styles.container, 
      { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder },
      style
    ]}>
      <View style={styles.iconContainer}>
        <View style={[styles.iconCircle, { backgroundColor: colors.surfaceElevated }]}>
          <Ionicons name={icon} size={20} color={colors.primary} />
        </View>
      </View>
      
      <View style={styles.content}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
        <View style={styles.valueRow}>
          <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
          {trend && (
            <View style={styles.trend}>
              <Ionicons 
                name={trend.direction === 'up' ? 'trending-up' : 'trending-down'} 
                size={14} 
                color={trend.direction === 'up' ? colors.success : colors.error} 
              />
              <Text style={[
                styles.trendValue,
                { color: trend.direction === 'up' ? colors.success : colors.error }
              ]}>
                {trend.value}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
  },
  trend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendValue: {
    fontSize: 12,
    fontWeight: '600',
  },
});
