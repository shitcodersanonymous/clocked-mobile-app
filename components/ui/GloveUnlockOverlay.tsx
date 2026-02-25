import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Glove } from '@/data/gloves';

interface GloveUnlockOverlayProps {
  glove: Glove;
  onComplete: () => void;
}

export function GloveUnlockOverlay({ glove, onComplete }: GloveUnlockOverlayProps) {
  const [phase, setPhase] = useState<'flash' | 'reveal' | 'details' | 'out'>('flash');
  const ringScale = React.useRef(new Animated.Value(0)).current;
  const contentScale = React.useRef(new Animated.Value(0.2)).current;
  const contentOpacity = React.useRef(new Animated.Value(0)).current;
  const detailsOpacity = React.useRef(new Animated.Value(0)).current;

  const color = glove.tierThemeColor;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(ringScale, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(contentScale, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    const t1 = setTimeout(() => {
      setPhase('reveal');
    }, 400);

    const t2 = setTimeout(() => {
      setPhase('details');
      Animated.timing(detailsOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, 1200);

    const t3 = setTimeout(() => {
      setPhase('out');
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(contentScale, {
          toValue: 0.8,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }, 3200);

    const t4 = setTimeout(onComplete, 3800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete]);

  return (
    <View style={styles.overlay} pointerEvents="none">
      <View style={styles.backdrop} />

      <Animated.View
        style={[
          styles.ring,
          {
            borderColor: color,
            opacity: phase === 'out' ? 0 : 0.3,
            transform: [{ scale: ringScale }],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: contentOpacity,
            transform: [{ scale: contentScale }],
          },
        ]}
      >
        <View
          style={[
            styles.gloveIcon,
            {
              backgroundColor: color,
              shadowColor: color,
            },
          ]}
        >
          <Text style={styles.emoji}>🥊</Text>
        </View>

        <Animated.Text
          style={[
            styles.label,
            {
              color: color,
              opacity: detailsOpacity,
            },
          ]}
        >
          NEW GLOVES UNLOCKED
        </Animated.Text>

        <Text
          style={[
            styles.gloveName,
            {
              textShadowColor: color + '80',
            },
          ]}
        >
          {glove.name}
        </Text>

        <Animated.Text style={[styles.description, { opacity: detailsOpacity }]}>
          {glove.description}
        </Animated.Text>
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
  ring: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 3,
  },
  content: {
    alignItems: 'center',
    gap: 16,
  },
  gloveIcon: {
    width: 120,
    height: 120,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 50,
    elevation: 20,
  },
  emoji: {
    fontSize: 56,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  gloveName: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 30,
  },
  description: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    maxWidth: 260,
    textAlign: 'center',
  },
});
