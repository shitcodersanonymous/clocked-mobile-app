import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import { PRESTIGE_COLORS } from '@/constants/colors';
import type { Prestige } from '@/lib/xpSystem';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

const BAR_WIDTH = 12;
const BAR_HEIGHT = 200;
const BORDER_RADIUS = 6;

interface VerticalXPBarProps {
  currentXP: number;
  maxXP: number;
  prestige: Prestige;
  height?: number;
  width?: number;
}

export default function VerticalXPBar({
  currentXP,
  maxXP,
  prestige,
  height = BAR_HEIGHT,
  width = BAR_WIDTH,
}: VerticalXPBarProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    const ratio = maxXP > 0 ? Math.min(1, Math.max(0, currentXP / maxXP)) : 0;
    progress.value = withTiming(ratio, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });
  }, [currentXP, maxXP]);

  const fillColor = PRESTIGE_COLORS[prestige] || PRESTIGE_COLORS.rookie;

  const animatedProps = useAnimatedProps(() => {
    const fillHeight = progress.value * (height - 4);
    return {
      y: height - 2 - fillHeight,
      height: fillHeight,
    };
  });

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="fillGrad" x1="0" y1="1" x2="0" y2="0">
            <Stop offset="0" stopColor={fillColor} stopOpacity="1" />
            <Stop offset="1" stopColor={fillColor} stopOpacity="0.6" />
          </LinearGradient>
        </Defs>

        <Rect
          x={0}
          y={0}
          width={width}
          height={height}
          rx={BORDER_RADIUS}
          ry={BORDER_RADIUS}
          fill="rgba(255,255,255,0.08)"
        />

        <AnimatedRect
          x={2}
          width={width - 4}
          rx={BORDER_RADIUS - 2}
          ry={BORDER_RADIUS - 2}
          fill="url(#fillGrad)"
          animatedProps={animatedProps}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
