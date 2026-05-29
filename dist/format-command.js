/**
 * @fileoverview Builds copy-paste-safe `npm run` preview lines for platform orchestration surfaces,
 * including forwarded argv tails with shell quoting plus root and `--prefix` package-local forms.
 *
 * This file owns the string assembly only; callers decide which script names, package directories,
 * and argv fragments belong in each preview.
 *
 * @example
 * ```typescript
 * import { PlatformOrchestrationKit_formatNpmRunCommand } from "@gg-utils/platform-orchestration-kit/format-command";
 *
 * PlatformOrchestrationKit_formatNpmRunCommand("test", ["--runTestsByPath", "a b.test.ts"]);
 * ```
 *
 * @testing Node test (tsx): cd packages/platform-orchestration-kit && node ../../node_modules/tsx/dist/cli.mjs --test src/format-command.unit.test.ts
 *
 * @see packages/platform-orchestration-kit/src/format-command.unit.test.ts - Node test module that asserts quoting, `--` forwarding, `--silent`, and `--prefix` spacing for the npm preview strings owned here.
 * @see scripts/platform/ui/lib/format-command.ts - Platform UI adapter that re-exports root `npm run` previews built from this kit for Ink and OpenTUI launcher shells.
 * @see scripts/platform/lib/orchestration.ts - Root orchestration helpers that import the package and root npm preview formatters next to spawn wiring for operator-facing flows.
 * @documentation reviewed=2026-05-22 standard=FILE_OVERVIEW_STANDARDS_TYPESCRIPT@3
 */
/** Builds a display-ready `npm run <script>` line with optional forwarded argv after `--`. */
export function PlatformOrchestrationKit_formatNpmRunCommand(npmScript, forwardedArgs = []) {
    if (forwardedArgs.length === 0) {
        return `npm run ${npmScript}`;
    }
    const tail = forwardedArgs.map((arg) => shellQuote(arg)).join(" ");
    return `npm run ${npmScript} -- ${tail}`;
}
/** Shell-quotes one token for a copy/paste command preview. */
function shellQuote(argument) {
    if (/^[a-zA-Z0-9@%+=:,./-]+$/.test(argument)) {
        return argument;
    }
    return `'${argument.replace(/'/g, "'\\''")}'`;
}
/** Human-readable `npm run` line matching a package-local `npm run --prefix` invocation. */
export function PlatformOrchestrationKit_formatNpmRunPackageCommandLine(packageDir, scriptName, options = {}) {
    const parts = ["npm", "run"];
    if (options.silent) {
        parts.push("--silent");
    }
    parts.push(scriptName, "--prefix", packageDir);
    return parts.join(" ");
}
/** Human-readable `npm run` line matching a root package npm-script invocation. */
export function PlatformOrchestrationKit_formatNpmRunRootCommandLine(npmScript, options = {}) {
    const parts = ["npm", "run"];
    if (options.silent) {
        parts.push("--silent");
    }
    parts.push(npmScript);
    return parts.join(" ");
}
//# sourceMappingURL=format-command.js.map