/**
 * Real Achievements, Personal Records (PRs), and Weekly/Monthly Challenge
 * Calculator. Computes 100% real statistics strictly from live backend
 * `StreakInfo`, `WorkoutLogItem[]`, and `BodyMeasurementItem[]`.
 * Zero fabricated or placeholder statistics.
 */
import type {
  BodyMeasurementItem,
  StreakInfo,
  WorkoutLogItem,
} from "../types/api";

export interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  category: "attendance" | "workout" | "strength" | "progress";
  unlocked: boolean;
  progress: number; // 0..1
  progressLabel: string;
}

export interface PersonalRecord {
  exerciseName: string;
  bestWeightKg: number;
  repsAtBest: number;
  workoutDate: string;
}

export interface ComputedFitnessStats {
  totalWorkouts: number;
  workoutsThisWeek: number;
  workoutsThisMonth: number;
  totalVolumeKg: number;
  totalSets: number;
  totalMinutes: number;
  personalRecords: PersonalRecord[];
  badges: AchievementBadge[];
  unlockedCount: number;
  weeklyWorkoutDays: boolean[]; // Mon..Sun for current week
}

export function workoutVolumeKg(workout: WorkoutLogItem): number {
  if (!workout.exercises?.length) return 0;
  return workout.exercises.reduce((sum, ex) => {
    const sets = Number(ex.sets || 0);
    const reps = Number(ex.reps || 0);
    const wt = Number(ex.weight_kg || 0);
    if (sets > 0 && reps > 0 && wt > 0) {
      return sum + sets * reps * wt;
    }
    return sum;
  }, 0);
}

export function workoutTotalSets(workout: WorkoutLogItem): number {
  if (!workout.exercises?.length) return 0;
  return workout.exercises.reduce((sum, ex) => sum + Math.max(0, Number(ex.sets || 0)), 0);
}

function startOfWeekMonday(now: Date): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function computeFitnessStats(params: {
  streak?: StreakInfo | null;
  workouts?: WorkoutLogItem[];
  measurements?: BodyMeasurementItem[];
}): ComputedFitnessStats {
  const streak = params.streak || null;
  const workouts = params.workouts || [];
  const measurements = params.measurements || [];

  const now = new Date();
  const monday = startOfWeekMonday(now);
  const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  let workoutsThisWeek = 0;
  let workoutsThisMonth = 0;
  let totalVolumeKg = 0;
  let totalSets = 0;
  let totalMinutes = 0;
  const weeklyWorkoutDays = [false, false, false, false, false, false, false];
  const prMap = new Map<string, PersonalRecord>();

  for (const w of workouts) {
    totalMinutes += Number(w.duration_minutes || 0);
    totalVolumeKg += workoutVolumeKg(w);
    totalSets += workoutTotalSets(w);

    if (w.workout_date?.startsWith(currentMonthPrefix)) {
      workoutsThisMonth += 1;
    }

    if (w.workout_date) {
      const parts = w.workout_date.split("-").map(Number);
      if (parts.length === 3 && parts.every(Number.isFinite)) {
        const wDate = new Date(parts[0], parts[1] - 1, parts[2]);
        const diffDays = Math.floor((wDate.getTime() - monday.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 6) {
          workoutsThisWeek += 1;
          weeklyWorkoutDays[diffDays] = true;
        }
      }
    }

    for (const ex of w.exercises || []) {
      const wt = Number(ex.weight_kg || 0);
      const name = (ex.name || "").trim();
      if (!name || wt <= 0) continue;
      const key = name.toLowerCase();
      const prev = prMap.get(key);
      if (!prev || wt > prev.bestWeightKg || (wt === prev.bestWeightKg && ex.reps > prev.repsAtBest)) {
        prMap.set(key, {
          exerciseName: name,
          bestWeightKg: wt,
          repsAtBest: Number(ex.reps || 0),
          workoutDate: w.workout_date,
        });
      }
    }
  }

  const personalRecords = Array.from(prMap.values()).sort(
    (a, b) => b.bestWeightKg - a.bestWeightKg,
  );

  const totalVisits = streak?.total_visits ?? 0;
  const bestStreak = Math.max(streak?.longest_streak_days ?? 0, streak?.current_streak_days ?? 0);
  const monthlyVisits = streak?.visits_this_month ?? 0;
  const totalWorkouts = workouts.length;
  const totalMeasurements = measurements.length;

  const mkBadge = (
    id: string,
    title: string,
    description: string,
    category: AchievementBadge["category"],
    current: number,
    target: number,
    unit: string,
  ): AchievementBadge => ({
    id,
    title,
    description,
    category,
    unlocked: current >= target,
    progress: Math.min(1, current / Math.max(1, target)),
    progressLabel: `${Math.min(current, target).toLocaleString()} / ${target.toLocaleString()} ${unit}`,
  });

  const badges: AchievementBadge[] = [
    mkBadge("first-checkin", "First Check-In", "Complete your first verified gym visit", "attendance", totalVisits, 1, "visit"),
    mkBadge("streak-7", "7-Day Iron Streak", "Hit a 7-day consecutive gym streak", "attendance", bestStreak, 7, "days"),
    mkBadge("monthly-12", "Monthly Regular", "Check in 12 times in a single month", "attendance", monthlyVisits, 12, "visits"),
    mkBadge("visits-25", "Club Veteran", "Reach 25 total verified gym visits", "attendance", totalVisits, 25, "visits"),
    mkBadge("first-workout", "First Session Logged", "Record your first workout in GymSora", "workout", totalWorkouts, 1, "session"),
    mkBadge("workouts-10", "Consistent Lifter", "Log 10 complete workout sessions", "workout", totalWorkouts, 10, "sessions"),
    mkBadge("volume-5k", "5,000 kg Volume Club", "Lift 5,000 kg of cumulative training volume", "strength", Math.round(totalVolumeKg), 5000, "kg"),
    mkBadge("body-tracker", "Progress Tracker", "Log 3 body measurements to track trends", "progress", totalMeasurements, 3, "logs"),
  ];

  return {
    totalWorkouts,
    workoutsThisWeek,
    workoutsThisMonth,
    totalVolumeKg: Math.round(totalVolumeKg),
    totalSets,
    totalMinutes,
    personalRecords,
    badges,
    unlockedCount: badges.filter((b) => b.unlocked).length,
    weeklyWorkoutDays,
  };
}
