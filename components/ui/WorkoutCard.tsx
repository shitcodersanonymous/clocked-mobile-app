import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors from "@/constants/colors";
import { DIFFICULTY_COLORS } from "@/constants/colors";
import { Workout } from "@/lib/types";
import { formatDuration } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";

function getDifficultyLabel(d: string): string {
  const map: Record<string, string> = {
    rookie: "ROOKIE",
    beginner: "BEGINNER",
    intermediate: "INTERMEDIATE",
    advanced: "ADVANCED",
    pro: "PRO",
  };
  return map[d] || d.toUpperCase();
}

export interface WorkoutCardProps {
  workout: Workout;
  onPlay: (id: string) => void;
  onDelete: (id: string) => void;
  isReorderMode: boolean;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  isFirst: boolean;
  isLast: boolean;
}

export function WorkoutCard({
  workout,
  onPlay,
  onDelete,
  isReorderMode,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: WorkoutCardProps) {
  const { theme } = useTheme();
  const diffColor = DIFFICULTY_COLORS[workout.difficulty] || theme.mutedForeground;

  const cardStyles = StyleSheet.create({
    card: {
      flexDirection: "row",
      backgroundColor: theme.surface1,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 10,
      overflow: "hidden",
    },
    cardBody: {
      flex: 1,
      padding: 14,
    },
    topRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 8,
    },
    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flex: 1,
      marginRight: 8,
    },
    workoutName: {
      fontSize: 16,
      fontWeight: "700" as const,
      color: theme.foreground,
      flexShrink: 1,
    },
    diffBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    diffText: {
      fontSize: 10,
      fontWeight: "700" as const,
      letterSpacing: 0.5,
    },
    metaRow: {
      flexDirection: "row",
      gap: 14,
    },
    metaItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    metaText: {
      fontSize: 13,
      color: theme.mutedForeground,
    },
    reorderControls: {
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 8,
      gap: 4,
      borderLeftWidth: 1,
      borderLeftColor: theme.border,
    },
    reorderBtn: {
      padding: 4,
    },
    reorderBtnDisabled: {
      opacity: 0.3,
    },
    playBtn: {
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 16,
      backgroundColor: theme.volt,
    },
  });

  return (
    <View style={cardStyles.card}>
      <TouchableOpacity
        style={cardStyles.cardBody}
        onPress={() => onPlay(workout.id)}
        activeOpacity={0.7}
      >
        <View style={cardStyles.topRow}>
          <View style={cardStyles.nameRow}>
            <Text style={cardStyles.workoutName} numberOfLines={1}>
              {workout.name}
            </Text>
            <View style={[cardStyles.diffBadge, { backgroundColor: diffColor + "22" }]}>
              <Text style={[cardStyles.diffText, { color: diffColor }]}>
                {getDifficultyLabel(workout.difficulty)}
              </Text>
            </View>
          </View>
          {!isReorderMode && (
            <TouchableOpacity
              onPress={() => onDelete(workout.id)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="ellipsis-vertical" size={18} color={theme.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        <View style={cardStyles.metaRow}>
          <View style={cardStyles.metaItem}>
            <Ionicons name="time-outline" size={14} color={theme.mutedForeground} />
            <Text style={cardStyles.metaText}>{formatDuration(workout.totalDuration)}</Text>
          </View>
          {workout.timesCompleted > 0 && (
            <View style={cardStyles.metaItem}>
              <Ionicons name="checkmark-circle-outline" size={14} color={theme.mutedForeground} />
              <Text style={cardStyles.metaText}>
                {workout.timesCompleted}x
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {isReorderMode && (
        <View style={cardStyles.reorderControls}>
          <TouchableOpacity
            onPress={() => onMoveUp(workout.id)}
            disabled={isFirst}
            style={[cardStyles.reorderBtn, isFirst && cardStyles.reorderBtnDisabled]}
          >
            <Ionicons
              name="chevron-up"
              size={20}
              color={isFirst ? theme.surface3 : theme.volt}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onMoveDown(workout.id)}
            disabled={isLast}
            style={[cardStyles.reorderBtn, isLast && cardStyles.reorderBtnDisabled]}
          >
            <Ionicons
              name="chevron-down"
              size={20}
              color={isLast ? theme.surface3 : theme.volt}
            />
          </TouchableOpacity>
        </View>
      )}

      {!isReorderMode && (
        <TouchableOpacity
          style={cardStyles.playBtn}
          onPress={() => onPlay(workout.id)}
        >
          <Ionicons name="play" size={22} color={theme.background} />
        </TouchableOpacity>
      )}
    </View>
  );
}
