import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

// Compile the actual dependency-free helpers with the project's TypeScript
// compiler, retaining compatibility with supported Node 22 releases.
async function loadHelper(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2017 } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
}
const { getSafeInternalRedirect } = await loadHelper("../app/lib/internal-redirect.ts");
const { getFilePageCursorFilter } = await loadHelper("../app/lib/file-utils.ts");

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fixture.supabase.co";
const { getOwnedAvatarStoragePath } = await loadHelper("../app/lib/profile-avatar.ts");
const alice = "00000000-0000-4000-8000-000000000001";
const bob = "00000000-0000-4000-8000-000000000002";
const photo = `https://fixture.supabase.co/storage/v1/object/public/avatars/${alice}/avatars/photo.png`;

test("redirects reject external origins and URL-parser bypasses", () => {
  for (const value of ["https://attacker.invalid", "//attacker.invalid", "/\\attacker.invalid", "/teams/../../evil", "/dashboard/%2f%2fattacker.invalid", "/teams/\n/evil", "javascript:alert(1)", {}, null]) {
    assert.equal(getSafeInternalRedirect(value), "/teams");
  }
  assert.equal(getSafeInternalRedirect("/dashboard/tasks?filter=todo"), "/dashboard/tasks?filter=todo");
  assert.equal(getSafeInternalRedirect(`/invite/${"a".repeat(64)}`), `/invite/${"a".repeat(64)}`);
});
test("avatar paths bind the exact storage endpoint to the authenticated owner", () => {
  assert.equal(getOwnedAvatarStoragePath(photo, alice), `${alice}/avatars/photo.png`);
  for (const candidate of [
    photo.replace(alice, bob), photo.replace("fixture.supabase.co", "attacker.invalid"),
    photo.replace("/storage/", "/fake/storage/"), photo.replace("https://", "https://user:password@"),
    photo.replace("photo.png", "..%2Fsecret.png"), photo.replace("photo.png", "photo.svg"),
    photo.replace("photo.png", "..%5Csecret.png"),
  ]) assert.equal(getOwnedAvatarStoragePath(candidate, alice), null);
});
test("file cursors reject PostgREST filter injection and preserve timestamp precision", () => {
  assert.equal(getFilePageCursorFilter({ id: `${alice},user_id.neq.${bob}`, uploadedAt: null }), null);
  assert.equal(getFilePageCursorFilter({ id: alice, uploadedAt: "2026-09-10T00:00:00Z),team_id.neq.null" }), null);
  const timestamp = "2026-09-10T00:00:00.123456+00:00";
  assert.ok(getFilePageCursorFilter({ id: alice, uploadedAt: timestamp }).includes(timestamp));
});
