import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import colors from '@/constants/colors';
import { useTheme } from "@/contexts/ThemeContext";
import { PRESTIGE_COLORS } from '@/constants/colors';
import { useTheme } from "@/contexts/ThemeContext";
import {
  Prestige,
  PRESTIGE_NAMES,
  RANKING_NAMES,
  getRankingFromLevel,
  getXPWithinCurrentLevel,
  isPrestigeEligible,
} from '@/lib/xpSystem';
import { XPBar } from '@/components/ui/XPBar';
import { Badge } from '@/data/badges';
import PrestigePrompt from '@/components/workout/PrestigePrompt';

export interface SessionXPBreakdown {
  baseXP: number;
  streakMultiplier: number;
  streakBonus: number;
  effectiveBase: number;
  badgeXP: number;
  sessionTotal: number;
  newBadges: Badge[];
  levelBefore: number;
  levelAfter: number;
  streakBefore: number;
  streakAfter: number;
  streakBroken: boolean;
  didLevelUp: boolean;
  prestige: Prestige;
  totalXPAfter: number;
  prestigeEligible: boolean;
  isMaxLevel: boolean;
}

interface PostWorkoutSummaryProps {
  sessionResult: SessionXPBreakdown;
  workoutName: string;
  totalElapsed: number;
  accentColor: string;
  logged: boolean;
  onLog: (difficultyRating: 'too_easy' | 'just_right' | 'too_hard' | null, notes: string) => void;
  onGoHome: () => void;
  onPrestige: () => void;
  onDismissPrestige: () => void;
  insets: { top: number; bottom: number };
}

function formatTimeCompact(seconds: number): string {
  const mins = Math.floor(Math.max(0, seconds) / 60);
  const secs = Math.max(0, Math.floor(seconds)) % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function AnimatedXPCounter({ targetValue, color }: { targetValue: number; color: string }) {
  const [displayValue, setDisplayValue] = useState(0);
  const animRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);

  useEffect(() => {
    const duration = 1200;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(eased * targetValue));

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      }
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [targetValue]);

  return (
    <Text style={[styles.xpTotalValue, { color }]}>+{displayValue.toLocaleString()}</Text>
  );
}

export default function PostWorkoutSummary({
  const { theme } = useTheme();
  sessionResult,
  workoutName,
  totalElapsed,
  accentColor,
  logged,
  onLog,
  onGoHome,
  onPrestige,
  onDismissPrestige,
  insets,
}: PostWorkoutSummaryProps) {
  const [difficultyRating, setDifficultyRating] = useState<'too_easy' | 'just_right' | 'too_hard' | null>(null);
  const [notes, setNotes] = useState('');
  const [showPrestigePrompt, setShowPrestigePrompt] = useState(false);

  const cardOpacity = useSharedValue(0);

  useEffect(() => {
    cardOpacity.value = withDelay(400, withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) }));
  }, []);

  useEffect(() => {
    if (logged && sessionResult.prestigeEligible) {
      const timer = setTimeout(() => setShowPrestigePrompt(true), 800);
      return () => clearTimeout(timer);
    }
  }, [logged, sessionResult.prestigeEligible]);

  const cardAnimStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
  }));

  const ranking = getRankingFromLevel(sessionResult.levelAfter);
  const xpInfo = getXPWithinCurrentLevel(sessionResult.prestige, sessionResult.totalXPAfter);

  const handleLog = () => {
    onLog(difficultyRating, notes);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ScrollView style={styles.summaryScroll} contentContainerStyle={styles.summaryContent}>
        <Animated.View entering={FadeIn.duration(400)}>
          <Text style={styles.summaryTitle}>WORKOUT COMPLETE</Text>
          <Text style={styles.workoutNameSummary}>{workoutName}</Text>
          <Text style={styles.summaryDuration}>{formatTimeCompact(totalElapsed)}</Text>
        </Animated.View>

        <Animated.View style={cardAnimStyle}>
          <View style={styles.xpTotalCard}>
            <Text style={styles.xpTotalLabel}>TOTAL XP EARNED</Text>
            <AnimatedXPCounter targetValue={sessionResult.sessionTotal} color={theme.volt} />
          </View>

          <View style={styles.xpBreakdownCard}>
            <View style={styles.xpRow}>
              <Text style={styles.xpRowLabel}>Base XP</Text>
              <Text style={styles.xpRowValue}>{sessionResult.baseXP.toLocaleString()}</Text>
            </View>
            {sessionResult.streakBonus > 0 && (
              <View style={styles.xpRow}>
                <Text style={[styles.xpRowLabel, { color: theme.orange }]}>
                  Streak Bonus ({sessionResult.streakMultiplier}x)
                </Text>
                <Text style={[styles.xpRowValue, { color: theme.orange }]}>
                  +{sessionResult.streakBonus.toLocaleString()}
                </Text>
              </View>
            )}
            {sessionResult.badgeXP > 0 && (
              <View style={styles.xpRow}>
                <Text style={[styles.xpRowLabel, { color: theme.amber }]}>Badge XP</Text>
                <Text style={[styles.xpRowValue, { color: theme.amber }]}>
                  +{sessionResult.badgeXP.toLocaleString()}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.levelCard}>
            <View style={styles.levelRow}>
              <Text style={styles.levelLabel}>Level</Text>
              <Text style={[styles.levelValue, { color: accentColor }]}>
                {sessionResult.levelBefore} {sessionResult.didLevelUp ? `\u2192 ${sessionResult.levelAfter}` : ''}
              </Text>
            </View>
            <XPBar
              prestige={sessionResult.prestige}
              level={sessionResult.levelAfter}
              currentXP={xpInfo.current}
              requiredXP={xpInfo.required}
              showRank={true}
              rankingName={RANKING_NAMES[ranking]}
              prestigeName={PRESTIGE_NAMES[sessionResult.prestige]}
            />
          </View>

          {sessionResult.newBadges.length > 0 && (
            <View style={styles.badgesEarnedCard}>
              <Text style={styles.badgesEarnedTitle}>BADGES EARNED</Text>
              {sessionResult.newBadges.map((badge) => (
                <View key={badge.id} style={styles.badgeRow}>
                  <Ionicons name="trophy" size={16} color={theme.amber} />
                  <View style={styles.badgeInfo}>
                    <Text style={styles.badgeName}>{badge.name}</Text>
                    <Text style={styles.badgeDesc}>{badge.description}</Text>
                  </View>
                  <Text style={styles.badgeXP}>+{badge.xpReward}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.difficultySection}>
            <Text style={styles.difficultyLabel}>How was it?</Text>
            <View style={styles.difficultyRow}>
              {(['too_easy', 'just_right', 'too_hard'] as const).map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[
                    styles.difficultyBtn,
                    difficultyRating === d && styles.difficultyBtnActive,
                    difficultyRating === d && { borderColor: accentColor },
                  ]}
                  onPress={() => setDifficultyRating(d)}
                >
                  <Ionicons
                    name={d === 'too_easy' ? 'thumbs-down-outline' : d === 'just_right' ? 'thumbs-up-outline' : 'flame-outline'}
                    size={20}
                    color={difficultyRating === d ? accentColor : theme.mutedForeground}
                  />
                  <Text style={[
                    styles.difficultyBtnText,
                    difficultyRating === d && { color: accentColor },
                  ]}>
                    {d === 'too_easy' ? 'Easy' : d === 'just_right' ? 'Perfect' : 'Hard'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TextInput
            style={styles.notesInput}
            placeholder="Add notes..."
            placeholderTextColor={theme.mutedForeground}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />

          {!logged ? (
            <TouchableOpacity style={[styles.logBtn, { backgroundColor: accentColor }]} onPress={handleLog}>
              <Text style={styles.logBtnText}>LOG WORKOUT</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.loggedContainer}>
              <Ionicons name="checkmark-circle" size={24} color={theme.green} />
              <Text style={styles.loggedText}>Workout Logged!</Text>
            </View>
          )}

          <TouchableOpacity style={styles.homeBtn} onPress={onGoHome}>
            <Ionicons name="home-outline" size={20} color={theme.foreground} />
            <Text style={styles.homeBtnText}>Home</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {showPrestigePrompt && (
        <PrestigePrompt
          currentPrestige={sessionResult.prestige}
          onConfirm={() => {
            setShowPrestigePrompt(false);
            onPrestige();
          }}
          onDismiss={() => {
            setShowPrestigePrompt(false);
            onDismissPrestige();
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  summaryScroll: {
    flex: 1,
  },
  summaryContent: {
    padding: 20,
    paddingBottom: 40,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '900' as const,
    color: theme.volt,
    letterSpacing: 3,
    textAlign: 'center',
    marginBottom: 4,
  },
  workoutNameSummary: {
    fontSize: 24,
    fontWeight: '900' as const,
    color: theme.foreground,
    textAlign: 'center',
    marginBottom: 4,
  },
  summaryDuration: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: theme.mutedForeground,
    textAlign: 'center',
    marginBottom: 24,
    fontVariant: ['tabular-nums'],
  },
  xpTotalCard: {
    backgroundColor: theme.surface1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.volt + '30',
  },
  xpTotalLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: theme.mutedForeground,
    letterSpacing: 1,
    marginBottom: 4,
  },
  xpTotalValue: {
    fontSize: 36,
    fontWeight: '900' as const,
    color: theme.volt,
  },
  xpBreakdownCard: {
    backgroundColor: theme.surface1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  xpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  xpRowLabel: {
    fontSize: 13,
    color: theme.mutedForeground,
  },
  xpRowValue: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: theme.foreground,
  },
  levelCard: {
    backgroundColor: theme.surface1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  levelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  levelLabel: {
    fontSize: 13,
    color: theme.mutedForeground,
  },
  levelValue: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  badgesEarnedCard: {
    backgroundColor: theme.surface1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  badgesEarnedTitle: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: theme.amber,
    letterSpacing: 1,
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.surface3,
  },
  badgeInfo: {
    flex: 1,
  },
  badgeName: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: theme.foreground,
  },
  badgeDesc: {
    fontSize: 11,
    color: theme.mutedForeground,
  },
  badgeXP: {
    fontSize: 13,
    fontWeight: '900' as const,
    color: theme.volt,
  },
  difficultySection: {
    marginBottom: 16,
  },
  difficultyLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: theme.foreground,
    marginBottom: 10,
  },
  difficultyRow: {
    flexDirection: 'row',
    gap: 10,
  },
  difficultyBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: theme.surface1,
    borderWidth: 1,
    borderColor: theme.surface3,
    alignItems: 'center',
    gap: 4,
  },
  difficultyBtnActive: {
    backgroundColor: theme.surface2,
  },
  difficultyBtnText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: theme.mutedForeground,
  },
  notesInput: {
    backgroundColor: theme.surface1,
    borderRadius: 12,
    padding: 14,
    color: theme.foreground,
    fontSize: 14,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 20,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  logBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  logBtnText: {
    fontSize: 15,
    fontWeight: '900' as const,
    color: theme.background,
    letterSpacing: 1,
  },
  loggedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginBottom: 12,
  },
  loggedText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: theme.green,
  },
  homeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.surface1,
    borderWidth: 1,
    borderColor: theme.border,
  },
  homeBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: theme.foreground,
  },
});
