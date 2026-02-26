const VALID_TOKENS = new Set([
  '1','2','3','4','5','6','7','8',
  'SLIP L','SLIP R','ROLL L','ROLL R','DUCK','PULL','BLOCK','PARRY',
  'STEP IN','STEP OUT','CIRCLE L','CIRCLE R','PIVOT','FREESTYLE'
]);

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
        if (combo.length === 1 && /^\d[-\d]+/.test(combo[0])) {
          errors.push(`Malformed combo: tokens must be separate array elements`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
