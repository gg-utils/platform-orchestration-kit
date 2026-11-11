/**
 * @fileoverview Product-neutral command catalog contracts and helpers for platform orchestration
 * launchers.
 *
 * This file owns shared types plus `find`/`resolve` helpers for mapping UI-selected commands to npm
 * scripts, including deploy-target branching, while product-specific command rows live in caller
 * config modules.
 *
 * @testing Node test (tsx): cd packages/platform-orchestration-kit && node ../../node_modules/tsx/dist/cli.mjs --test src/command-catalog.unit.test.ts
 *
 * @see packages/platform-orchestration-kit/src/command-catalog.unit.test.ts - Node test module that asserts id lookup and npm-script resolution for deploy and non-deploy commands.
 * @see scripts/platform/ui/lib/commands.ts - Platform UI command wiring that calls the catalog helpers when translating menu selections into runnable npm scripts.
 * @see packages/platform-orchestration-kit/src/ink-app.tsx - Ink launcher adapter that imports `PlatformOrchestrationKit_resolveCommandNpmScript` to run the resolved script from interactive flows.
 * @documentation reviewed=2026-05-22 standard=FILE_OVERVIEW_STANDARDS_TYPESCRIPT@3
 */
/** Finds a command definition by id without requiring callers to duplicate catalog traversal. */
export function PlatformOrchestrationKit_findCommandById(options) {
    return options.commands.find((entry) => entry.id === options.id);
}
/** Resolves the npm script for a command plus optional deploy target. */
export function PlatformOrchestrationKit_resolveCommandNpmScript(options) {
    const { command, deployTarget } = options;
    if (command.requiresDeployTarget) {
        if (deployTarget === undefined || deployTarget === null) {
            throw new Error("Deploy target is required for this command.");
        }
        const match = (command.deployScripts ?? []).find((entry) => entry.target === deployTarget);
        if (match === undefined) {
            throw new Error(`No npm script mapping for deploy target ${deployTarget}.`);
        }
        return match.npmScript;
    }
    if (command.npmScript === null) {
        throw new Error(`Missing npm script mapping for command ${command.id}.`);
    }
    return command.npmScript;
}
