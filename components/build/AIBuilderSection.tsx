import { useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors from "@/constants/colors";
import { evaluatePromptQuality as evaluatePromptQualityFn } from "@/lib/aiWorkoutParser";

const C = colors.dark;

interface AIBuilderSectionProps {
  aiPrompt: string;
  setAiPrompt: (s: string) => void;
  aiGenerating: boolean;
  onGenerate: () => void;
}

export function AIBuilderSection({
  aiPrompt,
  setAiPrompt,
  aiGenerating,
  onGenerate,
}: AIBuilderSectionProps) {
  const promptQuality = useMemo(() => {
    if (!aiPrompt.trim()) return null;
    return evaluatePromptQualityFn(aiPrompt.trim());
  }, [aiPrompt]);

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={{ paddingBottom: 120 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.aiSection}>
        <Text style={styles.aiSectionTitle}>DESCRIBE YOUR WORKOUT</Text>
        <TextInput
          value={aiPrompt}
          onChangeText={setAiPrompt}
          placeholder="e.g. 5 round heavy bag, 3 min rounds, 1 min rest"
          placeholderTextColor={C.mutedForeground}
          style={styles.aiPromptInput}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        {promptQuality && !promptQuality.isComplete && (
          <View style={styles.aiQualityBox}>
            {promptQuality.suggestions.map((s, i) => (
              <View key={i} style={styles.aiQualityRow}>
                <Ionicons name="information-circle-outline" size={14} color="#F59E0B" />
                <Text style={styles.aiQualityText}>{s}</Text>
              </View>
            ))}
          </View>
        )}

        {promptQuality?.isComplete && (
          <View style={[styles.aiQualityBox, { borderColor: "#22C55E40" }]}>
            <View style={styles.aiQualityRow}>
              <Ionicons name="checkmark-circle" size={14} color="#22C55E" />
              <Text style={[styles.aiQualityText, { color: "#22C55E" }]}>Prompt looks good</Text>
            </View>
          </View>
        )}

        <Text style={styles.aiChipsLabel}>SUGGESTIONS</Text>
        <View style={styles.aiChipsRow}>
          {[
            "5 round heavy bag",
            "3 round shadowbox beginner",
            "10 round HIIT circuit",
            "6 rounds 3 min each 1 min rest",
            "Speed bag 4 rounds",
          ].map((chip) => (
            <TouchableOpacity
              key={chip}
              onPress={() => setAiPrompt(chip)}
              style={styles.aiChip}
            >
              <Text style={styles.aiChipText}>{chip}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={onGenerate}
          style={[styles.aiGenerateBtn, (!aiPrompt.trim() || aiGenerating) && { opacity: 0.5 }]}
          disabled={!aiPrompt.trim() || aiGenerating}
        >
          <Ionicons name="sparkles" size={18} color={C.background} />
          <Text style={styles.aiGenerateBtnText}>
            {aiGenerating ? "Generating..." : "Generate Workout"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  aiSection: {
    padding: 16,
    gap: 16,
  },
  aiSectionTitle: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: C.mutedForeground,
    letterSpacing: 1,
  },
  aiPromptInput: {
    backgroundColor: C.surface1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.surface3,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: C.foreground,
    minHeight: 80,
  },
  aiQualityBox: {
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.3)",
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  aiQualityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  aiQualityText: {
    fontSize: 12,
    color: "#F59E0B",
    flex: 1,
  },
  aiChipsLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: C.mutedForeground,
    letterSpacing: 1,
  },
  aiChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  aiChip: {
    backgroundColor: C.surface1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.surface3,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  aiChipText: {
    fontSize: 12,
    color: C.foreground,
  },
  aiGenerateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.volt,
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 8,
  },
  aiGenerateBtnText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: C.background,
  },
});
