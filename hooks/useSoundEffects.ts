/**
 * Sound Effects & Haptic Feedback System (Web fallback — no-ops)
 * On iOS/Android, Metro uses useSoundEffects.native.ts instead.
 * On web, expo-av is not supported, so all sound calls are silently ignored.
 * Haptics are also unavailable on web.
 */

import { useCallback } from 'react';

export const playSoundEffect = {
  xp: () => {},
  levelUp: () => {},
  prestige: () => {},
  warning: () => {},
};

export function useSoundEffects() {
  const playXP = useCallback(() => {}, []);
  const playLevelUp = useCallback(() => {}, []);
  const playPrestige = useCallback(() => {}, []);
  const playWarning = useCallback(() => {}, []);

  return { playXP, playLevelUp, playPrestige, playWarning };
}
