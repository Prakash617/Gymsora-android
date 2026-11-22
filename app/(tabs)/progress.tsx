import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
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
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Award,
  Camera,
  ChevronRight,
  Flame,
  Info,
  Plus,
  Scale,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Trophy,
  Utensils,
} from "../../src/components/ui/Icons";
import { WeightChart } from "../../src/components/WeightChart";
import {
  AppButton,
  AppCard,
  AppInput,
  BottomSheetModal,
  CardSkeleton,
  EmptyStateCard,
  ErrorStateCard,
  ProgressBar,
  SectionHeader,
  StatusPill,
} from "../../src/components/ui/Primitives";
import { computeFitnessStats } from "../../src/services/achievements";
import { memberApi } from "../../src/services/endpoints";
import {
  DEFAULT_FITNESS_GOALS,
  localDb,
  type FitnessGoals,
  type ProgressPhotoItem,
} from "../../src/services/localDb";
import { queryKeys } from "../../src/services/queryClient";
import { useAuth } from "../../src/store/authStore";
import { useGymTheme } from "../../src/theme/GymThemeProvider";
import {
  FONT,
  RADIUS,
  SPACING,
  TABULAR_NUMS,
  TYPOGRAPHY,
} from "../../src/theme/tokens";
import type { BodyMeasurementItem, WorkoutLogItem } from "../../src/types/api";

type ProgressTab = "body" | "goals" | "badges";

function bmiCategory(bmi: number | null): {
  label: string;
  tone: "success" | "warning" | "error" | "neutral";
} {
  if (bmi === null) return { label: "Add height", tone: "neutral" };
  if (bmi < 18.5) return { label: "Underweight", tone: "warning" };
  if (bmi < 25) return { label: "Healthy Range", tone: "success" };
  if (bmi < 30) return { label: "Overweight", tone: "warning" };
  return { label: "High Range", tone: "error" };
}

function deltaText(curr?: number | null, prev?: number | null, unit = ""): string | null {
  if (curr === null || curr === undefined || prev === null || prev === undefined) return null;
  const diff = Number((curr - prev).toFixed(1));
  if (diff === 0) return `0${unit}`;
  return `${diff > 0 ? "+" : ""}${diff}${unit}`;
}

export default function ProgressScreen() {
  const { colors } = useGymTheme();
  const { activeGym, streak } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  const [tab, setTab] = useState<ProgressTab>("body");
  const [cachedMeasurements, setCachedMeasurements] = useState<BodyMeasurementItem[]>([]);
  const [cachedWorkouts, setCachedWorkouts] = useState<WorkoutLogItem[]>([]);
  const [thighMap, setThighMap] = useState<Record<string, number>>({});
  const [goals, setGoals] = useState<FitnessGoals>(DEFAULT_FITNESS_GOALS);
  const [photos, setPhotos] = useState<ProgressPhotoItem[]>([]);

  // Goal editor modal
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [targetWeightInput, setTargetWeightInput] = useState("");
  const [weeklyWorkoutsInput, setWeeklyWorkoutsInput] = useState("4");
  const [weeklyVisitsInput, setWeeklyVisitsInput] = useState("4");

  useEffect(() => {
    const slug = activeGym?.slug;
    if (!slug) return;
    localDb.loadMeasurements(slug).then((rows) => rows && setCachedMeasurements(rows));
    localDb.loadWorkouts(slug).then((rows) => rows && setCachedWorkouts(rows));
    localDb.loadThighMap(slug).then((m) => m && setThighMap(m));
    localDb.loadFitnessGoals(slug).then((g) => {
      if (g) {
        setGoals(g);
        setTargetWeightInput(g.target_weight_kg ? String(g.target_weight_kg) : "");
        setWeeklyWorkoutsInput(String(g.weekly_workouts_target));
        setWeeklyVisitsInput(String(g.weekly_visits_target));
      }
    });
    localDb.loadProgressPhotos(slug).then((p) => p && setPhotos(p));
  }, [activeGym?.slug]);

  const measurementsQuery = useQuery({
    queryKey: queryKeys.measurements(activeGym?.slug),
    queryFn: async () => {
      const rows = (await memberApi.measurements()).results;
      if (activeGym?.slug) {
        void localDb.saveMeasurements(activeGym.slug, rows);
        const latestThigh = await localDb.loadThighMap(activeGym.slug);
        if (latestThigh) setThighMap(latestThigh);
      }
      setCachedMeasurements(rows);
      return rows;
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

  const prefsQuery = useQuery({
    queryKey: queryKeys.preferences(activeGym?.slug),
    queryFn: async () => {
      const p = await memberApi.preferences();
      const nextGoals: FitnessGoals = {
        target_weight_kg: p.target_weight_kg,
        weekly_workouts_target: p.weekly_workouts_target || 4,
        weekly_visits_target: p.weekly_visits_target || 4,
      };
      setGoals(nextGoals);
      setTargetWeightInput(p.target_weight_kg ? String(p.target_weight_kg) : "");
      setWeeklyWorkoutsInput(String(nextGoals.weekly_workouts_target));
      setWeeklyVisitsInput(String(nextGoals.weekly_visits_target));
      if (activeGym?.slug) void localDb.saveFitnessGoals(activeGym.slug, nextGoals);
      return p;
    },
    enabled: Boolean(activeGym?.slug),
  });

  const photosQuery = useQuery({
    queryKey: queryKeys.progressPhotos(activeGym?.slug),
    queryFn: async () => {
      const rows = (await memberApi.progressPhotos()).results || [];
      const mapped: ProgressPhotoItem[] = rows
        .filter((r) => Boolean(r.image))
        .map((r) => ({
          id: String(r.id),
          uri: r.image as string,
          date: r.recorded_date,
          label: (r.label.charAt(0).toUpperCase() + r.label.slice(1)) as ProgressPhotoItem["label"],
          weight_kg: r.weight_kg,
          created_at: r.created_at,
        }));
      setPhotos(mapped);
      if (activeGym?.slug) void localDb.saveProgressPhotos(activeGym.slug, mapped);
      return mapped;
    },
    enabled: Boolean(activeGym?.slug),
  });

  const deleteMeasurementMut = useMutation({
    mutationFn: (id: number) => memberApi.deleteMeasurement(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.measurements(activeGym?.slug) });
      void qc.invalidateQueries({ queryKey: queryKeys.home(activeGym?.slug) });
    },
  });

  const confirmDeleteMeasurement = useCallback(
    (item: BodyMeasurementItem) => {
      Alert.alert(
        "Delete measurement?",
        `Remove ${item.weight_kg} kg entry from ${item.recorded_date}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => deleteMeasurementMut.mutate(item.id),
          },
        ],
      );
    },
    [deleteMeasurementMut],
  );

  const measurements = measurementsQuery.data ?? cachedMeasurements;
  const workouts = workoutsQuery.data ?? cachedWorkouts;
  const latest = measurements[0] || null;
  const previous = measurements[1] || null;
  const bmiMeta = bmiCategory(latest?.bmi ?? null);

  const stats = useMemo(
    () => computeFitnessStats({ streak, workouts, measurements }),
    [streak, workouts, measurements],
  );

  const handleSaveGoals = async () => {
    const slug = activeGym?.slug;
    if (!slug) return;
    const tw = targetWeightInput.trim() ? Number(targetWeightInput.trim()) : null;
    const next: FitnessGoals = {
      target_weight_kg: tw && Number.isFinite(tw) && tw >= 25 && tw <= 300 ? tw : null,
      weekly_workouts_target: Math.max(1, Math.min(14, Number(weeklyWorkoutsInput) || 4)),
      weekly_visits_target: Math.max(1, Math.min(14, Number(weeklyVisitsInput) || 4)),
    };
    setGoals(next);
    await localDb.saveFitnessGoals(slug, next);
    try {
      await memberApi.updatePreferences({
        target_weight_kg: next.target_weight_kg,
        weekly_workouts_target: next.weekly_workouts_target,
        weekly_visits_target: next.weekly_visits_target,
      });
      void qc.invalidateQueries({ queryKey: queryKeys.preferences(slug) });
    } catch {
      /* offline fallback preserved locally */
    }
    setGoalModalOpen(false);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleAddPhoto = async (label: ProgressPhotoItem["label"]) => {
    const slug = activeGym?.slug;
    if (!slug) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow photo library access to save a progress photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.78,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;

    const todayStr = new Date().toISOString().slice(0, 10);
    let savedItem: ProgressPhotoItem = {
      id: `local-${Date.now()}`,
      uri: result.assets[0].uri,
      date: todayStr,
      label,
      weight_kg: latest?.weight_kg ?? null,
      created_at: new Date().toISOString(),
    };
    try {
      const uploaded = await memberApi.uploadProgressPhoto({
        uri: result.assets[0].uri,
        label,
        weight_kg: latest?.weight_kg ?? null,
        recorded_date: todayStr,
      });
      savedItem = {
        id: String(uploaded.id),
        uri: uploaded.image || result.assets[0].uri,
        date: uploaded.recorded_date,
        label,
        weight_kg: uploaded.weight_kg,
        created_at: uploaded.created_at,
      };
      void qc.invalidateQueries({ queryKey: queryKeys.progressPhotos(slug) });
    } catch {
      /* keep local copy if offline */
    }

    const next = [savedItem, ...photos].slice(0, 24);
    setPhotos(next);
    await localDb.saveProgressPhotos(slug, next);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const confirmDeletePhoto = (photo: ProgressPhotoItem) => {
    Alert.alert("Remove progress photo?", `Delete ${photo.label} photo from ${photo.date}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const next = photos.filter((p) => p.id !== photo.id);
          setPhotos(next);
          if (activeGym?.slug) await localDb.saveProgressPhotos(activeGym.slug, next);
          if (/^\d+$/.test(photo.id)) {
            memberApi.deleteProgressPhoto(Number(photo.id)).catch(() => undefined);
          }
        },
      },
    ]);
  };

  const compareRows = useMemo(() => {
    if (!latest || !previous) return [];
    const latestThigh = latest.thigh_cm ?? thighMap[String(latest.id)];
    const prevThigh = previous.thigh_cm ?? thighMap[String(previous.id)];
    return [
      { label: "Weight", curr: `${latest.weight_kg} kg`, delta: deltaText(latest.weight_kg, previous.weight_kg, " kg") },
      latest.bmi !== null && previous.bmi !== null
        ? { label: "BMI", curr: `${latest.bmi}`, delta: deltaText(latest.bmi, previous.bmi) }
        : null,
      latest.body_fat_pct !== null && previous.body_fat_pct !== null
        ? { label: "Body Fat", curr: `${latest.body_fat_pct}%`, delta: deltaText(latest.body_fat_pct, previous.body_fat_pct, "%") }
        : null,
      latest.chest_cm && previous.chest_cm
        ? { label: "Chest", curr: `${latest.chest_cm} cm`, delta: deltaText(latest.chest_cm, previous.chest_cm, " cm") }
        : null,
      latest.waist_cm && previous.waist_cm
        ? { label: "Waist", curr: `${latest.waist_cm} cm`, delta: deltaText(latest.waist_cm, previous.waist_cm, " cm") }
        : null,
      latest.arms_cm && previous.arms_cm
        ? { label: "Arms", curr: `${latest.arms_cm} cm`, delta: deltaText(latest.arms_cm, previous.arms_cm, " cm") }
        : null,
      latestThigh && prevThigh
        ? { label: "Thighs", curr: `${latestThigh} cm`, delta: deltaText(latestThigh, prevThigh, " cm") }
        : null,
    ].filter((r): r is { label: string; curr: string; delta: string | null } => Boolean(r));
  }, [latest, previous, thighMap]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={measurementsQuery.isRefetching || workoutsQuery.isRefetching}
            onRefresh={() => {
              void measurementsQuery.refetch();
              void workoutsQuery.refetch();
            }}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.screenHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[TYPOGRAPHY.label, { color: colors.primary }]}>BODY & PERFORMANCE</Text>
            <Text style={[TYPOGRAPHY.h1, { color: colors.text }]}>Progress</Text>
          </View>
          <Pressable
            onPress={() => router.push("/modals/log-measurement")}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            accessibilityRole="button"
            accessibilityLabel="Log body measurement"
          >
            <Plus size={16} color="#FFFFFF" />
            <Text style={styles.addBtnText}>Log</Text>
          </Pressable>
        </View>

        {/* Segmented Control */}
        <View
          style={[
            styles.segmented,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {(
            [
              { key: "body", label: "Body & Charts" },
              { key: "goals", label: "Photos & Goals" },
              { key: "badges", label: "Badges" },
            ] as const
          ).map((item) => {
            const active = tab === item.key;
            return (
              <Pressable
                key={item.key}
                onPress={() => setTab(item.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                style={[styles.segBtn, active && { backgroundColor: colors.primary }]}
              >
                <Text
                  style={[
                    styles.segText,
                    { color: active ? "#FFFFFF" : colors.textSecondary },
                  ]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Nutrition Quick Access Banner */}
        <Pressable onPress={() => router.push("/nutrition")}>
          <AppCard variant="elevated" style={styles.nutritionLink}>
            <View style={[styles.nutIcon, { backgroundColor: colors.successContainer }]}>
              <Utensils size={19} color={colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[TYPOGRAPHY.title, { color: colors.text }]}>
                Nutrition & Hydration
              </Text>
              <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }]}>
                Track daily calories, macros, meals & water intake
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </AppCard>
        </Pressable>

        {/* ================= BODY & CHARTS TAB ================= */}
        {tab === "body" ? (
          <View style={{ gap: 16 }}>
            {measurementsQuery.isLoading && !measurements.length ? (
              <CardSkeleton lines={3} />
            ) : measurementsQuery.isError && !measurements.length ? (
              <ErrorStateCard
                message={(measurementsQuery.error as Error)?.message || "Could not load body logs."}
                onRetry={() => void measurementsQuery.refetch()}
              />
            ) : !latest ? (
              <EmptyStateCard
                icon={<Scale size={26} color={colors.primary} />}
                title="Start tracking your body"
                description="Log weight, height, body fat, chest, waist, arms & thighs to unlock trend charts and comparison deltas."
                actionLabel="Log First Measurement"
                onAction={() => router.push("/modals/log-measurement")}
              />
            ) : (
              <>
                {/* Current Snapshot Grid */}
                <View style={styles.statGrid}>
                  <AppCard style={styles.statBox}>
                    <Text style={[TYPOGRAPHY.label, { color: colors.textMuted }]}>WEIGHT</Text>
                    <Text style={[styles.bigStat, { color: colors.text }, TABULAR_NUMS]}>
                      {latest.weight_kg}
                      <Text style={[styles.unit, { color: colors.textMuted }]}> kg</Text>
                    </Text>
                    <Text style={[TYPOGRAPHY.caption, { color: colors.textMuted }]}>
                      {latest.recorded_date}
                    </Text>
                  </AppCard>

                  <AppCard style={styles.statBox}>
                    <Text style={[TYPOGRAPHY.label, { color: colors.textMuted }]}>BMI</Text>
                    <Text style={[styles.bigStat, { color: colors.text }, TABULAR_NUMS]}>
                      {latest.bmi ?? "—"}
                    </Text>
                    <StatusPill label={bmiMeta.label} tone={bmiMeta.tone} />
                  </AppCard>

                  <AppCard style={styles.statBox}>
                    <Text style={[TYPOGRAPHY.label, { color: colors.textMuted }]}>BODY FAT</Text>
                    <Text style={[styles.bigStat, { color: colors.text }, TABULAR_NUMS]}>
                      {latest.body_fat_pct !== null ? `${latest.body_fat_pct}%` : "—"}
                    </Text>
                    <Text style={[TYPOGRAPHY.caption, { color: colors.textMuted }]}>
                      {latest.body_fat_pct !== null ? "Measured" : "Not logged"}
                    </Text>
                  </AppCard>

                  <AppCard style={styles.statBox}>
                    <Text style={[TYPOGRAPHY.label, { color: colors.textMuted }]}>HEIGHT</Text>
                    <Text style={[styles.bigStat, { color: colors.text }, TABULAR_NUMS]}>
                      {latest.height_cm !== null ? latest.height_cm : "—"}
                      {latest.height_cm !== null ? (
                        <Text style={[styles.unit, { color: colors.textMuted }]}> cm</Text>
                      ) : null}
                    </Text>
                    <Text style={[TYPOGRAPHY.caption, { color: colors.textMuted }]}>Profile stat</Text>
                  </AppCard>
                </View>

                {/* Non-clinical Health Disclaimer */}
                <View style={[styles.disclaimerRow, { backgroundColor: colors.surfaceVariant }]}>
                  <Info size={14} color={colors.textMuted} />
                  <Text style={[styles.disclaimerText, { color: colors.textMuted }]}>
                    BMI and body metrics are general fitness estimates, not clinical diagnoses.
                  </Text>
                </View>

                {/* Interactive Smooth Trend Chart */}
                <WeightChart items={measurements} />

                {/* Previous vs Current Measurement Comparison */}
                {compareRows.length > 0 ? (
                  <AppCard style={{ gap: 10 }}>
                    <View style={styles.rowBetween}>
                      <View>
                        <Text style={[TYPOGRAPHY.title, { color: colors.text }]}>
                          Latest vs Previous
                        </Text>
                        <Text style={[TYPOGRAPHY.caption, { color: colors.textMuted }, TABULAR_NUMS]}>
                          {previous?.recorded_date} → {latest.recorded_date}
                        </Text>
                      </View>
                      {latest.weight_kg <= (previous?.weight_kg ?? latest.weight_kg) ? (
                        <TrendingDown size={18} color={colors.success} />
                      ) : (
                        <TrendingUp size={18} color={colors.primary} />
                      )}
                    </View>
                    <View style={styles.compareGrid}>
                      {compareRows.map((row) => (
                        <View
                          key={row.label}
                          style={[styles.compareCell, { backgroundColor: colors.surfaceVariant }]}
                        >
                          <Text style={[TYPOGRAPHY.caption, { color: colors.textMuted }]}>
                            {row.label}
                          </Text>
                          <Text style={[TYPOGRAPHY.title, { color: colors.text }, TABULAR_NUMS]}>
                            {row.curr}
                          </Text>
                          {row.delta ? (
                            <Text
                              style={[
                                styles.deltaSmall,
                                TABULAR_NUMS,
                                {
                                  color: row.delta.startsWith("-")
                                    ? colors.success
                                    : row.delta.startsWith("+")
                                      ? colors.primary
                                      : colors.textMuted,
                                },
                              ]}
                            >
                              {row.delta}
                            </Text>
                          ) : null}
                        </View>
                      ))}
                    </View>
                  </AppCard>
                ) : null}

                {/* Full Measurement History */}
                <View>
                  <SectionHeader
                    title="Measurement History"
                    actionLabel="+ Add"
                    onAction={() => router.push("/modals/log-measurement")}
                  />
                  <View style={{ gap: 10 }}>
                    {measurements.map((item) => {
                      const thighVal = item.thigh_cm ?? thighMap[String(item.id)];
                      return (
                        <AppCard key={item.id} style={{ gap: 8 }}>
                          <View style={styles.rowBetween}>
                            <View>
                              <Text style={[TYPOGRAPHY.title, { color: colors.text }, TABULAR_NUMS]}>
                                {item.weight_kg} kg
                              </Text>
                              <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }, TABULAR_NUMS]}>
                                {item.recorded_date}
                                {item.bmi !== null ? ` · BMI ${item.bmi}` : ""}
                                {item.body_fat_pct !== null ? ` · ${item.body_fat_pct}% BF` : ""}
                              </Text>
                            </View>
                            <Pressable
                              onPress={() => confirmDeleteMeasurement(item)}
                              hitSlop={10}
                              accessibilityLabel="Delete measurement"
                              style={styles.iconBtn}
                            >
                              <Trash2 size={17} color={colors.textMuted} />
                            </Pressable>
                          </View>

                          {item.chest_cm || item.waist_cm || item.arms_cm || thighVal ? (
                            <View style={styles.chipRow}>
                              {item.chest_cm ? <StatusPill label={`Chest ${item.chest_cm}cm`} /> : null}
                              {item.waist_cm ? <StatusPill label={`Waist ${item.waist_cm}cm`} /> : null}
                              {item.arms_cm ? <StatusPill label={`Arms ${item.arms_cm}cm`} /> : null}
                              {thighVal ? <StatusPill label={`Thigh ${thighVal}cm`} /> : null}
                            </View>
                          ) : null}

                          {item.notes ? (
                            <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }]}>
                              {item.notes}
                            </Text>
                          ) : null}
                        </AppCard>
                      );
                    })}
                  </View>
                </View>
              </>
            )}
          </View>
        ) : null}

        {/* ================= PHOTOS & GOALS TAB ================= */}
        {tab === "goals" ? (
          <View style={{ gap: 16 }}>
            {/* Fitness Goals */}
            <AppCard style={{ gap: 12 }}>
              <View style={styles.rowBetween}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Target size={18} color={colors.primary} />
                  <Text style={[TYPOGRAPHY.h3, { color: colors.text }]}>Fitness Goals</Text>
                </View>
                <Pressable onPress={() => setGoalModalOpen(true)} hitSlop={8}>
                  <Text style={[styles.editLink, { color: colors.primary }]}>Edit</Text>
                </Pressable>
              </View>

              <View style={{ gap: 10 }}>
                <View style={{ gap: 5 }}>
                  <View style={styles.rowBetween}>
                    <Text style={[TYPOGRAPHY.bodyMedium, { color: colors.textSecondary }]}>
                      Weekly Workouts
                    </Text>
                    <Text style={[TYPOGRAPHY.title, { color: colors.text }, TABULAR_NUMS]}>
                      {stats.workoutsThisWeek} / {goals.weekly_workouts_target}
                    </Text>
                  </View>
                  <ProgressBar
                    progress={stats.workoutsThisWeek / Math.max(1, goals.weekly_workouts_target)}
                  />
                </View>

                <View style={{ gap: 5 }}>
                  <View style={styles.rowBetween}>
                    <Text style={[TYPOGRAPHY.bodyMedium, { color: colors.textSecondary }]}>
                      Target Weight
                    </Text>
                    <Text style={[TYPOGRAPHY.title, { color: colors.text }, TABULAR_NUMS]}>
                      {goals.target_weight_kg ? `${goals.target_weight_kg} kg` : "Not set"}
                    </Text>
                  </View>
                  {goals.target_weight_kg && latest ? (
                    <Text style={[TYPOGRAPHY.caption, { color: colors.textMuted }, TABULAR_NUMS]}>
                      Current: {latest.weight_kg} kg ·{" "}
                      {Math.abs(Number((latest.weight_kg - goals.target_weight_kg).toFixed(1)))} kg{" "}
                      {latest.weight_kg > goals.target_weight_kg ? "above" : "below"} goal
                    </Text>
                  ) : null}
                </View>
              </View>
            </AppCard>

            {/* Progress Photos */}
            <View>
              <SectionHeader
                title="Progress Photos"
                subtitle="Private & stored locally on this device"
              />
              <View style={styles.photoBtnsRow}>
                {(["Front", "Side", "Back"] as const).map((pose) => (
                  <Pressable
                    key={pose}
                    onPress={() => void handleAddPhoto(pose)}
                    style={[
                      styles.poseBtn,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                  >
                    <Camera size={16} color={colors.primary} />
                    <Text style={[styles.poseBtnText, { color: colors.text }]}>+ {pose}</Text>
                  </Pressable>
                ))}
              </View>

              {/* Side-by-Side First vs Latest Comparison */}
              {photos.length >= 2 ? (
                <AppCard style={{ marginTop: 12, gap: 10 }}>
                  <Text style={[TYPOGRAPHY.title, { color: colors.text }]}>
                    Before & Latest Comparison
                  </Text>
                  <View style={styles.comparePhotos}>
                    {[photos[photos.length - 1], photos[0]].map((p, idx) => (
                      <View key={`${p.id}-${idx}`} style={{ flex: 1, gap: 5 }}>
                        <Image source={{ uri: p.uri }} style={styles.compareImg} />
                        <Text style={[TYPOGRAPHY.caption, { color: colors.text, fontFamily: FONT.semibold }]}>
                          {idx === 0 ? "Earliest" : "Latest"} · {p.date}
                        </Text>
                        {p.weight_kg ? (
                          <Text style={[TYPOGRAPHY.caption, { color: colors.primary }, TABULAR_NUMS]}>
                            {p.weight_kg} kg
                          </Text>
                        ) : null}
                      </View>
                    ))}
                  </View>
                </AppCard>
              ) : null}

              {photos.length > 0 ? (
                <View style={styles.photoGrid}>
                  {photos.map((photo) => (
                    <Pressable
                      key={photo.id}
                      onLongPress={() => confirmDeletePhoto(photo)}
                      style={[styles.photoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    >
                      <Image source={{ uri: photo.uri }} style={styles.photoThumb} />
                      <View style={styles.photoMeta}>
                        <Text style={[styles.photoTag, { color: colors.text }]}>{photo.label}</Text>
                        <Text style={[styles.photoDate, { color: colors.textMuted }, TABULAR_NUMS]}>
                          {photo.date}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <EmptyStateCard
                  icon={<Camera size={26} color={colors.textMuted} />}
                  title="No progress photos yet"
                  description="Capture Front, Side, or Back check-ins to visually compare your transformation over time. Stored privately on your phone."
                />
              )}
            </View>
          </View>
        ) : null}

        {/* ================= ACHIEVEMENTS & BADGES TAB ================= */}
        {tab === "badges" ? (
          <View style={{ gap: 16 }}>
            {/* Real Weekly & Monthly Challenge Progress */}
            <AppCard style={{ gap: 14 }}>
              <View style={styles.rowBetween}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Flame size={18} color={colors.primary} />
                  <Text style={[TYPOGRAPHY.h3, { color: colors.text }]}>Active Challenges</Text>
                </View>
                <StatusPill
                  label={`${stats.unlockedCount}/${stats.badges.length} Badges`}
                  tone="primary"
                />
              </View>

              <View style={{ gap: 6 }}>
                <View style={styles.rowBetween}>
                  <Text style={[TYPOGRAPHY.bodyMedium, { color: colors.text }]}>
                    Weekly Training Challenge
                  </Text>
                  <Text style={[TYPOGRAPHY.caption, { color: colors.primary }, TABULAR_NUMS]}>
                    {stats.workoutsThisWeek} / {goals.weekly_workouts_target} workouts
                  </Text>
                </View>
                <ProgressBar
                  progress={stats.workoutsThisWeek / Math.max(1, goals.weekly_workouts_target)}
                />
              </View>

              <View style={{ gap: 6 }}>
                <View style={styles.rowBetween}>
                  <Text style={[TYPOGRAPHY.bodyMedium, { color: colors.text }]}>
                    Monthly Consistency (12 Visits)
                  </Text>
                  <Text style={[TYPOGRAPHY.caption, { color: colors.success }, TABULAR_NUMS]}>
                    {streak?.visits_this_month ?? 0} / 12 check-ins
                  </Text>
                </View>
                <ProgressBar
                  progress={(streak?.visits_this_month ?? 0) / 12}
                  color={colors.success}
                />
              </View>
            </AppCard>

            {/* Real Achievement Badges */}
            <View style={{ gap: 10 }}>
              <SectionHeader
                title="Milestones & Badges"
                subtitle="Earned strictly from your verified visits & workouts"
              />
              {stats.badges.map((badge) => (
                <AppCard
                  key={badge.id}
                  variant={badge.unlocked ? "accent" : "default"}
                  style={{ gap: 8 }}
                >
                  <View style={styles.rowBetween}>
                    <View style={styles.badgeLeft}>
                      <View
                        style={[
                          styles.badgeCircle,
                          {
                            backgroundColor: badge.unlocked
                              ? colors.primary
                              : colors.surfaceVariant,
                          },
                        ]}
                      >
                        <Award
                          size={19}
                          color={badge.unlocked ? "#FFFFFF" : colors.textMuted}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[TYPOGRAPHY.title, { color: colors.text }]}>
                          {badge.title}
                        </Text>
                        <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }]}>
                          {badge.description}
                        </Text>
                      </View>
                    </View>
                    <StatusPill
                      label={badge.unlocked ? "UNLOCKED" : `${Math.round(badge.progress * 100)}%`}
                      tone={badge.unlocked ? "success" : "neutral"}
                    />
                  </View>
                  <ProgressBar
                    progress={badge.progress}
                    color={badge.unlocked ? colors.success : colors.primary}
                    height={5}
                  />
                  <Text style={[TYPOGRAPHY.caption, { color: colors.textMuted }, TABULAR_NUMS]}>
                    {badge.progressLabel}
                  </Text>
                </AppCard>
              ))}
            </View>

            {/* Personal Records List */}
            {stats.personalRecords.length > 0 ? (
              <View style={{ gap: 8 }}>
                <SectionHeader title="Personal Records (PRs)" />
                <AppCard style={{ gap: 10 }}>
                  {stats.personalRecords.slice(0, 8).map((pr) => (
                    <View key={pr.exerciseName} style={styles.rowBetween}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                        <Trophy size={15} color={colors.warning} />
                        <Text style={[TYPOGRAPHY.bodyMedium, { color: colors.text }]} numberOfLines={1}>
                          {pr.exerciseName}
                        </Text>
                      </View>
                      <Text style={[TYPOGRAPHY.title, { color: colors.primary }, TABULAR_NUMS]}>
                        {pr.bestWeightKg} kg
                        {pr.repsAtBest > 0 ? ` × ${pr.repsAtBest}` : ""}
                      </Text>
                    </View>
                  ))}
                </AppCard>
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      {/* Edit Fitness Goals Sheet */}
      <BottomSheetModal
        visible={goalModalOpen}
        onClose={() => setGoalModalOpen(false)}
        title="Fitness Goals"
        subtitle="Saved on your device to track weekly progress"
      >
        <View style={{ gap: 14 }}>
          <AppInput
            label="Target Weight (kg, optional)"
            value={targetWeightInput}
            onChangeText={setTargetWeightInput}
            placeholder="e.g. 72"
            keyboardType="decimal-pad"
          />
          <AppInput
            label="Weekly Workouts Target"
            value={weeklyWorkoutsInput}
            onChangeText={setWeeklyWorkoutsInput}
            placeholder="4"
            keyboardType="number-pad"
          />
          <AppInput
            label="Weekly Gym Visits Target"
            value={weeklyVisitsInput}
            onChangeText={setWeeklyVisitsInput}
            placeholder="4"
            keyboardType="number-pad"
          />
          <AppButton label="Save Goals" onPress={() => void handleSaveGoals()} />
        </View>
      </BottomSheetModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xl,
    gap: 16,
  },
  screenHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    minHeight: 40,
    borderRadius: RADIUS.pill,
  },
  addBtnText: {
    fontFamily: FONT.bold,
    fontSize: 13,
    color: "#FFFFFF",
  },
  segmented: {
    flexDirection: "row",
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 4,
    gap: 4,
  },
  segBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: RADIUS.sm,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  segText: {
    fontFamily: FONT.semibold,
    fontSize: 12,
  },
  nutritionLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  nutIcon: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  statBox: {
    width: "48.6%",
    flexGrow: 1,
    gap: 4,
  },
  bigStat: {
    fontFamily: FONT.extrabold,
    fontSize: 22,
  },
  unit: {
    fontFamily: FONT.medium,
    fontSize: 13,
  },
  disclaimerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: RADIUS.sm,
  },
  disclaimerText: {
    fontFamily: FONT.regular,
    fontSize: 11.5,
    flex: 1,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  compareGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  compareCell: {
    width: "31%",
    flexGrow: 1,
    borderRadius: RADIUS.md,
    padding: 10,
    gap: 2,
  },
  deltaSmall: {
    fontFamily: FONT.bold,
    fontSize: 11.5,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  editLink: {
    fontFamily: FONT.semibold,
    fontSize: 13,
  },
  photoBtnsRow: {
    flexDirection: "row",
    gap: 8,
  },
  poseBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  poseBtnText: {
    fontFamily: FONT.semibold,
    fontSize: 12.5,
  },
  comparePhotos: {
    flexDirection: "row",
    gap: 10,
  },
  compareImg: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: RADIUS.md,
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
  },
  photoCard: {
    width: "48%",
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  photoThumb: {
    width: "100%",
    aspectRatio: 3 / 4,
  },
  photoMeta: {
    padding: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  photoTag: {
    fontFamily: FONT.semibold,
    fontSize: 12,
  },
  photoDate: {
    fontFamily: FONT.regular,
    fontSize: 11,
  },
  badgeLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  badgeCircle: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
});
