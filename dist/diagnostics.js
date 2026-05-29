/**
 * @fileoverview Builds repository-neutral diagnostics snapshots (workspace package script inventory,
 * toolchain versions, optional guard paths, wrapper metadata) consumed by Ink/OpenTUI maintainer
 * surfaces and root orchestration scripts.
 *
 * This file owns synchronous filesystem reads of `package.json` files, workspace glob expansion,
 * npm-script classification, and the normalized payload shape exported for JSON and UI rendering.
 * Flow: resolve workspace dirs -> read per-package scripts -> derive flags -> merge wrappers and
 * toolchain probes into `PlatformOrchestrationKit_buildDiagnosticsPayload`.
 *
 * @testing Node test (tsx): cd packages/platform-orchestration-kit && node ../../node_modules/tsx/dist/cli.mjs --test src/diagnostics.unit.test.ts
 *
 * @see packages/platform-orchestration-kit/src/diagnostics.unit.test.ts - Regression coverage for workspace resolution, script classification, and the assembled diagnostics payload contract owned here.
 * @see packages/platform-orchestration-kit/src/maintainer-ink-app.tsx - Maintainer Ink UI that calls `PlatformOrchestrationKit_buildDiagnosticsPayload` to surface package health alongside orchestration actions.
 * @see scripts/platform-orchestration/print-diagnostics-json.mts - Repo script that imports the same payload builder to emit machine-readable diagnostics for automation and operator inspection.
 * @documentation reviewed=2026-05-22 standard=FILE_OVERVIEW_STANDARDS_TYPESCRIPT@3
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
/** Narrow `unknown` to a JSON-ish object record. */
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
/** Narrow an unknown value to a string array. */
function isStringArray(value) {
    return (Array.isArray(value) && value.every((item) => typeof item === "string"));
}
/** Narrow an unknown object to a string-valued script map. */
function isScriptMap(value) {
    return (isRecord(value) &&
        Object.values(value).every((item) => typeof item === "string"));
}
/** Expands one npm workspace entry into package directories under repoRoot. */
function expandWorkspacePackageEntry(repoRoot, workspaceEntry) {
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
        .filter((packageDir) => fs.existsSync(path.join(repoRoot, packageDir, "package.json")));
}
/** Resolves workspace package directories from root package.json in declaration order. */
export function PlatformOrchestrationKit_resolveWorkspacePackageDirs(repoRoot) {
    const packageJsonPath = path.join(repoRoot, "package.json");
    if (!fs.existsSync(packageJsonPath)) {
        return [];
    }
    let parsed;
    try {
        parsed = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    }
    catch {
        return [];
    }
    if (!isRecord(parsed)) {
        return [];
    }
    const workspaces = parsed.workspaces;
    const workspaceEntries = isStringArray(workspaces)
        ? workspaces
        : isRecord(workspaces) && isStringArray(workspaces.packages)
            ? workspaces.packages
            : [];
    const seen = new Set();
    const packageDirs = [];
    for (const workspaceEntry of workspaceEntries) {
        for (const packageDir of expandWorkspacePackageEntry(repoRoot, workspaceEntry)) {
            if (seen.has(packageDir)) {
                continue;
            }
            seen.add(packageDir);
            packageDirs.push(packageDir);
        }
    }
    return packageDirs;
}
/** Reads `package.json` scripts for a package directory under repoRoot. */
export function PlatformOrchestrationKit_readPackageScripts(repoRoot, packageDir) {
    const pkgPath = path.join(repoRoot, packageDir, "package.json");
    if (!fs.existsSync(pkgPath)) {
        return undefined;
    }
    let parsed;
    try {
        parsed = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    }
    catch {
        return undefined;
    }
    if (!isRecord(parsed)) {
        return undefined;
    }
    return isScriptMap(parsed.scripts) ? parsed.scripts : {};
}
/** Classifies a package's test script for diagnostics. */
export function PlatformOrchestrationKit_classifyTestScript(repoRoot, packageDir) {
    const scripts = PlatformOrchestrationKit_readPackageScripts(repoRoot, packageDir);
    if (!scripts || !("test" in scripts) || scripts.test === undefined) {
        return "missing";
    }
    const normalized = scripts.test.trim();
    if (normalized.startsWith("echo ") &&
        normalized.includes("Error") &&
        normalized.includes("no test specified")) {
        return "placeholder";
    }
    return "present";
}
/** Resolves a package-local type-check script name. */
export function PlatformOrchestrationKit_resolveTypeCheckScript(repoRoot, packageDir) {
    const scripts = PlatformOrchestrationKit_readPackageScripts(repoRoot, packageDir);
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
/** Builds ordered preview targets for a workspace package from its declared npm scripts. */
export function PlatformOrchestrationKit_buildPackagePreviewTargets(options) {
    const scripts = PlatformOrchestrationKit_readPackageScripts(options.repoRoot, options.packageDir);
    if (!scripts) {
        return [];
    }
    const targets = [];
    if ("build" in scripts) {
        targets.push({ label: "build", script: "build" });
    }
    const typeCheckScript = PlatformOrchestrationKit_resolveTypeCheckScript(options.repoRoot, options.packageDir);
    if (typeCheckScript !== null) {
        targets.push({ label: typeCheckScript, script: typeCheckScript });
    }
    if ("lint" in scripts) {
        targets.push({ label: "lint", script: "lint" });
    }
    if (PlatformOrchestrationKit_classifyTestScript(options.repoRoot, options.packageDir) === "present") {
        targets.push({ label: "test", script: "test" });
    }
    return targets;
}
/** Captures one version line from a synchronous subprocess for diagnostics. */
function spawnVersionLine(command, args) {
    const result = spawnSync(command, [...args], {
        encoding: "utf8",
        maxBuffer: 64 * 1024,
        stdio: ["ignore", "pipe", "pipe"],
    });
    if (result.error) {
        return `(error: ${result.error.message})`;
    }
    const out = (result.stdout ?? "").trim() || (result.stderr ?? "").trim();
    return out.length > 0 ? out : "(no output)";
}
/** Probes current Node.js and npm versions. */
export function PlatformOrchestrationKit_collectToolchainVersions() {
    return {
        nodeVersion: spawnVersionLine("node", ["-v"]),
        npmVersion: spawnVersionLine("npm", ["-v"]),
    };
}
/** Builds package diagnostics for explicit package dirs or workspaces from repoRoot. */
export function PlatformOrchestrationKit_buildPackageDiagnostics(options) {
    const resolvedRoot = path.resolve(options.repoRoot);
    const packageDirs = options.packageDirs ??
        PlatformOrchestrationKit_resolveWorkspacePackageDirs(resolvedRoot);
    const rows = [];
    for (const dir of packageDirs) {
        const pkgPath = path.join(resolvedRoot, dir, "package.json");
        const hasPackageJson = fs.existsSync(pkgPath);
        const scriptsMap = PlatformOrchestrationKit_readPackageScripts(resolvedRoot, dir);
        const scriptKeys = scriptsMap ? Object.keys(scriptsMap).sort() : [];
        const typeCheck = PlatformOrchestrationKit_resolveTypeCheckScript(resolvedRoot, dir);
        rows.push({
            dir,
            hasPackageJson,
            scriptKeysSample: scriptKeys.slice(0, 12),
            scripts: {
                build: Boolean(scriptsMap && "build" in scriptsMap),
                lint: Boolean(scriptsMap && "lint" in scriptsMap),
                test: PlatformOrchestrationKit_classifyTestScript(resolvedRoot, dir),
                typeCheck,
            },
        });
    }
    return rows;
}
/** Builds the full diagnostics payload from repoRoot plus adapter-provided wrapper/guard config. */
export function PlatformOrchestrationKit_buildDiagnosticsPayload(options) {
    const resolvedRoot = path.resolve(options.repoRoot);
    const guardPath = options.contentQueueGuardsPath
        ? path.resolve(resolvedRoot, options.contentQueueGuardsPath)
        : "";
    return {
        contentQueueGuardsScriptExists: guardPath.length > 0 ? fs.existsSync(guardPath) : false,
        packages: PlatformOrchestrationKit_buildPackageDiagnostics({
            packageDirs: options.packageDirs,
            repoRoot: resolvedRoot,
        }),
        repoRoot: resolvedRoot,
        schemaVersion: 1,
        toolchain: PlatformOrchestrationKit_collectToolchainVersions(),
        wrappers: options.wrappers.map((wrapper) => ({
            npmScript: wrapper.npmScript,
            scriptPath: wrapper.scriptPath,
        })),
    };
}
//# sourceMappingURL=diagnostics.js.map