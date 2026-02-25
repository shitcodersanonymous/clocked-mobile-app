import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

interface XPPopProps {
  amount: number;
  id: number;
  isChampionship?: boolean;
}

interface ComboXPPopManagerProps {
  pop: XPPopProps | null;
}

export function ComboXPPop({ pop }: ComboXPPopManagerProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!pop) return;

    opacity.setValue(1);
    translateY.setValue(0);

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -40,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(600),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [pop?.id]);

  if (!pop) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          pop.isChampionship ? styles.championship : styles.volt,
        ]}
      >
        +{pop.amount.toFixed(1)} XP
        {pop.isChampionship ? ' 2x' : ''}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignSelf: 'center',
  },
  text: {
    fontWeight: '900',
    fontSize: 14,
  },
  volt: {
    color: 'rgba(204, 255, 0, 0.8)',
  },
  championship: {
    color: '#FFD700',
  },
});
