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

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  PlatformOrchestrationKit_resolveCommandNpmScript,
  type PlatformOrchestrationKit_CommandDefinition,
  type PlatformOrchestrationKit_DeployScriptMapping,
} from "./command-catalog.js";
import { PlatformOrchestrationKit_formatNpmRunCommand } from "./format-command.js";
import {
  PlatformOrchestrationKit_spawnNpmRun,
  type PlatformOrchestrationKit_NpmSpawnHandlers,
} from "./npm-spawn.js";

/** Tab-select option row consumed by OpenTUI select widgets. */
export type PlatformOrchestrationKit_OpenTuiSelectOption = {
  readonly description: string;
  readonly name: string;
  readonly value: string;
};

/** Flow phase rendered by the reusable OpenTUI app. */
type PlatformOrchestrationKit_OpenTuiPhase =
  | "home"
  | "deploy"
  | "review"
  | "run"
  | "result";

/** Function bundle supplied by the root adapter for command execution customisation. */
export type PlatformOrchestrationKit_OpenTuiAppBehavior<
  Command extends PlatformOrchestrationKit_CommandDefinition,
> = {
  readonly formatNpmRunCommand?: (npmScript: string) => string;
  readonly getCommandWarning?: (options: {
    readonly command: Command;
    readonly deployTarget: string | null;
  }) => string | null;
  readonly resolveNpmScript?: (options: {
    readonly command: Command;
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

/** Props for the reusable platform command OpenTUI renderer. */
export type PlatformOrchestrationKit_OpenTuiAppProps<
  Command extends PlatformOrchestrationKit_CommandDefinition,
> = {
  readonly behavior?: PlatformOrchestrationKit_OpenTuiAppBehavior<Command>;
  readonly commands: readonly Command[];
  readonly headerText: string;
  readonly projectRoot: string;
};

/** Builds the home menu rows from the configured command catalog. */
function buildHomeOptions<
  Command extends PlatformOrchestrationKit_CommandDefinition,
>(
  commands: readonly Command[],
): PlatformOrchestrationKit_OpenTuiSelectOption[] {
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
function buildDeployOptions(
  deployScripts: readonly PlatformOrchestrationKit_DeployScriptMapping[],
): PlatformOrchestrationKit_OpenTuiSelectOption[] {
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
function buildCombinedOutput(options: {
  readonly stderr: string;
  readonly stdout: string;
}): string {
  return [
    options.stdout.length > 0 ? `--- stdout ---\n${options.stdout}` : "",
    options.stderr.length > 0 ? `--- stderr ---\n${options.stderr}` : "",
  ]
    .filter((section) => section.length > 0)
    .join("\n\n");
}

/** Returns true when a deploy target value exists in the selected command mapping. */
function commandHasDeployTarget<
  Command extends PlatformOrchestrationKit_CommandDefinition,
>(command: Command, deployTarget: string): boolean {
  return (command.deployScripts ?? []).some(
    (mapping) => mapping.target === deployTarget,
  );
}

/** OpenTUI root component for a config-driven platform command browser. */
export function PlatformOrchestrationKitOpenTuiApp<
  Command extends PlatformOrchestrationKit_CommandDefinition,
>({
  behavior,
  commands,
  headerText,
  projectRoot,
}: PlatformOrchestrationKit_OpenTuiAppProps<Command>): ReactNode {
  const [phase, setPhase] =
    useState<PlatformOrchestrationKit_OpenTuiPhase>("home");
  const [command, setCommand] = useState<Command | null>(null);
  const [deployTarget, setDeployTarget] = useState<string | null>(null);
  const [npmScript, setNpmScript] = useState<string | null>(null);
  const [runStdout, setRunStdout] = useState("");
  const [runStderr, setRunStderr] = useState("");
  const [runStatus, setRunStatus] = useState<number | null>(null);

  const cancelRunRef = useRef<(() => void) | null>(null);

  const formatNpmRunCommand =
    behavior?.formatNpmRunCommand ??
    PlatformOrchestrationKit_formatNpmRunCommand;
  const resolveNpmScript =
    behavior?.resolveNpmScript ??
    ((options: { command: Command; deployTarget: string | null }) =>
      PlatformOrchestrationKit_resolveCommandNpmScript(options));
  const spawnNpmRun =
    behavior?.spawnNpmRun ?? PlatformOrchestrationKit_spawnNpmRun;

  useEffect(() => {
    return () => {
      cancelRunRef.current?.();
    };
  }, []);

  function goHome(): void {
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
  const deployOptions = useMemo(
    () => buildDeployOptions(command?.deployScripts ?? []),
    [command?.deployScripts],
  );

  async function runNpm(script: string): Promise<void> {
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
    } catch (error) {
      cancelRunRef.current = null;
      const message = error instanceof Error ? error.message : String(error);
      setRunStderr(message);
      setRunStatus(1);
      setPhase("result");
    }
  }

  const previewText = npmScript != null ? formatNpmRunCommand(npmScript) : "";
  const commandWarning =
    command && behavior?.getCommandWarning
      ? behavior.getCommandWarning({ command, deployTarget })
      : null;
  const combinedOutput = buildCombinedOutput({
    stderr: runStderr,
    stdout: runStdout,
  });

  return (
    <box style={{ flexDirection: "column", flexGrow: 1, gap: 1, padding: 1 }}>
      <text>{headerText}</text>
      <text>{projectRoot}</text>

      {phase === "home" ? (
        <>
          <text>Select a platform command (Tab / arrows, Enter).</text>
          <tab-select
            onSelect={(_index, option) => {
              const value = option?.value;
              if (value === "quit") {
                process.kill(process.pid, "SIGINT");
                return;
              }
              const selected = commands.find(
                (definition) => definition.id === value,
              );
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
            }}
            options={homeOptions}
            showDescription={true}
          />
        </>
      ) : null}

      {phase === "deploy" && command?.requiresDeployTarget ? (
        <>
          <text>Choose deploy target.</text>
          <tab-select
            onSelect={(_index, option) => {
              const value = option?.value;
              if (value === "back") {
                goHome();
                return;
              }
              if (
                value === undefined ||
                !commandHasDeployTarget(command, value)
              ) {
                return;
              }
              setDeployTarget(value);
              const script = resolveNpmScript({ command, deployTarget: value });
              setNpmScript(script);
              setPhase("review");
            }}
            options={deployOptions}
            showDescription={true}
          />
        </>
      ) : null}

      {phase === "review" && command && npmScript ? (
        <>
          <text bold>Review</text>
          {commandWarning ? (
            <text style={{ fg: "yellow" }}>{commandWarning}</text>
          ) : null}
          <scrollbox style={{ flexGrow: 1, maxHeight: 12 }}>
            <text>{previewText}</text>
          </scrollbox>
          <tab-select
            onSelect={(_index, option) => {
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
            }}
            options={[
              { description: "Execute npm run", name: "Run", value: "run" },
              { description: "Edit choice", name: "Back", value: "back" },
            ]}
            showDescription={true}
          />
        </>
      ) : null}

      {phase === "run" ? (
        <>
          <text bold>Running… (wait for completion)</text>
          <scrollbox style={{ flexGrow: 1 }}>
            <text>{combinedOutput.length > 0 ? combinedOutput : "…"}</text>
          </scrollbox>
        </>
      ) : null}

      {phase === "result" ? (
        <>
          <text bold>Finished</text>
          <text>Exit status: {runStatus ?? "unknown"}</text>
          <scrollbox style={{ flexGrow: 1, maxHeight: 14 }}>
            <text>
              {combinedOutput.length > 0 ? combinedOutput : "(no output)"}
            </text>
          </scrollbox>
          <tab-select
            onSelect={() => {
              goHome();
            }}
            options={[
              { description: "Main menu", name: "Menu", value: "menu" },
            ]}
            showDescription={true}
          />
        </>
      ) : null}
    </box>
  );
}
