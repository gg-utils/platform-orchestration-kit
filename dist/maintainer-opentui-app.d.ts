/**
 * @fileoverview Reusable OpenTUI maintainer shell for platform orchestration diagnostics.
 *
 * Flow: injected wrapper/config facts -> diagnostics payload -> package/wrapper previews -> optional
 * streamed wrapper execution. Root adapters provide project-specific wrapper metadata and config paths.
 *
 * @testing Package: `npm run platform-orchestration-kit:type-check`.
 * @see packages/platform-orchestration-kit/src/diagnostics.ts - Diagnostics and wrapper contracts.
 * @documentation reviewed=2026-05-21 standard=FILE_OVERVIEW_STANDARDS_TYPESCRIPT@3
 */
import { type ReactNode } from "react";
import { type PlatformOrchestrationKit_WrapperEntry } from "./diagnostics.js";
import { type PlatformOrchestrationKit_NpxTsxSpawnHandlers } from "./spawn-npx-tsx.js";
/** Injectable wrapper-run result used by the maintainer OpenTUI shell. */
export type PlatformOrchestrationKit_MaintainerOpenTuiRunHandle = {
    readonly cancel: () => void;
    readonly promise: Promise<{
        readonly status: number;
    }>;
};
/** Optional host hooks for the maintainer OpenTUI shell. */
export type PlatformOrchestrationKit_MaintainerOpenTuiBehavior = {
    readonly spawnNpxTsx?: (repoRoot: string, scriptPathUnderRepo: string, args: readonly string[], handlers: PlatformOrchestrationKit_NpxTsxSpawnHandlers) => PlatformOrchestrationKit_MaintainerOpenTuiRunHandle;
};
/** Props for the reusable platform orchestration maintainer OpenTUI shell. */
export type PlatformOrchestrationKit_MaintainerOpenTuiAppProps = {
    readonly behavior?: PlatformOrchestrationKit_MaintainerOpenTuiBehavior;
    readonly contentQueueGuardsPath?: string;
    readonly diagnosticsJsonCommandLine?: string;
    readonly headerText?: string;
    readonly projectRoot: string;
    readonly wrappers: readonly PlatformOrchestrationKit_WrapperEntry[];
};
/** OpenTUI maintainer shell for platform orchestration diagnostics, previews, and wrapper runs. */
export declare function PlatformOrchestrationKitMaintainerOpenTuiApp({ behavior, contentQueueGuardsPath, diagnosticsJsonCommandLine, headerText, projectRoot, wrappers, }: PlatformOrchestrationKit_MaintainerOpenTuiAppProps): ReactNode;
//# sourceMappingURL=maintainer-opentui-app.d.ts.map