/**
 * WorkoutControls — Bottom section of the workout session screen.
 *
 * Renders (top to bottom):
 *   1. Adjust row   — −30s, −15s, +15s, +30s time-adjustment buttons
 *   2. Progress bar — phase label, next-segment indicator, filled progress bar, segment count
 *   3. Controls row — skip-back | play/pause | skip-forward buttons
 *
 * The component is purely presentational — all state and handlers come from props.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '@/constants/colors';

interface WorkoutControlsProps {
  isPaused: boolean;
  isPreparation: boolean;
  accentColor: string;
  currentPhaseName: string;
  nextSegmentName: string;
  progressPercent: number;
  currentSection: string;
  currentSegmentNum: number;
  totalSegments: number;
  onTogglePause: () => void;
  onSkipBack: () => void;
  onSkipForward: () => void;
  onAdjustTime: (delta: number) => void;
}

const ADJUST_DELTAS = [-30, -15, 15, 30] as const;

export default function WorkoutControls({
  isPaused,
  isPreparation,
  accentColor,
  currentPhaseName,
  nextSegmentName,
  progressPercent,
  currentSection,
  currentSegmentNum,
  totalSegments,
  onTogglePause,
  onSkipBack,
  onSkipForward,
  onAdjustTime,
}: WorkoutControlsProps) {
  return (
    <View style={styles.bottomSection}>
      <View style={styles.adjustRow}>
        {ADJUST_DELTAS.map((val) => (
          <TouchableOpacity
            key={val}
            style={styles.adjustBtn}
            onPress={() => onAdjustTime(val)}
          >
            <Text style={styles.adjustBtnText}>{val > 0 ? `+${val}` : val}s</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.progressInfo}>
        <Text style={styles.progressPhase}>
          {isPreparation ? 'PREP' : currentPhaseName}
        </Text>
        <View style={styles.progressNext}>
          <View style={[styles.progressDot, { backgroundColor: accentColor }]} />
          <Text style={styles.progressNextText}>{nextSegmentName}</Text>
        </View>
      </View>

      <View style={styles.progressBarBg}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${progressPercent}%`, backgroundColor: accentColor },
          ]}
        />
      </View>

      <View style={styles.progressMeta}>
        <Text style={styles.progressSection}>
          {isPreparation ? 'PREP' : currentSection}
        </Text>
        <Text style={[styles.progressCount, { color: accentColor }]}>
          {isPreparation ? '0' : currentSegmentNum}/{totalSegments}
        </Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlBtn, isPreparation && styles.controlBtnDisabled]}
          onPress={onSkipBack}
          disabled={isPreparation}
        >
          <Ionicons name="play-skip-back" size={22} color={colors.dark.foreground} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.playBtn, { backgroundColor: accentColor }]}
          onPress={onTogglePause}
        >
          <Ionicons
            name={isPaused ? 'play' : 'pause'}
            size={32}
            color={colors.dark.background}
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlBtn} onPress={onSkipForward}>
          <Ionicons name="play-skip-forward" size={22} color={colors.dark.foreground} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomSection: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  adjustRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
    justifyContent: 'center',
  },
  adjustBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.dark.surface3,
  },
  adjustBtnText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.dark.mutedForeground,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressPhase: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.dark.foreground,
    textTransform: 'uppercase',
  },
  progressNext: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  progressDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  progressNextText: {
    fontSize: 11,
    color: colors.dark.mutedForeground,
  },
  progressBarBg: {
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.dark.surface2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  progressSection: {
    fontSize: 10,
    color: colors.dark.mutedForeground,
    textTransform: 'uppercase',
  },
  progressCount: {
    fontSize: 10,
    fontWeight: '700',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  controlBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.dark.surface1,
    borderWidth: 1,
    borderColor: colors.dark.surface3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlBtnDisabled: {
    opacity: 0.3,
  },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
