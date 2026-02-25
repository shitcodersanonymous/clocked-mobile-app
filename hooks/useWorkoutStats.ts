import { useMemo } from 'react';
import {
  startOfWeek,
  subWeeks,
  isAfter,
  isBefore,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfYear,
} from 'date-fns';
import { useHistoryStore } from '@/stores/historyStore';
import { useUserStore } from '@/stores/userStore';
import { CompletedWorkout } from '@/lib/types';
import { Prestige, getStreakMultiplier } from '@/lib/xpSystem';

const MET_VALUES: Record<string, number> = {
  boxing: 7.8,
  hiit: 8.0,
  jump_rope: 12.3,
  shadowboxing: 5.5,
  conditioning: 6.0,
  default: 7.8,
};

const DEFAULT_WEIGHT_KG = 70;

type Period = 'daily' | 'weekly' | 'monthly' | 'all-time';

interface PeriodStats {
  workouts: number;
  totalDuration: number;
  totalXP: number;
  totalCalories: number;
  totalRounds: number;
  avgDuration: number;
  avgXP: number;
}

interface WeeklyComparison {
  hours: number;
  rounds: number;
  calories: number;
  intensity: number;
  workouts: number;
}

interface WorkoutStats {
  periodStats: Record<Period, PeriodStats>;
  weeklyComparison: WeeklyComparison;
  avgSessionDuration: number;
  xpPerSession: number;
  mostActiveDay: string | null;
  totalTrainingHours: number;
  totalRounds: number;
  totalCalories: number;
  avgIntensity: number;
  currentStreak: number;
  longestStreak: number;
  streakMultiplier: number;
  workoutsCompleted: number;
}

function estimateCalories(durationSeconds: number, weightKg: number, activityType?: string): number {
  const met = MET_VALUES[activityType || 'default'] || MET_VALUES.default;
  const hours = durationSeconds / 3600;
  return Math.round(met * weightKg * hours);
}

function countRounds(w: CompletedWorkout): number {
  if (w.roundFeedback && w.roundFeedback.length > 0) {
    return w.roundFeedback.length;
  }
  return Math.max(1, Math.round((w.duration || 0) / 180));
}

function filterByPeriod(workouts: CompletedWorkout[], period: Period): CompletedWorkout[] {
  if (period === 'all-time') return workouts;

  const now = new Date();
  let periodStart: Date;

  switch (period) {
    case 'daily':
      periodStart = startOfDay(now);
      break;
    case 'weekly':
      periodStart = startOfWeek(now, { weekStartsOn: 0 });
      break;
    case 'monthly':
      periodStart = startOfMonth(now);
      break;
    default:
      return workouts;
  }

  return workouts.filter((w) => {
    const d = parseISO(w.completedAt);
    return isAfter(d, periodStart) || d.getTime() === periodStart.getTime();
  });
}

function computePeriodStats(workouts: CompletedWorkout[], weightKg: number): PeriodStats {
  const totalDuration = workouts.reduce((sum, w) => sum + (w.duration || 0), 0);
  const totalXP = workouts.reduce((sum, w) => sum + (w.xpEarned || 0), 0);
  const totalCalories = workouts.reduce(
    (sum, w) => sum + estimateCalories(w.duration || 0, weightKg),
    0
  );
  const totalRounds = workouts.reduce((sum, w) => sum + countRounds(w), 0);
  const count = workouts.length;

  return {
    workouts: count,
    totalDuration,
    totalXP,
    totalCalories,
    totalRounds,
    avgDuration: count > 0 ? Math.round(totalDuration / count) : 0,
    avgXP: count > 0 ? Math.round(totalXP / count) : 0,
  };
}

function percentChange(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 100);
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function useWorkoutStats(): WorkoutStats {
  const completedWorkouts = useHistoryStore((s) => s.completedWorkouts);
  const user = useUserStore((s) => s.user);

  const weightKg = DEFAULT_WEIGHT_KG;
  const prestige: Prestige = (user?.prestige as Prestige) || 'beginner';
  const currentStreak = user?.currentStreak || 0;
  const longestStreak = user?.longestStreak || 0;

  const periodStats = useMemo(() => {
    const periods: Period[] = ['daily', 'weekly', 'monthly', 'all-time'];
    const result = {} as Record<Period, PeriodStats>;
    for (const period of periods) {
      const filtered = filterByPeriod(completedWorkouts, period);
      result[period] = computePeriodStats(filtered, weightKg);
    }
    return result;
  }, [completedWorkouts, weightKg]);

  const weeklyComparison = useMemo(() => {
    const now = new Date();
    const thisWeekStart = startOfWeek(now, { weekStartsOn: 0 });
    const lastWeekStart = subWeeks(thisWeekStart, 1);

    const thisWeek = completedWorkouts.filter((w) => {
      const d = parseISO(w.completedAt);
      return isAfter(d, thisWeekStart) || d.getTime() === thisWeekStart.getTime();
    });

    const lastWeek = completedWorkouts.filter((w) => {
      const d = parseISO(w.completedAt);
      return (
        (isAfter(d, lastWeekStart) || d.getTime() === lastWeekStart.getTime()) &&
        isBefore(d, thisWeekStart)
      );
    });

    const calcHours = (ws: CompletedWorkout[]) =>
      ws.reduce((sum, w) => sum + (w.duration || 0), 0) / 3600;

    const calcRounds = (ws: CompletedWorkout[]) =>
      ws.reduce((sum, w) => sum + countRounds(w), 0);

    const calcCalories = (ws: CompletedWorkout[]) =>
      ws.reduce((sum, w) => sum + estimateCalories(w.duration || 0, weightKg), 0);

    const difficultyMap: Record<string, number> = { too_easy: 2, just_right: 3, too_hard: 5 };
    const calcIntensity = (ws: CompletedWorkout[]) => {
      const rated = ws.filter((w) => w.difficulty);
      if (rated.length === 0) return 0;
      return rated.reduce((sum, w) => sum + (difficultyMap[w.difficulty!] || 3), 0) / rated.length;
    };

    return {
      hours: percentChange(calcHours(thisWeek), calcHours(lastWeek)),
      rounds: percentChange(calcRounds(thisWeek), calcRounds(lastWeek)),
      calories: percentChange(calcCalories(thisWeek), calcCalories(lastWeek)),
      intensity: percentChange(calcIntensity(thisWeek), calcIntensity(lastWeek)),
      workouts: percentChange(thisWeek.length, lastWeek.length),
    };
  }, [completedWorkouts, weightKg]);

  const avgSessionDuration = useMemo(() => {
    if (completedWorkouts.length === 0) return 0;
    const total = completedWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0);
    return Math.round(total / completedWorkouts.length);
  }, [completedWorkouts]);

  const xpPerSession = useMemo(() => {
    if (completedWorkouts.length === 0) return 0;
    const total = completedWorkouts.reduce((sum, w) => sum + (w.xpEarned || 0), 0);
    return Math.round(total / completedWorkouts.length);
  }, [completedWorkouts]);

  const mostActiveDay = useMemo(() => {
    if (completedWorkouts.length === 0) return null;
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    completedWorkouts.forEach((w) => {
      const d = parseISO(w.completedAt);
      dayCounts[d.getDay()]++;
    });
    const maxIdx = dayCounts.indexOf(Math.max(...dayCounts));
    return DAY_NAMES[maxIdx];
  }, [completedWorkouts]);

  const totalTrainingHours = useMemo(() => {
    const totalSeconds = completedWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0);
    return Math.round((totalSeconds / 3600) * 10) / 10;
  }, [completedWorkouts]);

  const totalRounds = useMemo(() => {
    return completedWorkouts.reduce((sum, w) => sum + countRounds(w), 0);
  }, [completedWorkouts]);

  const totalCalories = useMemo(() => {
    return completedWorkouts.reduce(
      (sum, w) => sum + estimateCalories(w.duration || 0, weightKg),
      0
    );
  }, [completedWorkouts, weightKg]);

  const avgIntensity = useMemo(() => {
    const difficultyMap: Record<string, number> = { too_easy: 2, just_right: 3, too_hard: 5 };
    const rated = completedWorkouts.filter((w) => w.difficulty);
    if (rated.length === 0) return 0;
    const total = rated.reduce((sum, w) => sum + (difficultyMap[w.difficulty!] || 3), 0);
    return Math.round((total / rated.length) * 10) / 10;
  }, [completedWorkouts]);

  const streakMultiplier = getStreakMultiplier(currentStreak);

  const workoutsCompleted = Math.max(user?.workoutsCompleted || 0, completedWorkouts.length);

  return {
    periodStats,
    weeklyComparison,
    avgSessionDuration,
    xpPerSession,
    mostActiveDay,
    totalTrainingHours,
    totalRounds,
    totalCalories,
    avgIntensity,
    currentStreak,
    longestStreak,
    streakMultiplier,
    workoutsCompleted,
  };
}
