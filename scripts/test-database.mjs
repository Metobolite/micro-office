// Always creates a new disposable cluster; never accepts a database URL.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:net";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pgConfig = spawnSync("pg_config", ["--bindir"], { encoding: "utf8", windowsHide: true });
const bin = process.env.PG_BIN || pgConfig.stdout?.trim();
if (!bin) throw new Error("Install PostgreSQL with pg_trgm and set PG_BIN to its bin directory.");
const parent = realpathSync(tmpdir());
const temp = mkdtempSync(join(parent, "micro-office-audit-"));
const data = join(temp, "data");
let started = false;
function run(tool, args, input) {
  const command = join(bin, `${tool}${process.platform === "win32" ? ".exe" : ""}`);
  const result = spawnSync(command, args, {
    encoding: "utf8", input, windowsHide: true, timeout: 120_000,
    // A background postgres process can inherit pg_ctl's pipe handles on
    // Windows, leaving spawnSync waiting after pg_ctl itself has exited.
    ...(tool === "pg_ctl" ? { stdio: "ignore" } : {}),
  });
  if (result.error || result.status !== 0) throw new Error(`${tool} failed: ${result.error?.message || result.stderr || result.stdout}`);
  return `${result.stdout || ""}${result.stderr || ""}`;
}
try {
  const listener = createServer();
  await new Promise((accept, reject) => { listener.once("error", reject); listener.listen(0, "127.0.0.1", accept); });
  const port = listener.address().port;
  await new Promise((accept) => listener.close(accept));
  run("initdb", ["-D", data, "-U", "audit_admin", "-A", "trust", "--no-locale", "--encoding=UTF8", "--no-sync"]);
  run("pg_ctl", ["-D", data, "-l", join(temp, "postgres.log"), "-o", `-h 127.0.0.1 -p ${port} -F`, "-w", "start"]);
  started = true;
  const connection = ["-X", "-h", "127.0.0.1", "-p", String(port), "-U", "audit_admin", "-v", "ON_ERROR_STOP=1"];
  run("psql", [...connection, "-d", "postgres", "-c", "create database micro_office_audit"]);
  const execute = (sql) => run("psql", [...connection, "-q", "-d", "micro_office_audit"], sql);
  execute(readFileSync(join(root, "tests/database/fixture.sql"), "utf8"));
  for (const file of readdirSync(join(root, "supabase/migrations")).filter((file) => file.endsWith(".sql")).sort()) {
    execute(readFileSync(join(root, "supabase/migrations", file), "utf8"));
    console.log(`Applied to disposable database: ${file}`);
  }
  const result = execute(readFileSync(join(root, "tests/database/security.sql"), "utf8"));
  const passed = result.split(/\r?\n/).filter((line) => line.includes("PASS:"));
  console.log(passed.join("\n"));
  console.log(`${passed.length} database security assertions passed.`);
} finally {
  if (started) run("pg_ctl", ["-D", data, "-m", "fast", "-w", "stop"]);
  // Resolve and bound the recursive deletion to this newly-created temp cluster.
  const target = realpathSync(temp);
  const child = relative(parent, target);
  if (!child || child.startsWith(`..${sep}`) || child === ".." || resolve(parent, child) !== target || !child.startsWith("micro-office-audit-")) {
    throw new Error("Refusing to clean a path outside the audit temp directory.");
  }
  rmSync(target, { recursive: true, force: true });
}
