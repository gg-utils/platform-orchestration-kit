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
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import { Box, Static, Text, useApp, useInput, type Key } from "ink";

import {
  PlatformOrchestrationKit_buildDiagnosticsPayload,
  PlatformOrchestrationKit_buildPackagePreviewTargets,
  PlatformOrchestrationKit_resolveWorkspacePackageDirs,
  type PlatformOrchestrationKit_WrapperEntry,
} from "./diagnostics.js";
import {
  PlatformOrchestrationKit_formatNpmRunPackageCommandLine,
  PlatformOrchestrationKit_formatNpmRunRootCommandLine,
} from "./format-command.js";
import {
  PlatformOrchestrationKit_formatNpxTsxCommandLine,
  PlatformOrchestrationKit_spawnNpxTsx,
  type PlatformOrchestrationKit_NpxTsxSpawnHandlers,
} from "./spawn-npx-tsx.js";

/** Active screen key for stdin-driven navigation in the maintainer Ink shell. */
type PlatformOrchestrationKit_MaintainerInkScreenId =
  | "menu"
  | "overview"
  | "packages"
  | "wrappers"
  | "preview"
  | "run";

/** Run-wrapper screen lifecycle for streamed wrapper execution. */
type PlatformOrchestrationKit_MaintainerInkRunPhase =
  | "pick"
  | "running"
  | "done";

/** Source stream for one captured wrapper output line. */
type PlatformOrchestrationKit_MaintainerInkSessionLineSource =
  | "stdout"
  | "stderr";

/** Captured wrapper output surfaced in the live and completed output panes. */
type PlatformOrchestrationKit_MaintainerInkSessionLine = {
  readonly source: PlatformOrchestrationKit_MaintainerInkSessionLineSource;
  readonly text: string;
};

/** Injectable wrapper-run result used by the maintainer Ink shell. */
export type PlatformOrchestrationKit_MaintainerInkRunHandle = {
  readonly cancel: () => void;
  readonly promise: Promise<{ readonly status: number }>;
};

/** Optional host hooks for the maintainer Ink shell. */
export type PlatformOrchestrationKit_MaintainerInkBehavior = {
  readonly spawnNpxTsx?: (
    repoRoot: string,
    scriptPathUnderRepo: string,
    args: readonly string[],
    handlers: PlatformOrchestrationKit_NpxTsxSpawnHandlers,
  ) => PlatformOrchestrationKit_MaintainerInkRunHandle;
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

/** Renders top-of-screen app chrome. */
function InkScreenHeader({
  appName,
  description,
  title,
}: {
  readonly appName: string;
  readonly description: string;
  readonly title: string;
}): React.ReactNode {
  return (
    <Box flexDirection="column">
      <Text bold color="green">
        {appName} — {title}
      </Text>
      <Text color="gray">{description}</Text>
    </Box>
  );
}

/** Renders keyboard shortcut hints. */
function InkLegend({
  lines,
}: {
  readonly lines: readonly string[];
}): React.ReactNode {
  return (
    <Box flexDirection="column">
      {lines.map((line, index) => (
        <Text key={String(index)} color="gray">
          {line}
        </Text>
      ))}
    </Box>
  );
}

/** Renders one command-preview block. */
function InkCommandPreview({
  commandLine,
  title,
}: {
  readonly commandLine: string;
  readonly title: string;
}): React.ReactNode {
  return (
    <Box flexDirection="column">
      <Text bold>{title}</Text>
      <Text wrap="wrap">{commandLine}</Text>
    </Box>
  );
}

/** Renders the rolling child-process output window. */
function InkCapturedOutputBlock({
  lines,
  maxLines,
  title,
}: {
  readonly lines: readonly PlatformOrchestrationKit_MaintainerInkSessionLine[];
  readonly maxLines: number;
  readonly title: string;
}): React.ReactNode {
  const visibleLines = lines.slice(Math.max(0, lines.length - maxLines));
  return (
    <Box flexDirection="column">
      <Text bold>{title}</Text>
      {visibleLines.length === 0 ? <Text dimColor>(no output yet)</Text> : null}
      {visibleLines.map((line, index) => (
        <Text key={`${line.source}:${String(index)}:${line.text}`}>
          [{line.source}] {line.text}
        </Text>
      ))}
    </Box>
  );
}

/** Converts a stdout/stderr chunk into display rows. */
function buildOutputLines(options: {
  readonly chunk: string;
  readonly source: PlatformOrchestrationKit_MaintainerInkSessionLineSource;
}): PlatformOrchestrationKit_MaintainerInkSessionLine[] {
  const lines = options.chunk.replace(/\r\n/g, "\n").split("\n");
  return lines
    .filter((line) => line.length > 0)
    .map((line) => ({ source: options.source, text: line }));
}

/** Default host runner for streamed wrapper execution. */
function defaultSpawnNpxTsx(
  repoRoot: string,
  scriptPathUnderRepo: string,
  args: readonly string[],
  handlers: PlatformOrchestrationKit_NpxTsxSpawnHandlers,
): PlatformOrchestrationKit_MaintainerInkRunHandle {
  const handle = PlatformOrchestrationKit_spawnNpxTsx(
    repoRoot,
    scriptPathUnderRepo,
    args,
    handlers,
  );
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
function tryConsumePlatformOrchestrationMaintainerInkInterruptKey(options: {
  readonly exit: () => void;
  readonly input: string;
  readonly key: Key;
  readonly stopRun: () => void;
}): boolean {
  if (options.key.ctrl && options.input === "c") {
    options.stopRun();
    options.exit();
    return true;
  }
  return false;
}

/** Handles Escape from any non-menu screen by resetting the run shell and returning to the menu. */
function tryConsumePlatformOrchestrationMaintainerInkEscapeFromSubScreen(options: {
  readonly key: Key;
  readonly navigateMenuResettingRunShell: () => void;
  readonly screen: PlatformOrchestrationKit_MaintainerInkScreenId;
  readonly stopRun: () => void;
}): boolean {
  if (options.screen !== "menu" && options.key.escape) {
    options.stopRun();
    options.navigateMenuResettingRunShell();
    return true;
  }
  return false;
}

/** Routes menu hotkeys to screen transitions or quit actions. */
function consumePlatformOrchestrationMaintainerInkMenuInput(options: {
  readonly exit: () => void;
  readonly input: string;
  readonly key: Key;
  readonly setScreen: Dispatch<
    SetStateAction<PlatformOrchestrationKit_MaintainerInkScreenId>
  >;
}): void {
  const { input, key, exit, setScreen } = options;
  if (key.escape) {
    exit();
  }
  if (input === "1") setScreen("overview");
  if (input === "2") setScreen("packages");
  if (input === "3") setScreen("wrappers");
  if (input === "4") setScreen("preview");
  if (input === "5") setScreen("run");
  if (input === "q" || input === "Q") exit();
}

/** Adjusts a bounded zero-based cursor. */
function adjustBoundedIndex(options: {
  readonly delta: number;
  readonly length: number;
  readonly setIndex: Dispatch<SetStateAction<number>>;
}): void {
  options.setIndex((index) =>
    Math.max(
      0,
      Math.min(Math.max(options.length - 1, 0), index + options.delta),
    ),
  );
}

/** Starts the selected wrapper and wires live plus completed output. */
function startPlatformOrchestrationMaintainerWrapperInkTask(options: {
  readonly behavior: PlatformOrchestrationKit_MaintainerInkBehavior | undefined;
  readonly cancelRef: MutableRefObject<(() => void) | null>;
  readonly projectRoot: string;
  readonly scriptPath: string;
  readonly setFinishedLines: Dispatch<
    SetStateAction<PlatformOrchestrationKit_MaintainerInkSessionLine[]>
  >;
  readonly setRunLines: Dispatch<
    SetStateAction<PlatformOrchestrationKit_MaintainerInkSessionLine[]>
  >;
  readonly setRunPhase: Dispatch<
    SetStateAction<PlatformOrchestrationKit_MaintainerInkRunPhase>
  >;
  readonly setRunStatus: Dispatch<SetStateAction<string>>;
}): void {
  const {
    behavior,
    cancelRef,
    projectRoot,
    scriptPath,
    setFinishedLines,
    setRunLines,
    setRunPhase,
    setRunStatus,
  } = options;

  setRunPhase("running");
  setRunLines([]);
  setFinishedLines([]);
  setRunStatus("Starting…");

  const capturedLines: PlatformOrchestrationKit_MaintainerInkSessionLine[] = [];
  const appendLines = (
    nextLines: readonly PlatformOrchestrationKit_MaintainerInkSessionLine[],
  ): void => {
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
  setRunStatus(
    `Running: ${PlatformOrchestrationKit_formatNpxTsxCommandLine(scriptPath)}`,
  );

  handle.promise
    .then((result) => {
      cancelRef.current = null;
      setFinishedLines([...capturedLines]);
      setRunStatus(`Finished: exit ${String(result.status)}`);
      setRunPhase("done");
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      cancelRef.current = null;
      setFinishedLines([...capturedLines, { source: "stderr", text: message }]);
      setRunStatus("Finished: failed to run wrapper");
      setRunPhase("done");
    });
}

/** Routes run-screen hotkeys across pick, streaming, and completion phases. */
function consumePlatformOrchestrationMaintainerInkRunInput(options: {
  readonly behavior: PlatformOrchestrationKit_MaintainerInkBehavior | undefined;
  readonly cancelRef: MutableRefObject<(() => void) | null>;
  readonly input: string;
  readonly key: Key;
  readonly projectRoot: string;
  readonly runPhase: PlatformOrchestrationKit_MaintainerInkRunPhase;
  readonly runWrapIndex: number;
  readonly setFinishedLines: Dispatch<
    SetStateAction<PlatformOrchestrationKit_MaintainerInkSessionLine[]>
  >;
  readonly setRunLines: Dispatch<
    SetStateAction<PlatformOrchestrationKit_MaintainerInkSessionLine[]>
  >;
  readonly setRunPhase: Dispatch<
    SetStateAction<PlatformOrchestrationKit_MaintainerInkRunPhase>
  >;
  readonly setRunStatus: Dispatch<SetStateAction<string>>;
  readonly setRunWrapIndex: Dispatch<SetStateAction<number>>;
  readonly stopRun: () => void;
  readonly wrappers: readonly PlatformOrchestrationKit_WrapperEntry[];
}): void {
  const {
    behavior,
    cancelRef,
    input,
    key,
    projectRoot,
    runPhase,
    runWrapIndex,
    setFinishedLines,
    setRunLines,
    setRunPhase,
    setRunStatus,
    setRunWrapIndex,
    stopRun,
    wrappers,
  } = options;

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
      if (!wrapper) return;
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
export function PlatformOrchestrationKitMaintainerInkApp({
  appName = "Platform orchestration",
  behavior,
  contentQueueGuardsPath,
  description = "Maintainer console — diagnostics, previews, optional wrapper runs",
  diagnosticsJsonCommandLine = "configured maintainer JSON command",
  exampleRootNpmScript = "build",
  projectRoot,
  wrappers,
}: PlatformOrchestrationKit_MaintainerInkAppProps): React.ReactNode {
  const { exit } = useApp();
  const resolvedProjectRoot = path.resolve(projectRoot);

  const [screen, setScreen] =
    useState<PlatformOrchestrationKit_MaintainerInkScreenId>("menu");
  const [pkgIndex, setPkgIndex] = useState(0);
  const [previewScriptIndex, setPreviewScriptIndex] = useState(0);
  const [wrapIndex, setWrapIndex] = useState(0);
  const [runWrapIndex, setRunWrapIndex] = useState(0);
  const [runPhase, setRunPhase] =
    useState<PlatformOrchestrationKit_MaintainerInkRunPhase>("pick");
  const [runLines, setRunLines] = useState<
    PlatformOrchestrationKit_MaintainerInkSessionLine[]
  >([]);
  const [runStatus, setRunStatus] = useState("");
  const [finishedLines, setFinishedLines] = useState<
    PlatformOrchestrationKit_MaintainerInkSessionLine[]
  >([]);
  const cancelRef = useRef<(() => void) | null>(null);

  const packages = useMemo(
    () =>
      PlatformOrchestrationKit_resolveWorkspacePackageDirs(resolvedProjectRoot),
    [resolvedProjectRoot],
  );

  const diagnostics = useMemo(
    () =>
      PlatformOrchestrationKit_buildDiagnosticsPayload({
        ...(contentQueueGuardsPath === undefined ? {} : { contentQueueGuardsPath }),
        repoRoot: resolvedProjectRoot,
        wrappers,
      }),
    [contentQueueGuardsPath, resolvedProjectRoot, wrappers],
  );

  const overviewText = useMemo(() => {
    const raw = JSON.stringify(diagnostics, null, 2);
    const lines = raw.split("\n");
    return lines.slice(0, 48).join("\n") + (lines.length > 48 ? "\n…" : "");
  }, [diagnostics]);

  const currentPkg = packages[pkgIndex] ?? packages[0] ?? "";
  const previewTargets = useMemo(
    () =>
      currentPkg.length > 0
        ? PlatformOrchestrationKit_buildPackagePreviewTargets({
            packageDir: currentPkg,
            repoRoot: resolvedProjectRoot,
          })
        : [],
    [resolvedProjectRoot, currentPkg],
  );
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
    if (
      tryConsumePlatformOrchestrationMaintainerInkInterruptKey({
        input,
        key,
        stopRun,
        exit,
      })
    ) {
      return;
    }

    if (
      tryConsumePlatformOrchestrationMaintainerInkEscapeFromSubScreen({
        screen,
        key,
        stopRun,
        navigateMenuResettingRunShell: () => {
          resetRunShell();
          setScreen("menu");
        },
      })
    ) {
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

  const previewCommand =
    previewTarget && currentPkg
      ? PlatformOrchestrationKit_formatNpmRunPackageCommandLine(
          currentPkg,
          previewTarget.script,
        )
      : "(no script for selection)";

  return (
    <Box flexDirection="column">
      <InkScreenHeader
        appName={appName}
        description={description}
        title="Ink"
      />

      {screen === "menu" ? (
        <Box flexDirection="column" marginTop={1}>
          <Text bold>Menu</Text>
          <Text>[1] Diagnostics overview (JSON excerpt)</Text>
          <Text>[2] Packages — script matrix</Text>
          <Text>[3] Root wrappers — npm vs tsx</Text>
          <Text>[4] Command preview — npm run --prefix</Text>
          <Text>
            [5] Run wrapper — stream npx tsx (r run · x cancel while running)
          </Text>
          <Text color="gray">q quit · Esc back from any screen</Text>
        </Box>
      ) : null}

      {screen === "overview" ? (
        <Box flexDirection="column" marginTop={1}>
          <Text bold>Diagnostics (excerpt)</Text>
          <Text dimColor>Full JSON: {diagnosticsJsonCommandLine}</Text>
          <Text>{overviewText}</Text>
        </Box>
      ) : null}

      {screen === "packages" ? (
        <Box flexDirection="column" marginTop={1}>
          <Text bold>Packages (↑↓) — {currentPkg}</Text>
          {packages.map((packageDir, index) => {
            const row = diagnostics.packages.find(
              (item) => item.dir === packageDir,
            );
            const mark = index === pkgIndex ? "> " : "  ";
            const bits = row
              ? `build=${String(row.scripts.build)} test=${row.scripts.test} lint=${String(row.scripts.lint)} type=${row.scripts.typeCheck ?? "—"}`
              : "";
            return (
              <Text
                key={packageDir}
                {...(index === pkgIndex ? { color: "cyan" as const } : {})}
              >
                {mark}
                {packageDir} {bits}
              </Text>
            );
          })}
        </Box>
      ) : null}

      {screen === "wrappers" ? (
        <Box flexDirection="column" marginTop={1}>
          <Text bold>Root wrappers (↑↓)</Text>
          {wrappers.map((item, index) => (
            <Text
              key={item.npmScript}
              {...(index === wrapIndex ? { color: "cyan" as const } : {})}
            >
              {index === wrapIndex ? "> " : "  "}
              {item.npmScript} → {item.scriptPath}
            </Text>
          ))}
          {wrapper ? (
            <Box flexDirection="column" marginTop={1}>
              <Text dimColor>{wrapper.description}</Text>
              <InkCommandPreview
                commandLine={npmRootLine}
                title="npm (repo root)"
              />
              <Box marginTop={1}>
                <InkCommandPreview commandLine={tsxLine} title="tsx" />
              </Box>
            </Box>
          ) : null}
        </Box>
      ) : null}

      {screen === "preview" ? (
        <Box flexDirection="column" marginTop={1}>
          <Text bold>Preview</Text>
          <Text dimColor>↑↓ package · ←→ script target</Text>
          <Text>
            Package: {currentPkg} ({previewTargets.length} runnable targets)
          </Text>
          {previewTargets.map((target, index) => (
            <Text
              key={target.script}
              {...(index === previewScriptIndex ? { color: "cyan" as const } : {})}
            >
              {index === previewScriptIndex ? "> " : "  "}
              {target.label}
            </Text>
          ))}
          <Box marginTop={1}>
            <InkCommandPreview
              commandLine={previewCommand}
              title="Package command"
            />
          </Box>
          <Box marginTop={1}>
            <InkCommandPreview
              commandLine={PlatformOrchestrationKit_formatNpmRunRootCommandLine(
                exampleRootNpmScript,
              )}
              title="Example root npm (orchestration)"
            />
          </Box>
        </Box>
      ) : null}

      {screen === "run" ? (
        <Box flexDirection="column" marginTop={1}>
          <Text bold>Run platform wrapper</Text>
          {runPhase === "pick" ? (
            <>
              <Text dimColor>↑↓ select · r run · Esc menu</Text>
              {wrappers.map((item, index) => (
                <Text
                  key={item.npmScript}
                  {...(index === runWrapIndex ? { color: "cyan" as const } : {})}
                >
                  {index === runWrapIndex ? "> " : "  "}
                  {item.npmScript} → {item.scriptPath}
                </Text>
              ))}
            </>
          ) : null}
          {runPhase !== "pick" ? (
            <Box flexDirection="column" marginTop={1}>
              <Text>{runStatus}</Text>
              {finishedLines.length > 0 ? (
                <Box flexDirection="column" marginTop={1}>
                  <Text bold>Completed output (Static)</Text>
                  <Static items={finishedLines}>
                    {(line, index) => (
                      <Text key={`${line.source}:${String(index)}`}>
                        [{line.source}] {line.text}
                      </Text>
                    )}
                  </Static>
                </Box>
              ) : null}
              {runPhase === "running" ? (
                <Box flexDirection="column" marginTop={1}>
                  <InkCapturedOutputBlock
                    lines={runLines}
                    maxLines={14}
                    title="Live stream (rolling window)"
                  />
                  <Text dimColor>x cancel</Text>
                </Box>
              ) : null}
              {runPhase === "done" ? (
                <Box marginTop={1}>
                  <Text dimColor>r reset · Esc menu</Text>
                </Box>
              ) : null}
            </Box>
          ) : null}
        </Box>
      ) : null}

      <Box marginTop={1}>
        <InkLegend
          lines={[
            "Esc back to menu from sub-screens",
            "Ctrl+C exit",
            "Rolling log window during run; full session in Static after complete",
          ]}
        />
      </Box>
    </Box>
  );
}
