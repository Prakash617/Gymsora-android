import { computeFitnessStats, workoutTotalSets, workoutVolumeKg } from "../achievements";
import type { WorkoutLogItem } from "../../types/api";

function assertEqual(actual: unknown, expected: unknown, msg?: string) {
  if (actual !== expected) {
    throw new Error(`${msg || "Assertion failed"}: expected ${expected}, got ${actual}`);
  }
}
function assertOk(cond: unknown, msg?: string) {
  if (!cond) throw new Error(msg || "Expected truthy value");
}

const todayIso = new Date().toISOString().slice(0, 10);

const sampleWorkouts: WorkoutLogItem[] = [
  {
    id: 1,
    workout_date: todayIso,
    title: "Push Power",
    category: "strength",
    duration_minutes: 50,
    calories_burned: 360,
    exercises: [
      { name: "Barbell Bench Press", sets: 4, reps: 8, weight_kg: 80 },
      { name: "Incline Dumbbell Press", sets: 3, reps: 10, weight_kg: 30 },
    ],
    notes: "",
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    workout_date: "2026-01-10",
    title: "Old Chest Day",
    category: "strength",
    duration_minutes: 40,
    calories_burned: null,
    exercises: [{ name: "Barbell Bench Press", sets: 3, reps: 8, weight_kg: 70 }],
    notes: "",
    created_at: "2026-01-10T10:00:00Z",
  },
];

// Verify zero fake stats when empty
const empty = computeFitnessStats({});
assertEqual(empty.totalWorkouts, 0);
assertEqual(empty.totalVolumeKg, 0);
assertEqual(empty.unlockedCount, 0);
assertEqual(empty.personalRecords.length, 0);

// Verify real volume & PR calculation
assertEqual(workoutVolumeKg(sampleWorkouts[0]), 4 * 8 * 80 + 3 * 10 * 30);
assertEqual(workoutTotalSets(sampleWorkouts[0]), 7);

const computed = computeFitnessStats({
  streak: {
    current_streak_days: 7,
    longest_streak_days: 7,
    visits_this_month: 12,
    total_visits: 15,
    checked_in_today: true,
  },
  workouts: sampleWorkouts,
});

assertEqual(computed.totalWorkouts, 2);
assertEqual(computed.workoutsThisWeek, 1);
assertEqual(computed.personalRecords[0].exerciseName, "Barbell Bench Press");
assertEqual(computed.personalRecords[0].bestWeightKg, 80);
assertOk(computed.badges.find((b) => b.id === "streak-7")?.unlocked);
assertOk(computed.badges.find((b) => b.id === "monthly-12")?.unlocked);
assertOk(computed.badges.find((b) => b.id === "first-workout")?.unlocked);
assertOk(!computed.badges.find((b) => b.id === "visits-25")?.unlocked);

console.log("PASS: achievements & PR computation tests verified.");
