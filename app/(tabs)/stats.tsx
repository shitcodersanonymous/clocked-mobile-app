import React, { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import RoadToBMF from '@/components/ui/RoadToBMF';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import colors, { PRESTIGE_COLORS, BADGE_CATEGORY_COLORS_NATIVE } from '@/constants/colors';
import { useUserStore } from '@/stores/userStore';
import { useHistoryStore } from '@/stores/historyStore';
import { useBadgeStore } from '@/stores/badgeStore';
import { XPBar } from '@/components/ui/XPBar';
import {
  Prestige,
  PRESTIGE_NAMES,
  RANKING_NAMES,
  RANKING_ORDER,
  getRankingFromLevel,
  getLevelRangeForRanking,
  getXPWithinCurrentLevel,
  getStreakMultiplier,
  isPrestigeEligible,
  getNextPrestige,
  STREAK_TIERS,
  PRESTIGE_ORDER,
} from '@/lib/xpSystem';
import {
  ALL_BADGES_COMBINED,
  ALL_BADGE_CATEGORIES,
  ALL_BADGE_CATEGORY_NAMES,
  TOTAL_BADGE_COUNT,
  getBadgeByIdCombined,
} from '@/data/badges';
import { GLOVES, checkGloveUnlocks } from '@/data/gloves';
import { useGloveStore } from '@/stores/gloveStore';
import { formatRelativeDate } from '@/lib/utils';
import { executePrestige } from '@/lib/prestigeActions';

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const updateUser = useUserStore((s) => s.updateUser);
  const completedWorkouts = useHistoryStore((s) => s.completedWorkouts);
  const { earnedBadgeIds, badgeStats } = useBadgeStore();
  const equippedGloveId = useGloveStore((s) => s.equippedGlove) || user?.equippedGlove || 'default';
  const equippedGlove = GLOVES[equippedGloveId] || GLOVES.default;

  const prestige: Prestige = (user?.prestige as Prestige) || 'beginner';
  const currentLevel = user?.currentLevel || 1;
  const totalXP = user?.totalXP || 0;
  const currentStreak = user?.currentStreak || 0;
  const longestStreak = user?.longestStreak || 0;
  const workoutsCompleted = Math.max(
    user?.workoutsCompleted || 0,
    completedWorkouts.length
  );

  const ranking = getRankingFromLevel(currentLevel);
  const { current: xpCurrent, required: xpRequired } = getXPWithinCurrentLevel(
    prestige,
    totalXP
  );
  const streakMult = getStreakMultiplier(currentStreak);
  const prestigeEligible = isPrestigeEligible(prestige, totalXP);

  const totalTrainingHours = useMemo(() => {
    const totalSeconds = completedWorkouts.reduce(
      (sum, w) => sum + (w.duration || 0),
      0
    );
    return Math.round((totalSeconds / 3600) * 10) / 10;
  }, [completedWorkouts]);

  const totalRounds = useMemo(() => {
    return completedWorkouts.reduce((sum, w) => {
      if (w.roundFeedback && w.roundFeedback.length > 0) {
        return sum + w.roundFeedback.length;
      }
      return sum + Math.max(1, Math.round((w.duration || 0) / 180));
    }, 0);
  }, [completedWorkouts]);

  const caloriesEst = useMemo(() => {
    return Math.round(
      completedWorkouts.reduce((sum, w) => sum + ((w.duration || 0) / 60) * 10, 0)
    );
  }, [completedWorkouts]);

  const avgIntensity = useMemo(() => {
    const difficultyMap: Record<string, number> = {
      too_easy: 2,
      just_right: 3,
      too_hard: 5,
    };
    const rated = completedWorkouts.filter((w) => w.difficulty);
    if (rated.length === 0) return 0;
    const total = rated.reduce(
      (sum, w) => sum + (difficultyMap[w.difficulty!] || 3),
      0
    );
    return Math.round((total / rated.length) * 10) / 10;
  }, [completedWorkouts]);

  const weeklyChanges = useMemo(() => {
    const now = new Date();
    const startOfThisWeek = new Date(now);
    startOfThisWeek.setDate(now.getDate() - now.getDay());
    startOfThisWeek.setHours(0, 0, 0, 0);
    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

    const thisWeek = completedWorkouts.filter(
      (w) => new Date(w.completedAt) >= startOfThisWeek
    );
    const lastWeek = completedWorkouts.filter((w) => {
      const d = new Date(w.completedAt);
      return d >= startOfLastWeek && d < startOfThisWeek;
    });

    const calcRounds = (workouts: typeof completedWorkouts) =>
      workouts.reduce((sum, w) => {
        if (w.roundFeedback && w.roundFeedback.length > 0) return sum + w.roundFeedback.length;
        return sum + Math.max(1, Math.round((w.duration || 0) / 180));
      }, 0);

    const calcHours = (workouts: typeof completedWorkouts) =>
      workouts.reduce((sum, w) => sum + (w.duration || 0), 0) / 3600;

    const calcCalories = (workouts: typeof completedWorkouts) =>
      workouts.reduce((sum, w) => sum + ((w.duration || 0) / 60) * 10, 0);

    const difficultyMap: Record<string, number> = { too_easy: 2, just_right: 3, too_hard: 5 };
    const calcIntensity = (workouts: typeof completedWorkouts) => {
      const rated = workouts.filter((w) => w.difficulty);
      if (rated.length === 0) return 0;
      return rated.reduce((sum, w) => sum + (difficultyMap[w.difficulty!] || 3), 0) / rated.length;
    };

    const pct = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 100);
    };

    return {
      hours: pct(calcHours(thisWeek), calcHours(lastWeek)),
      rounds: pct(calcRounds(thisWeek), calcRounds(lastWeek)),
      calories: pct(calcCalories(thisWeek), calcCalories(lastWeek)),
      intensity: pct(calcIntensity(thisWeek), calcIntensity(lastWeek)),
    };
  }, [completedWorkouts]);

  const workoutDatesThisMonth = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const dates = new Set<number>();
    completedWorkouts.forEach((w) => {
      const d = new Date(w.completedAt);
      if (d.getMonth() === month && d.getFullYear() === year) {
        dates.add(d.getDate());
      }
    });
    return dates;
  }, [completedWorkouts]);

  const calendarData = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = now.getDate();
    const monthName = now.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
    return { firstDay, daysInMonth, today, monthName };
  }, []);

  const badgeSummary = useMemo(() => {
    return ALL_BADGE_CATEGORIES.map(({ category, badges }) => {
      const earned = badges.filter((b) =>
        earnedBadgeIds.includes(b.id)
      ).length;
      return { category, total: badges.length, earned };
    });
  }, [earnedBadgeIds]);

  const recentSessions = useMemo(() => {
    return completedWorkouts.slice(0, 15);
  }, [completedWorkouts]);

  const unlockedGloveCount = useMemo(() => {
    return checkGloveUnlocks(prestige, currentLevel, currentStreak).length;
  }, [prestige, currentLevel, currentStreak]);

  const currentStreakTier = useMemo(() => {
    for (let i = STREAK_TIERS.length - 1; i >= 0; i--) {
      if (currentStreak >= STREAK_TIERS[i].min) return STREAK_TIERS[i];
    }
    return STREAK_TIERS[0];
  }, [currentStreak]);

  const handlePrestige = () => {
    executePrestige(prestige);
  };

  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topInset + 16, paddingBottom: 100 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.headerTitle}>My Stats</Text>

      {prestigeEligible && (
        <TouchableOpacity
          style={styles.prestigeBanner}
          onPress={handlePrestige}
          activeOpacity={0.8}
        >
          <View style={styles.prestigeBannerContent}>
            <Ionicons name="arrow-up-circle" size={22} color={colors.dark.volt} />
            <View style={{ flex: 1 }}>
              <Text style={styles.prestigeBannerTitle}>Prestige Available</Text>
              <Text style={styles.prestigeBannerSub}>
                Advance to {PRESTIGE_NAMES[getNextPrestige(prestige)!]}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.dark.mutedForeground} />
          </View>
        </TouchableOpacity>
      )}

      <View style={styles.xpCard}>
        <View style={styles.xpCardGlow} />
        <XPBar
          prestige={prestige}
          level={currentLevel}
          currentXP={xpCurrent}
          requiredXP={xpRequired}
          showRank={true}
          rankingName={RANKING_NAMES[ranking]}
          prestigeName={PRESTIGE_NAMES[prestige]}
        />
      </View>

      <TouchableOpacity
        style={styles.gloveCard}
        onPress={() => router.push('/gloves')}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.gloveColorBox,
            { backgroundColor: equippedGlove.tierThemeColor },
          ]}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.gloveCardName}>{equippedGlove.name}</Text>
          <Text style={styles.gloveCardSub}>
            {unlockedGloveCount}/52 Gloves Unlocked
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.dark.mutedForeground} />
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Badges</Text>
        <Text style={styles.sectionBadgeCount}>
          {earnedBadgeIds.length} / {TOTAL_BADGE_COUNT}
        </Text>
      </View>
      <View style={styles.badgeGrid}>
        {badgeSummary.slice(0, 7).map(({ category, total, earned }) => {
          const catColors = BADGE_CATEGORY_COLORS_NATIVE[category] || {
            bg: colors.dark.surface2,
            text: colors.dark.volt,
          };
          return (
            <View
              key={category}
              style={[styles.badgeCatCard, { backgroundColor: catColors.bg }]}
            >
              <Text style={[styles.badgeCatCount, { color: catColors.text }]}>
                {earned}
              </Text>
              <Text style={styles.badgeCatLabel}>
                {ALL_BADGE_CATEGORY_NAMES[category] || category}
              </Text>
              <View style={styles.badgeCatBarBg}>
                <View
                  style={[
                    styles.badgeCatBarFill,
                    {
                      backgroundColor: catColors.text,
                      width: `${total > 0 ? (earned / total) * 100 : 0}%` as any,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Progress</Text>
      </View>
      <View style={styles.statGrid3}>
        <View style={styles.statCardMini}>
          <Ionicons name="flash" size={20} color={colors.dark.volt} />
          <Text style={styles.statCardValue}>
            {totalXP.toLocaleString()}
          </Text>
          <Text style={styles.statCardLabel}>Total XP</Text>
        </View>
        <View style={styles.statCardMini}>
          <Ionicons name="trophy" size={20} color={colors.dark.amber} />
          <Text style={styles.statCardValue}>{workoutsCompleted}</Text>
          <Text style={styles.statCardLabel}>Workouts</Text>
        </View>
        <View style={styles.statCardMini}>
          <Ionicons name="flame" size={20} color={colors.dark.orange} />
          <Text style={styles.statCardValue}>{currentStreak}d</Text>
          <Text style={styles.statCardLabel}>Streak</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Training</Text>
      </View>
      <View style={styles.trainingGrid}>
        <View style={styles.trainingCard}>
          <View style={styles.trainingCardHeader}>
            <View style={[styles.trainingIconBg, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
              <Ionicons name="time" size={18} color="#3B82F6" />
            </View>
            {weeklyChanges.hours !== 0 && (
              <View style={[styles.weeklyBadge, weeklyChanges.hours > 0 ? styles.weeklyBadgeUp : styles.weeklyBadgeDown]}>
                <Ionicons name={weeklyChanges.hours > 0 ? 'arrow-up' : 'arrow-down'} size={10} color={weeklyChanges.hours > 0 ? '#22C55E' : '#EF4444'} />
                <Text style={[styles.weeklyText, { color: weeklyChanges.hours > 0 ? '#22C55E' : '#EF4444' }]}>{Math.abs(weeklyChanges.hours)}%</Text>
              </View>
            )}
          </View>
          <Text style={styles.trainingCardValue}>{totalTrainingHours}h</Text>
          <Text style={styles.trainingCardLabel}>Training Hours</Text>
        </View>
        <View style={styles.trainingCard}>
          <View style={styles.trainingCardHeader}>
            <View style={[styles.trainingIconBg, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
              <Ionicons name="disc" size={18} color="#22C55E" />
            </View>
            {weeklyChanges.rounds !== 0 && (
              <View style={[styles.weeklyBadge, weeklyChanges.rounds > 0 ? styles.weeklyBadgeUp : styles.weeklyBadgeDown]}>
                <Ionicons name={weeklyChanges.rounds > 0 ? 'arrow-up' : 'arrow-down'} size={10} color={weeklyChanges.rounds > 0 ? '#22C55E' : '#EF4444'} />
                <Text style={[styles.weeklyText, { color: weeklyChanges.rounds > 0 ? '#22C55E' : '#EF4444' }]}>{Math.abs(weeklyChanges.rounds)}%</Text>
              </View>
            )}
          </View>
          <Text style={styles.trainingCardValue}>{totalRounds.toLocaleString()}</Text>
          <Text style={styles.trainingCardLabel}>Total Rounds</Text>
        </View>
        <View style={styles.trainingCard}>
          <View style={styles.trainingCardHeader}>
            <View style={[styles.trainingIconBg, { backgroundColor: 'rgba(249, 115, 22, 0.15)' }]}>
              <Ionicons name="flame" size={18} color="#F97316" />
            </View>
            {weeklyChanges.calories !== 0 && (
              <View style={[styles.weeklyBadge, weeklyChanges.calories > 0 ? styles.weeklyBadgeUp : styles.weeklyBadgeDown]}>
                <Ionicons name={weeklyChanges.calories > 0 ? 'arrow-up' : 'arrow-down'} size={10} color={weeklyChanges.calories > 0 ? '#22C55E' : '#EF4444'} />
                <Text style={[styles.weeklyText, { color: weeklyChanges.calories > 0 ? '#22C55E' : '#EF4444' }]}>{Math.abs(weeklyChanges.calories)}%</Text>
              </View>
            )}
          </View>
          <Text style={styles.trainingCardValue}>{caloriesEst.toLocaleString()}</Text>
          <Text style={styles.trainingCardLabel}>Calories est.</Text>
        </View>
        <View style={styles.trainingCard}>
          <View style={styles.trainingCardHeader}>
            <View style={[styles.trainingIconBg, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
              <Ionicons name="flash" size={18} color="#A855F7" />
            </View>
            {weeklyChanges.intensity !== 0 && (
              <View style={[styles.weeklyBadge, weeklyChanges.intensity > 0 ? styles.weeklyBadgeUp : styles.weeklyBadgeDown]}>
                <Ionicons name={weeklyChanges.intensity > 0 ? 'arrow-up' : 'arrow-down'} size={10} color={weeklyChanges.intensity > 0 ? '#22C55E' : '#EF4444'} />
                <Text style={[styles.weeklyText, { color: weeklyChanges.intensity > 0 ? '#22C55E' : '#EF4444' }]}>{Math.abs(weeklyChanges.intensity)}%</Text>
              </View>
            )}
          </View>
          <Text style={styles.trainingCardValue}>{avgIntensity > 0 ? `${avgIntensity}/5` : '--'}</Text>
          <Text style={styles.trainingCardLabel}>Avg Intensity</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Streak Multiplier</Text>
      </View>
      <View style={styles.card}>
        <View style={styles.streakHeaderRow}>
          <Text style={styles.streakCurrentLabel}>Current</Text>
          <Text style={[styles.streakCurrentValue, { color: colors.dark.volt }]}>
            {streakMult}x
          </Text>
        </View>
        <View style={styles.streakTiers}>
          {STREAK_TIERS.map((tier) => {
            const isActive = currentStreak >= tier.min;
            const isCurrent =
              currentStreak >= tier.min && currentStreak <= tier.max;
            return (
              <View
                key={tier.min}
                style={[
                  styles.streakTierRow,
                  isCurrent && styles.streakTierRowActive,
                ]}
              >
                <View
                  style={[
                    styles.streakDot,
                    {
                      backgroundColor: isActive
                        ? colors.dark.volt
                        : colors.dark.surface3,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.streakTierLabel,
                    isActive && { color: colors.dark.foreground },
                    isCurrent && { color: colors.dark.volt },
                  ]}
                >
                  {tier.min === 0
                    ? '0-2 days'
                    : tier.max === 999
                    ? `${tier.min}+ days`
                    : `${tier.min}-${tier.max} days`}
                </Text>
                <Text
                  style={[
                    styles.streakTierMult,
                    isCurrent && { color: colors.dark.volt },
                  ]}
                >
                  {tier.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {calendarData.monthName}
        </Text>
        <Text style={styles.sectionBadgeCount}>
          {workoutDatesThisMonth.size} days
        </Text>
      </View>
      <View style={styles.card}>
        <View style={styles.calDayHeaders}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <Text key={i} style={styles.calDayHeader}>
              {d}
            </Text>
          ))}
        </View>
        <View style={styles.calGrid}>
          {Array.from({ length: calendarData.firstDay }).map((_, i) => (
            <View key={`pad-${i}`} style={styles.calCell} />
          ))}
          {Array.from({ length: calendarData.daysInMonth }).map((_, i) => {
            const day = i + 1;
            const worked = workoutDatesThisMonth.has(day);
            const isToday = day === calendarData.today;
            return (
              <View key={day} style={styles.calCell}>
                <View
                  style={[
                    styles.calCellInner,
                    worked && !isToday && styles.calCellInnerWorked,
                    isToday && !worked && styles.calCellInnerToday,
                    isToday && worked && styles.calCellInnerTodayWorked,
                  ]}
                >
                  <Text
                    style={[
                      styles.calCellText,
                      worked && styles.calCellTextWorked,
                      isToday && !worked && styles.calCellTextToday,
                    ]}
                  >
                    {day}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Sessions</Text>
      </View>
      {recentSessions.length > 0 ? (
        <View style={styles.card}>
          {recentSessions.map((session, idx) => (
            <View
              key={session.id}
              style={[
                styles.sessionRow,
                idx < recentSessions.length - 1 && styles.sessionRowBorder,
              ]}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.sessionName} numberOfLines={1}>
                  {session.workoutName}
                </Text>
                <Text style={styles.sessionMeta}>
                  {formatRelativeDate(session.completedAt)} ·{' '}
                  {Math.round(session.duration / 60)}m
                </Text>
              </View>
              <View style={styles.sessionXpRow}>
                <Ionicons name="flash" size={14} color={colors.dark.volt} />
                <Text style={styles.sessionXpText}>
                  +{session.xpEarned.toLocaleString()}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.emptyText}>
            No sessions yet. Complete a workout to see your history!
          </Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Road to BMFK</Text>
      </View>
      <RoadToBMF
        workoutsCompleted={workoutsCompleted}
        prestige={prestige}
        level={currentLevel}
        currentStreak={currentStreak}
      />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ranking Ladder</Text>
        <Text style={[styles.sectionBadgeCount, { color: colors.dark.volt }]}>
          {PRESTIGE_NAMES[prestige]}
        </Text>
      </View>
      <View style={styles.card}>
        {RANKING_ORDER.map((rankItem) => {
          const isCurrentRanking = rankItem === ranking;
          const levelRange = getLevelRangeForRanking(rankItem);
          const isAchieved = currentLevel >= levelRange.min;
          return (
            <View
              key={rankItem}
              style={[
                styles.rankRow,
                isCurrentRanking && styles.rankRowActive,
              ]}
            >
              <View style={styles.rankLeft}>
                <View
                  style={[
                    styles.rankDot,
                    {
                      backgroundColor: isAchieved
                        ? colors.dark.volt
                        : colors.dark.surface3,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.rankName,
                    isCurrentRanking && { color: colors.dark.volt },
                    !isCurrentRanking &&
                      isAchieved && { color: colors.dark.foreground },
                  ]}
                >
                  {RANKING_NAMES[rankItem]}
                </Text>
              </View>
              <Text style={styles.rankRange}>
                Lvl {levelRange.min}-{levelRange.max}
              </Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  content: {
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: colors.dark.foreground,
    marginBottom: 20,
  },
  prestigeBanner: {
    backgroundColor: colors.dark.voltDim,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.dark.voltMuted,
    marginBottom: 16,
    overflow: 'hidden',
  },
  prestigeBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  prestigeBannerTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: colors.dark.volt,
  },
  prestigeBannerSub: {
    fontSize: 12,
    color: colors.dark.mutedForeground,
    marginTop: 2,
  },
  xpCard: {
    backgroundColor: colors.dark.surface1,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.dark.border,
    marginBottom: 12,
    overflow: 'hidden',
  },
  xpCardGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.dark.voltDim,
    opacity: 0.3,
  },
  gloveCard: {
    backgroundColor: colors.dark.surface1,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.dark.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  gloveColorBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.dark.voltMuted,
  },
  gloveCardName: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: colors.dark.foreground,
  },
  gloveCardSub: {
    fontSize: 12,
    color: colors.dark.mutedForeground,
    marginTop: 2,
  },
  section: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: colors.dark.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionBadgeCount: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: colors.dark.volt,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  badgeCatCard: {
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    width: '30%' as any,
    flexGrow: 1,
    minWidth: 80,
  },
  badgeCatCount: {
    fontSize: 20,
    fontWeight: '800' as const,
  },
  badgeCatLabel: {
    fontSize: 9,
    color: colors.dark.mutedForeground,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  badgeCatBarBg: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    width: '100%',
    marginTop: 6,
    overflow: 'hidden',
  },
  badgeCatBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  statGrid3: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statGrid2: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  trainingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  trainingCard: {
    width: '48%' as any,
    flexGrow: 1,
    backgroundColor: colors.dark.surface1,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.dark.border,
    gap: 4,
  },
  trainingCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  trainingIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trainingCardValue: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: colors.dark.foreground,
  },
  trainingCardLabel: {
    fontSize: 11,
    color: colors.dark.mutedForeground,
    fontWeight: '500' as const,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  weeklyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  weeklyBadgeUp: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
  },
  weeklyBadgeDown: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  weeklyText: {
    fontSize: 10,
    fontWeight: '700' as const,
  },
  statCardMini: {
    flex: 1,
    backgroundColor: colors.dark.surface1,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  statCardValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.dark.foreground,
  },
  statCardLabel: {
    fontSize: 10,
    color: colors.dark.mutedForeground,
    fontWeight: '500' as const,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: colors.dark.surface1,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.dark.border,
    marginBottom: 16,
  },
  streakHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  streakCurrentLabel: {
    fontSize: 13,
    color: colors.dark.mutedForeground,
    fontWeight: '600' as const,
  },
  streakCurrentValue: {
    fontSize: 18,
    fontWeight: '800' as const,
  },
  streakTiers: {
    gap: 6,
  },
  streakTierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  streakTierRowActive: {
    backgroundColor: colors.dark.voltDim,
  },
  streakDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  streakTierLabel: {
    flex: 1,
    fontSize: 13,
    color: colors.dark.mutedForeground,
    fontWeight: '500' as const,
  },
  streakTierMult: {
    fontSize: 13,
    color: colors.dark.mutedForeground,
    fontWeight: '600' as const,
  },
  calDayHeaders: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  calDayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600' as const,
    color: colors.dark.mutedForeground,
  },
  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calCell: {
    width: '14.28%' as any,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  calCellWorked: {},
  calCellToday: {},
  calCellTodayWorked: {},
  calCellInner: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calCellInnerWorked: {
    backgroundColor: colors.dark.volt,
  },
  calCellInnerToday: {
    borderWidth: 1.5,
    borderColor: colors.dark.volt,
  },
  calCellInnerTodayWorked: {
    backgroundColor: colors.dark.volt,
  },
  calCellText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: colors.dark.mutedForeground,
  },
  calCellTextWorked: {
    color: colors.dark.background,
    fontWeight: '800' as const,
  },
  calCellTextToday: {
    color: colors.dark.volt,
    fontWeight: '700' as const,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  sessionRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  sessionName: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: colors.dark.foreground,
  },
  sessionMeta: {
    fontSize: 10,
    color: colors.dark.mutedForeground,
    marginTop: 2,
  },
  sessionXpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
  },
  sessionXpText: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: colors.dark.volt,
  },
  emptyText: {
    fontSize: 14,
    color: colors.dark.mutedForeground,
    textAlign: 'center',
    paddingVertical: 20,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  rankRowActive: {
    backgroundColor: colors.dark.voltDim,
  },
  rankLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rankDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rankName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.dark.mutedForeground,
  },
  rankRange: {
    fontSize: 13,
    color: colors.dark.mutedForeground,
  },
});
