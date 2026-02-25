import { WorkoutHistoryEntry } from '@/lib/types';

export interface HistoryInsights {
  averageDifficulty: 'too_easy' | 'just_right' | 'too_hard' | null;
  recentTrend: 'getting_easier' | 'stable' | 'getting_harder' | null;
  weakRounds: number[];
  strongRounds: number[];
  preferredDuration: number;
  lastWorkoutDate: Date | null;
  totalWorkouts: number;
  suggestedAdjustments: string[];
  suggestedDifficultyAdjust: -1 | 0 | 1;
  suggestedRestAdjust: number;
  suggestedRoundsAdjust: number;
}

export interface RoundFeedbackEntry {
  roundNumber: number;
  rating: number;
}

export function analyzeWorkoutHistory(
  history: WorkoutHistoryEntry[],
  recentCount: number = 10
): HistoryInsights {
  const insights: HistoryInsights = {
    averageDifficulty: null,
    recentTrend: null,
    weakRounds: [],
    strongRounds: [],
    preferredDuration: 30,
    lastWorkoutDate: null,
    totalWorkouts: history.length,
    suggestedAdjustments: [],
    suggestedDifficultyAdjust: 0,
    suggestedRestAdjust: 1.0,
    suggestedRoundsAdjust: 0,
  };

  if (history.length === 0) {
    insights.suggestedAdjustments.push('Complete your first workout to get personalized recommendations!');
    return insights;
  }

  const sortedHistory = [...history].sort(
    (a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
  );

  const recentWorkouts = sortedHistory.slice(0, recentCount);

  insights.lastWorkoutDate = new Date(sortedHistory[0].completed_at);

  insights.averageDifficulty = calculateAverageDifficulty(recentWorkouts);

  insights.recentTrend = detectDifficultyTrend(recentWorkouts);

  const roundAnalysis = analyzeRoundFeedback(recentWorkouts);
  insights.weakRounds = roundAnalysis.weakRounds;
  insights.strongRounds = roundAnalysis.strongRounds;

  insights.preferredDuration = calculatePreferredDuration(recentWorkouts);

  generateSuggestionsAndAdjustments(insights);

  return insights;
}

function calculateAverageDifficulty(
  workouts: WorkoutHistoryEntry[]
): 'too_easy' | 'just_right' | 'too_hard' | null {
  const ratings = workouts
    .filter(w => w.difficulty)
    .map(w => w.difficulty as 'too_easy' | 'just_right' | 'too_hard');

  if (ratings.length === 0) return null;

  const counts = {
    too_easy: ratings.filter(r => r === 'too_easy').length,
    just_right: ratings.filter(r => r === 'just_right').length,
    too_hard: ratings.filter(r => r === 'too_hard').length,
  };

  const max = Math.max(counts.too_easy, counts.just_right, counts.too_hard);
  if (counts.too_easy === max) return 'too_easy';
  if (counts.too_hard === max) return 'too_hard';
  return 'just_right';
}

function detectDifficultyTrend(
  workouts: WorkoutHistoryEntry[]
): 'getting_easier' | 'stable' | 'getting_harder' | null {
  if (workouts.length < 3) return null;

  const difficultyValue = (d: string | null): number => {
    if (d === 'too_easy') return 1;
    if (d === 'just_right') return 2;
    if (d === 'too_hard') return 3;
    return 2;
  };

  const chronological = [...workouts]
    .reverse()
    .filter(w => w.difficulty)
    .map(w => difficultyValue(w.difficulty));

  if (chronological.length < 3) return null;

  const midpoint = Math.floor(chronological.length / 2);
  const firstHalf = chronological.slice(0, midpoint);
  const secondHalf = chronological.slice(midpoint);

  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

  const difference = secondAvg - firstAvg;

  if (difference < -0.3) return 'getting_easier';
  if (difference > 0.3) return 'getting_harder';
  return 'stable';
}

function analyzeRoundFeedback(workouts: WorkoutHistoryEntry[]): {
  weakRounds: number[];
  strongRounds: number[];
} {
  const roundRatings: Map<number, number[]> = new Map();

  for (const workout of workouts) {
    const feedback = workout.round_feedback as RoundFeedbackEntry[] | null;
    if (!feedback || !Array.isArray(feedback)) continue;

    for (const entry of feedback) {
      if (typeof entry.roundNumber !== 'number' || typeof entry.rating !== 'number') continue;

      const existing = roundRatings.get(entry.roundNumber) || [];
      existing.push(entry.rating);
      roundRatings.set(entry.roundNumber, existing);
    }
  }

  const weakRounds: number[] = [];
  const strongRounds: number[] = [];

  for (const [roundNum, ratings] of roundRatings) {
    if (ratings.length < 2) continue;

    const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;

    if (avg <= 2) {
      weakRounds.push(roundNum);
    } else if (avg >= 4) {
      strongRounds.push(roundNum);
    }
  }

  return {
    weakRounds: weakRounds.sort((a, b) => a - b),
    strongRounds: strongRounds.sort((a, b) => a - b),
  };
}

function calculatePreferredDuration(workouts: WorkoutHistoryEntry[]): number {
  const durations = workouts.map(w => w.duration / 60);

  if (durations.length === 0) return 30;

  const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
  return Math.round(avg);
}

function generateSuggestionsAndAdjustments(insights: HistoryInsights): void {
  if (insights.averageDifficulty === 'too_easy') {
    insights.suggestedAdjustments.push('Your recent workouts have been too easy - time to step it up!');
    insights.suggestedDifficultyAdjust = 1;
    insights.suggestedRoundsAdjust = 1;
    insights.suggestedRestAdjust = 0.9;
  } else if (insights.averageDifficulty === 'too_hard') {
    insights.suggestedAdjustments.push('You\'ve been pushing hard - consider dialing back intensity.');
    insights.suggestedDifficultyAdjust = -1;
    insights.suggestedRoundsAdjust = -1;
    insights.suggestedRestAdjust = 1.2;
  } else if (insights.averageDifficulty === 'just_right') {
    insights.suggestedAdjustments.push('You\'re in the zone! Keep up the great work.');
  }

  if (insights.recentTrend === 'getting_easier') {
    insights.suggestedAdjustments.push('Workouts are feeling easier - you\'re getting stronger!');
    if (insights.suggestedDifficultyAdjust === 0) {
      insights.suggestedDifficultyAdjust = 1;
    }
  } else if (insights.recentTrend === 'getting_harder') {
    insights.suggestedAdjustments.push('Workouts are getting tougher - make sure to recover properly.');
  }

  if (insights.weakRounds.length > 0) {
    const roundList = insights.weakRounds.slice(0, 3).join(', ');
    insights.suggestedAdjustments.push(`Rounds ${roundList} are consistently challenging - focus on pacing.`);
  }

  if (insights.strongRounds.length > 0) {
    insights.suggestedAdjustments.push('You\'re crushing the early rounds - great conditioning!');
  }

  if (insights.totalWorkouts === 0) {
    insights.suggestedAdjustments = ['Complete your first workout to get personalized recommendations!'];
  } else if (insights.totalWorkouts < 3) {
    insights.suggestedAdjustments.push('Complete a few more workouts for better personalization.');
  }
}

export function getAdjustedDifficulty(
  baseDifficulty: 'beginner' | 'intermediate' | 'advanced',
  insights: HistoryInsights
): 'beginner' | 'intermediate' | 'advanced' {
  const levels = ['beginner', 'intermediate', 'advanced'] as const;
  const currentIndex = levels.indexOf(baseDifficulty);
  const newIndex = Math.max(0, Math.min(2, currentIndex + insights.suggestedDifficultyAdjust));
  return levels[newIndex];
}

export function getAdjustedRestDuration(baseRest: number, insights: HistoryInsights): number {
  return Math.round(baseRest * insights.suggestedRestAdjust);
}

export function getAdjustedRounds(baseRounds: number, insights: HistoryInsights): number {
  return Math.max(1, baseRounds + insights.suggestedRoundsAdjust);
}

export function getInsightsSummary(insights: HistoryInsights): string | null {
  if (insights.totalWorkouts === 0) return null;

  const parts: string[] = [];

  if (insights.averageDifficulty === 'too_easy') {
    parts.push('ready for more challenge');
  } else if (insights.averageDifficulty === 'too_hard') {
    parts.push('might benefit from lighter intensity');
  } else if (insights.averageDifficulty === 'just_right') {
    parts.push('workouts feel just right');
  }

  if (insights.recentTrend === 'getting_easier') {
    parts.push('getting stronger');
  }

  if (parts.length === 0) return null;

  return `Based on your last ${Math.min(insights.totalWorkouts, 10)} workouts: ${parts.join(', ')}.`;
}
