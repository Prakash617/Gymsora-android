import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { useGymTheme } from "../theme/GymThemeProvider";
import { FONT, RADIUS, SPACING, TABULAR_NUMS } from "../theme/tokens";
import type { BodyMeasurementItem } from "../types/api";
import { AppCard } from "./ui/Primitives";

type ChartRange = "week" | "month" | "all";
type ChartMetric = "weight" | "bmi";

function buildSmoothPath(pts: [number, number][]): string {
  if (!pts.length) return "";
  if (pts.length === 1) return `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const cx = (x0 + x1) / 2;
    d += ` C${cx.toFixed(1)},${y0.toFixed(1)} ${cx.toFixed(1)},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
  }
  return d;
}

export function WeightChart({ items }: { items: BodyMeasurementItem[] }) {
  const { colors } = useGymTheme();
  const [range, setRange] = useState<ChartRange>("all");
  const [metric, setMetric] = useState<ChartMetric>("weight");

  const filtered = useMemo(() => {
    const now = Date.now();
    const daysLimit = range === "week" ? 10 : range === "month" ? 35 : 3650;
    const rows = items
      .filter((item) => {
        if (metric === "bmi" && item.bmi === null) return false;
        if (range === "all") return true;
        const ts = new Date(item.recorded_date).getTime();
        return Number.isFinite(ts) ? (now - ts) / (1000 * 60 * 60 * 24) <= daysLimit : true;
      })
      .slice(0, 14)
      .reverse();
    return rows.length >= 2 ? rows : [...items].filter((i) => metric === "weight" || i.bmi !== null).slice(0, 12).reverse();
  }, [items, range, metric]);

  if (items.length < 2) {
    return null;
  }

  const width = 320;
  const height = 152;
  const padL = 36;
  const padR = 14;
  const padT = 16;
  const padB = 26;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const vals = filtered.map((item) =>
    metric === "bmi" ? Number(item.bmi || 0) : Number(item.weight_kg || 0),
  );
  const minVal = vals.length ? Math.min(...vals) : 0;
  const maxVal = vals.length ? Math.max(...vals) : 1;
  const span = Math.max(0.5, maxVal - minVal);
  const yMin = minVal - span * 0.15;
  const yMax = maxVal + span * 0.15;
  const ySpan = Math.max(0.5, yMax - yMin);

  const coords = filtered.map((item, idx) => {
    const v = vals[idx];
    const x = padL + (idx / Math.max(1, filtered.length - 1)) * plotW;
    const y = padT + plotH - ((v - yMin) / ySpan) * plotH;
    return { x, y, v, item };
  });

  const pts = coords.map((c) => [c.x, c.y] as [number, number]);
  const linePath = buildSmoothPath(pts);
  const baseY = padT + plotH;
  const areaPath = pts.length
    ? `${linePath} L${pts[pts.length - 1][0].toFixed(1)},${baseY.toFixed(1)} L${pts[0][0].toFixed(1)},${baseY.toFixed(1)} Z`
    : "";

  const delta =
    vals.length >= 2 ? Number((vals[vals.length - 1] - vals[0]).toFixed(1)) : 0;
  const unit = metric === "bmi" ? "" : " kg";
  const accent = metric === "bmi" ? colors.info : colors.primary;

  const gridTicks = [yMax, (yMax + yMin) / 2, yMin].map((v, idx) => ({
    y: padT + (idx / 2) * plotH,
    label: v.toFixed(1),
  }));

  return (
    <AppCard style={{ gap: 12 }}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>
            {metric === "weight" ? "Weight Progression" : "BMI Trend"}
          </Text>
          <Text style={[styles.sub, { color: colors.textMuted }, TABULAR_NUMS]}>
            {filtered.length} logs · {minVal.toFixed(1)} – {maxVal.toFixed(1)}
            {unit}
          </Text>
        </View>
        <View
          style={[
            styles.deltaBadge,
            {
              backgroundColor:
                delta <= 0 ? colors.successContainer : colors.primaryContainer,
            },
          ]}
        >
          <Text
            style={[
              styles.deltaText,
              { color: delta <= 0 ? colors.success : colors.primary },
              TABULAR_NUMS,
            ]}
          >
            {delta > 0 ? `+${delta}` : delta}
            {unit}
          </Text>
        </View>
      </View>

      {/* Metric & Range Controls */}
      <View style={styles.controlsRow}>
        <View style={[styles.pillGroup, { backgroundColor: colors.surfaceVariant }]}>
          {(["weight", "bmi"] as const).map((m) => {
            const active = metric === m;
            return (
              <Pressable
                key={m}
                onPress={() => setMetric(m)}
                style={[
                  styles.pillBtn,
                  active && { backgroundColor: colors.surface },
                ]}
              >
                <Text
                  style={[
                    styles.pillText,
                    { color: active ? colors.text : colors.textMuted },
                  ]}
                >
                  {m === "weight" ? "Weight" : "BMI"}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.pillGroup, { backgroundColor: colors.surfaceVariant }]}>
          {(
            [
              { key: "week", label: "1W" },
              { key: "month", label: "1M" },
              { key: "all", label: "All" },
            ] as const
          ).map((r) => {
            const active = range === r.key;
            return (
              <Pressable
                key={r.key}
                onPress={() => setRange(r.key)}
                style={[
                  styles.pillBtn,
                  active && { backgroundColor: colors.primary },
                ]}
              >
                <Text
                  style={[
                    styles.pillText,
                    { color: active ? "#FFFFFF" : colors.textMuted },
                  ]}
                >
                  {r.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {filtered.length >= 2 ? (
        <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
          <Defs>
            <LinearGradient id="weightAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={accent} stopOpacity={0.32} />
              <Stop offset="100%" stopColor={accent} stopOpacity={0.01} />
            </LinearGradient>
          </Defs>

          {gridTicks.map((tick, idx) => (
            <React.Fragment key={idx}>
              <Line
                x1={padL}
                y1={tick.y}
                x2={width - padR}
                y2={tick.y}
                stroke={colors.border}
                strokeDasharray={idx === 2 ? undefined : "3,4"}
                strokeWidth={1}
              />
              <SvgText
                x={padL - 6}
                y={tick.y + 3.5}
                textAnchor="end"
                fill={colors.textMuted}
                fontSize={10}
                fontWeight="600"
              >
                {tick.label}
              </SvgText>
            </React.Fragment>
          ))}

          {areaPath ? <Path d={areaPath} fill="url(#weightAreaGrad)" /> : null}
          {linePath ? (
            <Path
              d={linePath}
              fill="none"
              stroke={accent}
              strokeWidth={2.75}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ) : null}

          {coords.map((c, idx) => {
            const isLast = idx === coords.length - 1;
            const showDate = idx === 0 || isLast || idx === Math.floor(coords.length / 2);
            return (
              <React.Fragment key={c.item.id}>
                {isLast ? (
                  <Circle cx={c.x} cy={c.y} r={8} fill={accent} fillOpacity={0.2} />
                ) : null}
                <Circle
                  cx={c.x}
                  cy={c.y}
                  r={isLast ? 4.5 : 3.2}
                  fill={isLast ? accent : colors.surface}
                  stroke={accent}
                  strokeWidth={2.2}
                />
                {showDate ? (
                  <SvgText
                    x={c.x}
                    y={height - 6}
                    textAnchor={idx === 0 ? "start" : isLast ? "end" : "middle"}
                    fill={colors.textMuted}
                    fontSize={9.5}
                    fontWeight="500"
                  >
                    {c.item.recorded_date.slice(5)}
                  </SvgText>
                ) : null}
              </React.Fragment>
            );
          })}
        </Svg>
      ) : (
        <Text style={[styles.sub, { color: colors.textMuted, textAlign: "center", paddingVertical: 20 }]}>
          Log at least 2 entries with height to display BMI trend.
        </Text>
      )}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: SPACING.sm,
  },
  title: {
    fontFamily: FONT.bold,
    fontSize: 15,
  },
  sub: {
    fontFamily: FONT.regular,
    fontSize: 12,
    marginTop: 1,
  },
  deltaBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
  },
  deltaText: {
    fontFamily: FONT.bold,
    fontSize: 12.5,
  },
  controlsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  pillGroup: {
    flexDirection: "row",
    padding: 3,
    borderRadius: RADIUS.sm,
    gap: 2,
  },
  pillBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
  },
  pillText: {
    fontFamily: FONT.semibold,
    fontSize: 11.5,
  },
});
