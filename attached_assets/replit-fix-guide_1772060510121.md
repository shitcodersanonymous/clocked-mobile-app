# Replit Fix Guide: What's Broken, What's Missing, What Needs Fixing

## This Is the Active Codebase — Everything Below Needs to Be Fixed Here

**Generated:** February 25, 2026
**Reference Codebase:** Lovable — getclocked-main (the original web app, 150 source files, Supabase backend)
**Active Codebase (THIS APP):** clocked-mobile-app (Expo/React Native, 59 source files, AsyncStorage local-only)

The current codebase is ~40% of what the original had. The core architecture is correct (Expo Router, Zustand, core lib logic), but significant features, logic, and components were lost, truncated, or stubbed during the initial conversion. This document catalogs every gap in exhaustive detail so they can be systematically fixed.

---

## TABLE OF CONTENTS

1. [Architecture Comparison](#1-architecture-comparison)
2. [CRITICAL: Core Logic Files Truncated](#2-critical-core-logic-files-truncated)
3. [CRITICAL: 3-Layer AI Generation System Lost](#3-critical-3-layer-ai-generation-system-lost)
4. [CRITICAL: Authentication System Missing](#4-critical-authentication-system-missing)
5. [CRITICAL: Backend / Database Gone](#5-critical-backend--database-gone)
6. [CRITICAL: All 20 Hooks Missing](#6-critical-all-20-hooks-missing)
7. [MAJOR: 11+ Missing Components](#7-major-11-missing-components)
8. [MAJOR: Missing Pages](#8-major-missing-pages)
9. [MAJOR: Missing Data Files](#9-major-missing-data-files)
10. [MAJOR: Monolith Pages Need Decomposition](#10-major-monolith-pages-need-decomposition)
11. [MODERATE: Sound Effects System Missing](#11-moderate-sound-effects-system-missing)
12. [MODERATE: Type System Differences](#12-moderate-type-system-differences)
13. [MODERATE: Store Differences](#13-moderate-store-differences)
14. [MODERATE: Naming Convention Conflicts](#14-moderate-naming-convention-conflicts)
15. [What Transferred Well](#15-what-transferred-well)
16. [Recommended Fix Priority Order](#16-recommended-fix-priority-order)
17. [Appendix A: Complete File Mapping](#appendix-a-complete-file-mapping)
18. [Appendix B: Lovable Reference Files](#appendix-b-lovable-reference-files)
19. [Appendix C: Complete Supabase Schema](#appendix-c-complete-supabase-schema)

---

## 1. Architecture Comparison

### Lovable Stack
- **Framework:** React (TSX) with Vite
- **Routing:** react-router-dom
- **State:** Zustand with localStorage persist
- **Backend:** Supabase (Postgres + Auth + Edge Functions + Row Level Security)
- **UI:** shadcn/ui component library (50+ components) + 14 custom components
- **Styling:** Tailwind CSS
- **Auth:** Supabase Auth with session management, profile sync, multi-account support
- **AI Generation:** 3-layer system — Gemini 2.5 Flash edge function → regex parser → legacy heuristic
- **Sound:** Web Audio API oscillator-based sound synthesis (no audio files)
- **Testing:** Vitest with 12 test suites

### Replit Stack
- **Framework:** React Native with Expo SDK 54
- **Routing:** expo-router (file-based routing)
- **State:** Zustand with AsyncStorage persist
- **Backend:** Express server skeleton (completely unused — 0 routes)
- **UI:** 13 custom React Native components
- **Styling:** StyleSheet.create() inline styles
- **Auth:** None
- **AI Generation:** Local regex parser only (1 of 3 layers)
- **Sound:** None
- **Testing:** None

### Structural Comparison

| Category | Lovable | Replit | Delta |
|----------|---------|-------|-------|
| Total source files (TS/TSX) | 150 | 59 | **-91 files** |
| Custom components | 14 + 50 shadcn/ui | 13 | **-51 components** |
| Custom hooks | 20 | 0 | **-20 hooks** |
| Pages/screens | 16 | 13 | -3 pages |
| Lib (core logic) files | 7 files, 4,059 lines | 10 files, 3,541 lines | **-518 lines of logic** |
| Data files | 9 | 8 | -1 file |
| Stores | 4 | 6 | +2 (good additions) |
| Test files | 12 | 0 | **-12 test suites** |
| Backend tables | 14 Supabase tables | 1 unused Drizzle table | **-13 tables** |
| Edge functions | 3 (generate-workout, admin-users, increment-version) | 0 | **-3 functions** |
| Supabase RPC functions | 3 (get_public_profile, get_total_training_seconds, get_tier_user_counts) | 0 | **-3 functions** |
| RLS policies | 25+ | 0 | **-25+ policies** |

---

## 2. CRITICAL: Core Logic Files Truncated

Every core lib file is shorter in Replit. Some is stripped comments (which serve as architecture documentation), but there are actual logic and function gaps.

### 2.1 `lib/xpSystem.ts` — 600 → 441 lines (159 lines lost)

**MISSING FUNCTION — `cumulativeXP()`:**
```typescript
// EXISTS IN LOVABLE, COMPLETELY ABSENT FROM REPLIT
function cumulativeXP(prestige: Prestige, endLevel: number): number {
  let total = 0;
  for (let l = 1; l <= endLevel; l++) {
    total += getXPRequiredForLevel(prestige, l);
  }
  return total;
}
```
This is used internally by `getLevelFromXP()` and for XP progress bar calculations. Verify whether Replit's `getLevelFromXP` still works correctly without this — it may be inlined, but if not, XP level calculations could be wrong.

**BREAKING RENAME — `ActivityType` → `XPActivityType`:**
Lovable exports `ActivityType` and uses it throughout the codebase — in types/index.ts, in workoutTracking.ts, in the workout session page, everywhere. Replit renamed this to `XPActivityType` in xpSystem.ts. Every file that imports the old name breaks silently or needs to be updated.

Files affected by this rename:
- `lib/xpSystem.ts` (export site)
- `lib/workoutTracking.ts`
- `lib/types.ts`
- `app/workout/[id].tsx`
- `app/(tabs)/stats.tsx`
- `app/build.tsx`

**MISSING DOCUMENTATION COMMENTS:**
All section header comments that reference the XP System Architecture document are stripped. These aren't just cosmetic — they're the specification references that prevent drift during development:
- "V1 Power Curves (Document Section 7)" — Formula: cost(level) = A × level^B
- "Punch XP Values (Document Section 2.1)" — 8 punches: 1=5.5 through 8=11.0
- "Defense XP Values (Document Section 2.2)" — slip=3.0, roll=4.0, etc.
- "Exercise / Activity XP Rates (Document Section 2.3)" — per-second rates
- "Combo XP Formula (Document Section 2.4)" — XP = (Sum of move base XP) × Length Bonus × Defense Bonus × (Duration / 30)
- "Championship Multiplier (Document Section 2.5)" — Final 2 rounds get 2x on boxing segments
- "Streak Multiplier System (Document Section 6)" — 1.0x to 3.0x
- "Session XP Calculation Pipeline (Document Section 11.1)" — Order of operations
- "Per-Session Cumulative Stats (Document Section 3.4)" — Conservative estimates
- "Prestige Promotion System (Document Section 10)" — Tier advancement rules

**All JSDoc function comments are also stripped.** Every exported function in Lovable has a doc comment explaining what it does, its parameters, and its return value. Replit has none.

**FIX:**
1. Restore `cumulativeXP()` function
2. Pick one name: `ActivityType` or `XPActivityType` — update ALL imports across the entire codebase
3. Restore all documentation comments from Lovable version (these are the spec)

### 2.2 `lib/aiWorkoutParser.ts` — 1,532 → 1,140 lines (392 lines lost / 26%)

This is the KOI parser brain. 26% of it is missing.

**MISSING FUNCTION — `extractExerciseWithDuration()`:**
```typescript
// EXISTS IN LOVABLE, COMPLETELY ABSENT FROM REPLIT
function extractExerciseWithDuration(text: string): { 
  name: string; duration: number | null; raw: string 
} | null {
  const lower = text.trim().toLowerCase();
  
  // Check known exercise patterns (boxing-specific and categories)
  for (const { pattern, name } of EXERCISE_NAMES) {
    if (pattern.test(lower)) {
      // Check for "freestyle" modifier
      const isFreestyle = /freestyle/i.test(lower);
      const finalName = isFreestyle ? `${name} Freestyle` : name;
      
      // Extract duration attached to this exercise
      const dur = parseDurationFromText(text);
      return { name: finalName, duration: dur, raw: text.trim() };
    }
  }
  // ... more logic
}
```
**Impact:** Without this function, the parser cannot correctly extract exercises that have durations attached to them in natural language. Inputs like "3 min heavy bag", "60 sec jump rope freestyle", "2 min shadowboxing" lose their duration context.

**MISSING FUNCTION — `isBoxingBlock()`:**
```typescript
// EXISTS IN LOVABLE, COMPLETELY ABSENT FROM REPLIT
function isBoxingBlock(text: string): boolean {
  const lower = text.toLowerCase();
  return /shadow\s*box|heavy\s*bag|double[\s-]*end\s*bag|sparring|mitt\s*work|bag\s*work/i.test(lower);
}
```
**Impact:** This is used in block classification to determine whether a parsed block should receive boxing-specific treatment (combo assignment, segment type classification). Without it, non-boxing blocks might incorrectly receive combos, or boxing blocks might be misclassified as generic exercises.

**MODIFIED RETURN TYPE — `parseSupersetFromBlock()`:**
```typescript
// LOVABLE returns combos:
{ exercises: SupersetExercise[]; restBetween: number | null; combos: string[][] }

// REPLIT returns NO combos:
{ exercises: SupersetExercise[] | null; restBetween: number | null }
```
**Impact:** Combo data from superset blocks is silently lost during parsing. Any workout with supersets that include combo work will have empty combos in the generated workout.

**RENAMED FUNCTION — `checkPromptQuality()` → `evaluatePromptQuality()`:**
Same logic, different name. Any code that calls `checkPromptQuality()` will fail. Lovable's AIBuilderModal.tsx imports and calls `checkPromptQuality`. If any Replit code references the old name, it's broken.

**ADDED IN REPLIT (good):**
- `parseExerciseSetsFromBlock()` — New function for parsing exercise sets
- `getAdjustedDifficulty()` — History-aware difficulty adjustment
- `getAdjustedRestDuration()` — History-aware rest adjustment
- `getAdjustedRounds()` — History-aware round count adjustment

These are good additions that make the local parser smarter.

**FIX:**
1. Restore `extractExerciseWithDuration()` — critical for natural language duration parsing
2. Restore `isBoxingBlock()` — needed for correct segment type classification
3. Add `combos: string[][]` back to `parseSupersetFromBlock()` return type and populate it
4. Decide on function naming (`checkPromptQuality` vs `evaluatePromptQuality`) and update all callers
5. Restore all documentation comments

### 2.3 `lib/coachEngine.ts` — 718 → 631 lines (87 lines lost / 12%)

All exported functions are identical. The 87-line difference is entirely stripped comments and JSDoc. The logic is intact.

**FIX:** Restore all documentation comments from Lovable for maintainability.

### 2.4 `lib/comboParser.ts` — 330 → 246 lines (84 lines lost / 25%)

Same exported functions, stripped comments only.

**FIX:** Restore documentation comments.

### 2.5 `lib/loadoutGenerator.ts` — 293 → 260 lines (33 lines lost)

Same structure, stripped comments.

**FIX:** Restore documentation comments.

### 2.6 `lib/workoutTracking.ts` — 257 → 191 lines (66 lines lost / 26%)

**INTENTIONAL ARCHITECTURE CHANGE:** Lovable's `computePostLogStats()` is async and queries Supabase for self-healing data. Replit's version is synchronous and computes from local arrays.

```typescript
// LOVABLE — async, queries Supabase for truth
async function computePostLogStats(
  userId: string,
  profile: { last_workout_date: string | null; current_streak: number; longest_streak: number }
) {
  // 1. Self-healing workout count from DB
  const { count } = await supabase.from('workout_history')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  
  // 2. Self-healing total seconds via RPC
  const { data: durationData } = await supabase
    .rpc('get_total_training_seconds', { target_user_id: userId });
  // ... streak logic
}

// REPLIT — synchronous, computes from local data
function computePostLogStats(
  completedWorkouts: CompletedWorkout[],
  profile: UserProfile
) {
  const workoutsCompleted = completedWorkouts.length;
  const totalTrainingSeconds = completedWorkouts.reduce(
    (sum, w) => sum + (w.duration || 0), 0
  );
  // ... streak logic (identical)
}
```

**Impact:**
- No self-healing: If AsyncStorage data gets corrupted, there's no server to validate against
- No cross-device sync
- Streak math is identical between both versions — just different data sources

**The remaining helper functions are all present in Replit and logic-identical:**
- `getTimeOfDayStats()` ✅
- `getDayOfWeekStats()` ✅
- `isDoubleDay()` ✅
- `isHolidayWorkout()` ✅
- `isComeback()` ✅
- `computePostL100Increments()` ✅ (with camelCase field names instead of snake_case)

**FIX:** Acceptable for local-first. When backend is added, convert back to async with server validation.

---

## 3. CRITICAL: 3-Layer AI Generation System Lost

### Lovable's AI Builder Architecture (727 lines in AIBuilderModal.tsx + 537 lines in edge function)

Lovable has a sophisticated 3-layer workout generation system:

```
Layer 1: AI Agent (Gemini 2.5 Flash via Supabase Edge Function)
  ↓ (if fails or returns fallback flag)
Layer 2: Regex Parser (aiWorkoutParser.ts — parseWorkoutInput())
  ↓ (if fails)
Layer 3: Legacy Heuristic Parser (AIBuilderModal.tsx — parseWorkoutPrompt())
```

**Layer 1 — The Edge Function (537 lines):**
Located at `supabase/functions/generate-workout/index.ts`, this calls Gemini 2.5 Flash with a massive system prompt containing:
- Complete output JSON schema for the timer engine
- Boxing notation rules (punches 1-8, all defense moves)
- 14 rules covering phases, combos, warmup/cooldown, supersets, megasets, equipment constraints, difficulty, combo progression
- Tier rules (Rookie/Beginner: punches 1-4 only, Intermediate: 1-6, Advanced/Pro: 1-8)
- Complete example output with annotations
- Auto-repair logic for malformed AI responses (hyphen-joined combos, invalid tokens, missing fields)
- RULE 13: If no grind phase exists, reclassify ALL phases as grind

**Layer 2 — Regex Parser:**
The `parseWorkoutInput()` function in `aiWorkoutParser.ts` — this IS in Replit (with the truncations noted in Section 2.2).

**Layer 3 — Legacy Heuristic:**
The `parseWorkoutPrompt()` function in `AIBuilderModal.tsx` — a simpler prompt-to-workout converter with basic pattern matching.

### What Replit Has
```
User prompt → parseWorkoutInput() (local regex only)
           → parsedResultToWorkout()
           → Workout object
```

**Replit uses ONLY Layer 2.** There is no AI API call. The "AI Builder" label in the UI is misleading — it's pure regex/pattern matching.

**What This Means:**
- Structured inputs like "5 rounds 3 min boxing 1 min rest" work fine
- Creative/natural language inputs like "give me a brutal 20 min session that'll make me cry, heavy on the body work" will produce poor or failed results
- No combo intelligence — the AI generates contextually appropriate, progressively harder combos. The regex parser picks from preset pools.
- No equipment-aware generation — the AI adjusts output based on what gear the user has
- No history-aware difficulty — the AI can factor in recent workout difficulty feedback

### The Edge Function's System Prompt (Key Sections)

**TIER RULES:**
```
- Rookie/Beginner: Punches 1-4 only. Combo length 2-4. No defense moves in combos.
- Intermediate: Punches 1-6. Combo length 3-5. SLIP and ROLL allowed.
- Advanced/Pro: All punches 1-8. Combos 4-8. All defense and movement.
```

**COMBO PROGRESSION RULE (RULE 11):**
```
PROGRESSIVE DIFFICULTY: Combos MUST get harder as the workout progresses. 
Start with simpler, shorter combos in early rounds and build to longer, 
more complex combos in later rounds. Round 1 might be a simple 1-2, 
while the last round could be a full-length combo with defense.
```

**EQUIPMENT CONSTRAINT RULE (RULE 8):**
```
No gloves/wraps does NOT mean no combos. It means no heavy bag, speed bag, 
or double end bag SEGMENTS. The user can still shadowbox WITH combos — 
they throw the combo in the air instead of at a bag.
```

**AUTO-REPAIR LOGIC:**
The edge function includes `autoRepairCombos()` which fixes:
- Hyphen-joined combos like `["1-2-3"]` → `["1","2","3"]`
- Invalid boxing tokens (strips "PUSH", "CHARGE", etc.)
- Fallback to jab-cross if combo is reduced to 1 token
- Missing fields (megasetRepeats, tags, hasWarmup, hasCooldown)
- RULE 13 enforcement (no grind phase → reclassify all as grind)

**Also includes Speech Recognition (Lovable only):**
The AIBuilderModal has Web SpeechRecognition API integration — users can speak their workout requests. Replit has no voice input.

**FIX:**
For immediate local-only operation:
1. The regex parser is adequate for structured inputs
2. Restore the missing parser functions (Section 2.2) to improve coverage
3. Add the `parseWorkoutPrompt()` legacy heuristic as a Layer 2 fallback

For full KOI experience:
4. Add an API call to Gemini or another LLM using the system prompt from the edge function
5. Port the `autoRepairCombos()` function to run on API responses
6. Consider voice input via `expo-speech` (speech-to-text, not just text-to-speech)

---

## 4. CRITICAL: Authentication System Missing

### Lovable Auth Architecture
```
src/contexts/AuthContext.tsx (160 lines)
├── Supabase Auth integration (supabase-js)
├── Session persistence with auto-refresh
├── User profile sync from DB to local Zustand store on login
├── Sign out with full localStorage cleanup
├── Previous user detection for multi-account safety
├── QueryClient invalidation on auth state change
└── Loading state management during session restoration

src/pages/Auth.tsx (236 lines)
├── Login form (email/password)
├── Signup form
├── Toggle between login/signup modes
└── Error display
```

### What Replit Has
Nothing. Zero auth code. The server/routes.ts has an empty route handler. The server/storage.ts has an in-memory Map with basic user CRUD that nothing calls.

### Impact
- No user accounts = no data sync across devices
- No user accounts = Fight Club, follows, community posts, shared workouts all non-functional
- No user accounts = no profile persistence beyond the local device
- The onboarding flow creates a local-only profile in Zustand/AsyncStorage

### FIX
**Option A — Supabase Auth for React Native (recommended when ready):**
- `@supabase/supabase-js` works with React Native
- Use `@react-native-async-storage/async-storage` (already installed) as the auth storage
- Port AuthContext.tsx replacing `localStorage` with AsyncStorage
- Create native Auth screen with email/password
- All 36 Supabase migration files can be applied to a new Supabase project

**Option B — Keep Local-Only for MVP:**
- Acceptable for testing and development
- All data stays on device
- Social features cannot work
- Auth can be bolted on later without major refactoring since stores are already abstracted

**Recommendation:** Option B now, Option A before any public beta.

---

## 5. CRITICAL: Backend / Database Gone

### Lovable Supabase Schema — 14 Tables

```sql
profiles            — User profiles, XP, streaks, prestige, level, stats, equipment,
                      preferences, handle, avatar, weight, height, equipped_glove,
                      unlocked_gloves, combos_landed, total_training_seconds, etc.
workouts            — Saved workout definitions (phases JSONB, tags, difficulty, etc.)
workout_history     — Completed workout logs (XP earned, duration, round_feedback, etc.)
badges              — Earned badge records per user
personal_records    — PR tracking per user
follows             — Social follow relationships (follower_id → following_id)
community_posts     — Fight Club feed posts (workout shares, text posts)
clubs               — Fight clubs / groups
club_members        — Club membership join table
user_roles          — Admin/moderator role assignments
custom_exercises    — User-created exercise library
workout_ratings     — Community workout star ratings
tier_presets        — Tier-specific preset workouts (served to users by tier)
app_config          — App version tracking, feature flags
```

### Lovable Database Functions (RPC)
```sql
handle_new_user()              — Trigger: auto-create profile on auth.users insert
update_updated_at_column()     — Trigger: auto-update timestamps
get_public_profile(user_id)    — Security definer: fetch public profile data safely
get_total_training_seconds(id) — Sum all workout_history durations for a user
get_tier_user_counts()         — Count users per prestige tier
has_role(user_id, role)        — Check if user has admin/moderator role
```

### Lovable Row Level Security (25+ policies)
Every table has RLS policies ensuring users can only read/write their own data, with specific exceptions for public profiles and community posts.

### Lovable Edge Functions (3)
```
generate-workout/index.ts  — 537 lines, Gemini 2.5 Flash AI workout generation
admin-users/index.ts       — Admin user management (list, modify roles)
increment-version/index.ts — Bump app version in app_config table
```

### What Replit Has
```
server/index.ts     — Express server boilerplate (serves static files)
server/routes.ts    — Empty: "put application routes here"
server/storage.ts   — In-memory Map with basic user CRUD (volatile, resets on restart)
server/db.ts        — Empty file
shared/schema.ts    — Single "users" table with id, username, password only
```

**This is a Replit starter template.** It does nothing for Get Clocked. All persistence is via Zustand stores → AsyncStorage.

### FIX
- **Short term:** Delete the server/ and shared/ directories, or leave them as-is. AsyncStorage persistence works for single-device.
- **Long term:** When ready for multi-device/social:
  1. Create a new Supabase project
  2. Apply all 36 migration files from `lovable/supabase/migrations/`
  3. Install `@supabase/supabase-js` in the Expo app
  4. Replace AsyncStorage CRUD with Supabase queries (or add sync layer)
  5. Port edge functions or replace with direct API calls

---

## 6. CRITICAL: All 20 Hooks Missing

Lovable's `src/hooks/` directory contains 20 custom hooks. **Replit has no hooks directory at all.** Some hook logic was absorbed into Zustand stores; most is simply gone.

### Category A: Hooks That Need Immediate Rebuilding (no backend required)

| Hook | Lines | What It Does | Current Replit Status |
|------|-------|-------------|----------------------|
| `useWorkoutStats.ts` | 250 | Calculates period stats (daily/weekly/monthly/all-time), weekly comparisons, average session duration, XP per session, most active day, calorie estimation using MET values and user weight, round counting, intensity tracking | **MISSING** — Stats page does some of this inline but loses weekly comparison logic, calorie calculation, and MET-based estimation. The Lovable version uses `date-fns` for week boundary calculations (`startOfWeek`, `subWeeks`, `isAfter`, `isBefore`, `parseISO`). |
| `useSoundEffects.ts` | 292 | Complete Web Audio API sound synthesis: level-up fanfare (ascending C5-E5-G5-C6 arpeggio + sub-bass + chord), XP tick sound (880→1320Hz sine sweep), warning beep (10-second timer), prestige celebration. All synthesized — no audio files. Static export `playSoundEffect.xp()`, `.levelUp()`, `.prestige()` for use outside hooks. | **COMPLETELY MISSING** — Replit has zero sound effects. No audio feedback on XP gain, level up, round transitions, or prestige. |
| `useSpeechSynthesis.ts` | 108 | Voice synthesis wrapper with preference-aware enable/disable, voice type selection (male/female/system), and utility methods | **MISSING as hook** — Replit uses `expo-speech` directly inline in workout/[id].tsx, which works but is less organized and doesn't respect all preference settings |
| `usePresetSeeding.ts` | 91 | Seeds default starter workouts on first launch so new users don't see an empty workout list. Checks if seeding already happened and skips if so. | **MISSING** — New users get an empty workout list |
| `use-toast.ts` | 186 | Toast notification system with queue management, auto-dismiss, and action buttons | **MISSING** — Replit uses `Alert.alert()` which is a blocking modal, not a toast |

### Category B: Hooks Replaced by Zustand Stores (verify logic parity)

| Hook | Lines | Replit Replacement | Parity Check Needed |
|------|-------|-------------------|---------------------|
| `useWorkouts.ts` | 162 | `workoutStore.ts` | Lovable queries Supabase with `is_archived` filter, reordering, and `useQuery` caching. Replit stores all workouts locally. **Check:** Does Replit handle archived workouts? |
| `useWorkoutHistory.ts` | 104 | `historyStore.ts` | Lovable fetches from Supabase ordered by completed_at. Replit stores locally. **Check:** Is ordering preserved? |
| `useBadges.ts` | 186 | `badgeStore.ts` | Lovable syncs earned badges to/from Supabase. Replit stores locally. **Check:** Does the badge checking logic (checkBadges function) still get called correctly? |
| `useGloves.ts` | 67 | `gloveStore.ts` | Lovable syncs to Supabase profiles.equipped_glove and profiles.unlocked_gloves. Replit stores locally. **Check:** Does glove equip/unlock persist correctly? |
| `useProfile.ts` | 259 | `userStore.ts` (partially) | **SIGNIFICANT LOSS:** Lovable's useProfile includes: `generateHandleFromName()` for creating unique @handles, `getProfileRanking()` for ranking calculation, `addXP()` that writes to both local store AND Supabase, full profile CRUD. Replit's userStore handles XP locally only. **Missing:** Handle generation, profile editing, server-side XP tracking. |

### Category C: Hooks That Require Backend (defer)

| Hook | Lines | What It Does |
|------|-------|-------------|
| `useClubs.ts` | 162 | Fight club CRUD, membership, early adopters club ID constant |
| `useCommunityPosts.ts` | 256 | Community feed (all/following filter), share workout post, post-workout auto-share |
| `useFollows.ts` | 189 | Follow/unfollow, follower/following lists with profiles |
| `useUserSearch.ts` | 65 | Search users by handle with debounce |
| `usePublicProfile.ts` | 71 | Fetch another user's public profile data |
| `useCustomExercises.ts` | 63 | User-created exercise library CRUD |
| `useUserRole.ts` | 35 | Check admin/moderator role |
| `useAppVersion.ts` | 23 | Read app version from DB config |
| `use-mobile.tsx` | 19 | Mobile viewport detection — NOT NEEDED in React Native |

### FIX
1. Create `hooks/` directory in Replit
2. **Priority 1:** Build `useSoundEffects.ts` using `expo-av` — the workout experience feels dead without audio feedback. Key sounds needed:
   - Round start/end bell
   - 10-second warning beep
   - XP earned tick
   - Level-up fanfare
   - Prestige celebration
3. **Priority 2:** Build `useWorkoutStats.ts` — extract the stats calculation from stats.tsx. Include MET-based calorie calculation, weekly comparisons, period stats.
4. **Priority 3:** Build `usePresetSeeding.ts` — new users need starter content
5. **Priority 4:** Build `useToast.ts` or integrate a React Native toast library (react-native-toast-message)
6. **Later:** Port remaining hooks as features are added

---

## 7. MAJOR: 11+ Missing Components

### Priority 1 — Core Gamification (must have for engagement)

#### 7.1 `PostWorkoutSummary.tsx` (470 lines)

**Status: PARTIALLY INLINED.** Replit has a basic post-workout summary screen inside `app/workout/[id].tsx` (~120 lines, starting around line 930). It shows:
- ✅ "WORKOUT COMPLETE" title
- ✅ Total XP earned card
- ✅ XP breakdown (base, streak bonus, badge XP)
- ✅ Level display with XP bar
- ✅ Badges earned list
- ✅ Difficulty rating buttons (Easy/Perfect/Hard)
- ✅ Notes text input
- ✅ Log button

**What Lovable's separate component adds that Replit's inline version is missing:**
- ❌ Animated XP counter (number counts up from 0)
- ❌ Animated level-up transition
- ❌ Badge shape rendering (hexagon, shield, star, diamond, circle) with category-specific colors and glow effects
- ❌ Badge detail modal on tap
- ❌ Prestige prompt integration (shows prestige UI when eligible)
- ❌ Max level celebration (MaxLevelCelebration component for Pro L100)
- ❌ Advanced feedback mode with round-by-round rating
- ❌ SessionXPBreakdown interface exported for use by other components

**FIX:** Extract the inline summary from workout/[id].tsx into a proper `components/workout/PostWorkoutSummary.tsx` component. Add the missing animations and prestige integration.

#### 7.2 `PrestigePrompt.tsx` (245 lines)

**Status: COMPLETELY MISSING.** Replit computes `prestigeEligible` correctly (line 604 of workout/[id].tsx) but **never shows a UI for it**. When a user hits L100 in their tier, nothing happens — they just see the normal summary.

Lovable's PrestigePrompt includes:
- Tier-specific color scheme (each prestige tier has unique bg/text/border/glow colors)
- Tier-specific icon (Shield → Swords → Star → Crown)
- "What changes" explanation (new tier name, XP curve reset, harder progression)
- 2-step confirmation flow ("Are you sure? This is permanent.")
- `getPrestigeChanges()` display showing next tier name, XP curve name, description
- Plays `playSoundEffect.prestige()` on mount
- MaxLevelCelebration sub-component for Pro L100 users

**FIX:** Create `components/workout/PrestigePrompt.tsx`. Wire it into the post-workout flow to show when `sessionResult.prestigeEligible === true`.

#### 7.3 `LevelUpOverlay.tsx` (82 lines)

**Status: PARTIALLY INLINED.** Replit has a basic level-up display (lines 1125-1135 of workout/[id].tsx):
```tsx
{levelUpLevel !== null && (
  <Animated.View entering={FadeIn.duration(300)} style={styles.levelUpOverlay}>
    <View style={styles.levelUpCard}>
      <Text style={[styles.levelUpText, { color: accentColor }]}>LEVEL UP!</Text>
      <Text style={styles.levelUpLevel}>Level {levelUpLevel}</Text>
      <TouchableOpacity onPress={() => setLevelUpLevel(null)} style={styles.levelUpDismiss}>
        <Text style={styles.levelUpDismissText}>Continue</Text>
      </TouchableOpacity>
    </View>
  </Animated.View>
)}
```

**What Lovable's component adds:**
- Full-screen flash animation with tier-specific color (volt/blue/gold)
- CSS keyframe animation: `level-up-flash 2.5s ease-out forwards`
- Large "Level {N}" text with text-shadow glow
- Auto-dismiss after 2.5 seconds
- Plays `playSoundEffect.levelUp()` on mount
- Dark strips at top/bottom to prevent color bleeding into browser chrome/safe areas
- Variant support: volt (default), cooldown (blue), championship (gold)

**FIX:** Extract into `components/ui/LevelUpOverlay.tsx` with Reanimated animations and expo-haptics impact feedback.

### Priority 2 — Important UX

#### 7.4 `RoundFeedbackPanel.tsx` (47 lines)
Per-round difficulty rating during the workout. Small component.
**FIX:** Create `components/workout/RoundFeedbackPanel.tsx`

#### 7.5 `RoadToBMF.tsx` (159 lines)
Visual progression toward BMF (Baddest Motherfucker) achievement — the ultimate Get Clocked goal. Shows milestone dots, current progress, and what's ahead.
**FIX:** Create `components/ui/RoadToBMF.tsx`

#### 7.6 `VerticalXPBar.tsx` (125 lines)
Vertical XP progress bar displayed alongside the timer during workouts. Shows live XP accumulation.
**FIX:** Create `components/ui/VerticalXPBar.tsx` using react-native-svg or Reanimated.

#### 7.7 `BadgeCollection.tsx` (196 lines)
Full badge grid with category filtering, earned/locked states, badge shapes (hexagon/shield/star/diamond/circle), progress bars for unearned badges, and detail modals. Handles both regular badges and post-L100 badges with different category systems.
**FIX:** Create `components/BadgeCollection.tsx`

#### 7.8 `WorkoutPreviewModal.tsx` (282 lines)
Preview a workout before starting — shows phases, segment breakdown, estimated duration, XP estimate, difficulty badge, star rating system, save/customize buttons. Uses TrendingWorkout type.
**FIX:** Create `components/WorkoutPreviewModal.tsx`

### Priority 3 — Extract from Monoliths

#### 7.9 `WorkoutCard.tsx` (82 lines in Lovable, inlined in Replit)
Replit has a WorkoutCard function defined inline at the top of `app/(tabs)/index.tsx`. It works but should be extracted.
**FIX:** Extract to `components/ui/WorkoutCard.tsx`

#### 7.10 `AIBuilderModal.tsx` (727 lines in Lovable, inlined in Replit)
The entire AI builder is crammed into Replit's `build.tsx` (2,098 lines). 
**FIX:** Extract AI builder section into `components/build/AIBuilderSection.tsx`

### Deferred (require backend)
- `SharedWorkoutsModal.tsx` (125 lines) — Share workout to community
- `LiveStreamModal.tsx` (320 lines) — Live workout streaming
- `AddWorkoutModal.tsx` (266 lines) — Manual workout logging with Supabase
- `SortableWorkoutCard.tsx` (123 lines) — Uses @dnd-kit for drag reorder. Replit uses move-up/move-down buttons instead, which is fine for mobile.

---

## 8. MAJOR: Missing Pages

### 8.1 `EditProfile.tsx` (577 lines) — MEDIUM PRIORITY
Full profile editing screen with fields for name, experience level, equipment, goals, avatar, weight, height, and preferences.

**FIX:** Create `app/edit-profile.tsx` and add route from profile tab.

### 8.2 `Auth.tsx` (236 lines) — DEFERRED
Login/signup page. Blocked by auth decision.

### 8.3 `AdminPortal.tsx` (372 lines) — DEFERRED
Admin features: user management, role assignment, app version control.

### 8.4 `BadgeTests.tsx` (661 lines) — LOW PRIORITY
QA testing page for badge system verification. Useful for dev but not user-facing.

---

## 9. MAJOR: Missing Data Files

### 9.1 `data/trendingWorkouts.ts`

**Completely absent from Replit.** Contains:
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

The array is empty (trending presets come from DB via `useTierPresets`), but the type and category constants are used by other components.

**FIX:** Create `data/trendingWorkouts.ts` with these exports.

---

## 10. MAJOR: Monolith Pages Need Decomposition

### 10.1 `app/build.tsx` — 2,098 lines

This single file contains what Lovable splits across 5+ files:

| Responsibility | Lovable File | Lines |
|---|---|---|
| Build page orchestration | `pages/Build.tsx` | 1,636 |
| AI Builder modal | `components/AIBuilderModal.tsx` | 727 |
| Exercise picker | `components/ExercisePickerModal.tsx` | 278 |
| Workout preview | `components/WorkoutPreviewModal.tsx` | 282 |
| Add workout modal | `components/AddWorkoutModal.tsx` | 266 |

**Target decomposition:**
```
app/build.tsx                              (~500 lines) — Orchestration, state management
components/build/AIBuilderSection.tsx       (~500 lines) — AI prompt, quality check, parsing
components/build/PhaseEditor.tsx            (~400 lines) — Phase CRUD
components/build/SegmentEditor.tsx          (~300 lines) — Segment editing within phases
components/WorkoutPreviewModal.tsx          (~200 lines) — Preview before save
components/ui/ExercisePickerModal.tsx       (already exists at 438 lines)
```

### 10.2 `app/workout/[id].tsx` — 2,026 lines

This single file contains what Lovable splits across 4+ files:

| Responsibility | Lovable File | Lines |
|---|---|---|
| Workout timer session | `pages/WorkoutSession.tsx` | 1,535 |
| Post-workout summary | `components/workout/PostWorkoutSummary.tsx` | 470 |
| Prestige prompt | `components/workout/PrestigePrompt.tsx` | 245 |
| Round feedback | `components/workout/RoundFeedbackPanel.tsx` | 47 |
| Level-up overlay | `components/ui/LevelUpOverlay.tsx` | 82 |
| Vertical XP bar | `components/ui/VerticalXPBar.tsx` | 125 |

**Target decomposition:**
```
app/workout/[id].tsx                         (~600 lines) — Timer screen, state
components/workout/PostWorkoutSummary.tsx     (~400 lines) — Post-workout
components/workout/PrestigePrompt.tsx         (~250 lines) — Prestige flow
components/workout/RoundFeedbackPanel.tsx     (~50 lines)  — Round feedback
components/workout/TimerArc.tsx              (~200 lines) — Arc display
components/workout/WorkoutControls.tsx       (~150 lines) — Play/pause/skip
components/ui/LevelUpOverlay.tsx             (~100 lines) — Level up animation
```

---

## 11. MODERATE: Sound Effects System Missing

Lovable has a complete Web Audio API sound synthesis system (292 lines in `useSoundEffects.ts`). Every sound is generated from oscillators — no audio files needed.

### Sounds in Lovable that Replit is missing:

| Sound | Trigger | Implementation |
|---|---|---|
| XP Tick | XP earned during workout | 880→1320Hz sine sweep, 150ms |
| Level Up Fanfare | Level up during or after workout | Ascending arpeggio (C5-E5-G5-C6) + sub-bass + chord, ~2.5s |
| Warning Beep | 10 seconds remaining in round | Short beep tone |
| Prestige Celebration | Prestige tier advancement | Special celebratory tone |

### Also has static export for use outside React components:
```typescript
export const playSoundEffect = {
  xp: () => { /* ... */ },
  levelUp: () => { playLevelUpSoundImpl(); },
  prestige: () => { /* ... */ },
};
```

This is called from `userStore.ts` `addXP()` method (on level up) and from `LevelUpOverlay.tsx` (on mount).

### FIX
For React Native, use `expo-av` for audio:
1. Create `hooks/useSoundEffects.ts`
2. Option A: Synthesize with `expo-av` Audio API (harder but no files needed)
3. Option B: Include small audio files in assets/ and play them (easier, more reliable)
4. Add `playSound` parameter back to `userStore.addXP()` method
5. Integrate haptic feedback via `expo-haptics` alongside sounds

---

## 12. MODERATE: Type System Differences

### 12.1 Date Types
```typescript
// Lovable (Date objects)
createdAt: Date;
lastActiveAt: Date;

// Replit (ISO strings)
createdAt: string;
lastActiveAt: string;
```
**Verdict:** Replit's approach is correct for AsyncStorage serialization. No fix needed.

### 12.2 Replit Added Fields (Good)
Replit's UserProfile includes all post-L100 tracking fields directly in the type since there's no DB:
```typescript
lastWorkoutDate?: string | null;
totalTrainingSeconds?: number;
morningWorkouts?: number;
nightWorkouts?: number;
weekendWorkouts?: number;
// ... 20+ tracking fields
equippedGlove?: string;
```
**Verdict:** Correct for local-first. No fix needed.

### 12.3 ActivityType vs XPActivityType
As noted in Section 2.1 — this is a breaking rename. Pick one and update everywhere.

---

## 13. MODERATE: Store Differences

### 13.1 `userStore.ts` — Missing Sound Integration
Lovable's `addXP()`:
```typescript
addXP: (amount, playSound = false) => set((state) => {
  // ... XP calculation ...
  if (newLevel > currentLevel) {
    playSoundEffect.levelUp();  // 🔊 PLAYS LEVEL UP SOUND
  } else if (playSound) {
    playSoundEffect.xp();       // 🔊 PLAYS XP TICK SOUND
  }
  // ...
});
```

Replit's `addXP()`:
```typescript
addXP: (amount) => set((state) => {
  // ... XP calculation only, no sound ...
});
```

**FIX:** After implementing sound effects, add `playSound` parameter and sound calls back.

### 13.2 New Replit Stores (Good)
- `badgeStore.ts` (49 lines) — Tracks earned badges and badge stats locally
- `gloveStore.ts` (22 lines) — Tracks equipped and unlocked gloves locally

These are correct additions for the local-first architecture.

---

## 14. MODERATE: Naming Convention Conflicts

The Replit conversion changed field naming from snake_case (Supabase convention) to camelCase (JS convention) in `workoutTracking.ts`:

| Lovable field (snake_case) | Replit field (camelCase) |
|---|---|
| `morning_workouts` | `morningWorkouts` |
| `night_workouts` | `nightWorkouts` |
| `weekend_workouts` | `weekendWorkouts` |
| `weekday_workouts` | `weekdayWorkouts` |
| `monday_workouts` | `mondayWorkouts` |
| `friday_workouts` | `fridayWorkouts` |
| `sunday_workouts` | `sundayWorkouts` |
| `double_days` | `doubleDays` |
| `holiday_workouts` | `holidayWorkouts` |
| `new_years_workout` | `newYearsWorkout` |
| `best_session_xp` | `bestSessionXp` |
| `post_l100_sessions` | `postL100Sessions` |
| `overflow_xp` | `overflowXp` |
| `comeback_count` | `comebackCount` |
| `punch_1_count` through `punch_8_count` | `punch1Count` through `punch8Count` |
| `slips_count` | `slipsCount` |
| `rolls_count` | `rollsCount` |
| `pullbacks_count` | `pullbacksCount` |
| `circles_count` | `circlesCount` |
| `last_workout_date` | `lastWorkoutDate` |
| `current_level` | `currentLevel` |

Replit's `computePostL100Increments()` has fallbacks for both:
```typescript
const currentLevel = profile.current_level || profile.currentLevel || 1;
```

**FIX:** When codebase stabilizes, commit to camelCase for RN and remove dual-convention fallbacks.

---

## 15. What Transferred Well

These are correct and need no changes:

- **Navigation** — Expo Router tabs correctly mirror Lovable (Home, Stats, Fight Club, Profile)
- **Tab layout** — Beautiful implementation with liquid glass detection (`isLiquidGlassAvailable()`) for iOS 26
- **Zustand stores** — All 4 Lovable stores ported + 2 new useful stores added
- **Core data files** — badges.ts (23KB), comboPools.ts (13KB), comboPresets.ts, gloves.ts (11KB), postL100Badges.ts (47KB), presetComboLibrary.ts (22KB), speedBagDrills.ts — all present and intact
- **Color system** — Well-organized in `constants/colors.ts` with PRESTIGE_COLORS, BADGE_CATEGORY_COLORS_NATIVE
- **AsyncStorage persistence** — All stores correctly use `createJSONStorage(() => AsyncStorage)`
- **Error handling** — ErrorBoundary.tsx and ErrorFallback.tsx (Lovable didn't have these)
- **Keyboard handling** — KeyboardAwareScrollViewCompat.tsx and react-native-keyboard-controller
- **Native platform features** — expo-haptics, expo-speech, react-native-reanimated, SafeAreaView, gesture handler
- **Timer engine** — Core timer logic in timerStore.ts is intact
- **Arc timer UI** — Animated SVG arc with Reanimated shared values
- **Workout session** — Segment navigation, XP tracking, preparation countdown all work
- **Post-workout summary** — Basic version exists inline (needs extraction + enhancement)
- **Level-up display** — Basic version exists inline (needs extraction + enhancement)
- **Live badge tracking** — Badge checking during workout with XP pop animations
- **Glove unlock detection** — Post-workout glove unlock overlay working

---

## 16. Recommended Fix Priority Order

### Phase 1: Core Logic Parity (Foundation — Do First)
1. Restore `cumulativeXP()` to xpSystem.ts
2. Fix `ActivityType` vs `XPActivityType` naming — pick one, update everywhere
3. Restore `extractExerciseWithDuration()` to aiWorkoutParser.ts
4. Restore `isBoxingBlock()` to aiWorkoutParser.ts
5. Fix `parseSupersetFromBlock()` to return `combos: string[][]`
6. Restore all documentation comments across all lib files
7. Create `data/trendingWorkouts.ts`

### Phase 2: Sound & Gamification Payoff (Engagement — Critical UX)
8. Create `hooks/useSoundEffects.ts` with expo-av
9. Extract + enhance PostWorkoutSummary into standalone component with animations
10. Create `components/workout/PrestigePrompt.tsx` — the prestige flow
11. Extract + enhance LevelUpOverlay into standalone component
12. Add `playSound` parameter back to `userStore.addXP()`
13. Add haptic feedback integration via expo-haptics

### Phase 3: Missing Hooks & Stats
14. Create `hooks/useWorkoutStats.ts` — extract stats calculation from stats.tsx, add calorie estimation, weekly comparisons
15. Create `hooks/usePresetSeeding.ts` — starter workouts for new users
16. Create `hooks/useToast.ts` or integrate toast library

### Phase 4: Component Extraction & Code Quality
17. Decompose `build.tsx` (2,098 lines → 5+ files)
18. Decompose `workout/[id].tsx` (2,026 lines → 6+ files)
19. Extract WorkoutCard from index.tsx
20. Create RoundFeedbackPanel component
21. Create BadgeCollection component
22. Create WorkoutPreviewModal component
23. Create RoadToBMF component
24. Create VerticalXPBar component

### Phase 5: Missing Pages
25. Create EditProfile screen
26. Create BadgeTests screen (dev only)

### Phase 6: AI Enhancement
27. Add `parseWorkoutPrompt()` legacy heuristic as parser fallback
28. Add API call to Gemini/LLM with the KOI system prompt from the edge function
29. Port `autoRepairCombos()` for cleaning AI responses
30. Consider voice input via speech-to-text

### Phase 7: Backend & Social (When Ready)
31. Set up Supabase project, apply 36 migration files
32. Add Supabase auth (email/password)
33. Create AuthContext for React Native
34. Create Auth screen
35. Add data sync layer (local + cloud)
36. Enable Fight Club, follows, community posts
37. Port tier_presets system
38. Add workout ratings
39. Add custom exercises
40. Create EditProfile with server sync

---

## Appendix A: Complete File Mapping

### Pages: Lovable → Replit
| Lovable Page | Replit Screen | Status |
|---|---|---|
| `pages/Index.tsx` (288 lines) | `app/(tabs)/index.tsx` (532 lines) | ✅ Ported (expanded with inline WorkoutCard) |
| `pages/Build.tsx` (1,636 lines) | `app/build.tsx` (2,098 lines) | ⚠️ Ported but bloated (absorbed 4 modals) |
| `pages/WorkoutSession.tsx` (1,535 lines) | `app/workout/[id].tsx` (2,026 lines) | ⚠️ Ported but bloated (absorbed 4 components) |
| `pages/Stats.tsx` (425 lines) | `app/(tabs)/stats.tsx` (1,147 lines) | ✅ Ported (expanded with inline calculations) |
| `pages/Profile.tsx` (487 lines) | `app/(tabs)/profile.tsx` (691 lines) | ✅ Ported |
| `pages/FightClub.tsx` (1,172 lines) | `app/(tabs)/fight-club.tsx` (747 lines) | ⚠️ Ported but reduced (social features stubbed) |
| `pages/History.tsx` (421 lines) | `app/history.tsx` (1,355 lines) | ✅ Ported (expanded) |
| `pages/Settings.tsx` (341 lines) | `app/settings.tsx` (671 lines) | ✅ Ported |
| `pages/Onboarding.tsx` (589 lines) | `app/onboarding.tsx` (692 lines) | ✅ Ported |
| `pages/Gloves.tsx` (149 lines) | `app/gloves.tsx` (350 lines) | ✅ Ported |
| `pages/QuickSession.tsx` (374 lines) | `app/quick-session.tsx` (798 lines) | ✅ Ported |
| `pages/Auth.tsx` (236 lines) | — | ❌ Missing |
| `pages/EditProfile.tsx` (577 lines) | — | ❌ Missing |
| `pages/AdminPortal.tsx` (372 lines) | — | ❌ Missing |
| `pages/BadgeTests.tsx` (661 lines) | — | ❌ Missing |
| `pages/NotFound.tsx` (15 lines) | `app/+not-found.tsx` (39 lines) | ✅ Ported |

### Lib: Lovable → Replit
| Lovable File | Replit File | Lines (L→R) | Status |
|---|---|---|---|
| `lib/xpSystem.ts` | `lib/xpSystem.ts` | 600→441 | ⚠️ Missing cumulativeXP(), renamed ActivityType, stripped docs |
| `lib/aiWorkoutParser.ts` | `lib/aiWorkoutParser.ts` | 1,532→1,140 | ⚠️ Missing 3 functions, modified superset return, stripped docs |
| `lib/coachEngine.ts` | `lib/coachEngine.ts` | 718→631 | ⚠️ Logic intact, stripped docs |
| `lib/comboParser.ts` | `lib/comboParser.ts` | 330→246 | ⚠️ Logic intact, stripped docs |
| `lib/loadoutGenerator.ts` | `lib/loadoutGenerator.ts` | 293→260 | ⚠️ Logic intact, stripped docs |
| `lib/workoutTracking.ts` | `lib/workoutTracking.ts` | 257→191 | ⚠️ Rewritten for local (acceptable) |
| `lib/utils.ts` | `lib/utils.ts` | 6→68 | ✅ Expanded with formatTime, formatDuration, generateId |
| `types/index.ts` | `lib/types.ts` | 264→235 | ✅ Moved, slightly modified |
| — | `lib/query-client.ts` | —→80 | ✅ New |

### Data: Lovable → Replit
| File | Lovable Lines | Replit Lines | Status |
|---|---|---|---|
| `data/badges.ts` | Similar | 23KB | ✅ |
| `data/comboPools.ts` | Similar | 13KB | ✅ |
| `data/comboPresets.ts` | Similar | 2KB | ✅ |
| `data/gloves.ts` | Similar | 11KB | ✅ |
| `data/postL100Badges.ts` | Similar | 47KB | ✅ |
| `data/presetComboLibrary.ts` | Similar | 22KB | ✅ |
| `data/presetWorkouts.ts` | 9 (empty) | 8 (empty) | ✅ |
| `data/speedBagDrills.ts` | Similar | 6.5KB | ✅ |
| `data/trendingWorkouts.ts` | 19 | — | ❌ Missing |

### Stores: Lovable → Replit
| Store | Lovable Lines | Replit Lines | Status |
|---|---|---|---|
| `userStore.ts` | 111 | 103 | ⚠️ Missing sound integration in addXP |
| `workoutStore.ts` | 157 | 177 | ✅ Expanded (handles what useWorkouts hook did) |
| `timerStore.ts` | 197 | 187 | ✅ |
| `historyStore.ts` | 38 | 40 | ✅ |
| `badgeStore.ts` | — | 49 | ✅ New (replaces useBadges hook) |
| `gloveStore.ts` | — | 22 | ✅ New (replaces useGloves hook) |

---

## Appendix B: Lovable Reference Files

When porting missing features, use these Lovable source files as the authoritative reference. These are in the uploaded zip at `getclocked-main/src/`:

### Core Logic (restore missing functions/docs)
```
lib/xpSystem.ts              — 600 lines, complete XP architecture with doc references
lib/aiWorkoutParser.ts       — 1,532 lines, full parser with all functions
lib/coachEngine.ts           — 718 lines, documented coach logic
lib/comboParser.ts           — 330 lines, documented combo parsing
lib/loadoutGenerator.ts      — 293 lines, documented loadout generation
lib/workoutTracking.ts       — 257 lines, Supabase-integrated tracking
```

### Missing Components (port to React Native)
```
components/workout/PostWorkoutSummary.tsx  — 470 lines, full post-workout screen
components/workout/PrestigePrompt.tsx      — 245 lines, prestige advancement + MaxLevelCelebration
components/workout/RoundFeedbackPanel.tsx  — 47 lines, per-round rating
components/ui/LevelUpOverlay.tsx           — 82 lines, full-screen level up animation
components/ui/RoadToBMF.tsx                — 159 lines, BMF progression display
components/ui/VerticalXPBar.tsx            — 125 lines, workout-side XP bar
components/ui/WorkoutCard.tsx              — 82 lines, workout list card
components/BadgeCollection.tsx             — 196 lines, full badge grid + detail modal
components/AIBuilderModal.tsx              — 727 lines, 3-layer AI + speech + prompt quality
components/WorkoutPreviewModal.tsx         — 282 lines, preview + rating + save
components/AddWorkoutModal.tsx             — 266 lines, manual workout entry
```

### Missing Hooks (rebuild for local-first RN)
```
hooks/useWorkoutStats.ts     — 250 lines, period stats, MET calories, weekly changes
hooks/useSoundEffects.ts     — 292 lines, Web Audio synthesis (port to expo-av)
hooks/useSpeechSynthesis.ts  — 108 lines, voice wrapper
hooks/usePresetSeeding.ts    — 91 lines, starter content seeding
hooks/useProfile.ts          — 259 lines, handle generation, ranking, XP sync
hooks/use-toast.ts           — 186 lines, toast notification system
```

### Missing Data
```
data/trendingWorkouts.ts     — 19 lines, TrendingWorkout type + WORKOUT_CATEGORIES
```

### AI Edge Function (for future API integration)
```
supabase/functions/generate-workout/index.ts — 537 lines
  Contains: Complete KOI system prompt, 14 rules, tier constraints, 
  example output, auto-repair logic, combo validation
```

### Missing Pages
```
pages/EditProfile.tsx        — 577 lines
pages/Auth.tsx               — 236 lines (when auth is added)
pages/BadgeTests.tsx         — 661 lines (dev tool)
pages/AdminPortal.tsx        — 372 lines (when admin is added)
```

---

## Appendix C: Complete Supabase Schema

For when the backend is set up. These are the tables created across 36 migration files:

### profiles
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES auth.users(id) — UNIQUE
name TEXT DEFAULT 'Fighter'
role TEXT CHECK (role IN ('fighter', 'coach'))
avatar_url TEXT
experience_level TEXT DEFAULT 'beginner'
equipment JSONB DEFAULT '{}'
goals TEXT[] DEFAULT '{}'
total_xp INTEGER DEFAULT 0
current_streak INTEGER DEFAULT 0
longest_streak INTEGER DEFAULT 0
workouts_completed INTEGER DEFAULT 0
preferences JSONB DEFAULT '{"voiceType":"system","soundEnabled":true,...}'
last_active_at TIMESTAMP WITH TIME ZONE
created_at, updated_at TIMESTAMPS
-- Added later:
prestige TEXT DEFAULT 'rookie'
current_level INTEGER DEFAULT 1
combos_landed INTEGER DEFAULT 0
total_training_seconds INTEGER DEFAULT 0
sessions_completed_this_year INTEGER DEFAULT 0
last_workout_date DATE
streak_multiplier DECIMAL(3,2) DEFAULT 1.0
handle TEXT (UNIQUE INDEX)
weight_kg NUMERIC
height_cm NUMERIC
equipped_glove TEXT DEFAULT 'default'
unlocked_gloves JSONB DEFAULT '["default"]'
```

### workouts
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES auth.users(id)
name TEXT NOT NULL
description TEXT
duration INTEGER DEFAULT 0
difficulty TEXT DEFAULT 'beginner'
phases JSONB DEFAULT '[]'
tags TEXT[] DEFAULT '{}'
is_preset BOOLEAN DEFAULT false
is_archived BOOLEAN DEFAULT false
times_completed INTEGER DEFAULT 0
last_used_at TIMESTAMP
sort_order INTEGER  -- for drag-reorder
created_at, updated_at TIMESTAMPS
```

### workout_history
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES auth.users(id)
workout_id UUID REFERENCES workouts(id) ON DELETE SET NULL
workout_name TEXT
completed_at TIMESTAMP DEFAULT now()
duration INTEGER DEFAULT 0
xp_earned INTEGER DEFAULT 0
difficulty TEXT
notes TEXT
is_manual_entry BOOLEAN DEFAULT false
round_feedback JSONB DEFAULT '[]'
```

### Additional tables: badges, personal_records, follows, community_posts, clubs, club_members, user_roles, custom_exercises, workout_ratings, tier_presets, app_config

All migration files are at: `lovable/supabase/migrations/`

---

*This document is the master reference for restoring the Replit mobile app to feature parity with the Lovable web app. Work through the phases in order — core logic first, then gamification payoff, then hooks, then decomposition, then pages, then AI, then backend.*
