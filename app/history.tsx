import { useState, useCallback, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
  interpolate,
} from "react-native-reanimated";
import colors from "@/constants/colors";
import { useHistoryStore } from "@/stores/historyStore";
import { useUserStore } from "@/stores/userStore";
import { CompletedWorkout, WorkoutHistoryEntry } from "@/lib/types";
import { formatDuration, formatRelativeDate, generateId } from "@/lib/utils";
import {
  generateCoachRecommendation,
  CoachRecommendation,
  ProfileData,
} from "@/lib/coachEngine";

const FOCUS_AREA_ICONS: Record<string, string> = {
  power: "flash",
  speed: "speedometer",
  defense: "shield-half-full",
  body_work: "target",
  footwork: "shoe-print",
  endurance: "lungs",
  technique: "boxing-glove",
  variety: "shuffle-variant",
  conditioning: "dumbbell",
  recovery: "meditation",
};

const CONFIDENCE_STYLES: Record<string, { bg: string; text: string }> = {
  high: { bg: "rgba(68, 204, 136, 0.15)", text: colors.dark.green },
  medium: { bg: colors.dark.voltDim, text: colors.dark.volt },
  low: { bg: colors.dark.orangeDim, text: colors.dark.orange },
};

function completedToHistoryEntry(w: CompletedWorkout): WorkoutHistoryEntry {
  return {
    id: w.id,
    workout_name: w.workoutName,
    completed_at: w.completedAt,
    duration: w.duration,
    xp_earned: w.xpEarned,
    difficulty: w.difficulty || null,
    notes: w.notes || null,
    round_feedback: w.roundFeedback || null,
    is_manual_entry: w.isManualEntry,
  };
}

function ExpandableWorkoutItem({
  workout,
  isExpanded,
  onToggle,
}: {
  workout: CompletedWorkout;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const rotation = useSharedValue(isExpanded ? 1 : 0);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(rotation.value, [0, 1], [0, 90])}deg` }],
  }));

  const handlePress = useCallback(() => {
    rotation.value = withTiming(isExpanded ? 0 : 1, { duration: 200 });
    onToggle();
  }, [isExpanded, onToggle]);

  const difficultyLabel =
    workout.difficulty === "too_easy"
      ? "Too Easy"
      : workout.difficulty === "just_right"
        ? "Just Right"
        : workout.difficulty === "too_hard"
          ? "Too Hard"
          : null;

  const difficultyColor =
    workout.difficulty === "too_easy"
      ? colors.dark.green
      : workout.difficulty === "just_right"
        ? colors.dark.volt
        : workout.difficulty === "too_hard"
          ? colors.dark.red
          : colors.dark.mutedForeground;

  return (
    <View style={styles.workoutCard}>
      <TouchableOpacity
        style={styles.workoutCardHeader}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.workoutCardLeft}>
          <Text style={styles.workoutName} numberOfLines={1}>
            {workout.workoutName}
          </Text>
          <View style={styles.workoutMeta}>
            <View style={styles.metaItem}>
              <Ionicons
                name="calendar-outline"
                size={12}
                color={colors.dark.mutedForeground}
              />
              <Text style={styles.metaText}>
                {formatRelativeDate(workout.completedAt)}
              </Text>
            </View>
            <Text style={styles.metaDot}> </Text>
            <Text style={styles.metaText}>{formatDuration(workout.duration)}</Text>
            <Text style={styles.metaDot}> </Text>
            <Text style={styles.xpText}>+{workout.xpEarned} XP</Text>
          </View>
        </View>
        <Animated.View style={chevronStyle}>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={colors.dark.mutedForeground}
          />
        </Animated.View>
      </TouchableOpacity>

      {isExpanded && (
        <Animated.View
          entering={FadeIn.duration(200)}
          style={styles.expandedContent}
        >
          {difficultyLabel && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Difficulty:</Text>
              <View
                style={[
                  styles.difficultyBadge,
                  { backgroundColor: `${difficultyColor}20` },
                ]}
              >
                <Text style={[styles.difficultyText, { color: difficultyColor }]}>
                  {difficultyLabel}
                </Text>
              </View>
            </View>
          )}

          {workout.roundFeedback && workout.roundFeedback.length > 0 && (
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Round Ratings</Text>
              <View style={styles.roundFeedbackRow}>
                {workout.roundFeedback.map((rf) => (
                  <View key={rf.roundNumber} style={styles.roundBadge}>
                    <Text style={styles.roundNumber}>R{rf.roundNumber}</Text>
                    <Text style={styles.roundRating}>{rf.rating}/5</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {workout.notes ? (
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Journal</Text>
              <View style={styles.notesBox}>
                <Text style={styles.notesText}>{workout.notes}</Text>
              </View>
            </View>
          ) : null}

          {workout.isManualEntry && (
            <View style={styles.manualBadgeContainer}>
              <View style={styles.manualBadge}>
                <Feather name="edit-3" size={10} color={colors.dark.mutedForeground} />
                <Text style={styles.manualBadgeText}>Manual Entry</Text>
              </View>
            </View>
          )}

          <Text style={styles.fullDate}>
            {new Date(workout.completedAt).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}{" "}
            {new Date(workout.completedAt).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

function AddWorkoutModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [durationMins, setDurationMins] = useState("");
  const [notes, setNotes] = useState("");
  const [difficulty, setDifficulty] = useState<
    "too_easy" | "just_right" | "too_hard" | null
  >(null);

  const addCompletedWorkout = useHistoryStore((s) => s.addCompletedWorkout);
  const updateUser = useUserStore((s) => s.updateUser);
  const addXP = useUserStore((s) => s.addXP);
  const user = useUserStore((s) => s.user);

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert("Name Required", "Please enter a workout name.");
      return;
    }
    const mins = parseInt(durationMins, 10);
    if (isNaN(mins) || mins <= 0) {
      Alert.alert("Duration Required", "Please enter a valid duration in minutes.");
      return;
    }

    const durationSecs = mins * 60;
    const xp = Math.round(durationSecs * 0.1);

    const workout: CompletedWorkout = {
      id: generateId(),
      workoutName: name.trim(),
      completedAt: new Date().toISOString(),
      duration: durationSecs,
      xpEarned: xp,
      difficulty: difficulty || undefined,
      notes: notes.trim() || undefined,
      isManualEntry: true,
    };

    addCompletedWorkout(workout);
    addXP(xp);
    if (user) {
      updateUser({
        workoutsCompleted: (user.workoutsCompleted || 0) + 1,
        totalTrainingSeconds: (user.totalTrainingSeconds || 0) + durationSecs,
        lastWorkoutDate: new Date().toISOString(),
      });
    }

    setName("");
    setDurationMins("");
    setNotes("");
    setDifficulty(null);
    onClose();
  };

  const difficultyOptions: {
    value: "too_easy" | "just_right" | "too_hard";
    label: string;
    color: string;
  }[] = [
    { value: "too_easy", label: "Too Easy", color: colors.dark.green },
    { value: "just_right", label: "Just Right", color: colors.dark.volt },
    { value: "too_hard", label: "Too Hard", color: colors.dark.red },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Log Workout</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.dark.mutedForeground} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalBody}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.inputLabel}>Workout Name</Text>
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Heavy Bag Session"
              placeholderTextColor={colors.dark.mutedForeground}
            />

            <Text style={styles.inputLabel}>Duration (minutes)</Text>
            <TextInput
              style={styles.textInput}
              value={durationMins}
              onChangeText={setDurationMins}
              placeholder="30"
              placeholderTextColor={colors.dark.mutedForeground}
              keyboardType="number-pad"
            />

            <Text style={styles.inputLabel}>Difficulty</Text>
            <View style={styles.difficultyRow}>
              {difficultyOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.difficultyOption,
                    difficulty === opt.value && {
                      borderColor: opt.color,
                      backgroundColor: `${opt.color}15`,
                    },
                  ]}
                  onPress={() =>
                    setDifficulty(difficulty === opt.value ? null : opt.value)
                  }
                >
                  <Text
                    style={[
                      styles.difficultyOptionText,
                      difficulty === opt.value && { color: opt.color },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Notes (optional)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="How did it go?"
              placeholderTextColor={colors.dark.mutedForeground}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </ScrollView>

          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Ionicons name="checkmark" size={20} color={colors.dark.background} />
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function CoachModal({
  visible,
  onClose,
  recommendation,
  isGenerating,
}: {
  visible: boolean;
  onClose: () => void;
  recommendation: CoachRecommendation | null;
  isGenerating: boolean;
}) {
  if (!visible) return null;

  const confidenceStyle = recommendation
    ? CONFIDENCE_STYLES[recommendation.confidence]
    : null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { maxHeight: "80%" }]}>
          <View style={styles.modalHeader}>
            <View style={styles.coachHeaderLeft}>
              <View style={styles.coachIconBox}>
                <MaterialCommunityIcons
                  name="brain"
                  size={18}
                  color={colors.dark.volt}
                />
              </View>
              <View>
                <Text style={styles.modalTitle}>AI COACH</Text>
                {recommendation && confidenceStyle && (
                  <View
                    style={[
                      styles.confidenceBadge,
                      { backgroundColor: confidenceStyle.bg },
                    ]}
                  >
                    <Text
                      style={[styles.confidenceText, { color: confidenceStyle.text }]}
                    >
                      {recommendation.confidence.toUpperCase()} confidence{" "}
                      {recommendation.dataPointsUsed} sessions
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.dark.mutedForeground} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalBody}
            showsVerticalScrollIndicator={false}
          >
            {isGenerating ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.dark.volt} />
                <Text style={styles.loadingText}>
                  Analyzing your training data...
                </Text>
              </View>
            ) : recommendation ? (
              <>
                <Text style={styles.coachHeadline}>{recommendation.headline}</Text>
                <View style={styles.reasoningContainer}>
                  {recommendation.reasoning.split("\n").map((line, i) => (
                    <View key={i} style={styles.reasoningLine}>
                      <Text style={styles.reasoningBullet}>
                        {"\u2022"}
                      </Text>
                      <Text style={styles.reasoningText}>{line}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.paramsCard}>
                  <View style={styles.paramsGrid}>
                    <View style={styles.paramItem}>
                      <Text style={styles.paramLabel}>TYPE</Text>
                      <Text style={styles.paramValue}>
                        {recommendation.workoutType}
                      </Text>
                    </View>
                    <View style={styles.paramItem}>
                      <Text style={styles.paramLabel}>DIFFICULTY</Text>
                      <Text style={styles.paramValue}>
                        {recommendation.suggestedDifficulty}
                      </Text>
                    </View>
                    <View style={styles.paramItem}>
                      <Text style={styles.paramLabel}>ROUNDS</Text>
                      <Text style={styles.paramValue}>
                        {recommendation.suggestedRounds}
                      </Text>
                    </View>
                    <View style={styles.paramItem}>
                      <Text style={styles.paramLabel}>ROUND TIME</Text>
                      <Text style={styles.paramValue}>
                        {recommendation.suggestedRoundDuration / 60} min
                      </Text>
                    </View>
                    <View style={styles.paramItem}>
                      <Text style={styles.paramLabel}>REST</Text>
                      <Text style={styles.paramValue}>
                        {recommendation.suggestedRestDuration}s
                      </Text>
                    </View>
                    <View style={styles.paramItem}>
                      <Text style={styles.paramLabel}>EST. DURATION</Text>
                      <Text style={styles.paramValue}>
                        ~{recommendation.targetDuration} min
                      </Text>
                    </View>
                  </View>
                </View>

                {recommendation.focusAreas.length > 0 && (
                  <View style={styles.coachSection}>
                    <Text style={styles.coachSectionLabel}>FOCUS AREAS</Text>
                    <View style={styles.tagsRow}>
                      {recommendation.focusAreas.map((area) => (
                        <View key={area} style={styles.focusTag}>
                          <MaterialCommunityIcons
                            name={
                              (FOCUS_AREA_ICONS[area] as any) || "target"
                            }
                            size={12}
                            color={colors.dark.volt}
                          />
                          <Text style={styles.focusTagText}>
                            {area.replace("_", " ")}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {recommendation.punchEmphasis.length > 0 && (
                  <View style={styles.coachSection}>
                    <Text style={styles.coachSectionLabel}>PUNCH EMPHASIS</Text>
                    <View style={styles.tagsRow}>
                      {recommendation.punchEmphasis.map((p) => (
                        <View key={p} style={styles.punchTag}>
                          <Text style={styles.punchTagText}>{p}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {recommendation.defenseEmphasis.length > 0 && (
                  <View style={styles.coachSection}>
                    <Text style={styles.coachSectionLabel}>DEFENSE WORK</Text>
                    <View style={styles.tagsRow}>
                      {recommendation.defenseEmphasis.map((d) => (
                        <View key={d} style={styles.defenseTag}>
                          <Ionicons
                            name="shield-half"
                            size={12}
                            color={colors.dark.foreground}
                          />
                          <Text style={styles.defenseTagText}>{d}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                <View style={styles.comboGuidanceCard}>
                  <Text style={styles.coachSectionLabel}>COMBO GUIDANCE</Text>
                  <Text style={styles.comboGuidanceText}>
                    <Text style={styles.comboGuidanceBold}>
                      {recommendation.comboComplexity}
                    </Text>{" "}
                    complexity, {recommendation.comboLengthRange[0]}-
                    {recommendation.comboLengthRange[1]} moves per combo
                    {recommendation.includeDefenseInCombos
                      ? " \u2022 includes defense tokens"
                      : ""}
                  </Text>
                </View>

                {recommendation.encouragement ? (
                  <View style={styles.encouragementCard}>
                    <Ionicons
                      name="fitness"
                      size={16}
                      color={colors.dark.volt}
                    />
                    <Text style={styles.encouragementText}>
                      {recommendation.encouragement}
                    </Text>
                  </View>
                ) : null}
              </>
            ) : null}
          </ScrollView>

          {!isGenerating && recommendation && (
            <View style={styles.coachActions}>
              <TouchableOpacity
                style={styles.coachCloseButton}
                onPress={onClose}
              >
                <Text style={styles.coachCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCoach, setShowCoach] = useState(false);
  const [recommendation, setRecommendation] =
    useState<CoachRecommendation | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const completedWorkouts = useHistoryStore((s) => s.completedWorkouts);
  const user = useUserStore((s) => s.user);

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const handleCoach = useCallback(() => {
    if (completedWorkouts.length === 0 && !user) {
      Alert.alert(
        "No Data",
        "Complete some workouts first to get Coach recommendations."
      );
      return;
    }

    setShowCoach(true);
    setIsGenerating(true);

    setTimeout(() => {
      const profileData: ProfileData = {
        prestige: user?.prestige || null,
        current_level: user?.currentLevel || null,
        current_streak: user?.currentStreak || 0,
        longest_streak: user?.longestStreak || 0,
        workouts_completed: user?.workoutsCompleted || 0,
        total_training_seconds: user?.totalTrainingSeconds || null,
        experience_level: user?.experienceLevel || "beginner",
        equipment:
          (user?.equipment as Record<string, boolean | string>) || null,
        goals: user?.goals || [],
        last_workout_date: user?.lastWorkoutDate || null,
        comeback_count: user?.comebackCount || 0,
        double_days: user?.doubleDays || 0,
        morning_workouts: user?.morningWorkouts || 0,
        night_workouts: user?.nightWorkouts || 0,
        weekend_workouts: user?.weekendWorkouts || 0,
        weekday_workouts: user?.weekdayWorkouts || 0,
        punch_1_count: user?.punch1Count || 0,
        punch_2_count: user?.punch2Count || 0,
        punch_3_count: user?.punch3Count || 0,
        punch_4_count: user?.punch4Count || 0,
        punch_5_count: user?.punch5Count || 0,
        punch_6_count: user?.punch6Count || 0,
        punch_7_count: user?.punch7Count || 0,
        punch_8_count: user?.punch8Count || 0,
        slips_count: user?.slipsCount || 0,
        rolls_count: user?.rollsCount || 0,
        pullbacks_count: user?.pullbacksCount || 0,
        circles_count: user?.circlesCount || 0,
      };

      const historyEntries = completedWorkouts.map(completedToHistoryEntry);
      const rec = generateCoachRecommendation(historyEntries, profileData);
      setRecommendation(rec);
      setIsGenerating(false);
    }, 600);
  }, [completedWorkouts, user]);

  const toggleExpand = useCallback(
    (id: string) => {
      setExpandedId((prev) => (prev === id ? null : id));
    },
    []
  );

  const renderItem = useCallback(
    ({ item }: { item: CompletedWorkout }) => (
      <ExpandableWorkoutItem
        workout={item}
        isExpanded={expandedId === item.id}
        onToggle={() => toggleExpand(item.id)}
      />
    ),
    [expandedId, toggleExpand]
  );

  const keyExtractor = useCallback((item: CompletedWorkout) => item.id, []);

  const ListEmptyComponent = useMemo(
    () => (
      <View style={styles.emptyState}>
        <Ionicons
          name="time-outline"
          size={48}
          color={colors.dark.surface3}
        />
        <Text style={styles.emptyTitle}>No History Yet</Text>
        <Text style={styles.emptySubtitle}>
          Complete a workout or log one manually to get started
        </Text>
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={18} color={colors.dark.background} />
          <Text style={styles.emptyButtonText}>Log a Workout</Text>
        </TouchableOpacity>
      </View>
    ),
    []
  );

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.header,
          { paddingTop: Platform.OS === "web" ? webTopInset + 16 : insets.top + 8 },
        ]}
      >
        <View style={styles.headerTop}>
          <View style={styles.headerTitleRow}>
            <Ionicons name="time" size={22} color={colors.dark.volt} />
            <Text style={styles.headerTitle}>WORKOUT LOG</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.coachButton}
            onPress={handleCoach}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="brain"
              size={16}
              color={colors.dark.volt}
            />
            <Text style={styles.coachButtonText}>AI Coach</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logButton}
            onPress={() => setShowAddModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={16} color={colors.dark.background} />
            <Text style={styles.logButtonText}>Log Workout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={completedWorkouts}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={[
          styles.listContent,
          completedWorkouts.length === 0 && styles.listContentEmpty,
        ]}
        ListEmptyComponent={ListEmptyComponent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={completedWorkouts.length > 0}
      />

      <AddWorkoutModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
      />

      <CoachModal
        visible={showCoach}
        onClose={() => setShowCoach(false)}
        recommendation={recommendation}
        isGenerating={isGenerating}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: colors.dark.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.surface3,
  },
  headerTop: {
    marginBottom: 12,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "900" as const,
    color: colors.dark.foreground,
    letterSpacing: 2,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  coachButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.dark.volt,
    backgroundColor: "transparent",
  },
  coachButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.dark.volt,
  },
  logButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.dark.volt,
  },
  logButtonText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: colors.dark.background,
  },
  listContent: {
    padding: 16,
    gap: 10,
    paddingBottom: 100,
  },
  listContentEmpty: {
    flex: 1,
    justifyContent: "center",
  },
  workoutCard: {
    backgroundColor: colors.dark.surface1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.dark.surface3,
    overflow: "hidden",
  },
  workoutCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  workoutCardLeft: {
    flex: 1,
  },
  workoutName: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: colors.dark.foreground,
    marginBottom: 4,
  },
  workoutMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  metaText: {
    fontSize: 12,
    color: colors.dark.mutedForeground,
  },
  metaDot: {
    fontSize: 12,
    color: colors.dark.surface3,
  },
  xpText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: colors.dark.volt,
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: colors.dark.surface3,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  detailLabel: {
    fontSize: 11,
    color: colors.dark.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: "600" as const,
  },
  detailSection: {
    marginTop: 12,
    gap: 6,
  },
  roundFeedbackRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  roundBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.dark.surface2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roundNumber: {
    fontSize: 10,
    color: colors.dark.mutedForeground,
  },
  roundRating: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: colors.dark.volt,
  },
  notesBox: {
    backgroundColor: colors.dark.surface2,
    borderRadius: 10,
    padding: 12,
  },
  notesText: {
    fontSize: 14,
    color: colors.dark.foreground,
    lineHeight: 20,
  },
  manualBadgeContainer: {
    marginTop: 10,
  },
  manualBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: colors.dark.surface2,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  manualBadgeText: {
    fontSize: 10,
    color: colors.dark.mutedForeground,
  },
  fullDate: {
    fontSize: 10,
    color: colors.dark.mutedForeground,
    marginTop: 12,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: colors.dark.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.dark.mutedForeground,
    textAlign: "center",
    marginBottom: 12,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.dark.volt,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: colors.dark.background,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.dark.surface1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
    borderWidth: 1,
    borderColor: colors.dark.surface3,
    borderBottomWidth: 0,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.surface3,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800" as const,
    color: colors.dark.foreground,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: colors.dark.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 16,
  },
  textInput: {
    backgroundColor: colors.dark.surface2,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.dark.foreground,
    borderWidth: 1,
    borderColor: colors.dark.surface3,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
  },
  difficultyRow: {
    flexDirection: "row",
    gap: 8,
  },
  difficultyOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.dark.surface3,
    alignItems: "center",
  },
  difficultyOptionText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: colors.dark.mutedForeground,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.dark.volt,
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 34,
    paddingVertical: 14,
    borderRadius: 12,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: colors.dark.background,
  },
  coachHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  coachIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: colors.dark.voltDim,
    alignItems: "center",
    justifyContent: "center",
  },
  confidenceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  confidenceText: {
    fontSize: 9,
    fontWeight: "600" as const,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: colors.dark.mutedForeground,
  },
  coachHeadline: {
    fontSize: 20,
    fontWeight: "900" as const,
    color: colors.dark.foreground,
    marginBottom: 8,
  },
  reasoningContainer: {
    marginBottom: 16,
    gap: 4,
  },
  reasoningLine: {
    flexDirection: "row",
    gap: 8,
  },
  reasoningBullet: {
    fontSize: 14,
    color: colors.dark.volt,
    marginTop: 1,
  },
  reasoningText: {
    fontSize: 14,
    color: colors.dark.mutedForeground,
    flex: 1,
    lineHeight: 20,
  },
  paramsCard: {
    backgroundColor: colors.dark.surface2,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  paramsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
  },
  paramItem: {
    width: "48%",
    marginBottom: 10,
  },
  paramLabel: {
    fontSize: 9,
    color: colors.dark.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 2,
  },
  paramValue: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: colors.dark.foreground,
    textTransform: "capitalize",
  },
  coachSection: {
    marginBottom: 14,
  },
  coachSectionLabel: {
    fontSize: 9,
    color: colors.dark.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  focusTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.dark.voltDim,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  focusTagText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: colors.dark.volt,
    textTransform: "capitalize",
  },
  punchTag: {
    backgroundColor: colors.dark.surface2,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  punchTagText: {
    fontSize: 13,
    fontWeight: "800" as const,
    color: colors.dark.foreground,
  },
  defenseTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.dark.surface2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  defenseTagText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: colors.dark.foreground,
  },
  comboGuidanceCard: {
    backgroundColor: colors.dark.surface2,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  comboGuidanceText: {
    fontSize: 14,
    color: colors.dark.foreground,
    lineHeight: 20,
    marginTop: 4,
  },
  comboGuidanceBold: {
    fontWeight: "700" as const,
    textTransform: "capitalize",
  },
  encouragementCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(204, 255, 0, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(204, 255, 0, 0.2)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  encouragementText: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: colors.dark.volt,
    flex: 1,
    lineHeight: 20,
  },
  coachActions: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.dark.surface3,
    paddingBottom: 34,
  },
  coachCloseButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.dark.surface3,
    alignItems: "center",
  },
  coachCloseText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: colors.dark.foreground,
  },
});
