import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import colors from '@/constants/colors';
import { useTheme } from "@/contexts/ThemeContext";
import { useUserStore } from '@/stores/userStore';

const experienceLevels = [
  { id: 'complete_beginner', label: 'Rookie', desc: 'Never trained combat sports' },
  { id: 'beginner', label: 'Beginner', desc: 'Some basic training experience' },
  { id: 'intermediate', label: 'Intermediate', desc: 'Regular training for 1+ years' },
  { id: 'advanced', label: 'Advanced', desc: 'Competitive experience' },
  { id: 'pro', label: 'Pro', desc: 'Professional fighter' },
] as const;

const equipmentOptions = [
  { id: 'gloves', label: 'Boxing Gloves', iconName: 'boxing-glove' as const, iconSet: 'mci' as const },
  { id: 'wraps', label: 'Hand Wraps', iconName: 'bandage' as const, iconSet: 'ion' as const },
  { id: 'heavyBag', label: 'Heavy Bag', iconName: 'fitness' as const, iconSet: 'ion' as const },
  { id: 'doubleEndBag', label: 'Double End Bag', iconName: 'ellipse' as const, iconSet: 'ion' as const },
  { id: 'speedBag', label: 'Speed Bag', iconName: 'flash' as const, iconSet: 'ion' as const },
  { id: 'jumpRope', label: 'Jump Rope', iconName: 'jump-rope' as const, iconSet: 'mci' as const },
];

const goalOptions = [
  { id: 'learn_boxing', label: 'Learn Boxing', iconName: 'flash' as const, iconSet: 'ion' as const },
  { id: 'get_fit', label: 'Get Fit', iconName: 'barbell' as const, iconSet: 'ion' as const },
  { id: 'competition', label: 'Compete', iconName: 'trophy' as const, iconSet: 'ion' as const },
  { id: 'home_workout', label: 'Home Workouts', iconName: 'home' as const, iconSet: 'ion' as const },
  { id: 'supplement_training', label: 'Supplement Training', iconName: 'trending-up' as const, iconSet: 'ion' as const },
];

export default function EditProfileScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useUserStore((s) => s.user);
  const updateUser = useUserStore((s) => s.updateUser);

  const [name, setName] = useState(user?.name || '');
  const [experienceLevel, setExperienceLevel] = useState<string>(user?.experienceLevel || 'beginner');
  const [equipment, setEquipment] = useState<Record<string, boolean>>({
    gloves: user?.equipment?.gloves ?? false,
    wraps: user?.equipment?.wraps ?? false,
    heavyBag: user?.equipment?.heavyBag ?? false,
    doubleEndBag: user?.equipment?.doubleEndBag ?? false,
    speedBag: user?.equipment?.speedBag ?? false,
    jumpRope: user?.equipment?.jumpRope ?? false,
  });
  const [goals, setGoals] = useState<string[]>(user?.goals || []);

  const toggleEquipment = (id: string) => {
    setEquipment((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleGoal = (id: string) => {
    setGoals((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    updateUser({
      name: name.trim() || 'Fighter',
      experienceLevel: experienceLevel as any,
      equipment: {
        gloves: equipment.gloves || false,
        wraps: equipment.wraps || false,
        heavyBag: equipment.heavyBag || false,
        speedBag: equipment.speedBag || false,
        doubleEndBag: equipment.doubleEndBag || false,
        jumpRope: equipment.jumpRope || false,
        treadmill: user?.equipment?.treadmill || false,
      },
      goals: goals as any,
    });
    router.back();
  };

  const renderEquipmentIcon = (item: typeof equipmentOptions[0]) => {
    if (item.iconSet === 'mci') {
      return <MaterialCommunityIcons name={item.iconName as any} size={22} color={equipment[item.id] ? theme.volt : theme.mutedForeground} />;
    }
    return <Ionicons name={item.iconName as any} size={22} color={equipment[item.id] ? theme.volt : theme.mutedForeground} />;
  };

  const renderGoalIcon = (item: typeof goalOptions[0], selected: boolean) => {
    return <Ionicons name={item.iconName as any} size={20} color={selected ? theme.volt : theme.mutedForeground} />;
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Edit Profile',
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.foreground,
          headerTitleStyle: { fontWeight: '600' as const },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ paddingRight: 8 }}>
              <Ionicons name="chevron-back" size={28} color={theme.foreground} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={handleSave} style={{ paddingLeft: 8 }}>
              <Ionicons name="checkmark" size={28} color={theme.volt} />
            </TouchableOpacity>
          ),
        }}
      />
      <KeyboardAwareScrollViewCompat
        style={[styles.container]}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 40 },
        ]}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Name</Text>
          <TextInput
            style={styles.textInput}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={theme.mutedForeground}
            autoCapitalize="words"
            returnKeyType="done"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Experience Level</Text>
          {experienceLevels.map((level) => {
            const selected = experienceLevel === level.id;
            return (
              <TouchableOpacity
                key={level.id}
                style={[styles.optionRow, selected && styles.optionRowSelected]}
                onPress={() => setExperienceLevel(level.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                  {selected && <View style={styles.radioInner} />}
                </View>
                <View style={styles.optionTextWrap}>
                  <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{level.label}</Text>
                  <Text style={styles.optionDesc}>{level.desc}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Equipment</Text>
          <View style={styles.chipGrid}>
            {equipmentOptions.map((item) => {
              const selected = !!equipment[item.id];
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => toggleEquipment(item.id)}
                  activeOpacity={0.7}
                >
                  {renderEquipmentIcon(item)}
                  <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{item.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Goals</Text>
          <View style={styles.chipGrid}>
            {goalOptions.map((item) => {
              const selected = goals.includes(item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => toggleGoal(item.id)}
                  activeOpacity={0.7}
                >
                  {renderGoalIcon(item, selected)}
                  <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{item.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.8}>
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </TouchableOpacity>
      </KeyboardAwareScrollViewCompat>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: theme.surface2,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: theme.foreground,
    borderWidth: 1,
    borderColor: theme.border,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface2,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
  optionRowSelected: {
    borderColor: theme.volt,
    backgroundColor: theme.voltDim,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.mutedForeground,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioOuterSelected: {
    borderColor: theme.volt,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.volt,
  },
  optionTextWrap: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.foreground,
  },
  optionLabelSelected: {
    color: theme.volt,
  },
  optionDesc: {
    fontSize: 13,
    color: theme.mutedForeground,
    marginTop: 2,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.surface2,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  chipSelected: {
    borderColor: theme.volt,
    backgroundColor: theme.voltDim,
  },
  chipLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.foreground,
  },
  chipLabelSelected: {
    color: theme.volt,
  },
  saveButton: {
    backgroundColor: theme.volt,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.background,
  },
});
