// Optional smoke test using an externally installed playwright-core and Chrome.
// Run against a local production build with no user cookies. All browser traffic
// leaving loopback is blocked; this never completes OAuth or sends invitations.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { deflateRawSync } from "node:zlib";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright-core");
const origin = process.env.AUDIT_ORIGIN || "http://127.0.0.1:3127";
if (!["127.0.0.1", "localhost", "[::1]"].includes(new URL(origin).hostname)) throw new Error("Loopback origin required.");
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH });
try {
  const context = await browser.newContext();
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    return url.origin === origin ? route.continue() : route.abort();
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const home = await page.goto(origin);
  assert.equal(home.status(), 200);
  assert.match(await page.title(), /Micro Office/);
  assert.match(home.headers()["content-security-policy"], /frame-ancestors 'none'/);
  assert.equal(home.headers()["x-content-type-options"], "nosniff");
  assert.match(home.headers()["cache-control"], /private.*no-store/);
  assert.equal(home.headers()["x-powered-by"], undefined);
  const wasDark = await page.locator("html").evaluate((element) => element.classList.contains("dark"));
  await page.getByRole("button", { name: /switch to .* mode/i }).click();
  assert.notEqual(await page.locator("html").evaluate((element) => element.classList.contains("dark")), wasDark);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await page.goto(`${origin}/auth/login`);
  assert.ok(await page.getByRole("button", { name: /google/i }).isVisible());
  for (const path of ["/dashboard", "/dashboard/tasks", "/dashboard/files", "/dashboard/calendar", "/dashboard/chat", "/dashboard/settings", "/dashboard/time-tracker", "/dashboard/team", "/dashboard/summaries", "/teams"]) {
    const response = await context.request.get(`${origin}${path}`, { maxRedirects: 0 });
    if (response.status() === 200) {
      // A loading boundary can flush before Next.js emits a streamed redirect.
      assert.ok(/http-equiv="refresh" content="[01];url=\/auth\/login"/.test(await response.text()), path);
    } else {
      assert.equal(response.status(), 307, path);
      assert.equal(response.headers().location, "/auth/login", path);
    }
    assert.match(response.headers()["cache-control"], /no-store/, path);
  }
  const callback = await context.request.get(`${origin}/auth/callback?next=https://attacker.invalid`, { maxRedirects: 0 });
  assert.equal(callback.status(), 303);
  assert.equal(callback.headers().location, "/auth/login?error=callback&next=%2Fteams");
  assert.match(callback.headers()["cache-control"], /no-store/);
  assert.equal((await context.request.post(`${origin}/auth/logout`, { headers: { Origin: "https://attacker.invalid" }, maxRedirects: 0 })).status(), 403);
  assert.equal((await context.request.get(`${origin}/auth/logout`, { maxRedirects: 0 })).status(), 405);
  assert.equal((await context.request.get(`${origin}/not-a-real-page`)).status(), 404);
  assert.equal((await context.request.get(`${origin}/robots.txt`)).status(), 200);

  // Exercise the actual production worker emitted by Turbopack, not just the
  // validation module in Node. This checks Worker globals and message transfer.
  const chunkDirectory = join(process.cwd(), ".next/static/chunks");
  const workerChunk = readdirSync(chunkDirectory).find((file) => file.endsWith(".js") && readFileSync(join(chunkDirectory, file), "utf8").includes("DecompressionStream"));
  assert.ok(workerChunk, "production DOCX worker chunk exists");
  const runtimeChunk = readdirSync(chunkDirectory).find((file) => file.startsWith("turbopack-") && readFileSync(join(chunkDirectory, file), "utf8").includes(`otherChunks:["static/chunks/${workerChunk}"]`));
  const bootstrapChunk = readdirSync(chunkDirectory).find((file) => file.startsWith("turbopack-worker-"));
  assert.ok(runtimeChunk && bootstrapChunk, "production worker bootstrap exists");
  const workerUrl = `/_next/static/chunks/${bootstrapChunk}#params=${encodeURIComponent(JSON.stringify([
    [`/_next/static/chunks/${runtimeChunk}`, `/_next/static/chunks/${workerChunk}`], "", "/_next/", "", "",
  ]))}`;
  await page.goto(origin);
  // Synthetic valid ZIP using JSZip already installed through docx-preview.
  const JSZip = require("jszip");
  const zip = new JSZip();
  zip.file("word/document.xml", "<document>Hello</document>");
  zip.file("[Content_Types].xml", "<Types/>");
  const valid = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  const bomb = new JSZip();
  bomb.file("word/document.xml", Buffer.alloc(5 * 1024 * 1024, 65));
  bomb.file("[Content_Types].xml", "<Types/>");
  const malicious = await bomb.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  assert.ok(deflateRawSync(Buffer.alloc(5 * 1024 * 1024, 65)).length < 10_000);
  const workerResults = await page.evaluate(async ({ workerUrl, documents }) => {
    const results = [];
    for (const document of documents) {
      results.push(await new Promise((resolve, reject) => {
        const worker = new Worker(workerUrl);
        const timeout = setTimeout(() => { worker.terminate(); reject(new Error("Worker timed out")); }, 15000);
        worker.onerror = (event) => { clearTimeout(timeout); worker.terminate(); reject(new Error(event.message)); };
        worker.onmessage = (event) => { clearTimeout(timeout); worker.terminate(); resolve({ valid: event.data.buffer instanceof ArrayBuffer, error: Boolean(event.data.error) }); };
        const buffer = new Uint8Array(document).buffer;
        worker.postMessage(buffer, [buffer]);
      }));
    }
    return results;
  }, { workerUrl, documents: [Array.from(valid), Array.from(malicious)] });
  assert.deepEqual(workerResults, [{ valid: true, error: false }, { valid: false, error: true }]);
  assert.deepEqual(errors, [], "no browser runtime or hydration errors");
  console.log("Browser smoke passed: home, themes, mobile width, login, 10 protected routes, callback redirect, CSRF, 404, robots, security/cache headers, production DOCX worker.");
} finally {
  await browser.close();
}
