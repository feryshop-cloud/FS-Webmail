import { cp, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const standaloneDir = path.join(root, ".next", "standalone");
const staticSource = path.join(root, ".next", "static");
const staticDest = path.join(standaloneDir, ".next", "static");
const publicSource = path.join(root, "public");
const publicDest = path.join(standaloneDir, "public");

function fail(message) {
  console.error(`[prepare-standalone] ERROR: ${message}`);
  process.exit(1);
}

if (!existsSync(standaloneDir)) {
  fail(
    'standalone output missing (".next/standalone"). Is "output: \'standalone\'" set in next.config?',
  );
}

async function copyRequired(source, destination, label) {
  if (!existsSync(source)) {
    fail(
      `source "${label}" missing (${path.relative(root, source)}). ` +
        "Next.js may have changed its build output structure; refusing to ship without assets.",
    );
  }

  await rm(destination, { recursive: true, force: true });
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(source, destination, { recursive: true });

  if (!existsSync(destination)) {
    fail(`failed to copy "${label}" into standalone output (${path.relative(root, destination)}).`);
  }

  console.log(`[prepare-standalone] ${label} -> ${path.relative(root, destination)}`);
}

async function copyOptional(source, destination, label) {
  if (!existsSync(source)) return;
  await rm(destination, { recursive: true, force: true });
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(source, destination, { recursive: true });
  console.log(`[prepare-standalone] ${label} -> ${path.relative(root, destination)}`);
}

// 1. Static assets
await copyRequired(staticSource, staticDest, ".next/static");

// 2. Public folder
if (existsSync(publicSource)) {
  await copyOptional(publicSource, publicDest, "public");
} else {
  await mkdir(publicDest, { recursive: true });
}

// 3. Custom server.mjs
const serverSource = path.join(root, "server.mjs");
const serverDest = path.join(standaloneDir, "server.mjs");
if (existsSync(serverSource)) {
  await copyRequired(serverSource, serverDest, "server.mjs");
}

// 4. Dependencies for server.mjs (pino, pino-http, dotenv, and all runtime dependencies)
const standaloneModules = path.join(standaloneDir, "node_modules");
const depsToCopy = [
  "@pinojs",
  "atomic-sleep",
  "dotenv",
  "fast-redact",
  "get-caller-file",
  "help-me",
  "on-exit-leak-free",
  "pino",
  "pino-abstract-transport",
  "pino-http",
  "pino-std-serializers",
  "process-warning",
  "quick-format-unescaped",
  "real-require",
  "safe-stable-stringify",
  "sonic-boom",
  "split2",
  "thread-stream",
];

for (const dep of depsToCopy) {
  const src = path.join(root, "node_modules", dep);
  const dest = path.join(standaloneModules, dep);
  if (existsSync(src)) {
    await copyOptional(src, dest, `node_modules/${dep}`);
  }
}

console.log("[prepare-standalone] standalone assets and custom server dependencies prepared.");
