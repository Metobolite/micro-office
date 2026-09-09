"use client";

import { DASHBOARD_HEADER_ACTIONS_ID } from "@/app/lib/dashboard-routes";
import type { ReactNode } from "react";
import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

// The header target stays mounted for the lifetime of the dashboard layout.
const subscribe = () => () => {};
const getTarget = () => document.getElementById(DASHBOARD_HEADER_ACTIONS_ID);
const getServerTarget = () => null;

export function DashboardHeaderActions({
  children,
}: {
  children: ReactNode;
}) {
  const target = useSyncExternalStore(subscribe, getTarget, getServerTarget);

  return target ? createPortal(children, target) : null;
}
