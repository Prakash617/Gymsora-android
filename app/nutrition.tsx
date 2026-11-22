import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  CircleMinus,
  CirclePlus,
  Droplet,
  Flame,
  Info,
  Plus,
  Settings,
  Trash2,
  Utensils,
} from "../src/components/ui/Icons";
import {
  AppButton,
  AppCard,
  AppInput,
  BottomSheetModal,
  ProgressBar,
  StatusPill,
} from "../src/components/ui/Primitives";
import {
  localDb,
  type DailyNutritionLog,
  type MealEntry,
  type MealSlot,
  type NutritionGoals,
} from "../src/services/localDb";
import { memberApi } from "../src/services/endpoints";
import { queryKeys } from "../src/services/queryClient";
import { useAuth } from "../src/store/authStore";
import { useGymTheme } from "../src/theme/GymThemeProvider";
import {
  FONT,
  RADIUS,
  SPACING,
  TABULAR_NUMS,
  TYPOGRAPHY,
} from "../src/theme/tokens";

const SLOTS: Array<{ key: MealSlot; label: string }> = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
  { key: "snacks", label: "Snacks" },
];

function dateIsoOffset(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export default function NutritionScreen() {
  const { colors } = useGymTheme();
  const { activeGym } = useAuth();
  const qc = useQueryClient();
  const slug = activeGym?.slug || "default";

  const [dayOffset, setDayOffset] = useState(0);
  const dateIso = useMemo(() => dateIsoOffset(dayOffset), [dayOffset]);

  // Goals are explicitly user-configured (null until user sets targets — never invented)
  const [goals, setGoals] = useState<NutritionGoals | null>(null);
  const [dayLog, setDayLog] = useState<DailyNutritionLog>({
    date: dateIso,
    water_ml: 0,
    meals: [],
  });

  // Goal editor modal
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [calTarget, setCalTarget] = useState("");
  const [proTarget, setProTarget] = useState("");
  const [carbTarget, setCarbTarget] = useState("");
  const [fatTarget, setFatTarget] = useState("");
  const [waterTarget, setWaterTarget] = useState("2500");

  // Add Meal modal
  const [mealOpen, setMealOpen] = useState(false);
  const [mealSlot, setMealSlot] = useState<MealSlot>("breakfast");
  const [mealName, setMealName] = useState("");
  const [mealCal, setMealCal] = useState("");
  const [mealPro, setMealPro] = useState("");
  const [mealCarb, setMealCarb] = useState("");
  const [mealFat, setMealFat] = useState("");

  useEffect(() => {
    localDb.loadNutritionGoals(slug).then((g) => {
      if (g) {
        setGoals(g);
        setCalTarget(String(g.calories));
        setProTarget(String(g.protein_g));
        setCarbTarget(String(g.carbs_g));
        setFatTarget(String(g.fat_g));
        setWaterTarget(String(g.water_ml));
      }
    });
  }, [slug]);

  useEffect(() => {
    localDb.loadNutritionDay(slug, dateIso).then((saved) => {
      setDayLog(saved || { date: dateIso, water_ml: 0, meals: [] });
    });
  }, [slug, dateIso]);

  const nutritionQuery = useQuery({
    queryKey: queryKeys.nutrition(activeGym?.slug, dateIso),
    queryFn: async () => {
      const res = await memberApi.nutritionDay(dateIso);
      if (res.goals) {
        setGoals(res.goals);
        setCalTarget(String(res.goals.calories));
        setProTarget(String(res.goals.protein_g));
        setCarbTarget(String(res.goals.carbs_g));
        setFatTarget(String(res.goals.fat_g));
        setWaterTarget(String(res.goals.water_ml));
        void localDb.saveNutritionGoals(slug, res.goals);
      }
      const syncedDay: DailyNutritionLog = {
        date: res.date,
        water_ml: res.water_ml,
        meals: (res.meals || []).map((m) => ({
          id: String(m.id),
          slot: m.slot as MealSlot,
          name: m.name,
          calories: m.calories,
          protein_g: m.protein_g,
          carbs_g: m.carbs_g,
          fat_g: m.fat_g,
          created_at: m.created_at,
        })),
      };
      setDayLog(syncedDay);
      void localDb.saveNutritionDay(slug, dateIso, syncedDay);
      return res;
    },
    enabled: Boolean(activeGym?.slug),
  });

  const persistDay = async (next: DailyNutritionLog) => {
    setDayLog(next);
    await localDb.saveNutritionDay(slug, dateIso, next);
  };

  const totals = useMemo(() => {
    return dayLog.meals.reduce(
      (acc, m) => ({
        calories: acc.calories + Number(m.calories || 0),
        protein: acc.protein + Number(m.protein_g || 0),
        carbs: acc.carbs + Number(m.carbs_g || 0),
        fat: acc.fat + Number(m.fat_g || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
  }, [dayLog.meals]);

  const adjustWater = (deltaMl: number) => {
    const nextMl = Math.max(0, Math.min(10000, dayLog.water_ml + deltaMl));
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    void persistDay({ ...dayLog, water_ml: nextMl });
    memberApi.saveWaterIntake(dateIso, nextMl).catch(() => undefined);
  };

  const handleSaveGoals = async () => {
    const cals = Number(calTarget);
    if (!Number.isFinite(cals) || cals < 500 || cals > 10000) {
      Alert.alert("Invalid calorie target", "Enter a daily calorie goal between 500 and 10,000 kcal.");
      return;
    }
    const next: NutritionGoals = {
      calories: Math.round(cals),
      protein_g: Math.max(0, Math.round(Number(proTarget) || 0)),
      carbs_g: Math.max(0, Math.round(Number(carbTarget) || 0)),
      fat_g: Math.max(0, Math.round(Number(fatTarget) || 0)),
      water_ml: Math.max(500, Math.round(Number(waterTarget) || 2500)),
      updated_at: new Date().toISOString(),
    };
    setGoals(next);
    await localDb.saveNutritionGoals(slug, next);
    try {
      await memberApi.saveNutritionGoals(next);
      void qc.invalidateQueries({ queryKey: queryKeys.nutrition(activeGym?.slug, dateIso) });
    } catch {
      /* saved offline */
    }
    setGoalsOpen(false);
    if (Platform.OS !== "web") {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const openMealModal = (slot: MealSlot) => {
    setMealSlot(slot);
    setMealName("");
    setMealCal("");
    setMealPro("");
    setMealCarb("");
    setMealFat("");
    setMealOpen(true);
  };

  const handleAddMeal = async () => {
    const name = mealName.trim();
    const calories = Number(mealCal);
    if (!name) {
      Alert.alert("Required", "Enter a meal or food description.");
      return;
    }
    if (!Number.isFinite(calories) || calories < 0) {
      Alert.alert("Required", "Enter calories from the nutrition label or your estimate.");
      return;
    }
    const payload = {
      log_date: dateIso,
      slot: mealSlot,
      name,
      calories: Math.round(calories),
      protein_g: Math.max(0, Math.round(Number(mealPro) || 0)),
      carbs_g: Math.max(0, Math.round(Number(mealCarb) || 0)),
      fat_g: Math.max(0, Math.round(Number(mealFat) || 0)),
    };
    let entry: MealEntry = {
      id: `local-${Date.now()}`,
      slot: mealSlot,
      name: payload.name,
      calories: payload.calories,
      protein_g: payload.protein_g,
      carbs_g: payload.carbs_g,
      fat_g: payload.fat_g,
      created_at: new Date().toISOString(),
    };
    try {
      const saved = await memberApi.addNutritionMeal(payload);
      entry = { ...entry, id: String(saved.id), created_at: saved.created_at };
      void qc.invalidateQueries({ queryKey: queryKeys.nutrition(activeGym?.slug, dateIso) });
    } catch {
      /* offline cache preserved */
    }
    await persistDay({ ...dayLog, meals: [...dayLog.meals, entry] });
    setMealOpen(false);
    if (Platform.OS !== "web") {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const removeMeal = (id: string) => {
    void persistDay({ ...dayLog, meals: dayLog.meals.filter((m) => m.id !== id) });
    if (/^\d+$/.test(id)) {
      memberApi.deleteNutritionMeal(Number(id)).catch(() => undefined);
    }
  };

  const waterGoal = goals?.water_ml || 2500;
  const calGoal = goals?.calories || 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Date Switcher */}
        <AppCard style={styles.dateBar}>
          <Pressable
            onPress={() => setDayOffset((d) => d - 1)}
            hitSlop={10}
            style={[styles.navBtn, { backgroundColor: colors.surfaceVariant }]}
          >
            <ChevronLeft size={18} color={colors.text} />
          </Pressable>
          <View style={{ alignItems: "center" }}>
            <Text style={[TYPOGRAPHY.title, { color: colors.text }]}>
              {dayOffset === 0 ? "Today" : dayOffset === -1 ? "Yesterday" : dateIso}
            </Text>
            <Text style={[TYPOGRAPHY.caption, { color: colors.textMuted }, TABULAR_NUMS]}>
              {dateIso}
            </Text>
          </View>
          <Pressable
            onPress={() => setDayOffset((d) => Math.min(0, d + 1))}
            disabled={dayOffset >= 0}
            hitSlop={10}
            style={[
              styles.navBtn,
              { backgroundColor: colors.surfaceVariant, opacity: dayOffset >= 0 ? 0.35 : 1 },
            ]}
          >
            <ChevronRight size={18} color={colors.text} />
          </Pressable>
        </AppCard>

        {/* Calories & Macros Overview */}
        <AppCard variant="elevated" style={{ gap: 14 }}>
          <View style={styles.rowBetween}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Flame size={19} color={colors.primary} />
              <Text style={[TYPOGRAPHY.h3, { color: colors.text }]}>Daily Intake</Text>
            </View>
            <Pressable
              onPress={() => setGoalsOpen(true)}
              style={[styles.goalChip, { backgroundColor: colors.surfaceVariant }]}
            >
              <Settings size={13} color={colors.primary} />
              <Text style={[styles.goalChipText, { color: colors.text }]}>
                {goals ? "Edit Targets" : "Set Targets"}
              </Text>
            </Pressable>
          </View>

          <View style={styles.calHeroRow}>
            <View>
              <Text style={[styles.calBig, { color: colors.text }, TABULAR_NUMS]}>
                {totals.calories.toLocaleString()}
                <Text style={[styles.calUnit, { color: colors.textMuted }]}> kcal</Text>
              </Text>
              <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }, TABULAR_NUMS]}>
                {calGoal > 0
                  ? `${Math.max(0, calGoal - totals.calories).toLocaleString()} kcal remaining of ${calGoal.toLocaleString()}`
                  : "Set your daily calorie & macro goals to track targets"}
              </Text>
            </View>
          </View>

          {calGoal > 0 ? <ProgressBar progress={totals.calories / calGoal} height={8} /> : null}

          {/* Macro Trio */}
          <View style={styles.macroRow}>
            {[
              { label: "Protein", val: totals.protein, goal: goals?.protein_g || 0, color: colors.primary },
              { label: "Carbs", val: totals.carbs, goal: goals?.carbs_g || 0, color: colors.info },
              { label: "Fat", val: totals.fat, goal: goals?.fat_g || 0, color: colors.warning },
            ].map((m) => (
              <View
                key={m.label}
                style={[styles.macroBox, { backgroundColor: colors.surfaceVariant }]}
              >
                <Text style={[TYPOGRAPHY.caption, { color: colors.textMuted }]}>{m.label}</Text>
                <Text style={[TYPOGRAPHY.title, { color: colors.text }, TABULAR_NUMS]}>
                  {m.val}g
                  {m.goal > 0 ? (
                    <Text style={{ fontSize: 11, color: colors.textMuted }}> / {m.goal}g</Text>
                  ) : null}
                </Text>
                {m.goal > 0 ? (
                  <ProgressBar progress={m.val / m.goal} color={m.color} height={5} />
                ) : null}
              </View>
            ))}
          </View>

          <View style={styles.infoNote}>
            <Info size={13} color={colors.textMuted} />
            <Text style={[styles.infoText, { color: colors.textMuted }]}>
              User-entered values stored privately on this device. No values are fabricated.
            </Text>
          </View>
        </AppCard>

        {/* Water Intake Card */}
        <AppCard style={{ gap: 12 }}>
          <View style={styles.rowBetween}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={[styles.waterBadge, { backgroundColor: colors.infoContainer }]}>
                <Droplet size={17} color={colors.info} />
              </View>
              <View>
                <Text style={[TYPOGRAPHY.title, { color: colors.text }]}>Hydration</Text>
                <Text style={[TYPOGRAPHY.caption, { color: colors.textMuted }, TABULAR_NUMS]}>
                  {(dayLog.water_ml / 1000).toFixed(2)} L / {(waterGoal / 1000).toFixed(1)} L
                </Text>
              </View>
            </View>
            <StatusPill
              label={`${Math.round((dayLog.water_ml / Math.max(1, waterGoal)) * 100)}%`}
              tone="info"
            />
          </View>

          <ProgressBar progress={dayLog.water_ml / Math.max(1, waterGoal)} color={colors.info} height={8} />

          <View style={styles.waterControls}>
            <Pressable
              onPress={() => adjustWater(-250)}
              style={[styles.waterBtn, { backgroundColor: colors.surfaceVariant }]}
            >
              <CircleMinus size={16} color={colors.textSecondary} />
              <Text style={[styles.waterBtnText, { color: colors.textSecondary }]}>-250ml</Text>
            </Pressable>
            <Pressable
              onPress={() => adjustWater(250)}
              style={[styles.waterBtn, { backgroundColor: colors.infoContainer }]}
            >
              <CirclePlus size={16} color={colors.info} />
              <Text style={[styles.waterBtnText, { color: colors.info }]}>+250ml</Text>
            </Pressable>
            <Pressable
              onPress={() => adjustWater(500)}
              style={[styles.waterBtn, { backgroundColor: colors.infoContainer }]}
            >
              <CirclePlus size={16} color={colors.info} />
              <Text style={[styles.waterBtnText, { color: colors.info }]}>+500ml</Text>
            </Pressable>
          </View>
        </AppCard>

        {/* Meal Slots */}
        {SLOTS.map((slot) => {
          const items = dayLog.meals.filter((m) => m.slot === slot.key);
          const slotCals = items.reduce((s, m) => s + m.calories, 0);
          return (
            <AppCard key={slot.key} style={{ gap: 10 }}>
              <View style={styles.rowBetween}>
                <View>
                  <Text style={[TYPOGRAPHY.title, { color: colors.text }]}>{slot.label}</Text>
                  <Text style={[TYPOGRAPHY.caption, { color: colors.textMuted }, TABULAR_NUMS]}>
                    {items.length ? `${slotCals} kcal` : "Nothing logged yet"}
                  </Text>
                </View>
                <Pressable
                  onPress={() => openMealModal(slot.key)}
                  style={[styles.addMealBtn, { backgroundColor: colors.primaryContainer }]}
                >
                  <Plus size={14} color={colors.primary} />
                  <Text style={[styles.addMealText, { color: colors.primary }]}>Add</Text>
                </Pressable>
              </View>

              {items.map((entry) => (
                <View
                  key={entry.id}
                  style={[styles.mealRow, { borderTopColor: colors.borderSubtle }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[TYPOGRAPHY.bodyMedium, { color: colors.text }]}>{entry.name}</Text>
                    <Text style={[TYPOGRAPHY.caption, { color: colors.textMuted }, TABULAR_NUMS]}>
                      {entry.calories} kcal · P {entry.protein_g}g · C {entry.carbs_g}g · F {entry.fat_g}g
                    </Text>
                  </View>
                  <Pressable onPress={() => removeMeal(entry.id)} hitSlop={8}>
                    <Trash2 size={16} color={colors.textMuted} />
                  </Pressable>
                </View>
              ))}
            </AppCard>
          );
        })}

        {/* Live Trainer-Assigned Diet Plan (when assigned) */}
        {nutritionQuery.data?.diet_plan ? (
          <AppCard variant="accent" style={{ gap: 8 }}>
            <View style={styles.rowBetween}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Utensils size={16} color={colors.primary} />
                <Text style={[TYPOGRAPHY.title, { color: colors.text }]}>
                  {nutritionQuery.data.diet_plan.title}
                </Text>
              </View>
              <StatusPill label="COACH PLAN" tone="primary" />
            </View>
            {nutritionQuery.data.diet_plan.trainer_name ? (
              <Text style={[TYPOGRAPHY.caption, { color: colors.primary }]}>
                Assigned by {nutritionQuery.data.diet_plan.trainer_name}
              </Text>
            ) : null}
            {nutritionQuery.data.diet_plan.daily_calories ? (
              <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }, TABULAR_NUMS]}>
                Target: {nutritionQuery.data.diet_plan.daily_calories} kcal · P{" "}
                {nutritionQuery.data.diet_plan.protein_g ?? "—"}g · C{" "}
                {nutritionQuery.data.diet_plan.carbs_g ?? "—"}g · F{" "}
                {nutritionQuery.data.diet_plan.fat_g ?? "—"}g
              </Text>
            ) : null}
            {nutritionQuery.data.diet_plan.notes ? (
              <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }]}>
                {nutritionQuery.data.diet_plan.notes}
              </Text>
            ) : null}
          </AppCard>
        ) : (
          <AppCard variant="subtle" style={{ gap: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Utensils size={16} color={colors.primary} />
              <Text style={[TYPOGRAPHY.title, { color: colors.text }]}>
                Trainer-Assigned Diet Plans
              </Text>
            </View>
            <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }]}>
              No coach diet plan is assigned to your profile yet. Your personal meals & water sync directly to your GymSora account.
            </Text>
          </AppCard>
        )}
      </ScrollView>

      {/* Edit Nutrition Targets Modal */}
      <BottomSheetModal
        visible={goalsOpen}
        onClose={() => setGoalsOpen(false)}
        title="Daily Nutrition Targets"
        subtitle="Enter targets recommended by your coach or personal plan"
      >
        <View style={{ gap: 12 }}>
          <AppInput
            label="Daily Calories (kcal) *"
            value={calTarget}
            onChangeText={setCalTarget}
            placeholder="e.g. 2200"
            keyboardType="number-pad"
          />
          <View style={styles.rowGap}>
            <View style={{ flex: 1 }}>
              <AppInput
                label="Protein (g)"
                value={proTarget}
                onChangeText={setProTarget}
                placeholder="150"
                keyboardType="number-pad"
              />
            </View>
            <View style={{ flex: 1 }}>
              <AppInput
                label="Carbs (g)"
                value={carbTarget}
                onChangeText={setCarbTarget}
                placeholder="220"
                keyboardType="number-pad"
              />
            </View>
            <View style={{ flex: 1 }}>
              <AppInput
                label="Fat (g)"
                value={fatTarget}
                onChangeText={setFatTarget}
                placeholder="70"
                keyboardType="number-pad"
              />
            </View>
          </View>
          <AppInput
            label="Daily Water Goal (ml)"
            value={waterTarget}
            onChangeText={setWaterTarget}
            placeholder="2500"
            keyboardType="number-pad"
          />
          <AppButton label="Save Targets" onPress={() => void handleSaveGoals()} />
        </View>
      </BottomSheetModal>

      {/* Log Meal Modal */}
      <BottomSheetModal
        visible={mealOpen}
        onClose={() => setMealOpen(false)}
        title={`Add ${SLOTS.find((s) => s.key === mealSlot)?.label || "Meal"}`}
        subtitle="Enter exact nutrition values from your food label"
      >
        <View style={{ gap: 12 }}>
          <AppInput
            label="Food / Meal Name *"
            value={mealName}
            onChangeText={setMealName}
            placeholder="e.g. Oats, Whey & Banana"
          />
          <AppInput
            label="Calories (kcal) *"
            value={mealCal}
            onChangeText={setMealCal}
            placeholder="e.g. 420"
            keyboardType="number-pad"
          />
          <View style={styles.rowGap}>
            <View style={{ flex: 1 }}>
              <AppInput
                label="Protein (g)"
                value={mealPro}
                onChangeText={setMealPro}
                placeholder="0"
                keyboardType="number-pad"
              />
            </View>
            <View style={{ flex: 1 }}>
              <AppInput
                label="Carbs (g)"
                value={mealCarb}
                onChangeText={setMealCarb}
                placeholder="0"
                keyboardType="number-pad"
              />
            </View>
            <View style={{ flex: 1 }}>
              <AppInput
                label="Fat (g)"
                value={mealFat}
                onChangeText={setMealFat}
                placeholder="0"
                keyboardType="number-pad"
              />
            </View>
          </View>
          <AppButton label="Save Meal Entry" onPress={() => void handleAddMeal()} />
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
  dateBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  rowGap: {
    flexDirection: "row",
    gap: 8,
  },
  goalChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
  },
  goalChipText: {
    fontFamily: FONT.semibold,
    fontSize: 11.5,
  },
  calHeroRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  calBig: {
    fontFamily: FONT.extrabold,
    fontSize: 30,
  },
  calUnit: {
    fontFamily: FONT.medium,
    fontSize: 14,
  },
  macroRow: {
    flexDirection: "row",
    gap: 8,
  },
  macroBox: {
    flex: 1,
    borderRadius: RADIUS.md,
    padding: 10,
    gap: 5,
  },
  infoNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoText: {
    fontFamily: FONT.regular,
    fontSize: 11,
    flex: 1,
  },
  waterBadge: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  waterControls: {
    flexDirection: "row",
    gap: 8,
  },
  waterBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: RADIUS.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  waterBtnText: {
    fontFamily: FONT.bold,
    fontSize: 12.5,
  },
  addMealBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
  },
  addMealText: {
    fontFamily: FONT.bold,
    fontSize: 12,
  },
  mealRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
