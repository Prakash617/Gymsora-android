import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { Poppins_400Regular } from "@expo-google-fonts/poppins/400Regular";
import { Poppins_500Medium } from "@expo-google-fonts/poppins/500Medium";
import { Poppins_600SemiBold } from "@expo-google-fonts/poppins/600SemiBold";
import { Poppins_700Bold } from "@expo-google-fonts/poppins/700Bold";
import { Poppins_800ExtraBold } from "@expo-google-fonts/poppins/800ExtraBold";
import Animated, { FadeIn } from "react-native-reanimated";
import { QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GymSoraLogo } from "../src/components/GymSoraLogo";
import { queryClient } from "../src/services/queryClient";
import { cacheStorage } from "../src/services/storage";
import { AuthProvider, useAuth } from "../src/store/authStore";
import { GymThemeProvider, useGymTheme } from "../src/theme/GymThemeProvider";
import { FONT } from "../src/theme/tokens";

function RootNavigator() {
  const { hydrated, isAuthenticated } = useAuth();
  const { colors } = useGymTheme();
  const segments = useSegments();
  const router = useRouter();

  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [onboardingSeen, setOnboardingSeen] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });

  useEffect(() => {
    cacheStorage
      .getJson<boolean>(cacheStorage.keys.ONBOARDING_SEEN)
      .then((seen) => setOnboardingSeen(Boolean(seen)))
      .finally(() => setOnboardingChecked(true));
  }, []);

  const ready = hydrated && onboardingChecked && (fontsLoaded || Boolean(fontError));

  useEffect(() => {
    if (!ready) return;
    const segs = segments as string[];
    const inAuthGroup = segs[0] === "(auth)";
    const isOnboarding = inAuthGroup && segs[1] === "onboarding";

    if (!isAuthenticated && !inAuthGroup) {
      router.replace(onboardingSeen ? "/(auth)/login" : "/(auth)/onboarding");
    } else if (isAuthenticated && inAuthGroup && !isOnboarding) {
      router.replace("/(tabs)");
    }
  }, [ready, isAuthenticated, onboardingSeen, segments, router]);

  if (!ready) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#09090B",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
        }}
      >
        <Animated.View entering={FadeIn.duration(400)}>
          <GymSoraLogo size="xl" forceDark />
        </Animated.View>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={colors.isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontFamily: FONT.bold, fontSize: 17 },
          contentStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="workout-session"
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen name="scan-checkin" options={{ headerShown: false }} />
        <Stack.Screen name="exercise-library" options={{ title: "Exercise Library" }} />
        <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
        <Stack.Screen name="gym-hub" options={{ title: "My Gym" }} />
        <Stack.Screen name="nutrition" options={{ title: "Nutrition & Hydration" }} />
        <Stack.Screen
          name="modals/log-measurement"
          options={{ presentation: "modal", title: "Log Body Measurement" }}
        />
        <Stack.Screen
          name="modals/log-workout"
          options={{ presentation: "modal", title: "Log Workout" }}
        />
        <Stack.Screen
          name="modals/renewal-request"
          options={{ presentation: "modal", title: "Renew / Upgrade Plan" }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <GymThemeProvider>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </GymThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
