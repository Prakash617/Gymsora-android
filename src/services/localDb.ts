/**
 * Local SQLite offline cache & on-device user data store (`expo-sqlite` on
 * native, `AsyncStorage` fallback on web).
 *
 * Non-secret operational data ONLY — JWT tokens and `qr_secret` remain strictly
 * inside Android Keystore / iOS Keychain via `expo-secure-store`.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SQLite from "expo-sqlite";
import { Platform } from "react-native";
import type {
  AttendanceItem,
  BodyMeasurementItem,
  WorkoutLogItem,
} from "../types/api";

export interface NutritionGoals {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  water_ml: number;
  updated_at?: string;
}

export type MealSlot = "breakfast" | "lunch" | "dinner" | "snacks";

export interface MealEntry {
  id: string;
  slot: MealSlot;
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  created_at: string;
}

export interface DailyNutritionLog {
  date: string; // YYYY-MM-DD
  water_ml: number;
  meals: MealEntry[];
}

export interface FitnessGoals {
  target_weight_kg: number | null;
  weekly_workouts_target: number;
  weekly_visits_target: number;
}

export interface ProgressPhotoItem {
  id: string;
  uri: string;
  date: string; // YYYY-MM-DD
  label: "Front" | "Side" | "Back" | "Progress";
  weight_kg: number | null;
  created_at: string;
}

export interface NotificationPrefs {
  expiryReminders: boolean;
  paymentReminders: boolean;
  workoutReminders: boolean;
  gymAnnouncements: boolean;
  achievementAlerts: boolean;
}

export interface PersonalSettings {
  emergencyContactName: string;
  emergencyContactPhone: string;
  fitnessFocus: "Strength" | "Fat Loss" | "Hypertrophy" | "Endurance" | "General Fitness";
  experienceLevel: "Beginner" | "Intermediate" | "Advanced";
  biometricLockEnabled: boolean;
  notifications: NotificationPrefs;
}

export const DEFAULT_PERSONAL_SETTINGS: PersonalSettings = {
  emergencyContactName: "",
  emergencyContactPhone: "",
  fitnessFocus: "General Fitness",
  experienceLevel: "Intermediate",
  biometricLockEnabled: false,
  notifications: {
    expiryReminders: true,
    paymentReminders: true,
    workoutReminders: true,
    gymAnnouncements: true,
    achievementAlerts: true,
  },
};

export const DEFAULT_FITNESS_GOALS: FitnessGoals = {
  target_weight_kg: null,
  weekly_workouts_target: 4,
  weekly_visits_target: 4,
};

const DB_NAME = "gymsora_member_cache.db";
const WEB_PREFIX = "gymsora_kv_v2:";

let dbPromise: Promise<SQLite.SQLiteDatabase | null> | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase | null> {
  if (Platform.OS === "web") return null;
  if (!dbPromise) {
    dbPromise = (async () => {
      try {
        const db = await SQLite.openDatabaseAsync(DB_NAME);
        await db.execAsync(`
          PRAGMA journal_mode = WAL;
          CREATE TABLE IF NOT EXISTS kv_cache (
            gym_slug TEXT NOT NULL,
            bucket TEXT NOT NULL,
            payload TEXT NOT NULL,
            updated_at INTEGER NOT NULL,
            PRIMARY KEY (gym_slug, bucket)
          );
        `);
        return db;
      } catch {
        return null;
      }
    })();
  }
  return dbPromise;
}

async function writeBucket(gymSlug: string, bucket: string, data: unknown): Promise<void> {
  if (!gymSlug) return;
  if (Platform.OS === "web") {
    try {
      await AsyncStorage.setItem(`${WEB_PREFIX}${gymSlug}:${bucket}`, JSON.stringify(data));
    } catch {
      /* non-fatal */
    }
    return;
  }
  const db = await getDb();
  if (!db) return;
  try {
    await db.runAsync(
      `INSERT INTO kv_cache (gym_slug, bucket, payload, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(gym_slug, bucket) DO UPDATE SET
         payload = excluded.payload,
         updated_at = excluded.updated_at`,
      [gymSlug, bucket, JSON.stringify(data), Date.now()],
    );
  } catch {
    /* non-fatal cache write error */
  }
}

async function readBucket<T>(gymSlug: string, bucket: string): Promise<T | null> {
  if (!gymSlug) return null;
  if (Platform.OS === "web") {
    try {
      const raw = await AsyncStorage.getItem(`${WEB_PREFIX}${gymSlug}:${bucket}`);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }
  const db = await getDb();
  if (!db) return null;
  try {
    const row = await db.getFirstAsync<{ payload: string }>(
      `SELECT payload FROM kv_cache WHERE gym_slug = ? AND bucket = ?`,
      [gymSlug, bucket],
    );
    return row?.payload ? (JSON.parse(row.payload) as T) : null;
  } catch {
    return null;
  }
}

export const localDb = {
  // Backend-synced offline caches
  saveAttendance(gymSlug: string, items: AttendanceItem[]) {
    return writeBucket(gymSlug, "attendance", items);
  },
  loadAttendance(gymSlug: string) {
    return readBucket<AttendanceItem[]>(gymSlug, "attendance");
  },

  saveMeasurements(gymSlug: string, items: BodyMeasurementItem[]) {
    return writeBucket(gymSlug, "measurements", items);
  },
  loadMeasurements(gymSlug: string) {
    return readBucket<BodyMeasurementItem[]>(gymSlug, "measurements");
  },

  saveWorkouts(gymSlug: string, items: WorkoutLogItem[]) {
    return writeBucket(gymSlug, "workouts", items);
  },
  loadWorkouts(gymSlug: string) {
    return readBucket<WorkoutLogItem[]>(gymSlug, "workouts");
  },

  // On-device fitness extensions (documented for future backend sync)
  saveThighMap(gymSlug: string, map: Record<string, number>) {
    return writeBucket(gymSlug, "thigh_cm_map", map);
  },
  loadThighMap(gymSlug: string) {
    return readBucket<Record<string, number>>(gymSlug, "thigh_cm_map");
  },

  saveFitnessGoals(gymSlug: string, goals: FitnessGoals) {
    return writeBucket(gymSlug, "fitness_goals", goals);
  },
  loadFitnessGoals(gymSlug: string) {
    return readBucket<FitnessGoals>(gymSlug, "fitness_goals");
  },

  saveProgressPhotos(gymSlug: string, photos: ProgressPhotoItem[]) {
    return writeBucket(gymSlug, "progress_photos", photos);
  },
  loadProgressPhotos(gymSlug: string) {
    return readBucket<ProgressPhotoItem[]>(gymSlug, "progress_photos");
  },

  saveNutritionGoals(gymSlug: string, goals: NutritionGoals) {
    return writeBucket(gymSlug, "nutrition_goals", goals);
  },
  loadNutritionGoals(gymSlug: string) {
    return readBucket<NutritionGoals>(gymSlug, "nutrition_goals");
  },

  saveNutritionDay(gymSlug: string, dateIso: string, log: DailyNutritionLog) {
    return writeBucket(gymSlug, `nutrition_day:${dateIso}`, log);
  },
  loadNutritionDay(gymSlug: string, dateIso: string) {
    return readBucket<DailyNutritionLog>(gymSlug, `nutrition_day:${dateIso}`);
  },

  savePersonalSettings(gymSlug: string, settings: PersonalSettings) {
    return writeBucket(gymSlug, "personal_settings", settings);
  },
  loadPersonalSettings(gymSlug: string) {
    return readBucket<PersonalSettings>(gymSlug, "personal_settings");
  },

  saveReadNotificationIds(gymSlug: string, ids: string[]) {
    return writeBucket(gymSlug, "read_notifications", ids);
  },
  loadReadNotificationIds(gymSlug: string) {
    return readBucket<string[]>(gymSlug, "read_notifications");
  },

  async clearAll(): Promise<void> {
    if (Platform.OS === "web") {
      try {
        const keys = await AsyncStorage.getAllKeys();
        const ours = keys.filter((k) => k.startsWith(WEB_PREFIX));
        if (ours.length) await AsyncStorage.multiRemove(ours);
      } catch {
        /* ignore */
      }
      return;
    }
    const db = await getDb();
    if (!db) return;
    try {
      await db.runAsync("DELETE FROM kv_cache");
    } catch {
      /* ignore */
    }
  },
};
