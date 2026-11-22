/**
 * GymSora Premium Fitness Design System Tokens
 * - Deep charcoal & pure black surfaces for OLED-grade dark fitness aesthetic
 * - Signature GymSora Orange (#E67E22) + Fiery Secondary Accent (#FA5E12)
 * - Poppins typography scale with tabular numerals for metrics
 * - 8dp baseline spacing grid and 48dp minimum touch targets
 */
import { Platform, type TextStyle, type ViewStyle } from "react-native";

export const BRAND = {
  orange: "#E67E22",
  orangeHot: "#FA5E12",
  orangeSoft: "#F39C4F",
  charcoalDeep: "#09090B",
  charcoalSurface: "#121216",
  charcoalElevated: "#1B1B22",
  charcoalBorder: "#262630",
} as const;

export const FONT = {
  regular: "Poppins_400Regular",
  medium: "Poppins_500Medium",
  semibold: "Poppins_600SemiBold",
  bold: "Poppins_700Bold",
  extrabold: "Poppins_800ExtraBold",
} as const;

export const SPACING = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
} as const;

export const RADIUS = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 9999,
} as const;

export const MIN_TOUCH_TARGET = 48;

export const TYPOGRAPHY: Record<
  | "display"
  | "h1"
  | "h2"
  | "h3"
  | "title"
  | "body"
  | "bodyMedium"
  | "caption"
  | "label"
  | "micro",
  TextStyle
> = {
  display: {
    fontFamily: FONT.extrabold,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.6,
  },
  h1: {
    fontFamily: FONT.bold,
    fontSize: 24,
    lineHeight: 31,
    letterSpacing: -0.4,
  },
  h2: {
    fontFamily: FONT.bold,
    fontSize: 19,
    lineHeight: 26,
    letterSpacing: -0.25,
  },
  h3: {
    fontFamily: FONT.semibold,
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.15,
  },
  title: {
    fontFamily: FONT.semibold,
    fontSize: 15,
    lineHeight: 21,
  },
  body: {
    fontFamily: FONT.regular,
    fontSize: 14,
    lineHeight: 21,
  },
  bodyMedium: {
    fontFamily: FONT.medium,
    fontSize: 14,
    lineHeight: 20,
  },
  caption: {
    fontFamily: FONT.regular,
    fontSize: 12,
    lineHeight: 17,
  },
  label: {
    fontFamily: FONT.semibold,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  micro: {
    fontFamily: FONT.semibold,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.4,
  },
};

export const TABULAR_NUMS: TextStyle = {
  fontVariant: ["tabular-nums"],
};

export const SHADOWS: Record<"none" | "sm" | "md" | "glow", ViewStyle> = {
  none: {},
  sm: Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#000000",
      shadowOpacity: 0.16,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
    },
    android: { elevation: 2 },
    default: {},
  }),
  md: Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#000000",
      shadowOpacity: 0.28,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
    },
    android: { elevation: 6 },
    default: {},
  }),
  glow: Platform.select<ViewStyle>({
    ios: {
      shadowColor: BRAND.orange,
      shadowOpacity: 0.35,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
    },
    android: { elevation: 6 },
    default: {},
  }),
};

export interface ThemeColors {
  isDark: boolean;
  primary: string;
  secondary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  gymAccent: string;
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceVariant: string;
  border: string;
  borderSubtle: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  success: string;
  successContainer: string;
  warning: string;
  warningContainer: string;
  error: string;
  errorContainer: string;
  info: string;
  infoContainer: string;
  ripple: string;
  tabBarBg: string;
  overlay: string;
}

export function buildGymTheme(gymPrimaryHex: string | undefined, isDark: boolean): ThemeColors {
  const validGymHex =
    gymPrimaryHex && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(gymPrimaryHex.trim())
      ? gymPrimaryHex.trim()
      : BRAND.orange;

  if (isDark) {
    return {
      isDark: true,
      primary: BRAND.orange,
      secondary: BRAND.orangeHot,
      onPrimary: "#FFFFFF",
      primaryContainer: "rgba(230, 126, 34, 0.16)",
      onPrimaryContainer: "#F5A65B",
      gymAccent: validGymHex,
      background: BRAND.charcoalDeep,
      surface: BRAND.charcoalSurface,
      surfaceElevated: BRAND.charcoalElevated,
      surfaceVariant: "#1D1D25",
      border: BRAND.charcoalBorder,
      borderSubtle: "#1C1C23",
      text: "#FFFFFF",
      textSecondary: "#A1A1AA",
      textMuted: "#71717A",
      success: "#22C55E",
      successContainer: "rgba(34, 197, 94, 0.15)",
      warning: "#F59E0B",
      warningContainer: "rgba(245, 158, 11, 0.16)",
      error: "#EF4444",
      errorContainer: "rgba(239, 68, 68, 0.16)",
      info: "#38BDF8",
      infoContainer: "rgba(56, 189, 248, 0.15)",
      ripple: "rgba(255, 255, 255, 0.10)",
      tabBarBg: "#0E0E12",
      overlay: "rgba(0, 0, 0, 0.72)",
    };
  }

  return {
    isDark: false,
    primary: BRAND.orange,
    secondary: BRAND.orangeHot,
    onPrimary: "#FFFFFF",
    primaryContainer: "#FEF1E6",
    onPrimaryContainer: "#B45309",
    gymAccent: validGymHex,
    background: "#F5F5F7",
    surface: "#FFFFFF",
    surfaceElevated: "#FFFFFF",
    surfaceVariant: "#EEEEF2",
    border: "#E4E4EA",
    borderSubtle: "#EFEFF3",
    text: "#09090B",
    textSecondary: "#52525B",
    textMuted: "#71717A",
    success: "#059669",
    successContainer: "#DCFCE7",
    warning: "#D97706",
    warningContainer: "#FEF3C7",
    error: "#DC2626",
    errorContainer: "#FEE2E2",
    info: "#0284C7",
    infoContainer: "#E0F2FE",
    ripple: "rgba(9, 9, 11, 0.08)",
    tabBarBg: "#FFFFFF",
    overlay: "rgba(9, 9, 11, 0.55)",
  };
}
