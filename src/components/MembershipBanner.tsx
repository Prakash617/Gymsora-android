import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CalendarClock, ChevronRight, CreditCard } from "./ui/Icons";
import { useGymTheme } from "../theme/GymThemeProvider";
import { FONT, RADIUS, SPACING, TABULAR_NUMS } from "../theme/tokens";
import type { SubscriptionAccess } from "../types/api";
import { AppButton, AppCard, ProgressBar, StatusPill } from "./ui/Primitives";

export function MembershipBanner({
  subscription,
  onRenew,
  onOpenWallet,
}: {
  subscription: SubscriptionAccess | null;
  onRenew: () => void;
  onOpenWallet?: () => void;
}) {
  const { colors } = useGymTheme();

  const isExpired = subscription ? !subscription.is_allowed : false;
  const isWarning =
    subscription?.result === "expiring_soon" || subscription?.result === "due";
  const tone = isExpired ? "error" : isWarning ? "warning" : "success";

  const headline = subscription?.plan_name || "Gym Membership";
  const daysText =
    subscription?.days_left === null || subscription?.days_left === undefined
      ? subscription?.is_allowed
        ? "Active"
        : "Inactive"
      : subscription.days_left < 0
        ? `Expired ${Math.abs(subscription.days_left)}d ago`
        : subscription.days_left === 0
          ? "Expires today"
          : `${subscription.days_left}d left`;

  // Compute true elapsed progress when start_date & end_date exist
  let remainingRatio = isExpired ? 0 : 0.75;
  if (subscription?.start_date && subscription?.end_date && subscription.days_left !== null) {
    const startMs = new Date(subscription.start_date).getTime();
    const endMs = new Date(subscription.end_date).getTime();
    const totalDays = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)));
    remainingRatio = Math.max(0, Math.min(1, subscription.days_left / totalDays));
  }

  const barColor =
    tone === "error" ? colors.error : tone === "warning" ? colors.warning : colors.primary;

  return (
    <AppCard variant="elevated" style={styles.card}>
      <Pressable
        onPress={onOpenWallet}
        disabled={!onOpenWallet}
        style={styles.topRow}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.eyebrow, { color: colors.textMuted }]}>MEMBERSHIP PLAN</Text>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {headline}
          </Text>
        </View>
        <View style={styles.rightCluster}>
          <StatusPill label={daysText} tone={tone} />
          {onOpenWallet ? <ChevronRight size={16} color={colors.textMuted} /> : null}
        </View>
      </Pressable>

      <ProgressBar progress={remainingRatio} color={barColor} height={6} />

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <CalendarClock size={13} color={colors.textMuted} />
          <Text style={[styles.metaText, { color: colors.textSecondary }, TABULAR_NUMS]}>
            Expires {subscription?.end_date || "—"}
          </Text>
        </View>
        {subscription?.payment_status ? (
          <View style={styles.metaItem}>
            <CreditCard size={13} color={colors.textMuted} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {subscription.payment_status.toUpperCase()}
            </Text>
          </View>
        ) : null}
      </View>

      {isExpired || isWarning ? (
        <AppButton
          label={isExpired ? "Request Plan Renewal" : "Renew or Upgrade Plan"}
          variant={isExpired ? "primary" : "tonal"}
          size="sm"
          onPress={onRenew}
          style={{ marginTop: 4 }}
        />
      ) : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  rightCluster: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  eyebrow: {
    fontFamily: FONT.semibold,
    fontSize: 10.5,
    letterSpacing: 0.9,
  },
  title: {
    fontFamily: FONT.bold,
    fontSize: 17,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaText: {
    fontFamily: FONT.medium,
    fontSize: 12,
  },
});
