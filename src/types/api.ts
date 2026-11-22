export interface GymSocials {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  youtube?: string;
  linkedin?: string;
}

export interface GymSummary {
  slug: string;
  name: string;
  logo: string | null;
  banner: string | null;
  primary_color: string;
  address?: string;
  phone?: string;
  email?: string;
  description?: string;
  about_us?: string;
  contact_email?: string;
  contact_phone?: string;
  socials?: GymSocials;
  member_id?: number;
  member_status?: string;
}

export interface MemberProfile {
  id: number;
  name: string;
  email: string;
  phone: string;
  photo: string | null;
  joined_at: string | null;
  status: "active" | "expired" | "pending" | string;
}

export interface SubscriptionAccess {
  result: "allowed" | "expiring_soon" | "due" | "expired" | "inactive" | string;
  is_allowed: boolean;
  sound?: "success" | "warning" | "error";
  days_left: number | null;
  plan_name: string | null;
  start_date: string | null;
  end_date: string | null;
  payment_status: "paid" | "due" | "overdue" | null | string;
  message: string;
}

export interface StreakInfo {
  current_streak_days: number;
  longest_streak_days: number;
  visits_this_month: number;
  total_visits: number;
  checked_in_today: boolean;
}

export interface AnnouncementItem {
  id: number;
  title: string;
  body: string;
  category: "general" | "holiday" | "event" | "offer" | string;
  is_pinned: boolean;
  expires_at: string | null;
  created_at: string;
}

export interface AttendanceItem {
  id: number;
  checked_in_at: string;
  method: string;
  result: string;
  is_allowed: boolean;
}

export interface SubscriptionHistoryItem {
  id: number;
  plan_id: number | null;
  plan_name: string;
  plan_price: number;
  duration_days: number | null;
  start_date: string;
  end_date: string;
  payment_status: string;
  amount_paid: number;
}

export interface PaymentItem {
  id: number;
  subscription_id: number;
  plan_name: string;
  amount: number;
  method: string;
  status: string;
  transaction_id: string;
  created_at: string;
}

export interface PlanItem {
  id: number;
  name: string;
  price: number;
  duration_days: number;
  description: string;
}

export interface TrainerItem {
  id: number;
  name: string;
  specialization: string;
  bio: string;
  photo: string | null;
  social_links: Record<string, string>;
}

export interface ServiceItem {
  id: number;
  name: string;
  icon: string;
  short_description: string;
  description: string;
  price: number;
  image: string | null;
}

export interface ProductItem {
  id: number;
  name: string;
  category: string;
  description: string;
  price: number;
  stock: number;
  image: string | null;
  catalog_type: "retail" | "cafe_menu" | string;
}

export interface BodyMeasurementItem {
  id: number;
  recorded_date: string;
  weight_kg: number;
  height_cm: number | null;
  bmi: number | null;
  body_fat_pct: number | null;
  chest_cm: number | null;
  waist_cm: number | null;
  arms_cm: number | null;
  thigh_cm: number | null;
  notes: string;
  created_at: string;
}

export interface ServerProgressPhoto {
  id: number;
  recorded_date: string;
  label: "front" | "side" | "back" | "progress" | string;
  weight_kg: number | null;
  image: string | null;
  created_at: string;
}

export interface ServerPreferences {
  target_weight_kg: number | null;
  weekly_workouts_target: number;
  weekly_visits_target: number;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  fitness_focus: string;
  experience_level: string;
  biometric_lock_enabled: boolean;
  notification_prefs: Record<string, boolean>;
  assigned_trainer: {
    id: number;
    name: string;
    specialization: string;
    bio?: string;
    photo: string | null;
  } | null;
  updated_at: string;
}

export interface ServerNutritionDay {
  date: string;
  goals: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    water_ml: number;
    updated_at?: string;
  } | null;
  water_ml: number;
  meals: Array<{
    id: number;
    slot: "breakfast" | "lunch" | "dinner" | "snacks" | string;
    name: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    created_at: string;
  }>;
  diet_plan: {
    id: number;
    title: string;
    trainer_name: string | null;
    daily_calories: number | null;
    protein_g: number | null;
    carbs_g: number | null;
    fat_g: number | null;
    meals: Array<Record<string, any>>;
    notes: string;
  } | null;
}

export interface AssignedWorkoutPlan {
  id: number;
  title: string;
  description: string;
  difficulty: string;
  trainer_name: string | null;
  weekly_schedule: Array<Record<string, any>>;
  is_personal: boolean;
}

export interface GymClassItem {
  id: number;
  title: string;
  description: string;
  trainer_name: string | null;
  starts_at: string;
  duration_minutes: number;
  capacity: number;
  booked_count: number;
  location: string;
  is_booked: boolean;
}

export interface TrainerMessageItem {
  id: number;
  sender_role: "member" | "trainer" | "staff" | string;
  trainer_name: string | null;
  body: string;
  created_at: string;
}

export interface WorkoutExercise {
  name: string;
  sets: number;
  reps: number;
  weight_kg: number | null;
}

export interface WorkoutLogItem {
  id: number;
  workout_date: string;
  title: string;
  category: "strength" | "cardio" | "hiit" | "mobility" | "class" | "other" | string;
  duration_minutes: number;
  calories_burned: number | null;
  exercises: WorkoutExercise[];
  notes: string;
  created_at: string;
}

export interface MobileSessionPayload {
  message?: string;
  access: string;
  refresh: string;
  server_time: number;
  qr_secret: string;
  gyms: GymSummary[];
  active_gym: GymSummary;
  member: MemberProfile;
  subscription: SubscriptionAccess;
  streak: StreakInfo;
}

export interface HomePayload {
  server_time: number;
  member: MemberProfile;
  gym: GymSummary;
  subscription: SubscriptionAccess;
  streak: StreakInfo;
  announcements: AnnouncementItem[];
  latest_measurement: {
    id: number;
    recorded_date: string;
    weight_kg: number;
    height_cm: number | null;
    bmi: number | null;
  } | null;
  recent_workout: {
    id: number;
    title: string;
    category: string;
    duration_minutes: number;
    workout_date: string;
  } | null;
}

export interface GymHubPayload {
  gym: GymSummary;
  plans: PlanItem[];
  trainers: TrainerItem[];
  services: ServiceItem[];
  retail_products: ProductItem[];
  cafe_menu: ProductItem[];
  announcements: AnnouncementItem[];
}
