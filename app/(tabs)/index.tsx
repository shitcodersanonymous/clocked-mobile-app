import { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import { useRouter, Redirect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import { useUserStore } from "@/stores/userStore";
import { useWorkoutStore } from "@/stores/workoutStore";
import { Workout } from "@/lib/types";
import { WorkoutCard } from "@/components/ui/WorkoutCard";
import WorkoutPreviewModal from "@/components/WorkoutPreviewModal";

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const hasCompletedOnboarding = useUserStore((s) => s.hasCompletedOnboarding);
  const workouts = useWorkoutStore((s) => s.workouts);
  const deleteWorkout = useWorkoutStore((s) => s.deleteWorkout);
  const archiveWorkout = useWorkoutStore((s) => s.archiveWorkout);
  const reorderWorkouts = useWorkoutStore((s) => s.reorderWorkouts);

  const [isReorderMode, setIsReorderMode] = useState(false);
  const [localOrder, setLocalOrder] = useState<string[]>([]);
  const [previewWorkout, setPreviewWorkout] = useState<Workout | null>(null);
  const { theme } = useTheme();

  const activeWorkouts = workouts.filter((w) => !w.isArchived);

  const handleStartReorder = useCallback(() => {
    setLocalOrder(activeWorkouts.map((w) => w.id));
    setIsReorderMode(true);
  }, [activeWorkouts]);

  const handleSaveOrder = useCallback(() => {
    reorderWorkouts(localOrder);
    setIsReorderMode(false);
  }, [localOrder, reorderWorkouts]);

  const handleCancelReorder = useCallback(() => {
    setIsReorderMode(false);
    setLocalOrder([]);
  }, []);

  const handleMoveUp = useCallback(
    (id: string) => {
      setLocalOrder((prev) => {
        const idx = prev.indexOf(id);
        if (idx <= 0) return prev;
        const next = [...prev];
        [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
        return next;
      });
    },
    []
  );

  const handleMoveDown = useCallback(
    (id: string) => {
      setLocalOrder((prev) => {
        const idx = prev.indexOf(id);
        if (idx < 0 || idx >= prev.length - 1) return prev;
        const next = [...prev];
        [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
        return next;
      });
    },
    []
  );

  const handlePlay = useCallback(
    (id: string) => {
      const found = workouts.find((w) => w.id === id);
      if (found) {
        setPreviewWorkout(found);
      }
    },
    [workouts]
  );

  const handleDeletePrompt = useCallback(
    (id: string) => {
      Alert.alert(
        "Remove Workout?",
        "Choose to archive (can be restored later) or delete permanently.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Archive",
            onPress: () => archiveWorkout(id),
          },
          {
            text: "Delete Forever",
            style: "destructive",
            onPress: () => deleteWorkout(id),
          },
        ]
      );
    },
    [archiveWorkout, deleteWorkout]
  );

  if (!hasCompletedOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  const displayWorkouts = isReorderMode
    ? localOrder
        .map((id) => activeWorkouts.find((w) => w.id === id))
        .filter(Boolean) as Workout[]
    : activeWorkouts;

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const topPadding = Platform.OS === "web" ? webTopInset : insets.top;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: topPadding + 12, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerLine} />
          <Text style={styles.logoText}>CLOCKED</Text>
          <View style={styles.headerLine} />
        </View>

        <View style={styles.actionCardsRow}>
          <TouchableOpacity
            style={styles.actionCard}
            activeOpacity={0.7}
            onPress={() => router.push("/build")}
          >
            <Ionicons name="add" size={22} color={theme.volt} />
            <View style={styles.actionCardTextWrap}>
              <Text style={styles.actionCardTitle}>CREATE</Text>
              <Text style={styles.actionCardSub}>SET</Text>
            </View>
            <View style={styles.actionCardBgIcon}>
              <Ionicons name="add" size={72} color={theme.mutedForeground} style={{ opacity: 0.08 }} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            activeOpacity={0.7}
            onPress={() => router.push("/history")}
          >
            <Ionicons name="time" size={22} color={theme.volt} />
            <View style={styles.actionCardTextWrap}>
              <Text style={styles.actionCardTitle}>WORKOUT</Text>
              <Text style={styles.actionCardSub}>LOG</Text>
            </View>
            <View style={styles.actionCardBgIcon}>
              <Ionicons name="time" size={72} color={theme.mutedForeground} style={{ opacity: 0.08 }} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>YOUR SETS</Text>
          {activeWorkouts.length > 1 &&
            (isReorderMode ? (
              <View style={styles.reorderActions}>
                <TouchableOpacity onPress={handleCancelReorder} style={styles.reorderActionBtn}>
                  <Ionicons name="close" size={18} color={theme.mutedForeground} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveOrder}
                  style={[styles.reorderActionBtn, styles.reorderSaveBtn]}
                >
                  <Ionicons name="checkmark" size={18} color={theme.volt} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={handleStartReorder} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <MaterialCommunityIcons name="drag-vertical" size={20} color={theme.mutedForeground} />
              </TouchableOpacity>
            ))}
        </View>

        {activeWorkouts.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="inbox" size={36} color={theme.mutedForeground} />
            <Text style={styles.emptyText}>No workouts yet</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push("/build")}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyButtonText}>Create Your First Workout</Text>
            </TouchableOpacity>
          </View>
        ) : (
          displayWorkouts.map((workout, index) => (
            <WorkoutCard
              key={workout.id}
              workout={workout}
              onPlay={handlePlay}
              onDelete={handleDeletePrompt}
              isReorderMode={isReorderMode}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              isFirst={index === 0}
              isLast={index === displayWorkouts.length - 1}
            />
          ))
        )}
      </ScrollView>

      {previewWorkout && (
        <WorkoutPreviewModal
          workout={previewWorkout}
          visible={!!previewWorkout}
          onClose={() => setPreviewWorkout(null)}
          onStart={() => {
            const id = previewWorkout.id;
            setPreviewWorkout(null);
            router.push(`/workout/${id}`);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 20,
  },
  headerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.voltMuted,
  },
  logoText: {
    fontSize: 26,
    fontWeight: "900" as const,
    color: theme.foreground,
    letterSpacing: 6,
  },
  actionCardsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  actionCard: {
    flex: 1,
    height: 130,
    backgroundColor: theme.surface1,
    borderRadius: 16,
    padding: 16,
    justifyContent: "space-between",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.border,
  },
  actionCardTextWrap: {
    zIndex: 1,
  },
  actionCardTitle: {
    fontSize: 16,
    fontWeight: "900" as const,
    color: theme.foreground,
  },
  actionCardSub: {
    fontSize: 12,
    color: theme.mutedForeground,
    marginTop: 1,
  },
  actionCardBgIcon: {
    position: "absolute",
    right: -4,
    top: -4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: theme.mutedForeground,
    letterSpacing: 1.5,
  },
  reorderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  reorderActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  reorderSaveBtn: {
    backgroundColor: theme.voltDim,
  },
  emptyState: {
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: theme.surface3,
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    color: theme.mutedForeground,
    fontSize: 15,
  },
  emptyButton: {
    backgroundColor: theme.volt,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  emptyButtonText: {
    color: theme.background,
    fontWeight: "700" as const,
    fontSize: 14,
  },
});

