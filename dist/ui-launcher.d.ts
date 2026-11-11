/**
 * @fileoverview Shared argv parsing and help-text assembly for Ink and OpenTUI platform orchestration launchers.
 *
 * This module owns the reusable `--project-root`, `--print-command`, and `--help` contract while
 * script adapters keep program labels, descriptions, and examples. Flow: scan argv -> resolve paths
 * -> return structured flags or throw on unknown tokens; help builder concatenates stable option
 * lines with adapter-owned copy.
 *
 * @example
 * ```typescript
 * import {
 *   PlatformOrchestrationKit_buildUiHelpText,
 *   PlatformOrchestrationKit_parseUiLaunchOptions,
 * } from "@gg-utils/platform-orchestration-kit/ui-launcher";
 *
 * const parsed = PlatformOrchestrationKit_parseUiLaunchOptions(["--project-root", "/repo", "--help"]);
 * const help = PlatformOrchestrationKit_buildUiHelpText({
 *   programLabel: "npm run platform:cli:ink --",
 *   description: "Interactive launcher for root platform npm scripts.",
 *   examples: ["npm run platform:cli:ink -- --print-command build"],
 * });
 * ```
 *
 * @testing Node test runner (tsx): cd packages/platform-orchestration-kit && node ../../node_modules/tsx/dist/cli.mjs --test src/ui-launcher.unit.test.ts
 *
 * @see scripts/platform/ui/cli-ink/launch-options.ts - Ink launcher adapter that forwards argv into `PlatformOrchestrationKit_parseUiLaunchOptions` and supplies Ink-specific help copy via `PlatformOrchestrationKit_buildUiHelpText`.
 * @see scripts/platform/ui/cli-opentui/launch-options.ts - OpenTUI launcher adapter that reuses the same parse/build helpers for the Bun-backed platform command browser.
 * @see packages/platform-orchestration-kit/src/ui-launcher.unit.test.ts - Node `node:test` coverage that asserts argv parsing, path resolution, and help output for the exports defined here.
 * @documentation reviewed=2026-05-23 standard=FILE_OVERVIEW_STANDARDS_TYPESCRIPT@3
 */
/** Parsed launcher flags shared by platform Ink/OpenTUI wrappers. */
export type PlatformOrchestrationKit_UiLaunchOptions = {
    helpRequested: boolean;
    printCommandScript: string | null;
    projectRoot: string;
};
/** Parses common platform UI flags for project root, command preview, and help. */
export declare function PlatformOrchestrationKit_parseUiLaunchOptions(argv: readonly string[]): PlatformOrchestrationKit_UiLaunchOptions;
/** Options for generating platform UI launcher help text from adapter-owned copy. */
export type PlatformOrchestrationKit_UiHelpTextOptions = {
    description: string;
    examples: readonly string[];
    extraLines?: readonly string[];
    programLabel: string;
};
/** Builds stable help text for platform UI launchers while adapters own user-facing labels. */
export declare function PlatformOrchestrationKit_buildUiHelpText(options: PlatformOrchestrationKit_UiHelpTextOptions): string;
