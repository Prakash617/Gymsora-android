import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { CheckCircle2, RefreshCw } from "../../src/components/ui/Icons";
import { AppButton, AppCard } from "../../src/components/ui/Primitives";
import { ApiError } from "../../src/services/api";
import { memberAuthApi } from "../../src/services/endpoints";
import { useAuth } from "../../src/store/authStore";
import { useGymTheme } from "../../src/theme/GymThemeProvider";
import {
  FONT,
  MIN_TOUCH_TARGET,
  RADIUS,
  SPACING,
  TABULAR_NUMS,
  TYPOGRAPHY,
} from "../../src/theme/tokens";

export default function VerifyOtpScreen() {
  const { colors } = useGymTheme();
  const { applySession } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; devOtp?: string }>();

  const email = String(params.email || "").trim().toLowerCase();
  const [devOtp, setDevOtp] = useState(String(params.devOtp || ""));
  const [otp, setOtp] = useState(devOtp || "");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleVerify = async () => {
    const clean = otp.trim();
    if (clean.length !== 6) {
      setErrorMsg("Enter the 6-digit verification code.");
      return;
    }
    setVerifying(true);
    setErrorMsg("");
    try {
      const session = await memberAuthApi.verifyOtp(email, clean);
      await applySession(session);
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.replace("/(tabs)");
    } catch (err: any) {
      setErrorMsg(err instanceof ApiError ? err.message : "Invalid verification code.");
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setErrorMsg("");
    try {
      const res = await memberAuthApi.requestOtp(email);
      if (res.dev_otp) {
        setDevOtp(res.dev_otp);
        setOtp(res.dev_otp);
      }
      setCooldown(60);
    } catch (err: any) {
      setErrorMsg(err instanceof ApiError ? err.message : "Could not resend code.");
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <AppCard variant="elevated" style={styles.card}>
            <View style={{ gap: 4 }}>
              <Text style={[TYPOGRAPHY.h2, { color: colors.text }]}>Verify Login Code</Text>
              <Text style={[TYPOGRAPHY.body, { color: colors.textSecondary }]}>
                Enter the 6-digit code sent to{" "}
                <Text style={{ fontFamily: FONT.bold, color: colors.text }}>{email}</Text>.
              </Text>
            </View>

            {devOtp ? (
              <View style={[styles.devPill, { backgroundColor: colors.primaryContainer }]}>
                <Text style={[styles.devText, { color: colors.onPrimaryContainer }, TABULAR_NUMS]}>
                  Local dev mode — OTP: {devOtp}
                </Text>
              </View>
            ) : null}

            {errorMsg ? (
              <View style={[styles.errorBox, { backgroundColor: colors.errorContainer }]}>
                <Text style={[styles.errorText, { color: colors.error }]}>{errorMsg}</Text>
              </View>
            ) : null}

            <TextInput
              value={otp}
              onChangeText={(v) => setOtp(v.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleVerify}
              style={[
                styles.otpInput,
                TABULAR_NUMS,
                {
                  backgroundColor: colors.isDark ? "#0D0D11" : colors.background,
                  borderColor: otp.length === 6 ? colors.primary : colors.border,
                  color: colors.text,
                },
              ]}
            />

            <AppButton
              label="Verify & Continue"
              size="lg"
              onPress={handleVerify}
              loading={verifying}
              disabled={otp.trim().length !== 6}
              icon={<CheckCircle2 size={18} color="#FFFFFF" />}
            />

            <AppButton
              label={cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend Code"}
              variant="outline"
              loading={resending}
              disabled={cooldown > 0}
              onPress={handleResend}
              icon={<RefreshCw size={15} color={colors.text} />}
            />
          </AppCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: SPACING.md,
    justifyContent: "center",
  },
  card: {
    gap: SPACING.md,
  },
  devPill: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  devText: {
    fontFamily: FONT.bold,
    fontSize: 13,
    textAlign: "center",
  },
  errorBox: {
    padding: 12,
    borderRadius: RADIUS.md,
  },
  errorText: {
    fontFamily: FONT.semibold,
    fontSize: 12.5,
  },
  otpInput: {
    minHeight: MIN_TOUCH_TARGET + 10,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    fontFamily: FONT.extrabold,
    fontSize: 28,
    letterSpacing: 12,
    textAlign: "center",
  },
});
