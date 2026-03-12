import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { StatusBar, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { ToastContainer } from "@/hooks/useToast";
import { usePresetSeeding } from "@/hooks/usePresetSeeding";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { useThemedColors } from "@/hooks/useThemedColors";

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { effectiveTheme } = useTheme();
  const colors = useThemedColors();

  const headerStyles = {
    headerStyle: { backgroundColor: colors.background },
    headerTintColor: colors.primary,
    headerTitleStyle: { color: colors.text },
    contentStyle: { backgroundColor: colors.background },
  };

  return (
    <>
      <StatusBar 
        barStyle={effectiveTheme === 'dark' ? 'light-content' : 'dark-content'} 
        backgroundColor={colors.background} 
      />
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
          name="build"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="history"
          options={{ headerShown: false }}
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
        <Stack.Screen
          name="edit-profile"
          options={{ headerShown: false }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  usePresetSeeding();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <RootLayoutContent />
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

function RootLayoutContent() {
  const colors = useThemedColors();

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardProvider>
        <RootLayoutNav />
        <ToastContainer />
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
