/**
 * ArcTimer — SVG arc countdown timer for the workout session screen.
 *
 * Renders a 260pt circular arc (270° sweep) that drains as time passes.
 * The arc has two animated layers: a thick glow (opacity 0.35) and a crisp fill.
 * A vertical XP bar sits beside the arc showing live XP progress within the current level.
 *
 * Props:
 *   arcProgressSV — SharedValue<number> 0..1 (1 = full, 0 = empty), from useWorkoutTimer
 *   accentColor   — volt (normal), yellow (championship), blue (cooldown)
 *   timeRemaining — display value in seconds
 *   prestige      — for VerticalXPBar prestige-tier colour
 *   liveLevel     — current level (for labels)
 *   userTotalXP   — persistent XP from userStore
 *   accumulatedXP — XP earned so far this session (not yet persisted)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useAnimatedProps, SharedValue } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { formatTime } from '@/lib/utils';
import { getXPWithinCurrentLevel, Prestige } from '@/lib/xpSystem';
import VerticalXPBar from '@/components/ui/VerticalXPBar';
import colors from '@/constants/colors';
import { useTheme } from "@/contexts/ThemeContext";
import {
  ARC_SIZE,
  ARC_GLOW_STROKE,
  ARC_STROKE_WIDTH,
  ARC_R,
  ARC_C,
  ARC_FRAC,
  ARC_LEN,
  ARC_START_OFFSET,
} from '@/hooks/useWorkoutTimer';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ArcTimerProps {
  arcProgressSV: SharedValue<number>;
  accentColor: string;
  timeRemaining: number;
  prestige: Prestige;
  liveLevel: number;
  userTotalXP: number;
  accumulatedXP: number;
}

export default function ArcTimer({
  const { theme } = useTheme();
  arcProgressSV,
  accentColor,
  timeRemaining,
  prestige,
  liveLevel,
  userTotalXP,
  accumulatedXP,
}: ArcTimerProps) {
  const animatedGlowProps = useAnimatedProps(() => {
    const filled = ARC_LEN * arcProgressSV.value;
    return { strokeDasharray: [filled, ARC_C - filled] as unknown as string };
  });

  const animatedFillProps = useAnimatedProps(() => {
    const filled = ARC_LEN * arcProgressSV.value;
    return { strokeDasharray: [filled, ARC_C - filled] as unknown as string };
  });

  const GAP_LEN = ARC_C - ARC_LEN;
  const { current: xpCurrent, required: xpRequired } = getXPWithinCurrentLevel(
    prestige,
    userTotalXP + accumulatedXP
  );

  return (
    <View style={styles.arcTimerArea}>
      <View style={styles.arcTimerContainer}>
        <Svg
          width={ARC_SIZE}
          height={ARC_SIZE}
          viewBox={`0 0 ${ARC_SIZE} ${ARC_SIZE}`}
        >
          <Circle
            cx={ARC_SIZE / 2}
            cy={ARC_SIZE / 2}
            r={ARC_R}
            fill="none"
            stroke={theme.surface3}
            strokeWidth={ARC_STROKE_WIDTH}
            strokeDasharray={`${ARC_LEN} ${GAP_LEN}`}
            strokeDashoffset={ARC_START_OFFSET}
            strokeLinecap="round"
          />
          <AnimatedCircle
            cx={ARC_SIZE / 2}
            cy={ARC_SIZE / 2}
            r={ARC_R}
            fill="none"
            stroke={accentColor}
            strokeWidth={ARC_GLOW_STROKE}
            strokeDashoffset={ARC_START_OFFSET}
            strokeLinecap="round"
            opacity={0.35}
            animatedProps={animatedGlowProps}
          />
          <AnimatedCircle
            cx={ARC_SIZE / 2}
            cy={ARC_SIZE / 2}
            r={ARC_R}
            fill="none"
            stroke={accentColor}
            strokeWidth={ARC_STROKE_WIDTH}
            strokeDashoffset={ARC_START_OFFSET}
            strokeLinecap="round"
            animatedProps={animatedFillProps}
          />
        </Svg>
        <View style={styles.arcTimerTextWrap}>
          <Text style={[styles.timerText, { color: accentColor }]}>
            {formatTime(Math.max(0, Math.floor(timeRemaining)))}
          </Text>
        </View>
      </View>

      <View style={styles.verticalXPBar}>
        <Text style={[styles.verticalXPLabel, { color: accentColor }]}>
          Lvl {liveLevel + 1}
        </Text>
        <VerticalXPBar
          currentXP={xpCurrent}
          maxXP={xpRequired}
          prestige={prestige}
          height={160}
          width={10}
        />
        <Text style={[styles.verticalXPLabel, { color: accentColor }]}>
          Lvl {liveLevel}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  arcTimerArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    width: '100%',
  },
  arcTimerContainer: {
    width: 260,
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arcTimerTextWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    fontSize: 64,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  verticalXPBar: {
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 200,
    marginLeft: -8,
  },
  verticalXPLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
