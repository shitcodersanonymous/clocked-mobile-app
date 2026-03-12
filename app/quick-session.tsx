import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  TextInput,
  Platform,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import colors from '@/constants/colors';
import { useTheme } from "@/contexts/ThemeContext";
import { useUserStore } from '@/stores/userStore';
import { useHistoryStore } from '@/stores/historyStore';
import { useBadgeStore } from '@/stores/badgeStore';
import { getStreakMultiplier, getLevelFromXP, Prestige, getXPWithinCurrentLevel, getRankingFromLevel, PRESTIGE_NAMES, RANKING_NAMES } from '@/lib/xpSystem';
import { checkBadges, sumBadgeXP } from '@/data/badges';
import { computePostLogStats } from '@/lib/workoutTracking';
import { generateId } from '@/lib/utils';
import { XPBar } from '@/components/ui/XPBar';

const QUICK_SESSION_XP_RATE = 0.10;

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatTimeCompact(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function QuickSessionScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const user = useUserStore((s) => s.user);
  const addXP = useUserStore((s) => s.addXP);
  const updateUser = useUserStore((s) => s.updateUser);
  const addCompletedWorkout = useHistoryStore((s) => s.addCompletedWorkout);
  const completedWorkouts = useHistoryStore((s) => s.completedWorkouts);
  const { earnedBadgeIds, badgeStats, addEarnedBadges, updateBadgeStats } = useBadgeStore();

  const [totalElapsed, setTotalElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const [accumulatedXP, setAccumulatedXP] = useState(0);
  const [notes, setNotes] = useState('');
  const [logged, setLogged] = useState(false);
  const [difficultyRating, setDifficultyRating] = useState<'too_easy' | 'just_right' | 'too_hard' | null>(null);
  const [levelUpLevel, setLevelUpLevel] = useState<number | null>(null);

  const lastTickTimeRef = useRef<number>(Date.now());
  const xpAwardedRef = useRef(false);
  const prevLevelRef = useRef<number>(user?.currentLevel || 1);

  const prestige = (user?.prestige || 'beginner') as Prestige;
  const streakMultiplier = getStreakMultiplier(user?.currentStreak || 0);

  const liveLevel = getLevelFromXP(prestige, (user?.totalXP || 0) + accumulatedXP);

  const pulseScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);

  useEffect(() => {
    if (isRunning && !isPaused) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.2, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      pulseScale.value = withTiming(1);
      glowOpacity.value = withTiming(0.3);
    }
  }, [isRunning, isPaused]);

  useEffect(() => {
    if (liveLevel > prevLevelRef.current) {
      setLevelUpLevel(liveLevel);
      prevLevelRef.current = liveLevel;
    }
  }, [liveLevel]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (isRunning && !isPaused) {
      lastTickTimeRef.current = Date.now();

      interval = setInterval(() => {
        const now = Date.now();
        const delta = Math.floor((now - lastTickTimeRef.current) / 1000);
        if (delta < 1) return;
        lastTickTimeRef.current = now;

        setTotalElapsed((prev) => prev + delta);
        setAccumulatedXP((prev) => prev + QUICK_SESSION_XP_RATE * streakMultiplier * delta);
      }, 250);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, isPaused, streakMultiplier]);

  const handleStart = () => {
    setIsRunning(true);
    setIsPaused(false);
  };

  const handlePauseResume = () => {
    setIsPaused((prev) => !prev);
  };

  const handleFinish = useCallback(() => {
    if (xpAwardedRef.current) return;
    xpAwardedRef.current = true;

    setIsComplete(true);
    setIsRunning(false);

    const xpEarned = Math.round(accumulatedXP);
    addXP(xpEarned);

    const sessionMinutes = Math.floor(totalElapsed / 60);
    const sessionHours = totalElapsed / 3600;

    const updatedStats = {
      ...badgeStats,
      totalSessions: badgeStats.totalSessions + 1,
      totalHours: badgeStats.totalHours + sessionHours,
      singleSessionMinutes: Math.max(badgeStats.singleSessionMinutes, sessionMinutes),
      consecutiveDays: user?.currentStreak || 0,
    };

    updateBadgeStats(updatedStats);

    const newBadges = checkBadges(updatedStats, earnedBadgeIds);
    if (newBadges.length > 0) {
      const badgeXP = sumBadgeXP(newBadges);
      addEarnedBadges(newBadges.map((b) => b.id));
      if (badgeXP > 0) {
        addXP(badgeXP);
      }
    }
  }, [accumulatedXP, totalElapsed, addXP, badgeStats, earnedBadgeIds, user]);

  const handleExitPress = () => {
    if (isRunning && totalElapsed > 0) {
      Alert.alert(
        'End Session?',
        `You've trained for ${formatTimeCompact(totalElapsed)}. What would you like to do?`,
        [
          { text: 'Keep Going', style: 'cancel' },
          {
            text: 'Leave Without Saving',
            style: 'destructive',
            onPress: () => router.back(),
          },
          {
            text: 'End & Save',
            onPress: () => {
              handleFinish();
            },
          },
        ]
      );
    } else {
      router.back();
    }
  };

  const handleLog = () => {
    const xpEarned = Math.round(accumulatedXP);

    const entry = {
      id: generateId(),
      workoutName: 'Quick Session',
      completedAt: new Date().toISOString(),
      duration: totalElapsed,
      xpEarned,
      difficulty: difficultyRating || undefined,
      notes: notes || undefined,
      isManualEntry: false,
      roundFeedback: [],
    };

    addCompletedWorkout(entry);

    if (user) {
      const allWorkouts = [entry, ...completedWorkouts];
      const stats = computePostLogStats(allWorkouts, user);
      updateUser({
        workoutsCompleted: stats.workoutsCompleted,
        currentStreak: stats.currentStreak,
        longestStreak: stats.longestStreak,
        lastWorkoutDate: stats.lastWorkoutDate,
        totalTrainingSeconds: stats.totalTrainingSeconds,
      });
    }

    setLogged(true);
  };

  const timerPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const xpInfo = getXPWithinCurrentLevel(prestige, (user?.totalXP || 0) + accumulatedXP);
  const rankingName = RANKING_NAMES[getRankingFromLevel(liveLevel)];
  const prestigeName = PRESTIGE_NAMES[prestige];

  if (isComplete) {
    const xpEarned = Math.round(accumulatedXP);

    return (
      <View style={[styles.container, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0), paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) }]}>
        {levelUpLevel !== null && (
          <LevelUpOverlay level={levelUpLevel} onDismiss={() => setLevelUpLevel(null)} />
        )}

        <View style={styles.completeContent}>
          <Ionicons name="timer-outline" size={48} color={theme.volt} />
          <Text style={styles.completeTitle}>SESSION COMPLETE</Text>
          <Text style={styles.completeSubtitle}>Quick Session</Text>

          <View style={styles.statRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{formatTimeCompact(totalElapsed)}</Text>
              <Text style={styles.statLabel}>Duration</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>+{xpEarned}</Text>
              <Text style={styles.statLabel}>XP Earned</Text>
            </View>
          </View>

          {streakMultiplier > 1 && (
            <View style={styles.streakBonusPill}>
              <Ionicons name="flame" size={14} color={theme.orange} />
              <Text style={styles.streakBonusText}>
                {streakMultiplier}x Streak Bonus Applied
              </Text>
            </View>
          )}

          <View style={styles.xpBarSection}>
            <XPBar
              prestige={prestige}
              level={liveLevel}
              currentXP={xpInfo.current}
              requiredXP={xpInfo.required}
              rankingName={rankingName}
              prestigeName={prestigeName}
            />
          </View>

          {!logged ? (
            <View style={styles.logSection}>
              <Text style={styles.sectionLabel}>How did it go?</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Add notes about your session..."
                placeholderTextColor={theme.mutedForeground}
                multiline
                style={styles.notesInput}
              />

              <Text style={styles.sectionLabel}>Difficulty</Text>
              <View style={styles.difficultyRow}>
                {([
                  { value: 'too_easy' as const, label: 'Too Easy' },
                  { value: 'just_right' as const, label: 'Just Right' },
                  { value: 'too_hard' as const, label: 'Too Hard' },
                ]).map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setDifficultyRating(opt.value)}
                    style={[
                      styles.difficultyButton,
                      difficultyRating === opt.value && styles.difficultyButtonActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.difficultyButtonText,
                        difficultyRating === opt.value && styles.difficultyButtonTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.logButton} onPress={handleLog}>
                <Ionicons name="save-outline" size={18} color={theme.background} />
                <Text style={styles.logButtonText}>Log Session</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.loggedBanner}>
              <Ionicons name="checkmark-circle" size={20} color={theme.volt} />
              <Text style={styles.loggedText}>Session Logged</Text>
            </View>
          )}

          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="home-outline" size={18} color={theme.foreground} />
            <Text style={styles.backButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0), paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) }]}>
      {levelUpLevel !== null && (
        <LevelUpOverlay level={levelUpLevel} onDismiss={() => setLevelUpLevel(null)} />
      )}

      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleExitPress} style={styles.exitButton}>
          <Ionicons name="arrow-back" size={20} color={theme.foreground} />
        </TouchableOpacity>

        <Text style={styles.xpCounter}>+{Math.round(accumulatedXP)} XP</Text>

        <View style={styles.streakPill}>
          <Ionicons name="flame" size={14} color={theme.orange} />
          <Text style={styles.streakText}>{streakMultiplier}x</Text>
        </View>
      </View>

      <View style={styles.timerArea}>
        <Text style={styles.sessionLabel}>QUICK SESSION</Text>

        <View style={styles.timerContainer}>
          <Animated.View style={[styles.timerGlow, glowStyle]} />
          <Animated.View style={timerPulseStyle}>
            <Text style={styles.timerDisplay}>{formatTime(totalElapsed)}</Text>
          </Animated.View>
        </View>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerLabel}>FREEFORM</Text>
          <View style={styles.dividerLine} />
        </View>

        {isRunning && (
          <View style={styles.xpRateRow}>
            <Text style={styles.xpRateText}>
              {(QUICK_SESSION_XP_RATE * streakMultiplier * 60).toFixed(1)} XP/min
            </Text>
          </View>
        )}
      </View>

      <View style={styles.controlsArea}>
        {!isRunning ? (
          <TouchableOpacity onPress={handleStart} style={styles.playButton} activeOpacity={0.8}>
            <Ionicons name="play" size={36} color={theme.background} style={{ marginLeft: 3 }} />
          </TouchableOpacity>
        ) : (
          <View style={styles.controlsRow}>
            <TouchableOpacity onPress={handlePauseResume} style={styles.pauseButton} activeOpacity={0.8}>
              <Ionicons
                name={isPaused ? 'play' : 'pause'}
                size={28}
                color={theme.volt}
                style={isPaused ? { marginLeft: 2 } : undefined}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleFinish} style={styles.stopButton} activeOpacity={0.8}>
              <Ionicons name="stop" size={32} color={theme.background} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

function LevelUpOverlay({ level, onDismiss }: { level: number; onDismiss: () => void }) {
  const overlayOpacity = useSharedValue(0);
  const scaleVal = useSharedValue(0.5);

  useEffect(() => {
    overlayOpacity.value = withTiming(1, { duration: 300 });
    scaleVal.value = withSequence(
      withTiming(1.15, { duration: 400, easing: Easing.out(Easing.back(1.5)) }),
      withTiming(1, { duration: 200 })
    );

    const timeout = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timeout);
  }, []);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleVal.value }],
  }));

  return (
    <Modal transparent animationType="none" visible>
      <Animated.View style={[styles.levelUpOverlay, overlayStyle]}>
        <TouchableOpacity style={styles.levelUpDismiss} onPress={onDismiss} activeOpacity={1}>
          <Animated.View style={[styles.levelUpContent, contentStyle]}>
            <Ionicons name="trophy" size={48} color={theme.volt} />
            <Text style={styles.levelUpTitle}>LEVEL UP</Text>
            <Text style={styles.levelUpLevel}>Level {level}</Text>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  exitButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  xpCounter: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: theme.voltMuted,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: theme.orangeDim,
  },
  streakText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: theme.orange,
  },
  timerArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  sessionLabel: {
    fontSize: 16,
    fontWeight: '900' as const,
    color: theme.foreground,
    letterSpacing: 3,
    marginBottom: 20,
  },
  timerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  timerGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: theme.voltDim,
  },
  timerDisplay: {
    fontSize: 64,
    fontWeight: '900' as const,
    color: theme.volt,
    fontVariant: ['tabular-nums'],
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  dividerLine: {
    height: 1,
    width: 40,
    backgroundColor: theme.surface3,
  },
  dividerLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: theme.mutedForeground,
    letterSpacing: 3,
  },
  xpRateRow: {
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: theme.surface1,
  },
  xpRateText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: theme.mutedForeground,
  },
  controlsArea: {
    alignItems: 'center',
    paddingBottom: 60,
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.volt,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.volt,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  pauseButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.surface3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.volt,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.volt,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },

  completeContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  completeTitle: {
    fontSize: 28,
    fontWeight: '900' as const,
    color: theme.foreground,
    marginTop: 16,
    letterSpacing: 1,
  },
  completeSubtitle: {
    fontSize: 14,
    color: theme.mutedForeground,
    marginTop: 4,
    marginBottom: 24,
  },
  statRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: theme.surface1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.surface3,
    paddingVertical: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: theme.volt,
  },
  statLabel: {
    fontSize: 12,
    color: theme.mutedForeground,
    marginTop: 4,
  },
  streakBonusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: theme.orangeDim,
    marginBottom: 16,
  },
  streakBonusText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: theme.orange,
  },
  xpBarSection: {
    width: '100%',
    marginBottom: 20,
  },
  logSection: {
    width: '100%',
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: theme.mutedForeground,
    marginBottom: 8,
  },
  notesInput: {
    backgroundColor: theme.surface1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.surface3,
    color: theme.foreground,
    fontSize: 14,
    padding: 12,
    height: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  difficultyRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  difficultyButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: theme.surface1,
    borderWidth: 1,
    borderColor: theme.surface3,
    alignItems: 'center',
  },
  difficultyButtonActive: {
    backgroundColor: theme.volt,
    borderColor: theme.volt,
  },
  difficultyButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: theme.mutedForeground,
  },
  difficultyButtonTextActive: {
    color: theme.background,
  },
  logButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.volt,
    borderRadius: 12,
    paddingVertical: 14,
    shadowColor: theme.volt,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logButtonText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: theme.background,
  },
  loggedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.surface1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.surface3,
    paddingVertical: 14,
    marginBottom: 16,
  },
  loggedText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: theme.volt,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.surface1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.surface3,
    paddingVertical: 14,
    width: '100%',
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: theme.foreground,
  },

  levelUpOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  levelUpDismiss: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  levelUpContent: {
    alignItems: 'center',
    gap: 12,
  },
  levelUpTitle: {
    fontSize: 32,
    fontWeight: '900' as const,
    color: theme.volt,
    letterSpacing: 4,
  },
  levelUpLevel: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: theme.foreground,
  },
});
