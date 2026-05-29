import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
import { createContext, useContext, useEffect, useMemo, useRef, useState, } from "react";
import { Box, Static, Text, useInput } from "ink";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router";
import { PlatformOrchestrationKit_resolveCommandNpmScript, } from "./command-catalog.js";
import { PlatformOrchestrationKit_formatNpmRunCommand } from "./format-command.js";
import { PlatformOrchestrationKit_spawnNpmRun, } from "./npm-spawn.js";
const PlatformOrchestrationKit_InkSessionContext = createContext(null);
/** Builds the empty initial session state for a command catalog. */
function buildInitialSession() {
    return {
        command: null,
        deployTarget: null,
        forwardedArgs: [],
        lastRun: null,
        npmScript: null,
        runNonce: 0,
        runStartedAtMs: null,
    };
}
/** Provides shared Ink session state to nested route screens. */
function PlatformOrchestrationKitInkSessionProvider({ children, }) {
    const [session, setSession] = useState(buildInitialSession);
    const value = useMemo(() => ({
        session,
        setSession,
        resetSession: () => {
            setSession(buildInitialSession());
        },
    }), [session]);
    return (_jsx(PlatformOrchestrationKit_InkSessionContext.Provider, { value: value, children: children }));
}
/** Reads the active Ink session context. */
function usePlatformOrchestrationKitInkSession() {
    const ctx = useContext(PlatformOrchestrationKit_InkSessionContext);
    if (ctx === null) {
        throw new Error("PlatformOrchestrationKit Ink session context missing.");
    }
    return ctx;
}
/** Renders a command preview block. */
function InkCommandPreview({ commandLine, title = "Command", }) {
    return (_jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { bold: true, children: title }), _jsx(Text, { wrap: "wrap", children: commandLine })] }));
}
/** Renders top-of-screen app chrome. */
function InkScreenHeader({ appName, description, notice, projectRoot, }) {
    return (_jsxs(Box, { flexDirection: "column", marginBottom: 1, children: [_jsx(Text, { bold: true, color: "green", children: appName }), _jsx(Text, { color: "gray", children: description }), _jsx(Box, { children: _jsxs(Text, { color: "gray", children: ["Root: ", projectRoot] }) }), notice ? _jsx(Text, { color: "yellow", children: notice }) : null] }));
}
/** Renders keyboard shortcut hints. */
function InkLegend({ lines, }) {
    return (_jsx(Box, { marginTop: 1, flexDirection: "column", gap: 0, children: lines.map((line, index) => (_jsx(Text, { color: "gray", children: line }, String(index)))) }));
}
/** Returns a warning based on risk when no adapter warning is supplied. */
function getDefaultRiskWarning(command) {
    if (command.riskLevel === "high") {
        return {
            text: "High impact: review carefully before running.",
            tone: "yellow",
        };
    }
    if (command.riskLevel === "elevated") {
        return {
            text: "Elevated: affects running processes for this checkout.",
            tone: "yellow",
        };
    }
    return null;
}
/** Returns true when a selected deploy-target value exists in the command mapping. */
function commandHasDeployTarget(command, deployTarget) {
    return (command.deployScripts ?? []).some((mapping) => mapping.target === deployTarget);
}
/** Formats the deploy-target picker label for a command mapping. */
function formatDeployTargetLabel(options) {
    return `${options.target} (${options.npmScript})`;
}
/** Creates a sourced line and appends it to both local and React state buffers. */
function appendRunChunk(options) {
    for (const rawLine of options.chunk.split(/\r?\n/)) {
        if (rawLine.length === 0) {
            continue;
        }
        const line = { source: options.source, text: rawLine };
        options.capturedLines.push(line);
        options.setLines((previous) => [...previous, line]);
    }
}
/** Home route: command catalog with keyboard selection into deploy or review flows. */
function HomeScreen({ appName, commands, description, notice, projectRoot, resolveNpmScript, }) {
    const navigate = useNavigate();
    const { setSession, resetSession } = usePlatformOrchestrationKitInkSession();
    const [index, setIndex] = useState(0);
    useInput((_input, key) => {
        if (key.upArrow) {
            setIndex((previous) => Math.max(0, previous - 1));
        }
        if (key.downArrow) {
            setIndex((previous) => Math.min(commands.length - 1, previous + 1));
        }
        if (key.return) {
            const selected = commands[index];
            if (!selected) {
                return;
            }
            resetSession();
            setSession((previous) => ({ ...previous, command: selected }));
            if (selected.requiresDeployTarget) {
                navigate("/deploy");
                return;
            }
            const npmScript = resolveNpmScript({
                command: selected,
                deployTarget: null,
            });
            setSession((previous) => ({
                ...previous,
                command: selected,
                deployTarget: null,
                npmScript,
            }));
            navigate("/review");
        }
        if (key.escape) {
            process.exit(0);
        }
    });
    return (_jsxs(Box, { flexDirection: "column", children: [_jsx(InkScreenHeader, { appName: appName, description: description, notice: notice, projectRoot: projectRoot }), _jsx(Text, { bold: true, children: "Select a command (\u2191/\u2193, Enter)" }), commands.map((command, commandIndex) => (_jsxs(Text, { color: commandIndex === index ? "cyan" : "white", children: [commandIndex === index ? "› " : "  ", command.label] }, command.id))), _jsx(InkLegend, { lines: ["Keys: ↑/↓ move · Enter continue · Esc quit"] })] }));
}
/** Deploy-target picker for commands that require target context. */
function DeployScreen({ resolveNpmScript, }) {
    const navigate = useNavigate();
    const { session, setSession } = usePlatformOrchestrationKitInkSession();
    const command = session.command;
    const targets = useMemo(() => command?.deployScripts ?? [], [command]);
    const [index, setIndex] = useState(0);
    useInput((_input, key) => {
        if (key.upArrow) {
            setIndex((previous) => Math.max(0, previous - 1));
        }
        if (key.downArrow) {
            setIndex((previous) => Math.min(targets.length - 1, previous + 1));
        }
        if (key.return) {
            if (!command?.requiresDeployTarget) {
                navigate("/");
                return;
            }
            const target = targets[index]?.target;
            if (!target || !commandHasDeployTarget(command, target)) {
                return;
            }
            const npmScript = resolveNpmScript({ command, deployTarget: target });
            setSession((previous) => ({
                ...previous,
                deployTarget: target,
                npmScript,
            }));
            navigate("/review");
        }
        if (key.escape) {
            navigate("/");
        }
    });
    if (!command?.requiresDeployTarget) {
        return _jsx(Text, { children: "Missing deploy command context." });
    }
    return (_jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { bold: true, children: "Deploy target (\u2191/\u2193, Enter, Esc back)" }), targets.map((target, targetIndex) => (_jsxs(Text, { color: targetIndex === index ? "cyan" : "white", children: [targetIndex === index ? "› " : "  ", formatDeployTargetLabel(target)] }, target.target)))] }));
}
/** Review route: shows the resolved npm invocation and confirms before `/run`. */
function ReviewScreen({ formatNpmRunCommand, getCommandWarning, }) {
    const navigate = useNavigate();
    const { session, setSession } = usePlatformOrchestrationKitInkSession();
    const command = session.command;
    const npmScript = session.npmScript;
    const commandLine = npmScript != null
        ? formatNpmRunCommand(npmScript, session.forwardedArgs)
        : "(not set)";
    useInput((_input, key) => {
        if (key.return) {
            setSession((previous) => ({
                ...previous,
                runNonce: previous.runNonce + 1,
                runStartedAtMs: Date.now(),
            }));
            navigate("/run");
        }
        if (key.escape) {
            navigate(command?.requiresDeployTarget ? "/deploy" : "/");
        }
    });
    if (!command || !npmScript) {
        return _jsx(Text, { children: "Nothing to review. Press Esc." });
    }
    const warning = getCommandWarning?.({ command, deployTarget: session.deployTarget }) ??
        getDefaultRiskWarning(command);
    return (_jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { bold: true, children: "Review" }), _jsx(InkCommandPreview, { commandLine: commandLine, title: "npm command" }), _jsx(Text, { color: "gray", children: command.description }), warning ? _jsx(Text, { color: warning.tone, children: warning.text }) : null, _jsx(Box, { marginTop: 1, children: _jsx(Text, { children: "Enter: run \u00B7 Esc: back" }) })] }));
}
/** Execution route: spawns `npm run`, streams child output, and records completion. */
function RunScreen({ formatNpmRunCommand, projectRoot, spawnNpmRun, }) {
    const navigate = useNavigate();
    const { session, setSession } = usePlatformOrchestrationKitInkSession();
    const npmScript = session.npmScript;
    const runNonce = session.runNonce;
    const forwardedArgs = session.forwardedArgs;
    const [lines, setLines] = useState([]);
    const [, setTick] = useState(0);
    const cancelRef = useRef(null);
    useEffect(() => {
        const timer = setInterval(() => {
            setTick((value) => value + 1);
        }, 500);
        return () => {
            clearInterval(timer);
        };
    }, []);
    useEffect(() => {
        if (!npmScript) {
            navigate("/");
            return;
        }
        setLines([]);
        let cancelled = false;
        const capturedLines = [];
        const task = spawnNpmRun(projectRoot, npmScript, forwardedArgs, {
            onStdoutChunk: (chunk) => {
                appendRunChunk({
                    capturedLines,
                    chunk,
                    setLines,
                    source: "stdout",
                });
            },
            onStderrChunk: (chunk) => {
                appendRunChunk({
                    capturedLines,
                    chunk,
                    setLines,
                    source: "stderr",
                });
            },
        });
        cancelRef.current = () => {
            cancelled = true;
            task.cancel();
        };
        task.promise
            .then((result) => {
            setSession((previous) => ({
                ...previous,
                lastRun: {
                    exitCode: result.status,
                    lines: capturedLines,
                    signal: null,
                    status: cancelled
                        ? "cancelled"
                        : result.status === 0
                            ? "succeeded"
                            : "failed",
                },
            }));
            navigate("/result");
        })
            .catch(() => {
            setSession((previous) => ({
                ...previous,
                lastRun: {
                    exitCode: 1,
                    lines: capturedLines,
                    signal: null,
                    status: cancelled ? "cancelled" : "failed",
                },
            }));
            navigate("/result");
        });
        return () => {
            cancelRef.current = null;
            task.cancel();
        };
    }, [
        forwardedArgs,
        navigate,
        npmScript,
        projectRoot,
        runNonce,
        setSession,
        spawnNpmRun,
    ]);
    useInput((_input, key) => {
        if (key.escape) {
            cancelRef.current?.();
        }
    });
    const elapsedLabel = session.runStartedAtMs != null
        ? `${Math.round((Date.now() - session.runStartedAtMs) / 1000)}s`
        : "starting…";
    return (_jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { bold: true, children: "Running" }), _jsx(InkCommandPreview, { commandLine: npmScript != null ? formatNpmRunCommand(npmScript, forwardedArgs) : "", title: "Command" }), _jsx(Static, { items: lines, children: (line, lineIndex) => (_jsx(Text, { color: line.source === "stderr" ? "red" : "white", children: line.text }, `line-${String(lineIndex)}`)) }), _jsx(Box, { marginTop: 1, children: _jsxs(Text, { color: "gray", children: ["Live status \u00B7 ", elapsedLabel, " \u00B7 Esc cancels"] }) })] }));
}
/** Post-run summary route with exit status and output line counts. */
function ResultScreen() {
    const navigate = useNavigate();
    const { session, resetSession } = usePlatformOrchestrationKitInkSession();
    const result = session.lastRun;
    useInput((_input, key) => {
        if (key.return || key.escape) {
            resetSession();
            navigate("/");
        }
    });
    if (!result) {
        return _jsx(Text, { children: "No result captured." });
    }
    const stdoutLines = result.lines.filter((line) => line.source === "stdout").length;
    const stderrLines = result.lines.filter((line) => line.source === "stderr").length;
    return (_jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { bold: true, children: "Result" }), _jsxs(Text, { children: ["Status: ", result.status, " \u00B7 exit ", String(result.exitCode), " \u00B7 signal", " ", String(result.signal)] }), _jsxs(Text, { color: "gray", children: ["Lines: stdout ", stdoutLines, " \u00B7 stderr ", stderrLines] }), _jsx(Box, { marginTop: 1, children: _jsx(Text, { children: "Enter / Esc: main menu" }) })] }));
}
/** Declares MemoryRouter routes for the platform Ink wizard screens. */
function PlatformOrchestrationKitInkRoutes({ appName, behavior, commands, description, notice, projectRoot, }) {
    const formatNpmRunCommand = behavior?.formatNpmRunCommand ??
        PlatformOrchestrationKit_formatNpmRunCommand;
    const resolveNpmScript = behavior?.resolveNpmScript ??
        PlatformOrchestrationKit_resolveCommandNpmScript;
    const spawnNpmRun = behavior?.spawnNpmRun ?? PlatformOrchestrationKit_spawnNpmRun;
    return (_jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(HomeScreen, { appName: appName, commands: commands, description: description, notice: notice, projectRoot: projectRoot, resolveNpmScript: resolveNpmScript }) }), _jsx(Route, { path: "/deploy", element: _jsx(DeployScreen, { resolveNpmScript: resolveNpmScript }) }), _jsx(Route, { path: "/review", element: _jsx(ReviewScreen, { formatNpmRunCommand: formatNpmRunCommand, getCommandWarning: behavior?.getCommandWarning }) }), _jsx(Route, { path: "/run", element: _jsx(RunScreen, { formatNpmRunCommand: formatNpmRunCommand, projectRoot: projectRoot, spawnNpmRun: spawnNpmRun }) }), _jsx(Route, { path: "/result", element: _jsx(ResultScreen, {}) })] }));
}
/** Ink root component for a config-driven platform CLI. */
export function PlatformOrchestrationKitInkApp(props) {
    return (_jsx(MemoryRouter, { initialEntries: ["/"], initialIndex: 0, children: _jsx(PlatformOrchestrationKitInkSessionProvider, { children: _jsx(PlatformOrchestrationKitInkRoutes, { ...props }) }) }));
}
//# sourceMappingURL=ink-app.js.map