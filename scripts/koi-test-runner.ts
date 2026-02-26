/**
 * KOI AI Agents — Comprehensive Test Runner
 * Tests both the AI Builder (API calls) and Coach Engine (local)
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.chdir(path.resolve(__dirname, '..'));

// Override @ alias resolution
const Module = await import('module');
const require = Module.createRequire(import.meta.url);

// ─── Types ───────────────────────────────────────────────────────────────────

interface CheckResult {
  id: string;
  passed: boolean;
  expected?: string;
  actual?: string;
}

interface TestResult {
  testId: string;
  prompt: string;
  context: string;
  checks: CheckResult[];
  rawResponse?: any;
  error?: string;
}

const RESULTS: TestResult[] = [];
let totalPassed = 0;
let totalFailed = 0;

// ─── Equipment shortcuts ─────────────────────────────────────────────────────

const FULL_GYM = { gloves: true, wraps: true, heavyBag: true, doubleEndBag: true, speedBag: true, jumpRope: true, treadmill: true };
const BAG_ONLY = { gloves: true, wraps: true, heavyBag: true, doubleEndBag: false, speedBag: false, jumpRope: false, treadmill: false };
const NO_EQUIP = { gloves: false, wraps: false, heavyBag: false, doubleEndBag: false, speedBag: false, jumpRope: false, treadmill: false };
const SB_ONLY  = { gloves: false, wraps: false, heavyBag: false, doubleEndBag: false, speedBag: true, jumpRope: false, treadmill: false };
const DB_ONLY  = { gloves: true, wraps: true, heavyBag: false, doubleEndBag: true, speedBag: false, jumpRope: false, treadmill: false };
const SHADOW_ONLY = { gloves: true, wraps: true, heavyBag: false, doubleEndBag: false, speedBag: false, jumpRope: false, treadmill: false };

type Tier = 'R' | 'B' | 'I' | 'A' | 'P';
const TIER_MAP: Record<Tier, string> = { R: 'beginner', B: 'beginner', I: 'intermediate', A: 'advanced', P: 'advanced' };

// ─── API helper ──────────────────────────────────────────────────────────────

async function callAPI(prompt: string, tier: Tier, equipment: Record<string, boolean>, historyInsights?: any): Promise<any> {
  const userTier = TIER_MAP[tier];
  try {
    const res = await fetch('http://localhost:5000/api/generate-workout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, userTier, equipment, experienceLevel: userTier, historyInsights }),
    });
    return await res.json();
  } catch (e: any) {
    return { error: e.message, fallback: true };
  }
}

// ─── Check helpers ───────────────────────────────────────────────────────────

function check(checks: CheckResult[], id: string, passed: boolean, expected?: string, actual?: string) {
  checks.push({ id, passed, expected, actual: actual !== undefined ? String(actual) : undefined });
  if (passed) totalPassed++; else totalFailed++;
}

function getPhases(r: any): any[] { return r?.phases || []; }
function getGrindPhases(r: any) { return getPhases(r).filter((p: any) => p.section === 'grind'); }
function getWarmupPhases(r: any) { return getPhases(r).filter((p: any) => p.section === 'warmup'); }
function getCooldownPhases(r: any) { return getPhases(r).filter((p: any) => p.section === 'cooldown'); }
function getSegments(phase: any): any[] { return phase?.segments || []; }
function activeSegs(phase: any) { return getSegments(phase).filter((s: any) => s.type === 'active'); }
function restSegs(phase: any) { return getSegments(phase).filter((s: any) => s.type === 'rest'); }

const VALID_TOKENS = new Set(['1','2','3','4','5','6','7','8','SLIP L','SLIP R','ROLL L','ROLL R','DUCK','PULL','BLOCK','PARRY','STEP IN','STEP OUT','CIRCLE L','CIRCLE R','PIVOT','FREESTYLE']);

function allValidTokens(combos: string[][]): boolean {
  return combos.every(combo => {
    if (!Array.isArray(combo)) return false;
    const isBoxing = combo.length > 0 && (VALID_TOKENS.has(combo[0]) || /^[1-8]$/.test(combo[0]));
    if (!isBoxing) return true;
    return combo.every(t => VALID_TOKENS.has(t));
  });
}

function noHyphenJoined(combos: string[][]): boolean {
  return combos.every(combo => combo.every(t => typeof t === 'string' && !t.includes('-') || combo.length > 1));
}

function comboMaxPunch(combo: string[]): number {
  return Math.max(0, ...combo.map(t => /^[1-8]$/.test(t) ? parseInt(t) : 0));
}

function hasDefenseToken(combo: string[]): boolean {
  return combo.some(t => ['SLIP L','SLIP R','ROLL L','ROLL R','DUCK','PULL','BLOCK','PARRY'].includes(t));
}

function hasMovementToken(combo: string[]): boolean {
  return combo.some(t => ['STEP IN','STEP OUT','CIRCLE L','CIRCLE R','PIVOT'].includes(t));
}

// ─── Run a test ───────────────────────────────────────────────────────────────

async function runTest(testId: string, prompt: string, context: string, tier: Tier, equipment: Record<string, boolean>, checkFn: (r: any, checks: CheckResult[]) => void): Promise<TestResult> {
  const checks: CheckResult[] = [];
  let rawResponse: any;
  let error: string | undefined;

  try {
    rawResponse = await callAPI(prompt, tier, equipment);
    if (rawResponse.fallback || rawResponse.error) {
      error = rawResponse.error || 'fallback triggered';
    }
    checkFn(rawResponse, checks);
  } catch (e: any) {
    error = e.message;
    checks.push({ id: 'CRASH', passed: false, expected: 'no crash', actual: error });
    totalFailed++;
  }

  const result: TestResult = { testId, prompt: prompt.slice(0, 80), context, checks, rawResponse, error };
  RESULTS.push(result);
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// PART 1: AI BUILDER TESTS
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n═══ PART 1: AI BUILDER TESTS ═══\n');

// CATEGORY A: Phases vs Rounds

await runTest('A1.1', '5 rounds heavy bag, 3 min, 1 min rest', 'Tier=I, BAG_ONLY', 'I', BAG_ONLY, (r, c) => {
  const phases = getPhases(r);
  const grind = phases.filter((p: any) => p.section === 'grind');
  const phase = grind[0];
  const segs = getSegments(phase);
  const active = activeSegs(phase)[0];
  const rest = restSegs(phase)[0];
  check(c, 'A1', !r.fallback && !r.error && Array.isArray(r.phases), 'valid JSON', r.error || 'ok');
  check(c, 'A2', !r.fallback, 'no fallback', String(r.fallback));
  check(c, 'A3', phases.length === 1, '1 phase', String(phases.length));
  check(c, 'A4', phase?.section === 'grind', 'grind', phase?.section);
  check(c, 'A5', phase?.repeats === 5, '5', String(phase?.repeats));
  check(c, 'A6', segs.length === 2, '2 segments', String(segs.length));
  check(c, 'A7', active?.segmentType === 'combo', 'combo', active?.segmentType);
  check(c, 'A8', active?.duration === 180, '180', String(active?.duration));
  check(c, 'A9', rest?.segmentType === 'rest', 'rest', rest?.segmentType);
  check(c, 'A10', rest?.duration === 60, '60', String(rest?.duration));
  check(c, 'A11', Array.isArray(phase?.combos) && phase.combos.length === 5, '5 combos', String(phase?.combos?.length));
  check(c, 'A12', r.difficulty === 'intermediate', 'intermediate', r.difficulty);
  check(c, 'A13', r.megasetRepeats === 1, '1', String(r.megasetRepeats));
  check(c, 'A14', r.hasWarmup === false, 'false', String(r.hasWarmup));
  check(c, 'A15', r.hasCooldown === false, 'false', String(r.hasCooldown));
});

await runTest('A1.2', '8 rounds heavy bag, 2 min, 45 sec rest', 'Tier=A, BAG_ONLY', 'A', BAG_ONLY, (r, c) => {
  const phases = getPhases(r);
  const phase = phases[0];
  const active = activeSegs(phase)[0];
  const rest = restSegs(phase)[0];
  check(c, 'A16', phases.length === 1, '1 phase', String(phases.length));
  check(c, 'A17', phase?.repeats === 8, '8', String(phase?.repeats));
  check(c, 'A18', active?.duration === 120, '120', String(active?.duration));
  check(c, 'A19', rest?.duration === 45, '45', String(rest?.duration));
  check(c, 'A20', phase?.combos?.length === 8, '8', String(phase?.combos?.length));
});

await runTest('A1.3', '3 rounds shadowboxing 2 min 30 sec rest. Then 4 rounds heavy bag 3 min 1 min rest.', 'Tier=I, BAG_ONLY', 'I', BAG_ONLY, (r, c) => {
  const phases = getPhases(r);
  const p1 = phases[0]; const p2 = phases[1];
  check(c, 'A21', phases.length === 2, '2', String(phases.length));
  check(c, 'A22', phases.every((p: any) => p.section === 'grind'), 'all grind', phases.map((p: any) => p.section).join(','));
  check(c, 'A23', p1?.repeats === 3, '3', String(p1?.repeats));
  check(c, 'A24', activeSegs(p1)[0]?.segmentType === 'shadowboxing', 'shadowboxing', activeSegs(p1)[0]?.segmentType);
  check(c, 'A25', activeSegs(p1)[0]?.duration === 120, '120', String(activeSegs(p1)[0]?.duration));
  check(c, 'A26', restSegs(p1)[0]?.duration === 30, '30', String(restSegs(p1)[0]?.duration));
  check(c, 'A27', p2?.repeats === 4, '4', String(p2?.repeats));
  check(c, 'A28', activeSegs(p2)[0]?.segmentType === 'combo', 'combo', activeSegs(p2)[0]?.segmentType);
  check(c, 'A29', activeSegs(p2)[0]?.duration === 180, '180', String(activeSegs(p2)[0]?.duration));
  check(c, 'A30', restSegs(p2)[0]?.duration === 60, '60', String(restSegs(p2)[0]?.duration));
});

await runTest('A1.4', '1 round heavy bag, 3 min, no rest', 'Tier=B, BAG_ONLY', 'B', BAG_ONLY, (r, c) => {
  const phases = getPhases(r); const phase = phases[0];
  check(c, 'A31', phases.length === 1, '1', String(phases.length));
  check(c, 'A32', phase?.repeats === 1, '1', String(phase?.repeats));
  check(c, 'A33', phase?.combos?.length === 1, '1', String(phase?.combos?.length));
  const restSeg = restSegs(phase)[0];
  check(c, 'A34', !restSeg || restSeg.duration === 0, 'no rest or 0', String(restSeg?.duration));
});

await runTest('A1.5', '12 rounds heavy bag, 3 min, 1 min rest', 'Tier=A, BAG_ONLY', 'A', BAG_ONLY, (r, c) => {
  const phases = getPhases(r); const phase = phases[0];
  const combos: string[][] = phase?.combos || [];
  const uniqueCombos = new Set(combos.map(c => JSON.stringify(c)));
  check(c, 'A35', phases.length === 1, '1 phase', String(phases.length));
  check(c, 'A36', phase?.repeats === 12, '12', String(phase?.repeats));
  check(c, 'A37', combos.length === 12, '12', String(combos.length));
  check(c, 'A38', activeSegs(phase)[0]?.duration === 180, '180', String(activeSegs(phase)[0]?.duration));
  check(c, 'A39', restSegs(phase)[0]?.duration === 60, '60', String(restSegs(phase)[0]?.duration));
  check(c, 'A40', uniqueCombos.size === combos.length, 'all unique', `${uniqueCombos.size}/${combos.length}`);
});

// CATEGORY B: Combo Format

await runTest('B1.1', '3 rounds heavy bag, 2 min, 30 sec rest. Round 1: 1-2-3. Round 2: 1-2-SLIP L-3. Round 3: 1-1-2-3-2.', 'Tier=I, BAG_ONLY', 'I', BAG_ONLY, (r, c) => {
  const phase = getPhases(r)[0];
  const combos: string[][] = phase?.combos || [];
  check(c, 'B1', JSON.stringify(combos[0]) === '["1","2","3"]', '["1","2","3"]', JSON.stringify(combos[0]));
  check(c, 'B2', JSON.stringify(combos[1]) === '["1","2","SLIP L","3"]', '["1","2","SLIP L","3"]', JSON.stringify(combos[1]));
  check(c, 'B3', JSON.stringify(combos[2]) === '["1","1","2","3","2"]', '["1","1","2","3","2"]', JSON.stringify(combos[2]));
  check(c, 'B4', combos.every(combo => combo.every(t => !t.includes('-') || t === 'SLIP L' || t === 'SLIP R' || t === 'ROLL L' || t === 'ROLL R')), 'no hyphen-joined', 'check');
  check(c, 'B5', combos.every(combo => combo.every(t => !t.includes(' ') || VALID_TOKENS.has(t))), 'no space-joined', 'check');
});

await runTest('B1.2', '3 rounds shadowboxing, 2 min, 30 sec rest. Round 1: jab cross hook. Round 2: double jab cross uppercut. Round 3: jab cross body hook.', 'Tier=I, NO_EQUIP', 'I', NO_EQUIP, (r, c) => {
  const phase = getPhases(r)[0];
  const combos: string[][] = phase?.combos || [];
  check(c, 'B6', JSON.stringify(combos[0]) === '["1","2","3"]', '["1","2","3"]', JSON.stringify(combos[0]));
  check(c, 'B7', JSON.stringify(combos[1]) === '["1","1","2","5"]', '["1","1","2","5"]', JSON.stringify(combos[1]));
  check(c, 'B8', JSON.stringify(combos[2]) === '["1","2","7"]', '["1","2","7"]', JSON.stringify(combos[2]));
  check(c, 'B9', allValidTokens(combos), 'all valid tokens', 'check');
  check(c, 'B10', combos.every(combo => combo.every(t => /^[1-8]$/.test(t) || VALID_TOKENS.has(t))), 'no word tokens', 'check');
});

await runTest('B1.3', '3 rounds speed bag, 2 min, 30 sec rest. Round 1: doubles. Round 2: triples. Round 3: fist rolls.', 'Tier=I, SB_ONLY', 'I', SB_ONLY, (r, c) => {
  const phase = getPhases(r)[0];
  const combos: string[][] = phase?.combos || [];
  check(c, 'B11', combos[0]?.[0]?.toLowerCase().includes('double'), 'Doubles', JSON.stringify(combos[0]));
  check(c, 'B12', combos[1]?.[0]?.toLowerCase().includes('triple'), 'Triples', JSON.stringify(combos[1]));
  check(c, 'B13', combos[2]?.[0]?.toLowerCase().includes('fist roll'), 'Fist Rolls', JSON.stringify(combos[2]));
  check(c, 'B14', getSegments(phase).some((s: any) => s.segmentType === 'speedbag'), 'speedbag', phase?.segments?.map((s: any) => s.segmentType).join(','));
  check(c, 'B15', combos.every(combo => !combo.every(t => /^[1-8]$/.test(t))), 'not punch numbers', 'check');
});

await runTest('B1.7', '5 rounds heavy bag all freestyle', 'Tier=I, BAG_ONLY', 'I', BAG_ONLY, (r, c) => {
  const phase = getPhases(r)[0];
  const combos: string[][] = phase?.combos || [];
  check(c, 'B35', combos.length === 5, '5', String(combos.length));
  check(c, 'B36', combos.every(combo => JSON.stringify(combo) === '["FREESTYLE"]'), 'all FREESTYLE', combos.map(c => JSON.stringify(c)).join(','));
  check(c, 'B37', combos.every(combo => !combo.some(t => /^[1-8]$/.test(t))), 'no punch numbers', 'check');
  check(c, 'B38', phase?.comboOrder === 'sequential', 'sequential', phase?.comboOrder);
});

await runTest('B1.8', '3 rounds heavy bag, 3 min, 1 min rest. Round 1: 1-2-3. Round 2: freestyle. Round 3: 1-2-3-6-3-2.', 'Tier=A, BAG_ONLY', 'A', BAG_ONLY, (r, c) => {
  const phase = getPhases(r)[0];
  const combos: string[][] = phase?.combos || [];
  check(c, 'B39', JSON.stringify(combos[0]) === '["1","2","3"]', '["1","2","3"]', JSON.stringify(combos[0]));
  check(c, 'B40', JSON.stringify(combos[1]) === '["FREESTYLE"]', '["FREESTYLE"]', JSON.stringify(combos[1]));
});

// CATEGORY C: Combos on Phases

await runTest('C1.1', '6 rounds heavy bag, 3 min, 1 min rest', 'Tier=I, BAG_ONLY', 'I', BAG_ONLY, (r, c) => {
  const phase = getPhases(r)[0];
  check(c, 'C1', phase?.combos?.length === 6, '6', String(phase?.combos?.length));
  check(c, 'C2', phase?.repeats === 6, '6', String(phase?.repeats));
  check(c, 'C3', phase?.combos?.length === phase?.repeats, 'equal', `${phase?.combos?.length} vs ${phase?.repeats}`);
  check(c, 'C4', phase?.comboOrder === 'sequential', 'sequential', phase?.comboOrder);
});

await runTest('C1.2', '4 rounds shadowboxing, 2 min, 30 sec rest', 'Tier=B, NO_EQUIP', 'B', NO_EQUIP, (r, c) => {
  const phase = getPhases(r)[0];
  const combos: string[][] = phase?.combos || [];
  check(c, 'C5', activeSegs(phase)[0]?.segmentType === 'shadowboxing', 'shadowboxing', activeSegs(phase)[0]?.segmentType);
  check(c, 'C6', combos.length === 4, '4', String(combos.length));
  check(c, 'C7', combos.every(combo => combo.every(t => !(/^[1-8]$/.test(t)) || parseInt(t) <= 4)), 'only 1-4', combos.map(c => JSON.stringify(c)).join(','));
  check(c, 'C8', combos.every(combo => combo.length >= 2 && combo.length <= 4), '2-4 length', combos.map(c => c.length).join(','));
});

await runTest('C1.3', '4 rounds heavy bag, 3 min, 1 min rest, no specific combos', 'Tier=I, BAG_ONLY', 'I', BAG_ONLY, (r, c) => {
  const phase = getPhases(r)[0];
  const combos: string[][] = phase?.combos || [];
  check(c, 'C9', combos.length === 4, '4', String(combos.length));
  check(c, 'C10', combos.every(combo => JSON.stringify(combo) === '["FREESTYLE"]'), 'all FREESTYLE', combos.map(c => JSON.stringify(c)).join(','));
});

await runTest('C1.4', '5 rounds heavy bag, 2 min, 30 sec rest', 'Tier=A, BAG_ONLY', 'A', BAG_ONLY, (r, c) => {
  const phase = getPhases(r)[0];
  const combos: string[][] = phase?.combos || [];
  const uniqueCombos = new Set(combos.map(c => JSON.stringify(c)));
  check(c, 'C11', combos.length === 5, '5', String(combos.length));
  check(c, 'C12', allValidTokens(combos), 'valid tokens', 'check');
  check(c, 'C13', uniqueCombos.size === combos.length, 'all unique', `${uniqueCombos.size}/${combos.length}`);
  check(c, 'C14', combos.some(combo => combo.some(t => /^[5-8]$/.test(t))), 'has punch >4', combos.map(c => JSON.stringify(c)).join(','));
  check(c, 'C15', combos.some(combo => combo.length >= 5), 'has 5+ tokens', combos.map(c => c.length).join(','));
  check(c, 'C16', combos[0]?.length <= combos[combos.length-1]?.length, 'progressive', `${combos[0]?.length}→${combos[combos.length-1]?.length}`);
});

// CATEGORY D: Warmup & Cooldown

await runTest('D1.1', '5 rounds heavy bag, 3 min, 1 min rest', 'Tier=I, BAG_ONLY', 'I', BAG_ONLY, (r, c) => {
  check(c, 'D1', r.hasWarmup === false, 'false', String(r.hasWarmup));
  check(c, 'D2', r.hasCooldown === false, 'false', String(r.hasCooldown));
  check(c, 'D3', getWarmupPhases(r).length === 0, '0 warmup phases', String(getWarmupPhases(r).length));
  check(c, 'D4', getCooldownPhases(r).length === 0, '0 cooldown phases', String(getCooldownPhases(r).length));
  check(c, 'D5', getPhases(r).every((p: any) => p.section === 'grind'), 'all grind', getPhases(r).map((p: any) => p.section).join(','));
});

await runTest('D1.2', 'Full boxing session, 30 minutes', 'Tier=I, FULL_GYM', 'I', FULL_GYM, (r, c) => {
  check(c, 'D6', r.hasWarmup === true, 'true', String(r.hasWarmup));
  check(c, 'D7', r.hasCooldown === true, 'true', String(r.hasCooldown));
  check(c, 'D8', getWarmupPhases(r).length > 0, '>0 warmup', String(getWarmupPhases(r).length));
  check(c, 'D9', getGrindPhases(r).length > 0, '>0 grind', String(getGrindPhases(r).length));
  check(c, 'D10', getCooldownPhases(r).length > 0, '>0 cooldown', String(getCooldownPhases(r).length));
});

await runTest('D1.4', 'Start with jump rope, then 4 rounds heavy bag 3 min 1 min rest, end with stretching', 'Tier=I, FULL_GYM', 'I', FULL_GYM, (r, c) => {
  const warmup = getWarmupPhases(r);
  const grind = getGrindPhases(r);
  const cooldown = getCooldownPhases(r);
  const warmupSegs = warmup.flatMap((p: any) => getSegments(p));
  const cooldownSegs = cooldown.flatMap((p: any) => getSegments(p));
  const hasJumpRope = warmupSegs.some((s: any) => (s.name || '').toLowerCase().includes('jump rope') || (s.name || '').toLowerCase().includes('jumprope'));
  const lastWarmupSeg = warmupSegs[warmupSegs.length - 1];
  const hasGetReady = lastWarmupSeg?.name?.toLowerCase().includes('get ready') && lastWarmupSeg?.duration === 30;
  check(c, 'D14', warmup.length > 0 && hasJumpRope, 'warmup with jump rope', `warmup phases: ${warmup.length}, hasJumpRope: ${hasJumpRope}`);
  check(c, 'D15', grind.length > 0, 'grind exists', String(grind.length));
  check(c, 'D16', cooldown.length > 0, 'cooldown exists', String(cooldown.length));
  check(c, 'D17', hasGetReady, '"Get Ready" 30s at end of warmup', `lastWarmupSeg: ${JSON.stringify(lastWarmupSeg)}`);
});

await runTest('D1.7', 'Full boxing session, 25 minutes', 'Tier=B, NO_EQUIP', 'B', NO_EQUIP, (r, c) => {
  const warmupSegs = getWarmupPhases(r).flatMap((p: any) => getSegments(p));
  const hasJumpRope = warmupSegs.some((s: any) => (s.name || '').toLowerCase().includes('jump rope'));
  const hasAlt = warmupSegs.some((s: any) => /(high knee|jumping jack)/i.test(s.name || ''));
  const grindSegs = getGrindPhases(r).flatMap((p: any) => activeSegs(p));
  check(c, 'D26', getWarmupPhases(r).length > 0, 'warmup exists', String(getWarmupPhases(r).length));
  check(c, 'D27', !hasJumpRope, 'no jump rope', String(hasJumpRope));
  check(c, 'D28', hasAlt, 'high knees or jumping jacks', warmupSegs.map((s: any) => s.name).join(','));
  check(c, 'D29', grindSegs.every((s: any) => s.segmentType === 'shadowboxing'), 'all shadowboxing', grindSegs.map((s: any) => s.segmentType).join(','));
});

await runTest('D1.8', '2 rounds warm up jump rope 2 min. 4 rounds heavy bag 3 min 1 min rest. 1 round cooldown stretching 3 min.', 'Tier=I, FULL_GYM', 'I', FULL_GYM, (r, c) => {
  const warmupPhases = getWarmupPhases(r);
  const cooldownPhases = getCooldownPhases(r);
  const warmupSegs = warmupPhases.flatMap((p: any) => getSegments(p));
  const cooldownSegs = cooldownPhases.flatMap((p: any) => getSegments(p));
  const lastWarmupSeg = warmupSegs[warmupSegs.length - 1];
  const firstCooldownSeg = cooldownSegs[0];
  check(c, 'D30', lastWarmupSeg?.name?.toLowerCase().includes('get ready') && lastWarmupSeg?.duration === 30, '"Get Ready" 30s last in warmup', JSON.stringify(lastWarmupSeg));
  check(c, 'D31', firstCooldownSeg?.name?.toLowerCase().includes('recovery') && firstCooldownSeg?.duration === 30, '"Recovery" 30s first in cooldown', JSON.stringify(firstCooldownSeg));
  check(c, 'D32', warmupSegs.length >= 2, '>=2 warmup segs', String(warmupSegs.length));
  check(c, 'D33', cooldownSegs.length >= 2, '>=2 cooldown segs', String(cooldownSegs.length));
});

// CATEGORY E: Duration Format

await runTest('E1.1', '3 rounds heavy bag, 3 minutes each, 1 minute rest', 'Tier=I, BAG_ONLY', 'I', BAG_ONLY, (r, c) => {
  const phase = getPhases(r)[0];
  check(c, 'E1', activeSegs(phase)[0]?.duration === 180, '180', String(activeSegs(phase)[0]?.duration));
  check(c, 'E2', restSegs(phase)[0]?.duration === 60, '60', String(restSegs(phase)[0]?.duration));
});

await runTest('E1.2', '4 rounds shadowboxing, 1 min 30 sec each, 45 sec rest', 'Tier=I, NO_EQUIP', 'I', NO_EQUIP, (r, c) => {
  const phase = getPhases(r)[0];
  check(c, 'E3', activeSegs(phase)[0]?.duration === 90, '90', String(activeSegs(phase)[0]?.duration));
  check(c, 'E4', restSegs(phase)[0]?.duration === 45, '45', String(restSegs(phase)[0]?.duration));
});

await runTest('E1.3', '3 rounds heavy bag, 90 seconds each, 30 seconds rest', 'Tier=I, BAG_ONLY', 'I', BAG_ONLY, (r, c) => {
  const phase = getPhases(r)[0];
  check(c, 'E5', activeSegs(phase)[0]?.duration === 90, '90 (not 5400)', String(activeSegs(phase)[0]?.duration));
  check(c, 'E6', restSegs(phase)[0]?.duration === 30, '30', String(restSegs(phase)[0]?.duration));
});

await runTest('E1.4', '5 rnds hvy bag 2min 30s rest', 'Tier=I, BAG_ONLY', 'I', BAG_ONLY, (r, c) => {
  const phase = getPhases(r)[0];
  check(c, 'E7', activeSegs(phase)[0]?.duration === 120, '120', String(activeSegs(phase)[0]?.duration));
  check(c, 'E8', restSegs(phase)[0]?.duration === 30, '30', String(restSegs(phase)[0]?.duration));
  check(c, 'E9', phase?.repeats === 5, '5', String(phase?.repeats));
});

await runTest('E1.9', '3 rounds heavy bag, 2:30 each, 0:45 rest', 'Tier=I, BAG_ONLY', 'I', BAG_ONLY, (r, c) => {
  const phase = getPhases(r)[0];
  check(c, 'E18', activeSegs(phase)[0]?.duration === 150, '150', String(activeSegs(phase)[0]?.duration));
  check(c, 'E19', restSegs(phase)[0]?.duration === 45, '45', String(restSegs(phase)[0]?.duration));
});

// CATEGORY F: Supersets

await runTest('F1.1', '3 rounds superset: heavy bag 2 min and burpees 1 min. 45 sec rest.', 'Tier=I, BAG_ONLY', 'I', BAG_ONLY, (r, c) => {
  const grind = getGrindPhases(r);
  const phase = grind[0];
  const segs = getSegments(phase);
  const actives = activeSegs(phase);
  const rests = restSegs(phase);
  check(c, 'F1', grind.length === 1, '1 grind phase', String(grind.length));
  check(c, 'F2', segs.length === 3, '3 segments', String(segs.length));
  check(c, 'F3', actives[0]?.segmentType === 'combo' && actives[0]?.duration === 120, 'combo 120s', `${actives[0]?.segmentType} ${actives[0]?.duration}`);
  check(c, 'F4', actives[1]?.segmentType === 'exercise' && (actives[1]?.name || '').toLowerCase().includes('burpee') && actives[1]?.duration === 60, 'exercise burpees 60s', `${actives[1]?.segmentType} ${actives[1]?.name} ${actives[1]?.duration}`);
  check(c, 'F5', rests[0]?.duration === 45, 'rest 45s', String(rests[0]?.duration));
  check(c, 'F6', phase?.repeats === 3, '3', String(phase?.repeats));
  check(c, 'F7', Array.isArray(phase?.combos) && phase.combos.length > 0, 'has combos', String(phase?.combos?.length));
});

await runTest('F1.2', '3 rounds superset: heavy bag 2 min and burpees 1 min. 45 sec rest. Round 1: 1-2. Round 2: 1-2-3. Round 3: 1-1-2-3-2.', 'Tier=I, BAG_ONLY', 'I', BAG_ONLY, (r, c) => {
  const phase = getGrindPhases(r)[0];
  const combos: string[][] = phase?.combos || [];
  check(c, 'F8', JSON.stringify(combos) === '[["1","2"],["1","2","3"],["1","1","2","3","2"]]', 'exact combos', JSON.stringify(combos));
  check(c, 'F9', !(phase?.name || '').includes('Round 1'), 'no "Round 1" in name', phase?.name);
});

await runTest('F1.4', '3 rounds: heavy bag 2 min, push-ups 30 sec, jumping jacks 30 sec. 1 min rest.', 'Tier=I, BAG_ONLY', 'I', BAG_ONLY, (r, c) => {
  const phase = getGrindPhases(r)[0];
  const segs = getSegments(phase);
  const actives = activeSegs(phase);
  const rests = restSegs(phase);
  check(c, 'F16', segs.length === 4, '4 segments', String(segs.length));
  check(c, 'F17', actives[0]?.segmentType === 'combo' && actives[0]?.duration === 120, 'combo 120s', `${actives[0]?.segmentType} ${actives[0]?.duration}`);
  check(c, 'F18', (actives[1]?.name || '').toLowerCase().includes('push') && actives[1]?.duration === 30, 'push-ups 30s', `${actives[1]?.name} ${actives[1]?.duration}`);
  check(c, 'F19', (actives[2]?.name || '').toLowerCase().includes('jump') && actives[2]?.duration === 30, 'jumping jacks 30s', `${actives[2]?.name} ${actives[2]?.duration}`);
  check(c, 'F20', rests[0]?.duration === 60, 'rest 60s', String(rests[0]?.duration));
});

// CATEGORY G: Equipment

await runTest('G1.1', '5 rounds heavy bag, 3 min, 1 min rest', 'Tier=I, NO_EQUIP', 'I', NO_EQUIP, (r, c) => {
  const phase = getGrindPhases(r)[0];
  const combos: string[][] = phase?.combos || [];
  check(c, 'G1', activeSegs(phase)[0]?.segmentType === 'shadowboxing', 'shadowboxing', activeSegs(phase)[0]?.segmentType);
  check(c, 'G2', combos.length > 0, 'has combos', String(combos.length));
  check(c, 'G3', combos.length === 5, '5', String(combos.length));
  check(c, 'G4', (activeSegs(phase)[0]?.name || '').toLowerCase().includes('shadow'), 'shadowboxing in name', activeSegs(phase)[0]?.name);
});

await runTest('G1.2', '5 rounds heavy bag, 3 min, 1 min rest', 'Tier=I, BAG_ONLY', 'I', BAG_ONLY, (r, c) => {
  const phase = getGrindPhases(r)[0];
  check(c, 'G5', activeSegs(phase)[0]?.segmentType === 'combo', 'combo', activeSegs(phase)[0]?.segmentType);
  check(c, 'G6', (activeSegs(phase)[0]?.name || '').toLowerCase().includes('heavy bag'), 'Heavy Bag', activeSegs(phase)[0]?.name);
});

await runTest('G1.3', '3 rounds speed bag, 2 min, 30 sec rest', 'Tier=I, BAG_ONLY', 'I', BAG_ONLY, (r, c) => {
  const phase = getGrindPhases(r)[0];
  check(c, 'G7', activeSegs(phase)[0]?.segmentType !== 'speedbag', 'not speedbag (no SB equip)', activeSegs(phase)[0]?.segmentType);
  check(c, 'G8', !r.fallback, 'no crash/fallback', String(r.fallback));
  check(c, 'G9', !r.error, 'no error', r.error);
});

await runTest('G1.4', '3 rounds double end bag, 2 min, 30 sec rest. Round 1: 1-2. Round 2: 1-2-3. Round 3: 1-2-5-2.', 'Tier=I, DB_ONLY', 'I', DB_ONLY, (r, c) => {
  const phase = getGrindPhases(r)[0];
  check(c, 'G10', activeSegs(phase)[0]?.segmentType === 'doubleend', 'doubleend', activeSegs(phase)[0]?.segmentType);
  check(c, 'G11', phase?.combos?.length === 3, '3', String(phase?.combos?.length));
  check(c, 'G12', (activeSegs(phase)[0]?.name || '').toLowerCase().includes('double'), 'Double End', activeSegs(phase)[0]?.name);
});

await runTest('G1.7', '5 rounds shadowboxing, 3 min, 1 min rest', 'Tier=I, FULL_GYM', 'I', FULL_GYM, (r, c) => {
  const phase = getGrindPhases(r)[0];
  check(c, 'G20', activeSegs(phase)[0]?.segmentType === 'shadowboxing', 'shadowboxing (user said so)', activeSegs(phase)[0]?.segmentType);
});

// CATEGORY H: Megaset Repeats

await runTest('H1.1', '5 rounds heavy bag, 3 min, 1 min rest', 'Tier=I, BAG_ONLY', 'I', BAG_ONLY, (r, c) => {
  check(c, 'H1', r.megasetRepeats === 1, '1', String(r.megasetRepeats));
});

await runTest('H1.2', '3 rounds heavy bag, 2 min, 30 sec rest. Repeat everything twice.', 'Tier=I, BAG_ONLY', 'I', BAG_ONLY, (r, c) => {
  check(c, 'H2', r.megasetRepeats === 2, '2', String(r.megasetRepeats));
  check(c, 'H3', getGrindPhases(r).length === 1, '1 grind phase', String(getGrindPhases(r).length));
});

await runTest('H1.5', '3 rounds heavy bag, 2 min, 30 sec rest. Repeat everything 3 times.', 'Tier=I, BAG_ONLY', 'I', BAG_ONLY, (r, c) => {
  check(c, 'H7', r.megasetRepeats === 3, '3', String(r.megasetRepeats));
});

await runTest('H1.6', '3 rounds heavy bag, 2 min, 30 sec rest. Repeat everything 10 times.', 'Tier=I, BAG_ONLY', 'I', BAG_ONLY, (r, c) => {
  check(c, 'H8', r.megasetRepeats === 10, '10', String(r.megasetRepeats));
  check(c, 'H9', !r.error, 'no error', r.error);
});

// CATEGORY I: Difficulty Override

await runTest('I1.1', '3 rounds heavy bag, beginner level', 'Tier=A, BAG_ONLY', 'A', BAG_ONLY, (r, c) => {
  const combos: string[][] = getGrindPhases(r)[0]?.combos || [];
  check(c, 'I1', r.difficulty === 'beginner', 'beginner', r.difficulty);
  check(c, 'I2', combos.every(combo => combo.every(t => !(/^[1-8]$/.test(t)) || parseInt(t) <= 4)), 'only 1-4', combos.map(c => JSON.stringify(c)).join(','));
  check(c, 'I3', combos.every(combo => combo.length <= 4), 'max 4 tokens', combos.map(c => c.length).join(','));
  check(c, 'I4', combos.every(combo => !hasDefenseToken(combo)), 'no defense', combos.map(c => JSON.stringify(c)).join(','));
});

await runTest('I1.2', '3 rounds heavy bag, advanced level, 3 min, 1 min rest', 'Tier=B, BAG_ONLY', 'B', BAG_ONLY, (r, c) => {
  const combos: string[][] = getGrindPhases(r)[0]?.combos || [];
  check(c, 'I5', r.difficulty === 'advanced', 'advanced', r.difficulty);
  check(c, 'I6', combos.some(combo => combo.some(t => /^[5-8]$/.test(t))), 'has 5-8', combos.map(c => JSON.stringify(c)).join(','));
  check(c, 'I7', combos.some(combo => hasDefenseToken(combo)), 'has defense', combos.map(c => JSON.stringify(c)).join(','));
});

await runTest('I1.3', '3 rounds heavy bag, 3 min, 1 min rest', 'Tier=I, BAG_ONLY', 'I', BAG_ONLY, (r, c) => {
  check(c, 'I8', r.difficulty === 'intermediate', 'intermediate', r.difficulty);
});

// CATEGORY J: Combo Quality

await runTest('J1.1', '6 rounds shadowboxing, 2 min, 30 sec rest', 'Tier=B, NO_EQUIP', 'B', NO_EQUIP, (r, c) => {
  const combos: string[][] = getGrindPhases(r)[0]?.combos || [];
  check(c, 'J1', combos[0]?.length <= (combos[combos.length-1]?.length || 0), 'progressive', `${combos[0]?.length}→${combos[combos.length-1]?.length}`);
  check(c, 'J2', combos[0]?.length === 2, '2 tokens in first', String(combos[0]?.length));
  check(c, 'J3', (combos[combos.length-1]?.length || 0) >= 3 && (combos[combos.length-1]?.length || 0) <= 4, '3-4 tokens last', String(combos[combos.length-1]?.length));
  check(c, 'J4', combos.every(combo => combo.every(t => !(/^[1-8]$/.test(t)) || parseInt(t) <= 4)), 'only 1-4', 'check');
  const uniqueCombos = new Set(combos.map(c => JSON.stringify(c)));
  check(c, 'J5', uniqueCombos.size >= 3, '>=3 unique', String(uniqueCombos.size));
});

await runTest('J1.2', '8 rounds heavy bag, 3 min, 1 min rest', 'Tier=I, BAG_ONLY', 'I', BAG_ONLY, (r, c) => {
  const combos: string[][] = getGrindPhases(r)[0]?.combos || [];
  const uniqueCombos = new Set(combos.map(c => JSON.stringify(c)));
  check(c, 'J6', combos[0]?.length < combos[7]?.length, 'first shorter than last', `${combos[0]?.length}→${combos[7]?.length}`);
  check(c, 'J7', combos.some(combo => hasDefenseToken(combo) && (['SLIP L','SLIP R','ROLL L','ROLL R'].some(d => combo.includes(d)))), 'has SLIP/ROLL', combos.map(c => JSON.stringify(c)).join(','));
  check(c, 'J8', combos.every(combo => combo.length >= 3 && combo.length <= 5), 'length 3-5', combos.map(c => c.length).join(','));
  check(c, 'J9', uniqueCombos.size >= 6, '>=6 unique', String(uniqueCombos.size));
  check(c, 'J10', combos.some(combo => combo.some(t => t === '5' || t === '6')), 'has punch 5 or 6', combos.map(c => JSON.stringify(c)).join(','));
});

await runTest('J1.7', '5 rounds shadowboxing, 2 min, 30 sec rest', 'Tier=B, NO_EQUIP', 'B', NO_EQUIP, (r, c) => {
  const combos: string[][] = getGrindPhases(r)[0]?.combos || [];
  check(c, 'J26', combos.every(combo => !combo.some(t => /^[5-8]$/.test(t))), 'no 5-8', combos.map(c => JSON.stringify(c)).join(','));
  check(c, 'J27', combos.every(combo => !hasDefenseToken(combo)), 'no defense', combos.map(c => JSON.stringify(c)).join(','));
  check(c, 'J28', combos.every(combo => !hasMovementToken(combo)), 'no movement', combos.map(c => JSON.stringify(c)).join(','));
  check(c, 'J29', combos.every(combo => combo.length >= 2 && combo.length <= 4), '2-4 length', combos.map(c => c.length).join(','));
  check(c, 'J30', combos.every(combo => combo.every(t => ['1','2','3','4'].includes(t) || t === 'FREESTYLE')), 'only 1-4', combos.map(c => JSON.stringify(c)).join(','));
});

await runTest('J1.8', '6 rounds heavy bag, 3 min, 1 min rest', 'Tier=I, BAG_ONLY', 'I', BAG_ONLY, (r, c) => {
  const combos: string[][] = getGrindPhases(r)[0]?.combos || [];
  check(c, 'J31', combos.some(combo => combo.includes('SLIP L') || combo.includes('SLIP R')), 'has SLIP', combos.map(c => JSON.stringify(c)).join(','));
  check(c, 'J32', combos.some(combo => combo.includes('ROLL L') || combo.includes('ROLL R')), 'has ROLL', combos.map(c => JSON.stringify(c)).join(','));
  check(c, 'J33', combos.every(combo => !combo.some(t => ['DUCK','PULL','STEP IN','CIRCLE L','CIRCLE R'].includes(t))), 'no advanced moves', combos.map(c => JSON.stringify(c)).join(','));
  check(c, 'J34', combos.every(combo => combo.every(t => !(/^[7-8]$/.test(t)))), 'no 7-8', combos.map(c => JSON.stringify(c)).join(','));
});

// CATEGORY K: Round Structure

await runTest('K1.1', 'Light 15 minutes', 'Tier=B, NO_EQUIP', 'B', NO_EQUIP, (r, c) => {
  const phase = getGrindPhases(r)[0];
  check(c, 'K1', (phase?.repeats || 0) >= 3, 'repeats>=3', String(phase?.repeats));
  check(c, 'K2', activeSegs(phase)[0]?.duration <= 180, 'active<=180', String(activeSegs(phase)[0]?.duration));
  check(c, 'K3', restSegs(phase).length > 0, 'has rest', String(restSegs(phase).length));
});

await runTest('K1.4', '30 minute treadmill run', 'Tier=I, FULL_GYM', 'I', FULL_GYM, (r, c) => {
  const allSegs = getPhases(r).flatMap((p: any) => getSegments(p)).filter((s: any) => s.type === 'active');
  const longSeg = allSegs.find((s: any) => s.duration >= 1000);
  check(c, 'K10', !!longSeg, 'single long segment ok', `max dur: ${Math.max(...allSegs.map((s: any) => s.duration))}`);
  check(c, 'K11', getGrindPhases(r).every((p: any) => (p?.repeats || 1) === 1), 'not boxing rounds', String(getGrindPhases(r).map((p: any) => p.repeats).join(',')));
});

await runTest('K1.10', "I'm tired today, give me something light", 'Tier=I, BAG_ONLY', 'I', BAG_ONLY, (r, c) => {
  const phase = getGrindPhases(r)[0];
  check(c, 'K20', (phase?.repeats || 0) >= 2, 'still rounds', String(phase?.repeats));
  check(c, 'K21', activeSegs(phase)[0]?.duration <= 120, 'short rounds <=120', String(activeSegs(phase)[0]?.duration));
  check(c, 'K22', restSegs(phase)[0]?.duration >= 45, 'longer rest >=45', String(restSegs(phase)[0]?.duration));
});

// CATEGORY L: Everything is Grind

await runTest('L1.1', 'Just a warmup, 5 minutes', 'Tier=B, FULL_GYM', 'B', FULL_GYM, (r, c) => {
  check(c, 'L1', getPhases(r).every((p: any) => p.section === 'grind'), 'all grind', getPhases(r).map((p: any) => p.section).join(','));
  check(c, 'L2', getWarmupPhases(r).length === 0, 'no warmup section', String(getWarmupPhases(r).length));
  check(c, 'L3', getCooldownPhases(r).length === 0, 'no cooldown section', String(getCooldownPhases(r).length));
  check(c, 'L4', getPhases(r).length > 0, 'has content in grind', String(getPhases(r).length));
});

await runTest('L1.2', 'Just a cooldown, 5 minutes of stretching', 'Tier=I, NO_EQUIP', 'I', NO_EQUIP, (r, c) => {
  check(c, 'L5', getPhases(r).every((p: any) => p.section === 'grind'), 'all grind', getPhases(r).map((p: any) => p.section).join(','));
  check(c, 'L6', getGrindPhases(r).length > 0, 'has grind content', String(getGrindPhases(r).length));
});

// CATEGORY M: Vague/Creative Prompts

await runTest('M1.1', 'yo gimme sum heat 🔥💪 like 6 rnds or whatever heavy bag idrc', 'Tier=A, BAG_ONLY', 'A', BAG_ONLY, (r, c) => {
  check(c, 'M1', !r.fallback && Array.isArray(r.phases), 'valid workout', r.error || 'ok');
  check(c, 'M2', getGrindPhases(r)[0]?.repeats >= 5, '~6 rounds', String(getGrindPhases(r)[0]?.repeats));
  check(c, 'M3', activeSegs(getGrindPhases(r)[0])[0]?.segmentType === 'combo', 'combo', activeSegs(getGrindPhases(r)[0])[0]?.segmentType);
  check(c, 'M4', r.difficulty === 'advanced', 'advanced', r.difficulty);
});

await runTest('M1.2', '4 roudns hevy bag, 2 minuts eech, 30 sconds restt', 'Tier=I, BAG_ONLY', 'I', BAG_ONLY, (r, c) => {
  check(c, 'M5', !r.fallback && Array.isArray(r.phases), 'valid workout', r.error || 'ok');
  check(c, 'M6', getGrindPhases(r)[0]?.repeats === 4, '4', String(getGrindPhases(r)[0]?.repeats));
  check(c, 'M7', activeSegs(getGrindPhases(r)[0])[0]?.duration === 120, '120', String(activeSegs(getGrindPhases(r)[0])[0]?.duration));
  check(c, 'M8', restSegs(getGrindPhases(r)[0])[0]?.duration === 30, '30', String(restSegs(getGrindPhases(r)[0])[0]?.duration));
});

await runTest('M1.3', 'five rounds of shadow boxing two minutes each thirty seconds of rest between rounds', 'Tier=I, NO_EQUIP', 'I', NO_EQUIP, (r, c) => {
  const phase = getGrindPhases(r)[0];
  check(c, 'M9', phase?.repeats === 5, '5', String(phase?.repeats));
  check(c, 'M10', activeSegs(phase)[0]?.segmentType === 'shadowboxing', 'shadowboxing', activeSegs(phase)[0]?.segmentType);
  check(c, 'M11', activeSegs(phase)[0]?.duration === 120, '120', String(activeSegs(phase)[0]?.duration));
  check(c, 'M12', restSegs(phase)[0]?.duration === 30, '30', String(restSegs(phase)[0]?.duration));
});

await runTest('M1.11', 'Tabata boxing, 8 rounds', 'Tier=I, BAG_ONLY', 'I', BAG_ONLY, (r, c) => {
  const phase = getGrindPhases(r)[0];
  check(c, 'M37', phase?.repeats === 8, '8', String(phase?.repeats));
  check(c, 'M38', activeSegs(phase)[0]?.duration <= 25, '~20s', String(activeSegs(phase)[0]?.duration));
  check(c, 'M39', restSegs(phase)[0]?.duration <= 15, '~10s', String(restSegs(phase)[0]?.duration));
});

await runTest('M1.13', 'Surprise me', 'Tier=I, BAG_ONLY', 'I', BAG_ONLY, (r, c) => {
  check(c, 'M44', !r.fallback && Array.isArray(r.phases), 'valid workout', r.error || 'ok');
  check(c, 'M45', getGrindPhases(r).some((p: any) => p.combos?.length > 0), 'has combos', 'check');
  check(c, 'M46', getGrindPhases(r)[0]?.repeats >= 3 && getGrindPhases(r)[0]?.repeats <= 8, '3-8 rounds', String(getGrindPhases(r)[0]?.repeats));
});

await runTest('M1.17', 'bag work', 'Tier=I, BAG_ONLY', 'I', BAG_ONLY, (r, c) => {
  check(c, 'M53', !r.fallback && Array.isArray(r.phases), 'valid workout', r.error || 'ok');
  check(c, 'M54', getGrindPhases(r)[0]?.combos?.length > 0 && getGrindPhases(r)[0]?.repeats > 0, 'has rounds+combos', 'check');
});

// CATEGORY N: Full Regression

const N_PROMPT = `1 round warm up, 3 minutes, no rest. Dynamic stretches.

3 rounds shadowboxing, 2 minutes each, 30 sec rest. Round 1: jab cross hook. Round 2: double jab cross uppercut. Round 3: 1-2-3-6-3-2.

2 rounds speed bag, 2 minutes each, 30 sec rest. Round 1: doubles. Round 2: fist rolls.

3 rounds superset: heavy bag 2 minutes and burpees 1 minute. 45 sec rest between rounds. Round 1: 1-2. Round 2: 1-2-3. Round 3: 1-1-2-3-2.

3 rounds conditioning, 45 seconds each, 20 sec rest. Round 1: plank. Round 2: jumping lunges. Round 3: squat jumps.

1 round cool down, 3 minutes, no rest. Foam rolling.`;

await runTest('N1.1', N_PROMPT, 'Tier=I, FULL_GYM', 'I', FULL_GYM, (r, c) => {
  const phases = getPhases(r);
  const warmupPhases = getWarmupPhases(r);
  const cooldownPhases = getCooldownPhases(r);

  check(c, 'N1', phases.length === 6, '6', String(phases.length));
  check(c, 'N2', warmupPhases[0]?.section === 'warmup', 'warmup', warmupPhases[0]?.section);

  // Phase 1 - warmup
  const p1segs = getSegments(phases[0]);
  check(c, 'N3', activeSegs(phases[0])[0]?.duration === 180, '180', String(activeSegs(phases[0])[0]?.duration));

  // Phase 2 - shadowboxing 3 rounds
  const p2 = phases[1];
  const p2combos: string[][] = p2?.combos || [];
  check(c, 'N4', activeSegs(p2)[0]?.segmentType === 'shadowboxing' && p2?.repeats === 3, 'shadowboxing repeats=3', `${activeSegs(p2)[0]?.segmentType} ${p2?.repeats}`);
  check(c, 'N5', JSON.stringify(p2combos[0]) === '["1","2","3"]', '["1","2","3"]', JSON.stringify(p2combos[0]));
  check(c, 'N6', JSON.stringify(p2combos[1]) === '["1","1","2","5"]', '["1","1","2","5"]', JSON.stringify(p2combos[1]));
  check(c, 'N7', JSON.stringify(p2combos[2]) === '["1","2","3","6","3","2"]', '["1","2","3","6","3","2"]', JSON.stringify(p2combos[2]));

  // Phase 3 - speed bag
  const p3 = phases[2];
  const p3combos: string[][] = p3?.combos || [];
  check(c, 'N8', activeSegs(p3)[0]?.segmentType === 'speedbag' && p3?.repeats === 2, 'speedbag repeats=2', `${activeSegs(p3)[0]?.segmentType} ${p3?.repeats}`);
  check(c, 'N9', p3combos[0]?.[0]?.toLowerCase().includes('double'), 'Doubles', JSON.stringify(p3combos[0]));
  check(c, 'N10', p3combos[1]?.[0]?.toLowerCase().includes('fist roll'), 'Fist Rolls', JSON.stringify(p3combos[1]));

  // Phase 4 - superset heavy bag + burpees
  const p4 = phases[3];
  const p4combos: string[][] = p4?.combos || [];
  check(c, 'N11', activeSegs(p4).length >= 2 && p4?.repeats === 3, 'superset repeats=3', `activeSegs: ${activeSegs(p4).length} repeats: ${p4?.repeats}`);
  check(c, 'N12', activeSegs(p4)[0]?.segmentType === 'combo' && activeSegs(p4)[0]?.duration === 120, 'combo 120s', `${activeSegs(p4)[0]?.segmentType} ${activeSegs(p4)[0]?.duration}`);
  check(c, 'N13', activeSegs(p4)[1]?.segmentType === 'exercise' && activeSegs(p4)[1]?.duration === 60, 'exercise 60s', `${activeSegs(p4)[1]?.segmentType} ${activeSegs(p4)[1]?.duration}`);
  check(c, 'N14', restSegs(p4)[0]?.duration === 45, '45', String(restSegs(p4)[0]?.duration));
  check(c, 'N15', JSON.stringify(p4combos) === '[["1","2"],["1","2","3"],["1","1","2","3","2"]]', 'exact combos', JSON.stringify(p4combos));

  // Phase 5 - conditioning
  const p5 = phases[4];
  const p5combos: string[][] = p5?.combos || [];
  check(c, 'N17', activeSegs(p5)[0]?.segmentType === 'exercise' && p5?.repeats === 3, 'exercise repeats=3', `${activeSegs(p5)[0]?.segmentType} ${p5?.repeats}`);
  check(c, 'N18', p5combos.length === 3, '3 exercise combos', String(p5combos.length));
  check(c, 'N19', activeSegs(p5)[0]?.duration === 45 && restSegs(p5)[0]?.duration === 20, 'active=45 rest=20', `${activeSegs(p5)[0]?.duration} ${restSegs(p5)[0]?.duration}`);

  // Phase 6 - cooldown
  const p6 = phases[5];
  check(c, 'N20', p6?.section === 'cooldown' && (p6?.name || '').toLowerCase().includes('foam'), 'cooldown foam rolling', `${p6?.section} ${p6?.name}`);
  check(c, 'N21', activeSegs(p6)[0]?.duration === 180, '180', String(activeSegs(p6)[0]?.duration));

  check(c, 'N22', r.hasWarmup === true, 'true', String(r.hasWarmup));
  check(c, 'N23', r.hasCooldown === true, 'true', String(r.hasCooldown));
  check(c, 'N24', r.megasetRepeats === 1, '1', String(r.megasetRepeats));

  // Transition rests
  const warmupSegs = warmupPhases.flatMap((p: any) => getSegments(p));
  const lastWarmupSeg = warmupSegs[warmupSegs.length - 1];
  const cooldownSegs = cooldownPhases.flatMap((p: any) => getSegments(p));
  const firstCooldownSeg = cooldownSegs[0];
  check(c, 'N26', lastWarmupSeg?.name?.toLowerCase().includes('get ready') && lastWarmupSeg?.duration === 30, '"Get Ready" 30s', JSON.stringify(lastWarmupSeg));
  check(c, 'N27', firstCooldownSeg?.name?.toLowerCase().includes('recovery') && firstCooldownSeg?.duration === 30, '"Recovery" 30s', JSON.stringify(firstCooldownSeg));

  // No hyphen-joined combos
  const allCombos = phases.flatMap((p: any) => p.combos || []);
  check(c, 'N29', allCombos.every((combo: string[]) => combo.every((t: string) => !t.includes('-') || VALID_TOKENS.has(t))), 'no hyphen-joined', 'check');
});

// CATEGORY O: Validation & Auto-Repair (test locally)

console.log('\n── Category O: Auto-Repair (local tests) ──');
import { autoRepair, autoRepairCombos } from '../lib/aiAutoRepair.js';
import { validateParsedResult } from '../lib/aiValidation.js';

// O1.1 - Invalid token stripping
{
  const checks: CheckResult[] = [];
  const input = autoRepair({ phases: [{ name: 'Test', section: 'grind', repeats: 1, combos: [['1','2','PUSH','3']], segments: [{ name:'Test', type:'active', segmentType:'combo', duration:60 }], comboOrder:'sequential' }], difficulty: 'intermediate', megasetRepeats: 1 });
  check(checks, 'O1', !input.phases[0].combos[0].includes('PUSH'), '"PUSH" stripped', JSON.stringify(input.phases[0].combos[0]));
  check(checks, 'O2', JSON.stringify(input.phases[0].combos[0]) === '["1","2","3"]', '["1","2","3"]', JSON.stringify(input.phases[0].combos[0]));
  const { valid } = validateParsedResult(input);
  check(checks, 'O3', valid, 'valid after repair', String(valid));
  RESULTS.push({ testId: 'O1.1', prompt: 'Auto-repair: invalid token', context: 'local', checks });
}

// O1.2 - Hyphen repair
{
  const checks: CheckResult[] = [];
  const input = autoRepair({ phases: [{ name: 'Test', section: 'grind', repeats: 1, combos: [['1-2-3']], segments: [{ name:'Test', type:'active', segmentType:'combo', duration:60 }], comboOrder:'sequential' }], difficulty: 'intermediate', megasetRepeats: 1 });
  check(checks, 'O4', JSON.stringify(input.phases[0].combos[0]) === '["1","2","3"]', '["1","2","3"]', JSON.stringify(input.phases[0].combos[0]));
  const { valid } = validateParsedResult(input);
  check(checks, 'O5', valid, 'valid', String(valid));
  RESULTS.push({ testId: 'O1.2', prompt: 'Auto-repair: hyphen combo', context: 'local', checks });
}

// O1.3 - Missing megasetRepeats
{
  const checks: CheckResult[] = [];
  const input = autoRepair({ phases: [{ name: 'Test', section: 'grind', repeats: 1, segments: [{ name:'Test', type:'active', segmentType:'combo', duration:60 }] }], difficulty: 'intermediate' });
  check(checks, 'O6', input.megasetRepeats === 1, '1', String(input.megasetRepeats));
  RESULTS.push({ testId: 'O1.3', prompt: 'Auto-repair: missing megasetRepeats', context: 'local', checks });
}

// O1.5 - No grind phase → reclassify
{
  const checks: CheckResult[] = [];
  const input = autoRepair({ phases: [{ name: 'Warmup', section: 'warmup', repeats: 1, segments: [{ name:'Test', type:'active', segmentType:'exercise', duration:60 }] }], difficulty: 'intermediate', megasetRepeats: 1 });
  check(checks, 'O8', input.phases[0].section === 'grind', 'grind', input.phases[0].section);
  const { valid } = validateParsedResult(input);
  check(checks, 'O9', valid, 'valid', String(valid));
  RESULTS.push({ testId: 'O1.5', prompt: 'Auto-repair: no grind → reclassify', context: 'local', checks });
}

// O1.6 - Duration clamping
{
  const checks: CheckResult[] = [];
  const low = autoRepair({ phases: [{ name: 'T', section: 'grind', repeats: 1, segments: [{ name:'T', type:'active', segmentType:'exercise', duration:3 }] }], difficulty:'intermediate', megasetRepeats:1 });
  check(checks, 'O10', low.phases[0].segments[0].duration === 10, '10', String(low.phases[0].segments[0].duration));
  const high = autoRepair({ phases: [{ name: 'T', section: 'grind', repeats: 1, segments: [{ name:'T', type:'active', segmentType:'exercise', duration:900 }] }], difficulty:'intermediate', megasetRepeats:1 });
  check(checks, 'O11', high.phases[0].segments[0].duration === 300, '300', String(high.phases[0].segments[0].duration));
  RESULTS.push({ testId: 'O1.6', prompt: 'Auto-repair: duration clamping', context: 'local', checks });
}

// O1.9 - Garbage input
{
  const checks: CheckResult[] = [];
  const garbleRes = await callAPI("__GARBLE__FORCE_JSON_FAIL__", 'I', BAG_ONLY);
  // This won't cause garbage from Gemini but let's check the route handles bad JSON correctly
  // Instead test via validation of completely wrong data
  const badResult = validateParsedResult({ phases: [], difficulty: 'intermediate', megasetRepeats: 1 });
  check(checks, 'O18', !badResult.valid, 'invalid', String(badResult.valid));
  check(checks, 'O19', badResult.errors.some(e => e.includes('phases')), 'phases error', badResult.errors.join(','));
  RESULTS.push({ testId: 'O1.10', prompt: 'Validation: empty phases', context: 'local', checks });
}

// O1.11 - Invalid difficulty
{
  const checks: CheckResult[] = [];
  const badDiff = validateParsedResult({ phases: [{ name:'T', section:'grind', repeats:1, segments:[{name:'T',type:'active',segmentType:'exercise',duration:60}] }], difficulty: 'super-hard', megasetRepeats:1 });
  check(checks, 'O20', !badDiff.valid, 'invalid', String(badDiff.valid));
  RESULTS.push({ testId: 'O1.11', prompt: 'Validation: invalid difficulty', context: 'local', checks });
}

// CATEGORY P: Fallback Chain

await runTest('P1.1', '5 rounds heavy bag, 3 min, 1 min rest', 'Tier=I, BAG_ONLY - AI test', 'I', BAG_ONLY, (r, c) => {
  check(c, 'P1', !r.fallback && r.phases?.length > 0, 'AI result (not fallback)', String(r.fallback));
  check(c, 'P3', !r.error && r.phases?.length > 0, 'valid workout', r.error || 'ok');
});

// ─────────────────────────────────────────────────────────────────────────────
// PART 2: COACH ENGINE TESTS (local)
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n═══ PART 2: COACH ENGINE TESTS ═══\n');

// Dynamic import with path alias workaround
const { generateCoachRecommendation, recommendationToPrompt } = await import('../lib/coachEngine.js');

function makeHistory(n: number, difficulty: 'too_easy' | 'just_right' | 'too_hard' | null, daysAgo = 1): any[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `w${i}`,
    workout_name: 'Heavy Bag Blast',
    completed_at: new Date(Date.now() - (i + daysAgo) * 86400000).toISOString(),
    duration: 1800,
    xp_earned: 100,
    difficulty,
    notes: null,
    round_feedback: null,
    is_manual_entry: false,
  }));
}

function makeProfile(overrides: any = {}): any {
  return {
    prestige: null, current_level: 1, current_streak: 3, longest_streak: 10,
    workouts_completed: 10, total_training_seconds: 36000, experience_level: 'intermediate',
    equipment: { gloves: true, wraps: true, heavyBag: true, speedBag: false, doubleEndBag: false, jumpRope: true, treadmill: false },
    goals: null, last_workout_date: new Date(Date.now() - 86400000).toISOString(),
    comeback_count: 0, double_days: 0, morning_workouts: 3, night_workouts: 1,
    weekend_workouts: 2, weekday_workouts: 8,
    punch_1_count: 500, punch_2_count: 400, punch_3_count: 100, punch_4_count: 80,
    punch_5_count: 50, punch_6_count: 30, punch_7_count: 0, punch_8_count: 0,
    slips_count: 10, rolls_count: 5, pullbacks_count: 0, circles_count: 0,
    ...overrides,
  };
}

// Q1.1 — Too easy majority
{
  const checks: CheckResult[] = [];
  const history = [...makeHistory(7, 'too_easy'), ...makeHistory(3, 'just_right')];
  const profile = makeProfile({ experience_level: 'intermediate' });
  const rec = generateCoachRecommendation(history, profile);
  check(checks, 'Q1', rec.suggestedDifficulty === 'advanced', 'advanced', rec.suggestedDifficulty);
  check(checks, 'Q2', rec.suggestedRestDuration < 60, 'rest decreased', String(rec.suggestedRestDuration));
  RESULTS.push({ testId: 'Q1.1', prompt: '7 too_easy + 3 just_right, Tier=I', context: 'coach local', checks });
}

// Q1.2 — Too hard majority
{
  const checks: CheckResult[] = [];
  const history = [...makeHistory(7, 'too_hard'), ...makeHistory(3, 'just_right')];
  const profile = makeProfile({ experience_level: 'intermediate' });
  const rec = generateCoachRecommendation(history, profile);
  check(checks, 'Q3', rec.suggestedDifficulty === 'beginner', 'beginner', rec.suggestedDifficulty);
  check(checks, 'Q4', rec.suggestedRestDuration > 60, 'rest increased', String(rec.suggestedRestDuration));
  RESULTS.push({ testId: 'Q1.2', prompt: '7 too_hard + 3 just_right, Tier=I', context: 'coach local', checks });
}

// Q1.3 — All just_right
{
  const checks: CheckResult[] = [];
  const history = makeHistory(10, 'just_right');
  const profile = makeProfile({ experience_level: 'intermediate' });
  const rec = generateCoachRecommendation(history, profile);
  check(checks, 'Q5', rec.suggestedDifficulty === 'intermediate', 'intermediate', rec.suggestedDifficulty);
  RESULTS.push({ testId: 'Q1.3', prompt: '10 just_right, Tier=I', context: 'coach local', checks });
}

// Q1.4 — No difficulty data
{
  const checks: CheckResult[] = [];
  const history = makeHistory(10, null);
  const profile = makeProfile({ experience_level: 'advanced' });
  const rec = generateCoachRecommendation(history, profile);
  check(checks, 'Q6', rec.suggestedDifficulty === 'advanced', 'advanced', rec.suggestedDifficulty);
  check(checks, 'Q7', rec.confidence === 'low' || rec.confidence === 'medium', 'low/medium', rec.confidence);
  RESULTS.push({ testId: 'Q1.4', prompt: '10 null difficulty, Tier=A', context: 'coach local', checks });
}

// Y1.3 — Zero history
{
  const checks: CheckResult[] = [];
  const profile = makeProfile({ workouts_completed: 0 });
  const rec = generateCoachRecommendation([], profile);
  check(checks, 'Y4', rec.isDefault === true, 'isDefault=true', String(rec.isDefault));
  check(checks, 'Y5', rec.confidence === 'low', 'low', rec.confidence);
  check(checks, 'Y7', rec.encouragement && rec.encouragement.length > 0, 'has encouragement', rec.encouragement);
  RESULTS.push({ testId: 'Y1.3', prompt: 'empty history', context: 'coach local', checks });
}

// V1.1 — Same day double session
{
  const checks: CheckResult[] = [];
  const today = new Date().toISOString();
  const profile = makeProfile({ last_workout_date: today });
  const history = makeHistory(5, 'just_right', 0);
  const rec = generateCoachRecommendation(history, profile);
  check(checks, 'V1', rec.workoutType === 'shadowboxing' || rec.focusAreas?.includes('recovery'), 'shadowboxing or recovery focus', `${rec.workoutType} ${rec.focusAreas?.join(',')}`);
  check(checks, 'V2', rec.focusAreas?.includes('recovery'), 'recovery in focusAreas', String(rec.focusAreas));
  RESULTS.push({ testId: 'V1.1', prompt: 'same day second session', context: 'coach local', checks });
}

// V1.2 — 7+ day gap
{
  const checks: CheckResult[] = [];
  const profile = makeProfile({ last_workout_date: new Date(Date.now() - 10 * 86400000).toISOString(), comeback_count: 2 });
  const history = makeHistory(5, 'just_right', 10);
  const rec = generateCoachRecommendation(history, profile);
  check(checks, 'V4', rec.includeWarmup === true, 'includeWarmup=true', String(rec.includeWarmup));
  RESULTS.push({ testId: 'V1.2', prompt: '10 day gap, comeback', context: 'coach local', checks });
}

// T1.1 — Jab-cross dominant
{
  const checks: CheckResult[] = [];
  const profile = makeProfile({ punch_1_count: 5000, punch_2_count: 4000, punch_3_count: 200, punch_4_count: 100, punch_5_count: 0, punch_6_count: 0, experience_level: 'intermediate' });
  const history = makeHistory(10, 'just_right');
  const rec = generateCoachRecommendation(history, profile);
  check(checks, 'T1', rec.punchEmphasis?.includes(5) || rec.punchEmphasis?.includes(6), 'punchEmphasis has 5 or 6', String(rec.punchEmphasis));
  RESULTS.push({ testId: 'T1.1', prompt: 'jab-cross dominant profile', context: 'coach local', checks });
}

// U1.1 — Zero defense
{
  const checks: CheckResult[] = [];
  const profile = makeProfile({ slips_count: 0, rolls_count: 0, pullbacks_count: 0, circles_count: 0, workouts_completed: 15, experience_level: 'intermediate' });
  const history = makeHistory(15, 'just_right');
  const rec = generateCoachRecommendation(history, profile);
  check(checks, 'U1', rec.focusAreas?.includes('defense'), 'defense in focusAreas', String(rec.focusAreas));
  check(checks, 'U2', rec.includeDefenseInCombos === true, 'includeDefenseInCombos=true', String(rec.includeDefenseInCombos));
  RESULTS.push({ testId: 'U1.1', prompt: 'zero defense after 15 workouts, Tier=I', context: 'coach local', checks });
}

// U1.2 — Beginner no defense push
{
  const checks: CheckResult[] = [];
  const profile = makeProfile({ slips_count: 0, rolls_count: 0, experience_level: 'beginner', workouts_completed: 15 });
  const history = makeHistory(15, 'just_right');
  const rec = generateCoachRecommendation(history, profile);
  check(checks, 'U4', !rec.focusAreas?.includes('defense'), 'no defense for beginners', String(rec.focusAreas));
  check(checks, 'U5', rec.includeDefenseInCombos !== true, 'includeDefenseInCombos=false', String(rec.includeDefenseInCombos));
  RESULTS.push({ testId: 'U1.2', prompt: 'zero defense, Tier=B (beginner)', context: 'coach local', checks });
}

// W1.4 — Same workout 4x
{
  const checks: CheckResult[] = [];
  const history = Array.from({ length: 5 }, (_, i) => ({ ...makeHistory(1, 'just_right')[0], id: `w${i}`, workout_name: 'Heavy Bag Blast' }));
  const profile = makeProfile();
  const rec = generateCoachRecommendation(history, profile);
  check(checks, 'W7', rec.focusAreas?.includes('variety'), 'variety in focusAreas', String(rec.focusAreas));
  RESULTS.push({ testId: 'W1.4', prompt: 'same workout 5x in a row', context: 'coach local', checks });
}

// X1.1 — Competition goal
{
  const checks: CheckResult[] = [];
  const profile = makeProfile({ goals: ['competition'], experience_level: 'advanced' });
  const history = makeHistory(10, 'just_right');
  const rec = generateCoachRecommendation(history, profile);
  check(checks, 'X1', rec.suggestedRoundDuration === 180, '180', String(rec.suggestedRoundDuration));
  check(checks, 'X2', rec.suggestedRestDuration <= 60, '<=60', String(rec.suggestedRestDuration));
  check(checks, 'X3', rec.focusAreas?.includes('defense'), 'defense', String(rec.focusAreas));
  RESULTS.push({ testId: 'X1.1', prompt: 'competition goal, Tier=A', context: 'coach local', checks });
}

// Z1.1 — recommendationToPrompt
{
  const checks: CheckResult[] = [];
  const history = makeHistory(10, 'just_right');
  const profile = makeProfile();
  const rec = generateCoachRecommendation(history, profile);
  const prompt = recommendationToPrompt(rec);
  check(checks, 'Z1', typeof prompt === 'string' && prompt.length > 0, 'non-empty string', prompt.slice(0, 50));
  check(checks, 'Z2', /\d+\s*(round|min|sec)/i.test(prompt), 'contains round/duration', prompt.slice(0, 80));
  check(checks, 'Z5', /beginner|intermediate|advanced/i.test(prompt), 'contains difficulty', prompt.slice(0, 80));
  RESULTS.push({ testId: 'Z1.1', prompt: 'recommendationToPrompt', context: 'coach local', checks });
}

// ─────────────────────────────────────────────────────────────────────────────
// RESULTS REPORT
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n\n═══════════════════════════════════════════════════════════');
console.log('KOI TEST RESULTS');
console.log('═══════════════════════════════════════════════════════════\n');

const catMap = new Map<string, { passed: number; failed: number; failures: string[] }>();

for (const test of RESULTS) {
  const cat = test.testId.split('.')[0];
  if (!catMap.has(cat)) catMap.set(cat, { passed: 0, failed: 0, failures: [] });
  const catData = catMap.get(cat)!;
  for (const chk of test.checks) {
    if (chk.passed) catData.passed++;
    else {
      catData.failed++;
      catData.failures.push(`  ${chk.id}: expected "${chk.expected}" got "${chk.actual}"`);
    }
  }
}

// Summary table
console.log('CATEGORY SUMMARY');
console.log('─────────────────────────────────────────────────────────');
console.log(`${'Category'.padEnd(8)} ${'Passed'.padEnd(8)} ${'Failed'.padEnd(8)} Status`);
console.log('─────────────────────────────────────────────────────────');

for (const [cat, data] of catMap) {
  const status = data.failed === 0 ? '✅ PASS' : `❌ FAIL (${data.failed} failures)`;
  console.log(`${cat.padEnd(8)} ${String(data.passed).padEnd(8)} ${String(data.failed).padEnd(8)} ${status}`);
}

console.log('─────────────────────────────────────────────────────────');
console.log(`${'TOTAL'.padEnd(8)} ${String(totalPassed).padEnd(8)} ${String(totalFailed).padEnd(8)} ${totalFailed === 0 ? '✅ ALL PASS' : `❌ ${totalFailed} FAILURES`}`);

// Failures detail
if (totalFailed > 0) {
  console.log('\n\nFAILURE DETAILS');
  console.log('═══════════════════════════════════════════════════════════');
  for (const test of RESULTS) {
    const failures = test.checks.filter(c => !c.passed);
    if (failures.length === 0) continue;
    console.log(`\n[${test.testId}] ${test.prompt} (${test.context})`);
    if (test.error) console.log(`  ERROR: ${test.error}`);
    for (const f of failures) {
      console.log(`  ❌ ${f.id}: expected "${f.expected}" got "${f.actual}"`);
    }
  }
}

// Full JSON of raw responses for failed tests (abbreviated)
console.log('\n\nRAW RESPONSES (failed tests only)');
console.log('═══════════════════════════════════════════════════════════');
for (const test of RESULTS) {
  if (test.checks.some(c => !c.passed) && test.rawResponse) {
    console.log(`\n[${test.testId}] ${test.prompt.slice(0,60)}`);
    const resp = test.rawResponse;
    console.log(`  name: ${resp.name}, difficulty: ${resp.difficulty}, megasetRepeats: ${resp.megasetRepeats}`);
    console.log(`  phases: ${resp.phases?.length}, hasWarmup: ${resp.hasWarmup}, hasCooldown: ${resp.hasCooldown}`);
    if (resp.phases?.[0]) {
      const p = resp.phases[0];
      console.log(`  phase[0]: section=${p.section}, repeats=${p.repeats}, combos=${JSON.stringify(p.combos?.slice(0,3))}`);
      console.log(`  phase[0] segs: ${JSON.stringify(p.segments?.map((s: any) => ({ type: s.type, segType: s.segmentType, dur: s.duration, name: s.name })))}`);
    }
  }
}

console.log('\n\nDone.\n');
