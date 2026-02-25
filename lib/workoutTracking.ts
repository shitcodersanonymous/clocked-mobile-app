import { Prestige, getLevelFromXP } from '@/lib/xpSystem';
import { CompletedWorkout, UserProfile, WorkoutSegment } from '@/lib/types';

export function computePostLogStats(
  completedWorkouts: CompletedWorkout[],
  profile: UserProfile
): {
  workouts_completed: number;
  current_streak: number;
  longest_streak: number;
  last_workout_date: string;
  total_training_seconds: number;
} {
  const workoutsCompleted = completedWorkouts.length;

  const totalTrainingSeconds = completedWorkouts.reduce(
    (sum, w) => sum + (w.duration || 0),
    0
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  let newStreak: number;
  const lastDate = profile.lastWorkoutDate ?? null;

  if (lastDate === todayStr) {
    newStreak = profile.currentStreak;
  } else if (lastDate === yesterdayStr) {
    newStreak = profile.currentStreak + 1;
  } else {
    newStreak = 1;
  }

  const longestStreak = Math.max(newStreak, profile.longestStreak);

  return {
    workouts_completed: workoutsCompleted,
    current_streak: newStreak,
    longest_streak: longestStreak,
    last_workout_date: todayStr,
    total_training_seconds: totalTrainingSeconds,
  };
}

export function getTimeOfDayStats(): { isMorning: boolean; isNight: boolean } {
  const hour = new Date().getHours();
  return {
    isMorning: hour >= 5 && hour < 10,
    isNight: hour >= 21 || hour < 5,
  };
}

export function getDayOfWeekStats(): {
  isWeekend: boolean;
  isWeekday: boolean;
  isMonday: boolean;
  isFriday: boolean;
} {
  const day = new Date().getDay();
  return {
    isWeekend: day === 0 || day === 6,
    isWeekday: day >= 1 && day <= 5,
    isMonday: day === 1,
    isFriday: day === 5,
  };
}

export function computePostL100Increments(
  prestige: Prestige,
  completedWorkouts: CompletedWorkout[],
  profile: UserProfile
): Record<string, number | boolean> {
  const increments: Record<string, number | boolean> = {};

  const { isMorning, isNight } = getTimeOfDayStats();
  if (isMorning) increments.morningWorkouts = (profile.morningWorkouts || 0) + 1;
  if (isNight) increments.nightWorkouts = (profile.nightWorkouts || 0) + 1;

  const dayStats = getDayOfWeekStats();
  if (dayStats.isWeekend) increments.weekendWorkouts = (profile.weekendWorkouts || 0) + 1;
  if (dayStats.isWeekday) increments.weekdayWorkouts = (profile.weekdayWorkouts || 0) + 1;

  const lastDate = profile.lastWorkoutDate ?? null;
  if (lastDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    if (lastDate === todayStr) {
      increments.doubleDays = (profile.doubleDays || 0) + 1;
    }
  }

  let punch1 = 0, punch2 = 0, punch3 = 0, punch4 = 0;
  let punch5 = 0, punch6 = 0, punch7 = 0, punch8 = 0;
  let slips = 0, rolls = 0, pullbacks = 0, circles = 0;

  const REP_MULTIPLIER = 5;

  increments.punch1Count = (profile.punch1Count || 0) + punch1 * REP_MULTIPLIER;
  increments.punch2Count = (profile.punch2Count || 0) + punch2 * REP_MULTIPLIER;
  increments.punch3Count = (profile.punch3Count || 0) + punch3 * REP_MULTIPLIER;
  increments.punch4Count = (profile.punch4Count || 0) + punch4 * REP_MULTIPLIER;
  increments.punch5Count = (profile.punch5Count || 0) + punch5 * REP_MULTIPLIER;
  increments.punch6Count = (profile.punch6Count || 0) + punch6 * REP_MULTIPLIER;
  increments.punch7Count = (profile.punch7Count || 0) + punch7 * REP_MULTIPLIER;
  increments.punch8Count = (profile.punch8Count || 0) + punch8 * REP_MULTIPLIER;
  increments.slipsCount = (profile.slipsCount || 0) + slips * REP_MULTIPLIER;
  increments.rollsCount = (profile.rollsCount || 0) + rolls * REP_MULTIPLIER;
  increments.pullbacksCount = (profile.pullbacksCount || 0) + pullbacks * REP_MULTIPLIER;
  increments.circlesCount = (profile.circlesCount || 0) + circles * REP_MULTIPLIER;

  return increments;
}
