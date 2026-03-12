import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useThemedColors } from '@/hooks/useThemedColors';

interface XPBarProps {
  currentXP: number;
  requiredXP: number;
  level: number;
  tier: string;
  showLabel?: boolean;
}

export function XPBar({
  currentXP,
  requiredXP,
  level,
  tier,
  showLabel = true,
}: XPBarProps) {
  const colors = useThemedColors();
  const progress = useSharedValue(0);
  const percentage = Math.min((currentXP / requiredXP) * 100, 100);

  useEffect(() => {
    progress.value = withTiming(percentage, {
      duration: 800,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
  }, [percentage]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: `${progress.value}%`,
    };
  });

  const getTierColor = () => {
    switch (tier.toLowerCase()) {
      case 'rookie':
        return colors.tierRookie;
      case 'contender':
        return colors.tierContender;
      case 'pro':
        return colors.tierPro;
      case 'bmf':
        return colors.tierBMF;
      default:
        return colors.primary;
    }
  };

  const tierColor = getTierColor();

  return (
    <View style={styles.container}>
      {showLabel && (
        <View style={styles.header}>
          <Text style={[styles.tierText, { color: tierColor }]}>
            {tier} • Level {level}
          </Text>
          <Text style={[styles.xpText, { color: colors.textSecondary }]}>
            {currentXP} / {requiredXP} XP
          </Text>
        </View>
      )}
      
      <View style={[styles.barContainer, { backgroundColor: colors.xpBarBackground }]}>
        <Animated.View
          style={[
            styles.barFill,
            animatedStyle,
            { backgroundColor: colors.xpBar },
          ]}
        />
        <View style={[styles.barGlow, animatedStyle, { backgroundColor: colors.xpBar, opacity: 0.3 }]} />
      </View>

      {showLabel && (
        <Text style={[styles.percentageText, { color: colors.textTertiary }]}>
          {Math.floor(percentage)}% to next level
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tierText: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  xpText: {
    fontSize: 13,
    fontWeight: '600',
  },
  barContainer: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  barFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 6,
  },
  barGlow: {
    position: 'absolute',
    left: 0,
    top: -4,
    bottom: -4,
    borderRadius: 8,
    shadowColor: '#ffaa00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  percentageText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});
