import { getPresetsByTier, PresetCategory } from '@/data/presetComboLibrary';

export type ComboDifficulty = 'rookie' | 'beginner' | 'intermediate' | 'advanced' | 'pro';

export interface ComboPreset {
  id: string;
  name: string;
  combo: string[];
  difficulty: ComboDifficulty;
}

export const getAllPresets = (difficulty: ComboDifficulty): ComboPreset[] => {
  const { categories } = getPresetsByTier(difficulty);
  let idx = 0;
  return categories.flatMap(cat =>
    cat.combos.map(combo => ({
      id: `${difficulty}-${idx++}`,
      name: combo.join('-'),
      combo,
      difficulty,
    }))
  );
};

export const getPresetCategories = (difficulty: ComboDifficulty): PresetCategory[] => {
  return getPresetsByTier(difficulty).categories;
};

export const PUNCH_KEYS_BY_DIFFICULTY: Record<ComboDifficulty, string[]> = {
  rookie: ['1', '2', '3', '4', '5', '6'],
  beginner: ['1', '2', '3', '4', '5', '6'],
  intermediate: ['1', '2', '3', '4', '5', '6', '7', '8'],
  advanced: ['1', '2', '3', '4', '5', '6', '7', '8'],
  pro: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
};

export const DEFENSE_KEYS_BY_DIFFICULTY: Record<ComboDifficulty, string[]> = {
  rookie: [],
  beginner: ['SLIP L', 'SLIP R'],
  intermediate: ['SLIP L', 'SLIP R', 'ROLL L', 'ROLL R', 'PULL'],
  advanced: ['SLIP L', 'SLIP R', 'ROLL L', 'ROLL R', 'PULL'],
  pro: ['SLIP L', 'SLIP R', 'ROLL L', 'ROLL R', 'PULL'],
};

export const MOVEMENT_KEYS_BY_DIFFICULTY: Record<ComboDifficulty, string[]> = {
  rookie: [] as string[],
  beginner: [] as string[],
  intermediate: [] as string[],
  advanced: ['CIRCLE L', 'CIRCLE R'],
  pro: ['CIRCLE L', 'CIRCLE R'],
};
