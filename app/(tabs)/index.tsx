import React, { useEffect, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Award,
  Bell,
  Building2,
  CalendarCheck,
  ChevronRight,
  Clock,
  Dumbbell,
  Flame,
  Megaphone,
  Pin,
  Play,
  QrCode,
  Scale,
  Utensils,
} from "../../src/components/ui/Icons";
import { GymSoraLogo } from "../../src/components/GymSoraLogo";
import { MembershipBanner } from "../../src/components/MembershipBanner";
import { WeeklyBarChart } from "../../src/components/WeeklyBarChart";
import {
  AppButton,
  AppCard,
  CardSkeleton,
  OfflineNotice,
  ProgressBar,
  SectionHeader,
  StatusPill,
} from "../../src/components/ui/Primitives";
import { STARTER_ROUTINES } from "../../src/data/exerciseLibrary";
import { computeFitnessStats } from "../../src/services/achievements";
import { memberApi } from "../../src/services/endpoints";
import { DEFAULT_FITNESS_GOALS, localDb, type FitnessGoals } from "../../src/services/localDb";
import { queryKeys } from "../../src/services/queryClient";
import { cacheStorage } from "../../src/services/storage";
import { useAuth } from "../../src/store/authStore";
import { useGymTheme } from "../../src/theme/GymThemeProvider";
import {
  BRAND,
  FONT,
  RADIUS,
  SHADOWS,
  SPACING,
  TABULAR_NUMS,
  TYPOGRAPHY,
} from "../../src/theme/tokens";
import type { BodyMeasurementItem, HomePayload, WorkoutLogItem } from "../../src/types/api";

const HERO_WORKOUT_PHOTO = require("../../assets/images/intro-strength.jpg");

function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function HomeScreen() {
  const { colors } = useGymTheme();
  const { member, activeGym, subscription, streak, updateFromHome } = useAuth();
  const router = useRouter();

  const [cachedHome, setCachedHome] = useState<HomePayload | null>(null);
  const [cachedWorkouts, setCachedWorkouts] = useState<WorkoutLogItem[]>([]);
  const [cachedMeasurements, setCachedMeasurements] = useState<BodyMeasurementItem[]>([]);
  const [goals, setGoals] = useState<FitnessGoals>(DEFAULT_FITNESS_GOALS);

  useEffect(() => {
    const slug = activeGym?.slug;
    cacheStorage.getJson<HomePayload>(cacheStorage.keys.HOME_SNAPSHOT).then((snap) => {
      if (snap) setCachedHome(snap);
    });
    if (slug) {
      localDb.loadWorkouts(slug).then((rows) => rows && setCachedWorkouts(rows));
      localDb.loadMeasurements(slug).then((rows) => rows && setCachedMeasurements(rows));
      localDb.loadFitnessGoals(slug).then((g) => g && setGoals(g));
    }
  }, [activeGym?.slug]);

  const homeQuery = useQuery({
    queryKey: queryKeys.home(activeGym?.slug),
    queryFn: async () => {
      const data = await memberApi.home();
      await updateFromHome(data);
      setCachedHome(data);
      return data;
    },
    enabled: Boolean(activeGym?.slug),
  });

  const workoutsQuery = useQuery({
    queryKey: queryKeys.workouts(activeGym?.slug),
    queryFn: async () => {
      const rows = (await memberApi.workouts()).results;
      if (activeGym?.slug) void localDb.saveWorkouts(activeGym.slug, rows);
      setCachedWorkouts(rows);
      return rows;
    },
    enabled: Boolean(activeGym?.slug),
  });

  const measurementsQuery = useQuery({
    queryKey: queryKeys.measurements(activeGym?.slug),
    queryFn: async () => {
      const rows = (await memberApi.measurements()).results;
      if (activeGym?.slug) void localDb.saveMeasurements(activeGym.slug, rows);
      setCachedMeasurements(rows);
      return rows;
    },
    enabled: Boolean(activeGym?.slug),
  });

  const hubQuery = useQuery({
    queryKey: queryKeys.gymHub(activeGym?.slug),
    queryFn: () => memberApi.gymHub(),
    enabled: Boolean(activeGym?.slug),
  });

  const data = homeQuery.data || cachedHome;
  const displayMember = data?.member || member;
  const displayGym = data?.gym || activeGym;
  const displaySub = data?.subscription || subscription;
  const displayStreak = data?.streak || streak;
  const workouts = workoutsQuery.data ?? cachedWorkouts;
  const measurements = measurementsQuery.data ?? cachedMeasurements;
  const isOffline = Boolean((homeQuery.error as any)?.isNetworkError);

  const stats = useMemo(
    () =>
      computeFitnessStats({
        streak: displayStreak,
        workouts,
        measurements,
      }),
    [displayStreak, workouts, measurements],
  );

  // Weekly workout minutes Mon..Sun computed from real backend WorkoutLog items
  const weeklyMinutes = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);
    const mins = [0, 0, 0, 0, 0, 0, 0];
    for (const w of workouts) {
      if (!w.workout_date) continue;
      const [y, m, d] = w.workout_date.split("-").map(Number);
      if (!y || !m || !d) continue;
      const wDate = new Date(y, m - 1, d);
      const idx = Math.floor((wDate.getTime() - monday.getTime()) / (1000 * 60 * 60 * 24));
      if (idx >= 0 && idx <= 6) {
        mins[idx] += Number(w.duration_minutes || 0);
      }
    }
    return mins;
  }, [workouts]);

  const todayIso = new Date().toISOString().slice(0, 10);
  const todayWorkout = useMemo(
    () => workouts.find((w) => w.workout_date === todayIso) || null,
    [workouts, todayIso],
  );

  // Pick a daily suggested routine from the catalog by day of week (clearly labeled Suggested)
  const suggestedRoutine = STARTER_ROUTINES[new Date().getDay() % STARTER_ROUTINES.length];

  const hasNotificationAlert = Boolean(
    (data?.announcements?.length || 0) > 0 ||
      (displaySub && (!displaySub.is_allowed || displaySub.result === "expiring_soon" || displaySub.result === "due")),
  );

  const firstName = (displayMember?.name || "Athlete").split(" ")[0];
  const initials = (displayMember?.name || "M")
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  const featuredBadge = useMemo(
    () => stats.badges.find((b) => !b.unlocked) || stats.badges[0],
    [stats.badges],
  );

  const quickActions = [
    {
      key: "qr",
      label: "QR Pass",
      icon: QrCode,
      tint: colors.primary,
      bg: colors.primaryContainer,
      onPress: () => router.push("/(tabs)/membership"),
    },
    {
      key: "workout",
      label: "Train",
      icon: Dumbbell,
      tint: colors.secondary,
      bg: "rgba(250, 94, 18, 0.16)",
      onPress: () => router.push("/workout-session"),
    },
    {
      key: "progress",
      label: "Body",
      icon: Scale,
      tint: colors.info,
      bg: colors.infoContainer,
      onPress: () => router.push("/modals/log-measurement"),
    },
    {
      key: "nutrition",
      label: "Nutrition",
      icon: Utensils,
      tint: colors.success,
      bg: colors.successContainer,
      onPress: () => router.push("/nutrition"),
    },
    {
      key: "gym",
      label: "My Gym",
      icon: Building2,
      tint: colors.warning,
      bg: colors.warningContainer,
      onPress: () => router.push("/gym-hub"),
    },
  ];

  const onRefresh = () => {
    void Promise.all([
      homeQuery.refetch(),
      workoutsQuery.refetch(),
      measurementsQuery.refetch(),
      hubQuery.refetch(),
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={homeQuery.isRefetching}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Top Personalized Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.push("/(tabs)/profile")}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            style={styles.avatarBtn}
          >
            {displayMember?.photo ? (
              <Image source={{ uri: displayMember.photo }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: colors.primaryContainer }]}>
                <Text style={[styles.avatarInitials, { color: colors.primary }]}>
                  {initials}
                </Text>
              </View>
            )}
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text style={[styles.dateText, { color: colors.textMuted }]}>
              {dateLabel} · {displayGym?.name || "GymSora"}
            </Text>
            <Text style={[TYPOGRAPHY.h2, { color: colors.text }]} numberOfLines={1}>
              {greetingForHour(new Date().getHours())}, {firstName}
            </Text>
          </View>

          <Pressable
            onPress={() => router.push("/notifications")}
            accessibilityRole="button"
            accessibilityLabel="Open notifications"
            style={[
              styles.iconCircle,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Bell size={20} color={colors.text} />
            {hasNotificationAlert ? <View style={styles.notifDot} /> : null}
          </Pressable>
        </View>

        {isOffline ? <OfflineNotice /> : null}

        {/* Skeleton while first boot loads with no cache */}
        {homeQuery.isLoading && !data ? (
          <View style={{ gap: SPACING.md }}>
            <CardSkeleton lines={3} />
            <CardSkeleton lines={2} />
          </View>
        ) : null}

        {/* Today's Workout Hero Card with Editorial Photo Backdrop */}
        <View
          style={[
            styles.workoutHero,
            {
              backgroundColor: "#14141A",
              borderColor: "rgba(230, 126, 34, 0.38)",
            },
            SHADOWS.md,
          ]}
        >
          <Image
            source={HERO_WORKOUT_PHOTO}
            style={styles.heroBgPhoto}
            resizeMode="cover"
          />
          <View style={styles.heroScrim} />
          <View style={styles.heroGlowStripe} />
          <View style={styles.heroTopRow}>
            <StatusPill
              label={todayWorkout ? "COMPLETED TODAY" : "SUGGESTED SESSION"}
              tone={todayWorkout ? "success" : "primary"}
            />
            {displayStreak?.checked_in_today ? (
              <StatusPill label="CHECKED IN" tone="success" />
            ) : (
              <Pressable
                onPress={() => router.push("/scan-checkin")}
                style={styles.heroQrChip}
              >
                <QrCode size={13} color={BRAND.orange} />
                <Text style={styles.heroQrChipText}>Scan Desk QR</Text>
              </Pressable>
            )}
          </View>

          <Text style={styles.heroTitle} numberOfLines={2}>
            {todayWorkout ? todayWorkout.title : suggestedRoutine.title}
          </Text>

          <View style={styles.heroMetaRow}>
            <View style={styles.heroMetaItem}>
              <Dumbbell size={14} color="#A1A1AA" />
              <Text style={[styles.heroMetaText, TABULAR_NUMS]}>
                {todayWorkout
                  ? `${todayWorkout.exercises?.length || 0} exercises`
                  : `${suggestedRoutine.exerciseIds.length} exercises`}
              </Text>
            </View>
            <View style={styles.heroMetaItem}>
              <Clock size={14} color="#A1A1AA" />
              <Text style={[styles.heroMetaText, TABULAR_NUMS]}>
                {todayWorkout
                  ? `${todayWorkout.duration_minutes} min logged`
                  : `~${suggestedRoutine.estimatedMinutes} min`}
              </Text>
            </View>
          </View>

          <View style={styles.heroActions}>
            <AppButton
              label={todayWorkout ? "Start Another Session" : "Start Workout"}
              onPress={() =>
                router.push({
                  pathname: "/workout-session",
                  params: todayWorkout ? {} : { routineId: suggestedRoutine.id },
                })
              }
              icon={<Play size={16} color="#FFFFFF" />}
              style={{ flex: 1 }}
            />
            <Pressable
              onPress={() => router.push("/(tabs)/workout")}
              accessibilityRole="button"
              accessibilityLabel="Browse all workouts"
              style={styles.heroSecondaryBtn}
            >
              <Text style={styles.heroSecondaryText}>All</Text>
              <ChevronRight size={15} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        {/* Quick Actions Strip */}
        <View style={styles.quickRow}>
          {quickActions.map((item) => {
            const Icon = item.icon;
            return (
              <Pressable
                key={item.key}
                onPress={item.onPress}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                style={({ pressed }) => [
                  styles.quickItem,
                  { opacity: pressed ? 0.78 : 1 },
                ]}
              >
                <View style={[styles.quickIcon, { backgroundColor: item.bg }]}>
                  <Icon size={20} color={item.tint} />
                </View>
                <Text style={[styles.quickLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Membership Overview */}
        <MembershipBanner
          subscription={displaySub}
          onRenew={() => router.push("/modals/renewal-request")}
          onOpenWallet={() => router.push("/(tabs)/membership")}
        />

        {/* Fitness Overview: Stats + Real 7-Day Activity Chart */}
        <View>
          <SectionHeader
            title="Fitness Overview"
            actionLabel="Progress"
            onAction={() => router.push("/(tabs)/progress")}
          />

          <View style={styles.kpiGrid}>
            <AppCard style={styles.kpiTile}>
              <View style={[styles.kpiIcon, { backgroundColor: colors.primaryContainer }]}>
                <Flame size={17} color={colors.primary} />
              </View>
              <Text style={[styles.kpiValue, { color: colors.text }, TABULAR_NUMS]}>
                {displayStreak?.current_streak_days ?? 0}
                <Text style={[styles.kpiUnit, { color: colors.textMuted }]}> days</Text>
              </Text>
              <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Gym Streak</Text>
            </AppCard>

            <AppCard style={styles.kpiTile}>
              <View style={[styles.kpiIcon, { backgroundColor: colors.successContainer }]}>
                <CalendarCheck size={17} color={colors.success} />
              </View>
              <Text style={[styles.kpiValue, { color: colors.text }, TABULAR_NUMS]}>
                {displayStreak?.visits_this_month ?? 0}
                <Text style={[styles.kpiUnit, { color: colors.textMuted }]}> visits</Text>
              </Text>
              <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>This Month</Text>
            </AppCard>

            <AppCard style={styles.kpiTile}>
              <View style={[styles.kpiIcon, { backgroundColor: colors.infoContainer }]}>
                <Activity size={17} color={colors.info} />
              </View>
              <Text style={[styles.kpiValue, { color: colors.text }, TABULAR_NUMS]}>
                {stats.workoutsThisWeek}
                <Text style={[styles.kpiUnit, { color: colors.textMuted }]}>
                  /{goals.weekly_workouts_target}
                </Text>
              </Text>
              <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Weekly Goal</Text>
            </AppCard>

            <AppCard style={styles.kpiTile}>
              <View style={[styles.kpiIcon, { backgroundColor: colors.warningContainer }]}>
                <Scale size={17} color={colors.warning} />
              </View>
              <Text style={[styles.kpiValue, { color: colors.text }, TABULAR_NUMS]}>
                {data?.latest_measurement ? data.latest_measurement.weight_kg : "—"}
                {data?.latest_measurement ? (
                  <Text style={[styles.kpiUnit, { color: colors.textMuted }]}> kg</Text>
                ) : null}
              </Text>
              <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>
                {data?.latest_measurement?.bmi ? `BMI ${data.latest_measurement.bmi}` : "Latest Weight"}
              </Text>
            </AppCard>
          </View>

          <AppCard style={{ marginTop: SPACING.sm, gap: 12 }}>
            <View style={styles.rowBetween}>
              <View>
                <Text style={[TYPOGRAPHY.title, { color: colors.text }]}>Weekly Training</Text>
                <Text style={[TYPOGRAPHY.caption, { color: colors.textMuted }]}>
                  Logged workout minutes (Mon – Sun)
                </Text>
              </View>
              <StatusPill
                label={`${weeklyMinutes.reduce((a, b) => a + b, 0)} min`}
                tone="primary"
              />
            </View>
            <WeeklyBarChart values={weeklyMinutes} unit="min" />
          </AppCard>
        </View>

        {/* Achievements & Milestones Spotlight (100% Real Computed) */}
        {featuredBadge ? (
          <View>
            <SectionHeader
              title="Achievements"
              actionLabel={`${stats.unlockedCount}/${stats.badges.length} Unlocked`}
              onAction={() => router.push("/(tabs)/progress")}
            />
            <Pressable onPress={() => router.push("/(tabs)/progress")}>
              <AppCard style={{ gap: 10 }}>
                <View style={styles.rowBetween}>
                  <View style={styles.badgeRow}>
                    <View
                      style={[
                        styles.badgeIcon,
                        {
                          backgroundColor: featuredBadge.unlocked
                            ? colors.successContainer
                            : colors.primaryContainer,
                        },
                      ]}
                    >
                      <Award
                        size={20}
                        color={featuredBadge.unlocked ? colors.success : colors.primary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[TYPOGRAPHY.title, { color: colors.text }]}>
                        {featuredBadge.title}
                      </Text>
                      <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }]}>
                        {featuredBadge.description}
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={18} color={colors.textMuted} />
                </View>
                <ProgressBar
                  progress={featuredBadge.progress}
                  color={featuredBadge.unlocked ? colors.success : colors.primary}
                />
                <Text style={[TYPOGRAPHY.caption, { color: colors.textMuted }, TABULAR_NUMS]}>
                  {featuredBadge.progressLabel}
                </Text>
              </AppCard>
            </Pressable>
          </View>
        ) : null}

        {/* Trainers & Gym Services Preview (only when gym published real data) */}
        {hubQuery.data?.trainers?.length ? (
          <View>
            <SectionHeader
              title="Gym Trainers"
              actionLabel="Explore Gym"
              onAction={() => router.push("/gym-hub")}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: SPACING.sm }}
            >
              {hubQuery.data.trainers.slice(0, 5).map((trainer) => (
                <Pressable
                  key={trainer.id}
                  onPress={() => router.push("/gym-hub")}
                >
                  <AppCard style={styles.trainerCard}>
                    {trainer.photo ? (
                      <Image source={{ uri: trainer.photo }} style={styles.trainerImg} />
                    ) : (
                      <View
                        style={[
                          styles.trainerImg,
                          {
                            backgroundColor: colors.primaryContainer,
                            alignItems: "center",
                            justifyContent: "center",
                          },
                        ]}
                      >
                        <Dumbbell size={20} color={colors.primary} />
                      </View>
                    )}
                    <Text style={[TYPOGRAPHY.title, { color: colors.text }]} numberOfLines={1}>
                      {trainer.name}
                    </Text>
                    <Text
                      style={[TYPOGRAPHY.caption, { color: colors.primary }]}
                      numberOfLines={1}
                    >
                      {trainer.specialization || "Coach"}
                    </Text>
                  </AppCard>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Gym Announcements */}
        <View>
          <SectionHeader
            title="Gym Announcements"
            actionLabel="View All"
            onAction={() => router.push("/notifications")}
          />
          {data?.announcements?.length ? (
            <View style={{ gap: SPACING.sm }}>
              {data.announcements.slice(0, 2).map((item) => (
                <Pressable key={item.id} onPress={() => router.push("/notifications")}>
                  <AppCard style={{ gap: 6 }}>
                    <View style={styles.rowBetween}>
                      <StatusPill
                        label={item.category.toUpperCase()}
                        tone={item.category === "offer" ? "primary" : "neutral"}
                      />
                      {item.is_pinned ? (
                        <View style={styles.pinRow}>
                          <Pin size={12} color={colors.warning} />
                          <Text style={[styles.pinText, { color: colors.warning }]}>Pinned</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={[TYPOGRAPHY.title, { color: colors.text }]}>{item.title}</Text>
                    <Text
                      style={[TYPOGRAPHY.caption, { color: colors.textSecondary }]}
                      numberOfLines={2}
                    >
                      {item.body}
                    </Text>
                  </AppCard>
                </Pressable>
              ))}
            </View>
          ) : (
            <AppCard style={styles.emptyNotice}>
              <Megaphone size={18} color={colors.textMuted} />
              <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary, flex: 1 }]}>
                No active gym announcements right now. Check Notifications for updates.
              </Text>
            </AppCard>
          )}
        </View>
        {/* Branded Footer Watermark */}
        <View style={styles.brandFooter}>
          <GymSoraLogo size="xs" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xl,
    gap: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarBtn: {
    borderRadius: RADIUS.pill,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    borderColor: BRAND.orange,
  },
  avatarFallback: {
    width: 46,
    height: 46,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(230, 126, 34, 0.4)",
  },
  avatarInitials: {
    fontFamily: FONT.extrabold,
    fontSize: 15,
  },
  dateText: {
    fontFamily: FONT.medium,
    fontSize: 11.5,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  notifDot: {
    position: "absolute",
    top: 10,
    right: 11,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND.orangeHot,
  },
  workoutHero: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: 18,
    gap: 12,
    overflow: "hidden",
    position: "relative",
  },
  heroBgPhoto: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: "100%",
    height: "100%",
    opacity: 0.34,
  },
  heroScrim: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(9, 9, 11, 0.62)",
  },
  brandFooter: {
    alignItems: "center",
    opacity: 0.72,
    paddingTop: 6,
  },
  heroGlowStripe: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: BRAND.orange,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  heroQrChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
    backgroundColor: "rgba(230, 126, 34, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(230, 126, 34, 0.35)",
  },
  heroQrChipText: {
    fontFamily: FONT.bold,
    fontSize: 11,
    color: BRAND.orange,
  },
  heroTitle: {
    fontFamily: FONT.extrabold,
    fontSize: 21,
    lineHeight: 27,
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  heroMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  heroMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroMetaText: {
    fontFamily: FONT.medium,
    fontSize: 12.5,
    color: "#A1A1AA",
  },
  heroActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  heroSecondaryBtn: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: RADIUS.md,
    backgroundColor: "#22222C",
    borderWidth: 1,
    borderColor: "#30303D",
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  heroSecondaryText: {
    fontFamily: FONT.semibold,
    fontSize: 13.5,
    color: "#FFFFFF",
  },
  quickRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
  },
  quickItem: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  quickIcon: {
    width: 50,
    height: 50,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: {
    fontFamily: FONT.semibold,
    fontSize: 11,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  kpiTile: {
    width: "48.6%",
    flexGrow: 1,
    gap: 6,
  },
  kpiIcon: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  kpiValue: {
    fontFamily: FONT.extrabold,
    fontSize: 21,
    marginTop: 2,
  },
  kpiUnit: {
    fontFamily: FONT.medium,
    fontSize: 12.5,
  },
  kpiLabel: {
    fontFamily: FONT.medium,
    fontSize: 11.5,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  badgeIcon: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  trainerCard: {
    width: 144,
    gap: 6,
    padding: 12,
  },
  trainerImg: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
  },
  pinRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  pinText: {
    fontFamily: FONT.semibold,
    fontSize: 11,
  },
  emptyNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
});
