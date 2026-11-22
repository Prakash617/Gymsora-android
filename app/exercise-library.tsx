import React, { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import {
  ChevronRight,
  Dumbbell,
  Play,
  Search,
  Target,
  Timer,
} from "../src/components/ui/Icons";
import {
  AppButton,
  AppCard,
  AppInput,
  BottomSheetModal,
  EmptyStateCard,
  StatusPill,
} from "../src/components/ui/Primitives";
import {
  EXERCISE_LIBRARY,
  MUSCLE_GROUPS,
  type LibraryExercise,
  type MuscleGroup,
} from "../src/data/exerciseLibrary";
import { useGymTheme } from "../src/theme/GymThemeProvider";
import { FONT, RADIUS, SPACING, TYPOGRAPHY } from "../src/theme/tokens";

export default function ExerciseLibraryScreen() {
  const { colors } = useGymTheme();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState<MuscleGroup | "All">("All");
  const [selected, setSelected] = useState<LibraryExercise | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return EXERCISE_LIBRARY.filter((ex) => {
      if (muscle !== "All" && ex.muscleGroup !== muscle) return false;
      if (!q) return true;
      return (
        ex.name.toLowerCase().includes(q) ||
        ex.muscleGroup.toLowerCase().includes(q) ||
        ex.equipment.toLowerCase().includes(q) ||
        ex.secondaryMuscles.some((m) => m.toLowerCase().includes(q))
      );
    });
  }, [query, muscle]);

  const diffTone = (d: LibraryExercise["difficulty"]) =>
    d === "Beginner" ? "success" : d === "Intermediate" ? "primary" : "warning";

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: SPACING.sm }}>
            <AppInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search exercise, muscle, or equipment..."
              leftIcon={<Search size={17} color={colors.textMuted} />}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6 }}
            >
              {(["All", ...MUSCLE_GROUPS] as const).map((group) => {
                const active = muscle === group;
                return (
                  <Pressable
                    key={group}
                    onPress={() => setMuscle(group)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? colors.primary : colors.surface,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: active ? "#FFFFFF" : colors.textSecondary },
                      ]}
                    >
                      {group}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Text style={[TYPOGRAPHY.caption, { color: colors.textMuted }]}>
              {filtered.length} exercise{filtered.length === 1 ? "" : "s"} available offline
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => setSelected(item)}>
            <AppCard style={styles.card}>
              <View style={[styles.iconBox, { backgroundColor: colors.primaryContainer }]}>
                <Dumbbell size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[TYPOGRAPHY.title, { color: colors.text }]}>{item.name}</Text>
                <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }]}>
                  {item.muscleGroup} · {item.equipment}
                </Text>
                <View style={styles.pillRow}>
                  <StatusPill label={item.difficulty} tone={diffTone(item.difficulty)} />
                  <StatusPill
                    label={`${item.defaultSets}×${item.defaultReps}`}
                    tone="neutral"
                  />
                </View>
              </View>
              <ChevronRight size={18} color={colors.textMuted} />
            </AppCard>
          </Pressable>
        )}
        ListEmptyComponent={
          <EmptyStateCard
            icon={<Search size={24} color={colors.textMuted} />}
            title="No matching exercises"
            description="Try searching another muscle group or clearing your filter."
          />
        }
      />

      {/* Exercise Detail Bottom Sheet */}
      <BottomSheetModal
        visible={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.name || ""}
        subtitle={selected ? `${selected.muscleGroup} · ${selected.equipment}` : ""}
      >
        {selected ? (
          <ScrollView contentContainerStyle={{ gap: 14 }}>
            <View style={styles.pillRow}>
              <StatusPill label={selected.difficulty} tone={diffTone(selected.difficulty)} />
              <StatusPill label={selected.category.toUpperCase()} tone="primary" />
              <StatusPill
                label={`Rest ${selected.restSeconds}s`}
                tone="neutral"
                icon={<Timer size={12} color={colors.textSecondary} />}
              />
            </View>

            <AppCard variant="subtle" style={{ gap: 6 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Target size={15} color={colors.primary} />
                <Text style={[TYPOGRAPHY.label, { color: colors.textMuted }]}>TARGET MUSCLES</Text>
              </View>
              <Text style={[TYPOGRAPHY.bodyMedium, { color: colors.text }]}>
                Primary: {selected.muscleGroup}
                {selected.secondaryMuscles.length
                  ? ` · Secondary: ${selected.secondaryMuscles.join(", ")}`
                  : ""}
              </Text>
            </AppCard>

            <View style={{ gap: 8 }}>
              <Text style={[TYPOGRAPHY.label, { color: colors.textMuted }]}>FORM INSTRUCTIONS</Text>
              {selected.instructions.map((step, idx) => (
                <View key={idx} style={styles.stepRow}>
                  <View style={[styles.stepNum, { backgroundColor: colors.primaryContainer }]}>
                    <Text style={[styles.stepNumText, { color: colors.primary }]}>{idx + 1}</Text>
                  </View>
                  <Text style={[TYPOGRAPHY.body, { color: colors.textSecondary, flex: 1 }]}>
                    {step}
                  </Text>
                </View>
              ))}
            </View>

            <AppButton
              label="Start Workout With This Exercise"
              icon={<Play size={16} color="#FFFFFF" />}
              onPress={() => {
                const exId = selected.id;
                setSelected(null);
                router.push({
                  pathname: "/workout-session",
                  params: { exerciseId: exId },
                });
              }}
            />
          </ScrollView>
        ) : null}
      </BottomSheetModal>
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: SPACING.md,
    gap: 10,
    paddingBottom: SPACING.xl,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: {
    fontFamily: FONT.semibold,
    fontSize: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 2,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  stepNumText: {
    fontFamily: FONT.bold,
    fontSize: 12,
  },
});
