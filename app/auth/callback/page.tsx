import { Suspense } from "react";
import { AuthCallbackClient } from "./AuthCallbackClient";

function AuthCallbackFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <p>Redirecting...</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<AuthCallbackFallback />}>
      <AuthCallbackClient />
    </Suspense>
  );
}
