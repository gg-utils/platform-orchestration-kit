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
import path from "node:path";
/** Parses common platform UI flags for project root, command preview, and help. */
export function PlatformOrchestrationKit_parseUiLaunchOptions(argv) {
    let projectRoot = process.cwd();
    let helpRequested = false;
    let printCommandScript = null;
    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index];
        if (token === undefined) {
            break;
        }
        if (token === "--help" || token === "-h") {
            helpRequested = true;
            continue;
        }
        if (token === "--project-root") {
            const next = argv[index + 1];
            if (next === undefined || next.startsWith("-")) {
                throw new Error("--project-root requires a path argument.");
            }
            projectRoot = path.resolve(next);
            index += 1;
            continue;
        }
        if (token === "--print-command") {
            const next = argv[index + 1];
            if (next === undefined || next.startsWith("-")) {
                throw new Error("--print-command requires an npm script name.");
            }
            printCommandScript = next;
            index += 1;
            continue;
        }
        throw new Error(`Unknown argument: ${token}`);
    }
    return {
        helpRequested,
        printCommandScript,
        projectRoot,
    };
}
/** Builds stable help text for platform UI launchers while adapters own user-facing labels. */
export function PlatformOrchestrationKit_buildUiHelpText(options) {
    const extraLines = options.extraLines ?? [];
    const lines = [
        `Usage: ${options.programLabel} [options]`,
        "",
        options.description,
        "",
        "Options:",
        "  --project-root <path>   Repo root (defaults to cwd).",
        "  --print-command <name>  Print the npm invocation and exit.",
        "  --help, -h              Show this help.",
    ];
    if (extraLines.length > 0) {
        lines.push("", ...extraLines);
    }
    if (options.examples.length > 0) {
        lines.push("", "Examples:", ...options.examples.map((example) => `  ${example}`));
    }
    return `${lines.join("\n")}\n`;
}
//# sourceMappingURL=ui-launcher.js.map