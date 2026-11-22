import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AlertCircle, RefreshCw, WifiOff, X } from "./Icons";
import { useGymTheme } from "../../theme/GymThemeProvider";
import {
  FONT,
  MIN_TOUCH_TARGET,
  RADIUS,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from "../../theme/tokens";

/* -------------------------------------------------------------------------- */
/* AppButton                                                                  */
/* -------------------------------------------------------------------------- */

interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "accent" | "tonal" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  haptic?: boolean;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function AppButton({
  label,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  haptic = true,
  icon,
  rightIcon,
  style,
  accessibilityLabel,
}: AppButtonProps) {
  const { colors } = useGymTheme();
  const isDisabled = disabled || loading;

  const bg =
    variant === "primary"
      ? colors.primary
      : variant === "accent"
        ? colors.secondary
        : variant === "tonal"
          ? colors.primaryContainer
          : variant === "danger"
            ? colors.error
            : variant === "ghost"
              ? "transparent"
              : colors.surface;

  const textColor =
    variant === "primary" || variant === "accent" || variant === "danger"
      ? "#FFFFFF"
      : variant === "tonal"
        ? colors.onPrimaryContainer
        : variant === "ghost"
          ? colors.primary
          : colors.text;

  const borderColor =
    variant === "outline"
      ? colors.border
      : variant === "tonal"
        ? "rgba(230, 126, 34, 0.25)"
        : "transparent";

  const minHeight = size === "sm" ? 42 : size === "lg" ? 56 : MIN_TOUCH_TARGET;
  const fontSize = size === "sm" ? 13 : size === "lg" ? 16 : 14.5;

  const handlePress = () => {
    if (haptic && Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      android_ripple={{ color: colors.ripple }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        {
          minHeight,
          backgroundColor: bg,
          borderColor,
          borderWidth: variant === "outline" || variant === "tonal" ? 1 : 0,
          opacity: isDisabled ? 0.5 : pressed ? 0.9 : 1,
          transform: [{ scale: pressed && !isDisabled ? 0.985 : 1 }],
        },
        variant === "primary" || variant === "accent" ? SHADOWS.glow : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <>
          {icon}
          <Text
            style={[styles.buttonText, { color: textColor, fontSize }]}
            numberOfLines={1}
          >
            {label}
          </Text>
          {rightIcon}
        </>
      )}
    </Pressable>
  );
}

/* -------------------------------------------------------------------------- */
/* AppCard                                                                    */
/* -------------------------------------------------------------------------- */

export function AppCard({
  children,
  variant = "default",
  padding = "md",
  style,
}: {
  children: React.ReactNode;
  variant?: "default" | "elevated" | "accent" | "subtle";
  padding?: "none" | "sm" | "md" | "lg";
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useGymTheme();

  const backgroundColor =
    variant === "elevated"
      ? colors.surfaceElevated
      : variant === "accent"
        ? colors.primaryContainer
        : variant === "subtle"
          ? colors.surfaceVariant
          : colors.surface;

  const borderColor =
    variant === "accent"
      ? "rgba(230, 126, 34, 0.32)"
      : variant === "subtle"
        ? "transparent"
        : colors.border;

  const pad =
    padding === "none" ? 0 : padding === "sm" ? 12 : padding === "lg" ? 20 : SPACING.md;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor,
          borderColor,
          borderWidth: variant === "subtle" ? 0 : StyleSheet.hairlineWidth,
          padding: pad,
        },
        variant === "elevated" ? SHADOWS.sm : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* AppInput                                                                   */
/* -------------------------------------------------------------------------- */

interface AppInputProps extends Omit<TextInputProps, "style"> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightAdornment?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  keyboardType?: KeyboardTypeOptions;
}

export function AppInput({
  label,
  error,
  helperText,
  leftIcon,
  rightAdornment,
  containerStyle,
  onFocus,
  onBlur,
  ...rest
}: AppInputProps) {
  const { colors } = useGymTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={[{ gap: 6 }, containerStyle]}>
      {label ? (
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{label}</Text>
      ) : null}
      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: colors.isDark ? "#0D0D11" : colors.background,
            borderColor: error
              ? colors.error
              : focused
                ? colors.primary
                : colors.border,
          },
        ]}
      >
        {leftIcon ? <View style={styles.inputIcon}>{leftIcon}</View> : null}
        <TextInput
          placeholderTextColor={colors.textMuted}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            styles.inputField,
            { color: colors.text },
            rest.multiline ? { minHeight: 78, textAlignVertical: "top", paddingTop: 12 } : null,
          ]}
          {...rest}
        />
        {rightAdornment ? <View style={styles.inputRight}>{rightAdornment}</View> : null}
      </View>
      {error ? (
        <Text style={[styles.inputError, { color: colors.error }]}>{error}</Text>
      ) : helperText ? (
        <Text style={[styles.inputHelper, { color: colors.textMuted }]}>{helperText}</Text>
      ) : null}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* BottomSheetModal                                                           */
/* -------------------------------------------------------------------------- */

export function BottomSheetModal({
  visible,
  onClose,
  title,
  subtitle,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const { colors } = useGymTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[styles.sheetBackdrop, { backgroundColor: colors.overlay }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              paddingBottom: Math.max(SPACING.lg, insets.bottom + 12),
            },
          ]}
        >
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[TYPOGRAPHY.h3, { color: colors.text }]}>{title}</Text>
              {subtitle ? (
                <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close dialog"
              style={[styles.sheetClose, { backgroundColor: colors.surfaceVariant }]}
            >
              <X size={18} color={colors.textSecondary} />
            </Pressable>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* Skeleton Loaders (UI-thread Reanimated opacity pulse, ReducedMotion aware) */
/* -------------------------------------------------------------------------- */

export function SkeletonBox({
  width = "100%",
  height = 16,
  radius = RADIUS.sm,
  style,
}: {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useGymTheme();
  const reduced = useReducedMotion();
  const opacity = useSharedValue(0.45);

  useEffect(() => {
    if (reduced) {
      opacity.value = 0.55;
      return;
    }
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 750 }),
        withTiming(0.35, { duration: 750 }),
      ),
      -1,
      false,
    );
  }, [opacity, reduced]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: colors.surfaceVariant,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <AppCard style={{ gap: 10 }}>
      <SkeletonBox width="45%" height={14} />
      {Array.from({ length: lines }).map((_, idx) => (
        <SkeletonBox
          key={idx}
          width={idx === lines - 1 ? "65%" : "100%"}
          height={idx === 0 ? 22 : 12}
        />
      ))}
    </AppCard>
  );
}

/* -------------------------------------------------------------------------- */
/* SectionHeader, StatusPill, ProgressBar, Notices & States                   */
/* -------------------------------------------------------------------------- */

export function SectionHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { colors } = useGymTheme();
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1 }}>
        <Text style={[TYPOGRAPHY.h3, { color: colors.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[TYPOGRAPHY.caption, { color: colors.textMuted, marginTop: 1 }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={styles.sectionAction}
        >
          <Text style={[styles.sectionActionText, { color: colors.primary }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function StatusPill({
  label,
  tone = "neutral",
  icon,
}: {
  label: string;
  tone?: "success" | "warning" | "error" | "primary" | "info" | "neutral";
  icon?: React.ReactNode;
}) {
  const { colors } = useGymTheme();
  const map = {
    success: { bg: colors.successContainer, fg: colors.success },
    warning: { bg: colors.warningContainer, fg: colors.warning },
    error: { bg: colors.errorContainer, fg: colors.error },
    primary: { bg: colors.primaryContainer, fg: colors.onPrimaryContainer },
    info: { bg: colors.infoContainer, fg: colors.info },
    neutral: { bg: colors.surfaceVariant, fg: colors.textSecondary },
  }[tone];

  return (
    <View style={[styles.pill, { backgroundColor: map.bg }]}>
      {icon}
      <Text style={[styles.pillText, { color: map.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function ProgressBar({
  progress,
  color,
  height = 7,
}: {
  progress: number; // 0..1
  color?: string;
  height?: number;
}) {
  const { colors } = useGymTheme();
  const clamped = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  return (
    <View
      style={[
        styles.progressTrack,
        { height, backgroundColor: colors.surfaceVariant, borderRadius: height / 2 },
      ]}
    >
      <View
        style={{
          height,
          width: `${Math.round(clamped * 100)}%`,
          backgroundColor: color || colors.primary,
          borderRadius: height / 2,
        }}
      />
    </View>
  );
}

export function OfflineNotice({ message }: { message?: string }) {
  const { colors } = useGymTheme();
  return (
    <View
      style={[
        styles.banner,
        { backgroundColor: colors.warningContainer, borderColor: "rgba(245,158,11,0.35)" },
      ]}
      accessibilityRole="alert"
    >
      <WifiOff size={16} color={colors.warning} />
      <Text style={[styles.bannerText, { color: colors.text }]}>
        {message || "Offline mode — cached data shown. Your rotating QR pass stays active."}
      </Text>
    </View>
  );
}

export function ErrorStateCard({
  title = "Couldn't load data",
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  const { colors } = useGymTheme();
  return (
    <AppCard style={styles.stateBox}>
      <View style={[styles.stateIconWrap, { backgroundColor: colors.errorContainer }]}>
        <AlertCircle size={26} color={colors.error} />
      </View>
      <Text style={[TYPOGRAPHY.h3, { color: colors.text, textAlign: "center" }]}>{title}</Text>
      <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary, textAlign: "center", maxWidth: 280 }]}>
        {message}
      </Text>
      {onRetry ? (
        <AppButton
          label="Try Again"
          variant="tonal"
          size="sm"
          onPress={onRetry}
          icon={<RefreshCw size={15} color={colors.onPrimaryContainer} />}
          style={{ marginTop: SPACING.xs, paddingHorizontal: SPACING.lg }}
        />
      ) : null}
    </AppCard>
  );
}

export function EmptyStateCard({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { colors } = useGymTheme();
  return (
    <AppCard style={styles.stateBox}>
      <View style={[styles.stateIconWrap, { backgroundColor: colors.surfaceVariant }]}>
        {icon}
      </View>
      <Text style={[TYPOGRAPHY.h3, { color: colors.text, textAlign: "center" }]}>{title}</Text>
      <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary, textAlign: "center", maxWidth: 290 }]}>
        {description}
      </Text>
      {actionLabel && onAction ? (
        <AppButton
          label={actionLabel}
          size="sm"
          onPress={onAction}
          style={{ marginTop: SPACING.sm, paddingHorizontal: SPACING.lg }}
        />
      ) : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  buttonText: {
    fontFamily: FONT.semibold,
    letterSpacing: -0.1,
  },
  card: {
    borderRadius: RADIUS.lg,
  },
  inputLabel: {
    fontFamily: FONT.semibold,
    fontSize: 12,
  },
  inputWrap: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  inputField: {
    flex: 1,
    fontFamily: FONT.regular,
    fontSize: 14.5,
    paddingVertical: 11,
  },
  inputRight: {
    marginLeft: 8,
  },
  inputError: {
    fontFamily: FONT.medium,
    fontSize: 12,
  },
  inputHelper: {
    fontFamily: FONT.regular,
    fontSize: 11.5,
  },
  sheetBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheetContainer: {
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: SPACING.md,
    paddingTop: 10,
    maxHeight: "88%",
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  sheetClose: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    gap: SPACING.sm,
  },
  sectionAction: {
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: SPACING.xs,
  },
  sectionActionText: {
    fontFamily: FONT.semibold,
    fontSize: 13,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    alignSelf: "flex-start",
  },
  pillText: {
    fontFamily: FONT.bold,
    fontSize: 11,
    letterSpacing: 0.3,
  },
  progressTrack: {
    width: "100%",
    overflow: "hidden",
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  bannerText: {
    fontFamily: FONT.medium,
    fontSize: 12.5,
    flex: 1,
    lineHeight: 18,
  },
  stateBox: {
    alignItems: "center",
    paddingVertical: SPACING.lg,
    gap: 8,
  },
  stateIconWrap: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
});
