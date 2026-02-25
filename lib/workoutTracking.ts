/**
 * Workout Tracking — Post-workout statistics and profile increment calculations.
 *
 * Handles streak computation, time-of-day classification, holiday detection,
 * comeback tracking, and per-session punch/defense counting for profile updates.
 *
 * @module workoutTracking
 */

import { Prestige, getLevelFromXP } from '@/lib/xpSystem';
import { CompletedWorkout, UserProfile, WorkoutSegment } from '@/lib/types';

/**
 * Computes updated streak and aggregate stats after logging a completed workout.
 * @param completedWorkouts - Full list of completed workouts (including the new one).
 * @param profile - The user's current profile state.
 * @returns Updated stats: workouts completed, streak info, last workout date, total training seconds.
 */
export function computePostLogStats(
  completedWorkouts: CompletedWorkout[],
  profile: UserProfile
): {
  workoutsCompleted: number;
  currentStreak: number;
  longestStreak: number;
  lastWorkoutDate: string;
  totalTrainingSeconds: number;
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
    workoutsCompleted,
    currentStreak: newStreak,
    longestStreak,
    lastWorkoutDate: todayStr,
    totalTrainingSeconds,
  };
}

/**
 * Classifies the current time of day for badge/stat tracking.
 * @returns Flags for morning (5–10am) and night (9pm–5am) windows.
 */
export function getTimeOfDayStats(): { isMorning: boolean; isNight: boolean } {
  const hour = new Date().getHours();
  return {
    isMorning: hour >= 5 && hour < 10,
    isNight: hour >= 21 || hour < 5,
  };
}

/**
 * Returns day-of-week classification flags for the current day.
 * @returns Flags for weekend, weekday, and specific days (Monday, Friday, Sunday).
 */
export function getDayOfWeekStats(): {
  isWeekend: boolean;
  isWeekday: boolean;
  isMonday: boolean;
  isFriday: boolean;
  isSunday: boolean;
} {
  const day = new Date().getDay();
  return {
    isWeekend: day === 0 || day === 6,
    isWeekday: day >= 1 && day <= 5,
    isMonday: day === 1,
    isFriday: day === 5,
    isSunday: day === 0,
  };
}

/**
 * Checks if the user already worked out today (double day).
 * @param lastWorkoutDate - ISO date string of the user's last workout, or null.
 * @returns True if the last workout was today.
 */
export function isDoubleDay(lastWorkoutDate: string | null): boolean {
  if (!lastWorkoutDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return lastWorkoutDate === today.toISOString().split('T')[0];
}

/**
 * Checks if today is a recognized holiday for special badge eligibility.
 * @returns Flags for New Year's Day and general holiday status.
 */
export function isHolidayWorkout(): { isNewYears: boolean; isHoliday: boolean } {
  const now = new Date();
  const month = now.getMonth();
  const day = now.getDate();

  const isNewYears = month === 0 && day === 1;

  const holidays = [
    [0, 1],
    [6, 4],
    [11, 25],
    [11, 31],
  ];

  const isHoliday = holidays.some(([m, d]) => month === m && day === d);

  return { isNewYears, isHoliday };
}

/**
 * Determines if this workout counts as a "comeback" (7+ days since last workout, no active streak).
 * @param lastWorkoutDate - ISO date string of the user's last workout, or null.
 * @param currentStreak - The user's current consecutive day streak.
 * @returns True if this qualifies as a comeback workout.
 */
export function isComeback(lastWorkoutDate: string | null, currentStreak: number): boolean {
  if (!lastWorkoutDate || currentStreak > 0) return false;
  const last = new Date(lastWorkoutDate);
  const now = new Date();
  const daysSince = Math.floor((now.getTime() - last.getTime()) / 86400000);
  return daysSince >= 7;
}

/**
 * Computes all profile field increments after a completed session.
 * Includes time-of-day stats, day-of-week stats, double-day detection, holiday checks,
 * comeback tracking, best session XP, post-L100 overflow, and per-punch/defense counts.
 * @param profile - The user's current profile as a record.
 * @param sessionXP - XP earned in the session.
 * @param flatSegments - Flattened array of workout segments with optional combo data.
 * @returns Record of profile fields to update/increment.
 */
export function computePostL100Increments(
  profile: Record<string, any>,
  sessionXP: number,
  flatSegments: Array<{ combo?: string[]; name: string; segmentType?: string; duration: number }>,
): Record<string, any> {
  const increments: Record<string, any> = {};

  const prestige = (profile.prestige || 'beginner') as Prestige;
  const currentLevel = profile.currentLevel || 1;
  const isAtL100 = currentLevel >= 100;

  const { isMorning, isNight } = getTimeOfDayStats();
  if (isMorning) increments.morningWorkouts = (profile.morningWorkouts || 0) + 1;
  if (isNight) increments.nightWorkouts = (profile.nightWorkouts || 0) + 1;

  const dayStats = getDayOfWeekStats();
  if (dayStats.isWeekend) increments.weekendWorkouts = (profile.weekendWorkouts || 0) + 1;
  if (dayStats.isWeekday) increments.weekdayWorkouts = (profile.weekdayWorkouts || 0) + 1;
  if (dayStats.isMonday) increments.mondayWorkouts = (profile.mondayWorkouts || 0) + 1;
  if (dayStats.isFriday) increments.fridayWorkouts = (profile.fridayWorkouts || 0) + 1;
  if (dayStats.isSunday) increments.sundayWorkouts = (profile.sundayWorkouts || 0) + 1;

  if (isDoubleDay(profile.lastWorkoutDate)) {
    increments.doubleDays = (profile.doubleDays || 0) + 1;
  }

  const { isNewYears, isHoliday } = isHolidayWorkout();
  if (isNewYears) increments.newYearsWorkout = true;
  if (isHoliday) increments.holidayWorkouts = (profile.holidayWorkouts || 0) + 1;

  if (isComeback(profile.lastWorkoutDate, profile.currentStreak || 0)) {
    increments.comebackCount = (profile.comebackCount || 0) + 1;
  }

  if (sessionXP > (profile.bestSessionXp || 0)) {
    increments.bestSessionXp = sessionXP;
  }

  if (isAtL100) {
    increments.postL100Sessions = (profile.postL100Sessions || 0) + 1;
    increments.overflowXp = (profile.overflowXp || 0) + sessionXP;
  }

  let punch1 = 0, punch2 = 0, punch3 = 0, punch4 = 0;
  let punch5 = 0, punch6 = 0, punch7 = 0, punch8 = 0;
  let slips = 0, rolls = 0, pullbacks = 0, circles = 0;

  for (const seg of flatSegments) {
    if (!seg.combo) continue;
    for (const move of seg.combo) {
      const m = move.toLowerCase().trim();
      if (m === '1') punch1++;
      else if (m === '2') punch2++;
      else if (m === '3') punch3++;
      else if (m === '4') punch4++;
      else if (m === '5') punch5++;
      else if (m === '6') punch6++;
      else if (m === '7') punch7++;
      else if (m === '8') punch8++;
      else if (m.startsWith('slip')) slips++;
      else if (m.startsWith('roll')) rolls++;
      else if (m.startsWith('pull')) pullbacks++;
      else if (m.startsWith('circle')) circles++;
    }
  }

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
