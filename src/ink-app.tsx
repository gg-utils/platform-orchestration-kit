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

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Box, Static, Text, useInput } from "ink";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router";

import {
  PlatformOrchestrationKit_resolveCommandNpmScript,
  type PlatformOrchestrationKit_CommandDefinition,
} from "./command-catalog.js";
import { PlatformOrchestrationKit_formatNpmRunCommand } from "./format-command.js";
import {
  PlatformOrchestrationKit_spawnNpmRun,
  type PlatformOrchestrationKit_NpmSpawnHandlers,
} from "./npm-spawn.js";

/** Source stream for a captured Ink subprocess output line. */
type PlatformOrchestrationKit_InkSessionLineSource = "stdout" | "stderr";

/** A captured Ink subprocess output line with its originating stream. */
type PlatformOrchestrationKit_InkSessionLine = {
  readonly source: PlatformOrchestrationKit_InkSessionLineSource;
  readonly text: string;
};

/** Final run telemetry shown on the Ink result screen. */
type PlatformOrchestrationKit_InkRunResult = {
  readonly exitCode: number | null;
  readonly lines: readonly PlatformOrchestrationKit_InkSessionLine[];
  readonly signal: string | null;
  readonly status: "cancelled" | "failed" | "succeeded";
};

/** Function bundle supplied by the root adapter for command execution customisation. */
export type PlatformOrchestrationKit_InkAppBehavior = {
  readonly formatNpmRunCommand?: (
    npmScript: string,
    forwardedArgs: readonly string[],
  ) => string;
  readonly getCommandWarning?: (options: {
    readonly command: PlatformOrchestrationKit_CommandDefinition;
    readonly deployTarget: string | null;
  }) => { readonly text: string; readonly tone: "red" | "yellow" } | null;
  readonly resolveNpmScript?: (options: {
    readonly command: PlatformOrchestrationKit_CommandDefinition;
    readonly deployTarget: string | null;
  }) => string;
  readonly spawnNpmRun?: (
    projectRoot: string,
    npmScript: string,
    forwardedArgs: readonly string[],
    handlers: PlatformOrchestrationKit_NpmSpawnHandlers,
  ) => {
    readonly cancel: () => void;
    readonly promise: Promise<{ readonly status: number }>;
  };
};

/** Props for the reusable platform command Ink renderer. */
export type PlatformOrchestrationKit_InkAppProps = {
  readonly appName: string;
  readonly behavior?: PlatformOrchestrationKit_InkAppBehavior;
  readonly commands: readonly PlatformOrchestrationKit_CommandDefinition[];
  readonly description: string;
  readonly notice: string | null;
  readonly projectRoot: string;
};

/** Mutable Ink launcher session shared between route screens. */
type PlatformOrchestrationKit_InkSessionState = {
  readonly command: PlatformOrchestrationKit_CommandDefinition | null;
  readonly deployTarget: string | null;
  readonly forwardedArgs: readonly string[];
  readonly lastRun: PlatformOrchestrationKit_InkRunResult | null;
  readonly npmScript: string | null;
  readonly runNonce: number;
  readonly runStartedAtMs: number | null;
};

/** React context value exposing Ink session state plus updaters. */
type PlatformOrchestrationKit_InkSessionContextValue = {
  readonly resetSession: () => void;
  readonly session: PlatformOrchestrationKit_InkSessionState;
  readonly setSession: React.Dispatch<
    React.SetStateAction<PlatformOrchestrationKit_InkSessionState>
  >;
};

const PlatformOrchestrationKit_InkSessionContext =
  createContext<PlatformOrchestrationKit_InkSessionContextValue | null>(null);

/** Builds the empty initial session state for a command catalog. */
function buildInitialSession(): PlatformOrchestrationKit_InkSessionState {
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
function PlatformOrchestrationKitInkSessionProvider({
  children,
}: {
  readonly children: React.ReactNode;
}): React.ReactNode {
  const [session, setSession] =
    useState<PlatformOrchestrationKit_InkSessionState>(buildInitialSession);

  const value = useMemo(
    (): PlatformOrchestrationKit_InkSessionContextValue => ({
      session,
      setSession,
      resetSession: () => {
        setSession(buildInitialSession());
      },
    }),
    [session],
  );

  return (
    <PlatformOrchestrationKit_InkSessionContext.Provider value={value}>
      {children}
    </PlatformOrchestrationKit_InkSessionContext.Provider>
  );
}

/** Reads the active Ink session context. */
function usePlatformOrchestrationKitInkSession(): PlatformOrchestrationKit_InkSessionContextValue {
  const ctx = useContext(PlatformOrchestrationKit_InkSessionContext);
  if (ctx === null) {
    throw new Error("PlatformOrchestrationKit Ink session context missing.");
  }
  return ctx;
}

/** Renders a command preview block. */
function InkCommandPreview({
  commandLine,
  title = "Command",
}: {
  readonly commandLine: string;
  readonly title?: string;
}): React.ReactNode {
  return (
    <Box flexDirection="column">
      <Text bold>{title}</Text>
      <Text wrap="wrap">{commandLine}</Text>
    </Box>
  );
}

/** Renders top-of-screen app chrome. */
function InkScreenHeader({
  appName,
  description,
  notice,
  projectRoot,
}: {
  readonly appName: string;
  readonly description: string;
  readonly notice: string | null;
  readonly projectRoot: string;
}): React.ReactNode {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold color="green">
        {appName}
      </Text>
      <Text color="gray">{description}</Text>
      <Box>
        <Text color="gray">Root: {projectRoot}</Text>
      </Box>
      {notice ? <Text color="yellow">{notice}</Text> : null}
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
    <Box marginTop={1} flexDirection="column" gap={0}>
      {lines.map((line, index) => (
        <Text key={String(index)} color="gray">
          {line}
        </Text>
      ))}
    </Box>
  );
}

/** Returns a warning based on risk when no adapter warning is supplied. */
function getDefaultRiskWarning(
  command: PlatformOrchestrationKit_CommandDefinition,
): { readonly text: string; readonly tone: "red" | "yellow" } | null {
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
function commandHasDeployTarget(
  command: PlatformOrchestrationKit_CommandDefinition,
  deployTarget: string,
): boolean {
  return (command.deployScripts ?? []).some(
    (mapping) => mapping.target === deployTarget,
  );
}

/** Formats the deploy-target picker label for a command mapping. */
function formatDeployTargetLabel(options: {
  readonly npmScript: string;
  readonly target: string;
}): string {
  return `${options.target} (${options.npmScript})`;
}

/** Creates a sourced line and appends it to both local and React state buffers. */
function appendRunChunk(options: {
  readonly chunk: string;
  readonly capturedLines: PlatformOrchestrationKit_InkSessionLine[];
  readonly setLines: React.Dispatch<
    React.SetStateAction<PlatformOrchestrationKit_InkSessionLine[]>
  >;
  readonly source: PlatformOrchestrationKit_InkSessionLineSource;
}): void {
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
function HomeScreen({
  appName,
  commands,
  description,
  notice,
  projectRoot,
  resolveNpmScript,
}: {
  readonly appName: string;
  readonly commands: readonly PlatformOrchestrationKit_CommandDefinition[];
  readonly description: string;
  readonly notice: string | null;
  readonly projectRoot: string;
  readonly resolveNpmScript: (options: {
    readonly command: PlatformOrchestrationKit_CommandDefinition;
    readonly deployTarget: string | null;
  }) => string;
}): React.ReactNode {
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

  return (
    <Box flexDirection="column">
      <InkScreenHeader
        appName={appName}
        description={description}
        notice={notice}
        projectRoot={projectRoot}
      />
      <Text bold>Select a command (↑/↓, Enter)</Text>
      {commands.map((command, commandIndex) => (
        <Text
          key={command.id}
          color={commandIndex === index ? "cyan" : "white"}
        >
          {commandIndex === index ? "› " : "  "}
          {command.label}
        </Text>
      ))}
      <InkLegend lines={["Keys: ↑/↓ move · Enter continue · Esc quit"]} />
    </Box>
  );
}

/** Deploy-target picker for commands that require target context. */
function DeployScreen({
  resolveNpmScript,
}: {
  readonly resolveNpmScript: (options: {
    readonly command: PlatformOrchestrationKit_CommandDefinition;
    readonly deployTarget: string | null;
  }) => string;
}): React.ReactNode {
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
    return <Text>Missing deploy command context.</Text>;
  }

  return (
    <Box flexDirection="column">
      <Text bold>Deploy target (↑/↓, Enter, Esc back)</Text>
      {targets.map((target, targetIndex) => (
        <Text
          key={target.target}
          color={targetIndex === index ? "cyan" : "white"}
        >
          {targetIndex === index ? "› " : "  "}
          {formatDeployTargetLabel(target)}
        </Text>
      ))}
    </Box>
  );
}

/** Review route: shows the resolved npm invocation and confirms before `/run`. */
function ReviewScreen({
  formatNpmRunCommand,
  getCommandWarning,
}: {
  readonly formatNpmRunCommand: (
    npmScript: string,
    forwardedArgs: readonly string[],
  ) => string;
  readonly getCommandWarning?: PlatformOrchestrationKit_InkAppBehavior["getCommandWarning"];
}): React.ReactNode {
  const navigate = useNavigate();
  const { session, setSession } = usePlatformOrchestrationKitInkSession();
  const command = session.command;
  const npmScript = session.npmScript;

  const commandLine =
    npmScript != null
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
    return <Text>Nothing to review. Press Esc.</Text>;
  }

  const warning =
    getCommandWarning?.({ command, deployTarget: session.deployTarget }) ??
    getDefaultRiskWarning(command);

  return (
    <Box flexDirection="column">
      <Text bold>Review</Text>
      <InkCommandPreview commandLine={commandLine} title="npm command" />
      <Text color="gray">{command.description}</Text>
      {warning ? <Text color={warning.tone}>{warning.text}</Text> : null}
      <Box marginTop={1}>
        <Text>Enter: run · Esc: back</Text>
      </Box>
    </Box>
  );
}

/** Execution route: spawns `npm run`, streams child output, and records completion. */
function RunScreen({
  formatNpmRunCommand,
  projectRoot,
  spawnNpmRun,
}: {
  readonly formatNpmRunCommand: (
    npmScript: string,
    forwardedArgs: readonly string[],
  ) => string;
  readonly projectRoot: string;
  readonly spawnNpmRun: (
    projectRoot: string,
    npmScript: string,
    forwardedArgs: readonly string[],
    handlers: PlatformOrchestrationKit_NpmSpawnHandlers,
  ) => {
    readonly cancel: () => void;
    readonly promise: Promise<{ readonly status: number }>;
  };
}): React.ReactNode {
  const navigate = useNavigate();
  const { session, setSession } = usePlatformOrchestrationKitInkSession();
  const npmScript = session.npmScript;
  const runNonce = session.runNonce;
  const forwardedArgs = session.forwardedArgs;

  const [lines, setLines] = useState<PlatformOrchestrationKit_InkSessionLine[]>(
    [],
  );
  const [, setTick] = useState(0);
  const cancelRef = useRef<(() => void) | null>(null);

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
    const capturedLines: PlatformOrchestrationKit_InkSessionLine[] = [];
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

  const elapsedLabel =
    session.runStartedAtMs != null
      ? `${Math.round((Date.now() - session.runStartedAtMs) / 1000)}s`
      : "starting…";

  return (
    <Box flexDirection="column">
      <Text bold>Running</Text>
      <InkCommandPreview
        commandLine={
          npmScript != null ? formatNpmRunCommand(npmScript, forwardedArgs) : ""
        }
        title="Command"
      />
      <Static items={lines}>
        {(line, lineIndex) => (
          <Text
            key={`line-${String(lineIndex)}`}
            color={line.source === "stderr" ? "red" : "white"}
          >
            {line.text}
          </Text>
        )}
      </Static>
      <Box marginTop={1}>
        <Text color="gray">Live status · {elapsedLabel} · Esc cancels</Text>
      </Box>
    </Box>
  );
}

/** Post-run summary route with exit status and output line counts. */
function ResultScreen(): React.ReactNode {
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
    return <Text>No result captured.</Text>;
  }

  const stdoutLines = result.lines.filter(
    (line) => line.source === "stdout",
  ).length;
  const stderrLines = result.lines.filter(
    (line) => line.source === "stderr",
  ).length;

  return (
    <Box flexDirection="column">
      <Text bold>Result</Text>
      <Text>
        Status: {result.status} · exit {String(result.exitCode)} · signal{" "}
        {String(result.signal)}
      </Text>
      <Text color="gray">
        Lines: stdout {stdoutLines} · stderr {stderrLines}
      </Text>
      <Box marginTop={1}>
        <Text>Enter / Esc: main menu</Text>
      </Box>
    </Box>
  );
}

/** Declares MemoryRouter routes for the platform Ink wizard screens. */
function PlatformOrchestrationKitInkRoutes({
  appName,
  behavior,
  commands,
  description,
  notice,
  projectRoot,
}: PlatformOrchestrationKit_InkAppProps): React.ReactNode {
  const formatNpmRunCommand =
    behavior?.formatNpmRunCommand ??
    PlatformOrchestrationKit_formatNpmRunCommand;
  const resolveNpmScript =
    behavior?.resolveNpmScript ??
    PlatformOrchestrationKit_resolveCommandNpmScript;
  const spawnNpmRun =
    behavior?.spawnNpmRun ?? PlatformOrchestrationKit_spawnNpmRun;

  return (
    <Routes>
      <Route
        path="/"
        element={
          <HomeScreen
            appName={appName}
            commands={commands}
            description={description}
            notice={notice}
            projectRoot={projectRoot}
            resolveNpmScript={resolveNpmScript}
          />
        }
      />
      <Route
        path="/deploy"
        element={<DeployScreen resolveNpmScript={resolveNpmScript} />}
      />
      <Route
        path="/review"
        element={
          <ReviewScreen
            formatNpmRunCommand={formatNpmRunCommand}
            getCommandWarning={behavior?.getCommandWarning}
          />
        }
      />
      <Route
        path="/run"
        element={
          <RunScreen
            formatNpmRunCommand={formatNpmRunCommand}
            projectRoot={projectRoot}
            spawnNpmRun={spawnNpmRun}
          />
        }
      />
      <Route path="/result" element={<ResultScreen />} />
    </Routes>
  );
}

/** Ink root component for a config-driven platform CLI. */
export function PlatformOrchestrationKitInkApp(
  props: PlatformOrchestrationKit_InkAppProps,
): React.ReactNode {
  return (
    <MemoryRouter initialEntries={["/"]} initialIndex={0}>
      <PlatformOrchestrationKitInkSessionProvider>
        <PlatformOrchestrationKitInkRoutes {...props} />
      </PlatformOrchestrationKitInkSessionProvider>
    </MemoryRouter>
  );
}
