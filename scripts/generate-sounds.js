// Sound asset generator for Get Clocked
// Renders Lovable's Web Audio API oscillator specs to .wav files
// Run with: node scripts/generate-sounds.js
// Requires: wav-encoder (npm install wav-encoder)

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
  const safeStart = Math.abs(startVal) < 1e-10 ? 1e-10 * Math.sign(startVal || 1) : startVal;
  const safeEnd = Math.abs(endVal) < 1e-10 ? 1e-10 * Math.sign(endVal || 1) : endVal;
  return safeStart * Math.pow(Math.abs(safeEnd / safeStart), ratio) * Math.sign(safeStart);
}

function linearRamp(startVal, endVal, startTime, endTime, t) {
  if (t < startTime) return startVal;
  if (t >= endTime) return endVal;
  const ratio = (t - startTime) / (endTime - startTime);
  return startVal + (endVal - startVal) * ratio;
}

// XP Tick: 880→1320Hz sine, 150ms, rising ping like coin collect
function generateXPTick() {
  return generateSamples(0.15, (t) => {
    const freq = expRamp(880, 1320, 0, 0.05, t);
    let gain = 0;
    if (t < 0.01) gain = linearRamp(0, 0.08, 0, 0.01, t);
    else gain = expRamp(0.08, 0.001, 0.01, 0.15, t);
    return sine(freq, t) * gain;
  });
}

// Warning Beep: two 1000Hz square beeps, 150ms apart
function generateWarningBeep() {
  return generateSamples(0.3, (t) => {
    let gain = 0;
    if (t < 0.01) gain = linearRamp(0, 0.1, 0, 0.01, t);
    else if (t < 0.08) gain = 0.1;
    else if (t < 0.1) gain = expRamp(0.1, 0.001, 0.08, 0.1, t);
    else if (t >= 0.15 && t < 0.16) gain = linearRamp(0, 0.1, 0.15, 0.16, t);
    else if (t >= 0.16 && t < 0.23) gain = 0.1;
    else if (t >= 0.23 && t < 0.25) gain = expRamp(0.1, 0.001, 0.23, 0.25, t);
    return square(1000, t) * gain;
  });
}

// Level Up: sub-bass + arpeggio + sustained chord, ~2.5s
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

// Prestige: drum + fanfare + chord + shimmer, ~3.5s
function generatePrestige() {
  const duration = 3.5;
  const fanfareNotes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
  const noteLen = 0.14;
  const chordFreqs = [261.63, 329.63, 392.00, 523.25, 783.99, 1046.50];
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
        let sawGain = 0;
        if (t < start + 0.02) sawGain = linearRamp(0, 0.15, start, start + 0.02, t);
        else if (t < start + noteLen * 0.6) sawGain = 0.15;
        else sawGain = expRamp(0.15, 0.001, start + noteLen * 0.6, end, t);
        sample += sawtooth(freq, t) * sawGain;
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
  console.log('Generating sound assets...');
  await writeWav('xp-tick.wav', generateXPTick());
  await writeWav('warning-beep.wav', generateWarningBeep());
  await writeWav('level-up.wav', generateLevelUp());
  await writeWav('prestige.wav', generatePrestige());
  console.log('All sounds generated successfully.');
})();
