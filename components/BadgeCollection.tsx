import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
  FlatList,
} from 'react-native';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import colors from '@/constants/colors';
import { useTheme } from "@/contexts/ThemeContext";
import { BADGE_CATEGORY_COLORS_NATIVE } from '@/constants/colors';
import { useTheme } from "@/contexts/ThemeContext";
import {
  ALL_BADGES_COMBINED,
  ALL_BADGE_CATEGORY_NAMES,
  AnyBadge,
  Badge,
  BadgeShape,
  BadgeStats,
  getBadgeProgress,
  BADGE_CATEGORY_COLORS,
} from '@/data/badges';
import { PostL100Badge, POST_L100_CATEGORY_COLORS } from '@/data/postL100Badges';
import { useBadgeStore } from '@/stores/badgeStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BADGE_SIZE = 64;
const GRID_COLUMNS = 4;
const GRID_GAP = 12;

const ALL_FILTER = 'all';

const NATIVE_POST_L100_COLORS: Record<string, { bg: string; text: string }> = {
  mastery: { bg: 'rgba(139, 92, 246, 0.2)', text: '#A78BFA' },
  overflow: { bg: 'rgba(6, 182, 212, 0.2)', text: '#22D3EE' },
  legacy: { bg: 'rgba(203, 213, 225, 0.2)', text: '#E2E8F0' },
  ultra_combo: { bg: 'rgba(37, 99, 235, 0.2)', text: '#93C5FD' },
  ultra_conditioning: { bg: 'rgba(244, 63, 94, 0.2)', text: '#FB7185' },
  ultra_time: { bg: 'rgba(99, 102, 241, 0.2)', text: '#A5B4FC' },
  ultra_volume: { bg: 'rgba(16, 185, 129, 0.2)', text: '#6EE7B7' },
  ultra_cardio: { bg: 'rgba(20, 184, 166, 0.2)', text: '#5EEAD4' },
  consistency: { bg: 'rgba(132, 204, 22, 0.2)', text: '#A3E635' },
  milestones: { bg: 'rgba(217, 70, 239, 0.2)', text: '#E879F9' },
  performance: { bg: 'rgba(14, 165, 233, 0.2)', text: '#7DD3FC' },
  ultra_streak: { bg: 'rgba(234, 88, 12, 0.2)', text: '#FDBA74' },
  combat_mastery: { bg: 'rgba(220, 38, 38, 0.2)', text: '#FCA5A5' },
};

function getCategoryColor(category: string): { bg: string; text: string } {
  if (BADGE_CATEGORY_COLORS_NATIVE[category]) {
    return BADGE_CATEGORY_COLORS_NATIVE[category];
  }
  if (NATIVE_POST_L100_COLORS[category]) {
    return NATIVE_POST_L100_COLORS[category];
  }
  return { bg: 'rgba(255,255,255,0.1)', text: '#FFFFFF' };
}

function BadgeShapeIcon({
  shape,
  size,
  fill,
  stroke,
  opacity,
}: {
  shape: BadgeShape;
  size: number;
  fill: string;
  stroke: string;
  opacity?: number;
}) {
  const half = size / 2;
  const o = opacity ?? 1;

  switch (shape) {
    case 'circle':
      return (
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <SvgCircle cx={half} cy={half} r={half - 2} fill={fill} stroke={stroke} strokeWidth={2} opacity={o} />
        </Svg>
      );
    case 'hexagon': {
      const r = half - 2;
      const pts = Array.from({ length: 6 }, (_, i) => {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        return `${half + r * Math.cos(angle)},${half + r * Math.sin(angle)}`;
      }).join(' ');
      return (
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Path d={`M${pts.split(' ').join('L')}Z`} fill={fill} stroke={stroke} strokeWidth={2} opacity={o} />
        </Svg>
      );
    }
    case 'shield': {
      const w = size;
      const h = size;
      return (
        <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          <Path
            d={`M${w / 2},2 L${w - 2},${h * 0.2} L${w - 2},${h * 0.55} Q${w - 2},${h * 0.85} ${w / 2},${h - 2} Q2,${h * 0.85} 2,${h * 0.55} L2,${h * 0.2} Z`}
            fill={fill}
            stroke={stroke}
            strokeWidth={2}
            opacity={o}
          />
        </Svg>
      );
    }
    case 'star': {
      const cx = half;
      const cy = half;
      const outerR = half - 2;
      const innerR = outerR * 0.4;
      const points: string[] = [];
      for (let i = 0; i < 5; i++) {
        const outerAngle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        const innerAngle = outerAngle + Math.PI / 5;
        points.push(`${cx + outerR * Math.cos(outerAngle)},${cy + outerR * Math.sin(outerAngle)}`);
        points.push(`${cx + innerR * Math.cos(innerAngle)},${cy + innerR * Math.sin(innerAngle)}`);
      }
      return (
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Path d={`M${points.join('L')}Z`} fill={fill} stroke={stroke} strokeWidth={1.5} opacity={o} />
        </Svg>
      );
    }
    case 'diamond': {
      const w = size;
      const h = size;
      return (
        <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          <Path
            d={`M${w / 2},2 L${w - 2},${h / 2} L${w / 2},${h - 2} L2,${h / 2} Z`}
            fill={fill}
            stroke={stroke}
            strokeWidth={2}
            opacity={o}
          />
        </Svg>
      );
    }
    default:
      return (
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <SvgCircle cx={half} cy={half} r={half - 2} fill={fill} stroke={stroke} strokeWidth={2} opacity={o} />
        </Svg>
      );
  }
}

function BadgeItem({
  badge,
  earned,
  progress,
  onPress,
}: {
  badge: AnyBadge;
  earned: boolean;
  progress: number;
  onPress: () => void;
}) {
  const catColor = getCategoryColor(badge.category);
  const fill = earned ? catColor.text : theme.surface3;
  const stroke = earned ? catColor.text : theme.border;

  return (
    <TouchableOpacity
      style={styles.badgeItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.badgeIconWrap}>
        <BadgeShapeIcon
          shape={badge.shape}
          size={BADGE_SIZE}
          fill={earned ? fill : theme.surface3}
          stroke={stroke}
          opacity={earned ? 1 : 0.4}
        />
        {!earned && progress > 0 && (
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: catColor.text }]} />
          </View>
        )}
        {earned && (
          <View style={[styles.earnedDot, { backgroundColor: catColor.text }]} />
        )}
      </View>
      <Text
        style={[
          styles.badgeName,
          !earned && styles.badgeNameLocked,
        ]}
        numberOfLines={2}
      >
        {badge.name}
      </Text>
    </TouchableOpacity>
  );
}

interface BadgeCollectionProps {
  stats?: BadgeStats;
}

export default function BadgeCollection({ stats }: BadgeCollectionProps) {
  const { theme } = useTheme();
  const { earnedBadgeIds, badgeStats } = useBadgeStore();
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL_FILTER);
  const [selectedBadge, setSelectedBadge] = useState<AnyBadge | null>(null);

  const effectiveStats = stats ?? badgeStats;

  const categories = useMemo(() => {
    const cats = new Set<string>();
    ALL_BADGES_COMBINED.forEach((b) => cats.add(b.category));
    return [ALL_FILTER, ...Array.from(cats)];
  }, []);

  const filteredBadges = useMemo(() => {
    if (selectedCategory === ALL_FILTER) return ALL_BADGES_COMBINED;
    return ALL_BADGES_COMBINED.filter((b) => b.category === selectedCategory);
  }, [selectedCategory]);

  const earnedSet = useMemo(() => new Set(earnedBadgeIds), [earnedBadgeIds]);

  const totalEarned = useMemo(
    () => ALL_BADGES_COMBINED.filter((b) => earnedSet.has(b.id)).length,
    [earnedSet]
  );

  const getProgress = useCallback(
    (badge: AnyBadge): number => {
      if ('postL100' in badge) return 0;
      return getBadgeProgress(badge as Badge, effectiveStats);
    },
    [effectiveStats]
  );

  const handleBadgePress = useCallback((badge: AnyBadge) => {
    setSelectedBadge(badge);
  }, []);

  const renderBadge = useCallback(
    ({ item }: { item: AnyBadge }) => (
      <BadgeItem
        badge={item}
        earned={earnedSet.has(item.id)}
        progress={getProgress(item)}
        onPress={() => handleBadgePress(item)}
      />
    ),
    [earnedSet, getProgress, handleBadgePress]
  );

  const selectedBadgeEarned = selectedBadge ? earnedSet.has(selectedBadge.id) : false;
  const selectedBadgeProgress = selectedBadge ? getProgress(selectedBadge) : 0;
  const selectedCatColor = selectedBadge ? getCategoryColor(selectedBadge.category) : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Badges</Text>
        <Text style={styles.headerCount}>
          {totalEarned} / {ALL_BADGES_COMBINED.length}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {categories.map((cat) => {
          const isActive = cat === selectedCategory;
          const catColor = cat === ALL_FILTER ? { bg: theme.voltDim, text: theme.volt } : getCategoryColor(cat);
          return (
            <TouchableOpacity
              key={cat}
              style={[
                styles.filterChip,
                isActive && { backgroundColor: catColor.bg, borderColor: catColor.text },
              ]}
              onPress={() => setSelectedCategory(cat)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterText,
                  isActive && { color: catColor.text },
                ]}
              >
                {cat === ALL_FILTER ? 'All' : ALL_BADGE_CATEGORY_NAMES[cat] ?? cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FlatList
        data={filteredBadges}
        renderItem={renderBadge}
        keyExtractor={(item) => item.id}
        numColumns={GRID_COLUMNS}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridContainer}
        showsVerticalScrollIndicator={false}
        scrollEnabled={filteredBadges.length > 0}
      />

      <Modal
        visible={!!selectedBadge}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedBadge(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedBadge(null)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
            {selectedBadge && selectedCatColor && (
              <>
                <TouchableOpacity
                  style={styles.modalClose}
                  onPress={() => setSelectedBadge(null)}
                >
                  <Ionicons name="close" size={24} color={theme.mutedForeground} />
                </TouchableOpacity>

                <View style={styles.modalBadgeWrap}>
                  <BadgeShapeIcon
                    shape={selectedBadge.shape}
                    size={96}
                    fill={selectedBadgeEarned ? selectedCatColor.text : theme.surface3}
                    stroke={selectedBadgeEarned ? selectedCatColor.text : theme.border}
                    opacity={selectedBadgeEarned ? 1 : 0.5}
                  />
                </View>

                <Text style={styles.modalBadgeName}>{selectedBadge.name}</Text>

                <View style={[styles.modalCategoryBadge, { backgroundColor: selectedCatColor.bg }]}>
                  <Text style={[styles.modalCategoryText, { color: selectedCatColor.text }]}>
                    {ALL_BADGE_CATEGORY_NAMES[selectedBadge.category] ?? selectedBadge.category}
                  </Text>
                </View>

                <Text style={styles.modalDescription}>{selectedBadge.description}</Text>

                <View style={styles.modalXpRow}>
                  <Ionicons name="flash" size={16} color={theme.volt} />
                  <Text style={styles.modalXpText}>+{selectedBadge.xpReward.toLocaleString()} XP</Text>
                </View>

                {!selectedBadgeEarned && (
                  <View style={styles.modalProgressSection}>
                    <View style={styles.modalProgressBar}>
                      <View
                        style={[
                          styles.modalProgressFill,
                          {
                            width: `${Math.round(selectedBadgeProgress * 100)}%`,
                            backgroundColor: selectedCatColor.text,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.modalProgressText}>
                      {Math.round(selectedBadgeProgress * 100)}%
                    </Text>
                  </View>
                )}

                {selectedBadgeEarned && (
                  <View style={styles.modalEarnedBanner}>
                    <Ionicons name="checkmark-circle" size={20} color={theme.green} />
                    <Text style={styles.modalEarnedText}>Earned</Text>
                  </View>
                )}
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.foreground,
  },
  headerCount: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.mutedForeground,
  },
  filterScroll: {
    maxHeight: 44,
    marginBottom: 12,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.border,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.mutedForeground,
  },
  gridContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  gridRow: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  badgeItem: {
    flex: 1,
    alignItems: 'center',
    maxWidth: (SCREEN_WIDTH - 32 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS,
  },
  badgeIconWrap: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  badgeName: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.foreground,
    textAlign: 'center',
    lineHeight: 13,
  },
  badgeNameLocked: {
    color: theme.mutedForeground,
    opacity: 0.6,
  },
  progressBarContainer: {
    position: 'absolute',
    bottom: -2,
    left: 8,
    right: 8,
    height: 3,
    backgroundColor: theme.surface2,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  earnedDot: {
    position: 'absolute',
    bottom: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: theme.background,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: SCREEN_WIDTH - 64,
    backgroundColor: theme.surface2,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  modalClose: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
  },
  modalBadgeWrap: {
    marginBottom: 16,
    marginTop: 8,
  },
  modalBadgeName: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.foreground,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalCategoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  modalCategoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalDescription: {
    fontSize: 14,
    color: theme.mutedForeground,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  modalXpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
  },
  modalXpText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.volt,
  },
  modalProgressSection: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalProgressBar: {
    flex: 1,
    height: 6,
    backgroundColor: theme.surface3,
    borderRadius: 3,
    overflow: 'hidden',
  },
  modalProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  modalProgressText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.mutedForeground,
    width: 40,
    textAlign: 'right',
  },
  modalEarnedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.greenDim,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  modalEarnedText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.green,
  },
});
