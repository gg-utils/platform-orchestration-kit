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

/** Risk classification for a command surfaced in an interactive platform launcher. */
export type PlatformOrchestrationKit_CommandRiskLevel = "normal" | "elevated" | "high";

/** Mapping from a selectable deploy target to the npm script that executes that deployment. */
export type PlatformOrchestrationKit_DeployScriptMapping<DeployTarget extends string = string> = {
  npmScript: string;
  target: DeployTarget;
};

/** A single platform command definition consumed by UI adapters. */
export type PlatformOrchestrationKit_CommandDefinition<
  CommandId extends string = string,
  Category extends string = string,
  DeployTarget extends string = string,
> = {
  category: Category;
  deployScripts?: readonly PlatformOrchestrationKit_DeployScriptMapping<DeployTarget>[];
  description: string;
  id: CommandId;
  label: string;
  npmScript: string | null;
  requiresDeployTarget: boolean;
  riskLevel: PlatformOrchestrationKit_CommandRiskLevel;
};

/** Finds a command definition by id without requiring callers to duplicate catalog traversal. */
export function PlatformOrchestrationKit_findCommandById<
  Command extends PlatformOrchestrationKit_CommandDefinition,
>(options: { commands: readonly Command[]; id: string }): Command | undefined {
  return options.commands.find((entry) => entry.id === options.id);
}

/** Resolves the npm script for a command plus optional deploy target. */
export function PlatformOrchestrationKit_resolveCommandNpmScript<
  Command extends PlatformOrchestrationKit_CommandDefinition,
>(options: { command: Command; deployTarget?: string | null }): string {
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
