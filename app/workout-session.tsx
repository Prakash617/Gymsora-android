import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Clock,
  Dumbbell,
  Plus,
  Search,
  Timer,
  Trash2,
  Trophy,
  X,
  Zap,
} from "../src/components/ui/Icons";
import {
  AppButton,
  AppCard,
  AppInput,
  BottomSheetModal,
  StatusPill,
} from "../src/components/ui/Primitives";
import {
  EXERCISE_LIBRARY,
  findExerciseById,
  MUSCLE_GROUPS,
  STARTER_ROUTINES,
  type LibraryExercise,
  type MuscleGroup,
} from "../src/data/exerciseLibrary";
import { computeFitnessStats } from "../src/services/achievements";
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

interface ActiveSet {
  id: string;
  weight: string;
  reps: string;
  completed: boolean;
}

interface ActiveExercise {
  id: string;
  name: string;
  restSeconds: number;
  sets: ActiveSet[];
}

interface SummaryResult {
  title: string;
  durationMinutes: number;
  exercisesCompleted: number;
  totalSets: number;
  totalVolumeKg: number;
  newPrs: Array<{ name: string; weightKg: number; reps: number }>;
}

const CATEGORIES = ["strength", "cardio", "hiit", "mobility", "class"] as const;
const REST_PRESETS = [45, 60, 90, 120];

function formatTimer(totalSec: number): string {
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function makeExerciseFromLib(ex: LibraryExercise): ActiveExercise {
  return {
    id: `${ex.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: ex.name,
    restSeconds: ex.restSeconds || 90,
    sets: Array.from({ length: Math.max(1, ex.defaultSets) }, (_, i) => ({
      id: `s-${i}-${Math.random().toString(36).slice(2, 6)}`,
      weight: "",
      reps: String(ex.defaultReps || 10),
      completed: false,
    })),
  };
}

export default function WorkoutSessionScreen() {
  const { colors } = useGymTheme();
  const { activeGym } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ routineId?: string; exerciseId?: string }>();

  const routine = params.routineId
    ? STARTER_ROUTINES.find((r) => r.id === params.routineId)
    : undefined;
  const singleEx = params.exerciseId ? findExerciseById(params.exerciseId) : undefined;

  const [title, setTitle] = useState(
    routine?.title || (singleEx ? `${singleEx.muscleGroup} Workout` : "Strength Session"),
  );
  const [category, setCategory] = useState<string>(
    routine?.category || singleEx?.category || "strength",
  );
  const [notes, setNotes] = useState("");
  const [elapsedSec, setElapsedSec] = useState(0);
  const [restRemaining, setRestRemaining] = useState<number>(0);
  const [restPreset, setRestPreset] = useState<number>(90);

  const [exercises, setExercises] = useState<ActiveExercise[]>(() => {
    if (routine) {
      return routine.exerciseIds
        .map((id) => findExerciseById(id))
        .filter((e): e is LibraryExercise => Boolean(e))
        .map(makeExerciseFromLib);
    }
    if (singleEx) return [makeExerciseFromLib(singleEx)];
    return [];
  });

  // Exercise picker modal
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | "All">("All");
  const [customName, setCustomName] = useState("");

  // Completion summary
  const [summary, setSummary] = useState<SummaryResult | null>(null);

  // Pull existing history so we can detect genuine Personal Records on finish
  const historyQuery = useQuery({
    queryKey: queryKeys.workouts(activeGym?.slug),
    queryFn: async () => (await memberApi.workouts()).results,
    enabled: Boolean(activeGym?.slug),
  });

  const priorPrMap = useMemo(() => {
    const stats = computeFitnessStats({ workouts: historyQuery.data || [] });
    const map = new Map<string, number>();
    for (const pr of stats.personalRecords) {
      map.set(pr.exerciseName.toLowerCase(), pr.bestWeightKg);
    }
    return map;
  }, [historyQuery.data]);

  // Live elapsed workout clock
  useEffect(() => {
    if (summary) return;
    const id = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [summary]);

  // Live rest countdown timer
  useEffect(() => {
    if (restRemaining <= 0) return;
    const id = setInterval(() => {
      setRestRemaining((prev) => {
        if (prev <= 1) {
          if (Platform.OS !== "web") {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [restRemaining > 0]);

  const filteredLibrary = useMemo(() => {
    const q = search.trim().toLowerCase();
    return EXERCISE_LIBRARY.filter((ex) => {
      if (selectedMuscle !== "All" && ex.muscleGroup !== selectedMuscle) return false;
      if (!q) return true;
      return (
        ex.name.toLowerCase().includes(q) ||
        ex.muscleGroup.toLowerCase().includes(q) ||
        ex.equipment.toLowerCase().includes(q)
      );
    });
  }, [search, selectedMuscle]);

  const toggleSetDone = (exIdx: number, setIdx: number) => {
    setExercises((prev) =>
      prev.map((ex, ei) => {
        if (ei !== exIdx) return ex;
        const nextSets = ex.sets.map((s, si) => {
          if (si !== setIdx) return s;
          const nextDone = !s.completed;
          if (nextDone) {
            if (Platform.OS !== "web") {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
            setRestRemaining(restPreset);
          }
          return { ...s, completed: nextDone };
        });
        return { ...ex, sets: nextSets };
      }),
    );
  };

  const updateSetField = (
    exIdx: number,
    setIdx: number,
    field: "weight" | "reps",
    val: string,
  ) => {
    setExercises((prev) =>
      prev.map((ex, ei) =>
        ei !== exIdx
          ? ex
          : {
              ...ex,
              sets: ex.sets.map((s, si) => (si === setIdx ? { ...s, [field]: val } : s)),
            },
      ),
    );
  };

  const addSetToExercise = (exIdx: number) => {
    setExercises((prev) =>
      prev.map((ex, ei) => {
        if (ei !== exIdx) return ex;
        const last = ex.sets[ex.sets.length - 1];
        return {
          ...ex,
          sets: [
            ...ex.sets,
            {
              id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
              weight: last?.weight || "",
              reps: last?.reps || "10",
              completed: false,
            },
          ],
        };
      }),
    );
  };

  const removeExercise = (exIdx: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== exIdx));
  };

  const addCustomExercise = () => {
    const clean = customName.trim();
    if (!clean) return;
    setExercises((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        name: clean,
        restSeconds: restPreset,
        sets: [
          { id: `s1-${Date.now()}`, weight: "", reps: "10", completed: false },
          { id: `s2-${Date.now()}`, weight: "", reps: "10", completed: false },
          { id: `s3-${Date.now()}`, weight: "", reps: "10", completed: false },
        ],
      },
    ]);
    setCustomName("");
    setPickerOpen(false);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const durationMinutes = Math.max(1, Math.round(elapsedSec / 60));
      const payloadExercises = exercises
        .map((ex) => {
          const doneSets = ex.sets.filter((s) => s.completed);
          const used = doneSets.length ? doneSets : ex.sets;
          const maxWt = Math.max(0, ...used.map((s) => Number(s.weight || 0)));
          const avgReps = Math.round(
            used.reduce((sum, s) => sum + Number(s.reps || 0), 0) / Math.max(1, used.length),
          );
          return {
            name: ex.name,
            sets: used.length,
            reps: avgReps,
            weight_kg: maxWt > 0 ? maxWt : null,
          };
        })
        .filter((e) => e.name.trim());

      await memberApi.addWorkout({
        title: title.trim() || "Gym Session",
        category,
        duration_minutes: durationMinutes,
        exercises: payloadExercises,
        notes: notes.trim(),
      });

      // Compute exact summary stats from completed (or entered) sets
      let totalSets = 0;
      let totalVolumeKg = 0;
      const newPrs: SummaryResult["newPrs"] = [];

      for (const ex of exercises) {
        const activeSets = ex.sets.filter((s) => s.completed);
        const counted = activeSets.length ? activeSets : ex.sets;
        totalSets += counted.length;
        let bestWt = 0;
        let repsAtBest = 0;
        for (const s of counted) {
          const wt = Number(s.weight || 0);
          const reps = Number(s.reps || 0);
          if (wt > 0 && reps > 0) totalVolumeKg += wt * reps;
          if (wt > bestWt) {
            bestWt = wt;
            repsAtBest = reps;
          }
        }
        const prevBest = priorPrMap.get(ex.name.toLowerCase()) || 0;
        if (bestWt > 0 && bestWt > prevBest) {
          newPrs.push({ name: ex.name, weightKg: bestWt, reps: repsAtBest });
        }
      }

      return {
        title: title.trim() || "Gym Session",
        durationMinutes,
        exercisesCompleted: payloadExercises.length,
        totalSets,
        totalVolumeKg: Math.round(totalVolumeKg),
        newPrs,
      };
    },
    onSuccess: (res) => {
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      void qc.invalidateQueries({ queryKey: queryKeys.workouts(activeGym?.slug) });
      void qc.invalidateQueries({ queryKey: queryKeys.home(activeGym?.slug) });
      setSummary(res);
    },
    onError: (err: any) => {
      Alert.alert(
        "Could not save workout",
        err instanceof ApiError ? err.message : "Check your connection and try again.",
      );
    },
  });

  const confirmDiscard = () => {
    Alert.alert("Discard workout?", "Your current live session will not be saved.", [
      { text: "Keep Training", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: () => router.back() },
    ]);
  };

  // ---- Completion Celebration View ----
  if (summary) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView contentContainerStyle={styles.summaryContainer}>
          <View style={styles.celebrationBadge}>
            <Trophy size={42} color={BRAND.orange} />
          </View>
          <Text style={[TYPOGRAPHY.label, { color: colors.primary, textAlign: "center" }]}>
            WORKOUT COMPLETE
          </Text>
          <Text style={[TYPOGRAPHY.h1, { color: colors.text, textAlign: "center" }]}>
            {summary.title}
          </Text>
          <Text style={[TYPOGRAPHY.body, { color: colors.textSecondary, textAlign: "center" }]}>
            Saved to your GymSora training log. Great work showing up today.
          </Text>

          <View style={styles.summaryGrid}>
            <AppCard style={styles.summaryTile}>
              <Clock size={18} color={colors.primary} />
              <Text style={[styles.summaryVal, { color: colors.text }, TABULAR_NUMS]}>
                {summary.durationMinutes} min
              </Text>
              <Text style={[styles.summaryLbl, { color: colors.textMuted }]}>Duration</Text>
            </AppCard>
            <AppCard style={styles.summaryTile}>
              <Dumbbell size={18} color={colors.info} />
              <Text style={[styles.summaryVal, { color: colors.text }, TABULAR_NUMS]}>
                {summary.exercisesCompleted}
              </Text>
              <Text style={[styles.summaryLbl, { color: colors.textMuted }]}>Exercises</Text>
            </AppCard>
            <AppCard style={styles.summaryTile}>
              <Check size={18} color={colors.success} />
              <Text style={[styles.summaryVal, { color: colors.text }, TABULAR_NUMS]}>
                {summary.totalSets}
              </Text>
              <Text style={[styles.summaryLbl, { color: colors.textMuted }]}>Total Sets</Text>
            </AppCard>
            <AppCard style={styles.summaryTile}>
              <Zap size={18} color={colors.warning} />
              <Text style={[styles.summaryVal, { color: colors.text }, TABULAR_NUMS]}>
                {summary.totalVolumeKg.toLocaleString()} kg
              </Text>
              <Text style={[styles.summaryLbl, { color: colors.textMuted }]}>Volume Lifted</Text>
            </AppCard>
          </View>

          {summary.newPrs.length > 0 ? (
            <AppCard variant="accent" style={{ width: "100%", gap: 8 }}>
              <View style={styles.rowBetween}>
                <Text style={[TYPOGRAPHY.title, { color: colors.primary }]}>
                  New Personal Records!
                </Text>
                <Trophy size={18} color={colors.primary} />
              </View>
              {summary.newPrs.map((pr) => (
                <View key={pr.name} style={styles.rowBetween}>
                  <Text style={[TYPOGRAPHY.bodyMedium, { color: colors.text }]}>{pr.name}</Text>
                  <Text style={[TYPOGRAPHY.title, { color: colors.primary }, TABULAR_NUMS]}>
                    {pr.weightKg} kg × {pr.reps}
                  </Text>
                </View>
              ))}
            </AppCard>
          ) : null}

          <AppButton
            label="Done & View History"
            size="lg"
            onPress={() => router.replace("/(tabs)/workout")}
            style={{ width: "100%", marginTop: SPACING.md }}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Live Session Sticky Topbar */}
      <View style={[styles.topBar, { borderBottomColor: colors.borderSubtle }]}>
        <Pressable
          onPress={confirmDiscard}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Discard session"
          style={[styles.closeBtn, { backgroundColor: colors.surfaceVariant }]}
        >
          <X size={18} color={colors.text} />
        </Pressable>

        <View style={styles.clockPill}>
          <Clock size={14} color={colors.primary} />
          <Text style={[styles.clockText, { color: colors.text }, TABULAR_NUMS]}>
            {formatTimer(elapsedSec)}
          </Text>
        </View>

        <AppButton
          label="Finish"
          size="sm"
          loading={saveMutation.isPending}
          onPress={() => saveMutation.mutate()}
          style={{ paddingHorizontal: 18 }}
        />
      </View>

      {/* Active Rest Timer Banner */}
      {restRemaining > 0 ? (
        <View style={[styles.restBanner, { backgroundColor: colors.primaryContainer }]}>
          <View style={styles.restLeft}>
            <Timer size={18} color={colors.primary} />
            <Text style={[styles.restTitle, { color: colors.text }, TABULAR_NUMS]}>
              Rest · {formatTimer(restRemaining)}
            </Text>
          </View>
          <View style={styles.restBtns}>
            <Pressable
              onPress={() => setRestRemaining((r) => r + 15)}
              style={[styles.restChip, { backgroundColor: colors.surface }]}
            >
              <Text style={[styles.restChipText, { color: colors.text }]}>+15s</Text>
            </Pressable>
            <Pressable
              onPress={() => setRestRemaining(0)}
              style={[styles.restChip, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.restChipText, { color: "#FFFFFF" }]}>Skip</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Workout Title & Category */}
          <AppCard style={{ gap: 12 }}>
            <AppInput
              label="Workout Title"
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Upper Body Strength"
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6 }}
            >
              {CATEGORIES.map((c) => {
                const active = category === c;
                return (
                  <Pressable
                    key={c}
                    onPress={() => setCategory(c)}
                    style={[
                      styles.catChip,
                      {
                        backgroundColor: active ? colors.primary : colors.surfaceVariant,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.catChipText,
                        { color: active ? "#FFFFFF" : colors.textSecondary },
                      ]}
                    >
                      {c.toUpperCase()}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Default Rest Interval selector */}
            <View style={styles.rowBetween}>
              <Text style={[TYPOGRAPHY.caption, { color: colors.textMuted }]}>Auto Rest Timer</Text>
              <View style={{ flexDirection: "row", gap: 6 }}>
                {REST_PRESETS.map((sec) => (
                  <Pressable
                    key={sec}
                    onPress={() => setRestPreset(sec)}
                    style={[
                      styles.presetPill,
                      {
                        backgroundColor:
                          restPreset === sec ? colors.primaryContainer : colors.surfaceVariant,
                        borderColor: restPreset === sec ? colors.primary : "transparent",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.presetText,
                        TABULAR_NUMS,
                        { color: restPreset === sec ? colors.primary : colors.textSecondary },
                      ]}
                    >
                      {sec}s
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </AppCard>

          {/* Exercise Set Trackers */}
          {exercises.map((ex, exIdx) => (
            <AppCard key={ex.id} style={{ gap: 10 }}>
              <View style={styles.rowBetween}>
                <Text style={[TYPOGRAPHY.title, { color: colors.primary, flex: 1 }]}>
                  {ex.name}
                </Text>
                <Pressable
                  onPress={() => removeExercise(exIdx)}
                  hitSlop={8}
                  accessibilityLabel={`Remove ${ex.name}`}
                >
                  <Trash2 size={16} color={colors.textMuted} />
                </Pressable>
              </View>

              {/* Column Headers */}
              <View style={styles.setHeaderRow}>
                <Text style={[styles.colSet, { color: colors.textMuted }]}>SET</Text>
                <Text style={[styles.colInput, { color: colors.textMuted }]}>KG</Text>
                <Text style={[styles.colInput, { color: colors.textMuted }]}>REPS</Text>
                <Text style={[styles.colCheck, { color: colors.textMuted }]}>DONE</Text>
              </View>

              {ex.sets.map((s, setIdx) => (
                <View
                  key={s.id}
                  style={[
                    styles.setRow,
                    s.completed && {
                      backgroundColor: colors.successContainer,
                      borderRadius: RADIUS.sm,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.colSet,
                      TABULAR_NUMS,
                      { color: s.completed ? colors.success : colors.textSecondary },
                    ]}
                  >
                    {setIdx + 1}
                  </Text>
                  <TextInput
                    value={s.weight}
                    onChangeText={(v) => updateSetField(exIdx, setIdx, "weight", v)}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    style={[
                      styles.numInput,
                      {
                        backgroundColor: colors.surfaceVariant,
                        color: colors.text,
                      },
                    ]}
                  />
                  <TextInput
                    value={s.reps}
                    onChangeText={(v) => updateSetField(exIdx, setIdx, "reps", v)}
                    keyboardType="number-pad"
                    placeholder="10"
                    placeholderTextColor={colors.textMuted}
                    style={[
                      styles.numInput,
                      {
                        backgroundColor: colors.surfaceVariant,
                        color: colors.text,
                      },
                    ]}
                  />
                  <Pressable
                    onPress={() => toggleSetDone(exIdx, setIdx)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: s.completed }}
                    style={[
                      styles.checkBtn,
                      {
                        backgroundColor: s.completed ? colors.success : colors.surfaceVariant,
                      },
                    ]}
                  >
                    <Check size={16} color={s.completed ? "#FFFFFF" : colors.textMuted} />
                  </Pressable>
                </View>
              ))}

              <Pressable
                onPress={() => addSetToExercise(exIdx)}
                style={[styles.addSetBtn, { backgroundColor: colors.surfaceVariant }]}
              >
                <Plus size={14} color={colors.primary} />
                <Text style={[styles.addSetText, { color: colors.text }]}>Add Set</Text>
              </Pressable>
            </AppCard>
          ))}

          {/* Add Exercise Button */}
          <AppButton
            label="Add Exercise"
            variant="tonal"
            onPress={() => setPickerOpen(true)}
            icon={<Plus size={18} color={colors.onPrimaryContainer} />}
          />

          {/* Notes */}
          <AppCard>
            <AppInput
              label="Session Notes (optional)"
              value={notes}
              onChangeText={setNotes}
              placeholder="Energy level, form focus, or PR notes..."
              multiline
            />
          </AppCard>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Exercise Picker Bottom Sheet */}
      <BottomSheetModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Add Exercise"
        subtitle="Pick from the Exercise Library or enter a custom movement"
      >
        <View style={{ gap: 10 }}>
          <AppInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search bench press, squat, row..."
            leftIcon={<Search size={16} color={colors.textMuted} />}
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6 }}
          >
            {(["All", ...MUSCLE_GROUPS] as const).map((m) => {
              const active = selectedMuscle === m;
              return (
                <Pressable
                  key={m}
                  onPress={() => setSelectedMuscle(m)}
                  style={[
                    styles.catChip,
                    { backgroundColor: active ? colors.primary : colors.surfaceVariant },
                  ]}
                >
                  <Text
                    style={[
                      styles.catChipText,
                      { color: active ? "#FFFFFF" : colors.textSecondary },
                    ]}
                  >
                    {m}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <ScrollView style={{ maxHeight: 260 }} contentContainerStyle={{ gap: 8 }}>
            {filteredLibrary.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => {
                  setExercises((prev) => [...prev, makeExerciseFromLib(item)]);
                  setPickerOpen(false);
                }}
                style={[
                  styles.pickRow,
                  { backgroundColor: colors.surfaceVariant, borderColor: colors.border },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[TYPOGRAPHY.title, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[TYPOGRAPHY.caption, { color: colors.textMuted }]}>
                    {item.muscleGroup} · {item.equipment}
                  </Text>
                </View>
                <StatusPill label={`${item.defaultSets}×${item.defaultReps}`} tone="primary" />
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.customRow}>
            <View style={{ flex: 1 }}>
              <AppInput
                value={customName}
                onChangeText={setCustomName}
                placeholder="Or type custom exercise name..."
              />
            </View>
            <AppButton label="Add" size="sm" onPress={addCustomExercise} />
          </View>
        </View>
      </BottomSheetModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  clockPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  clockText: {
    fontFamily: FONT.bold,
    fontSize: 16,
  },
  restBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
  },
  restLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  restTitle: {
    fontFamily: FONT.bold,
    fontSize: 14,
  },
  restBtns: {
    flexDirection: "row",
    gap: 8,
  },
  restChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
  },
  restChipText: {
    fontFamily: FONT.bold,
    fontSize: 12,
  },
  content: {
    padding: SPACING.md,
    gap: 14,
    paddingBottom: 40,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
  },
  catChipText: {
    fontFamily: FONT.bold,
    fontSize: 11,
  },
  presetPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  presetText: {
    fontFamily: FONT.semibold,
    fontSize: 11.5,
  },
  setHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 4,
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  colSet: {
    width: 32,
    textAlign: "center",
    fontFamily: FONT.bold,
    fontSize: 12,
  },
  colInput: {
    flex: 1,
    textAlign: "center",
    fontFamily: FONT.semibold,
    fontSize: 11,
  },
  colCheck: {
    width: 44,
    textAlign: "center",
    fontFamily: FONT.semibold,
    fontSize: 11,
  },
  numInput: {
    flex: 1,
    height: 40,
    borderRadius: RADIUS.sm,
    textAlign: "center",
    fontFamily: FONT.bold,
    fontSize: 14,
  },
  checkBtn: {
    width: 44,
    height: 40,
    borderRadius: RADIUS.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  addSetBtn: {
    height: 38,
    borderRadius: RADIUS.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 2,
  },
  addSetText: {
    fontFamily: FONT.semibold,
    fontSize: 12.5,
  },
  pickRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  customRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  summaryContainer: {
    padding: SPACING.lg,
    alignItems: "center",
    gap: 14,
    paddingTop: 40,
  },
  celebrationBadge: {
    width: 88,
    height: 88,
    borderRadius: RADIUS.pill,
    backgroundColor: "rgba(230, 126, 34, 0.16)",
    borderWidth: 2,
    borderColor: BRAND.orange,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    width: "100%",
    marginTop: 8,
  },
  summaryTile: {
    width: "48%",
    flexGrow: 1,
    alignItems: "center",
    gap: 6,
    paddingVertical: 16,
  },
  summaryVal: {
    fontFamily: FONT.extrabold,
    fontSize: 20,
  },
  summaryLbl: {
    fontFamily: FONT.medium,
    fontSize: 11.5,
  },
});
