import type {
  AssignedWorkoutPlan,
  AttendanceItem,
  BodyMeasurementItem,
  GymClassItem,
  GymHubPayload,
  HomePayload,
  MemberProfile,
  MobileSessionPayload,
  PaymentItem,
  PlanItem,
  ServerNutritionDay,
  ServerPreferences,
  ServerProgressPhoto,
  StreakInfo,
  SubscriptionAccess,
  SubscriptionHistoryItem,
  TrainerMessageItem,
  WorkoutExercise,
  WorkoutLogItem,
} from "../types/api";
import { apiRequest } from "./api";

export const memberAuthApi = {
  requestOtp: (email: string) =>
    apiRequest<{ detail: string; dev_otp?: string; expires_in?: number }>(
      "/api/member-auth/request-otp/",
      { method: "POST", body: { email }, auth: false },
    ),

  verifyOtp: (email: string, otp: string, gymSlug?: string) =>
    apiRequest<MobileSessionPayload>("/api/member-auth/verify-otp/", {
      method: "POST",
      body: { email, otp, ...(gymSlug ? { gym_slug: gymSlug } : {}) },
      auth: false,
    }),

  googleLogin: (credential: string, gymSlug?: string) =>
    apiRequest<MobileSessionPayload>("/api/member-auth/google/", {
      method: "POST",
      body: { credential, ...(gymSlug ? { gym_slug: gymSlug } : {}) },
      auth: false,
    }),

  switchGym: (gymSlug: string) =>
    apiRequest<MobileSessionPayload>("/api/member-auth/switch-gym/", {
      method: "POST",
      body: { gym_slug: gymSlug },
    }),
};

export const memberApi = {
  home: () => apiRequest<HomePayload>("/api/member/home/"),

  profile: () => apiRequest<{ server_time: number; member: MemberProfile }>("/api/member/profile/"),

  updateProfile: (payload: { name?: string; phone?: string; photoUri?: string }) => {
    if (payload.photoUri) {
      const form = new FormData();
      if (payload.name !== undefined) form.append("name", payload.name);
      if (payload.phone !== undefined) form.append("phone", payload.phone);
      const filename = payload.photoUri.split("/").pop() || "avatar.jpg";
      const ext = filename.split(".").pop()?.toLowerCase();
      const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
      form.append("photo", {
        uri: payload.photoUri,
        name: filename,
        type: mime,
      } as any);
      return apiRequest<{ detail: string; member: MemberProfile }>("/api/member/profile/", {
        method: "PATCH",
        body: form,
        isFormData: true,
      });
    }
    return apiRequest<{ detail: string; member: MemberProfile }>("/api/member/profile/", {
      method: "PATCH",
      body: {
        ...(payload.name !== undefined ? { name: payload.name } : {}),
        ...(payload.phone !== undefined ? { phone: payload.phone } : {}),
      },
    });
  },

  refreshQrPass: (rotate = false) =>
    apiRequest<{
      server_time: number;
      qr_secret: string;
      tenant_slug: string;
      member_id: number;
    }>("/api/member/qr-pass/refresh/", {
      method: "POST",
      body: { rotate },
    }),

  attendance: (month?: string) =>
    apiRequest<{
      server_time: number;
      streak: StreakInfo;
      calendar_dates: string[];
      results: AttendanceItem[];
    }>(`/api/member/attendance/${month ? `?month=${encodeURIComponent(month)}` : ""}`),

  subscriptions: () =>
    apiRequest<{
      server_time: number;
      current: SubscriptionAccess;
      subscriptions: SubscriptionHistoryItem[];
      payments: PaymentItem[];
    }>("/api/member/subscriptions/"),

  plans: () => apiRequest<{ results: PlanItem[] }>("/api/member/plans/"),

  requestRenewal: (planId?: number, note?: string) =>
    apiRequest<{ detail: string; enquiry_id: number }>("/api/member/renewal-request/", {
      method: "POST",
      body: {
        ...(planId ? { plan_id: planId } : {}),
        ...(note ? { note } : {}),
      },
    }),

  gymHub: () => apiRequest<GymHubPayload>("/api/member/gym-hub/"),

  measurements: () => apiRequest<{ results: BodyMeasurementItem[] }>("/api/member/measurements/"),

  addMeasurement: (payload: {
    recorded_date?: string;
    weight_kg: number;
    height_cm?: number | null;
    body_fat_pct?: number | null;
    chest_cm?: number | null;
    waist_cm?: number | null;
    arms_cm?: number | null;
    thigh_cm?: number | null;
    notes?: string;
  }) =>
    apiRequest<BodyMeasurementItem>("/api/member/measurements/", {
      method: "POST",
      body: payload,
    }),

  deleteMeasurement: (id: number) =>
    apiRequest<void>(`/api/member/measurements/${id}/`, { method: "DELETE" }),

  scanDeskQr: (qr_payload: string) =>
    apiRequest<{
      status: string;
      is_allowed: boolean;
      message: string;
      sound?: string;
      streak?: StreakInfo;
    }>("/api/member/attendance/scan-desk/", {
      method: "POST",
      body: { qr_payload },
    }),

  preferences: () => apiRequest<ServerPreferences>("/api/member/preferences/"),

  updatePreferences: (payload: Partial<ServerPreferences>) =>
    apiRequest<ServerPreferences>("/api/member/preferences/", {
      method: "PATCH",
      body: payload,
    }),

  progressPhotos: () =>
    apiRequest<{ results: ServerProgressPhoto[] }>("/api/member/progress-photos/"),

  uploadProgressPhoto: (payload: {
    uri: string;
    label: string;
    weight_kg?: number | null;
    recorded_date?: string;
  }) => {
    const form = new FormData();
    form.append("label", payload.label.toLowerCase());
    if (payload.weight_kg != null) form.append("weight_kg", String(payload.weight_kg));
    if (payload.recorded_date) form.append("recorded_date", payload.recorded_date);
    const filename = payload.uri.split("/").pop() || "progress.jpg";
    const ext = filename.split(".").pop()?.toLowerCase();
    const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    form.append("image", { uri: payload.uri, name: filename, type: mime } as any);
    return apiRequest<ServerProgressPhoto>("/api/member/progress-photos/", {
      method: "POST",
      body: form,
      isFormData: true,
    });
  },

  deleteProgressPhoto: (id: number) =>
    apiRequest<void>(`/api/member/progress-photos/${id}/`, { method: "DELETE" }),

  nutritionDay: (date?: string) =>
    apiRequest<ServerNutritionDay>(
      `/api/member/nutrition/${date ? `?date=${encodeURIComponent(date)}` : ""}`,
    ),

  saveNutritionGoals: (payload: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    water_ml: number;
  }) =>
    apiRequest<ServerNutritionDay["goals"]>("/api/member/nutrition/goals/", {
      method: "PUT",
      body: payload,
    }),

  addNutritionMeal: (payload: {
    log_date: string;
    slot: string;
    name: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  }) =>
    apiRequest<ServerNutritionDay["meals"][number]>("/api/member/nutrition/meals/", {
      method: "POST",
      body: payload,
    }),

  deleteNutritionMeal: (id: number) =>
    apiRequest<void>(`/api/member/nutrition/meals/${id}/`, { method: "DELETE" }),

  saveWaterIntake: (log_date: string, water_ml: number) =>
    apiRequest<{ date: string; water_ml: number }>("/api/member/nutrition/water/", {
      method: "POST",
      body: { log_date, water_ml },
    }),

  workoutPlans: () =>
    apiRequest<{ results: AssignedWorkoutPlan[] }>("/api/member/workout-plans/"),

  classes: () => apiRequest<{ results: GymClassItem[] }>("/api/member/classes/"),

  toggleClassBooking: (id: number) =>
    apiRequest<{ booked: boolean; detail: string }>(`/api/member/classes/${id}/book/`, {
      method: "POST",
    }),

  messages: () =>
    apiRequest<{
      assigned_trainer: ServerPreferences["assigned_trainer"];
      results: TrainerMessageItem[];
    }>("/api/member/messages/"),

  sendMessage: (body: string, trainerId?: number) =>
    apiRequest<TrainerMessageItem>("/api/member/messages/", {
      method: "POST",
      body: { body, ...(trainerId ? { trainer_id: trainerId } : {}) },
    }),

  registerPushToken: (token: string, platform = "android") =>
    apiRequest<{ detail: string; id: number }>("/api/member/push-token/", {
      method: "POST",
      body: { token, platform },
    }),

  workouts: () => apiRequest<{ results: WorkoutLogItem[] }>("/api/member/workouts/"),

  addWorkout: (payload: {
    workout_date?: string;
    title: string;
    category: string;
    duration_minutes: number;
    calories_burned?: number | null;
    exercises: WorkoutExercise[];
    notes?: string;
  }) =>
    apiRequest<WorkoutLogItem>("/api/member/workouts/", {
      method: "POST",
      body: payload,
    }),

  deleteWorkout: (id: number) =>
    apiRequest<void>(`/api/member/workouts/${id}/`, { method: "DELETE" }),
};
