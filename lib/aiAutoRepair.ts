const VALID_BOXING_TOKENS = new Set([
  '1','2','3','4','5','6','7','8',
  'SLIP L','SLIP R','ROLL L','ROLL R','DUCK','PULL','BLOCK','PARRY',
  'STEP IN','STEP OUT','CIRCLE L','CIRCLE R','PIVOT',
  'FREESTYLE'
]);

const BEGINNER_COMBO_POOL: string[][] = [
  ['1','2'],
  ['1','1','2'],
  ['3','2'],
  ['1','2','3'],
  ['1','2','1'],
  ['2','3','2'],
  ['1','2','3','2'],
  ['3','4','2'],
  ['1','3','2'],
  ['4','2','1','2'],
];

function splitHyphenCombo(token: string): string[] {
  return token.split('-').map(t => t.trim()).filter(t => t.length > 0);
}

export function autoRepairCombos(combos: any[]): string[][] {
  return combos.map(combo => {
    if (!Array.isArray(combo) || combo.length === 0) return [];
    if (combo.length === 1 && typeof combo[0] === 'string' && combo[0].includes('-')) {
      const parts = splitHyphenCombo(combo[0]);
      if (parts.length > 1 && /^[1-8]$/.test(parts[0])) {
        return parts;
      }
    }
    const tokens = combo.map(String);
    const isBoxingCombo = VALID_BOXING_TOKENS.has(tokens[0]) || /^[1-8]$/.test(tokens[0]);
    if (isBoxingCombo) {
      const cleaned = tokens.filter((t: string) => VALID_BOXING_TOKENS.has(t));
      if (cleaned.length >= 2) return cleaned;
      if (cleaned.length === 1) return ['1', '2'];
    }
    return tokens;
  }).filter(combo => combo.length > 0);
}

function allCombosIdentical(combos: string[][]): boolean {
  if (combos.length < 2) return false;
  const first = JSON.stringify(combos[0]);
  return combos.every(c => JSON.stringify(c) === first);
}

function diversifyBeginnerCombos(combos: string[][], count: number): string[][] {
  const pool = BEGINNER_COMBO_POOL.slice();
  const result: string[][] = [];
  let poolIdx = 0;
  for (let i = 0; i < count; i++) {
    result.push(pool[poolIdx % pool.length]);
    poolIdx++;
  }
  return result;
}

export interface RepairContext {
  equipment?: Record<string, boolean>;
  prompt?: string;
  tier?: string;
}

export function autoRepair(result: any, ctx?: RepairContext): any {
  if (!result.megasetRepeats || result.megasetRepeats < 1) result.megasetRepeats = 1;

  if (!result.tags) result.tags = [];
  if (result.hasWarmup === undefined) {
    result.hasWarmup = result.phases?.some((p: any) => p.section === 'warmup') ?? false;
  }
  if (result.hasCooldown === undefined) {
    result.hasCooldown = result.phases?.some((p: any) => p.section === 'cooldown') ?? false;
  }
  if (!result.combos) result.combos = [];

  const hasGrind = result.phases?.some((p: any) => p.section === 'grind');
  if (!hasGrind && result.phases && result.phases.length > 0) {
    for (const phase of result.phases) {
      phase.section = 'grind';
    }
  }

  if (result.combos.length > 0) {
    result.combos = autoRepairCombos(result.combos);
  }

  for (const phase of (result.phases || [])) {
    if (!phase.repeats || phase.repeats < 1) phase.repeats = 1;
    if (!phase.comboOrder) phase.comboOrder = 'sequential';

    if (phase.combos && Array.isArray(phase.combos)) {
      phase.combos = autoRepairCombos(phase.combos);
      if (result.combos.length === 0 && phase.section === 'grind') {
        result.combos = phase.combos;
      }
    }

    for (const seg of (phase.segments || [])) {
      if (seg.duration < 5) seg.duration = 10;
      const nameLc = (seg.name || '').toLowerCase();
      const isContinuous = ['treadmill','run','jog','row','bike','cycling','jump rope','skipping','stretching','foam roll','yoga','walk'].some(k => nameLc.includes(k));
      if (seg.duration > 600) seg.duration = isContinuous ? Math.min(seg.duration, 3600) : 300;

      if (seg.type === 'active' && !seg.segmentType) {
        const nameLower = (seg.name || '').toLowerCase();
        if (nameLower.includes('shadow')) seg.segmentType = 'shadowboxing';
        else if (nameLower.includes('heavy bag') || nameLower.includes('combo')) seg.segmentType = 'combo';
        else if (nameLower.includes('speed bag')) seg.segmentType = 'speedbag';
        else if (nameLower.includes('double end')) seg.segmentType = 'doubleend';
        else if (nameLower.includes('sparring')) seg.segmentType = 'sparring';
        else seg.segmentType = 'exercise';
      }

      if (seg.type === 'rest') {
        seg.segmentType = 'rest';
      }
    }
  }

  const promptLower = (ctx?.prompt || '').toLowerCase();
  const hasPerRoundAssignments = /round\s*\d+\s*:/i.test(ctx?.prompt || '');
  const hasFreestylePrompt = /freestyle|no combos|no specific combos|all freestyle|do your own thing/.test(promptLower) && !hasPerRoundAssignments;
  const eq = ctx?.equipment || {};
  const tier = (ctx?.tier || '').toLowerCase();

  const perRoundFreestyleIndices: number[] = [];
  const roundFreestyleRe = /round\s*(\d+)\s*:\s*freestyle/gi;
  let rfMatch;
  while ((rfMatch = roundFreestyleRe.exec(ctx?.prompt || '')) !== null) {
    perRoundFreestyleIndices.push(parseInt(rfMatch[1]) - 1);
  }

  for (const phase of (result.phases || [])) {
    if (!phase.combos || !Array.isArray(phase.combos)) continue;

    const seg = phase.segments?.find((s: any) => s.type === 'active');
    const segType: string = seg?.segmentType || '';
    const boxingSegment = ['combo','shadowboxing','doubleend','sparring'].includes(segType);

    if (hasFreestylePrompt && boxingSegment) {
      phase.combos = phase.combos.map(() => ['FREESTYLE']);
    }

    if (perRoundFreestyleIndices.length > 0 && boxingSegment) {
      for (const idx of perRoundFreestyleIndices) {
        if (idx < phase.combos.length) {
          phase.combos[idx] = ['FREESTYLE'];
        }
      }
    }

    if (segType === 'speedbag' && !eq.speedBag) {
      if (seg) seg.segmentType = 'shadowboxing';
    }
    if (segType === 'doubleend' && !eq.doubleEndBag) {
      if (seg) seg.segmentType = 'shadowboxing';
    }

    if (!hasFreestylePrompt && boxingSegment && allCombosIdentical(phase.combos)) {
      if (tier === 'beginner') {
        phase.combos = diversifyBeginnerCombos(phase.combos, phase.combos.length);
      } else {
        const first = JSON.stringify(phase.combos[0]);
        const alt = BEGINNER_COMBO_POOL.find(c => JSON.stringify(c) !== first);
        if (alt) {
          for (let i = 1; i < phase.combos.length; i++) {
            phase.combos[i] = BEGINNER_COMBO_POOL[i % BEGINNER_COMBO_POOL.length];
          }
        }
      }
    }
  }

  if (result.combos && Array.isArray(result.combos) && result.combos.length > 0) {
    const grindPhase = result.phases?.find((p: any) => p.section === 'grind');
    if (grindPhase?.combos) result.combos = grindPhase.combos;
  }

  return result;
}
