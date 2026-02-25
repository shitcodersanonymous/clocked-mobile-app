import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import colors, { PRESTIGE_COLORS } from '@/constants/colors';

interface XPBarProps {
  prestige: string;
  level: number;
  currentXP: number;
  requiredXP: number;
  xpString?: string;
  showRank?: boolean;
  rankingName?: string;
  prestigeName?: string;
}

export function XPBar({
  prestige,
  level,
  currentXP,
  requiredXP,
  xpString,
  showRank = true,
  rankingName,
  prestigeName,
}: XPBarProps) {
  const progress = requiredXP > 0 ? Math.min(1, currentXP / requiredXP) : 0;
  const barColor = PRESTIGE_COLORS[prestige] || colors.dark.volt;
  const displayXP = xpString || `${Math.floor(currentXP).toLocaleString()} / ${requiredXP.toLocaleString()} XP`;
  const isMaxLevel = level >= 100;

  const animatedStyle = useAnimatedStyle(() => ({
    width: withTiming(`${progress * 100}%` as any, { duration: 500 }),
  }));

  return (
    <View style={styles.container}>
      {showRank && (
        <View style={styles.header}>
          <View style={styles.labelRow}>
            {prestigeName && (
              <Text style={[styles.prestigeLabel, { color: barColor }]}>
                {prestigeName.toUpperCase()}
              </Text>
            )}
            {rankingName && (
              <>
                <Text style={styles.dot}>·</Text>
                <Text style={styles.rankingLabel}>{rankingName}</Text>
              </>
            )}
            <Text style={styles.dot}>·</Text>
            {isMaxLevel ? (
              <Text style={[styles.levelLabel, { color: colors.dark.amber }]}>MAX LEVEL</Text>
            ) : (
              <Text style={[styles.levelLabel, { color: barColor }]}>Lvl {level}</Text>
            )}
          </View>
          <Text style={styles.xpText}>{displayXP}</Text>
        </View>
      )}
      <View style={styles.barBackground}>
        <Animated.View
          style={[
            styles.barFill,
            { backgroundColor: barColor },
            animatedStyle,
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  prestigeLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
  dot: {
    fontSize: 11,
    color: colors.dark.mutedForeground,
  },
  rankingLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: colors.dark.foreground,
  },
  levelLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  xpText: {
    fontSize: 11,
    color: colors.dark.mutedForeground,
  },
  barBackground: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.dark.surface3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
});
