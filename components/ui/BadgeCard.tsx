import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemedColors } from '@/hooks/useThemedColors';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlocked: boolean;
  unlockedAt?: Date;
  progress?: {
    current: number;
    required: number;
  };
}

interface BadgeCardProps {
  badge: Badge;
  onPress?: (badge: Badge) => void;
}

export function BadgeCard({ badge, onPress }: BadgeCardProps) {
  const colors = useThemedColors();

  const getRarityColors = (rarity: Badge['rarity']) => {
    switch (rarity) {
      case 'common':
        return ['#6b7280', '#4b5563'];
      case 'rare':
        return ['#3b82f6', '#2563eb'];
      case 'epic':
        return ['#8b5cf6', '#7c3aed'];
      case 'legendary':
        return ['#f59e0b', '#d97706'];
    }
  };

  const getRarityIcon = (rarity: Badge['rarity']) => {
    switch (rarity) {
      case 'common':
        return 'circle';
      case 'rare':
        return 'diamond';
      case 'epic':
        return 'star';
      case 'legendary':
        return 'sparkles';
    }
  };

  const rarityColors = getRarityColors(badge.rarity);
  const isLocked = !badge.unlocked;

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}
      onPress={() => onPress?.(badge)}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <LinearGradient
        colors={isLocked ? [colors.surfaceElevated, colors.surface] : rarityColors}
        style={styles.iconContainer}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons
          name={badge.icon}
          size={32}
          color={isLocked ? colors.textMuted : '#ffffff'}
        />
        {isLocked && (
          <View style={styles.lockOverlay}>
            <Ionicons name="lock-closed" size={16} color={colors.textMuted} />
          </View>
        )}
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text
            style={[styles.name, { color: isLocked ? colors.textMuted : colors.text }]}
            numberOfLines={1}
          >
            {badge.name}
          </Text>
          <View style={styles.rarityBadge}>
            <Ionicons
              name={getRarityIcon(badge.rarity)}
              size={12}
              color={isLocked ? colors.textMuted : rarityColors[0]}
            />
          </View>
        </View>

        <Text
          style={[styles.description, { color: isLocked ? colors.textMuted : colors.textSecondary }]}
          numberOfLines={2}
        >
          {badge.description}
        </Text>

        {badge.progress && !badge.unlocked && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: colors.surfaceElevated }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${(badge.progress.current / badge.progress.required) * 100}%`,
                    backgroundColor: colors.primary,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: colors.textSecondary }]}>
              {badge.progress.current} / {badge.progress.required}
            </Text>
          </View>
        )}

        {badge.unlocked && badge.unlockedAt && (
          <Text style={[styles.unlockedText, { color: colors.success }]}>
            <Ionicons name="checkmark-circle" size={12} /> Unlocked{' '}
            {new Date(badge.unlockedAt).toLocaleDateString()}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  lockOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 10,
    padding: 4,
  },
  content: {
    flex: 1,
    gap: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  rarityBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  progressContainer: {
    gap: 4,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '600',
  },
  unlockedText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
