/**
 * @fileoverview Reusable Ink maintainer shell for platform orchestration diagnostics.
 *
 * Flow: injected wrapper/config facts -> diagnostics payload -> package/wrapper previews -> optional
 * streamed wrapper execution. Root adapters provide project-specific wrapper metadata and config paths.
 *
 * @testing Package: `npm run platform-orchestration-kit:test`.
 * @see packages/platform-orchestration-kit/src/diagnostics.ts - Diagnostics and wrapper contracts.
 * @documentation reviewed=2026-05-21 standard=FILE_OVERVIEW_STANDARDS_TYPESCRIPT@3
 */
import React from "react";
import { type PlatformOrchestrationKit_WrapperEntry } from "./diagnostics.js";
import { type PlatformOrchestrationKit_NpxTsxSpawnHandlers } from "./spawn-npx-tsx.js";
/** Injectable wrapper-run result used by the maintainer Ink shell. */
export type PlatformOrchestrationKit_MaintainerInkRunHandle = {
    readonly cancel: () => void;
    readonly promise: Promise<{
        readonly status: number;
    }>;
};
/** Optional host hooks for the maintainer Ink shell. */
export type PlatformOrchestrationKit_MaintainerInkBehavior = {
    readonly spawnNpxTsx?: (repoRoot: string, scriptPathUnderRepo: string, args: readonly string[], handlers: PlatformOrchestrationKit_NpxTsxSpawnHandlers) => PlatformOrchestrationKit_MaintainerInkRunHandle;
};
/** Props for the reusable platform orchestration maintainer Ink shell. */
export type PlatformOrchestrationKit_MaintainerInkAppProps = {
    readonly appName?: string;
    readonly behavior?: PlatformOrchestrationKit_MaintainerInkBehavior;
    readonly contentQueueGuardsPath?: string;
    readonly description?: string;
    readonly diagnosticsJsonCommandLine?: string;
    readonly exampleRootNpmScript?: string;
    readonly projectRoot: string;
    readonly wrappers: readonly PlatformOrchestrationKit_WrapperEntry[];
};
/** Reusable Ink maintainer UI for platform orchestration diagnostics and wrapper runs. */
export declare function PlatformOrchestrationKitMaintainerInkApp({ appName, behavior, contentQueueGuardsPath, description, diagnosticsJsonCommandLine, exampleRootNpmScript, projectRoot, wrappers, }: PlatformOrchestrationKit_MaintainerInkAppProps): React.ReactNode;
//# sourceMappingURL=maintainer-ink-app.d.ts.map