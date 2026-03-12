import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { Prestige, PRESTIGE_NAMES, getPrestigeChanges } from '@/lib/xpSystem';
import { PRESTIGE_COLORS } from '@/constants/colors';
import { useTheme } from "@/contexts/ThemeContext";
import colors from '@/constants/colors';
import { useTheme } from "@/contexts/ThemeContext";

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PrestigePromptProps {
  onConfirm: () => void;
  onDismiss: () => void;
  currentPrestige: Prestige;
}

const TIER_ICONS: Record<Prestige, keyof typeof MaterialCommunityIcons.glyphMap> = {
  rookie: 'shield-outline',
  beginner: 'sword-cross',
  intermediate: 'star-four-points',
  advanced: 'crown',
  pro: 'trophy',
};

export default function PrestigePrompt({ onConfirm, onDismiss, currentPrestige }: PrestigePromptProps) {
  const { theme } = useTheme();
  const [step, setStep] = useState<1 | 2>(1);
  const changes = getPrestigeChanges(currentPrestige);
  const tierColor = PRESTIGE_COLORS[currentPrestige] || theme.volt;
  const nextTierColor = changes ? PRESTIGE_COLORS[changes.nextTier] : tierColor;

  const glowScale = useSharedValue(1);
  glowScale.value = withRepeat(
    withSequence(
      withTiming(1.15, { duration: 1200 }),
      withTiming(1, { duration: 1200 })
    ),
    -1,
    true
  );

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: 0.3,
  }));

  const nextIcon = changes ? TIER_ICONS[changes.nextTier] : TIER_ICONS[currentPrestige];

  return (
    <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)} style={styles.overlay}>
      <Animated.View entering={SlideInDown.springify().damping(18).stiffness(120)} style={styles.container}>
        <View style={styles.iconSection}>
          <Animated.View style={[styles.iconGlow, { backgroundColor: nextTierColor }, glowStyle]} />
          <View style={[styles.iconCircle, { borderColor: nextTierColor }]}>
            <MaterialCommunityIcons name={nextIcon} size={48} color={nextTierColor} />
          </View>
        </View>

        {step === 1 ? (
          <Animated.View entering={FadeIn.duration(200)} key="step1" style={styles.content}>
            <Text style={[styles.title, { color: nextTierColor }]}>PRESTIGE UP</Text>
            <Text style={styles.subtitle}>
              You've mastered {PRESTIGE_NAMES[currentPrestige]} tier!
            </Text>

            {changes && (
              <View style={styles.changesSection}>
                <Text style={styles.changesTitle}>What changes:</Text>

                <View style={styles.changeRow}>
                  <MaterialCommunityIcons name="arrow-up-bold" size={18} color={nextTierColor} />
                  <Text style={styles.changeText}>
                    Advance to <Text style={{ color: nextTierColor, fontWeight: '700' }}>{changes.nextTierName}</Text> tier
                  </Text>
                </View>

                <View style={styles.changeRow}>
                  <MaterialCommunityIcons name="refresh" size={18} color={theme.amber} />
                  <Text style={styles.changeText}>Level resets to 1 with a steeper XP curve</Text>
                </View>

                <View style={styles.changeRow}>
                  <MaterialCommunityIcons name="lock-open-variant" size={18} color={theme.green} />
                  <Text style={styles.changeText}>Unlock new combos, badges, and gloves</Text>
                </View>

                <View style={styles.changeRow}>
                  <MaterialCommunityIcons name="trophy" size={18} color={theme.yellow} />
                  <Text style={styles.changeText}>
                    {changes.newLevelCurve.totalL100.toLocaleString()} XP to reach L100 again
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.dismissButton} onPress={onDismiss} activeOpacity={0.7}>
                <MaterialCommunityIcons name="close" size={22} color={theme.mutedForeground} />
                <Text style={styles.dismissText}>Not yet</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmButton, { backgroundColor: nextTierColor }]}
                onPress={() => setStep(2)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="chevron-right" size={22} color={theme.background} />
                <Text style={styles.confirmText}>Prestige Up</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeIn.duration(200)} key="step2" style={styles.content}>
            <Text style={[styles.title, { color: theme.red }]}>ARE YOU SURE?</Text>
            <Text style={styles.warningText}>
              This is permanent. Your level will reset to 1 and XP requirements will increase significantly.
            </Text>

            <View style={[styles.warningBox, { borderColor: theme.red }]}>
              <MaterialCommunityIcons name="alert" size={20} color={theme.red} />
              <Text style={styles.warningBoxText}>This action cannot be undone.</Text>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.dismissButton} onPress={() => setStep(1)} activeOpacity={0.7}>
                <MaterialCommunityIcons name="arrow-left" size={22} color={theme.mutedForeground} />
                <Text style={styles.dismissText}>Go back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmButton, { backgroundColor: theme.red }]}
                onPress={onConfirm}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="check-bold" size={22} color="#FFF" />
                <Text style={[styles.confirmText, { color: '#FFF' }]}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  container: {
    width: SCREEN_WIDTH - 48,
    maxWidth: 380,
    backgroundColor: theme.surface2,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  iconSection: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    backgroundColor: theme.surface1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: theme.mutedForeground,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 21,
  },
  changesSection: {
    width: '100%',
    marginBottom: 24,
  },
  changesTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.foreground,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  changeText: {
    fontSize: 14,
    color: theme.foreground,
    flex: 1,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  dismissButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: theme.surface3,
  },
  dismissText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.mutedForeground,
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.background,
  },
  warningText: {
    fontSize: 15,
    color: theme.mutedForeground,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: theme.redDim,
    marginBottom: 24,
    width: '100%',
  },
  warningBoxText: {
    fontSize: 13,
    color: theme.red,
    fontWeight: '600',
  },
});
