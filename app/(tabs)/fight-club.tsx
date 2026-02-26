import React, { useState, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import colors, { PRESTIGE_COLORS } from "@/constants/colors";
import { useHistoryStore } from "@/stores/historyStore";
import { useUserStore } from "@/stores/userStore";
import { useWorkoutStore } from "@/stores/workoutStore";
import { formatRelativeDate } from "@/lib/utils";
import { useTierPresets, TierPresetWorkout } from "@/hooks/useTierPresets";
import { Prestige } from "@/lib/xpSystem";

const C = colors.dark;

type SubTab = "feed" | "clubs" | "presets";
type FeedFilter = "all" | "following";


export default function FightClubScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SubTab>("feed");
  const [feedFilter, setFeedFilter] = useState<FeedFilter>("all");
  const [presetFilter, setPresetFilter] = useState("All");
  const [searchText, setSearchText] = useState("");

  const completedWorkouts = useHistoryStore((s) => s.completedWorkouts);
  const user = useUserStore((s) => s.user);
  const addWorkout = useWorkoutStore((s) => s.addWorkout);

  const { presets: tierPresets, userTier } = useTierPresets();

  const filteredPresets = useMemo(() => {
    let filtered = tierPresets;
    if (presetFilter !== "All") {
      const lower = presetFilter.toLowerCase();
      filtered = filtered.filter((w) =>
        w.sourceTier === lower || w.tierLabel.toLowerCase() === lower
      );
    }
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      filtered = filtered.filter(
        (w) =>
          w.name.toLowerCase().includes(q) ||
          w.tierLabel.toLowerCase().includes(q) ||
          w.tierDescription.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [tierPresets, presetFilter, searchText]);

  const feedPosts = useMemo(() => {
    return completedWorkouts.slice(0, 20).map((w) => ({
      id: w.id,
      userName: user?.name || "You",
      message: `Completed "${w.workoutName}" — ${Math.round(w.duration / 60)}m, +${w.xpEarned.toLocaleString()} XP`,
      timeAgo: formatRelativeDate(w.completedAt),
      xp: w.xpEarned,
      likes: Math.floor(Math.random() * 5),
    }));
  }, [completedWorkouts, user]);

  const handleSavePreset = (preset: TierPresetWorkout) => {
    Alert.alert(
      "Save Loadout",
      `Add the "${preset.tierLabel} Loadout" to your workout library?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Save",
          onPress: () => {
            addWorkout({
              ...preset,
              id: `saved-${Date.now()}`,
              tags: [...(preset.tags || []), "downloaded"],
            });
            Alert.alert("Saved!", `${preset.name} added to your sets.`);
          },
        },
      ]
    );
  };

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <Text style={styles.headerTitle}>Fight Club</Text>

      <View style={styles.tabBar}>
        {(["feed", "clubs", "presets"] as SubTab[]).map((tab) => {
          const isActive = activeTab === tab;
          const icons: Record<SubTab, string> = {
            feed: "newspaper-outline",
            clubs: "people-outline",
            presets: "options-outline",
          };
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tabItem, isActive && styles.tabItemActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={icons[tab] as any}
                size={20}
                color={isActive ? C.volt : C.mutedForeground}
              />
              <Text
                style={[
                  styles.tabLabel,
                  isActive && styles.tabLabelActive,
                ]}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {activeTab === "feed" && (
        <FeedTab
          feedFilter={feedFilter}
          setFeedFilter={setFeedFilter}
          posts={feedPosts}
        />
      )}
      {activeTab === "clubs" && <ClubsTab />}
      {activeTab === "presets" && (
        <PresetsTab
          presets={filteredPresets}
          userTier={userTier}
          filter={presetFilter}
          setFilter={setPresetFilter}
          searchText={searchText}
          setSearchText={setSearchText}
          onSave={handleSavePreset}
        />
      )}
    </View>
  );
}

function FeedTab({
  feedFilter,
  setFeedFilter,
  posts,
}: {
  feedFilter: FeedFilter;
  setFeedFilter: (f: FeedFilter) => void;
  posts: any[];
}) {
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.filterRow}>
        {(["all", "following"] as FeedFilter[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterPill, feedFilter === f && styles.filterPillActive]}
            onPress={() => setFeedFilter(f)}
          >
            <Text
              style={[
                styles.filterPillText,
                feedFilter === f && styles.filterPillTextActive,
              ]}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={styles.searchUserBtn}>
          <Ionicons name="person-add-outline" size={20} color={C.mutedForeground} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {posts.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="activity" size={32} color={C.mutedForeground} />
            <Text style={styles.emptyText}>No activity yet</Text>
            <Text style={styles.emptySubtext}>
              Complete a workout to see your feed!
            </Text>
          </View>
        ) : (
          posts.map((post) => (
            <View key={post.id} style={styles.postCard}>
              <View style={styles.postHeader}>
                <View style={styles.avatar}>
                  <Ionicons name="person" size={18} color={C.mutedForeground} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.postNameRow}>
                    <Text style={styles.postUserName}>{post.userName}</Text>
                    <Text style={styles.postTimeAgo}>{post.timeAgo}</Text>
                  </View>
                  <Text style={styles.postMessage}>{post.message}</Text>
                </View>
              </View>
              <View style={styles.postFooter}>
                <TouchableOpacity style={styles.postAction}>
                  <Ionicons name="heart-outline" size={18} color={C.mutedForeground} />
                  <Text style={styles.postActionCount}>{post.likes}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function ClubsTab() {
  const [isMember, setIsMember] = useState(true);

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 16, paddingTop: 16 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.clubSectionTitle}>MY FIGHT CLUBS</Text>

      <View style={styles.clubCard}>
        <View style={styles.clubIcon}>
          <Ionicons name="people" size={22} color={C.volt} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.clubName}>Early Adopters</Text>
          <Text style={styles.clubMeta}>1 / 100 members</Text>
          {isMember && (
            <Text style={styles.clubMemberBadge}>Member ✓</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.clubLeaveBtn}
          onPress={() => {
            Alert.alert("Leave Club", "Are you sure you want to leave Early Adopters?", [
              { text: "Cancel", style: "cancel" },
              { text: "Leave", style: "destructive", onPress: () => setIsMember(false) },
            ]);
          }}
        >
          <Ionicons name="log-out-outline" size={16} color={C.mutedForeground} />
          <Text style={styles.clubLeaveBtnText}>Leave</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.clubSectionTitle, { marginTop: 24 }]}>DISCOVER</Text>
      <View style={styles.discoverEmpty}>
        <Text style={styles.discoverEmptyText}>You're in all available clubs! 🎉</Text>
      </View>
    </ScrollView>
  );
}

const TIER_FILTER_PILLS = ["All", "Rookie", "Beginner", "Intermediate", "Advanced", "Pro"];

function PresetsTab({
  presets,
  userTier,
  filter,
  setFilter,
  searchText,
  setSearchText,
  onSave,
}: {
  presets: TierPresetWorkout[];
  userTier: Prestige;
  filter: string;
  setFilter: (f: string) => void;
  searchText: string;
  setSearchText: (t: string) => void;
  onSave: (p: TierPresetWorkout) => void;
}) {
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.searchRow}>
        <View style={styles.searchInputWrap}>
          <Ionicons name="search" size={16} color={C.mutedForeground} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tier loadouts..."
            placeholderTextColor={C.mutedForeground}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText("")}>
              <Ionicons name="close-circle" size={16} color={C.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterPillsRow}
      >
        {TIER_FILTER_PILLS.map((pill) => (
          <TouchableOpacity
            key={pill}
            style={[styles.filterPill, filter === pill && styles.filterPillActive]}
            onPress={() => setFilter(pill)}
          >
            <Text
              style={[
                styles.filterPillText,
                filter === pill && styles.filterPillTextActive,
              ]}
            >
              {pill}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={presets}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!presets.length}
        ListHeaderComponent={
          <Text style={styles.trendingHeader}>TIER LOADOUTS</Text>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No loadouts for this tier</Text>
          </View>
        }
        renderItem={({ item }) => {
          const accentColor = PRESTIGE_COLORS[item.sourceTier] || C.volt;
          const durationMin = Math.round(item.totalDuration / 60);
          return (
            <TouchableOpacity
              style={[styles.presetCard, { borderColor: accentColor + '40' }]}
              activeOpacity={0.7}
              onPress={() => onSave(item)}
            >
              <View style={[styles.presetIconWrap, { backgroundColor: accentColor + '20' }]}>
                <MaterialCommunityIcons
                  name="boxing-glove"
                  size={24}
                  color={accentColor}
                />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={styles.presetNameRow}>
                  <Text style={[styles.presetTierBadge, { color: accentColor }]}>
                    {item.tierLabel.toUpperCase()}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={C.mutedForeground} />
                </View>
                <Text style={styles.presetName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.presetDescription} numberOfLines={2}>
                  {item.tierDescription}
                </Text>
                <View style={styles.presetMetaRow}>
                  <Text style={styles.presetMetaText}>{durationMin} min</Text>
                  {(item.tags || []).slice(0, 2).map((tag) => (
                    <View key={tag} style={[styles.presetTag, { borderColor: accentColor + '40' }]}>
                      <Text style={[styles.presetTagText, { color: accentColor }]}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: C.foreground,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface1,
    alignItems: "center",
    gap: 4,
  },
  tabItemActive: {
    borderColor: C.volt,
    backgroundColor: C.voltDim,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: C.mutedForeground,
    textTransform: "capitalize",
  },
  tabLabelActive: {
    color: C.volt,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: C.surface1,
    borderWidth: 1,
    borderColor: C.border,
  },
  filterPillActive: {
    backgroundColor: C.volt,
    borderColor: C.volt,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: C.mutedForeground,
  },
  filterPillTextActive: {
    color: C.background,
  },
  searchUserBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.surface1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 8,
  },
  emptyText: {
    color: C.mutedForeground,
    fontSize: 15,
    fontWeight: "600",
  },
  emptySubtext: {
    color: C.mutedForeground,
    fontSize: 13,
    opacity: 0.7,
  },
  postCard: {
    backgroundColor: C.surface1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    marginBottom: 10,
  },
  postHeader: {
    flexDirection: "row",
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  postNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  postUserName: {
    fontSize: 14,
    fontWeight: "700",
    color: C.foreground,
  },
  postTimeAgo: {
    fontSize: 12,
    color: C.mutedForeground,
  },
  postMessage: {
    fontSize: 13,
    color: C.mutedForeground,
    marginTop: 4,
    lineHeight: 18,
  },
  postFooter: {
    flexDirection: "row",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
  },
  postAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  postActionCount: {
    fontSize: 12,
    color: C.mutedForeground,
  },
  clubSectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: C.mutedForeground,
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  clubCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    gap: 12,
  },
  clubIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  clubName: {
    fontSize: 15,
    fontWeight: "700",
    color: C.foreground,
  },
  clubMeta: {
    fontSize: 12,
    color: C.mutedForeground,
    marginTop: 2,
  },
  clubMemberBadge: {
    fontSize: 11,
    color: C.volt,
    fontWeight: "600",
    marginTop: 2,
  },
  clubLeaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface2,
  },
  clubLeaveBtnText: {
    fontSize: 12,
    color: C.mutedForeground,
    fontWeight: "600",
  },
  discoverEmpty: {
    alignItems: "center",
    paddingVertical: 32,
  },
  discoverEmptyText: {
    fontSize: 14,
    color: C.mutedForeground,
  },
  searchRow: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  searchInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 10,
    gap: 8,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: C.foreground,
  },
  filterPillsRow: {
    paddingHorizontal: 16,
    gap: 6,
    marginBottom: 12,
  },
  trendingHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: C.mutedForeground,
    letterSpacing: 1.5,
    marginBottom: 10,
    marginTop: 4,
  },
  presetCard: {
    flexDirection: "row",
    backgroundColor: C.surface1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    alignItems: "center",
  },
  presetIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  presetNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  presetTierBadge: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  presetName: {
    fontSize: 14,
    fontWeight: "700",
    color: C.foreground,
    flex: 1,
    marginRight: 8,
    marginBottom: 2,
  },
  presetDescription: {
    fontSize: 11,
    color: C.mutedForeground,
    lineHeight: 15,
    marginBottom: 6,
  },
  presetMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  presetMetaText: {
    fontSize: 11,
    color: C.mutedForeground,
  },
  presetDiffBadge: {
    fontSize: 11,
    fontWeight: "700",
  },
  presetTagsRow: {
    flexDirection: "row",
    gap: 4,
    marginTop: 6,
    flexWrap: "wrap",
  },
  presetTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: C.surface2,
  },
  presetTagText: {
    fontSize: 10,
    color: C.mutedForeground,
    fontWeight: "600",
  },
});
