const colors = {
  dark: {
    background: '#0A0A0A',
    surface1: '#111111',
    surface2: '#1A1A1A',
    surface3: '#242424',
    surface4: '#2E2E2E',

    foreground: '#F5F5F5',
    mutedForeground: '#888888',

    volt: '#CCFF00',
    voltDim: 'rgba(204, 255, 0, 0.15)',
    voltMuted: 'rgba(204, 255, 0, 0.4)',

    border: '#2A2A2A',
    borderLight: '#333333',

    red: '#FF4444',
    redDim: 'rgba(255, 68, 68, 0.15)',
    orange: '#FF8C00',
    orangeDim: 'rgba(255, 140, 0, 0.15)',
    blue: '#4488FF',
    blueDim: 'rgba(68, 136, 255, 0.15)',
    purple: '#AA66FF',
    purpleDim: 'rgba(170, 102, 255, 0.15)',
    green: '#44CC88',
    greenDim: 'rgba(68, 204, 136, 0.15)',
    amber: '#FFAA00',
    amberDim: 'rgba(255, 170, 0, 0.15)',
    yellow: '#FFD700',
    yellowDim: 'rgba(255, 215, 0, 0.15)',

    tabIconDefault: '#666666',
    tabIconSelected: '#CCFF00',

    prestigeRookie: '#94A3B8',
    prestigeBeginner: '#CCFF00',
    prestigeIntermediate: '#60A5FA',
    prestigeAdvanced: '#C084FC',
    prestigePro: '#FBBF24',

    badgeStreak: '#F97316',
    badgeCombo: '#3B82F6',
    badgeVolume: '#22C55E',
    badgeTime: '#A855F7',
    badgeConditioning: '#EF4444',
    badgeInWorkout: '#EAB308',
    badgePrestige: '#F59E0B',

    difficultyRookie: '#94A3B8',
    difficultyBeginner: '#22C55E',
    difficultyIntermediate: '#3B82F6',
    difficultyAdvanced: '#A855F7',
    difficultyPro: '#EF4444',
  },
};

export default colors;

export const PRESTIGE_COLORS: Record<string, string> = {
  rookie: colors.dark.prestigeRookie,
  beginner: colors.dark.prestigeBeginner,
  intermediate: colors.dark.prestigeIntermediate,
  advanced: colors.dark.prestigeAdvanced,
  pro: colors.dark.prestigePro,
};

export const BADGE_CATEGORY_COLORS_NATIVE: Record<string, { bg: string; text: string }> = {
  streak: { bg: 'rgba(249, 115, 22, 0.2)', text: colors.dark.badgeStreak },
  combo: { bg: 'rgba(59, 130, 246, 0.2)', text: colors.dark.badgeCombo },
  volume: { bg: 'rgba(34, 197, 94, 0.2)', text: colors.dark.badgeVolume },
  time: { bg: 'rgba(168, 85, 247, 0.2)', text: colors.dark.badgeTime },
  conditioning: { bg: 'rgba(239, 68, 68, 0.2)', text: colors.dark.badgeConditioning },
  in_workout: { bg: 'rgba(234, 179, 8, 0.2)', text: colors.dark.badgeInWorkout },
  prestige: { bg: 'rgba(245, 158, 11, 0.2)', text: colors.dark.badgePrestige },
  mastery:            { bg: 'rgba(139, 92, 246, 0.2)', text: '#A78BFA' },
  overflow:           { bg: 'rgba(6, 182, 212, 0.2)',  text: '#22D3EE' },
  legacy:             { bg: 'rgba(203, 213, 225, 0.2)',text: '#E2E8F0' },
  ultra_combo:        { bg: 'rgba(59, 130, 246, 0.2)', text: '#93C5FD' },
  ultra_conditioning: { bg: 'rgba(244, 63, 94, 0.2)',  text: '#FB7185' },
  ultra_time:         { bg: 'rgba(99, 102, 241, 0.2)', text: '#A5B4FC' },
  ultra_volume:       { bg: 'rgba(16, 185, 129, 0.2)', text: '#6EE7B7' },
  ultra_cardio:       { bg: 'rgba(20, 184, 166, 0.2)', text: '#5EEAD4' },
  consistency:        { bg: 'rgba(132, 204, 22, 0.2)', text: '#BEF264' },
  milestones:         { bg: 'rgba(217, 70, 239, 0.2)', text: '#E879F9' },
  performance:        { bg: 'rgba(14, 165, 233, 0.2)', text: '#38BDF8' },
  ultra_streak:       { bg: 'rgba(234, 88, 12, 0.2)',  text: '#FB923C' },
  combat_mastery:     { bg: 'rgba(220, 38, 38, 0.2)',  text: '#FCA5A5' },
};

export const DIFFICULTY_COLORS: Record<string, string> = {
  rookie: colors.dark.difficultyRookie,
  beginner: colors.dark.difficultyBeginner,
  intermediate: colors.dark.difficultyIntermediate,
  advanced: colors.dark.difficultyAdvanced,
  pro: colors.dark.difficultyPro,
};
