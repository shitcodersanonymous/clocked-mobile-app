import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors, { BADGE_CATEGORY_COLORS_NATIVE } from '@/constants/colors';
import { useTheme } from "@/contexts/ThemeContext";
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
  const { theme } = useTheme();
  const badgeColor = BADGE_CATEGORY_COLORS_NATIVE[category as keyof typeof BADGE_CATEGORY_COLORS_NATIVE] || theme.volt;
  const icon = earned ? getShapeIconFilled(shape) : getShapeIcon(shape);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: theme.surface1,
          borderColor: earned ? badgeColor + '40' : theme.border,
        },
      ]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconWrap, { backgroundColor: badgeColor + (earned ? '30' : '15') }]}>
        <Ionicons
          name={icon}
          size={32}
          color={earned ? badgeColor : theme.mutedForeground}
        />
      </View>

      <View style={styles.info}>
        <Text style={[styles.name, { color: earned ? theme.foreground : theme.mutedForeground }]}>
          {name}
        </Text>
        <Text
          style={[styles.description, { color: theme.mutedForeground }]}
          numberOfLines={2}
        >
          {description}
        </Text>

        {!earned && progress > 0 && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBarBg, { backgroundColor: theme.surface2 }]}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.min(100, progress * 100)}%`,
                    backgroundColor: badgeColor,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: theme.mutedForeground }]}>
              {Math.round(progress * 100)}%
            </Text>
          </View>
        )}

        <View style={styles.footer}>
          <View style={[styles.xpBadge, { backgroundColor: theme.volt + '1A' }]}>
            <Ionicons name="flash" size={10} color={theme.volt} />
            <Text style={[styles.xpText, { color: theme.volt }]}>
              +{formatNumber(xpReward)} XP
            </Text>
          </View>
          {earned && (
            <View style={styles.earnedBadge}>
              <Ionicons name="checkmark-circle" size={12} color={badgeColor} />
              <Text style={[styles.earnedText, { color: badgeColor }]}>EARNED</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 12,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
  },
  progressContainer: {
    marginTop: 8,
    gap: 4,
  },
  progressBarBg: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 10,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  xpText: {
    fontSize: 10,
    fontWeight: '700',
  },
  earnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  earnedText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
