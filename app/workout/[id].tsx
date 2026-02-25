import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  Platform,
  AppState,
  AppStateStatus,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withSequence,
  withSpring,
  useSharedValue,
  runOnJS,
  cancelAnimation,
  Easing,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

const ARC_SIZE = 260;
const ARC_GLOW_STROKE = 10;
const ARC_STROKE_WIDTH = 5;
const ARC_R = (ARC_SIZE - ARC_GLOW_STROKE) / 2 - 4;
const ARC_C = 2 * Math.PI * ARC_R;
const ARC_FRAC = 0.75;
const ARC_LEN = ARC_C * ARC_FRAC;
const ARC_START_OFFSET = -(ARC_C * (135 / 360));
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
import colors from '@/constants/colors';
import { useWorkoutStore } from '@/stores/workoutStore';
import { useUserStore } from '@/stores/userStore';
import { useHistoryStore } from '@/stores/historyStore';
import { useBadgeStore } from '@/stores/badgeStore';
import { Workout, WorkoutPhase, WorkoutSegment, RoundFeedback, CompletedWorkout } from '@/lib/types';
import { formatTime, generateId } from '@/lib/utils';
import {
  ACTIVITY_XP_RATES,
  XPActivityType,
  getStreakMultiplier,
  getActivityTypeFromName,
  calculateComboXP,
  getLevelFromXP,
  Prestige,
  PRESTIGE_NAMES,
  getRankingFromLevel,
  RANKING_NAMES,
  getXPWithinCurrentLevel,
  PER_SESSION_ESTIMATES,
  TIER_COMBO_STATS,
  isPrestigeEligible,
  isMaxLevel,
  PRESTIGE_ORDER,
  calculateSessionXP,
  getLevelProgress,
} from '@/lib/xpSystem';
import { computePostLogStats, computePostL100Increments } from '@/lib/workoutTracking';
import { checkBadges, sumBadgeXP, BadgeStats, Badge } from '@/data/badges';
import { XPBar } from '@/components/ui/XPBar';
import { TimerXPBar } from '@/components/ui/TimerXPBar';
import { ComboXPPop } from '@/components/ui/ComboXPPop';
import { BadgeEarnOverlay } from '@/components/ui/BadgeEarnOverlay';
import { GloveUnlockOverlay } from '@/components/ui/GloveUnlockOverlay';
import { LevelUpOverlay } from '@/components/ui/LevelUpOverlay';
import PostWorkoutSummary from '@/components/workout/PostWorkoutSummary';
import { checkGloveUnlocks, Glove, GLOVES } from '@/data/gloves';

interface FlatSegment {
  id: string;
  name: string;
  type: 'active' | 'rest';
  segmentType?: string;
  duration: number;
  phaseName: string;
  section: 'warmup' | 'grind' | 'cooldown';
  combo?: string[];
  nextCombo?: string[];
  intensity?: string;
  reps?: number;
  repeatIndex?: number;
  megasetIndex?: number;
  cumulativeRound?: number;
}

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

function getDisplayMove(move: string): { display: string; type: 'punch' | 'defense' | 'movement' } {
  const m = move.toUpperCase();
  if (m === 'JAB' || m === '1') return { display: '1', type: 'punch' };
  if (m === 'CROSS' || m === 'STRAIGHT' || m === '2') return { display: '2', type: 'punch' };
  if (m === 'LEAD HOOK' || m === 'LEFT HOOK' || m === '3') return { display: '3', type: 'punch' };
  if (m === 'REAR HOOK' || m === 'RIGHT HOOK' || m === '4') return { display: '4', type: 'punch' };
  if (m === 'LEAD UPPERCUT' || m === 'LEFT UPPERCUT' || m === '5') return { display: '5', type: 'punch' };
  if (m === 'REAR UPPERCUT' || m === 'RIGHT UPPERCUT' || m === '6') return { display: '6', type: 'punch' };
  if (m === 'LEAD BODY HOOK' || m === 'LEFT BODY' || m === '7') return { display: '7', type: 'punch' };
  if (m === 'REAR BODY HOOK' || m === 'RIGHT BODY' || m === '8') return { display: '8', type: 'punch' };
  if (m.includes('SLIP L') || m === 'SL') return { display: 'SL', type: 'defense' };
  if (m.includes('SLIP R') || m === 'SR') return { display: 'SR', type: 'defense' };
  if (m.includes('ROLL L') || m === 'RL') return { display: 'RL', type: 'defense' };
  if (m.includes('ROLL R') || m === 'RR') return { display: 'RR', type: 'defense' };
  if (m === 'PULL' || m === 'PL') return { display: 'PL', type: 'defense' };
  if (m === 'BLOCK' || m === 'BK') return { display: 'BK', type: 'defense' };
  if (m.includes('CIRCLE L')) return { display: '\u21BA', type: 'movement' };
  if (m.includes('CIRCLE R')) return { display: '\u21BB', type: 'movement' };
  if (m.includes('STEP IN')) return { display: '\u2192', type: 'movement' };
  if (m.includes('STEP OUT')) return { display: '\u2190', type: 'movement' };
  if (['1','2','3','4','5','6','7','8'].includes(m)) return { display: m, type: 'punch' };
  return { display: move, type: 'punch' };
}

function getMoveColor(type: 'punch' | 'defense' | 'movement'): string {
  switch (type) {
    case 'punch': return colors.dark.volt;
    case 'defense': return colors.dark.blue;
    case 'movement': return colors.dark.orange;
  }
}

export default function WorkoutSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const workouts = useWorkoutStore((s) => s.workouts);
  const markWorkoutUsed = useWorkoutStore((s) => s.markWorkoutUsed);
  const user = useUserStore((s) => s.user);
  const addXP = useUserStore((s) => s.addXP);
  const updateUser = useUserStore((s) => s.updateUser);
  const incrementStreak = useUserStore((s) => s.incrementStreak);
  const addCompletedWorkout = useHistoryStore((s) => s.addCompletedWorkout);
  const completedWorkouts = useHistoryStore((s) => s.completedWorkouts);
  const earnedBadgeIds = useBadgeStore((s) => s.earnedBadgeIds);
  const addEarnedBadges = useBadgeStore((s) => s.addEarnedBadges);
  const updateBadgeStats = useBadgeStore((s) => s.updateBadgeStats);
  const badgeStats = useBadgeStore((s) => s.badgeStats);

  const workout = useMemo(() => workouts.find((w) => w.id === id) || null, [workouts, id]);

  const flatSegments = useMemo(() => {
    if (!workout) return [];
    const segments: FlatSegment[] = [];
    const megasetCount = workout.megasetRepeats || 1;

    const sectionOrder: { sectionName: 'warmup' | 'grind' | 'cooldown' }[] = [
      { sectionName: 'warmup' },
      ...Array.from({ length: megasetCount }, () => ({ sectionName: 'grind' as const })),
      { sectionName: 'cooldown' },
    ];

    const hasWarmup = workout.sections.warmup.length > 0;
    const hasCooldown = workout.sections.cooldown.length > 0;
    const hasGrind = workout.sections.grind.length > 0;

    const tempSegments: {
      segment: any;
      sectionName: 'warmup' | 'grind' | 'cooldown';
      phase: any;
      repeatIndex: number;
      megasetIndex?: number;
    }[] = [];

    let grindIterationIndex = 0;
    sectionOrder.forEach(({ sectionName }) => {
      const currentMegasetIndex = sectionName === 'grind' ? grindIterationIndex : undefined;
      const isFirstGrind = sectionName === 'grind' && grindIterationIndex === 0;
      if (sectionName === 'grind') grindIterationIndex++;
      const phases = workout.sections[sectionName];
      if (phases.length === 0) return;

      if (isFirstGrind && hasWarmup && hasGrind) {
        tempSegments.push({
          segment: { id: 'transition-get-ready', name: 'Get Ready', type: 'rest', segmentType: 'rest', duration: 30 },
          sectionName: 'grind',
          phase: { id: 'trans-gr', name: 'Get Ready', repeats: 1, segments: [], comboOrder: 'sequential' },
          repeatIndex: 0,
          megasetIndex: currentMegasetIndex,
        });
      }

      if (sectionName === 'cooldown' && hasGrind && hasCooldown) {
        tempSegments.push({
          segment: { id: 'transition-recovery', name: 'Recovery', type: 'rest', segmentType: 'rest', duration: 30 },
          sectionName: 'cooldown',
          phase: { id: 'trans-rec', name: 'Recovery', repeats: 1, segments: [], comboOrder: 'sequential' },
          repeatIndex: 0,
        });
      }

      phases.forEach((phase: WorkoutPhase) => {
        for (let r = 0; r < phase.repeats; r++) {
          phase.segments.forEach((segment: WorkoutSegment) => {
            tempSegments.push({ segment, sectionName, phase, repeatIndex: r, megasetIndex: currentMegasetIndex });
          });
        }
      });
    });

    const comboSegmentIndices: number[] = [];
    const shadowboxIndices: number[] = [];

    tempSegments.forEach((item, idx) => {
      const { segment, phase } = item;
      const isSpeedbag = segment.segmentType === 'speedbag';
      const isDoubleend = segment.segmentType === 'doubleend';
      if (isSpeedbag || isDoubleend) return;
      const isComboSegment = segment.segmentType === 'combo' || segment.comboIndex === 'cycle';
      const isShadowboxing = segment.segmentType === 'shadowboxing' ||
        segment.name.toLowerCase().includes('shadow') ||
        segment.name.toLowerCase().includes('technique');

      const isExplicitExercise = segment.segmentType === 'exercise' ||
        ['pushups','pushup','push-ups','burpees','burpee','curlups','curlup','curl-ups','sit-ups','situps',
         'jump rope','jog','jog in place','treadmill','high knees','plank'].some(
          (ex: string) => segment.name.toLowerCase().includes(ex)
        );

      const phaseCombos = phase.combos as string[][] | undefined;
      const phaseHasCombos = phaseCombos && phaseCombos.length > 0;
      const phaseHasComboSegments = phase.segments?.some((s: any) =>
        ['combo', 'shadowboxing', 'speedbag', 'doubleend'].includes(s.segmentType || '')
      );
      const isExerciseSegment = !isExplicitExercise && (
        segment.type === 'active' && segment.segmentType === 'work' && phaseHasCombos && !phaseHasComboSegments
      );

      if (isComboSegment || isExerciseSegment) comboSegmentIndices.push(idx);
      else if (isShadowboxing) shadowboxIndices.push(idx);
    });

    const totalCombos = workout.combos?.length || 0;
    const comboAssignments: Map<number, string[]> = new Map();

    const getComboListForPhase = (phase: any): string[][] => {
      const phaseCombos = phase.combos as string[][] | undefined;
      if (phaseCombos && phaseCombos.length > 0) {
        if (phase.comboOrder === 'random') {
          const shuffled = [...phaseCombos];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          return shuffled;
        }
        return phaseCombos;
      }
      if (!workout.combos || workout.combos.length === 0) return [];
      if (phase.comboOrder === 'random') {
        const shuffled = [...workout.combos];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
      }
      return workout.combos;
    };

    const phaseComboLists: Map<string, { list: string[][]; cursor: number }> = new Map();

    const getPhaseCombo = (phase: any, phaseKey: string): string[] | undefined => {
      if (totalCombos === 0 && !(phase.combos && phase.combos.length > 0)) return undefined;
      if (!phaseComboLists.has(phaseKey)) {
        phaseComboLists.set(phaseKey, { list: getComboListForPhase(phase), cursor: 0 });
      }
      const entry = phaseComboLists.get(phaseKey)!;
      if (entry.cursor >= entry.list.length) return undefined;
      return entry.list[entry.cursor++];
    };

    const allBoxingIndices = [...comboSegmentIndices, ...shadowboxIndices].sort((a, b) => a - b);
    const roundComboCache: Map<string, string[]> = new Map();

    for (const idx of allBoxingIndices) {
      const { phase, repeatIndex } = tempSegments[idx];
      const roundKey = `${phase.id}-${repeatIndex}`;
      if (roundComboCache.has(roundKey)) {
        comboAssignments.set(idx, roundComboCache.get(roundKey)!);
      } else {
        const phaseKey = `${phase.id}`;
        const combo = getPhaseCombo(phase, phaseKey);
        if (combo) {
          roundComboCache.set(roundKey, combo);
          comboAssignments.set(idx, combo);
        }
      }
    }

    let cumulativeRound = 0;
    let lastPhaseId = '';
    let lastRepeatIndex = -1;

    tempSegments.forEach((item, idx) => {
      const { segment, sectionName, phase, repeatIndex, megasetIndex } = item;
      if (sectionName === 'grind') {
        const phaseRepeatKey = `${phase.id}-${repeatIndex}`;
        if (phaseRepeatKey !== `${lastPhaseId}-${lastRepeatIndex}`) {
          cumulativeRound++;
          lastPhaseId = phase.id;
          lastRepeatIndex = repeatIndex;
        }
      }

      const combo = comboAssignments.get(idx);
      const isShadowboxing = segment.segmentType === 'shadowboxing' ||
        segment.name.toLowerCase().includes('shadow') ||
        segment.name.toLowerCase().includes('technique');
      let nextCombo: string[] | undefined;
      if (isShadowboxing && !combo) {
        const nextItem = tempSegments[idx + 1];
        if (nextItem) {
          const nextAssigned = comboAssignments.get(idx + 1);
          if (nextAssigned) nextCombo = nextAssigned;
        }
      }

      segments.push({
        id: `${segment.id}-${repeatIndex}-${idx}`,
        name: segment.name,
        type: segment.type,
        segmentType: segment.segmentType,
        duration: segment.duration,
        phaseName: phase.name,
        section: sectionName,
        combo,
        nextCombo,
        intensity: segment.intensity,
        reps: segment.reps,
        repeatIndex: phase.repeats > 1 ? repeatIndex + 1 : undefined,
        megasetIndex,
        cumulativeRound: sectionName === 'grind' ? cumulativeRound : undefined,
      });
    });

    return segments;
  }, [workout]);

  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(10);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [isPreparation, setIsPreparation] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const [notes, setNotes] = useState('');
  const [logged, setLogged] = useState(false);
  const [difficultyRating, setDifficultyRating] = useState<'too_easy' | 'just_right' | 'too_hard' | null>(null);
  const [hasStartedOnce, setHasStartedOnce] = useState(false);
  const [accumulatedXP, setAccumulatedXP] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [levelUpLevel, setLevelUpLevel] = useState<number | null>(null);
  const [sessionResult, setSessionResult] = useState<SessionXPBreakdown | null>(null);

  const liveBadgeIdsRef = useRef<Set<string>>(new Set());
  const [liveBadgesEarned, setLiveBadgesEarned] = useState<Array<{ badge: Badge; earnedAt: number }>>([]);
  const [latestBadgePop, setLatestBadgePop] = useState<{ badge: Badge; id: number } | null>(null);
  const [comboXPPop, setComboXPPop] = useState<{ amount: number; id: number; isChampionship?: boolean } | null>(null);
  const [badgeOverlay, setBadgeOverlay] = useState<Badge | null>(null);
  const [gloveUnlockOverlay, setGloveUnlockOverlay] = useState<Glove | null>(null);
  const badgeOverlayQueue = useRef<Badge[]>([]);
  const gloveUnlockQueue = useRef<Glove[]>([]);

  const lastTickTimeRef = useRef<number>(Date.now());
  const prevLevelRef = useRef<number | null>(null);
  const sessionActiveRef = useRef(false);
  const prevSegmentIndexRef = useRef<number>(-1);
  const xpAwardedRef = useRef(false);
  const arcProgressSV = useSharedValue(1);
  const prevArcSegmentRef = useRef(-1);

  const currentSegment = flatSegments[currentSegmentIndex];
  const nextSegment = flatSegments[currentSegmentIndex + 1];
  const totalSegments = flatSegments.length;
  const progressPercent = totalSegments > 0 ? (currentSegmentIndex / totalSegments) * 100 : 0;

  const isChampionship = !isPreparation && !!currentSegment &&
    currentSegment.phaseName.toLowerCase().includes('championship');
  const isCooldown = !isPreparation && (
    currentSegment?.section === 'cooldown' ||
    currentSegment?.phaseName?.toLowerCase() === 'cooldown'
  );

  const accentColor = isChampionship ? colors.dark.yellow : isCooldown ? colors.dark.blue : colors.dark.volt;

  const animatedGlowProps = useAnimatedProps(() => {
    const filled = ARC_LEN * arcProgressSV.value;
    return { strokeDasharray: [filled, ARC_C - filled] as unknown as string };
  });
  const animatedFillProps = useAnimatedProps(() => {
    const filled = ARC_LEN * arcProgressSV.value;
    return { strokeDasharray: [filled, ARC_C - filled] as unknown as string };
  });

  const prestige = (user?.prestige || 'beginner') as Prestige;
  const streakMultiplier = getStreakMultiplier(user?.currentStreak || 0);

  const isBoxingSegment = useCallback((segment: FlatSegment) => {
    const st = segment.segmentType;
    return st === 'shadowboxing' || st === 'combo' || st === 'doubleend';
  }, []);

  const getActivityTypeFromSegment = useCallback((segment: FlatSegment | undefined): XPActivityType => {
    if (!segment) return 'active';
    return getActivityTypeFromName(segment.name, segment.type === 'rest' ? 'rest' : segment.segmentType);
  }, []);

  const getXPPerSecond = useCallback((segment: FlatSegment) => {
    const activityType = getActivityTypeFromSegment(segment);
    let xpPerSecond = ACTIVITY_XP_RATES[activityType];

    if (activityType === 'combo' && segment.combo && segment.combo.length > 0) {
      const totalComboXP = calculateComboXP(segment.combo, segment.duration);
      xpPerSecond = totalComboXP / segment.duration;
    }

    if (segment.phaseName.toLowerCase().includes('championship') && isBoxingSegment(segment)) {
      xpPerSecond *= 2;
    }

    return xpPerSecond;
  }, [isBoxingSegment, getActivityTypeFromSegment]);

  const liveLevel = getLevelFromXP(prestige, (user?.totalXP || 0) + accumulatedXP);

  useEffect(() => {
    if (prevLevelRef.current === null) {
      prevLevelRef.current = liveLevel;
      return;
    }
    if (sessionActiveRef.current && accumulatedXP > 0 && liveLevel > prevLevelRef.current) {
      setLevelUpLevel(liveLevel);
    }
    prevLevelRef.current = liveLevel;
  }, [liveLevel, accumulatedXP]);

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
      if (lastDate === todayStr) {
        newStreak = user.currentStreak || 1;
      } else if (lastDate === yesterdayStr) {
        newStreak = (user.currentStreak || 0) + 1;
      } else {
        newStreak = 1;
      }

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

      if (newBadges.length > 0) {
        for (const badge of newBadges) {
          if (!liveBadgeIdsRef.current.has(badge.id)) {
            liveBadgeIdsRef.current.add(badge.id);
            setLiveBadgesEarned(prev => [...prev, { badge, earnedAt: Date.now() }]);
            setAccumulatedXP(prev => prev + badge.xpReward);

            const popId = Date.now();
            setLatestBadgePop({ badge, id: popId });
            setTimeout(() => setLatestBadgePop(prev => prev?.id === popId ? null : prev), 3000);
          }
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isComplete, isRunning, isPaused, user, totalElapsed, earnedBadgeIds, prestige, badgeStats]);

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
    if (lastDate === todayStr) {
      newStreak = user.currentStreak || 1;
    } else if (lastDate === yesterdayStr) {
      newStreak = (user.currentStreak || 0) + 1;
    } else {
      newStreak = 1;
      streakBroken = (user.currentStreak || 0) > 1;
    }

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

    const liveBadges = liveBadgesEarned.map(lb => lb.badge);
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

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (isRunning && !isPaused) {
      lastTickTimeRef.current = Date.now();

      interval = setInterval(() => {
        const now = Date.now();
        const delta = Math.floor((now - lastTickTimeRef.current) / 1000);
        if (delta < 1) return;
        lastTickTimeRef.current = now;

        setTotalElapsed(prev => prev + delta);
        setTimeRemaining(prev => prev - delta);

        if (!isPreparation && currentSegment) {
          const xpPerSecond = getXPPerSecond(currentSegment);
          const xpGained = xpPerSecond * streakMultiplier * delta;
          setAccumulatedXP(prev => prev + xpGained);
        }
      }, 250);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, isPaused, isPreparation, currentSegment, streakMultiplier, getXPPerSecond]);

  useEffect(() => {
    const segDur = isPreparation ? 10 : (currentSegment?.duration || 1);
    const progress = Math.min(1, Math.max(0, timeRemaining / segDur));

    if (currentSegmentIndex !== prevArcSegmentRef.current) {
      prevArcSegmentRef.current = currentSegmentIndex;
      cancelAnimation(arcProgressSV);
      arcProgressSV.value = 1;
      arcProgressSV.value = withTiming(progress, { duration: 800, easing: Easing.linear });
    } else if (isRunning && !isPaused) {
      arcProgressSV.value = withTiming(progress, { duration: 1050, easing: Easing.linear });
    } else {
      cancelAnimation(arcProgressSV);
      arcProgressSV.value = progress;
    }
  }, [timeRemaining, currentSegmentIndex, isRunning, isPaused, isPreparation, currentSegment]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active' && isRunning && !isPaused) {
        lastTickTimeRef.current = Date.now();
      }
    });
    return () => subscription.remove();
  }, [isRunning, isPaused]);

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

        const isBoxingType = currentSegment.segmentType === 'shadowboxing' ||
          currentSegment.segmentType === 'combo' ||
          currentSegment.segmentType === 'doubleend' ||
          currentSegment.segmentType === 'speedbag';
        const combo = currentSegment.combo;
        if (combo && combo.length > 0 && isBoxingType && user?.preferences?.voiceComboCallouts !== false) {
          setTimeout(() => {
            const speakableCombo = combo.map(move => {
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

  useEffect(() => {
    if (timeRemaining === 3 && isRunning && !isPaused) {
      if (user?.preferences?.voiceAnnouncements !== false) {
        Speech.speak('3, 2, 1', { rate: 0.8 });
      }
    }
  }, [timeRemaining, isRunning, isPaused, user?.preferences]);

  useEffect(() => {
    if (timeRemaining === 10 && isRunning && !isPaused && !isPreparation) {
      if (user?.preferences?.voiceAnnouncements !== false) {
        Speech.speak('10 seconds', { rate: 0.9 });
      }
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    }
  }, [timeRemaining, isRunning, isPaused, isPreparation, user?.preferences]);

  useEffect(() => {
    if (timeRemaining <= 0 && isRunning) {
      if (isPreparation) {
        setIsPreparation(false);
        const firstDuration = flatSegments[0]?.duration || 60;
        setTimeRemaining(firstDuration + timeRemaining);
      } else if (currentSegmentIndex < flatSegments.length - 1) {
        const finishedSeg = flatSegments[currentSegmentIndex];
        if (finishedSeg?.segmentType === 'combo' && finishedSeg.combo && finishedSeg.combo.length > 0) {
          const comboXP = calculateComboXP(finishedSeg.combo, finishedSeg.duration);
          const isChamp = finishedSeg.phaseName.toLowerCase().includes('championship');
          const finalXP = isChamp ? comboXP * 2 : comboXP;
          setComboXPPop({ amount: finalXP, id: Date.now(), isChampionship: isChamp });
          setTimeout(() => setComboXPPop(null), 1500);
        }
        const nextIdx = currentSegmentIndex + 1;
        const nextDuration = flatSegments[nextIdx]?.duration || 60;
        setCurrentSegmentIndex(nextIdx);
        setTimeRemaining(nextDuration + timeRemaining);
      } else if (!isComplete && !xpAwardedRef.current) {
        xpAwardedRef.current = true;
        Speech.stop();
        setIsComplete(true);
        setIsRunning(false);
        if (workout) {
          markWorkoutUsed(workout.id);
        }
      }
    }
  }, [timeRemaining, isRunning, isPreparation, currentSegmentIndex, flatSegments, workout, isComplete]);

  const handleStart = useCallback(() => {
    sessionActiveRef.current = true;
    setIsRunning(true);
    setIsPaused(false);
    if (!hasStartedOnce) {
      setAccumulatedXP(prev => prev + 10);
      setHasStartedOnce(true);
    }
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  }, [hasStartedOnce]);

  const handlePauseResume = useCallback(() => {
    setIsPaused(prev => !prev);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const handleBack = useCallback(() => {
    if (isPreparation) return;
    if (currentSegmentIndex > 0) {
      const prevSeg = flatSegments[currentSegmentIndex - 1];
      setCurrentSegmentIndex(prev => prev - 1);
      setTimeRemaining(prevSeg.duration);
    } else {
      setIsPreparation(true);
      setTimeRemaining(10);
    }
  }, [isPreparation, currentSegmentIndex, flatSegments]);

  const handleSkip = useCallback(() => {
    if (isPreparation) {
      setIsPreparation(false);
      setTimeRemaining(flatSegments[0]?.duration || 60);
    } else if (currentSegmentIndex < flatSegments.length - 1) {
      setCurrentSegmentIndex(prev => prev + 1);
      setTimeRemaining(flatSegments[currentSegmentIndex + 1].duration);
    }
  }, [isPreparation, currentSegmentIndex, flatSegments]);

  const handleCompleteEarly = useCallback(() => {
    Speech.stop();
    setIsComplete(true);
    setIsRunning(false);
    xpAwardedRef.current = true;
    if (workout) {
      markWorkoutUsed(workout.id);
    }
  }, [workout, markWorkoutUsed]);

  const handleExit = useCallback(() => {
    Alert.alert(
      'Exit Workout',
      'Are you sure you want to exit? Your progress will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Exit',
          style: 'destructive',
          onPress: () => {
            Speech.stop();
            router.back();
          },
        },
      ]
    );
  }, [router]);

  const handleLog = useCallback((
    logDifficulty?: 'too_easy' | 'just_right' | 'too_hard' | null,
    logNotes?: string,
  ) => {
    if (!sessionResult || !user) return;

    const finalDifficulty = logDifficulty ?? difficultyRating;
    const finalNotes = logNotes ?? notes;

    const tier = prestige;
    const tierStats = TIER_COMBO_STATS[tier];

    if (sessionResult.newBadges.length > 0) {
      addEarnedBadges(sessionResult.newBadges.map(b => b.id));
    }

    if (sessionResult.sessionTotal > 0) {
      addXP(sessionResult.sessionTotal);
    }

    const postLogStats = computePostLogStats(completedWorkouts, user);
    const segmentsForTracking = flatSegments.map(s => ({
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
    const brandNew = nowUnlocked.filter(id => !prevUnlocked.has(id));
    if (brandNew.length > 0) {
      const gloveMap = new Map(Object.entries(GLOVES));
      const newGloves = brandNew.map(id => gloveMap.get(id)).filter(Boolean) as Glove[];
      if (newGloves.length > 0) {
        setGloveUnlockOverlay(newGloves[0]);
        gloveUnlockQueue.current.push(...newGloves.slice(1));
      }
    }

    setLogged(true);
  }, [sessionResult, user, workout, totalElapsed, difficultyRating, notes, prestige, badgeStats, completedWorkouts, addXP, updateUser, addEarnedBadges, updateBadgeStats, addCompletedWorkout]);

  const adjustTime = useCallback((delta: number) => {
    setTimeRemaining(prev => Math.max(0, prev + delta));
  }, []);

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

  const handleLogFromSummary = useCallback((
    rating: 'too_easy' | 'just_right' | 'too_hard' | null,
    summaryNotes: string,
  ) => {
    handleLog(rating, summaryNotes);
  }, [handleLog]);

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
        onPrestige={() => {
          const nextPrestige = PRESTIGE_ORDER[PRESTIGE_ORDER.indexOf(prestige) + 1] as Prestige;
          if (nextPrestige) {
            updateUser({ prestige: nextPrestige, totalXP: 0, currentLevel: 1 } as any);
          }
        }}
        onDismissPrestige={() => {}}
        insets={insets}
      />
    );
  }

  const isShadowboxing = currentSegment?.segmentType === 'shadowboxing' ||
    currentSegment?.name.toLowerCase().includes('shadow') ||
    currentSegment?.name.toLowerCase().includes('technique');
  const isSpeedbag = currentSegment?.segmentType === 'speedbag';
  const isDoubleend = currentSegment?.segmentType === 'doubleend';
  const rawCombo = (isSpeedbag || isDoubleend) ? undefined : (isShadowboxing ? (currentSegment?.combo || currentSegment?.nextCombo) : currentSegment?.combo);
  const isFreestyleCombo = rawCombo?.length === 1 && rawCombo[0] === 'FREESTYLE';
  const displayCombo = isFreestyleCombo ? undefined : rawCombo;

  const isRestSegment = currentSegment?.type === 'rest' && !isPreparation;
  const nextSegmentUsesCombos = nextSegment?.type === 'active' &&
    (nextSegment?.segmentType === 'combo' || nextSegment?.segmentType === 'shadowboxing' ||
     nextSegment?.segmentType === 'speedbag' || nextSegment?.segmentType === 'doubleend');

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity style={styles.topBarBtnPill} onPress={handleExit} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={16} color={colors.dark.foreground} />
            <Ionicons name="home-outline" size={16} color={colors.dark.foreground} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.topBarBtn}
            onPress={() => {
              Alert.alert('Restart Workout', 'Restart from the beginning?', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Restart',
                  onPress: () => {
                    setCurrentSegmentIndex(-1);
                    setTimeRemaining(10);
                    setTotalElapsed(0);
                    setIsPaused(true);
                    setAccumulatedXP(0);
                  },
                },
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
                {user?.currentStreak}d \u00B7 {streakMultiplier}x
              </Text>
            </View>
          )}
        </View>
      </View>

      {levelUpLevel !== null && (
        <LevelUpOverlay
          level={levelUpLevel}
          prestige={prestige}
          onDismiss={() => setLevelUpLevel(null)}
        />
      )}

      {latestBadgePop && (
        <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(300)} style={styles.badgePopContainer}>
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
              {liveBadgesEarned.length} badge{liveBadgesEarned.length !== 1 ? 's' : ''} · +{liveBadgesEarned.reduce((s, lb) => s + lb.badge.xpReward, 0).toLocaleString()} XP
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

        <View style={styles.arcTimerArea}>
          <View style={styles.arcTimerContainer}>
            {(() => {
              const GAP_LEN = ARC_C - ARC_LEN;
              return (
                <Svg width={ARC_SIZE} height={ARC_SIZE} viewBox={`0 0 ${ARC_SIZE} ${ARC_SIZE}`}>
                  <Circle
                    cx={ARC_SIZE / 2}
                    cy={ARC_SIZE / 2}
                    r={ARC_R}
                    fill="none"
                    stroke={colors.dark.surface3}
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
              );
            })()}
            <View style={styles.arcTimerTextWrap}>
              <Text style={[styles.timerText, { color: accentColor }]}>
                {formatTime(Math.max(0, Math.floor(timeRemaining)))}
              </Text>
            </View>
          </View>
          <View style={styles.verticalXPBar}>
            <Text style={[styles.verticalXPLabel, { color: accentColor }]}>Lvl {liveLevel + 1}</Text>
            <View style={styles.verticalXPTrack}>
              <View
                style={[
                  styles.verticalXPFill,
                  {
                    height: `${Math.min(getLevelProgress(prestige, liveLevel, (user?.totalXP || 0) + accumulatedXP), 100)}%`,
                    backgroundColor: accentColor,
                  },
                ]}
              />
            </View>
            <Text style={[styles.verticalXPLabel, { color: accentColor }]}>Lvl {liveLevel}</Text>
          </View>
        </View>

        <View style={styles.segmentNameRow}>
          <View style={[styles.segmentLine, { backgroundColor: accentColor + '40' }]} />
          <Text style={[styles.segmentName, isChampionship && { color: colors.dark.yellow }, isCooldown && { color: colors.dark.blue }]}>
            {isPreparation ? 'PREPARATION' : (
              currentSegment?.name || 'WORK'
            )}
            {isChampionship && !isPreparation ? ' / 2XP' : ''}
          </Text>
          <View style={[styles.segmentLine, { backgroundColor: accentColor + '40' }]} />
        </View>

        <View style={styles.adjustRow}>
          {['-30', '-15', '+15', '+30'].map((val) => (
            <TouchableOpacity
              key={val}
              style={styles.adjustBtn}
              onPress={() => adjustTime(parseInt(val))}
            >
              <Text style={styles.adjustBtnText}>{val}s</Text>
            </TouchableOpacity>
          ))}
        </View>

        {isRestSegment && nextSegment && (
          <View style={[styles.comboCard, { borderColor: accentColor + '30' }]}>
            <Text style={[styles.comboCardLabel, { color: accentColor + '99' }]}>UP NEXT</Text>
            <Text style={[styles.comboCardTitle, { color: accentColor }]}>{nextSegment.name || 'FINISH'}</Text>
          </View>
        )}

        {!isPreparation && displayCombo && displayCombo.length > 0 && (
          <View style={styles.comboCard}>
            {isShadowboxing && (
              <Text style={[styles.comboCardLabel, { color: accentColor }]}>INCOMING COMBO</Text>
            )}
            <View style={styles.comboMoves}>
              {displayCombo.map((move, idx) => {
                const dm = getDisplayMove(move);
                return (
                  <View key={idx} style={styles.comboMoveRow}>
                    <View style={[styles.moveBadge, { borderColor: getMoveColor(dm.type) + '60' }]}>
                      <Text style={[styles.moveBadgeText, { color: getMoveColor(dm.type) }]}>
                        {dm.display}
                      </Text>
                    </View>
                    {idx < displayCombo.length - 1 && (
                      <Ionicons name="chevron-forward" size={12} color={colors.dark.mutedForeground} />
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {!isPreparation && !displayCombo && !isRestSegment && currentSegment?.type === 'active' &&
         (currentSegment?.segmentType === 'combo' || currentSegment?.segmentType === 'speedbag' || currentSegment?.segmentType === 'doubleend' || isShadowboxing) && (
          <View style={styles.comboCard}>
            <Text style={[styles.freestyleText, { color: accentColor }]}>FREESTYLE</Text>
          </View>
        )}
      </View>

      <View style={styles.bottomSection}>
        <View style={styles.progressInfo}>
          <Text style={styles.progressPhase}>
            {isPreparation ? 'PREP' : currentSegment?.phaseName || 'WARMUP'}
          </Text>
          <View style={styles.progressNext}>
            <View style={[styles.progressDot, { backgroundColor: accentColor }]} />
            <Text style={styles.progressNextText}>
              {isPreparation ? flatSegments[0]?.name : nextSegment?.name || 'FINISH'}
            </Text>
          </View>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%`, backgroundColor: accentColor }]} />
        </View>
        <View style={styles.progressMeta}>
          <Text style={styles.progressSection}>
            {isPreparation ? 'PREP' : currentSegment?.section?.toUpperCase()}
          </Text>
          <Text style={[styles.progressCount, { color: accentColor }]}>
            {isPreparation ? '0' : currentSegmentIndex + 1}/{totalSegments}
          </Text>
        </View>
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.controlBtn, isPreparation && styles.controlBtnDisabled]}
            onPress={handleBack}
            disabled={isPreparation}
          >
            <Ionicons name="play-skip-back" size={22} color={colors.dark.foreground} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.playBtn, { backgroundColor: accentColor }]}
            onPress={isPaused ? handleStart : handlePauseResume}
          >
            <Ionicons
              name={isPaused ? 'play' : 'pause'}
              size={32}
              color={colors.dark.background}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlBtn} onPress={handleSkip}>
            <Ionicons name="play-skip-forward" size={22} color={colors.dark.foreground} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

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
    fontWeight: '600' as const,
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
    fontWeight: '900' as const,
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
    fontWeight: '700' as const,
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
    fontWeight: '700' as const,
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
    fontWeight: '900' as const,
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
    fontWeight: '800' as const,
    letterSpacing: 0.5,
  },
  verticalXPTrack: {
    flex: 1,
    width: 6,
    backgroundColor: colors.dark.surface3,
    borderRadius: 3,
    marginVertical: 4,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  verticalXPFill: {
    width: '100%',
    borderRadius: 3,
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
    fontWeight: '900' as const,
    color: colors.dark.foreground,
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
    flexShrink: 1,
  },
  adjustRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
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
    fontWeight: '500' as const,
    color: colors.dark.mutedForeground,
  },
  comboCard: {
    width: '100%',
    maxWidth: 300,
    backgroundColor: colors.dark.surface1,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.dark.surface3,
    alignItems: 'center',
  },
  comboCardLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    textAlign: 'center',
  },
  comboCardTitle: {
    fontSize: 18,
    fontWeight: '900' as const,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  comboMoves: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  comboMoveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  moveBadge: {
    minWidth: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    backgroundColor: colors.dark.surface2,
  },
  moveBadgeText: {
    fontSize: 18,
    fontWeight: '900' as const,
  },
  freestyleText: {
    fontSize: 22,
    fontWeight: '900' as const,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  bottomSection: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressPhase: {
    fontSize: 12,
    fontWeight: '700' as const,
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
    fontWeight: '700' as const,
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
    fontWeight: '700' as const,
    color: colors.dark.amber,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badgePopXP: {
    fontSize: 11,
    fontWeight: '900' as const,
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
    fontWeight: '700' as const,
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
