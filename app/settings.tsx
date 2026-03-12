import { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '@/constants/colors';
import { useUserStore } from '@/stores/userStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import { useTimerStore } from '@/stores/timerStore';
import { useTheme, ThemeMode } from '@/contexts/ThemeContext';
import { useThemedColors } from '@/hooks/useThemedColors';
import { useHistoryStore } from '@/stores/historyStore';
import { useBadgeStore } from '@/stores/badgeStore';
import { useGloveStore } from '@/stores/gloveStore';
import { generateLoadoutWorkout, UserEquipmentConfig } from '@/lib/loadoutGenerator';
import { formatDuration } from '@/lib/utils';
import { generateId } from '@/lib/utils';

const VOICE_TYPES: { value: 'male' | 'female' | 'system'; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

const ROUND_TIME_OPTIONS = [60, 90, 120, 150, 180, 210, 240, 300];
const REST_TIME_OPTIONS = [30, 45, 60, 90, 120];
const ROUND_COUNT_OPTIONS = [3, 4, 6, 8, 10, 12, 15];

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useUserStore((s) => s.user);
  const updateUser = useUserStore((s) => s.updateUser);
  const setUser = useUserStore((s) => s.setUser);
  const { theme, setTheme } = useTheme();
  const themedColors = useThemedColors();

  const workouts = useWorkoutStore((s) => s.workouts);
  const archivedWorkouts = useWorkoutStore((s) => s.archivedWorkouts);
  const addWorkout = useWorkoutStore((s) => s.addWorkout);
  const restoreWorkout = useWorkoutStore((s) => s.restoreWorkout);
  const permanentlyDeleteArchived = useWorkoutStore((s) => s.permanentlyDeleteArchived);

  const timerSettings = useTimerStore((s) => s.settings);
  const updateTimerSettings = useTimerStore((s) => s.updateSettings);

  const [isRegenerating, setIsRegenerating] = useState(false);

  const preferences = user?.preferences || {
    voiceType: 'system' as const,
    soundEnabled: true,
    voiceAnnouncements: true,
    voiceCountdown: true,
    voiceComboCallouts: true,
    tenSecondWarning: true,
  };

  const handleTogglePref = (key: string, value: boolean) => {
    if (!user) return;
    updateUser({
      preferences: {
        ...user.preferences,
        [key]: value,
      },
    });
  };

  const handleVoiceTypeChange = (voiceType: 'male' | 'female' | 'system') => {
    if (!user) return;
    updateUser({
      preferences: {
        ...user.preferences,
        voiceType,
      },
    });
  };

  const handleRegenerateLoadout = () => {
    if (!user) return;
    setIsRegenerating(true);

    try {
      const eq = user.equipment;
      const loadoutEquipment: UserEquipmentConfig = {
        gloves: !!eq?.gloves,
        wraps: !!eq?.wraps,
        jumpRope: !!eq?.jumpRope,
        heavyBag: !!eq?.heavyBag,
        doubleEndBag: !!eq?.doubleEndBag,
        speedBag: !!eq?.speedBag,
        treadmill: !!eq?.treadmill,
        primaryBag: eq?.primaryBag || 'none',
      };

      const experienceLevel = user.experienceLevel || 'beginner';
      const loadout = generateLoadoutWorkout(experienceLevel, loadoutEquipment);

      const existingLoadoutIds = workouts
        .filter((w) => w.tags?.includes('loadout'))
        .map((w) => w.id);

      existingLoadoutIds.forEach((id) => {
        useWorkoutStore.getState().deleteWorkout(id);
      });

      addWorkout({
        id: generateId(),
        name: loadout.name,
        icon: 'fitness',
        difficulty: loadout.difficulty as any,
        totalDuration: loadout.duration,
        isPreset: true,
        isArchived: false,
        createdAt: new Date().toISOString(),
        timesCompleted: 0,
        sections: {
          warmup: loadout.phases.filter((p) => p.section === 'warmup'),
          grind: loadout.phases.filter((p) => p.section === 'grind'),
          cooldown: loadout.phases.filter((p) => p.section === 'cooldown'),
        },
        combos: loadout.combos,
        tags: loadout.tags,
      });

      Alert.alert('Loadout Regenerated', 'Your training loadout has been updated.');
    } catch (err) {
      Alert.alert('Error', 'Failed to regenerate loadout.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleRestoreWorkout = (id: string) => {
    restoreWorkout(id);
  };

  const handlePermanentDelete = (id: string, name: string) => {
    Alert.alert(
      'Delete Forever',
      `Permanently delete "${name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => permanentlyDeleteArchived(id),
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'This will sign you out and return you to the start. Your workout data will be kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            useUserStore.setState({ user: null, hasCompletedOnboarding: false });
            router.replace('/onboarding');
          },
        },
      ]
    );
  };

  const handleResetData = () => {
    Alert.alert(
      'Reset All Data',
      'This will permanently erase your profile, workouts, history, and badges. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Everything',
          style: 'destructive',
          onPress: async () => {
            useUserStore.setState({ user: null, hasCompletedOnboarding: false });
            useWorkoutStore.setState({ workouts: [], archivedWorkouts: [] });
            useHistoryStore.setState({ completedWorkouts: [] });
            useBadgeStore.setState({ earnedBadgeIds: [] });
            useGloveStore.setState({ equippedGlove: 'default' });
            useTimerStore.getState().resetTimer();
            await AsyncStorage.removeItem('get-clocked-presets-seeded');
            router.replace('/onboarding');
          },
        },
      ]
    );
  };

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  return (
    <View style={[styles.container, { backgroundColor: themedColors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 40 + (Platform.OS === 'web' ? 34 : 0) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Appearance Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="color-palette" size={18} color={themedColors.primary} />
            <Text style={[styles.sectionTitle, { color: themedColors.text }]}>Appearance</Text>
          </View>
          <View style={[styles.card, { backgroundColor: themedColors.cardBackground, borderColor: themedColors.cardBorder }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Text style={[styles.settingLabel, { color: themedColors.text }]}>Theme</Text>
                <Text style={[styles.settingDescription, { color: themedColors.textSecondary }]}>
                  Choose your preferred color scheme
                </Text>
              </View>
            </View>
            <View style={styles.themeOptions}>
              <TouchableOpacity
                style={[
                  styles.themeOption,
                  { borderColor: themedColors.border },
                  theme === 'light' && { 
                    borderColor: themedColors.primary,
                    backgroundColor: themedColors.surfaceElevated,
                  }
                ]}
                onPress={() => setTheme('light')}
              >
                <Ionicons 
                  name="sunny" 
                  size={24} 
                  color={theme === 'light' ? themedColors.primary : themedColors.textSecondary} 
                />
                <Text style={[
                  styles.themeOptionText,
                  { color: theme === 'light' ? themedColors.primary : themedColors.textSecondary }
                ]}>
                  Light
                </Text>
                {theme === 'light' && (
                  <Ionicons 
                    name="checkmark-circle" 
                    size={20} 
                    color={themedColors.primary}
                    style={styles.themeCheckmark}
                  />
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.themeOption,
                  { borderColor: themedColors.border },
                  theme === 'dark' && { 
                    borderColor: themedColors.primary,
                    backgroundColor: themedColors.surfaceElevated,
                  }
                ]}
                onPress={() => setTheme('dark')}
              >
                <Ionicons 
                  name="moon" 
                  size={24} 
                  color={theme === 'dark' ? themedColors.primary : themedColors.textSecondary} 
                />
                <Text style={[
                  styles.themeOptionText,
                  { color: theme === 'dark' ? themedColors.primary : themedColors.textSecondary }
                ]}>
                  Dark
                </Text>
                {theme === 'dark' && (
                  <Ionicons 
                    name="checkmark-circle" 
                    size={20} 
                    color={themedColors.primary}
                    style={styles.themeCheckmark}
                  />
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.themeOption,
                  { borderColor: themedColors.border },
                  theme === 'system' && { 
                    borderColor: themedColors.primary,
                    backgroundColor: themedColors.surfaceElevated,
                  }
                ]}
                onPress={() => setTheme('system')}
              >
                <Ionicons 
                  name="phone-portrait" 
                  size={24} 
                  color={theme === 'system' ? themedColors.primary : themedColors.textSecondary} 
                />
                <Text style={[
                  styles.themeOptionText,
                  { color: theme === 'system' ? themedColors.primary : themedColors.textSecondary }
                ]}>
                  System
                </Text>
                {theme === 'system' && (
                  <Ionicons 
                    name="checkmark-circle" 
                    size={20} 
                    color={themedColors.primary}
                    style={styles.themeCheckmark}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="volume-high" size={18} color={themedColors.primary} />
            <Text style={[styles.sectionTitle, { color: themedColors.text }]}>Sound & Voice</Text>
          </View>
          <View style={styles.card}>
            <SettingToggle
              label="Voice Announcements"
              description="Announce segment changes and instructions"
              icon="megaphone-outline"
              value={preferences.voiceAnnouncements !== false}
              onToggle={(v) => handleTogglePref('voiceAnnouncements', v)}
            />
            <View style={styles.divider} />
            <SettingToggle
              label="Countdown Voice"
              description="3-second countdown before segment ends"
              icon="timer-outline"
              value={preferences.voiceCountdown !== false}
              onToggle={(v) => handleTogglePref('voiceCountdown', v)}
            />
            <View style={styles.divider} />
            <SettingToggle
              label="Combo Callouts"
              description="Call out punch combinations during combos"
              icon="mic-outline"
              value={preferences.voiceComboCallouts !== false}
              onToggle={(v) => handleTogglePref('voiceComboCallouts', v)}
            />
            <View style={styles.divider} />
            <SettingToggle
              label="10-Second Warning"
              description="Warning beep at 10 seconds remaining"
              icon="alarm-outline"
              value={preferences.tenSecondWarning !== false}
              onToggle={(v) => handleTogglePref('tenSecondWarning', v)}
            />
            <View style={styles.divider} />
            <SettingToggle
              label="Sound Effects"
              description="Bell and audio cues during workouts"
              icon="musical-notes-outline"
              value={preferences.soundEnabled !== false}
              onToggle={(v) => handleTogglePref('soundEnabled', v)}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="mic" size={18} color={colors.dark.volt} />
            <Text style={styles.sectionTitle}>Voice Type</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.voiceTypeRow}>
              {VOICE_TYPES.map((vt) => (
                <TouchableOpacity
                  key={vt.value}
                  style={[
                    styles.voiceTypeButton,
                    preferences.voiceType === vt.value && styles.voiceTypeButtonActive,
                  ]}
                  onPress={() => handleVoiceTypeChange(vt.value)}
                >
                  <Text
                    style={[
                      styles.voiceTypeText,
                      preferences.voiceType === vt.value && styles.voiceTypeTextActive,
                    ]}
                  >
                    {vt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="timer" size={18} color={colors.dark.volt} />
            <Text style={styles.sectionTitle}>Timer Defaults</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.settingLabel}>Round Time</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionScroll}>
              <View style={styles.optionRow}>
                {ROUND_TIME_OPTIONS.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.optionPill,
                      timerSettings.roundTime === t && styles.optionPillActive,
                    ]}
                    onPress={() => updateTimerSettings({ roundTime: t })}
                  >
                    <Text
                      style={[
                        styles.optionPillText,
                        timerSettings.roundTime === t && styles.optionPillTextActive,
                      ]}
                    >
                      {formatDuration(t)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.divider} />

            <Text style={styles.settingLabel}>Rest Time</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionScroll}>
              <View style={styles.optionRow}>
                {REST_TIME_OPTIONS.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.optionPill,
                      timerSettings.restTime === t && styles.optionPillActive,
                    ]}
                    onPress={() => updateTimerSettings({ restTime: t })}
                  >
                    <Text
                      style={[
                        styles.optionPillText,
                        timerSettings.restTime === t && styles.optionPillTextActive,
                      ]}
                    >
                      {formatDuration(t)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.divider} />

            <Text style={styles.settingLabel}>Rounds</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionScroll}>
              <View style={styles.optionRow}>
                {ROUND_COUNT_OPTIONS.map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.optionPill,
                      timerSettings.rounds === r && styles.optionPillActive,
                    ]}
                    onPress={() => updateTimerSettings({ rounds: r })}
                  >
                    <Text
                      style={[
                        styles.optionPillText,
                        timerSettings.rounds === r && styles.optionPillTextActive,
                      ]}
                    >
                      {r}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="boxing-glove" size={18} color={colors.dark.volt} />
            <Text style={styles.sectionTitle}>Loadout</Text>
          </View>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={handleRegenerateLoadout}
            disabled={isRegenerating}
          >
            {isRegenerating ? (
              <ActivityIndicator size="small" color={colors.dark.volt} />
            ) : (
              <Ionicons name="refresh" size={20} color={colors.dark.volt} />
            )}
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Regenerate Loadout</Text>
              <Text style={styles.actionDescription}>
                Create a new training loadout based on your profile
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.dark.mutedForeground} />
          </TouchableOpacity>
        </View>

        {archivedWorkouts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="archive" size={18} color={colors.dark.volt} />
              <Text style={styles.sectionTitle}>
                Archived Workouts ({archivedWorkouts.length})
              </Text>
            </View>
            <View style={styles.card}>
              {archivedWorkouts.map((workout, index) => (
                <View key={workout.id}>
                  {index > 0 && <View style={styles.divider} />}
                  <View style={styles.archivedRow}>
                    <View style={styles.archivedInfo}>
                      <Text style={styles.archivedName} numberOfLines={1}>
                        {workout.name}
                      </Text>
                      <Text style={styles.archivedMeta}>
                        {formatDuration(workout.totalDuration)}
                      </Text>
                    </View>
                    <View style={styles.archivedActions}>
                      <TouchableOpacity
                        style={styles.iconBtn}
                        onPress={() => handleRestoreWorkout(workout.id)}
                      >
                        <Ionicons name="arrow-undo" size={18} color={colors.dark.volt} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.iconBtn}
                        onPress={() => handlePermanentDelete(workout.id, workout.name)}
                      >
                        <Ionicons name="trash" size={18} color={colors.dark.red} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person" size={18} color={colors.dark.volt} />
            <Text style={styles.sectionTitle}>Account</Text>
          </View>
          <TouchableOpacity style={styles.actionCard} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={20} color={colors.dark.foreground} />
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Sign Out</Text>
              <Text style={styles.actionDescription}>
                Return to start — your workout data is kept
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.dark.mutedForeground} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="warning" size={18} color={colors.dark.red} />
            <Text style={[styles.sectionTitle, { color: colors.dark.red }]}>Danger Zone</Text>
          </View>
          <TouchableOpacity style={styles.dangerCard} onPress={handleResetData}>
            <Ionicons name="nuclear" size={22} color={colors.dark.red} />
            <View style={styles.actionTextContainer}>
              <Text style={[styles.actionTitle, { color: colors.dark.red }]}>
                Reset All Data
              </Text>
              <Text style={styles.actionDescription}>
                Erase profile, workouts, history, and badges
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.dark.mutedForeground} />
          </TouchableOpacity>
        </View>

        <Text style={styles.versionText}>v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

function SettingToggle({
  label,
  description,
  icon,
  value,
  onToggle,
}: {
  label: string;
  description: string;
  icon: string;
  value: boolean;
  onToggle: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleIconBox}>
        <Ionicons name={icon as any} size={16} color={colors.dark.mutedForeground} />
      </View>
      <View style={styles.toggleTextContainer}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.dark.surface3, true: colors.dark.volt }}
        thumbColor={value ? colors.dark.background : colors.dark.mutedForeground}
        ios_backgroundColor={colors.dark.surface3}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: colors.dark.foreground,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: colors.dark.surface1,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  divider: {
    height: 1,
    backgroundColor: colors.dark.surface3,
    marginVertical: 10,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  toggleIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.dark.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleTextContainer: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.dark.foreground,
  },
  toggleDescription: {
    fontSize: 11,
    color: colors.dark.mutedForeground,
    marginTop: 2,
  },
  voiceTypeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  voiceTypeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.dark.surface2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  voiceTypeButtonActive: {
    backgroundColor: colors.dark.voltDim,
    borderColor: colors.dark.volt,
  },
  voiceTypeText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.dark.mutedForeground,
  },
  voiceTypeTextActive: {
    color: colors.dark.volt,
  },
  settingLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.dark.foreground,
    marginBottom: 8,
  },
  optionScroll: {
    marginBottom: 4,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.dark.surface2,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  optionPillActive: {
    backgroundColor: colors.dark.voltDim,
    borderColor: colors.dark.volt,
  },
  optionPillText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.dark.mutedForeground,
  },
  optionPillTextActive: {
    color: colors.dark.volt,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark.surface1,
    borderRadius: 14,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: colors.dark.foreground,
  },
  actionDescription: {
    fontSize: 11,
    color: colors.dark.mutedForeground,
    marginTop: 2,
  },
  archivedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  archivedInfo: {
    flex: 1,
  },
  archivedName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.dark.foreground,
  },
  archivedMeta: {
    fontSize: 11,
    color: colors.dark.mutedForeground,
    marginTop: 2,
  },
  archivedActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    padding: 6,
  },
  dangerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark.redDim,
    borderRadius: 14,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.dark.mutedForeground,
    marginTop: 8,
    marginBottom: 20,
  },
  themeOptions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  themeOption: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
    position: 'relative',
  },
  themeOptionText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  themeCheckmark: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
});
