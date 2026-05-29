/**
 * @fileoverview Reusable Ink renderer for config-driven platform command launchers.
 *
 * Flow: injected command catalog -> optional deploy target -> npm preview -> streamed run output
 * -> result summary. Root adapters provide command definitions, project-root resolution, and any
 * project-specific warning copy.
 *
 * @testing Root smoke: `npm run platform:cli:ink -- --help`; package type-check.
 * @see packages/platform-orchestration-kit/src/command-catalog.ts - Command catalog contracts.
 * @documentation reviewed=2026-05-21 standard=FILE_OVERVIEW_STANDARDS_TYPESCRIPT@3
 */
import React from "react";
import { type PlatformOrchestrationKit_CommandDefinition } from "./command-catalog.js";
import { type PlatformOrchestrationKit_NpmSpawnHandlers } from "./npm-spawn.js";
/** Function bundle supplied by the root adapter for command execution customisation. */
export type PlatformOrchestrationKit_InkAppBehavior = {
    readonly formatNpmRunCommand?: (npmScript: string, forwardedArgs: readonly string[]) => string;
    readonly getCommandWarning?: (options: {
        readonly command: PlatformOrchestrationKit_CommandDefinition;
        readonly deployTarget: string | null;
    }) => {
        readonly text: string;
        readonly tone: "red" | "yellow";
    } | null;
    readonly resolveNpmScript?: (options: {
        readonly command: PlatformOrchestrationKit_CommandDefinition;
        readonly deployTarget: string | null;
    }) => string;
    readonly spawnNpmRun?: (projectRoot: string, npmScript: string, forwardedArgs: readonly string[], handlers: PlatformOrchestrationKit_NpmSpawnHandlers) => {
        readonly cancel: () => void;
        readonly promise: Promise<{
            readonly status: number;
        }>;
    };
};
/** Props for the reusable platform command Ink renderer. */
export type PlatformOrchestrationKit_InkAppProps = {
    readonly appName: string;
    readonly behavior?: PlatformOrchestrationKit_InkAppBehavior;
    readonly commands: readonly PlatformOrchestrationKit_CommandDefinition[];
    readonly description: string;
    readonly notice: string | null;
    readonly projectRoot: string;
};
/** Ink root component for a config-driven platform CLI. */
export declare function PlatformOrchestrationKitInkApp(props: PlatformOrchestrationKit_InkAppProps): React.ReactNode;
//# sourceMappingURL=ink-app.d.ts.map