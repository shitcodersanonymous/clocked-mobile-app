import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors, { PRESTIGE_COLORS } from '@/constants/colors';
import { Prestige, PRESTIGE_NAMES, PRESTIGE_ORDER } from '@/lib/xpSystem';

const TIER_SHORT: Record<Prestige, string> = {
  rookie: 'ROOK',
  beginner: 'BEG',
  intermediate: 'INT',
  advanced: 'ADV',
  pro: 'PRO',
};

interface RoadToBMFProps {
  workoutsCompleted: number;
  prestige: Prestige;
  level: number;
  currentStreak?: number;
}

export default function RoadToBMF({
  workoutsCompleted,
  prestige,
  level,
  currentStreak = 0,
}: RoadToBMFProps) {
  const prestigeIndex = PRESTIGE_ORDER.indexOf(prestige);

  const overallPct = Math.min(
    100,
    Math.round(((prestigeIndex * 100 + level) / (PRESTIGE_ORDER.length * 100)) * 100)
  );

  const bmfProgress = Math.min(1, workoutsCompleted / 250);
  const bmfkProgress = Math.min(1, currentStreak / 365);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>ROAD TO BMFK</Text>
        <Text style={styles.pct}>{overallPct}%</Text>
      </View>

      {PRESTIGE_ORDER.map((p, i) => {
        const isCompleted = i < prestigeIndex;
        const isCurrent = i === prestigeIndex;
        const tierLevel = isCompleted ? 100 : isCurrent ? level : 0;
        const barWidth = isCompleted ? '100%' : isCurrent ? `${Math.max(2, (level / 100) * 100)}%` : '0%';
        const barColor = isCompleted
          ? colors.dark.surface4
          : isCurrent
          ? colors.dark.volt
          : colors.dark.surface3;

        return (
          <View key={p} style={styles.tierRow}>
            <Text style={[styles.tierLabel, isCurrent && styles.tierLabelActive]}>
              {TIER_SHORT[p]}
            </Text>
            <View style={styles.barBg}>
              <View style={[styles.barFill, { width: barWidth as any, backgroundColor: barColor }]} />
            </View>
            <Text style={[styles.tierCount, isCurrent && styles.tierCountActive]}>
              {tierLevel}
            </Text>
          </View>
        );
      })}

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>FINAL BOSS</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.bossRow}>
        <Text style={styles.bossLabel}>BMF</Text>
        <View style={styles.barBg}>
          <View style={[styles.barFill, { width: `${bmfProgress * 100}%` as any, backgroundColor: '#8B1A1A' }]} />
        </View>
        <Text style={styles.bossCount}>{workoutsCompleted}/250</Text>
      </View>
      <View style={styles.bossHint}>
        <Ionicons name="trophy-outline" size={11} color={colors.dark.mutedForeground} />
        <Text style={styles.bossHintText}>250 total sessions — Baddest MF</Text>
      </View>

      <View style={[styles.bossRow, { marginTop: 10 }]}>
        <Text style={styles.bossLabel}>BMFK</Text>
        <View style={styles.barBg}>
          <View style={[styles.barFill, { width: `${bmfkProgress * 100}%` as any, backgroundColor: '#8B1A1A' }]} />
        </View>
        <Text style={styles.bossCount}>{currentStreak}/365</Text>
      </View>
      <View style={styles.bossHint}>
        <Ionicons name="flame-outline" size={11} color={colors.dark.mutedForeground} />
        <Text style={styles.bossHintText}>365 consecutive days — Baddest MF Killer</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.dark.surface1,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.dark.border,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    color: colors.dark.mutedForeground,
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: 1.2,
  },
  pct: {
    color: colors.dark.volt,
    fontSize: 15,
    fontWeight: '800' as const,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  tierLabel: {
    width: 34,
    fontSize: 11,
    fontWeight: '600' as const,
    color: colors.dark.mutedForeground,
    textAlign: 'right',
  },
  tierLabelActive: {
    color: colors.dark.volt,
    fontWeight: '800' as const,
  },
  barBg: {
    flex: 1,
    height: 8,
    backgroundColor: colors.dark.surface3,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  tierCount: {
    width: 28,
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.dark.mutedForeground,
    textAlign: 'right',
  },
  tierCountActive: {
    color: colors.dark.foreground,
    fontWeight: '700' as const,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.dark.border,
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: colors.dark.volt,
    letterSpacing: 1.5,
  },
  bossRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bossLabel: {
    width: 34,
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#EF4444',
    textAlign: 'right',
  },
  bossCount: {
    width: 42,
    fontSize: 11,
    fontWeight: '700' as const,
    color: colors.dark.mutedForeground,
    textAlign: 'right',
  },
  bossHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginLeft: 42,
    marginTop: 4,
  },
  bossHintText: {
    fontSize: 10,
    color: colors.dark.mutedForeground,
    fontStyle: 'italic',
  },
});
