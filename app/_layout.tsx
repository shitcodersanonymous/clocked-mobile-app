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
import colors from "@/constants/colors";

SplashScreen.preventAutoHideAsync();

// headerStyles moved to RootLayoutNav to use theme

function RootLayoutNav() {
  const { theme, isDark } = useTheme();
  
  const themedHeaderStyles = {
    headerStyle: {
      backgroundColor: theme.background,
    },
    headerTintColor: theme.text,
    headerTitleStyle: {
      fontWeight: "bold" as const,
    },
  };

  return (
    <>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />
      <Stack
        screenOptions={{
          headerBackTitle: "Back",
          ...themedHeaderStyles,
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
        <Stack.Screen name="gloves" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
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
      <GestureHandlerRootView style={{ flex: 1 }}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
              <RootLayoutNav />
              <ToastContainer />
            </KeyboardProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
