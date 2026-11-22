import React from "react";
import { Stack } from "expo-router";
import { useGymTheme } from "../../src/theme/GymThemeProvider";

export default function AuthLayout() {
  const { colors } = useGymTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="verify-otp" options={{ title: "Verify Email" }} />
    </Stack>
  );
}
