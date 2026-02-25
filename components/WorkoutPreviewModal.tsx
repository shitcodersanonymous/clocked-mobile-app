import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '@/constants/colors';
import { DIFFICULTY_COLORS } from '@/constants/colors';
import type { Workout, WorkoutPhase, WorkoutSegment } from '@/lib/types';

interface WorkoutPreviewModalProps {
  workout: Workout;
  visible: boolean;
  onClose: () => void;
  onStart: () => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return `${hrs}h ${remainMins}m`;
  }
  if (secs === 0) return `${mins}m`;
  return `${mins}m ${secs}s`;
}

function estimateXP(workout: Workout): number {
  const baseXPPerMinute = 12;
  const difficultyMultipliers: Record<string, number> = {
    rookie: 0.8,
    beginner: 1.0,
    intermediate: 1.2,
    advanced: 1.5,
    pro: 1.8,
  };
  const mult = difficultyMultipliers[workout.difficulty] ?? 1.0;
  const minutes = workout.totalDuration / 60;
  return Math.round(minutes * baseXPPerMinute * mult);
}

function countSegments(workout: Workout): { work: number; rest: number } {
  let work = 0;
  let rest = 0;
  const allPhases = [
    ...workout.sections.warmup,
    ...workout.sections.grind,
    ...workout.sections.cooldown,
  ];
  for (const phase of allPhases) {
    for (const seg of phase.segments) {
      if (seg.type === 'rest') rest++;
      else work++;
    }
  }
  return { work, rest };
}

function PhaseCard({ phase, sectionLabel }: { phase: WorkoutPhase; sectionLabel: string }) {
  const sectionColors: Record<string, string> = {
    warmup: colors.dark.orange,
    grind: colors.dark.volt,
    cooldown: colors.dark.blue,
  };
  const accentColor = sectionColors[sectionLabel] ?? colors.dark.volt;

  const totalPhaseDuration = phase.segments.reduce((sum, s) => sum + s.duration, 0) * phase.repeats;

  return (
    <View style={[phaseStyles.card, { borderLeftColor: accentColor }]}>
      <View style={phaseStyles.header}>
        <Text style={[phaseStyles.name, { color: accentColor }]}>{phase.name}</Text>
        <View style={phaseStyles.meta}>
          {phase.repeats > 1 && (
            <View style={phaseStyles.pill}>
              <Text style={phaseStyles.pillText}>{phase.repeats}x</Text>
            </View>
          )}
          <Text style={phaseStyles.duration}>{formatDuration(totalPhaseDuration)}</Text>
        </View>
      </View>
      {phase.segments.map((seg, i) => (
        <SegmentRow key={seg.id || i} segment={seg} />
      ))}
    </View>
  );
}

function SegmentRow({ segment }: { segment: WorkoutSegment }) {
  const isRest = segment.type === 'rest';
  return (
    <View style={segStyles.row}>
      <View style={[segStyles.dot, { backgroundColor: isRest ? colors.dark.mutedForeground : colors.dark.volt }]} />
      <Text style={[segStyles.name, isRest && segStyles.restName]} numberOfLines={1}>
        {segment.name}
      </Text>
      <Text style={segStyles.dur}>{formatDuration(segment.duration)}</Text>
    </View>
  );
}

export default function WorkoutPreviewModal({
  workout,
  visible,
  onClose,
  onStart,
}: WorkoutPreviewModalProps) {
  const xpEstimate = estimateXP(workout);
  const { work, rest } = countSegments(workout);
  const diffColor = DIFFICULTY_COLORS[workout.difficulty] ?? colors.dark.mutedForeground;

  const hasWarmup = workout.sections.warmup.length > 0;
  const hasGrind = workout.sections.grind.length > 0;
  const hasCooldown = workout.sections.cooldown.length > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={2}>{workout.name}</Text>
              <View style={styles.badgeRow}>
                <View style={[styles.diffBadge, { backgroundColor: diffColor + '22' }]}>
                  <Text style={[styles.diffText, { color: diffColor }]}>
                    {workout.difficulty.charAt(0).toUpperCase() + workout.difficulty.slice(1)}
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} testID="close-preview">
              <Ionicons name="close" size={22} color={colors.dark.mutedForeground} />
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={18} color={colors.dark.volt} />
              <Text style={styles.statValue}>{formatDuration(workout.totalDuration)}</Text>
              <Text style={styles.statLabel}>Duration</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="lightning-bolt" size={18} color={colors.dark.amber} />
              <Text style={styles.statValue}>~{xpEstimate}</Text>
              <Text style={styles.statLabel}>XP Est.</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="layers-outline" size={18} color={colors.dark.blue} />
              <Text style={styles.statValue}>{work + rest}</Text>
              <Text style={styles.statLabel}>Segments</Text>
            </View>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {hasWarmup && (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="flame-outline" size={16} color={colors.dark.orange} />
                  <Text style={[styles.sectionTitle, { color: colors.dark.orange }]}>Warm Up</Text>
                </View>
                {workout.sections.warmup.map((phase, i) => (
                  <PhaseCard key={phase.id || i} phase={phase} sectionLabel="warmup" />
                ))}
              </View>
            )}

            {hasGrind && (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons name="boxing-glove" size={16} color={colors.dark.volt} />
                  <Text style={[styles.sectionTitle, { color: colors.dark.volt }]}>Grind</Text>
                </View>
                {workout.sections.grind.map((phase, i) => (
                  <PhaseCard key={phase.id || i} phase={phase} sectionLabel="grind" />
                ))}
              </View>
            )}

            {hasCooldown && (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="snow-outline" size={16} color={colors.dark.blue} />
                  <Text style={[styles.sectionTitle, { color: colors.dark.blue }]}>Cool Down</Text>
                </View>
                {workout.sections.cooldown.map((phase, i) => (
                  <PhaseCard key={phase.id || i} phase={phase} sectionLabel="cooldown" />
                ))}
              </View>
            )}

            {!hasWarmup && !hasGrind && !hasCooldown && (
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={40} color={colors.dark.mutedForeground} />
                <Text style={styles.emptyText}>No phases configured</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.startBtn}
              onPress={onStart}
              activeOpacity={0.8}
              testID="start-workout"
            >
              <Ionicons name="play" size={20} color={colors.dark.background} />
              <Text style={styles.startText}>Start Workout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.dark.surface1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    paddingBottom: 34,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.dark.surface4,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: colors.dark.foreground,
    letterSpacing: -0.3,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  diffBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  diffText: {
    fontSize: 12,
    fontWeight: '600' as const,
    textTransform: 'capitalize' as const,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 12,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    backgroundColor: colors.dark.surface2,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginBottom: 14,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.dark.foreground,
  },
  statLabel: {
    fontSize: 11,
    color: colors.dark.mutedForeground,
    fontWeight: '500' as const,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.dark.border,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  sectionBlock: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    color: colors.dark.mutedForeground,
    fontSize: 14,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.dark.volt,
    borderRadius: 14,
    paddingVertical: 16,
  },
  startText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.dark.background,
  },
});

const phaseStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.dark.surface2,
    borderRadius: 10,
    borderLeftWidth: 3,
    padding: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pill: {
    backgroundColor: colors.dark.surface4,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: colors.dark.foreground,
  },
  duration: {
    fontSize: 12,
    color: colors.dark.mutedForeground,
  },
});

const segStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  name: {
    flex: 1,
    fontSize: 13,
    color: colors.dark.foreground,
  },
  restName: {
    color: colors.dark.mutedForeground,
    fontStyle: 'italic' as const,
  },
  dur: {
    fontSize: 12,
    color: colors.dark.mutedForeground,
    fontWeight: '500' as const,
  },
});
