import { createHash, randomBytes } from "crypto";
import type { InvitationRole } from "@/app/types/invitation";

export function isInvitationRole(value: unknown): value is InvitationRole {
  return value === "member" || value === "admin";
}

export function createInvitationToken() {
  return randomBytes(32).toString("hex");
}

export function hashInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function getInvitationExpiresAt() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  return expiresAt.toISOString();
}
