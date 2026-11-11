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
import path from "node:path";
/** Parses `--help`, `--json`, and `--project-root <path>` from maintainer CLI argv. */
export function PlatformOrchestrationKit_parseMaintainerArgv(argv) {
    let projectRoot = process.cwd();
    let json = false;
    let help = false;
    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index];
        if (token === undefined) {
            break;
        }
        if (token === "--help" || token === "-h") {
            help = true;
            continue;
        }
        if (token === "--json") {
            json = true;
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
        throw new Error(`Unknown argument: ${token}`);
    }
    if (help) {
        return { kind: "help" };
    }
    if (json) {
        return { kind: "json", projectRoot };
    }
    return { kind: "interactive", projectRoot };
}
/** Returns usage help text for a maintainer CLI, parameterized by the adapter label. */
export function PlatformOrchestrationKit_getMaintainerHelpText(programLabel) {
    return `Usage: ${programLabel} [options]

Maintainer console for platform-orchestration: package script inspection, wrapper routing,
and command previews. Interactive mode requires a TTY.

Options:
  --project-root <path>   Repository root (default: current working directory)
  --json                  Print diagnostics JSON to stdout and exit (no TTY required)
  --help, -h              Show this help

Examples:
  npm run platform:orchestration:cli:ink
  npm run platform:orchestration:cli:ink -- --json
  npm run platform:orchestration:cli:opentui -- --json
`;
}
