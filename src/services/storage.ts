/**
 * Security-separated storage layer:
 * - Sensitive credentials (access token, refresh token, qr_secret, clock_offset)
 *   are stored strictly in Android Keystore / iOS Keychain via `expo-secure-store`.
 * - Non-secret offline UI snapshots (cached gym branding, member profile,
 *   announcements, theme preference) are stored in `AsyncStorage`.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const SECURE_KEYS = {
  ACCESS_TOKEN: "gymsora_member_access",
  REFRESH_TOKEN: "gymsora_member_refresh",
  QR_SECRET: "gymsora_member_qr_secret",
  CLOCK_OFFSET: "gymsora_member_clock_offset",
} as const;

const CACHE_KEYS = {
  SESSION_META: "gymsora_cache_session_meta_v1",
  HOME_SNAPSHOT: "gymsora_cache_home_v1",
  ATTENDANCE_SNAPSHOT: "gymsora_cache_attendance_v1",
  API_BASE_OVERRIDE: "gymsora_api_base_override_v1",
  THEME_MODE: "gymsora_theme_mode_v1",
  ONBOARDING_SEEN: "gymsora_onboarding_seen_v1",
} as const;

async function secureGet(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      return window.sessionStorage.getItem(key);
    } catch {
      return null;
    }
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function secureSet(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      window.sessionStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
    return;
  }
  await SecureStore.setItemAsync(key, value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

async function secureDelete(key: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    /* ignore */
  }
}

export interface StoredCredentials {
  access: string | null;
  refresh: string | null;
  qrSecret: string | null;
  clockOffset: number;
}

export const secureStorage = {
  async saveCredentials(creds: {
    access: string;
    refresh: string;
    qrSecret?: string;
    clockOffset?: number;
  }): Promise<void> {
    await Promise.all([
      secureSet(SECURE_KEYS.ACCESS_TOKEN, creds.access),
      secureSet(SECURE_KEYS.REFRESH_TOKEN, creds.refresh),
      creds.qrSecret ? secureSet(SECURE_KEYS.QR_SECRET, creds.qrSecret) : Promise.resolve(),
      typeof creds.clockOffset === "number"
        ? secureSet(SECURE_KEYS.CLOCK_OFFSET, String(Math.round(creds.clockOffset)))
        : Promise.resolve(),
    ]);
  },

  async saveClockOffset(offsetSeconds: number): Promise<void> {
    await secureSet(SECURE_KEYS.CLOCK_OFFSET, String(Math.round(offsetSeconds)));
  },

  async saveQrSecret(qrSecret: string): Promise<void> {
    await secureSet(SECURE_KEYS.QR_SECRET, qrSecret);
  },

  async loadCredentials(): Promise<StoredCredentials> {
    const [access, refresh, qrSecret, rawOffset] = await Promise.all([
      secureGet(SECURE_KEYS.ACCESS_TOKEN),
      secureGet(SECURE_KEYS.REFRESH_TOKEN),
      secureGet(SECURE_KEYS.QR_SECRET),
      secureGet(SECURE_KEYS.CLOCK_OFFSET),
    ]);
    const parsedOffset = rawOffset ? Number(rawOffset) : 0;
    return {
      access,
      refresh,
      qrSecret,
      clockOffset: Number.isFinite(parsedOffset) ? parsedOffset : 0,
    };
  },

  async clearCredentials(): Promise<void> {
    await Promise.all([
      secureDelete(SECURE_KEYS.ACCESS_TOKEN),
      secureDelete(SECURE_KEYS.REFRESH_TOKEN),
      secureDelete(SECURE_KEYS.QR_SECRET),
      secureDelete(SECURE_KEYS.CLOCK_OFFSET),
    ]);
  },
};

export const cacheStorage = {
  async getJson<T>(key: string): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },

  async setJson(key: string, value: unknown): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore cache write failure */
    }
  },

  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },

  async clearSessionCaches(): Promise<void> {
    await Promise.all([
      AsyncStorage.removeItem(CACHE_KEYS.SESSION_META),
      AsyncStorage.removeItem(CACHE_KEYS.HOME_SNAPSHOT),
      AsyncStorage.removeItem(CACHE_KEYS.ATTENDANCE_SNAPSHOT),
    ]).catch(() => undefined);
  },

  keys: CACHE_KEYS,
};
