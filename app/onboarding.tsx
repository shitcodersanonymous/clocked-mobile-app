import { useState, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import colors from "@/constants/colors";
import { useUserStore } from "@/stores/userStore";
import { useWorkoutStore } from "@/stores/workoutStore";
import { experienceLevelToPrestige } from "@/lib/xpSystem";
import { generateLoadoutWorkout } from "@/lib/loadoutGenerator";
import { Workout } from "@/lib/types";

type Step = "welcome" | "role" | "name" | "experience" | "equipment" | "goals" | "complete";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const experienceLevels = [
  { id: "complete_beginner", label: "Rookie", desc: "Never trained combat sports" },
  { id: "beginner", label: "Beginner", desc: "Some basic training experience" },
  { id: "intermediate", label: "Intermediate", desc: "Regular training for 1+ years" },
  { id: "advanced", label: "Advanced", desc: "Competitive experience" },
  { id: "pro", label: "Pro", desc: "Professional fighter" },
] as const;

const equipmentOptions = [
  { id: "gloves", label: "Boxing Gloves", iconName: "boxing-glove" as const, iconSet: "mci" as const },
  { id: "wraps", label: "Hand Wraps", iconName: "bandage" as const, iconSet: "ion" as const },
  { id: "heavyBag", label: "Heavy Bag", iconName: "fitness" as const, iconSet: "ion" as const },
  { id: "doubleEndBag", label: "Double End Bag", iconName: "ellipse" as const, iconSet: "ion" as const },
  { id: "speedBag", label: "Speed Bag", iconName: "flash" as const, iconSet: "ion" as const },
  { id: "jumpRope", label: "Jump Rope", iconName: "jump-rope" as const, iconSet: "mci" as const },
  { id: "treadmill", label: "Treadmill", iconName: "run" as const, iconSet: "mci" as const },
];

const fighterGoalOptions = [
  { id: "learn_boxing", label: "Learn Boxing", iconName: "flash" as const, iconSet: "ion" as const },
  { id: "get_fit", label: "Get Fit", iconName: "barbell" as const, iconSet: "ion" as const },
  { id: "competition", label: "Compete", iconName: "trophy" as const, iconSet: "ion" as const },
  { id: "home_workout", label: "Home Workouts", iconName: "home" as const, iconSet: "ion" as const },
  { id: "supplement_training", label: "Supplement Training", iconName: "trending-up" as const, iconSet: "ion" as const },
];

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const completeOnboarding = useUserStore((s) => s.completeOnboarding);
  const addWorkout = useWorkoutStore((s) => s.addWorkout);

  const [step, setStep] = useState<Step>("welcome");
  const [role, setRole] = useState<"fighter" | "coach">("fighter");
  const [name, setName] = useState("");
  const [experience, setExperience] = useState<string>("beginner");
  const [equipment, setEquipment] = useState<Record<string, boolean>>({});
  const [primaryBag, setPrimaryBag] = useState<"heavy" | "double_end" | "none">("none");
  const [goals, setGoals] = useState<string[]>([]);
  const [isCompleting, setIsCompleting] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;

  const getSteps = (): Step[] => {
    return ["role", "name", "experience", "equipment", "goals"];
  };

  const animateTransition = (nextStep: Step) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setStep(nextStep);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleNext = () => {
    const steps: Step[] = ["welcome", "role", "name", "experience", "equipment", "goals", "complete"];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      animateTransition(steps[currentIndex + 1]);
    }
  };

  const handleComplete = () => {
    if (isCompleting) return;
    setIsCompleting(true);

    const finalExperience = experience;
    const finalEquipmentBools = equipment;
    const finalPrimaryBag = primaryBag;
    const finalEquipmentWithBag = { ...finalEquipmentBools, primaryBag: finalPrimaryBag };

    const prestige = experienceLevelToPrestige(finalExperience);

    completeOnboarding({
      role,
      name: name || "Fighter",
      experienceLevel: finalExperience as any,
      equipment: finalEquipmentWithBag as any,
      goals: goals as any,
      prestige,
      currentLevel: 1,
    });

    const loadoutEquipment = {
      gloves: !!finalEquipmentBools.gloves,
      wraps: !!finalEquipmentBools.wraps,
      jumpRope: !!finalEquipmentBools.jumpRope,
      heavyBag: !!finalEquipmentBools.heavyBag,
      doubleEndBag: !!finalEquipmentBools.doubleEndBag,
      speedBag: !!finalEquipmentBools.speedBag,
      treadmill: !!finalEquipmentBools.treadmill,
      primaryBag: finalPrimaryBag,
    };
    const loadout = generateLoadoutWorkout(finalExperience, loadoutEquipment);

    const workout: Workout = {
      id: generateId(),
      name: loadout.name,
      icon: "flash",
      difficulty: loadout.difficulty as any,
      totalDuration: loadout.duration,
      isPreset: loadout.is_preset,
      isArchived: loadout.is_archived,
      createdAt: new Date().toISOString(),
      timesCompleted: loadout.times_completed,
      sections: {
        warmup: loadout.phases.filter((p) => p.section === "warmup"),
        grind: loadout.phases.filter((p) => p.section === "grind"),
        cooldown: loadout.phases.filter((p) => p.section === "cooldown"),
      },
      combos: loadout.combos,
      tags: loadout.tags,
    };

    addWorkout(workout);

    router.replace("/(tabs)");
  };

  const toggleEquipment = (id: string) => {
    setEquipment((prev) => {
      const newVal = !prev[id];
      const updated = { ...prev, [id]: newVal };
      if (!newVal) {
        if (id === "heavyBag" && primaryBag === "heavy") {
          setPrimaryBag(updated.doubleEndBag ? "double_end" : "none");
        } else if (id === "doubleEndBag" && primaryBag === "double_end") {
          setPrimaryBag(updated.heavyBag ? "heavy" : "none");
        }
      }
      if (newVal) {
        if (id === "heavyBag" && updated.doubleEndBag) setPrimaryBag(primaryBag === "none" ? "heavy" : primaryBag);
        else if (id === "doubleEndBag" && updated.heavyBag) setPrimaryBag(primaryBag === "none" ? "double_end" : primaryBag);
      }
      if (!(updated.heavyBag && updated.doubleEndBag)) {
        setPrimaryBag("none");
      }
      return updated;
    });
  };

  const togglePrimaryBag = (bagId: string) => {
    if (bagId === "heavyBag") setPrimaryBag("heavy");
    else if (bagId === "doubleEndBag") setPrimaryBag("double_end");
  };

  const toggleGoal = (id: string) => {
    setGoals((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));
  };

  const steps = getSteps();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      {step !== "welcome" && step !== "complete" && (
        <View style={styles.progressContainer}>
          {steps.map((s, i) => {
            const currentIdx = steps.indexOf(step);
            return (
              <View
                key={s}
                style={[
                  styles.progressDot,
                  step === s
                    ? styles.progressDotActive
                    : currentIdx > i
                      ? styles.progressDotDone
                      : styles.progressDotInactive,
                ]}
              />
            );
          })}
        </View>
      )}

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {step === "welcome" && (
          <View style={styles.welcomeContainer}>
            <View style={styles.logoContainer}>
              <View style={styles.logoBg}>
                <MaterialCommunityIcons name="boxing-glove" size={64} color={colors.dark.volt} />
              </View>
            </View>
            <Text style={styles.welcomeTitle}>GETCLOCKED</Text>
            <Text style={styles.welcomeSubtitle}>Knockout Intelligence.</Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => animateTransition("role")}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>GET STARTED</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.dark.background} />
            </TouchableOpacity>
          </View>
        )}

        {step === "role" && (
          <ScrollView
            style={styles.stepScrollView}
            contentContainerStyle={styles.stepContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.stepTitle}>Who are you?</Text>
            <Text style={styles.stepSubtitle}>This helps us personalize your experience</Text>

            <TouchableOpacity
              style={[styles.roleCard, role === "fighter" && styles.roleCardActive]}
              onPress={() => {
                setRole("fighter");
                handleNext();
              }}
              activeOpacity={0.7}
            >
              <View style={styles.roleIconWrap}>
                <Ionicons name="person" size={28} color={colors.dark.volt} />
              </View>
              <View style={styles.roleTextWrap}>
                <Text style={styles.roleTitle}>I'M A FIGHTER</Text>
                <Text style={styles.roleDesc}>Training solo or with a coach</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.dark.mutedForeground} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleCard, role === "coach" && styles.roleCardActive]}
              onPress={() => {
                setRole("coach");
                handleNext();
              }}
              activeOpacity={0.7}
            >
              <View style={styles.roleIconWrap}>
                <Ionicons name="people" size={28} color={colors.dark.volt} />
              </View>
              <View style={styles.roleTextWrap}>
                <Text style={styles.roleTitle}>I'M A COACH</Text>
                <Text style={styles.roleDesc}>Train fighters, create programs</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.dark.mutedForeground} />
            </TouchableOpacity>
          </ScrollView>
        )}

        {step === "name" && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>What should we call you?</Text>
            <Text style={styles.stepSubtitle}>Enter your name or nickname</Text>

            <TextInput
              style={styles.nameInput}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={colors.dark.mutedForeground}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleNext}
            />

            <TouchableOpacity style={styles.primaryButton} onPress={handleNext} activeOpacity={0.8}>
              <Text style={styles.primaryButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.dark.background} />
            </TouchableOpacity>
          </View>
        )}

        {step === "experience" && (
          <ScrollView
            style={styles.stepScrollView}
            contentContainerStyle={styles.stepContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.stepTitle}>Experience Level</Text>
            <Text style={styles.stepSubtitle}>How much combat sports experience do you have?</Text>

            {experienceLevels.map((level) => (
              <TouchableOpacity
                key={level.id}
                style={[styles.optionCard, experience === level.id && styles.optionCardActive]}
                onPress={() => setExperience(level.id)}
                activeOpacity={0.7}
              >
                <View style={styles.optionTextWrap}>
                  <Text style={styles.optionTitle}>{level.label}</Text>
                  <Text style={styles.optionDesc}>{level.desc}</Text>
                </View>
                {experience === level.id && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.dark.volt} />
                )}
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={[styles.primaryButton, { marginTop: 16 }]} onPress={handleNext} activeOpacity={0.8}>
              <Text style={styles.primaryButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.dark.background} />
            </TouchableOpacity>
          </ScrollView>
        )}

        {step === "equipment" && (
          <ScrollView
            style={styles.stepScrollView}
            contentContainerStyle={styles.stepContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.stepTitle}>Your Equipment</Text>
            <Text style={styles.stepSubtitle}>What equipment do you have access to?</Text>

            <View style={styles.equipmentGrid}>
              {equipmentOptions.map((item) => {
                const isBag = item.id === "heavyBag" || item.id === "doubleEndBag";
                const isSelected = !!equipment[item.id];
                const isPrimary =
                  (item.id === "heavyBag" && primaryBag === "heavy") ||
                  (item.id === "doubleEndBag" && primaryBag === "double_end");
                const showStar = isBag && isSelected && !!equipment.heavyBag && !!equipment.doubleEndBag;

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.equipmentCard, isSelected && styles.equipmentCardActive]}
                    onPress={() => toggleEquipment(item.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.equipmentIconRow}>
                      {item.iconSet === "mci" ? (
                        <MaterialCommunityIcons
                          name={item.iconName as any}
                          size={28}
                          color={isSelected ? colors.dark.volt : colors.dark.mutedForeground}
                        />
                      ) : (
                        <Ionicons
                          name={item.iconName as any}
                          size={28}
                          color={isSelected ? colors.dark.volt : colors.dark.mutedForeground}
                        />
                      )}
                      {showStar && (
                        <TouchableOpacity
                          style={[styles.starButton, isPrimary && styles.starButtonActive]}
                          onPress={() => togglePrimaryBag(item.id)}
                        >
                          <Ionicons
                            name={isPrimary ? "star" : "star-outline"}
                            size={14}
                            color={isPrimary ? colors.dark.background : colors.dark.mutedForeground}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                    <Text style={[styles.equipmentLabel, isSelected && styles.equipmentLabelActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={[styles.primaryButton, { marginTop: 16 }]} onPress={handleNext} activeOpacity={0.8}>
              <Text style={styles.primaryButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.dark.background} />
            </TouchableOpacity>
          </ScrollView>
        )}

        {step === "goals" && (
          <ScrollView
            style={styles.stepScrollView}
            contentContainerStyle={styles.stepContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.stepTitle}>Your Goals</Text>
            <Text style={styles.stepSubtitle}>What do you want to achieve?</Text>

            {fighterGoalOptions.map((goal) => (
              <TouchableOpacity
                key={goal.id}
                style={[styles.optionCard, goals.includes(goal.id) && styles.optionCardActive]}
                onPress={() => toggleGoal(goal.id)}
                activeOpacity={0.7}
              >
                <View style={styles.goalRow}>
                  <Ionicons name={goal.iconName as any} size={22} color={colors.dark.volt} />
                  <Text style={styles.optionTitle}>{goal.label}</Text>
                </View>
                {goals.includes(goal.id) && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.dark.volt} />
                )}
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[styles.primaryButton, { marginTop: 16 }]}
              onPress={() => animateTransition("complete")}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.dark.background} />
            </TouchableOpacity>
          </ScrollView>
        )}

        {step === "complete" && (
          <View style={styles.welcomeContainer}>
            <View style={styles.completeIconWrap}>
              <Ionicons name="checkmark-circle" size={80} color={colors.dark.volt} />
            </View>
            <Text style={styles.stepTitle}>You're All Set!</Text>
            <Text style={styles.stepSubtitle}>
              Your first workout has been generated based on your profile. Time to get clocked.
            </Text>
            <TouchableOpacity
              style={[styles.primaryButton, { marginTop: 32 }]}
              onPress={handleComplete}
              disabled={isCompleting}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>{isCompleting ? "Loading..." : "LET'S GO"}</Text>
              <Ionicons name="flash" size={20} color={colors.dark.background} />
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  progressContainer: {
    flexDirection: "row" as const,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    gap: 8,
    paddingVertical: 16,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  progressDotActive: {
    backgroundColor: colors.dark.volt,
    width: 24,
  },
  progressDotDone: {
    backgroundColor: colors.dark.voltMuted,
  },
  progressDotInactive: {
    backgroundColor: colors.dark.surface3,
  },
  content: {
    flex: 1,
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    paddingHorizontal: 32,
  },
  logoContainer: {
    marginBottom: 32,
  },
  logoBg: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: colors.dark.voltDim,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  welcomeTitle: {
    fontSize: 36,
    fontWeight: "900" as const,
    color: colors.dark.foreground,
    letterSpacing: 3,
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: colors.dark.mutedForeground,
    marginBottom: 48,
  },
  primaryButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: colors.dark.volt,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    gap: 8,
    width: "100%" as const,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "800" as const,
    color: colors.dark.background,
    letterSpacing: 1,
  },
  stepScrollView: {
    flex: 1,
  },
  stepContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: "900" as const,
    color: colors.dark.foreground,
    textAlign: "center" as const,
    marginBottom: 6,
  },
  stepSubtitle: {
    fontSize: 15,
    color: colors.dark.mutedForeground,
    textAlign: "center" as const,
    marginBottom: 28,
    lineHeight: 22,
  },
  roleCard: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: colors.dark.surface1,
    borderWidth: 2,
    borderColor: colors.dark.surface3,
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
  },
  roleCardActive: {
    borderColor: colors.dark.volt,
    backgroundColor: colors.dark.voltDim,
  },
  roleIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.dark.voltDim,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    marginRight: 16,
  },
  roleTextWrap: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 17,
    fontWeight: "800" as const,
    color: colors.dark.foreground,
    marginBottom: 2,
  },
  roleDesc: {
    fontSize: 13,
    color: colors.dark.mutedForeground,
  },
  nameInput: {
    backgroundColor: colors.dark.surface1,
    borderWidth: 1,
    borderColor: colors.dark.surface3,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 18,
    color: colors.dark.foreground,
    textAlign: "center" as const,
    marginBottom: 24,
  },
  optionCard: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    backgroundColor: colors.dark.surface1,
    borderWidth: 1,
    borderColor: colors.dark.surface3,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  optionCardActive: {
    borderColor: colors.dark.volt,
    backgroundColor: colors.dark.voltDim,
  },
  optionTextWrap: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: colors.dark.foreground,
  },
  optionDesc: {
    fontSize: 13,
    color: colors.dark.mutedForeground,
    marginTop: 2,
  },
  equipmentGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 12,
  },
  equipmentCard: {
    width: (SCREEN_WIDTH - 60) / 2,
    backgroundColor: colors.dark.surface1,
    borderWidth: 1,
    borderColor: colors.dark.surface3,
    borderRadius: 14,
    padding: 16,
  },
  equipmentCardActive: {
    borderColor: colors.dark.volt,
    backgroundColor: colors.dark.voltDim,
  },
  equipmentIconRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 10,
  },
  equipmentLabel: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: colors.dark.mutedForeground,
  },
  equipmentLabelActive: {
    color: colors.dark.foreground,
  },
  starButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.dark.surface3,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  starButtonActive: {
    backgroundColor: colors.dark.volt,
  },
  goalRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    flex: 1,
  },
  completeIconWrap: {
    marginBottom: 24,
  },
});
