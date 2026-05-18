import { cp, mkdir, readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

const ROOT = import.meta.dir;
const DIST = join(ROOT, "dist");
const SRC_ENTRY = join(ROOT, "src", "injected.ts");
const MANIFEST = join(ROOT, "manifest.json");
const ICONS = join(ROOT, "icons");

type Mode = "build" | "watch" | "zip";

function parseMode(): Mode {
  const arg = process.argv[2] ?? "build";
  if (arg === "build" || arg === "watch" || arg === "zip") return arg;
  throw new Error(`Unknown mode: ${arg}`);
}

async function clean(): Promise<void> {
  if (existsSync(DIST)) {
    await rm(DIST, { recursive: true, force: true });
  }
  await mkdir(DIST, { recursive: true });
}

async function copyStatic(): Promise<void> {
  await cp(MANIFEST, join(DIST, "manifest.json"));
  await cp(ICONS, join(DIST, "icons"), { recursive: true });
}

async function bundle(): Promise<void> {
  const result = await Bun.build({
    entrypoints: [SRC_ENTRY],
    outdir: DIST,
    target: "browser",
    format: "iife",
    minify: false,
    sourcemap: "none",
    naming: "injected.js",
  });
  if (!result.success) {
    for (const log of result.logs) console.error(log);
    throw new Error("Bun.build failed");
  }
}

async function readVersion(): Promise<string> {
  const raw = await readFile(MANIFEST, "utf8");
  const parsed = JSON.parse(raw) as { version: string };
  return parsed.version;
}

function runCommand(
  cmd: string,
  args: readonly string[],
  options: { cwd?: string } = {},
): Promise<void> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(cmd, args, {
      cwd: options.cwd,
      stdio: "inherit",
      shell: false,
    });
    child.on("error", rejectPromise);
    child.on("exit", (code) => {
      if (code === 0) resolvePromise();
      else rejectPromise(new Error(`${cmd} exited with code ${String(code)}`));
    });
  });
}

async function makeZip(): Promise<void> {
  const version = await readVersion();
  const zipName = `gather-teleport-on-follow-${version}.zip`;
  const zipPath = resolve(ROOT, zipName);
  if (existsSync(zipPath)) {
    await rm(zipPath, { force: true });
  }
  if (process.platform === "win32") {
    const psCommand = `Compress-Archive -Path "${join(DIST, "*")}" -DestinationPath "${zipPath}" -Force`;
    await runCommand("powershell.exe", [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      psCommand,
    ]);
  } else {
    await runCommand("zip", ["-r", zipPath, "."], { cwd: DIST });
  }
  console.log(`Created: ${zipName}`);
}

async function watchBundle(): Promise<void> {
  // Bun.build does not currently expose a JS watch API; shell out to the CLI.
  await runCommand(
    "bun",
    [
      "build",
      SRC_ENTRY,
      "--outdir",
      DIST,
      "--target",
      "browser",
      "--format",
      "iife",
      "--watch",
    ],
    { cwd: ROOT },
  );
}

async function main(): Promise<void> {
  const mode = parseMode();
  if (mode === "build") {
    await clean();
    await copyStatic();
    await bundle();
    console.log("Build complete: dist/");
  } else if (mode === "watch") {
    await clean();
    await copyStatic();
    await watchBundle();
  } else {
    await clean();
    await copyStatic();
    await bundle();
    await makeZip();
  }
}

await main();
