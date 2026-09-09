"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import type {
  Theme,
  ThemeContextValue,
  ThemeProviderProps,
} from "@/app/types/theme";

const THEME_STORAGE_KEY = "micro-office-theme";
const THEME_CHANGE_EVENT = "micro-office-theme-change";

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getSystemTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getStoredTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }

  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === "light" || storedTheme === "dark") return storedTheme;
  } catch {
    // Browser privacy settings can make localStorage unavailable.
  }

  return getSystemTheme();
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;

  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

function subscribeToTheme(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const syncTheme = () => {
    applyTheme(getStoredTheme());
    onChange();
  };
  const handleStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === THEME_STORAGE_KEY) syncTheme();
  };

  syncTheme();
  media.addEventListener("change", syncTheme);
  window.addEventListener("storage", handleStorage);
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  return () => {
    media.removeEventListener("change", syncTheme);
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
  };
}

const getThemeSnapshot = (): Theme =>
  document.documentElement.classList.contains("dark") ? "dark" : "light";
const getServerTheme = (): Theme => "light";

export function ThemeProvider({ children }: ThemeProviderProps) {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getServerTheme,
  );

  const setTheme = useCallback((nextTheme: Theme) => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // Keep the toggle usable even when the preference cannot be persisted.
    }
    applyTheme(nextTheme);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [setTheme, theme]);

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === "dark",
      setTheme,
      toggleTheme,
    }),
    [setTheme, theme, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider.");
  }

  return context;
}
