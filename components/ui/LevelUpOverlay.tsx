import { useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  FadeIn,
  Easing,
} from 'react-native-reanimated';
import colors from '@/constants/colors';
import { useTheme } from "@/contexts/ThemeContext";
import { PRESTIGE_COLORS } from '@/constants/colors';
import { useTheme } from "@/contexts/ThemeContext";
import { Prestige, PRESTIGE_NAMES, getRankingFromLevel, RANKING_NAMES } from '@/lib/xpSystem';

interface LevelUpOverlayProps {
  level: number;
  prestige: Prestige;
  onDismiss: () => void;
}

export function LevelUpOverlay({ level, prestige, onDismiss }: LevelUpOverlayProps) {
  const { theme } = useTheme();
  const flashOpacity = useSharedValue(0);
  const iconScale = useSharedValue(0.3);
  const textScale = useSharedValue(0);

  const tierColor = PRESTIGE_COLORS[prestige] || theme.volt;
  const ranking = getRankingFromLevel(level);
  const rankName = RANKING_NAMES[ranking];

  useEffect(() => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    flashOpacity.value = withSequence(
      withTiming(0.6, { duration: 150, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 400, easing: Easing.in(Easing.quad) })
    );

    iconScale.value = withSequence(
      withTiming(1.3, { duration: 250, easing: Easing.out(Easing.back(2)) }),
      withTiming(1, { duration: 200, easing: Easing.inOut(Easing.quad) })
    );

    textScale.value = withDelay(
      200,
      withTiming(1, { duration: 300, easing: Easing.out(Easing.back(1.5)) })
    );

    const timer = setTimeout(() => {
      onDismiss();
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  const iconAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const textAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: textScale.value }],
    opacity: textScale.value,
  }));

  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.overlay}>
      <Animated.View style={[styles.flash, { backgroundColor: tierColor }, flashStyle]} pointerEvents="none" />
      <View style={styles.content}>
        <Animated.View style={iconAnimStyle}>
          <Ionicons name="arrow-up-circle" size={64} color={tierColor} />
        </Animated.View>
        <Animated.View style={[styles.textContainer, textAnimStyle]}>
          <Text style={[styles.levelUpText, { color: tierColor }]}>LEVEL UP!</Text>
          <Text style={styles.levelNumber}>Level {level}</Text>
          <Text style={[styles.rankText, { color: tierColor + 'CC' }]}>{rankName}</Text>
        </Animated.View>
        <TouchableOpacity onPress={onDismiss} style={styles.dismissBtn}>
          <Text style={styles.dismissText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    alignItems: 'center',
    gap: 16,
  },
  textContainer: {
    alignItems: 'center',
    gap: 8,
  },
  levelUpText: {
    fontSize: 36,
    fontWeight: '900' as const,
    letterSpacing: 3,
  },
  levelNumber: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: theme.foreground,
  },
  rankText: {
    fontSize: 14,
    fontWeight: '600' as const,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  dismissBtn: {
    marginTop: 12,
    paddingHorizontal: 28,
    paddingVertical: 10,
    backgroundColor: theme.surface2,
    borderRadius: 12,
  },
  dismissText: {
    color: theme.foreground,
    fontSize: 14,
    fontWeight: '600' as const,
  },
});
