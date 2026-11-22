import React, { useRef, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";
import {
  Camera,
  CheckCircle2,
  Flame,
  QrCode,
  RefreshCw,
  ShieldCheck,
  X,
  XCircle,
} from "../src/components/ui/Icons";
import { AppButton, AppCard, AppInput, StatusPill } from "../src/components/ui/Primitives";
import { ApiError } from "../src/services/api";
import { memberApi } from "../src/services/endpoints";
import { queryKeys } from "../src/services/queryClient";
import { useAuth } from "../src/store/authStore";
import { useGymTheme } from "../src/theme/GymThemeProvider";
import {
  BRAND,
  FONT,
  RADIUS,
  SPACING,
  TABULAR_NUMS,
  TYPOGRAPHY,
} from "../src/theme/tokens";

interface ScanOutcome {
  ok: boolean;
  title: string;
  message: string;
  streakDays?: number;
}

export default function ScanCheckInScreen() {
  const { colors } = useGymTheme();
  const { activeGym } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [manualCode, setManualCode] = useState("");
  const lastScanRef = useRef<number>(0);

  const submitPayload = async (rawPayload: string) => {
    const clean = rawPayload.trim();
    if (!clean || busy) return;
    setBusy(true);
    try {
      const res = await memberApi.scanDeskQr(clean);
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(
          res.is_allowed
            ? Haptics.NotificationFeedbackType.Success
            : Haptics.NotificationFeedbackType.Error,
        );
      }
      setOutcome({
        ok: Boolean(res.is_allowed),
        title: res.is_allowed ? "Check-In Verified!" : "Access Denied",
        message: res.message || (res.is_allowed ? "Welcome to your workout." : "Membership inactive."),
        streakDays: res.streak?.current_streak_days,
      });
      void qc.invalidateQueries({ queryKey: queryKeys.home(activeGym?.slug) });
      void qc.invalidateQueries({ queryKey: queryKeys.attendance(activeGym?.slug) });
    } catch (err: any) {
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      setOutcome({
        ok: false,
        title: "QR Verification Failed",
        message:
          err instanceof ApiError
            ? err.message
            : "Could not verify reception QR code. Make sure you're online.",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    const now = Date.now();
    if (busy || outcome || now - lastScanRef.current < 2500) return;
    const payload = result.data?.trim();
    if (!payload) return;
    lastScanRef.current = now;
    void submitPayload(payload);
  };

  const resetScanner = () => {
    setOutcome(null);
    lastScanRef.current = 0;
  };

  return (
    <View style={styles.root}>
      {/* Camera Layer on Native when permitted */}
      {Platform.OS !== "web" && permission?.granted && !outcome ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={handleBarcodeScanned}
        />
      ) : null}

      {/* Top Overlay Header */}
      <SafeAreaView style={styles.topWrap} edges={["top"]}>
        <View style={styles.topRow}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Close scanner"
            style={styles.closeBtn}
          >
            <X size={20} color="#FFFFFF" />
          </Pressable>
          <View style={styles.titleBadge}>
            <QrCode size={14} color={BRAND.orange} />
            <Text style={styles.titleText}>Scan Gym Desk QR</Text>
          </View>
          <View style={{ width: 42 }} />
        </View>
      </SafeAreaView>

      {/* Center Content */}
      <View style={styles.center}>
        {outcome ? (
          <AppCard variant="elevated" style={styles.resultCard}>
            <View
              style={[
                styles.resultIcon,
                {
                  backgroundColor: outcome.ok
                    ? colors.successContainer
                    : colors.errorContainer,
                },
              ]}
            >
              {outcome.ok ? (
                <CheckCircle2 size={38} color={colors.success} />
              ) : (
                <XCircle size={38} color={colors.error} />
              )}
            </View>
            <Text style={[TYPOGRAPHY.h2, { color: colors.text, textAlign: "center" }]}>
              {outcome.title}
            </Text>
            <Text style={[TYPOGRAPHY.body, { color: colors.textSecondary, textAlign: "center" }]}>
              {outcome.message}
            </Text>
            {outcome.ok && outcome.streakDays !== undefined ? (
              <StatusPill
                label={`${outcome.streakDays}-Day Streak`}
                tone="primary"
                icon={<Flame size={13} color={BRAND.orange} />}
              />
            ) : null}
            <View style={styles.resultBtns}>
              <AppButton
                label="Scan Again"
                variant="outline"
                onPress={resetScanner}
                icon={<RefreshCw size={15} color={colors.text} />}
                style={{ flex: 1 }}
              />
              <AppButton
                label="Done"
                onPress={() => router.back()}
                style={{ flex: 1 }}
              />
            </View>
          </AppCard>
        ) : Platform.OS === "web" ? (
          <AppCard variant="elevated" style={styles.permCard}>
            <Camera size={32} color={BRAND.orange} />
            <Text style={[TYPOGRAPHY.h3, { color: colors.text, textAlign: "center" }]}>
              Paste Reception Desk QR Code
            </Text>
            <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary, textAlign: "center" }]}>
              Open this screen on your Android device to use the live camera scanner, or enter a desk QR payload below to test check-in.
            </Text>
            <AppInput
              value={manualCode}
              onChangeText={setManualCode}
              placeholder="GSD1:your-gym:..."
              containerStyle={{ width: "100%" }}
            />
            <AppButton
              label="Verify & Check In"
              loading={busy}
              onPress={() => void submitPayload(manualCode)}
              style={{ width: "100%" }}
            />
          </AppCard>
        ) : !permission?.granted ? (
          <AppCard variant="elevated" style={styles.permCard}>
            <View style={[styles.resultIcon, { backgroundColor: colors.primaryContainer }]}>
              <Camera size={32} color={BRAND.orange} />
            </View>
            <Text style={[TYPOGRAPHY.h3, { color: colors.text, textAlign: "center" }]}>
              Camera Access Needed
            </Text>
            <Text style={[TYPOGRAPHY.body, { color: colors.textSecondary, textAlign: "center" }]}>
              Allow camera access so GymSora can scan the reception desk QR code at{" "}
              {activeGym?.name || "your gym"}.
            </Text>
            <AppButton
              label="Allow Camera Access"
              onPress={() => void requestPermission()}
              style={{ width: "100%" }}
            />
          </AppCard>
        ) : (
          <View style={styles.viewfinderWrap}>
            <View style={styles.viewfinder}>
              <View style={[styles.corner, styles.cTL]} />
              <View style={[styles.corner, styles.cTR]} />
              <View style={[styles.corner, styles.cBL]} />
              <View style={[styles.corner, styles.cBR]} />
            </View>
            <Text style={styles.hintText}>
              {busy
                ? "Verifying with gym server…"
                : "Point your camera at the Reception Desk Check-In QR"}
            </Text>
          </View>
        )}
      </View>

      {/* Bottom Security Note */}
      <SafeAreaView style={styles.bottomWrap} edges={["bottom"]}>
        <View style={styles.securityPill}>
          <ShieldCheck size={14} color="#22C55E" />
          <Text style={[styles.securityText, TABULAR_NUMS]}>
            Server-verified check-in · {activeGym?.name || "GymSora"}
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#09090B",
  },
  topWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingTop: 8,
  },
  closeBtn: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.pill,
    backgroundColor: "rgba(9, 9, 11, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  titleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: "rgba(9, 9, 11, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  titleText: {
    fontFamily: FONT.bold,
    fontSize: 13,
    color: "#FFFFFF",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.lg,
  },
  viewfinderWrap: {
    alignItems: "center",
    gap: 20,
  },
  viewfinder: {
    width: 252,
    height: 252,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 34,
    height: 34,
    borderColor: BRAND.orange,
  },
  cTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 14 },
  cTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 14 },
  cBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 14 },
  cBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 14 },
  hintText: {
    fontFamily: FONT.semibold,
    fontSize: 13.5,
    color: "#FFFFFF",
    textAlign: "center",
    backgroundColor: "rgba(9, 9, 11, 0.68)",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: RADIUS.pill,
  },
  permCard: {
    width: "100%",
    alignItems: "center",
    gap: 12,
    padding: 22,
  },
  resultCard: {
    width: "100%",
    alignItems: "center",
    gap: 12,
    padding: 24,
  },
  resultIcon: {
    width: 68,
    height: 68,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  resultBtns: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    marginTop: 6,
  },
  bottomWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingBottom: 16,
  },
  securityPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: "rgba(9, 9, 11, 0.76)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  securityText: {
    fontFamily: FONT.medium,
    fontSize: 12,
    color: "#E4E4E7",
  },
});
