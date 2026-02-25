# GetClocked — Boxing/Fitness Mobile App

## Overview
A complete boxing/fitness gamification app rebuilt as an Expo React Native mobile app. Originally a React + Vite + Supabase web app, now fully offline-first with AsyncStorage/Zustand persistence.

## Architecture
- **Frontend**: Expo Router (file-based routing) with React Native
- **State**: Zustand stores with AsyncStorage persistence (no backend DB)
- **Voice**: expo-speech for workout voice announcements
- **Navigation**: 4 bottom tabs (Home, My Stats, Fight Club, Profile) + stack screens (Build, History, Workout, etc.)

## Tech Stack
- Expo SDK 54, React Native, TypeScript
- Zustand + AsyncStorage for state/persistence
- expo-router for navigation
- expo-speech for voice announcements
- expo-haptics for haptic feedback
- expo-crypto for UUID generation
- react-native-reanimated for animations
- date-fns for date utilities

## Project Structure
```
app/
  _layout.tsx          - Root layout with providers, dark theme
  (tabs)/
    _layout.tsx        - 4-tab navigation (Home, My Stats, Fight Club, Profile)
    index.tsx          - Home screen (workout list, CREATE SET + WORKOUT LOG actions)
    stats.tsx          - Stats dashboard: XP/rank, training grid (hours/rounds/calories/intensity), streak, badges, heatmap
    fight-club.tsx     - Fight Club: Feed (activity posts), Clubs (Early Adopters), Presets (searchable preset workouts)
    profile.tsx        - User profile, prestige, badges, glove display
  build.tsx            - Workout builder: Custom Build + AI Builder (natural language → workout)
  history.tsx          - Completed workout history + AI Coach recommendations
  onboarding.tsx       - Multi-step onboarding flow
  workout/[id].tsx     - Active workout session player
  quick-session.tsx    - Quick timer with XP
  settings.tsx         - App settings, voice prefs, archived workouts
  gloves.tsx           - Glove gallery by prestige tier

stores/
  userStore.ts         - User profile, XP, streak, onboarding
  workoutStore.ts      - Workout CRUD, presets, archive/restore
  timerStore.ts        - Quick timer state
  historyStore.ts      - Completed workout history
  badgeStore.ts        - Earned badges + badge stats tracking
  gloveStore.ts        - Equipped glove

lib/
  types.ts             - All TypeScript interfaces
  xpSystem.ts          - XP formulas, prestige, rankings, streak multipliers
  loadoutGenerator.ts  - Auto-generate workouts by experience level
  coachEngine.ts       - 12 deterministic coach recommendation rules (C1-C12)
  aiWorkoutParser.ts   - Natural language → workout parser (block-based multi-phase)
  comboParser.ts       - Punch/defense notation parser (1-2-SLIP-3 style)
  workoutTracking.ts   - Streak logic, post-workout stat increments, punch/defense counting
  workoutHistoryAnalysis.ts - History trend analysis
  utils.ts             - formatTime, generateId, formatDuration

data/
  badges.ts            - 88 base badges + combined exports (ALL_BADGES_COMBINED = 234 total)
  postL100Badges.ts    - 146 post-L100 endgame badges across 13 categories
  gloves.ts            - 52 gloves + unlock logic by prestige/level
  comboPools.ts        - Combo pools by difficulty tier
  presetComboLibrary.ts - 740 preset combos across 5 tiers
  speedBagDrills.ts    - 14 speed bag drills
  comboPresets.ts      - Punch/defense keys by difficulty
  presetWorkouts.ts    - Preset workout arrays by difficulty tier

components/ui/
  XPBar.tsx            - XP progress bar with prestige/rank
  TimerXPBar.tsx       - Compact XP bar for workout session
  ComboXPPop.tsx       - Floating combo XP popup animation
  BadgeEarnOverlay.tsx - Full-screen badge earned celebration
  GloveUnlockOverlay.tsx - Glove unlock celebration overlay
  ExercisePickerModal.tsx - Exercise category browser with search
  PrestigeDisplay.tsx  - Prestige tier badge display
  BadgeCard.tsx        - Individual badge card
  GloveCard.tsx        - Individual glove card
  StatCard.tsx         - Stats dashboard card

constants/
  colors.ts            - Dark theme: tech-black #0A0A0A, volt accent #CCFF00
```

## Key Systems
- **XP**: Combo XP formula (base×length×defense×duration/30), activity rates, championship 2x multiplier
- **Prestige**: 5 tiers (rookie→pro), 10 rankings per tier, 100 levels per tier
- **Streaks**: Multipliers from 1.0x (0 days) to 2.0x (100+ days)
- **Badges**: 234 total (88 base + 146 post-L100 endgame) tracked via BadgeStats object
- **Gloves**: 52 unlockable by prestige+level; BMF requires Pro L500 + 365-day streak
- **Coach**: 12 deterministic recommendation rules from workout history analysis
- **AI Builder**: Natural language parser converts text prompts to structured workouts
- **Fight Club**: Social feed, clubs, searchable/filterable preset workouts

## Ports
- Frontend (Expo): 8081
- Backend (Express): 5000

## Store Keys
- `get-clocked-user` - User profile
- `get-clocked-workouts` - Workouts
- `get-clocked-timer` - Timer settings
- `get-clocked-history` - Completed workouts
- `get-clocked-badges` - Badge tracking
- `get-clocked-gloves` - Equipped glove
