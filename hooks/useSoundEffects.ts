import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

type SoundType = 'xp' | 'levelUp' | 'prestige' | 'warning';

async function triggerHaptic(type: SoundType): Promise<void> {
  if (Platform.OS === 'web') return;

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
        setTimeout(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
        }, 200);
        setTimeout(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
        }, 400);
        break;
      case 'warning':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
    }
  } catch {
  }
}

export const playSoundEffect = {
  xp: () => {
    triggerHaptic('xp');
  },
  levelUp: () => {
    triggerHaptic('levelUp');
  },
  prestige: () => {
    triggerHaptic('prestige');
  },
  warning: () => {
    triggerHaptic('warning');
  },
};

export function useSoundEffects() {
  const playXP = useCallback(() => {
    playSoundEffect.xp();
  }, []);

  const playLevelUp = useCallback(() => {
    playSoundEffect.levelUp();
  }, []);

  const playPrestige = useCallback(() => {
    playSoundEffect.prestige();
  }, []);

  const playWarning = useCallback(() => {
    playSoundEffect.warning();
  }, []);

  return {
    playXP,
    playLevelUp,
    playPrestige,
    playWarning,
  };
}
