import React, { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import colors from '@/constants/colors';
import { useTheme } from "@/contexts/ThemeContext";
import { GLOVES, TIER_SECTIONS, getGlovesForTier, checkGloveUnlocks, Glove } from '@/data/gloves';
import { useUserStore } from '@/stores/userStore';
import { useGloveStore } from '@/stores/gloveStore';

function GloveGridItem({
  glove,
  isUnlocked,
  isEquipped,
  onEquip,
}: {
  glove: Glove;
  isUnlocked: boolean;
  isEquipped: boolean;
  onEquip: () => void;
}) {
  const isPrestigeReward = glove.level === 100 || glove.id === 'bmf';
  const isBMF = glove.id === 'bmf';

  return (
    <TouchableOpacity
      style={[
        styles.gloveItem,
        isEquipped && styles.gloveItemEquipped,
        !isUnlocked && styles.gloveItemLocked,
      ]}
      onPress={isUnlocked ? onEquip : undefined}
      activeOpacity={isUnlocked ? 0.7 : 1}
      disabled={!isUnlocked}
    >
      <View
        style={[
          styles.gloveColor,
          {
            backgroundColor: isUnlocked
              ? glove.tierThemeColor
              : glove.tierThemeColor + '33',
          },
          isPrestigeReward && isUnlocked && styles.gloveColorPrestige,
          isBMF && isUnlocked && styles.gloveColorBMF,
        ]}
      >
        {!isUnlocked && (
          <Ionicons
            name="lock-closed"
            size={16}
            color={theme.mutedForeground + '66'}
          />
        )}
      </View>

      <Text
        style={[
          styles.gloveName,
          { color: isUnlocked ? theme.foreground : theme.mutedForeground + '66' },
        ]}
        numberOfLines={2}
      >
        {glove.name}
      </Text>

      {isEquipped && (
        <View style={styles.equippedTag}>
          <Text style={styles.equippedTagText}>EQUIPPED</Text>
        </View>
      )}

      {!isUnlocked && (
        <Text style={styles.unlockReq}>
          {isBMF ? 'Pro L500 + 365d' : `L${glove.level}`}
        </Text>
      )}
    </TouchableOpacity>
  );
}

export default function GlovesScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const updateUser = useUserStore((s) => s.updateUser);
  const equipGloveStore = useGloveStore((s) => s.equipGlove);
  const gloveStoreEquipped = useGloveStore((s) => s.equippedGlove);

  const prestige = user?.prestige || 'rookie';
  const level = user?.currentLevel || 1;
  const streakDays = user?.currentStreak || 0;
  const equippedGlove = gloveStoreEquipped || user?.equippedGlove || 'default';

  const unlockedGloves = useMemo(
    () => checkGloveUnlocks(prestige, level, streakDays),
    [prestige, level, streakDays]
  );

  const equipped = GLOVES[equippedGlove] || GLOVES.default;
  const totalUnlocked = unlockedGloves.length;

  const handleEquip = (gloveId: string) => {
    if (gloveId === equippedGlove) return;
    const glove = GLOVES[gloveId];
    if (!glove) return;
    updateUser({ equippedGlove: gloveId });
    equipGloveStore(gloveId);
    if (Platform.OS === 'web') {
      return;
    }
    Alert.alert('Equipped', glove.name);
  };

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: (Platform.OS === 'web' ? webTopInset : insets.top) + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gloves</Text>
        <Text style={styles.headerCount}>{totalUnlocked}/52</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.equippedSection}>
          <Text style={styles.sectionLabel}>CURRENTLY EQUIPPED</Text>
          <View style={styles.equippedRow}>
            <View style={[styles.equippedSwatch, { backgroundColor: equipped.tierThemeColor }]} />
            <View style={styles.equippedInfo}>
              <Text style={styles.equippedName}>{equipped.name}</Text>
              <Text style={styles.equippedDesc}>{equipped.description}</Text>
            </View>
          </View>
        </View>

        {TIER_SECTIONS.map((section) => {
          const gloves = getGlovesForTier(section.key);
          if (gloves.length === 0) return null;

          const isBMFSection = section.key === 'bmf';
          const cols = isBMFSection ? 2 : 5;

          return (
            <View key={section.key} style={styles.tierSection}>
              <View style={styles.tierHeader}>
                <Text style={styles.tierLabel}>{section.label}</Text>
                <Text style={styles.tierSubtitle}>{section.subtitle}</Text>
              </View>
              <View style={[styles.gloveGrid, isBMFSection && styles.gloveGridBMF]}>
                {gloves.map((glove) => (
                  <View
                    key={glove.id}
                    style={[
                      styles.gloveGridCell,
                      { width: isBMFSection ? '48%' : '18%' },
                    ]}
                  >
                    <GloveGridItem
                      glove={glove}
                      isUnlocked={unlockedGloves.includes(glove.id)}
                      isEquipped={equippedGlove === glove.id}
                      onEquip={() => handleEquip(glove.id)}
                    />
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.background,
  },
  backBtn: {
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700' as const,
    color: theme.foreground,
  },
  headerCount: {
    fontSize: 14,
    color: theme.mutedForeground,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  equippedSection: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: theme.mutedForeground,
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  equippedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  equippedSwatch: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.volt,
  },
  equippedInfo: {
    flex: 1,
  },
  equippedName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: theme.foreground,
  },
  equippedDesc: {
    fontSize: 12,
    color: theme.mutedForeground,
    marginTop: 2,
  },
  tierSection: {
    marginBottom: 24,
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 12,
  },
  tierLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: theme.foreground,
    letterSpacing: 1,
  },
  tierSubtitle: {
    fontSize: 10,
    color: theme.mutedForeground,
  },
  gloveGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  gloveGridBMF: {
    gap: 10,
  },
  gloveGridCell: {
    marginBottom: 4,
  },
  gloveItem: {
    alignItems: 'center',
    padding: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.surface3,
    backgroundColor: theme.surface1,
  },
  gloveItemEquipped: {
    borderColor: theme.volt,
    backgroundColor: theme.voltDim,
  },
  gloveItemLocked: {
    opacity: 0.6,
    backgroundColor: theme.surface1 + '55',
    borderColor: theme.surface3 + '55',
  },
  gloveColor: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  gloveColorPrestige: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  gloveColorBMF: {
    borderWidth: 2,
    borderColor: '#1A1A1A',
  },
  gloveName: {
    fontSize: 9,
    fontWeight: '600' as const,
    textAlign: 'center',
    lineHeight: 12,
  },
  equippedTag: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: theme.volt,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
  },
  equippedTagText: {
    fontSize: 7,
    fontWeight: '800' as const,
    color: theme.background,
  },
  unlockReq: {
    fontSize: 7,
    color: theme.mutedForeground + '66',
    marginTop: 2,
  },
});
