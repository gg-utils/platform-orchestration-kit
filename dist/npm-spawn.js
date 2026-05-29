/**
 * @fileoverview Owns the streamed `npm run <script>` subprocess helper used by platform orchestration UI launchers.
 *
 * This module binds Node `child_process.spawn` to `npm` with piped stdout/stderr, optional chunk callbacks, SIGTERM cancellation, and a close-time promise that returns captured output plus exit status.
 * Flow: spawn under `repoRoot` -> stream chunks to optional handlers while buffering full stdout/stderr -> resolve on `close` or reject on spawn `error`.
 *
 * @testing Node test runner: npm run platform-orchestration-kit:test
 * @testing CLI manual: npm run platform:orchestration:cli:ink from the repo root, run a launcher action that executes an npm script, and confirm streamed logs plus exit status in the terminal.
 *
 * @see packages/platform-orchestration-kit/src/ink-app.tsx - Ink-based platform launcher that defaults to this helper when running catalog npm scripts with live streamed output.
 * @see packages/platform-orchestration-kit/src/opentui-app.tsx - OpenTUI launcher that reuses the same npm spawn hook for streamed command execution paths.
 * @see packages/platform-orchestration-kit/src/spawn-npx-tsx.ts - Companion streamed subprocess helper for `npx tsx` maintainer runs that mirrors this module's stdio wiring and close semantics.
 * @documentation reviewed=2026-05-23 standard=FILE_OVERVIEW_STANDARDS_TYPESCRIPT@3
 */
import { spawn } from "node:child_process";
/**
 * Runs `npm run <script> -- <forwardedArgs>` from `repoRoot` with streamed stdout/stderr.
 *
 * @remarks
 * I/O: spawns a real `npm` child process; inherits `process.env`; buffers full stdout/stderr while optionally forwarding incremental chunks. `cancel` issues SIGTERM when the child is still alive.
 */
export function PlatformOrchestrationKit_spawnNpmRun(repoRoot, npmScript, forwardedArgs, handlers = {}, dependencies) {
    const spawnProcess = dependencies?.spawnProcess ?? spawn;
    const child = spawnProcess("npm", ["run", npmScript, "--", ...forwardedArgs], {
        cwd: repoRoot,
        env: { ...process.env },
        stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => {
        const text = typeof chunk === "string" ? chunk : chunk.toString("utf8");
        stdout += text;
        handlers.onStdoutChunk?.(text);
    });
    child.stderr?.on("data", (chunk) => {
        const text = typeof chunk === "string" ? chunk : chunk.toString("utf8");
        stderr += text;
        handlers.onStderrChunk?.(text);
    });
    const promise = new Promise((resolve, reject) => {
        child.on("error", (error) => {
            reject(error);
        });
        child.on("close", (code) => {
            resolve({
                status: code ?? 1,
                stderr,
                stdout,
            });
        });
    });
    return {
        cancel: () => {
            if (!child.killed && child.pid !== undefined) {
                child.kill("SIGTERM");
            }
        },
        promise,
    };
}
//# sourceMappingURL=npm-spawn.js.map