import { cn } from "@/lib/utils";

export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        "shrink-0 border-t border-border/60 bg-background px-4 py-4 text-center text-xs leading-5 text-muted-foreground",
        className,
      )}
    >
      <small className="text-inherit">
        &copy; {new Date().getFullYear()} Micro Office. All rights reserved.
      </small>
    </footer>
  );
}
