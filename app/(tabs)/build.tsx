import { useState, useMemo, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import colors from "@/constants/colors";
import { DIFFICULTY_COLORS } from "@/constants/colors";
import { ExercisePickerModal } from "@/components/ui/ExercisePickerModal";
import { useWorkoutStore } from "@/stores/workoutStore";
import { useUserStore } from "@/stores/userStore";
import {
  Workout,
  WorkoutPhase,
  WorkoutSegment,
  SegmentType,
} from "@/lib/types";
import { formatDuration, generateId } from "@/lib/utils";
import {
  ComboDifficulty,
  PUNCH_KEYS_BY_DIFFICULTY,
  DEFENSE_KEYS_BY_DIFFICULTY,
  MOVEMENT_KEYS_BY_DIFFICULTY,
  getAllPresets,
  getPresetCategories,
} from "@/data/comboPresets";
import { SPEED_BAG_DRILLS } from "@/data/speedBagDrills";
import { PresetCategory } from "@/data/presetComboLibrary";

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

const DEFAULT_SEGMENT: Omit<WorkoutSegment, "id"> = {
  name: "Shadowboxing",
  type: "active",
  segmentType: "shadowboxing",
  duration: 60,
};

const DRILL_CATEGORIES: Record<string, string[]> = {
  rookie: ["single-alternating", "doubles"],
  beginner: ["single-alternating", "doubles", "double-right-lead", "double-left-lead", "side-to-side"],
  intermediate: ["triples", "triple-right-lead", "triple-left-lead", "fist-rolls-forward", "backfists", "elbow-strikes"],
  advanced: ["fist-rolls-reverse", "one-two-rhythm"],
  pro: [],
};

function getSegmentTypeInfo(segType?: SegmentType) {
  const key = segType === "work" || !segType ? "exercise" : segType;
  return SEGMENT_TYPES.find((t) => t.key === key) || SEGMENT_TYPES[0];
}

function getPhaseSegmentContext(phase: WorkoutPhase): "speedbag" | "combo" | "exercises" {
  if (phase.segments.some((s) => s.segmentType === "speedbag")) return "speedbag";
  const hasComboCapable = phase.segments.some((s) =>
    ["combo", "shadowboxing", "speedbag", "doubleend"].includes(s.segmentType || "")
  );
  const hasExercise = phase.segments.some((s) => s.segmentType === "exercise");
  if (hasExercise && !hasComboCapable) return "exercises";
  return "combo";
}

function getMoveStyle(move: string): { bg: string; fg: string } {
  const isDefense = move.includes("SLIP") || move.includes("ROLL") || move.includes("PULL");
  const isMovement = move.includes("CIRCLE");
  const isBody = ["7", "8", "9", "10"].includes(move);
  if (isDefense) return { bg: "rgba(234,179,8,0.2)", fg: "#EAB308" };
  if (isMovement) return { bg: "rgba(59,130,246,0.2)", fg: "#3B82F6" };
  if (isBody) return { bg: "rgba(255,140,0,0.2)", fg: "#FF8C00" };
  return { bg: C.voltDim, fg: C.volt };
}

export default function BuildScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ edit?: string }>();
  const editId = params.edit;

  const { workouts, addWorkout, updateWorkout } = useWorkoutStore();
  const user = useUserStore((s) => s.user);

  const getDefaultDifficulty = (): ComboDifficulty => {
    const level = user?.experienceLevel;
    if (level === "complete_beginner") return "rookie";
    if (level === "beginner") return "beginner";
    if (level === "intermediate") return "intermediate";
    if (level === "advanced") return "advanced";
    if (level === "pro") return "pro";
    return "beginner";
  };

  const [name, setName] = useState("New Workout");
  const [difficulty, setDifficulty] = useState<ComboDifficulty>(getDefaultDifficulty());
  const [warmupPhases, setWarmupPhases] = useState<WorkoutPhase[]>([]);
  const [grindPhases, setGrindPhases] = useState<WorkoutPhase[]>([]);
  const [cooldownPhases, setCooldownPhases] = useState<WorkoutPhase[]>([]);
  const [megasetRepeats, setMegasetRepeats] = useState(1);
  const [workoutId, setWorkoutId] = useState<string | null>(null);

  const [activeSection, setActiveSection] = useState<"warmup" | "grind" | "cooldown">("grind");
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);
  const [showComboBuilder, setShowComboBuilder] = useState(false);
  const [comboMode, setComboMode] = useState<"custom" | "presets">("presets");
  const [currentCombo, setCurrentCombo] = useState<string[]>([]);
  const [editingComboIndex, setEditingComboIndex] = useState<number | null>(null);
  const [editingSegmentContext, setEditingSegmentContext] = useState<"speedbag" | "combo" | "exercises">("combo");
  const [presetSearch, setPresetSearch] = useState("");
  const [selectedPresetCategory, setSelectedPresetCategory] = useState<string | null>(null);
  const [exerciseInput, setExerciseInput] = useState("");
  const [showExercisePicker, setShowExercisePicker] = useState(false);

  useEffect(() => {
    if (editId) {
      const w = workouts.find((w) => w.id === editId);
      if (w) {
        setWorkoutId(w.id);
        setName(w.name);
        setDifficulty(w.difficulty as ComboDifficulty);
        setWarmupPhases(w.sections.warmup);
        setGrindPhases(w.sections.grind);
        setCooldownPhases(w.sections.cooldown);
        setMegasetRepeats(w.megasetRepeats || 1);
      }
    }
  }, [editId]);

  const getActivePhases = useCallback(() => {
    switch (activeSection) {
      case "warmup": return warmupPhases;
      case "grind": return grindPhases;
      case "cooldown": return cooldownPhases;
    }
  }, [activeSection, warmupPhases, grindPhases, cooldownPhases]);

  const setActivePhases = useCallback((phases: WorkoutPhase[]) => {
    switch (activeSection) {
      case "warmup": setWarmupPhases(phases); break;
      case "grind": setGrindPhases(phases); break;
      case "cooldown": setCooldownPhases(phases); break;
    }
  }, [activeSection]);

  const getPhaseCombos = (phaseId: string): string[][] => {
    const allPhases = [...warmupPhases, ...grindPhases, ...cooldownPhases];
    const phase = allPhases.find((p) => p.id === phaseId);
    return phase?.combos || [];
  };

  const setPhaseCombos = (phaseId: string, newCombos: string[][]) => {
    const updateFn = (phases: WorkoutPhase[]) =>
      phases.map((p) => (p.id === phaseId ? { ...p, combos: newCombos } : p));
    setWarmupPhases((prev) => updateFn(prev));
    setGrindPhases((prev) => updateFn(prev));
    setCooldownPhases((prev) => updateFn(prev));
  };

  const addPhase = () => {
    const newPhase: WorkoutPhase = {
      id: generateId(),
      name: "Round",
      repeats: 1,
      segments: [{ id: generateId(), ...DEFAULT_SEGMENT }],
    };
    setActivePhases([...getActivePhases(), newPhase]);
  };

  const removePhase = (phaseId: string) => {
    setActivePhases(getActivePhases().filter((p) => p.id !== phaseId));
  };

  const updatePhase = (phaseId: string, updates: Partial<WorkoutPhase>) => {
    setActivePhases(getActivePhases().map((p) => (p.id === phaseId ? { ...p, ...updates } : p)));
  };

  const addSegment = (phaseId: string) => {
    setActivePhases(
      getActivePhases().map((p) =>
        p.id === phaseId
          ? { ...p, segments: [...p.segments, { id: generateId(), ...DEFAULT_SEGMENT }] }
          : p
      )
    );
  };

  const removeSegment = (phaseId: string, segmentId: string) => {
    setActivePhases(
      getActivePhases().map((p) =>
        p.id === phaseId ? { ...p, segments: p.segments.filter((s) => s.id !== segmentId) } : p
      )
    );
  };

  const updateSegment = (phaseId: string, segmentId: string, updates: Partial<WorkoutSegment>) => {
    setActivePhases(
      getActivePhases().map((p) =>
        p.id === phaseId
          ? { ...p, segments: p.segments.map((s) => (s.id === segmentId ? { ...s, ...updates } : s)) }
          : p
      )
    );
  };

  const cycleSegmentType = (phaseId: string, segmentId: string, currentType?: SegmentType) => {
    const types: SegmentType[] = ["shadowboxing", "speedbag", "combo", "doubleend", "sparring", "exercise", "rest"];
    const currentIndex = types.indexOf(currentType || "shadowboxing");
    const nextType = types[(currentIndex + 1) % types.length];
    const isActive = nextType !== "rest";
    const nameMap: Record<string, string> = {
      exercise: "Exercise", rest: "Rest", shadowboxing: "Shadowboxing",
      combo: "Heavy Bag", speedbag: "Speed Bag", doubleend: "Double End Bag", sparring: "Sparring",
    };
    updateSegment(phaseId, segmentId, {
      segmentType: nextType,
      type: isActive ? "active" : "rest",
      name: nameMap[nextType] || nextType,
    });
  };

  const addToCombo = (key: string) => setCurrentCombo([...currentCombo, key]);
  const removeFromCombo = (index: number) => setCurrentCombo(currentCombo.filter((_, i) => i !== index));

  const saveCombo = () => {
    if (currentCombo.length === 0 || !editingPhaseId) return;
    const phaseCombos = getPhaseCombos(editingPhaseId);
    if (editingComboIndex !== null) {
      const newCombos = [...phaseCombos];
      newCombos[editingComboIndex] = currentCombo;
      setPhaseCombos(editingPhaseId, newCombos);
      setEditingComboIndex(null);
    } else {
      setPhaseCombos(editingPhaseId, [...phaseCombos, currentCombo]);
    }
    setCurrentCombo([]);
    setShowComboBuilder(false);
  };

  const addPresetCombo = (combo: string[]) => {
    if (!editingPhaseId) return;
    const phaseCombos = getPhaseCombos(editingPhaseId);
    setPhaseCombos(editingPhaseId, [...phaseCombos, combo]);
  };

  const removePresetCombo = (combo: string[]) => {
    if (!editingPhaseId) return;
    const phaseCombos = getPhaseCombos(editingPhaseId);
    const removeIdx = phaseCombos.findIndex(
      (ec) => ec.length === combo.length && ec.every((m, i) => m === combo[i])
    );
    if (removeIdx !== -1) {
      setPhaseCombos(editingPhaseId, phaseCombos.filter((_, i) => i !== removeIdx));
    }
  };

  const addSpeedBagDrill = (drillName: string) => {
    if (!editingPhaseId) return;
    const phaseCombos = getPhaseCombos(editingPhaseId);
    setPhaseCombos(editingPhaseId, [...phaseCombos, [drillName]]);
  };

  const editCombo = (index: number) => {
    if (!editingPhaseId) return;
    const phaseCombos = getPhaseCombos(editingPhaseId);
    setCurrentCombo(phaseCombos[index]);
    setEditingComboIndex(index);
    setComboMode("custom");
    setShowComboBuilder(true);
  };

  const deleteCombo = (index: number) => {
    if (!editingPhaseId) return;
    const phaseCombos = getPhaseCombos(editingPhaseId);
    setPhaseCombos(editingPhaseId, phaseCombos.filter((_, i) => i !== index));
  };

  const calculateTotalDuration = () => {
    let total = 0;
    [...warmupPhases, ...grindPhases, ...cooldownPhases].forEach((phase) => {
      const phaseTotal = phase.segments.reduce((acc, seg) => acc + seg.duration, 0);
      total += phaseTotal * phase.repeats;
    });
    return total * megasetRepeats;
  };

  const handleSave = (andStart: boolean = false) => {
    const id = workoutId || editId || generateId();

    const workoutData: Workout = {
      id,
      name,
      icon: "fitness",
      difficulty,
      totalDuration: calculateTotalDuration(),
      isPreset: false,
      isArchived: false,
      createdAt: new Date().toISOString(),
      timesCompleted: 0,
      sections: {
        warmup: warmupPhases.map((p) => ({ ...p, section: "warmup" as const })),
        grind: grindPhases.map((p) => ({ ...p, section: "grind" as const })),
        cooldown: cooldownPhases.map((p) => ({ ...p, section: "cooldown" as const })),
      },
      megasetRepeats,
      tags: ["boxing", difficulty],
    };

    if (editId) {
      updateWorkout(id, workoutData);
    } else {
      addWorkout(workoutData);
    }

    if (andStart) {
      router.push(`/workout/${id}`);
    } else {
      router.back();
    }
  };

  const punchKeys = PUNCH_KEYS_BY_DIFFICULTY[difficulty];
  const defenseKeys = DEFENSE_KEYS_BY_DIFFICULTY[difficulty];
  const movementKeys = MOVEMENT_KEYS_BY_DIFFICULTY[difficulty];
  const presetCategories = useMemo(() => getPresetCategories(difficulty), [difficulty]);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const topPad = Math.max(insets.top, webTopInset);

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={C.mutedForeground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{editId ? "Edit Set" : "Create New Set"}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.nameSection}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Workout Name"
            placeholderTextColor={C.mutedForeground}
            style={styles.nameInput}
          />
          <Text style={styles.totalDuration}>
            Total: {formatDuration(calculateTotalDuration())}
          </Text>
        </View>

        <View style={styles.sectionTabs}>
          {(["warmup", "grind", "cooldown"] as const).map((section) => {
            const labels = { warmup: "WARMUP", grind: "ROUNDS", cooldown: "COOLDOWN" };
            const isActive = activeSection === section;
            return (
              <TouchableOpacity
                key={section}
                onPress={() => setActiveSection(section)}
                style={[styles.sectionTab, isActive && styles.sectionTabActive]}
              >
                <Text style={[styles.sectionTabText, isActive && styles.sectionTabTextActive]}>
                  {labels[section]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {activeSection === "grind" && (
          <View style={styles.megasetRow}>
            <View style={styles.megasetLabel}>
              <MaterialCommunityIcons name="repeat" size={16} color={C.mutedForeground} />
              <Text style={styles.megasetLabelText}>MEGASET</Text>
            </View>
            <View style={styles.repeatControls}>
              <TouchableOpacity
                onPress={() => setMegasetRepeats(Math.max(1, megasetRepeats - 1))}
                style={[styles.repeatBtn, megasetRepeats <= 1 && { opacity: 0.3 }]}
                disabled={megasetRepeats <= 1}
              >
                <Ionicons name="chevron-down" size={14} color={C.mutedForeground} />
              </TouchableOpacity>
              <Text style={[styles.repeatCount, megasetRepeats > 1 && { color: C.volt }]}>
                x{megasetRepeats}
              </Text>
              <TouchableOpacity
                onPress={() => setMegasetRepeats(megasetRepeats + 1)}
                style={styles.repeatBtn}
              >
                <Ionicons name="chevron-up" size={14} color={C.mutedForeground} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.phasesContainer}>
          {getActivePhases().map((phase) => (
            <PhaseCard
              key={phase.id}
              phase={phase}
              onRemove={() => removePhase(phase.id)}
              onUpdate={(updates) => updatePhase(phase.id, updates)}
              onAddSegment={() => addSegment(phase.id)}
              onRemoveSegment={(segId) => removeSegment(phase.id, segId)}
              onUpdateSegment={(segId, updates) => updateSegment(phase.id, segId, updates)}
              onCycleType={(segId, current) => cycleSegmentType(phase.id, segId, current)}
              onOpenCombos={(ctx) => {
                setEditingPhaseId(phase.id);
                if (ctx === "exercises") {
                  setEditingSegmentContext("exercises");
                  setExerciseInput("");
                  setShowComboBuilder(true);
                } else {
                  setEditingSegmentContext(ctx);
                  setCurrentCombo([]);
                  setEditingComboIndex(null);
                  setComboMode("presets");
                  setPresetSearch("");
                  setSelectedPresetCategory(null);
                  setShowComboBuilder(true);
                }
              }}
              onEditCombo={(idx) => {
                setEditingPhaseId(phase.id);
                editCombo(idx);
              }}
              onDeleteCombo={(idx) => {
                setEditingPhaseId(phase.id);
                deleteCombo(idx);
              }}
              getPhaseCombos={() => getPhaseCombos(phase.id)}
            />
          ))}

          <TouchableOpacity onPress={addPhase} style={styles.addPhaseBtn}>
            <Ionicons name="add" size={20} color={C.mutedForeground} />
            <Text style={styles.addPhaseBtnText}>Add Phase</Text>
          </TouchableOpacity>
        </View>

        <DifficultySelector difficulty={difficulty} onSelect={setDifficulty} />
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, Platform.OS === "web" ? 34 : 16) + 8 }]}>
        <TouchableOpacity
          onPress={() => handleSave(false)}
          style={styles.saveBtn}
        >
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleSave(true)}
          style={styles.startBtn}
        >
          <Ionicons name="play" size={16} color={C.background} />
          <Text style={styles.startBtnText}>Start</Text>
        </TouchableOpacity>
      </View>

      <ComboBuilderModal
        visible={showComboBuilder}
        onClose={() => setShowComboBuilder(false)}
        difficulty={difficulty}
        setDifficulty={setDifficulty}
        comboMode={comboMode}
        setComboMode={setComboMode}
        currentCombo={currentCombo}
        addToCombo={addToCombo}
        removeFromCombo={removeFromCombo}
        saveCombo={saveCombo}
        editingComboIndex={editingComboIndex}
        editingSegmentContext={editingSegmentContext}
        punchKeys={punchKeys}
        defenseKeys={defenseKeys}
        movementKeys={movementKeys}
        presetCategories={presetCategories}
        presetSearch={presetSearch}
        setPresetSearch={setPresetSearch}
        selectedPresetCategory={selectedPresetCategory}
        setSelectedPresetCategory={setSelectedPresetCategory}
        editingPhaseId={editingPhaseId}
        getPhaseCombos={getPhaseCombos}
        addPresetCombo={addPresetCombo}
        removePresetCombo={removePresetCombo}
        addSpeedBagDrill={addSpeedBagDrill}
        exerciseInput={exerciseInput}
        setExerciseInput={setExerciseInput}
      />

      <ExercisePickerModal
        visible={showExercisePicker}
        onClose={() => setShowExercisePicker(false)}
        onConfirm={(exercises) => {
          for (const ex of exercises) {
            addSpeedBagDrill(ex);
          }
          setShowExercisePicker(false);
        }}
      />
    </View>
  );
}

function DifficultySelector({ difficulty, onSelect }: { difficulty: ComboDifficulty; onSelect: (d: ComboDifficulty) => void }) {
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

interface PhaseCardProps {
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

function PhaseCard({
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

interface ComboBuilderModalProps {
  visible: boolean;
  onClose: () => void;
  difficulty: ComboDifficulty;
  setDifficulty: (d: ComboDifficulty) => void;
  comboMode: "custom" | "presets";
  setComboMode: (m: "custom" | "presets") => void;
  currentCombo: string[];
  addToCombo: (key: string) => void;
  removeFromCombo: (index: number) => void;
  saveCombo: () => void;
  editingComboIndex: number | null;
  editingSegmentContext: "speedbag" | "combo" | "exercises";
  punchKeys: string[];
  defenseKeys: string[];
  movementKeys: string[];
  presetCategories: PresetCategory[];
  presetSearch: string;
  setPresetSearch: (s: string) => void;
  selectedPresetCategory: string | null;
  setSelectedPresetCategory: (s: string | null) => void;
  editingPhaseId: string | null;
  getPhaseCombos: (phaseId: string) => string[][];
  addPresetCombo: (combo: string[]) => void;
  removePresetCombo: (combo: string[]) => void;
  addSpeedBagDrill: (drillName: string) => void;
  exerciseInput: string;
  setExerciseInput: (s: string) => void;
}

function ComboBuilderModal(props: ComboBuilderModalProps) {
  const insets = useSafeAreaInsets();
  const {
    visible, onClose, difficulty, setDifficulty, comboMode, setComboMode,
    currentCombo, addToCombo, removeFromCombo, saveCombo,
    editingComboIndex, editingSegmentContext,
    punchKeys, defenseKeys, movementKeys, presetCategories,
    presetSearch, setPresetSearch, selectedPresetCategory, setSelectedPresetCategory,
    editingPhaseId, getPhaseCombos, addPresetCombo, removePresetCombo,
    addSpeedBagDrill, exerciseInput, setExerciseInput,
  } = props;

  const existingCombos = editingPhaseId ? getPhaseCombos(editingPhaseId) : [];
  const isComboAdded = (combo: string[]) =>
    existingCombos.some((ec) => ec.length === combo.length && ec.every((m, i) => m === combo[i]));

  const modalTitle = editingSegmentContext === "speedbag"
    ? editingComboIndex !== null ? "Edit Drill" : "Add Drill"
    : editingSegmentContext === "exercises"
    ? editingComboIndex !== null ? "Edit Exercise" : "Add Exercise"
    : editingComboIndex !== null ? "Edit Combo" : "Add Combo";

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={[styles.modalContainer, { paddingTop: Math.max(insets.top, webTopInset) }]}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={24} color={C.mutedForeground} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{modalTitle}</Text>
          {comboMode === "custom" && editingSegmentContext !== "exercises" ? (
            <TouchableOpacity
              onPress={saveCombo}
              style={[styles.modalSaveBtn, currentCombo.length === 0 && { opacity: 0.4 }]}
              disabled={currentCombo.length === 0}
            >
              <Text style={styles.modalSaveBtnText}>Save</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 48 }} />
          )}
        </View>

        {editingSegmentContext !== "exercises" && (
          <View style={styles.diffAndModeSection}>
            <View style={styles.modalDiffRow}>
              {(["rookie", "beginner", "intermediate"] as const).map((d) => (
                <TouchableOpacity
                  key={d}
                  onPress={() => setDifficulty(d)}
                  style={[styles.modalDiffPill, difficulty === d && { backgroundColor: C.volt }]}
                >
                  <Text style={[styles.modalDiffPillText, difficulty === d && { color: C.background }]}>
                    {d.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalDiffRow}>
              {(["advanced", "pro"] as const).map((d) => (
                <TouchableOpacity
                  key={d}
                  onPress={() => setDifficulty(d)}
                  style={[styles.modalDiffPill, difficulty === d && { backgroundColor: C.volt }]}
                >
                  <Text style={[styles.modalDiffPillText, difficulty === d && { color: C.background }]}>
                    {d.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {editingSegmentContext !== "speedbag" && (
              <View style={styles.modeToggle}>
                <TouchableOpacity
                  onPress={() => setComboMode("presets")}
                  style={[styles.modeBtn, comboMode === "presets" && styles.modeBtnActive]}
                >
                  <Text style={[styles.modeBtnText, comboMode === "presets" && styles.modeBtnTextActive]}>
                    PRESETS
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setComboMode("custom")}
                  style={[styles.modeBtn, comboMode === "custom" && styles.modeBtnActive]}
                >
                  <Text style={[styles.modeBtnText, comboMode === "custom" && styles.modeBtnTextActive]}>
                    CUSTOM
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {editingSegmentContext === "exercises" ? (
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
          >
            <View style={styles.exerciseSection}>
              <Text style={styles.exerciseSectionTitle}>ADD EXERCISE SET</Text>
              <Text style={styles.exerciseSectionDesc}>
                Type the exercises for this round.
              </Text>
              <TextInput
                value={exerciseInput}
                onChangeText={setExerciseInput}
                placeholder='e.g. Mountain Climbers'
                placeholderTextColor={C.mutedForeground}
                style={styles.exerciseNameInput}
                returnKeyType="done"
                onSubmitEditing={() => {
                  if (exerciseInput.trim()) {
                    addSpeedBagDrill(exerciseInput.trim());
                    setExerciseInput("");
                    onClose();
                  }
                }}
              />
              <TouchableOpacity
                onPress={() => {
                  if (exerciseInput.trim()) {
                    addSpeedBagDrill(exerciseInput.trim());
                    setExerciseInput("");
                    onClose();
                  }
                }}
                style={[styles.exerciseAddBtn, !exerciseInput.trim() && { opacity: 0.4 }]}
                disabled={!exerciseInput.trim()}
              >
                <Text style={styles.exerciseAddBtnText}>Add Exercise Set</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowExercisePicker(true)}
                style={styles.browseExercisesBtn}
              >
                <Ionicons name="list" size={14} color={C.volt} />
                <Text style={styles.browseExercisesBtnText}>Browse Exercises</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        ) : comboMode === "presets" || editingSegmentContext === "speedbag" ? (
          <PresetsView
            editingSegmentContext={editingSegmentContext}
            difficulty={difficulty}
            presetCategories={presetCategories}
            presetSearch={presetSearch}
            setPresetSearch={setPresetSearch}
            selectedPresetCategory={selectedPresetCategory}
            setSelectedPresetCategory={setSelectedPresetCategory}
            isComboAdded={isComboAdded}
            addPresetCombo={addPresetCombo}
            removePresetCombo={removePresetCombo}
            addSpeedBagDrill={addSpeedBagDrill}
            onClose={onClose}
          />
        ) : (
          <CustomBuilderView
            currentCombo={currentCombo}
            addToCombo={addToCombo}
            removeFromCombo={removeFromCombo}
            punchKeys={punchKeys}
            defenseKeys={defenseKeys}
            movementKeys={movementKeys}
          />
        )}
      </View>
    </Modal>
  );
}

function PresetsView({
  editingSegmentContext,
  difficulty,
  presetCategories,
  presetSearch,
  setPresetSearch,
  selectedPresetCategory,
  setSelectedPresetCategory,
  isComboAdded,
  addPresetCombo,
  removePresetCombo,
  addSpeedBagDrill,
  onClose,
}: {
  editingSegmentContext: "speedbag" | "combo" | "exercises";
  difficulty: ComboDifficulty;
  presetCategories: PresetCategory[];
  presetSearch: string;
  setPresetSearch: (s: string) => void;
  selectedPresetCategory: string | null;
  setSelectedPresetCategory: (s: string | null) => void;
  isComboAdded: (combo: string[]) => boolean;
  addPresetCombo: (combo: string[]) => void;
  removePresetCombo: (combo: string[]) => void;
  addSpeedBagDrill: (drillName: string) => void;
  onClose: () => void;
}) {
  if (editingSegmentContext === "speedbag") {
    const levels = ["rookie", "beginner", "intermediate", "advanced", "pro"];
    const idx = levels.indexOf(difficulty);
    const availableIds = levels.slice(0, idx + 1).flatMap((l) => DRILL_CATEGORIES[l]);
    const drills = SPEED_BAG_DRILLS.filter((d) => d.id !== "freestyle" && availableIds.includes(d.id));

    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 8 }}>
        <Text style={styles.presetSectionLabel}>{difficulty.toUpperCase()} DRILLS</Text>
        {drills.map((drill) => (
          <TouchableOpacity
            key={drill.id}
            onPress={() => {
              addSpeedBagDrill(drill.name);
              onClose();
            }}
            style={styles.drillItem}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.drillName}>{drill.name}</Text>
              <Text style={styles.drillDesc}>{drill.description}</Text>
            </View>
            <Ionicons name="add" size={20} color={C.volt} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  }

  const searchLower = presetSearch.toLowerCase();
  const visibleCombos: { combo: string[]; catName: string; idx: number }[] = [];
  presetCategories.forEach((cat) => {
    if (selectedPresetCategory && cat.name !== selectedPresetCategory) return;
    cat.combos.forEach((combo, idx) => {
      if (searchLower && !combo.some((m) => m.toLowerCase().includes(searchLower))) return;
      visibleCombos.push({ combo, catName: cat.name, idx });
    });
  });

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={C.mutedForeground} style={{ marginRight: 8 }} />
          <TextInput
            value={presetSearch}
            onChangeText={setPresetSearch}
            placeholder="Search combos..."
            placeholderTextColor={C.mutedForeground}
            style={styles.searchInput}
          />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 8 }}
          contentContainerStyle={{ gap: 6 }}
        >
          {presetCategories.map((cat, catIdx) => {
            const isActive = selectedPresetCategory === cat.name;
            return (
              <TouchableOpacity
                key={catIdx}
                onPress={() => setSelectedPresetCategory(isActive ? null : cat.name)}
                style={[styles.catPill, isActive && styles.catPillActive]}
              >
                <Text style={[styles.catPillText, isActive && styles.catPillTextActive]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={visibleCombos}
        keyExtractor={(item, i) => `${item.catName}-${item.idx}-${i}`}
        contentContainerStyle={{ padding: 16, gap: 6 }}
        renderItem={({ item }) => {
          const added = isComboAdded(item.combo);
          return (
            <TouchableOpacity
              onPress={() => {
                if (added) {
                  removePresetCombo(item.combo);
                } else {
                  addPresetCombo(item.combo);
                }
              }}
              style={[styles.presetComboItem, added && styles.presetComboItemAdded]}
            >
              <View style={styles.presetComboMoves}>
                {item.combo.map((move, mIdx) => {
                  const ms = getMoveStyle(move);
                  return (
                    <View key={mIdx} style={[styles.moveBadge, { backgroundColor: ms.bg }]}>
                      <Text style={[styles.moveBadgeText, { color: ms.fg }]}>{move}</Text>
                    </View>
                  );
                })}
              </View>
              <Ionicons name={added ? "checkmark" : "add"} size={18} color={C.volt} />
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No combos found</Text>
        }
      />
    </View>
  );
}

function CustomBuilderView({
  currentCombo,
  addToCombo,
  removeFromCombo,
  punchKeys,
  defenseKeys,
  movementKeys,
}: {
  currentCombo: string[];
  addToCombo: (key: string) => void;
  removeFromCombo: (index: number) => void;
  punchKeys: string[];
  defenseKeys: string[];
  movementKeys: string[];
}) {
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.currentComboDisplay}>
        {currentCombo.length === 0 ? (
          <Text style={styles.comboPlaceholder}>Tap keys to build combo</Text>
        ) : (
          <View style={styles.currentComboRow}>
            {currentCombo.map((move, idx) => {
              const ms = getMoveStyle(move);
              return (
                <TouchableOpacity
                  key={idx}
                  onPress={() => removeFromCombo(idx)}
                  style={[styles.currentMoveBadge, { backgroundColor: ms.bg, borderColor: ms.fg + "40" }]}
                >
                  <Text style={[styles.currentMoveBadgeText, { color: ms.fg }]}>{move}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      <View style={styles.keySection}>
        <Text style={styles.keySectionLabel}>PUNCHES</Text>
        <View style={styles.keyGrid}>
          {punchKeys.map((key) => (
            <TouchableOpacity key={key} onPress={() => addToCombo(key)} style={styles.punchKey}>
              <Text style={styles.punchKeyText}>{key}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {defenseKeys.length > 0 && (
        <View style={styles.keySection}>
          <Text style={styles.keySectionLabel}>DEFENSE</Text>
          <View style={styles.defenseKeyGrid}>
            {defenseKeys.map((key) => (
              <TouchableOpacity key={key} onPress={() => addToCombo(key)} style={styles.defenseKey}>
                <Text style={styles.defenseKeyText}>{key}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {movementKeys.length > 0 && (
        <View style={styles.keySection}>
          <Text style={styles.keySectionLabel}>MOVEMENT</Text>
          <View style={styles.movementKeyGrid}>
            {movementKeys.map((key) => (
              <TouchableOpacity key={key} onPress={() => addToCombo(key)} style={styles.movementKey}>
                <Text style={styles.movementKeyText}>{key}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PUNCH_KEY_SIZE = (SCREEN_WIDTH - 16 * 2 - 8 * 3) / 4;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.surface3,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: C.mutedForeground,
  },
  scrollView: {
    flex: 1,
  },
  nameSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.surface3,
  },
  nameInput: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: C.foreground,
    padding: 0,
  },
  totalDuration: {
    fontSize: 13,
    color: C.mutedForeground,
    marginTop: 8,
  },
  sectionTabs: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.surface3,
  },
  sectionTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  sectionTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: C.volt,
  },
  sectionTabText: {
    fontSize: 12,
    fontWeight: "600" as const,
    letterSpacing: 1,
    color: C.mutedForeground,
  },
  sectionTabTextActive: {
    color: C.volt,
  },
  megasetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.surface3,
  },
  megasetLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  megasetLabelText: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: C.mutedForeground,
    letterSpacing: 1,
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
  phasesContainer: {
    padding: 16,
    gap: 16,
  },
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
  addPhaseBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: "dashed" as const,
    borderColor: C.surface3,
    gap: 8,
  },
  addPhaseBtnText: {
    fontSize: 14,
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
  bottomBar: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: C.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.surface3,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.surface3,
    alignItems: "center",
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: C.foreground,
  },
  startBtn: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: C.volt,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  startBtnText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: C.background,
  },

  modalContainer: {
    flex: 1,
    backgroundColor: C.background,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.surface3,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: C.foreground,
  },
  modalSaveBtn: {
    backgroundColor: C.volt,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  modalSaveBtnText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: C.background,
  },
  diffAndModeSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.surface3,
    gap: 8,
  },
  modalDiffRow: {
    flexDirection: "row",
    gap: 6,
  },
  modalDiffPill: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: C.surface2,
    alignItems: "center",
  },
  modalDiffPillText: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: C.mutedForeground,
    letterSpacing: 0.5,
  },
  modeToggle: {
    flexDirection: "row",
    backgroundColor: C.surface2,
    borderRadius: 8,
    padding: 2,
    marginTop: 4,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 6,
  },
  modeBtnActive: {
    backgroundColor: C.volt,
  },
  modeBtnText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: C.mutedForeground,
    letterSpacing: 1,
  },
  modeBtnTextActive: {
    color: C.background,
  },

  presetSectionLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: C.mutedForeground,
    letterSpacing: 1,
    marginBottom: 8,
  },
  drillItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface1,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: C.surface3,
    gap: 12,
  },
  drillName: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: C.foreground,
  },
  drillDesc: {
    fontSize: 11,
    color: C.mutedForeground,
    marginTop: 2,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.surface3,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: C.foreground,
    paddingVertical: 8,
  },
  catPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.surface3,
  },
  catPillActive: {
    backgroundColor: C.volt,
    borderColor: C.volt,
  },
  catPillText: {
    fontSize: 10,
    fontWeight: "500" as const,
    color: C.mutedForeground,
  },
  catPillTextActive: {
    color: C.background,
  },
  presetComboItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface1,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: C.surface3,
    gap: 8,
  },
  presetComboItemAdded: {
    backgroundColor: C.voltDim,
    borderColor: C.voltMuted,
  },
  presetComboMoves: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  emptyText: {
    textAlign: "center" as const,
    color: C.mutedForeground,
    fontSize: 13,
    paddingVertical: 32,
  },

  currentComboDisplay: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.surface3,
    minHeight: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  comboPlaceholder: {
    color: C.mutedForeground,
    fontSize: 14,
  },
  currentComboRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  currentMoveBadge: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  currentMoveBadgeText: {
    fontSize: 16,
    fontWeight: "700" as const,
  },
  keySection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  keySectionLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: C.mutedForeground,
    letterSpacing: 1,
    marginBottom: 10,
  },
  keyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  punchKey: {
    width: PUNCH_KEY_SIZE,
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: C.surface1,
    borderWidth: 1,
    borderColor: C.surface3,
    alignItems: "center",
    justifyContent: "center",
  },
  punchKeyText: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: C.foreground,
  },
  defenseKeyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  defenseKey: {
    width: (SCREEN_WIDTH - 32 - 16) / 3,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: C.surface1,
    borderWidth: 1,
    borderColor: C.surface3,
    alignItems: "center",
    justifyContent: "center",
  },
  defenseKeyText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: C.foreground,
  },
  movementKeyGrid: {
    flexDirection: "row",
    gap: 8,
  },
  movementKey: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: C.surface1,
    borderWidth: 1,
    borderColor: C.surface3,
    alignItems: "center",
    justifyContent: "center",
  },
  movementKeyText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: C.foreground,
  },

  exerciseSection: {
    padding: 16,
    gap: 12,
  },
  exerciseSectionTitle: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: C.mutedForeground,
    letterSpacing: 1,
  },
  exerciseSectionDesc: {
    fontSize: 12,
    color: C.mutedForeground,
  },
  exerciseNameInput: {
    backgroundColor: C.surface2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.surface3,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: C.foreground,
  },
  exerciseAddBtn: {
    backgroundColor: C.volt,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  exerciseAddBtnText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: C.background,
  },
  browseExercisesBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.volt,
    backgroundColor: "transparent",
  },
  browseExercisesBtnText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: C.volt,
  },
});
