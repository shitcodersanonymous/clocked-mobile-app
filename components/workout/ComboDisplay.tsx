/**
 * ComboDisplay — Center-card content for the workout session screen.
 *
 * Renders one of three states based on the current segment:
 *   1. REST card  — "UP NEXT: [next segment name]" when resting
 *   2. COMBO card — punch/defense/movement move chips when a combo is assigned
 *   3. FREESTYLE  — "FREESTYLE" heading when active boxing with no assigned combo
 *
 * Helper functions `getDisplayMove` and `getMoveColor` convert raw combo strings
 * (e.g. "JAB", "SLIP L", "CIRCLE R") to compact display tokens and colour codes.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '@/constants/colors';
import { FlatSegment } from '@/hooks/useWorkoutTimer';

// ─── Move helpers ─────────────────────────────────────────────────────────────

export function getDisplayMove(move: string): { display: string; type: 'punch' | 'defense' | 'movement' } {
  const m = move.toUpperCase();
  if (m === 'JAB' || m === '1') return { display: '1', type: 'punch' };
  if (m === 'CROSS' || m === 'STRAIGHT' || m === '2') return { display: '2', type: 'punch' };
  if (m === 'LEAD HOOK' || m === 'LEFT HOOK' || m === '3') return { display: '3', type: 'punch' };
  if (m === 'REAR HOOK' || m === 'RIGHT HOOK' || m === '4') return { display: '4', type: 'punch' };
  if (m === 'LEAD UPPERCUT' || m === 'LEFT UPPERCUT' || m === '5') return { display: '5', type: 'punch' };
  if (m === 'REAR UPPERCUT' || m === 'RIGHT UPPERCUT' || m === '6') return { display: '6', type: 'punch' };
  if (m === 'LEAD BODY HOOK' || m === 'LEFT BODY' || m === '7') return { display: '7', type: 'punch' };
  if (m === 'REAR BODY HOOK' || m === 'RIGHT BODY' || m === '8') return { display: '8', type: 'punch' };
  if (m.includes('SLIP L') || m === 'SL') return { display: 'SL', type: 'defense' };
  if (m.includes('SLIP R') || m === 'SR') return { display: 'SR', type: 'defense' };
  if (m.includes('ROLL L') || m === 'RL') return { display: 'RL', type: 'defense' };
  if (m.includes('ROLL R') || m === 'RR') return { display: 'RR', type: 'defense' };
  if (m === 'PULL' || m === 'PL') return { display: 'PL', type: 'defense' };
  if (m === 'BLOCK' || m === 'BK') return { display: 'BK', type: 'defense' };
  if (m.includes('CIRCLE L')) return { display: '\u21BA', type: 'movement' };
  if (m.includes('CIRCLE R')) return { display: '\u21BB', type: 'movement' };
  if (m.includes('STEP IN')) return { display: '\u2192', type: 'movement' };
  if (m.includes('STEP OUT')) return { display: '\u2190', type: 'movement' };
  if (['1','2','3','4','5','6','7','8'].includes(m)) return { display: m, type: 'punch' };
  return { display: move, type: 'punch' };
}

export function getMoveColor(type: 'punch' | 'defense' | 'movement'): string {
  switch (type) {
    case 'punch': return colors.dark.volt;
    case 'defense': return colors.dark.blue;
    case 'movement': return colors.dark.orange;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ComboDisplayProps {
  isRestSegment: boolean;
  currentSegment?: FlatSegment;
  nextSegment?: FlatSegment;
  displayCombo?: string[];
  isShadowboxing: boolean;
  accentColor: string;
}

export default function ComboDisplay({
  isRestSegment,
  currentSegment,
  nextSegment,
  displayCombo,
  isShadowboxing,
  accentColor,
}: ComboDisplayProps) {
  return (
    <>
      {isRestSegment && nextSegment && (
        <View style={[styles.comboCard, { borderColor: accentColor + '30' }]}>
          <Text style={[styles.comboCardLabel, { color: accentColor + '99' }]}>UP NEXT</Text>
          <Text style={[styles.comboCardTitle, { color: accentColor }]}>
            {nextSegment.name || 'FINISH'}
          </Text>
        </View>
      )}

      {displayCombo && displayCombo.length > 0 && (
        <View style={styles.comboCard}>
          {isShadowboxing && (
            <Text style={[styles.comboCardLabel, { color: accentColor }]}>INCOMING COMBO</Text>
          )}
          <View style={styles.comboMoves}>
            {displayCombo.map((move, idx) => {
              const dm = getDisplayMove(move);
              return (
                <View key={idx} style={styles.comboMoveRow}>
                  <View style={[styles.moveBadge, { borderColor: getMoveColor(dm.type) + '60' }]}>
                    <Text style={[styles.moveBadgeText, { color: getMoveColor(dm.type) }]}>
                      {dm.display}
                    </Text>
                  </View>
                  {idx < displayCombo.length - 1 && (
                    <Ionicons name="chevron-forward" size={12} color={colors.dark.mutedForeground} />
                  )}
                </View>
              );
            })}
          </View>
        </View>
      )}

      {!displayCombo && !isRestSegment && currentSegment?.type === 'active' &&
       (currentSegment?.segmentType === 'combo' ||
        currentSegment?.segmentType === 'speedbag' ||
        currentSegment?.segmentType === 'doubleend' ||
        isShadowboxing) && (
        <View style={styles.comboCard}>
          <Text style={[styles.freestyleText, { color: accentColor }]}>FREESTYLE</Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  comboCard: {
    width: '100%',
    maxWidth: 300,
    backgroundColor: colors.dark.surface1,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.dark.surface3,
    alignItems: 'center',
  },
  comboCardLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    textAlign: 'center',
  },
  comboCardTitle: {
    fontSize: 18,
    fontWeight: '900',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  comboMoves: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  comboMoveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  moveBadge: {
    minWidth: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    backgroundColor: colors.dark.surface2,
  },
  moveBadgeText: {
    fontSize: 18,
    fontWeight: '900',
  },
  freestyleText: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
});
