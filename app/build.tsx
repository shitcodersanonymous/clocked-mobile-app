import { useState, useMemo, useEffect, useCallback } from "react";
import { useHistoryStore } from "@/stores/historyStore";
import { analyzeWorkoutHistory } from "@/lib/workoutHistoryAnalysis";
import { getApiUrl } from "@/lib/query-client";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import colors from "@/constants/colors";
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
  getPresetCategories,
} from "@/data/comboPresets";
import {
  parseWorkoutInput as parseWorkoutInputFn,
  parsedResultToWorkout as parsedResultToWorkoutFn,
} from "@/lib/aiWorkoutParser";
import { AIBuilderSection } from "@/components/build/AIBuilderSection";
import { PhaseCard, DifficultySelector, getPhaseSegmentContext } from "@/components/build/PhaseEditor";
import { ComboBuilderModal } from "@/components/build/SegmentEditor";

const C = colors.dark;

const DEFAULT_SEGMENT: Omit<WorkoutSegment, "id"> = {
  name: "Shadowboxing",
  type: "active",
  segmentType: "shadowboxing",
  duration: 60,
};

export default function BuildScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ edit?: string; coachPrompt?: string }>();
  const editId = params.edit;
  const coachPrompt = params.coachPrompt;

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

  const [buildMode, setBuildMode] = useState<"custom" | "ai">(coachPrompt ? "ai" : "custom");
  const [aiPrompt, setAiPrompt] = useState(coachPrompt ? decodeURIComponent(coachPrompt) : "");
  const [aiGenerating, setAiGenerating] = useState(false);

  useEffect(() => {
    if (coachPrompt) {
      setBuildMode("ai");
      setAiPrompt(decodeURIComponent(coachPrompt));
    }
  }, [coachPrompt]);

  const applyWorkoutToEditor = (workout: Workout) => {
    setName(workout.name);
    setDifficulty((workout.difficulty || "beginner") as ComboDifficulty);
    setWarmupPhases(workout.sections.warmup);
    setGrindPhases(workout.sections.grind);
    setCooldownPhases(workout.sections.cooldown);
    setMegasetRepeats(workout.megasetRepeats || 1);
    setBuildMode("custom");
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setAiGenerating(true);

    try {
      const userLevel = user?.experienceLevel || user?.prestige || "beginner";
      const userEquipment = (user as any)?.equipment || {};

      let historyInsights = undefined;
      try {
        const history = useHistoryStore.getState().completedWorkouts;
        if (history.length > 0) {
          const analysisHistory = history.map((w) => ({
            id: w.id,
            workout_name: w.workoutName,
            completed_at: w.completedAt,
            duration: w.duration,
            xp_earned: w.xpEarned,
            difficulty: w.difficulty || null,
            notes: w.notes || null,
            round_feedback: w.roundFeedback || null,
            is_manual_entry: w.isManualEntry,
          }));
          const insights = analyzeWorkoutHistory(analysisHistory);
          historyInsights = {
            averageDifficulty: insights.averageDifficulty,
            recentTrend: insights.recentTrend,
            preferredDuration: insights.preferredDuration,
            suggestedDifficultyAdjust: insights.suggestedDifficultyAdjust,
            totalWorkouts: insights.totalWorkouts,
          };
        }
      } catch {
        // History analysis is optional — don't block generation
      }

      // Layer 1: KOI AI agent via Gemini API
      try {
        const baseUrl = getApiUrl();
        const response = await fetch(
          new URL("/api/generate-workout", baseUrl).toString(),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: aiPrompt.trim(),
              userTier: userLevel,
              equipment: userEquipment,
              experienceLevel: userLevel,
              historyInsights,
            }),
          }
        );

        const data = await response.json();

        if (!data.fallback && !data.error && data.phases) {
          console.log("[KOI] AI success:", data.name);
          const workout = parsedResultToWorkoutFn(data);
          applyWorkoutToEditor(workout);
          return;
        }

        console.warn("[KOI] AI returned fallback:", data.error);
      } catch (e) {
        console.warn("[KOI] AI failed, falling back to regex parser:", e);
      }

      // Layer 2: Regex parser fallback
      const parsed = parseWorkoutInputFn(aiPrompt.trim(), userLevel);
      const workout = parsedResultToWorkoutFn(parsed);
      applyWorkoutToEditor(workout);

    } catch {
      Alert.alert("Parse Error", "Could not parse that prompt. Try being more specific.");
    } finally {
      setAiGenerating(false);
    }
  };

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

      {!editId && (
        <View style={styles.buildModeToggle}>
          <TouchableOpacity
            onPress={() => setBuildMode("custom")}
            style={[styles.buildModeBtn, buildMode === "custom" && styles.buildModeBtnActive]}
          >
            <Feather name="sliders" size={14} color={buildMode === "custom" ? C.background : C.mutedForeground} />
            <Text style={[styles.buildModeBtnText, buildMode === "custom" && styles.buildModeBtnTextActive]}>
              Custom Build
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setBuildMode("ai")}
            style={[styles.buildModeBtn, buildMode === "ai" && styles.buildModeBtnActive]}
          >
            <Ionicons name="sparkles" size={14} color={buildMode === "ai" ? C.background : C.mutedForeground} />
            <Text style={[styles.buildModeBtnText, buildMode === "ai" && styles.buildModeBtnTextActive]}>
              AI Builder
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {buildMode === "ai" && !editId ? (
        <AIBuilderSection
          aiPrompt={aiPrompt}
          setAiPrompt={setAiPrompt}
          aiGenerating={aiGenerating}
          onGenerate={handleAiGenerate}
        />
      ) : (
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
      )}

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
        setShowExercisePicker={setShowExercisePicker}
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
  buildModeToggle: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: C.surface2,
    borderRadius: 10,
    padding: 3,
  },
  buildModeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  buildModeBtnActive: {
    backgroundColor: C.volt,
  },
  buildModeBtnText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: C.mutedForeground,
    letterSpacing: 0.5,
  },
  buildModeBtnTextActive: {
    color: C.background,
  },
});
