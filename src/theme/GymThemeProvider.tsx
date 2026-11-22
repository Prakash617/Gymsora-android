import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { cacheStorage } from "../services/storage";
import { BRAND, buildGymTheme, type ThemeColors } from "./tokens";

export type ThemePreference = "system" | "dark" | "light";

interface ThemeContextValue {
  colors: ThemeColors;
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
  setGymPrimaryColor: (hex?: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function GymThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  // Default to GymSora's signature premium dark fitness theme
  const [preference, setPreferenceState] = useState<ThemePreference>("dark");
  const [gymColor, setGymColor] = useState<string>(BRAND.orange);

  useEffect(() => {
    cacheStorage.getJson<ThemePreference>(cacheStorage.keys.THEME_MODE).then((saved) => {
      if (saved === "system" || saved === "dark" || saved === "light") {
        setPreferenceState(saved);
      }
    });
  }, []);

  const setPreference = (pref: ThemePreference) => {
    setPreferenceState(pref);
    void cacheStorage.setJson(cacheStorage.keys.THEME_MODE, pref);
  };

  const isDark =
    preference === "system" ? systemScheme !== "light" : preference === "dark";

  const colors = useMemo(() => buildGymTheme(gymColor, isDark), [gymColor, isDark]);

  const value = useMemo(
    () => ({
      colors,
      preference,
      setPreference,
      setGymPrimaryColor: (hex?: string) => {
        if (hex) setGymColor(hex);
      },
    }),
    [colors, preference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useGymTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useGymTheme must be used inside GymThemeProvider");
  return ctx;
}
