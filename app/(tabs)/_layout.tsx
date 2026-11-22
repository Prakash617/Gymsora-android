import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Activity,
  Dumbbell,
  Home,
  User,
  WalletCards,
} from "../../src/components/ui/Icons";
import { useGymTheme } from "../../src/theme/GymThemeProvider";
import { FONT, RADIUS } from "../../src/theme/tokens";

function TabIcon({
  focused,
  children,
}: {
  focused: boolean;
  children: React.ReactNode;
}) {
  const { colors } = useGymTheme();
  return (
    <View
      style={[
        styles.iconPill,
        focused && { backgroundColor: colors.primaryContainer },
      ]}
    >
      {children}
    </View>
  );
}

export default function TabsLayout() {
  const { colors } = useGymTheme();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "ios" ? Math.max(10, insets.bottom) : Math.max(10, insets.bottom + 6);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: "none",
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.tabBarBg,
          borderTopColor: colors.borderSubtle,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 60 + bottomPad,
          paddingBottom: bottomPad,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontFamily: FONT.semibold,
          fontSize: 10.5,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused}>
              <Home size={20} color={color} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: "Workout",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused}>
              <Dumbbell size={20} color={color} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: "Progress",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused}>
              <Activity size={20} color={color} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="membership"
        options={{
          title: "Membership",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused}>
              <WalletCards size={20} color={color} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused}>
              <User size={20} color={color} />
            </TabIcon>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconPill: {
    width: 44,
    height: 28,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
  },
});
