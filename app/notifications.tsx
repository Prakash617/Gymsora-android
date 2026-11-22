import React, { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Award,
  Bell,
  CalendarClock,
  Info,
  Megaphone,
  Pin,
  Settings,
} from "../src/components/ui/Icons";
import {
  AppCard,
  BottomSheetModal,
  CardSkeleton,
  EmptyStateCard,
  StatusPill,
} from "../src/components/ui/Primitives";
import { computeFitnessStats } from "../src/services/achievements";
import { memberApi } from "../src/services/endpoints";
import {
  DEFAULT_PERSONAL_SETTINGS,
  localDb,
  type NotificationPrefs,
  type PersonalSettings,
} from "../src/services/localDb";
import { queryKeys } from "../src/services/queryClient";
import { useAuth } from "../src/store/authStore";
import { useGymTheme } from "../src/theme/GymThemeProvider";
import { FONT, RADIUS, SPACING, TYPOGRAPHY } from "../src/theme/tokens";

interface FeedItem {
  id: string;
  kind: "expiry" | "payment" | "announcement" | "achievement";
  title: string;
  body: string;
  date: string;
  pinned?: boolean;
  badge: string;
  tone: "primary" | "warning" | "error" | "success" | "info";
  onPress?: () => void;
}

export default function NotificationsScreen() {
  const { colors } = useGymTheme();
  const { activeGym, subscription, streak } = useAuth();
  const router = useRouter();
  const slug = activeGym?.slug || "default";

  const [settings, setSettings] = useState<PersonalSettings>(DEFAULT_PERSONAL_SETTINGS);
  const [prefsOpen, setPrefsOpen] = useState(false);

  useEffect(() => {
    localDb.loadPersonalSettings(slug).then((saved) => {
      if (saved) setSettings({ ...DEFAULT_PERSONAL_SETTINGS, ...saved });
    });
  }, [slug]);

  const hubQuery = useQuery({
    queryKey: queryKeys.gymHub(activeGym?.slug),
    queryFn: () => memberApi.gymHub(),
    enabled: Boolean(activeGym?.slug),
  });

  const workoutsQuery = useQuery({
    queryKey: queryKeys.workouts(activeGym?.slug),
    queryFn: async () => (await memberApi.workouts()).results,
    enabled: Boolean(activeGym?.slug),
  });

  const togglePref = async (key: keyof NotificationPrefs) => {
    const next: PersonalSettings = {
      ...settings,
      notifications: {
        ...settings.notifications,
        [key]: !settings.notifications[key],
      },
    };
    setSettings(next);
    await localDb.savePersonalSettings(slug, next);
  };

  const feed = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = [];
    const prefs = settings.notifications;

    // 1. Live Membership Expiry / Payment alerts from backend subscription state
    if (subscription && prefs.expiryReminders) {
      if (!subscription.is_allowed) {
        items.push({
          id: "sys-expired",
          kind: "expiry",
          title: "Membership Expired",
          body: subscription.message || "Your membership has expired. Request a renewal to restore gym access.",
          date: subscription.end_date || "Action needed",
          badge: "EXPIRY",
          tone: "error",
          onPress: () => router.push("/modals/renewal-request"),
        });
      } else if (subscription.result === "expiring_soon" && subscription.days_left !== null) {
        items.push({
          id: "sys-expiring",
          kind: "expiry",
          title: `Membership expires in ${subscription.days_left} day(s)`,
          body: `Plan "${subscription.plan_name || "Membership"}" is valid until ${subscription.end_date}. Renew early to avoid interruption.`,
          date: subscription.end_date || "Upcoming",
          badge: "RENEWAL",
          tone: "warning",
          onPress: () => router.push("/modals/renewal-request"),
        });
      }
    }

    if (
      subscription &&
      prefs.paymentReminders &&
      (subscription.payment_status === "due" || subscription.payment_status === "overdue")
    ) {
      items.push({
        id: "sys-payment-due",
        kind: "payment",
        title: `Payment ${subscription.payment_status.toUpperCase()}`,
        body: "Please settle your pending membership balance at the gym front desk.",
        date: "Billing",
        badge: "PAYMENT",
        tone: "warning",
        onPress: () => router.push("/(tabs)/membership"),
      });
    }

    // 2. Real Gym Announcements from backend
    if (prefs.gymAnnouncements && hubQuery.data?.announcements?.length) {
      for (const a of hubQuery.data.announcements) {
        items.push({
          id: `ann-${a.id}`,
          kind: "announcement",
          title: a.title,
          body: a.body,
          date: new Date(a.created_at).toLocaleDateString(),
          pinned: a.is_pinned,
          badge: a.category.toUpperCase(),
          tone: a.category === "offer" ? "primary" : "info",
        });
      }
    }

    // 3. Real Unlocked Achievements
    if (prefs.achievementAlerts) {
      const stats = computeFitnessStats({ streak, workouts: workoutsQuery.data || [] });
      for (const b of stats.badges.filter((x) => x.unlocked).slice(0, 3)) {
        items.push({
          id: `ach-${b.id}`,
          kind: "achievement",
          title: `Badge Unlocked: ${b.title}`,
          body: `${b.description} (${b.progressLabel})`,
          date: "Milestone",
          badge: "BADGE",
          tone: "success",
          onPress: () => router.push("/(tabs)/progress"),
        });
      }
    }

    return items;
  }, [subscription, hubQuery.data, streak, workoutsQuery.data, settings.notifications, router]);

  const iconFor = (kind: FeedItem["kind"]) => {
    switch (kind) {
      case "expiry":
        return <CalendarClock size={18} color={colors.warning} />;
      case "payment":
        return <AlertCircle size={18} color={colors.error} />;
      case "achievement":
        return <Award size={18} color={colors.success} />;
      default:
        return <Megaphone size={18} color={colors.primary} />;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={hubQuery.isRefetching}
            onRefresh={() => {
              void hubQuery.refetch();
              void workoutsQuery.refetch();
            }}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Top Preference Shortcut */}
        <AppCard style={styles.prefBar}>
          <View style={{ flex: 1 }}>
            <Text style={[TYPOGRAPHY.title, { color: colors.text }]}>Alert Preferences</Text>
            <Text style={[TYPOGRAPHY.caption, { color: colors.textMuted }]}>
              Choose which reminders and gym updates to display
            </Text>
          </View>
          <Pressable
            onPress={() => setPrefsOpen(true)}
            style={[styles.prefBtn, { backgroundColor: colors.surfaceVariant }]}
          >
            <Settings size={16} color={colors.primary} />
            <Text style={[styles.prefBtnText, { color: colors.text }]}>Manage</Text>
          </Pressable>
        </AppCard>

        {hubQuery.isLoading && !feed.length ? (
          <CardSkeleton lines={3} />
        ) : feed.length ? (
          <View style={{ gap: 10 }}>
            {feed.map((item) => (
              <Pressable key={item.id} onPress={item.onPress} disabled={!item.onPress}>
                <AppCard style={{ gap: 8 }}>
                  <View style={styles.rowBetween}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View style={[styles.iconWrap, { backgroundColor: colors.surfaceVariant }]}>
                        {iconFor(item.kind)}
                      </View>
                      <StatusPill label={item.badge} tone={item.tone} />
                      {item.pinned ? (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                          <Pin size={12} color={colors.warning} />
                          <Text style={{ fontFamily: FONT.semibold, fontSize: 11, color: colors.warning }}>
                            Pinned
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={[TYPOGRAPHY.caption, { color: colors.textMuted }]}>{item.date}</Text>
                  </View>
                  <Text style={[TYPOGRAPHY.title, { color: colors.text }]}>{item.title}</Text>
                  <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary, lineHeight: 19 }]}>
                    {item.body}
                  </Text>
                </AppCard>
              </Pressable>
            ))}
          </View>
        ) : (
          <EmptyStateCard
            icon={<Bell size={26} color={colors.textMuted} />}
            title="You're all caught up"
            description="Gym announcements, membership renewal reminders, and newly unlocked milestones will appear here."
          />
        )}

        {/* Transparent Push Infrastructure Note */}
        <AppCard variant="subtle" style={styles.noteRow}>
          <Info size={15} color={colors.textMuted} />
          <Text style={[TYPOGRAPHY.caption, { color: colors.textMuted, flex: 1 }]}>
            In-app notification feed is live. Background push delivery requires Firebase Cloud Messaging (FCM) + `/api/member/push-token/` backend integration.
          </Text>
        </AppCard>
      </ScrollView>

      {/* Notification Preferences Sheet */}
      <BottomSheetModal
        visible={prefsOpen}
        onClose={() => setPrefsOpen(false)}
        title="Notification Preferences"
        subtitle="Customize what shows in your inbox"
      >
        <View style={{ gap: 14 }}>
          {(
            [
              { key: "expiryReminders", label: "Membership Expiry Reminders" },
              { key: "paymentReminders", label: "Payment Due Alerts" },
              { key: "gymAnnouncements", label: "Gym & Trainer Announcements" },
              { key: "workoutReminders", label: "Workout Reminders" },
              { key: "achievementAlerts", label: "Achievement Milestones" },
            ] as Array<{ key: keyof NotificationPrefs; label: string }>
          ).map((item) => (
            <View key={item.key} style={styles.rowBetween}>
              <Text style={[TYPOGRAPHY.bodyMedium, { color: colors.text, flex: 1 }]}>
                {item.label}
              </Text>
              <Switch
                value={settings.notifications[item.key]}
                onValueChange={() => void togglePref(item.key)}
                trackColor={{ false: colors.surfaceVariant, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          ))}
        </View>
      </BottomSheetModal>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: SPACING.md,
    gap: 14,
    paddingBottom: SPACING.xl,
  },
  prefBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  prefBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
  },
  prefBtnText: {
    fontFamily: FONT.semibold,
    fontSize: 12,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
});
