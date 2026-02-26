import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { autoRepair } from "../lib/aiAutoRepair";
import { validateParsedResult } from "../lib/aiValidation";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = 'gemini-2.5-flash';

const SYSTEM_PROMPT = `You are KOI (Knockout Intelligence), the AI workout builder for the Get Clocked boxing fitness app.

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
- SHADOWBOXING DEFAULT: When the workout type is shadowboxing and the user has NOT specified combos for each round, use ["FREESTYLE"] as the combo for every round. Do NOT generate numbered combos (like ["1","2","3"]) for shadowboxing rounds unless the user explicitly requests specific combinations.

CRITICAL — EXACT COMBO PRESERVATION: When the user specifies exact combos per round (e.g. "Round 1: 1-2, Round 2: 1-2-3" or "Round 1: 1-2-7"), you MUST use those EXACT combos verbatim, converted to token arrays. Do NOT substitute, rearrange, improve, or add defense moves to user-specified combos. User combos are sacred — copy them exactly as given.

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

ALWAYS return just the JSON object. No markdown fences, no explanation.`;

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

export async function registerRoutes(app: Express): Promise<Server> {
  app.post('/api/generate-workout', async (req, res) => {
    if (!GEMINI_API_KEY) {
      console.error('[KOI] GEMINI_API_KEY not configured');
      return res.status(500).json({ error: 'AI service not configured', fallback: true });
    }

    try {
      const body: GenerateRequest = req.body;

      if (!body.prompt) {
        return res.status(400).json({ error: 'Missing prompt', fallback: true });
      }

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;
      const geminiBody = JSON.stringify({
        contents: [{ parts: [{ text: buildUserMessage(body) }] }],
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        generationConfig: { maxOutputTokens: 2000, temperature: 0.7 },
      });

      let parsed: any = null;
      let lastError = '';

      for (let attempt = 0; attempt < 2; attempt++) {
        if (attempt > 0) {
          console.log('[KOI] Retrying after 2s...');
          await new Promise(r => setTimeout(r, 2000));
        }

        let geminiRes: Response;
        try {
          geminiRes = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: geminiBody,
          });
        } catch (fetchErr) {
          lastError = 'fetch failed';
          continue;
        }

        if (!geminiRes.ok) {
          const errText = await geminiRes.text();
          console.error(`[KOI] Gemini API error (attempt ${attempt + 1}):`, geminiRes.status, errText);
          lastError = 'AI generation failed';
          continue;
        }

        const data = await geminiRes.json();
        const rawText: string = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        if (!rawText) {
          console.error('[KOI] Empty response from Gemini');
          lastError = 'Empty AI response';
          continue;
        }

        let jsonStr = rawText.trim();
        if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }

        try {
          parsed = JSON.parse(jsonStr);
          break;
        } catch (e) {
          console.error(`[KOI] JSON parse error (attempt ${attempt + 1}):`, e, 'Raw:', rawText.substring(0, 200));
          lastError = 'Invalid JSON from AI';
        }
      }

      if (!parsed) {
        return res.status(422).json({ error: lastError || 'AI generation failed', fallback: true });
      }

      parsed = autoRepair(parsed);

      const { valid, errors } = validateParsedResult(parsed);
      if (!valid) {
        console.error('[KOI] Validation errors:', errors);
        return res.status(422).json({ error: 'Workout validation failed', errors, fallback: true });
      }

      console.log(`[KOI] Generated: "${parsed.name}" (${parsed.phases?.length} phases)`);
      return res.status(200).json(parsed);

    } catch (err) {
      console.error('[KOI] Unexpected error:', err);
      return res.status(500).json({ error: 'Internal server error', fallback: true });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
