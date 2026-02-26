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

export function autoRepair(result: any): any {
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
      if (seg.duration > 600) seg.duration = 300;

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

  return result;
}
