import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  Prestige,
  getXPWithinCurrentLevel,
  getLevelProgress,
} from '@/lib/xpSystem';

interface TimerXPBarProps {
  prestige: Prestige;
  level: number;
  totalXP: number;
}

const PRESTIGE_BAR_COLOR: Record<Prestige, string> = {
  rookie: '#94A3B8',
  beginner: '#CCFF00',
  intermediate: '#60A5FA',
  advanced: '#C084FC',
  pro: '#FBBF24',
};

export function TimerXPBar({ prestige, level, totalXP }: TimerXPBarProps) {
  const { current, required } = getXPWithinCurrentLevel(prestige, totalXP);
  const progress = getLevelProgress(prestige, level, totalXP);
  const barColor = PRESTIGE_BAR_COLOR[prestige];

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.levelLabel}>L{level}</Text>
        <Text style={styles.xpLabel}>
          {Math.floor(current).toLocaleString()} / {required.toLocaleString()} XP
        </Text>
      </View>
      <View style={styles.trackBg}>
        <View
          style={[
            styles.trackFill,
            {
              width: `${Math.min(progress, 100)}%`,
              backgroundColor: barColor,
            },
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
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  levelLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#CCFF00',
    letterSpacing: 1,
  },
  xpLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#888',
  },
  trackBg: {
    height: 4,
    backgroundColor: '#1E1E1E',
    borderRadius: 2,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: 2,
  },
});
