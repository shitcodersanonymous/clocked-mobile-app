/**
 * useTierPresets — Generates on-demand workout loadouts for every prestige tier
 * except the user's current one, for display on the Fight Club Presets tab.
 *
 * Each preset is built with generateLoadoutWorkout() using the user's actual
 * equipment config, so the generated workouts are always equipment-aware.
 *
 * Stable IDs (`tier-preset-${tier}`) prevent unnecessary list re-renders when
 * the user's prestige or equipment config hasn't changed.
 *
 * @returns { presets, userTier }
 *   presets  — array of TierPresetWorkout for all tiers except userTier, in PRESTIGE_ORDER
 *   userTier — the user's current Prestige tier
 */

import { useMemo } from 'react';
import { useUserStore } from '@/stores/userStore';
import { generateLoadoutWorkout, UserEquipmentConfig } from '@/lib/loadoutGenerator';
import { PRESTIGE_ORDER, Prestige } from '@/lib/xpSystem';
import { Workout } from '@/lib/types';

export interface TierPresetWorkout extends Workout {
  sourceTier: Prestige;
  tierLabel: string;
  tierDescription: string;
}

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

const TIER_DESCRIPTIONS: Record<Prestige, string> = {
  rookie: 'Foundation shadowboxing drills. Perfect for day-one fighters learning movement and basic punches.',
  beginner: 'Structured combo work with rest breaks. Builds punch sequences and ring awareness.',
  intermediate: 'Multi-round heavy bag and double-end drills. Sharpens speed, power, and conditioning.',
  advanced: 'Championship rounds with complex combos and defense. High-volume, high-intensity.',
  pro: 'Elite sparring-prep loadout. Maximum rounds, complex counters, and conditioning finishers.',
};

export function useTierPresets(): { presets: TierPresetWorkout[]; userTier: Prestige } {
  const user = useUserStore((s) => s.user);
  const userTier = (user?.prestige || 'beginner') as Prestige;
  const equipment = user?.equipment;

  const presets = useMemo((): TierPresetWorkout[] => {
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

    return PRESTIGE_ORDER
      .filter((tier) => tier !== userTier)
      .map((tier) => {
        const generated = generateLoadoutWorkout(tier, equipConfig);
        const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
        return {
          id: `tier-preset-${tier}`,
          name: generated.name,
          icon: 'fitness',
          difficulty: generated.difficulty as Workout['difficulty'],
          totalDuration: generated.duration,
          isPreset: true,
          isArchived: false,
          createdAt: new Date().toISOString(),
          timesCompleted: 0,
          sections: {
            warmup: generated.phases.filter((p) => p.section === 'warmup'),
            grind: generated.phases.filter((p) => p.section === 'grind'),
            cooldown: generated.phases.filter((p) => p.section === 'cooldown'),
          },
          combos: generated.combos,
          tags: generated.tags,
          sourceTier: tier,
          tierLabel,
          tierDescription: TIER_DESCRIPTIONS[tier],
        } as TierPresetWorkout;
      });
  }, [userTier, equipment]);

  return { presets, userTier };
}
