/**
 * prestigeActions — Shared prestige-up logic used across the app.
 *
 * executePrestige() is the single authoritative prestige handler:
 *   1. Resolves the next prestige tier
 *   2. Updates the user profile (prestige, level=1, xp=0, experienceLevel)
 *   3. Removes old auto-generated loadout(s) that have the 'loadout' tag
 *      but NOT the 'downloaded' tag (downloaded = user explicitly saved it)
 *   4. Generates a new loadout for the next tier using the user's equipment
 *   5. Saves the new loadout to My Workouts with ['boxing', tier, 'loadout'] tags
 *
 * Called from:
 *   - app/(tabs)/profile.tsx — handlePrestige button
 *   - app/(tabs)/stats.tsx   — handlePrestige button
 *   - app/workout/[id].tsx   — onPrestige callback from PostWorkoutSummary
 */

import { useUserStore } from '@/stores/userStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import { generateLoadoutWorkout, UserEquipmentConfig } from '@/lib/loadoutGenerator';
import {
  Prestige,
  PRESTIGE_ORDER,
  getNextPrestige,
} from '@/lib/xpSystem';
import { Workout } from '@/lib/types';
import { generateId } from '@/lib/utils';

const DEFAULT_EQUIPMENT: UserEquipmentConfig = {
  gloves: true,
  wraps: true,
  jumpRope: false,
  heavyBag: false,
  doubleEndBag: false,
  speedBag: false,
  treadmill: false,
  primaryBag: 'none',
};

/**
 * Execute a prestige-up from the current tier.
 * Safe to call multiple times — no-ops if already at max tier.
 *
 * @param currentPrestige — the user's current prestige tier before advancing
 */
export function executePrestige(currentPrestige: Prestige): void {
  const nextTier = getNextPrestige(currentPrestige);
  if (!nextTier) return;

  const userStore = useUserStore.getState();
  const workoutStore = useWorkoutStore.getState();
  const user = userStore.user;

  userStore.updateUser({
    prestige: nextTier,
    currentLevel: 1,
    totalXP: 0,
    experienceLevel: nextTier as any,
  } as any);

  const workoutsToRemove = workoutStore.workouts.filter((w: Workout) => {
    const tags = w.tags || [];
    return tags.includes('loadout') && !tags.includes('downloaded');
  });
  workoutsToRemove.forEach((w: Workout) => workoutStore.deleteWorkout(w.id));

  const equipment = user?.equipment;
  const equipConfig: UserEquipmentConfig = equipment
    ? {
        gloves: equipment.gloves ?? false,
        wraps: equipment.wraps ?? false,
        jumpRope: equipment.jumpRope ?? false,
        heavyBag: equipment.heavyBag ?? false,
        doubleEndBag: equipment.doubleEndBag ?? false,
        speedBag: equipment.speedBag ?? false,
        treadmill: equipment.treadmill ?? false,
        primaryBag: equipment.primaryBag ?? 'none',
      }
    : DEFAULT_EQUIPMENT;

  const generated = generateLoadoutWorkout(nextTier, equipConfig);

  const newWorkout: Workout = {
    id: generateId(),
    name: generated.name,
    description: generated.description,
    difficulty: generated.difficulty as Workout['difficulty'],
    totalDuration: generated.duration,
    isPreset: false,
    isArchived: false,
    timesCompleted: 0,
    sections: {
      warmup: generated.phases.filter((p) => p.section === 'warmup'),
      grind: generated.phases.filter((p) => p.section === 'grind'),
      cooldown: generated.phases.filter((p) => p.section === 'cooldown'),
    },
    combos: generated.combos,
    tags: generated.tags,
  };

  workoutStore.addWorkout(newWorkout);
}
