import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Dimensions,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import colors from "@/constants/colors";
import {
  WorkoutPhase,
  WorkoutSegment,
  SegmentType,
} from "@/lib/types";
import { ComboDifficulty } from "@/data/comboPresets";

const C = colors.dark;

const SEGMENT_TYPES: { key: SegmentType; label: string; bg: string; fg: string }[] = [
  { key: "shadowboxing", label: "S", bg: "rgba(170,102,255,0.2)", fg: "#AA66FF" },
  { key: "speedbag", label: "SB", bg: "rgba(255,140,0,0.2)", fg: "#FF8C00" },
  { key: "combo", label: "H", bg: "rgba(255,68,68,0.2)", fg: "#FF4444" },
  { key: "doubleend", label: "DB", bg: "rgba(56,189,248,0.2)", fg: "#38BDF8" },
  { key: "sparring", label: "SP", bg: "rgba(255,170,0,0.2)", fg: "#FFAA00" },
  { key: "exercise", label: "E", bg: "rgba(68,204,136,0.2)", fg: "#44CC88" },
  { key: "rest", label: "R", bg: "rgba(113,113,122,0.2)", fg: "#71717A" },
];

export function getSegmentTypeInfo(segType?: SegmentType) {
  const key = segType === "work" || !segType ? "exercise" : segType;
  return SEGMENT_TYPES.find((t) => t.key === key) || SEGMENT_TYPES[0];
}

export function getPhaseSegmentContext(phase: WorkoutPhase): "speedbag" | "combo" | "exercises" {
  if (phase.segments.some((s) => s.segmentType === "speedbag")) return "speedbag";
  const hasComboCapable = phase.segments.some((s) =>
    ["combo", "shadowboxing", "speedbag", "doubleend"].includes(s.segmentType || "")
  );
  const hasExercise = phase.segments.some((s) => s.segmentType === "exercise");
  if (hasExercise && !hasComboCapable) return "exercises";
  return "combo";
}

export function getMoveStyle(move: string): { bg: string; fg: string } {
  const isDefense = move.includes("SLIP") || move.includes("ROLL") || move.includes("PULL");
  const isMovement = move.includes("CIRCLE");
  const isBody = ["7", "8", "9", "10"].includes(move);
  if (isDefense) return { bg: "rgba(234,179,8,0.2)", fg: "#EAB308" };
  if (isMovement) return { bg: "rgba(59,130,246,0.2)", fg: "#3B82F6" };
  if (isBody) return { bg: "rgba(255,140,0,0.2)", fg: "#FF8C00" };
  return { bg: C.voltDim, fg: C.volt };
}

export interface PhaseCardProps {
  phase: WorkoutPhase;
  onRemove: () => void;
  onUpdate: (updates: Partial<WorkoutPhase>) => void;
  onAddSegment: () => void;
  onRemoveSegment: (segId: string) => void;
  onUpdateSegment: (segId: string, updates: Partial<WorkoutSegment>) => void;
  onCycleType: (segId: string, current?: SegmentType) => void;
  onOpenCombos: (ctx: "speedbag" | "combo" | "exercises") => void;
  onEditCombo: (idx: number) => void;
  onDeleteCombo: (idx: number) => void;
  getPhaseCombos: () => string[][];
}

export function PhaseCard({
  phase,
  onRemove,
  onUpdate,
  onAddSegment,
  onRemoveSegment,
  onUpdateSegment,
  onCycleType,
  onOpenCombos,
  onEditCombo,
  onDeleteCombo,
  getPhaseCombos,
}: PhaseCardProps) {
  const combos = getPhaseCombos();
  const phaseCtx = getPhaseSegmentContext(phase);

  return (
    <View style={styles.phaseCard}>
      <View style={styles.phaseHeader}>
        <TextInput
          value={phase.name}
          onChangeText={(t) => onUpdate({ name: t })}
          style={styles.phaseNameInput}
          placeholderTextColor={C.mutedForeground}
        />
        <View style={styles.repeatControls}>
          <TouchableOpacity
            onPress={() => onUpdate({ repeats: Math.max(1, phase.repeats - 1) })}
            style={[styles.repeatBtn, phase.repeats <= 1 && { opacity: 0.3 }]}
            disabled={phase.repeats <= 1}
          >
            <Ionicons name="chevron-down" size={14} color={C.mutedForeground} />
          </TouchableOpacity>
          <Text style={styles.repeatCount}>x{phase.repeats}</Text>
          <TouchableOpacity
            onPress={() => onUpdate({ repeats: phase.repeats + 1 })}
            style={styles.repeatBtn}
          >
            <Ionicons name="chevron-up" size={14} color={C.mutedForeground} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={onRemove} hitSlop={8}>
          <Ionicons name="trash-outline" size={18} color={C.mutedForeground} />
        </TouchableOpacity>
      </View>

      {combos.length > 0 && (
        <View style={styles.comboOrderRow}>
          <Text style={styles.comboOrderLabel}>
            {phaseCtx === "speedbag" ? "Drill Order" : phaseCtx === "exercises" ? "Exercise Order" : "Combo Order"}
          </Text>
          <View style={{ flexDirection: "row", gap: 4 }}>
            <TouchableOpacity
              onPress={() => onUpdate({ comboOrder: "sequential" })}
              style={[
                styles.orderPill,
                (phase.comboOrder || "sequential") === "sequential" && styles.orderPillActive,
              ]}
            >
              <Text style={[
                styles.orderPillText,
                (phase.comboOrder || "sequential") === "sequential" && styles.orderPillTextActive,
              ]}>In Order</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onUpdate({ comboOrder: "random" })}
              style={[styles.orderPill, phase.comboOrder === "random" && styles.orderPillActive]}
            >
              <Text style={[styles.orderPillText, phase.comboOrder === "random" && styles.orderPillTextActive]}>
                Random
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {phase.segments.map((segment) => {
        const segInfo = getSegmentTypeInfo(segment.segmentType);
        return (
          <View key={segment.id} style={styles.segmentRow}>
            <TouchableOpacity
              onPress={() => onCycleType(segment.id, segment.segmentType)}
              style={[styles.segTypeBadge, { backgroundColor: segInfo.bg }]}
            >
              <Text style={[styles.segTypeText, { color: segInfo.fg }]}>{segInfo.label}</Text>
            </TouchableOpacity>
            <TextInput
              value={segment.name}
              onChangeText={(t) => onUpdateSegment(segment.id, { name: t })}
              style={styles.segNameInput}
              placeholderTextColor={C.mutedForeground}
            />
            <TextInput
              value={String(segment.duration)}
              onChangeText={(t) => onUpdateSegment(segment.id, { duration: parseInt(t) || 0 })}
              style={styles.segDurationInput}
              keyboardType="number-pad"
              placeholderTextColor={C.mutedForeground}
            />
            <Text style={styles.secLabel}>s</Text>
            <TouchableOpacity onPress={() => onRemoveSegment(segment.id)} hitSlop={8}>
              <Ionicons name="close" size={16} color={C.mutedForeground} />
            </TouchableOpacity>
          </View>
        );
      })}

      <View style={styles.comboSection}>
        <View style={styles.comboHeader}>
          <Text style={styles.comboHeaderLabel}>
            {phaseCtx === "speedbag" ? "Drills" : phaseCtx === "exercises" ? "Exercises" : "Combos"} ({combos.length})
          </Text>
          <TouchableOpacity onPress={() => onOpenCombos(phaseCtx)} style={styles.addComboBtn}>
            <Ionicons name="add" size={14} color={C.volt} />
            <Text style={styles.addComboBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
        {combos.length === 0 ? (
          <Text style={styles.comboEmpty}>
            {phaseCtx === "speedbag"
              ? "No drills - freestyle"
              : phaseCtx === "exercises"
              ? "No exercises - freestyle"
              : "No combos - freestyle"}
          </Text>
        ) : (
          combos.map((combo, idx) => {
            const isFreestyle = combo.length === 1 && combo[0] === "FREESTYLE";
            return (
              <View key={idx} style={styles.comboItem}>
                <Text style={styles.comboIndex}>#{idx + 1}</Text>
                <View style={styles.comboMoves}>
                  {isFreestyle ? (
                    <View style={[styles.moveBadge, { backgroundColor: C.voltDim }]}>
                      <Text style={[styles.moveBadgeText, { color: C.volt }]}>Freestyle</Text>
                    </View>
                  ) : (
                    combo.map((move, mIdx) => {
                      const ms = getMoveStyle(move);
                      return (
                        <View key={mIdx} style={[styles.moveBadge, { backgroundColor: ms.bg }]}>
                          <Text style={[styles.moveBadgeText, { color: ms.fg }]}>{move}</Text>
                        </View>
                      );
                    })
                  )}
                </View>
                <TouchableOpacity onPress={() => onEditCombo(idx)} hitSlop={8} style={{ padding: 4 }}>
                  <Feather name="edit-2" size={14} color={C.mutedForeground} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onDeleteCombo(idx)} hitSlop={8} style={{ padding: 4 }}>
                  <Ionicons name="trash-outline" size={14} color={C.mutedForeground} />
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </View>

      <TouchableOpacity onPress={onAddSegment} style={styles.addSegmentBtn}>
        <Ionicons name="add" size={16} color={C.mutedForeground} />
        <Text style={styles.addSegmentBtnText}>Add Segment</Text>
      </TouchableOpacity>
    </View>
  );
}

export function DifficultySelector({ difficulty, onSelect }: { difficulty: ComboDifficulty; onSelect: (d: ComboDifficulty) => void }) {
  const diffs: ComboDifficulty[] = ["rookie", "beginner", "intermediate", "advanced", "pro"];
  return (
    <View style={styles.diffSection}>
      <Text style={styles.diffLabel}>DIFFICULTY</Text>
      <View style={styles.diffRow}>
        {diffs.map((d) => {
          const isActive = difficulty === d;
          return (
            <TouchableOpacity
              key={d}
              onPress={() => onSelect(d)}
              style={[
                styles.diffPill,
                isActive && { backgroundColor: C.volt },
              ]}
            >
              <Text
                style={[
                  styles.diffPillText,
                  isActive && { color: C.background },
                ]}
              >
                {d.toUpperCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  phaseCard: {
    backgroundColor: C.surface1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.surface3,
    overflow: "hidden",
  },
  phaseHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.surface3,
    gap: 8,
  },
  phaseNameInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600" as const,
    color: C.foreground,
    padding: 0,
  },
  repeatControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  repeatBtn: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: C.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  repeatCount: {
    width: 32,
    textAlign: "center" as const,
    fontSize: 13,
    fontWeight: "600" as const,
    color: C.foreground,
  },
  comboOrderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.surface3,
  },
  comboOrderLabel: {
    fontSize: 11,
    color: C.mutedForeground,
  },
  orderPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: C.surface2,
  },
  orderPillActive: {
    backgroundColor: C.voltDim,
  },
  orderPillText: {
    fontSize: 11,
    fontWeight: "500" as const,
    color: C.mutedForeground,
  },
  orderPillTextActive: {
    color: C.volt,
  },
  segmentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.surface3,
    gap: 8,
  },
  segTypeBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  segTypeText: {
    fontSize: 11,
    fontWeight: "700" as const,
  },
  segNameInput: {
    flex: 1,
    fontSize: 13,
    color: C.foreground,
    backgroundColor: C.surface2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.surface3,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  segDurationInput: {
    width: 52,
    fontSize: 13,
    color: C.foreground,
    backgroundColor: C.surface2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.surface3,
    paddingHorizontal: 6,
    paddingVertical: 6,
    textAlign: "center" as const,
  },
  secLabel: {
    fontSize: 11,
    color: C.mutedForeground,
  },
  comboSection: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  comboHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  comboHeaderLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: C.mutedForeground,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  addComboBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  addComboBtnText: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: C.volt,
  },
  comboEmpty: {
    fontSize: 11,
    color: C.mutedForeground,
    textAlign: "center" as const,
    paddingVertical: 8,
  },
  comboItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface1,
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: C.surface3,
    marginBottom: 4,
    gap: 6,
  },
  comboIndex: {
    fontSize: 11,
    color: C.mutedForeground,
    width: 24,
  },
  comboMoves: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  moveBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  moveBadgeText: {
    fontSize: 10,
    fontWeight: "600" as const,
  },
  addSegmentBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 4,
  },
  addSegmentBtnText: {
    fontSize: 13,
    color: C.mutedForeground,
  },
  diffSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.surface3,
  },
  diffLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: C.mutedForeground,
    letterSpacing: 1,
    marginBottom: 10,
  },
  diffRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  diffPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: C.surface2,
  },
  diffPillText: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: C.mutedForeground,
    letterSpacing: 0.5,
  },
});
