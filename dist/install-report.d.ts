/**
 * @fileoverview Reusable install-phase reporting helpers for repository bootstrap CLIs.
 *
 * Flow: phase step buckets -> consistently formatted headers, per-phase result sections, final
 * summaries, and required-action lists. Repository scripts keep project-specific remediation text
 * and command execution; this package owns the display contract and status derivation.
 *
 * @testing Node test (tsx): npm run platform-orchestration-kit:test
 *
 * @see scripts/platform/commands/install-all.ts - platform:install orchestrator that prints phased headers, results, summaries, and required actions using the helpers and types exported from this module.
 * @see packages/platform-orchestration-kit/src/install-report.unit.test.ts - Node tests that lock console formatting, installPhaseResultStatus mapping, and unexpected exception reporting owned here.
 * @see packages/platform-orchestration-kit/src/index.ts - Package barrel that re-exports this install-report surface for @gg-utils/platform-orchestration-kit consumers.
 * @documentation reviewed=2026-05-22 standard=FILE_OVERVIEW_STANDARDS_TYPESCRIPT@3
 */
/** One labeled row in printed phase result or summary sections. */
export type PlatformOrchestrationKit_InstallReportItem = {
    readonly detail?: string;
    readonly label: string;
};
/** Numbered remediation steps shown after failures or hard blocks. */
export type PlatformOrchestrationKit_InstallActionPlan = {
    readonly steps: readonly string[];
    readonly title: string;
};
/** Coarse phase status used in printed result banners. */
export type PlatformOrchestrationKit_InstallPhaseStatus = "BLOCKED" | "COMPLETED" | "FAILED";
/** Printed aggregate outcome for a single numbered installer phase. */
export type PlatformOrchestrationKit_InstallPhaseResult = {
    readonly blockedSteps?: readonly PlatformOrchestrationKit_InstallReportItem[];
    readonly completedSteps?: readonly PlatformOrchestrationKit_InstallReportItem[];
    readonly failedSteps?: readonly PlatformOrchestrationKit_InstallReportItem[];
    readonly notes?: readonly string[];
    readonly phaseCount: number;
    readonly phaseNumber: number;
    readonly resultDivider: string;
    readonly status: PlatformOrchestrationKit_InstallPhaseStatus;
    readonly title: string;
};
/** Quotes a path or argument for copy-paste shell snippets embedded in printed action plans. */
export declare function PlatformOrchestrationKit_shellQuoteForInstallDisplay(value: string): string;
/** Prints a titled bullet list of completed, blocked, or failed steps when non-empty. */
export declare function PlatformOrchestrationKit_printInstallReportSection(options: {
    readonly items: readonly PlatformOrchestrationKit_InstallReportItem[];
    readonly title: string;
}): void;
/** Prints multi-line phase notes with consistent indentation and blank-line preservation. */
export declare function PlatformOrchestrationKit_printInstallNotesSection(options: {
    readonly lines: readonly string[];
    readonly title: string;
}): void;
/** Prints the banner framing the start of a numbered installer phase. */
export declare function PlatformOrchestrationKit_printInstallPhaseHeader(options: {
    readonly divider: string;
    readonly phaseCount: number;
    readonly phaseNumber: number;
    readonly subtitle: string;
    readonly title: string;
}): void;
/** Prints the consolidated result block for a phase. */
export declare function PlatformOrchestrationKit_printInstallPhaseResult(options: PlatformOrchestrationKit_InstallPhaseResult): void;
/** Prints the overall rolling totals across all phases. */
export declare function PlatformOrchestrationKit_printInstallSummary(options: {
    readonly blockedSteps: readonly PlatformOrchestrationKit_InstallReportItem[];
    readonly completedSteps: readonly PlatformOrchestrationKit_InstallReportItem[];
    readonly divider: string;
    readonly failedSteps: readonly PlatformOrchestrationKit_InstallReportItem[];
}): void;
/** Prints aggregated remediation plans without duplication when the plan list is empty. */
export declare function PlatformOrchestrationKit_printInstallRequiredUserActions(options: {
    readonly divider: string;
    readonly plans: readonly PlatformOrchestrationKit_InstallActionPlan[];
}): void;
/** Derives the coarse phase status used in printed result banners from populated step buckets. */
export declare function PlatformOrchestrationKit_installPhaseResultStatus(options: {
    readonly blockedSteps?: readonly PlatformOrchestrationKit_InstallReportItem[];
    readonly failedSteps?: readonly PlatformOrchestrationKit_InstallReportItem[];
}): PlatformOrchestrationKit_InstallPhaseStatus;
/** Emits a synthetic failed phase report for unexpected exceptions, then rethrows the error. */
export declare function PlatformOrchestrationKit_printUnexpectedInstallPhaseFailure(options: {
    readonly error: unknown;
    readonly phaseCount: number;
    readonly phaseNumber: number;
    readonly resultDivider: string;
    readonly title: string;
}): never;
//# sourceMappingURL=install-report.d.ts.map