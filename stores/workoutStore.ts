import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Workout } from '@/lib/types';

interface WorkoutStore {
  workouts: Workout[];
  archivedWorkouts: Workout[];
  addWorkout: (workout: Workout) => void;
  updateWorkout: (id: string, updates: Partial<Workout>) => void;
  deleteWorkout: (id: string) => void;
  archiveWorkout: (id: string) => void;
  restoreWorkout: (id: string) => void;
  permanentlyDeleteArchived: (id: string) => void;
  markWorkoutUsed: (id: string) => void;
  reorderWorkouts: (orderedIds: string[]) => void;
}

export const useWorkoutStore = create<WorkoutStore>()(
  persist(
    (set, get) => ({
      workouts: [],
      archivedWorkouts: [],

      addWorkout: (workout) =>
        set((state) => ({
          workouts: [workout, ...state.workouts],
        })),

      updateWorkout: (id, updates) =>
        set((state) => ({
          workouts: state.workouts.map((w) =>
            w.id === id ? { ...w, ...updates } : w
          ),
        })),

      deleteWorkout: (id) =>
        set((state) => ({
          workouts: state.workouts.filter((w) => w.id !== id),
        })),

      archiveWorkout: (id) =>
        set((state) => {
          const workout = state.workouts.find((w) => w.id === id);
          if (!workout) return state;
          return {
            workouts: state.workouts.filter((w) => w.id !== id),
            archivedWorkouts: [
              ...state.archivedWorkouts,
              { ...workout, isArchived: true },
            ],
          };
        }),

      restoreWorkout: (id) =>
        set((state) => {
          const workout = state.archivedWorkouts.find((w) => w.id === id);
          if (!workout) return state;
          return {
            archivedWorkouts: state.archivedWorkouts.filter((w) => w.id !== id),
            workouts: [...state.workouts, { ...workout, isArchived: false }],
          };
        }),

      permanentlyDeleteArchived: (id) =>
        set((state) => ({
          archivedWorkouts: state.archivedWorkouts.filter((w) => w.id !== id),
        })),

      markWorkoutUsed: (id) =>
        set((state) => ({
          workouts: state.workouts.map((w) =>
            w.id === id
              ? {
                  ...w,
                  lastUsed: new Date().toISOString(),
                  timesCompleted: w.timesCompleted + 1,
                }
              : w
          ),
        })),

      reorderWorkouts: (orderedIds) =>
        set((state) => {
          const workoutMap = new Map(state.workouts.map((w) => [w.id, w]));
          const reordered = orderedIds
            .map((id) => workoutMap.get(id))
            .filter(Boolean) as Workout[];
          const remaining = state.workouts.filter(
            (w) => !orderedIds.includes(w.id)
          );
          return { workouts: [...reordered, ...remaining] };
        }),
    }),
    {
      name: 'get-clocked-workouts',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
