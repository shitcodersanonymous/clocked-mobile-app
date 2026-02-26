/**
 * Sound Effects & Haptic Feedback System (Native — iOS/Android)
 * Uses expo-av for audio + expo-haptics for haptic feedback.
 */

import { useCallback } from 'react';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useUserStore } from '@/stores/userStore';

type SoundType = 'xp' | 'levelUp' | 'prestige' | 'warning';

const SOUND_ASSETS: Record<SoundType, any> = {
  xp: require('@/assets/sounds/xp-tick.wav'),
  levelUp: require('@/assets/sounds/level-up.wav'),
  prestige: require('@/assets/sounds/prestige.wav'),
  warning: require('@/assets/sounds/warning-beep.wav'),
};

const soundCache: Partial<Record<SoundType, Audio.Sound>> = {};
let audioConfigured = false;

async function ensureAudioConfigured(): Promise<void> {
  if (audioConfigured) return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
    audioConfigured = true;
  } catch (err) {
    console.warn('[SoundEffects] Failed to configure audio mode:', err);
  }
}

async function getSound(type: SoundType): Promise<Audio.Sound | null> {
  if (soundCache[type]) return soundCache[type]!;
  try {
    await ensureAudioConfigured();
    const { sound } = await Audio.Sound.createAsync(SOUND_ASSETS[type], {
      shouldPlay: false,
      volume: type === 'xp' ? 0.3 : type === 'warning' ? 0.5 : 0.7,
    });
    soundCache[type] = sound;
    return sound;
  } catch (err) {
    console.warn(`[SoundEffects] Failed to load sound "${type}":`, err);
    return null;
  }
}

async function triggerHaptic(type: SoundType): Promise<void> {
  try {
    switch (type) {
      case 'xp':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'levelUp':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'prestige':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), 200);
        setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), 400);
        break;
      case 'warning':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
    }
  } catch {}
}

let lastXPPlayTime = 0;
const XP_DEBOUNCE_MS = 100;

async function playSound(type: SoundType): Promise<void> {
  triggerHaptic(type);

  if (type === 'xp') {
    const now = Date.now();
    if (now - lastXPPlayTime < XP_DEBOUNCE_MS) return;
    lastXPPlayTime = now;
  }

  try {
    const sound = await getSound(type);
    if (!sound) return;
    await sound.setPositionAsync(0);
    await sound.playAsync();
  } catch (err) {
    console.warn(`[SoundEffects] Failed to play sound "${type}":`, err);
  }
}

export const playSoundEffect = {
  xp: () => { playSound('xp'); },
  levelUp: () => { playSound('levelUp'); },
  prestige: () => { playSound('prestige'); },
  warning: () => { playSound('warning'); },
};

export function useSoundEffects() {
  const soundEnabled = useUserStore(
    (state) => (state.user?.preferences as any)?.soundEnabled !== false
  );

  const playXP = useCallback(() => { if (soundEnabled) playSoundEffect.xp(); }, [soundEnabled]);
  const playLevelUp = useCallback(() => { if (soundEnabled) playSoundEffect.levelUp(); }, [soundEnabled]);
  const playPrestige = useCallback(() => { if (soundEnabled) playSoundEffect.prestige(); }, [soundEnabled]);
  const playWarning = useCallback(() => { if (soundEnabled) playSoundEffect.warning(); }, [soundEnabled]);

  return { playXP, playLevelUp, playPrestige, playWarning };
}
