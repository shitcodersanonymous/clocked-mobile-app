# Get Clocked — Remaining Fixes Guide (Post-Audit)

**Date:** 2026-02-25
**Audit Summary:** 36/40 items from the original fix guide verified complete. 4 issues found in audit + 1 additional feature gap identified during testing. 5 total.
**Codebase After Fixes:** 77 files, 24,258 lines of TypeScript/TSX (up from 59 files pre-fix)

---

## Table of Contents

1. [Issue #1: Sound Effects System — Haptics Only, Zero Audio](#issue-1)
2. [Issue #2: workout/[id].tsx Still 1,663 Lines — Further Decomposition Needed](#issue-2)
3. [Issue #3: stats.tsx Duplicates RoadToBMF Instead of Importing](#issue-3)
4. [Issue #4: trendingWorkouts.ts Empty Array — Needs Seed Data](#issue-4)
5. [Issue #5: Tier Loadout System — No Preset Rotation on Prestige, Empty Presets Tab](#issue-5)
6. [Priority Order & Dependencies](#priority-order)
7. [Appendix A: Lovable Sound Synthesis Reference](#appendix-a)
8. [Appendix B: workout/[id].tsx Section Map](#appendix-b)

---

<a name="issue-1"></a>
## Issue #1: Sound Effects System — Haptics Only, Zero Audio

**Severity:** MEDIUM — This is the only issue that affects user experience directly.
**File:** `hooks/useSoundEffects.ts` (currently 73 lines)
**Target:** ~250-300 lines after fix

### Problem

The current `useSoundEffects.ts` contains ONLY `expo-haptics` calls. Despite exporting functions named `playSoundEffect.xp()`, `playSoundEffect.levelUp()`, `playSoundEffect.prestige()`, and `playSoundEffect.warning()`, zero audio is produced. The "sound effects system" is a haptics-only wrapper with misleading function names.

The Lovable web app uses **Web Audio API oscillator synthesis** (292 lines) to generate tones programmatically — no audio files needed. This approach cannot be directly ported to React Native because `AudioContext` / `OscillatorNode` are browser-only APIs.

### Current Code (What Exists)

```typescript
// hooks/useSoundEffects.ts — CURRENT (73 lines, haptics only)
import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

type SoundType = 'xp' | 'levelUp' | 'prestige' | 'warning';

async function triggerHaptic(type: SoundType): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    switch (type) {
      case 'xp':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'levelUp':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'prestige':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}); }, 200);
        setTimeout(() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}); }, 400);
        break;
      case 'warning':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
    }
  } catch {}
}

export const playSoundEffect = {
  xp: () => { triggerHaptic('xp'); },
  levelUp: () => { triggerHaptic('levelUp'); },
  prestige: () => { triggerHaptic('prestige'); },
  warning: () => { triggerHaptic('warning'); },
};
```

### What the Lovable Web App Does (Reference)

The Lovable version synthesizes audio in real time using Web Audio API oscillators. Here is exactly what each sound does:

**XP Tick (`playXPSound`):**
- Oscillator type: `sine`
- Frequency: starts at 880 Hz, exponential ramp to 1320 Hz over 50ms
- Gain envelope: 0 → 0.08 (10ms linear ramp) → 0.001 (150ms exponential decay)
- Duration: 150ms total
- Debounce: 100ms between plays (prevents rapid-fire overlap)
- Character: short rising "ping" — like a coin collect

**Level Up (`playLevelUpSound`):**
Three layers:
1. **Sub-bass hit:** sine oscillator, 80 Hz → 40 Hz exponential ramp over 300ms, gain 0.4 → 0.001 over 400ms
2. **Ascending arpeggio:** 4 notes [C5=523.25, E5=659.25, G5=783.99, C6=1046.50], each note 180ms + 60ms gap. Each note has two oscillators: sawtooth (gain 0.2) for richness + sine (gain 0.35) for body. Attack: 20ms, decay: 150ms past note end
3. **Sustained chord:** All 4 notes played simultaneously as sine waves, gain 0.25, 1-second decay
- Total duration: ~2 seconds
- Character: triumphant rising fanfare with bass impact

**Prestige Celebration (`playSoundEffect.prestige`):**
Four layers:
1. **Deep drum hit:** sine, 120 Hz → 30 Hz over 500ms, gain 0.5 → 0.001 over 600ms
2. **Rising fanfare:** 7 notes [C4=261.63 through C6=1046.50], each 140ms, dual oscillators (sawtooth + sine) per note
3. **Grand sustained chord:** 6 frequencies [C4, E4, G4, C5, E5, C6] as sine waves, gain 0.2, 1.5-second decay
4. **Shimmer sparkle:** 6 random-frequency sine pings (2000-4000 Hz range), spaced 120ms apart, gain 0.06, 150ms each
- Total duration: ~3 seconds
- Character: epic boss-defeated celebration

**Warning Beep (`playWarningBeep`):**
- Two square-wave beeps at 1000 Hz, 150ms apart
- Each beep: 100ms duration, gain 0.1
- Attack: 10ms, sustain: 70ms, decay: 20ms
- Character: urgent double-beep, like a boxing ring timer warning

### Solution: Pre-Generated Audio Assets with expo-av

Since React Native cannot do Web Audio API synthesis, the recommended approach is:

**Option A (RECOMMENDED): Generate .wav files from the Lovable oscillator specs, bundle as assets**

1. Use the Lovable web app (or a Node.js script with `web-audio-api` package) to render each sound to a .wav buffer
2. Save 4 files: `xp-tick.wav`, `level-up.wav`, `prestige.wav`, `warning-beep.wav`
3. Place in `assets/sounds/` directory
4. Load and play using `expo-av` `Audio.Sound`

**Option B: Use `react-native-audio-api` for real-time synthesis**

The `react-native-audio-api` package provides a Web Audio API polyfill for React Native. This would allow near-direct porting of the Lovable oscillator code. However, this adds a native module dependency and may complicate Expo builds.

### Implementation (Option A — Recommended)

**Step 1: Install expo-av**

```bash
npx expo install expo-av
```

**Step 2: Generate sound assets**

Create a Node.js script to render the Lovable oscillator patterns to .wav files. Alternatively, record the sounds from the Lovable web app. Place files at:

```
assets/
  sounds/
    xp-tick.wav        (~5 KB, 150ms)
    level-up.wav       (~40 KB, ~2s)
    prestige.wav       (~60 KB, ~3s)
    warning-beep.wav   (~10 KB, ~300ms)
```

If you cannot generate the .wav files, use any short sound effects as placeholders with similar characteristics:
- `xp-tick.wav`: Any short rising ping, ~150ms
- `level-up.wav`: Any triumphant fanfare, ~2s
- `prestige.wav`: Any epic celebration, ~3s
- `warning-beep.wav`: Any double beep, ~300ms

**Step 3: Replace hooks/useSoundEffects.ts**

```typescript
/**
 * Sound Effects & Haptic Feedback System
 * ========================================
 * Provides audio feedback + haptic feedback for key game events.
 *
 * Sound types:
 *   - xp:       Short rising ping on XP gain (~150ms, 880→1320Hz character)
 *   - levelUp:  Triumphant arpeggio fanfare on level up (~2s, C5-E5-G5-C6)
 *   - prestige: Epic celebration on prestige tier advance (~3s, full fanfare + shimmer)
 *   - warning:  Double beep at 10-second segment warning (~300ms, 1000Hz square)
 *
 * Audio is loaded lazily on first play, then cached for instant replay.
 * Haptics fire independently of audio (even if audio fails or is muted).
 * All audio respects the user's soundEnabled preference.
 *
 * Usage:
 *   // Outside React components (e.g., in stores):
 *   import { playSoundEffect } from '@/hooks/useSoundEffects';
 *   playSoundEffect.xp();
 *   playSoundEffect.levelUp();
 *
 *   // Inside React components:
 *   const { playXP, playLevelUp, playPrestige, playWarning } = useSoundEffects();
 *
 * Reference: Lovable web app used Web Audio API oscillator synthesis.
 * React Native cannot use AudioContext, so we use pre-generated .wav assets
 * loaded via expo-av Audio.Sound with identical frequency/timing specs.
 */

import { useCallback } from 'react';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { useUserStore } from '@/stores/userStore';

// ─── Types ───────────────────────────────────────────────────────────

type SoundType = 'xp' | 'levelUp' | 'prestige' | 'warning';

// ─── Asset Mapping ───────────────────────────────────────────────────

const SOUND_ASSETS: Record<SoundType, any> = {
  xp: require('@/assets/sounds/xp-tick.wav'),
  levelUp: require('@/assets/sounds/level-up.wav'),
  prestige: require('@/assets/sounds/prestige.wav'),
  warning: require('@/assets/sounds/warning-beep.wav'),
};

// ─── Sound Cache (lazy-loaded singletons) ────────────────────────────

const soundCache: Partial<Record<SoundType, Audio.Sound>> = {};
let audioConfigured = false;

/**
 * Configure audio session for playback.
 * Called once on first sound play. Sets:
 *   - playsInSilentModeIOS: true (play even if phone is on silent/vibrate)
 *   - staysActiveInBackground: false (don't hold audio session when app backgrounds)
 *   - shouldDuckAndroid: true (lower other app audio briefly during playback)
 */
async function ensureAudioConfigured(): Promise<void> {
  if (audioConfigured) return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
    audioConfigured = true;
  } catch (err) {
    console.warn('[SoundEffects] Failed to configure audio mode:', err);
  }
}

/**
 * Load a sound asset into the cache if not already loaded.
 * Returns the cached Audio.Sound instance.
 * Returns null if loading fails (e.g., missing asset, audio unavailable).
 */
async function getSound(type: SoundType): Promise<Audio.Sound | null> {
  if (soundCache[type]) {
    return soundCache[type]!;
  }

  try {
    await ensureAudioConfigured();
    const { sound } = await Audio.Sound.createAsync(SOUND_ASSETS[type], {
      shouldPlay: false,
      volume: type === 'xp' ? 0.3 : type === 'warning' ? 0.5 : 0.7,
    });
    soundCache[type] = sound;
    return sound;
  } catch (err) {
    console.warn(`[SoundEffects] Failed to load sound "${type}":`, err);
    return null;
  }
}

// ─── Haptic Feedback ─────────────────────────────────────────────────

/**
 * Trigger haptic feedback for a sound type.
 * Haptics fire independently of audio — even if audio is disabled or fails.
 *
 * Haptic patterns:
 *   - xp:       Light impact (subtle tap)
 *   - levelUp:  Success notification (medium double-tap)
 *   - prestige: Success notification + 2x heavy impacts at 200ms intervals
 *   - warning:  Warning notification (sharp tap)
 */
async function triggerHaptic(type: SoundType): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    switch (type) {
      case 'xp':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'levelUp':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'prestige':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
        }, 200);
        setTimeout(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
        }, 400);
        break;
      case 'warning':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
    }
  } catch {
    // Haptics unavailable (e.g., simulator) — silently ignore
  }
}

// ─── Audio Playback ──────────────────────────────────────────────────

/** Debounce tracker for XP sound (prevents rapid-fire overlap) */
let lastXPPlayTime = 0;
const XP_DEBOUNCE_MS = 100;

/**
 * Play a sound asset + trigger haptic feedback.
 * Audio is skipped if:
 *   - Sound type is 'xp' and was played within last 100ms (debounce)
 *   - Audio.Sound fails to load or play
 *   - Platform is web (no expo-av on web)
 * Haptics always fire regardless of audio state.
 */
async function playSound(type: SoundType): Promise<void> {
  // Always fire haptics first (instant feedback even if audio is slow to load)
  triggerHaptic(type);

  // Debounce XP sound
  if (type === 'xp') {
    const now = Date.now();
    if (now - lastXPPlayTime < XP_DEBOUNCE_MS) return;
    lastXPPlayTime = now;
  }

  // Skip audio on web (expo-av doesn't support web playback)
  if (Platform.OS === 'web') return;

  try {
    const sound = await getSound(type);
    if (!sound) return;

    // Reset to start (in case sound was previously played and is at the end)
    await sound.setPositionAsync(0);
    await sound.playAsync();
  } catch (err) {
    console.warn(`[SoundEffects] Failed to play sound "${type}":`, err);
  }
}

// ─── Public API: Static Functions (for use outside React) ────────────

/**
 * Static sound effect triggers for use outside React components.
 * Used by stores (e.g., userStore.addXP calls playSoundEffect.xp()).
 *
 * These do NOT check soundEnabled preference — the calling code should
 * check the preference before calling (or pass playSound=true/false).
 */
export const playSoundEffect = {
  /** Short rising ping on XP gain. Debounced to 100ms. */
  xp: () => { playSound('xp'); },

  /** Triumphant arpeggio fanfare on level up. */
  levelUp: () => { playSound('levelUp'); },

  /** Epic celebration on prestige tier advance. */
  prestige: () => { playSound('prestige'); },

  /** Double beep at 10-second segment warning. */
  warning: () => { playSound('warning'); },
};

// ─── Public API: React Hook ──────────────────────────────────────────

/**
 * React hook for sound effects. Respects the user's soundEnabled preference.
 * Returns memoized play functions that check preferences before playing.
 *
 * @example
 * function MyComponent() {
 *   const { playXP, playLevelUp, playPrestige, playWarning } = useSoundEffects();
 *   return <Button onPress={playLevelUp} title="Level Up!" />;
 * }
 */
export function useSoundEffects() {
  const soundEnabled = useUserStore(
    (state) => (state.user?.preferences as any)?.soundEnabled !== false
  );

  const playXP = useCallback(() => {
    if (!soundEnabled) return;
    playSoundEffect.xp();
  }, [soundEnabled]);

  const playLevelUp = useCallback(() => {
    if (!soundEnabled) return;
    playSoundEffect.levelUp();
  }, [soundEnabled]);

  const playPrestige = useCallback(() => {
    if (!soundEnabled) return;
    playSoundEffect.prestige();
  }, [soundEnabled]);

  const playWarning = useCallback(() => {
    if (!soundEnabled) return;
    playSoundEffect.warning();
  }, [soundEnabled]);

  return {
    playXP,
    playLevelUp,
    playPrestige,
    playWarning,
  };
}
```

**Step 4: Wire warning sound into workout session**

The workout session at `app/workout/[id].tsx` already has the 10-second warning logic (line ~722) with haptic feedback but NO audio beep. Add the sound call:

```typescript
// In app/workout/[id].tsx — at the top, add import:
import { playSoundEffect } from '@/hooks/useSoundEffects';

// Find this block (~line 721-731):
useEffect(() => {
  if (timeRemaining === 10 && isRunning && !isPaused && !isPreparation) {
    if (user?.preferences?.voiceAnnouncements !== false) {
      Speech.speak('10 seconds', { rate: 0.9 });
    }
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }
}, [timeRemaining, isRunning, isPaused, isPreparation, user?.preferences]);

// Replace with:
useEffect(() => {
  if (timeRemaining === 10 && isRunning && !isPaused && !isPreparation) {
    // Play warning beep sound (includes haptic)
    playSoundEffect.warning();
    // Voice announcement
    if (user?.preferences?.voiceAnnouncements !== false) {
      Speech.speak('10 seconds', { rate: 0.9 });
    }
  }
}, [timeRemaining, isRunning, isPaused, isPreparation, user?.preferences]);
```

**Step 5: Wire level-up sound into workout session**

The workout session should play the level-up fanfare when `liveLevel` changes during a workout. Currently only `userStore.addXP()` plays the sound — but the workout session tracks `liveLevel` independently for real-time display.

```typescript
// In app/workout/[id].tsx — add a useEffect for live level changes:
const prevLiveLevelRef = useRef(liveLevel);

useEffect(() => {
  if (liveLevel > prevLiveLevelRef.current && prevLiveLevelRef.current > 0) {
    playSoundEffect.levelUp();
  }
  prevLiveLevelRef.current = liveLevel;
}, [liveLevel]);
```

**Step 6: Generate the .wav assets**

Create a Node.js script to render the oscillator patterns. Run this ONCE to generate the 4 files:

```javascript
// scripts/generate-sounds.js
// Run with: node scripts/generate-sounds.js
// Requires: npm install wav-encoder

const WavEncoder = require('wav-encoder');
const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;

function generateSamples(durationSec, generator) {
  const length = Math.ceil(SAMPLE_RATE * durationSec);
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const t = i / SAMPLE_RATE;
    samples[i] = generator(t);
  }
  return samples;
}

function sine(freq, t) {
  return Math.sin(2 * Math.PI * freq * t);
}

function square(freq, t) {
  return sine(freq, t) >= 0 ? 1 : -1;
}

function sawtooth(freq, t) {
  const phase = (freq * t) % 1;
  return 2 * phase - 1;
}

function expRamp(startVal, endVal, startTime, endTime, t) {
  if (t < startTime) return startVal;
  if (t >= endTime) return endVal;
  const ratio = (t - startTime) / (endTime - startTime);
  return startVal * Math.pow(endVal / startVal, ratio);
}

function linearRamp(startVal, endVal, startTime, endTime, t) {
  if (t < startTime) return startVal;
  if (t >= endTime) return endVal;
  const ratio = (t - startTime) / (endTime - startTime);
  return startVal + (endVal - startVal) * ratio;
}

// ── XP Tick: 880→1320Hz sine, 150ms ──
function generateXPTick() {
  return generateSamples(0.15, (t) => {
    const freq = expRamp(880, 1320, 0, 0.05, t);
    let gain = 0;
    if (t < 0.01) gain = linearRamp(0, 0.08, 0, 0.01, t);
    else gain = expRamp(0.08, 0.001, 0.01, 0.15, t);
    return sine(freq, t) * gain;
  });
}

// ── Warning Beep: two 1000Hz square beeps, 150ms apart ──
function generateWarningBeep() {
  return generateSamples(0.3, (t) => {
    let gain = 0;
    // First beep: 0-0.1s
    if (t < 0.01) gain = linearRamp(0, 0.1, 0, 0.01, t);
    else if (t < 0.08) gain = 0.1;
    else if (t < 0.1) gain = expRamp(0.1, 0.001, 0.08, 0.1, t);
    // Second beep: 0.15-0.25s
    else if (t >= 0.15 && t < 0.16) gain = linearRamp(0, 0.1, 0.15, 0.16, t);
    else if (t >= 0.16 && t < 0.23) gain = 0.1;
    else if (t >= 0.23 && t < 0.25) gain = expRamp(0.1, 0.001, 0.23, 0.25, t);
    return square(1000, t) * gain;
  });
}

// ── Level Up: sub-bass + arpeggio + sustained chord, ~2s ──
function generateLevelUp() {
  const duration = 2.5;
  const notes = [523.25, 659.25, 783.99, 1046.50];
  const noteLen = 0.18;
  const gap = 0.06;

  return generateSamples(duration, (t) => {
    let sample = 0;

    // Sub-bass hit
    if (t < 0.4) {
      const freq = expRamp(80, 40, 0, 0.3, t);
      const gain = expRamp(0.4, 0.001, 0, 0.4, t);
      sample += sine(freq, t) * gain;
    }

    // Arpeggio
    notes.forEach((freq, i) => {
      const start = 0.05 + i * (noteLen + gap);
      const end = start + noteLen + 0.15;
      if (t >= start && t < end) {
        let gain = 0;
        if (t < start + 0.02) gain = linearRamp(0, 0.35, start, start + 0.02, t);
        else gain = expRamp(0.35, 0.001, start + 0.02, end, t);
        sample += sine(freq, t) * gain;
        // Sawtooth layer
        let sawGain = 0;
        if (t < start + 0.02) sawGain = linearRamp(0, 0.2, start, start + 0.02, t);
        else sawGain = expRamp(0.2, 0.001, start + 0.02, end, t);
        sample += sawtooth(freq, t) * sawGain;
      }
    });

    // Sustained chord
    const chordStart = 0.05 + notes.length * (noteLen + gap);
    if (t >= chordStart && t < chordStart + 1.0) {
      notes.forEach((freq) => {
        const gain = expRamp(0.25, 0.001, chordStart, chordStart + 1.0, t);
        sample += sine(freq, t) * gain;
      });
    }

    return Math.max(-1, Math.min(1, sample));
  });
}

// ── Prestige: drum + fanfare + chord + shimmer, ~3s ──
function generatePrestige() {
  const duration = 3.5;
  const fanfareNotes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
  const noteLen = 0.14;
  const chordFreqs = [261.63, 329.63, 392.00, 523.25, 783.99, 1046.50];

  // Pre-compute sparkle frequencies (deterministic for reproducible .wav)
  const sparkleFreqs = [2200, 3100, 2800, 3500, 2400, 3800];

  return generateSamples(duration, (t) => {
    let sample = 0;

    // Deep drum hit
    if (t < 0.6) {
      const freq = expRamp(120, 30, 0, 0.5, t);
      const gain = expRamp(0.5, 0.001, 0, 0.6, t);
      sample += sine(freq, t) * gain;
    }

    // Rising fanfare
    fanfareNotes.forEach((freq, i) => {
      const start = 0.15 + i * noteLen;
      const end = start + noteLen + 0.2;
      if (t >= start && t < end) {
        // Sawtooth
        let sawGain = 0;
        if (t < start + 0.02) sawGain = linearRamp(0, 0.15, start, start + 0.02, t);
        else if (t < start + noteLen * 0.6) sawGain = 0.15;
        else sawGain = expRamp(0.15, 0.001, start + noteLen * 0.6, end, t);
        sample += sawtooth(freq, t) * sawGain;
        // Sine
        let sineGain = 0;
        if (t < start + 0.02) sineGain = linearRamp(0, 0.25, start, start + 0.02, t);
        else if (t < start + noteLen * 0.6) sineGain = 0.25;
        else sineGain = expRamp(0.25, 0.001, start + noteLen * 0.6, end, t);
        sample += sine(freq, t) * sineGain;
      }
    });

    // Grand chord
    const chordStart = 0.15 + fanfareNotes.length * noteLen + 0.1;
    if (t >= chordStart && t < chordStart + 1.5) {
      chordFreqs.forEach((freq) => {
        const gain = expRamp(0.2, 0.001, chordStart, chordStart + 1.5, t);
        sample += sine(freq, t) * gain;
      });
    }

    // Shimmer sparkle
    sparkleFreqs.forEach((freq, i) => {
      const sparkleTime = chordStart + 0.1 + i * 0.12;
      const sparkleEnd = sparkleTime + 0.15;
      if (t >= sparkleTime && t < sparkleEnd) {
        let gain = 0;
        if (t < sparkleTime + 0.01) gain = linearRamp(0, 0.06, sparkleTime, sparkleTime + 0.01, t);
        else gain = expRamp(0.06, 0.001, sparkleTime + 0.01, sparkleEnd, t);
        sample += sine(freq, t) * gain;
      }
    });

    return Math.max(-1, Math.min(1, sample));
  });
}

async function writeWav(filename, samples) {
  const buffer = await WavEncoder.encode({
    sampleRate: SAMPLE_RATE,
    channelData: [samples],
  });
  const dir = path.join(__dirname, '..', 'assets', 'sounds');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), Buffer.from(buffer));
  console.log(`Written: ${filename} (${Buffer.from(buffer).length} bytes)`);
}

(async () => {
  await writeWav('xp-tick.wav', generateXPTick());
  await writeWav('warning-beep.wav', generateWarningBeep());
  await writeWav('level-up.wav', generateLevelUp());
  await writeWav('prestige.wav', generatePrestige());
  console.log('All sounds generated.');
})();
```

### Verification Checklist

- [ ] `expo-av` added to package.json via `npx expo install expo-av`
- [ ] 4 .wav files exist in `assets/sounds/`
- [ ] `hooks/useSoundEffects.ts` replaced with full implementation (~250 lines)
- [ ] `playSoundEffect.xp()` produces audible rising ping + light haptic
- [ ] `playSoundEffect.levelUp()` produces audible fanfare + success haptic
- [ ] `playSoundEffect.prestige()` produces audible celebration + triple haptic
- [ ] `playSoundEffect.warning()` produces audible double beep + warning haptic
- [ ] `userStore.addXP()` still triggers sound (import unchanged: `import { playSoundEffect } from '@/hooks/useSoundEffects'`)
- [ ] Workout session 10-second warning plays warning beep
- [ ] Workout session level-up during workout plays fanfare
- [ ] Sounds play even when iPhone is on silent mode (`playsInSilentModeIOS: true`)
- [ ] XP sound debounced at 100ms (rapid XP gains don't overlap)
- [ ] Sounds respect user's `soundEnabled` preference (when called via hook)

---

<a name="issue-2"></a>
## Issue #2: workout/[id].tsx Still 1,663 Lines — Further Decomposition

**Severity:** LOW-MEDIUM — Developer experience issue, not user-facing.
**File:** `app/workout/[id].tsx` (1,663 lines)
**Target:** ~600-800 lines after extraction

### Problem

The original fix guide called for decomposing this file from 2,026 lines into ~6 components. PostWorkoutSummary and LevelUpOverlay were extracted (good), reducing it to 1,663 lines. But the file still has:
- 22 `useState` calls
- 11 `useEffect` calls
- 13 `useCallback` calls
- 3 `useMemo` calls
- 372 lines of StyleSheet definitions

The main component body is 1,132 lines (lines 158-1290), which is still very hard to read, debug, or modify.

### Current File Structure

```
Lines 1-118:     Imports + constants (ARC_SIZE, ARC_STROKE, etc.)
Lines 120-157:   Helper functions (formatTimeCompact, getDisplayMove, getMoveColor)
Lines 158-1290:  Main WorkoutSessionScreen component (1,132 lines)
  Lines 158-420:   State declarations, computed values, refs
  Lines 421-431:   Animated styles (arc progress)
  Lines 432-920:   useEffect hooks + useCallback handlers
  Lines 920-927:   Early return (workout not found)
  Lines 930-970:   Early return (isComplete → PostWorkoutSummary)
  Lines 970-1290:  Main JSX render (active workout UI)
    Lines 1088-1100:  "Get Ready" countdown UI
    Lines 1100-1195:  Arc timer SVG rendering
    Lines 1195-1210:  RoundFeedbackPanel
    Lines 1210-1250:  Segment info + phase label
    Lines 1250-1290:  Pause/control buttons
Lines 1291-1663:  StyleSheet (372 lines)
```

### Recommended Extractions

#### Extract 1: `components/workout/ArcTimer.tsx` (~200 lines)

Extract the SVG arc timer rendering (the circular progress indicator). This is a self-contained visual component.

**What to extract:**
- Constants: `ARC_SIZE`, `ARC_GLOW_STROKE`, `ARC_STROKE_WIDTH`, `ARC_R`, `ARC_C`, `ARC_FRAC`, `ARC_LEN`, `ARC_START_OFFSET`, `AnimatedCircle`
- The SVG rendering block (~lines 1100-1195)
- Related animated styles (`arcDashStyle`, `arcGlowStyle`)
- Related styles from StyleSheet

**Props interface:**
```typescript
interface ArcTimerProps {
  progress: Animated.SharedValue<number>;  // 0-1 arc fill
  timeRemaining: number;                   // seconds to display
  accentColor: string;                     // tier/phase color
  isRest: boolean;                         // rest vs work styling
  isPaused: boolean;                       // dim when paused
  isPreparation: boolean;                  // "Get Ready" mode
  children?: React.ReactNode;              // center content (time, combo display)
}
```

#### Extract 2: `components/workout/ComboDisplay.tsx` (~120 lines)

Extract the punch combination display that shows inside the arc timer.

**What to extract:**
- `getDisplayMove()` helper function
- `getMoveColor()` helper function
- The combo rendering JSX (move pills/chips with punch numbers)
- Related styles

**Props interface:**
```typescript
interface ComboDisplayProps {
  combo: string[];           // e.g., ['1', '2', 'slip', '3']
  currentMoveIndex?: number; // highlight active move
  accentColor: string;
}
```

#### Extract 3: `components/workout/WorkoutControls.tsx` (~100 lines)

Extract the pause/play, skip, and quit buttons at the bottom of the workout screen.

**What to extract:**
- Pause/resume button
- Skip segment button
- Quit workout button
- Related handlers can be passed as callbacks
- Related styles

**Props interface:**
```typescript
interface WorkoutControlsProps {
  isPaused: boolean;
  isRunning: boolean;
  onTogglePause: () => void;
  onSkipSegment: () => void;
  onQuitWorkout: () => void;
  accentColor: string;
}
```

#### Extract 4: `hooks/useWorkoutTimer.ts` (~300 lines)

Extract the timer engine logic (the largest win). This custom hook would encapsulate:
- All timer-related `useState` calls (timeRemaining, currentSegmentIndex, totalElapsed, isRunning, isPaused, isPreparation, isComplete)
- All timer-related `useEffect` hooks (countdown, segment transitions, auto-advance)
- All timer-related `useCallback` handlers (skipSegment, togglePause, quitWorkout)
- Flat segment computation
- Segment transition logic

**Return interface:**
```typescript
interface UseWorkoutTimerReturn {
  // State
  timeRemaining: number;
  totalElapsed: number;
  currentSegmentIndex: number;
  currentSegment: FlatSegment | null;
  isRunning: boolean;
  isPaused: boolean;
  isPreparation: boolean;
  isComplete: boolean;
  flatSegments: FlatSegment[];

  // Actions
  start: () => void;
  togglePause: () => void;
  skipSegment: () => void;
  quit: () => void;

  // Computed
  segmentProgress: number;  // 0-1
  overallProgress: number;  // 0-1
  currentRound: number;
  totalRounds: number;
}
```

### Post-Extraction File Structure

After these 4 extractions, `workout/[id].tsx` would be ~600-800 lines:

```
workout/[id].tsx (~700 lines):
  - Imports
  - useWorkoutTimer() hook call
  - XP tracking state + effects
  - Badge tracking state + effects
  - Session result computation
  - Render: GetReady | ActiveWorkout | PostWorkoutSummary

components/workout/ArcTimer.tsx (~200 lines)
components/workout/ComboDisplay.tsx (~120 lines)
components/workout/WorkoutControls.tsx (~100 lines)
hooks/useWorkoutTimer.ts (~300 lines)
```

### Verification Checklist

- [ ] `useWorkoutTimer` hook created and handles all timer state
- [ ] `ArcTimer` component renders SVG arc correctly
- [ ] `ComboDisplay` shows punch pills with correct colors
- [ ] `WorkoutControls` renders pause/skip/quit buttons
- [ ] `workout/[id].tsx` reduced to ~600-800 lines
- [ ] All existing functionality preserved (timer, XP, badges, sounds, feedback)
- [ ] No visual regressions in workout session UI

---

<a name="issue-3"></a>
## Issue #3: stats.tsx Duplicates RoadToBMF Instead of Importing

**Severity:** LOW — Code duplication, no user-facing impact.
**File:** `app/(tabs)/stats.tsx`

### Problem

`app/(tabs)/stats.tsx` defines a local `RoadToBMFCard` function at line 622 (~70 lines) that duplicates the extracted `components/ui/RoadToBMF.tsx` component (247 lines). The extracted version is superior — it has:
- Animated milestone dots with `react-native-reanimated`
- Milestone icons via `MaterialCommunityIcons`
- 7 named milestones (First Blood → BMF) with threshold tracking
- Prestige dot row with tier colors
- Segment-level progress between milestones

The inline version in stats.tsx is a simpler "3 progress bars" approach (Prestige, Sessions, Streak).

### Fix

**Step 1:** Replace the inline component with an import.

```typescript
// In app/(tabs)/stats.tsx — add import:
import RoadToBMF from '@/components/ui/RoadToBMF';

// Find and REPLACE the <RoadToBMFCard> usage (~line 563):
// BEFORE:
<RoadToBMFCard
  prestige={prestige}
  level={level}
  totalSessions={totalSessions}
  longestStreak={longestStreak}
/>

// AFTER:
<RoadToBMF
  workoutsCompleted={totalSessions}
  prestige={prestige}
  level={level}
/>
```

**Step 2:** Delete the inline `RoadToBMFCard` function (lines ~622-690).

**Step 3:** Delete any now-unused styles from the StyleSheet that were only used by `RoadToBMFCard`:
- `bmfHeader`
- `bmfTitle`
- `bmfPercent`
- `bmfBarBg`
- `bmfBarFill`
- `bmfMilestone`
- `bmfMilestoneLeft`
- `bmfMilestoneLabel`
- `bmfMilestoneValue`
- `bmfMiniBarBg`
- `bmfMiniBarFill`

**Note:** The extracted `RoadToBMF` component doesn't accept `longestStreak` as a prop — it uses `workoutsCompleted` against the 7 milestone thresholds (1, 10, 25, 50, 100, 150, 250). If the streak tracking is desired, the `RoadToBMF` component can be extended to accept an optional `longestStreak` prop, but the milestone-based display is the intended design per the Lovable reference.

### Verification Checklist

- [ ] `RoadToBMFCard` inline function deleted from stats.tsx
- [ ] `RoadToBMF` imported from `@/components/ui/RoadToBMF`
- [ ] Milestone dots render with correct icons and animations
- [ ] Prestige tier colors display correctly
- [ ] Unused bmf* styles removed from stats.tsx StyleSheet
- [ ] No TypeScript errors

---

<a name="issue-4"></a>
## Issue #4: trendingWorkouts.ts Empty Array — Needs Seed Data

**Severity:** LOW — Affects the Fight Club / Trending tab content. Empty state is functional but underwhelming.
**File:** `data/trendingWorkouts.ts` (currently 19 lines)

### Problem

The file defines the `TrendingWorkout` interface and `WORKOUT_CATEGORIES` correctly but exports an empty array:

```typescript
export const TRENDING_WORKOUTS: TrendingWorkout[] = [];
```

New users see an empty trending section. The `usePresetSeeding` hook seeds 4 starter workouts into the user's personal library, but the trending/community discovery section has zero content.

### Fix

Populate with 8-10 curated seed workouts spanning different tiers, categories, and durations. These serve as the "Staff Picks" for day-one users before the community generates its own content.

```typescript
import { Workout } from '@/lib/types';
import { generateId } from '@/lib/utils';

export interface TrendingWorkout extends Workout {
  author: string;
  authorHandle: string;
  rating: number;
  ratingCount: number;
  downloads: number;
  tags: string[];
}

export const WORKOUT_CATEGORIES = [
  'All', 'Boxing', 'HIIT', 'Conditioning',
  'Rookie', 'Beginner', 'Intermediate', 'Advanced', 'Pro', 'Cardio'
] as const;

export type WorkoutCategory = typeof WORKOUT_CATEGORIES[number];

/**
 * Curated trending workouts — "Staff Picks" for new users.
 * These provide day-one content in the Fight Club / Trending tab
 * before the community generates organic content.
 *
 * Covers:
 *   - 3 skill tiers: Rookie/Beginner, Intermediate, Advanced
 *   - 3 workout types: pure boxing, conditioning, HIIT
 *   - 3 duration ranges: quick (10-15min), standard (20-30min), long (35-45min)
 *   - Multiple equipment options: shadowbox, heavy bag, mixed
 */
export const TRENDING_WORKOUTS: TrendingWorkout[] = [
  {
    id: generateId(),
    name: 'Jab-Cross Foundations',
    phases: [
      {
        id: generateId(),
        name: 'Warm Up',
        repeats: 1,
        comboOrder: 'sequential',
        segments: [
          { id: generateId(), name: 'Jump Rope', duration: 180, type: 'active', segmentType: 'work' },
          { id: generateId(), name: 'Rest', duration: 30, type: 'rest', segmentType: 'rest' },
        ],
      },
      {
        id: generateId(),
        name: 'Boxing Rounds',
        repeats: 4,
        comboOrder: 'sequential',
        segments: [
          { id: generateId(), name: 'Shadowbox', duration: 120, type: 'active', segmentType: 'work',
            combos: [['1', '2'], ['1', '1', '2'], ['1', '2', '1', '2']] },
          { id: generateId(), name: 'Rest', duration: 60, type: 'rest', segmentType: 'rest' },
        ],
      },
    ],
    author: 'Get Clocked',
    authorHandle: '@getclocked',
    rating: 4.8,
    ratingCount: 245,
    downloads: 1820,
    tags: ['Boxing', 'Rookie', 'Shadowbox'],
  },
  {
    id: generateId(),
    name: '3-Punch Power Combos',
    phases: [
      {
        id: generateId(),
        name: 'Warm Up',
        repeats: 1,
        comboOrder: 'sequential',
        segments: [
          { id: generateId(), name: 'Arm Circles + Footwork', duration: 120, type: 'active', segmentType: 'work' },
        ],
      },
      {
        id: generateId(),
        name: 'Combo Rounds',
        repeats: 6,
        comboOrder: 'sequential',
        segments: [
          { id: generateId(), name: 'Heavy Bag', duration: 180, type: 'active', segmentType: 'work',
            combos: [['1', '2', '3'], ['1', '1', '2', '3'], ['2', '3', '2']] },
          { id: generateId(), name: 'Rest', duration: 60, type: 'rest', segmentType: 'rest' },
        ],
      },
      {
        id: generateId(),
        name: 'Cooldown',
        repeats: 1,
        comboOrder: 'sequential',
        segments: [
          { id: generateId(), name: 'Shadow Stretch', duration: 120, type: 'active', segmentType: 'work' },
        ],
      },
    ],
    author: 'Coach Mike',
    authorHandle: '@coachmike',
    rating: 4.6,
    ratingCount: 189,
    downloads: 1340,
    tags: ['Boxing', 'Beginner', 'Heavy Bag'],
  },
  {
    id: generateId(),
    name: 'Southpaw Destroyer',
    phases: [
      {
        id: generateId(),
        name: 'Warm Up',
        repeats: 1,
        comboOrder: 'sequential',
        segments: [
          { id: generateId(), name: 'Jump Rope', duration: 180, type: 'active', segmentType: 'work' },
          { id: generateId(), name: 'Rest', duration: 30, type: 'rest', segmentType: 'rest' },
        ],
      },
      {
        id: generateId(),
        name: 'Rounds',
        repeats: 8,
        comboOrder: 'random',
        segments: [
          { id: generateId(), name: 'Bag Work', duration: 180, type: 'active', segmentType: 'work',
            combos: [
              ['1', '2', '3', '2'],
              ['1', '2', '5', '6'],
              ['1', '6', '3', '2'],
              ['5', '2', '3', '6', '2'],
            ] },
          { id: generateId(), name: 'Rest', duration: 60, type: 'rest', segmentType: 'rest' },
        ],
      },
    ],
    author: 'KO Queen',
    authorHandle: '@koqueen',
    rating: 4.9,
    ratingCount: 312,
    downloads: 2450,
    tags: ['Boxing', 'Intermediate', 'Heavy Bag'],
  },
  {
    id: generateId(),
    name: 'Body Shot Blitz',
    phases: [
      {
        id: generateId(),
        name: 'Warm Up',
        repeats: 1,
        comboOrder: 'sequential',
        segments: [
          { id: generateId(), name: 'Shadowbox Light', duration: 180, type: 'active', segmentType: 'work' },
        ],
      },
      {
        id: generateId(),
        name: 'Body Rounds',
        repeats: 6,
        comboOrder: 'random',
        segments: [
          { id: generateId(), name: 'Heavy Bag', duration: 180, type: 'active', segmentType: 'work',
            combos: [
              ['1', '2', '7', '8'],
              ['7', '8', '3', '2'],
              ['1', '7', '2', '8'],
              ['1', '2', '7', '8', '2'],
            ] },
          { id: generateId(), name: 'Active Rest', duration: 45, type: 'rest', segmentType: 'rest' },
        ],
      },
    ],
    author: 'Iron Fist Boxing',
    authorHandle: '@ironfistboxing',
    rating: 4.7,
    ratingCount: 276,
    downloads: 1980,
    tags: ['Boxing', 'Advanced', 'Heavy Bag', 'Body Work'],
  },
  {
    id: generateId(),
    name: 'Quick HIIT Burn (15 min)',
    phases: [
      {
        id: generateId(),
        name: 'HIIT Circuit',
        repeats: 5,
        comboOrder: 'sequential',
        segments: [
          { id: generateId(), name: 'Burpees', duration: 30, type: 'active', segmentType: 'work' },
          { id: generateId(), name: 'Shadow Combos', duration: 30, type: 'active', segmentType: 'work',
            combos: [['1', '2'], ['1', '2', '3']] },
          { id: generateId(), name: 'Mountain Climbers', duration: 30, type: 'active', segmentType: 'work' },
          { id: generateId(), name: 'Rest', duration: 30, type: 'rest', segmentType: 'rest' },
        ],
      },
    ],
    author: 'Get Clocked',
    authorHandle: '@getclocked',
    rating: 4.5,
    ratingCount: 198,
    downloads: 3200,
    tags: ['HIIT', 'Conditioning', 'Beginner', 'Quick'],
  },
  {
    id: generateId(),
    name: 'Defensive Flow',
    phases: [
      {
        id: generateId(),
        name: 'Warm Up',
        repeats: 1,
        comboOrder: 'sequential',
        segments: [
          { id: generateId(), name: 'Footwork Drills', duration: 120, type: 'active', segmentType: 'work' },
        ],
      },
      {
        id: generateId(),
        name: 'Defense Rounds',
        repeats: 6,
        comboOrder: 'random',
        segments: [
          { id: generateId(), name: 'Shadowbox', duration: 180, type: 'active', segmentType: 'work',
            combos: [
              ['1', '2', 'slip', '3'],
              ['1', 'slip', '2', 'roll'],
              ['1', '2', 'roll', '1', '2'],
              ['slip', '1', '2', 'slip', '3', '2'],
            ] },
          { id: generateId(), name: 'Rest', duration: 60, type: 'rest', segmentType: 'rest' },
        ],
      },
    ],
    author: 'Sweet Science Lab',
    authorHandle: '@sweetsciencelab',
    rating: 4.8,
    ratingCount: 221,
    downloads: 1650,
    tags: ['Boxing', 'Intermediate', 'Defense', 'Shadowbox'],
  },
  {
    id: generateId(),
    name: 'Pro Championship Rounds',
    phases: [
      {
        id: generateId(),
        name: 'Warm Up',
        repeats: 1,
        comboOrder: 'sequential',
        segments: [
          { id: generateId(), name: 'Jump Rope', duration: 180, type: 'active', segmentType: 'work' },
          { id: generateId(), name: 'Shadowbox Light', duration: 180, type: 'active', segmentType: 'work' },
          { id: generateId(), name: 'Rest', duration: 60, type: 'rest', segmentType: 'rest' },
        ],
      },
      {
        id: generateId(),
        name: 'Championship Rounds',
        repeats: 12,
        comboOrder: 'random',
        segments: [
          { id: generateId(), name: 'Heavy Bag', duration: 180, type: 'active', segmentType: 'work',
            combos: [
              ['1', '2', '3', '2', '1'],
              ['1', '2', '5', '6', '3'],
              ['1', '2', 'slip', '3', '2', '7', '8'],
              ['6', '5', '2', '3', '2'],
              ['1', '2', '3', 'roll', '2', '3'],
              ['1', '2', '7', '8', 'slip', '2', '3'],
            ] },
          { id: generateId(), name: 'Rest', duration: 60, type: 'rest', segmentType: 'rest' },
        ],
      },
      {
        id: generateId(),
        name: 'Cooldown',
        repeats: 1,
        comboOrder: 'sequential',
        segments: [
          { id: generateId(), name: 'Shadow Stretch', duration: 180, type: 'active', segmentType: 'work' },
        ],
      },
    ],
    author: 'Undisputed Athletics',
    authorHandle: '@undisputedathletics',
    rating: 4.9,
    ratingCount: 410,
    downloads: 2870,
    tags: ['Boxing', 'Pro', 'Heavy Bag', 'Championship'],
  },
  {
    id: generateId(),
    name: 'Speed Bag Sprint',
    phases: [
      {
        id: generateId(),
        name: 'Speed Rounds',
        repeats: 8,
        comboOrder: 'sequential',
        segments: [
          { id: generateId(), name: 'Speed Bag', duration: 90, type: 'active', segmentType: 'work' },
          { id: generateId(), name: 'Rest', duration: 30, type: 'rest', segmentType: 'rest' },
        ],
      },
    ],
    author: 'Quick Hands Boxing',
    authorHandle: '@quickhands',
    rating: 4.4,
    ratingCount: 134,
    downloads: 890,
    tags: ['Boxing', 'Beginner', 'Speed Bag', 'Quick'],
  },
];
```

**Note:** The `generateId()` function is called at module load time, so each app session gets different IDs. This is fine for seed data — these aren't persisted. If deterministic IDs are needed, replace `generateId()` with fixed string IDs like `'trending-001'`.

### Verification Checklist

- [ ] `TRENDING_WORKOUTS` contains 8 workouts
- [ ] Coverage: Rookie (1), Beginner (3), Intermediate (2), Advanced (1), Pro (1)
- [ ] Coverage: Shadowbox (3), Heavy Bag (4), Speed Bag (1), Mixed/HIIT (1)
- [ ] All combos use valid punch numbers (1-8) and defensive moves (slip, roll)
- [ ] Combo complexity matches stated tier (Rookie: 2-3 punches, Pro: 5-7 with defense)
- [ ] Trending section shows populated list instead of empty state
- [ ] Each workout has realistic metadata (author, rating, downloads)
- [ ] No TypeScript errors

---

<a name="issue-5"></a>
## Issue #5: Tier Loadout System — No Preset Rotation on Prestige, Empty Presets Tab

**Severity:** MEDIUM-HIGH — Directly affects the "always have a fresh workout" experience and Fight Club tab content.
**Files affected:** `stores/workoutStore.ts`, `app/(tabs)/fight-club.tsx`, `data/presetWorkouts.ts`, `app/onboarding.tsx`, `app/workout/[id].tsx`, `app/(tabs)/profile.tsx`

### Problem

Three related issues form a single broken feature:

**Problem A: Presets tab shows nothing.**
`data/presetWorkouts.ts` exports 6 empty arrays (`COMPLETE_BEGINNER_PRESET_WORKOUTS: Workout[] = []`, etc.). The Fight Club presets tab merges all of these into `allPresets` which equals `[]`. User sees an empty presets section.

**Problem B: Other-tier loadouts aren't shown as downloadable presets.**
After onboarding as Beginner, the user should see Rookie, Intermediate, Advanced, and Pro loadouts available to download in the Presets tab. Currently nothing appears because: (a) the preset arrays are empty, and (b) there's no mechanism to generate loadouts for OTHER tiers.

In Lovable, this was handled by `useTierPresets` hook which queried a `tier_presets` Supabase table for all tiers ≠ user's current tier. Since we're local-only (no Supabase), we need to generate these loadouts client-side using `generateLoadoutWorkout()`.

**Problem C: Prestige doesn't swap the user's loadout.**
When a user prestiges from Beginner → Intermediate:
- Their `prestige` and `experienceLevel` update correctly ✅
- XP and level reset correctly ✅
- But their "My Workouts" still shows "Beginner Loadout" ❌
- The Presets tab doesn't update to exclude Intermediate ❌
- No new Intermediate loadout is auto-generated for "My Workouts" ❌

The Lovable app handles this because the `useTierPresets` hook re-queries on prestige change (reactive to `userTier`), and Settings has a manual "Regenerate Loadout" button. In Replit, the `workoutStore` has `loadXxxPresets()` functions but they load from empty arrays, and prestige handlers don't call them.

### How It Should Work

```
ONBOARDING (user selects "Beginner"):
  → Generate Beginner Loadout → add to "My Workouts" (tagged: ['boxing', 'beginner', 'loadout'])
  → Fight Club Presets tab shows: Rookie, Intermediate, Advanced, Pro loadouts (downloadable)
  → Each preset generated via generateLoadoutWorkout(tier, userEquipment)

PRESTIGE (Beginner → Intermediate):
  → Delete old loadout from "My Workouts" (find by 'loadout' tag)
  → Generate Intermediate Loadout → add to "My Workouts"
  → Fight Club Presets tab updates to show: Rookie, Beginner, Advanced, Pro (excludes Intermediate)

DOWNLOAD PRESET (user taps "Save" on Advanced loadout):
  → Add Advanced Loadout to "My Workouts" (tagged: ['boxing', 'advanced', 'loadout', 'downloaded'])
  → Downloaded presets are NOT swapped on prestige (only the auto-loadout swaps)
```

### Implementation

This is a 3-part fix:

#### Part 1: Generate other-tier loadouts for the Presets tab

Create a new hook `hooks/useTierPresets.ts` that generates loadouts for all tiers except the user's current tier:

```typescript
/**
 * Tier Presets Hook
 * ==================
 * Generates downloadable loadout workouts for all tiers EXCEPT the user's
 * current tier. These appear in the Fight Club → Presets tab.
 *
 * Since we're local-only (no Supabase), loadouts are generated client-side
 * using generateLoadoutWorkout() with the user's equipment config.
 *
 * Lovable equivalent: useTierPresets.ts (used Supabase tier_presets table).
 * This version generates the same data client-side.
 *
 * The loadouts are re-generated when:
 *   - User's prestige/tier changes (prestige up)
 *   - User's equipment changes (settings update)
 */

import { useMemo } from 'react';
import { useUserStore } from '@/stores/userStore';
import {
  generateLoadoutWorkout,
  mapExperienceToTier,
  UserEquipmentConfig,
} from '@/lib/loadoutGenerator';
import { Prestige, PRESTIGE_ORDER, PRESTIGE_NAMES } from '@/lib/xpSystem';
import { Workout } from '@/lib/types';
import { generateId } from '@/lib/utils';

export interface TierPresetWorkout extends Workout {
  /** The tier this loadout targets */
  sourceTier: Prestige;
  /** Human-readable tier name */
  tierLabel: string;
  /** Description of what makes this tier different */
  tierDescription: string;
}

/** Experience level strings that map to each prestige tier */
const TIER_TO_EXPERIENCE: Record<Prestige, string> = {
  rookie: 'complete_beginner',
  beginner: 'beginner',
  intermediate: 'intermediate',
  advanced: 'advanced',
  pro: 'pro',
};

/** Descriptions for each tier's loadout */
const TIER_DESCRIPTIONS: Record<Prestige, string> = {
  rookie: 'Punches 1-4 only. Jab, cross, lead hook, rear hook. Foundation building.',
  beginner: 'Punches 1-4 with basic combos. Longer combinations and rhythm work.',
  intermediate: 'Punches 1-6 unlocked. Lead/rear uppercuts enter the mix. Defense combos.',
  advanced: 'Punches 1-8. Body shots (7-8) added. Complex combos with defensive moves.',
  pro: 'Full arsenal. 5-7 punch combos with slips, rolls, and advanced footwork.',
};

/**
 * Build a UserEquipmentConfig from the user profile's equipment object.
 */
function buildEquipmentConfig(equipment: Record<string, any> | null | undefined): UserEquipmentConfig {
  if (!equipment) {
    return {
      gloves: false, wraps: false, jumpRope: false,
      heavyBag: false, doubleEndBag: false, speedBag: false, treadmill: false,
    };
  }
  return {
    gloves: !!equipment.gloves,
    wraps: !!equipment.wraps,
    jumpRope: !!equipment.jumpRope,
    heavyBag: !!equipment.heavyBag,
    doubleEndBag: !!equipment.doubleEndBag,
    speedBag: !!equipment.speedBag,
    treadmill: !!equipment.treadmill,
    primaryBag: equipment.primaryBag as any,
  };
}

/**
 * Generate loadout presets for all tiers except the user's current tier.
 * Returns an array of TierPresetWorkout sorted by tier difficulty (Pro first).
 */
export function useTierPresets(): {
  presets: TierPresetWorkout[];
  userTier: Prestige;
} {
  const user = useUserStore((s) => s.user);
  const userTier = (user?.prestige || 'rookie') as Prestige;
  const equipment = user?.equipment as Record<string, any> | null;

  const presets = useMemo(() => {
    const equipConfig = buildEquipmentConfig(equipment);
    const results: TierPresetWorkout[] = [];

    for (const tier of PRESTIGE_ORDER) {
      // Skip the user's current tier — they already have that loadout
      if (tier === userTier) continue;

      const experienceLevel = TIER_TO_EXPERIENCE[tier];
      const loadout = generateLoadoutWorkout(experienceLevel, equipConfig);

      // Convert GeneratedLoadout → Workout → TierPresetWorkout
      const workout: TierPresetWorkout = {
        id: `tier-preset-${tier}`,
        name: loadout.name,
        icon: 'flash',
        difficulty: loadout.difficulty as any,
        totalDuration: loadout.duration,
        isPreset: true,
        isArchived: false,
        createdAt: new Date().toISOString(),
        timesCompleted: 0,
        sections: {
          warmup: loadout.phases.filter((p) => p.section === 'warmup'),
          grind: loadout.phases.filter((p) => p.section === 'grind'),
          cooldown: loadout.phases.filter((p) => p.section === 'cooldown'),
        },
        combos: loadout.combos,
        tags: ['boxing', tier, 'loadout', 'tier-preset'],
        sourceTier: tier,
        tierLabel: PRESTIGE_NAMES[tier],
        tierDescription: TIER_DESCRIPTIONS[tier],
      };

      results.push(workout);
    }

    // Sort by tier difficulty descending (Pro first)
    return results.sort((a, b) => {
      return PRESTIGE_ORDER.indexOf(b.sourceTier) - PRESTIGE_ORDER.indexOf(a.sourceTier);
    });
  }, [userTier, equipment]);

  return { presets, userTier };
}
```

#### Part 2: Wire tier presets into Fight Club presets tab

Update `app/(tabs)/fight-club.tsx` to use the new hook:

```typescript
// At the top, add import:
import { useTierPresets, TierPresetWorkout } from '@/hooks/useTierPresets';
import { PRESTIGE_COLORS } from '@/constants/colors';

// Inside the component, after existing hooks:
const { presets: tierPresets, userTier } = useTierPresets();

// Replace the existing allPresets useMemo with:
const allPresets = useMemo(() => {
  // Tier loadout presets (generated from user's equipment for each tier)
  // These are the primary presets — other-tier loadouts the user can download
  return tierPresets;
}, [tierPresets]);

// In the presets rendering section, update the card to show tier info:
// Each preset has: preset.tierLabel, preset.tierDescription, preset.sourceTier
// Use PRESTIGE_COLORS[preset.sourceTier] for tier-colored accent
```

The existing filter logic already works with the `difficulty` field, so tier category filters (Rookie, Beginner, etc.) will work automatically.

**Important:** Remove the imports of empty preset arrays from `@/data/presetWorkouts` since they're no longer needed for the presets tab. The `handleSavePreset` function already handles adding to the user's workout library correctly.

#### Part 3: Auto-swap loadout on prestige

When the user prestiges, the old loadout needs to be deleted and a new one generated. Update every `handlePrestige` / `onPrestige` callback:

**In `app/workout/[id].tsx` (~line 955):**

```typescript
onPrestige={() => {
  const nextPrestige = PRESTIGE_ORDER[PRESTIGE_ORDER.indexOf(prestige) + 1] as Prestige;
  if (nextPrestige) {
    // 1. Update user tier
    updateUser({ prestige: nextPrestige, totalXP: 0, currentLevel: 1, experienceLevel: nextPrestige } as any);

    // 2. Swap loadout: remove old, generate new
    const workouts = useWorkoutStore.getState().workouts;
    const oldLoadout = workouts.find((w) => w.tags?.includes('loadout') && !w.tags?.includes('downloaded'));
    if (oldLoadout) {
      useWorkoutStore.getState().removeWorkout(oldLoadout.id);
    }

    // Generate new loadout for the new tier
    const equipment = user?.equipment as Record<string, any> | null;
    const equipConfig: UserEquipmentConfig = {
      gloves: !!equipment?.gloves,
      wraps: !!equipment?.wraps,
      jumpRope: !!equipment?.jumpRope,
      heavyBag: !!equipment?.heavyBag,
      doubleEndBag: !!equipment?.doubleEndBag,
      speedBag: !!equipment?.speedBag,
      treadmill: !!equipment?.treadmill,
      primaryBag: equipment?.primaryBag as any,
    };

    const TIER_TO_EXP: Record<string, string> = {
      rookie: 'complete_beginner', beginner: 'beginner',
      intermediate: 'intermediate', advanced: 'advanced', pro: 'pro',
    };

    const loadout = generateLoadoutWorkout(TIER_TO_EXP[nextPrestige] || 'beginner', equipConfig);
    const newWorkout: Workout = {
      id: generateId(),
      name: loadout.name,
      icon: 'flash',
      difficulty: loadout.difficulty as any,
      totalDuration: loadout.duration,
      isPreset: loadout.is_preset,
      isArchived: false,
      createdAt: new Date().toISOString(),
      timesCompleted: 0,
      sections: {
        warmup: loadout.phases.filter((p) => p.section === 'warmup'),
        grind: loadout.phases.filter((p) => p.section === 'grind'),
        cooldown: loadout.phases.filter((p) => p.section === 'cooldown'),
      },
      combos: loadout.combos,
      tags: loadout.tags,
    };
    useWorkoutStore.getState().addWorkout(newWorkout);
  }
}}
```

**IMPORTANT:** This same loadout swap logic is needed in THREE places:
1. `app/workout/[id].tsx` → `onPrestige` callback (~line 955)
2. `app/(tabs)/profile.tsx` → `handlePrestige` function (~line 91)
3. `app/(tabs)/stats.tsx` → `handlePrestige` function (~line 206)

**To avoid duplicating 30 lines across 3 files, extract a shared helper:**

Create `lib/prestigeActions.ts`:

```typescript
/**
 * Prestige Actions
 * =================
 * Shared logic for executing a prestige tier advance.
 * Called from workout session, profile, and stats pages.
 *
 * Performs:
 *   1. Updates user profile: prestige, level=1, xp=0, experienceLevel
 *   2. Removes old auto-generated loadout from My Workouts
 *   3. Generates new loadout for the new tier
 *   4. Adds new loadout to My Workouts
 *
 * Does NOT remove manually downloaded presets (tagged 'downloaded').
 */

import { Prestige, PRESTIGE_ORDER } from '@/lib/xpSystem';
import { generateLoadoutWorkout, UserEquipmentConfig } from '@/lib/loadoutGenerator';
import { useWorkoutStore } from '@/stores/workoutStore';
import { useUserStore } from '@/stores/userStore';
import { Workout } from '@/lib/types';
import { generateId } from '@/lib/utils';

const TIER_TO_EXPERIENCE: Record<string, string> = {
  rookie: 'complete_beginner',
  beginner: 'beginner',
  intermediate: 'intermediate',
  advanced: 'advanced',
  pro: 'pro',
};

/**
 * Execute a prestige tier advance.
 * @param currentPrestige - The user's current prestige tier.
 * @returns The new prestige tier, or null if already at max (Pro).
 */
export function executePrestige(currentPrestige: Prestige): Prestige | null {
  const idx = PRESTIGE_ORDER.indexOf(currentPrestige);
  if (idx >= PRESTIGE_ORDER.length - 1) return null; // Already Pro

  const nextPrestige = PRESTIGE_ORDER[idx + 1] as Prestige;

  // 1. Update user profile
  const updateUser = useUserStore.getState().updateUser;
  updateUser({
    prestige: nextPrestige,
    currentLevel: 1,
    totalXP: 0,
    experienceLevel: nextPrestige as any,
  });

  // 2. Remove old auto-loadout (NOT manually downloaded presets)
  const workoutState = useWorkoutStore.getState();
  const oldLoadout = workoutState.workouts.find(
    (w) => w.tags?.includes('loadout') && !w.tags?.includes('downloaded')
  );
  if (oldLoadout) {
    workoutState.removeWorkout(oldLoadout.id);
  }

  // 3. Generate new loadout for the new tier
  const user = useUserStore.getState().user;
  const equipment = user?.equipment as Record<string, any> | null;
  const equipConfig: UserEquipmentConfig = {
    gloves: !!equipment?.gloves,
    wraps: !!equipment?.wraps,
    jumpRope: !!equipment?.jumpRope,
    heavyBag: !!equipment?.heavyBag,
    doubleEndBag: !!equipment?.doubleEndBag,
    speedBag: !!equipment?.speedBag,
    treadmill: !!equipment?.treadmill,
    primaryBag: equipment?.primaryBag as any,
  };

  const loadout = generateLoadoutWorkout(
    TIER_TO_EXPERIENCE[nextPrestige] || 'beginner',
    equipConfig
  );

  // 4. Add new loadout to My Workouts
  const newWorkout: Workout = {
    id: generateId(),
    name: loadout.name,
    icon: 'flash',
    difficulty: loadout.difficulty as any,
    totalDuration: loadout.duration,
    isPreset: loadout.is_preset,
    isArchived: false,
    createdAt: new Date().toISOString(),
    timesCompleted: 0,
    sections: {
      warmup: loadout.phases.filter((p) => p.section === 'warmup'),
      grind: loadout.phases.filter((p) => p.section === 'grind'),
      cooldown: loadout.phases.filter((p) => p.section === 'cooldown'),
    },
    combos: loadout.combos,
    tags: loadout.tags, // includes ['boxing', tier, 'loadout']
  };
  workoutState.addWorkout(newWorkout);

  return nextPrestige;
}
```

Then simplify all three prestige handlers:

```typescript
// In workout/[id].tsx:
import { executePrestige } from '@/lib/prestigeActions';

onPrestige={() => {
  executePrestige(prestige);
}}

// In profile.tsx:
import { executePrestige } from '@/lib/prestigeActions';

const handlePrestige = () => {
  const changes = getPrestigeChanges(prestige);
  if (!changes) return;
  Alert.alert(
    'Prestige Up',
    `Advance from ${changes.currentTierName} to ${changes.nextTierName}?`,
    [
      { text: 'Not Yet', style: 'cancel' },
      {
        text: 'Prestige',
        style: 'destructive',
        onPress: () => {
          executePrestige(prestige);
          setShowPrestigePrompt(false);
        },
      },
    ]
  );
};

// In stats.tsx:
import { executePrestige } from '@/lib/prestigeActions';

const handlePrestige = () => {
  executePrestige(prestige);
};
```

#### Part 4: Mark downloaded presets distinctly

When a user taps "Save" on a tier preset in Fight Club, add a `'downloaded'` tag so the prestige swap logic doesn't delete it:

In `app/(tabs)/fight-club.tsx`, update `handleSavePreset`:

```typescript
const handleSavePreset = (preset: Workout) => {
  Alert.alert(
    'Save Workout',
    `Add "${preset.name}" to your workout library?`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Save',
        onPress: () => {
          addWorkout({
            ...preset,
            id: generateId(),
            isPreset: false,  // It's now a user workout, not a preset
            tags: [...(preset.tags || []), 'downloaded'],  // Mark as downloaded
          });
          Alert.alert('Saved!', `${preset.name} has been added to your sets.`);
        },
      },
    ]
  );
};
```

### Data Flow Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                        ONBOARDING                                │
│  User selects: Beginner                                          │
│  → generateLoadoutWorkout('beginner', equipment)                 │
│  → addWorkout({...loadout, tags: ['boxing','beginner','loadout']})│
│  → My Workouts: [Beginner Loadout]                               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     FIGHT CLUB → PRESETS TAB                     │
│  useTierPresets() generates loadouts for ALL tiers ≠ Beginner    │
│  → Shows: [Pro Loadout] [Advanced Loadout] [Intermediate] [Rookie]│
│  User taps "Save" on Advanced → adds to My Workouts              │
│    (tagged: ['boxing','advanced','loadout','downloaded'])         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PRESTIGE: Beginner → Intermediate             │
│  executePrestige('beginner'):                                    │
│    1. updateUser(prestige: 'intermediate', level: 1, xp: 0)     │
│    2. Find workout with tag 'loadout' but NOT 'downloaded'       │
│       → Removes "Beginner Loadout"                               │
│    3. generateLoadoutWorkout('intermediate', equipment)           │
│       → Adds "Intermediate Loadout"                              │
│    4. My Workouts: [Intermediate Loadout, Advanced Loadout(dl)]  │
│    5. Presets tab auto-updates: [Pro] [Advanced] [Beginner] [Rookie]│
│       (Intermediate excluded because it's now the user's tier)   │
└─────────────────────────────────────────────────────────────────┘
```

### Verification Checklist

- [ ] `hooks/useTierPresets.ts` created with `useTierPresets()` hook
- [ ] `lib/prestigeActions.ts` created with `executePrestige()` function
- [ ] Fight Club Presets tab shows 4 tier loadouts (all tiers except user's current)
- [ ] Each preset card shows tier name, description, and tier-colored accent
- [ ] Tapping "Save" on a preset adds it to My Workouts with 'downloaded' tag
- [ ] Onboarding still generates the user's tier loadout correctly
- [ ] Prestige removes old auto-loadout from My Workouts
- [ ] Prestige generates new tier loadout in My Workouts
- [ ] Prestige does NOT remove manually downloaded presets
- [ ] Presets tab updates after prestige (excludes new current tier)
- [ ] All 3 prestige handlers (workout session, profile, stats) use `executePrestige()`
- [ ] Loadout name updates correctly (e.g., "Beginner Loadout" → "Intermediate Loadout")
- [ ] Filter buttons in Presets tab work (Rookie, Beginner, etc. filter correctly)
- [ ] Empty `loadXxxPresets()` functions in workoutStore can be removed or left as no-ops

---

<a name="priority-order"></a>
## Priority Order & Dependencies

| Priority | Issue | Why | Effort | Dependencies |
|----------|-------|-----|--------|-------------|
| **P1** | #1 Sound Effects | Only issue affecting user experience. Users expect audio feedback on XP gain, level up, and prestige. Silent app feels broken. | 2-3 hours | Needs `expo-av` install + .wav asset generation |
| **P1** | #5 Tier Loadout System | Presets tab is empty, prestige doesn't swap loadout. Core progression loop is broken. | 2-3 hours | None — uses existing `generateLoadoutWorkout()` |
| **P2** | #4 Trending Data | Empty trending section makes Fight Club tab look unfinished. Quick win. | 30 min | None |
| **P3** | #3 RoadToBMF Import | Dead code / duplication. Easy cleanup. | 15 min | None |
| **P4** | #2 Workout Decomposition | Developer experience only. Not blocking anything. Do when touching workout session code next. | 4-6 hours | Careful refactor, needs full QA pass |

**Critical path:** Issues #1 and #5 should be done before any user testing or demo — #5 is arguably MORE important because it breaks the core tier progression loop (prestige leaves stale loadout). Issues #3 and #4 can be done in any order as quick wins. Issue #2 can wait.

---

<a name="appendix-a"></a>
## Appendix A: Lovable Sound Synthesis Reference

Full frequency and timing specs from `lovable/getclocked-main/src/hooks/useSoundEffects.ts` (292 lines).

### XP Tick
```
Type:       sine oscillator
Freq start: 880 Hz
Freq end:   1320 Hz (exponential ramp, 50ms)
Gain:       0 → 0.08 (linear, 10ms) → 0.001 (exponential, 150ms)
Duration:   150ms
Debounce:   100ms
```

### Warning Beep
```
Type:       square oscillator × 2 beeps
Freq:       1000 Hz (constant)
Beep 1:     0-100ms, gain 0→0.1 (10ms) → hold → 0.001 (20ms)
Beep 2:     150-250ms, same envelope
Duration:   ~260ms total
```

### Level Up Fanfare
```
Layer 1 — Sub-bass hit:
  Type: sine, 80→40 Hz (exponential, 300ms), gain 0.4→0.001 (400ms)

Layer 2 — Ascending arpeggio:
  Notes: C5(523.25), E5(659.25), G5(783.99), C6(1046.50)
  Note length: 180ms + 60ms gap
  Per note: sawtooth (gain 0.2) + sine (gain 0.35)
  Attack: 20ms linear, Decay: 150ms past note end

Layer 3 — Sustained chord:
  All 4 notes as sine, gain 0.25, 1.0s decay
  Starts after arpeggio completes

Total: ~2.0s
```

### Prestige Celebration
```
Layer 1 — Deep drum:
  Type: sine, 120→30 Hz (exponential, 500ms), gain 0.5→0.001 (600ms)

Layer 2 — Rising fanfare:
  Notes: C4(261.63), E4(329.63), G4(392.00), C5(523.25),
         E5(659.25), G5(783.99), C6(1046.50)
  Note length: 140ms each
  Per note: sawtooth (gain 0.15) + sine (gain 0.25)
  Starts at 150ms offset

Layer 3 — Grand chord:
  Freqs: C4, E4, G4, C5, G5, C6
  Type: sine, gain 0.2, 1.5s decay
  Starts after fanfare + 100ms gap

Layer 4 — Shimmer:
  6 sine pings, random 2000-4000 Hz
  Spacing: 120ms apart
  Each: gain 0→0.06 (10ms) → 0.001 (150ms)
  Starts 100ms into chord

Total: ~3.0s
```

---

<a name="appendix-b"></a>
## Appendix B: workout/[id].tsx Section Map

Detailed line-by-line map for decomposition reference.

```
  1-31    Imports (React, RN, Expo, stores, libs, components)
 32-42    Arc SVG constants (ARC_SIZE=260, ARC_R, ARC_C, ARC_FRAC=0.75, etc.)
 43-118   More imports (helpers, types, sounds)
120-125   formatTimeCompact(seconds) — mm:ss formatter
126-148   getDisplayMove(move) — maps '1'→'JAB', 'slip'→'SLIP', etc.
150-156   getMoveColor(type) — punch=volt, defense=cyan, movement=orange

158       export default function WorkoutSessionScreen() {
159-185     Route params, store hooks (user, workout, badges, history)
186-220     Flat segment computation (useMemo) — flattens phases×repeats×segments
221-380     State declarations: 22 useState calls
381-420     Computed values: isChampionship, isCooldown, accentColor, etc.
421-431     Animated arc styles (useAnimatedStyle)
432-530     Timer countdown useEffect (the main tick loop)
531-533     XP tracking interval useEffect
534-610     Session result computation useEffect (on isComplete)
611-665     Audio/speech useEffects (TTS announcements, combo callouts)
666-712     Segment transition logic useEffect
713-730     Warning beep effects (3-second countdown, 10-second warning)
731-810     Segment completion + auto-advance useEffect
811-900     useCallback handlers (handleLog, skipSegment, togglePause, quit)
901-919     Keep-screen-awake useEffect
920-928     Early return: workout not found
929-969     Early return: isComplete → <PostWorkoutSummary>
970-1088    Render: Get Ready countdown screen
1088-1195   Render: Arc timer SVG + center content
1195-1210   Render: <RoundFeedbackPanel>
1210-1250   Render: Segment info bar + phase label
1250-1290   Render: Control buttons (pause, skip, quit)

1291-1663   StyleSheet.create (372 lines of styles)
```
