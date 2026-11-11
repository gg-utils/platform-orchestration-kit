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
export declare function PlatformOrchestrationKit_resolveRepoRoot(): string;
/** Resolves root workspace package directories in package.json order. */
export declare function PlatformOrchestrationKit_resolveWorkspacePackageDirs(repoRoot: string): string[];
/** Returns true when the value is the npm-init placeholder test script. */
export declare function PlatformOrchestrationKit_isTestPlaceholderScript(value: string): boolean;
/** Reads package.json scripts from an absolute path; returns undefined if file missing/invalid. */
export declare function PlatformOrchestrationKit_readPackageScriptsAtPath(packageJsonPath: string): Record<string, string> | undefined;
/** Reads package.json scripts for a package directory under the repo root. */
export declare function PlatformOrchestrationKit_readPackageScripts(repoRoot: string, packageDir: string): Record<string, string> | undefined;
/** Classifies a package test script for orchestration diagnostics and test selection. */
export declare function PlatformOrchestrationKit_classifyTestScript(repoRoot: string, packageDir: string): "missing" | "placeholder" | "present";
/** Returns packages that expose the requested script. */
export declare function PlatformOrchestrationKit_getPackagesWithScript(repoRoot: string, packageDirs: readonly string[], scriptName: string, options?: PlatformOrchestrationKit_GetPackagesOptions): PlatformOrchestrationKit_PackageWithScript[];
/** Resolves a package type-check script name: `type-check` if present, else `ts:check`. */
export declare function PlatformOrchestrationKit_resolveTypeCheckScript(repoRoot: string, packageDir: string): "type-check" | "ts:check" | null;
/** Runs an npm script in a package directory from repo root using `--prefix`. */
export declare function PlatformOrchestrationKit_runPackageCommand(repoRoot: string, packageDir: string, scriptName: string, options?: PlatformOrchestrationKit_NpmRunOptions): PlatformOrchestrationKit_RunResult;
/** Runs an npm script from the root package. */
export declare function PlatformOrchestrationKit_runRootCommand(repoRoot: string, npmScript: string, options?: PlatformOrchestrationKit_NpmRunOptions): PlatformOrchestrationKit_RunResult;
/** Runs an `npx` command from repo root with captured stdout/stderr. */
export declare function PlatformOrchestrationKit_runNpxCommand(repoRoot: string, args: readonly string[]): PlatformOrchestrationKit_RunResult;
/** Runs `npx tsx <scriptPathUnderRepo>` from repo root after checking the script exists. */
export declare function PlatformOrchestrationKit_runNpxTsxScript(options: {
    repoRoot: string;
    scriptPathUnderRepo: string;
    stdio?: "inherit-stdin" | "pipe";
}): PlatformOrchestrationKit_RunResult;
/** Prints captured stdout/stderr for a failed orchestration run when either stream is non-empty. */
export declare function PlatformOrchestrationKit_printRunFailureDetails(label: string, result: PlatformOrchestrationKit_RunResult): void;
