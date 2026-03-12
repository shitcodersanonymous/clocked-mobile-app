import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import colors, { PRESTIGE_COLORS } from '@/constants/colors';
import { useTheme } from "@/contexts/ThemeContext";

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
  const { theme } = useTheme();
  const progress = requiredXP > 0 ? Math.min(1, currentXP / requiredXP) : 0;
  const barColor = PRESTIGE_COLORS[prestige] || theme.volt;
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
                <Text style={[styles.dot, { color: theme.mutedForeground }]}>·</Text>
                <Text style={[styles.rankLabel, { color: theme.foreground }]}>
                  {rankingName}
                </Text>
              </>
            )}
          </View>
          <Text style={[styles.level, { color: barColor }]}>
            LVL {level}
          </Text>
        </View>
      )}

      <View style={[styles.barContainer, { backgroundColor: theme.surface2 }]}>
        <Animated.View
          style={[
            styles.barFill,
            { backgroundColor: barColor },
            animatedStyle,
          ]}
        />
      </View>

      {!isMaxLevel && (
        <Text style={[styles.xpText, { color: theme.mutedForeground }]}>
          {displayXP}
        </Text>
      )}
      {isMaxLevel && (
        <Text style={[styles.maxText, { color: barColor }]}>
          MAX LEVEL
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  prestigeLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  dot: {
    fontSize: 12,
  },
  rankLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  level: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  barContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  xpText: {
    fontSize: 11,
    textAlign: 'center',
  },
  maxText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 1,
  },
});
