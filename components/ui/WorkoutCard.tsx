import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useThemedColors } from '@/hooks/useThemedColors';

interface WorkoutCardProps {
  id: string;
  name: string;
  description: string;
  duration: number;
  rounds: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  category?: string;
  onPress?: () => void;
}

export function WorkoutCard({
  id,
  name,
  description,
  duration,
  rounds,
  difficulty,
  category,
  onPress,
}: WorkoutCardProps) {
  const router = useRouter();
  const colors = useThemedColors();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push({
        pathname: '/workout/[id]',
        params: { id },
      });
    }
  };

  const getDifficultyColor = () => {
    switch (difficulty) {
      case 'easy':
        return colors.success;
      case 'medium':
        return colors.warning;
      case 'hard':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {name}
          </Text>
          {category && (
            <View style={[styles.categoryBadge, { backgroundColor: colors.surfaceElevated }]}>
              <Text style={[styles.categoryText, { color: colors.primary }]}>
                {category}
              </Text>
            </View>
          )}
        </View>
        {difficulty && (
          <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor() + '20' }]}>
            <Text style={[styles.difficultyText, { color: getDifficultyColor() }]}>
              {difficulty.toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
        {description}
      </Text>

      <View style={styles.footer}>
        <View style={styles.stat}>
          <Ionicons name="time-outline" size={16} color={colors.textTertiary} />
          <Text style={[styles.statText, { color: colors.textTertiary }]}>
            {formatDuration(duration)}
          </Text>
        </View>
        <View style={styles.stat}>
          <Ionicons name="repeat-outline" size={16} color={colors.textTertiary} />
          <Text style={[styles.statText, { color: colors.textTertiary }]}>
            {rounds} {rounds === 1 ? 'round' : 'rounds'}
          </Text>
        </View>
        <View style={styles.spacer} />
        <Ionicons name="chevron-forward" size={20} color={colors.primary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  titleContainer: {
    flex: 1,
    gap: 6,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 13,
    fontWeight: '500',
  },
  spacer: {
    flex: 1,
  },
});
