import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { Mail, Play, Server, ShieldCheck } from "../../src/components/ui/Icons";
import { GymSoraLogo } from "../../src/components/GymSoraLogo";
import {
  AppButton,
  AppCard,
  AppInput,
  BottomSheetModal,
} from "../../src/components/ui/Primitives";
import {
  ApiError,
  getApiBaseUrl,
  getDefaultApiBaseUrl,
  setApiBaseUrl,
} from "../../src/services/api";
import { memberAuthApi } from "../../src/services/endpoints";
import { useAuth } from "../../src/store/authStore";
import { useGymTheme } from "../../src/theme/GymThemeProvider";
import { BRAND, FONT, RADIUS, SPACING, TYPOGRAPHY } from "../../src/theme/tokens";

WebBrowser.maybeCompleteAuthSession();

const loginSchema = z.object({
  email: z.string().trim().email("Enter the email registered at your gym."),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const { colors } = useGymTheme();
  const { applySession } = useAuth();
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [serverModalOpen, setServerModalOpen] = useState(false);
  const [serverUrl, setServerUrl] = useState(getDefaultApiBaseUrl());

  const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || "";
  const googleAndroidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || "";
  const googleConfigured = Boolean(googleWebClientId || googleAndroidClientId);

  const [googleRequest, googleResponse, promptGoogleAsync] = Google.useIdTokenAuthRequest({
    clientId: googleWebClientId || undefined,
    androidClientId: googleAndroidClientId || undefined,
  });

  useEffect(() => {
    getApiBaseUrl().then(setServerUrl);
  }, []);

  useEffect(() => {
    if (googleResponse?.type === "success") {
      const idToken = googleResponse.params?.id_token;
      if (!idToken) {
        setErrorMsg("Google did not return an ID token. Please try Email OTP.");
        return;
      }
      setGoogleBusy(true);
      setErrorMsg("");
      memberAuthApi
        .googleLogin(idToken)
        .then(async (session) => {
          await applySession(session);
          router.replace("/(tabs)");
        })
        .catch((err: any) => {
          setErrorMsg(err instanceof ApiError ? err.message : "Google sign-in failed.");
        })
        .finally(() => setGoogleBusy(false));
    }
  }, [googleResponse, applySession, router]);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: LoginForm) => {
    setSubmitting(true);
    setErrorMsg("");
    try {
      const res = await memberAuthApi.requestOtp(values.email);
      router.push({
        pathname: "/(auth)/verify-otp",
        params: {
          email: values.email.toLowerCase(),
          ...(res.dev_otp ? { devOtp: res.dev_otp } : {}),
        },
      });
    } catch (err: any) {
      setErrorMsg(err instanceof ApiError ? err.message : "Could not send verification code.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveServerUrl = async () => {
    const saved = await setApiBaseUrl(serverUrl);
    setServerUrl(saved);
    setServerModalOpen(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {/* Top Bar */}
          <View style={styles.topRow}>
            <Pressable
              onPress={() => router.push({ pathname: "/(auth)/onboarding", params: { replay: "1" } })}
              accessibilityRole="button"
              accessibilityLabel="Watch GymSora intro"
              style={[
                styles.serverBtn,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Play size={13} color={colors.primary} />
              <Text style={[styles.serverBtnText, { color: colors.textSecondary }]}>Intro</Text>
            </Pressable>
            <Pressable
              onPress={() => setServerModalOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Configure API server address"
              style={[
                styles.serverBtn,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Server size={14} color={colors.textSecondary} />
              <Text style={[styles.serverBtnText, { color: colors.textSecondary }]}>Server</Text>
            </Pressable>
          </View>

          {/* Brand Hero with Official Company Logo */}
          <View style={styles.hero}>
            <GymSoraLogo size="lg" />
            <Text style={[TYPOGRAPHY.body, { color: colors.textSecondary, textAlign: "center", maxWidth: 300 }]}>
              Your digital gym pass, workout tracker, body progress, and membership hub.
            </Text>
          </View>

          {/* Sign In Card */}
          <AppCard variant="elevated" style={styles.card}>
            <View style={{ gap: 4 }}>
              <Text style={[TYPOGRAPHY.h2, { color: colors.text }]}>Member Sign In</Text>
              <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }]}>
                Enter the email registered at your gym to receive a 6-digit login code.
              </Text>
            </View>

            {errorMsg ? (
              <View style={[styles.errorBox, { backgroundColor: colors.errorContainer }]}>
                <Text style={[styles.errorText, { color: colors.error }]}>{errorMsg}</Text>
              </View>
            ) : null}

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <AppInput
                  label="Email Address"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="emailAddress"
                  returnKeyType="done"
                  onSubmitEditing={() => void handleSubmit(onSubmit)()}
                  leftIcon={<Mail size={17} color={colors.textMuted} />}
                  error={errors.email?.message}
                />
              )}
            />

            <AppButton
              label="Continue with Email Code"
              size="lg"
              onPress={handleSubmit(onSubmit)}
              loading={submitting}
              icon={<Mail size={18} color="#FFFFFF" />}
            />

            {googleConfigured ? (
              <>
                <View style={styles.dividerRow}>
                  <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                  <Text style={[styles.dividerText, { color: colors.textMuted }]}>OR</Text>
                  <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                </View>

                <AppButton
                  label="Continue with Google"
                  variant="outline"
                  loading={googleBusy}
                  disabled={!googleRequest}
                  onPress={() => {
                    setErrorMsg("");
                    void promptGoogleAsync();
                  }}
                />
              </>
            ) : null}
          </AppCard>

          <View style={styles.footerNote}>
            <ShieldCheck size={15} color={colors.success} />
            <Text style={[TYPOGRAPHY.caption, { color: colors.textMuted }]}>
              Once signed in, your rotating check-in QR works 100% offline.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Server Config Bottom Sheet */}
      <BottomSheetModal
        visible={serverModalOpen}
        onClose={() => setServerModalOpen(false)}
        title="Backend API Server"
        subtitle="Use your LAN IP for local testing or your gym API domain"
      >
        <View style={{ gap: 14 }}>
          <AppInput
            label="API Base URL"
            value={serverUrl}
            onChangeText={setServerUrl}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="http://192.168.1.112:8000"
          />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <AppButton
              label="Reset Default"
              variant="outline"
              onPress={() => setServerUrl(getDefaultApiBaseUrl())}
              style={{ flex: 1 }}
            />
            <AppButton
              label="Save Server"
              onPress={() => void handleSaveServerUrl()}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </BottomSheetModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: SPACING.md,
    justifyContent: "space-between",
    gap: SPACING.lg,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  serverBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  serverBtnText: {
    fontFamily: FONT.semibold,
    fontSize: 12,
  },
  hero: {
    alignItems: "center",
    gap: 10,
    marginTop: 12,
  },
  brandBadge: {
    width: 68,
    height: 68,
    borderRadius: RADIUS.lg,
    backgroundColor: BRAND.orange,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  card: {
    gap: SPACING.md,
  },
  errorBox: {
    padding: 12,
    borderRadius: RADIUS.md,
  },
  errorText: {
    fontFamily: FONT.semibold,
    fontSize: 12.5,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {
    fontFamily: FONT.bold,
    fontSize: 11,
  },
  footerNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingBottom: SPACING.sm,
  },
});
