/**
 * @fileoverview Reusable package-script orchestration helpers for workspace command wrappers.
 *
 * Flow: repo root discovery -> workspace package discovery -> package.json script lookup -> npm/npx
 * subprocess execution -> captured result formatting. Project adapters supply source-first package
 * allowlists, root-owned ESLint argv, and concrete script paths.
 *
 * @testing Node test runner (tsx --test): npm run platform-orchestration-kit:test
 *
 * @see scripts/platform/lib/orchestration.ts - Root `scripts/platform` adapter that imports these helpers and layers consumer-specific package policy and ESLint argv from `platform-orchestration.config.ts`.
 * @see packages/platform-orchestration-kit/src/package-orchestration.unit.test.ts - Node test runner coverage for workspace discovery, script classification, and npm/npx spawn result normalization owned by this module.
 * @see scripts/checks/platform-orchestration-package-boundary.ts - Package-boundary check that keeps the `package-orchestration` subpath export stable for repo adapters importing this surface.
 * @documentation reviewed=2026-05-23 standard=FILE_OVERVIEW_STANDARDS_TYPESCRIPT@3
 */

import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const PLATFORM_ORCHESTRATION_KIT_MAX_BUFFER_BYTES = 1024 * 1024 * 64;

/** Result shape returned by npm/npx command runner helpers. */
export type PlatformOrchestrationKit_RunResult = {
  exitCode: number | null;
  ok: boolean;
  stderr: string;
  stdout: string;
};

/** A package directory and the script it exposes. */
export type PlatformOrchestrationKit_PackageWithScript = {
  dir: string;
  script: string;
};

/** Options for package script discovery. */
export type PlatformOrchestrationKit_GetPackagesOptions = {
  excludeTestPlaceholder?: boolean;
};

/** Options for npm script preview/runner helpers. */
export type PlatformOrchestrationKit_NpmRunOptions = {
  silent?: boolean;
};

/** Resolves the repository root through Git, falling back to `process.cwd()` when unavailable. */
export function PlatformOrchestrationKit_resolveRepoRoot(): string {
  try {
    return execSync("git rev-parse --show-toplevel", {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();
  } catch {
    return process.cwd();
  }
}

/** Narrow `unknown` to a JSON-ish object record. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Narrow an unknown value to a string array. */
function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

/** Narrow an unknown object to a string-valued npm script map. */
function isScriptMap(value: unknown): value is Record<string, string> {
  return (
    isRecord(value) &&
    Object.values(value).every((item) => typeof item === "string")
  );
}

/** Expands one npm workspace entry into package directories under repoRoot. */
function expandWorkspacePackageEntry(
  repoRoot: string,
  workspaceEntry: string,
): string[] {
  if (!workspaceEntry.includes("*")) {
    return [workspaceEntry];
  }

  if (!workspaceEntry.endsWith("/*")) {
    return [];
  }

  const baseDir = workspaceEntry.slice(0, -2);
  const absoluteBaseDir = path.join(repoRoot, baseDir);
  if (!fs.existsSync(absoluteBaseDir)) {
    return [];
  }

  return fs
    .readdirSync(absoluteBaseDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(baseDir, entry.name))
    .filter((packageDir) =>
      fs.existsSync(path.join(repoRoot, packageDir, "package.json")),
    );
}

/** Resolves root workspace package directories in package.json order. */
export function PlatformOrchestrationKit_resolveWorkspacePackageDirs(
  repoRoot: string,
): string[] {
  const packageJsonPath = path.join(repoRoot, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    return [];
  }

  let packageJson: unknown;
  try {
    packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  } catch {
    return [];
  }

  if (!isRecord(packageJson)) {
    return [];
  }

  const workspaces = packageJson.workspaces;
  const workspaceEntries = isStringArray(workspaces)
    ? workspaces
    : isRecord(workspaces) && isStringArray(workspaces.packages)
      ? workspaces.packages
      : [];
  const seen = new Set<string>();
  const packageDirs: string[] = [];

  for (const workspaceEntry of workspaceEntries) {
    for (const packageDir of expandWorkspacePackageEntry(
      repoRoot,
      workspaceEntry,
    )) {
      if (seen.has(packageDir)) {
        continue;
      }
      seen.add(packageDir);
      packageDirs.push(packageDir);
    }
  }

  return packageDirs;
}

/** Returns true when the value is the npm-init placeholder test script. */
export function PlatformOrchestrationKit_isTestPlaceholderScript(
  value: string,
): boolean {
  const normalized = value.trim();
  return (
    normalized.startsWith("echo ") &&
    normalized.includes("Error") &&
    normalized.includes("no test specified")
  );
}

/** Reads package.json scripts from an absolute path; returns undefined if file missing/invalid. */
export function PlatformOrchestrationKit_readPackageScriptsAtPath(
  packageJsonPath: string,
): Record<string, string> | undefined {
  if (!fs.existsSync(packageJsonPath)) {
    return undefined;
  }

  let packageJson: unknown;
  try {
    packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  } catch {
    return undefined;
  }

  if (!isRecord(packageJson)) {
    return undefined;
  }
  return isScriptMap(packageJson.scripts) ? packageJson.scripts : {};
}

/** Reads package.json scripts for a package directory under the repo root. */
export function PlatformOrchestrationKit_readPackageScripts(
  repoRoot: string,
  packageDir: string,
): Record<string, string> | undefined {
  return PlatformOrchestrationKit_readPackageScriptsAtPath(
    path.join(repoRoot, packageDir, "package.json"),
  );
}

/** Classifies a package test script for orchestration diagnostics and test selection. */
export function PlatformOrchestrationKit_classifyTestScript(
  repoRoot: string,
  packageDir: string,
): "missing" | "placeholder" | "present" {
  const scripts = PlatformOrchestrationKit_readPackageScripts(
    repoRoot,
    packageDir,
  );
  if (!scripts || !("test" in scripts) || scripts.test === undefined) {
    return "missing";
  }
  if (PlatformOrchestrationKit_isTestPlaceholderScript(scripts.test)) {
    return "placeholder";
  }
  return "present";
}

/** Returns packages that expose the requested script. */
export function PlatformOrchestrationKit_getPackagesWithScript(
  repoRoot: string,
  packageDirs: readonly string[],
  scriptName: string,
  options: PlatformOrchestrationKit_GetPackagesOptions = {},
): PlatformOrchestrationKit_PackageWithScript[] {
  const result: PlatformOrchestrationKit_PackageWithScript[] = [];

  for (const dir of packageDirs) {
    const scripts = PlatformOrchestrationKit_readPackageScripts(repoRoot, dir);
    if (!scripts || !(scriptName in scripts)) {
      continue;
    }
    if (
      scriptName === "test" &&
      options.excludeTestPlaceholder === true &&
      scripts.test !== undefined &&
      PlatformOrchestrationKit_isTestPlaceholderScript(scripts.test)
    ) {
      continue;
    }
    result.push({ dir, script: scriptName });
  }

  return result;
}

/** Resolves a package type-check script name: `type-check` if present, else `ts:check`. */
export function PlatformOrchestrationKit_resolveTypeCheckScript(
  repoRoot: string,
  packageDir: string,
): "type-check" | "ts:check" | null {
  const scripts = PlatformOrchestrationKit_readPackageScripts(
    repoRoot,
    packageDir,
  );
  if (!scripts) {
    return null;
  }
  if ("type-check" in scripts) {
    return "type-check";
  }
  if ("ts:check" in scripts) {
    return "ts:check";
  }
  return null;
}

/** Runs an npm script in a package directory from repo root using `--prefix`. */
export function PlatformOrchestrationKit_runPackageCommand(
  repoRoot: string,
  packageDir: string,
  scriptName: string,
  options: PlatformOrchestrationKit_NpmRunOptions = {},
): PlatformOrchestrationKit_RunResult {
  const args = ["run", scriptName, "--prefix", packageDir];
  if (options.silent === true) {
    args.splice(1, 0, "--silent");
  }

  return runCommand("npm", args, repoRoot, "pipe");
}

/** Runs an npm script from the root package. */
export function PlatformOrchestrationKit_runRootCommand(
  repoRoot: string,
  npmScript: string,
  options: PlatformOrchestrationKit_NpmRunOptions = {},
): PlatformOrchestrationKit_RunResult {
  const args = [
    "run",
    ...(options.silent === true ? ["--silent"] : []),
    npmScript,
  ];
  return runCommand("npm", args, repoRoot, "pipe");
}

/** Runs an `npx` command from repo root with captured stdout/stderr. */
export function PlatformOrchestrationKit_runNpxCommand(
  repoRoot: string,
  args: readonly string[],
): PlatformOrchestrationKit_RunResult {
  return runCommand("npx", [...args], repoRoot, "pipe");
}

/** Runs `npx tsx <scriptPathUnderRepo>` from repo root after checking the script exists. */
export function PlatformOrchestrationKit_runNpxTsxScript(options: {
  repoRoot: string;
  scriptPathUnderRepo: string;
  stdio?: "inherit-stdin" | "pipe";
}): PlatformOrchestrationKit_RunResult {
  const scriptPath = path.join(options.repoRoot, options.scriptPathUnderRepo);
  if (!fs.existsSync(scriptPath)) {
    return {
      exitCode: 1,
      ok: false,
      stderr: `Script not found: ${scriptPath}`,
      stdout: "",
    };
  }

  return runCommand(
    "npx",
    ["tsx", scriptPath],
    options.repoRoot,
    options.stdio === "inherit-stdin" ? "inherit-stdin" : "pipe",
  );
}

/** Prints captured stdout/stderr for a failed orchestration run when either stream is non-empty. */
export function PlatformOrchestrationKit_printRunFailureDetails(
  label: string,
  result: PlatformOrchestrationKit_RunResult,
): void {
  const stdout = result.stdout.trim();
  const stderr = result.stderr.trim();

  if (stdout.length === 0 && stderr.length === 0) {
    return;
  }

  console.log("");
  console.log(`----- ${label} captured output -----`);
  if (stdout.length > 0) {
    console.log("[stdout]");
    console.log(stdout);
  }
  if (stderr.length > 0) {
    console.log("[stderr]");
    console.log(stderr);
  }
  console.log(`----- end ${label} captured output -----`);
}

/** Shared spawnSync wrapper that normalizes process results. */
function runCommand(
  command: string,
  args: readonly string[],
  cwd: string,
  stdioMode: "inherit-stdin" | "pipe",
): PlatformOrchestrationKit_RunResult {
  const result = spawnSync(command, [...args], {
    cwd,
    encoding: "utf8",
    maxBuffer: PLATFORM_ORCHESTRATION_KIT_MAX_BUFFER_BYTES,
    stdio: stdioMode === "inherit-stdin" ? ["inherit", "pipe", "pipe"] : "pipe",
  });

  return {
    exitCode: result.status,
    ok: result.status === 0,
    stderr: result.stderr ?? "",
    stdout: result.stdout ?? "",
  };
}
