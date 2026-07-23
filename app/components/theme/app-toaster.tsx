"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

import { useTheme } from "./theme-provider";

const Toaster = dynamic(
  () => import("sonner").then((module) => module.Toaster),
  { ssr: false },
);

export function AppToaster() {
  const { isDark } = useTheme();
  const pathname = usePathname();

  // These routes do not currently expose actions that create notifications.
  // Avoid loading Sonner on their initial client bundle.
  if (pathname === "/dashboard" || pathname === "/dashboard/chat") {
    return null;
  }

  return (
    <Toaster
      position="top-right"
      richColors
      theme={isDark ? "dark" : "light"}
    />
  );
}
