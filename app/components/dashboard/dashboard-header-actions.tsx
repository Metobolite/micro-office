"use client";

import { DASHBOARD_HEADER_ACTIONS_ID } from "@/app/lib/dashboard-routes";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function DashboardHeaderActions({
  children,
}: {
  children: ReactNode;
}) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setTarget(document.getElementById(DASHBOARD_HEADER_ACTIONS_ID));
  }, []);

  return target ? createPortal(children, target) : null;
}
