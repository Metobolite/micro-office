"use client";

import { Toaster } from "sonner";

import { useTheme } from "./theme-provider";

export function AppToaster() {
  const { isDark } = useTheme();

  return (
    <Toaster
      position="top-right"
      richColors
      theme={isDark ? "dark" : "light"}
    />
  );
}
