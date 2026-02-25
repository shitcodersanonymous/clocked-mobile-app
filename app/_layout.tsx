import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { StatusBar, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import colors from "@/constants/colors";

SplashScreen.preventAutoHideAsync();

const headerStyles = {
  headerStyle: { backgroundColor: colors.dark.background },
  headerTintColor: colors.dark.volt,
  headerTitleStyle: { color: colors.dark.foreground },
  contentStyle: { backgroundColor: colors.dark.background },
};

function RootLayoutNav() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Back",
        ...headerStyles,
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="onboarding"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="workout/[id]"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="quick-session"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="settings"
        options={{ title: "Settings" }}
      />
      <Stack.Screen
        name="gloves"
        options={{ title: "Gloves" }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.dark.background }}>
          <KeyboardProvider>
            <StatusBar barStyle="light-content" backgroundColor={colors.dark.background} />
            <RootLayoutNav />
          </KeyboardProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
