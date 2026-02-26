import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import colors, { PRESTIGE_COLORS, BADGE_CATEGORY_COLORS_NATIVE } from '@/constants/colors';
import { useUserStore } from '@/stores/userStore';
import { useBadgeStore } from '@/stores/badgeStore';
import BadgeCollection from '@/components/BadgeCollection';
import { useHistoryStore } from '@/stores/historyStore';
import { useGloveStore } from '@/stores/gloveStore';
import { XPBar } from '@/components/ui/XPBar';
import { PrestigeBadgeCompact } from '@/components/ui/PrestigeDisplay';
import { StatCard } from '@/components/ui/StatCard';
import {
  Prestige,
  PRESTIGE_NAMES,
  PRESTIGE_ORDER,
  RANKING_NAMES,
  getRankingFromLevel,
  getXPWithinCurrentLevel,
  isPrestigeEligible,
  getNextPrestige,
  getPrestigeChanges,
  getLevelFromXP,
} from '@/lib/xpSystem';
import { formatDuration } from '@/lib/utils';
import { executePrestige } from '@/lib/prestigeActions';
import { GLOVES, checkGloveUnlocks } from '@/data/gloves';
import {
  ALL_BADGES_COMBINED,
  ALL_BADGE_CATEGORIES,
  ALL_BADGE_CATEGORY_NAMES,
  TOTAL_BADGE_COUNT,
  ExtendedBadgeCategory,
} from '@/data/badges';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const user = useUserStore((s) => s.user);
  const updateUser = useUserStore((s) => s.updateUser);
  const earnedBadgeIds = useBadgeStore((s) => s.earnedBadgeIds);
  const completedWorkouts = useHistoryStore((s) => s.completedWorkouts);
  const equippedGlove = useGloveStore((s) => s.equippedGlove);

  const [showPrestigePrompt, setShowPrestigePrompt] = useState(false);
  const [showBadgeCollection, setShowBadgeCollection] = useState(false);

  const prestige = (user?.prestige || 'beginner') as Prestige;
  const currentLevel = user?.currentLevel || 1;
  const totalXP = user?.totalXP || 0;
  const ranking = getRankingFromLevel(currentLevel);
  const rankingName = RANKING_NAMES[ranking];
  const prestigeName = PRESTIGE_NAMES[prestige];
  const { current: xpCurrent, required: xpRequired } = getXPWithinCurrentLevel(prestige, totalXP);
  const workoutsCount = user?.workoutsCompleted || 0;
  const currentStreak = user?.currentStreak || 0;
  const longestStreak = user?.longestStreak || 0;
  const totalTrainingSeconds = user?.totalTrainingSeconds || 0;
  const role = user?.role || 'fighter';
  const name = user?.name || 'Fighter';
  const prestigeEligible = isPrestigeEligible(prestige, totalXP);

  const unlockedGloves = useMemo(
    () => checkGloveUnlocks(prestige, currentLevel, currentStreak),
    [prestige, currentLevel, currentStreak]
  );

  const gloveData = GLOVES[equippedGlove] || GLOVES.default;

  const badgeSummary = useMemo(() => {
    return ALL_BADGE_CATEGORIES.map(({ category, badges }) => {
      const earned = badges.filter((b) => earnedBadgeIds.includes(b.id)).length;
      return { category, earned, total: badges.length };
    });
  }, [earnedBadgeIds]);

  const totalBadgesEarned = earnedBadgeIds.length;
  const totalBadgesAll = TOTAL_BADGE_COUNT;

  const handlePrestige = () => {
    const changes = getPrestigeChanges(prestige);
    if (!changes) return;

    Alert.alert(
      'Prestige Up',
      `Advance from ${changes.currentTierName} to ${changes.nextTierName}?\n\nYour level will reset to 1, but you'll unlock new gloves and harder XP curves.`,
      [
        { text: 'Not Yet', style: 'cancel' },
        {
          text: 'Prestige',
          style: 'destructive',
          onPress: () => {
            executePrestige(prestige);
            setShowPrestigePrompt(false);
          },
        },
      ]
    );
  };

  if (showPrestigePrompt) {
    return <PrestigePromptScreen prestige={prestige} onPrestige={handlePrestige} onDefer={() => setShowPrestigePrompt(false)} />;
  }

  if (showBadgeCollection) {
    return (
      <View style={[styles.container, { paddingTop: Platform.OS === 'web' ? webTopInset : insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Badges</Text>
          <TouchableOpacity
            onPress={() => setShowBadgeCollection(false)}
            style={styles.settingsBtn}
          >
            <Ionicons name="close" size={22} color={colors.dark.mutedForeground} />
          </TouchableOpacity>
        </View>
        <BadgeCollection />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: Platform.OS === 'web' ? webTopInset : insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity
            onPress={() => router.push('/edit-profile')}
            style={styles.settingsBtn}
          >
            <Ionicons name="create-outline" size={22} color={colors.dark.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/settings')}
            style={styles.settingsBtn}
          >
            <Ionicons name="settings-outline" size={22} color={colors.dark.mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileSection}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarContainer}>
              <View style={[styles.avatar, { borderColor: PRESTIGE_COLORS[prestige] || colors.dark.volt }]}>
                <Ionicons name="person" size={32} color={PRESTIGE_COLORS[prestige] || colors.dark.volt} />
              </View>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{name}</Text>
              <View style={styles.roleRow}>
                <Text style={styles.roleLabel}>
                  {role === 'coach' ? 'COACH' : 'FIGHTER'}
                </Text>
                <Text style={styles.roleDot}>·</Text>
                <TouchableOpacity
                  onPress={() => router.push('/gloves')}
                  style={styles.gloveTag}
                >
                  <View style={[styles.gloveSwatch, { backgroundColor: gloveData.tierThemeColor }]} />
                  <Text style={styles.gloveName}>{gloveData.name}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.prestigeRow}>
            <PrestigeBadgeCompact
              prestige={prestige}
              rankingName={rankingName}
              prestigeName={prestigeName}
              level={currentLevel}
            />
            <Text style={styles.totalXPText}>{totalXP.toLocaleString()} XP</Text>
          </View>

          <XPBar
            prestige={prestige}
            level={currentLevel}
            currentXP={xpCurrent}
            requiredXP={xpRequired}
            showRank={false}
          />

          <TouchableOpacity
            onPress={() => router.push('/gloves')}
            style={styles.gloveCounter}
          >
            <Ionicons name="layers-outline" size={14} color={colors.dark.mutedForeground} />
            <Text style={styles.gloveCounterText}>{unlockedGloves.length}/52 Gloves</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.dark.mutedForeground} />
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <StatCard
            label="Workouts"
            value={workoutsCount}
            icon="fitness"
            iconColor={colors.dark.volt}
          />
          <StatCard
            label="Day Streak"
            value={currentStreak}
            icon="flame"
            iconColor={colors.dark.orange}
          />
          <StatCard
            label="Total Time"
            value={formatDuration(totalTrainingSeconds)}
            icon="time"
            iconColor={colors.dark.blue}
          />
        </View>

        <View style={styles.streakCard}>
          <View style={styles.streakHeader}>
            <Ionicons name="trophy" size={18} color={colors.dark.amber} />
            <Text style={styles.streakTitle}>Best Streak</Text>
          </View>
          <Text style={styles.streakValue}>{longestStreak}</Text>
          <Text style={styles.streakSubtitle}>consecutive days</Text>
        </View>

        {prestigeEligible && (
          <TouchableOpacity
            style={styles.prestigeBanner}
            onPress={() => setShowPrestigePrompt(true)}
            activeOpacity={0.8}
          >
            <View style={styles.prestigeBannerContent}>
              <View style={styles.prestigeBannerIcon}>
                <MaterialCommunityIcons name="arrow-up-bold-circle" size={28} color={colors.dark.amber} />
              </View>
              <View style={styles.prestigeBannerText}>
                <Text style={styles.prestigeBannerTitle}>Prestige Available</Text>
                <Text style={styles.prestigeBannerSub}>
                  Advance to {PRESTIGE_NAMES[getNextPrestige(prestige) || prestige]} tier
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.dark.amber} />
            </View>
          </TouchableOpacity>
        )}

        <View style={styles.badgesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Badges</Text>
            <Text style={styles.sectionCount}>
              {totalBadgesEarned}/{totalBadgesAll}
            </Text>
          </View>
          {badgeSummary.map(({ category, earned, total }) => (
            <BadgeCategoryRow
              key={category}
              category={category}
              earned={earned}
              total={total}
            />
          ))}
          <TouchableOpacity
            style={styles.viewAllBadgesBtn}
            onPress={() => setShowBadgeCollection(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="grid-outline" size={16} color={colors.dark.volt} />
            <Text style={styles.viewAllBadgesText}>View All Badges</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.dark.volt} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

function BadgeCategoryRow({
  category,
  earned,
  total,
}: {
  category: ExtendedBadgeCategory;
  earned: number;
  total: number;
}) {
  const progress = total > 0 ? earned / total : 0;
  const catColors = BADGE_CATEGORY_COLORS_NATIVE[category] || BADGE_CATEGORY_COLORS_NATIVE.streak;
  const categoryName = ALL_BADGE_CATEGORY_NAMES[category] || category;

  return (
    <View style={badgeStyles.row}>
      <View style={[badgeStyles.iconDot, { backgroundColor: catColors.bg }]}>
        <View style={[badgeStyles.iconDotInner, { backgroundColor: catColors.text }]} />
      </View>
      <View style={badgeStyles.rowContent}>
        <View style={badgeStyles.rowHeader}>
          <Text style={badgeStyles.categoryName}>{categoryName}</Text>
          <Text style={[badgeStyles.categoryCount, { color: catColors.text }]}>
            {earned}/{total}
          </Text>
        </View>
        <View style={badgeStyles.barBg}>
          <View style={[badgeStyles.barFill, { backgroundColor: catColors.text, width: `${progress * 100}%` }]} />
        </View>
      </View>
    </View>
  );
}

function PrestigePromptScreen({
  prestige,
  onPrestige,
  onDefer,
}: {
  prestige: Prestige;
  onPrestige: () => void;
  onDefer: () => void;
}) {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const changes = getPrestigeChanges(prestige);
  const nextPrestige = changes?.nextTier || prestige;
  const nextColor = PRESTIGE_COLORS[nextPrestige] || colors.dark.volt;
  const currentColor = PRESTIGE_COLORS[prestige] || colors.dark.volt;

  return (
    <View style={[styles.container, { paddingTop: Platform.OS === 'web' ? webTopInset : insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Prestige</Text>
        <TouchableOpacity onPress={onDefer} style={styles.settingsBtn}>
          <Ionicons name="close" size={22} color={colors.dark.mutedForeground} />
        </TouchableOpacity>
      </View>
      <View style={prestigeStyles.container}>
        <View style={prestigeStyles.iconWrap}>
          <MaterialCommunityIcons name="arrow-up-bold-hexagon-outline" size={64} color={nextColor} />
        </View>
        <Text style={prestigeStyles.title}>Prestige Up</Text>
        <Text style={prestigeStyles.subtitle}>
          You've reached Level 100 as{' '}
          <Text style={{ color: currentColor }}>{changes?.currentTierName}</Text>
        </Text>
        <View style={prestigeStyles.changeCard}>
          <View style={prestigeStyles.changeRow}>
            <Text style={prestigeStyles.changeLabel}>Current Tier</Text>
            <Text style={[prestigeStyles.changeValue, { color: currentColor }]}>
              {changes?.currentTierName}
            </Text>
          </View>
          <View style={prestigeStyles.divider} />
          <View style={prestigeStyles.changeRow}>
            <Text style={prestigeStyles.changeLabel}>Next Tier</Text>
            <Text style={[prestigeStyles.changeValue, { color: nextColor }]}>
              {changes?.nextTierName}
            </Text>
          </View>
          <View style={prestigeStyles.divider} />
          <View style={prestigeStyles.changeRow}>
            <Text style={prestigeStyles.changeLabel}>Level Reset</Text>
            <Text style={prestigeStyles.changeValue}>1</Text>
          </View>
          <View style={prestigeStyles.divider} />
          <View style={prestigeStyles.changeRow}>
            <Text style={prestigeStyles.changeLabel}>New Gloves</Text>
            <Text style={[prestigeStyles.changeValue, { color: nextColor }]}>Unlocked</Text>
          </View>
        </View>
        <Text style={prestigeStyles.warning}>
          XP and level will reset. Badges and history are kept.
        </Text>
        <TouchableOpacity style={[prestigeStyles.prestigeBtn, { backgroundColor: nextColor }]} onPress={onPrestige}>
          <Text style={prestigeStyles.prestigeBtnText}>Prestige Now</Text>
        </TouchableOpacity>
        <TouchableOpacity style={prestigeStyles.deferBtn} onPress={onDefer}>
          <Text style={prestigeStyles.deferBtnText}>Not Yet</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dark.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.dark.foreground,
  },
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.dark.surface1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  profileSection: {
    gap: 14,
    marginBottom: 20,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarContainer: {},
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.dark.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  profileInfo: {
    flex: 1,
    gap: 6,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: colors.dark.foreground,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: colors.dark.volt,
    letterSpacing: 0.5,
  },
  roleDot: {
    fontSize: 11,
    color: colors.dark.mutedForeground,
  },
  gloveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gloveSwatch: {
    width: 12,
    height: 12,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(204,255,0,0.3)',
  },
  gloveName: {
    fontSize: 11,
    color: colors.dark.mutedForeground,
  },
  prestigeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalXPText: {
    fontSize: 13,
    color: colors.dark.mutedForeground,
  },
  gloveCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
  },
  gloveCounterText: {
    fontSize: 12,
    color: colors.dark.mutedForeground,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  streakCard: {
    backgroundColor: colors.dark.surface1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.dark.border,
    marginBottom: 16,
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  streakTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.dark.foreground,
  },
  streakValue: {
    fontSize: 36,
    fontWeight: '700' as const,
    color: colors.dark.amber,
  },
  streakSubtitle: {
    fontSize: 11,
    color: colors.dark.mutedForeground,
    marginTop: 2,
  },
  prestigeBanner: {
    backgroundColor: 'rgba(255,170,0,0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,170,0,0.3)',
    padding: 16,
    marginBottom: 16,
  },
  prestigeBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  prestigeBannerIcon: {},
  prestigeBannerText: {
    flex: 1,
  },
  prestigeBannerTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: colors.dark.amber,
  },
  prestigeBannerSub: {
    fontSize: 12,
    color: colors.dark.mutedForeground,
    marginTop: 2,
  },
  badgesSection: {
    backgroundColor: colors.dark.surface1,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  viewAllBadgesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.dark.voltDim,
    borderWidth: 1,
    borderColor: 'rgba(204,255,0,0.2)',
  },
  viewAllBadgesText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.dark.volt,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.dark.foreground,
  },
  sectionCount: {
    fontSize: 13,
    color: colors.dark.mutedForeground,
  },
});

const badgeStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  iconDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rowContent: {
    flex: 1,
    gap: 6,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.dark.foreground,
  },
  categoryCount: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  barBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.dark.surface3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
  },
});

const prestigeStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  iconWrap: {
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: colors.dark.foreground,
  },
  subtitle: {
    fontSize: 15,
    color: colors.dark.mutedForeground,
    textAlign: 'center',
    lineHeight: 22,
  },
  changeCard: {
    width: '100%',
    backgroundColor: colors.dark.surface1,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.dark.border,
    marginTop: 8,
  },
  changeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  changeLabel: {
    fontSize: 14,
    color: colors.dark.mutedForeground,
  },
  changeValue: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: colors.dark.foreground,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.dark.border,
  },
  warning: {
    fontSize: 12,
    color: colors.dark.mutedForeground,
    textAlign: 'center',
    marginTop: 4,
  },
  prestigeBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  prestigeBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.dark.background,
  },
  deferBtn: {
    paddingVertical: 12,
  },
  deferBtnText: {
    fontSize: 14,
    color: colors.dark.mutedForeground,
  },
});
