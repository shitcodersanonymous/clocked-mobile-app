export interface UserProfile {
  id: string;
  createdAt: string;
  onboardingComplete: boolean;
  role: 'fighter' | 'coach';
  name: string;

  experienceLevel?: 'complete_beginner' | 'beginner' | 'intermediate' | 'advanced' | 'pro';
  knowledge?: {
    handWrapping: boolean;
    numberedPunches: boolean;
    heavyBagExperience: boolean;
  };
  equipment?: {
    gloves: boolean;
    wraps: boolean;
    heavyBag: boolean;
    speedBag: boolean;
    doubleEndBag: boolean;
    jumpRope: boolean;
    treadmill: boolean;
    primaryBag?: 'heavy' | 'double_end' | 'none';
  };
  goals?: Array<'learn_boxing' | 'get_fit' | 'competition' | 'home_workout' | 'supplement_training'>;

  coachInfo?: {
    gymName: string;
    location?: string;
    disciplines: string[];
  };

  coachId?: string;
  fighterIds?: string[];
  fightClubIds?: string[];

  isActive: boolean;
  isInWorkout: boolean;
  currentWorkoutName?: string;
  lastActiveAt: string;

  totalXP: number;
  currentStreak: number;
  longestStreak: number;
  workoutsCompleted: number;
  prestige?: 'rookie' | 'beginner' | 'intermediate' | 'advanced' | 'pro';
  currentLevel?: number;

  lastWorkoutDate?: string | null;

  totalTrainingSeconds?: number;
  comebackCount?: number;
  doubleDays?: number;
  morningWorkouts?: number;
  nightWorkouts?: number;
  weekendWorkouts?: number;
  weekdayWorkouts?: number;
  mondayWorkouts?: number;
  fridayWorkouts?: number;
  sundayWorkouts?: number;
  holidayWorkouts?: number;
  newYearsWorkout?: boolean;
  bestSessionXp?: number;
  postL100Sessions?: number;
  overflowXp?: number;
  punchCount?: number;
  punch1Count?: number;
  punch2Count?: number;
  punch3Count?: number;
  punch4Count?: number;
  punch5Count?: number;
  punch6Count?: number;
  punch7Count?: number;
  punch8Count?: number;
  slipsCount?: number;
  rollsCount?: number;
  pullbacksCount?: number;
  circlesCount?: number;

  equippedGlove?: string;

  preferences: {
    voiceType: 'male' | 'female' | 'system';
    soundEnabled: boolean;
    voiceAnnouncements?: boolean;
    voiceCountdown?: boolean;
    voiceComboCallouts?: boolean;
    tenSecondWarning?: boolean;
  };
}

export type SegmentType = 'work' | 'rest' | 'shadowboxing' | 'combo' | 'speedbag' | 'doubleend' | 'exercise' | 'sparring';

export type ActivityType = 'combos' | 'shadowbox' | 'run' | 'pushups' | 'custom';

export type PhaseType = 'continuous' | 'circuit' | 'rest';

export interface WorkoutSegment {
  id: string;
  name: string;
  type: 'active' | 'rest';
  segmentType?: SegmentType;
  duration: number;
  intensity?: string;
  reps?: number;
  comboIndex?: number | 'cycle';
  combo?: string[];
  exercise?: string;
  activityType?: ActivityType;
}

export interface WorkoutPhase {
  id: string;
  name: string;
  repeats: number;
  section?: 'warmup' | 'grind' | 'cooldown';
  segments: WorkoutSegment[];
  phaseType?: PhaseType;
  comboOrder?: 'sequential' | 'random';
  combos?: string[][];
}

export interface WorkoutSection {
  warmup: WorkoutPhase[];
  grind: WorkoutPhase[];
  cooldown: WorkoutPhase[];
}

export interface Workout {
  id: string;
  name: string;
  icon: string;
  difficulty: 'rookie' | 'beginner' | 'intermediate' | 'advanced' | 'pro';
  totalDuration: number;
  isPreset: boolean;
  isArchived: boolean;
  createdAt: string;
  lastUsed?: string;
  timesCompleted: number;
  sections: WorkoutSection;
  combos?: string[][];
  megasetRepeats?: number;
  tags?: string[];
}

export interface RoundFeedback {
  roundNumber: number;
  rating: number;
  notes?: string;
}

export interface CompletedWorkout {
  id: string;
  workoutId?: string;
  workoutName: string;
  completedAt: string;
  duration: number;
  xpEarned: number;
  difficulty?: 'too_easy' | 'just_right' | 'too_hard';
  notes?: string;
  roundFeedback?: RoundFeedback[];
  isManualEntry: boolean;
}

export interface QuickTimerSettings {
  roundTime: number;
  restTime: number;
  rounds: number;
  warningTime: number;
}

export interface TimerState {
  isRunning: boolean;
  isPaused: boolean;
  currentRound: number;
  totalRounds: number;
  isRestPeriod: boolean;
  timeRemaining: number;
  totalElapsed: number;
}

export type Rank =
  | 'regional'
  | 'amateur'
  | 'semi_pro'
  | 'pro_circuit'
  | 'ranked'
  | 'top_15'
  | 'top_10'
  | 'top_5'
  | 'contender'
  | 'champion'
  | 'undisputed'
  | 'goat';

export const RANK_THRESHOLDS: Record<Rank, number> = {
  regional: 0,
  amateur: 500,
  semi_pro: 1500,
  pro_circuit: 3500,
  ranked: 7000,
  top_15: 12000,
  top_10: 20000,
  top_5: 35000,
  contender: 55000,
  champion: 80000,
  undisputed: 120000,
  goat: 200000,
};

export const RANK_NAMES: Record<Rank, string> = {
  regional: 'Regional',
  amateur: 'Amateur',
  semi_pro: 'Semi-Pro',
  pro_circuit: 'Pro Circuit',
  ranked: 'Ranked',
  top_15: 'Top 15',
  top_10: 'Top 10',
  top_5: 'Top 5',
  contender: 'Contender',
  champion: 'Champion',
  undisputed: 'Undisputed',
  goat: 'G.O.A.T.',
};

export interface WorkoutHistoryEntry {
  id: string;
  workout_name: string;
  completed_at: string;
  duration: number;
  xp_earned: number;
  difficulty: 'too_easy' | 'just_right' | 'too_hard' | null;
  notes: string | null;
  round_feedback: RoundFeedback[] | null;
  is_manual_entry: boolean;
}
