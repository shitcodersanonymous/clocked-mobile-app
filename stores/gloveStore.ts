import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface GloveStore {
  equippedGlove: string;
  equipGlove: (gloveId: string) => void;
}

export const useGloveStore = create<GloveStore>()(
  persist(
    (set) => ({
      equippedGlove: 'default',

      equipGlove: (gloveId) => set({ equippedGlove: gloveId }),
    }),
    {
      name: 'get-clocked-gloves',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
