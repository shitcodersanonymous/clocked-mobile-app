# GetClocked — Boxing/Fitness Mobile App

## Overview
A complete boxing/fitness gamification app rebuilt as an Expo React Native mobile app. Originally a React + Vite + Supabase web app, now fully offline-first with AsyncStorage/Zustand persistence.

## Architecture
- **Frontend**: Expo Router (file-based routing) with React Native
- **State**: Zustand stores with AsyncStorage persistence (no backend DB)
- **Voice**: expo-speech for workout voice announcements
- **Sound**: expo-av for sound effects (XP tick, level-up, prestige, warning) + expo-haptics
- **Navigation**: 4 bottom tabs (Home, My Stats, Fight Club, Profile) + stack screens (Build, History, Workout, etc.)

## Tech Stack
- Expo SDK 54, React Native, TypeScript
- Zustand + AsyncStorage for state/persistence
- expo-router for navigation
- expo-speech for voice announcements
- expo-av for sound effects
- expo-haptics for haptic feedback
- expo-crypto for UUID generation
- react-native-reanimated for animations
- react-native-svg for SVG rendering
- date-fns for date utilities

## Project Structure
```
app/
  _layout.tsx          - Root layout with providers, toast container, preset seeding
  (tabs)/
    _layout.tsx        - 4-tab navigation (Home, My Stats, Fight Club, Profile)
    index.tsx          - Home screen (workout list, CREATE SET + WORKOUT LOG actions)
    stats.tsx          - Stats dashboard: XP/rank, training grid, streak, badges, heatmap
    fight-club.tsx     - Fight Club: Feed, Clubs, Presets
    profile.tsx        - User profile, prestige, badges, glove display, edit profile link
  build.tsx            - Workout builder orchestration (decomposed into components/build/)
  history.tsx          - Completed workout history + AI Coach recommendations
  onboarding.tsx       - Multi-step onboarding flow
  workout/[id].tsx     - Active workout session player (decomposed into components/workout/)
  quick-session.tsx    - Quick timer with XP
  settings.tsx         - App settings, voice prefs, archived workouts
  gloves.tsx           - Glove gallery by prestige tier
  edit-profile.tsx     - Profile editing: name, experience, equipment, goals, weight, height

stores/
  userStore.ts         - User profile, XP (with sound integration), streak, onboarding
  workoutStore.ts      - Workout CRUD, presets, archive/restore
  timerStore.ts        - Quick timer state
  historyStore.ts      - Completed workout history
  badgeStore.ts        - Earned badges + badge stats tracking
  gloveStore.ts        - Equipped glove

hooks/
  useSoundEffects.ts   - Sound effects (XP tick, level-up, prestige, warning) + haptics; static playSoundEffect export
  useWorkoutStats.ts   - Period stats, weekly comparisons, MET-based calorie estimation
  usePresetSeeding.ts  - Seeds 4 starter workouts on first launch
  useToast.ts          - Toast notification system with Zustand store + ToastContainer component

lib/
  types.ts             - All TypeScript interfaces
  xpSystem.ts          - XP formulas, prestige, rankings, streak multipliers, cumulativeXP
  loadoutGenerator.ts  - Auto-generate workouts by experience level
  coachEngine.ts       - 12 deterministic coach recommendation rules (C1-C12)
  aiWorkoutParser.ts   - 3-layer parser: parseWorkoutInput (regex) + parseWorkoutPrompt (heuristic fallback) + autoRepairCombos
  comboParser.ts       - Punch/defense notation parser (1-2-SLIP-3 style)
  workoutTracking.ts   - Streak logic, post-workout stat increments, camelCase field convention
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
  trendingWorkouts.ts  - TrendingWorkout type, WORKOUT_CATEGORIES const

components/
  ui/
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
    WorkoutCard.tsx      - Workout list card (extracted from index.tsx)
    LevelUpOverlay.tsx   - Full-screen level-up animation with haptics + auto-dismiss
    VerticalXPBar.tsx    - Vertical XP bar for workout session (animated SVG)
    RoadToBMF.tsx        - BMF milestone progression display
  workout/
    PostWorkoutSummary.tsx - Post-workout summary with animated XP counter + prestige prompt
    PrestigePrompt.tsx     - 2-step prestige advancement confirmation flow
    RoundFeedbackPanel.tsx - Per-round difficulty rating (Easy/Perfect/Hard)
  build/
    AIBuilderSection.tsx   - AI prompt input, quality check, parsing
    PhaseEditor.tsx        - Phase CRUD operations
    SegmentEditor.tsx      - Segment editing within phases
  BadgeCollection.tsx      - Badge grid with category filtering, shapes, progress, detail modal
  WorkoutPreviewModal.tsx  - Workout preview before starting (phases, duration, XP estimate)

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
- **AI Builder**: 3-layer system — regex parser → heuristic fallback → autoRepairCombos cleanup
- **Sound Effects**: XP tick, level-up fanfare, prestige celebration, warning beep + haptic feedback
- **Toast System**: Zustand-based toast queue with auto-dismiss
- **Preset Seeding**: 4 starter workouts seeded on first launch
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
- `get-clocked-presets-seeded` - AsyncStorage flag for preset seeding

## Deferred Features (documented in attached_assets/replit-fix-guide)
- Authentication (Supabase Auth)
- Backend database (Supabase PostgreSQL)
- Social features (follows, community posts, clubs)
- AI API integration (Gemini 2.5 Flash edge function)
- Voice input (speech-to-text)
