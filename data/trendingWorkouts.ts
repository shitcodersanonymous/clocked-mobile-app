import { Workout } from '@/lib/types';

export interface TrendingWorkout extends Workout {
  author: string;
  authorHandle: string;
  rating: number;
  ratingCount: number;
  downloads: number;
  tags: string[];
}

export const TRENDING_WORKOUTS: TrendingWorkout[] = [];

export const WORKOUT_CATEGORIES = [
  'All', 'Boxing', 'HIIT', 'Conditioning',
  'Rookie', 'Beginner', 'Intermediate', 'Advanced', 'Pro', 'Cardio'
] as const;

export type WorkoutCategory = typeof WORKOUT_CATEGORIES[number];
