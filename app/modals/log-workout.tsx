import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "../../src/components/ui/Icons";
import { AppButton, AppCard, AppInput } from "../../src/components/ui/Primitives";
import { ApiError } from "../../src/services/api";
import { memberApi } from "../../src/services/endpoints";
import { queryKeys } from "../../src/services/queryClient";
import { useAuth } from "../../src/store/authStore";
import { useGymTheme } from "../../src/theme/GymThemeProvider";
import { FONT, RADIUS, SPACING, TYPOGRAPHY } from "../../src/theme/tokens";

const CATEGORIES = [
  { key: "strength", label: "Strength" },
  { key: "cardio", label: "Cardio" },
  { key: "hiit", label: "HIIT" },
  { key: "mobility", label: "Mobility" },
  { key: "class", label: "Class" },
];

interface DraftExercise {
  name: string;
  sets: string;
  reps: string;
  weight_kg: string;
}

export default function LogWorkoutModal() {
  const { colors } = useGymTheme();
  const { activeGym } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("strength");
  const [duration, setDuration] = useState("45");
  const [calories, setCalories] = useState("");
  const [notes, setNotes] = useState("");
  const [exercises, setExercises] = useState<DraftExercise[]>([
    { name: "", sets: "3", reps: "10", weight_kg: "" },
  ]);
  const [errorMsg, setErrorMsg] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      memberApi.addWorkout({
        title: title.trim(),
        category,
        duration_minutes: Math.max(1, Number(duration) || 45),
        calories_burned: calories ? Number(calories) : null,
        exercises: exercises
          .filter((e) => e.name.trim())
          .map((e) => ({
            name: e.name.trim(),
            sets: Number(e.sets) || 0,
            reps: Number(e.reps) || 0,
            weight_kg: e.weight_kg ? Number(e.weight_kg) : null,
          })),
        notes: notes.trim(),
      }),
    onSuccess: () => {
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      void qc.invalidateQueries({ queryKey: queryKeys.workouts(activeGym?.slug) });
      void qc.invalidateQueries({ queryKey: queryKeys.home(activeGym?.slug) });
      router.back();
    },
    onError: (err: any) => {
      setErrorMsg(err instanceof ApiError ? err.message : "Could not save workout.");
    },
  });

  const updateExercise = (idx: number, field: keyof DraftExercise, value: string) => {
    setExercises((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)),
    );
  };

  const handleSave = () => {
    if (!title.trim()) {
      setErrorMsg("Enter a workout title (e.g. Push Day, Leg Day, 5K Run).");
      return;
    }
    setErrorMsg("");
    mutation.mutate();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {errorMsg ? (
            <View style={[styles.errBox, { backgroundColor: colors.errorContainer }]}>
              <Text style={{ color: colors.error, fontFamily: FONT.semibold, fontSize: 13 }}>
                {errorMsg}
              </Text>
            </View>
          ) : null}

          <AppCard style={{ gap: SPACING.md }}>
            <AppInput
              label="Workout Title *"
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Upper Body Push"
            />

            <View style={{ gap: 6 }}>
              <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary, fontFamily: FONT.semibold }]}>
                Category
              </Text>
              <View style={styles.chipWrap}>
                {CATEGORIES.map((c) => {
                  const active = category === c.key;
                  return (
                    <Pressable
                      key={c.key}
                      onPress={() => setCategory(c.key)}
                      style={[
                        styles.chip,
                        { backgroundColor: active ? colors.primary : colors.surfaceVariant },
                      ]}
                    >
                      <Text
                        style={{
                          fontFamily: FONT.semibold,
                          fontSize: 12,
                          color: active ? "#FFFFFF" : colors.textSecondary,
                        }}
                      >
                        {c.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <AppInput
                  label="Duration (min)"
                  value={duration}
                  onChangeText={setDuration}
                  keyboardType="number-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <AppInput
                  label="Calories (optional)"
                  value={calories}
                  onChangeText={setCalories}
                  placeholder="e.g. 380"
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={{ gap: 10 }}>
              <View style={styles.rowBetween}>
                <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary, fontFamily: FONT.semibold }]}>
                  Exercises
                </Text>
                <Pressable
                  onPress={() =>
                    setExercises((prev) => [
                      ...prev,
                      { name: "", sets: "3", reps: "10", weight_kg: "" },
                    ])
                  }
                  style={styles.addLink}
                >
                  <Plus size={15} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontFamily: FONT.bold, fontSize: 12.5 }}>
                    Add Exercise
                  </Text>
                </Pressable>
              </View>

              {exercises.map((ex, idx) => (
                <View
                  key={idx}
                  style={[styles.exerciseCard, { backgroundColor: colors.surfaceVariant }]}
                >
                  <View style={styles.rowBetween}>
                    <TextInput
                      value={ex.name}
                      onChangeText={(v) => updateExercise(idx, "name", v)}
                      placeholder="Exercise (e.g. Bench Press)"
                      placeholderTextColor={colors.textMuted}
                      style={[
                        styles.exInput,
                        { flex: 1, backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
                      ]}
                    />
                    {exercises.length > 1 ? (
                      <Pressable
                        onPress={() => setExercises((prev) => prev.filter((_, i) => i !== idx))}
                        style={styles.trashBtn}
                        accessibilityLabel="Remove exercise"
                      >
                        <Trash2 size={16} color={colors.error} />
                      </Pressable>
                    ) : null}
                  </View>
                  <View style={styles.row}>
                    <TextInput
                      value={ex.sets}
                      onChangeText={(v) => updateExercise(idx, "sets", v)}
                      placeholder="Sets"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="number-pad"
                      style={[
                        styles.exInput,
                        { flex: 1, textAlign: "center", backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
                      ]}
                    />
                    <TextInput
                      value={ex.reps}
                      onChangeText={(v) => updateExercise(idx, "reps", v)}
                      placeholder="Reps"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="number-pad"
                      style={[
                        styles.exInput,
                        { flex: 1, textAlign: "center", backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
                      ]}
                    />
                    <TextInput
                      value={ex.weight_kg}
                      onChangeText={(v) => updateExercise(idx, "weight_kg", v)}
                      placeholder="Weight kg"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="decimal-pad"
                      style={[
                        styles.exInput,
                        { flex: 1, textAlign: "center", backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>

            <AppInput
              label="Notes (optional)"
              value={notes}
              onChangeText={setNotes}
              placeholder="Felt strong, hit new PR..."
              multiline
            />

            <AppButton
              label="Save Workout"
              loading={mutation.isPending}
              onPress={handleSave}
            />
          </AppCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.md,
    gap: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  errBox: {
    padding: 12,
    borderRadius: RADIUS.md,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  addLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
  },
  exerciseCard: {
    padding: 10,
    borderRadius: RADIUS.md,
    gap: 8,
  },
  exInput: {
    height: 42,
    borderRadius: RADIUS.sm,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    fontFamily: FONT.medium,
    fontSize: 13.5,
  },
  trashBtn: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
});
