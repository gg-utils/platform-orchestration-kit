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
/** Quotes a path or argument for copy-paste shell snippets embedded in printed action plans. */
export function PlatformOrchestrationKit_shellQuoteForInstallDisplay(value) {
    return JSON.stringify(value);
}
/** Prints a titled bullet list of completed, blocked, or failed steps when non-empty. */
export function PlatformOrchestrationKit_printInstallReportSection(options) {
    if (options.items.length === 0) {
        return;
    }
    console.log(options.title);
    for (const item of options.items) {
        console.log(`  - ${item.label}`);
        if (item.detail !== undefined) {
            console.log(`    ${item.detail}`);
        }
    }
    console.log("");
}
/** Prints multi-line phase notes with consistent indentation and blank-line preservation. */
export function PlatformOrchestrationKit_printInstallNotesSection(options) {
    if (options.lines.length === 0) {
        return;
    }
    console.log(options.title);
    for (const line of options.lines) {
        console.log(line.length > 0 ? `  ${line}` : "");
    }
    console.log("");
}
/** Prints the banner framing the start of a numbered installer phase. */
export function PlatformOrchestrationKit_printInstallPhaseHeader(options) {
    console.log("");
    console.log(options.divider);
    console.log(`PHASE ${options.phaseNumber}/${options.phaseCount} · ${options.title}`);
    console.log(options.subtitle);
    console.log(options.divider);
}
/** Prints the consolidated result block for a phase. */
export function PlatformOrchestrationKit_printInstallPhaseResult(options) {
    console.log("");
    console.log(options.resultDivider);
    console.log(`PHASE ${options.phaseNumber}/${options.phaseCount} RESULT · ${options.status} · ${options.title}`);
    console.log(options.resultDivider);
    PlatformOrchestrationKit_printInstallReportSection({
        items: options.completedSteps ?? [],
        title: "Completed in this phase:",
    });
    PlatformOrchestrationKit_printInstallReportSection({
        items: options.blockedSteps ?? [],
        title: "Blocked in this phase:",
    });
    PlatformOrchestrationKit_printInstallReportSection({
        items: options.failedSteps ?? [],
        title: "Failed in this phase:",
    });
    PlatformOrchestrationKit_printInstallNotesSection({
        lines: options.notes ?? [],
        title: "Notes:",
    });
}
/** Prints the overall rolling totals across all phases. */
export function PlatformOrchestrationKit_printInstallSummary(options) {
    console.log("");
    console.log(options.divider);
    console.log("OVERALL INSTALL SUMMARY");
    console.log(options.divider);
    console.log("");
    PlatformOrchestrationKit_printInstallReportSection({
        items: options.completedSteps,
        title: "Completed:",
    });
    PlatformOrchestrationKit_printInstallReportSection({
        items: options.blockedSteps,
        title: "Blocked:",
    });
    PlatformOrchestrationKit_printInstallReportSection({
        items: options.failedSteps,
        title: "Failed:",
    });
}
/** Prints aggregated remediation plans without duplication when the plan list is empty. */
export function PlatformOrchestrationKit_printInstallRequiredUserActions(options) {
    if (options.plans.length === 0) {
        return;
    }
    console.log("");
    console.log(options.divider);
    console.log("REQUIRED USER ACTIONS");
    console.log(options.divider);
    console.log("");
    options.plans.forEach((plan, index) => {
        console.log(`ACTION ${index + 1}/${options.plans.length} · ${plan.title}`);
        plan.steps.forEach((step, stepIndex) => {
            console.log(`  ${stepIndex + 1}. ${step}`);
        });
        console.log("");
    });
}
/** Derives the coarse phase status used in printed result banners from populated step buckets. */
export function PlatformOrchestrationKit_installPhaseResultStatus(options) {
    if ((options.failedSteps ?? []).length > 0) {
        return "FAILED";
    }
    if ((options.blockedSteps ?? []).length > 0) {
        return "BLOCKED";
    }
    return "COMPLETED";
}
/** Emits a synthetic failed phase report for unexpected exceptions, then rethrows the error. */
export function PlatformOrchestrationKit_printUnexpectedInstallPhaseFailure(options) {
    const message = options.error instanceof Error
        ? options.error.message
        : String(options.error);
    PlatformOrchestrationKit_printInstallPhaseResult({
        failedSteps: [{ label: options.title }],
        notes: [message],
        phaseCount: options.phaseCount,
        phaseNumber: options.phaseNumber,
        resultDivider: options.resultDivider,
        status: "FAILED",
        title: options.title,
    });
    throw options.error;
}
