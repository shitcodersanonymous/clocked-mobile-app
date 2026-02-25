import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BadgeStats } from '@/data/badges';

interface BadgeStore {
  earnedBadgeIds: string[];
  badgeStats: BadgeStats;
  addEarnedBadges: (ids: string[]) => void;
  updateBadgeStats: (updates: Partial<BadgeStats>) => void;
}

const defaultBadgeStats: BadgeStats = {
  consecutiveDays: 0,
  totalCombos: 0,
  complexCombos: 0,
  defenseCombos: 0,
  counterCombos: 0,
  totalSessions: 0,
  totalHours: 0,
  singleSessionMinutes: 0,
  totalPushups: 0,
  totalBurpees: 0,
  totalCurlups: 0,
  totalJogRunMinutes: 0,
};

export const useBadgeStore = create<BadgeStore>()(
  persist(
    (set) => ({
      earnedBadgeIds: [],
      badgeStats: defaultBadgeStats,

      addEarnedBadges: (ids) =>
        set((state) => ({
          earnedBadgeIds: [...new Set([...state.earnedBadgeIds, ...ids])],
        })),

      updateBadgeStats: (updates) =>
        set((state) => ({
          badgeStats: { ...state.badgeStats, ...updates },
        })),
    }),
    {
      name: 'get-clocked-badges',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
