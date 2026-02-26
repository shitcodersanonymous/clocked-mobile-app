import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnyBadge } from '@/data/badges';
import { BADGE_CATEGORY_COLORS_NATIVE } from '@/constants/colors';

interface BadgeEarnOverlayProps {
  badge: AnyBadge;
  onComplete: () => void;
}

function BadgeIcon({ shape }: { shape: string }) {
  switch (shape) {
    case 'hexagon':
      return <Ionicons name="star-outline" size={40} color="#fff" />;
    case 'shield':
      return <Ionicons name="shield-checkmark" size={40} color="#fff" />;
    case 'star':
      return <Ionicons name="star" size={40} color="#fff" />;
    case 'diamond':
      return <Ionicons name="trophy" size={40} color="#fff" />;
    default:
      return <Ionicons name="flash" size={40} color="#fff" />;
  }
}

export function BadgeEarnOverlay({ badge, onComplete }: BadgeEarnOverlayProps) {
  const [phase, setPhase] = useState<'enter' | 'hold' | 'exit'>('enter');
  const scale = React.useRef(new Animated.Value(0.5)).current;
  const opacity = React.useRef(new Animated.Value(0)).current;
  const categoryColor = BADGE_CATEGORY_COLORS_NATIVE[badge.category]?.text ?? '#CCFF00';

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        tension: 80,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    const t1 = setTimeout(() => setPhase('hold'), 400);
    const t2 = setTimeout(() => {
      setPhase('exit');
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 0.75,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }, 2200);
    const t3 = setTimeout(onComplete, 2800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  return (
    <View style={styles.overlay} pointerEvents="none">
      <View style={styles.backdrop} />
      <Animated.View
        style={[
          styles.content,
          {
            opacity,
            transform: [{ scale }],
          },
        ]}
      >
        <View style={[styles.glowRing, { borderColor: categoryColor, shadowColor: categoryColor }]}>
          <View style={[styles.innerRing, { backgroundColor: categoryColor + '30' }]}>
            <BadgeIcon shape={badge.shape} />
          </View>
        </View>

        <Text style={styles.earnedLabel}>BADGE EARNED</Text>
        <Text style={[styles.badgeName, { color: categoryColor }]}>{badge.name}</Text>
        <Text style={styles.description}>{badge.description}</Text>
        <Text style={styles.xpReward}>+{badge.xpReward.toLocaleString()} XP</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 10, 10, 0.95)',
  },
  content: {
    alignItems: 'center',
    gap: 12,
  },
  glowRing: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 20,
  },
  innerRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  earnedLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#888',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginTop: 8,
  },
  badgeName: {
    fontSize: 24,
    fontWeight: '900',
  },
  description: {
    fontSize: 13,
    color: '#888',
    maxWidth: 200,
    textAlign: 'center',
  },
  xpReward: {
    fontSize: 18,
    fontWeight: '900',
    color: '#CCFF00',
  },
});
