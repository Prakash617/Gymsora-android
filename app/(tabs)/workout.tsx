import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Check,
  ChevronRight,
  Clock,
  Dumbbell,
  Flame,
  Play,
  Plus,
  Trash2,
  Trophy,
  Zap,
} from "../../src/components/ui/Icons";
import {
  AppButton,
  AppCard,
  CardSkeleton,
  EmptyStateCard,
  ErrorStateCard,
  SectionHeader,
  StatusPill,
} from "../../src/components/ui/Primitives";
import { EXERCISE_LIBRARY, STARTER_ROUTINES } from "../../src/data/exerciseLibrary";
import {
  computeFitnessStats,
  workoutTotalSets,
  workoutVolumeKg,
} from "../../src/services/achievements";
import { memberApi } from "../../src/services/endpoints";
import { DEFAULT_FITNESS_GOALS, localDb, type FitnessGoals } from "../../src/services/localDb";
import { queryKeys } from "../../src/services/queryClient";
import { useAuth } from "../../src/store/authStore";
import { useGymTheme } from "../../src/theme/GymThemeProvider";
import {
  BRAND,
  FONT,
  RADIUS,
  SPACING,
  TABULAR_NUMS,
  TYPOGRAPHY,
} from "../../src/theme/tokens";
import type { WorkoutLogItem } from "../../src/types/api";

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function WorkoutScreen() {
  const { colors } = useGymTheme();
  const { activeGym, streak } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  const [cachedWorkouts, setCachedWorkouts] = useState<WorkoutLogItem[]>([]);
  const [goals, setGoals] = useState<FitnessGoals>(DEFAULT_FITNESS_GOALS);

  useEffect(() => {
    const slug = activeGym?.slug;
    if (!slug) return;
    localDb.loadWorkouts(slug).then((rows) => rows && setCachedWorkouts(rows));
    localDb.loadFitnessGoals(slug).then((g) => g && setGoals(g));
  }, [activeGym?.slug]);

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

  const assignedPlansQuery = useQuery({
    queryKey: queryKeys.workoutPlans(activeGym?.slug),
    queryFn: async () => (await memberApi.workoutPlans()).results || [],
    enabled: Boolean(activeGym?.slug),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => memberApi.deleteWorkout(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.workouts(activeGym?.slug) });
      void qc.invalidateQueries({ queryKey: queryKeys.home(activeGym?.slug) });
    },
  });

  const confirmDelete = useCallback(
    (item: WorkoutLogItem) => {
      Alert.alert("Delete workout?", `Remove "${item.title}" from your history?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMut.mutate(item.id),
        },
      ]);
    },
    [deleteMut],
  );

  const workouts = workoutsQuery.data ?? cachedWorkouts;
  const stats = useMemo(
    () => computeFitnessStats({ streak, workouts }),
    [streak, workouts],
  );

  const jsDay = new Date().getDay();
  const todayIdx = jsDay === 0 ? 6 : jsDay - 1;

  const renderWorkout = useCallback(
    ({ item }: { item: WorkoutLogItem }) => {
      const vol = workoutVolumeKg(item);
      const sets = workoutTotalSets(item);
      return (
        <AppCard style={{ gap: 10 }}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={[TYPOGRAPHY.title, { color: colors.text }]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={[TYPOGRAPHY.caption, { color: colors.textMuted }, TABULAR_NUMS]}>
                {item.workout_date}
              </Text>
            </View>
            <StatusPill label={item.category.toUpperCase()} tone="primary" />
            <Pressable
              onPress={() => confirmDelete(item)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={`Delete ${item.title}`}
              style={styles.iconBtn}
            >
              <Trash2 size={17} color={colors.textMuted} />
            </Pressable>
          </View>

          <View style={styles.metaStrip}>
            <View style={styles.metaChip}>
              <Clock size={13} color={colors.primary} />
              <Text style={[styles.metaChipText, { color: colors.textSecondary }, TABULAR_NUMS]}>
                {item.duration_minutes} min
              </Text>
            </View>
            {sets > 0 ? (
              <View style={styles.metaChip}>
                <Dumbbell size={13} color={colors.info} />
                <Text style={[styles.metaChipText, { color: colors.textSecondary }, TABULAR_NUMS]}>
                  {sets} sets
                </Text>
              </View>
            ) : null}
            {vol > 0 ? (
              <View style={styles.metaChip}>
                <Zap size={13} color={colors.warning} />
                <Text style={[styles.metaChipText, { color: colors.textSecondary }, TABULAR_NUMS]}>
                  {Math.round(vol).toLocaleString()} kg
                </Text>
              </View>
            ) : null}
            {item.calories_burned ? (
              <View style={styles.metaChip}>
                <Flame size={13} color={colors.secondary} />
                <Text style={[styles.metaChipText, { color: colors.textSecondary }, TABULAR_NUMS]}>
                  {item.calories_burned} kcal
                </Text>
              </View>
            ) : null}
          </View>

          {item.exercises?.length ? (
            <View style={[styles.exerciseList, { backgroundColor: colors.surfaceVariant }]}>
              {item.exercises.slice(0, 5).map((ex, idx) => (
                <View key={`${ex.name}-${idx}`} style={styles.exerciseLine}>
                  <Text
                    style={[styles.exerciseName, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {ex.name}
                  </Text>
                  <Text
                    style={[styles.exerciseSets, { color: colors.textSecondary }, TABULAR_NUMS]}
                  >
                    {ex.sets}×{ex.reps}
                    {ex.weight_kg ? ` · ${ex.weight_kg}kg` : ""}
                  </Text>
                </View>
              ))}
              {item.exercises.length > 5 ? (
                <Text style={[TYPOGRAPHY.caption, { color: colors.textMuted }]}>
                  +{item.exercises.length - 5} more exercise(s)
                </Text>
              ) : null}
            </View>
          ) : null}

          {item.notes ? (
            <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }]}>{item.notes}</Text>
          ) : null}
        </AppCard>
      );
    },
    [colors, confirmDelete],
  );

  const listHeader = (
    <View style={{ gap: 20, marginBottom: SPACING.sm }}>
      {/* Screen Header */}
      <View style={styles.screenHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[TYPOGRAPHY.label, { color: colors.primary }]}>TRAINING STUDIO</Text>
          <Text style={[TYPOGRAPHY.h1, { color: colors.text }]}>Workouts</Text>
        </View>
        <Pressable
          onPress={() => router.push("/modals/log-workout")}
          accessibilityRole="button"
          accessibilityLabel="Quick log completed workout"
          style={[
            styles.quickLogBtn,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Plus size={16} color={colors.primary} />
          <Text style={[styles.quickLogText, { color: colors.text }]}>Quick Log</Text>
        </Pressable>
      </View>

      {/* Live Workout Launch CTA */}
      <View style={[styles.launchCard, { backgroundColor: "#14141A", borderColor: "rgba(230,126,34,0.35)" }]}>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.launchEyebrow}>LIVE TRACKER · REST TIMER · AUTO PR</Text>
            <Text style={styles.launchTitle}>Start an Empty Workout</Text>
            <Text style={styles.launchSub}>
              Track sets, reps, load, rest intervals, and save straight to your history.
            </Text>
          </View>
        </View>
        <AppButton
          label="Start Live Session"
          onPress={() => router.push("/workout-session")}
          icon={<Play size={16} color="#FFFFFF" />}
        />
      </View>

      {/* Weekly Schedule / Completion Strip */}
      <AppCard style={{ gap: 12 }}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={[TYPOGRAPHY.title, { color: colors.text }]}>This Week</Text>
            <Text style={[TYPOGRAPHY.caption, { color: colors.textMuted }, TABULAR_NUMS]}>
              {stats.workoutsThisWeek} of {goals.weekly_workouts_target} sessions completed
            </Text>
          </View>
          <StatusPill
            label={
              stats.totalVolumeKg > 0
                ? `${stats.totalVolumeKg.toLocaleString()} kg total`
                : `${stats.totalWorkouts} logged`
            }
            tone="primary"
          />
        </View>

        <View style={styles.weekRow}>
          {WEEK_DAYS.map((day, idx) => {
            const done = stats.weeklyWorkoutDays[idx];
            const isToday = idx === todayIdx;
            return (
              <View key={day} style={styles.weekCol}>
                <View
                  style={[
                    styles.weekCircle,
                    done
                      ? { backgroundColor: colors.primary }
                      : isToday
                        ? {
                            borderWidth: 1.5,
                            borderColor: colors.primary,
                            backgroundColor: colors.primaryContainer,
                          }
                        : { backgroundColor: colors.surfaceVariant },
                  ]}
                >
                  {done ? (
                    <Check size={15} color="#FFFFFF" />
                  ) : (
                    <Text
                      style={[
                        styles.weekDotText,
                        { color: isToday ? colors.primary : colors.textMuted },
                      ]}
                    >
                      {day[0]}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.weekLabel,
                    { color: isToday ? colors.primary : colors.textMuted },
                  ]}
                >
                  {day}
                </Text>
              </View>
            );
          })}
        </View>
      </AppCard>

      {/* Exercise Library Entry */}
      <Pressable onPress={() => router.push("/exercise-library")}>
        <AppCard variant="elevated" style={styles.libraryBanner}>
          <View style={[styles.libraryIcon, { backgroundColor: colors.primaryContainer }]}>
            <BookOpen size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[TYPOGRAPHY.title, { color: colors.text }]}>Exercise Library</Text>
            <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }]}>
              {EXERCISE_LIBRARY.length} exercises · form cues, target muscles & equipment
            </Text>
          </View>
          <ChevronRight size={18} color={colors.textMuted} />
        </AppCard>
      </Pressable>

      {/* Trainer-Assigned Workout Plans (when assigned by gym/coach) */}
      {assignedPlansQuery.data?.length ? (
        <View style={{ gap: 8 }}>
          <SectionHeader
            title="Assigned Workout Plans"
            subtitle="Created by your gym trainer"
          />
          {assignedPlansQuery.data.map((plan) => (
            <AppCard key={plan.id} variant="accent" style={{ gap: 6 }}>
              <View style={styles.rowBetween}>
                <Text style={[TYPOGRAPHY.title, { color: colors.text, flex: 1 }]}>
                  {plan.title}
                </Text>
                <StatusPill label={plan.difficulty} tone="primary" />
              </View>
              {plan.trainer_name ? (
                <Text style={[TYPOGRAPHY.caption, { color: colors.primary }]}>
                  Coach: {plan.trainer_name}
                </Text>
              ) : null}
              {plan.description ? (
                <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }]}>
                  {plan.description}
                </Text>
              ) : null}
            </AppCard>
          ))}
        </View>
      ) : null}

      {/* Starter Routines */}
      <View>
        <SectionHeader
          title="Starter Routines"
          subtitle="Tap any routine to launch live tracking"
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: SPACING.sm }}
        >
          {STARTER_ROUTINES.map((routine) => (
            <Pressable
              key={routine.id}
              onPress={() =>
                router.push({
                  pathname: "/workout-session",
                  params: { routineId: routine.id },
                })
              }
            >
              <AppCard style={styles.routineCard}>
                <View style={styles.rowBetween}>
                  <StatusPill label={routine.difficulty} tone="neutral" />
                  <Text style={[TYPOGRAPHY.caption, { color: colors.primary }, TABULAR_NUMS]}>
                    ~{routine.estimatedMinutes}m
                  </Text>
                </View>
                <Text style={[TYPOGRAPHY.title, { color: colors.text }]} numberOfLines={2}>
                  {routine.title}
                </Text>
                <Text style={[TYPOGRAPHY.caption, { color: colors.textMuted }]} numberOfLines={1}>
                  {routine.focus}
                </Text>
                <View style={styles.routineFooter}>
                  <Text style={[styles.routineCount, { color: colors.textSecondary }, TABULAR_NUMS]}>
                    {routine.exerciseIds.length} exercises
                  </Text>
                  <View style={[styles.playPill, { backgroundColor: colors.primary }]}>
                    <Play size={11} color="#FFFFFF" />
                  </View>
                </View>
              </AppCard>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Top Personal Records (only when real weight logs exist) */}
      {stats.personalRecords.length > 0 ? (
        <View>
          <SectionHeader title="Personal Records" subtitle="Auto-tracked from your workouts" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: SPACING.sm }}
          >
            {stats.personalRecords.slice(0, 6).map((pr) => (
              <AppCard key={pr.exerciseName} style={styles.prCard}>
                <Trophy size={16} color={colors.warning} />
                <Text style={[styles.prName, { color: colors.text }]} numberOfLines={1}>
                  {pr.exerciseName}
                </Text>
                <Text style={[styles.prVal, { color: colors.primary }, TABULAR_NUMS]}>
                  {pr.bestWeightKg} kg
                  {pr.repsAtBest > 0 ? ` × ${pr.repsAtBest}` : ""}
                </Text>
              </AppCard>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <SectionHeader
        title="Workout History"
        subtitle={`${workouts.length} recorded session${workouts.length === 1 ? "" : "s"}`}
      />
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <FlatList
        data={workouts}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderWorkout}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={listHeader}
        refreshControl={
          <RefreshControl
            refreshing={workoutsQuery.isRefetching}
            onRefresh={() => void workoutsQuery.refetch()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          workoutsQuery.isLoading ? (
            <CardSkeleton lines={3} />
          ) : workoutsQuery.isError ? (
            <ErrorStateCard
              message={(workoutsQuery.error as Error)?.message || "Could not load workout history."}
              onRetry={() => void workoutsQuery.refetch()}
            />
          ) : (
            <EmptyStateCard
              icon={<Dumbbell size={26} color={colors.primary} />}
              title="No workouts logged yet"
              description="Start a live workout session with built-in set tracking and rest timer, or quick-log a completed session."
              actionLabel="Start Live Session"
              onAction={() => router.push("/workout-session")}
            />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xl,
    gap: 12,
  },
  screenHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },
  quickLogBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 13,
    minHeight: 40,
    borderRadius: RADIUS.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  quickLogText: {
    fontFamily: FONT.semibold,
    fontSize: 12.5,
  },
  launchCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  launchEyebrow: {
    fontFamily: FONT.bold,
    fontSize: 10,
    letterSpacing: 1,
    color: BRAND.orange,
  },
  launchTitle: {
    fontFamily: FONT.extrabold,
    fontSize: 20,
    color: "#FFFFFF",
  },
  launchSub: {
    fontFamily: FONT.regular,
    fontSize: 12.5,
    color: "#A1A1AA",
    lineHeight: 18,
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  weekCol: {
    alignItems: "center",
    gap: 6,
  },
  weekCircle: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  weekDotText: {
    fontFamily: FONT.bold,
    fontSize: 12,
  },
  weekLabel: {
    fontFamily: FONT.semibold,
    fontSize: 10.5,
  },
  libraryBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  libraryIcon: {
    width: 46,
    height: 46,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  routineCard: {
    width: 210,
    gap: 8,
    padding: 14,
  },
  routineFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  routineCount: {
    fontFamily: FONT.medium,
    fontSize: 12,
  },
  playPill: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  prCard: {
    width: 148,
    gap: 6,
    padding: 14,
  },
  prName: {
    fontFamily: FONT.semibold,
    fontSize: 13,
  },
  prVal: {
    fontFamily: FONT.extrabold,
    fontSize: 16,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  metaStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaChipText: {
    fontFamily: FONT.medium,
    fontSize: 12,
  },
  exerciseList: {
    borderRadius: RADIUS.md,
    padding: 12,
    gap: 6,
  },
  exerciseLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  exerciseName: {
    fontFamily: FONT.medium,
    fontSize: 13,
    flex: 1,
  },
  exerciseSets: {
    fontFamily: FONT.semibold,
    fontSize: 12,
  },
});
