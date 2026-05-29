import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
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
import path from "node:path";
import { useCallback, useEffect, useMemo, useRef, useState, } from "react";
import { Box, Static, Text, useApp, useInput } from "ink";
import { PlatformOrchestrationKit_buildDiagnosticsPayload, PlatformOrchestrationKit_buildPackagePreviewTargets, PlatformOrchestrationKit_resolveWorkspacePackageDirs, } from "./diagnostics.js";
import { PlatformOrchestrationKit_formatNpmRunPackageCommandLine, PlatformOrchestrationKit_formatNpmRunRootCommandLine, } from "./format-command.js";
import { PlatformOrchestrationKit_formatNpxTsxCommandLine, PlatformOrchestrationKit_spawnNpxTsx, } from "./spawn-npx-tsx.js";
/** Renders top-of-screen app chrome. */
function InkScreenHeader({ appName, description, title, }) {
    return (_jsxs(Box, { flexDirection: "column", children: [_jsxs(Text, { bold: true, color: "green", children: [appName, " \u2014 ", title] }), _jsx(Text, { color: "gray", children: description })] }));
}
/** Renders keyboard shortcut hints. */
function InkLegend({ lines, }) {
    return (_jsx(Box, { flexDirection: "column", children: lines.map((line, index) => (_jsx(Text, { color: "gray", children: line }, String(index)))) }));
}
/** Renders one command-preview block. */
function InkCommandPreview({ commandLine, title, }) {
    return (_jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { bold: true, children: title }), _jsx(Text, { wrap: "wrap", children: commandLine })] }));
}
/** Renders the rolling child-process output window. */
function InkCapturedOutputBlock({ lines, maxLines, title, }) {
    const visibleLines = lines.slice(Math.max(0, lines.length - maxLines));
    return (_jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { bold: true, children: title }), visibleLines.length === 0 ? _jsx(Text, { dimColor: true, children: "(no output yet)" }) : null, visibleLines.map((line, index) => (_jsxs(Text, { children: ["[", line.source, "] ", line.text] }, `${line.source}:${String(index)}:${line.text}`)))] }));
}
/** Converts a stdout/stderr chunk into display rows. */
function buildOutputLines(options) {
    const lines = options.chunk.replace(/\r\n/g, "\n").split("\n");
    return lines
        .filter((line) => line.length > 0)
        .map((line) => ({ source: options.source, text: line }));
}
/** Default host runner for streamed wrapper execution. */
function defaultSpawnNpxTsx(repoRoot, scriptPathUnderRepo, args, handlers) {
    const handle = PlatformOrchestrationKit_spawnNpxTsx(repoRoot, scriptPathUnderRepo, args, handlers);
    return {
        cancel: () => {
            if (!handle.child.killed) {
                handle.child.kill("SIGTERM");
            }
        },
        promise: handle.promise,
    };
}
/** Handles Ctrl+C by stopping any active wrapper run and exiting the Ink session. */
function tryConsumePlatformOrchestrationMaintainerInkInterruptKey(options) {
    if (options.key.ctrl && options.input === "c") {
        options.stopRun();
        options.exit();
        return true;
    }
    return false;
}
/** Handles Escape from any non-menu screen by resetting the run shell and returning to the menu. */
function tryConsumePlatformOrchestrationMaintainerInkEscapeFromSubScreen(options) {
    if (options.screen !== "menu" && options.key.escape) {
        options.stopRun();
        options.navigateMenuResettingRunShell();
        return true;
    }
    return false;
}
/** Routes menu hotkeys to screen transitions or quit actions. */
function consumePlatformOrchestrationMaintainerInkMenuInput(options) {
    const { input, key, exit, setScreen } = options;
    if (key.escape) {
        exit();
    }
    if (input === "1")
        setScreen("overview");
    if (input === "2")
        setScreen("packages");
    if (input === "3")
        setScreen("wrappers");
    if (input === "4")
        setScreen("preview");
    if (input === "5")
        setScreen("run");
    if (input === "q" || input === "Q")
        exit();
}
/** Adjusts a bounded zero-based cursor. */
function adjustBoundedIndex(options) {
    options.setIndex((index) => Math.max(0, Math.min(Math.max(options.length - 1, 0), index + options.delta)));
}
/** Starts the selected wrapper and wires live plus completed output. */
function startPlatformOrchestrationMaintainerWrapperInkTask(options) {
    const { behavior, cancelRef, projectRoot, scriptPath, setFinishedLines, setRunLines, setRunPhase, setRunStatus, } = options;
    setRunPhase("running");
    setRunLines([]);
    setFinishedLines([]);
    setRunStatus("Starting…");
    const capturedLines = [];
    const appendLines = (nextLines) => {
        capturedLines.push(...nextLines);
        setRunLines((previous) => [...previous, ...nextLines]);
    };
    const spawnNpxTsx = behavior?.spawnNpxTsx ?? defaultSpawnNpxTsx;
    const handle = spawnNpxTsx(projectRoot, scriptPath, [], {
        onStderrChunk(chunk) {
            appendLines(buildOutputLines({ chunk, source: "stderr" }));
        },
        onStdoutChunk(chunk) {
            appendLines(buildOutputLines({ chunk, source: "stdout" }));
        },
    });
    cancelRef.current = handle.cancel;
    setRunStatus(`Running: ${PlatformOrchestrationKit_formatNpxTsxCommandLine(scriptPath)}`);
    handle.promise
        .then((result) => {
        cancelRef.current = null;
        setFinishedLines([...capturedLines]);
        setRunStatus(`Finished: exit ${String(result.status)}`);
        setRunPhase("done");
    })
        .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        cancelRef.current = null;
        setFinishedLines([...capturedLines, { source: "stderr", text: message }]);
        setRunStatus("Finished: failed to run wrapper");
        setRunPhase("done");
    });
}
/** Routes run-screen hotkeys across pick, streaming, and completion phases. */
function consumePlatformOrchestrationMaintainerInkRunInput(options) {
    const { behavior, cancelRef, input, key, projectRoot, runPhase, runWrapIndex, setFinishedLines, setRunLines, setRunPhase, setRunStatus, setRunWrapIndex, stopRun, wrappers, } = options;
    if (runPhase === "pick") {
        if (key.upArrow) {
            adjustBoundedIndex({
                delta: -1,
                length: wrappers.length,
                setIndex: setRunWrapIndex,
            });
        }
        if (key.downArrow) {
            adjustBoundedIndex({
                delta: 1,
                length: wrappers.length,
                setIndex: setRunWrapIndex,
            });
        }
        if (input === "r" || input === "R") {
            const wrapper = wrappers[runWrapIndex];
            if (!wrapper)
                return;
            startPlatformOrchestrationMaintainerWrapperInkTask({
                behavior,
                cancelRef,
                projectRoot,
                scriptPath: wrapper.scriptPath,
                setFinishedLines,
                setRunLines,
                setRunPhase,
                setRunStatus,
            });
        }
        return;
    }
    if (runPhase === "done" && (input === "r" || input === "R")) {
        setRunPhase("pick");
        setRunLines([]);
        setFinishedLines([]);
        setRunStatus("");
    }
    if (runPhase === "running" && (input === "x" || input === "X")) {
        stopRun();
        setRunStatus("Cancelled");
        setRunPhase("done");
    }
}
/** Reusable Ink maintainer UI for platform orchestration diagnostics and wrapper runs. */
export function PlatformOrchestrationKitMaintainerInkApp({ appName = "Platform orchestration", behavior, contentQueueGuardsPath, description = "Maintainer console — diagnostics, previews, optional wrapper runs", diagnosticsJsonCommandLine = "configured maintainer JSON command", exampleRootNpmScript = "build", projectRoot, wrappers, }) {
    const { exit } = useApp();
    const resolvedProjectRoot = path.resolve(projectRoot);
    const [screen, setScreen] = useState("menu");
    const [pkgIndex, setPkgIndex] = useState(0);
    const [previewScriptIndex, setPreviewScriptIndex] = useState(0);
    const [wrapIndex, setWrapIndex] = useState(0);
    const [runWrapIndex, setRunWrapIndex] = useState(0);
    const [runPhase, setRunPhase] = useState("pick");
    const [runLines, setRunLines] = useState([]);
    const [runStatus, setRunStatus] = useState("");
    const [finishedLines, setFinishedLines] = useState([]);
    const cancelRef = useRef(null);
    const packages = useMemo(() => PlatformOrchestrationKit_resolveWorkspacePackageDirs(resolvedProjectRoot), [resolvedProjectRoot]);
    const diagnostics = useMemo(() => PlatformOrchestrationKit_buildDiagnosticsPayload({
        contentQueueGuardsPath,
        repoRoot: resolvedProjectRoot,
        wrappers,
    }), [contentQueueGuardsPath, resolvedProjectRoot, wrappers]);
    const overviewText = useMemo(() => {
        const raw = JSON.stringify(diagnostics, null, 2);
        const lines = raw.split("\n");
        return lines.slice(0, 48).join("\n") + (lines.length > 48 ? "\n…" : "");
    }, [diagnostics]);
    const currentPkg = packages[pkgIndex] ?? packages[0] ?? "";
    const previewTargets = useMemo(() => currentPkg.length > 0
        ? PlatformOrchestrationKit_buildPackagePreviewTargets({
            packageDir: currentPkg,
            repoRoot: resolvedProjectRoot,
        })
        : [], [resolvedProjectRoot, currentPkg]);
    const previewTarget = previewTargets[previewScriptIndex] ?? previewTargets[0];
    useEffect(() => {
        setPreviewScriptIndex(0);
    }, [pkgIndex, previewTargets.length]);
    const stopRun = useCallback(() => {
        cancelRef.current?.();
        cancelRef.current = null;
    }, []);
    const resetRunShell = useCallback(() => {
        setRunPhase("pick");
        setRunLines([]);
        setFinishedLines([]);
        setRunStatus("");
    }, []);
    useEffect(() => {
        return () => {
            stopRun();
        };
    }, [stopRun]);
    useInput((input, key) => {
        if (tryConsumePlatformOrchestrationMaintainerInkInterruptKey({
            input,
            key,
            stopRun,
            exit,
        })) {
            return;
        }
        if (tryConsumePlatformOrchestrationMaintainerInkEscapeFromSubScreen({
            screen,
            key,
            stopRun,
            navigateMenuResettingRunShell: () => {
                resetRunShell();
                setScreen("menu");
            },
        })) {
            return;
        }
        if (screen === "menu") {
            consumePlatformOrchestrationMaintainerInkMenuInput({
                input,
                key,
                exit,
                setScreen,
            });
            return;
        }
        if (screen === "packages") {
            if (key.upArrow)
                adjustBoundedIndex({
                    delta: -1,
                    length: packages.length,
                    setIndex: setPkgIndex,
                });
            if (key.downArrow)
                adjustBoundedIndex({
                    delta: 1,
                    length: packages.length,
                    setIndex: setPkgIndex,
                });
            return;
        }
        if (screen === "wrappers") {
            if (key.upArrow)
                adjustBoundedIndex({
                    delta: -1,
                    length: wrappers.length,
                    setIndex: setWrapIndex,
                });
            if (key.downArrow)
                adjustBoundedIndex({
                    delta: 1,
                    length: wrappers.length,
                    setIndex: setWrapIndex,
                });
            return;
        }
        if (screen === "preview") {
            if (key.upArrow)
                adjustBoundedIndex({
                    delta: -1,
                    length: packages.length,
                    setIndex: setPkgIndex,
                });
            if (key.downArrow)
                adjustBoundedIndex({
                    delta: 1,
                    length: packages.length,
                    setIndex: setPkgIndex,
                });
            if (key.leftArrow) {
                adjustBoundedIndex({
                    delta: -1,
                    length: previewTargets.length,
                    setIndex: setPreviewScriptIndex,
                });
            }
            if (key.rightArrow) {
                adjustBoundedIndex({
                    delta: 1,
                    length: previewTargets.length,
                    setIndex: setPreviewScriptIndex,
                });
            }
            return;
        }
        if (screen === "run") {
            consumePlatformOrchestrationMaintainerInkRunInput({
                behavior,
                cancelRef,
                input,
                key,
                projectRoot: resolvedProjectRoot,
                runPhase,
                runWrapIndex,
                setFinishedLines,
                setRunLines,
                setRunPhase,
                setRunStatus,
                setRunWrapIndex,
                stopRun,
                wrappers,
            });
        }
    });
    const wrapper = wrappers[wrapIndex];
    const npmRootLine = wrapper
        ? PlatformOrchestrationKit_formatNpmRunRootCommandLine(wrapper.npmScript)
        : "";
    const tsxLine = wrapper
        ? PlatformOrchestrationKit_formatNpxTsxCommandLine(wrapper.scriptPath)
        : "";
    const previewCommand = previewTarget && currentPkg
        ? PlatformOrchestrationKit_formatNpmRunPackageCommandLine(currentPkg, previewTarget.script)
        : "(no script for selection)";
    return (_jsxs(Box, { flexDirection: "column", children: [_jsx(InkScreenHeader, { appName: appName, description: description, title: "Ink" }), screen === "menu" ? (_jsxs(Box, { flexDirection: "column", marginTop: 1, children: [_jsx(Text, { bold: true, children: "Menu" }), _jsx(Text, { children: "[1] Diagnostics overview (JSON excerpt)" }), _jsx(Text, { children: "[2] Packages \u2014 script matrix" }), _jsx(Text, { children: "[3] Root wrappers \u2014 npm vs tsx" }), _jsx(Text, { children: "[4] Command preview \u2014 npm run --prefix" }), _jsx(Text, { children: "[5] Run wrapper \u2014 stream npx tsx (r run \u00B7 x cancel while running)" }), _jsx(Text, { color: "gray", children: "q quit \u00B7 Esc back from any screen" })] })) : null, screen === "overview" ? (_jsxs(Box, { flexDirection: "column", marginTop: 1, children: [_jsx(Text, { bold: true, children: "Diagnostics (excerpt)" }), _jsxs(Text, { dimColor: true, children: ["Full JSON: ", diagnosticsJsonCommandLine] }), _jsx(Text, { children: overviewText })] })) : null, screen === "packages" ? (_jsxs(Box, { flexDirection: "column", marginTop: 1, children: [_jsxs(Text, { bold: true, children: ["Packages (\u2191\u2193) \u2014 ", currentPkg] }), packages.map((packageDir, index) => {
                        const row = diagnostics.packages.find((item) => item.dir === packageDir);
                        const mark = index === pkgIndex ? "> " : "  ";
                        const bits = row
                            ? `build=${String(row.scripts.build)} test=${row.scripts.test} lint=${String(row.scripts.lint)} type=${row.scripts.typeCheck ?? "—"}`
                            : "";
                        return (_jsxs(Text, { color: index === pkgIndex ? "cyan" : undefined, children: [mark, packageDir, " ", bits] }, packageDir));
                    })] })) : null, screen === "wrappers" ? (_jsxs(Box, { flexDirection: "column", marginTop: 1, children: [_jsx(Text, { bold: true, children: "Root wrappers (\u2191\u2193)" }), wrappers.map((item, index) => (_jsxs(Text, { color: index === wrapIndex ? "cyan" : undefined, children: [index === wrapIndex ? "> " : "  ", item.npmScript, " \u2192 ", item.scriptPath] }, item.npmScript))), wrapper ? (_jsxs(Box, { flexDirection: "column", marginTop: 1, children: [_jsx(Text, { dimColor: true, children: wrapper.description }), _jsx(InkCommandPreview, { commandLine: npmRootLine, title: "npm (repo root)" }), _jsx(Box, { marginTop: 1, children: _jsx(InkCommandPreview, { commandLine: tsxLine, title: "tsx" }) })] })) : null] })) : null, screen === "preview" ? (_jsxs(Box, { flexDirection: "column", marginTop: 1, children: [_jsx(Text, { bold: true, children: "Preview" }), _jsx(Text, { dimColor: true, children: "\u2191\u2193 package \u00B7 \u2190\u2192 script target" }), _jsxs(Text, { children: ["Package: ", currentPkg, " (", previewTargets.length, " runnable targets)"] }), previewTargets.map((target, index) => (_jsxs(Text, { color: index === previewScriptIndex ? "cyan" : undefined, children: [index === previewScriptIndex ? "> " : "  ", target.label] }, target.script))), _jsx(Box, { marginTop: 1, children: _jsx(InkCommandPreview, { commandLine: previewCommand, title: "Package command" }) }), _jsx(Box, { marginTop: 1, children: _jsx(InkCommandPreview, { commandLine: PlatformOrchestrationKit_formatNpmRunRootCommandLine(exampleRootNpmScript), title: "Example root npm (orchestration)" }) })] })) : null, screen === "run" ? (_jsxs(Box, { flexDirection: "column", marginTop: 1, children: [_jsx(Text, { bold: true, children: "Run platform wrapper" }), runPhase === "pick" ? (_jsxs(_Fragment, { children: [_jsx(Text, { dimColor: true, children: "\u2191\u2193 select \u00B7 r run \u00B7 Esc menu" }), wrappers.map((item, index) => (_jsxs(Text, { color: index === runWrapIndex ? "cyan" : undefined, children: [index === runWrapIndex ? "> " : "  ", item.npmScript, " \u2192 ", item.scriptPath] }, item.npmScript)))] })) : null, runPhase !== "pick" ? (_jsxs(Box, { flexDirection: "column", marginTop: 1, children: [_jsx(Text, { children: runStatus }), finishedLines.length > 0 ? (_jsxs(Box, { flexDirection: "column", marginTop: 1, children: [_jsx(Text, { bold: true, children: "Completed output (Static)" }), _jsx(Static, { items: finishedLines, children: (line, index) => (_jsxs(Text, { children: ["[", line.source, "] ", line.text] }, `${line.source}:${String(index)}`)) })] })) : null, runPhase === "running" ? (_jsxs(Box, { flexDirection: "column", marginTop: 1, children: [_jsx(InkCapturedOutputBlock, { lines: runLines, maxLines: 14, title: "Live stream (rolling window)" }), _jsx(Text, { dimColor: true, children: "x cancel" })] })) : null, runPhase === "done" ? (_jsx(Box, { marginTop: 1, children: _jsx(Text, { dimColor: true, children: "r reset \u00B7 Esc menu" }) })) : null] })) : null] })) : null, _jsx(Box, { marginTop: 1, children: _jsx(InkLegend, { lines: [
                        "Esc back to menu from sub-screens",
                        "Ctrl+C exit",
                        "Rolling log window during run; full session in Static after complete",
                    ] }) })] }));
}
//# sourceMappingURL=maintainer-ink-app.js.map