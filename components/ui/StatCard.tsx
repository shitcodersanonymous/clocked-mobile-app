import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '@/constants/colors';

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  accentColor?: string;
}

export function StatCard({
  label,
  value,
  subtitle,
  icon,
  iconColor,
  accentColor = colors.dark.volt,
}: StatCardProps) {
  return (
    <View style={styles.container}>
      {icon && (
        <View style={[styles.iconWrap, { backgroundColor: (iconColor || accentColor) + '1A' }]}>
          <Ionicons name={icon} size={20} color={iconColor || accentColor} />
        </View>
      )}
      <Text style={[styles.value, { color: accentColor }]}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </Text>
      <Text style={styles.label}>{label}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

export function StatCardRow({
  label,
  value,
  icon,
  iconColor,
}: Pick<StatCardProps, 'label' | 'value' | 'icon' | 'iconColor'>) {
  return (
    <View style={styles.rowContainer}>
      {icon && (
        <Ionicons
          name={icon}
          size={18}
          color={iconColor || colors.dark.volt}
          style={styles.rowIcon}
        />
      )}
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.dark.surface1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.dark.border,
    flex: 1,
    minWidth: 100,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  value: {
    fontSize: 22,
    fontWeight: '700' as const,
  },
  label: {
    fontSize: 11,
    color: colors.dark.mutedForeground,
    fontWeight: '500' as const,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 10,
    color: colors.dark.mutedForeground + '88',
    marginTop: 2,
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  rowIcon: {
    marginRight: 10,
  },
  rowLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.dark.foreground,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.dark.volt,
  },
});
