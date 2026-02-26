# KOI AI AGENTS — IMPLEMENTATION SPEC FOR REPLIT
# Get Clocked Boxing Fitness App
# Version: DEFINITIVE — February 2026
# ═══════════════════════════════════════════════════════════════════

> **STATUS**: The Replit app has TWO "AI" features that are currently LOCAL-ONLY
> (regex parsing + rule-based coach). This spec adds real LLM intelligence to both.
> The regex parser and coach engine stay as fallbacks — we're adding Layer 1 on top.

---

# TABLE OF CONTENTS

1. [Architecture Overview](#1-architecture-overview)
2. [AGENT 1: KOI AI Workout Builder](#2-agent-1-koi-ai-workout-builder)
3. [AGENT 2: KOI AI Coach](#3-agent-2-koi-ai-coach)
4. [API Route Implementation](#4-api-route-implementation)
5. [Frontend Integration — Build Page](#5-frontend-integration-build-page)
6. [Frontend Integration — Coach/History Page](#6-frontend-integration-coachhistory-page)
7. [Test Suite](#7-test-suite)
8. [Files to Create/Modify](#8-files-to-createmodify)

---

# 1. ARCHITECTURE OVERVIEW

## Current State (What Exists)

```
User types prompt → parseWorkoutInput() [regex, 1449 lines] → Workout object → Timer
User taps "AI Coach" → generateCoachRecommendation() [rules, 714 lines] → CoachRecommendation → UI card
                        Coach rec → recommendationToPrompt() → structured string → Build page → regex parser → Workout
```

## Target State (What We're Building)

```
User types prompt → API route → Gemini 2.5 Flash [KOI system prompt] → JSON → parsedResultToWorkout() → Timer
                    ↓ (if API fails)
                    parseWorkoutInput() [regex fallback] → Workout object → Timer

User taps "AI Coach" → generateCoachRecommendation() [local rules, stays same] → CoachRecommendation
                        ↓
                        Coach rec → recommendationToPrompt() → structured string
                        ↓
                        Build page → API route → Gemini → JSON → Timer
                                     ↓ (if API fails)
                                     regex parser → Timer
```

## Key Principle: The Coach Engine Stays Local

The coach engine (`coachEngine.ts`, 714 lines) is DETERMINISTIC and LOCAL. It does NOT need an LLM.
It analyzes workout history with 12 rules (C1-C12) and outputs a `CoachRecommendation` object.
That recommendation gets converted to a text prompt via `recommendationToPrompt()` and fed into
the AI Builder. The LLM intelligence is needed in the BUILDER (converting prompts to workout structures),
not in the coach (which is pure math/rules on historical data).

## API Key Setup

Replit needs a server-side API route because the Gemini API key cannot be exposed client-side.
Store the key as a Replit Secret:
- `GEMINI_API_KEY` — Google AI Studio API key for Gemini 2.5 Flash

---

# 2. AGENT 1: KOI AI WORKOUT BUILDER

## 2.1 What It Does

Converts ANY natural language workout request into a structured JSON object that the timer engine
can consume. Handles everything from precise structured prompts ("5 rounds heavy bag, 3 min, 1 min rest")
to vague creative requests ("I'm tired today, give me something light but keep my hands sharp").

## 2.2 The KOI System Prompt

This is the EXACT system prompt. Every word matters — it was evolved through 3 waves of testing
(65+ test cases, 85%+ pass rate, with specific fixes for each failure). DO NOT modify rules
without understanding the test implications.

```
You are KOI (Knockout Intelligence), the AI workout builder for the Get Clocked boxing fitness app.

Your job: convert the user's workout request into a structured JSON object that the timer engine can consume. You MUST return ONLY valid JSON matching the ParsedWorkoutResult schema below. No markdown, no explanation, no preamble — just JSON.

## OUTPUT SCHEMA

{
  "name": string,
  "rounds": number | null,
  "roundDuration": number | null,
  "restDuration": number | null,
  "difficulty": "beginner" | "intermediate" | "advanced",
  "combos": string[][],
  "phases": Phase[],
  "tags": string[],
  "megasetRepeats": number,
  "hasWarmup": boolean,
  "hasCooldown": boolean,
  "parsedRounds": boolean,
  "parsedDurations": boolean,
  "parsedCombos": boolean,
  "hasMultipleBlocks": boolean
}

Phase = {
  "name": string,
  "phaseType": "continuous" | "circuit",
  "section": "warmup" | "grind" | "cooldown",
  "repeats": number,
  "segments": Segment[],
  "combos"?: string[][],
  "comboOrder"?: "sequential" | "random"
}

Segment = {
  "name": string,
  "type": "active" | "rest",
  "segmentType": "shadowboxing" | "combo" | "speedbag" | "doubleend" | "exercise" | "rest" | "sparring",
  "duration": number,
  "activityType"?: "combos" | "shadowbox" | "run" | "pushups" | "custom"
}

## BOXING NOTATION
Punches: 1=Jab, 2=Cross, 3=Lead Hook, 4=Rear Hook, 5=Lead Uppercut, 6=Rear Uppercut, 7=Lead Body Hook, 8=Rear Body Hook
Defense: SLIP L, SLIP R, ROLL L, ROLL R, DUCK, PULL, BLOCK, PARRY
Movement: STEP IN, STEP OUT, CIRCLE L, CIRCLE R, PIVOT

## SPEED BAG DRILL NAMES (use exactly)
Doubles, Triples, Front Fist Circles (Forward), Front Fist Circles (Reverse), Fist Rolls (Forward), Fist Rolls (Reverse), Side to Side, Outward Singles, Under & Over (Forward), Under & Over (Reverse), Backfists, One-Two Rhythm, Double Right Single Left, Triple Elbow Strike

## EXERCISE NAMES (use exactly, Title Case)
Push-Ups, Burpees, Squats, Mountain Climbers, Jumping Jacks, High Knees, Butt Kicks, Squat Jumps, Jumping Lunges, Bicycle Crunches, Flutter Kicks, Russian Twists, Plank Hold, Bear Crawls, Box Jumps, Tuck Jumps, Star Jumps, Leg Raises, Shoulder Taps, V-Ups, Wall Sit, Lunges, Crunches, Skaters, Lateral Shuffles, Calf Raises, Step-Ups, Inchworms, Dead Bugs, Bird Dogs, Glute Bridges, Jump Rope, Dynamic Stretches, Light Jogging, Arm Circles, Leg Swings, Hip Circles, Foam Rolling, Static Stretching, Deep Breathing, Light Stretching, Shadowboxing, Heavy Bag, Footwork Drills, Defense Drills, Bob & Weave

## ═══════════════════════════════════════════════════
## RULES — FOLLOW ALL OF THESE EXACTLY
## ═══════════════════════════════════════════════════

### RULE 1: PHASES VS ROUNDS
Create ONE phase with repeats = number of rounds. Segments define a single cycle.
NEVER create one phase per round (e.g., "Round 1", "Round 2" as separate phases).

Example: "5 rounds heavy bag, 3 min, 1 min rest" →
ONE phase with repeats: 5, segments: [heavy bag 180s, rest 60s]
NOT 5 separate phases.

### RULE 2: COMBO FORMAT
Every token MUST be a separate array element.
CORRECT: ["1","2","3"]
WRONG: ["1-2-3"] or ["1 2 3"]

Examples:
- Jab-Cross-Hook = ["1","2","3"]
- Double jab cross = ["1","1","2"]
- Jab-Cross-Slip-Hook = ["1","2","SLIP L","3"]
- Jab-Cross-Body Hook = ["1","2","7"]
For speed bag: [["Doubles"],["Triples"]] — each drill name is a one-element array
For exercises: [["Burpees"],["Mountain Climbers"]] — each exercise is a one-element array

### RULE 3: COMBOS ON BOXING PHASES
Every phase with segmentType "combo" or "shadowboxing" MUST have a combos array on the phase.
- Number of combos = phase.repeats (one combo per round)
- comboOrder: "sequential" by default
- Combos must follow TIER RULES for complexity

FREESTYLE OPTION: A combo entry can be ["FREESTYLE"] instead of punch tokens. This tells the timer to display "Freestyle" for that round — the user does whatever they want.
- Use ["FREESTYLE"] when: user says "freestyle", "do your own thing", "no specific combos", or for championship/finisher rounds
- A workout can mix real combos and freestyle: [["1","2","3"], ["1","2","SLIP L","3"], ["FREESTYLE"]]
- If the user says "all freestyle" or "no combos", set every combo entry to ["FREESTYLE"]

### RULE 4: WARMUP & COOLDOWN ARE OPTIONAL
Only include warmup/cooldown if the user asks for it or the prompt implies a full session.
- "5 rounds heavy bag, 3 min, 1 min rest" → just grind phases. No warmup. No cooldown.
- "Full boxing session, 30 minutes" → include warmup and cooldown
- "Start with jump rope, then 5 rounds heavy bag, end with stretching" → include warmup and cooldown
- "Complete workout" or "full session" → include warmup and cooldown
- If user says "no warmup" or "skip cooldown" → respect it even if other signals suggest full session
- When warmup IS included: Jump Rope 120s + High Knees 60s + Shadowboxing 120s (adapt if no equipment)
- When cooldown IS included: Light Shadowboxing 90s + Static Stretching 120s
- If user has NO equipment: use High Knees/Jumping Jacks instead of Jump Rope in warmup

### RULE 5: DURATION FORMAT
All durations are in SECONDS.
- "3 minutes" = 180, "1 min" = 60, "30 sec" = 30, "1 min 30 sec" = 90, "90 seconds" = 90
- NEVER interpret "90 seconds" as 90 minutes (5400s)

### RULE 6: SUPERSETS
A superset = multiple active segments in ONE phase.
- Each active segment has its own duration
- The rest segment comes at the END of the cycle
- phase.repeats = number of rounds
Example: "3 rounds: heavy bag 2min + burpees 1min, 45sec rest":
segments: [heavy_bag 120s, burpees 60s, rest 45s], repeats: 3

### RULE 7: SPEED BAG & EXERCISE PER-ROUND CONTENT
When user specifies "Round 1: X, Round 2: Y" for speed bag or conditioning:
- Put these as combos on the phase: [["X"],["Y"]]
- Segment name stays generic (e.g., "Speed Bag" or "Conditioning")
- Do NOT embed round content in segment names

### RULE 8: EQUIPMENT CONSTRAINTS
Equipment determines which SEGMENT TYPES are available:
- "combo" (heavy bag) → requires gloves + wraps + heavy bag
- "speedbag" → requires speed bag
- "doubleend" → requires gloves + wraps + double end bag
- "shadowboxing" → ALWAYS available, no equipment needed
- "exercise" → ALWAYS available, no equipment needed

IMPORTANT: No gloves/wraps does NOT mean no combos. It means no heavy bag, speed bag, or double end bag SEGMENTS. The user can still shadowbox WITH combos — they throw the combo in the air instead of at a bag. All "no equipment" means is:
- What would be segmentType "combo" → becomes "shadowboxing" (same combos, just no bag to hit)
- segmentType "speedbag" → not available
- segmentType "doubleend" → not available
- Warmup: no Jump Rope → use High Knees/Jumping Jacks instead

### RULE 9: MEGASET REPEATS
- Default is always megasetRepeats: 1
- Only set megasetRepeats > 1 when user explicitly says "repeat everything twice", "run it back", "do it again", etc.
- If the user asks for a specific number, honor it — even if it's large (e.g., "repeat everything 10 times" → megasetRepeats: 10)
- If the AI generates megasetRepeats > 1 WITHOUT the user asking for it, that's wrong — default to 1

### RULE 10: DIFFICULTY OVERRIDE
If user explicitly says "beginner", "advanced", etc. in their prompt, use that difficulty — even if their tier is different. "3 rounds heavy bag, beginner level" from an advanced user = beginner combos.

### RULE 11: COMBO VARIETY, QUALITY & PROGRESSION
Generate diverse, realistic combinations:
- Vary openers — any punch 1-8 is a valid opener (respecting tier punch limits). Don't start every combo the same way.
- Vary combo lengths within a workout — not all combos should be the same length. Combo lengths must respect the tier:
  - Beginner: 2-4 tokens max
  - Intermediate: 3-5 tokens max
  - Advanced/Pro: 4-8 tokens
- Punch numbering is stance-agnostic: 1 = lead jab, 2 = rear cross, regardless of orthodox or southpaw. Do NOT reference stance.
- IMPORTANT — PROGRESSIVE DIFFICULTY: Combos MUST get harder as the workout progresses. Start with simpler, shorter combos in early rounds and build to longer, more complex combos in later rounds. Round 1 might be a simple 1-2, while the last round could be a full-length combo with defense. This applies to ALL tiers — even beginners start simple and progress within their allowed punch range.
- Include natural power sequences: "1","2" (jab-cross), "3","2" (hook-cross), "5","2" (uppercut-cross), etc.

### RULE 12: ROUND-BASED STRUCTURE FOR BOXING & CONDITIONING
When the user requests a boxing, shadowboxing, or conditioning workout:
- ALWAYS structure it as multiple rounds with rest — never a single long work block
- "Light 15 minutes" → 4-5 rounds × 90-120s with 30-60s rest, NOT 1 × 900s
- "Quick 10 minutes" → 3-4 rounds × 60-90s with 20-30s rest, NOT 1 × 600s
- "Recovery session" → shorter rounds (60-120s), longer rest (30-60s), simpler combos
- If the user is sore or recovering: fewer rounds, shorter durations, more rest — but still ROUNDS

EXCEPTION — single long segments ARE valid for continuous activities:
- Treadmill runs (e.g., 30 min jog, 60 min run)
- Jump rope sessions (e.g., 10 min continuous)
- Static stretching / foam rolling (e.g., 5-10 min)
- Plank holds or single exercise endurance (e.g., 3 min plank)
- Any activity where continuous unbroken duration makes sense

Rule of thumb: if the segment involves combos or boxing technique, use rounds. If it's continuous cardio/stretch/hold, long durations are fine.

### RULE 13: EVERYTHING IS GRIND UNLESS USER SPECIFIES FULL SESSION
The timer REQUIRES at least one phase with section: "grind" to function.
- If the user asks for "just a warmup" or "warmup only": put the warmup content (stretching, jump rope, etc.) into a GRIND phase. No warmup section. No cooldown section. The warmup content IS the grind.
- If the user asks for "just a cooldown" or "cooldown only": put the cooldown content (stretching, foam rolling, etc.) into a GRIND phase. No warmup section. No cooldown section.
- If the user asks for a full session with distinct warmup + rounds + cooldown: use proper warmup/grind/cooldown sections.
- Rule of thumb: warmup and cooldown sections only exist when there IS a distinct main workout (grind). If there's no real "main workout," everything lives in grind.

### RULE 14: SECTION TRANSITION RESTS
When warmup and grind sections both exist:
- Add a 30-second rest segment at the END of the warmup phase as the last segment
- This rest is named "Get Ready" with type "rest", segmentType "rest", duration 30

When grind and cooldown sections both exist:
- Add a 30-second rest segment at the START of the cooldown phase as the first segment
- This rest is named "Recovery" with type "rest", segmentType "rest", duration 30

These transition rests give the user a breather between sections. The user can request longer transition rests, but 30 seconds is the minimum default. If there is no warmup or no cooldown, there are no transition rests — the workout goes straight from Get Ready countdown into Round 1.

## TIER RULES
- Rookie/Beginner: Punches 1-4 only. Combo length 2-4. No defense moves in combos.
- Intermediate: Punches 1-6. Combo length 3-5. SLIP and ROLL allowed.
- Advanced/Pro: All punches 1-8. Combos 4-8. All defense and movement.

## COMPLETE EXAMPLE OUTPUT

Prompt: "3 rounds heavy bag, 2 min, 30 sec rest" (intermediate tier, has gloves+bag)

{
  "name": "Heavy Bag Session",
  "rounds": 3,
  "roundDuration": 120,
  "restDuration": 30,
  "difficulty": "intermediate",
  "combos": [["1","2","3"],["1","2","SLIP L","3"],["1","1","2","3","2"]],
  "phases": [
    {
      "name": "Heavy Bag",
      "phaseType": "continuous",
      "section": "grind",
      "repeats": 3,
      "combos": [["1","2","3"],["1","2","SLIP L","3"],["1","1","2","3","2"]],
      "comboOrder": "sequential",
      "segments": [
        {"name": "Heavy Bag", "type": "active", "segmentType": "combo", "duration": 120},
        {"name": "Rest", "type": "rest", "segmentType": "rest", "duration": 30}
      ]
    }
  ],
  "tags": ["boxing"],
  "megasetRepeats": 1,
  "hasWarmup": false,
  "hasCooldown": false,
  "parsedRounds": true,
  "parsedDurations": true,
  "parsedCombos": false,
  "hasMultipleBlocks": false
}

Note: No warmup or cooldown — user only asked for rounds. Combos progress from simple (3 tokens) to more complex (5 tokens). All combos use intermediate-legal punches (1-6) and defense (SLIP L).

ALWAYS return just the JSON object. No markdown fences, no explanation.
```

## 2.3 Auto-Repair Function

After the LLM returns JSON, run this BEFORE validation. It fixes common LLM mistakes.

```typescript
// lib/aiAutoRepair.ts

const VALID_BOXING_TOKENS = new Set([
  '1','2','3','4','5','6','7','8',
  'SLIP L','SLIP R','ROLL L','ROLL R','DUCK','PULL','BLOCK','PARRY',
  'STEP IN','STEP OUT','CIRCLE L','CIRCLE R','PIVOT',
  'FREESTYLE'
]);

function splitHyphenCombo(token: string): string[] {
  return token.split('-').map(t => t.trim()).filter(t => t.length > 0);
}

export function autoRepairCombos(combos: any[]): string[][] {
  return combos.map(combo => {
    if (!Array.isArray(combo) || combo.length === 0) return [];
    // Fix hyphen-joined combos like ["1-2-3"]
    if (combo.length === 1 && typeof combo[0] === 'string' && combo[0].includes('-')) {
      const parts = splitHyphenCombo(combo[0]);
      if (parts.length > 1 && /^[1-8]$/.test(parts[0])) {
        return parts;
      }
    }
    // Strip unknown boxing tokens (LLM sometimes hallucinates "PUSH", "CHARGE", etc.)
    const tokens = combo.map(String);
    const isBoxingCombo = VALID_BOXING_TOKENS.has(tokens[0]) || /^[1-8]$/.test(tokens[0]);
    if (isBoxingCombo) {
      const cleaned = tokens.filter((t: string) => VALID_BOXING_TOKENS.has(t));
      if (cleaned.length >= 2) return cleaned;
      if (cleaned.length === 1) return ['1', '2']; // fallback to jab-cross
    }
    return tokens;
  }).filter(combo => combo.length > 0);
}

export function autoRepair(result: any): any {
  // megasetRepeats: enforce minimum, NO upper limit
  if (!result.megasetRepeats || result.megasetRepeats < 1) result.megasetRepeats = 1;

  if (!result.tags) result.tags = [];
  if (result.hasWarmup === undefined) {
    result.hasWarmup = result.phases?.some((p: any) => p.section === 'warmup') ?? false;
  }
  if (result.hasCooldown === undefined) {
    result.hasCooldown = result.phases?.some((p: any) => p.section === 'cooldown') ?? false;
  }
  if (!result.combos) result.combos = [];

  // RULE 13: If no grind phase exists, reclassify ALL phases as grind
  const hasGrind = result.phases?.some((p: any) => p.section === 'grind');
  if (!hasGrind && result.phases && result.phases.length > 0) {
    for (const phase of result.phases) {
      phase.section = 'grind';
    }
  }

  // Fix top-level combos
  if (result.combos.length > 0) {
    result.combos = autoRepairCombos(result.combos);
  }

  for (const phase of (result.phases || [])) {
    if (!phase.repeats || phase.repeats < 1) phase.repeats = 1;
    if (!phase.comboOrder) phase.comboOrder = 'sequential';

    // Fix phase-level combos
    if (phase.combos && Array.isArray(phase.combos)) {
      phase.combos = autoRepairCombos(phase.combos);
      // Sync first grind phase combos to top-level if top-level is empty
      if (result.combos.length === 0 && phase.section === 'grind') {
        result.combos = phase.combos;
      }
    }

    for (const seg of (phase.segments || [])) {
      // Clamp durations: min 10, max 300
      if (seg.duration < 5) seg.duration = 10;
      if (seg.duration > 600) seg.duration = 300;

      // Infer segmentType from name if missing
      if (seg.type === 'active' && !seg.segmentType) {
        const nameLower = (seg.name || '').toLowerCase();
        if (nameLower.includes('shadow')) seg.segmentType = 'shadowboxing';
        else if (nameLower.includes('heavy bag') || nameLower.includes('combo')) seg.segmentType = 'combo';
        else if (nameLower.includes('speed bag')) seg.segmentType = 'speedbag';
        else if (nameLower.includes('double end')) seg.segmentType = 'doubleend';
        else if (nameLower.includes('sparring')) seg.segmentType = 'sparring';
        else seg.segmentType = 'exercise';
      }

      // Fix rest segments
      if (seg.type === 'rest') {
        seg.segmentType = 'rest';
      }
    }
  }

  return result;
}
```

## 2.4 Validation Function

```typescript
// lib/aiValidation.ts

export function validateParsedResult(result: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!result.phases || !Array.isArray(result.phases) || result.phases.length === 0) {
    errors.push('No phases array or empty phases');
    return { valid: false, errors };
  }

  const hasGrind = result.phases.some((p: any) => p.section === 'grind');
  if (!hasGrind) errors.push('No grind phase found');

  if (!['beginner', 'intermediate', 'advanced'].includes(result.difficulty)) {
    errors.push(`Invalid difficulty: ${result.difficulty}`);
  }

  if (result.megasetRepeats < 1) {
    errors.push(`Invalid megasetRepeats: ${result.megasetRepeats}`);
  }

  const VALID_TOKENS = new Set([
    '1','2','3','4','5','6','7','8',
    'SLIP L','SLIP R','ROLL L','ROLL R','DUCK','PULL','BLOCK','PARRY',
    'STEP IN','STEP OUT','CIRCLE L','CIRCLE R','PIVOT','FREESTYLE'
  ]);

  for (const phase of result.phases) {
    if (!phase.repeats || phase.repeats < 1) {
      errors.push(`Phase "${phase.name}" has invalid repeats: ${phase.repeats}`);
    }
    if (!phase.segments || phase.segments.length === 0) {
      errors.push(`Phase "${phase.name}" has no segments`);
    }

    for (const seg of (phase.segments || [])) {
      if (seg.duration < 5 || seg.duration > 600) {
        errors.push(`Segment "${seg.name}" has invalid duration: ${seg.duration}s`);
      }
      if (seg.type === 'active' && !seg.segmentType) {
        errors.push(`Active segment "${seg.name}" missing segmentType`);
      }
      if (seg.type === 'rest' && seg.segmentType !== 'rest') {
        errors.push(`Rest segment "${seg.name}" has wrong segmentType: ${seg.segmentType}`);
      }
    }

    // Validate boxing combos
    if (phase.combos) {
      for (let i = 0; i < phase.combos.length; i++) {
        const combo = phase.combos[i];
        if (!Array.isArray(combo) || combo.length === 0) continue;
        const isBoxingCombo = VALID_TOKENS.has(combo[0]);
        if (isBoxingCombo) {
          for (const token of combo) {
            if (!VALID_TOKENS.has(token)) {
              errors.push(`Invalid boxing token "${token}" in phase "${phase.name}" combo ${i}`);
            }
          }
        }
        // Reject malformed hyphen-joined combos
        if (combo.length === 1 && /^\d[-\d]+/.test(combo[0])) {
          errors.push(`Malformed combo: tokens must be separate array elements`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
```

## 2.5 parsedResultToWorkout — JSON → Workout Object Converter

This function already exists in Replit at `lib/aiWorkoutParser.ts`. It converts the
ParsedWorkoutResult JSON (from either LLM or regex parser) into the Workout object
the timer consumes. **DO NOT MODIFY IT** — it works correctly for both sources.

The key conversion logic:
- Phases with section "warmup" → `workout.sections.warmup[]`
- Phases with section "grind" → `workout.sections.grind[]`
- Phases with section "cooldown" → `workout.sections.cooldown[]`
- Phase.combos → WorkoutPhase.combos
- Phase.comboOrder → WorkoutPhase.comboOrder
- Generates UUID for each phase and segment
- Calculates totalDuration from all segments × repeats × megasetRepeats

---

# 3. AGENT 2: KOI AI COACH

## 3.1 What It Does

The coach is ALREADY FULLY IMPLEMENTED in Replit as a local deterministic engine.
It does NOT need an LLM. Here's what exists and what it does:

### Already Working (714 lines in `lib/coachEngine.ts`):

**12 Rules Applied in Sequence:**

| Rule | Name | What It Does |
|------|------|-------------|
| C1 | Difficulty Calibration | Analyzes last 10 workouts' difficulty ratings. >50% "too easy" → bump up. >50% "too hard" → bump down. |
| C2 | Trend Detection | Compares first half vs second half of recent sessions. Getting easier → push harder. Getting harder → ease off. |
| C3 | Round Feedback | Analyzes per-round ratings. Weak late rounds → shorter rounds or more rest. Strong throughout → add rounds. |
| C4 | Punch Distribution | Identifies underused punches within tier limits. Jab-cross dominant → emphasize hooks/uppercuts. Respects tier punch caps (beginner: 1-4, intermediate: 1-6, advanced: 1-8). |
| C5 | Defense Neglect | After 10+ workouts with zero defense moves → suggests adding SLIP/ROLL into combos. Only for intermediate+ tiers (beginners don't get defense). |
| C6 | Recovery Awareness | Same-day double session → light shadowboxing. 7+ day gap → comeback mode (lower difficulty, include warmup). |
| C7 | Time of Day | Morning (5-10am) → shorter, higher intensity. Late night (9pm+) → lighter recovery focus. |
| C8 | Streak Protection | 14+ day streak → suggest lighter day. Frequent streak-breakers → shorter achievable sessions. |
| C9 | Workout Variety | Same workout name 3+ times in last 5 → suggest variety, switch workout type. |
| C10 | Goal Alignment | Competition goal → 3min rounds, 60s rest, defense focus. Get fit → shorter rest. Home workout → shadowboxing if no bags. |
| C11 | Notes Parsing | Keywords in recent notes: "sore"/"tired" → lighter. "shoulder"/"knee" → shadowboxing. "great"/"crushed it" → push harder. |
| C12 | Confidence Scoring | High: 10+ sessions with difficulty data, active within 7 days. Medium: 3+ sessions. Low: <3 or stale data. |

### The Coach → Builder Pipeline (Already Working):

```
1. User taps "AI Coach" on History page
2. generateCoachRecommendation(completedWorkouts, profileData) runs
3. Returns CoachRecommendation object (headline, reasoning, parameters, encouragement)
4. UI displays the recommendation card
5. User taps "Generate Workout"
6. recommendationToPrompt(recommendation) converts to text:
   → "4 rounds heavy bag, 3 min rounds, 60 sec rest, intermediate level, include warmup, include cooldown"
7. Navigate to /build?coachPrompt=<encoded prompt>
8. Build page receives prompt and feeds it to AI Builder
```

### What Needs to Change for the Coach:

**NOTHING in the coach engine itself.** The only change is that step 8 now goes to
the Gemini API instead of just the regex parser. The coach already generates a structured
prompt via `recommendationToPrompt()` — the LLM will handle it perfectly because it's
a well-formed structured request (not a vague creative prompt).

### Data Flow Details:

The coach reads from `useHistoryStore` (CompletedWorkout[]) but `coachEngine.ts` expects
`WorkoutHistoryEntry[]` format. The history page already converts between these formats
(see `app/history.tsx` lines 34-38 imports and the data transformation in the coach handler).

The `ProfileData` interface the coach needs:
```typescript
interface ProfileData {
  prestige: string | null;           // from userStore
  current_level: number | null;      // from userStore
  current_streak: number;            // from userStore
  longest_streak: number;            // from userStore
  workouts_completed: number;        // from userStore
  total_training_seconds: number;    // from userStore
  experience_level: string | null;   // from userStore
  equipment: Record<string, boolean>;// from userStore
  goals: string[] | null;            // from userStore
  last_workout_date: string | null;  // computed from history
  comeback_count: number;            // from userStore
  double_days: number;               // from userStore
  morning_workouts: number;          // from userStore
  night_workouts: number;            // from userStore
  weekend_workouts: number;          // from userStore
  weekday_workouts: number;          // from userStore
  punch_1_count through punch_8_count: number; // from userStore
  slips_count: number;               // from userStore
  rolls_count: number;               // from userStore
  pullbacks_count: number;           // from userStore
  circles_count: number;             // from userStore
}
```

**IMPORTANT**: Some of these fields may not be tracked yet in the Replit `userStore`.
If a field is missing, default to 0 or null. The coach handles missing data gracefully
(falls back to defaults with low confidence). As more stats get tracked over time,
the coach automatically gets smarter.

---

# 4. API ROUTE IMPLEMENTATION

## 4.1 Server-Side API Route

Create an Expo API route (or Express server route if using a custom server) that:
1. Receives the prompt + user context from the client
2. Calls Gemini 2.5 Flash with the KOI system prompt
3. Runs auto-repair on the response
4. Runs validation
5. Returns the parsed JSON or a fallback signal

```typescript
// server/api/generate-workout.ts (or wherever Replit handles server routes)

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = 'gemini-2.5-flash';  // or 'gemini-2.0-flash' depending on availability

// The SYSTEM_PROMPT constant from Section 2.2 above goes here
const SYSTEM_PROMPT = `...`; // Copy the full prompt from Section 2.2

interface GenerateRequest {
  prompt: string;
  userTier: string;
  equipment: Record<string, boolean>;
  experienceLevel: string;
  historyInsights?: {
    averageDifficulty: string | null;
    recentTrend: string | null;
    preferredDuration: number;
    suggestedDifficultyAdjust: number;
    totalWorkouts: number;
  };
}

function buildUserMessage(req: GenerateRequest): string {
  const equipmentList = Object.entries(req.equipment || {})
    .filter(([_, has]) => has)
    .map(([name]) => name)
    .join(', ') || 'none';

  let context = `Tier: ${req.userTier}\nEquipment: ${equipmentList}\nExperience: ${req.experienceLevel}`;

  if (req.historyInsights && req.historyInsights.totalWorkouts > 0) {
    const h = req.historyInsights;
    context += `\nHistory: ${h.totalWorkouts} workouts, avg difficulty: ${h.averageDifficulty || 'unknown'}, trend: ${h.recentTrend || 'unknown'}, preferred duration: ${h.preferredDuration} min, difficulty adjust: ${h.suggestedDifficultyAdjust > 0 ? '+' : ''}${h.suggestedDifficultyAdjust}`;
  }

  return `${context}\n\nUser request: ${req.prompt}`;
}

export async function generateWorkout(req: GenerateRequest): Promise<any> {
  if (!GEMINI_API_KEY) {
    return { error: 'AI service not configured', fallback: true };
  }

  try {
    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: buildUserMessage(req) }]
          }],
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT }]
          },
          generationConfig: {
            maxOutputTokens: 2000,
            temperature: 0.7,
          }
        })
      }
    );

    if (!response.ok) {
      console.error('Gemini API error:', response.status);
      return { error: 'AI generation failed', fallback: true };
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!rawText) {
      return { error: 'Empty AI response', fallback: true };
    }

    // Strip markdown fences if present
    let jsonStr = rawText.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    let parsed: any;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      console.error('JSON parse error:', e);
      return { error: 'Invalid JSON from AI', fallback: true };
    }

    // Auto-repair before validation
    parsed = autoRepair(parsed);

    // Validate
    const { valid, errors } = validateParsedResult(parsed);
    if (!valid) {
      console.error('Validation errors:', errors);
      return { error: 'Workout validation failed', errors, fallback: true };
    }

    return parsed;
  } catch (err) {
    console.error('Unexpected error:', err);
    return { error: 'Internal server error', fallback: true };
  }
}
```

## 4.2 Gemini API Details

**Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`
**Auth**: API key as query parameter `?key=YOUR_KEY`
**Model**: `gemini-2.5-flash` (preferred) or `gemini-2.0-flash-lite` (cheaper fallback)
**Temperature**: 0.7 (balanced creativity for combo generation)
**Max tokens**: 2000 (sufficient for even complex multi-phase workouts)

Get API key from: https://aistudio.google.com/apikey

**Alternative**: If Replit has built-in AI capabilities or prefers a different LLM provider,
the system prompt works with ANY instruction-following LLM (Claude, GPT-4, etc.).
Just swap the API call. The prompt and validation logic stay identical.

---

# 5. FRONTEND INTEGRATION — BUILD PAGE

## 5.1 Changes to `app/build.tsx`

The `handleAiGenerate` function needs to become async with a 3-layer fallback:

```typescript
const handleAiGenerate = async () => {
  if (!aiPrompt.trim()) return;
  setAiGenerating(true);

  try {
    const userLevel = user?.experienceLevel || user?.prestige || 'beginner';
    const userEquipment = user?.equipment || {};

    // Get history insights for context (optional but improves results)
    let historyInsights = undefined;
    try {
      const history = useHistoryStore.getState().completedWorkouts;
      if (history.length > 0) {
        const analysisHistory = history.map(w => ({
          id: w.id,
          workout_name: w.workoutName,
          completed_at: w.completedAt,
          duration: w.duration,
          xp_earned: w.xpEarned,
          difficulty: w.difficulty || null,
          notes: w.notes || null,
          round_feedback: w.roundFeedback || null,
          is_manual_entry: w.isManualEntry,
        }));
        const insights = analyzeWorkoutHistory(analysisHistory);
        historyInsights = {
          averageDifficulty: insights.averageDifficulty,
          recentTrend: insights.recentTrend,
          preferredDuration: insights.preferredDuration,
          suggestedDifficultyAdjust: insights.suggestedDifficultyAdjust,
          totalWorkouts: insights.totalWorkouts,
        };
      }
    } catch (e) {
      // History analysis is optional — don't block generation
    }

    // --- Layer 1: Try AI agent via API route ---
    try {
      const response = await fetch('/api/generate-workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt.trim(),
          userTier: userLevel,
          equipment: userEquipment,
          experienceLevel: userLevel,
          historyInsights,
        }),
      });

      const data = await response.json();

      if (!data.fallback && !data.error && data.phases) {
        console.log('[AI Agent] Success:', data.name);
        const workout = parsedResultToWorkoutFn(data);
        applyWorkoutToEditor(workout);
        return; // Success — done
      }

      console.warn('[AI Agent] Fallback:', data.error);
    } catch (e) {
      console.warn('[AI Agent] Failed, falling back to parser:', e);
    }

    // --- Layer 2: Regex parser fallback ---
    const parsed = parseWorkoutInputFn(aiPrompt.trim(), userLevel);
    const workout = parsedResultToWorkoutFn(parsed);
    applyWorkoutToEditor(workout);

  } catch (err) {
    Alert.alert('Parse Error', 'Could not parse that prompt. Try being more specific.');
  } finally {
    setAiGenerating(false);
  }
};

// Helper to apply parsed workout to the editor state
function applyWorkoutToEditor(workout: Workout) {
  setName(workout.name);
  setDifficulty((workout.difficulty || 'beginner') as ComboDifficulty);
  setWarmupPhases(workout.sections.warmup);
  setGrindPhases(workout.sections.grind);
  setCooldownPhases(workout.sections.cooldown);
  setMegasetRepeats(workout.megasetRepeats || 1);
  setBuildMode('custom');
}
```

## 5.2 Loading State

While the API call is in flight (~1-3 seconds), show a loading indicator.
The existing `aiGenerating` state variable already controls this.
Consider adding a progress animation (0%→85% during API call, 85%→100% on completion).

---

# 6. FRONTEND INTEGRATION — COACH/HISTORY PAGE

## 6.1 What Changes

Almost nothing. The coach pipeline already works:

1. `app/history.tsx` calls `generateCoachRecommendation()` — **NO CHANGE**
2. UI displays the recommendation card — **NO CHANGE**
3. User taps "Generate Workout" — **NO CHANGE**
4. `handleGenerateFromCoach()` calls `recommendationToPrompt(rec)` → navigates to `/build?coachPrompt=...` — **NO CHANGE**
5. Build page receives coachPrompt → feeds to `handleAiGenerate()` — **THIS IS WHERE THE LLM KICKS IN**

The ONLY change is that step 5 now hits the Gemini API instead of just the regex parser.
Since `handleAiGenerate` is already wired to the coachPrompt param, this works automatically
once the API route exists.

## 6.2 Missing Profile Data Fields

The coach engine expects several profile data fields that may not be tracked in the Replit
`userStore` yet. For the coach to work at full capacity, these fields should be tracked:

**Critical (coach won't work well without):**
- `workouts_completed` — increment on each workout completion
- `last_workout_date` — set on each workout completion
- `current_streak` — streak tracking logic
- `equipment` — from onboarding

**Important (improves recommendations):**
- `punch_1_count` through `punch_8_count` — accumulated from workout history
- `slips_count`, `rolls_count`, `pullbacks_count`, `circles_count` — from workout history
- `morning_workouts`, `night_workouts`, `weekend_workouts`, `weekday_workouts` — time tracking

**Nice to have (further personalization):**
- `goals` — from onboarding or settings
- `comeback_count` — count times streak was broken and user returned
- `double_days` — count days with 2+ workouts

If any field is missing from userStore, pass 0/null — the coach degrades gracefully.

---

# 7. TEST SUITE

## 7.1 AI Builder Tests (Run Against API Route)

### Category 1: Foundation

| # | Prompt | Tier | Equipment | Must Verify |
|---|--------|------|-----------|------------|
| 1.1 | "5 rounds heavy bag, 3 min, 1 min rest" | intermediate | gloves+wraps+heavyBag | 1 grind phase, repeats=5, combo seg 180s, rest 60s, 5 combos |
| 1.2 | "3 rounds shadowboxing, 2 min, 30 sec rest" | beginner | none | 1 grind phase, shadowboxing segmentType, combos use only 1-4 |
| 1.3 | "Full boxing session, 30 minutes" | intermediate | full gym | Has warmup + grind + cooldown sections, ~30 min total |

### Category 2: Combo Intelligence

| # | Prompt | Tier | Must Verify |
|---|--------|------|------------|
| 2.1 | "5 rounds heavy bag, 3 min" | beginner | Combos use ONLY punches 1-4. Length 2-4. No defense tokens. |
| 2.2 | "5 rounds heavy bag, 3 min" | advanced | Combos use punches 1-8. Length 4-8. Defense + movement allowed. |
| 2.3 | "8 rounds heavy bag, 3 min" | intermediate | Combos PROGRESS from simple (round 1) to complex (round 8). First combo shorter than last. |
| 2.4 | "3 rounds heavy bag, beginner level" | advanced | Difficulty="beginner", combos only 1-4 despite advanced tier (Rule 10 override) |

### Category 3: Multi-Phase & Supersets

| # | Prompt | Must Verify |
|---|--------|------------|
| 3.1 | "3 rounds shadowboxing 2 min 30 sec rest. Then 4 rounds heavy bag 3 min 1 min rest." | 2 grind phases, correct repeats/durations each |
| 3.2 | "3 rounds superset: heavy bag 2 min and burpees 1 min. 45 sec rest." | 1 phase, 3 segments (combo 120s, exercise 60s, rest 45s), repeats=3 |
| 3.3 | "4 rounds speed bag, 1.5 min, 30 sec rest. Round 1: doubles. Round 2: triples. Round 3: fist rolls. Round 4: side to side." | speedbag segmentType, 4 combos with drill names |

### Category 4: Equipment Constraints

| # | Prompt | Equipment | Must Verify |
|---|--------|-----------|------------|
| 4.1 | "5 rounds heavy bag, 3 min" | none | segmentType = "shadowboxing" (NOT "combo"), combos still present |
| 4.2 | "3 rounds speed bag" | no speed bag | Should either reject gracefully or substitute with shadowboxing |

### Category 5: Edge Cases

| # | Prompt | Must Verify |
|---|--------|------------|
| 5.1 | "3 rounds heavy bag, 2 min, 30 sec rest. Repeat everything twice." | megasetRepeats = 2 |
| 5.2 | "5 rounds heavy bag all freestyle" | All combos = [["FREESTYLE"]] × 5 |
| 5.3 | "Just a warmup, 5 minutes" | Everything in grind section (Rule 13), no warmup section |
| 5.4 | "I'm tired today, give me something light" | LLM generates recovery-style workout: shorter rounds, longer rest, simpler combos |

### Category 6: Vague/Creative Prompts (LLM-Only)

| # | Prompt | Must Verify |
|---|--------|------------|
| 6.1 | "Fight camp Tuesday" | Multi-phase workout, advanced combos, includes warmup/cooldown |
| 6.2 | "Quick 10 minutes" | 3-5 rounds (NOT 1×600s), appropriate for tier |
| 6.3 | "Something to work on my hooks" | Combos emphasize punch 3 and 4 (hooks) |
| 6.4 | "yo gimme sum heat 🔥💪 like 6 rnds or whatever heavy bag idrc" | Parses correctly: 6 rounds heavy bag, reasonable defaults |

### Category 7: Regression (These Must Not Break)

| # | Prompt | Must Verify |
|---|--------|------------|
| 7.1 | The full 6-block prompt (warmup + shadow + speed bag + superset + conditioning + cooldown) | 6 phases, correct section assignments, correct segment types |

The full 6-block prompt for test 7.1:
```
1 round warm up, 3 minutes, no rest. Dynamic stretches.

3 rounds shadowboxing, 2 minutes each, 30 sec rest. Round 1: jab cross hook. Round 2: double jab cross uppercut. Round 3: 1-2-3-6-3-2.

2 rounds speed bag, 2 minutes each, 30 sec rest. Round 1: doubles. Round 2: fist rolls.

3 rounds superset: heavy bag 2 minutes and burpees 1 minute. 45 sec rest. Round 1: 1-2. Round 2: 1-2-3. Round 3: 1-1-2-3-2.

3 rounds conditioning, 45 seconds each, 20 sec rest. Round 1: plank. Round 2: jumping lunges. Round 3: squat jumps.

1 round cool down, 3 minutes, no rest. Foam rolling.
```

## 7.2 Coach Engine Tests

The coach engine already has a comprehensive test file (451 lines, 25+ test cases).
These should be ported to Replit's test runner (Jest/Vitest).

Key test categories:
- A: Difficulty Calibration (C1) — 5 tests
- B: Trend Detection (C2) — 3 tests
- C: Round Feedback (C3) — 2 tests
- D: Punch Distribution (C4) — 3 tests
- E: Defense (C5) — 3 tests
- F: Recovery (C6) — 3 tests
- G: Time & Context (C7, C8, C9) — 3 tests
- H: Goals & Notes (C10, C11) — 3 tests
- I: Confidence & Edge Cases (C12) — 3 tests

The full test file is in the Lovable codebase at `src/test/coachEngine.test.ts` (451 lines).
Copy it to Replit and adapt imports.

---

# 8. FILES TO CREATE/MODIFY

## New Files

| File | Lines | Purpose |
|------|-------|---------|
| `server/api/generate-workout.ts` | ~150 | API route that calls Gemini with KOI system prompt |
| `lib/aiAutoRepair.ts` | ~100 | Auto-repair function for LLM output |
| `lib/aiValidation.ts` | ~70 | Validation function for parsed workout JSON |

## Modified Files

| File | Change |
|------|--------|
| `app/build.tsx` | `handleAiGenerate` becomes async with 3-layer fallback (AI → regex → error) |

## Unchanged Files (Confirm These Stay Untouched)

| File | Lines | Why It Stays |
|------|-------|-------------|
| `lib/aiWorkoutParser.ts` | 1,449 | Regex parser — now Layer 2 fallback |
| `lib/coachEngine.ts` | 714 | Coach engine — fully working, stays local |
| `lib/workoutHistoryAnalysis.ts` | 323 | History analysis — used by coach + builder context |
| `app/workout/[id].tsx` | 984 | Timer engine — consumes Workout objects, doesn't care about source |
| `app/history.tsx` | ~800 | Coach UI — already wired to builder pipeline |

## Environment Variables

| Variable | Value | Where to Set |
|----------|-------|-------------|
| `GEMINI_API_KEY` | Your Google AI Studio API key | Replit Secrets |

---

# APPENDIX A: COMMON LLM FAILURE MODES (From Testing)

These are real failures we saw during 65+ test cases on Lovable:

1. **Hyphen-joined combos**: LLM returns `["1-2-3"]` instead of `["1","2","3"]` — auto-repair fixes this
2. **Hallucinated tokens**: LLM invents "PUSH", "CHARGE", "WEAVE" — auto-repair strips unknown tokens
3. **One phase per round**: LLM creates Phase 1, Phase 2, Phase 3 instead of one phase with repeats=3 — Rule 1 prevents this
4. **Missing grind section**: LLM puts everything in warmup — auto-repair reclassifies to grind (Rule 13)
5. **90 seconds = 5400**: LLM interprets "90 seconds" as 90 minutes — Rule 5 + duration clamping prevents this
6. **Default megasetRepeats > 1**: LLM randomly decides to repeat — Rule 9 enforces default=1
7. **Same opener every combo**: LLM starts every combo with 1-2 — Rule 11 demands variety
8. **No progressive difficulty**: All combos same length — Rule 11 demands progression
9. **Consecutive rear punches**: LLM generates 2-4-6 (three rear-hand punches in a row) — not biomechanically realistic but currently allowed by the schema

# APPENDIX B: DEFAULT DURATION TABLE

Used by the regex parser fallback. The LLM should generally infer from context but these
are the fallback values if nothing is specified:

| Activity | Default Duration |
|---|---|
| Boxing round | 180s (3 min) |
| Boxing rest | 60s (1 min) |
| Warmup (general) | 300s (5 min) |
| Warmup (specific drill) | 120s (2 min) |
| Cooldown | 300s (5 min) |
| Pushups / strength | 30s |
| Generic rest | 60s |
| Sprint interval | 30s |
| Recovery jog | 60s |
| Plank | 60s |
| Dynamic stretch block | 120s (2 min) |
| Static stretch block | 180s (3 min) |
| Jump rope warmup | 180s (3 min) |
| Defense drill | 120s (2 min) |
| Footwork drill | 120s (2 min) |
| Sparring round | 180s (3 min) |
