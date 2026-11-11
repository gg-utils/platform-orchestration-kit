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
import { spawn } from "node:child_process";
import path from "node:path";
/**
 * Spawns `npx tsx` against a script path under `repoRoot` and streams stdout/stderr.
 *
 * @remarks
 * I/O: runs `npx` with argv `tsx`, absolute script path, then `args`; inherits `process.env`; stdin is ignored and both output streams are piped.
 * `promise` rejects on the child `error` event (for example a missing `npx` binary) and otherwise resolves `{ status }` from the `close` code (null coerces to exit status `1`).
 */
export function PlatformOrchestrationKit_spawnNpxTsx(repoRoot, scriptPathUnderRepo, args = [], handlers = {}) {
    const scriptAbs = path.join(repoRoot, scriptPathUnderRepo);
    const child = spawn("npx", ["tsx", scriptAbs, ...args], {
        cwd: repoRoot,
        env: { ...process.env },
        stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout?.on("data", (chunk) => {
        const text = typeof chunk === "string" ? chunk : chunk.toString("utf8");
        handlers.onStdoutChunk?.(text);
    });
    child.stderr?.on("data", (chunk) => {
        const text = typeof chunk === "string" ? chunk : chunk.toString("utf8");
        handlers.onStderrChunk?.(text);
    });
    const promise = new Promise((resolve, reject) => {
        child.on("error", (error) => {
            reject(error);
        });
        child.on("close", (code) => {
            resolve({ status: code ?? 1 });
        });
    });
    return { child, promise };
}
/**
 * Builds a printable `npx tsx` command line for previews, logs, and copy/paste.
 *
 * @remarks
 * Returns a space-joined argv preview using `scriptPathUnderRepo` as written (not absolute); spawn uses the absolute path resolved under `repoRoot`.
 */
export function PlatformOrchestrationKit_formatNpxTsxCommandLine(scriptPathUnderRepo, args = []) {
    return ["npx", "tsx", scriptPathUnderRepo, ...args].join(" ");
}
