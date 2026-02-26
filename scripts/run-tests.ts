/**
 * KOI Test Runner — concurrent API calls + local coach tests
 * Run: npx tsx --tsconfig tsconfig.json scripts/run-tests.ts
 */

import { generateCoachRecommendation, recommendationToPrompt } from '@/lib/coachEngine';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const FULL_GYM   = { gloves:true, wraps:true, heavyBag:true, doubleEndBag:true, speedBag:true, jumpRope:true, treadmill:true };
const BAG_ONLY   = { gloves:true, wraps:true, heavyBag:true, doubleEndBag:false, speedBag:false, jumpRope:false, treadmill:false };
const NO_EQUIP   = { gloves:false, wraps:false, heavyBag:false, doubleEndBag:false, speedBag:false, jumpRope:false, treadmill:false };
const SB_ONLY    = { gloves:false, wraps:false, heavyBag:false, doubleEndBag:false, speedBag:true, jumpRope:false, treadmill:false };
const DB_ONLY    = { gloves:true, wraps:true, heavyBag:false, doubleEndBag:true, speedBag:false, jumpRope:false, treadmill:false };
const FULL_GYM_NO_JR = { ...FULL_GYM, jumpRope:false };

const TIER = { R:'beginner', B:'beginner', I:'intermediate', A:'advanced', P:'advanced' };

const VALID = new Set(['1','2','3','4','5','6','7','8',
  'SLIP L','SLIP R','ROLL L','ROLL R','DUCK','PULL','BLOCK','PARRY',
  'STEP IN','STEP OUT','CIRCLE L','CIRCLE R','PIVOT','FREESTYLE']);

const DEF_MOVES = ['SLIP L','SLIP R','ROLL L','ROLL R','DUCK','PULL','BLOCK','PARRY'];
const ADV_MOVES = ['DUCK','PULL','STEP IN','STEP OUT','CIRCLE L','CIRCLE R','PIVOT'];
const MOV_MOVES = ['STEP IN','STEP OUT','CIRCLE L','CIRCLE R','PIVOT'];

function hasDefense(combo)    { return combo.some(t => DEF_MOVES.includes(t)); }
function hasSlipRoll(combo)   { return combo.some(t => ['SLIP L','SLIP R','ROLL L','ROLL R'].includes(t)); }
function hasMovement(combo)   { return combo.some(t => MOV_MOVES.includes(t)); }
function hasAdvDef(combo)     { return combo.some(t => ADV_MOVES.includes(t)); }
function maxPunch(combo)      { return Math.max(0, ...combo.map(t => /^[1-8]$/.test(t) ? +t : 0)); }
function allValidTokens(combos) {
  return combos.every(c => Array.isArray(c) && c.every(t => VALID.has(t) || !/^[A-Z]/.test(t)));
}
function noHyphen(combos) {
  return combos.every(c => c.every(t => {
    if (t === 'SLIP L'||t==='SLIP R'||t==='ROLL L'||t==='ROLL R') return true;
    return !t.includes('-');
  }));
}

function phases(r)    { return r?.phases || []; }
function grind(r)     { return phases(r).filter(p=>p.section==='grind'); }
function warmup(r)    { return phases(r).filter(p=>p.section==='warmup'); }
function cooldown(r)  { return phases(r).filter(p=>p.section==='cooldown'); }
function segs(ph)     { return ph?.segments || []; }
function active(ph)   { return segs(ph).filter(s=>s.type==='active'); }
function rest(ph)     { return segs(ph).filter(s=>s.type==='rest'); }

let PASS=0, FAIL=0;
const FAILURES=[];

function chk(testId, id, ok, expected, actual) {
  if (ok) { PASS++; }
  else {
    FAIL++;
    FAILURES.push({ testId, id, expected:String(expected), actual:String(actual) });
  }
  return ok;
}

// ─── API call ────────────────────────────────────────────────────────────────

async function api(prompt, tier, equipment) {
  try {
    const r = await fetch('http://localhost:5000/api/generate-workout', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ prompt, userTier: TIER[tier], equipment, experienceLevel: TIER[tier] }),
      signal: AbortSignal.timeout(60000),
    });
    return await r.json();
  } catch(e) { return { error: e.message, fallback:true }; }
}

// ─── Define all API test cases ────────────────────────────────────────────────

const API_TESTS = [
  // CATEGORY A
  { id:'A1.1', p:'5 rounds heavy bag, 3 min, 1 min rest', t:'I', eq:BAG_ONLY },
  { id:'A1.2', p:'8 rounds heavy bag, 2 min, 45 sec rest', t:'A', eq:BAG_ONLY },
  { id:'A1.3', p:'3 rounds shadowboxing 2 min 30 sec rest. Then 4 rounds heavy bag 3 min 1 min rest.', t:'I', eq:BAG_ONLY },
  { id:'A1.4', p:'1 round heavy bag, 3 min, no rest', t:'B', eq:BAG_ONLY },
  { id:'A1.5', p:'12 rounds heavy bag, 3 min, 1 min rest', t:'A', eq:BAG_ONLY },
  // CATEGORY B
  { id:'B1.1', p:'3 rounds heavy bag, 2 min, 30 sec rest. Round 1: 1-2-3. Round 2: 1-2-SLIP L-3. Round 3: 1-1-2-3-2.', t:'I', eq:BAG_ONLY },
  { id:'B1.2', p:'3 rounds shadowboxing, 2 min, 30 sec rest. Round 1: jab cross hook. Round 2: double jab cross uppercut. Round 3: jab cross body hook.', t:'I', eq:NO_EQUIP },
  { id:'B1.3', p:'3 rounds speed bag, 2 min, 30 sec rest. Round 1: doubles. Round 2: triples. Round 3: fist rolls.', t:'I', eq:SB_ONLY },
  { id:'B1.4', p:'3 rounds conditioning, 1 min, 30 sec rest. Round 1: burpees. Round 2: mountain climbers. Round 3: squat jumps.', t:'I', eq:NO_EQUIP },
  { id:'B1.5', p:'5 rounds heavy bag, 3 min, 1 min rest. Round 1: 1-2. Round 2: 1-2-SLIP L-3. Round 3: 1-2-ROLL R-3-2. Round 4: 1-2-3-DUCK-2-3. Round 5: 1-2-SLIP L-3-ROLL R-2-3-2.', t:'A', eq:BAG_ONLY },
  { id:'B1.7', p:'5 rounds heavy bag all freestyle', t:'I', eq:BAG_ONLY },
  { id:'B1.8', p:'3 rounds heavy bag, 3 min, 1 min rest. Round 1: 1-2-3. Round 2: freestyle. Round 3: 1-2-3-6-3-2.', t:'A', eq:BAG_ONLY },
  // CATEGORY C
  { id:'C1.1', p:'6 rounds heavy bag, 3 min, 1 min rest', t:'I', eq:BAG_ONLY },
  { id:'C1.2', p:'4 rounds shadowboxing, 2 min, 30 sec rest', t:'B', eq:NO_EQUIP },
  { id:'C1.3', p:'4 rounds heavy bag, 3 min, 1 min rest, no specific combos', t:'I', eq:BAG_ONLY },
  { id:'C1.4', p:'5 rounds heavy bag, 2 min, 30 sec rest', t:'A', eq:BAG_ONLY },
  { id:'C1.5', p:'3 rounds heavy bag, 2 min, 30 sec rest. Round 1: 1-2. Round 2: 1-2-3. Round 3: 1-2-3-2.', t:'I', eq:BAG_ONLY },
  // CATEGORY D
  { id:'D1.1', p:'5 rounds heavy bag, 3 min, 1 min rest', t:'I', eq:BAG_ONLY },
  { id:'D1.2', p:'Full boxing session, 30 minutes', t:'I', eq:FULL_GYM },
  { id:'D1.3', p:'Complete boxing workout for today', t:'I', eq:BAG_ONLY },
  { id:'D1.4', p:'Start with jump rope, then 4 rounds heavy bag 3 min 1 min rest, end with stretching', t:'I', eq:FULL_GYM },
  { id:'D1.5', p:'Full boxing session, no warmup, 30 minutes', t:'I', eq:FULL_GYM },
  { id:'D1.6', p:'Full boxing session, skip cooldown', t:'I', eq:FULL_GYM },
  { id:'D1.7', p:'Full boxing session, 25 minutes', t:'B', eq:NO_EQUIP },
  { id:'D1.8', p:'2 rounds warm up jump rope 2 min. 4 rounds heavy bag 3 min 1 min rest. 1 round cooldown stretching 3 min.', t:'I', eq:FULL_GYM },
  { id:'D1.9', p:'5 rounds heavy bag, 3 min, 1 min rest. 1 round cooldown stretching 3 min.', t:'I', eq:BAG_ONLY },
  { id:'D1.10', p:'1 round warmup jump rope 2 min. 5 rounds heavy bag, 3 min, 1 min rest.', t:'I', eq:FULL_GYM },
  // CATEGORY E
  { id:'E1.1', p:'3 rounds heavy bag, 3 minutes each, 1 minute rest', t:'I', eq:BAG_ONLY },
  { id:'E1.2', p:'4 rounds shadowboxing, 1 min 30 sec each, 45 sec rest', t:'I', eq:NO_EQUIP },
  { id:'E1.3', p:'3 rounds heavy bag, 90 seconds each, 30 seconds rest', t:'I', eq:BAG_ONLY },
  { id:'E1.4', p:'5 rnds hvy bag 2min 30s rest', t:'I', eq:BAG_ONLY },
  { id:'E1.7', p:'4 rounds heavy bag, 2 and a half minutes, 1 min rest', t:'I', eq:BAG_ONLY },
  { id:'E1.9', p:'3 rounds heavy bag, 2:30 each, 0:45 rest', t:'I', eq:BAG_ONLY },
  // CATEGORY F
  { id:'F1.1', p:'3 rounds superset: heavy bag 2 min and burpees 1 min. 45 sec rest.', t:'I', eq:BAG_ONLY },
  { id:'F1.2', p:'3 rounds superset: heavy bag 2 min and burpees 1 min. 45 sec rest. Round 1: 1-2. Round 2: 1-2-3. Round 3: 1-1-2-3-2.', t:'I', eq:BAG_ONLY },
  { id:'F1.4', p:'3 rounds: heavy bag 2 min, push-ups 30 sec, jumping jacks 30 sec. 1 min rest.', t:'I', eq:BAG_ONLY },
  { id:'F1.6', p:'3 rounds superset: heavy bag 90 sec and squats 45 sec. 30 sec rest.', t:'I', eq:BAG_ONLY },
  // CATEGORY G
  { id:'G1.1', p:'5 rounds heavy bag, 3 min, 1 min rest', t:'I', eq:NO_EQUIP },
  { id:'G1.2', p:'5 rounds heavy bag, 3 min, 1 min rest', t:'I', eq:BAG_ONLY },
  { id:'G1.3', p:'3 rounds speed bag, 2 min, 30 sec rest', t:'I', eq:BAG_ONLY },
  { id:'G1.4', p:'3 rounds double end bag, 2 min, 30 sec rest. Round 1: 1-2. Round 2: 1-2-3. Round 3: 1-2-5-2.', t:'I', eq:DB_ONLY },
  { id:'G1.5', p:'3 rounds speed bag 2 min 30 sec rest. Then 4 rounds heavy bag 3 min 1 min rest. Then 2 rounds double end bag 2 min 30 sec rest.', t:'A', eq:FULL_GYM },
  { id:'G1.7', p:'5 rounds shadowboxing, 3 min, 1 min rest', t:'I', eq:FULL_GYM },
  // CATEGORY H
  { id:'H1.1', p:'5 rounds heavy bag, 3 min, 1 min rest', t:'I', eq:BAG_ONLY },
  { id:'H1.2', p:'3 rounds heavy bag, 2 min, 30 sec rest. Repeat everything twice.', t:'I', eq:BAG_ONLY },
  { id:'H1.3', p:'5 rounds heavy bag, 3 min, 1 min rest. Run it back.', t:'I', eq:BAG_ONLY },
  { id:'H1.5', p:'3 rounds heavy bag, 2 min, 30 sec rest. Repeat everything 3 times.', t:'I', eq:BAG_ONLY },
  { id:'H1.6', p:'3 rounds heavy bag, 2 min, 30 sec rest. Repeat everything 10 times.', t:'I', eq:BAG_ONLY },
  // CATEGORY I
  { id:'I1.1', p:'3 rounds heavy bag, beginner level', t:'A', eq:BAG_ONLY },
  { id:'I1.2', p:'3 rounds heavy bag, advanced level, 3 min, 1 min rest', t:'B', eq:BAG_ONLY },
  { id:'I1.3', p:'3 rounds heavy bag, 3 min, 1 min rest', t:'I', eq:BAG_ONLY },
  { id:'I1.4', p:'5 rounds heavy bag, 3 min, 1 min rest', t:'R', eq:BAG_ONLY },
  { id:'I1.5', p:'5 rounds heavy bag, 3 min, 1 min rest', t:'P', eq:BAG_ONLY },
  // CATEGORY J
  { id:'J1.1', p:'6 rounds shadowboxing, 2 min, 30 sec rest', t:'B', eq:NO_EQUIP },
  { id:'J1.2', p:'8 rounds heavy bag, 3 min, 1 min rest', t:'I', eq:BAG_ONLY },
  { id:'J1.3', p:'10 rounds heavy bag, 3 min, 1 min rest', t:'A', eq:BAG_ONLY },
  { id:'J1.7', p:'5 rounds shadowboxing, 2 min, 30 sec rest', t:'B', eq:NO_EQUIP },
  { id:'J1.8', p:'6 rounds heavy bag, 3 min, 1 min rest', t:'I', eq:BAG_ONLY },
  { id:'J1.9', p:'8 rounds heavy bag, 3 min, 1 min rest', t:'A', eq:BAG_ONLY },
  { id:'J1.10', p:'5 rounds heavy bag, 3 min, 1 min rest, focus on body shots', t:'A', eq:BAG_ONLY },
  { id:'J1.11', p:'5 rounds heavy bag, focus on counter punching', t:'A', eq:BAG_ONLY },
  // CATEGORY K
  { id:'K1.1', p:'Light 15 minutes', t:'B', eq:NO_EQUIP },
  { id:'K1.2', p:'Quick 10 minutes', t:'B', eq:NO_EQUIP },
  { id:'K1.4', p:'30 minute treadmill run', t:'I', eq:FULL_GYM },
  { id:'K1.8', p:'5 rounds heavy bag 3 min 1 min rest. Then 10 min treadmill.', t:'I', eq:FULL_GYM },
  { id:'K1.10', p:"I'm tired today, give me something light", t:'I', eq:BAG_ONLY },
  // CATEGORY L
  { id:'L1.1', p:'Just a warmup, 5 minutes', t:'B', eq:FULL_GYM },
  { id:'L1.2', p:'Just a cooldown, 5 minutes of stretching', t:'I', eq:NO_EQUIP },
  { id:'L1.3', p:'Warmup only, jump rope and dynamic stretches', t:'I', eq:FULL_GYM },
  // CATEGORY M
  { id:'M1.1', p:'yo gimme sum heat 🔥💪 like 6 rnds or whatever heavy bag idrc', t:'A', eq:BAG_ONLY },
  { id:'M1.2', p:'4 roudns hevy bag, 2 minuts eech, 30 sconds restt', t:'I', eq:BAG_ONLY },
  { id:'M1.3', p:'five rounds of shadow boxing two minutes each thirty seconds of rest between rounds', t:'I', eq:NO_EQUIP },
  { id:'M1.4', p:"I'm tired today, give me something light but keep my hands sharp", t:'I', eq:BAG_ONLY },
  { id:'M1.5', p:'Feeling great, lets go hard today, give me everything you got', t:'A', eq:FULL_GYM },
  { id:'M1.7', p:'Something to work on my hooks', t:'I', eq:BAG_ONLY },
  { id:'M1.11', p:'Tabata boxing, 8 rounds', t:'I', eq:BAG_ONLY },
  { id:'M1.13', p:'Surprise me', t:'I', eq:BAG_ONLY },
  { id:'M1.14', p:'5 rondas de saco pesado, 3 minutos, 1 minuto descanso', t:'I', eq:BAG_ONLY },
  { id:'M1.17', p:'bag work', t:'I', eq:BAG_ONLY },
  { id:'M1.18', p:'I want to do a really intense boxing session today. Start me off with some jump rope to warm up my calves and get my heart rate going, maybe like 3 minutes. Then do some dynamic stretching. After that I want to hit the heavy bag hard, like 6 rounds of 3 minutes each with 1 minute rest between rounds. Give me progressively harder combos starting simple and building up. After the heavy bag, throw in some speed bag work, like 2 rounds of 2 minutes with 30 second rest. Then finish me off with a cooldown of light shadowboxing and stretching.', t:'A', eq:FULL_GYM },
  // CATEGORY N — The Monster
  { id:'N1.1', p:`1 round warm up, 3 minutes, no rest. Dynamic stretches.\n\n3 rounds shadowboxing, 2 minutes each, 30 sec rest. Round 1: jab cross hook. Round 2: double jab cross uppercut. Round 3: 1-2-3-6-3-2.\n\n2 rounds speed bag, 2 minutes each, 30 sec rest. Round 1: doubles. Round 2: fist rolls.\n\n3 rounds superset: heavy bag 2 minutes and burpees 1 minute. 45 sec rest between rounds. Round 1: 1-2. Round 2: 1-2-3. Round 3: 1-1-2-3-2.\n\n3 rounds conditioning, 45 seconds each, 20 sec rest. Round 1: plank. Round 2: jumping lunges. Round 3: squat jumps.\n\n1 round cool down, 3 minutes, no rest. Foam rolling.`, t:'I', eq:FULL_GYM },
];

// ─── Fire all API calls concurrently ─────────────────────────────────────────

console.log(`\nFiring ${API_TESTS.length} API calls concurrently...\n`);
const responses = await Promise.all(API_TESTS.map(tc => api(tc.p, tc.t, tc.eq)));
const R = {}; // id → response
API_TESTS.forEach((tc, i) => { R[tc.id] = responses[i]; });

// ─── Checkpoint evaluations ───────────────────────────────────────────────────

const RESULTS = [];

function test(id, fn) {
  const r = R[id];
  const checks = [];
  const log = (cid, ok, exp, act) => {
    checks.push({ cid, ok, exp:String(exp), act:String(act??'') });
    chk(id, cid, ok, exp, act);
  };
  if (!r) { log(id+':MISSING', false, 'response', 'none'); }
  else if (r.error && r.fallback) { log(id+':API_ERR', false, 'valid response', r.error); }
  else { fn(r, log); }
  RESULTS.push({ id, checks, r });
}

// ── A: Phases vs Rounds ──────────────────────────────────────────────────────

test('A1.1', (r,l) => {
  const g=grind(r); const ph=g[0]; const a=active(ph)[0]; const rs=rest(ph)[0];
  l('A1',  !r.fallback&&Array.isArray(r.phases), 'valid JSON', r.error||'ok');
  l('A2',  !r.fallback, 'no fallback', r.fallback);
  l('A3',  phases(r).length===1, 1, phases(r).length);
  l('A4',  ph?.section==='grind', 'grind', ph?.section);
  l('A5',  ph?.repeats===5, 5, ph?.repeats);
  l('A6',  segs(ph).length===2, 2, segs(ph).length);
  l('A7',  a?.segmentType==='combo', 'combo', a?.segmentType);
  l('A8',  a?.duration===180, 180, a?.duration);
  l('A9',  rs?.segmentType==='rest'||rs?.type==='rest', 'rest', rs?.segmentType);
  l('A10', rs?.duration===60, 60, rs?.duration);
  l('A11', ph?.combos?.length===5, 5, ph?.combos?.length);
  l('A12', r.difficulty==='intermediate', 'intermediate', r.difficulty);
  l('A13', r.megasetRepeats===1, 1, r.megasetRepeats);
  l('A14', r.hasWarmup===false, false, r.hasWarmup);
  l('A15', r.hasCooldown===false, false, r.hasCooldown);
});

test('A1.2', (r,l) => {
  const ph=phases(r)[0]; const a=active(ph)[0]; const rs=rest(ph)[0];
  l('A16', phases(r).length===1, 1, phases(r).length);
  l('A17', ph?.repeats===8, 8, ph?.repeats);
  l('A18', a?.duration===120, 120, a?.duration);
  l('A19', rs?.duration===45, 45, rs?.duration);
  l('A20', ph?.combos?.length===8, 8, ph?.combos?.length);
});

test('A1.3', (r,l) => {
  const ps=phases(r); const p1=ps[0]; const p2=ps[1];
  l('A21', ps.length===2, 2, ps.length);
  l('A22', ps.every(p=>p.section==='grind'), 'all grind', ps.map(p=>p.section).join(','));
  l('A23', p1?.repeats===3, 3, p1?.repeats);
  l('A24', active(p1)[0]?.segmentType==='shadowboxing', 'shadowboxing', active(p1)[0]?.segmentType);
  l('A25', active(p1)[0]?.duration===120, 120, active(p1)[0]?.duration);
  l('A26', rest(p1)[0]?.duration===30, 30, rest(p1)[0]?.duration);
  l('A27', p2?.repeats===4, 4, p2?.repeats);
  l('A28', active(p2)[0]?.segmentType==='combo', 'combo', active(p2)[0]?.segmentType);
  l('A29', active(p2)[0]?.duration===180, 180, active(p2)[0]?.duration);
  l('A30', rest(p2)[0]?.duration===60, 60, rest(p2)[0]?.duration);
});

test('A1.4', (r,l) => {
  const ps=phases(r); const ph=ps[0]; const rs=rest(ph)[0];
  l('A31', ps.length===1, 1, ps.length);
  l('A32', ph?.repeats===1, 1, ph?.repeats);
  l('A33', ph?.combos?.length===1, 1, ph?.combos?.length);
  l('A34', !rs||rs.duration===0, 'no rest or 0', rs?.duration);
});

test('A1.5', (r,l) => {
  const ph=phases(r)[0]; const cs=ph?.combos||[]; const u=new Set(cs.map(c=>JSON.stringify(c)));
  l('A35', phases(r).length===1, 1, phases(r).length);
  l('A36', ph?.repeats===12, 12, ph?.repeats);
  l('A37', cs.length===12, 12, cs.length);
  l('A38', active(ph)[0]?.duration===180, 180, active(ph)[0]?.duration);
  l('A39', rest(ph)[0]?.duration===60, 60, rest(ph)[0]?.duration);
  l('A40', u.size===cs.length, 'all unique', `${u.size}/${cs.length}`);
});

// ── B: Combo Format ──────────────────────────────────────────────────────────

test('B1.1', (r,l) => {
  const cs=phases(r)[0]?.combos||[];
  l('B1', JSON.stringify(cs[0])==='["1","2","3"]', '["1","2","3"]', JSON.stringify(cs[0]));
  l('B2', JSON.stringify(cs[1])==='["1","2","SLIP L","3"]', '["1","2","SLIP L","3"]', JSON.stringify(cs[1]));
  l('B3', JSON.stringify(cs[2])==='["1","1","2","3","2"]', '["1","1","2","3","2"]', JSON.stringify(cs[2]));
  l('B4', noHyphen(cs), 'no hyphen-joined', 'check');
  l('B5', cs.every(c=>c.every(t=>!t.match(/^\d \d/))), 'no space-joined nums', 'check');
});

test('B1.2', (r,l) => {
  const cs=phases(r)[0]?.combos||[];
  l('B6',  JSON.stringify(cs[0])==='["1","2","3"]', '["1","2","3"]', JSON.stringify(cs[0]));
  l('B7',  JSON.stringify(cs[1])==='["1","1","2","5"]', '["1","1","2","5"]', JSON.stringify(cs[1]));
  l('B8',  JSON.stringify(cs[2])==='["1","2","7"]', '["1","2","7"]', JSON.stringify(cs[2]));
  l('B9',  allValidTokens(cs), 'all valid tokens', 'check');
  l('B10', cs.every(c=>c.every(t=>/^[1-8]$/.test(t)||VALID.has(t))), 'no word tokens', 'check');
});

test('B1.3', (r,l) => {
  const ph=phases(r)[0]; const cs=ph?.combos||[];
  l('B11', cs[0]?.[0]?.toLowerCase().includes('double'), 'Doubles', JSON.stringify(cs[0]));
  l('B12', cs[1]?.[0]?.toLowerCase().includes('triple'), 'Triples', JSON.stringify(cs[1]));
  l('B13', cs[2]?.[0]?.toLowerCase().includes('fist roll'), 'Fist Rolls', JSON.stringify(cs[2]));
  l('B14', segs(ph).some(s=>s.segmentType==='speedbag'), 'speedbag seg', 'check');
  l('B15', cs.every(c=>!c.every(t=>/^[1-8]$/.test(t))), 'not punch numbers', 'check');
});

test('B1.4', (r,l) => {
  const ph=phases(r)[0]; const cs=ph?.combos||[];
  l('B16', cs[0]?.[0]?.toLowerCase().includes('burpee'), 'Burpees', JSON.stringify(cs[0]));
  l('B17', cs[1]?.[0]?.toLowerCase().includes('mountain'), 'Mountain Climbers', JSON.stringify(cs[1]));
  l('B18', cs[2]?.[0]?.toLowerCase().includes('squat'), 'Squat Jumps', JSON.stringify(cs[2]));
  l('B19', segs(ph).some(s=>s.segmentType==='exercise'), 'exercise seg', segs(ph).map(s=>s.segmentType).join(','));
  l('B20', cs.every(c=>c.every(t=>t===t.charAt(0).toUpperCase()+t.slice(1).toLowerCase()||/^[A-Z][a-zA-Z\s-]*$/.test(t))), 'Title Case', cs.map(c=>JSON.stringify(c)).join(','));
});

test('B1.5', (r,l) => {
  const cs=phases(r)[0]?.combos||[];
  l('B21', JSON.stringify(cs[0])==='["1","2"]', '["1","2"]', JSON.stringify(cs[0]));
  l('B22', JSON.stringify(cs[1])==='["1","2","SLIP L","3"]', '["1","2","SLIP L","3"]', JSON.stringify(cs[1]));
  l('B23', JSON.stringify(cs[2])==='["1","2","ROLL R","3","2"]', '["1","2","ROLL R","3","2"]', JSON.stringify(cs[2]));
  l('B24', JSON.stringify(cs[3])==='["1","2","3","DUCK","2","3"]', '["1","2","3","DUCK","2","3"]', JSON.stringify(cs[3]));
  l('B25', JSON.stringify(cs[4])==='["1","2","SLIP L","3","ROLL R","2","3","2"]', '8-token', JSON.stringify(cs[4]));
  l('B26', cs.some(c=>c.includes('SLIP L')), '"SLIP L" as one token', 'check');
  l('B27', cs.some(c=>c.includes('ROLL R')), '"ROLL R" as one token', 'check');
  l('B28', cs.some(c=>c.includes('DUCK')), '"DUCK" present', 'check');
  l('B29', allValidTokens(cs), 'all valid tokens', 'check');
  l('B30', (cs[0]?.length||0)<(cs[4]?.length||0), 'progressive length', `${cs[0]?.length}→${cs[4]?.length}`);
});

test('B1.7', (r,l) => {
  const ph=phases(r)[0]; const cs=ph?.combos||[];
  l('B35', cs.length===5, 5, cs.length);
  l('B36', cs.every(c=>JSON.stringify(c)==='["FREESTYLE"]'), 'all FREESTYLE', cs.map(c=>JSON.stringify(c)).join(','));
  l('B37', cs.every(c=>!c.some(t=>/^[1-8]$/.test(t))), 'no punch numbers', 'check');
  l('B38', ph?.comboOrder==='sequential', 'sequential', ph?.comboOrder);
});

test('B1.8', (r,l) => {
  const cs=phases(r)[0]?.combos||[];
  l('B39', JSON.stringify(cs[0])==='["1","2","3"]', '["1","2","3"]', JSON.stringify(cs[0]));
  l('B40', JSON.stringify(cs[1])==='["FREESTYLE"]', '["FREESTYLE"]', JSON.stringify(cs[1]));
});

// ── C: Combos on Boxing Phases ───────────────────────────────────────────────

test('C1.1', (r,l) => {
  const ph=grind(r)[0];
  l('C1', ph?.combos?.length===6, 6, ph?.combos?.length);
  l('C2', ph?.repeats===6, 6, ph?.repeats);
  l('C3', ph?.combos?.length===ph?.repeats, 'equal', `${ph?.combos?.length}/${ph?.repeats}`);
  l('C4', ph?.comboOrder==='sequential', 'sequential', ph?.comboOrder);
});

test('C1.2', (r,l) => {
  const ph=grind(r)[0]; const cs=ph?.combos||[];
  l('C5', active(ph)[0]?.segmentType==='shadowboxing', 'shadowboxing', active(ph)[0]?.segmentType);
  l('C6', cs.length===4, 4, cs.length);
  l('C7', cs.every(c=>c.every(t=>!(/^[1-8]$/.test(t))||+t<=4)), 'only 1-4', cs.map(c=>JSON.stringify(c)).join(','));
  l('C8', cs.every(c=>c.filter(t=>/^[1-8]$/.test(t)||VALID.has(t)).length>=2&&c.length<=4), '2-4 len', cs.map(c=>c.length).join(','));
});

test('C1.3', (r,l) => {
  const ph=grind(r)[0]; const cs=ph?.combos||[];
  l('C9',  cs.length===4, 4, cs.length);
  l('C10', cs.every(c=>JSON.stringify(c)==='["FREESTYLE"]'), 'all FREESTYLE', cs.map(c=>JSON.stringify(c)).join(','));
});

test('C1.4', (r,l) => {
  const ph=grind(r)[0]; const cs=ph?.combos||[];
  const u=new Set(cs.map(c=>JSON.stringify(c)));
  l('C11', cs.length===5, 5, cs.length);
  l('C12', allValidTokens(cs), 'valid tokens', 'check');
  l('C13', u.size===cs.length, 'all unique', `${u.size}/${cs.length}`);
  l('C14', cs.some(c=>c.some(t=>/^[5-8]$/.test(t))), 'has punch>4', cs.map(c=>JSON.stringify(c)).join('|'));
  l('C15', cs.some(c=>c.length>=5), 'has 5+ tokens', cs.map(c=>c.length).join(','));
  l('C16', (cs[0]?.length||99)<=(cs[cs.length-1]?.length||0), 'progressive', `${cs[0]?.length}→${cs[cs.length-1]?.length}`);
});

test('C1.5', (r,l) => {
  const cs=grind(r)[0]?.combos||[];
  l('C17', JSON.stringify(cs[0])==='["1","2"]', '["1","2"]', JSON.stringify(cs[0]));
  l('C18', JSON.stringify(cs[1])==='["1","2","3"]', '["1","2","3"]', JSON.stringify(cs[1]));
  l('C19', JSON.stringify(cs[2])==='["1","2","3","2"]', '["1","2","3","2"]', JSON.stringify(cs[2]));
  l('C20', cs.length===3, 3, cs.length);
});

// ── D: Warmup & Cooldown ─────────────────────────────────────────────────────

test('D1.1', (r,l) => {
  l('D1', r.hasWarmup===false, false, r.hasWarmup);
  l('D2', r.hasCooldown===false, false, r.hasCooldown);
  l('D3', warmup(r).length===0, 0, warmup(r).length);
  l('D4', cooldown(r).length===0, 0, cooldown(r).length);
  l('D5', phases(r).every(p=>p.section==='grind'), 'all grind', phases(r).map(p=>p.section).join(','));
});

test('D1.2', (r,l) => {
  l('D6', r.hasWarmup===true, true, r.hasWarmup);
  l('D7', r.hasCooldown===true, true, r.hasCooldown);
  l('D8', warmup(r).length>0, '>0', warmup(r).length);
  l('D9', grind(r).length>0, '>0', grind(r).length);
  l('D10', cooldown(r).length>0, '>0', cooldown(r).length);
});

test('D1.3', (r,l) => {
  l('D11', warmup(r).length>0||r.hasWarmup===true, 'has warmup', warmup(r).length);
  l('D12', grind(r).length>0, 'has grind', grind(r).length);
  l('D13', cooldown(r).length>0||r.hasCooldown===true, 'has cooldown', cooldown(r).length);
});

test('D1.4', (r,l) => {
  const wsegs = warmup(r).flatMap(p=>segs(p));
  const hasJR = wsegs.some(s=>(s.name||'').toLowerCase().includes('jump rope'));
  const lastW = wsegs[wsegs.length-1];
  const hasGetReady = lastW?.name?.toLowerCase().includes('get ready') && lastW?.duration===30;
  l('D14', warmup(r).length>0&&hasJR, 'warmup+jump rope', `wu:${warmup(r).length} jr:${hasJR}`);
  l('D15', grind(r).length>0, 'grind exists', grind(r).length);
  l('D16', cooldown(r).length>0, 'cooldown exists', cooldown(r).length);
  l('D17', hasGetReady, '"Get Ready" 30s end of warmup', JSON.stringify(lastW));
});

test('D1.5', (r,l) => {
  l('D18', r.hasWarmup===false, false, r.hasWarmup);
  l('D19', warmup(r).length===0, 0, warmup(r).length);
  l('D20', grind(r).length>0, 'grind exists', grind(r).length);
});

test('D1.6', (r,l) => {
  l('D22', r.hasCooldown===false, false, r.hasCooldown);
  l('D23', warmup(r).length>0||r.hasWarmup===true, 'warmup exists', warmup(r).length);
  l('D24', grind(r).length>0, 'grind exists', grind(r).length);
  l('D25', cooldown(r).length===0, 0, cooldown(r).length);
});

test('D1.7', (r,l) => {
  const wsegs=warmup(r).flatMap(p=>segs(p));
  const hasJR=wsegs.some(s=>(s.name||'').toLowerCase().includes('jump rope'));
  const hasAlt=wsegs.some(s=>/(high knee|jumping jack)/i.test(s.name||''));
  const gsegs=grind(r).flatMap(p=>active(p));
  l('D26', warmup(r).length>0, 'warmup exists', warmup(r).length);
  l('D27', !hasJR, 'no jump rope', hasJR);
  l('D28', hasAlt, 'high knees or jumping jacks', wsegs.map(s=>s.name).join(','));
  l('D29', gsegs.every(s=>s.segmentType==='shadowboxing'), 'all shadowboxing', gsegs.map(s=>s.segmentType).join(','));
});

test('D1.8', (r,l) => {
  const wsegs=warmup(r).flatMap(p=>segs(p));
  const csegs=cooldown(r).flatMap(p=>segs(p));
  const lastW=wsegs[wsegs.length-1];
  const firstC=csegs[0];
  l('D30', lastW?.name?.toLowerCase().includes('get ready')&&lastW?.duration===30, '"Get Ready" 30s', JSON.stringify(lastW));
  l('D31', firstC?.name?.toLowerCase().includes('recovery')&&firstC?.duration===30, '"Recovery" 30s', JSON.stringify(firstC));
  l('D32', wsegs.length>=2, '>=2 warmup segs', wsegs.length);
  l('D33', csegs.length>=2, '>=2 cooldown segs', csegs.length);
});

test('D1.9', (r,l) => {
  const csegs=cooldown(r).flatMap(p=>segs(p));
  const firstC=csegs[0];
  l('D34', warmup(r).length===0, 0, warmup(r).length);
  l('D35', !phases(r).flatMap(p=>segs(p)).some(s=>s.name?.toLowerCase().includes('get ready')), 'no Get Ready', 'check');
  l('D36', firstC?.name?.toLowerCase().includes('recovery')&&firstC?.duration===30, '"Recovery" 30s', JSON.stringify(firstC));
});

test('D1.10', (r,l) => {
  const wsegs=warmup(r).flatMap(p=>segs(p));
  const lastW=wsegs[wsegs.length-1];
  l('D37', lastW?.name?.toLowerCase().includes('get ready')&&lastW?.duration===30, '"Get Ready" 30s', JSON.stringify(lastW));
  l('D38', cooldown(r).length===0, 0, cooldown(r).length);
  l('D39', !phases(r).flatMap(p=>segs(p)).some(s=>s.name?.toLowerCase().includes('recovery')), 'no Recovery', 'check');
  l('D40', phases(r).length===2, 2, phases(r).length);
});

// ── E: Duration Format ───────────────────────────────────────────────────────

test('E1.1', (r,l) => {
  const ph=phases(r)[0];
  l('E1', active(ph)[0]?.duration===180, 180, active(ph)[0]?.duration);
  l('E2', rest(ph)[0]?.duration===60, 60, rest(ph)[0]?.duration);
});

test('E1.2', (r,l) => {
  const ph=phases(r)[0];
  l('E3', active(ph)[0]?.duration===90, 90, active(ph)[0]?.duration);
  l('E4', rest(ph)[0]?.duration===45, 45, rest(ph)[0]?.duration);
});

test('E1.3', (r,l) => {
  const ph=phases(r)[0];
  l('E5', active(ph)[0]?.duration===90, 90, active(ph)[0]?.duration);
  l('E6', rest(ph)[0]?.duration===30, 30, rest(ph)[0]?.duration);
});

test('E1.4', (r,l) => {
  const ph=phases(r)[0];
  l('E7', active(ph)[0]?.duration===120, 120, active(ph)[0]?.duration);
  l('E8', rest(ph)[0]?.duration===30, 30, rest(ph)[0]?.duration);
  l('E9', ph?.repeats===5, 5, ph?.repeats);
});

test('E1.7', (r,l) => {
  l('E14', active(phases(r)[0])[0]?.duration===150, 150, active(phases(r)[0])[0]?.duration);
});

test('E1.9', (r,l) => {
  const ph=phases(r)[0];
  l('E18', active(ph)[0]?.duration===150, 150, active(ph)[0]?.duration);
  l('E19', rest(ph)[0]?.duration===45, 45, rest(ph)[0]?.duration);
});

// ── F: Supersets ─────────────────────────────────────────────────────────────

test('F1.1', (r,l) => {
  const g=grind(r); const ph=g[0]; const acts=active(ph); const rs=rest(ph);
  l('F1', g.length===1, 1, g.length);
  l('F2', segs(ph).length===3, 3, segs(ph).length);
  l('F3', acts[0]?.segmentType==='combo'&&acts[0]?.duration===120, 'combo 120', `${acts[0]?.segmentType} ${acts[0]?.duration}`);
  l('F4', acts[1]?.segmentType==='exercise'&&(acts[1]?.name||'').toLowerCase().includes('burpee')&&acts[1]?.duration===60, 'exercise burpees 60', `${acts[1]?.segmentType} ${acts[1]?.name} ${acts[1]?.duration}`);
  l('F5', rs[0]?.duration===45, 45, rs[0]?.duration);
  l('F6', ph?.repeats===3, 3, ph?.repeats);
  l('F7', ph?.combos?.length>0, 'has combos', ph?.combos?.length);
});

test('F1.2', (r,l) => {
  const ph=grind(r)[0]; const cs=ph?.combos||[];
  l('F8', JSON.stringify(cs)==='[["1","2"],["1","2","3"],["1","1","2","3","2"]]', 'exact combos', JSON.stringify(cs));
  l('F9', !(ph?.name||'').includes('Round 1'), 'no "Round 1" in name', ph?.name);
});

test('F1.4', (r,l) => {
  const ph=grind(r)[0]; const acts=active(ph); const rs=rest(ph);
  l('F16', segs(ph).length===4, 4, segs(ph).length);
  l('F17', acts[0]?.segmentType==='combo'&&acts[0]?.duration===120, 'combo 120', `${acts[0]?.segmentType} ${acts[0]?.duration}`);
  l('F18', (acts[1]?.name||'').toLowerCase().includes('push')&&acts[1]?.duration===30, 'push-ups 30', `${acts[1]?.name} ${acts[1]?.duration}`);
  l('F19', (acts[2]?.name||'').toLowerCase().includes('jump')&&acts[2]?.duration===30, 'jumping jacks 30', `${acts[2]?.name} ${acts[2]?.duration}`);
  l('F20', rs[0]?.duration===60, 60, rs[0]?.duration);
});

test('F1.6', (r,l) => {
  const ph=grind(r)[0]; const acts=active(ph);
  l('F26', acts[0]?.duration===90, 90, acts[0]?.duration);
  l('F27', acts[1]?.duration===45, 45, acts[1]?.duration);
  l('F28', acts[0]?.duration!==acts[1]?.duration, 'not equal', `${acts[0]?.duration} vs ${acts[1]?.duration}`);
});

// ── G: Equipment ─────────────────────────────────────────────────────────────

test('G1.1', (r,l) => {
  const ph=grind(r)[0]; const cs=ph?.combos||[];
  l('G1', active(ph)[0]?.segmentType==='shadowboxing', 'shadowboxing', active(ph)[0]?.segmentType);
  l('G2', cs.length>0, 'has combos', cs.length);
  l('G3', cs.length===5, 5, cs.length);
  l('G4', (active(ph)[0]?.name||'').toLowerCase().includes('shadow'), 'shadow in name', active(ph)[0]?.name);
});

test('G1.2', (r,l) => {
  const ph=grind(r)[0];
  l('G5', active(ph)[0]?.segmentType==='combo', 'combo', active(ph)[0]?.segmentType);
  l('G6', (active(ph)[0]?.name||'').toLowerCase().includes('heavy bag'), 'Heavy Bag', active(ph)[0]?.name);
});

test('G1.3', (r,l) => {
  const ph=grind(r)[0];
  l('G7', active(ph)[0]?.segmentType!=='speedbag', 'not speedbag', active(ph)[0]?.segmentType);
  l('G8', !r.error, 'no error', r.error);
  l('G9', !r.fallback, 'no crash', r.fallback);
});

test('G1.4', (r,l) => {
  const ph=grind(r)[0];
  l('G10', active(ph)[0]?.segmentType==='doubleend', 'doubleend', active(ph)[0]?.segmentType);
  l('G11', ph?.combos?.length===3, 3, ph?.combos?.length);
  l('G12', (active(ph)[0]?.name||'').toLowerCase().includes('double'), 'Double End', active(ph)[0]?.name);
});

test('G1.5', (r,l) => {
  const gs=grind(r);
  l('G13', active(gs[0])[0]?.segmentType==='speedbag', 'speedbag', active(gs[0])[0]?.segmentType);
  l('G14', active(gs[1])[0]?.segmentType==='combo', 'combo', active(gs[1])[0]?.segmentType);
  l('G15', active(gs[2])[0]?.segmentType==='doubleend', 'doubleend', active(gs[2])[0]?.segmentType);
  l('G16', gs.length===3, 3, gs.length);
});

test('G1.7', (r,l) => {
  l('G20', active(grind(r)[0])[0]?.segmentType==='shadowboxing', 'shadowboxing', active(grind(r)[0])[0]?.segmentType);
});

// ── H: Megaset Repeats ───────────────────────────────────────────────────────

test('H1.1', (r,l) => { l('H1', r.megasetRepeats===1, 1, r.megasetRepeats); });
test('H1.2', (r,l) => {
  l('H2', r.megasetRepeats===2, 2, r.megasetRepeats);
  l('H3', grind(r).length===1, 1, grind(r).length);
});
test('H1.3', (r,l) => { l('H5', r.megasetRepeats===2, 2, r.megasetRepeats); });
test('H1.5', (r,l) => { l('H7', r.megasetRepeats===3, 3, r.megasetRepeats); });
test('H1.6', (r,l) => {
  l('H8', r.megasetRepeats===10, 10, r.megasetRepeats);
  l('H9', !r.error, 'no error', r.error);
});

// ── I: Difficulty Override ───────────────────────────────────────────────────

test('I1.1', (r,l) => {
  const cs=grind(r)[0]?.combos||[];
  l('I1', r.difficulty==='beginner', 'beginner', r.difficulty);
  l('I2', cs.every(c=>c.every(t=>!(/^[1-8]$/.test(t))||+t<=4)), 'only 1-4', cs.map(c=>JSON.stringify(c)).join('|'));
  l('I3', cs.every(c=>c.length<=4), 'max 4', cs.map(c=>c.length).join(','));
  l('I4', cs.every(c=>!hasDefense(c)), 'no defense', 'check');
});

test('I1.2', (r,l) => {
  const cs=grind(r)[0]?.combos||[];
  l('I5', r.difficulty==='advanced', 'advanced', r.difficulty);
  l('I6', cs.some(c=>c.some(t=>/^[5-8]$/.test(t))), 'has 5-8', cs.map(c=>JSON.stringify(c)).join('|'));
  l('I7', cs.some(c=>hasDefense(c)), 'has defense', 'check');
});

test('I1.3', (r,l) => { l('I8', r.difficulty==='intermediate', 'intermediate', r.difficulty); });
test('I1.4', (r,l) => {
  const cs=grind(r)[0]?.combos||[];
  l('I9',  r.difficulty==='beginner', 'beginner', r.difficulty);
  l('I10', cs.every(c=>c.every(t=>!(/^[1-8]$/.test(t))||+t<=4)), 'only 1-4', 'check');
});
test('I1.5', (r,l) => {
  const cs=grind(r)[0]?.combos||[];
  l('I11', r.difficulty==='advanced', 'advanced', r.difficulty);
  l('I12', cs.some(c=>c.some(t=>/^[5-8]$/.test(t))), 'has 5-8', 'check');
});

// ── J: Combo Quality ─────────────────────────────────────────────────────────

test('J1.1', (r,l) => {
  const cs=grind(r)[0]?.combos||[]; const u=new Set(cs.map(c=>JSON.stringify(c)));
  l('J1', (cs[0]?.length||99)<=(cs[cs.length-1]?.length||0), 'progressive', `${cs[0]?.length}→${cs[cs.length-1]?.length}`);
  l('J2', cs[0]?.length===2, 2, cs[0]?.length);
  l('J3', (cs[cs.length-1]?.length||0)>=3&&(cs[cs.length-1]?.length||0)<=4, '3-4', cs[cs.length-1]?.length);
  l('J4', cs.every(c=>c.every(t=>!(/^[1-8]$/.test(t))||+t<=4)), 'only 1-4', 'check');
  l('J5', u.size>=3, '>=3 unique', u.size);
});

test('J1.2', (r,l) => {
  const cs=grind(r)[0]?.combos||[]; const u=new Set(cs.map(c=>JSON.stringify(c)));
  l('J6',  (cs[0]?.length||99)<(cs[7]?.length||0), 'first < last', `${cs[0]?.length}→${cs[7]?.length}`);
  l('J7',  cs.some(c=>hasSlipRoll(c)), 'has SLIP/ROLL', 'check');
  l('J8',  cs.every(c=>c.length>=3&&c.length<=5), '3-5 len', cs.map(c=>c.length).join(','));
  l('J9',  u.size>=6, '>=6 unique', u.size);
  l('J10', cs.some(c=>c.some(t=>t==='5'||t==='6')), 'has 5 or 6', 'check');
});

test('J1.3', (r,l) => {
  const cs=grind(r)[0]?.combos||[]; const u=new Set(cs.map(c=>JSON.stringify(c)));
  l('J11', (cs[0]?.length||99)<(cs[9]?.length||0), 'first < last', `${cs[0]?.length}→${cs[9]?.length}`);
  l('J12', (cs[9]?.length||0)>=6, '6-8 tokens last', cs[9]?.length);
  l('J13', cs.some(c=>hasDefense(c)), 'has defense', 'check');
  l('J14', cs.some(c=>hasMovement(c)), 'has movement', 'check');
  l('J15', cs.some(c=>c.includes('7')||c.includes('8')), 'has 7 or 8', 'check');
  l('J16', u.size>=8, '>=8 unique', u.size);
  l('J17', new Set(cs.map(c=>c[0])).size>1, 'varied openers', cs.map(c=>c[0]).join(','));
});

test('J1.7', (r,l) => {
  const cs=grind(r)[0]?.combos||[];
  l('J26', cs.every(c=>!c.some(t=>/^[5-8]$/.test(t))), 'no 5-8', 'check');
  l('J27', cs.every(c=>!hasDefense(c)), 'no defense', 'check');
  l('J28', cs.every(c=>!hasMovement(c)), 'no movement', 'check');
  l('J29', cs.every(c=>c.length>=2&&c.length<=4), '2-4 len', cs.map(c=>c.length).join(','));
  l('J30', cs.every(c=>c.every(t=>['1','2','3','4','FREESTYLE'].includes(t))), 'only 1-4', cs.map(c=>JSON.stringify(c)).join('|'));
});

test('J1.8', (r,l) => {
  const cs=grind(r)[0]?.combos||[];
  l('J31', cs.some(c=>c.includes('SLIP L')||c.includes('SLIP R')), 'has SLIP', 'check');
  l('J32', cs.some(c=>c.includes('ROLL L')||c.includes('ROLL R')), 'has ROLL', 'check');
  l('J33', cs.every(c=>!c.some(t=>ADV_MOVES.includes(t))), 'no adv moves', cs.map(c=>JSON.stringify(c)).join('|'));
  l('J34', cs.every(c=>!c.some(t=>t==='7'||t==='8')), 'no 7-8', 'check');
});

test('J1.9', (r,l) => {
  const cs=grind(r)[0]?.combos||[]; const u=new Set(cs.map(c=>JSON.stringify(c)));
  l('J35', cs.some(c=>c.includes('7')), 'has 7', 'check');
  l('J36', cs.some(c=>c.includes('8')), 'has 8', 'check');
  l('J37', cs.some(c=>c.includes('DUCK')||c.includes('PULL')), 'has DUCK/PULL', 'check');
  l('J38', cs.some(c=>c.length>=6), '6+ tokens', cs.map(c=>c.length).join(','));
  l('J39', u.size>=7, '>=7 unique', u.size);
});

test('J1.10', (r,l) => {
  const cs=grind(r)[0]?.combos||[];
  l('J40', cs.filter(c=>c.includes('7')||c.includes('8')).length>=3, '>=3 body combos', cs.map(c=>JSON.stringify(c)).join('|'));
});

test('J1.11', (r,l) => {
  const cs=grind(r)[0]?.combos||[];
  const DEF_STARTERS=['SLIP L','SLIP R','ROLL L','ROLL R','DUCK','PULL'];
  l('J42', cs.filter(c=>DEF_STARTERS.includes(c[0])).length>=3, '>=3 counter combos', cs.map(c=>JSON.stringify(c)).join('|'));
  l('J43', cs.some(c=>DEF_STARTERS.includes(c[0])), 'defense at start', 'check');
});

// ── K: Round Structure ───────────────────────────────────────────────────────

test('K1.1', (r,l) => {
  const ph=grind(r)[0];
  l('K1', (ph?.repeats||0)>=3, '>=3', ph?.repeats);
  l('K2', (active(ph)[0]?.duration||999)<=180, '<=180', active(ph)[0]?.duration);
  l('K3', rest(ph).length>0, 'has rest', rest(ph).length);
});

test('K1.2', (r,l) => {
  const ph=grind(r)[0];
  l('K4', (ph?.repeats||0)>=3, '>=3', ph?.repeats);
  l('K5', (active(ph)[0]?.duration||999)<=120, '<=120', active(ph)[0]?.duration);
});

test('K1.4', (r,l) => {
  const allActs=phases(r).flatMap(p=>active(p));
  const longSeg=allActs.find(s=>s.duration>=1000);
  l('K10', !!longSeg, 'has long seg', `max:${Math.max(0,...allActs.map(s=>s.duration))}`);
});

test('K1.8', (r,l) => {
  const gs=grind(r);
  l('K15', gs[0]?.repeats===5, 5, gs[0]?.repeats);
  const treadmillSeg=gs[1]?.segments?.find(s=>s.type==='active'&&s.duration>=500);
  l('K16', !!treadmillSeg, 'treadmill long seg', treadmillSeg?.duration);
});

test('K1.10', (r,l) => {
  const ph=grind(r)[0];
  l('K20', (ph?.repeats||0)>=2, '>=2', ph?.repeats);
  l('K21', (active(ph)[0]?.duration||999)<=120, '<=120s', active(ph)[0]?.duration);
  l('K22', (rest(ph)[0]?.duration||0)>=45, '>=45s', rest(ph)[0]?.duration);
});

// ── L: Everything is Grind ───────────────────────────────────────────────────

test('L1.1', (r,l) => {
  l('L1', phases(r).every(p=>p.section==='grind'), 'all grind', phases(r).map(p=>p.section).join(','));
  l('L2', warmup(r).length===0, 0, warmup(r).length);
  l('L3', cooldown(r).length===0, 0, cooldown(r).length);
  l('L4', phases(r).length>0, 'has content', phases(r).length);
});

test('L1.2', (r,l) => {
  l('L5', phases(r).every(p=>p.section==='grind'), 'all grind', phases(r).map(p=>p.section).join(','));
  l('L6', grind(r).length>0, 'has grind', grind(r).length);
});

test('L1.3', (r,l) => {
  l('L7', phases(r).every(p=>p.section==='grind'), 'all grind', phases(r).map(p=>p.section).join(','));
  l('L8', phases(r).length>0, 'has content', phases(r).length);
});

// ── M: Vague/Creative ────────────────────────────────────────────────────────

test('M1.1', (r,l) => {
  const ph=grind(r)[0];
  l('M1', !r.fallback&&Array.isArray(r.phases), 'valid', r.error||'ok');
  l('M2', (ph?.repeats||0)>=5, '~6 rounds', ph?.repeats);
  l('M3', active(ph)[0]?.segmentType==='combo', 'combo', active(ph)[0]?.segmentType);
  l('M4', r.difficulty==='advanced', 'advanced', r.difficulty);
});

test('M1.2', (r,l) => {
  const ph=grind(r)[0];
  l('M5', !r.fallback&&Array.isArray(r.phases), 'valid', r.error||'ok');
  l('M6', ph?.repeats===4, 4, ph?.repeats);
  l('M7', active(ph)[0]?.duration===120, 120, active(ph)[0]?.duration);
  l('M8', rest(ph)[0]?.duration===30, 30, rest(ph)[0]?.duration);
});

test('M1.3', (r,l) => {
  const ph=grind(r)[0];
  l('M9',  ph?.repeats===5, 5, ph?.repeats);
  l('M10', active(ph)[0]?.segmentType==='shadowboxing', 'shadowboxing', active(ph)[0]?.segmentType);
  l('M11', active(ph)[0]?.duration===120, 120, active(ph)[0]?.duration);
  l('M12', rest(ph)[0]?.duration===30, 30, rest(ph)[0]?.duration);
});

test('M1.4', (r,l) => {
  const ph=grind(r)[0];
  l('M13', (active(ph)[0]?.duration||999)<=120, '<=120s', active(ph)[0]?.duration);
  l('M14', (rest(ph)[0]?.duration||0)>=45, '>=45s', rest(ph)[0]?.duration);
  l('M16', (ph?.combos?.length||0)>0, 'has combos', ph?.combos?.length);
});

test('M1.5', (r,l) => {
  const ph=grind(r)[0];
  l('M18', (active(ph)[0]?.duration||0)>=180, '>=180s', active(ph)[0]?.duration);
  l('M22', (ph?.repeats||0)>=5, '>=5 rounds', ph?.repeats);
});

test('M1.7', (r,l) => {
  const cs=grind(r)[0]?.combos||[];
  const hookCombos=cs.filter(c=>c.includes('3')||c.includes('4'));
  l('M27', hookCombos.length/cs.length>=0.6, '>=60% hooks', `${hookCombos.length}/${cs.length}`);
});

test('M1.11', (r,l) => {
  const ph=grind(r)[0];
  l('M37', ph?.repeats===8, 8, ph?.repeats);
  l('M38', (active(ph)[0]?.duration||999)<=25, '~20s', active(ph)[0]?.duration);
  l('M39', (rest(ph)[0]?.duration||999)<=15, '~10s', rest(ph)[0]?.duration);
});

test('M1.13', (r,l) => {
  const ph=grind(r)[0];
  l('M44', !r.fallback&&Array.isArray(r.phases), 'valid', r.error||'ok');
  l('M45', (ph?.combos?.length||0)>0, 'has combos', ph?.combos?.length);
  l('M46', (ph?.repeats||0)>=3&&(ph?.repeats||0)<=8, '3-8 rounds', ph?.repeats);
});

test('M1.14', (r,l) => {
  const ph=grind(r)[0];
  l('M47', !r.fallback&&Array.isArray(r.phases), 'valid', r.error||'ok');
  l('M48', ph?.repeats===5&&active(ph)[0]?.duration===180&&rest(ph)[0]?.duration===60, '5r/180s/60s', `${ph?.repeats}/${active(ph)[0]?.duration}/${rest(ph)[0]?.duration}`);
});

test('M1.17', (r,l) => {
  const ph=grind(r)[0];
  l('M53', !r.fallback&&Array.isArray(r.phases), 'valid', r.error||'ok');
  l('M54', (ph?.combos?.length||0)>0&&(ph?.repeats||0)>0, 'rounds+combos', `${ph?.repeats}/${ph?.combos?.length}`);
});

test('M1.18', (r,l) => {
  const gs=grind(r); const allPh=phases(r);
  l('M55', warmup(r).some(p=>segs(p).some(s=>(s.name||'').toLowerCase().includes('jump rope'))), 'warmup+jump rope', 'check');
  l('M56', gs.some(p=>active(p)[0]?.segmentType==='combo'&&p.repeats===6), '6-round heavy bag', gs.map(p=>p.repeats).join(','));
  l('M57', gs.some(p=>active(p)[0]?.segmentType==='speedbag'&&p.repeats===2), '2-round speed bag', gs.map(p=>p.repeats).join(','));
  l('M58', cooldown(r).length>0, 'has cooldown', cooldown(r).length);
  l('M60', allPh.length>=4, '>=4 phases', allPh.length);
});

// ── N: Full Regression ───────────────────────────────────────────────────────

test('N1.1', (r,l) => {
  const ps=phases(r);
  const wm=warmup(r); const cd=cooldown(r);
  const wsegs=wm.flatMap(p=>segs(p));
  const csegs=cd.flatMap(p=>segs(p));
  const lastW=wsegs[wsegs.length-1];
  const firstC=csegs[0];

  l('N1',  ps.length===6, 6, ps.length);
  l('N2',  ps[0]?.section==='warmup', 'warmup', ps[0]?.section);
  l('N3',  active(ps[0])[0]?.duration===180, 180, active(ps[0])[0]?.duration);

  const p2cs=ps[1]?.combos||[];
  l('N4',  active(ps[1])[0]?.segmentType==='shadowboxing'&&ps[1]?.repeats===3, 'shadow repeats=3', `${active(ps[1])[0]?.segmentType}/${ps[1]?.repeats}`);
  l('N5',  JSON.stringify(p2cs[0])==='["1","2","3"]', '["1","2","3"]', JSON.stringify(p2cs[0]));
  l('N6',  JSON.stringify(p2cs[1])==='["1","1","2","5"]', '["1","1","2","5"]', JSON.stringify(p2cs[1]));
  l('N7',  JSON.stringify(p2cs[2])==='["1","2","3","6","3","2"]', '["1","2","3","6","3","2"]', JSON.stringify(p2cs[2]));

  const p3cs=ps[2]?.combos||[];
  l('N8',  active(ps[2])[0]?.segmentType==='speedbag'&&ps[2]?.repeats===2, 'speedbag repeats=2', `${active(ps[2])[0]?.segmentType}/${ps[2]?.repeats}`);
  l('N9',  p3cs[0]?.[0]?.toLowerCase().includes('double'), 'Doubles', JSON.stringify(p3cs[0]));
  l('N10', p3cs[1]?.[0]?.toLowerCase().includes('fist roll'), 'Fist Rolls', JSON.stringify(p3cs[1]));

  l('N11', active(ps[3]).length>=2&&ps[3]?.repeats===3, 'superset repeats=3', `acts:${active(ps[3]).length}/${ps[3]?.repeats}`);
  l('N12', active(ps[3])[0]?.segmentType==='combo'&&active(ps[3])[0]?.duration===120, 'combo 120s', `${active(ps[3])[0]?.segmentType}/${active(ps[3])[0]?.duration}`);
  l('N13', active(ps[3])[1]?.segmentType==='exercise'&&active(ps[3])[1]?.duration===60, 'exercise 60s', `${active(ps[3])[1]?.segmentType}/${active(ps[3])[1]?.duration}`);
  l('N14', rest(ps[3])[0]?.duration===45, 45, rest(ps[3])[0]?.duration);
  l('N15', JSON.stringify(ps[3]?.combos)==='[["1","2"],["1","2","3"],["1","1","2","3","2"]]', 'exact combos', JSON.stringify(ps[3]?.combos));

  l('N17', active(ps[4])[0]?.segmentType==='exercise'&&ps[4]?.repeats===3, 'exercise repeats=3', `${active(ps[4])[0]?.segmentType}/${ps[4]?.repeats}`);
  l('N18', (ps[4]?.combos||[]).length===3, 3, (ps[4]?.combos||[]).length);
  l('N19', active(ps[4])[0]?.duration===45&&rest(ps[4])[0]?.duration===20, 'active=45 rest=20', `${active(ps[4])[0]?.duration}/${rest(ps[4])[0]?.duration}`);

  l('N20', ps[5]?.section==='cooldown', 'cooldown', ps[5]?.section);
  l('N21', active(ps[5])[0]?.duration===180, 180, active(ps[5])[0]?.duration);
  l('N22', r.hasWarmup===true, true, r.hasWarmup);
  l('N23', r.hasCooldown===true, true, r.hasCooldown);
  l('N24', r.megasetRepeats===1, 1, r.megasetRepeats);
  l('N26', lastW?.name?.toLowerCase().includes('get ready')&&lastW?.duration===30, '"Get Ready" 30s', JSON.stringify(lastW));
  l('N27', firstC?.name?.toLowerCase().includes('recovery')&&firstC?.duration===30, '"Recovery" 30s', JSON.stringify(firstC));
  const allCombos=ps.flatMap(p=>p.combos||[]);
  l('N29', noHyphen(allCombos), 'no hyphen combos', 'check');
});

// ─── Part 2: Coach Engine (local import) ─────────────────────────────────────

console.log('Running Part 2: Coach Engine tests...');


function mkHistory(n, difficulty, daysAgo=1) {
  return Array.from({length:n},(_,i)=>({
    id:`w${i}`, workout_name:'Heavy Bag Blast',
    completed_at: new Date(Date.now()-(i+daysAgo)*86400000).toISOString(),
    duration:1800, xp_earned:100, difficulty, notes:null,
    round_feedback:null, is_manual_entry:false,
  }));
}

function mkProfile(overrides={}) {
  return {
    prestige:null, current_level:1, current_streak:3, longest_streak:10,
    workouts_completed:10, total_training_seconds:36000, experience_level:'intermediate',
    equipment:{ gloves:true, wraps:true, heavyBag:true, speedBag:false, doubleEndBag:false, jumpRope:true, treadmill:false },
    goals:null, last_workout_date: new Date(Date.now()-86400000).toISOString(),
    comeback_count:0, double_days:0, morning_workouts:3, night_workouts:1,
    weekend_workouts:2, weekday_workouts:8,
    punch_1_count:500, punch_2_count:400, punch_3_count:100, punch_4_count:80,
    punch_5_count:50, punch_6_count:30, punch_7_count:0, punch_8_count:0,
    slips_count:10, rolls_count:5, pullbacks_count:0, circles_count:0,
    ...overrides,
  };
}

function coach(id, histFn, profFn, checkFn) {
  const history = histFn(); const profile = profFn();
  const rec = generateCoachRecommendation(history, profile);
  const checks = [];
  const l = (cid,ok,exp,act) => { checks.push({cid,ok,exp:String(exp),act:String(act??'')}); chk(id,cid,ok,exp,act); };
  checkFn(rec, l);
  RESULTS.push({id, checks, r:rec});
}

// Q1.1 Too easy → bump up
coach('Q1.1',
  ()=>[...mkHistory(7,'too_easy'),...mkHistory(3,'just_right')],
  ()=>mkProfile({experience_level:'intermediate'}),
  (rec,l)=>{
    l('Q1', rec.suggestedDifficulty==='advanced', 'advanced', rec.suggestedDifficulty);
    l('Q2', rec.suggestedRestDuration<60, 'rest<60', rec.suggestedRestDuration);
  }
);

// Q1.2 Too hard → bump down
coach('Q1.2',
  ()=>[...mkHistory(7,'too_hard'),...mkHistory(3,'just_right')],
  ()=>mkProfile({experience_level:'intermediate'}),
  (rec,l)=>{
    l('Q3', rec.suggestedDifficulty==='beginner', 'beginner', rec.suggestedDifficulty);
    l('Q4', rec.suggestedRestDuration>60, 'rest>60', rec.suggestedRestDuration);
  }
);

// Q1.3 All just_right → maintain
coach('Q1.3',
  ()=>mkHistory(10,'just_right'),
  ()=>mkProfile({experience_level:'intermediate'}),
  (rec,l)=>{ l('Q5', rec.suggestedDifficulty==='intermediate', 'intermediate', rec.suggestedDifficulty); }
);

// Q1.4 No difficulty data
coach('Q1.4',
  ()=>mkHistory(10,null),
  ()=>mkProfile({experience_level:'advanced'}),
  (rec,l)=>{
    l('Q6', rec.suggestedDifficulty==='advanced', 'advanced', rec.suggestedDifficulty);
    l('Q7', rec.confidence==='low'||rec.confidence==='medium', 'low/medium', rec.confidence);
  }
);

// Q1.5 Already at max, still too easy
coach('Q1.5',
  ()=>[...mkHistory(8,'too_easy'),...mkHistory(2,'just_right')],
  ()=>mkProfile({experience_level:'advanced'}),
  (rec,l)=>{
    l('Q8', rec.suggestedDifficulty==='advanced', 'advanced', rec.suggestedDifficulty);
    l('Q9', rec.suggestedRounds>4, 'suggestedRounds increased', rec.suggestedRounds);
  }
);

// R1.1 Getting easier trend
coach('R1.1',
  ()=>[...mkHistory(5,'too_easy',1),...mkHistory(5,'too_hard',6)].sort((a,b)=>a.completed_at.localeCompare(b.completed_at)),
  ()=>mkProfile({experience_level:'intermediate'}),
  (rec,l)=>{ l('R1', rec.suggestedDifficulty==='advanced'||rec.suggestedDifficulty==='intermediate', 'bumped or maintained', rec.suggestedDifficulty); }
);

// R1.4 Insufficient data
coach('R1.4',
  ()=>mkHistory(2,'just_right'),
  ()=>mkProfile(),
  (rec,l)=>{
    l('R6', true, 'no crash', 'ok');
    l('R7', rec.confidence==='low'||rec.confidence==='medium', 'low/medium', rec.confidence);
  }
);

// S1.2 Strong throughout
coach('S1.2',
  ()=>mkHistory(5,'just_right').map(w=>({...w, round_feedback:{1:5,2:5,3:5,4:5,5:5}})),
  ()=>mkProfile(),
  (rec,l)=>{ l('S3', rec.suggestedRounds>=4, 'rounds>=4', rec.suggestedRounds); }
);

// T1.1 Jab-cross dominant
coach('T1.1',
  ()=>mkHistory(10,'just_right'),
  ()=>mkProfile({punch_1_count:5000,punch_2_count:4000,punch_3_count:200,punch_4_count:100,punch_5_count:0,punch_6_count:0,experience_level:'intermediate'}),
  (rec,l)=>{
    l('T1', rec.punchEmphasis?.includes(5)||rec.punchEmphasis?.includes(6), 'emphasis 5 or 6', String(rec.punchEmphasis));
    l('T2', rec.focusAreas?.includes('variety'), 'variety focus', String(rec.focusAreas));
  }
);

// T1.2 Balanced distribution
coach('T1.2',
  ()=>mkHistory(10,'just_right'),
  ()=>mkProfile({punch_1_count:500,punch_2_count:500,punch_3_count:500,punch_4_count:500,punch_5_count:500,punch_6_count:500}),
  (rec,l)=>{ l('T3', (rec.punchEmphasis?.length||0)<=1, '<=1 emphasis', rec.punchEmphasis?.length); }
);

// U1.1 Zero defense after 15 workouts
coach('U1.1',
  ()=>mkHistory(15,'just_right'),
  ()=>mkProfile({slips_count:0,rolls_count:0,pullbacks_count:0,circles_count:0,workouts_completed:15,experience_level:'intermediate'}),
  (rec,l)=>{
    l('U1', rec.focusAreas?.includes('defense'), 'defense in focusAreas', String(rec.focusAreas));
    l('U2', rec.includeDefenseInCombos===true, 'includeDefenseInCombos=true', rec.includeDefenseInCombos);
    l('U3', (rec.defenseEmphasis?.length||0)>0, 'defenseEmphasis>0', rec.defenseEmphasis?.length);
  }
);

// U1.2 Beginner no defense push
coach('U1.2',
  ()=>mkHistory(15,'just_right'),
  ()=>mkProfile({slips_count:0,rolls_count:0,experience_level:'beginner',workouts_completed:15}),
  (rec,l)=>{
    l('U4', !rec.focusAreas?.includes('defense'), 'no defense for beginner', String(rec.focusAreas));
    l('U5', rec.includeDefenseInCombos!==true, 'includeDefenseInCombos=false', rec.includeDefenseInCombos);
  }
);

// V1.1 Same day double session
coach('V1.1',
  ()=>mkHistory(5,'just_right',0),
  ()=>mkProfile({last_workout_date:new Date().toISOString()}),
  (rec,l)=>{
    l('V1', rec.workoutType==='shadowboxing'||rec.focusAreas?.includes('recovery'), 'shadowboxing or recovery', `${rec.workoutType}/${rec.focusAreas}`);
    l('V2', rec.focusAreas?.includes('recovery'), 'recovery in focusAreas', String(rec.focusAreas));
    l('V3', rec.suggestedDifficulty==='beginner'||rec.suggestedDifficulty==='intermediate', 'bumped down', rec.suggestedDifficulty);
  }
);

// V1.2 7+ day gap
coach('V1.2',
  ()=>mkHistory(5,'just_right',10),
  ()=>mkProfile({last_workout_date:new Date(Date.now()-10*86400000).toISOString(),comeback_count:2}),
  (rec,l)=>{ l('V4', rec.includeWarmup===true, 'includeWarmup=true', rec.includeWarmup); }
);

// V1.3 Normal next day
coach('V1.3',
  ()=>mkHistory(5,'just_right',1),
  ()=>mkProfile({last_workout_date:new Date(Date.now()-86400000).toISOString()}),
  (rec,l)=>{ l('V7', !rec.focusAreas?.includes('recovery'), 'no recovery tag', String(rec.focusAreas)); }
);

// W1.4 Same workout 5x
coach('W1.4',
  ()=>Array.from({length:5},(_,i)=>({...mkHistory(1,'just_right')[0],id:`w${i}`,workout_name:'Heavy Bag Blast'})),
  ()=>mkProfile(),
  (rec,l)=>{ l('W7', rec.focusAreas?.includes('variety'), 'variety in focusAreas', String(rec.focusAreas)); }
);

// X1.1 Competition goal
coach('X1.1',
  ()=>mkHistory(10,'just_right'),
  ()=>mkProfile({goals:['competition'],experience_level:'advanced'}),
  (rec,l)=>{
    l('X1', rec.suggestedRoundDuration===180, 180, rec.suggestedRoundDuration);
    l('X2', rec.suggestedRestDuration<=60, '<=60', rec.suggestedRestDuration);
    l('X3', rec.focusAreas?.includes('defense'), 'defense', String(rec.focusAreas));
  }
);

// X1.2 Notes: soreness
coach('X1.2',
  ()=>mkHistory(5,'just_right').map((w,i)=>i===0?{...w,notes:'right shoulder is sore'}:w),
  ()=>mkProfile(),
  (rec,l)=>{
    l('X4', rec.workoutType==='shadowboxing', 'shadowboxing', rec.workoutType);
    l('X5', rec.suggestedDifficulty==='beginner'||rec.suggestedDifficulty==='intermediate', 'bumped down', rec.suggestedDifficulty);
  }
);

// Y1.3 Zero history
coach('Y1.3',
  ()=>[],
  ()=>mkProfile({workouts_completed:0}),
  (rec,l)=>{
    l('Y4', rec.isDefault===true, 'isDefault=true', rec.isDefault);
    l('Y5', rec.confidence==='low', 'low', rec.confidence);
    l('Y7', rec.encouragement&&rec.encouragement.length>0, 'has encouragement', rec.encouragement);
  }
);

// Y1.1 High confidence
coach('Y1.1',
  ()=>mkHistory(15,'just_right'),
  ()=>mkProfile({workouts_completed:15}),
  (rec,l)=>{
    l('Y1', rec.confidence==='high', 'high', rec.confidence);
    l('Y2', rec.dataPointsUsed===15, 15, rec.dataPointsUsed);
  }
);

// Y1.2 Low confidence
coach('Y1.2',
  ()=>mkHistory(1,null,14),
  ()=>mkProfile({workouts_completed:1,last_workout_date:new Date(Date.now()-14*86400000).toISOString()}),
  (rec,l)=>{ l('Y3', rec.confidence==='low', 'low', rec.confidence); }
);

// Z1.1 Coach → Builder prompt
coach('Z1.1',
  ()=>mkHistory(10,'just_right'),
  ()=>mkProfile(),
  (rec,l)=>{
    const prompt = recommendationToPrompt(rec);
    l('Z1', typeof prompt==='string'&&prompt.length>0, 'non-empty string', prompt.slice(0,50));
    l('Z2', /\d/.test(prompt), 'contains numbers', prompt.slice(0,80));
    l('Z5', /beginner|intermediate|advanced/i.test(prompt), 'contains difficulty', prompt.slice(0,80));
    l('Z6', /bag|shadow|boxing/i.test(prompt), 'contains workout type', prompt.slice(0,80));
  }
);


// ─────────────────────────────────────────────────────────────────────────────
// PRINT REPORT
// ─────────────────────────────────────────────────────────────────────────────

const CATS = {
  A:[], B:[], C:[], D:[], E:[], F:[], G:[], H:[], I:[], J:[],
  K:[], L:[], M:[], N:[], Q:[], R:[], S:[], T:[], U:[], V:[], W:[], X:[], Y:[], Z:[]
};
for (const res of RESULTS) {
  const cat = res.id.charAt(0);
  if (CATS[cat]) CATS[cat].push(res);
}

console.log('\n\n════════════════════════════════════════════════════════');
console.log('  KOI AI AGENTS — FULL TEST RESULTS');
console.log('════════════════════════════════════════════════════════\n');

console.log('CATEGORY SUMMARY');
console.log('─────────────────────────────────────────────────────');
console.log(`${'Cat'.padEnd(5)} ${'Tests'.padEnd(7)} ${'Pass'.padEnd(6)} ${'Fail'.padEnd(6)} Status`);
console.log('─────────────────────────────────────────────────────');

for (const [cat, tests] of Object.entries(CATS)) {
  if (!tests.length) continue;
  const p=tests.reduce((a,t)=>a+t.checks.filter(c=>c.ok).length,0);
  const f=tests.reduce((a,t)=>a+t.checks.filter(c=>!c.ok).length,0);
  const status=f===0?'✅':'❌ '+f+' fail';
  console.log(`${cat.padEnd(5)} ${String(tests.length).padEnd(7)} ${String(p).padEnd(6)} ${String(f).padEnd(6)} ${status}`);
}
console.log('─────────────────────────────────────────────────────');
console.log(`${'TOT'.padEnd(5)} ${String(RESULTS.length).padEnd(7)} ${String(PASS).padEnd(6)} ${String(FAIL).padEnd(6)} ${FAIL===0?'✅ ALL PASS':'❌ '+FAIL+' FAILURES'}`);

if (FAIL > 0) {
  console.log('\n\nFAILURE DETAILS');
  console.log('════════════════════════════════════════════════════════');
  for (const res of RESULTS) {
    const fails=res.checks.filter(c=>!c.ok);
    if (!fails.length) continue;
    console.log(`\n[${res.id}]`);
    for (const f of fails) {
      console.log(`  ❌ ${f.cid}  expected: "${f.exp}"  got: "${f.act}"`);
    }
  }
}

console.log('\n\nRAW SNAPSHOT (failed API tests)');
console.log('════════════════════════════════════════════════════════');
for (const res of RESULTS) {
  if (!R[res.id]) continue;
  const fails=res.checks.filter(c=>!c.ok);
  if (!fails.length) continue;
  const r=R[res.id];
  console.log(`\n[${res.id}]  name="${r.name}"  diff="${r.difficulty}"  megaset=${r.megasetRepeats}  hasWarmup=${r.hasWarmup}  hasCooldown=${r.hasCooldown}`);
  (r.phases||[]).forEach((p,i)=>{
    const as=active(p); const rs=rest(p);
    const comboSnap=(p.combos||[]).slice(0,3).map(c=>JSON.stringify(c)).join(' | ');
    console.log(`  phase[${i}] section=${p.section} repeats=${p.repeats} combos=${p.combos?.length}`);
    as.forEach((s,j)=>console.log(`    active[${j}] type=${s.segmentType} dur=${s.duration} name="${s.name}"`));
    rs.forEach((s,j)=>console.log(`    rest[${j}]   dur=${s.duration} name="${s.name}"`));
    if(comboSnap) console.log(`    combos: ${comboSnap}`);
  });
}

console.log('\nDone.\n');
