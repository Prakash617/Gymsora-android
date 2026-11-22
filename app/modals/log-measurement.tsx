import React, { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
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
import * as Haptics from "expo-haptics";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Info } from "../../src/components/ui/Icons";
import { AppButton, AppCard, AppInput } from "../../src/components/ui/Primitives";
import { ApiError } from "../../src/services/api";
import { memberApi } from "../../src/services/endpoints";
import { localDb } from "../../src/services/localDb";
import { queryKeys } from "../../src/services/queryClient";
import { useAuth } from "../../src/store/authStore";
import { useGymTheme } from "../../src/theme/GymThemeProvider";
import { FONT, RADIUS, SPACING, TABULAR_NUMS } from "../../src/theme/tokens";

const optNum = z
  .string()
  .trim()
  .optional()
  .refine(
    (v) => !v || (!Number.isNaN(Number(v)) && Number(v) > 0),
    "Enter a valid positive number",
  );

const schema = z.object({
  weight_kg: z
    .string()
    .trim()
    .min(1, "Weight is required")
    .refine(
      (v) => !Number.isNaN(Number(v)) && Number(v) >= 20 && Number(v) <= 350,
      "Weight must be 20–350 kg",
    ),
  height_cm: optNum,
  body_fat_pct: optNum,
  chest_cm: optNum,
  waist_cm: optNum,
  arms_cm: optNum,
  thigh_cm: optNum,
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function LogMeasurementModal() {
  const { colors } = useGymTheme();
  const { activeGym } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [serverError, setServerError] = useState("");

  const {
    control,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      weight_kg: "",
      height_cm: "",
      body_fat_pct: "",
      chest_cm: "",
      waist_cm: "",
      arms_cm: "",
      thigh_cm: "",
      notes: "",
    },
  });

  const w = watch("weight_kg");
  const h = watch("height_cm");
  const liveBmi = useMemo(() => {
    const wn = Number(w);
    const hn = Number(h);
    if (!wn || !hn || hn < 80) return null;
    const m = hn / 100;
    return (wn / (m * m)).toFixed(1);
  }, [w, h]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const created = await memberApi.addMeasurement({
        weight_kg: Number(values.weight_kg),
        height_cm: values.height_cm ? Number(values.height_cm) : null,
        body_fat_pct: values.body_fat_pct ? Number(values.body_fat_pct) : null,
        chest_cm: values.chest_cm ? Number(values.chest_cm) : null,
        waist_cm: values.waist_cm ? Number(values.waist_cm) : null,
        arms_cm: values.arms_cm ? Number(values.arms_cm) : null,
        thigh_cm: values.thigh_cm ? Number(values.thigh_cm) : null,
        notes: values.notes?.trim() || "",
      });

      if (values.thigh_cm && activeGym?.slug && created?.id) {
        const current = (await localDb.loadThighMap(activeGym.slug)) || {};
        current[String(created.id)] = Number(values.thigh_cm);
        await localDb.saveThighMap(activeGym.slug, current);
      }
      return created;
    },
    onSuccess: () => {
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      void qc.invalidateQueries({ queryKey: queryKeys.measurements(activeGym?.slug) });
      void qc.invalidateQueries({ queryKey: queryKeys.home(activeGym?.slug) });
      router.back();
    },
    onError: (err: any) => {
      setServerError(err instanceof ApiError ? err.message : "Could not save measurement.");
    },
  });

  const renderField = (
    name: keyof FormValues,
    label: string,
    placeholder: string,
    keyboard: "decimal-pad" | "default" = "decimal-pad",
  ) => (
    <View style={{ flex: 1 }}>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, onBlur, value } }) => (
          <AppInput
            label={label}
            value={value || ""}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder={placeholder}
            keyboardType={keyboard}
            error={errors[name]?.message}
          />
        )}
      />
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {serverError ? (
            <View style={[styles.errBox, { backgroundColor: colors.errorContainer }]}>
              <Text style={{ color: colors.error, fontFamily: FONT.semibold, fontSize: 13 }}>
                {serverError}
              </Text>
            </View>
          ) : null}

          <AppCard style={{ gap: SPACING.md }}>
            <View style={styles.row}>
              {renderField("weight_kg", "Weight (kg) *", "e.g. 72.5")}
              {renderField("height_cm", "Height (cm)", "e.g. 175")}
            </View>

            {liveBmi ? (
              <View style={[styles.bmiBanner, { backgroundColor: colors.primaryContainer }]}>
                <Text
                  style={[
                    { color: colors.onPrimaryContainer, fontFamily: FONT.bold, fontSize: 13 },
                    TABULAR_NUMS,
                  ]}
                >
                  Estimated BMI: {liveBmi}
                </Text>
                <Text style={{ color: colors.textSecondary, fontFamily: FONT.regular, fontSize: 11 }}>
                  Wellness estimate only — not a clinical measurement.
                </Text>
              </View>
            ) : null}

            <View style={styles.row}>
              {renderField("body_fat_pct", "Body Fat (%)", "Measured")}
              {renderField("chest_cm", "Chest (cm)", "Optional")}
            </View>

            <View style={styles.row}>
              {renderField("waist_cm", "Waist (cm)", "Optional")}
              {renderField("arms_cm", "Arms (cm)", "Optional")}
            </View>

            <View style={styles.row}>
              {renderField("thigh_cm", "Thigh (cm)", "Optional")}
              <View style={{ flex: 1 }} />
            </View>

            {renderField("notes", "Notes", "Morning weigh-in, fasted...", "default")}

            <View style={styles.noteRow}>
              <Info size={13} color={colors.textMuted} />
              <Text style={[styles.noteText, { color: colors.textMuted }]}>
                Height carries forward automatically from your previous log if left blank.
              </Text>
            </View>

            <AppButton
              label="Save Measurement"
              loading={mutation.isPending}
              onPress={handleSubmit((v) => {
                setServerError("");
                mutation.mutate(v);
              })}
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
  row: {
    flexDirection: "row",
    gap: 10,
  },
  bmiBanner: {
    padding: 12,
    borderRadius: RADIUS.md,
    gap: 2,
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  noteText: {
    fontFamily: FONT.regular,
    fontSize: 11.5,
    flex: 1,
  },
});
