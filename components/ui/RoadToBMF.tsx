import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, withTiming, withDelay } from 'react-native-reanimated';
import colors, { PRESTIGE_COLORS } from '@/constants/colors';
import { Prestige, PRESTIGE_NAMES, PRESTIGE_ORDER } from '@/lib/xpSystem';

interface Milestone {
  label: string;
  threshold: number;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}

const MILESTONES: Milestone[] = [
  { label: 'First Blood', threshold: 1, icon: 'sword' },
  { label: 'Regular', threshold: 10, icon: 'fire' },
  { label: 'Committed', threshold: 25, icon: 'shield-check' },
  { label: 'Veteran', threshold: 50, icon: 'shield-star' },
  { label: 'Warrior', threshold: 100, icon: 'sword-cross' },
  { label: 'Legend', threshold: 150, icon: 'trophy' },
  { label: 'BMF', threshold: 250, icon: 'crown' },
];

interface RoadToBMFProps {
  workoutsCompleted: number;
  prestige: Prestige;
  level: number;
}

function MilestoneDot({ milestone, index, reached, prestigeColor, progress }: {
  milestone: Milestone;
  index: number;
  reached: boolean;
  prestigeColor: string;
  progress: number;
}) {
  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withDelay(index * 80, withTiming(reached ? 1.0 : 0.7, { duration: 400 })) }],
    opacity: withDelay(index * 80, withTiming(reached ? 1 : 0.35, { duration: 400 })),
  }));

  return (
    <Animated.View style={[styles.milestoneContainer, dotStyle]}>
      <View style={[
        styles.dot,
        reached ? { backgroundColor: prestigeColor, borderColor: prestigeColor } : styles.dotLocked,
      ]}>
        <MaterialCommunityIcons
          name={milestone.icon}
          size={index === MILESTONES.length - 1 ? 20 : 16}
          color={reached ? colors.dark.background : colors.dark.mutedForeground}
        />
      </View>
      <Text style={[
        styles.milestoneLabel,
        reached && { color: prestigeColor },
      ]} numberOfLines={1}>
        {milestone.label}
      </Text>
      <Text style={[
        styles.milestoneThreshold,
        reached && { color: colors.dark.foreground },
      ]}>
        {milestone.threshold}
      </Text>
    </Animated.View>
  );
}

export default function RoadToBMF({ workoutsCompleted, prestige, level }: RoadToBMFProps) {
  const prestigeColor = PRESTIGE_COLORS[prestige] || PRESTIGE_COLORS.rookie;
  const prestigeIndex = PRESTIGE_ORDER.indexOf(prestige);

  const lastReachedIdx = MILESTONES.reduce((acc, m, i) => workoutsCompleted >= m.threshold ? i : acc, -1);
  const nextIdx = lastReachedIdx + 1;
  const segmentProgress = nextIdx < MILESTONES.length
    ? Math.min(1, (workoutsCompleted - (lastReachedIdx >= 0 ? MILESTONES[lastReachedIdx].threshold : 0)) /
        (MILESTONES[nextIdx].threshold - (lastReachedIdx >= 0 ? MILESTONES[lastReachedIdx].threshold : 0)))
    : 1;

  const overallProgress = Math.min(1, workoutsCompleted / 250);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Road to BMF</Text>
        <View style={styles.statsRow}>
          <Text style={styles.prestigeLabel}>
            {PRESTIGE_NAMES[prestige]} L{level}
          </Text>
          <Text style={styles.workoutCount}>
            {workoutsCompleted}/250
          </Text>
        </View>
      </View>

      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${overallProgress * 100}%`, backgroundColor: prestigeColor }]} />
        </View>
        <View style={styles.prestigeDotsRow}>
          {PRESTIGE_ORDER.map((p, i) => (
            <View
              key={p}
              style={[
                styles.prestigeDot,
                i <= prestigeIndex
                  ? { backgroundColor: PRESTIGE_COLORS[p], borderColor: PRESTIGE_COLORS[p] }
                  : { backgroundColor: 'transparent', borderColor: colors.dark.surface4 },
              ]}
            />
          ))}
        </View>
      </View>

      <View style={styles.milestonesRow}>
        {MILESTONES.map((m, i) => {
          const reached = workoutsCompleted >= m.threshold;
          return (
            <React.Fragment key={m.label}>
              {i > 0 && (
                <View style={styles.connectorContainer}>
                  <View style={[
                    styles.connector,
                    reached
                      ? { backgroundColor: prestigeColor }
                      : (workoutsCompleted >= (MILESTONES[i - 1]?.threshold ?? 0))
                        ? { backgroundColor: prestigeColor, opacity: segmentProgress * (nextIdx === i ? 1 : 0) + (lastReachedIdx >= i ? 1 : 0.15) }
                        : { backgroundColor: colors.dark.surface4 },
                  ]} />
                </View>
              )}
              <MilestoneDot
                milestone={m}
                index={i}
                reached={reached}
                prestigeColor={prestigeColor}
                progress={overallProgress}
              />
            </React.Fragment>
          );
        })}
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
  },
  header: {
    marginBottom: 14,
  },
  title: {
    color: colors.dark.foreground,
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  prestigeLabel: {
    color: colors.dark.mutedForeground,
    fontSize: 13,
  },
  workoutCount: {
    color: colors.dark.mutedForeground,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  progressBarContainer: {
    marginBottom: 18,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: colors.dark.surface3,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  prestigeDotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingHorizontal: 4,
  },
  prestigeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  milestonesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  milestoneContainer: {
    alignItems: 'center',
    width: 42,
  },
  dot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  dotLocked: {
    backgroundColor: colors.dark.surface3,
    borderColor: colors.dark.surface4,
  },
  milestoneLabel: {
    color: colors.dark.mutedForeground,
    fontSize: 9,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
  milestoneThreshold: {
    color: colors.dark.mutedForeground,
    fontSize: 8,
    textAlign: 'center',
    opacity: 0.7,
  },
  connectorContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 10,
  },
  connector: {
    height: 2,
    borderRadius: 1,
  },
});
