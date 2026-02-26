import { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import colors from '@/constants/colors';
import { useWorkoutStore } from '@/stores/workoutStore';
import { useUserStore } from '@/stores/userStore';
import { useHistoryStore } from '@/stores/historyStore';
import { useBadgeStore } from '@/stores/badgeStore';
import { generateId } from '@/lib/utils';
import {
  ACTIVITY_XP_RATES,
  XPActivityType,
  getStreakMultiplier,
  getActivityTypeFromName,
  calculateComboXP,
  getLevelFromXP,
  Prestige,
  PRESTIGE_NAMES,
  getXPWithinCurrentLevel,
  PER_SESSION_ESTIMATES,
  TIER_COMBO_STATS,
  isPrestigeEligible,
  isMaxLevel,
  PRESTIGE_ORDER,
} from '@/lib/xpSystem';
import { computePostLogStats, computePostL100Increments } from '@/lib/workoutTracking';
import { checkBadges, BadgeStats, Badge } from '@/data/badges';
import { ComboXPPop } from '@/components/ui/ComboXPPop';
import { BadgeEarnOverlay } from '@/components/ui/BadgeEarnOverlay';
import { GloveUnlockOverlay } from '@/components/ui/GloveUnlockOverlay';
import { LevelUpOverlay } from '@/components/ui/LevelUpOverlay';
import PostWorkoutSummary from '@/components/workout/PostWorkoutSummary';
import ArcTimer from '@/components/workout/ArcTimer';
import ComboDisplay from '@/components/workout/ComboDisplay';
import WorkoutControls from '@/components/workout/WorkoutControls';
import { useWorkoutTimer, FlatSegment } from '@/hooks/useWorkoutTimer';
import { playSoundEffect } from '@/hooks/useSoundEffects';
import { executePrestige } from '@/lib/prestigeActions';
import { checkGloveUnlocks, Glove, GLOVES } from '@/data/gloves';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SessionXPBreakdown {
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

function formatTimeCompact(seconds: number): string {
  const mins = Math.floor(Math.max(0, seconds) / 60);
  const secs = Math.max(0, Math.floor(seconds)) % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WorkoutSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const workouts = useWorkoutStore((s) => s.workouts);
  const markWorkoutUsed = useWorkoutStore((s) => s.markWorkoutUsed);
  const user = useUserStore((s) => s.user);
  const addXP = useUserStore((s) => s.addXP);
  const updateUser = useUserStore((s) => s.updateUser);
  const addCompletedWorkout = useHistoryStore((s) => s.addCompletedWorkout);
  const completedWorkouts = useHistoryStore((s) => s.completedWorkouts);
  const earnedBadgeIds = useBadgeStore((s) => s.earnedBadgeIds);
  const addEarnedBadges = useBadgeStore((s) => s.addEarnedBadges);
  const updateBadgeStats = useBadgeStore((s) => s.updateBadgeStats);
  const badgeStats = useBadgeStore((s) => s.badgeStats);

  const workout = workouts.find((w) => w.id === id) || null;

  const prestige = (user?.prestige || 'beginner') as Prestige;
  const streakMultiplier = getStreakMultiplier(user?.currentStreak || 0);

  // ── Local state ────────────────────────────────────────────────────────────

  const [hasStartedOnce, setHasStartedOnce] = useState(false);
  const [accumulatedXP, setAccumulatedXP] = useState(0);
  const [notes, setNotes] = useState('');
  const [logged, setLogged] = useState(false);
  const [difficultyRating, setDifficultyRating] = useState<'too_easy' | 'just_right' | 'too_hard' | null>(null);
  const [levelUpLevel, setLevelUpLevel] = useState<number | null>(null);
  const [sessionResult, setSessionResult] = useState<SessionXPBreakdown | null>(null);
  const [roundFeedbacks, setRoundFeedbacks] = useState<Record<number, 'easy' | 'perfect' | 'hard'>>({});

  const [liveBadgesEarned, setLiveBadgesEarned] = useState<Array<{ badge: Badge; earnedAt: number }>>([]);
  const [latestBadgePop, setLatestBadgePop] = useState<{ badge: Badge; id: number } | null>(null);
  const [comboXPPop, setComboXPPop] = useState<{ amount: number; id: number; isChampionship?: boolean } | null>(null);
  const [badgeOverlay, setBadgeOverlay] = useState<Badge | null>(null);
  const [gloveUnlockOverlay, setGloveUnlockOverlay] = useState<Glove | null>(null);

  const liveBadgeIdsRef = useRef<Set<string>>(new Set());
  const prevLevelRef = useRef<number | null>(null);
  const sessionActiveRef = useRef(false);
  const prevSegmentIndexRef = useRef<number>(-1);
  const badgeOverlayQueue = useRef<Badge[]>([]);
  const gloveUnlockQueue = useRef<Glove[]>([]);

  // ── XP helpers ─────────────────────────────────────────────────────────────

  const isBoxingSegment = useCallback((segment: FlatSegment) => {
    const st = segment.segmentType;
    return st === 'shadowboxing' || st === 'combo' || st === 'doubleend';
  }, []);

  const getActivityTypeFromSegment = useCallback(
    (segment: FlatSegment | undefined): XPActivityType => {
      if (!segment) return 'active';
      return getActivityTypeFromName(segment.name, segment.type === 'rest' ? 'rest' : segment.segmentType);
    },
    []
  );

  const getXPPerSecond = useCallback(
    (segment: FlatSegment) => {
      const activityType = getActivityTypeFromSegment(segment);
      let xpPerSecond = ACTIVITY_XP_RATES[activityType];
      if (activityType === 'combo' && segment.combo && segment.combo.length > 0) {
        xpPerSecond = calculateComboXP(segment.combo, segment.duration) / segment.duration;
      }
      if (segment.phaseName.toLowerCase().includes('championship') && isBoxingSegment(segment)) {
        xpPerSecond *= 2;
      }
      return xpPerSecond;
    },
    [isBoxingSegment, getActivityTypeFromSegment]
  );

  // ── Timer hook callbacks ────────────────────────────────────────────────────

  const onXPTick = useCallback(
    (delta: number, segment: FlatSegment) => {
      const xpGained = getXPPerSecond(segment) * streakMultiplier * delta;
      setAccumulatedXP((prev) => prev + xpGained);
    },
    [getXPPerSecond, streakMultiplier]
  );

  const onComboSegmentComplete = useCallback((segment: FlatSegment) => {
    if (segment.segmentType === 'combo' && segment.combo && segment.combo.length > 0) {
      const comboXP = calculateComboXP(segment.combo, segment.duration);
      const isChamp = segment.phaseName.toLowerCase().includes('championship');
      const finalXP = isChamp ? comboXP * 2 : comboXP;
      setComboXPPop({ amount: finalXP, id: Date.now(), isChampionship: isChamp });
      setTimeout(() => setComboXPPop(null), 1500);
    }
  }, []);

  const onWorkoutComplete = useCallback(() => {
    Speech.stop();
    if (workout) markWorkoutUsed(workout.id);
  }, [workout, markWorkoutUsed]);

  // ── useWorkoutTimer ─────────────────────────────────────────────────────────

  const timer = useWorkoutTimer({
    workout,
    onXPTick,
    onComboSegmentComplete,
    onWorkoutComplete,
  });

  const {
    flatSegments,
    timeRemaining,
    totalElapsed,
    currentSegmentIndex,
    currentSegment,
    nextSegment,
    isRunning,
    isPaused,
    isPreparation,
    isComplete,
    arcProgressSV,
    overallProgress,
    handleBack,
    skipSegment,
    adjustTime,
  } = timer;

  // ── Derived display values ─────────────────────────────────────────────────

  const totalSegments = flatSegments.length;
  const progressPercent = overallProgress;

  const isChampionship = !isPreparation && !!currentSegment &&
    currentSegment.phaseName.toLowerCase().includes('championship');
  const isCooldown = !isPreparation && (
    currentSegment?.section === 'cooldown' ||
    currentSegment?.phaseName?.toLowerCase() === 'cooldown'
  );
  const accentColor = isChampionship ? colors.dark.yellow : isCooldown ? colors.dark.blue : colors.dark.volt;

  const liveLevel = getLevelFromXP(prestige, (user?.totalXP || 0) + accumulatedXP);

  const isShadowboxing = currentSegment?.segmentType === 'shadowboxing' ||
    currentSegment?.name.toLowerCase().includes('shadow') ||
    currentSegment?.name.toLowerCase().includes('technique');
  const isSpeedbag = currentSegment?.segmentType === 'speedbag';
  const isDoubleend = currentSegment?.segmentType === 'doubleend';
  const rawCombo = (isSpeedbag || isDoubleend)
    ? undefined
    : (isShadowboxing ? (currentSegment?.combo || currentSegment?.nextCombo) : currentSegment?.combo);
  const isFreestyleCombo = rawCombo?.length === 1 && rawCombo[0] === 'FREESTYLE';
  const displayCombo = isFreestyleCombo ? undefined : rawCombo;
  const isRestSegment = currentSegment?.type === 'rest' && !isPreparation;

  // ── Level-up effect (fires sound + overlay) ────────────────────────────────

  useEffect(() => {
    if (prevLevelRef.current === null) {
      prevLevelRef.current = liveLevel;
      return;
    }
    if (sessionActiveRef.current && accumulatedXP > 0 && liveLevel > prevLevelRef.current) {
      setLevelUpLevel(liveLevel);
      playSoundEffect.levelUp();
    }
    prevLevelRef.current = liveLevel;
  }, [liveLevel, accumulatedXP]);

  // ── Live badge check (every 5s while active) ───────────────────────────────

  useEffect(() => {
    if (isComplete || !isRunning || isPaused || !user) return;

    const interval = setInterval(() => {
      const tier = prestige;
      const tierStats = TIER_COMBO_STATS[tier];

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const lastDate = user.lastWorkoutDate;
      let newStreak: number;
      if (lastDate === todayStr) newStreak = user.currentStreak || 1;
      else if (lastDate === yesterdayStr) newStreak = (user.currentStreak || 0) + 1;
      else newStreak = 1;

      const liveStats: BadgeStats = {
        consecutiveDays: newStreak,
        totalCombos: (badgeStats.totalCombos || 0) + PER_SESSION_ESTIMATES.combosLanded,
        complexCombos: (badgeStats.complexCombos || 0) + tierStats.complex,
        defenseCombos: (badgeStats.defenseCombos || 0) + tierStats.defense,
        counterCombos: (badgeStats.counterCombos || 0) + tierStats.counter,
        totalSessions: (user.workoutsCompleted || 0) + 1,
        totalHours: ((user.totalTrainingSeconds || 0) + totalElapsed) / 3600,
        singleSessionMinutes: totalElapsed / 60,
        totalPushups: (badgeStats.totalPushups || 0) + PER_SESSION_ESTIMATES.pushups,
        totalBurpees: (badgeStats.totalBurpees || 0) + PER_SESSION_ESTIMATES.burpees,
        totalCurlups: (badgeStats.totalCurlups || 0) + PER_SESSION_ESTIMATES.curlups,
        totalJogRunMinutes: (badgeStats.totalJogRunMinutes || 0) + PER_SESSION_ESTIMATES.jogRunMinutes,
      };

      const alreadyEarned = [...earnedBadgeIds, ...Array.from(liveBadgeIdsRef.current)];
      const newBadges = checkBadges(liveStats, alreadyEarned);

      for (const badge of newBadges) {
        if (!liveBadgeIdsRef.current.has(badge.id)) {
          liveBadgeIdsRef.current.add(badge.id);
          setLiveBadgesEarned((prev) => [...prev, { badge, earnedAt: Date.now() }]);
          setAccumulatedXP((prev) => prev + badge.xpReward);
          const popId = Date.now();
          setLatestBadgePop({ badge, id: popId });
          setTimeout(() => setLatestBadgePop((prev) => (prev?.id === popId ? null : prev)), 3000);
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isComplete, isRunning, isPaused, user, totalElapsed, earnedBadgeIds, prestige, badgeStats]);

  // ── Session result computation (when complete) ─────────────────────────────

  useEffect(() => {
    if (!isComplete || sessionResult || !user) return;

    const streakMult = getStreakMultiplier(user.currentStreak || 0);
    const liveBadgeXP = liveBadgesEarned.reduce((s, lb) => s + lb.badge.xpReward, 0);
    const effectiveBase = Math.round(accumulatedXP);
    const timerOnlyBase = effectiveBase - liveBadgeXP;
    const rawBase = streakMult > 1 ? Math.round(timerOnlyBase / streakMult) : timerOnlyBase;
    const streakBonus = timerOnlyBase - rawBase;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const lastDate = user.lastWorkoutDate;
    let newStreak: number;
    let streakBroken = false;
    if (lastDate === todayStr) newStreak = user.currentStreak || 1;
    else if (lastDate === yesterdayStr) newStreak = (user.currentStreak || 0) + 1;
    else { newStreak = 1; streakBroken = (user.currentStreak || 0) > 1; }

    const tier = prestige;
    const tierStats = TIER_COMBO_STATS[tier];
    const updatedStats: BadgeStats = {
      consecutiveDays: newStreak,
      totalCombos: (badgeStats.totalCombos || 0) + PER_SESSION_ESTIMATES.combosLanded,
      complexCombos: (badgeStats.complexCombos || 0) + tierStats.complex,
      defenseCombos: (badgeStats.defenseCombos || 0) + tierStats.defense,
      counterCombos: (badgeStats.counterCombos || 0) + tierStats.counter,
      totalSessions: (user.workoutsCompleted || 0) + 1,
      totalHours: ((user.totalTrainingSeconds || 0) + totalElapsed) / 3600,
      singleSessionMinutes: totalElapsed / 60,
      totalPushups: (badgeStats.totalPushups || 0) + PER_SESSION_ESTIMATES.pushups,
      totalBurpees: (badgeStats.totalBurpees || 0) + PER_SESSION_ESTIMATES.burpees,
      totalCurlups: (badgeStats.totalCurlups || 0) + PER_SESSION_ESTIMATES.curlups,
      totalJogRunMinutes: (badgeStats.totalJogRunMinutes || 0) + PER_SESSION_ESTIMATES.jogRunMinutes,
    };

    const liveEarnedIds = Array.from(liveBadgeIdsRef.current);
    const newCoreBadges = checkBadges(updatedStats, [...earnedBadgeIds, ...liveEarnedIds]);
    const liveBadges = liveBadgesEarned.map((lb) => lb.badge);
    const allNewBadges = [...liveBadges, ...newCoreBadges];
    const badgeXP = allNewBadges.reduce((sum, b) => sum + b.xpReward, 0);
    const sessionTotal = timerOnlyBase + badgeXP;
    const totalXPAfter = (user.totalXP || 0) + sessionTotal;
    const levelBefore = user.currentLevel || 1;
    const levelAfter = getLevelFromXP(tier, totalXPAfter);

    setSessionResult({
      baseXP: rawBase,
      streakMultiplier: streakMult,
      streakBonus,
      effectiveBase: timerOnlyBase,
      badgeXP,
      sessionTotal,
      newBadges: allNewBadges,
      levelBefore,
      levelAfter,
      streakBefore: user.currentStreak || 0,
      streakAfter: newStreak,
      streakBroken,
      didLevelUp: levelAfter > levelBefore,
      prestige: tier,
      totalXPAfter,
      prestigeEligible: isPrestigeEligible(tier, totalXPAfter),
      isMaxLevel: isMaxLevel(tier, totalXPAfter),
    });
  }, [isComplete, sessionResult, user, accumulatedXP, totalElapsed, earnedBadgeIds, liveBadgesEarned, prestige, badgeStats]);

  // ── Voice segment announcement ─────────────────────────────────────────────

  useEffect(() => {
    if (prevSegmentIndexRef.current === currentSegmentIndex) return;
    prevSegmentIndexRef.current = currentSegmentIndex;

    if (!isPreparation && currentSegment && isRunning && !isPaused) {
      if (user?.preferences?.voiceAnnouncements !== false) {
        let announcement = '';
        if (currentSegment.type === 'rest') {
          announcement = 'Rest';
        } else if (currentSegment.segmentType === 'shadowboxing' || currentSegment.name.toLowerCase().includes('shadow')) {
          announcement = 'Shadowboxing';
        } else if (currentSegment.segmentType === 'speedbag') {
          announcement = currentSegment.name.includes('Freestyle') ? 'Speed Bag Freestyle' : currentSegment.name;
        } else if (currentSegment.segmentType === 'doubleend') {
          announcement = currentSegment.name.includes('Freestyle') ? 'Double End Bag Freestyle' : 'Double End Bag';
        } else if (currentSegment.segmentType === 'combo') {
          announcement = currentSegment.name.includes('Freestyle') ? 'Heavy Bag Freestyle' : 'Heavy Bag';
        } else {
          announcement = currentSegment.name;
        }
        Speech.speak(announcement, { rate: 0.9 });

        const isBoxingType =
          currentSegment.segmentType === 'shadowboxing' ||
          currentSegment.segmentType === 'combo' ||
          currentSegment.segmentType === 'doubleend' ||
          currentSegment.segmentType === 'speedbag';
        const combo = currentSegment.combo;
        if (combo && combo.length > 0 && isBoxingType && user?.preferences?.voiceComboCallouts !== false) {
          setTimeout(() => {
            const speakableCombo = combo.map((move) => {
              const m = move.toUpperCase();
              if (m === 'SLIP L') return 'slip left';
              if (m === 'SLIP R') return 'slip right';
              if (m === 'ROLL L') return 'roll left';
              if (m === 'ROLL R') return 'roll right';
              if (m === 'CIRCLE L') return 'circle left';
              if (m === 'CIRCLE R') return 'circle right';
              if (m === 'STEP IN') return 'step in';
              if (m === 'STEP OUT') return 'step out';
              return move;
            }).join(', ');
            Speech.speak(speakableCombo, { rate: 0.85 });
          }, 1200);
        }
      }
    }
  }, [currentSegmentIndex, isPreparation, currentSegment, isRunning, isPaused, user?.preferences]);

  // ── 3-second voice countdown ───────────────────────────────────────────────

  useEffect(() => {
    if (timeRemaining === 3 && isRunning && !isPaused) {
      if (user?.preferences?.voiceAnnouncements !== false) {
        Speech.speak('3, 2, 1', { rate: 0.8 });
      }
    }
  }, [timeRemaining, isRunning, isPaused, user?.preferences]);

  // ── 10-second warning (voice + haptic + sound) ─────────────────────────────

  useEffect(() => {
    if (timeRemaining === 10 && isRunning && !isPaused && !isPreparation) {
      if (user?.preferences?.voiceAnnouncements !== false) {
        Speech.speak('10 seconds', { rate: 0.9 });
      }
      playSoundEffect.warning();
    }
  }, [timeRemaining, isRunning, isPaused, isPreparation, user?.preferences]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleFirstStart = useCallback(() => {
    sessionActiveRef.current = true;
    if (!hasStartedOnce) {
      setAccumulatedXP((prev) => prev + 10);
      setHasStartedOnce(true);
    }
    timer.handleStart();
  }, [hasStartedOnce, timer.handleStart]);

  const handleCompleteEarly = useCallback(() => {
    Speech.stop();
    timer.handleCompleteEarly();
  }, [timer.handleCompleteEarly]);

  const handleExit = useCallback(() => {
    Alert.alert(
      'Exit Workout',
      'Are you sure you want to exit? Your progress will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Exit',
          style: 'destructive',
          onPress: () => { Speech.stop(); router.back(); },
        },
      ]
    );
  }, [router]);

  const handleLog = useCallback(
    (
      logDifficulty?: 'too_easy' | 'just_right' | 'too_hard' | null,
      logNotes?: string,
    ) => {
      if (!sessionResult || !user) return;

      const finalDifficulty = logDifficulty ?? difficultyRating;
      const finalNotes = logNotes ?? notes;
      const tier = prestige;
      const tierStats = TIER_COMBO_STATS[tier];

      if (sessionResult.newBadges.length > 0) {
        addEarnedBadges(sessionResult.newBadges.map((b) => b.id));
      }
      if (sessionResult.sessionTotal > 0) {
        addXP(sessionResult.sessionTotal);
      }

      const postLogStats = computePostLogStats(completedWorkouts, user);
      const segmentsForTracking = flatSegments.map((s) => ({
        combo: s.combo,
        name: s.name,
        segmentType: s.segmentType,
        duration: s.duration,
      }));
      const postL100 = computePostL100Increments(user as any, sessionResult.sessionTotal, segmentsForTracking);

      updateUser({
        workoutsCompleted: (user.workoutsCompleted || 0) + 1,
        currentStreak: postLogStats.currentStreak,
        longestStreak: postLogStats.longestStreak,
        lastWorkoutDate: postLogStats.lastWorkoutDate,
        totalTrainingSeconds: (user.totalTrainingSeconds || 0) + totalElapsed,
        ...postL100,
      } as any);

      updateBadgeStats({
        consecutiveDays: postLogStats.currentStreak,
        totalCombos: (badgeStats.totalCombos || 0) + PER_SESSION_ESTIMATES.combosLanded,
        complexCombos: (badgeStats.complexCombos || 0) + tierStats.complex,
        defenseCombos: (badgeStats.defenseCombos || 0) + tierStats.defense,
        counterCombos: (badgeStats.counterCombos || 0) + tierStats.counter,
        totalSessions: (user.workoutsCompleted || 0) + 1,
        totalHours: ((user.totalTrainingSeconds || 0) + totalElapsed) / 3600,
        singleSessionMinutes: totalElapsed / 60,
        totalPushups: (badgeStats.totalPushups || 0) + PER_SESSION_ESTIMATES.pushups,
        totalBurpees: (badgeStats.totalBurpees || 0) + PER_SESSION_ESTIMATES.burpees,
        totalCurlups: (badgeStats.totalCurlups || 0) + PER_SESSION_ESTIMATES.curlups,
        totalJogRunMinutes: (badgeStats.totalJogRunMinutes || 0) + PER_SESSION_ESTIMATES.jogRunMinutes,
      });

      addCompletedWorkout({
        id: generateId(),
        workoutId: workout?.id,
        workoutName: workout?.name || 'Workout',
        completedAt: new Date().toISOString(),
        duration: totalElapsed,
        xpEarned: sessionResult.sessionTotal,
        difficulty: finalDifficulty || undefined,
        notes: finalNotes || undefined,
        isManualEntry: false,
      });

      const prevLevel = getLevelFromXP(prestige, user.totalXP || 0);
      const newLevel = getLevelFromXP(prestige, (user.totalXP || 0) + sessionResult.sessionTotal);
      const prevUnlocked = new Set(checkGloveUnlocks(prestige, prevLevel, user.currentStreak || 0));
      const nowUnlocked = checkGloveUnlocks(prestige, newLevel, postLogStats.currentStreak);
      const brandNew = nowUnlocked.filter((gId) => !prevUnlocked.has(gId));
      if (brandNew.length > 0) {
        const gloveMap = new Map(Object.entries(GLOVES));
        const newGloves = brandNew.map((gId) => gloveMap.get(gId)).filter(Boolean) as Glove[];
        if (newGloves.length > 0) {
          setGloveUnlockOverlay(newGloves[0]);
          gloveUnlockQueue.current.push(...newGloves.slice(1));
        }
      }

      setLogged(true);
    },
    [sessionResult, user, workout, totalElapsed, difficultyRating, notes, prestige, badgeStats, completedWorkouts, flatSegments, addXP, updateUser, addEarnedBadges, updateBadgeStats, addCompletedWorkout]
  );

  // ── Early returns ──────────────────────────────────────────────────────────

  if (!workout) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.notFoundText}>Workout not found</Text>
        <TouchableOpacity style={styles.goHomeBtn} onPress={() => router.back()}>
          <Text style={styles.goHomeBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleLogFromSummary = (
    rating: 'too_easy' | 'just_right' | 'too_hard' | null,
    summaryNotes: string,
  ) => handleLog(rating, summaryNotes);

  if (isComplete) {
    if (!sessionResult) {
      return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <Text style={styles.calculatingText}>Calculating results...</Text>
        </View>
      );
    }

    return (
      <PostWorkoutSummary
        sessionResult={sessionResult}
        workoutName={workout.name}
        totalElapsed={totalElapsed}
        accentColor={accentColor}
        logged={logged}
        onLog={handleLogFromSummary}
        onGoHome={() => router.back()}
        onPrestige={() => { executePrestige(prestige); }}
        onDismissPrestige={() => {}}
        insets={insets}
      />
    );
  }

  // ── Active workout render ──────────────────────────────────────────────────

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity
            style={styles.topBarBtnPill}
            onPress={handleExit}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={16} color={colors.dark.foreground} />
            <Ionicons name="home-outline" size={16} color={colors.dark.foreground} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.topBarBtn}
            onPress={() => {
              Alert.alert('Restart Workout', 'Restart from the beginning?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Restart', onPress: () => timer.resetTimer() },
              ]);
            }}
          >
            <Ionicons name="refresh" size={16} color={colors.dark.foreground} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.topBarBtn} onPress={handleCompleteEarly}>
            <Ionicons name="checkmark-circle-outline" size={18} color={accentColor} />
          </TouchableOpacity>
        </View>
        <View style={styles.topBarRight}>
          <Text style={[styles.elapsedTime, { color: accentColor + '99' }]}>
            {formatTimeCompact(totalElapsed)}
          </Text>
          {(user?.currentStreak || 0) > 0 && (
            <View style={styles.streakPill}>
              <Ionicons name="flame" size={12} color={colors.dark.orange} />
              <Text style={styles.streakPillText}>
                {user?.currentStreak}d · {streakMultiplier}x
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Overlays */}
      {levelUpLevel !== null && (
        <LevelUpOverlay
          level={levelUpLevel}
          prestige={prestige}
          onDismiss={() => setLevelUpLevel(null)}
        />
      )}

      {latestBadgePop && (
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(300)}
          style={styles.badgePopContainer}
        >
          <View style={styles.badgePopPill}>
            <Ionicons name="trophy" size={14} color={colors.dark.amber} />
            <Text style={styles.badgePopName}>{latestBadgePop.badge.name}</Text>
            <Text style={styles.badgePopXP}>+{latestBadgePop.badge.xpReward.toLocaleString()} XP</Text>
          </View>
        </Animated.View>
      )}

      {liveBadgesEarned.length > 0 && !latestBadgePop && (
        <View style={styles.badgeTallyContainer}>
          <View style={styles.badgeTallyPill}>
            <Ionicons name="trophy" size={12} color={colors.dark.amber} />
            <Text style={styles.badgeTallyText}>
              {liveBadgesEarned.length} badge{liveBadgesEarned.length !== 1 ? 's' : ''} ·{' '}
              +{liveBadgesEarned.reduce((s, lb) => s + lb.badge.xpReward, 0).toLocaleString()} XP
            </Text>
          </View>
        </View>
      )}

      {comboXPPop && (
        <View style={styles.comboXPPopContainer}>
          <ComboXPPop pop={comboXPPop} />
        </View>
      )}

      {badgeOverlay && (
        <BadgeEarnOverlay
          badge={badgeOverlay}
          onComplete={() => {
            setBadgeOverlay(null);
            if (badgeOverlayQueue.current.length > 0) {
              setBadgeOverlay(badgeOverlayQueue.current.shift()!);
            }
          }}
        />
      )}

      {gloveUnlockOverlay && (
        <GloveUnlockOverlay
          glove={gloveUnlockOverlay}
          onComplete={() => {
            setGloveUnlockOverlay(null);
            if (gloveUnlockQueue.current.length > 0) {
              setGloveUnlockOverlay(gloveUnlockQueue.current.shift()!);
            }
          }}
        />
      )}

      {/* Main Content */}
      <View style={styles.mainContent}>
        {isPreparation ? (
          <Text style={styles.phaseLabel}>GET READY</Text>
        ) : isChampionship ? (
          <View style={styles.championshipLabel}>
            <Ionicons name="flash" size={14} color={colors.dark.yellow} />
            <Text style={[styles.phaseLabel, { color: colors.dark.yellow }]}>
              {currentSegment?.phaseName || 'CHAMPIONSHIP'}
            </Text>
            <Ionicons name="flash" size={14} color={colors.dark.yellow} />
          </View>
        ) : (
          <Text style={[styles.phaseLabel, isCooldown && { color: colors.dark.blue }]}>
            {currentSegment?.phaseName || 'WARMUP'}
          </Text>
        )}

        <ArcTimer
          arcProgressSV={arcProgressSV}
          accentColor={accentColor}
          timeRemaining={timeRemaining}
          prestige={prestige}
          liveLevel={liveLevel}
          userTotalXP={user?.totalXP || 0}
          accumulatedXP={accumulatedXP}
        />

        <View style={styles.segmentNameRow}>
          <View style={[styles.segmentLine, { backgroundColor: accentColor + '40' }]} />
          <Text
            style={[
              styles.segmentName,
              isChampionship && { color: colors.dark.yellow },
              isCooldown && { color: colors.dark.blue },
            ]}
          >
            {isPreparation ? 'PREPARATION' : currentSegment?.name || 'WORK'}
            {isChampionship && !isPreparation ? ' / 2XP' : ''}
          </Text>
          <View style={[styles.segmentLine, { backgroundColor: accentColor + '40' }]} />
        </View>

        <ComboDisplay
          isRestSegment={isRestSegment}
          currentSegment={currentSegment}
          nextSegment={nextSegment}
          displayCombo={displayCombo}
          isShadowboxing={isShadowboxing && !isRestSegment}
          accentColor={accentColor}
          roundFeedbacks={roundFeedbacks}
          onRoundFeedback={(round, rating) =>
            setRoundFeedbacks((prev) => ({ ...prev, [round]: rating }))
          }
        />
      </View>

      {/* Controls */}
      <WorkoutControls
        isPaused={isPaused}
        isPreparation={isPreparation}
        accentColor={accentColor}
        currentPhaseName={currentSegment?.phaseName || 'WARMUP'}
        nextSegmentName={isPreparation ? flatSegments[0]?.name : nextSegment?.name || 'FINISH'}
        progressPercent={progressPercent}
        currentSection={currentSegment?.section?.toUpperCase() || ''}
        currentSegmentNum={currentSegmentIndex + 1}
        totalSegments={totalSegments}
        onTogglePause={isPaused ? handleFirstStart : timer.togglePause}
        onSkipBack={handleBack}
        onSkipForward={skipSegment}
        onAdjustTime={adjustTime}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  notFoundText: {
    color: colors.dark.mutedForeground,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
  goHomeBtn: {
    marginTop: 16,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.dark.surface2,
    borderRadius: 12,
  },
  goHomeBtnText: {
    color: colors.dark.foreground,
    fontSize: 14,
    fontWeight: '600',
  },
  calculatingText: {
    color: colors.dark.mutedForeground,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  topBarLeft: {
    flexDirection: 'row',
    gap: 8,
  },
  topBarRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  topBarBtnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.dark.surface1,
    borderWidth: 1,
    borderColor: colors.dark.surface3,
  },
  topBarBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.dark.surface1,
    borderWidth: 1,
    borderColor: colors.dark.surface3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  elapsedTime: {
    fontSize: 20,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 140, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 0, 0.2)',
  },
  streakPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.dark.orange,
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  phaseLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.dark.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 8,
  },
  championshipLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  segmentNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    width: '100%',
    maxWidth: 320,
  },
  segmentLine: {
    flex: 1,
    height: 1,
  },
  segmentName: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.dark.foreground,
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
    flexShrink: 1,
  },
  badgePopContainer: {
    alignItems: 'center',
    paddingVertical: 4,
    zIndex: 20,
  },
  badgePopPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  badgePopName: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.dark.amber,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badgePopXP: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.dark.volt,
  },
  badgeTallyContainer: {
    alignItems: 'center',
    paddingVertical: 2,
  },
  badgeTallyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  badgeTallyText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.dark.amber,
  },
  comboXPPopContainer: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 60,
  },
});
