import { createHash, randomBytes } from "crypto";

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
