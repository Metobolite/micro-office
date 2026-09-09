import type { LayoutProps } from "@/app/types/common";
import { SiteFooter } from "@/app/components/site-footer";

export function PageShell({ children }: LayoutProps) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <div className="flex flex-1 flex-col">{children}</div>
      <SiteFooter />
    </div>
  );
}
