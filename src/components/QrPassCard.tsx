import React, { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { CalendarClock, ShieldCheck, WifiOff } from "./ui/Icons";
import { buildRotatingQrPass, type RotatingQrPass } from "../services/qr";
import { useGymTheme } from "../theme/GymThemeProvider";
import { BRAND, FONT, RADIUS, SHADOWS, SPACING, TABULAR_NUMS } from "../theme/tokens";
import type { GymSummary, MemberProfile, SubscriptionAccess } from "../types/api";
import { StatusPill } from "./ui/Primitives";

interface QrPassCardProps {
  gym: GymSummary;
  member: MemberProfile;
  qrSecret: string | null;
  clockOffset: number;
  subscription: SubscriptionAccess | null;
  compact?: boolean;
}

export function QrPassCard({
  gym,
  member,
  qrSecret,
  clockOffset,
  subscription,
  compact = false,
}: QrPassCardProps) {
  const { colors } = useGymTheme();
  const [pass, setPass] = useState<RotatingQrPass | null>(() =>
    qrSecret
      ? buildRotatingQrPass({
          tenantSlug: gym.slug,
          memberId: member.id,
          qrSecret,
          clockOffsetSeconds: clockOffset,
        })
      : null,
  );

  useEffect(() => {
    if (!qrSecret) {
      setPass(null);
      return;
    }
    const tick = () => {
      setPass(
        buildRotatingQrPass({
          tenantSlug: gym.slug,
          memberId: member.id,
          qrSecret,
          clockOffsetSeconds: clockOffset,
        }),
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [gym.slug, member.id, qrSecret, clockOffset]);

  const statusTone = !subscription
    ? "neutral"
    : !subscription.is_allowed
      ? "error"
      : subscription.result === "expiring_soon" || subscription.result === "due"
        ? "warning"
        : "success";

  const statusLabel = !subscription
    ? String(member.status || "MEMBER").toUpperCase()
    : !subscription.is_allowed
      ? "EXPIRED"
      : subscription.days_left !== null
        ? `${subscription.days_left}D LEFT`
        : "ACTIVE";

  const qrSize = compact ? 190 : 228;
  const formattedMemberId = `GS-${String(member.id).padStart(5, "0")}`;

  return (
    <View
      style={[
        styles.walletCard,
        {
          backgroundColor: colors.isDark ? "#131318" : "#141418",
          borderColor: colors.isDark ? "#2A2A35" : "#262630",
        },
        SHADOWS.md,
      ]}
    >
      {/* Top Signature Orange Accent Bar */}
      <View style={styles.accentBar}>
        <View style={[styles.accentPrimary, { backgroundColor: BRAND.orange }]} />
        <View style={[styles.accentSecondary, { backgroundColor: BRAND.orangeHot }]} />
      </View>

      {/* Wallet Card Header */}
      <View style={styles.header}>
        <View style={styles.gymRow}>
          {gym.logo ? (
            <Image source={{ uri: gym.logo }} style={styles.logo} />
          ) : (
            <View style={styles.logoFallback}>
              <Text style={styles.logoLetter}>
                {(gym.name || "G")[0].toUpperCase()}
              </Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.gymName} numberOfLines={1}>
              {gym.name}
            </Text>
            <Text style={styles.passTag}>GYMSORA DIGITAL PASS</Text>
          </View>
          <StatusPill label={statusLabel} tone={statusTone} />
        </View>
      </View>

      {/* Member Metadata Strip */}
      <View style={styles.memberStrip}>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>MEMBER</Text>
          <Text style={styles.memberName} numberOfLines={1}>
            {member.name}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.fieldLabel}>MEMBER ID</Text>
          <Text style={[styles.memberId, TABULAR_NUMS]}>{formattedMemberId}</Text>
        </View>
      </View>

      {/* High-Contrast White Quiet Zone for Instant Optical Scanning */}
      <View style={styles.qrSection}>
        <View style={styles.qrFrame}>
          {pass ? (
            <QRCode
              value={pass.payload}
              size={qrSize}
              color="#000000"
              backgroundColor="#FFFFFF"
              ecl="L"
            />
          ) : (
            <View style={[styles.qrMissing, { width: qrSize, height: qrSize }]}>
              <Text style={styles.qrMissingText}>
                Connect online once to activate your offline QR check-in pass.
              </Text>
            </View>
          )}
        </View>

        {/* Live 30s Rotation Progress */}
        {pass ? (
          <View style={styles.timerBox}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: pass.secondsRemaining <= 5 ? "#F59E0B" : BRAND.orange,
                    width: `${Math.max(4, Math.round(pass.progress * 100))}%`,
                  },
                ]}
              />
            </View>
            <View style={styles.timerFooter}>
              <View style={styles.inlineIcon}>
                <ShieldCheck size={14} color="#22C55E" />
                <Text style={[styles.timerText, TABULAR_NUMS]}>
                  Rotates in {pass.secondsRemaining}s
                </Text>
              </View>
              <View style={styles.inlineIcon}>
                <WifiOff size={13} color="#A1A1AA" />
                <Text style={styles.timerHint}>Offline Ready</Text>
              </View>
            </View>
          </View>
        ) : null}
      </View>

      {/* Bottom Plan Validity Footer */}
      <View style={styles.walletFooter}>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>PLAN</Text>
          <Text style={styles.footerVal} numberOfLines={1}>
            {subscription?.plan_name || "Gym Member"}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.fieldLabel}>VALID UNTIL</Text>
          <View style={styles.inlineIcon}>
            <CalendarClock size={12} color={BRAND.orange} />
            <Text style={[styles.footerVal, TABULAR_NUMS]}>
              {subscription?.end_date || "—"}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  walletCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    overflow: "hidden",
  },
  accentBar: {
    flexDirection: "row",
    height: 4,
    width: "100%",
  },
  accentPrimary: {
    flex: 2,
  },
  accentSecondary: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
  },
  gymRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    backgroundColor: "#FFFFFF",
  },
  logoFallback: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    backgroundColor: "rgba(230, 126, 34, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(230, 126, 34, 0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoLetter: {
    fontFamily: FONT.extrabold,
    fontSize: 18,
    color: BRAND.orange,
  },
  gymName: {
    fontFamily: FONT.bold,
    fontSize: 16,
    color: "#FFFFFF",
  },
  passTag: {
    fontFamily: FONT.semibold,
    fontSize: 10,
    letterSpacing: 1.1,
    color: "#A1A1AA",
    marginTop: 1,
  },
  memberStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingBottom: 14,
    gap: 12,
  },
  fieldLabel: {
    fontFamily: FONT.semibold,
    fontSize: 10,
    letterSpacing: 0.9,
    color: "#71717A",
  },
  memberName: {
    fontFamily: FONT.bold,
    fontSize: 17,
    color: "#FFFFFF",
    marginTop: 2,
  },
  memberId: {
    fontFamily: FONT.bold,
    fontSize: 13.5,
    color: BRAND.orange,
    marginTop: 2,
  },
  qrSection: {
    alignItems: "center",
    paddingHorizontal: 18,
    paddingBottom: 16,
    gap: 14,
  },
  qrFrame: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  qrMissing: {
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.md,
  },
  qrMissingText: {
    fontFamily: FONT.medium,
    fontSize: 13,
    color: "#52525B",
    textAlign: "center",
    lineHeight: 19,
  },
  timerBox: {
    width: "100%",
    gap: 8,
  },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: "#252530",
    overflow: "hidden",
  },
  progressFill: {
    height: 5,
    borderRadius: 3,
  },
  timerFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  inlineIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  timerText: {
    fontFamily: FONT.semibold,
    fontSize: 12,
    color: "#E4E4E7",
  },
  timerHint: {
    fontFamily: FONT.medium,
    fontSize: 11.5,
    color: "#A1A1AA",
  },
  walletFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#252530",
    backgroundColor: "#18181F",
    gap: 12,
  },
  footerVal: {
    fontFamily: FONT.semibold,
    fontSize: 13,
    color: "#FFFFFF",
    marginTop: 2,
  },
});
