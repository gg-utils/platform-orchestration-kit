import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
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
import { useEffect, useMemo, useRef, useState } from "react";
import { PlatformOrchestrationKit_resolveCommandNpmScript, } from "./command-catalog.js";
import { PlatformOrchestrationKit_formatNpmRunCommand } from "./format-command.js";
import { PlatformOrchestrationKit_spawnNpmRun, } from "./npm-spawn.js";
/** Builds the home menu rows from the configured command catalog. */
function buildHomeOptions(commands) {
    return [
        ...commands.map((definition) => ({
            description: definition.description,
            name: definition.label,
            value: definition.id,
        })),
        { description: "Leave", name: "Quit", value: "quit" },
    ];
}
/** Builds deploy target rows from the selected command's mappings. */
function buildDeployOptions(deployScripts) {
    return [
        ...deployScripts.map((mapping) => ({
            description: mapping.npmScript,
            name: mapping.target,
            value: mapping.target,
        })),
        { description: "Return to menu", name: "Back", value: "back" },
    ];
}
/** Joins non-empty stdout/stderr sections into the output pane text. */
function buildCombinedOutput(options) {
    return [
        options.stdout.length > 0 ? `--- stdout ---\n${options.stdout}` : "",
        options.stderr.length > 0 ? `--- stderr ---\n${options.stderr}` : "",
    ]
        .filter((section) => section.length > 0)
        .join("\n\n");
}
/** Returns true when a deploy target value exists in the selected command mapping. */
function commandHasDeployTarget(command, deployTarget) {
    return (command.deployScripts ?? []).some((mapping) => mapping.target === deployTarget);
}
/** OpenTUI root component for a config-driven platform command browser. */
export function PlatformOrchestrationKitOpenTuiApp({ behavior, commands, headerText, projectRoot, }) {
    const [phase, setPhase] = useState("home");
    const [command, setCommand] = useState(null);
    const [deployTarget, setDeployTarget] = useState(null);
    const [npmScript, setNpmScript] = useState(null);
    const [runStdout, setRunStdout] = useState("");
    const [runStderr, setRunStderr] = useState("");
    const [runStatus, setRunStatus] = useState(null);
    const cancelRunRef = useRef(null);
    const formatNpmRunCommand = behavior?.formatNpmRunCommand ??
        PlatformOrchestrationKit_formatNpmRunCommand;
    const resolveNpmScript = behavior?.resolveNpmScript ??
        ((options) => PlatformOrchestrationKit_resolveCommandNpmScript(options));
    const spawnNpmRun = behavior?.spawnNpmRun ?? PlatformOrchestrationKit_spawnNpmRun;
    useEffect(() => {
        return () => {
            cancelRunRef.current?.();
        };
    }, []);
    function goHome() {
        cancelRunRef.current?.();
        cancelRunRef.current = null;
        setPhase("home");
        setCommand(null);
        setDeployTarget(null);
        setNpmScript(null);
        setRunStdout("");
        setRunStderr("");
        setRunStatus(null);
    }
    const homeOptions = useMemo(() => buildHomeOptions(commands), [commands]);
    const deployOptions = useMemo(() => buildDeployOptions(command?.deployScripts ?? []), [command?.deployScripts]);
    async function runNpm(script) {
        cancelRunRef.current?.();
        setRunStdout("");
        setRunStderr("");
        setRunStatus(null);
        setPhase("run");
        try {
            const { promise, cancel } = spawnNpmRun(projectRoot, script, [], {
                onStdoutChunk: (chunk) => {
                    setRunStdout((previous) => previous + chunk);
                },
                onStderrChunk: (chunk) => {
                    setRunStderr((previous) => previous + chunk);
                },
            });
            cancelRunRef.current = cancel;
            const result = await promise;
            cancelRunRef.current = null;
            setRunStatus(result.status);
            setPhase("result");
        }
        catch (error) {
            cancelRunRef.current = null;
            const message = error instanceof Error ? error.message : String(error);
            setRunStderr(message);
            setRunStatus(1);
            setPhase("result");
        }
    }
    const previewText = npmScript != null ? formatNpmRunCommand(npmScript) : "";
    const commandWarning = command && behavior?.getCommandWarning
        ? behavior.getCommandWarning({ command, deployTarget })
        : null;
    const combinedOutput = buildCombinedOutput({
        stderr: runStderr,
        stdout: runStdout,
    });
    return (_jsxs("box", { style: { flexDirection: "column", flexGrow: 1, gap: 1, padding: 1 }, children: [_jsx("text", { children: headerText }), _jsx("text", { children: projectRoot }), phase === "home" ? (_jsxs(_Fragment, { children: [_jsx("text", { children: "Select a platform command (Tab / arrows, Enter)." }), _jsx("tab-select", { onSelect: (_index, option) => {
                            const value = option?.value;
                            if (value === "quit") {
                                process.kill(process.pid, "SIGINT");
                                return;
                            }
                            const selected = commands.find((definition) => definition.id === value);
                            if (!selected) {
                                return;
                            }
                            setCommand(selected);
                            if (selected.requiresDeployTarget) {
                                setDeployTarget(null);
                                setNpmScript(null);
                                setPhase("deploy");
                                return;
                            }
                            const script = resolveNpmScript({
                                command: selected,
                                deployTarget: null,
                            });
                            setDeployTarget(null);
                            setNpmScript(script);
                            setPhase("review");
                        }, options: homeOptions, showDescription: true })] })) : null, phase === "deploy" && command?.requiresDeployTarget ? (_jsxs(_Fragment, { children: [_jsx("text", { children: "Choose deploy target." }), _jsx("tab-select", { onSelect: (_index, option) => {
                            const value = option?.value;
                            if (value === "back") {
                                goHome();
                                return;
                            }
                            if (value === undefined ||
                                !commandHasDeployTarget(command, value)) {
                                return;
                            }
                            setDeployTarget(value);
                            const script = resolveNpmScript({ command, deployTarget: value });
                            setNpmScript(script);
                            setPhase("review");
                        }, options: deployOptions, showDescription: true })] })) : null, phase === "review" && command && npmScript ? (_jsxs(_Fragment, { children: [_jsx("text", { bold: true, children: "Review" }), commandWarning ? (_jsx("text", { style: { fg: "yellow" }, children: commandWarning })) : null, _jsx("scrollbox", { style: { flexGrow: 1, maxHeight: 12 }, children: _jsx("text", { children: previewText }) }), _jsx("tab-select", { onSelect: (_index, option) => {
                            const value = option?.value;
                            if (value === "run") {
                                void runNpm(npmScript);
                            }
                            if (value === "back") {
                                if (command.requiresDeployTarget) {
                                    setPhase("deploy");
                                    setNpmScript(null);
                                    return;
                                }
                                goHome();
                            }
                        }, options: [
                            { description: "Execute npm run", name: "Run", value: "run" },
                            { description: "Edit choice", name: "Back", value: "back" },
                        ], showDescription: true })] })) : null, phase === "run" ? (_jsxs(_Fragment, { children: [_jsx("text", { bold: true, children: "Running\u2026 (wait for completion)" }), _jsx("scrollbox", { style: { flexGrow: 1 }, children: _jsx("text", { children: combinedOutput.length > 0 ? combinedOutput : "…" }) })] })) : null, phase === "result" ? (_jsxs(_Fragment, { children: [_jsx("text", { bold: true, children: "Finished" }), _jsxs("text", { children: ["Exit status: ", runStatus ?? "unknown"] }), _jsx("scrollbox", { style: { flexGrow: 1, maxHeight: 14 }, children: _jsx("text", { children: combinedOutput.length > 0 ? combinedOutput : "(no output)" }) }), _jsx("tab-select", { onSelect: () => {
                            goHome();
                        }, options: [
                            { description: "Main menu", name: "Menu", value: "menu" },
                        ], showDescription: true })] })) : null] }));
}
//# sourceMappingURL=opentui-app.js.map