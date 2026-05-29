/**
 * @fileoverview Streams `npx tsx` subprocess runs for maintainer wrapper scripts under a repo root,
 * plus a printable command-line formatter for previews and logs.
 *
 * This file owns `PlatformOrchestrationKit_spawnNpxTsx`, which pipes stdout/stderr into optional chunk
 * handlers and resolves an exit-status promise on `close`, and `PlatformOrchestrationKit_formatNpxTsxCommandLine`
 * for human-readable previews.
 * Flow: join `repoRoot` with `scriptPathUnderRepo` -> spawn `npx tsx <absoluteScript>` with cwd at `repoRoot` -> stream stdio until `close`.
 *
 * @testing Node test runner: npm run platform-orchestration-kit:test from the repo root
 * @testing CLI manual: npm run platform:orchestration:cli:ink from the repo root, trigger a maintainer action that runs an `npx tsx` wrapper, and confirm streamed log lines plus final exit status in the terminal.
 *
 * @see packages/platform-orchestration-kit/src/npm-spawn.ts - Streamed `npm run` subprocess helper paired with this module for catalog npm actions that share the same stdio wiring and close-or-error promise shape.
 * @see packages/platform-orchestration-kit/src/maintainer-ink-app.tsx - Ink maintainer shell that invokes `PlatformOrchestrationKit_spawnNpxTsx` for wrapper runs and surfaces `PlatformOrchestrationKit_formatNpxTsxCommandLine` in previews.
 * @see packages/platform-orchestration-kit/src/format-command.unit.test.ts - Node unit tests that assert `PlatformOrchestrationKit_formatNpxTsxCommandLine` output for copy/paste strings exported alongside the spawn helpers here.
 * @documentation reviewed=2026-05-23 standard=FILE_OVERVIEW_STANDARDS_TYPESCRIPT@3
 */
import { type ChildProcess } from "node:child_process";
/**
 * Optional stdout/stderr chunk handlers for streamed `npx tsx` maintainer runs.
 *
 * @remarks
 * Handlers receive UTF-8 decoded text chunks as the child process emits `data` on each stream.
 */
export type PlatformOrchestrationKit_NpxTsxSpawnHandlers = {
    onStderrChunk?: (chunk: string) => void;
    onStdoutChunk?: (chunk: string) => void;
};
/**
 * Spawns `npx tsx` against a script path under `repoRoot` and streams stdout/stderr.
 *
 * @remarks
 * I/O: runs `npx` with argv `tsx`, absolute script path, then `args`; inherits `process.env`; stdin is ignored and both output streams are piped.
 * `promise` rejects on the child `error` event (for example a missing `npx` binary) and otherwise resolves `{ status }` from the `close` code (null coerces to exit status `1`).
 */
export declare function PlatformOrchestrationKit_spawnNpxTsx(repoRoot: string, scriptPathUnderRepo: string, args?: readonly string[], handlers?: PlatformOrchestrationKit_NpxTsxSpawnHandlers): {
    child: ChildProcess;
    promise: Promise<{
        status: number;
    }>;
};
/**
 * Builds a printable `npx tsx` command line for previews, logs, and copy/paste.
 *
 * @remarks
 * Returns a space-joined argv preview using `scriptPathUnderRepo` as written (not absolute); spawn uses the absolute path resolved under `repoRoot`.
 */
export declare function PlatformOrchestrationKit_formatNpxTsxCommandLine(scriptPathUnderRepo: string, args?: readonly string[]): string;
//# sourceMappingURL=spawn-npx-tsx.d.ts.map