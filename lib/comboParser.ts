/**
 * Combo Parser — Tokenizes and normalizes boxing combo notation.
 *
 * Converts human-readable combo strings (e.g. "jab cross hook", "1-2-3-slip left")
 * into standardized move token arrays. Handles punches (1–8), defensive moves
 * (slips, rolls, pulls, blocks), footwork (steps, circles, pivots), and
 * compound multi-word moves.
 *
 * @module comboParser
 */

/** Maps punch name aliases to standardized punch numbers (1–8). */
export const PUNCH_MAP: Record<string, string> = {
  'jab': '1',
  'j': '1',
  '1': '1',
  'cross': '2',
  'straight': '2',
  'right': '2',
  '2': '2',
  'hook': '3',
  'lead hook': '3',
  'left hook': '3',
  'lhook': '3',
  '3': '3',
  'rear hook': '4',
  'right hook': '4',
  'rhook': '4',
  '4': '4',
  'uppercut': '5',
  'lead uppercut': '5',
  'left uppercut': '5',
  'upper': '5',
  '5': '5',
  'rear uppercut': '6',
  'right uppercut': '6',
  '6': '6',
  'body hook': '7',
  'lead body': '7',
  'body': '7',
  '7': '7',
  'rear body': '8',
  'right body': '8',
  '8': '8',
};

/** Maps defensive move aliases to standardized defense tokens (e.g. 'SLIP L', 'ROLL R'). */
export const DEFENSE_MAP: Record<string, string> = {
  'slip': 'SLIP L',
  'slip l': 'SLIP L',
  'slip left': 'SLIP L',
  'slipl': 'SLIP L',
  'slip r': 'SLIP R',
  'slip right': 'SLIP R',
  'slipr': 'SLIP R',
  'roll': 'ROLL L',
  'roll l': 'ROLL L',
  'roll left': 'ROLL L',
  'rolll': 'ROLL L',
  'roll r': 'ROLL R',
  'roll right': 'ROLL R',
  'rollr': 'ROLL R',
  'duck': 'DUCK',
  'pull': 'PULL',
  'pullback': 'PULL',
  'pull back': 'PULL',
  'block': 'BLOCK',
  'guard': 'BLOCK',
  'parry': 'PARRY',
};

/** Maps footwork/movement aliases to standardized movement tokens (e.g. 'STEP IN', 'CIRCLE L'). */
export const MOVEMENT_MAP: Record<string, string> = {
  'step in': 'STEP IN',
  'stepin': 'STEP IN',
  'in': 'STEP IN',
  'step out': 'STEP OUT',
  'stepout': 'STEP OUT',
  'out': 'STEP OUT',
  'circle l': 'CIRCLE L',
  'circle left': 'CIRCLE L',
  'circlel': 'CIRCLE L',
  'circle r': 'CIRCLE R',
  'circle right': 'CIRCLE R',
  'circler': 'CIRCLE R',
  'circle': 'CIRCLE L',
  'pivot': 'PIVOT',
};

const ALL_MOVES: Record<string, string> = {
  ...PUNCH_MAP,
  ...DEFENSE_MAP,
  ...MOVEMENT_MAP,
};

/**
 * Parses a free-form combo string into an array of standardized move tokens.
 * Handles dash-separated notation, named punches, defense, and 'double'/'triple' prefixes.
 * @param input - Raw combo string (e.g. "1-2-slip left-3" or "jab cross hook").
 * @returns Array of normalized move tokens (e.g. ['1', '2', 'SLIP L', '3']).
 */
export function parseComboString(input: string): string[] {
  if (!input || input.trim() === '') return [];
  
  const normalized = input.toLowerCase().trim();
  const result: string[] = [];
  
  const tokens = tokenizeCombo(normalized);
  
  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i].trim();
    if (!token) {
      i++;
      continue;
    }
    
    if (token === 'double' && i + 1 < tokens.length) {
      const nextMove = resolveMoveToken(tokens[i + 1], tokens[i + 2], tokens[i + 3]);
      if (nextMove.move) {
        result.push(nextMove.move, nextMove.move);
        i += 1 + nextMove.consumed;
        continue;
      }
    }
    
    if (token === 'triple' && i + 1 < tokens.length) {
      const nextMove = resolveMoveToken(tokens[i + 1], tokens[i + 2], tokens[i + 3]);
      if (nextMove.move) {
        result.push(nextMove.move, nextMove.move, nextMove.move);
        i += 1 + nextMove.consumed;
        continue;
      }
    }
    
    const resolved = resolveMoveToken(token, tokens[i + 1], tokens[i + 2]);
    if (resolved.move) {
      result.push(resolved.move);
      i += resolved.consumed;
    } else {
      i++;
    }
  }
  
  return result;
}

function tokenizeCombo(input: string): string[] {
  return input
    .replace(/[-,]+/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 0);
}

const COMPOUND_PUNCHES: Array<{ words: string[]; move: string }> = [
  { words: ['rear', 'body', 'hook'], move: '8' },
  { words: ['rear', 'body'], move: '8' },
  { words: ['right', 'body'], move: '8' },
  { words: ['body', 'hook'], move: '7' },
  { words: ['body', 'shot'], move: '7' },
  { words: ['lead', 'body'], move: '7' },
  { words: ['lead', 'hook'], move: '3' },
  { words: ['left', 'hook'], move: '3' },
  { words: ['rear', 'hook'], move: '4' },
  { words: ['right', 'hook'], move: '4' },
  { words: ['lead', 'uppercut'], move: '5' },
  { words: ['left', 'uppercut'], move: '5' },
  { words: ['rear', 'uppercut'], move: '6' },
  { words: ['right', 'uppercut'], move: '6' },
  { words: ['body', 'uppercut'], move: '5' },
];

function resolveMoveToken(
  token: string, 
  nextToken?: string,
  thirdToken?: string
): { move: string | null; consumed: number } {
  for (const compound of COMPOUND_PUNCHES) {
    if (compound.words.length === 3 && thirdToken &&
        compound.words[0] === token && compound.words[1] === nextToken && compound.words[2] === thirdToken) {
      return { move: compound.move, consumed: 3 };
    }
    if (compound.words.length === 2 && nextToken &&
        compound.words[0] === token && compound.words[1] === nextToken) {
      return { move: compound.move, consumed: 2 };
    }
  }
  
  if (ALL_MOVES[token]) {
    return { move: ALL_MOVES[token], consumed: 1 };
  }
  
  if (nextToken) {
    const twoWord = `${token} ${nextToken}`;
    if (ALL_MOVES[twoWord]) {
      return { move: ALL_MOVES[twoWord], consumed: 2 };
    }
  }
  
  for (const [key, value] of Object.entries(ALL_MOVES)) {
    if (key.replace(/\s/g, '') === token) {
      return { move: value, consumed: 1 };
    }
  }
  
  return { move: null, consumed: 1 };
}

/**
 * Checks whether a text string contains any recognizable boxing combo notation.
 * Used to determine if a prompt includes combo instructions.
 * @param input - Text to check.
 * @returns True if combo notation (punch numbers, names, or defense keywords) is found.
 */
export function containsComboNotation(input: string): boolean {
  const normalized = input.toLowerCase();
  
  if (/\b[1-8]\b/.test(normalized)) return true;
  
  const punchKeywords = ['jab', 'cross', 'hook', 'uppercut', 'body'];
  if (punchKeywords.some(k => normalized.includes(k))) return true;
  
  const defenseKeywords = ['slip', 'roll', 'duck', 'pull', 'block', 'parry'];
  if (defenseKeywords.some(k => normalized.includes(k))) return true;
  
  if (/\d+-\d+/.test(normalized)) return true;
  
  return false;
}

/**
 * Extracts raw combo strings from a workout prompt using multiple pattern strategies:
 * dash-separated sequences, "combo:" labels, and quoted strings with combo notation.
 * @param prompt - The full workout prompt text.
 * @returns Array of raw combo strings to be parsed individually.
 */
export function extractCombosFromPrompt(prompt: string): string[] {
  const combos: string[] = [];
  const normalized = prompt.toLowerCase();
  
  const dashPattern = /\b(\d(?:[-\s]*(?:\d|slip|roll|duck|hook|cross|jab|upper|body|step|circle|in|out|l|r|left|right))+)\b/gi;
  const dashMatches = normalized.match(dashPattern);
  if (dashMatches) {
    combos.push(...dashMatches);
  }
  
  const comboLabelPattern = /combo:?\s*([^,.\n]+)/gi;
  let match;
  while ((match = comboLabelPattern.exec(normalized)) !== null) {
    combos.push(match[1].trim());
  }
  
  const quotedPattern = /["']([^"']+)["']/g;
  while ((match = quotedPattern.exec(prompt)) !== null) {
    const content = match[1];
    if (containsComboNotation(content)) {
      combos.push(content);
    }
  }
  
  return combos;
}

/**
 * Validates that every token in a parsed combo is a recognized move.
 * @param combo - Array of move tokens to validate.
 * @returns True if all tokens are valid punches, defense, or movement moves.
 */
export function isValidCombo(combo: string[]): boolean {
  if (!combo || combo.length === 0) return false;
  
  const validMoves = new Set([
    '1', '2', '3', '4', '5', '6', '7', '8',
    'SLIP L', 'SLIP R', 'ROLL L', 'ROLL R', 'DUCK', 'PULL', 'BLOCK', 'PARRY',
    'STEP IN', 'STEP OUT', 'CIRCLE L', 'CIRCLE R', 'PIVOT',
  ]);
  
  return combo.every(move => validMoves.has(move));
}

/**
 * Formats a parsed combo array into a display string with dash separators.
 * @param combo - Array of move tokens.
 * @returns Display string (e.g. "1 - 2 - SLIP L - 3").
 */
export function formatComboDisplay(combo: string[]): string {
  return combo.join(' - ');
}
