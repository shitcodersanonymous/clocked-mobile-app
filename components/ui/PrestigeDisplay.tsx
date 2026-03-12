import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import colors, { PRESTIGE_COLORS } from '@/constants/colors';
import { useTheme } from "@/contexts/ThemeContext";

interface PrestigeDisplayProps {
  prestige: string;
  rankingName: string;
  prestigeName: string;
  level: number;
  currentXP: number;
  requiredXP: number;
  showProgress?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function PrestigeDisplay({
  const { theme } = useTheme();
  prestige,
  rankingName,
  prestigeName,
  level,
  currentXP,
  requiredXP,
  showProgress = true,
  size = 'md',
}: PrestigeDisplayProps) {
  const barColor = PRESTIGE_COLORS[prestige] || theme.volt;
  const progress = requiredXP > 0 ? Math.min(1, currentXP / requiredXP) : 0;
  const xpString = `${Math.floor(currentXP).toLocaleString()} / ${requiredXP.toLocaleString()} XP`;

  const sizeConfig = SIZE_CONFIGS[size];

  const animatedStyle = useAnimatedStyle(() => ({
    width: withTiming(`${progress * 100}%` as any, { duration: 500 }),
  }));

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={[styles.prestigeBadge, { backgroundColor: barColor + '33' }]}>
          <Text style={[styles.prestigeText, { color: barColor, fontSize: sizeConfig.badgeFont }]}>
            {prestigeName.toUpperCase()}
          </Text>
        </View>
        <Text style={[styles.separator, { fontSize: sizeConfig.font }]}>-</Text>
        <Text style={[styles.rankText, { fontSize: sizeConfig.font }]}>{rankingName}</Text>
        <Text style={[styles.separator, { fontSize: sizeConfig.font }]}>-</Text>
        <Text style={[styles.levelText, { color: barColor, fontSize: sizeConfig.font }]}>
          Level {level}
        </Text>
      </View>

      {showProgress && (
        <View style={styles.progressSection}>
          <View style={[styles.barBackground, { height: sizeConfig.barHeight }]}>
            <Animated.View
              style={[
                styles.barFill,
                { backgroundColor: barColor },
                animatedStyle,
              ]}
            />
          </View>
          <Text style={styles.xpText}>{xpString}</Text>
        </View>
      )}
    </View>
  );
}

interface PrestigeBadgeCompactProps {
  prestige: string;
  rankingName: string;
  prestigeName: string;
  level: number;
}

export function PrestigeBadgeCompact({
  const { theme } = useTheme();
  prestige,
  rankingName,
  prestigeName,
  level,
}: PrestigeBadgeCompactProps) {
  const color = PRESTIGE_COLORS[prestige] || theme.volt;

  return (
    <View style={[styles.compactBadge, { backgroundColor: color + '33' }]}>
      <Text style={[styles.compactText, { color }]}>{prestigeName}</Text>
      <Text style={[styles.compactDot, { color: color + '99' }]}>·</Text>
      <Text style={[styles.compactText, { color }]}>{rankingName}</Text>
      <Text style={[styles.compactDot, { color: color + '99' }]}>·</Text>
      <Text style={[styles.compactText, { color }]}>Lvl {level}</Text>
    </View>
  );
}

const SIZE_CONFIGS = {
  sm: { badgeFont: 10, font: 12, barHeight: 4 },
  md: { badgeFont: 12, font: 14, barHeight: 6 },
  lg: { badgeFont: 14, font: 18, barHeight: 8 },
};

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  prestigeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  prestigeText: {
    fontWeight: '700' as const,
    letterSpacing: 0.8,
  },
  separator: {
    color: theme.mutedForeground,
  },
  rankText: {
    fontWeight: '600' as const,
    color: theme.foreground,
  },
  levelText: {
    fontWeight: '700' as const,
  },
  progressSection: {
    gap: 4,
  },
  barBackground: {
    borderRadius: 4,
    backgroundColor: theme.surface3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  xpText: {
    fontSize: 11,
    color: theme.mutedForeground,
  },
  compactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  compactText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  compactDot: {
    fontSize: 11,
  },
});
