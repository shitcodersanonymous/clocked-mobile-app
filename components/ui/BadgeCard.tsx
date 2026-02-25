import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors, { BADGE_CATEGORY_COLORS_NATIVE } from '@/constants/colors';
import { formatNumber } from '@/lib/utils';

interface BadgeCardProps {
  name: string;
  description: string;
  category: string;
  xpReward: number;
  shape: string;
  earned: boolean;
  progress?: number;
  earnedAt?: string;
  onPress?: () => void;
}

function getShapeIcon(shape: string): keyof typeof Ionicons.glyphMap {
  switch (shape) {
    case 'hexagon': return 'stop-outline';
    case 'shield': return 'shield-outline';
    case 'star': return 'star-outline';
    case 'diamond': return 'diamond-outline';
    default: return 'ellipse-outline';
  }
}

function getShapeIconFilled(shape: string): keyof typeof Ionicons.glyphMap {
  switch (shape) {
    case 'hexagon': return 'stop';
    case 'shield': return 'shield';
    case 'star': return 'star';
    case 'diamond': return 'diamond';
    default: return 'ellipse';
  }
}

export function BadgeCard({
  name,
  description,
  category,
  xpReward,
  shape,
  earned,
  progress = 0,
  onPress,
}: BadgeCardProps) {
  const categoryColors = BADGE_CATEGORY_COLORS_NATIVE[category] || BADGE_CATEGORY_COLORS_NATIVE.streak;
  const iconName = earned ? getShapeIconFilled(shape) : getShapeIcon(shape);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[
        styles.iconContainer,
        { backgroundColor: earned ? categoryColors.bg : colors.dark.surface2 },
      ]}>
        <Ionicons
          name={iconName}
          size={24}
          color={earned ? categoryColors.text : colors.dark.mutedForeground + '66'}
        />
      </View>
      <Text
        style={[
          styles.name,
          { color: earned ? colors.dark.foreground : colors.dark.mutedForeground + '80' },
        ]}
        numberOfLines={2}
      >
        {name}
      </Text>
      {earned ? (
        <Text style={[styles.xp, { color: categoryColors.text }]}>
          +{formatNumber(xpReward)}
        </Text>
      ) : progress > 0 ? (
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${Math.min(progress * 100, 100)}%`, backgroundColor: categoryColors.text }]} />
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

export function BadgeCardCompact({
  name,
  category,
  shape,
  earned,
}: Pick<BadgeCardProps, 'name' | 'category' | 'shape' | 'earned'>) {
  const categoryColors = BADGE_CATEGORY_COLORS_NATIVE[category] || BADGE_CATEGORY_COLORS_NATIVE.streak;
  const iconName = earned ? getShapeIconFilled(shape) : getShapeIcon(shape);

  return (
    <View style={styles.compactContainer}>
      <View style={[
        styles.compactIcon,
        { backgroundColor: earned ? categoryColors.bg : colors.dark.surface2 },
      ]}>
        <Ionicons
          name={iconName}
          size={18}
          color={earned ? categoryColors.text : colors.dark.mutedForeground + '44'}
        />
      </View>
      <Text
        style={[
          styles.compactName,
          { color: earned ? colors.dark.foreground : colors.dark.mutedForeground + '50' },
        ]}
        numberOfLines={2}
      >
        {name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 4,
    padding: 8,
    borderRadius: 12,
    width: 72,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 9,
    lineHeight: 12,
    textAlign: 'center',
    fontWeight: '500' as const,
  },
  xp: {
    fontSize: 9,
    fontWeight: '600' as const,
  },
  progressBarBg: {
    width: 36,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.dark.surface3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  compactContainer: {
    alignItems: 'center',
    gap: 3,
    width: 56,
  },
  compactIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactName: {
    fontSize: 8,
    lineHeight: 10,
    textAlign: 'center',
  },
});
