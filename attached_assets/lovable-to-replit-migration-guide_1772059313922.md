# Get Clocked: Lovable → Replit Migration Guide

## Complete Gap Analysis & Integration Fixes

**Generated:** February 25, 2026
**Lovable:** Vue/React web app — 150 source files, Supabase backend, full auth
**Replit:** Expo/React Native app — 59 source files, AsyncStorage local-only, no auth

The Replit version represents roughly **40% of the Lovable codebase**. It successfully ported the core architecture (Expo Router navigation, Zustand stores, core lib logic) but significant features, logic, and components were lost or stubbed out during translation.

---

## TABLE OF CONTENTS

1. [Architecture Overview](#1-architecture-overview)
2. [CRITICAL: Core Logic Truncations](#2-critical-core-logic-truncations)
3. [CRITICAL: Missing Authentication System](#3-critical-missing-authentication-system)
4. [CRITICAL: Backend / Database Gap](#4-critical-backend--database-gap)
5. [CRITICAL: 20 Missing Hooks](#5-critical-20-missing-hooks)
6. [MAJOR: Missing Components (11+)](#6-major-missing-components)
7. [MAJOR: Missing Pages](#7-major-missing-pages)
8. [MAJOR: Missing Data Files](#8-major-missing-data-files)
9. [MAJOR: Monolith Pages Need Decomposition](#9-major-monolith-pages-need-decomposition)
10. [MODERATE: Type System Differences](#10-moderate-type-system-differences)
11. [MODERATE: Store Differences](#11-moderate-store-differences)
12. [MODERATE: Naming Convention Conflicts](#12-moderate-naming-convention-conflicts)
13. [AI Workout Generation: Edge Function vs Local Parse](#13-ai-workout-generation-edge-function-vs-local-parse)
14. [What Transferred Well](#14-what-transferred-well)
15. [Recommended Priority Order](#15-recommended-priority-order)

---

## 1. Architecture Overview

### Lovable Stack
- **Framework:** React (TSX) with Vite
- **Routing:** react-router-dom
- **State:** Zustand with localStorage persist
- **Backend:** Supabase (Postgres, Auth, Edge Functions, RLS)
- **UI:** shadcn/ui component library (50+ components)
- **Styling:** Tailwind CSS
- **Auth:** Supabase Auth with session management

### Replit Stack
- **Framework:** React Native with Expo SDK 54
- **Routing:** expo-router (file-based)
- **State:** Zustand with AsyncStorage persist
- **Backend:** Express server skeleton (unused), no database
- **UI:** Custom React Native components (13 components)
- **Styling:** StyleSheet.create() inline styles
- **Auth:** None

### Key Structural Differences

| Concern | Lovable | Replit |
|---------|---------|-------|
| Source files | 150 | 59 |
| Components | 14 custom + 50 shadcn/ui | 13 custom |
| Hooks | 20 custom hooks | 0 (hooks dir doesn't exist) |
| Pages | 16 pages | 13 screens |
| Lib files | 7 core logic files | 8 (added query-client.ts, types.ts) |
| Data files | 9 data files | 8 (missing trendingWorkouts.ts) |
| Stores | 4 stores | 6 stores (added badgeStore, gloveStore) |
| Tests | 12 test files | 0 |
| Backend | Supabase (14 tables, 3 edge functions) | Express skeleton (unused) |

---

## 2. CRITICAL: Core Logic Truncations

Every core lib file in Replit is shorter than Lovable. While some of this is comments being stripped, there are actual logic gaps that affect functionality.

### 2.1 `lib/xpSystem.ts` — 600 → 441 lines (159 lines lost)

**Missing function: `cumulativeXP()`**
```typescript
// EXISTS IN LOVABLE, MISSING FROM REPLIT
function cumulativeXP(prestige: Prestige, endLevel: number): number {
  let total = 0;
  for (let l = 1; l <= endLevel; l++) {
    total += getXPRequiredForLevel(prestige, l);
  }
  return total;
}
```
This function is used internally by `getLevelFromXP()` and for progress bar calculations. If it's inlined elsewhere in Replit, verify the math is identical.

**Type rename: `ActivityType` → `XPActivityType`**
Lovable uses `ActivityType` throughout the codebase. Replit renamed this to `XPActivityType`. This causes import mismatches anywhere the old name is referenced.

**FIX REQUIRED:**
- Restore `cumulativeXP()` function
- Restore all section header comments (these serve as documentation for the XP system architecture document)
- Decide on `ActivityType` vs `XPActivityType` naming and make it consistent across ALL files that import it
- Restore all JSDoc comments — these are critical documentation for the power curves, combo formulas, and streak multiplier logic

**Missing documentation comments that serve as spec references:**
- "V1 Power Curves (Document Section 7)"
- "Punch XP Values (Document Section 2.1)"
- "Defense XP Values (Document Section 2.2)"
- "Exercise / Activity XP Rates (Document Section 2.3)"
- "Combo XP Formula (Document Section 2.4)"
- "Championship Multiplier (Document Section 2.5)"
- "Streak Multiplier System (Document Section 6)"
- "Session XP Calculation Pipeline (Document Section 11.1)"
- "Per-Session Cumulative Stats (Document Section 3.4)"
- "Prestige Promotion System (Document Section 10)"

### 2.2 `lib/aiWorkoutParser.ts` — 1,532 → 1,140 lines (392 lines lost / 26%)

**Missing functions:**
1. `extractExerciseWithDuration()` — Parses exercise names with attached durations from natural language. This handles patterns like "3 min heavy bag" or "60 sec jump rope freestyle". Without this, the parser can't properly extract duration-tagged exercises.

2. `isBoxingBlock()` — Determines if a text block is boxing-specific (shadowbox, heavy bag, double-end bag, sparring, mitt work, bag work). Used in block classification to apply correct segment types.

3. `checkPromptQuality()` renamed to `evaluatePromptQuality()` — Same logic but function name changed. Any code referencing the old name will break.

**Modified function signatures:**
4. `parseSupersetFromBlock()` — Lovable returns `{ exercises: SupersetExercise[]; restBetween: number | null; combos: string[][] }`. Replit returns `{ exercises: SupersetExercise[] | null; restBetween: number | null }`. The `combos` field is MISSING, which means combo data from superset blocks is lost during parsing.

5. `parseBlock()` parameter renamed from `blockText` to `text` — minor but affects any code referencing parameter by name.

**Added in Replit but not in Lovable:**
- `parseExerciseSetsFromBlock()` — New function
- `getAdjustedDifficulty()`, `getAdjustedRestDuration()`, `getAdjustedRounds()` — History-aware adjustment functions (these are good additions)

**FIX REQUIRED:**
- Restore `extractExerciseWithDuration()` — critical for natural language parsing
- Restore `isBoxingBlock()` — needed for correct segment type classification
- Add `combos: string[][]` back to `parseSupersetFromBlock()` return type
- Decide on function naming: `checkPromptQuality` vs `evaluatePromptQuality` — update all callers

### 2.3 `lib/coachEngine.ts` — 718 → 631 lines (87 lines lost / 12%)

Functions are identical between the two versions. The 87-line difference is entirely stripped comments and documentation. However, these comments document the coach engine's decision-making logic.

**FIX REQUIRED:**
- Restore all documentation comments from Lovable version for maintainability

### 2.4 `lib/comboParser.ts` — 330 → 246 lines (84 lines lost / 25%)

Same exported functions exist in both. Difference is stripped comments.

**FIX REQUIRED:**
- Restore documentation comments

### 2.5 `lib/loadoutGenerator.ts` — 293 → 260 lines (33 lines lost)

Same structure, stripped comments.

**FIX REQUIRED:**
- Restore documentation comments

### 2.6 `lib/workoutTracking.ts` — 257 → 191 lines (66 lines lost / 26%)

**Major architectural change:** Lovable's `computePostLogStats()` is async and queries Supabase directly for self-healing workout counts and total training seconds. Replit's version is synchronous and computes from a local `completedWorkouts` array.

**Lovable signature:**
```typescript
async function computePostLogStats(
  userId: string,
  profile: { last_workout_date: string | null; current_streak: number; longest_streak: number }
)
```

**Replit signature:**
```typescript
function computePostLogStats(
  completedWorkouts: CompletedWorkout[],
  profile: UserProfile
)
```

**Implications:**
- No self-healing: If local data gets corrupted, there's no server-side truth to fall back on
- No RPC call to `get_total_training_seconds` 
- Streak calculations work the same but rely on local data integrity

**The helper functions (`getTimeOfDayStats`, `getDayOfWeekStats`, `isDoubleDay`, `isHolidayWorkout`, `isComeback`, `computePostL100Increments`) are all present in Replit** — this is good. The main difference is the snake_case → camelCase conversion in field names.

**FIX REQUIRED:**
- This is acceptable for local-first architecture but needs to be documented
- When backend is eventually added, `computePostLogStats` should be updated to validate against server data

---

## 3. CRITICAL: Missing Authentication System

Lovable has a complete auth system:

### Lovable Auth Architecture
```
src/contexts/AuthContext.tsx (160 lines)
├── Supabase Auth integration
├── Session persistence & auto-refresh
├── User profile sync from DB to local store
├── Sign out with localStorage cleanup
├── Previous user detection (multi-account support)
└── QueryClient invalidation on auth change

src/pages/Auth.tsx (236 lines)
├── Login form
├── Signup form  
└── Magic link / OAuth support
```

### What Replit Has
```
(nothing)
```

No AuthContext, no Auth page, no session management, no sign-in/sign-out flow.

**FIX REQUIRED:**
For the immediate mobile app, you have two paths:

**Option A: Supabase Auth for React Native**
- Install `@supabase/supabase-js` and `@react-native-async-storage/async-storage` (already installed)
- Create a Supabase client configured for React Native (use AsyncStorage instead of localStorage)
- Port `AuthContext.tsx` replacing web-specific APIs
- Create native Auth screen with email/password or OAuth

**Option B: Defer Auth, Keep Local-Only**
- Acceptable for MVP/testing phase
- All data stays on-device via AsyncStorage
- Social features (Fight Club, follows, community) cannot function
- Add auth later when ready for cloud sync

**Recommendation:** Option B for now, Option A before any public release. Document this decision explicitly.

---

## 4. CRITICAL: Backend / Database Gap

### Lovable Supabase Schema (14 tables)
```sql
profiles          — User profiles, XP, streaks, prestige, stats
workouts          — Saved workout definitions
workout_history   — Completed workout logs
badges            — Earned badge records
personal_records  — PR tracking
follows           — Social follow relationships
community_posts   — Fight Club feed posts
clubs             — Fight clubs / groups
club_members      — Club membership
user_roles        — Admin role assignments
custom_exercises  — User-created exercises
workout_ratings   — Community workout ratings
tier_presets      — Tier-specific preset workouts (from DB)
app_config        — App version and feature flags
```

### Lovable Edge Functions (3)
```
generate-workout  — AI workout generation via Gemini 2.5 Flash (24KB)
admin-users       — Admin user management (7KB)  
increment-version — App version bumping (3.5KB)
```

### What Replit Has
```
server/
├── index.ts       — Express server boilerplate
├── routes.ts      — Empty route handler
├── storage.ts     — In-memory user CRUD (Map-based, volatile)
└── db.ts          — Empty
shared/
└── schema.ts      — Single 'users' table (id, username, password)
```

This is a Replit template skeleton — it does nothing for the app. All data persistence is via Zustand stores with AsyncStorage.

**FIX REQUIRED:**
- **Short term:** The AsyncStorage approach works for single-device use. No changes needed if auth is deferred.
- **Long term:** Choose a backend strategy:
  - **Supabase:** Port the existing schema and edge functions. Fastest path since all the SQL migrations exist.
  - **Custom Express + Postgres:** Build out the server/ directory. More control but more work.
  - **Firebase:** Alternative if you want to avoid Supabase.

**The `server/` directory can be deleted** if you're going Supabase. It's confusing boilerplate.

---

## 5. CRITICAL: 20 Missing Hooks

Lovable's hooks directory contains 20 custom hooks. **Replit has zero** — the hooks directory doesn't exist.

### Hooks That Need React Native Equivalents

| Hook | Lines | What It Does | Replit Status |
|------|-------|-------------|---------------|
| `useWorkouts.ts` | 162 | CRUD for workout definitions via Supabase | **MISSING** — Replaced by workoutStore |
| `useWorkoutHistory.ts` | 104 | Fetch/log completed workouts via Supabase | **MISSING** — Replaced by historyStore |
| `useBadges.ts` | 186 | Badge tracking, earned badges from Supabase | **MISSING** — Replaced by badgeStore |
| `useProfile.ts` | 259 | Profile CRUD, handle generation, ranking calc | **MISSING** — Partially in userStore |
| `useGloves.ts` | 67 | Glove unlock tracking via Supabase | **MISSING** — Replaced by gloveStore |
| `useWorkoutStats.ts` | 250 | Period stats, weekly changes, calculated metrics | **MISSING** — Logic needs to be rebuilt |
| `useSpeechSynthesis.ts` | 108 | Voice synthesis abstraction | **MISSING** — Replit uses expo-speech directly inline |
| `useSoundEffects.ts` | 292 | Sound effect playback (level up, XP, bells, etc.) | **MISSING** — No sound effects in Replit |
| `useTierPresets.ts` | 116 | Tier-specific preset workouts from DB | **MISSING** |
| `usePresetSeeding.ts` | 91 | Seeds default presets on first launch | **MISSING** |
| `useClubs.ts` | 162 | Fight club CRUD, membership | **MISSING** — Requires backend |
| `useCommunityPosts.ts` | 256 | Community feed, share workouts, post workout | **MISSING** — Requires backend |
| `useFollows.ts` | 189 | Follow/unfollow users, follower lists | **MISSING** — Requires backend |
| `useUserSearch.ts` | 65 | Search for users by handle | **MISSING** — Requires backend |
| `usePublicProfile.ts` | 71 | View another user's public profile | **MISSING** — Requires backend |
| `useCustomExercises.ts` | 63 | User-created custom exercises | **MISSING** — Requires backend |
| `useUserRole.ts` | 35 | Admin role checking | **MISSING** — Requires backend |
| `useAppVersion.ts` | 23 | App version from DB config | **MISSING** |
| `use-toast.ts` | 186 | Toast notification system | **MISSING** — Use React Native Alert or a toast lib |
| `use-mobile.tsx` | 19 | Mobile viewport detection | **NOT NEEDED** — Always mobile in RN |

### Hooks That Can Be Deferred (require backend)
These 7 hooks only work with a backend and can be deferred until auth/DB is added:
- `useClubs.ts`
- `useCommunityPosts.ts`
- `useFollows.ts`
- `useUserSearch.ts`
- `usePublicProfile.ts`
- `useCustomExercises.ts`
- `useUserRole.ts`

### Hooks That Need Immediate Rebuilding
These were replaced by Zustand stores but may have lost functionality:

**`useWorkoutStats.ts` (250 lines)** — This is a big one. It calculates:
- Period stats (daily, weekly, monthly, all-time)
- Weekly comparison (this week vs last week)
- Average session duration, XP per session
- Most active day of week
- Best streak tracking

The Stats page in Replit (`app/(tabs)/stats.tsx`) currently computes some of this inline, but it should be extracted into a reusable hook or utility.

**`useSoundEffects.ts` (292 lines)** — Lovable has a full sound effects system:
- Bell sounds for round start/end
- XP earned sound
- Level up sound
- 10-second warning beep
- Combo callout sounds
- Uses Web Audio API

Replit has **no sound effects at all**. For React Native, you'd use `expo-av` or a similar audio library.

**`useSpeechSynthesis.ts` (108 lines)** — Lovable has a voice synthesis wrapper. Replit uses `expo-speech` directly in the workout session, which is fine but less organized.

**`usePresetSeeding.ts` (91 lines)** — Seeds default workouts on first launch. Without this, new users get an empty workout list.

**FIX REQUIRED:**
1. Create `hooks/` directory in Replit
2. Implement `useWorkoutStats.ts` — extract stats calculation from stats.tsx into reusable hook
3. Implement `useSoundEffects.ts` using `expo-av` — critical for workout experience
4. Implement `usePresetSeeding.ts` — new users need starter workouts
5. Consider `useSpeechSynthesis.ts` wrapper around expo-speech for cleaner code

---

## 6. MAJOR: Missing Components

### Components That Need React Native Ports

#### 6.1 `PostWorkoutSummary.tsx` (470 lines) — **HIGH PRIORITY**
The entire post-workout reward screen. This is the primary engagement/gamification payoff moment.

**Lovable exports:**
```typescript
export interface SessionXPBreakdown {
  // Base XP, streak bonus, badge XP, total
}

export function PostWorkoutSummary({
  // Shows animated XP breakdown
  // Badge earn notifications  
  // Level progress bar
  // Prestige status
  // Share to community option
  // "Next workout" CTA
})
```

The Replit workout session (`app/workout/[id].tsx`) may have some of this inlined, but it needs to be a proper component.

**FIX:** Create `components/workout/PostWorkoutSummary.tsx` as a React Native component with Reanimated animations.

#### 6.2 `LevelUpOverlay.tsx` (82 lines) — **HIGH PRIORITY**
Full-screen celebration animation when user levels up.

**FIX:** Create `components/ui/LevelUpOverlay.tsx` using Reanimated for the animation.

#### 6.3 `PrestigePrompt.tsx` (245 lines) — **HIGH PRIORITY**  
Prestige promotion flow when user hits L100 in a tier.

**FIX:** Create `components/workout/PrestigePrompt.tsx` — modal or full-screen prompt for prestige advancement.

#### 6.4 `RoundFeedbackPanel.tsx` (47 lines) — **MEDIUM PRIORITY**
Round-by-round feedback during workouts (rate difficulty, track performance).

**FIX:** Create `components/workout/RoundFeedbackPanel.tsx`

#### 6.5 `RoadToBMF.tsx` (159 lines) — **MEDIUM PRIORITY**
Visual progression tracker toward BMF (Baddest Motherfucker) achievement. Shows milestone progress.

**FIX:** Create `components/ui/RoadToBMF.tsx`

#### 6.6 `VerticalXPBar.tsx` (125 lines) — **MEDIUM PRIORITY**
Vertical XP progress bar used during workout sessions alongside the timer.

**FIX:** Create `components/ui/VerticalXPBar.tsx` using SVG or Reanimated.

#### 6.7 `WorkoutCard.tsx` (82 lines) — **LOW PRIORITY**
Replit already has a `WorkoutCard` function inlined in `app/(tabs)/index.tsx`. It should be extracted to a standalone component.

**FIX:** Extract the existing inline WorkoutCard into `components/ui/WorkoutCard.tsx`

#### 6.8 `AIBuilderModal.tsx` (Lovable: standalone) — **LOW PRIORITY**
In Lovable this was a modal component. In Replit it's inlined into `build.tsx` (2,098 lines). The logic exists but needs extraction.

**FIX:** Extract AI builder logic from `build.tsx` into `components/AIBuilderModal.tsx`

#### 6.9 `BadgeCollection.tsx` (Lovable: standalone) — **MEDIUM PRIORITY**
Full badge display grid with filtering and earned/locked states.

**FIX:** Create `components/BadgeCollection.tsx` — the Replit stats page has some badge display but it's not a reusable component.

#### 6.10 `AddWorkoutModal.tsx` — **LOW PRIORITY**
Modal for adding/creating new workouts.

#### 6.11 `WorkoutPreviewModal.tsx` — **MEDIUM PRIORITY**
Preview a workout before starting it (shows phases, segments, estimated duration/XP).

#### 6.12 `SharedWorkoutsModal.tsx` — **DEFERRED** (requires backend)
#### 6.13 `LiveStreamModal.tsx` — **DEFERRED** (requires backend)

---

## 7. MAJOR: Missing Pages

### 7.1 `Auth.tsx` (236 lines) — **DEFERRED**
Login/signup page. Blocked by authentication decision.

### 7.2 `EditProfile.tsx` (577 lines) — **MEDIUM PRIORITY**
Profile editing screen. Users need to be able to change their name, preferences, equipment, etc.

**FIX:** Create `app/edit-profile.tsx` with React Native form components. Add a route from the profile tab.

### 7.3 `AdminPortal.tsx` (372 lines) — **DEFERRED**
Admin features. Requires backend and role system.

### 7.4 `BadgeTests.tsx` (661 lines) — **LOW PRIORITY**
QA testing page for badges. Useful for development but not user-facing.

**FIX:** Create `app/badge-tests.tsx` as a development-only screen.

---

## 8. MAJOR: Missing Data Files

### 8.1 `data/trendingWorkouts.ts` — **MISSING**

Lovable has this file with:
```typescript
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
```

Even though the array is empty (trending presets come from DB), the type definitions and category constants are used elsewhere.

**FIX:** Create `data/trendingWorkouts.ts` with the type definitions and constants.

---

## 9. MAJOR: Monolith Pages Need Decomposition

### 9.1 `app/build.tsx` — 2,098 lines

This file absorbed:
- AI Builder modal logic
- Exercise picker modal
- Workout preview functionality
- Phase/segment editor
- All form state management

**Should be split into:**
```
app/build.tsx                          (~400 lines) — Main page, orchestration
components/build/AIBuilderSection.tsx  (~500 lines) — AI prompt and parsing
components/build/PhaseEditor.tsx       (~400 lines) — Phase management
components/build/SegmentEditor.tsx     (~300 lines) — Individual segment editing
components/build/WorkoutPreview.tsx    (~200 lines) — Preview before saving
components/ui/ExercisePickerModal.tsx  (already exists, ~300 lines)
```

### 9.2 `app/workout/[id].tsx` — 2,026 lines

This file absorbed:
- Timer engine UI
- Post-workout summary (should be PostWorkoutSummary component)
- Round feedback (should be RoundFeedbackPanel component)
- Prestige prompt (should be PrestigePrompt component)
- XP calculation display
- All animation logic

**Should be split into:**
```
app/workout/[id].tsx                         (~600 lines) — Main timer screen
components/workout/TimerDisplay.tsx           (~300 lines) — Arc timer, countdown
components/workout/PostWorkoutSummary.tsx     (~470 lines) — Post-workout screen
components/workout/RoundFeedbackPanel.tsx     (~50 lines)  — Round feedback
components/workout/PrestigePrompt.tsx         (~250 lines) — Prestige flow
components/workout/WorkoutControls.tsx        (~200 lines) — Play/pause/skip buttons
```

---

## 10. MODERATE: Type System Differences

### 10.1 Date Types
Lovable uses `Date` objects for `createdAt` and `lastActiveAt`. Replit uses ISO `string` representations.

```typescript
// Lovable
createdAt: Date;
lastActiveAt: Date;

// Replit  
createdAt: string;
lastActiveAt: string;
```

This is actually correct for React Native/AsyncStorage (Date objects don't serialize cleanly). **No fix needed** — Replit's approach is better for mobile.

### 10.2 Replit Added Fields
Replit's `UserProfile` type adds fields that Lovable stores in the database:
```typescript
// Only in Replit types
lastWorkoutDate?: string | null;
totalTrainingSeconds?: number;
comebackCount?: number;
doubleDays?: number;
morningWorkouts?: number;
// ... (all post-L100 tracking fields)
equippedGlove?: string;
```

This is correct — since there's no DB, these need to live in the local profile. **No fix needed.**

### 10.3 `ActivityType` vs `XPActivityType`
Lovable exports `ActivityType`. Replit renamed to `XPActivityType`. This affects every file that imports it.

**FIX:** Pick one name and make it consistent everywhere. Recommend keeping `ActivityType` for simplicity, and re-exporting as `XPActivityType` if needed:
```typescript
export type ActivityType = ...;
export type XPActivityType = ActivityType; // alias for backward compat
```

---

## 11. MODERATE: Store Differences

### 11.1 `userStore.ts`
**Lovable has that Replit doesn't:**
- `addXP()` accepts `playSound` parameter and calls `playSoundEffect.levelUp()` / `playSoundEffect.xp()` on level-up / XP gain
- Replit's `addXP()` has no sound integration

**FIX:** Once sound effects are implemented, add the `playSound` parameter back to `addXP()`.

### 11.2 New Replit Stores (Good Additions)
Replit added `badgeStore.ts` and `gloveStore.ts` which Lovable handles via Supabase hooks. These are correct for local-only architecture.

### 11.3 `workoutStore.ts`
Lovable: 157 lines, persists to localStorage
Replit: 177 lines, persists to AsyncStorage

Replit's version is slightly larger and handles the workout CRUD that Lovable delegates to `useWorkouts` hook + Supabase. **This is correct for local-first.**

---

## 12. MODERATE: Naming Convention Conflicts

The Replit conversion changed field naming from snake_case (Supabase convention) to camelCase (JavaScript convention) in several places:

| Lovable (snake_case) | Replit (camelCase) |
|---|---|
| `morning_workouts` | `morningWorkouts` |
| `night_workouts` | `nightWorkouts` |
| `weekend_workouts` | `weekendWorkouts` |
| `double_days` | `doubleDays` |
| `best_session_xp` | `bestSessionXp` |
| `post_l100_sessions` | `postL100Sessions` |
| `overflow_xp` | `overflowXp` |
| `punch_1_count` | `punch1Count` |
| `last_workout_date` | `lastWorkoutDate` |

Replit's `computePostL100Increments()` handles both conventions with fallbacks like:
```typescript
const currentLevel = profile.current_level || profile.currentLevel || 1;
```

**FIX:** This is messy but functional. When the codebase stabilizes, pick one convention (camelCase for RN) and remove the fallbacks.

---

## 13. AI Workout Generation: Edge Function vs Local Parse

### Lovable Architecture
```
User prompt → Supabase Edge Function (generate-workout)
           → Gemini 2.5 Flash API call  
           → Structured JSON response
           → parsedResultToWorkout() conversion
           → Workout object
```

The edge function (`supabase/functions/generate-workout/index.ts`, 24KB) contains a massive system prompt that teaches Gemini the workout schema, punch numbering, combo formats, phase structures, etc.

### Replit Architecture  
```
User prompt → parseWorkoutInput() (local)
           → Regex-based parsing
           → Workout object
```

Replit uses **only the local parser** (`lib/aiWorkoutParser.ts`). There's no AI API call. The build page calls:
```typescript
const parsed = parseWorkoutInputFn(aiPrompt.trim(), userLevel);
const workout = parsedResultToWorkoutFn(parsed);
```

**This means the "AI Builder" in Replit isn't actually AI** — it's regex/pattern matching. The local parser is good for structured inputs like "5 rounds 3 min boxing 1 min rest" but can't handle the creative natural language that the Gemini-powered edge function handles.

**FIX OPTIONS:**
1. **Add direct API call to Gemini/OpenAI from the app** — Build an API route or call directly from the client
2. **Port the edge function to Express** — Use the existing server/ directory
3. **Use the Supabase edge function** — If you set up Supabase for the mobile app
4. **Keep local-only for now** — The regex parser handles most standard workout requests

**Recommendation:** For MVP, the local parser is fine. When ready for the full KOI experience, add an API call to Gemini using the system prompt from the edge function.

---

## 14. What Transferred Well

These things are correctly implemented in Replit and need no changes:

- **Navigation structure** — Expo Router tabs correctly mirror the Lovable bottom nav (Home, Stats, Fight Club, Profile)
- **Zustand stores** — All 4 Lovable stores ported correctly + 2 new useful stores added
- **Core data files** — badges.ts, comboPools.ts, comboPresets.ts, gloves.ts, postL100Badges.ts, presetComboLibrary.ts, speedBagDrills.ts all present and intact
- **Native platform features** — Proper use of expo-haptics, expo-speech, react-native-reanimated, SafeAreaView, react-native-gesture-handler
- **Tab layout** — Nice implementation with liquid glass detection for iOS 26 (`isLiquidGlassAvailable()`)
- **Color system** — Well-organized dark theme constants in `constants/colors.ts`
- **AsyncStorage persistence** — All stores correctly use `createJSONStorage(() => AsyncStorage)`
- **Error boundaries** — `ErrorBoundary.tsx` and `ErrorFallback.tsx` (Lovable didn't have these)
- **Keyboard handling** — `KeyboardAwareScrollViewCompat.tsx` and `react-native-keyboard-controller`
- **Timer engine** — The core timer logic in `timerStore.ts` is intact
- **Workout session** — The arc timer, segment navigation, XP tracking all work (just need decomposition)

---

## 15. Recommended Priority Order

### Phase 1: Core Logic Parity (Do First)
1. **Restore xpSystem.ts** — Add back `cumulativeXP()`, fix `ActivityType` naming, restore all doc comments
2. **Restore aiWorkoutParser.ts** — Add back `extractExerciseWithDuration()`, `isBoxingBlock()`, fix `parseSupersetFromBlock()` combos return
3. **Restore comments** in coachEngine.ts, comboParser.ts, loadoutGenerator.ts
4. **Add trendingWorkouts.ts** data file

### Phase 2: Missing Components (Critical UX)
5. **Create PostWorkoutSummary.tsx** — This is the reward loop. Must have.
6. **Create LevelUpOverlay.tsx** — Gamification payoff moment
7. **Create PrestigePrompt.tsx** — Prestige advancement flow
8. **Implement sound effects** — Create hooks/useSoundEffects.ts using expo-av

### Phase 3: Code Quality
9. **Decompose build.tsx** — Split into component pieces
10. **Decompose workout/[id].tsx** — Extract timer components
11. **Extract WorkoutCard** from index.tsx into standalone component
12. **Create hooks/ directory** and extract useWorkoutStats

### Phase 4: Missing Pages & Features
13. **Create EditProfile screen**
14. **Create WorkoutPreviewModal** — Preview before starting
15. **Create RoadToBMF component**
16. **Create RoundFeedbackPanel**
17. **Add preset seeding** for new users

### Phase 5: Backend (When Ready)
18. **Decide on backend** (Supabase recommended)
19. **Add authentication**
20. **Port database schema**
21. **Enable social features** (Fight Club, follows, community)
22. **Add AI workout generation** via API

---

## Appendix A: File-by-File Mapping

### Pages: Lovable → Replit
| Lovable Page | Replit Screen | Status |
|---|---|---|
| `pages/Index.tsx` | `app/(tabs)/index.tsx` | ✅ Ported |
| `pages/Build.tsx` | `app/build.tsx` | ✅ Ported (oversized) |
| `pages/WorkoutSession.tsx` | `app/workout/[id].tsx` | ✅ Ported (oversized) |
| `pages/Stats.tsx` | `app/(tabs)/stats.tsx` | ✅ Ported |
| `pages/Profile.tsx` | `app/(tabs)/profile.tsx` | ✅ Ported |
| `pages/FightClub.tsx` | `app/(tabs)/fight-club.tsx` | ✅ Ported |
| `pages/History.tsx` | `app/history.tsx` | ✅ Ported |
| `pages/Settings.tsx` | `app/settings.tsx` | ✅ Ported |
| `pages/Onboarding.tsx` | `app/onboarding.tsx` | ✅ Ported |
| `pages/Gloves.tsx` | `app/gloves.tsx` | ✅ Ported |
| `pages/QuickSession.tsx` | `app/quick-session.tsx` | ✅ Ported |
| `pages/Auth.tsx` | — | ❌ Missing (needs auth) |
| `pages/EditProfile.tsx` | — | ❌ Missing |
| `pages/AdminPortal.tsx` | — | ❌ Missing (needs auth) |
| `pages/BadgeTests.tsx` | — | ❌ Missing |
| `pages/NotFound.tsx` | `app/+not-found.tsx` | ✅ Ported |

### Lib: Lovable → Replit
| Lovable File | Replit File | Status |
|---|---|---|
| `lib/xpSystem.ts` | `lib/xpSystem.ts` | ⚠️ Truncated (missing cumulativeXP, renamed ActivityType) |
| `lib/aiWorkoutParser.ts` | `lib/aiWorkoutParser.ts` | ⚠️ Truncated (missing 3 functions, modified superset parsing) |
| `lib/coachEngine.ts` | `lib/coachEngine.ts` | ⚠️ Comments stripped, logic intact |
| `lib/comboParser.ts` | `lib/comboParser.ts` | ⚠️ Comments stripped, logic intact |
| `lib/loadoutGenerator.ts` | `lib/loadoutGenerator.ts` | ⚠️ Comments stripped, logic intact |
| `lib/workoutTracking.ts` | `lib/workoutTracking.ts` | ⚠️ Rewritten for local-only (acceptable) |
| `lib/utils.ts` | `lib/utils.ts` | ✅ Ported (expanded) |
| — | `lib/types.ts` | ✅ New (moved from types/index.ts) |
| — | `lib/query-client.ts` | ✅ New |

### Stores: Lovable → Replit
| Lovable Store | Replit Store | Status |
|---|---|---|
| `stores/userStore.ts` | `stores/userStore.ts` | ⚠️ Missing sound integration in addXP |
| `stores/workoutStore.ts` | `stores/workoutStore.ts` | ✅ Ported + expanded |
| `stores/timerStore.ts` | `stores/timerStore.ts` | ✅ Ported |
| `stores/historyStore.ts` | `stores/historyStore.ts` | ✅ Ported |
| — | `stores/badgeStore.ts` | ✅ New (good addition) |
| — | `stores/gloveStore.ts` | ✅ New (good addition) |

---

## Appendix B: Lovable Source Files for Reference

When porting missing features, use these Lovable source files as the authoritative reference:

```
# Core Logic (copy from Lovable, adapt for RN)
src/lib/xpSystem.ts              — 600 lines, full XP architecture
src/lib/aiWorkoutParser.ts       — 1,532 lines, complete parser
src/lib/coachEngine.ts           — 718 lines, coach logic
src/lib/comboParser.ts           — 330 lines, combo parsing
src/lib/loadoutGenerator.ts      — 293 lines, loadout generation

# Missing Components (port to React Native)
src/components/workout/PostWorkoutSummary.tsx  — 470 lines
src/components/workout/PrestigePrompt.tsx      — 245 lines
src/components/workout/RoundFeedbackPanel.tsx  — 47 lines
src/components/ui/LevelUpOverlay.tsx           — 82 lines
src/components/ui/RoadToBMF.tsx                — 159 lines
src/components/ui/VerticalXPBar.tsx            — 125 lines
src/components/ui/WorkoutCard.tsx              — 82 lines

# Missing Hooks (rebuild for local-first RN)
src/hooks/useWorkoutStats.ts     — 250 lines, stats calculations
src/hooks/useSoundEffects.ts     — 292 lines, audio system
src/hooks/useSpeechSynthesis.ts  — 108 lines, voice wrapper
src/hooks/usePresetSeeding.ts    — 91 lines, starter content

# Missing Data
src/data/trendingWorkouts.ts     — 19 lines, types + categories

# Missing Pages (port to Expo Router)
src/pages/EditProfile.tsx        — 577 lines
src/pages/Auth.tsx               — 236 lines (when ready)

# AI Edge Function (for future API integration)
supabase/functions/generate-workout/index.ts — 24KB system prompt
```

---

*This document should be used as the master checklist for bringing the Replit mobile app to feature parity with the Lovable web app. Work through the phases in order — core logic first, then components, then code quality, then backend.*
