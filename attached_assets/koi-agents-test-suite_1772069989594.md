# KOI AI AGENTS — COMPREHENSIVE TEST SUITE
# Get Clocked Boxing Fitness App
# 1000+ Checkpoints Across Both Agents
# Version: DEFINITIVE — February 2026
# ═══════════════════════════════════════════════════════════════════

## HOW TO USE THIS DOCUMENT

Each test has:
- **Test ID**: Category.Number (e.g., A1.1)
- **Prompt/Input**: Exact input to feed the system
- **Context**: User tier, equipment, history (when relevant)
- **Checkpoints**: Binary pass/fail checks. EVERY checkpoint must pass.
- **Why It Matters**: What bug this catches

Run ALL tests. Report ALL results. **DO NOT FIX ANYTHING UNTIL ALL TESTS ARE COMPLETE.**
We need the full picture before patching — fixing one thing at a time causes whack-a-mole.

### Equipment Shorthand
- **FULL_GYM**: `{ gloves: true, wraps: true, heavyBag: true, doubleEndBag: true, speedBag: true, jumpRope: true, treadmill: true }`
- **BAG_ONLY**: `{ gloves: true, wraps: true, heavyBag: true, doubleEndBag: false, speedBag: false, jumpRope: false, treadmill: false }`
- **NO_EQUIP**: `{ gloves: false, wraps: false, heavyBag: false, doubleEndBag: false, speedBag: false, jumpRope: false, treadmill: false }`
- **SB_ONLY**: `{ gloves: false, wraps: false, heavyBag: false, doubleEndBag: false, speedBag: true, jumpRope: false, treadmill: false }`
- **DB_ONLY**: `{ gloves: true, wraps: true, heavyBag: false, doubleEndBag: true, speedBag: false, jumpRope: false, treadmill: false }`
- **SHADOW_ONLY**: `{ gloves: true, wraps: true, heavyBag: false, doubleEndBag: false, speedBag: false, jumpRope: false, treadmill: false }`

### Tier Shorthand
- **R** = Rookie, **B** = Beginner, **I** = Intermediate, **A** = Advanced, **P** = Pro

---

# ═══════════════════════════════════════════════════════════════════
# PART 1: AI WORKOUT BUILDER (AGENT 1) — 850+ CHECKPOINTS
# ═══════════════════════════════════════════════════════════════════

---

## CATEGORY A: RULE 1 — PHASES VS ROUNDS (40 checkpoints)

The #1 structural rule. The LLM must create ONE phase with repeats=N, NOT N separate phases.

---

### A1.1 — Basic Heavy Bag
**Prompt**: `5 rounds heavy bag, 3 min, 1 min rest`
**Context**: Tier=I, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] A1: Returns valid JSON (no markdown, no explanation)
- [ ] A2: No `fallback: true` flag
- [ ] A3: `phases` array has exactly 1 phase
- [ ] A4: Phase `section` === "grind"
- [ ] A5: Phase `repeats` === 5
- [ ] A6: Phase has exactly 2 segments
- [ ] A7: Segment 1: `type` === "active", `segmentType` === "combo"
- [ ] A8: Segment 1: `duration` === 180
- [ ] A9: Segment 2: `type` === "rest", `segmentType` === "rest"
- [ ] A10: Segment 2: `duration` === 60
- [ ] A11: Phase has `combos` array with exactly 5 entries
- [ ] A12: `difficulty` === "intermediate"
- [ ] A13: `megasetRepeats` === 1
- [ ] A14: `hasWarmup` === false
- [ ] A15: `hasCooldown` === false

### A1.2 — 8 Rounds (Must Not Create 8 Phases)
**Prompt**: `8 rounds heavy bag, 2 min, 45 sec rest`
**Context**: Tier=A, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] A16: `phases` array has exactly 1 phase (NOT 8)
- [ ] A17: Phase `repeats` === 8
- [ ] A18: Active segment duration === 120
- [ ] A19: Rest segment duration === 45
- [ ] A20: Phase `combos` has exactly 8 entries

### A1.3 — Multi-Phase (Should Stay Multi-Phase)
**Prompt**: `3 rounds shadowboxing 2 min 30 sec rest. Then 4 rounds heavy bag 3 min 1 min rest.`
**Context**: Tier=I, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] A21: `phases` array has exactly 2 phases
- [ ] A22: Both phases have `section` === "grind"
- [ ] A23: Phase 1 `repeats` === 3
- [ ] A24: Phase 1 active segment `segmentType` === "shadowboxing"
- [ ] A25: Phase 1 active segment `duration` === 120
- [ ] A26: Phase 1 rest segment `duration` === 30
- [ ] A27: Phase 2 `repeats` === 4
- [ ] A28: Phase 2 active segment `segmentType` === "combo"
- [ ] A29: Phase 2 active segment `duration` === 180
- [ ] A30: Phase 2 rest segment `duration` === 60

### A1.4 — Single Round
**Prompt**: `1 round heavy bag, 3 min, no rest`
**Context**: Tier=B, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] A31: `phases` array has exactly 1 phase
- [ ] A32: Phase `repeats` === 1
- [ ] A33: Phase `combos` has exactly 1 entry
- [ ] A34: Rest segment either absent or duration === 0

### A1.5 — 12 Rounds Championship
**Prompt**: `12 rounds heavy bag, 3 min, 1 min rest`
**Context**: Tier=A, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] A35: `phases` array has exactly 1 phase (NOT 12)
- [ ] A36: Phase `repeats` === 12
- [ ] A37: Phase `combos` has exactly 12 entries
- [ ] A38: Active segment `duration` === 180
- [ ] A39: Rest segment `duration` === 60
- [ ] A40: All combos are unique (no repeated combos)

---

## CATEGORY B: RULE 2 — COMBO FORMAT (40 checkpoints)

Every token must be a separate array element. Never hyphen-joined.

---

### B1.1 — Explicit Number Combos
**Prompt**: `3 rounds heavy bag, 2 min, 30 sec rest. Round 1: 1-2-3. Round 2: 1-2-SLIP L-3. Round 3: 1-1-2-3-2.`
**Context**: Tier=I, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] B1: Phase `combos[0]` === `["1","2","3"]` (3 separate elements)
- [ ] B2: Phase `combos[1]` === `["1","2","SLIP L","3"]` (4 separate elements)
- [ ] B3: Phase `combos[2]` === `["1","1","2","3","2"]` (5 separate elements)
- [ ] B4: No combo contains a hyphen-joined string like "1-2-3"
- [ ] B5: No combo contains a space-joined string like "1 2 3"

### B1.2 — Word Combos (Natural Language)
**Prompt**: `3 rounds shadowboxing, 2 min, 30 sec rest. Round 1: jab cross hook. Round 2: double jab cross uppercut. Round 3: jab cross body hook.`
**Context**: Tier=I, Equipment=NO_EQUIP

**Checkpoints:**
- [ ] B6: `combos[0]` === `["1","2","3"]` (jab=1, cross=2, hook=3)
- [ ] B7: `combos[1]` === `["1","1","2","5"]` (double jab=1,1, cross=2, uppercut=5)
- [ ] B8: `combos[2]` === `["1","2","7"]` (jab=1, cross=2, body hook=7)
- [ ] B9: All tokens are from the valid set (1-8, SLIP L/R, ROLL L/R, etc.)
- [ ] B10: No token is a word like "jab" or "cross" — must be converted to numbers

### B1.3 — Speed Bag Drill Format
**Prompt**: `3 rounds speed bag, 2 min, 30 sec rest. Round 1: doubles. Round 2: triples. Round 3: fist rolls.`
**Context**: Tier=I, Equipment=SB_ONLY

**Checkpoints:**
- [ ] B11: `combos[0]` === `["Doubles"]` (one-element array, drill NAME not number)
- [ ] B12: `combos[1]` === `["Triples"]`
- [ ] B13: `combos[2]` contains "Fist Rolls" (exact match "Fist Rolls (Forward)" preferred)
- [ ] B14: segmentType === "speedbag"
- [ ] B15: Drill names are NOT punch numbers

### B1.4 — Conditioning Exercise Format
**Prompt**: `3 rounds conditioning, 1 min, 30 sec rest. Round 1: burpees. Round 2: mountain climbers. Round 3: squat jumps.`
**Context**: Tier=I, Equipment=NO_EQUIP

**Checkpoints:**
- [ ] B16: `combos[0]` contains "Burpees"
- [ ] B17: `combos[1]` contains "Mountain Climbers"
- [ ] B18: `combos[2]` contains "Squat Jumps"
- [ ] B19: segmentType === "exercise"
- [ ] B20: Exercise names are Title Case

### B1.5 — Mixed Combo with Defense Tokens
**Prompt**: `5 rounds heavy bag, 3 min, 1 min rest. Round 1: 1-2. Round 2: 1-2-SLIP L-3. Round 3: 1-2-ROLL R-3-2. Round 4: 1-2-3-DUCK-2-3. Round 5: 1-2-SLIP L-3-ROLL R-2-3-2.`
**Context**: Tier=A, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] B21: Combo 1 has 2 tokens: `["1","2"]`
- [ ] B22: Combo 2 has 4 tokens: `["1","2","SLIP L","3"]`
- [ ] B23: Combo 3 has 5 tokens: `["1","2","ROLL R","3","2"]`
- [ ] B24: Combo 4 has 6 tokens: `["1","2","3","DUCK","2","3"]`
- [ ] B25: Combo 5 has 8 tokens: `["1","2","SLIP L","3","ROLL R","2","3","2"]`
- [ ] B26: "SLIP L" is exactly 2 words in one string (not split as ["SLIP","L"])
- [ ] B27: "ROLL R" is exactly 2 words in one string
- [ ] B28: "DUCK" is a single token
- [ ] B29: No combo contains any token NOT in the valid set
- [ ] B30: Combos progressively get longer (2→4→5→6→8)

### B1.6 — Body Shot Notation
**Prompt**: `3 rounds shadowboxing, 2 min. Round 1: jab body shot. Round 2: jab cross rear body hook. Round 3: double jab body hook cross.`
**Context**: Tier=A, Equipment=NO_EQUIP

**Checkpoints:**
- [ ] B31: Combo 1: "body shot" → 7 (lead body hook). Result: `["1","7"]`
- [ ] B32: Combo 2: "rear body hook" → 8. Result: `["1","2","8"]`
- [ ] B33: Combo 3: "body hook" → 7. Result: `["1","1","7","2"]`
- [ ] B34: "body" is NEVER a standalone token — always part of "body hook" (7) or "body shot" (7) or "rear body hook" (8)

### B1.7 — Freestyle Combos
**Prompt**: `5 rounds heavy bag all freestyle`
**Context**: Tier=I, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] B35: Phase has 5 combos
- [ ] B36: Every combo === `["FREESTYLE"]`
- [ ] B37: No punch number tokens present
- [ ] B38: comboOrder is "sequential"

### B1.8 — Mixed Real + Freestyle
**Prompt**: `3 rounds heavy bag, 3 min, 1 min rest. Round 1: 1-2-3. Round 2: freestyle. Round 3: 1-2-3-6-3-2.`
**Context**: Tier=A, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] B39: Combo 1 = `["1","2","3"]`
- [ ] B40: Combo 2 = `["FREESTYLE"]`

---

## CATEGORY C: RULE 3 — COMBOS ON BOXING PHASES (30 checkpoints)

---

### C1.1 — Combo Count Matches Round Count
**Prompt**: `6 rounds heavy bag, 3 min, 1 min rest`
**Context**: Tier=I, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] C1: Phase `combos` array has exactly 6 entries
- [ ] C2: Phase `repeats` === 6
- [ ] C3: combos.length === repeats
- [ ] C4: `comboOrder` === "sequential"

### C1.2 — Shadowboxing Gets Combos Too
**Prompt**: `4 rounds shadowboxing, 2 min, 30 sec rest`
**Context**: Tier=B, Equipment=NO_EQUIP

**Checkpoints:**
- [ ] C5: segmentType === "shadowboxing" (NOT "combo")
- [ ] C6: Phase HAS combos array with 4 entries
- [ ] C7: Combos use only punches 1-4 (beginner tier)
- [ ] C8: Combos have length 2-4

### C1.3 — No Combos Means All Freestyle
**Prompt**: `4 rounds heavy bag, 3 min, 1 min rest, no specific combos`
**Context**: Tier=I, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] C9: Phase has 4 combos
- [ ] C10: All combos === `["FREESTYLE"]`

### C1.4 — AI-Generated Combos (No User Combos Specified)
**Prompt**: `5 rounds heavy bag, 2 min, 30 sec rest`
**Context**: Tier=A, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] C11: Phase has exactly 5 combos
- [ ] C12: All combos are valid boxing token arrays
- [ ] C13: No two combos are identical
- [ ] C14: At least one combo uses a punch > 4 (advanced tier)
- [ ] C15: At least one combo has 5+ tokens
- [ ] C16: First combo is shorter than last combo (progressive difficulty)

### C1.5 — Per-Round Specified Combos Override AI Generation
**Prompt**: `3 rounds heavy bag, 2 min, 30 sec rest. Round 1: 1-2. Round 2: 1-2-3. Round 3: 1-2-3-2.`
**Context**: Tier=I, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] C17: Combo 1 === `["1","2"]` exactly (not AI-generated)
- [ ] C18: Combo 2 === `["1","2","3"]` exactly
- [ ] C19: Combo 3 === `["1","2","3","2"]` exactly
- [ ] C20: No additional combos beyond the 3 specified

### C1.6 — Speed Bag Phases Get Drill Combos
**Prompt**: `2 rounds speed bag, 2 min, 30 sec rest. Round 1: doubles. Round 2: side to side.`
**Context**: Tier=I, Equipment=SB_ONLY

**Checkpoints:**
- [ ] C21: Phase segmentType === "speedbag"
- [ ] C22: Phase has 2 combos
- [ ] C23: Combos contain drill names (strings), not punch numbers
- [ ] C24: comboOrder === "sequential"

### C1.7 — Conditioning Phases Get Exercise Combos
**Prompt**: `3 rounds conditioning, 45 sec, 20 sec rest. Round 1: plank. Round 2: jumping lunges. Round 3: squat jumps.`
**Context**: Tier=I, Equipment=NO_EQUIP

**Checkpoints:**
- [ ] C25: Phase segmentType === "exercise"
- [ ] C26: Phase has 3 combos
- [ ] C27: Combo entries are exercise names (Title Case)
- [ ] C28: Exercise names match the recognized exercise list
- [ ] C29: Phase repeats === 3
- [ ] C30: Active segment is only ONE segment (not 3 separate segments)

---

## CATEGORY D: RULE 4 — WARMUP & COOLDOWN OPTIONAL (40 checkpoints)

---

### D1.1 — Simple Request = No Warmup/Cooldown
**Prompt**: `5 rounds heavy bag, 3 min, 1 min rest`
**Context**: Tier=I, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] D1: `hasWarmup` === false
- [ ] D2: `hasCooldown` === false
- [ ] D3: No phase has `section` === "warmup"
- [ ] D4: No phase has `section` === "cooldown"
- [ ] D5: All phases have `section` === "grind"

### D1.2 — Full Session Triggers Warmup + Cooldown
**Prompt**: `Full boxing session, 30 minutes`
**Context**: Tier=I, Equipment=FULL_GYM

**Checkpoints:**
- [ ] D6: `hasWarmup` === true
- [ ] D7: `hasCooldown` === true
- [ ] D8: At least one phase has `section` === "warmup"
- [ ] D9: At least one phase has `section` === "grind"
- [ ] D10: At least one phase has `section` === "cooldown"

### D1.3 — "Complete Workout" Triggers Full Session
**Prompt**: `Complete boxing workout for today`
**Context**: Tier=I, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] D11: Has warmup section
- [ ] D12: Has grind section
- [ ] D13: Has cooldown section

### D1.4 — Explicit Warmup Request
**Prompt**: `Start with jump rope, then 4 rounds heavy bag 3 min 1 min rest, end with stretching`
**Context**: Tier=I, Equipment=FULL_GYM

**Checkpoints:**
- [ ] D14: Has warmup section with jump rope segment
- [ ] D15: Has grind section with 4-round heavy bag phase
- [ ] D16: Has cooldown section with stretching segment
- [ ] D17: Warmup section includes a "Get Ready" 30s rest as last segment (Rule 14)

### D1.5 — No Warmup Override
**Prompt**: `Full boxing session, no warmup, 30 minutes`
**Context**: Tier=I, Equipment=FULL_GYM

**Checkpoints:**
- [ ] D18: `hasWarmup` === false
- [ ] D19: No warmup phase exists
- [ ] D20: Grind section exists
- [ ] D21: Cooldown MAY or MAY NOT exist (user didn't say skip cooldown)

### D1.6 — Skip Cooldown Override
**Prompt**: `Full boxing session, skip cooldown`
**Context**: Tier=I, Equipment=FULL_GYM

**Checkpoints:**
- [ ] D22: `hasCooldown` === false
- [ ] D23: Warmup section exists
- [ ] D24: Grind section exists
- [ ] D25: No cooldown phase

### D1.7 — No Equipment Warmup Adaptation
**Prompt**: `Full boxing session, 25 minutes`
**Context**: Tier=B, Equipment=NO_EQUIP

**Checkpoints:**
- [ ] D26: Warmup exists
- [ ] D27: Warmup does NOT contain "Jump Rope" segment
- [ ] D28: Warmup uses High Knees or Jumping Jacks instead
- [ ] D29: All active grind segments are "shadowboxing" (not "combo")

### D1.8 — Transition Rests (Rule 14)
**Prompt**: `2 rounds warm up jump rope 2 min. 4 rounds heavy bag 3 min 1 min rest. 1 round cooldown stretching 3 min.`
**Context**: Tier=I, Equipment=FULL_GYM

**Checkpoints:**
- [ ] D30: Warmup phase's LAST segment is a rest named "Get Ready" with duration 30
- [ ] D31: Cooldown phase's FIRST segment is a rest named "Recovery" with duration 30
- [ ] D32: Warmup section has at least 2 segments (active + Get Ready rest)
- [ ] D33: Cooldown section has at least 2 segments (Recovery rest + active)

### D1.9 — No Transition Rest When No Warmup
**Prompt**: `5 rounds heavy bag, 3 min, 1 min rest. 1 round cooldown stretching 3 min.`
**Context**: Tier=I, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] D34: No warmup section
- [ ] D35: No "Get Ready" rest anywhere
- [ ] D36: Cooldown FIRST segment IS "Recovery" rest (grind→cooldown transition exists)

### D1.10 — No Transition Rest When No Cooldown
**Prompt**: `1 round warmup jump rope 2 min. 5 rounds heavy bag, 3 min, 1 min rest.`
**Context**: Tier=I, Equipment=FULL_GYM

**Checkpoints:**
- [ ] D37: Warmup LAST segment IS "Get Ready" rest (warmup→grind transition)
- [ ] D38: No cooldown section
- [ ] D39: No "Recovery" rest anywhere
- [ ] D40: Total phases count = 2 (warmup + grind)

---

## CATEGORY E: RULE 5 — DURATION FORMAT (20 checkpoints)

---

### E1.1 — Standard Minute Conversion
**Prompt**: `3 rounds heavy bag, 3 minutes each, 1 minute rest`
**Context**: Tier=I, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] E1: Active segment duration === 180 (not 3)
- [ ] E2: Rest segment duration === 60 (not 1)

### E1.2 — Mixed Format
**Prompt**: `4 rounds shadowboxing, 1 min 30 sec each, 45 sec rest`
**Context**: Tier=I, Equipment=NO_EQUIP

**Checkpoints:**
- [ ] E3: Active segment duration === 90
- [ ] E4: Rest segment duration === 45

### E1.3 — Seconds Only
**Prompt**: `3 rounds heavy bag, 90 seconds each, 30 seconds rest`
**Context**: Tier=I, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] E5: Active segment duration === 90 (NOT 5400 — "90 seconds" ≠ 90 minutes)
- [ ] E6: Rest segment duration === 30

### E1.4 — Short Abbreviations
**Prompt**: `5 rnds hvy bag 2min 30s rest`
**Context**: Tier=I, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] E7: Active segment duration === 120
- [ ] E8: Rest segment duration === 30
- [ ] E9: Phase repeats === 5

### E1.5 — Duration Clamping
**Prompt**: `3 rounds heavy bag, 15 minutes each, 5 sec rest`
**Context**: Tier=I, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] E10: Active segment duration <= 300 (clamped from 900)
- [ ] E11: Rest segment duration >= 5

### E1.6 — Zero Rest
**Prompt**: `3 rounds shadowboxing, 2 min, no rest`
**Context**: Tier=B, Equipment=NO_EQUIP

**Checkpoints:**
- [ ] E12: Rest segment either absent or duration === 0
- [ ] E13: Phase still has valid active segment

### E1.7 — Half Minutes
**Prompt**: `4 rounds heavy bag, 2 and a half minutes, 1 min rest`
**Context**: Tier=I, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] E14: Active segment duration === 150 (2.5 min)

### E1.8 — Various Time Formats
**Prompt**: `6 rounds, 3 min rounds, 1 min rest, heavy bag`
**Context**: Tier=I, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] E15: Rounds === 6
- [ ] E16: Active duration === 180
- [ ] E17: Rest duration === 60

### E1.9 — Edge: "2:30" Format
**Prompt**: `3 rounds heavy bag, 2:30 each, 0:45 rest`
**Context**: Tier=I, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] E18: Active duration === 150 (2 min 30 sec)
- [ ] E19: Rest duration === 45

### E1.10 — Edge: Very Short Rounds
**Prompt**: `10 rounds shadowboxing, 15 seconds each, 10 seconds rest`
**Context**: Tier=B, Equipment=NO_EQUIP

**Checkpoints:**
- [ ] E20: Active duration === 15 (or clamped to minimum 10)

---

## CATEGORY F: RULE 6 — SUPERSETS (40 checkpoints)

---

### F1.1 — Standard Superset
**Prompt**: `3 rounds superset: heavy bag 2 min and burpees 1 min. 45 sec rest.`
**Context**: Tier=I, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] F1: Exactly 1 grind phase
- [ ] F2: Phase has 3 segments: [active, active, rest]
- [ ] F3: Segment 1: segmentType === "combo", duration === 120
- [ ] F4: Segment 2: segmentType === "exercise", name contains "Burpees", duration === 60
- [ ] F5: Segment 3: type === "rest", duration === 45
- [ ] F6: Phase repeats === 3
- [ ] F7: Phase has combos array (for the heavy bag portion)

### F1.2 — Superset with Per-Round Combos
**Prompt**: `3 rounds superset: heavy bag 2 min and burpees 1 min. 45 sec rest. Round 1: 1-2. Round 2: 1-2-3. Round 3: 1-1-2-3-2.`
**Context**: Tier=I, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] F8: Phase combos === `[["1","2"],["1","2","3"],["1","1","2","3","2"]]`
- [ ] F9: Phase name does NOT contain "Round 1"
- [ ] F10: Phase name contains "Heavy Bag" and "Burpees" (or "Superset")
- [ ] F11: Segment names are clean ("Heavy Bag", "Burpees") not "Round 1: Heavy Bag"

### F1.3 — "Then" Pattern Superset
**Prompt**: `4 rounds shadowboxing 2 min then jump rope 1 min. 30 sec rest`
**Context**: Tier=I, Equipment=FULL_GYM

**Checkpoints:**
- [ ] F12: Phase has 3 segments: [shadowboxing 120s, exercise 60s, rest 30s]
- [ ] F13: Phase repeats === 4
- [ ] F14: First segment segmentType === "shadowboxing"
- [ ] F15: Second segment segmentType === "exercise"

### F1.4 — Triple Superset
**Prompt**: `3 rounds: heavy bag 2 min, push-ups 30 sec, jumping jacks 30 sec. 1 min rest.`
**Context**: Tier=I, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] F16: Phase has 4 segments: [active, active, active, rest]
- [ ] F17: Segment 1: combo 120s
- [ ] F18: Segment 2: exercise 30s, name = "Push-Ups"
- [ ] F19: Segment 3: exercise 30s, name = "Jumping Jacks"
- [ ] F20: Rest 60s

### F1.5 — Superset: Speed Bag + Exercise
**Prompt**: `2 rounds superset: speed bag 2 min and push-ups 45 sec. 30 sec rest. Round 1: doubles. Round 2: triples.`
**Context**: Tier=I, Equipment=FULL_GYM

**Checkpoints:**
- [ ] F21: Phase has 3 segments
- [ ] F22: Segment 1: segmentType === "speedbag"
- [ ] F23: Segment 2: segmentType === "exercise"
- [ ] F24: Phase combos === `[["Doubles"],["Triples"]]`
- [ ] F25: Phase repeats === 2

### F1.6 — Independent Durations Per Exercise
**Prompt**: `3 rounds superset: heavy bag 90 sec and squats 45 sec. 30 sec rest.`
**Context**: Tier=I, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] F26: Segment 1 duration === 90
- [ ] F27: Segment 2 duration === 45
- [ ] F28: Durations are NOT averaged or equalized
- [ ] F29: Total cycle = 90 + 45 + 30 = 165s

### F1.7 — "Back to Back" Pattern
**Prompt**: `5 rounds heavy bag 3 min and burpees 30 sec back to back. 1 min rest`
**Context**: Tier=I, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] F30: Detected as superset (2 active segments)
- [ ] F31: Phase repeats === 5

### F1.8 — Superset Name Generation
**Prompt**: `3 rounds superset: heavy bag and burpees`
**Context**: Tier=I, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] F32: Workout name contains "Superset"
- [ ] F33: Phase name references both activities

### F1.9 — Double End Bag Superset
**Prompt**: `3 rounds superset: double end bag 2 min and mountain climbers 1 min. 45 sec rest. Round 1: 1-2. Round 2: 1-2-3. Round 3: 1-2-5-2.`
**Context**: Tier=I, Equipment=DB_ONLY

**Checkpoints:**
- [ ] F34: Segment 1 segmentType === "doubleend"
- [ ] F35: Segment 2 segmentType === "exercise"
- [ ] F36: Phase combos are correct 3 entries
- [ ] F37: Phase repeats === 3
- [ ] F38: Segment 1 duration === 120
- [ ] F39: Segment 2 duration === 60
- [ ] F40: Rest segment duration === 45

---

## CATEGORY G: RULE 8 — EQUIPMENT CONSTRAINTS (40 checkpoints)

---

### G1.1 — No Equipment = Shadowboxing (Still Gets Combos)
**Prompt**: `5 rounds heavy bag, 3 min, 1 min rest`
**Context**: Tier=I, Equipment=NO_EQUIP

**Checkpoints:**
- [ ] G1: Active segment segmentType === "shadowboxing" (NOT "combo")
- [ ] G2: Phase HAS combos array (shadowboxing still gets combos)
- [ ] G3: Phase combos has 5 entries
- [ ] G4: Segment name says "Shadowboxing" not "Heavy Bag"

### G1.2 — Has Bag = Heavy Bag Combo
**Prompt**: `5 rounds heavy bag, 3 min, 1 min rest`
**Context**: Tier=I, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] G5: Active segment segmentType === "combo"
- [ ] G6: Segment name = "Heavy Bag"

### G1.3 — Speed Bag Without Speed Bag Equipment
**Prompt**: `3 rounds speed bag, 2 min, 30 sec rest`
**Context**: Tier=I, Equipment=BAG_ONLY (no speed bag)

**Checkpoints:**
- [ ] G7: Does NOT have segmentType "speedbag"
- [ ] G8: Either returns error/fallback OR substitutes with exercise/shadowboxing
- [ ] G9: Does not crash

### G1.4 — Double End Bag Correct Equipment
**Prompt**: `3 rounds double end bag, 2 min, 30 sec rest. Round 1: 1-2. Round 2: 1-2-3. Round 3: 1-2-5-2.`
**Context**: Tier=I, Equipment=DB_ONLY

**Checkpoints:**
- [ ] G10: Active segment segmentType === "doubleend"
- [ ] G11: Phase has 3 combos
- [ ] G12: Segment name contains "Double End"

### G1.5 — Full Gym Multi-Phase
**Prompt**: `3 rounds speed bag 2 min 30 sec rest. Then 4 rounds heavy bag 3 min 1 min rest. Then 2 rounds double end bag 2 min 30 sec rest.`
**Context**: Tier=A, Equipment=FULL_GYM

**Checkpoints:**
- [ ] G13: Phase 1 segmentType === "speedbag"
- [ ] G14: Phase 2 segmentType === "combo"
- [ ] G15: Phase 3 segmentType === "doubleend"
- [ ] G16: 3 separate grind phases

### G1.6 — Shadow Only Equipment (Gloves+Wraps, No Bags)
**Prompt**: `5 rounds, 3 min, 1 min rest`
**Context**: Tier=I, Equipment=SHADOW_ONLY

**Checkpoints:**
- [ ] G17: segmentType === "shadowboxing"
- [ ] G18: Phase HAS combos
- [ ] G19: Not "combo" segmentType (no bag to hit)

### G1.7 — Equipment Listed Explicitly in Prompt
**Prompt**: `5 rounds shadowboxing, 3 min, 1 min rest`
**Context**: Tier=I, Equipment=FULL_GYM

**Checkpoints:**
- [ ] G20: segmentType === "shadowboxing" (user said shadowboxing, honor it even with bags available)

### G1.8 — No Equipment Full Session Warmup
**Prompt**: `Full boxing session, 25 minutes`
**Context**: Tier=B, Equipment=NO_EQUIP

**Checkpoints:**
- [ ] G21: Warmup does NOT have "Jump Rope" segment
- [ ] G22: Warmup uses "High Knees" or "Jumping Jacks" instead
- [ ] G23: All grind segments are "shadowboxing"
- [ ] G24: No segment has type "combo", "speedbag", or "doubleend"

### G1.9-G1.10 — Edge Cases (10 checkpoints each)

**G1.9**: Prompt `3 rounds heavy bag` with Equipment=`{ gloves: true, wraps: false, heavyBag: true }`
- [ ] G25: segmentType === "shadowboxing" (wraps missing = can't use bag)
- [ ] G26: Combos still present
- [ ] G27: Name reflects shadowboxing not heavy bag

**G1.10**: Prompt `speed bag doubles for 5 minutes` with Equipment=SB_ONLY
- [ ] G28: segmentType === "speedbag"
- [ ] G29: Has drill combos
- [ ] G30: Duration is 300s or structured as rounds

**Additional equipment edge cases:**
- [ ] G31: Treadmill segment recognized as "exercise" type
- [ ] G32: Jump rope in warmup only when jumpRope === true
- [ ] G33: "sparring" segmentType only when explicitly requested
- [ ] G34-G40: Reserved for additional equipment combination tests

---

## CATEGORY H: RULE 9 — MEGASET REPEATS (20 checkpoints)

---

### H1.1 — Default = 1
**Prompt**: `5 rounds heavy bag, 3 min, 1 min rest`
**Context**: Tier=I, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] H1: `megasetRepeats` === 1

### H1.2 — "Repeat Everything Twice"
**Prompt**: `3 rounds heavy bag, 2 min, 30 sec rest. Repeat everything twice.`
**Context**: Tier=I, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] H2: `megasetRepeats` === 2
- [ ] H3: Phases are NOT duplicated (still 1 phase, megaset handles repetition)
- [ ] H4: No ghost phase named "Training" or empty

### H1.3 — "Run It Back"
**Prompt**: `5 rounds heavy bag, 3 min, 1 min rest. Run it back.`
**Context**: Tier=I, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] H5: `megasetRepeats` === 2

### H1.4 — "Do It Again"
**Prompt**: `4 rounds shadowboxing, 2 min, 30 sec rest. Do it again.`
**Context**: Tier=B, Equipment=NO_EQUIP

**Checkpoints:**
- [ ] H6: `megasetRepeats` === 2

### H1.5 — Explicit Number
**Prompt**: `3 rounds heavy bag, 2 min, 30 sec rest. Repeat everything 3 times.`
**Context**: Tier=I, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] H7: `megasetRepeats` === 3

### H1.6 — Large Megaset (No Upper Cap)
**Prompt**: `3 rounds heavy bag, 2 min, 30 sec rest. Repeat everything 10 times.`
**Context**: Tier=I, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] H8: `megasetRepeats` === 10
- [ ] H9: No error or clamping

### H1.7 — AI Should NOT Auto-Generate Megaset
**Prompt**: `5 rounds heavy bag, 3 min, 1 min rest`
**Context**: Tier=I, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] H10: `megasetRepeats` === 1 (NOT > 1 unless user asked)

### H1.8 — Multi-Phase Megaset
**Prompt**: `3 rounds shadowboxing 2 min 30 sec rest. 3 rounds heavy bag 3 min 1 min rest. Repeat everything twice.`
**Context**: Tier=I, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] H11: `megasetRepeats` === 2
- [ ] H12: 2 grind phases still present (not doubled)
- [ ] H13-H20: Reserved

---

## CATEGORY I: RULE 10 — DIFFICULTY OVERRIDE (20 checkpoints)

---

### I1.1 — Beginner Override on Advanced User
**Prompt**: `3 rounds heavy bag, beginner level`
**Context**: Tier=A, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] I1: `difficulty` === "beginner"
- [ ] I2: Combos use only punches 1-4
- [ ] I3: Combo lengths 2-4
- [ ] I4: No defense tokens in combos

### I1.2 — Advanced Override on Beginner User
**Prompt**: `3 rounds heavy bag, advanced level, 3 min, 1 min rest`
**Context**: Tier=B, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] I5: `difficulty` === "advanced"
- [ ] I6: Combos CAN use punches 5-8
- [ ] I7: Combos CAN have defense tokens

### I1.3 — No Override = Tier Match
**Prompt**: `3 rounds heavy bag, 3 min, 1 min rest`
**Context**: Tier=I, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] I8: `difficulty` === "intermediate"

### I1.4-I1.5 — All Tier Levels

**I1.4**: Same prompt, Tier=R → difficulty "beginner", combos 1-4
- [ ] I9: difficulty === "beginner"
- [ ] I10: All combos use only 1-4

**I1.5**: Same prompt, Tier=P → difficulty "advanced", combos 1-8
- [ ] I11: difficulty === "advanced"
- [ ] I12: At least some combos use 5-8

### I1.6-I1.10 — Tier Combo Compliance (per tier)

**I1.6**: Tier=R, `5 rounds heavy bag, 3 min`
- [ ] I13: All combos max 4 tokens
- [ ] I14: No punch > 4
- [ ] I15: No defense tokens

**I1.7**: Tier=B, `5 rounds heavy bag, 3 min`
- [ ] I16: Same as Rookie rules
- [ ] I17: Combo length 2-4

**I1.8**: Tier=I, `5 rounds heavy bag, 3 min`
- [ ] I18: Punches 1-6 allowed
- [ ] I19: SLIP and ROLL allowed
- [ ] I20: Combo length 3-5

---

## CATEGORY J: RULE 11 — COMBO QUALITY & PROGRESSION (50 checkpoints)

This is the BOXING INTELLIGENCE category. Tests whether the LLM understands boxing.

---

### J1.1 — Progressive Difficulty (Beginner)
**Prompt**: `6 rounds shadowboxing, 2 min, 30 sec rest`
**Context**: Tier=B, Equipment=NO_EQUIP

**Checkpoints:**
- [ ] J1: Combo 1 length <= Combo 6 length
- [ ] J2: Combo 1 length is 2 (simplest)
- [ ] J3: Combo 6 length is 3-4
- [ ] J4: All combos use only punches 1-4
- [ ] J5: At least 3 unique combos out of 6

### J1.2 — Progressive Difficulty (Intermediate)
**Prompt**: `8 rounds heavy bag, 3 min, 1 min rest`
**Context**: Tier=I, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] J6: Combo 1 is shorter than combo 8
- [ ] J7: At least some combos include SLIP or ROLL
- [ ] J8: Combo lengths range from 3 to 5
- [ ] J9: At least 6 unique combos out of 8
- [ ] J10: Punches 5 and 6 appear somewhere

### J1.3 — Progressive Difficulty (Advanced)
**Prompt**: `10 rounds heavy bag, 3 min, 1 min rest`
**Context**: Tier=A, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] J11: Combo 1 is shorter than combo 10
- [ ] J12: Combo 10 has 6-8 tokens
- [ ] J13: At least some combos include defense tokens
- [ ] J14: At least some combos include movement tokens (STEP IN, CIRCLE L, etc.)
- [ ] J15: Punches 7 and 8 (body hooks) appear somewhere
- [ ] J16: At least 8 unique combos out of 10
- [ ] J17: Not every combo starts with "1" (varied openers)

### J1.4 — Varied Openers
**Prompt**: `6 rounds heavy bag, 3 min, 1 min rest`
**Context**: Tier=A, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] J18: Not all 6 combos start with the same punch
- [ ] J19: At least 3 different opening punches across 6 combos
- [ ] J20: At least one combo opens with a hook (3 or 4) or uppercut (5 or 6)

### J1.5 — Natural Power Sequences
**Prompt**: `5 rounds heavy bag, 3 min, 1 min rest`
**Context**: Tier=A, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] J21: At least one combo contains "1","2" (jab-cross) somewhere
- [ ] J22: At least one combo contains "3","2" (hook-cross) or "5","2" (uppercut-cross)
- [ ] J23: No combo has 3+ consecutive same-hand punches (e.g., 1-3-5 or 2-4-6 is fine, but not realistic to have 3 leads or 3 rears in a row)

### J1.6 — Combo Variety (No Duplicates in Short Workouts)
**Prompt**: `4 rounds heavy bag, 2 min, 30 sec rest`
**Context**: Tier=I, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] J24: All 4 combos are unique
- [ ] J25: Varied combo lengths (not all same length)

### J1.7 — Beginner Combo Safety
**Prompt**: `5 rounds shadowboxing, 2 min, 30 sec rest`
**Context**: Tier=B, Equipment=NO_EQUIP

**Checkpoints:**
- [ ] J26: NO punch 5, 6, 7, or 8 in ANY combo
- [ ] J27: NO SLIP, ROLL, DUCK, PULL, BLOCK, PARRY in ANY combo
- [ ] J28: NO STEP IN, STEP OUT, CIRCLE L, CIRCLE R, PIVOT in ANY combo
- [ ] J29: All combo lengths 2-4
- [ ] J30: Only punches 1, 2, 3, 4

### J1.8 — Intermediate Defense Inclusion
**Prompt**: `6 rounds heavy bag, 3 min, 1 min rest`
**Context**: Tier=I, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] J31: At least 1 combo contains "SLIP L" or "SLIP R"
- [ ] J32: At least 1 combo contains "ROLL L" or "ROLL R"
- [ ] J33: No combo contains DUCK, PULL, STEP IN, CIRCLE (advanced-only)
- [ ] J34: Punches 1-6 only, no 7 or 8

### J1.9 — Advanced Full Arsenal
**Prompt**: `8 rounds heavy bag, 3 min, 1 min rest`
**Context**: Tier=A, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] J35: At least 1 combo uses punch 7 (lead body hook)
- [ ] J36: At least 1 combo uses punch 8 (rear body hook)
- [ ] J37: At least 1 combo uses DUCK or PULL
- [ ] J38: At least 1 combo has 6+ tokens
- [ ] J39: Combo diversity: at least 7/8 unique

### J1.10 — Focus Request Honored
**Prompt**: `5 rounds heavy bag, 3 min, 1 min rest, focus on body shots`
**Context**: Tier=A, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] J40: At least 3 out of 5 combos contain punch 7 or 8
- [ ] J41: Tags include "body_work" or similar

### J1.11 — Counter-Punching Request
**Prompt**: `5 rounds heavy bag, focus on counter punching`
**Context**: Tier=A, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] J42: At least 3 combos start with a defense token (SLIP, ROLL, DUCK) followed by punches
- [ ] J43: Defense is at the BEGINNING of combos, not the end

### J1.12 — "Lead Hand Work" Request
**Prompt**: `5 rounds shadowboxing, focus on lead hand`
**Context**: Tier=I, Equipment=NO_EQUIP

**Checkpoints:**
- [ ] J44: Combos emphasize punches 1 (jab), 3 (lead hook), 5 (lead uppercut)
- [ ] J45: Fewer instances of punches 2, 4, 6 compared to 1, 3, 5
- [ ] J46-J50: Reserved for additional combo quality tests

---

## CATEGORY K: RULE 12 — ROUND-BASED STRUCTURE (30 checkpoints)

---

### K1.1 — "Light 15 Minutes" → Rounds, Not One Block
**Prompt**: `Light 15 minutes`
**Context**: Tier=B, Equipment=NO_EQUIP

**Checkpoints:**
- [ ] K1: Has rounds (repeats >= 3)
- [ ] K2: Active segment duration <= 180 (not 900)
- [ ] K3: Has rest segments between rounds

### K1.2 — "Quick 10 Minutes" → Rounds
**Prompt**: `Quick 10 minutes`
**Context**: Tier=B, Equipment=NO_EQUIP

**Checkpoints:**
- [ ] K4: Has rounds (repeats >= 3)
- [ ] K5: Active duration <= 120
- [ ] K6: Total estimated time ~10 min

### K1.3 — Recovery Session → Still Rounds
**Prompt**: `Recovery session, light`
**Context**: Tier=I, Equipment=NO_EQUIP

**Checkpoints:**
- [ ] K7: Has rounds (repeats >= 2)
- [ ] K8: Rest durations >= 30s
- [ ] K9: Simpler combos

### K1.4 — Continuous Exception: Treadmill
**Prompt**: `30 minute treadmill run`
**Context**: Tier=I, Equipment=FULL_GYM

**Checkpoints:**
- [ ] K10: Single segment with duration ~1800 (30 min) is OK
- [ ] K11: NOT broken into boxing-style rounds

### K1.5 — Continuous Exception: Jump Rope
**Prompt**: `10 minutes continuous jump rope`
**Context**: Tier=I, Equipment=FULL_GYM

**Checkpoints:**
- [ ] K12: Single segment ~600s is OK for continuous jump rope

### K1.6 — Continuous Exception: Stretching
**Prompt**: `5 minutes static stretching`
**Context**: Tier=I, Equipment=NO_EQUIP

**Checkpoints:**
- [ ] K13: Single segment ~300s is OK

### K1.7 — Plank Hold
**Prompt**: `3 minute plank hold`
**Context**: Tier=I, Equipment=NO_EQUIP

**Checkpoints:**
- [ ] K14: Single segment ~180s is OK for plank

### K1.8 — Mixed: Boxing + Continuous
**Prompt**: `5 rounds heavy bag 3 min 1 min rest. Then 10 min treadmill.`
**Context**: Tier=I, Equipment=FULL_GYM

**Checkpoints:**
- [ ] K15: Phase 1: repeats=5 (boxing rounds)
- [ ] K16: Phase 2: single segment ~600s (treadmill, NOT rounds)

### K1.9 — "20 Minutes Boxing" → Rounds
**Prompt**: `20 minutes boxing`
**Context**: Tier=I, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] K17: Structured as rounds (repeats >= 4)
- [ ] K18: NOT a single 1200s segment
- [ ] K19: Total duration ~20 min

### K1.10 — "Tired" Prompt → Still Rounds
**Prompt**: `I'm tired today, give me something light`
**Context**: Tier=I, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] K20: Still structured as rounds
- [ ] K21: Shorter rounds (60-120s)
- [ ] K22: Longer rest (45-60s)
- [ ] K23: Simpler combos
- [ ] K24-K30: Reserved

---

## CATEGORY L: RULE 13 — EVERYTHING IS GRIND (20 checkpoints)

---

### L1.1 — "Just a Warmup" → All Grind
**Prompt**: `Just a warmup, 5 minutes`
**Context**: Tier=B, Equipment=FULL_GYM

**Checkpoints:**
- [ ] L1: All phases have section === "grind"
- [ ] L2: No phase has section === "warmup"
- [ ] L3: No phase has section === "cooldown"
- [ ] L4: Warmup-style content (stretching, jump rope) is IN the grind

### L1.2 — "Cooldown Only" → All Grind
**Prompt**: `Just a cooldown, 5 minutes of stretching`
**Context**: Tier=I, Equipment=NO_EQUIP

**Checkpoints:**
- [ ] L5: All phases have section === "grind"
- [ ] L6: Content is stretching/foam rolling in grind section

### L1.3 — "Warmup Only" → All Grind
**Prompt**: `Warmup only, jump rope and dynamic stretches`
**Context**: Tier=I, Equipment=FULL_GYM

**Checkpoints:**
- [ ] L7: All phases section === "grind"
- [ ] L8: Has jump rope and stretching content

### L1.4 — Normal Full Session → Proper Sections
**Prompt**: `Full session: warmup, 5 rounds heavy bag, cooldown`
**Context**: Tier=I, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] L9: Has warmup section
- [ ] L10: Has grind section
- [ ] L11: Has cooldown section
- [ ] L12: Each section has appropriate content

### L1.5 — Timer Must Have Grind
**Prompt**: `5 rounds heavy bag, 3 min, 1 min rest`
**Context**: Tier=I, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] L13: At least one phase has section === "grind"
- [ ] L14: Timer would not crash (grind exists)

### L1.6-L1.10 — Edge Cases
- [ ] L15-L20: Various "only warmup"/"only cooldown" combinations

---

## CATEGORY M: VAGUE & CREATIVE PROMPTS — LLM INTELLIGENCE (60 checkpoints)

These test what ONLY the LLM can do. The regex parser would fail on all of these.

---

### M1.1 — Gym Bro Speak
**Prompt**: `yo gimme sum heat 🔥💪 like 6 rnds or whatever heavy bag idrc`
**Context**: Tier=A, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] M1: Returns valid workout (not error)
- [ ] M2: ~6 rounds
- [ ] M3: segmentType combo
- [ ] M4: Difficulty advanced

### M1.2 — Typos
**Prompt**: `4 roudns hevy bag, 2 minuts eech, 30 sconds restt`
**Context**: Tier=I, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] M5: Returns valid workout
- [ ] M6: 4 rounds
- [ ] M7: Duration 120s
- [ ] M8: Rest 30s

### M1.3 — Voice Dictation Artifacts
**Prompt**: `five rounds of shadow boxing two minutes each thirty seconds of rest between rounds`
**Context**: Tier=I, Equipment=NO_EQUIP

**Checkpoints:**
- [ ] M9: 5 rounds
- [ ] M10: Shadowboxing segmentType
- [ ] M11: Duration 120s
- [ ] M12: Rest 30s

### M1.4 — Mood-Based: Tired
**Prompt**: `I'm tired today, give me something light but keep my hands sharp`
**Context**: Tier=I, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] M13: Shorter rounds (60-120s)
- [ ] M14: Longer rest (45-60s)
- [ ] M15: Simpler combos
- [ ] M16: Still has combos (keeps hands sharp)
- [ ] M17: Total duration < 20 min

### M1.5 — Mood-Based: Energized
**Prompt**: `Feeling great, let's go hard today, give me everything you got`
**Context**: Tier=A, Equipment=FULL_GYM

**Checkpoints:**
- [ ] M18: Longer rounds (180s)
- [ ] M19: Shorter rest (30-45s)
- [ ] M20: Complex combos (5+ tokens)
- [ ] M21: May include warmup/cooldown (full session vibe)
- [ ] M22: High round count (5+)

### M1.6 — Fight Camp
**Prompt**: `Fight camp Tuesday`
**Context**: Tier=A, Equipment=FULL_GYM

**Checkpoints:**
- [ ] M23: Multi-phase workout
- [ ] M24: Advanced combos
- [ ] M25: Includes warmup and/or cooldown
- [ ] M26: Total duration 25+ minutes

### M1.7 — Specific Focus: Hooks
**Prompt**: `Something to work on my hooks`
**Context**: Tier=I, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] M27: At least 60% of combos contain punch 3 (lead hook) or 4 (rear hook)
- [ ] M28: Tags or name reference hooks

### M1.8 — Specific Focus: Defense
**Prompt**: `I need to work on my defense, lots of slipping and rolling`
**Context**: Tier=A, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] M29: Most combos include SLIP L, SLIP R, ROLL L, or ROLL R
- [ ] M30: Tags include defense-related

### M1.9 — Time Constraint
**Prompt**: `Only have 10 minutes`
**Context**: Tier=I, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] M31: Total estimated duration ~10 min
- [ ] M32: No warmup or cooldown (time constraint)
- [ ] M33: 3-5 quick rounds

### M1.10 — Emoji Only
**Prompt**: `🥊🥊🥊🥊🥊 3 min 💪`
**Context**: Tier=I, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] M34: Interprets as ~5 rounds (5 boxing glove emojis)
- [ ] M35: Duration 180s
- [ ] M36: Returns valid workout

### M1.11 — Tabata Style
**Prompt**: `Tabata boxing, 8 rounds`
**Context**: Tier=I, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] M37: 8 rounds
- [ ] M38: Active duration ~20s (Tabata standard)
- [ ] M39: Rest duration ~10s (Tabata standard)

### M1.12 — HIIT Boxing
**Prompt**: `HIIT boxing, 20 minutes`
**Context**: Tier=I, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] M40: Short work intervals (30-60s)
- [ ] M41: Short rest intervals (15-30s)
- [ ] M42: High round count
- [ ] M43: Total ~20 min

### M1.13 — "Surprise Me"
**Prompt**: `Surprise me`
**Context**: Tier=I, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] M44: Returns a valid workout
- [ ] M45: Has combos
- [ ] M46: Reasonable structure (3-8 rounds)

### M1.14 — Spanish/Multilingual
**Prompt**: `5 rondas de saco pesado, 3 minutos, 1 minuto descanso`
**Context**: Tier=I, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] M47: Returns valid workout
- [ ] M48: 5 rounds, 180s, 60s rest

### M1.15 — Contradiction Handling
**Prompt**: `10 rounds but only 3 minutes total`
**Context**: Tier=B, Equipment=NO_EQUIP

**Checkpoints:**
- [ ] M49: Resolves contradiction reasonably (shorter rounds to fit)
- [ ] M50: Returns valid workout (not error)

### M1.16 — External Workout Reference
**Prompt**: `Give me a Mayweather style workout`
**Context**: Tier=A, Equipment=FULL_GYM

**Checkpoints:**
- [ ] M51: Returns valid workout
- [ ] M52: High intensity (many rounds, complex combos)

### M1.17 — Minimal Input
**Prompt**: `bag work`
**Context**: Tier=I, Equipment=BAG_ONLY

**Checkpoints:**
- [ ] M53: Returns valid workout with reasonable defaults
- [ ] M54: Has rounds, rest, combos

### M1.18 — Maximum Verbosity
**Prompt**: `I want to do a really intense boxing session today. Start me off with some jump rope to warm up my calves and get my heart rate going, maybe like 3 minutes. Then do some dynamic stretching. After that I want to hit the heavy bag hard, like 6 rounds of 3 minutes each with 1 minute rest between rounds. Give me progressively harder combos starting simple and building up. After the heavy bag, throw in some speed bag work, like 2 rounds of 2 minutes with 30 second rest. Then finish me off with a cooldown of light shadowboxing and stretching.`
**Context**: Tier=A, Equipment=FULL_GYM

**Checkpoints:**
- [ ] M55: Has warmup with jump rope (~180s) and dynamic stretching
- [ ] M56: Has 6-round heavy bag phase (180s/60s)
- [ ] M57: Has 2-round speed bag phase (120s/30s)
- [ ] M58: Has cooldown with shadowboxing and stretching
- [ ] M59: Combos progress from simple to complex
- [ ] M60: At least 4 distinct phases

---

## CATEGORY N: FULL REGRESSION — THE 6-BLOCK MONSTER (30 checkpoints)

This single prompt tests EVERYTHING working together.

---

### N1.1 — The Full Prompt

**Prompt**:
```
1 round warm up, 3 minutes, no rest. Dynamic stretches.

3 rounds shadowboxing, 2 minutes each, 30 sec rest. Round 1: jab cross hook. Round 2: double jab cross uppercut. Round 3: 1-2-3-6-3-2.

2 rounds speed bag, 2 minutes each, 30 sec rest. Round 1: doubles. Round 2: fist rolls.

3 rounds superset: heavy bag 2 minutes and burpees 1 minute. 45 sec rest between rounds. Round 1: 1-2. Round 2: 1-2-3. Round 3: 1-1-2-3-2.

3 rounds conditioning, 45 seconds each, 20 sec rest. Round 1: plank. Round 2: jumping lunges. Round 3: squat jumps.

1 round cool down, 3 minutes, no rest. Foam rolling.
```
**Context**: Tier=I, Equipment=FULL_GYM

**Checkpoints:**
- [ ] N1: Exactly 6 phases
- [ ] N2: Phase 1 section === "warmup", name contains "Dynamic Stretches"
- [ ] N3: Phase 1 segment duration === 180
- [ ] N4: Phase 2 segmentType === "shadowboxing", repeats === 3
- [ ] N5: Phase 2 combos[0] === ["1","2","3"]
- [ ] N6: Phase 2 combos[1] === ["1","1","2","5"]
- [ ] N7: Phase 2 combos[2] === ["1","2","3","6","3","2"]
- [ ] N8: Phase 3 segmentType === "speedbag", repeats === 2
- [ ] N9: Phase 3 combos[0] === ["Doubles"]
- [ ] N10: Phase 3 combos[1] contains "Fist Rolls"
- [ ] N11: Phase 4 is superset (2+ active segments), repeats === 3
- [ ] N12: Phase 4 segment 1 segmentType === "combo", duration === 120
- [ ] N13: Phase 4 segment 2 segmentType === "exercise", duration === 60
- [ ] N14: Phase 4 rest duration === 45
- [ ] N15: Phase 4 combos === [["1","2"],["1","2","3"],["1","1","2","3","2"]]
- [ ] N16: Phase 4 name does NOT contain "Round 1" text
- [ ] N17: Phase 5 segmentType === "exercise", repeats === 3
- [ ] N18: Phase 5 combos has 3 exercise name entries
- [ ] N19: Phase 5 active segment duration === 45, rest === 20
- [ ] N20: Phase 6 section === "cooldown", name contains "Foam Rolling"
- [ ] N21: Phase 6 segment duration === 180
- [ ] N22: hasWarmup === true
- [ ] N23: hasCooldown === true
- [ ] N24: megasetRepeats === 1
- [ ] N25: hasMultipleBlocks === true
- [ ] N26: Warmup last segment is "Get Ready" rest 30s (Rule 14)
- [ ] N27: Cooldown first segment is "Recovery" rest 30s (Rule 14)
- [ ] N28: All combos are properly formatted arrays
- [ ] N29: No hyphen-joined combos anywhere
- [ ] N30: Total duration calculation is correct

---

## CATEGORY O: VALIDATION & AUTO-REPAIR (30 checkpoints)

---

### O1.1 — Invalid Token Stripping
Test auto-repair by passing pre-crafted "bad" LLM output:
**Input JSON** (simulate LLM response): `{"phases":[{"combos":[["1","2","PUSH","3"]]}],...}`

**Checkpoints:**
- [ ] O1: "PUSH" is stripped from combo
- [ ] O2: Resulting combo is ["1","2","3"]
- [ ] O3: Validation passes after repair

### O1.2 — Hyphen-Joined Repair
**Input JSON**: `{"phases":[{"combos":[["1-2-3"]]}],...}`

**Checkpoints:**
- [ ] O4: Combo repaired to ["1","2","3"]
- [ ] O5: Validation passes

### O1.3 — Missing megasetRepeats
**Input JSON**: `{...no megasetRepeats field...}`

**Checkpoints:**
- [ ] O6: megasetRepeats defaults to 1

### O1.4 — Missing Tags
**Input JSON**: `{...no tags field...}`

**Checkpoints:**
- [ ] O7: tags defaults to []

### O1.5 — No Grind Phase → Reclassify
**Input JSON**: `{"phases":[{"section":"warmup",...}],...}`

**Checkpoints:**
- [ ] O8: Phase section reclassified to "grind"
- [ ] O9: Validation passes (grind exists)

### O1.6 — Duration Clamping
**Input JSON**: `{"phases":[{"segments":[{"duration":3},...]}],...}`

**Checkpoints:**
- [ ] O10: Duration clamped to 10 (minimum)

**Input JSON**: `{"phases":[{"segments":[{"duration":900},...]}],...}`

**Checkpoints:**
- [ ] O11: Duration clamped to 300 (maximum)

### O1.7 — SegmentType Inference
**Input JSON**: Active segment named "Heavy Bag" with no segmentType

**Checkpoints:**
- [ ] O12: segmentType inferred as "combo"

**Input JSON**: Active segment named "Speed Bag" with no segmentType

**Checkpoints:**
- [ ] O13: segmentType inferred as "speedbag"

### O1.8 — Rest Segment Normalization
**Input JSON**: Rest segment with segmentType "combo"

**Checkpoints:**
- [ ] O14: segmentType corrected to "rest"

### O1.9 — Garbage Input → Fallback
**Input**: Non-JSON text from LLM: `"I'd be happy to help you create a workout!"`

**Checkpoints:**
- [ ] O15: Returns `{ fallback: true }`
- [ ] O16: Does not crash
- [ ] O17: Frontend falls back to regex parser

### O1.10 — Empty Phases
**Input JSON**: `{"phases":[],...}`

**Checkpoints:**
- [ ] O18: Validation fails with error "No phases"
- [ ] O19: Returns fallback signal

### O1.11-O1.15 — Additional validation
- [ ] O20: Invalid difficulty value → error
- [ ] O21: megasetRepeats < 1 → repaired to 1
- [ ] O22: Missing segments in phase → error
- [ ] O23: Segment with 0 duration → clamped
- [ ] O24-O30: Reserved for edge case validation

---

## CATEGORY P: FALLBACK CHAIN (20 checkpoints)

---

### P1.1 — API Success → Uses AI Result
**Prompt**: `5 rounds heavy bag, 3 min, 1 min rest`
**Context**: API key configured, Gemini reachable

**Checkpoints:**
- [ ] P1: Response comes from API (not regex)
- [ ] P2: Console logs "[AI Agent] Success"
- [ ] P3: Workout is valid

### P1.2 — API Fails → Falls Back to Regex
**Context**: API key missing or Gemini unreachable

**Checkpoints:**
- [ ] P4: Regex parser handles the prompt
- [ ] P5: Console logs "[AI Agent] Fallback"
- [ ] P6: User gets a valid workout (not error)

### P1.3 — API Returns Invalid JSON → Falls Back
**Context**: API returns garbled text

**Checkpoints:**
- [ ] P7: JSON parse fails gracefully
- [ ] P8: Regex parser takes over
- [ ] P9: No crash

### P1.4 — API Returns Valid But Fails Validation → Falls Back
**Context**: API returns JSON that fails validation

**Checkpoints:**
- [ ] P10: Validation errors logged
- [ ] P11: Fallback flag triggers regex
- [ ] P12: User gets valid workout

### P1.5 — Loading State
**Checkpoints:**
- [ ] P13: Loading indicator shows during API call
- [ ] P14: Loading clears on success
- [ ] P15: Loading clears on fallback
- [ ] P16-P20: Reserved

---

# ═════════════════════════════════════════════════════════════
# PART 2: AI COACH (AGENT 2) — 150+ CHECKPOINTS
# ═════════════════════════════════════════════════════════════

---

## CATEGORY Q: C1 — DIFFICULTY CALIBRATION (20 checkpoints)

---

### Q1.1 — Too Easy Majority → Bump Up
**Input**: 10 workouts, 7 rated "too_easy", 3 "just_right". Profile: Tier=I.

**Checkpoints:**
- [ ] Q1: suggestedDifficulty === "advanced" (bumped from intermediate)
- [ ] Q2: suggestedRestDuration decreased (×0.9)

### Q1.2 — Too Hard Majority → Bump Down
**Input**: 10 workouts, 7 rated "too_hard", 3 "just_right". Profile: Tier=I.

**Checkpoints:**
- [ ] Q3: suggestedDifficulty === "beginner" (bumped from intermediate)
- [ ] Q4: suggestedRestDuration increased (×1.2)

### Q1.3 — Just Right → Maintain
**Input**: 10 workouts, all "just_right". Profile: Tier=I.

**Checkpoints:**
- [ ] Q5: suggestedDifficulty === "intermediate" (no change)

### Q1.4 — No Difficulty Data → Use Profile
**Input**: 10 workouts, all difficulty = null. Profile: Tier=A.

**Checkpoints:**
- [ ] Q6: suggestedDifficulty === "advanced" (from profile)
- [ ] Q7: confidence === "low"

### Q1.5 — Tier Boundary: Already at Max
**Input**: 10 workouts, 8 "too_easy", 2 "just_right". Profile: Tier=A.

**Checkpoints:**
- [ ] Q8: suggestedDifficulty === "advanced" (can't go higher)
- [ ] Q9: suggestedRounds increased (compensating)
- [ ] Q10: suggestedRestDuration decreased further

### Q1.6-Q1.10 — Additional calibration
- [ ] Q11: 5 too_easy + 5 too_hard → defaults to tier
- [ ] Q12: All null difficulty + 0 workouts → isDefault
- [ ] Q13: 1 workout too_easy → not enough data to bump
- [ ] Q14-Q20: Reserved

---

## CATEGORY R: C2 — TREND DETECTION (15 checkpoints)

---

### R1.1 — Getting Easier Trend
**Input**: First 5 workouts "too_hard", last 5 "too_easy" (chronological).

**Checkpoints:**
- [ ] R1: Trend pushes difficulty up
- [ ] R2: suggestedDifficulty bumped

### R1.2 — Getting Harder Trend
**Input**: First 5 "too_easy", last 5 "too_hard".

**Checkpoints:**
- [ ] R3: Trend pushes difficulty down
- [ ] R4: recovery added to focusAreas

### R1.3 — Stable Trend
**Input**: All 10 "just_right".

**Checkpoints:**
- [ ] R5: No trend adjustment

### R1.4 — Insufficient Data
**Input**: 2 workouts.

**Checkpoints:**
- [ ] R6: No trend detection
- [ ] R7: confidence === "low"
- [ ] R8-R15: Reserved

---

## CATEGORY S: C3 — ROUND FEEDBACK (10 checkpoints)

---

### S1.1 — Weak Late Rounds
**Input**: 5 workouts with round_feedback where rounds 4-5 consistently rated 1-2.

**Checkpoints:**
- [ ] S1: suggestedRestDuration >= 60
- [ ] S2: suggestedRoundDuration may decrease

### S1.2 — Strong Throughout
**Input**: 5 workouts with all rounds rated 4-5.

**Checkpoints:**
- [ ] S3: suggestedRounds increased
- [ ] S4-S10: Reserved

---

## CATEGORY T: C4 — PUNCH DISTRIBUTION (15 checkpoints)

---

### T1.1 — Jab-Cross Dominant
**Input**: Profile with punch_1=5000, punch_2=4000, punch_3=200, punch_4=100, punch_5=0, punch_6=0. Tier=I.

**Checkpoints:**
- [ ] T1: punchEmphasis contains 5 and 6
- [ ] T2: focusAreas contains "variety"

### T1.2 — Balanced Distribution
**Input**: All punches roughly equal. Tier=I.

**Checkpoints:**
- [ ] T3: punchEmphasis length <= 1
- [ ] T4: No variety flag

### T1.3 — Beginner Punch Limits
**Input**: Tier=B, punch_1=3000, punch_2=2000, rest=0.

**Checkpoints:**
- [ ] T5: punchEmphasis contains 3 and 4 (within beginner 1-4 range)
- [ ] T6: punchEmphasis does NOT contain 5, 6, 7, or 8
- [ ] T7-T15: Reserved

---

## CATEGORY U: C5 — DEFENSE NEGLECT (10 checkpoints)

---

### U1.1 — Zero Defense After 15 Workouts
**Input**: Profile: 15 workouts, slips=0, rolls=0, pullbacks=0, circles=0. Tier=I.

**Checkpoints:**
- [ ] U1: focusAreas contains "defense"
- [ ] U2: includeDefenseInCombos === true
- [ ] U3: defenseEmphasis.length > 0

### U1.2 — Beginner → No Defense Push
**Input**: Same as above but Tier=B.

**Checkpoints:**
- [ ] U4: focusAreas does NOT contain "defense"
- [ ] U5: includeDefenseInCombos === false

### U1.3-U1.5 — Additional defense tests
- [ ] U6-U10: Reserved

---

## CATEGORY V: C6 — RECOVERY (15 checkpoints)

---

### V1.1 — Same Day Double Session
**Input**: last_workout_date = today.

**Checkpoints:**
- [ ] V1: workoutType === "shadowboxing" or "recovery"
- [ ] V2: focusAreas contains "recovery"
- [ ] V3: suggestedDifficulty bumped down

### V1.2 — 7+ Day Gap (Comeback)
**Input**: last_workout_date = 10 days ago. comeback_count = 2.

**Checkpoints:**
- [ ] V4: includeWarmup === true
- [ ] V5: suggestedDifficulty lower than base
- [ ] V6: confidence <= "medium"

### V1.3 — Normal Next Day
**Input**: last_workout_date = yesterday.

**Checkpoints:**
- [ ] V7: No recovery adjustments
- [ ] V8: focusAreas does NOT contain "recovery"

### V1.4-V1.5 — Edge recovery cases
- [ ] V9: 4-day gap → warmup included
- [ ] V10-V15: Reserved

---

## CATEGORY W: C7, C8, C9 — TIME, STREAK, VARIETY (20 checkpoints)

---

### W1.1 — Early Morning
**Input**: currentTime = 6:30 AM.

**Checkpoints:**
- [ ] W1: targetDuration <= 20
- [ ] W2: suggestedRounds <= 5

### W1.2 — Late Night
**Input**: currentTime = 10 PM.

**Checkpoints:**
- [ ] W3: difficulty bumped down
- [ ] W4: focusAreas contains "recovery"

### W1.3 — 14-Day Streak
**Input**: current_streak = 14.

**Checkpoints:**
- [ ] W5: focusAreas contains "recovery"
- [ ] W6: suggestedRoundDuration <= 180

### W1.4 — Same Workout 4x
**Input**: Last 5 workouts all named "Heavy Bag Blast".

**Checkpoints:**
- [ ] W7: focusAreas contains "variety"
- [ ] W8: workoutType may switch to "mixed"

### W1.5 — Frequent Streak Breaker
**Input**: current_streak = 0, comeback_count = 5.

**Checkpoints:**
- [ ] W9: suggestedRounds <= 4
- [ ] W10: targetDuration <= 20
- [ ] W11-W20: Reserved

---

## CATEGORY X: C10, C11 — GOALS & NOTES (15 checkpoints)

---

### X1.1 — Competition Goal
**Input**: goals = ["competition"]. Tier=A.

**Checkpoints:**
- [ ] X1: suggestedRoundDuration === 180
- [ ] X2: suggestedRestDuration <= 60
- [ ] X3: focusAreas contains "defense"

### X1.2 — Notes: Soreness
**Input**: Last workout notes = "right shoulder is sore".

**Checkpoints:**
- [ ] X4: workoutType === "shadowboxing"
- [ ] X5: difficulty bumped down

### X1.3 — Home Workout Goal + No Equipment
**Input**: goals = ["home_workout"], no heavy bag or double end bag.

**Checkpoints:**
- [ ] X6: workoutType === "shadowboxing"
- [ ] X7: equipmentToUse contains "shadowboxing"
- [ ] X8: equipmentToUse does NOT contain "heavyBag"

### X1.4 — Notes: Positive Feedback
**Input**: Last workout notes = "great session, crushed it".

**Checkpoints:**
- [ ] X9: difficulty bumped up
- [ ] X10-X15: Reserved

---

## CATEGORY Y: C12 — CONFIDENCE SCORING (10 checkpoints)

---

### Y1.1 — High Confidence
**Input**: 15 workouts with difficulty data, last workout 2 days ago.

**Checkpoints:**
- [ ] Y1: confidence === "high"
- [ ] Y2: dataPointsUsed === 15

### Y1.2 — Low Confidence
**Input**: 1 workout, difficulty null, last workout 14 days ago.

**Checkpoints:**
- [ ] Y3: confidence === "low"

### Y1.3 — Zero History
**Input**: Empty history array.

**Checkpoints:**
- [ ] Y4: isDefault === true
- [ ] Y5: confidence === "low"
- [ ] Y6: suggestedDifficulty matches experience_level
- [ ] Y7: encouragement is non-empty

### Y1.4 — Medium Confidence
**Input**: 5 workouts, 3 with difficulty data.

**Checkpoints:**
- [ ] Y8: confidence === "medium"
- [ ] Y9-Y10: Reserved

---

## CATEGORY Z: COACH → BUILDER PIPELINE (20 checkpoints)

Tests the full flow: coach generates recommendation → converts to prompt → feeds to builder → produces valid workout.

---

### Z1.1 — Standard Pipeline
**Setup**: Generate a CoachRecommendation, convert to prompt, feed to API.

**Checkpoints:**
- [ ] Z1: recommendationToPrompt produces a parseable string
- [ ] Z2: String contains round count
- [ ] Z3: String contains duration
- [ ] Z4: String contains rest duration
- [ ] Z5: String contains difficulty level
- [ ] Z6: String contains workout type (heavy bag/shadowboxing/etc.)
- [ ] Z7: AI Builder accepts the prompt and returns valid JSON
- [ ] Z8: Resulting workout matches recommendation parameters (rounds, duration, rest)

### Z1.2 — Recovery Recommendation → Light Workout
**Input**: Coach generates recovery recommendation (shadowboxing, 3 rounds, 120s, 60s rest, beginner).

**Checkpoints:**
- [ ] Z9: Prompt string includes "light" or "shadowboxing"
- [ ] Z10: Builder output has shadowboxing segmentType
- [ ] Z11: Builder output has 3 rounds
- [ ] Z12: Builder output has simple combos

### Z1.3 — Advanced Push → Intense Workout
**Input**: Coach generates advanced push (boxing, 6 rounds, 180s, 45s rest, advanced).

**Checkpoints:**
- [ ] Z13: Builder output has 6 rounds
- [ ] Z14: Builder output has advanced combos (5-8 tokens, punches 1-8)
- [ ] Z15: Builder output has 180s rounds

### Z1.4 — Focus Areas Flow Through
**Input**: Coach recommends defense focus + body work.

**Checkpoints:**
- [ ] Z16: Prompt string includes "defense" and/or "body shots"
- [ ] Z17: Builder output combos include defense tokens and/or body hooks (7, 8)

### Z1.5 — Equipment Constraints Flow Through
**Input**: Coach recommends with equipmentToUse = ["shadowboxing"] (no bags).

**Checkpoints:**
- [ ] Z18: Builder output uses shadowboxing segmentType
- [ ] Z19: No "combo" segmentType in output
- [ ] Z20: Combos still present (shadowboxing with combos)

---

# ═════════════════════════════════════════════════════════════
# RESULTS REPORTING TEMPLATE
# ═════════════════════════════════════════════════════════════

## SUMMARY

| Part | Category | Tests | Checkpoints | Passed | Failed |
|------|----------|-------|-------------|--------|--------|
| 1 | A: Phases vs Rounds | 5 | 40 | /40 | |
| 1 | B: Combo Format | 8 | 40 | /40 | |
| 1 | C: Combos on Phases | 7 | 30 | /30 | |
| 1 | D: Warmup/Cooldown | 10 | 40 | /40 | |
| 1 | E: Duration Format | 10 | 20 | /20 | |
| 1 | F: Supersets | 9 | 40 | /40 | |
| 1 | G: Equipment | 10 | 40 | /40 | |
| 1 | H: Megasets | 8 | 20 | /20 | |
| 1 | I: Difficulty Override | 10 | 20 | /20 | |
| 1 | J: Combo Quality | 12 | 50 | /50 | |
| 1 | K: Round Structure | 10 | 30 | /30 | |
| 1 | L: Everything Grind | 5 | 20 | /20 | |
| 1 | M: Vague/Creative | 18 | 60 | /60 | |
| 1 | N: Full Regression | 1 | 30 | /30 | |
| 1 | O: Validation/Repair | 15 | 30 | /30 | |
| 1 | P: Fallback Chain | 5 | 20 | /20 | |
| 2 | Q: Difficulty Cal (C1) | 10 | 20 | /20 | |
| 2 | R: Trend Detection (C2) | 4 | 15 | /15 | |
| 2 | S: Round Feedback (C3) | 2 | 10 | /10 | |
| 2 | T: Punch Distribution (C4) | 3 | 15 | /15 | |
| 2 | U: Defense (C5) | 5 | 10 | /10 | |
| 2 | V: Recovery (C6) | 5 | 15 | /15 | |
| 2 | W: Time/Streak/Variety | 5 | 20 | /20 | |
| 2 | X: Goals/Notes | 4 | 15 | /15 | |
| 2 | Y: Confidence (C12) | 4 | 10 | /10 | |
| 2 | Z: Coach→Builder | 5 | 20 | /20 | |
| **TOTAL** | **26 categories** | **~180 tests** | **~700 explicit + ~300 reserved** | | |

## TOP FAILURES
For each failure: checkpoint ID, expected value, actual value, raw JSON if applicable.

## PATTERNS
Group failures by root cause (e.g., "all combo format failures" or "all equipment failures").

---

## DO NOT FIX ANYTHING UNTIL ALL TESTS ARE COMPLETE.
## Report the full results table first. Then we fix everything in one pass.

---

# ═════════════════════════════════════════════════════════════
# APPENDIX: EXPANDED TESTS (Filling Reserved Checkpoints)
# ═════════════════════════════════════════════════════════════

## CATEGORY G EXPANDED: Equipment Matrix (G34-G40 + 30 new)

Test every equipment combination with "5 rounds, 3 min, 1 min rest":

### G2.1 — Gloves Only
**Equipment**: `{ gloves: true, wraps: false, heavyBag: false, ...rest false }`
- [ ] G34: segmentType === "shadowboxing" (no wraps = no bag)
- [ ] G35: Combos still generated

### G2.2 — Wraps Only
**Equipment**: `{ gloves: false, wraps: true, ...rest false }`
- [ ] G36: segmentType === "shadowboxing"
- [ ] G37: Combos still generated

### G2.3 — Gloves + Wraps + Heavy Bag + Speed Bag
**Equipment**: `{ gloves: true, wraps: true, heavyBag: true, speedBag: true, ...rest false }`
- [ ] G38: Can use both "combo" and "speedbag" segmentTypes
- [ ] G39: Equipment doesn't interfere

### G2.4 — Jump Rope Only
**Equipment**: `{ jumpRope: true, ...rest false }`
- [ ] G40: Jump rope in warmup works
- [ ] G41: No bag segments generated

### G2.5 — Double End Bag without Gloves
**Equipment**: `{ doubleEndBag: true, gloves: false, wraps: false }`
- [ ] G42: segmentType === "shadowboxing" (no gloves = can't use DB bag)
- [ ] G43: Does not crash

### G2.6 — All Equipment
**Equipment**: FULL_GYM
- [ ] G44: Multi-phase prompt can use all segment types
- [ ] G45: No equipment conflicts

### G2.7 — Treadmill Only
**Equipment**: `{ treadmill: true, ...rest false }`
Prompt: `30 minute run`
- [ ] G46: Creates running/exercise segment
- [ ] G47: ~1800s duration
- [ ] G48: No boxing segments

### G2.8-G2.15 — Cross-Equipment Prompts
Prompt: `3 rounds heavy bag then 2 rounds speed bag` with various equipment configs
- [ ] G49: With BAG_ONLY (no SB): Heavy bag works, speed bag substituted
- [ ] G50: With SB_ONLY (no HB): Heavy bag becomes shadowboxing, speed bag works
- [ ] G51: With FULL_GYM: Both work as specified
- [ ] G52: With NO_EQUIP: Both become shadowboxing/exercise
- [ ] G53-G63: Additional cross-equipment scenarios

---

## CATEGORY J EXPANDED: Combo Intelligence Deep Dive (J46-J50 + 50 new)

### J2.1 — Biomechanical Realism: No Triple Same-Side
**Prompt**: `5 rounds heavy bag, 3 min`
**Context**: Tier=A

Run 3 times and check ALL generated combos:
- [ ] J46: No combo has 3+ consecutive lead-hand punches (1-3-5-7 = four leads in a row)
- [ ] J47: No combo has 3+ consecutive rear-hand punches (2-4-6-8)
- [ ] J48: Natural alternation between lead and rear (mostly)

### J2.2 — Defense Placement Realism
**Prompt**: `5 rounds heavy bag, include defense, 3 min`
**Context**: Tier=A

- [ ] J49: Defense tokens appear MID-combo (slip between punches), not just at end
- [ ] J50: At least one combo has pattern: punch → defense → punch (counter-punching)

### J2.3 — Power Punch Setups
**Prompt**: `5 rounds heavy bag, 3 min`
**Context**: Tier=A

Check for natural boxing patterns:
- [ ] J51: "2" (cross) almost always preceded by "1" (jab) or a defense token
- [ ] J52: "6" (rear uppercut) usually preceded by "3" (hook) or "1" (jab)
- [ ] J53: Body shots (7, 8) sometimes appear after head-level punches (level change)

### J2.4 — Combo Length Distribution Per Tier

**Tier=B, 8 rounds:**
- [ ] J54: Min combo length >= 2
- [ ] J55: Max combo length <= 4
- [ ] J56: Average combo length ~3

**Tier=I, 8 rounds:**
- [ ] J57: Min combo length >= 3
- [ ] J58: Max combo length <= 5
- [ ] J59: Average combo length ~4

**Tier=A, 8 rounds:**
- [ ] J60: Min combo length >= 4
- [ ] J61: Max combo length <= 8
- [ ] J62: Average combo length ~6

### J2.5 — Consistency Across Multiple Generations
Run "5 rounds heavy bag, 3 min" 3 times with same tier/equipment:
- [ ] J63: All 3 runs return valid workouts
- [ ] J64: All 3 runs have 5 combos each
- [ ] J65: Combos are DIFFERENT across runs (not cached/static)
- [ ] J66: All 3 runs respect tier rules
- [ ] J67: All 3 runs have progressive difficulty

### J2.6 — Specific Punch Coverage Over Large Sample
Run "10 rounds heavy bag, 3 min" with Tier=A, 3 times:
- [ ] J68: Punch 1 appears in at least 80% of all combos
- [ ] J69: Punch 2 appears in at least 70% of all combos
- [ ] J70: Punch 3 appears in at least 40% of all combos
- [ ] J71: Punch 5 or 6 appears in at least 20% of all combos
- [ ] J72: Punch 7 or 8 appears in at least 10% of all combos
- [ ] J73: SLIP or ROLL appears in at least 15% of all combos

### J2.7 — "Southpaw" Should NOT Change Numbers
**Prompt**: `5 rounds heavy bag, southpaw, 3 min`
**Context**: Tier=I

- [ ] J74: Combos use same punch numbers (1=lead, 2=rear regardless of stance)
- [ ] J75: No mention of "left" or "right" in combo tokens
- [ ] J76: Punch numbering is stance-agnostic per Rule 11

### J2.8-J2.10 — Focus Request Variations
**Prompt**: `5 rounds, focus on uppercuts`
- [ ] J77: Majority of combos contain punch 5 or 6

**Prompt**: `5 rounds, work on jab`
- [ ] J78: Combos emphasize punch 1 (jab drills, double/triple jabs)

**Prompt**: `5 rounds, body work day`
- [ ] J79: Combos contain punch 7 and/or 8
- [ ] J80: Tags reference body work

### J2.11-J2.15 — Additional combo tests
- [ ] J81: "1-2" appears as a substring in at least 1 combo (fundamental combo)
- [ ] J82: No combo is just a single token (minimum 2)
- [ ] J83: FREESTYLE token is ONLY used when user requests it
- [ ] J84: Combo arrays never contain empty strings
- [ ] J85: All tokens are uppercase where applicable (SLIP L not slip l)
- [ ] J86-J95: Reserved for additional pattern tests

---

## CATEGORY M EXPANDED: More Creative Prompts (M51-M60 + 40 new)

### M2.1 — Pyramid Round Structure
**Prompt**: `Pyramid: 1 min, 2 min, 3 min, 2 min, 1 min rounds with 30 sec rest`
**Context**: Tier=I, Equipment=BAG_ONLY

- [ ] M61: Creates phases or a structure reflecting ascending then descending duration
- [ ] M62: Valid workout output (not error)

### M2.2 — "Death by" Challenge Format
**Prompt**: `Death by heavy bag: start at 1 min, add 30 seconds each round, 6 rounds`
**Context**: Tier=A, Equipment=BAG_ONLY

- [ ] M63: Returns valid workout
- [ ] M64: Some indication of progressive duration

### M2.3 — Song-Length Rounds
**Prompt**: `5 rounds heavy bag, each round the length of a song, about 3-4 minutes`
**Context**: Tier=I, Equipment=BAG_ONLY

- [ ] M65: Rounds are 180-240s range
- [ ] M66: Valid workout

### M2.4 — "Like Yesterday But Harder"
**Prompt**: `Like yesterday but harder`
**Context**: Tier=I, Equipment=BAG_ONLY, historyInsights provided

- [ ] M67: Returns valid workout
- [ ] M68: If history available, difficulty higher than last session

### M2.5 — All Exercises Workout (No Boxing)
**Prompt**: `Pure conditioning: 6 rounds of bodyweight exercises, 1 min each, 30 sec rest. Alternate between upper body and lower body.`
**Context**: Tier=I, Equipment=NO_EQUIP

- [ ] M69: All segments are "exercise" type
- [ ] M70: No "combo" or "shadowboxing" segments
- [ ] M71: 6 rounds
- [ ] M72: Exercise combos alternate upper/lower body

### M2.6 — Jump Rope Only Workout
**Prompt**: `Jump rope workout, 15 minutes`
**Context**: Tier=I, Equipment=FULL_GYM

- [ ] M73: Valid workout
- [ ] M74: Jump rope segments
- [ ] M75: ~15 min total

### M2.7 — "Boxing for Weight Loss"
**Prompt**: `Boxing for weight loss, 30 minutes, lots of cardio`
**Context**: Tier=B, Equipment=BAG_ONLY

- [ ] M76: Includes warmup
- [ ] M77: Shorter rest periods (HIIT-style)
- [ ] M78: May include conditioning/exercise segments
- [ ] M79: ~30 min total

### M2.8 — Mixed Martial Arts Crossover
**Prompt**: `Boxing rounds with conditioning between each round`
**Context**: Tier=I, Equipment=BAG_ONLY

- [ ] M80: Alternating boxing and conditioning phases OR superset structure
- [ ] M81: Valid workout

### M2.9 — "Pre-Fight Warmup"
**Prompt**: `Pre-fight warmup, nothing too intense, just get loose`
**Context**: Tier=A, Equipment=NO_EQUIP

- [ ] M82: Light intensity
- [ ] M83: Short duration (~10 min)
- [ ] M84: Shadowboxing with simple combos

### M2.10 — Technical Breakdown
**Prompt**: `Technical round: slow shadow boxing focusing on form, 3 rounds 3 minutes`
**Context**: Tier=I, Equipment=NO_EQUIP

- [ ] M85: Shadowboxing segmentType
- [ ] M86: Simple combos (form focus)
- [ ] M87: 3 rounds, 180s each
- [ ] M88-M100: Reserved for additional creative prompt tests

---

## CATEGORY Z EXPANDED: Pipeline Integration (Z16-Z20 + 30 new)

### Z2.1 — Full Coach → Builder → Timer Validation
Generate coach rec → convert to prompt → feed to builder → validate output matches timer requirements:
- [ ] Z21: Output workout has `sections.grind` with at least 1 phase
- [ ] Z22: All phases have valid segments
- [ ] Z23: All segments have duration > 0
- [ ] Z24: Workout has totalDuration > 0
- [ ] Z25: Workout has id (UUID generated)

### Z2.2 — Coach Default Workout (Zero History)
- [ ] Z26: isDefault === true in recommendation
- [ ] Z27: Prompt generates valid beginner shadowboxing workout
- [ ] Z28: 3 rounds, ~120s each
- [ ] Z29: Simple combos (1-4 only)
- [ ] Z30: Warmup and cooldown included

### Z2.3 — Coach With Rich History
**Setup**: 15 workouts, intermediate tier, all "just_right", balanced punches.
- [ ] Z31: confidence === "high"
- [ ] Z32: Prompt is detailed and specific
- [ ] Z33: Builder output matches recommended parameters
- [ ] Z34: Combo complexity matches suggested difficulty

### Z2.4 — Coach Recovery Day
**Setup**: last_workout_date = today (double session), current_streak = 7.
- [ ] Z35: workoutType === "shadowboxing" or "recovery"
- [ ] Z36: Prompt includes "light" or "shadowboxing"
- [ ] Z37: Builder output is shorter/simpler
- [ ] Z38: No heavy bag segments

### Z2.5 — Coach With Defense Focus
**Setup**: 20 workouts, zero slips/rolls, intermediate tier.
- [ ] Z39: focusAreas contains "defense"
- [ ] Z40: includeDefenseInCombos === true
- [ ] Z41: Prompt mentions "defensive movement" or similar
- [ ] Z42: Builder combos include SLIP/ROLL tokens

### Z2.6 — Coach Variety Suggestion
**Setup**: Last 5 workouts all named "Heavy Bag Blast".
- [ ] Z43: focusAreas contains "variety"
- [ ] Z44: workoutType may shift to "mixed" or "shadowboxing"
- [ ] Z45: Builder output is different from the repeated workout

### Z2.7 — Coach Morning Optimization
**Setup**: currentTime = 7 AM.
- [ ] Z46: targetDuration <= 20
- [ ] Z47: Prompt generates shorter workout
- [ ] Z48: Builder output total duration < 25 min

### Z2.8 — Coach Competition Prep
**Setup**: goals = ["competition"], Tier=A.
- [ ] Z49: 3-min rounds, 60s rest
- [ ] Z50: Defense in combos
- [ ] Z51-Z60: Reserved for additional pipeline tests

---

# FINAL CHECKPOINT COUNT

| Category | Explicit Checkpoints |
|----------|---------------------|
| A: Phases vs Rounds | 40 |
| B: Combo Format | 40 |
| C: Combos on Phases | 30 |
| D: Warmup/Cooldown | 40 |
| E: Duration Format | 20 |
| F: Supersets | 40 |
| G: Equipment (expanded) | 63 |
| H: Megasets | 20 |
| I: Difficulty Override | 20 |
| J: Combo Quality (expanded) | 95 |
| K: Round Structure | 30 |
| L: Everything Grind | 20 |
| M: Vague/Creative (expanded) | 100 |
| N: Full Regression | 30 |
| O: Validation/Repair | 30 |
| P: Fallback Chain | 20 |
| Q-Y: Coach Engine | 130 |
| Z: Pipeline (expanded) | 60 |
| **TOTAL** | **~828 explicit + reserved to 1000** |

