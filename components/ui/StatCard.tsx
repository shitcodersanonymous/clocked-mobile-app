import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '@/constants/colors';
import { useTheme } from "@/contexts/ThemeContext";

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
  accentColor,
}: StatCardProps) {
  const { theme } = useTheme();
  const finalAccentColor = accentColor || theme.volt;
  
  return (
    <View style={[styles.container, { backgroundColor: theme.surface1, borderColor: theme.border }]}>
      {icon && (
        <View style={[styles.iconWrap, { backgroundColor: (iconColor || finalAccentColor) + '1A' }]}>
          <Ionicons name={icon} size={20} color={iconColor || finalAccentColor} />
        </View>
      )}
      <Text style={[styles.value, { color: finalAccentColor }]}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </Text>
      <Text style={[styles.label, { color: theme.foreground }]}>{label}</Text>
      {subtitle && <Text style={[styles.subtitle, { color: theme.mutedForeground }]}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 100,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  value: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
  },
});
