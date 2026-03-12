import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useUserStore } from '@/stores/userStore';
import { supabase } from '@/lib/supabase';
import colors from '@/constants/colors';

interface SettingToggleProps {
  label: string;
  description?: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: boolean;
  onToggle: (value: boolean) => void;
  iconColor?: string;
}

function SettingToggle({
  label,
  description,
  icon,
  value,
  onToggle,
  iconColor,
}: SettingToggleProps) {
  const { theme } = useTheme();
  
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingInfo}>
        <View style={styles.settingLabelRow}>
          <Ionicons
            name={icon}
            size={18}
            color={iconColor || theme.textSecondary}
            style={{ marginRight: 8 }}
          />
          <Text style={[styles.settingLabel, { color: theme.text }]}>{label}</Text>
        </View>
        {description && (
          <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
            {description}
          </Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: theme.border, true: theme.primary }}
        thumbColor={value ? theme.text : theme.textMuted}
      />
    </View>
  );
}

export default function SettingsScreen() {
  const { theme, themeMode, setThemeMode, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const user = useUserStore((state) => state.user);
  const preferences = useUserStore((state) => state.preferences);
  const setPreference = useUserStore((state) => state.setPreference);

  const handleTogglePref = async (key: string, value: boolean) => {
    setPreference(key as any, value);
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.auth.signOut();
              router.replace('/onboarding');
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // TODO: Implement account deletion
              Alert.alert('Coming Soon', 'Account deletion will be available in a future update.');
            } catch (error) {
              console.error('Error deleting account:', error);
              Alert.alert('Error', 'Failed to delete account. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleThemeToggle = (isLight: boolean) => {
    setThemeMode(isLight ? 'light' : 'dark');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: theme.background }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={28} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

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
            <Ionicons name="color-palette" size={18} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Appearance</Text>
          </View>
          <View style={[styles.card, { backgroundColor: theme.card }]}>
            <SettingToggle
              label="Light Mode"
              description="Switch between light and dark theme"
              icon="sunny-outline"
              value={!isDark}
              onToggle={handleThemeToggle}
              iconColor={theme.primary}
            />
          </View>
        </View>

        {/* Sound & Voice Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="volume-high" size={18} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Sound & Voice</Text>
          </View>
          <View style={[styles.card, { backgroundColor: theme.card }]}>
            <SettingToggle
              label="Voice Announcements"
              description="Announce segment changes and instructions"
              icon="megaphone-outline"
              value={preferences.voiceAnnouncements !== false}
              onToggle={(v) => handleTogglePref('voiceAnnouncements', v)}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingToggle
              label="Countdown Voice"
              description="3-second countdown before segment ends"
              icon="timer-outline"
              value={preferences.voiceCountdown !== false}
              onToggle={(v) => handleTogglePref('voiceCountdown', v)}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingToggle
              label="Combo Callouts"
              description="Call out punch combinations during combos"
              icon="mic-outline"
              value={preferences.voiceComboCallouts !== false}
              onToggle={(v) => handleTogglePref('voiceComboCallouts', v)}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingToggle
              label="Sound Effects"
              description="Play bell sounds and other audio cues"
              icon="musical-notes-outline"
              value={preferences.soundEffects !== false}
              onToggle={(v) => handleTogglePref('soundEffects', v)}
            />
          </View>
        </View>

        {/* Workout Preferences Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="fitness" size={18} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Workout Preferences</Text>
          </View>
          <View style={[styles.card, { backgroundColor: theme.card }]}>
            <SettingToggle
              label="Auto-Start Next Round"
              description="Automatically start the next round after rest"
              icon="play-circle-outline"
              value={preferences.autoStartNextRound !== false}
              onToggle={(v) => handleTogglePref('autoStartNextRound', v)}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingToggle
              label="Vibration Feedback"
              description="Vibrate on round transitions"
              icon="phone-portrait-outline"
              value={preferences.vibrationFeedback !== false}
              onToggle={(v) => handleTogglePref('vibrationFeedback', v)}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingToggle
              label="Keep Screen Awake"
              description="Prevent screen from dimming during workouts"
              icon="eye-outline"
              value={preferences.keepScreenAwake !== false}
              onToggle={(v) => handleTogglePref('keepScreenAwake', v)}
            />
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person" size={18} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Account</Text>
          </View>
          <View style={[styles.card, { backgroundColor: theme.card }]}>
            <TouchableOpacity style={styles.settingRow} onPress={handleSignOut}>
              <View style={styles.settingInfo}>
                <View style={styles.settingLabelRow}>
                  <Ionicons
                    name="log-out-outline"
                    size={18}
                    color={theme.warning}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={[styles.settingLabel, { color: theme.warning }]}>
                    Sign Out
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
            </TouchableOpacity>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <TouchableOpacity style={styles.settingRow} onPress={handleDeleteAccount}>
              <View style={styles.settingInfo}>
                <View style={styles.settingLabelRow}>
                  <Ionicons
                    name="trash-outline"
                    size={18}
                    color={theme.error}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={[styles.settingLabel, { color: theme.error }]}>
                    Delete Account
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={[styles.appInfo, { color: theme.textMuted }]}>
            Clocked v1.0.0
          </Text>
          <Text style={[styles.appInfo, { color: theme.textMuted }]}>
            {user?.email || 'Not signed in'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingDescription: {
    fontSize: 13,
    marginTop: 4,
    marginLeft: 26,
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
  appInfo: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
});
