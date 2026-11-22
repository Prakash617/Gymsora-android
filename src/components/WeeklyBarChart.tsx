import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useGymTheme } from "../theme/GymThemeProvider";
import { FONT, RADIUS, TABULAR_NUMS } from "../theme/tokens";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export function WeeklyBarChart({
  values,
  unit = "min",
  color,
}: {
  values: number[]; // length 7 (Mon..Sun)
  unit?: string;
  color?: string;
}) {
  const { colors } = useGymTheme();
  const safe = Array.from({ length: 7 }, (_, i) => Math.max(0, Number(values[i] || 0)));
  const maxVal = Math.max(1, ...safe);
  const accent = color || colors.primary;

  // Mon=0..Sun=6 index for today
  const jsDay = new Date().getDay();
  const todayIdx = jsDay === 0 ? 6 : jsDay - 1;

  return (
    <View style={styles.row}>
      {safe.map((val, idx) => {
        const pct = val > 0 ? Math.max(14, Math.round((val / maxVal) * 100)) : 8;
        const isToday = idx === todayIdx;
        return (
          <View key={idx} style={styles.col}>
            <Text
              style={[
                styles.valLabel,
                TABULAR_NUMS,
                { color: val > 0 ? colors.textSecondary : "transparent" },
              ]}
              numberOfLines={1}
            >
              {val > 0 ? `${val}` : "0"}
            </Text>
            <View style={[styles.track, { backgroundColor: colors.surfaceVariant }]}>
              <View
                style={[
                  styles.fill,
                  {
                    height: `${pct}%`,
                    backgroundColor: val > 0 ? accent : "transparent",
                    opacity: val > 0 ? (isToday ? 1 : 0.78) : 0,
                  },
                ]}
              />
            </View>
            <Text
              style={[
                styles.dayLabel,
                {
                  color: isToday ? colors.primary : colors.textMuted,
                  fontFamily: isToday ? FONT.bold : FONT.medium,
                },
              ]}
            >
              {DAY_LABELS[idx]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 8,
  },
  col: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  valLabel: {
    fontFamily: FONT.semibold,
    fontSize: 10,
  },
  track: {
    width: "100%",
    maxWidth: 26,
    height: 76,
    borderRadius: RADIUS.sm,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  fill: {
    width: "100%",
    borderRadius: RADIUS.sm,
  },
  dayLabel: {
    fontSize: 11,
  },
});
