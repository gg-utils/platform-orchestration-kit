/**
 * @fileoverview Reusable OpenTUI renderer for config-driven platform command launchers.
 *
 * Flow: injected command catalog -> optional deploy target -> npm preview -> streamed run output
 * -> result pane. Root adapters provide command definitions, project-root resolution, and any
 * target-specific warning copy.
 *
 * @testing Package: `npm run platform-orchestration-kit:type-check`.
 * @see packages/platform-orchestration-kit/src/command-catalog.ts - Command catalog contracts.
 * @documentation reviewed=2026-05-21 standard=FILE_OVERVIEW_STANDARDS_TYPESCRIPT@3
 */
import { type ReactNode } from "react";
import { type PlatformOrchestrationKit_CommandDefinition } from "./command-catalog.js";
import { type PlatformOrchestrationKit_NpmSpawnHandlers } from "./npm-spawn.js";
/** Tab-select option row consumed by OpenTUI select widgets. */
export type PlatformOrchestrationKit_OpenTuiSelectOption = {
    readonly description: string;
    readonly name: string;
    readonly value: string;
};
/** Function bundle supplied by the root adapter for command execution customisation. */
export type PlatformOrchestrationKit_OpenTuiAppBehavior<Command extends PlatformOrchestrationKit_CommandDefinition> = {
    readonly formatNpmRunCommand?: (npmScript: string) => string;
    readonly getCommandWarning?: (options: {
        readonly command: Command;
        readonly deployTarget: string | null;
    }) => string | null;
    readonly resolveNpmScript?: (options: {
        readonly command: Command;
        readonly deployTarget: string | null;
    }) => string;
    readonly spawnNpmRun?: (projectRoot: string, npmScript: string, forwardedArgs: readonly string[], handlers: PlatformOrchestrationKit_NpmSpawnHandlers) => {
        readonly cancel: () => void;
        readonly promise: Promise<{
            readonly status: number;
        }>;
    };
};
/** Props for the reusable platform command OpenTUI renderer. */
export type PlatformOrchestrationKit_OpenTuiAppProps<Command extends PlatformOrchestrationKit_CommandDefinition> = {
    readonly behavior?: PlatformOrchestrationKit_OpenTuiAppBehavior<Command>;
    readonly commands: readonly Command[];
    readonly headerText: string;
    readonly projectRoot: string;
};
/** OpenTUI root component for a config-driven platform command browser. */
export declare function PlatformOrchestrationKitOpenTuiApp<Command extends PlatformOrchestrationKit_CommandDefinition>({ behavior, commands, headerText, projectRoot, }: PlatformOrchestrationKit_OpenTuiAppProps<Command>): ReactNode;
//# sourceMappingURL=opentui-app.d.ts.map