import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '@/constants/colors';
import { useTheme } from "@/contexts/ThemeContext";

interface GloveCardProps {
  name: string;
  description: string;
  tierThemeColor: string;
  unlocked: boolean;
  equipped?: boolean;
  level: number;
  prestige: string;
  onPress?: () => void;
}

export function GloveCard({
  const { theme } = useTheme();
  name,
  description,
  tierThemeColor,
  unlocked,
  equipped = false,
  level,
  onPress,
}: GloveCardProps) {
  return (
    <TouchableOpacity
      style={[
        styles.container,
        unlocked && { borderColor: tierThemeColor + '44' },
        equipped && { borderColor: theme.volt, borderWidth: 2 },
      ]}
      onPress={onPress}
      activeOpacity={unlocked ? 0.7 : 1}
      disabled={!unlocked && !onPress}
    >
      <View style={[
        styles.iconWrap,
        {
          backgroundColor: unlocked
            ? tierThemeColor + '22'
            : theme.surface2,
        },
      ]}>
        <Ionicons
          name={unlocked ? 'hand-left' : 'lock-closed'}
          size={24}
          color={unlocked ? tierThemeColor : theme.mutedForeground + '44'}
        />
      </View>

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text
            style={[
              styles.name,
              { color: unlocked ? theme.foreground : theme.mutedForeground + '66' },
            ]}
            numberOfLines={1}
          >
            {name}
          </Text>
          {equipped && (
            <View style={styles.equippedBadge}>
              <Text style={styles.equippedText}>EQUIPPED</Text>
            </View>
          )}
        </View>
        <Text
          style={[
            styles.description,
            { color: unlocked ? theme.mutedForeground : theme.mutedForeground + '44' },
          ]}
          numberOfLines={1}
        >
          {description}
        </Text>
        {!unlocked && (
          <Text style={styles.unlockText}>Unlock at Level {level}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: theme.surface1,
    borderWidth: 1,
    borderColor: theme.border,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 14,
    fontWeight: '600' as const,
    flexShrink: 1,
  },
  equippedBadge: {
    backgroundColor: theme.voltDim,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  equippedText: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: theme.volt,
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 12,
  },
  unlockText: {
    fontSize: 10,
    color: theme.mutedForeground + '88',
    fontStyle: 'italic',
  },
});
