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
/** Wrapper metadata surfaced in diagnostics and maintainer menus. */
export type PlatformOrchestrationKit_WrapperEntry = {
    description: string;
    npmScript: string;
    scriptPath: string;
};
/** Per-package diagnostics snapshot for build/lint/test/type-check script availability. */
export type PlatformOrchestrationKit_PackageDiagnostics = {
    dir: string;
    hasPackageJson: boolean;
    scriptKeysSample: readonly string[];
    scripts: {
        build: boolean;
        lint: boolean;
        test: "missing" | "placeholder" | "present";
        typeCheck: "type-check" | "ts:check" | null;
    };
};
/** Full diagnostics payload used by Ink/OpenTUI/platform-orchestration JSON surfaces. */
export type PlatformOrchestrationKit_DiagnosticsPayload = {
    contentQueueGuardsScriptExists: boolean;
    packages: readonly PlatformOrchestrationKit_PackageDiagnostics[];
    repoRoot: string;
    schemaVersion: 1;
    toolchain: {
        npmVersion: string;
        nodeVersion: string;
    };
    wrappers: readonly {
        npmScript: string;
        scriptPath: string;
    }[];
};
/** Options for diagnostics assembly. */
export type PlatformOrchestrationKit_DiagnosticsOptions = {
    contentQueueGuardsPath?: string;
    packageDirs?: readonly string[];
    repoRoot: string;
    wrappers: readonly PlatformOrchestrationKit_WrapperEntry[];
};
/** Resolves workspace package directories from root package.json in declaration order. */
export declare function PlatformOrchestrationKit_resolveWorkspacePackageDirs(repoRoot: string): string[];
/** Reads `package.json` scripts for a package directory under repoRoot. */
export declare function PlatformOrchestrationKit_readPackageScripts(repoRoot: string, packageDir: string): Record<string, string> | undefined;
/** Classifies a package's test script for diagnostics. */
export declare function PlatformOrchestrationKit_classifyTestScript(repoRoot: string, packageDir: string): "missing" | "placeholder" | "present";
/** Resolves a package-local type-check script name. */
export declare function PlatformOrchestrationKit_resolveTypeCheckScript(repoRoot: string, packageDir: string): "type-check" | "ts:check" | null;
/** Selectable package npm-script preview target. */
export type PlatformOrchestrationKit_PackagePreviewTarget = {
    label: string;
    script: string;
};
/** Builds ordered preview targets for a workspace package from its declared npm scripts. */
export declare function PlatformOrchestrationKit_buildPackagePreviewTargets(options: {
    packageDir: string;
    repoRoot: string;
}): readonly PlatformOrchestrationKit_PackagePreviewTarget[];
/** Probes current Node.js and npm versions. */
export declare function PlatformOrchestrationKit_collectToolchainVersions(): {
    nodeVersion: string;
    npmVersion: string;
};
/** Builds package diagnostics for explicit package dirs or workspaces from repoRoot. */
export declare function PlatformOrchestrationKit_buildPackageDiagnostics(options: {
    packageDirs?: readonly string[];
    repoRoot: string;
}): readonly PlatformOrchestrationKit_PackageDiagnostics[];
/** Builds the full diagnostics payload from repoRoot plus adapter-provided wrapper/guard config. */
export declare function PlatformOrchestrationKit_buildDiagnosticsPayload(options: PlatformOrchestrationKit_DiagnosticsOptions): PlatformOrchestrationKit_DiagnosticsPayload;
