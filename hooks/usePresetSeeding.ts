import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWorkoutStore } from '@/stores/workoutStore';
import { Workout } from '@/lib/types';

const SEEDING_FLAG = 'get-clocked-presets-seeded';

const STARTER_WORKOUTS: Workout[] = [
  {
    id: 'preset-basic-boxing-rounds',
    name: 'Basic Boxing Rounds',
    icon: 'boxing-glove',
    difficulty: 'rookie',
    totalDuration: 720,
    isPreset: true,
    isArchived: false,
    createdAt: new Date().toISOString(),
    timesCompleted: 0,
    tags: ['beginner', 'boxing'],
    sections: {
      warmup: [
        {
          id: 'warmup-phase-1',
          name: 'Warm Up',
          repeats: 1,
          section: 'warmup',
          segments: [
            {
              id: 'warmup-seg-1',
              name: 'Jump Rope / Jog in Place',
              type: 'active',
              segmentType: 'exercise',
              duration: 120,
              exercise: 'Jump rope or jog in place',
            },
          ],
        },
      ],
      grind: [
        {
          id: 'grind-phase-1',
          name: 'Boxing Rounds',
          repeats: 3,
          section: 'grind',
          segments: [
            {
              id: 'grind-seg-1',
              name: 'Bag Work',
              type: 'active',
              segmentType: 'combo',
              duration: 120,
              combo: ['1', '2'],
            },
            {
              id: 'grind-seg-2',
              name: 'Rest',
              type: 'rest',
              segmentType: 'rest',
              duration: 60,
            },
          ],
        },
      ],
      cooldown: [],
    },
    combos: [['1', '2'], ['1', '2', '3'], ['1', '1', '2']],
  },
  {
    id: 'preset-conditioning-circuit',
    name: 'Conditioning Circuit',
    icon: 'fire',
    difficulty: 'beginner',
    totalDuration: 900,
    isPreset: true,
    isArchived: false,
    createdAt: new Date().toISOString(),
    timesCompleted: 0,
    tags: ['conditioning', 'circuit'],
    sections: {
      warmup: [
        {
          id: 'cc-warmup-1',
          name: 'Warm Up',
          repeats: 1,
          section: 'warmup',
          segments: [
            {
              id: 'cc-warmup-seg-1',
              name: 'Jumping Jacks',
              type: 'active',
              segmentType: 'exercise',
              duration: 60,
              exercise: 'Jumping jacks',
            },
            {
              id: 'cc-warmup-seg-2',
              name: 'Arm Circles',
              type: 'active',
              segmentType: 'exercise',
              duration: 60,
              exercise: 'Arm circles',
            },
          ],
        },
      ],
      grind: [
        {
          id: 'cc-grind-1',
          name: 'Circuit',
          repeats: 3,
          section: 'grind',
          phaseType: 'circuit',
          segments: [
            {
              id: 'cc-grind-seg-1',
              name: 'Push-Ups',
              type: 'active',
              segmentType: 'exercise',
              duration: 45,
              exercise: 'Push-ups',
            },
            {
              id: 'cc-grind-seg-2',
              name: 'Rest',
              type: 'rest',
              segmentType: 'rest',
              duration: 15,
            },
            {
              id: 'cc-grind-seg-3',
              name: 'Squats',
              type: 'active',
              segmentType: 'exercise',
              duration: 45,
              exercise: 'Squats',
            },
            {
              id: 'cc-grind-seg-4',
              name: 'Rest',
              type: 'rest',
              segmentType: 'rest',
              duration: 15,
            },
            {
              id: 'cc-grind-seg-5',
              name: 'Burpees',
              type: 'active',
              segmentType: 'exercise',
              duration: 45,
              exercise: 'Burpees',
            },
            {
              id: 'cc-grind-seg-6',
              name: 'Rest',
              type: 'rest',
              segmentType: 'rest',
              duration: 30,
            },
          ],
        },
      ],
      cooldown: [
        {
          id: 'cc-cooldown-1',
          name: 'Cool Down',
          repeats: 1,
          section: 'cooldown',
          segments: [
            {
              id: 'cc-cooldown-seg-1',
              name: 'Stretch',
              type: 'active',
              segmentType: 'exercise',
              duration: 120,
              exercise: 'Full body stretch',
            },
          ],
        },
      ],
    },
  },
  {
    id: 'preset-shadowboxing-session',
    name: 'Shadowboxing Session',
    icon: 'person-outline',
    difficulty: 'rookie',
    totalDuration: 660,
    isPreset: true,
    isArchived: false,
    createdAt: new Date().toISOString(),
    timesCompleted: 0,
    tags: ['shadowboxing', 'technique'],
    sections: {
      warmup: [
        {
          id: 'sb-warmup-1',
          name: 'Loosen Up',
          repeats: 1,
          section: 'warmup',
          segments: [
            {
              id: 'sb-warmup-seg-1',
              name: 'Light Footwork',
              type: 'active',
              segmentType: 'exercise',
              duration: 60,
              exercise: 'Light footwork and bouncing',
            },
          ],
        },
      ],
      grind: [
        {
          id: 'sb-grind-1',
          name: 'Shadowboxing Rounds',
          repeats: 4,
          section: 'grind',
          segments: [
            {
              id: 'sb-grind-seg-1',
              name: 'Shadowbox',
              type: 'active',
              segmentType: 'shadowboxing',
              duration: 120,
            },
            {
              id: 'sb-grind-seg-2',
              name: 'Rest',
              type: 'rest',
              segmentType: 'rest',
              duration: 30,
            },
          ],
        },
      ],
      cooldown: [],
    },
  },
  {
    id: 'preset-quick-combo-drill',
    name: 'Quick Combo Drill',
    icon: 'flash',
    difficulty: 'beginner',
    totalDuration: 600,
    isPreset: true,
    isArchived: false,
    createdAt: new Date().toISOString(),
    timesCompleted: 0,
    tags: ['combos', 'drill'],
    sections: {
      warmup: [],
      grind: [
        {
          id: 'qcd-grind-1',
          name: 'Combo Rounds',
          repeats: 5,
          section: 'grind',
          comboOrder: 'sequential',
          combos: [
            ['1', '2'],
            ['1', '2', '3'],
            ['1', '2', '3', '2'],
            ['1', '1', '2'],
            ['1', '2', '5', '2'],
          ],
          segments: [
            {
              id: 'qcd-grind-seg-1',
              name: 'Combo Work',
              type: 'active',
              segmentType: 'combo',
              duration: 90,
              combo: ['1', '2'],
            },
            {
              id: 'qcd-grind-seg-2',
              name: 'Rest',
              type: 'rest',
              segmentType: 'rest',
              duration: 30,
            },
          ],
        },
      ],
      cooldown: [],
    },
    combos: [
      ['1', '2'],
      ['1', '2', '3'],
      ['1', '2', '3', '2'],
      ['1', '1', '2'],
      ['1', '2', '5', '2'],
    ],
  },
];

export function usePresetSeeding() {
  const hasRun = useRef(false);
  const addWorkout = useWorkoutStore((s) => s.addWorkout);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    (async () => {
      const alreadySeeded = await AsyncStorage.getItem(SEEDING_FLAG);
      if (alreadySeeded === 'true') return;

      const currentWorkouts = useWorkoutStore.getState().workouts;
      if (currentWorkouts.length > 0) {
        await AsyncStorage.setItem(SEEDING_FLAG, 'true');
        return;
      }

      for (const workout of STARTER_WORKOUTS) {
        addWorkout(workout);
      }

      await AsyncStorage.setItem(SEEDING_FLAG, 'true');
    })();
  }, [addWorkout]);
}
