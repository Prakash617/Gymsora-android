import React from "react";
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useGymTheme } from "../theme/GymThemeProvider";

const LOGO_DARK = require("../../assets/brand/gymsora-logo-dark.png");
const LOGO_LIGHT = require("../../assets/brand/gymsora-logo-light.png");

type LogoSize = "xs" | "sm" | "md" | "lg" | "xl";

const DIMENSIONS: Record<LogoSize, { width: number; height: number }> = {
  xs: { width: 88, height: 48 },
  sm: { width: 112, height: 60 },
  md: { width: 152, height: 82 },
  lg: { width: 196, height: 106 },
  xl: { width: 236, height: 128 },
};

export function GymSoraLogo({
  size = "md",
  forceLight = false,
  forceDark = false,
  style,
}: {
  size?: LogoSize;
  forceLight?: boolean;
  forceDark?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useGymTheme();
  const useDarkSurfaceLogo = forceDark ? true : forceLight ? false : colors.isDark;
  const dims = DIMENSIONS[size];

  return (
    <View style={[styles.wrap, style]}>
      <Image
        source={useDarkSurfaceLogo ? LOGO_DARK : LOGO_LIGHT}
        style={{ width: dims.width, height: dims.height }}
        resizeMode="contain"
        accessibilityLabel="GymSora logo"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
});
