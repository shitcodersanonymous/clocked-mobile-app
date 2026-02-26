import { Tabs } from "expo-router";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import React from "react";

import colors from "@/constants/colors";

const VOLT = colors.dark.volt;
const INACTIVE = colors.dark.tabIconDefault;
const BG = colors.dark.background;
const SURFACE = colors.dark.surface1;

export default function TabLayout() {
  const webTabBarHeight = Platform.OS === "web" ? 84 : undefined;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: VOLT,
        tabBarInactiveTintColor: INACTIVE,
        headerShown: true,
        headerStyle: { backgroundColor: BG },
        headerTintColor: VOLT,
        headerTitleStyle: { color: colors.dark.foreground, fontWeight: "700" as const },
        tabBarStyle: {
          position: "absolute" as const,
          backgroundColor: Platform.select({
            ios: "transparent",
            android: SURFACE,
            web: SURFACE,
          }),
          borderTopColor: colors.dark.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          elevation: 0,
          ...(webTabBarHeight ? { height: webTabBarHeight } : {}),
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={80}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          ) : null,
        sceneStyle: { backgroundColor: BG },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          headerShown: false,
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: "My Stats",
          headerShown: false,
          tabBarLabel: "My Stats",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="fight-club"
        options={{
          title: "Fight Club",
          headerShown: false,
          tabBarLabel: "Fight Club",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          headerShown: false,
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
