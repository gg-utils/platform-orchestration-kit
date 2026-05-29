/**
 * @fileoverview Owns argv parsing and maintainer-facing usage help for platform orchestration CLIs,
 * returning a discriminated `help` | `json` | `interactive` result and resolving `--project-root`
 * to an absolute path.
 *
 * This file keeps maintainer flags (`--help`, `--json`, `--project-root`) consistent across Ink,
 * OpenTUI, and script adapters; it does not inspect TTY state or launch UI runtimes.
 * Flow: scan argv -> record flags and project root -> `--help` short-circuits to help kind (wins
 * over json) -> otherwise return json or interactive using the resolved root (default `process.cwd()`).
 *
 * @testing Node test (tsx): cd packages/platform-orchestration-kit && node ../../node_modules/tsx/dist/cli.mjs --test src/maintainer-argv.unit.test.ts
 *
 * @see packages/platform-orchestration-kit/src/maintainer-argv.unit.test.ts - Node test module asserting help precedence, `--project-root` resolution, and help text for the maintainer argv contract owned here.
 * @see scripts/platform-orchestration/lib/maintainer-argv.ts - Script-layer re-export wrapper that delegates parsing and help text from this kit into Ink and OpenTUI maintainer CLI entrypoints.
 * @see packages/platform-orchestration-kit/src/index.ts - Package barrel that re-exports these helpers alongside other orchestration kit surfaces consumed by root scripts.
 * @documentation reviewed=2026-05-22 standard=FILE_OVERVIEW_STANDARDS_TYPESCRIPT@3
 */
/** Discriminated result of parsing maintainer CLI argv. */
export type PlatformOrchestrationKit_MaintainerParseResult = {
    kind: "help";
} | {
    kind: "json";
    projectRoot: string;
} | {
    kind: "interactive";
    projectRoot: string;
};
/** Parses `--help`, `--json`, and `--project-root <path>` from maintainer CLI argv. */
export declare function PlatformOrchestrationKit_parseMaintainerArgv(argv: readonly string[]): PlatformOrchestrationKit_MaintainerParseResult;
/** Returns usage help text for a maintainer CLI, parameterized by the adapter label. */
export declare function PlatformOrchestrationKit_getMaintainerHelpText(programLabel: string): string;
//# sourceMappingURL=maintainer-argv.d.ts.map