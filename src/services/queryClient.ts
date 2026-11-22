import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 3, // 3 minutes
      gcTime: 1000 * 60 * 60, // 1 hour
      retry: (failureCount, error: any) => {
        if (error?.isNetworkError) return false;
        if (error?.status === 401 || error?.status === 403 || error?.status === 404) return false;
        return failureCount < 2;
      },
      refetchOnReconnect: true,
    },
  },
});

export const queryKeys = {
  home: (gymSlug?: string) => ["member", gymSlug, "home"] as const,
  attendance: (gymSlug?: string, month?: string) =>
    ["member", gymSlug, "attendance", month || "current"] as const,
  subscriptions: (gymSlug?: string) => ["member", gymSlug, "subscriptions"] as const,
  plans: (gymSlug?: string) => ["member", gymSlug, "plans"] as const,
  gymHub: (gymSlug?: string) => ["member", gymSlug, "gym-hub"] as const,
  measurements: (gymSlug?: string) => ["member", gymSlug, "measurements"] as const,
  workouts: (gymSlug?: string) => ["member", gymSlug, "workouts"] as const,
  preferences: (gymSlug?: string) => ["member", gymSlug, "preferences"] as const,
  progressPhotos: (gymSlug?: string) => ["member", gymSlug, "progress-photos"] as const,
  nutrition: (gymSlug?: string, date?: string) => ["member", gymSlug, "nutrition", date || "today"] as const,
  workoutPlans: (gymSlug?: string) => ["member", gymSlug, "workout-plans"] as const,
  classes: (gymSlug?: string) => ["member", gymSlug, "classes"] as const,
  messages: (gymSlug?: string) => ["member", gymSlug, "messages"] as const,
};
