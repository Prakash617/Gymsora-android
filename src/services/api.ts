/**
 * Mobile-resilient API client for GymSora Member App.
 *
 * - Single-flight silent JWT refresh on 401 (retries original request once).
 * - Preserves offline session on network failures (never logs a member out when
 *   entering a basement gym with no reception).
 * - Automatically updates `clock_offset` whenever the backend returns `server_time`.
 */
import { cacheStorage, secureStorage } from "./storage";

const DEFAULT_API_BASE =
  (process.env.EXPO_PUBLIC_API_BASE || "http://192.168.1.112:8000").replace(/\/+$/, "");

let cachedBaseUrl: string | null = null;
let refreshPromise: Promise<string | null> | null = null;
let onAuthExpiredCallback: (() => void) | null = null;
let onClockOffsetSynced: ((offsetSeconds: number) => void) | null = null;

export class ApiError extends Error {
  status: number;
  code?: string;
  isNetworkError: boolean;
  data?: any;

  constructor(
    message: string,
    options: { status?: number; code?: string; isNetworkError?: boolean; data?: any } = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = options.status ?? 0;
    this.code = options.code;
    this.isNetworkError = Boolean(options.isNetworkError);
    this.data = options.data;
  }
}

export function setAuthExpiredHandler(fn: (() => void) | null) {
  onAuthExpiredCallback = fn;
}

export function setClockOffsetHandler(fn: ((offset: number) => void) | null) {
  onClockOffsetSynced = fn;
}

export async function getApiBaseUrl(): Promise<string> {
  if (cachedBaseUrl) return cachedBaseUrl;
  const saved = await cacheStorage.getJson<string>(cacheStorage.keys.API_BASE_OVERRIDE);
  const resolved = (saved || DEFAULT_API_BASE).replace(/\/+$/, "");
  cachedBaseUrl = resolved;
  return resolved;
}

export async function setApiBaseUrl(url: string): Promise<string> {
  const cleaned = url.trim().replace(/\/+$/, "");
  const resolved = cleaned || DEFAULT_API_BASE;
  cachedBaseUrl = resolved;
  if (cleaned) {
    await cacheStorage.setJson(cacheStorage.keys.API_BASE_OVERRIDE, resolved);
  } else {
    await cacheStorage.remove(cacheStorage.keys.API_BASE_OVERRIDE);
  }
  return resolved;
}

export function getDefaultApiBaseUrl(): string {
  return DEFAULT_API_BASE;
}

async function syncServerTimeIfPresent(data: any) {
  if (data && typeof data.server_time === "number" && Number.isFinite(data.server_time)) {
    const offset = Math.round(data.server_time - Math.floor(Date.now() / 1000));
    await secureStorage.saveClockOffset(offset);
    onClockOffsetSynced?.(offset);
  }
}

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const creds = await secureStorage.loadCredentials();
      if (!creds.refresh) {
        return null;
      }
      const baseUrl = await getApiBaseUrl();
      let res: Response;
      try {
        res = await fetch(`${baseUrl}/api/member-auth/refresh/`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ refresh: creds.refresh }),
        });
      } catch {
        // Network error — keep existing offline session intact!
        throw new ApiError("You appear to be offline.", { isNetworkError: true });
      }

      if (res.status === 401 || res.status === 403) {
        await secureStorage.clearCredentials();
        await cacheStorage.clearSessionCaches();
        onAuthExpiredCallback?.();
        return null;
      }

      if (!res.ok) {
        return null;
      }

      const data = await res.json().catch(() => null);
      if (!data?.access) return null;

      const offset =
        typeof data.server_time === "number"
          ? Math.round(data.server_time - Math.floor(Date.now() / 1000))
          : creds.clockOffset;

      await secureStorage.saveCredentials({
        access: data.access,
        refresh: data.refresh || creds.refresh,
        clockOffset: offset,
      });
      if (typeof data.server_time === "number") {
        onClockOffsetSynced?.(offset);
      }
      return data.access as string;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: any;
  auth?: boolean;
  isFormData?: boolean;
  _retried?: boolean;
  timeoutMs?: number;
}

export async function apiRequest<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = "GET",
    body,
    auth = true,
    isFormData = false,
    _retried = false,
    timeoutMs = 15000,
  } = options;

  const baseUrl = await getApiBaseUrl();
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  if (auth) {
    const creds = await secureStorage.loadCredentials();
    if (creds.access) {
      headers.Authorization = `Bearer ${creds.access}`;
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body:
        body === undefined
          ? undefined
          : isFormData
            ? body
            : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timer);
    const isAbort = err?.name === "AbortError";
    throw new ApiError(
      isAbort ? "Request timed out. Check your connection." : "No internet connection. Your QR pass still works offline.",
      { isNetworkError: true },
    );
  }
  clearTimeout(timer);

  if (response.status === 401 && auth && !_retried) {
    const freshAccess = await refreshAccessToken();
    if (freshAccess) {
      return apiRequest<T>(path, { ...options, _retried: true });
    }
    throw new ApiError("Session expired. Please sign in again.", { status: 401 });
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const detail =
      data?.detail ||
      data?.message ||
      (typeof data === "object" && data
        ? String(Object.values(data).flat()[0] || "")
        : "") ||
      `Request failed (${response.status})`;
    throw new ApiError(detail, {
      status: response.status,
      code: data?.code,
      data,
    });
  }

  await syncServerTimeIfPresent(data);
  return data as T;
}
