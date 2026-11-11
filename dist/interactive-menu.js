/**
 * @fileoverview Reusable classic terminal menu loop for orchestration command launchers.
 *
 * Flow: config-provided sections + session abstraction + script runner -> render, prompt, dispatch,
 * and exit handling. Project adapters own command labels, npm script names, and process execution.
 *
 * @testing Node test runner (tsx --test): npm run platform-orchestration-kit:test from the repository root runs the package tsx --test harness over packages/platform-orchestration-kit/src/*.unit.test.ts, including interactive-menu.unit.test.ts, after changes here.
 *
 * @see packages/platform-orchestration-kit/src/interactive-menu.unit.test.ts - Node tsx --test suite that asserts grouped rendering, invalid selections, exit aliases, and the full read-eval loop contract owned by this module.
 * @see packages/platform-orchestration-kit/src/index.ts - Package barrel re-exporting this interactive-menu surface under the scoped package name platform-orchestration/kit and the interactive-menu subpath export.
 * @see scripts/platform-orchestration/ui/cli-interactive/main.ts - Interactive CLI adapter that builds menu config for orchestration scripts and delegates the loop to PlatformOrchestrationKit_runInteractiveMenu from the kit interactive-menu entrypoint.
 * @see platform-orchestration.config.ts - Repo-owned menu row metadata and npm script ids that adapters pair with `PlatformOrchestrationKit_InteractiveMenuConfig` shapes consumed here.
 * @documentation reviewed=2026-05-22 standard=FILE_OVERVIEW_STANDARDS_TYPESCRIPT@3
 */
/** Renders the configured orchestration menu. */
export function PlatformOrchestrationKit_printInteractiveMenu(options) {
    options.session.clearScreen();
    options.session.printHeader(options.config.headerFamily, options.config.headerFocus);
    options.session.printPanelTitle(options.config.panelTitle, options.config.panelSubtitle);
    for (const section of options.config.sections) {
        options.session.printKicker(section.kicker);
        for (const item of section.items) {
            options.session.printMenuItem(item.key, item.label, item.description);
        }
        options.session.printSectionBreak();
    }
    options.session.printMenuItem(options.config.exitItem.key, options.config.exitItem.label, options.config.exitItem.description);
    options.session.writeLine("");
}
function PlatformOrchestrationKit_findInteractiveMenuItem(options) {
    if (options.config.exitItem.key === options.action ||
        options.config.exitItem.aliases?.includes(options.action)) {
        return options.config.exitItem;
    }
    for (const section of options.config.sections) {
        for (const item of section.items) {
            if (item.key === options.action) {
                return item;
            }
        }
    }
    return undefined;
}
/** Handles one configured menu action. */
export async function PlatformOrchestrationKit_handleInteractiveMenuSelection(options) {
    const item = PlatformOrchestrationKit_findInteractiveMenuItem({
        action: options.action,
        config: options.config,
    });
    if (item === undefined) {
        options.session.printError(options.config.invalidSelectionMessage);
        return "continue";
    }
    if (item.kind === "exit") {
        options.session.printSuccess(item.exitMessage);
        return "exit";
    }
    await options.runScript({
        cwd: options.cwd,
        scriptName: item.scriptName,
        session: options.session,
    });
    return "continue";
}
/** Runs the configured menu until the operator chooses the exit row or one of its aliases. */
export async function PlatformOrchestrationKit_runInteractiveMenu(options) {
    for (;;) {
        PlatformOrchestrationKit_printInteractiveMenu({
            config: options.config,
            session: options.session,
        });
        const action = await options.session.promptReadLine(options.config.promptText);
        const outcome = await PlatformOrchestrationKit_handleInteractiveMenuSelection({
            action,
            config: options.config,
            cwd: options.cwd,
            runScript: options.runScript,
            session: options.session,
        });
        if (outcome === "exit") {
            return;
        }
    }
}
