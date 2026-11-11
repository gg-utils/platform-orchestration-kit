/**
 * @fileoverview Public barrel for `@gg-utils/platform-orchestration-kit`, aggregating command-catalog contracts,
 * diagnostics, formatting, interactive menus, subprocess helpers, and Ink/OpenTUI launcher modules.
 *
 * This file owns the package root entrypoint so `scripts/platform/**` and `scripts/platform-orchestration/**`
 * adapters can import a single surface instead of juggling many subpath exports.
 * Flow: repo adapters -> `import ... from "@gg-utils/platform-orchestration-kit"` -> implementation modules re-exported below.
 *
 * @example
 * ```typescript
 * import { PlatformOrchestrationKit_findCommandById } from "@gg-utils/platform-orchestration-kit";
 *
 * const commands = [
 *   {
 *     id: "lint",
 *     category: "quality",
 *     description: "Run linters.",
 *     label: "Lint",
 *     npmScript: "lint",
 *     requiresDeployTarget: false,
 *     riskLevel: "normal" as const,
 *   },
 * ] as const;
 *
 * const picked = PlatformOrchestrationKit_findCommandById({ commands, id: "lint" });
 * ```
 *
 * @testing Node test runner (tsx --test): npm run platform-orchestration-kit:test
 *
 * @see platform-orchestration.config.ts - Repo-specific command rows, wrapper paths, and npm script ids that adapters pair with types and helpers re-exported from this barrel.
 * @see packages/platform-orchestration-kit/README.md - Describes kit ownership boundaries, checks, and how this entrypoint relates to repo-specific configuration.
 * @see scripts/platform/lib/orchestration.ts - Stable `scripts/platform` re-export surface that wires launcher code to the shared kit alongside root orchestration configuration.
 * @documentation reviewed=2026-05-22 standard=FILE_OVERVIEW_STANDARDS_TYPESCRIPT@3
 */
export * from "./command-catalog.js";
export * from "./diagnostics.js";
export * from "./format-command.js";
export * from "./interactive-menu.js";
export * from "./install-report.js";
export * from "./maintainer-argv.js";
export * from "./npm-spawn.js";
export * from "./screen-state.js";
export * from "./spawn-npx-tsx.js";
export * from "./ui-launcher.js";
export * from "./ink-app.js";
export * from "./opentui-app.js";
export * from "./maintainer-ink-app.js";
export * from "./maintainer-opentui-app.js";
