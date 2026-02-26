# GET CLOCKED — COMPLETE XP, BADGE & GLOVE SYSTEM SPECIFICATION
## Version 3.0 — February 2026 — SINGLE SOURCE OF TRUTH

> **THIS DOCUMENT IS THE SOLE SOURCE OF TRUTH** for every number, formula, threshold, badge, combo, rate, and multiplier in the system. Do NOT estimate, approximate, or invent any values. Every number must come directly from this document.

---

# TABLE OF CONTENTS

1. System Overview & Core Rules
2. XP Rates (Per Second)
3. Combo XP Formula
4. Level Curve Configuration (L100 Cap)
5. Prestige System
6. In-Workout Time Multipliers
7. Streak Multiplier System
8. In-Workout Boosters & Power-Ups
9. Real-Time XP Bar Behavior (CRITICAL)
10. Post-Workout Summary Screen
11. Complete Badge System (506 Badges)
12. Glove Progression System (52 Gloves)
13. Cosmetics (Wraps, Borders, Stickers)
14. Session XP Reference Values
15. Implementation Checklist

---

# PART 1: SYSTEM OVERVIEW & CORE RULES

## 1.1 Architecture

The XP system follows this hierarchy:

```
User does workout → Every second, XP ticks up based on activity type
  → Combo segments use the Combo XP Formula
  → Exercise/cardio segments use flat XP/sec rates
  → Rest segments earn 0.00 XP/sec (bar pauses)
  → Championship rounds apply 2x multiplier to boxing segments
  → In-workout time multiplier increases based on elapsed time
  → Streak multiplier applies on top of everything
  → Badges trigger in real-time during workout with visual pops
  → Post-workout summary shows full breakdown
  → XP → Level progression → Rank progression → Prestige
```

## 1.2 Core Rules

1. **L100 is the level cap per prestige tier.** There are NO levels above 100. Post-L100 progression is badge farming only.
2. **All XP rates are PER SECOND.** Pushups at 0.22 means 0.22 XP × duration_in_seconds. A 30s pushup segment = 6.6 XP, NOT 0.22 XP.
3. **The XP bar ticks CONTINUOUSLY every second during a workout.** It is NEVER static while the user is actively working. During rest (0.00 XP/sec) the bar pauses, making the contrast obvious.
4. **Badges are one-time only.** Once earned, you have it forever. No repeatable badges.
5. **Level 0→1 always costs 1 XP.** This is the instant hook — first punch = first level. Non-negotiable.
6. **XP is stored as `total_xp` in the database.** The function `getLevelFromXP()` derives the current level. The XP bar shows progress within the current level.
7. **Skipping segments = less XP.** If a user skips 4 segments, they earn LESS XP, not more. XP is accumulated per-second-of-active-time only.

---

# PART 2: XP RATES (ALL VALUES ARE PER SECOND)

## 2.1 Punch Base XP Values (Used in Combo Formula)

| # | Punch | Base XP | Stance |
|---|-------|---------|--------|
| 1 | Jab | 5.5 | Orthodox |
| 2 | Cross | 6.5 | Orthodox |
| 3 | Lead Hook | 7.5 | Orthodox |
| 4 | Rear Hook | 8.0 | Orthodox |
| 5 | Lead Uppercut | 8.5 | Orthodox |
| 6 | Rear Uppercut | 9.5 | Orthodox |
| 7 | Lead Body Hook | 11.0 | Orthodox |
| 8 | Rear Body Hook | 11.0 | Orthodox |

## 2.2 Defense Base XP Values (Used in Combo Formula)

| Move | Base XP |
|------|---------|
| Slip Left | 4.5 |
| Slip Right | 4.5 |
| Roll | 5.5 |
| Pullback | 5.0 |
| Circle Left | 4.0 |
| Circle Right | 4.0 |

## 2.3 Exercise & Activity XP Rates (XP per Second)

| Activity | XP/sec | Context |
|----------|--------|---------|
| Pushups | 0.22 | Every round (30s segments) |
| Burpees | 0.28 | Championship rounds (30s segments) |
| Curlups | 0.18 | Conditioning phase (120s) |
| Jump Rope | 0.25 | Warmup with equipment (180s) |
| Treadmill | 0.20 | Cooldown with equipment (600s) |
| Jog in Place | 0.15 | Warmup without equipment (180s) |
| Jog | 0.15 | Cooldown without equipment (600s) |
| Rest | 0.00 | Recovery between segments — bar PAUSES |
| Shadow Freestyle | 0.35 | Freestyle boxing segments |
| Bag Freestyle | 0.40 | Bag freestyle boxing segments |
| Bag Combo Bonus | 0.20 | Added ON TOP of combo XP when hitting bag |

### CRITICAL: How to Calculate Segment XP

```
Segment XP = XP_per_second × duration_in_seconds
```

**Examples:**
- Pushups 30s = 0.22 × 30 = **6.6 XP**
- Jog cooldown 600s = 0.15 × 600 = **90.0 XP**
- Jump rope warmup 180s = 0.25 × 180 = **45.0 XP**
- Curlups 120s = 0.18 × 120 = **21.6 XP**
- Shadow freestyle championship 60s at 2x = 0.35 × 60 × 2 = **42.0 XP**
- Rest 30s = 0.00 × 30 = **0.0 XP**

## 2.4 Additional Activity XP Rates

| Activity | XP/sec | Notes |
|----------|--------|-------|
| Shadowboxing | 0.33 | General shadow work |
| Mitt Work | 0.30 | Future feature |
| Sparring (Rookie) | 2.5 | Future feature |
| Sparring (Beginner) | 3.0 | Future feature |
| Sparring (Intermediate) | 3.5 | Future feature |
| Sparring (Advanced) | 4.0 | Future feature |
| Sparring (Pro) | 5.0 | Future feature |
| Running | 0.25 | |
| Cycling | 0.20 | |
| Walking | 0.12 | |
| Pull-ups | 0.30 | |
| Squats | 0.22 | |
| Lunges | 0.22 | |
| Russian Twists | 0.22 | |
| Mountain Climbers | 0.22 | |
| Leg Raises | 0.18 | |
| High Knees | 0.15 | |
| Planks | 0.15 | |
| Wall Sits | 0.15 | |
| Stretching | 5 XP flat | Per stretch, not per second |
| Foam Rolling | 0.10 | |
| Meditation | 0.05 | |

---

# PART 3: COMBO XP FORMULA

## 3.1 The Formula

```
Combo XP = (Sum of all move base XP values) × Length Bonus × Defense Bonus × (Duration / 30)
```

### Length Bonus Multiplier

| Combo Length | Multiplier |
|-------------|------------|
| 2–3 moves | 1.0× |
| 4 moves | 1.1× |
| 5 moves | 1.2× |
| 6+ moves | 1.35× |

### Defense Bonus Multiplier

| Defense Moves in Combo | Multiplier |
|-----------------------|------------|
| 0 | 1.0× |
| 1 | 1.15× |
| 2 | 1.3× |
| 3+ | 1.45× |

## 3.2 How to Parse Combos

Combo strings use dash-separated notation: `1-2-slip left-3-roll-2`

- Numbers (1–8) are punches → look up in Punch XP table
- Multi-word tokens (`slip left`, `slip right`, `circle left`, `circle right`) are single defensive moves
- `roll`, `pullback` are single-word defensive moves
- Count TOTAL moves for length bonus
- Count DEFENSE moves only for defense bonus
- Duration scaling: a 60s combo segment earns 2× what a 30s segment earns

## 3.3 Example Calculations

**Combo: `1-2-3` (30s segment)**
- Moves: Jab(5.5) + Cross(6.5) + Lead Hook(7.5) = 19.5 base
- Length: 3 moves → 1.0×
- Defense: 0 → 1.0×
- XP = 19.5 × 1.0 × 1.0 × (30/30) = **19.5 XP**

**Combo: `1-2-slip left-3-roll-2` (30s segment)**
- Moves: Jab(5.5) + Cross(6.5) + Slip Left(4.5) + Lead Hook(7.5) + Roll(5.5) + Cross(6.5) = 36.0 base
- Length: 6 moves → 1.35×
- Defense: 2 (slip left + roll) → 1.3×
- XP = 36.0 × 1.35 × 1.3 × (30/30) = **63.2 XP**

## 3.4 Combo XP Implementation

```typescript
function calculateComboXP(comboString: string, durationSeconds: number): number {
  const moves = parseCombo(comboString);
  if (!moves.length) return 0;

  let baseSum = 0;
  let defenseCount = 0;
  const totalMoves = moves.length;

  for (const move of moves) {
    if (PUNCH_VALUES[move]) {
      baseSum += PUNCH_VALUES[move];
    } else if (DEFENSE_VALUES[move]) {
      baseSum += DEFENSE_VALUES[move];
      defenseCount++;
    }
  }

  // Length Bonus
  let lengthBonus = 1.0;
  if (totalMoves === 4) lengthBonus = 1.1;
  else if (totalMoves === 5) lengthBonus = 1.2;
  else if (totalMoves >= 6) lengthBonus = 1.35;

  // Defense Bonus
  let defBonus = 1.0;
  if (defenseCount === 1) defBonus = 1.15;
  else if (defenseCount === 2) defBonus = 1.3;
  else if (defenseCount >= 3) defBonus = 1.45;

  return baseSum * lengthBonus * defBonus * (durationSeconds / 30);
}
```

---

# PART 4: LEVEL CURVE CONFIGURATION (L100 CAP)

## 4.1 The Formula

```
cost(n) = A × n^B
```

Where `n` is the level number (1–100), and `cost(n)` is the XP needed to go from level n-1 to level n.

**Special case:** Level 0→1 always costs 1 XP (instant hook).

## 4.2 Locked Power Curve Configurations

| Tier | A | B | L1 Cost | L100 Cost | L100/L1 Ratio | Total XP to L100 |
|------|---|---|---------|-----------|---------------|-------------------|
| Rookie | 142.70 | 0.200 | 143 | 358 | 2.5× | 30,000 |
| Beginner | 149.31 | 0.4261 | 149 | 534 | 3.6× | 75,000 |
| Intermediate | 243.88 | 0.5139 | 244 | 1,031 | 4.2× | 173,000 |
| Advanced | 443.04 | 0.5185 | 443 | 1,899 | 4.3× | 320,000 |
| Pro | 651.85 | 0.5337 | 652 | 2,950 | 4.5× | 500,000 |

## 4.3 Session Targets (at 4×/week)

### Shadow-Only (no equipment):

| Tier | Sessions to L100 | Time | 1st Session Level |
|------|-------------------|------|-------------------|
| Rookie | 21 | 1.2 months | L10 |
| Beginner | 49 | 2.8 months | L7 |
| Intermediate | 88 | 5.1 months | L6 |
| Advanced | 140 | 8.1 months | L5 |
| Pro | 212 | 1.0 year | L4 |

### With Bags (full equipment):

| Tier | Sessions to L100 | Time |
|------|-------------------|------|
| Rookie | 18 | 1.0 months |
| Beginner | 43 | 2.5 months |
| Intermediate | 80 | 4.6 months |
| Advanced | 131 | 7.6 months |
| Pro | 202 | 11.7 months |

## 4.4 Base Session XP (from actual loadout workouts)

| Tier | Shadow XP/session | Description |
|------|-------------------|-------------|
| Rookie | 679.8 | Simple 2-3 punch combos |
| Beginner | 829.8 | + slips introduced |
| Intermediate | 1,096.6 | Longer combos + rolls, pullback |
| Advanced | 1,706.3 | 5-9 move combos, full defense weaving |
| Pro | 2,291.0 | 7-11 move combos, full armory |

Bags add ~45.6 XP/session on top (from jump rope vs jog warmup + treadmill vs jog cooldown).

Bag combo bonus rate: 0.23 XP/sec (flat, on top of combo XP during bag rounds).

## 4.5 getLevelFromXP() Implementation

```typescript
function getLevelFromXP(totalXP: number, prestige: string): { level: number; xpIntoLevel: number; xpForNextLevel: number } {
  const configs: Record<string, { A: number; B: number }> = {
    rookie:       { A: 142.70, B: 0.200 },
    beginner:     { A: 149.31, B: 0.4261 },
    intermediate: { A: 243.88, B: 0.5139 },
    advanced:     { A: 443.04, B: 0.5185 },
    pro:          { A: 651.85, B: 0.5337 },
  };

  const config = configs[prestige.toLowerCase()];
  if (!config) return { level: 1, xpIntoLevel: 0, xpForNextLevel: 100 };

  let level = 0;
  let cumulative = 0;

  while (level < 100) {
    const costForNext = level === 0
      ? 1  // L0→L1 always costs 1 XP
      : Math.max(1, Math.round(config.A * Math.pow(level, config.B)));

    if (cumulative + costForNext > totalXP) {
      return {
        level,
        xpIntoLevel: totalXP - cumulative,
        xpForNextLevel: costForNext,
      };
    }

    cumulative += costForNext;
    level++;
  }

  // At L100 cap
  return { level: 100, xpIntoLevel: 0, xpForNextLevel: 0 };
}
```

---

# PART 5: PRESTIGE SYSTEM

## 5.1 How It Works

1. Start at Rookie, Level 1
2. Level up through 100 levels within your prestige tier
3. At Level 100: prestige to the NEXT tier (reset to Level 1 of next tier)
4. Each prestige earns exclusive rewards (gloves, cosmetics)
5. Final achievement: **BMF** (Baddest Motherfucker)

## 5.2 Prestige Tier Table

| Prestige | Tier # | Levels | Total XP to L100 | Prestige Reward |
|----------|--------|--------|-------------------|-----------------|
| Rookie | 1 | 100 | 30,000 | Golden Gloves |
| Beginner | 2 | 100 | 75,000 | Platinum Gloves |
| Intermediate | 3 | 100 | 173,000 | Emerald Gloves |
| Advanced | 4 | 100 | 320,000 | Ruby Gloves |
| Pro | 5 | 100 | 500,000 | Diamond Gloves |
| **BMF** | **6** | **∞ (badge farming)** | — | **BMF Gloves** |

## 5.3 Tier Assignment

The user's tier is selected during onboarding. They choose based on their experience level. This determines their combo pools, workout difficulty, and XP curve.

## 5.4 BMF Requirements

- Complete all 5 prestiges (reach Pro L100 and prestige)
- Requires 250 Pro-level sessions minimum
- BMF status is the endgame — progression continues through badges only

## 5.5 BMFK (BMF King) — Ultimate Achievement

- Reach BMF status
- Maintain 365 consecutive day streak
- The single hardest achievement in the entire system

---

# PART 6: IN-WORKOUT TIME MULTIPLIERS

## 6.1 The Concept

The longer you work out, the higher your XP multiplier climbs. This rewards sustained effort and creates "one more round" moments.

## 6.2 Multiplier Tiers

| Elapsed Time | Multiplier | Label | Color |
|-------------|------------|-------|-------|
| 0–5 min | 1.00× | Warming Up | #FFFFFF |
| 5–10 min | 1.10× | Getting Started | #90CAF9 |
| 10–15 min | 1.15× | In The Zone | #2196F3 |
| 15–20 min | 1.20× | Locked In | #4CAF50 |
| 20–30 min | 1.30× | On Fire 🔥 | #FF9800 |
| 30–45 min | 1.40× | Beast Mode 💪 | #F44336 |
| 45–60 min | 1.50× | Unstoppable ⚡ | #FFD700 |
| 60–90 min | 1.60× | Marathon Mode 🏆 | #B0BEC5 |
| 90+ min | 1.75× | Legendary Effort 👑 | #E0E0E0 |

## 6.3 UI Display

```
┌─────────────────────────────────────────┐
│  XP: 847 ▓▓▓▓▓▓▓▓▓▓▓░░░ Level 14      │
│                          🔥 1.3x ON FIRE │
│                                          │
│  Timer: 24:32                            │
│  Next boost: 1.4x at 30:00              │
└─────────────────────────────────────────┘
```

- Current multiplier label with visual effect
- Countdown to next multiplier tier
- When a new tier activates: flash animation + sound effect + label text

## 6.4 Implementation

```typescript
function getInWorkoutMultiplier(elapsedSeconds: number): {
  multiplier: number;
  label: string;
  color: string;
} {
  const minutes = elapsedSeconds / 60;

  if (minutes >= 90) return { multiplier: 1.75, label: "Legendary Effort 👑", color: "#E0E0E0" };
  if (minutes >= 60) return { multiplier: 1.60, label: "Marathon Mode 🏆", color: "#B0BEC5" };
  if (minutes >= 45) return { multiplier: 1.50, label: "Unstoppable ⚡", color: "#FFD700" };
  if (minutes >= 30) return { multiplier: 1.40, label: "Beast Mode 💪", color: "#F44336" };
  if (minutes >= 20) return { multiplier: 1.30, label: "On Fire 🔥", color: "#FF9800" };
  if (minutes >= 15) return { multiplier: 1.20, label: "Locked In", color: "#4CAF50" };
  if (minutes >= 10) return { multiplier: 1.15, label: "In The Zone", color: "#2196F3" };
  if (minutes >= 5)  return { multiplier: 1.10, label: "Getting Started", color: "#90CAF9" };
  return { multiplier: 1.00, label: "Warming Up", color: "#FFFFFF" };
}
```

## 6.5 Math Impact (59-minute workout)

- Without multipliers: ~1,154 XP
- With multipliers: ~1,511 XP (effective ~1.31× average)
- With multipliers + completion bonus: ~1,662 XP

---

# PART 7: STREAK MULTIPLIER SYSTEM

## 7.1 Streak Multiplier Table

| Streak Days | Multiplier |
|------------|------------|
| 0–2 | ×1.0 |
| 3–6 | ×1.1 |
| 7–13 | ×1.25 |
| 14–29 | ×1.4 |
| 30–59 | ×1.6 |
| 60–99 | ×1.8 |
| 100–149 | ×2.0 |
| 150–199 | ×2.25 |
| 200–299 | ×2.5 |
| 300–364 | ×2.75 |
| 365+ | ×3.0 (cap) |

## 7.2 Streak Rules

- A streak increments when a workout is completed on a new calendar day
- Missing a day resets the streak to 0 (no comeback mechanic in v1)
- The streak multiplier applies to ALL XP earned during the session
- Streak multiplier stacks multiplicatively with the in-workout time multiplier

## 7.3 XP Calculation Order (During Workout, Every Second)

```
1. BASE XP = Activity XP/sec rate for current segment
2. COMBO BONUS = Combo Formula result (for combo segments only)
3. IN-WORKOUT MULTIPLIER = Time-based multiplier (1.0× to 1.75×)
4. CHAMPIONSHIP BONUS = 2× on boxing segments in championship rounds
5. STREAK MULTIPLIER = Day-streak multiplier (1.0× to 3.0×)

FINAL XP/sec = (BASE + COMBO) × IN-WORKOUT × CHAMPIONSHIP × STREAK
```

---

# PART 8: IN-WORKOUT BOOSTERS & POWER-UPS

## 8.1 The Concept

During a workout, specific actions trigger instant XP bonuses and visual feedback — like COD kill streaks.

## 8.2 Booster Triggers

| Trigger | XP Bonus | Visual |
|---------|----------|--------|
| First Combo of Session | +10 XP | "First Blood!" pop |
| Clean Combo (no pause/hesitation) | +15 XP | Green flash |
| Combo Streak ×3 (3 clean in a row) | +25 XP | "Combo Streak!" pop |
| Perfect Round (all combos clean) | +50 XP | "Perfect Round!" full-screen flash |
| Complexity Bonus (6+ move combo) | +30 XP | "Complex!" pop |
| Defense Master (3+ defensive moves) | +40 XP | "Defense Master!" pop |
| Back to Back Level-Up | +75 XP | "Back to Back!" pop |

## 8.3 XP Milestone Pops (During Workout)

| Session XP Milestone | Bonus | Visual |
|---------------------|-------|--------|
| 250 XP | +25 XP | Milestone flash |
| 500 XP | +50 XP | Milestone flash |
| 750 XP | +75 XP | Milestone flash |
| 1,000 XP | +100 XP | Big milestone flash |
| 1,500 XP | +150 XP | Milestone flash |
| 2,000 XP | +200 XP | Mega milestone flash |

---

# PART 9: REAL-TIME XP BAR BEHAVIOR (CRITICAL — READ THIS CAREFULLY)

## 9.1 The #1 Rule

**The XP bar MUST tick up CONTINUOUSLY in real-time, every second, for the entire workout.**

Every activity has an XP/sec rate — USE IT. During a pushup segment, the bar gains 0.22 XP every second. During jog cooldown, it gains 0.15 XP every second. During shadow freestyle, 0.35 XP every second.

The bar should NEVER be static while the user is actively working out — it is always visibly moving.

During rest segments (0.00 XP/sec) the bar pauses, which makes the contrast obvious and reinforces that rest earns nothing.

**THIS IS NOT "add XP at segment completion."** The bar does NOT jump at the end of each segment. It ticks smoothly, every second, throughout.

## 9.2 Timer Screen XP Bar Layout

```
┌─────────────────────────────────────┐
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░  AMATEUR      │ ← XP BAR (always visible at top)
│  1,247 / 1,500 XP                   │
├─────────────────────────────────────┤
│                                     │
│  BOXING ROUNDS          ⏱ 12:34    │
│  Round 7 of 14                      │
│                                     │
│           1:47                      │ ← MAIN COUNTDOWN TIMER
│                                     │
│  ┌───────────────────────────────┐  │
│  │     1  —  2  —  SLIP  —  2    │  │ ← Combo display
│  └───────────────────────────────┘  │
│                                     │
│         ┌──────────────┐            │
│         │    ⏸ PAUSE   │            │
│         └──────────────┘            │
└─────────────────────────────────────┘
```

## 9.3 XP Bar Component

```typescript
interface XPBarProps {
  currentXP: number;        // Running session total
  xpToNextLevel: number;    // Cost of current level
  xpIntoCurrentLevel: number; // Progress within current level
  currentLevel: number;
  currentRank: string;      // "Amateur", "Prospect", etc.
  nextRank: string;
}
```

**Behavior:**
- On workout start: initialize with user's current cumulative XP position within their current level
- Every second: add the current segment's XP/sec rate (× all active multipliers) to the running total
- Animate the bar filling smoothly — use CSS transitions or requestAnimationFrame
- The bar should have a subtle glow when it's actively ticking
- Display: current rank name, XP progress numbers, bar fill percentage

## 9.4 Level-Up Mid-Workout

When the bar fills completely (user crosses a level threshold during workout):
1. Bar fills to 100% with bright flash
2. Brief level-up animation: pulse effect, "+1 Level" text, maybe confetti
3. Reset bar to 0 and start filling toward the next level's threshold
4. Level number ticks up visually
5. If multiple level-ups happen in quick succession (common on session 1), each gets its own animation — do NOT skip levels silently

## 9.5 What XP/sec Rate to Use Per Segment Type

| Segment | XP/sec Rate |
|---------|-------------|
| Shadow combo | Use Combo XP Formula ÷ segment duration |
| Bag combo | Use Combo XP Formula ÷ segment duration + bag combo bonus (0.20/sec) |
| Shadow freestyle | 0.35/sec |
| Bag freestyle | 0.40/sec |
| Pushups | 0.22/sec |
| Burpees | 0.28/sec |
| Curlups | 0.18/sec |
| Jump rope | 0.25/sec |
| Treadmill | 0.20/sec |
| Jog in place | 0.15/sec |
| Jog | 0.15/sec |
| Rest | 0.00/sec (BAR PAUSES) |

For combo segments, pre-calculate the combo's XP at the start of the segment, divide by segment duration, and use that as the tick rate for the visual bar.

---

# PART 10: POST-WORKOUT SUMMARY SCREEN

## 10.1 This Is the Most Important Screen for Retention

After the timer ends, show a full summary. This is the dopamine payoff.

## 10.2 Layout

```
┌─────────────────────────────────────┐
│          WORKOUT COMPLETE           │
│                                     │
│         +1,023 XP                   │ ← Big animated number
│                                     │
│  BREAKDOWN                          │
│  Base (30 min active)      300 XP   │
│  Duration bonus (×1.25)    +75 XP   │
│  Intensity (×1.15)         +52 XP   │
│  Boxing (×1.3)             +156 XP  │
│  Perfect completion        +145 XP  │
│  No pauses                 +77 XP   │
│  ─────────────────────────────────  │
│  Subtotal                  805 XP   │
│                                     │
│  🔥 7-Day Streak           +100 XP  │
│  🌅 Early Bird             +50 XP   │
│  ⭐ First Time Bonus       +68 XP   │
│  ─────────────────────────────────  │
│  TOTAL                    1,023 XP  │
│                                     │
│  🏆 NEW ACHIEVEMENT UNLOCKED        │
│  ┌─────────────────────────────┐    │
│  │ 🎯 Week Warrior             │    │
│  │    7 day streak • +150 XP   │    │
│  └─────────────────────────────┘    │
│                                     │
│  RANK PROGRESS                      │
│  Title Contender → #1 Contender     │
│  ████████████████░░░░  76%          │
│  30,800 XP to next rank             │
│                                     │
│  ┌─────────────────────────────┐    │
│  │         CONTINUE            │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

## 10.3 Key Elements

- **XP Earned Breakdown:** Base XP, streak bonus, badge XP, session total — stacked so user sees where XP came from
- **Level Progress:** XP bar showing before → after for current level
- **Level-Up Moment:** If cumulative XP crossed a level threshold — FULL visual event (flash, level number animating up, confetti). Multiple level-ups tick sequentially
- **Badges Earned:** All badges earned this session in horizontal scroll/grid with shape, name, XP reward
- **Streak Update:** Current streak count and multiplier. If streak hit a new tier, call it out visually
- **Streak Break:** If streak was broken, show: "Streak reset from 14 days to 0." Show lost multiplier. Don't hide it.

---

# PART 11: COMPLETE BADGE SYSTEM (506 BADGES)

## 11.1 Design Philosophy

Badges are **active**, not passive. Many trigger DURING a workout with visual pops, sound effects, and XP bonuses. This turns every workout into a potential badge hunt. All badges are **one-time only** — once earned, you have it forever.

## 11.2 Badge Categories Summary

| Category | Count |
|----------|-------|
| Level Milestones | 45 |
| Rankings | 14 |
| Prestige | 7 |
| Streaks | 20 |
| Combos | 30 |
| Volume | 18 |
| Time | 18 |
| Sparring | 15 |
| Conditioning | 72 |
| In-Workout | 35 |
| Special / Secret | 55 |
| Social & Referral | 12 |
| Recovery | 18 |
| Challenge Completion | 18 |
| Personal Records | 20 |
| Seasonal / Events | 24 |
| Consistency Patterns | 35 |
| Extended Grind (101-500) | 50 |
| **TOTAL** | **506** |

---

## 11.3 Streak Badges (20 badges)

| Badge | Requirement | XP |
|-------|------------|-----|
| Day One | 1 day streak | 10 |
| Day Two | 2 day streak | 25 |
| Warming Up | 3 day streak | 50 |
| Building Steam | 4 day streak | 75 |
| On A Roll | 5 day streak | 150 |
| Almost There | 6 day streak | 200 |
| Week Strong | 7 day streak | 300 |
| Double Week | 10 day streak | 500 |
| Fortnight | 14 day streak | 800 |
| Three Weeks | 21 day streak | 1,200 |
| Iron Chin | 30 day streak | 2,000 |
| Steel Will | 45 day streak | 3,500 |
| Unbreakable | 60 day streak | 5,000 |
| Diamond Mind | 75 day streak | 7,000 |
| Machine | 100 day streak | 10,000 |
| Terminator | 150 day streak | 15,000 |
| Inhuman | 200 day streak | 22,000 |
| Transcendent | 250 day streak | 30,000 |
| Immortal | 365 day streak | 50,000 |
| Eternal | 500 day streak | 75,000 |

## 11.4 Combo Badges (30 badges)

| Badge | Requirement | XP |
|-------|------------|-----|
| First Combo | 1 total combo | 5 |
| Combo Starter | 25 total combos | 25 |
| Combo Student | 50 total combos | 50 |
| Combo Regular | 100 total combos | 100 |
| Combo Enthusiast | 250 total combos | 250 |
| Combo Adept | 500 total combos | 500 |
| Combo Fighter | 750 total combos | 750 |
| Combo Artist | 1,000 total combos | 1,000 |
| Combo Specialist | 1,500 total combos | 1,500 |
| Combo Expert | 2,500 total combos | 2,500 |
| Combo Veteran | 3,500 total combos | 3,500 |
| Combo Master | 5,000 total combos | 5,000 |
| Combo Commander | 7,500 total combos | 6,500 |
| Combo King | 10,000 total combos | 8,000 |
| Combo Emperor | 15,000 total combos | 10,000 |
| Combo God | 25,000 total combos | 15,000 |
| Combo Immortal | 50,000 total combos | 25,000 |
| Complex Fighter | 100 complex combos (5+ moves) | 500 |
| Complex Master | 500 complex combos | 2,500 |
| Complex God | 2,500 complex combos | 7,500 |
| Defense Specialist | 100 combos with defense moves | 500 |
| Defense Master | 500 combos with defense moves | 2,500 |
| Counter Puncher | 100 counter combos | 750 |

## 11.5 Volume Badges (18 badges)

| Badge | Requirement | XP |
|-------|------------|-----|
| First Blood | 1 workout completed | 25 |
| Getting Going | 3 workouts | 50 |
| Punching In | 5 workouts | 75 |
| Getting Started | 10 workouts | 150 |
| Building Habits | 25 workouts | 300 |
| Regular | 50 workouts | 600 |
| Committed | 75 workouts | 900 |
| Dedicated | 100 workouts | 1,500 |
| Dialed In | 150 workouts | 2,500 |
| Obsessed | 200 workouts | 4,000 |
| Relentless | 250 workouts | 5,500 |
| Lifer | 500 workouts | 7,500 |
| Legend | 1,000 workouts | 15,000 |

## 11.6 Time Badges (18 badges)

| Badge | Requirement | XP |
|-------|------------|-----|
| First Minutes | 15 min total training | 10 |
| Half Hour | 30 min total | 25 |
| Hour One | 1 hour total | 50 |
| Two Hours | 2 hours total | 100 |
| Five Hours | 5 hours total | 200 |
| Ten Spot | 10 hours total | 400 |
| Quarter Century | 25 hours total | 800 |
| Fifty Club | 50 hours total | 1,500 |
| Century | 100 hours total | 3,000 |
| 250 Club | 250 hours total | 6,000 |
| 500 Club | 500 hours total | 10,000 |
| Thousand Hours | 1,000 hours total | 15,000 |

## 11.7 Sparring Badges (15 badges)

| Badge | Requirement | XP |
|-------|------------|-----|
| First Round | 1 sparring session | 150 |
| Sparring Regular | 10 sparring sessions | 500 |
| Sparring Veteran | 25 sparring sessions | 1,500 |
| Ring General | 50 hours sparring | 5,000 |
| War Tested | 100 hours sparring | 15,000 |
| War Dog | 250 hours sparring | 25,000 |

## 11.8 Conditioning Badges (72 badges)

### Push-ups (6)

| Badge | Requirement | XP |
|-------|------------|-----|
| Push-up Starter | 50 total push-ups | 50 |
| Push-up Novice | 100 total | 100 |
| Push-up Regular | 500 total | 300 |
| Push-up Pro | 1,000 total | 750 |
| Push-up Machine | 5,000 total | 2,500 |
| Push-up God | 25,000 total | 7,500 |

### Burpees (6)

| Badge | Requirement | XP |
|-------|------------|-----|
| Burpee Beginner | 25 total | 50 |
| Burpee Regular | 100 total | 150 |
| Burpee Warrior | 250 total | 400 |
| Burpee Beast | 500 total | 750 |
| Burpee Demon | 2,500 total | 3,000 |
| Burpee Immortal | 10,000 total | 7,500 |

### Squats (6)

| Badge | Requirement | XP |
|-------|------------|-----|
| Squat Starter | 50 total | 50 |
| Squat Novice | 100 total | 100 |
| Squat Regular | 500 total | 300 |
| Squat Strong | 1,000 total | 750 |
| Squat King | 5,000 total | 2,500 |
| Squat Supreme | 25,000 total | 7,500 |

### Pull-ups (6)

| Badge | Requirement | XP |
|-------|------------|-----|
| Pull-up Recruit | 25 total | 50 |
| Pull-up Novice | 50 total | 100 |
| Pull-up Regular | 250 total | 400 |
| Pull-up Warrior | 500 total | 1,000 |
| Pull-up Legend | 2,500 total | 3,500 |
| Pull-up God | 10,000 total | 7,500 |

### Lunges (5)

| Badge | Requirement | XP |
|-------|------------|-----|
| Lunge Starter | 50 total | 50 |
| Lunge Regular | 250 total | 250 |
| Lunge Warrior | 1,000 total | 750 |
| Lunge Master | 5,000 total | 2,500 |
| Lunge Legend | 15,000 total | 5,000 |

### Mountain Climbers (5)

| Badge | Requirement | XP |
|-------|------------|-----|
| Climber Starter | 50 total | 50 |
| Climber Regular | 250 total | 250 |
| Climber Warrior | 1,000 total | 750 |
| Climber Master | 5,000 total | 2,500 |
| Climber Legend | 15,000 total | 5,000 |

### Russian Twists (5)

| Badge | Requirement | XP |
|-------|------------|-----|
| Twist Starter | 50 total | 50 |
| Twist Regular | 250 total | 250 |
| Twist Warrior | 1,000 total | 750 |
| Twist Master | 5,000 total | 2,500 |
| Twist Legend | 15,000 total | 5,000 |

### Curlups/Situps (5)

| Badge | Requirement | XP |
|-------|------------|-----|
| Core Starter | 50 total | 50 |
| Core Regular | 250 total | 250 |
| Core Warrior | 1,000 total | 750 |
| Core Crusher | 5,000 total | 2,500 |
| Core Destroyer | 15,000 total | 5,000 |

### Planks (5)

| Badge | Requirement | XP |
|-------|------------|-----|
| Plank Starter | 10 min total planks | 50 |
| Plank Regular | 30 min total | 250 |
| Plank Master | 60 min total | 500 |
| Plank Immortal | 300 min total | 2,500 |
| Plank God | 600 min total | 5,000 |

### Jump Rope (5)

| Badge | Requirement | XP |
|-------|------------|-----|
| Jump Rope Starter | 30 min total | 100 |
| Jump Rope Regular | 120 min total | 500 |
| Jump Rope Master | 300 min total | 1,500 |
| Jump Rope Legend | 1,500 min total | 5,000 |
| Jump Rope God | 5,000 min total | 10,000 |

### Running/Treadmill (5)

| Badge | Requirement | XP |
|-------|------------|-----|
| Runner's High | 60 min total running | 200 |
| Road Regular | 300 min total | 1,000 |
| Road Warrior | 600 min total | 2,000 |
| Ultrarunner | 3,000 min total | 7,500 |
| Marathon Machine | 6,000 min total | 12,500 |

## 11.9 In-Workout Badges (35 badges)

These trigger MID-WORKOUT with a visual pop and XP bonus.

| Badge | Requirement | XP | Trigger |
|-------|------------|-----|---------|
| First Level Up | Level up for the first time | 5 | During workout |
| Double Level | Level up twice in one segment | 15 | During workout |
| Triple Level | Level up 3 times in one session | 25 | During workout |
| Five-Pack | Level up 5 times in one session | 50 | During workout |
| Ten-Bagger | Level up 10 times in one session | 100 | During workout |
| Getting Started Achiever | Reach "Getting Started" multiplier (5 min) | 10 | During workout |
| In The Zone Achiever | Reach "In The Zone" (10 min) | 25 | During workout |
| Locked In Achiever | Reach "Locked In" (15 min) | 50 | During workout |
| On Fire Achiever | Reach "On Fire" (20 min) | 100 | During workout |
| Beast Mode Achiever | Reach "Beast Mode" (30 min) | 200 | During workout |
| Unstoppable Achiever | Reach "Unstoppable" (45 min) | 300 | During workout |
| Marathon Mode Achiever | Reach "Marathon Mode" (60 min) | 400 | During workout |
| Legendary Achiever | Reach "Legendary Effort" (90 min) | 750 | During workout |
| Beast Mode ×10 | Reach Beast Mode 10 times total | 500 | Post-workout |
| Beast Mode ×50 | Reach Beast Mode 50 times total | 2,500 | Post-workout |
| Unstoppable ×10 | Reach Unstoppable 10 times total | 1,000 | Post-workout |
| Unstoppable ×25 | Reach Unstoppable 25 times total | 3,000 | Post-workout |
| Back to Back | Level up on consecutive segments | 75 | During workout |

## 11.10 Milestone Badges (45 badges)

### Level Milestones (15)

| Badge | Requirement | XP | Triggers During Workout? |
|-------|------------|-----|-------------------------|
| Level 5 | Reach Level 5 | 25 | Yes |
| Level 10 | Reach Level 10 | 50 | Yes |
| Level 25 | Reach Level 25 | 100 | Yes |
| Level 50 | Reach Level 50 | 250 | Yes |
| Level 75 | Reach Level 75 | 400 | Yes |
| Level 100 | Reach Level 100 | 750 | Yes |

### Ranking Milestones (14)

| Badge | Requirement | XP |
|-------|------------|-----|
| Prospect | Reach Prospect rank | 25 |
| Scrapper | Reach Scrapper rank | 50 |
| Fighter | Reach Fighter rank | 100 |
| Warrior | Reach Warrior rank | 200 |
| Gladiator | Reach Gladiator rank | 400 |
| Veteran | Reach Veteran rank | 600 |
| Phenom | Reach Phenom rank | 1,000 |
| Icon | Reach Icon rank | 1,500 |
| Apex | Reach Apex rank | 2,500 |
| GOAT | Reach GOAT rank | 5,000 |

### Prestige Milestones (7)

| Badge | Requirement | XP |
|-------|------------|-----|
| First Blood | Complete first workout | 50 |
| Rookie of the Year | Complete Rookie prestige | 500 |
| Class Act | Complete Beginner prestige | 1,500 |
| Certified | Complete Intermediate prestige | 3,500 |
| Elite Status | Complete Advanced prestige | 7,500 |
| Pro Card | Become Pro | 15,000 |
| BMF | Complete the journey | 50,000 |

## 11.11 Special / Secret Badges (55 badges)

| Badge | Requirement | XP |
|-------|------------|-----|
| Early Bird | Workout before 6am | 100 |
| Dawn Patrol | 10 workouts before 6am | 500 |
| 5am Club | 25 workouts before 6am | 1,500 |
| 4am Club | Workout before 4am | 500 |
| Night Owl | Workout after 10pm | 100 |
| Midnight Warrior | 10 workouts after 10pm | 500 |
| Vampire | 25 workouts after 10pm | 1,500 |
| Weekend Warrior | Both Sat & Sun in one weekend | 200 |
| Weekend Regular | 10 complete weekends | 1,000 |
| Weekend King | 25 complete weekends | 3,000 |
| Marathon | Single workout over 90 min | 350 |
| Ultramarathon | Single workout over 2 hours | 750 |
| Iron Session | Single workout over 3 hours | 2,000 |
| Perfectionist | 10 full workouts no skips | 500 |
| Flawless | 50 full workouts no skips | 2,500 |
| Immaculate | 100 full workouts no skips | 5,000 |
| Perfect Record | 250 full workouts no skips | 12,500 |
| Double Session | 2 workouts in one day | 200 |
| Grinder | 3 workouts in one day | 500 |
| Maniac | 4+ workouts in one day | 1,000 |
| Holiday Hero | Workout on a major holiday | 300 |
| New Year's Warrior | Workout on Jan 1st | 500 |
| Birthday Fighter | Workout on your birthday | 500 |
| First of the Month | Workout on the 1st of any month | 100 |
| Every First | Workout on the 1st for 6 consecutive months | 2,000 |
| Friday Fighter | Complete 10 Friday workouts | 250 |
| Monday Motivation | Complete 10 Monday workouts | 250 |
| The Comeback | Return after 7+ day break | 500 |
| Phoenix Rising | Complete Comeback Challenge | 1,000 |
| Jack of All Trades | Warmup + boxing + conditioning + cooldown in one session | 200 |
| Pure Boxer | 100% boxing workout | 200 |
| Conditioning King | 100% conditioning workout | 200 |
| Shadow Master | 100 shadow boxing segments completed | 500 |
| Heavy Hitter | 10,000 combo XP accumulated | 500 |
| XP Millionaire | 1,000,000 lifetime XP | 10,000 |
| Multi-Millionaire | 5,000,000 lifetime XP | 25,000 |
| Billionaire | 10,000,000 lifetime XP | 50,000 |

## 11.12 Social & Referral Badges (12 badges)

| Badge | Requirement | XP |
|-------|------------|-----|
| Sharer | Share 1 achievement | 50 |
| Social Butterfly | Share 10 achievements | 250 |
| Influencer | Share 50 achievements | 1,000 |
| Recruiter | Refer 1 friend | 500 |
| Squad Leader | Refer 5 friends | 2,500 |
| Army Builder | Refer 10 friends | 5,000 |
| General | Refer 25 friends | 10,000 |

## 11.13 Recovery Badges (18 badges)

| Badge | Requirement | XP |
|-------|------------|-----|
| Rest Day Logged | Log 1 rest day | 25 |
| Recovery Mode | Log 10 rest days | 250 |
| Self Care | Log 50 rest days | 1,000 |
| Balance | Log 100 rest days | 2,500 |
| Stretch Starter | Log 10 stretching sessions | 100 |
| Stretch Master | Log 50 stretching sessions | 500 |
| Flexibility King | Log 100 stretching sessions | 1,500 |
| Meditation Starter | 30 min meditation total | 100 |
| Zen Master | 300 min meditation total | 750 |

## 11.14 Challenge Completion Badges (18 badges)

| Badge | Requirement | XP |
|-------|------------|-----|
| Challenge Accepted | Complete 1 weekly challenge | 100 |
| Weekly Warrior | Complete 25 weekly challenges | 1,500 |
| Weekly Master | Complete 50 weekly challenges | 4,000 |
| Weekly God | Complete 100 weekly challenges | 10,000 |
| 2-Week Streak (Challenges) | 2 consecutive weekly challenges | 500 |
| 4-Week Streak (Challenges) | 4 consecutive weekly challenges | 1,500 |
| 8-Week Streak (Challenges) | 8 consecutive weekly challenges | 4,000 |
| 12-Week Streak (Challenges) | 12 consecutive weekly challenges | 10,000 |
| Daily Devotee | Complete daily challenge 7 days in a row | 500 |
| Daily Machine | Complete daily challenge 30 days in a row | 3,000 |
| Daily Legend | Complete daily challenge 100 days in a row | 15,000 |

## 11.15 Personal Record Badges (20 badges)

| Badge | Requirement | XP |
|-------|------------|-----|
| First PR | Set your first personal record | 50 |
| PR Machine | Set 10 personal records | 250 |
| PR Legend | Set 25 personal records | 750 |
| PR Collector | Set 50 personal records | 2,000 |
| PR God | Set 100 personal records | 5,000 |
| Best XP Day | Set a new single-day XP record | 100 |
| Best XP Week | Set a new single-week XP record | 250 |
| Best XP Session | Set a new single-session XP record | 100 |
| Longest Workout PR | Set new longest workout record | 150 |
| Longest Streak PR | Set new longest streak record | 200 |
| Most Combos PR | New most combos per session record | 100 |
| Fastest Level PR | New fastest level-up record | 100 |
| Best Week Ever | Break weekly XP record 3 times | 500 |
| Record Breaker | Break any PR 3 times in one session | 300 |
| PR Streak | Set new PR 5 sessions in a row | 750 |
| PR Streak Master | New PR 10 sessions in a row | 2,000 |
| Self-Improver | Break avg XP/session over 10 sessions | 500 |
| Peak Performance | Set 3 different PRs in one session | 500 |
| New Heights | Set new highest streak multiplier | 200 |
| Improvement Arc | Break monthly XP record 3 months in a row | 1,000 |

## 11.16 Consistency Badges (35 badges)

| Badge | Requirement | XP |
|-------|------------|-----|
| Monday Motivation | 10 Monday workouts | 250 |
| Friday Fighter | 10 Friday workouts | 250 |
| Full Week | Work out every day Mon-Sun | 500 |
| Full Week ×4 | 4 complete weeks | 2,000 |
| Full Week ×12 | 12 complete weeks | 7,500 |
| Full Month | Every day of a calendar month | 5,000 |
| 2x/week ×4 | 2+ workouts/week for 4 weeks | 500 |
| 3x/week ×4 | 3+ workouts/week for 4 weeks | 1,000 |
| 4x/week ×4 | 4+ workouts/week for 4 weeks | 2,000 |
| 5x/week ×4 | 5+ workouts/week for 4 weeks | 3,000 |
| 6x/week ×4 | 6+ workouts/week for 4 weeks | 5,000 |
| Daily ×4 | 7 workouts/week for 4 weeks | 7,500 |

## 11.17 Seasonal / Event Badges (24 badges)

| Badge | Requirement | XP |
|-------|------------|-----|
| New Year New Me | Workout on Jan 1st | 500 |
| Valentine's Fighter | Workout on Feb 14th | 200 |
| St. Patrick's Slugger | Workout on March 17th | 200 |
| Independence Day | Workout on July 4th | 300 |
| Halloween Warrior | Workout on Oct 31st | 200 |
| Thanksgiving Grinder | Workout on Thanksgiving | 300 |
| Christmas Fighter | Workout on Dec 25th | 300 |
| Cinco de Mayo | Workout on May 5th | 200 |

---

# PART 12: GLOVE PROGRESSION SYSTEM (52 GLOVES)

## 12.1 Overview

Every prestige tier has 11 gloves earned at every 10 levels (Level 10, 20, 30, 40, 50, 60, 70, 80, 90, 100 + the starting glove). Each set builds progressively toward the next major material tier. The final glove in each set (Level 100) is the prestige glove. The 52nd glove — BMF Gloves — is the ultimate achievement.

No effects, sounds, or animations on gloves in v1. Just visual tiers.

## 12.2 Tier 1: Rookie Gloves (Default → Golden)
*Theme: Raw leather evolving into gold*

| # | Glove Name | Unlock | Description |
|---|-----------|--------|-------------|
| 1 | Default Gloves | Starting | Standard red boxing gloves |
| 2 | Worn Leather | Rookie Level 10 | Scuffed brown leather — you've started |
| 3 | Reinforced Leather | Rookie Level 20 | Double-stitched leather, darker tone |
| 4 | Hardened Leather | Rookie Level 30 | Dark leather with visible wear marks |
| 5 | Steel-Studded | Rookie Level 40 | Leather with steel rivet accents |
| 6 | Bronze Trim | Rookie Level 50 | Bronze metallic trim along knuckles |
| 7 | Silver Stitching | Rookie Level 60 | Silver thread stitching, premium look |
| 8 | Gold Thread | Rookie Level 70 | Gold stitching throughout |
| 9 | Gold Trim | Rookie Level 80 | Gold metallic trim and accents |
| 10 | Gold Plated | Rookie Level 90 | Mostly gold surface, leather base |
| 11 | Golden Gloves | Rookie Level 100 | Full solid gold metallic gloves — PRESTIGE REWARD |

## 12.3 Tier 2: Beginner Gloves (Golden → Platinum)
*Theme: Gold refining into white metals*

| # | Glove Name | Unlock | Description |
|---|-----------|--------|-------------|
| 12 | White Gold | Beginner Level 10 | Gold base shifting to lighter tone |
| 13 | Brushed Steel | Beginner Level 20 | Matte steel finish |
| 14 | Chrome | Beginner Level 30 | Mirror-like chrome surface |
| 15 | Titanium | Beginner Level 40 | Gunmetal titanium finish |
| 16 | Titanium Elite | Beginner Level 50 | Polished titanium with edge details |
| 17 | Sterling Silver | Beginner Level 60 | Classic silver with subtle shine |
| 18 | Silver Elite | Beginner Level 70 | Bright silver with knuckle detailing |
| 19 | Palladium | Beginner Level 80 | Rare white metal, understated luxury |
| 20 | Platinum Trim | Beginner Level 90 | Platinum accents over silver base |
| 21 | Platinum Gloves | Beginner Level 100 | Full platinum metallic gloves — PRESTIGE REWARD |

## 12.4 Tier 3: Intermediate Gloves (Platinum → Emerald)
*Theme: Metal evolving into green gemstone*

| # | Glove Name | Unlock | Description |
|---|-----------|--------|-------------|
| 22 | Jade | Intermediate Level 10 | Soft green jade mineral texture |
| 23 | Malachite | Intermediate Level 20 | Dark green with banded pattern |
| 24 | Peridot | Intermediate Level 30 | Light yellow-green gemstone surface |
| 25 | Tourmaline | Intermediate Level 40 | Deep green crystalline finish |
| 26 | Green Sapphire | Intermediate Level 50 | Rich green with sapphire clarity |
| 27 | Aventurine | Intermediate Level 60 | Sparkling green with mineral flecks |
| 28 | Chrome Diopside | Intermediate Level 70 | Vivid forest green, high luster |
| 29 | Tsavorite | Intermediate Level 80 | Brilliant green, nearly emerald |
| 30 | Emerald Trim | Intermediate Level 90 | Emerald accents over green base |
| 31 | Emerald Gloves | Intermediate Level 100 | Full deep emerald crystalline gloves — PRESTIGE REWARD |

## 12.5 Tier 4: Advanced Gloves (Emerald → Ruby)
*Theme: Green fading to red gemstone*

| # | Glove Name | Unlock | Description |
|---|-----------|--------|-------------|
| 32 | Garnet | Advanced Level 10 | Deep red-brown garnet surface |
| 33 | Carnelian | Advanced Level 20 | Warm orange-red stone finish |
| 34 | Red Jasper | Advanced Level 30 | Rich red with natural stone patterns |
| 35 | Rhodolite | Advanced Level 40 | Raspberry red, semi-precious |
| 36 | Red Spinel | Advanced Level 50 | Vivid red, often confused with ruby |
| 37 | Pyrope | Advanced Level 60 | Deep blood-red garnet family |
| 38 | Red Beryl | Advanced Level 70 | Rare red beryl, intensely colored |
| 39 | Star Ruby | Advanced Level 80 | Ruby with asterism star effect |
| 40 | Ruby Trim | Advanced Level 90 | Ruby accents over red base |
| 41 | Ruby Gloves | Advanced Level 100 | Full deep ruby crystalline gloves — PRESTIGE REWARD |

## 12.6 Tier 5: Pro Gloves (Ruby → Diamond)
*Theme: Red transforming into clear diamond*

| # | Glove Name | Unlock | Description |
|---|-----------|--------|-------------|
| 42 | Pink Sapphire | Pro Level 10 | Ruby red lightening to pink |
| 43 | Morganite | Pro Level 20 | Warm pink, near-transparent |
| 44 | White Topaz | Pro Level 30 | Clear with subtle warmth |
| 45 | White Sapphire | Pro Level 40 | Crystal clear sapphire |
| 46 | Moissanite | Pro Level 50 | Near-diamond brilliance |
| 47 | White Diamond | Pro Level 60 | Classic diamond facets |
| 48 | Blue-White Diamond | Pro Level 70 | Blue-tinged diamond, exceptionally rare |
| 49 | Flawless Diamond | Pro Level 80 | Perfect clarity, maximum brilliance |
| 50 | Diamond Trim | Pro Level 90 | Diamond accents, approaching perfection |
| 51 | Diamond Gloves | Pro Level 100 | Full flawless diamond gloves — PRESTIGE REWARD |

## 12.7 Tier 6: BMF Gloves — The Ultimate

| # | Glove Name | Unlock | Description |
|---|-----------|--------|-------------|
| 52 | BMF Gloves | Reach BMF + 365-day streak | The ultimate achievement. Transcends all materials. |

### BMF Gloves Special Requirements

All three must be true simultaneously:
1. User has completed all 5 prestiges (reached BMF status)
2. User has completed 250+ Pro sessions
3. User's current streak is ≥ 365 consecutive days

If a user reaches BMF but their streak is < 365, they do NOT get BMF Gloves. They must earn the streak independently.

## 12.8 Database Schema

```sql
ALTER TABLE profiles ADD COLUMN equipped_glove TEXT DEFAULT 'default';
ALTER TABLE profiles ADD COLUMN unlocked_gloves JSONB DEFAULT '["default"]';
```

## 12.9 Glove Unlock Check

```typescript
function checkGloveUnlocks(
  prestige: string,
  level: number,
  streakDays: number
): string[] {
  const prestigeOrder = ['rookie', 'beginner', 'intermediate', 'advanced', 'pro', 'bmf'];
  const currentIndex = prestigeOrder.indexOf(prestige.toLowerCase());
  const unlocked: string[] = ['default'];

  const tiers = ['rookie', 'beginner', 'intermediate', 'advanced', 'pro'];

  for (const tier of tiers) {
    const tierIndex = prestigeOrder.indexOf(tier);

    if (tierIndex < currentIndex) {
      // Past this tier — all 11 gloves unlocked
      for (let lvl = 10; lvl <= 100; lvl += 10) {
        unlocked.push(`${tier}_${lvl}`);
      }
    } else if (tierIndex === currentIndex) {
      // Currently in this tier — check level
      for (let lvl = 10; lvl <= 100; lvl += 10) {
        if (level >= lvl) unlocked.push(`${tier}_${lvl}`);
      }
    }
  }

  // BMF Gloves check
  if (prestige === 'bmf' && streakDays >= 365) {
    unlocked.push('bmf_gloves');
  }

  return unlocked;
}
```

---

# PART 13: COSMETICS (WRAPS, BORDERS, STICKERS)

## 13.1 Wraps (Hand Wrap Customization)

| Wrap | Unlock |
|------|--------|
| Classic White | Default |
| Black Wrap | Level 5 |
| Red Wrap | Level 15 |
| Blue Wrap | Level 25 |
| Camo Wrap | Level 50 |
| Tiger Stripe | Level 75 |
| Gold Thread | Level 100 |
| Neon Green | 25 combo badges earned |
| Neon Pink | 50 workouts completed |
| American Flag | Weekend Warrior ×10 |
| Mexican Flag | Complete 5 workouts during Cinco de Mayo |
| Rainbow | Complete all badge categories in any prestige |
| Barbed Wire | Complete 100 sparring sessions |
| Chain Link | Maintain 100-day streak |
| Animated Flame | Reach Beast Mode multiplier 50 times |
| Animated Electric | Reach Unstoppable multiplier 25 times |
| Diamond Wrap | Reach BMF |

## 13.2 Profile Borders

| Border | Unlock |
|--------|--------|
| Default (Gray) | Starting |
| Bronze | Reach Level 25 in any prestige |
| Silver | Reach Level 50 |
| Gold | Reach Level 100 |
| Animated Fire | 60-day streak |
| Animated Lightning | 100-day streak |
| Animated Glow | 200-day streak |
| Animated Pulse | 365-day streak |
| Prestige 1 Frame | Prestige from Rookie |
| Prestige 2 Frame | Prestige from Beginner |
| Prestige 3 Frame | Prestige from Intermediate |
| Prestige 4 Frame | Prestige from Advanced |
| Prestige 5 Frame | Prestige from Pro |
| BMF Frame | Reach BMF |
| Combo God Frame | Earn Combo God badge |
| Legend Frame | Earn Legend badge |
| Immortal Frame | Earn Immortal badge |

## 13.3 Stickers (Profile Flair)

Unlockable quotes and flair for your profile. Examples:
"Never heard of her", "I'd rather be boxing", "Float like a butterfly", "Trained today", "Coach's pet", "5am club", "Beast mode", "Let's go", "One more round", "Ring the bell", "Hands up", "Stay dangerous", "Built different", "Obsessed", "Addicted", "No excuses", "Get Clocked"

---

# PART 14: SESSION XP REFERENCE VALUES

## 14.1 Standard Loadout Workout Structure

### Shadow-Only (no equipment):
```
Jog in Place (180s)
→ 10 Rounds: [Shadow combo (60s) + Pushups (30s) + Rest (30s)]
→ 2 Championship Rounds: [Shadow freestyle at 2x (60s) + Burpees (30s) + Rest (30s)]
→ Conditioning: Curlups (120s) + Rest (60s)
→ Cooldown: Jog (600s)
```

### With Bags (full equipment):
```
Jump Rope (180s)
→ 10 Rounds: [Shadow (30s) + Bag (30s) + Pushups (30s) + Rest (30s)]
→ 2 Championship Rounds: [Shadow freestyle at 2x (30s) + Bag freestyle at 2x (30s) + Burpees (30s) + Rest (30s)]
→ Conditioning: Curlups (120s) + Rest (60s)
→ Cooldown: Treadmill (600s)
```

## 14.2 Total Duration
- Shadow-only: ~40 minutes
- With bags: ~40 minutes

## 14.3 Session XP Breakdown (Shadow-Only, No Multipliers)

| Tier | Warmup | 10 Rounds | Championship | Conditioning | Cooldown | Total |
|------|--------|-----------|-------------|-------------|----------|-------|
| Rookie | 27.0 | ~450 | ~75 | 21.6 | 90.0 | **679.8** |
| Beginner | 27.0 | ~580 | ~95 | 21.6 | 90.0 | **829.8** |
| Intermediate | 27.0 | ~820 | ~122 | 21.6 | 90.0 | **1,096.6** |
| Advanced | 27.0 | ~1,400 | ~152 | 21.6 | 90.0 | **1,706.3** |
| Pro | 27.0 | ~1,950 | ~187 | 21.6 | 90.0 | **2,291.0** |

(Combo XP varies by tier because higher tiers have longer, more complex combos with defense moves)

---

# PART 15: IMPLEMENTATION CHECKLIST

## CRITICAL BUGS TO CHECK FOR

- [ ] XP bar ticks every second (NOT just on segment completion)
- [ ] XP rates are multiplied by duration in seconds (NOT flat values)
- [ ] Rest segments show 0.00 XP/sec (bar pauses)
- [ ] Level 0→1 costs 1 XP (instant hook)
- [ ] getLevelFromXP uses the correct A/B power curve configs
- [ ] Skipping segments = LESS XP (not more)
- [ ] Championship rounds apply 2x to boxing segments only (not exercises)
- [ ] Streak multiplier applied correctly
- [ ] Time multiplier increases with elapsed workout time
- [ ] Badges are one-time only, never repeatable
- [ ] Post-workout summary shows accurate breakdown
- [ ] Level-up animation triggers mid-workout
- [ ] Multiple level-ups in session 1 each animate individually

## DATABASE REQUIREMENTS

```sql
-- Core XP tracking
profiles.total_xp       BIGINT DEFAULT 0
profiles.current_level   INTEGER DEFAULT 0
profiles.prestige_tier   TEXT DEFAULT 'rookie'
profiles.current_streak  INTEGER DEFAULT 0
profiles.best_streak     INTEGER DEFAULT 0
profiles.last_workout_date DATE

-- Glove system
profiles.equipped_glove  TEXT DEFAULT 'default'
profiles.unlocked_gloves JSONB DEFAULT '["default"]'

-- Badge tracking
badges_earned.id         UUID PRIMARY KEY
badges_earned.user_id    UUID REFERENCES profiles(id)
badges_earned.badge_key  TEXT NOT NULL
badges_earned.earned_at  TIMESTAMP DEFAULT NOW()
badges_earned.xp_awarded INTEGER NOT NULL

-- Lifetime stats (for badge triggers)
profiles.total_workouts       INTEGER DEFAULT 0
profiles.total_combos         INTEGER DEFAULT 0
profiles.total_pushups        INTEGER DEFAULT 0
profiles.total_burpees        INTEGER DEFAULT 0
profiles.total_curlups        INTEGER DEFAULT 0
profiles.total_active_minutes NUMERIC DEFAULT 0
profiles.perfect_completions  INTEGER DEFAULT 0
```

---

# END OF DOCUMENT

**Version:** 3.0
**Last Updated:** February 25, 2026
**Status:** LOCKED — This is the single source of truth. All implementations must match these exact values.
