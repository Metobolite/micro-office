import assert from "node:assert/strict";
import { test } from "node:test";
import { getDeploymentErrors, resolveAppUrl } from "../lib/deployment-env.mjs";

const validEnvironment = {
  NODE_ENV: "production",
  APP_URL: "https://office.example.com",
  NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_publishable_test",
};

test("production requires a configured application origin", () => {
  assert.throws(() => resolveAppUrl({ NODE_ENV: "production" }), /APP_URL/);
  assert.equal(resolveAppUrl({ NODE_ENV: "development" }), "http://localhost:3000");
});

test("explicit origin overrides preview host and normalizes whitespace and trailing slash", () => {
  assert.equal(resolveAppUrl({ ...validEnvironment, APP_URL: " https://office.example.com/ ", VERCEL_URL: "preview.vercel.app" }), "https://office.example.com");
});

test("legacy public origin and Vercel preview origins remain supported", () => {
  assert.equal(resolveAppUrl({ NODE_ENV: "production", NEXT_PUBLIC_APP_URL: "https://legacy.example.com/" }), "https://legacy.example.com");
  assert.equal(resolveAppUrl({ NODE_ENV: "production", VERCEL_URL: "preview.vercel.app" }), "https://preview.vercel.app");
});

for (const origin of ["not-a-url", "//office.example.com", "javascript:alert(1)", "https://user:password@office.example.com", "https://office.example.com/path", "https://office.example.com?token=secret", "https://office.example.com#fragment", "http://office.example.com"]) {
  test(`rejects invalid production origin: ${origin}`, () => {
    assert.throws(() => resolveAppUrl({ NODE_ENV: "production", APP_URL: origin }), /APP_URL/);
  });
}

test("local production smoke tests can use an explicit loopback HTTP origin", () => {
  for (const host of ["localhost", "127.0.0.1", "[::1]"]) {
    const origin = `http://${host}:3000`;
    assert.equal(resolveAppUrl({ NODE_ENV: "production", APP_URL: origin }), origin);
  }
});

test("valid deployment does not require optional email delivery", () => {
  assert.deepEqual(getDeploymentErrors(validEnvironment), []);
});

test("missing public credentials are reported together without exposing values", () => {
  const errors = getDeploymentErrors({ NODE_ENV: "production" });
  assert.equal(errors.length, 3);
  assert.ok(errors.some((error) => error.includes("NEXT_PUBLIC_SUPABASE_URL")));
  assert.ok(errors.some((error) => error.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY")));
});

test("secret Supabase credentials cannot be placed in the browser configuration", () => {
  const serviceRoleKey = `header.${Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url")}.signature`;
  for (const secret of ["sb_secret_sensitive", serviceRoleKey]) {
    const errors = getDeploymentErrors({ ...validEnvironment, NEXT_PUBLIC_SUPABASE_ANON_KEY: secret });
    assert.equal(errors.length, 1);
    assert.match(errors[0], /secret or service-role/);
    assert.ok(!errors[0].includes(secret));
  }
});

test("a configured email API key requires a sender", () => {
  const env = { ...validEnvironment, RESEND_API_KEY: "test-secret" };
  assert.match(getDeploymentErrors(env)[0], /RESEND_FROM_EMAIL/);
  assert.deepEqual(getDeploymentErrors({ ...env, RESEND_FROM_EMAIL: "Micro Office <office@example.com>" }), []);
});

test("malformed Supabase endpoints are rejected without printing their contents", () => {
  for (const value of ["broken", "ftp://project.supabase.co", "https://secret@project.supabase.co", "https://project.supabase.co?key=secret"]) {
    const errors = getDeploymentErrors({ ...validEnvironment, NEXT_PUBLIC_SUPABASE_URL: value });
    assert.equal(errors.length, 1);
    assert.ok(!errors[0].includes(value));
  }
});
