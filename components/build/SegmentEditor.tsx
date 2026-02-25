import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  Platform,
  KeyboardAvoidingView,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import colors from "@/constants/colors";
import { ComboDifficulty } from "@/data/comboPresets";
import { SPEED_BAG_DRILLS } from "@/data/speedBagDrills";
import { PresetCategory } from "@/data/presetComboLibrary";
import { getMoveStyle } from "./PhaseEditor";

const C = colors.dark;

const DRILL_CATEGORIES: Record<string, string[]> = {
  rookie: ["single-alternating", "doubles"],
  beginner: ["single-alternating", "doubles", "double-right-lead", "double-left-lead", "side-to-side"],
  intermediate: ["triples", "triple-right-lead", "triple-left-lead", "fist-rolls-forward", "backfists", "elbow-strikes"],
  advanced: ["fist-rolls-reverse", "one-two-rhythm"],
  pro: [],
};

export interface ComboBuilderModalProps {
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
  setShowExercisePicker: (v: boolean) => void;
}

export function ComboBuilderModal(props: ComboBuilderModalProps) {
  const insets = useSafeAreaInsets();
  const {
    visible, onClose, difficulty, setDifficulty, comboMode, setComboMode,
    currentCombo, addToCombo, removeFromCombo, saveCombo,
    editingComboIndex, editingSegmentContext,
    punchKeys, defenseKeys, movementKeys, presetCategories,
    presetSearch, setPresetSearch, selectedPresetCategory, setSelectedPresetCategory,
    editingPhaseId, getPhaseCombos, addPresetCombo, removePresetCombo,
    addSpeedBagDrill, exerciseInput, setExerciseInput, setShowExercisePicker,
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
  moveBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  moveBadgeText: {
    fontSize: 10,
    fontWeight: "600" as const,
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
