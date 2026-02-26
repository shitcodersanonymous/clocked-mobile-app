/**
 * useWorkoutTimer — Core timer mechanics for the workout session screen.
 *
 * Handles:
 *  - Flat segment computation (converts nested phases/repeats to a flat playback list)
 *  - Timer state: timeRemaining, currentSegmentIndex, totalElapsed, isRunning, isPaused,
 *    isPreparation, isComplete
 *  - Arc animation SharedValue
 *  - Timer tick interval (250ms, fires onXPTick callback each elapsed second)
 *  - Arc progress animation
 *  - AppState resume sync (re-anchors lastTickTime when app resumes from background)
 *  - Segment auto-advance (calls onComboSegmentComplete + onWorkoutComplete at boundaries)
 *  - Handlers: handleStart, togglePause, handleBack, skipSegment, handleCompleteEarly, adjustTime
 *
 * Usage:
 *   const timer = useWorkoutTimer({
 *     workout,
 *     onXPTick: (delta, seg) => setAccumulatedXP(p => p + getXPPerSecond(seg) * delta),
 *     onComboSegmentComplete: (seg) => showComboXPPop(seg),
 *     onWorkoutComplete: () => markWorkoutUsed(workout.id),
 *   });
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  AppState,
  AppStateStatus,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  useSharedValue,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { Workout, WorkoutPhase, WorkoutSegment } from '@/lib/types';

// ─── FlatSegment ──────────────────────────────────────────────────────────────

/** A single fully-resolved segment ready for playback, with phase/section context. */
export interface FlatSegment {
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeFlatSegments(workout: Workout): FlatSegment[] {
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
}

// ─── Arc constants (shared with ArcTimer component) ───────────────────────────

export const ARC_SIZE = 260;
export const ARC_GLOW_STROKE = 10;
export const ARC_STROKE_WIDTH = 5;
export const ARC_R = (ARC_SIZE - ARC_GLOW_STROKE) / 2 - 4;
export const ARC_C = 2 * Math.PI * ARC_R;
export const ARC_FRAC = 0.75;
export const ARC_LEN = ARC_C * ARC_FRAC;
export const ARC_START_OFFSET = -(ARC_C * (135 / 360));

// ─── Hook options ─────────────────────────────────────────────────────────────

export interface UseWorkoutTimerOptions {
  workout: Workout | null;
  onXPTick?: (delta: number, segment: FlatSegment) => void;
  onComboSegmentComplete?: (segment: FlatSegment) => void;
  onWorkoutComplete?: () => void;
}

// ─── Hook return value ────────────────────────────────────────────────────────

export interface UseWorkoutTimerReturn {
  flatSegments: FlatSegment[];
  timeRemaining: number;
  totalElapsed: number;
  currentSegmentIndex: number;
  currentSegment: FlatSegment | undefined;
  nextSegment: FlatSegment | undefined;
  isRunning: boolean;
  isPaused: boolean;
  isPreparation: boolean;
  isComplete: boolean;
  arcProgressSV: ReturnType<typeof useSharedValue<number>>;
  segmentProgress: number;
  overallProgress: number;
  handleStart: () => void;
  togglePause: () => void;
  handleBack: () => void;
  skipSegment: () => void;
  handleCompleteEarly: () => void;
  adjustTime: (delta: number) => void;
  resetTimer: () => void;
}

// ─── Hook implementation ──────────────────────────────────────────────────────

export function useWorkoutTimer({
  workout,
  onXPTick,
  onComboSegmentComplete,
  onWorkoutComplete,
}: UseWorkoutTimerOptions): UseWorkoutTimerReturn {
  const flatSegments = useMemo(
    () => (workout ? computeFlatSegments(workout) : []),
    [workout]
  );

  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(10);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [isPreparation, setIsPreparation] = useState(true);
  const [isComplete, setIsComplete] = useState(false);

  const lastTickTimeRef = useRef<number>(Date.now());
  const xpAwardedRef = useRef(false);
  const prevArcSegmentRef = useRef(-1);
  const arcProgressSV = useSharedValue(1);

  const currentSegment = flatSegments[currentSegmentIndex];
  const nextSegment = flatSegments[currentSegmentIndex + 1];
  const totalSegments = flatSegments.length;
  const segmentDur = isPreparation ? 10 : (currentSegment?.duration || 1);
  const segmentProgress = Math.min(1, Math.max(0, timeRemaining / segmentDur));
  const overallProgress = totalSegments > 0 ? (currentSegmentIndex / totalSegments) * 100 : 0;

  // ── Timer tick (250ms interval, fires onXPTick each elapsed second) ──────────
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

        if (!isPreparation && currentSegment && onXPTick) {
          onXPTick(delta, currentSegment);
        }
      }, 250);
    }

    return () => { if (interval) clearInterval(interval); };
  }, [isRunning, isPaused, isPreparation, currentSegment, onXPTick]);

  // ── Arc animation ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const progress = Math.min(1, Math.max(0, timeRemaining / segmentDur));

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
  }, [timeRemaining, currentSegmentIndex, isRunning, isPaused, segmentDur]);

  // ── AppState resume sync ─────────────────────────────────────────────────────
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active' && isRunning && !isPaused) {
        lastTickTimeRef.current = Date.now();
      }
    });
    return () => subscription.remove();
  }, [isRunning, isPaused]);

  // ── Segment auto-advance ──────────────────────────────────────────────────────
  useEffect(() => {
    if (timeRemaining <= 0 && isRunning) {
      if (isPreparation) {
        setIsPreparation(false);
        const firstDuration = flatSegments[0]?.duration || 60;
        setTimeRemaining(firstDuration + timeRemaining);
      } else if (currentSegmentIndex < flatSegments.length - 1) {
        const finishedSeg = flatSegments[currentSegmentIndex];
        if (finishedSeg && onComboSegmentComplete) {
          onComboSegmentComplete(finishedSeg);
        }
        const nextIdx = currentSegmentIndex + 1;
        const nextDuration = flatSegments[nextIdx]?.duration || 60;
        setCurrentSegmentIndex(nextIdx);
        setTimeRemaining(nextDuration + timeRemaining);
      } else if (!isComplete && !xpAwardedRef.current) {
        xpAwardedRef.current = true;
        setIsComplete(true);
        setIsRunning(false);
        if (onWorkoutComplete) onWorkoutComplete();
      }
    }
  }, [timeRemaining, isRunning, isPreparation, currentSegmentIndex, flatSegments, isComplete]);

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const handleStart = useCallback(() => {
    setIsRunning(true);
    setIsPaused(false);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  }, []);

  const togglePause = useCallback(() => {
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

  const skipSegment = useCallback(() => {
    if (isPreparation) {
      setIsPreparation(false);
      setTimeRemaining(flatSegments[0]?.duration || 60);
    } else if (currentSegmentIndex < flatSegments.length - 1) {
      setCurrentSegmentIndex(prev => prev + 1);
      setTimeRemaining(flatSegments[currentSegmentIndex + 1].duration);
    }
  }, [isPreparation, currentSegmentIndex, flatSegments]);

  const handleCompleteEarly = useCallback(() => {
    xpAwardedRef.current = true;
    setIsComplete(true);
    setIsRunning(false);
    if (onWorkoutComplete) onWorkoutComplete();
  }, [onWorkoutComplete]);

  const adjustTime = useCallback((delta: number) => {
    setTimeRemaining(prev => Math.max(0, prev + delta));
  }, []);

  const resetTimer = useCallback(() => {
    xpAwardedRef.current = false;
    prevArcSegmentRef.current = -1;
    setCurrentSegmentIndex(0);
    setTimeRemaining(10);
    setTotalElapsed(0);
    setIsRunning(false);
    setIsPaused(true);
    setIsPreparation(true);
    setIsComplete(false);
    arcProgressSV.value = 1;
  }, []);

  return {
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
    segmentProgress,
    overallProgress,
    handleStart,
    togglePause,
    handleBack,
    skipSegment,
    handleCompleteEarly,
    adjustTime,
    resetTimer,
  };
}
