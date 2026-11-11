/**
 * @fileoverview Pure screen-state helpers for OpenTUI-style platform command browsers that bridge
 * command selections to catalog-backed npm script names and deploy-target gating.
 *
 * This file owns the shared `PlatformOrchestrationKit_*` selection helpers consumed by root CLI
 * adapters and re-exported from `@gg-utils/platform-orchestration-kit`.
 * Flow: command row -> deploy phase visibility -> resolved npm script string via the command catalog.
 *
 * @testing Jest unit: npm run test -- scripts/platform/ui/cli-opentui/screen-state.unit.test.ts
 * @testing TypeScript noEmit: npm run platform-orchestration-kit:type-check
 *
 * @see packages/platform-orchestration-kit/src/command-catalog.ts - Command catalog types plus `PlatformOrchestrationKit_resolveCommandNpmScript`, which validates deploy targets and resolves npm scripts for the wrappers exported here.
 * @see scripts/platform/ui/cli-opentui/screen-state.ts - Root OpenTUI adapter that imports this module and is covered by the Jest suite asserting deploy-phase visibility and npm script resolution against platform command definitions.
 * @see packages/platform-orchestration-kit/src/index.ts - Package barrel that re-exports this module on the primary `@gg-utils/platform-orchestration-kit` surface.
 * @documentation reviewed=2026-05-23 standard=FILE_OVERVIEW_STANDARDS_TYPESCRIPT@3
 */
import { PlatformOrchestrationKit_resolveCommandNpmScript, } from "./command-catalog.js";
/** Resolves the npm script name for a selected command and optional deploy target. */
export function PlatformOrchestrationKit_resolveNpmScriptForSelection(options) {
    return PlatformOrchestrationKit_resolveCommandNpmScript({
        command: options.command,
        deployTarget: options.deployTarget,
    });
}
/** Returns whether a command selection requires the deploy-target phase. */
export function PlatformOrchestrationKit_shouldShowDeployPhase(command) {
    return command?.requiresDeployTarget === true;
}
