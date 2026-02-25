/**
 * XP System — Core progression engine for the GetClocked boxing trainer.
 *
 * This module implements the full XP lifecycle: tier power curves, punch/defense/activity
 * XP values, combo scoring, streak multipliers, session XP calculation, and prestige promotion.
 *
 * @module xpSystem
 */

// ─── Prestige Promotion System (Document Section 10) ───────────────────────

/** Prestige tier identifier. Users progress through tiers by reaching L100. */
export type Prestige = 'rookie' | 'beginner' | 'intermediate' | 'advanced' | 'pro';

/** Ranking within a prestige tier, determined by level brackets of 10. */
export type Ranking =
  | 'prospect'
  | 'scrapper'
  | 'fighter'
  | 'warrior'
  | 'gladiator'
  | 'veteran'
  | 'phenom'
  | 'icon'
  | 'apex'
  | 'champion';

/** Human-readable display names for each prestige tier. */
export const PRESTIGE_NAMES: Record<Prestige, string> = {
  rookie: 'Rookie',
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  pro: 'Pro',
};

/** Human-readable display names for each ranking. */
export const RANKING_NAMES: Record<Ranking, string> = {
  prospect: 'Prospect',
  scrapper: 'Scrapper',
  fighter: 'Fighter',
  warrior: 'Warrior',
  gladiator: 'Gladiator',
  veteran: 'Veteran',
  phenom: 'Phenom',
  icon: 'Icon',
  apex: 'Apex',
  champion: 'Champion',
};

/** Ordered list of prestige tiers from lowest to highest. */
export const PRESTIGE_ORDER: Prestige[] = ['rookie', 'beginner', 'intermediate', 'advanced', 'pro'];

/** Ordered list of rankings from lowest to highest (each spans 10 levels). */
export const RANKING_ORDER: Ranking[] = [
  'prospect', 'scrapper', 'fighter', 'warrior', 'gladiator',
  'veteran', 'phenom', 'icon', 'apex', 'champion'
];

// ─── V1 Power Curves (Document Section 7) ──────────────────────────────────

/** Parameters for a tier's XP-per-level power curve: XP(L) = A * L^B. */
interface TierCurve {
  /** Scaling coefficient for the power curve. */
  A: number;
  /** Exponent for the power curve. */
  B: number;
  /** Total XP required to complete L1–L100 in this tier. */
  totalL100: number;
}

/**
 * Power curve parameters for each prestige tier.
 * Higher tiers require progressively more total XP to reach L100.
 */
const TIER_CURVES: Record<Prestige, TierCurve> = {
  rookie:       { A: 180.50, B: 0.1376, totalL100: 30_000 },
  beginner:     { A: 170.05, B: 0.3928, totalL100: 75_000 },
  intermediate: { A: 290.30, B: 0.4697, totalL100: 173_000 },
  advanced:     { A: 608.83, B: 0.4377, totalL100: 320_000 },
  pro:          { A: 986.19, B: 0.4285, totalL100: 500_000 },
};

/**
 * Returns the XP cost for a single level within a prestige tier.
 * Level 100 is computed as the residual so the tier sums to `totalL100`.
 * @param prestige - The user's current prestige tier.
 * @param level - The target level (1–100).
 * @returns XP required to complete that level.
 */
export function getXPRequiredForLevel(prestige: Prestige, level: number): number {
  const { A, B, totalL100 } = TIER_CURVES[prestige];
  if (level === 100) {
    let sum = 0;
    for (let l = 1; l <= 99; l++) {
      sum += Math.round(A * Math.pow(l, B));
    }
    return totalL100 - sum;
  }
  return Math.round(A * Math.pow(level, B));
}

/**
 * Returns the total XP needed to complete an entire prestige tier (L1–L100).
 * @param prestige - The prestige tier.
 * @returns Total XP for the tier.
 */
export function getTotalXPForPrestige(prestige: Prestige): number {
  return TIER_CURVES[prestige].totalL100;
}

/**
 * Computes cumulative XP from L1 through `endLevel` for a given tier.
 * @param prestige - The prestige tier.
 * @param endLevel - The level to sum up to (inclusive).
 * @returns Cumulative XP total.
 */
export function cumulativeXP(prestige: Prestige, endLevel: number): number {
  let total = 0;
  for (let l = 1; l <= endLevel; l++) {
    total += getXPRequiredForLevel(prestige, l);
  }
  return total;
}

/**
 * Determines the user's current level from their accumulated XP within a tier.
 * @param prestige - The prestige tier.
 * @param totalXP - Total XP accumulated in this tier.
 * @returns Current level (1–100).
 */
export function getLevelFromXP(prestige: Prestige, totalXP: number): number {
  let cumulative = 0;
  for (let level = 1; level <= 100; level++) {
    cumulative += getXPRequiredForLevel(prestige, level);
    if (totalXP < cumulative) return level;
  }
  return 100;
}

/**
 * Returns XP progress within the current level: how much earned and how much needed.
 * @param prestige - The prestige tier.
 * @param totalXP - Total XP accumulated in this tier.
 * @returns Object with `current` (XP earned in level) and `required` (XP needed to complete level).
 */
export function getXPWithinCurrentLevel(prestige: Prestige, totalXP: number): { current: number; required: number } {
  let cumulative = 0;
  for (let level = 1; level <= 100; level++) {
    const cost = getXPRequiredForLevel(prestige, level);
    if (totalXP < cumulative + cost) {
      return { current: totalXP - cumulative, required: cost };
    }
    cumulative += cost;
  }
  const lastCost = getXPRequiredForLevel(prestige, 100);
  return { current: lastCost, required: lastCost };
}

/**
 * Returns level progress as a percentage (0–100).
 * @param prestige - The prestige tier.
 * @param level - The current level.
 * @param totalXP - Total XP accumulated in this tier.
 * @returns Percentage progress through the current level.
 */
export function getLevelProgress(prestige: Prestige, level: number, totalXP: number): number {
  const { current, required } = getXPWithinCurrentLevel(prestige, totalXP);
  return Math.min(100, (current / required) * 100);
}

/**
 * Formats XP progress as a human-readable string, e.g. "1,200 / 3,000 XP".
 * @param prestige - The prestige tier.
 * @param level - The current level.
 * @param totalXP - Total XP accumulated in this tier.
 * @returns Formatted progress string.
 */
export function getXPProgressString(prestige: Prestige, level: number, totalXP: number): string {
  const { current, required } = getXPWithinCurrentLevel(prestige, totalXP);
  return `${Math.floor(current).toLocaleString()} / ${required.toLocaleString()} XP`;
}

/**
 * Maps a level (1–100) to its ranking bracket (each ranking spans 10 levels).
 * @param level - The user's current level.
 * @returns The ranking for that level.
 */
export function getRankingFromLevel(level: number): Ranking {
  const clamped = Math.max(1, Math.min(100, level));
  const idx = Math.floor((clamped - 1) / 10);
  return RANKING_ORDER[idx];
}

/**
 * Returns the level range (min–max) that a given ranking covers.
 * @param ranking - The ranking to query.
 * @returns Object with `min` and `max` levels.
 */
export function getLevelRangeForRanking(ranking: Ranking): { min: number; max: number } {
  const index = RANKING_ORDER.indexOf(ranking);
  return { min: index * 10 + 1, max: (index + 1) * 10 };
}

/**
 * Converts a user-facing experience level string to its corresponding prestige tier.
 * @param experienceLevel - The experience level string (e.g. 'complete_beginner', 'intermediate').
 * @returns The matching prestige tier, defaulting to 'rookie'.
 */
export function experienceLevelToPrestige(experienceLevel: string): Prestige {
  const mapping: Record<string, Prestige> = {
    'complete_beginner': 'rookie',
    'beginner': 'beginner',
    'intermediate': 'intermediate',
    'advanced': 'advanced',
    'pro': 'pro',
  };
  return mapping[experienceLevel] || 'rookie';
}

/** Snapshot of a user's full gamification state for display purposes. */
export interface UserGamificationStatus {
  prestige: Prestige;
  ranking: Ranking;
  level: number;
  xpInCurrentLevel: number;
  xpRequiredForNextLevel: number;
  levelProgress: number;
  displayString: string;
}

/**
 * Builds a complete gamification status snapshot for UI display.
 * @param prestige - The user's prestige tier.
 * @param level - The user's current level.
 * @param totalXP - Total XP accumulated in the current tier.
 * @returns Full gamification status object.
 */
export function getGamificationStatus(
  prestige: Prestige,
  level: number,
  totalXP: number
): UserGamificationStatus {
  const clamped = Math.max(1, Math.min(100, level));
  const ranking = getRankingFromLevel(clamped);
  const { current, required } = getXPWithinCurrentLevel(prestige, totalXP);

  return {
    prestige,
    ranking,
    level: clamped,
    xpInCurrentLevel: current,
    xpRequiredForNextLevel: required,
    levelProgress: Math.min(100, (current / required) * 100),
    displayString: `${PRESTIGE_NAMES[prestige]} - ${RANKING_NAMES[ranking]} - Level ${clamped}`,
  };
}

// ─── Punch XP Values (Document Section 2.1) ────────────────────────────────

/**
 * Base XP awarded per punch type in a combo.
 * Keys are punch numbers 1–8 (jab through rear body).
 */
export const PUNCH_XP_VALUES: Record<string, number> = {
  '1': 5.5,
  '2': 6.5,
  '3': 7.5,
  '4': 8.0,
  '5': 8.5,
  '6': 9.5,
  '7': 11.0,
  '8': 11.0,
};

// ─── Defense XP Values (Document Section 2.2) ──────────────────────────────

/**
 * Base XP awarded per defensive movement in a combo.
 * Keys are lowercase defense move names.
 */
export const DEFENSE_XP_VALUES: Record<string, number> = {
  'slip left': 4.5,
  'slip right': 4.5,
  'roll': 5.5,
  'pullback': 5.0,
  'circle left': 4.0,
  'circle right': 4.0,
};

const DEFENSE_KEYS = Object.keys(DEFENSE_XP_VALUES);

// ─── Exercise / Activity XP Rates (Document Section 2.3) ────────────────────

/** Activity types that earn time-based XP during workout segments. */
export type XPActivityType =
  | 'pushups' | 'burpees' | 'curlups'
  | 'jump_rope' | 'treadmill'
  | 'jog_in_place' | 'jog'
  | 'rest' | 'freestyle' | 'bag_freestyle' | 'bag_combo_bonus'
  | 'shadowboxing' | 'combo'
  | 'active';

export type ActivityType = XPActivityType;

/**
 * XP earned per second for each activity type.
 * Multiply by segment duration to get base XP for that segment.
 */
export const ACTIVITY_XP_RATES: Record<XPActivityType, number> = {
  pushups:         0.22,
  burpees:         0.28,
  curlups:         0.18,
  jump_rope:       0.25,
  treadmill:       0.20,
  jog_in_place:    0.15,
  jog:             0.15,
  rest:            0.00,
  freestyle:       0.35,
  bag_freestyle:   0.40,
  bag_combo_bonus: 0.20,
  shadowboxing:    0.35,
  combo:           0.00,
  active:          0.25,
};

// ─── Combo XP Formula (Document Section 2.4) ────────────────────────────────

/**
 * Returns the length bonus multiplier for combos based on total move count.
 * Longer combos earn proportionally more XP.
 * @param moveCount - Number of moves in the combo.
 * @returns Multiplier (1.0–1.35).
 */
export function getComboLengthMultiplier(moveCount: number): number {
  if (moveCount >= 6) return 1.35;
  if (moveCount >= 5) return 1.20;
  if (moveCount >= 4) return 1.10;
  return 1.0;
}

/**
 * Returns the defense bonus multiplier based on how many defensive moves are in the combo.
 * @param defenseCount - Number of defensive moves in the combo.
 * @returns Multiplier (1.0–1.45).
 */
export function getDefenseBonusMultiplier(defenseCount: number): number {
  if (defenseCount >= 3) return 1.45;
  if (defenseCount >= 2) return 1.30;
  if (defenseCount >= 1) return 1.15;
  return 1.0;
}

function classifyMove(move: string): { xp: number; isDefense: boolean } {
  const lower = move.toLowerCase().trim();

  if (PUNCH_XP_VALUES[lower]) {
    return { xp: PUNCH_XP_VALUES[lower], isDefense: false };
  }

  for (const key of DEFENSE_KEYS) {
    if (lower === key || lower.includes(key)) {
      return { xp: DEFENSE_XP_VALUES[key], isDefense: true };
    }
  }

  if (lower.startsWith('slip')) return { xp: 4.5, isDefense: true };
  if (lower.startsWith('roll')) return { xp: 5.5, isDefense: true };
  if (lower.startsWith('pull')) return { xp: 5.0, isDefense: true };
  if (lower.startsWith('circle')) return { xp: 4.0, isDefense: true };

  return { xp: 0, isDefense: false };
}

/**
 * Calculates total XP for a single combo considering move values, length bonus,
 * defense bonus, and duration scaling.
 * @param combo - Array of move tokens (e.g. ['1', '2', 'SLIP L', '3']).
 * @param durationSeconds - Duration the combo is practiced (default 30s).
 * @returns Total XP for the combo.
 */
export function calculateComboXP(combo: string[], durationSeconds: number = 30): number {
  if (!combo || combo.length === 0) return 0;

  let baseMoveSum = 0;
  let defenseCount = 0;

  for (const move of combo) {
    const { xp, isDefense } = classifyMove(move);
    baseMoveSum += xp;
    if (isDefense) defenseCount++;
  }

  const lengthBonus = getComboLengthMultiplier(combo.length);
  const defenseBonus = getDefenseBonusMultiplier(defenseCount);
  const durationFactor = durationSeconds / 30;

  return baseMoveSum * lengthBonus * defenseBonus * durationFactor;
}

/**
 * Classifies a combo's characteristics for UI badges and coach logic.
 * @param combo - Array of move tokens.
 * @returns Flags: isComplex (6+ moves), isDefense (2+ defense moves), isCounter (starts with defense).
 */
export function classifyCombo(combo: string[]): {
  isComplex: boolean;
  isDefense: boolean;
  isCounter: boolean;
} {
  if (!combo || combo.length === 0) return { isComplex: false, isDefense: false, isCounter: false };

  let defenseCount = 0;
  const firstIsDefense = classifyMove(combo[0]).isDefense;

  for (const move of combo) {
    if (classifyMove(move).isDefense) defenseCount++;
  }

  return {
    isComplex: combo.length >= 6,
    isDefense: defenseCount >= 2,
    isCounter: firstIsDefense,
  };
}

/**
 * Calculates XP for a time-based activity segment.
 * @param activityType - The type of activity being performed.
 * @param durationSeconds - Duration in seconds.
 * @returns XP earned for that activity.
 */
export function calculateActivityXP(activityType: XPActivityType, durationSeconds: number): number {
  return ACTIVITY_XP_RATES[activityType] * durationSeconds;
}

// ─── Championship Multiplier (Document Section 2.5) ─────────────────────────

/** XP multiplier applied to the last 2 rounds of a workout (championship rounds). */
export const CHAMPIONSHIP_MULTIPLIER = 2;

/**
 * Determines if a round qualifies as a championship round (last 2 rounds).
 * @param roundNumber - The current round number (1-indexed).
 * @param totalRounds - Total number of rounds in the workout.
 * @returns True if this is a championship round.
 */
export function isChampionshipRound(roundNumber: number, totalRounds: number): boolean {
  return roundNumber > totalRounds - 2;
}

// ─── Streak Multiplier System (Document Section 6) ──────────────────────────

/**
 * Returns the XP multiplier based on the user's consecutive workout day streak.
 * Higher streaks yield progressively larger bonuses up to 2.0x at 100+ days.
 * @param consecutiveDays - Number of consecutive days with a workout.
 * @returns Multiplier (1.0–2.0).
 */
export function getStreakMultiplier(consecutiveDays: number): number {
  if (consecutiveDays >= 100) return 2.0;
  if (consecutiveDays >= 60)  return 1.8;
  if (consecutiveDays >= 30)  return 1.6;
  if (consecutiveDays >= 14)  return 1.4;
  if (consecutiveDays >= 7)   return 1.25;
  if (consecutiveDays >= 3)   return 1.1;
  return 1.0;
}

/** Streak tier definitions for UI display showing multiplier brackets. */
export const STREAK_TIERS = [
  { min: 0,   max: 2,   multiplier: 1.0,  label: 'No Bonus' },
  { min: 3,   max: 6,   multiplier: 1.1,  label: '1.1x' },
  { min: 7,   max: 13,  multiplier: 1.25, label: '1.25x' },
  { min: 14,  max: 29,  multiplier: 1.4,  label: '1.4x' },
  { min: 30,  max: 59,  multiplier: 1.6,  label: '1.6x' },
  { min: 60,  max: 99,  multiplier: 1.8,  label: '1.8x' },
  { min: 100, max: 999, multiplier: 2.0,  label: '2.0x' },
];

// ─── Session XP Calculation Pipeline (Document Section 11.1) ────────────────

/** Result of the full session XP calculation pipeline. */
export interface SessionXPResult {
  baseXP: number;
  streakMultiplier: number;
  streakBonus: number;
  effectiveBase: number;
  badgeXP: number;
  sessionTotal: number;
}

/**
 * Runs the full session XP pipeline: applies streak multiplier and adds badge XP.
 * @param baseXP - Raw XP earned from combos and activities during the session.
 * @param streakDays - Current consecutive workout day streak.
 * @param badgeXP - Bonus XP from badges earned during the session.
 * @returns Detailed breakdown of session XP components.
 */
export function calculateSessionXP(
  baseXP: number,
  streakDays: number,
  badgeXP: number = 0
): SessionXPResult {
  const mult = getStreakMultiplier(streakDays);
  const streakBonus = Math.round(baseXP * (mult - 1));
  const effectiveBase = Math.round(baseXP * mult);

  return {
    baseXP: Math.round(baseXP),
    streakMultiplier: mult,
    streakBonus,
    effectiveBase,
    badgeXP,
    sessionTotal: effectiveBase + badgeXP,
  };
}

/** Result of checking whether an XP gain triggers a level-up or rank-up. */
export interface LevelUpResult {
  didLevelUp: boolean;
  newLevel: number;
  newRanking: Ranking;
  didRankUp: boolean;
  prestigeComplete: boolean;
}

/**
 * Checks if gaining XP causes a level-up, rank-up, or prestige completion.
 * @param prestige - The user's current prestige tier.
 * @param currentLevel - The user's level before XP gain.
 * @param currentXP - The user's total XP before gain.
 * @param xpGained - Amount of XP being added.
 * @returns Level-up result with new level, ranking, and prestige completion flag.
 */
export function checkLevelUp(
  prestige: Prestige,
  currentLevel: number,
  currentXP: number,
  xpGained: number
): LevelUpResult {
  const newTotalXP = currentXP + xpGained;
  const newLevel = getLevelFromXP(prestige, newTotalXP);
  const newRanking = getRankingFromLevel(newLevel);
  const oldRanking = getRankingFromLevel(currentLevel);

  return {
    didLevelUp: newLevel > currentLevel,
    newLevel,
    newRanking,
    didRankUp: newRanking !== oldRanking,
    prestigeComplete: newLevel >= 100,
  };
}

/**
 * Infers the XP activity type from a segment's name and optional segment type.
 * Used to determine XP rate for time-based segments.
 * @param name - The segment display name.
 * @param segmentType - Optional segment type hint.
 * @returns The inferred XP activity type.
 */
export function getActivityTypeFromName(name: string, segmentType?: string): XPActivityType {
  const lower = name.toLowerCase();

  if (segmentType === 'rest' || lower.includes('rest')) return 'rest';
  if (segmentType === 'combo' || lower.includes('combo')) return 'combo';
  if (segmentType === 'shadowboxing') return 'shadowboxing';

  if (lower.includes('shadow') || lower.includes('freestyle')) return 'freestyle';
  if (lower.includes('bag freestyle') || lower.includes('bag work')) return 'bag_freestyle';
  if (lower.includes('jump rope') || lower.includes('skipping')) return 'jump_rope';
  if (lower.includes('treadmill')) return 'treadmill';
  if (lower.includes('jog in place')) return 'jog_in_place';
  if (lower.includes('jog') || lower.includes('run')) return 'jog';
  if (lower.includes('pushup') || lower.includes('push-up') || lower.includes('push up')) return 'pushups';
  if (lower.includes('curlup') || lower.includes('curl-up') || lower.includes('curl up') || lower.includes('sit-up') || lower.includes('situp')) return 'curlups';
  if (lower.includes('burpee')) return 'burpees';

  return 'active';
}

// ─── Prestige Promotion System (Document Section 10) ────────────────────────

/**
 * Returns the total XP threshold for each prestige tier (L1–L100).
 * @returns Map of prestige to total XP required.
 */
export function getPrestigeThresholds(): Record<Prestige, number> {
  return {
    rookie: 30_000,
    beginner: 75_000,
    intermediate: 173_000,
    advanced: 320_000,
    pro: 500_000,
  };
}

/**
 * Returns the next prestige tier after the given one, or null if already at max (pro).
 * @param current - The user's current prestige tier.
 * @returns Next prestige tier or null.
 */
export function getNextPrestige(current: Prestige): Prestige | null {
  const idx = PRESTIGE_ORDER.indexOf(current);
  if (idx < 0 || idx >= PRESTIGE_ORDER.length - 1) return null;
  return PRESTIGE_ORDER[idx + 1];
}

/**
 * Checks if the user is eligible to prestige (at L100 and not already pro).
 * @param prestige - The user's current prestige tier.
 * @param totalXP - Total XP accumulated in the current tier.
 * @returns True if the user can prestige up.
 */
export function isPrestigeEligible(prestige: Prestige, totalXP: number): boolean {
  if (prestige === 'pro') return false;
  const level = getLevelFromXP(prestige, totalXP);
  return level >= 100;
}

/**
 * Checks if the user has reached the absolute maximum (Pro tier, L100).
 * @param prestige - The user's current prestige tier.
 * @param totalXP - Total XP accumulated.
 * @returns True if at the system ceiling.
 */
export function isMaxLevel(prestige: Prestige, totalXP: number): boolean {
  return prestige === 'pro' && getLevelFromXP(prestige, totalXP) >= 100;
}

/**
 * Describes what changes when the user prestiges: next tier info and new XP curve.
 * Returns null if the user is at the final tier (pro).
 * @param currentPrestige - The user's current prestige tier.
 * @returns Prestige change details or null.
 */
export function getPrestigeChanges(currentPrestige: Prestige): {
  nextTier: Prestige;
  nextTierName: string;
  currentTierName: string;
  newLevelCurve: TierCurve;
} | null {
  const next = getNextPrestige(currentPrestige);
  if (!next) return null;
  return {
    nextTier: next,
    nextTierName: PRESTIGE_NAMES[next],
    currentTierName: PRESTIGE_NAMES[currentPrestige],
    newLevelCurve: TIER_CURVES[next],
  };
}

// ─── Per-Session Cumulative Stats (Document Section 3.4) ────────────────────

/** Baseline per-session activity estimates used for XP projection calculations. */
export const PER_SESSION_ESTIMATES = {
  combosLanded: 150,
  pushups: 120,
  burpees: 15,
  curlups: 60,
  jogRunMinutes: 13,
  workoutDurationHours: 0.667,
};

/** Expected combo complexity stats per session by prestige tier (complex, defense, counter counts). */
export const TIER_COMBO_STATS: Record<Prestige, { complex: number; defense: number; counter: number }> = {
  rookie:       { complex: 0,   defense: 0,   counter: 0 },
  beginner:     { complex: 0,   defense: 75,  counter: 15 },
  intermediate: { complex: 30,  defense: 105, counter: 30 },
  advanced:     { complex: 120, defense: 120, counter: 45 },
  pro:          { complex: 150, defense: 150, counter: 75 },
};
