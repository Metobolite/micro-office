import type { ReactNode } from "react";

export type Theme = "light" | "dark";

export type ThemeContextValue = {
  theme: Theme;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

export type ThemeProviderProps = {
  children: ReactNode;
};

export type ThemeToggleProps = {
  className?: string;
};
