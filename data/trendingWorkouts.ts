import { Workout } from '@/lib/types';

export interface TrendingWorkout extends Workout {
  author: string;
  authorHandle: string;
  rating: number;
  ratingCount: number;
  downloads: number;
  tags: string[];
}

export const WORKOUT_CATEGORIES = [
  'All', 'Boxing', 'HIIT', 'Conditioning',
  'Rookie', 'Beginner', 'Intermediate', 'Advanced', 'Pro', 'Cardio'
] as const;

export type WorkoutCategory = typeof WORKOUT_CATEGORIES[number];

/**
 * Curated trending workouts — "Staff Picks" for new users.
 * Provides day-one content in the Fight Club / Presets tab before
 * the community generates organic content.
 *
 * Covers 3 skill tiers, 3 workout types, 3 duration ranges.
 * Uses deterministic IDs to avoid regenerating on every module load.
 */
export const TRENDING_WORKOUTS: TrendingWorkout[] = [
  {
    id: 'trending-001',
    name: 'Jab-Cross Foundations',
    icon: 'fitness',
    difficulty: 'rookie' as any,
    totalDuration: 720,
    isPreset: true,
    isArchived: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    timesCompleted: 0,
    phases: [
      {
        id: 'trending-001-p1',
        name: 'Warm Up',
        repeats: 1,
        comboOrder: 'sequential',
        segments: [
          { id: 'trending-001-s1', name: 'Jump Rope', duration: 180, type: 'active', segmentType: 'work' },
          { id: 'trending-001-s2', name: 'Rest', duration: 30, type: 'rest', segmentType: 'rest' },
        ],
      },
      {
        id: 'trending-001-p2',
        name: 'Boxing Rounds',
        repeats: 4,
        comboOrder: 'sequential',
        segments: [
          { id: 'trending-001-s3', name: 'Shadowbox', duration: 120, type: 'active', segmentType: 'shadowboxing',
            combos: [['1', '2'], ['1', '1', '2'], ['1', '2', '1', '2']] },
          { id: 'trending-001-s4', name: 'Rest', duration: 60, type: 'rest', segmentType: 'rest' },
        ],
      },
    ],
    author: 'Get Clocked',
    authorHandle: '@getclocked',
    rating: 4.8,
    ratingCount: 245,
    downloads: 1820,
    tags: ['Boxing', 'Rookie', 'Shadowbox'],
  },
  {
    id: 'trending-002',
    name: '3-Punch Power Combos',
    icon: 'flash',
    difficulty: 'beginner' as any,
    totalDuration: 1500,
    isPreset: true,
    isArchived: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    timesCompleted: 0,
    phases: [
      {
        id: 'trending-002-p1',
        name: 'Warm Up',
        repeats: 1,
        comboOrder: 'sequential',
        segments: [
          { id: 'trending-002-s1', name: 'Arm Circles + Footwork', duration: 120, type: 'active', segmentType: 'work' },
        ],
      },
      {
        id: 'trending-002-p2',
        name: 'Combo Rounds',
        repeats: 6,
        comboOrder: 'sequential',
        segments: [
          { id: 'trending-002-s2', name: 'Heavy Bag', duration: 180, type: 'active', segmentType: 'work',
            combos: [['1', '2', '3'], ['1', '1', '2', '3'], ['2', '3', '2']] },
          { id: 'trending-002-s3', name: 'Rest', duration: 60, type: 'rest', segmentType: 'rest' },
        ],
      },
      {
        id: 'trending-002-p3',
        name: 'Cooldown',
        repeats: 1,
        comboOrder: 'sequential',
        segments: [
          { id: 'trending-002-s4', name: 'Shadow Stretch', duration: 120, type: 'active', segmentType: 'work' },
        ],
      },
    ],
    author: 'Coach Mike',
    authorHandle: '@coachmike',
    rating: 4.6,
    ratingCount: 189,
    downloads: 1340,
    tags: ['Boxing', 'Beginner', 'Heavy Bag'],
  },
  {
    id: 'trending-003',
    name: 'Southpaw Destroyer',
    icon: 'flash',
    difficulty: 'intermediate' as any,
    totalDuration: 2040,
    isPreset: true,
    isArchived: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    timesCompleted: 0,
    phases: [
      {
        id: 'trending-003-p1',
        name: 'Warm Up',
        repeats: 1,
        comboOrder: 'sequential',
        segments: [
          { id: 'trending-003-s1', name: 'Jump Rope', duration: 180, type: 'active', segmentType: 'work' },
          { id: 'trending-003-s2', name: 'Rest', duration: 30, type: 'rest', segmentType: 'rest' },
        ],
      },
      {
        id: 'trending-003-p2',
        name: 'Rounds',
        repeats: 8,
        comboOrder: 'random',
        segments: [
          { id: 'trending-003-s3', name: 'Bag Work', duration: 180, type: 'active', segmentType: 'work',
            combos: [
              ['1', '2', '3', '2'],
              ['1', '2', '5', '6'],
              ['1', '6', '3', '2'],
              ['5', '2', '3', '6', '2'],
            ] },
          { id: 'trending-003-s4', name: 'Rest', duration: 60, type: 'rest', segmentType: 'rest' },
        ],
      },
    ],
    author: 'KO Queen',
    authorHandle: '@koqueen',
    rating: 4.9,
    ratingCount: 312,
    downloads: 2450,
    tags: ['Boxing', 'Intermediate', 'Heavy Bag'],
  },
  {
    id: 'trending-004',
    name: 'Body Shot Blitz',
    icon: 'flash',
    difficulty: 'advanced' as any,
    totalDuration: 1620,
    isPreset: true,
    isArchived: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    timesCompleted: 0,
    phases: [
      {
        id: 'trending-004-p1',
        name: 'Warm Up',
        repeats: 1,
        comboOrder: 'sequential',
        segments: [
          { id: 'trending-004-s1', name: 'Shadowbox Light', duration: 180, type: 'active', segmentType: 'work' },
        ],
      },
      {
        id: 'trending-004-p2',
        name: 'Body Rounds',
        repeats: 6,
        comboOrder: 'random',
        segments: [
          { id: 'trending-004-s2', name: 'Heavy Bag', duration: 180, type: 'active', segmentType: 'work',
            combos: [
              ['1', '2', '7', '8'],
              ['7', '8', '3', '2'],
              ['1', '7', '2', '8'],
              ['1', '2', '7', '8', '2'],
            ] },
          { id: 'trending-004-s3', name: 'Active Rest', duration: 45, type: 'rest', segmentType: 'rest' },
        ],
      },
    ],
    author: 'Iron Fist Boxing',
    authorHandle: '@ironfistboxing',
    rating: 4.7,
    ratingCount: 276,
    downloads: 1980,
    tags: ['Boxing', 'Advanced', 'Heavy Bag', 'Body Work'],
  },
  {
    id: 'trending-005',
    name: 'Quick HIIT Burn (15 min)',
    icon: 'flame',
    difficulty: 'beginner' as any,
    totalDuration: 900,
    isPreset: true,
    isArchived: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    timesCompleted: 0,
    phases: [
      {
        id: 'trending-005-p1',
        name: 'HIIT Circuit',
        repeats: 5,
        comboOrder: 'sequential',
        segments: [
          { id: 'trending-005-s1', name: 'Burpees', duration: 30, type: 'active', segmentType: 'work' },
          { id: 'trending-005-s2', name: 'Shadow Combos', duration: 30, type: 'active', segmentType: 'shadowboxing',
            combos: [['1', '2'], ['1', '2', '3']] },
          { id: 'trending-005-s3', name: 'Mountain Climbers', duration: 30, type: 'active', segmentType: 'work' },
          { id: 'trending-005-s4', name: 'Rest', duration: 30, type: 'rest', segmentType: 'rest' },
        ],
      },
    ],
    author: 'Get Clocked',
    authorHandle: '@getclocked',
    rating: 4.5,
    ratingCount: 198,
    downloads: 3200,
    tags: ['HIIT', 'Conditioning', 'Beginner', 'Quick'],
  },
  {
    id: 'trending-006',
    name: 'Defensive Flow',
    icon: 'shield',
    difficulty: 'intermediate' as any,
    totalDuration: 1440,
    isPreset: true,
    isArchived: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    timesCompleted: 0,
    phases: [
      {
        id: 'trending-006-p1',
        name: 'Warm Up',
        repeats: 1,
        comboOrder: 'sequential',
        segments: [
          { id: 'trending-006-s1', name: 'Footwork Drills', duration: 120, type: 'active', segmentType: 'work' },
        ],
      },
      {
        id: 'trending-006-p2',
        name: 'Defense Rounds',
        repeats: 6,
        comboOrder: 'random',
        segments: [
          { id: 'trending-006-s2', name: 'Shadowbox', duration: 180, type: 'active', segmentType: 'shadowboxing',
            combos: [
              ['1', '2', 'slip', '3'],
              ['1', 'slip', '2', 'roll'],
              ['1', '2', 'roll', '1', '2'],
              ['slip', '1', '2', 'slip', '3', '2'],
            ] },
          { id: 'trending-006-s3', name: 'Rest', duration: 60, type: 'rest', segmentType: 'rest' },
        ],
      },
    ],
    author: 'Sweet Science Lab',
    authorHandle: '@sweetsciencelab',
    rating: 4.8,
    ratingCount: 221,
    downloads: 1650,
    tags: ['Boxing', 'Intermediate', 'Defense', 'Shadowbox'],
  },
  {
    id: 'trending-007',
    name: 'Pro Championship Rounds',
    icon: 'trophy',
    difficulty: 'pro' as any,
    totalDuration: 3240,
    isPreset: true,
    isArchived: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    timesCompleted: 0,
    phases: [
      {
        id: 'trending-007-p1',
        name: 'Warm Up',
        repeats: 1,
        comboOrder: 'sequential',
        segments: [
          { id: 'trending-007-s1', name: 'Jump Rope', duration: 180, type: 'active', segmentType: 'work' },
          { id: 'trending-007-s2', name: 'Shadowbox Light', duration: 180, type: 'active', segmentType: 'work' },
          { id: 'trending-007-s3', name: 'Rest', duration: 60, type: 'rest', segmentType: 'rest' },
        ],
      },
      {
        id: 'trending-007-p2',
        name: 'Championship Rounds',
        repeats: 12,
        comboOrder: 'random',
        segments: [
          { id: 'trending-007-s4', name: 'Heavy Bag', duration: 180, type: 'active', segmentType: 'work',
            combos: [
              ['1', '2', '3', '2', '1'],
              ['1', '2', '5', '6', '3'],
              ['1', '2', 'slip', '3', '2', '7', '8'],
              ['6', '5', '2', '3', '2'],
              ['1', '2', '3', 'roll', '2', '3'],
              ['1', '2', '7', '8', 'slip', '2', '3'],
            ] },
          { id: 'trending-007-s5', name: 'Rest', duration: 60, type: 'rest', segmentType: 'rest' },
        ],
      },
      {
        id: 'trending-007-p3',
        name: 'Cooldown',
        repeats: 1,
        comboOrder: 'sequential',
        segments: [
          { id: 'trending-007-s6', name: 'Shadow Stretch', duration: 180, type: 'active', segmentType: 'work' },
        ],
      },
    ],
    author: 'Undisputed Athletics',
    authorHandle: '@undisputedathletics',
    rating: 4.9,
    ratingCount: 410,
    downloads: 2870,
    tags: ['Boxing', 'Pro', 'Heavy Bag', 'Championship'],
  },
  {
    id: 'trending-008',
    name: 'Speed Bag Sprint',
    icon: 'radio-button-on',
    difficulty: 'beginner' as any,
    totalDuration: 960,
    isPreset: true,
    isArchived: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    timesCompleted: 0,
    phases: [
      {
        id: 'trending-008-p1',
        name: 'Speed Rounds',
        repeats: 8,
        comboOrder: 'sequential',
        segments: [
          { id: 'trending-008-s1', name: 'Speed Bag', duration: 90, type: 'active', segmentType: 'speedbag' },
          { id: 'trending-008-s2', name: 'Rest', duration: 30, type: 'rest', segmentType: 'rest' },
        ],
      },
    ],
    author: 'Quick Hands Boxing',
    authorHandle: '@quickhands',
    rating: 4.4,
    ratingCount: 134,
    downloads: 890,
    tags: ['Boxing', 'Beginner', 'Speed Bag', 'Quick'],
  },
];
