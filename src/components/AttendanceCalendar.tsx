import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Calendar, ChevronLeft, ChevronRight, Flame, Trophy } from "./ui/Icons";
import { useGymTheme } from "../theme/GymThemeProvider";
import { FONT, RADIUS, SPACING, TABULAR_NUMS } from "../theme/tokens";
import type { StreakInfo } from "../types/api";
import { AppCard } from "./ui/Primitives";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export function AttendanceCalendar({
  streak,
  visitedDates,
  year,
  monthIndex,
  onPrevMonth,
  onNextMonth,
  canGoNext = false,
}: {
  streak: StreakInfo | null;
  visitedDates: string[];
  year: number;
  monthIndex: number; // 0..11
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  canGoNext?: boolean;
}) {
  const { colors } = useGymTheme();
  const visitedSet = new Set(visitedDates);

  const firstDay = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const todayIso = new Date().toISOString().slice(0, 10);
  const monthLabel = new Date(year, monthIndex, 1).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });

  const cells: Array<{ key: string; day: number | null; iso?: string }> = [];
  for (let i = 0; i < firstDay; i++) cells.push({ key: `pad-${i}`, day: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ key: iso, day: d, iso });
  }

  return (
    <View style={{ gap: SPACING.sm }}>
      {/* Streak Stat Strip */}
      <View style={styles.statsRow}>
        <AppCard style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: colors.primaryContainer }]}>
            <Flame size={16} color={colors.primary} />
          </View>
          <Text style={[styles.statVal, { color: colors.text }, TABULAR_NUMS]}>
            {streak?.current_streak_days ?? 0}d
          </Text>
          <Text style={[styles.statLbl, { color: colors.textMuted }]}>Streak</Text>
        </AppCard>
        <AppCard style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: colors.warningContainer }]}>
            <Trophy size={16} color={colors.warning} />
          </View>
          <Text style={[styles.statVal, { color: colors.text }, TABULAR_NUMS]}>
            {streak?.longest_streak_days ?? 0}d
          </Text>
          <Text style={[styles.statLbl, { color: colors.textMuted }]}>Best</Text>
        </AppCard>
        <AppCard style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: colors.successContainer }]}>
            <Calendar size={16} color={colors.success} />
          </View>
          <Text style={[styles.statVal, { color: colors.text }, TABULAR_NUMS]}>
            {visitedDates.length}
          </Text>
          <Text style={[styles.statLbl, { color: colors.textMuted }]}>Month</Text>
        </AppCard>
      </View>

      {/* Month Calendar */}
      <AppCard>
        <View style={styles.calHeader}>
          <Text style={[styles.monthTitle, { color: colors.text }]}>{monthLabel}</Text>
          {onPrevMonth ? (
            <View style={styles.navBtns}>
              <Pressable
                onPress={onPrevMonth}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Previous month"
                style={[styles.navBtn, { backgroundColor: colors.surfaceVariant }]}
              >
                <ChevronLeft size={16} color={colors.text} />
              </Pressable>
              <Pressable
                onPress={onNextMonth}
                disabled={!canGoNext}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Next month"
                style={[
                  styles.navBtn,
                  { backgroundColor: colors.surfaceVariant, opacity: canGoNext ? 1 : 0.35 },
                ]}
              >
                <ChevronRight size={16} color={colors.text} />
              </Pressable>
            </View>
          ) : null}
        </View>

        <View style={styles.weekRow}>
          {WEEKDAYS.map((day, idx) => (
            <Text key={`${day}-${idx}`} style={[styles.weekCell, { color: colors.textMuted }]}>
              {day}
            </Text>
          ))}
        </View>

        <View style={styles.grid}>
          {cells.map((cell) => {
            if (!cell.day) {
              return <View key={cell.key} style={styles.dayWrap} />;
            }
            const visited = Boolean(cell.iso && visitedSet.has(cell.iso));
            const isToday = cell.iso === todayIso;
            return (
              <View key={cell.key} style={styles.dayWrap}>
                <View
                  style={[
                    styles.dayCircle,
                    visited && { backgroundColor: colors.primary },
                    !visited &&
                      isToday && {
                        borderWidth: 1.5,
                        borderColor: colors.primary,
                        backgroundColor: colors.primaryContainer,
                      },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      TABULAR_NUMS,
                      {
                        color: visited
                          ? "#FFFFFF"
                          : isToday
                            ? colors.primary
                            : colors.textSecondary,
                        fontFamily: visited || isToday ? FONT.bold : FONT.medium,
                      },
                    ]}
                  >
                    {cell.day}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </AppCard>
    </View>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 8,
    gap: 5,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  statVal: {
    fontFamily: FONT.extrabold,
    fontSize: 19,
  },
  statLbl: {
    fontFamily: FONT.semibold,
    fontSize: 11,
  },
  calHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  monthTitle: {
    fontFamily: FONT.bold,
    fontSize: 15,
  },
  navBtns: {
    flexDirection: "row",
    gap: 6,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  weekCell: {
    width: "14.285%",
    textAlign: "center",
    fontFamily: FONT.semibold,
    fontSize: 11,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayWrap: {
    width: "14.285%",
    alignItems: "center",
    paddingVertical: 3,
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  dayText: {
    fontSize: 12,
  },
});
