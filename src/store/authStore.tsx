import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { setAuthExpiredHandler, setClockOffsetHandler } from "../services/api";
import { memberApi, memberAuthApi } from "../services/endpoints";
import { localDb } from "../services/localDb";
import { cacheStorage, secureStorage } from "../services/storage";
import { useGymTheme } from "../theme/GymThemeProvider";
import type {
  GymSummary,
  HomePayload,
  MemberProfile,
  MobileSessionPayload,
  StreakInfo,
  SubscriptionAccess,
} from "../types/api";

interface CachedSessionMeta {
  member: MemberProfile;
  activeGym: GymSummary;
  gyms: GymSummary[];
  subscription?: SubscriptionAccess;
  streak?: StreakInfo;
}

interface AuthContextValue {
  hydrated: boolean;
  isAuthenticated: boolean;
  member: MemberProfile | null;
  activeGym: GymSummary | null;
  gyms: GymSummary[];
  qrSecret: string | null;
  clockOffset: number;
  subscription: SubscriptionAccess | null;
  streak: StreakInfo | null;
  applySession: (payload: MobileSessionPayload) => Promise<void>;
  updateFromHome: (home: HomePayload) => Promise<void>;
  updateMember: (member: MemberProfile) => Promise<void>;
  rotateQrPass: () => Promise<void>;
  switchGym: (gymSlug: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setGymPrimaryColor } = useGymTheme();

  const [hydrated, setHydrated] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [member, setMember] = useState<MemberProfile | null>(null);
  const [activeGym, setActiveGym] = useState<GymSummary | null>(null);
  const [gyms, setGyms] = useState<GymSummary[]>([]);
  const [qrSecret, setQrSecret] = useState<string | null>(null);
  const [clockOffset, setClockOffset] = useState<number>(0);
  const [subscription, setSubscription] = useState<SubscriptionAccess | null>(null);
  const [streak, setStreak] = useState<StreakInfo | null>(null);

  const persistMeta = useCallback(
    async (meta: CachedSessionMeta) => {
      await cacheStorage.setJson(cacheStorage.keys.SESSION_META, meta);
    },
    [],
  );

  const clearState = useCallback(() => {
    setIsAuthenticated(false);
    setMember(null);
    setActiveGym(null);
    setGyms([]);
    setQrSecret(null);
    setSubscription(null);
    setStreak(null);
    setGymPrimaryColor("#E67E22");
  }, [setGymPrimaryColor]);

  const logout = useCallback(async () => {
    await secureStorage.clearCredentials();
    await cacheStorage.clearSessionCaches();
    await localDb.clearAll();
    clearState();
  }, [clearState]);

  useEffect(() => {
    setAuthExpiredHandler(clearState);
    setClockOffsetHandler((offset) => setClockOffset(offset));
    return () => {
      setAuthExpiredHandler(null);
      setClockOffsetHandler(null);
    };
  }, [clearState]);

  // Offline-first hydration on boot: loads Keystore credentials + cached display
  // metadata so the member can open their rotating QR Pass even in Airplane Mode.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [creds, meta] = await Promise.all([
          secureStorage.loadCredentials(),
          cacheStorage.getJson<CachedSessionMeta>(cacheStorage.keys.SESSION_META),
        ]);
        if (!active) return;
        if ((creds.access || creds.refresh) && meta?.member && meta?.activeGym) {
          setIsAuthenticated(true);
          setMember(meta.member);
          setActiveGym(meta.activeGym);
          setGyms(meta.gyms || [meta.activeGym]);
          setQrSecret(creds.qrSecret);
          setClockOffset(creds.clockOffset || 0);
          setSubscription(meta.subscription || null);
          setStreak(meta.streak || null);
          setGymPrimaryColor(meta.activeGym.primary_color);
        }
      } finally {
        if (active) setHydrated(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [setGymPrimaryColor]);

  const applySession = useCallback(
    async (payload: MobileSessionPayload) => {
      const offset = Math.round(payload.server_time - Math.floor(Date.now() / 1000));
      await secureStorage.saveCredentials({
        access: payload.access,
        refresh: payload.refresh,
        qrSecret: payload.qr_secret,
        clockOffset: offset,
      });

      setIsAuthenticated(true);
      setMember(payload.member);
      setActiveGym(payload.active_gym);
      setGyms(payload.gyms || [payload.active_gym]);
      setQrSecret(payload.qr_secret);
      setClockOffset(offset);
      setSubscription(payload.subscription || null);
      setStreak(payload.streak || null);
      setGymPrimaryColor(payload.active_gym.primary_color);

      await persistMeta({
        member: payload.member,
        activeGym: payload.active_gym,
        gyms: payload.gyms || [payload.active_gym],
        subscription: payload.subscription,
        streak: payload.streak,
      });
    },
    [persistMeta, setGymPrimaryColor],
  );

  const updateFromHome = useCallback(
    async (home: HomePayload) => {
      setMember(home.member);
      setActiveGym(home.gym);
      setSubscription(home.subscription);
      setStreak(home.streak);
      setGymPrimaryColor(home.gym.primary_color);

      const updatedGyms = gyms.length
        ? gyms.map((g) => (g.slug === home.gym.slug ? { ...g, ...home.gym } : g))
        : [home.gym];
      setGyms(updatedGyms);

      await Promise.all([
        persistMeta({
          member: home.member,
          activeGym: home.gym,
          gyms: updatedGyms,
          subscription: home.subscription,
          streak: home.streak,
        }),
        cacheStorage.setJson(cacheStorage.keys.HOME_SNAPSHOT, home),
      ]);
    },
    [gyms, persistMeta, setGymPrimaryColor],
  );

  const updateMember = useCallback(
    async (updated: MemberProfile) => {
      setMember(updated);
      if (activeGym) {
        await persistMeta({
          member: updated,
          activeGym,
          gyms,
          subscription: subscription || undefined,
          streak: streak || undefined,
        });
      }
    },
    [activeGym, gyms, persistMeta, streak, subscription],
  );

  const rotateQrPass = useCallback(async () => {
    const res = await memberApi.refreshQrPass(true);
    const offset = Math.round(res.server_time - Math.floor(Date.now() / 1000));
    await Promise.all([
      secureStorage.saveQrSecret(res.qr_secret),
      secureStorage.saveClockOffset(offset),
    ]);
    setQrSecret(res.qr_secret);
    setClockOffset(offset);
  }, []);

  const switchGym = useCallback(
    async (gymSlug: string) => {
      const session = await memberAuthApi.switchGym(gymSlug);
      await applySession(session);
    },
    [applySession],
  );

  const value = useMemo(
    () => ({
      hydrated,
      isAuthenticated,
      member,
      activeGym,
      gyms,
      qrSecret,
      clockOffset,
      subscription,
      streak,
      applySession,
      updateFromHome,
      updateMember,
      rotateQrPass,
      switchGym,
      logout,
    }),
    [
      hydrated,
      isAuthenticated,
      member,
      activeGym,
      gyms,
      qrSecret,
      clockOffset,
      subscription,
      streak,
      applySession,
      updateFromHome,
      updateMember,
      rotateQrPass,
      switchGym,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
