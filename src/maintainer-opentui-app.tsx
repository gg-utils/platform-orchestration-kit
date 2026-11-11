/**
 * @fileoverview Reusable OpenTUI maintainer shell for platform orchestration diagnostics.
 *
 * Flow: injected wrapper/config facts -> diagnostics payload -> package/wrapper previews -> optional
 * streamed wrapper execution. Root adapters provide project-specific wrapper metadata and config paths.
 *
 * @testing Package: `npm run platform-orchestration-kit:type-check`.
 * @see packages/platform-orchestration-kit/src/diagnostics.ts - Diagnostics and wrapper contracts.
 * @documentation reviewed=2026-05-21 standard=FILE_OVERVIEW_STANDARDS_TYPESCRIPT@3
 */

import path from "node:path";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

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

/** High-level navigation pane for the maintainer shell UI. */
type PlatformOrchestrationKit_MaintainerOpenTuiStep =
  | "menu"
  | "overview"
  | "packages"
  | "wrappers"
  | "preview"
  | "run";

/** Injectable wrapper-run result used by the maintainer OpenTUI shell. */
export type PlatformOrchestrationKit_MaintainerOpenTuiRunHandle = {
  readonly cancel: () => void;
  readonly promise: Promise<{ readonly status: number }>;
};

/** Optional host hooks for the maintainer OpenTUI shell. */
export type PlatformOrchestrationKit_MaintainerOpenTuiBehavior = {
  readonly spawnNpxTsx?: (
    repoRoot: string,
    scriptPathUnderRepo: string,
    args: readonly string[],
    handlers: PlatformOrchestrationKit_NpxTsxSpawnHandlers,
  ) => PlatformOrchestrationKit_MaintainerOpenTuiRunHandle;
};

/** Props for the reusable platform orchestration maintainer OpenTUI shell. */
export type PlatformOrchestrationKit_MaintainerOpenTuiAppProps = {
  readonly behavior?: PlatformOrchestrationKit_MaintainerOpenTuiBehavior;
  readonly contentQueueGuardsPath?: string;
  readonly diagnosticsJsonCommandLine?: string;
  readonly headerText?: string;
  readonly projectRoot: string;
  readonly wrappers: readonly PlatformOrchestrationKit_WrapperEntry[];
};

/** Default host runner for streamed wrapper execution. */
function defaultSpawnNpxTsx(
  repoRoot: string,
  scriptPathUnderRepo: string,
  args: readonly string[],
  handlers: PlatformOrchestrationKit_NpxTsxSpawnHandlers,
): PlatformOrchestrationKit_MaintainerOpenTuiRunHandle {
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

/** Clamps a selected index into a zero-based list range. */
function clampIndex(index: number, length: number): number {
  return Math.max(0, Math.min(Math.max(length - 1, 0), index));
}

/** OpenTUI maintainer shell for platform orchestration diagnostics, previews, and wrapper runs. */
export function PlatformOrchestrationKitMaintainerOpenTuiApp({
  behavior,
  contentQueueGuardsPath,
  diagnosticsJsonCommandLine = "configured maintainer JSON command",
  headerText = "platform orchestration (OpenTUI) — children use `npx tsx`.",
  projectRoot,
  wrappers,
}: PlatformOrchestrationKit_MaintainerOpenTuiAppProps): ReactNode {
  const resolvedProjectRoot = path.resolve(projectRoot);
  const [step, setStep] =
    useState<PlatformOrchestrationKit_MaintainerOpenTuiStep>("menu");
  const [pkgIndex, setPkgIndex] = useState(0);
  const [previewScriptIndex, setPreviewScriptIndex] = useState(0);
  const [wrapIndex, setWrapIndex] = useState(0);
  const [runWrapIndex, setRunWrapIndex] = useState(0);
  const [runLog, setRunLog] = useState("");
  const [runStatus, setRunStatus] = useState("");
  const childRef =
    useRef<PlatformOrchestrationKit_MaintainerOpenTuiRunHandle | null>(null);

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
    return lines.slice(0, 40).join("\n") + (lines.length > 40 ? "\n…" : "");
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

  function stopRun(): void {
    childRef.current?.cancel();
    childRef.current = null;
  }

  useEffect(() => {
    return () => {
      stopRun();
    };
  }, []);

  const menuOptions = [
    {
      description: "JSON excerpt + toolchain",
      name: "Overview",
      value: "overview",
    },
    {
      description: "Per-package script flags",
      name: "Packages",
      value: "packages",
    },
    { description: "npm vs tsx wrappers", name: "Wrappers", value: "wrappers" },
    {
      description: "npm run --prefix preview",
      name: "Preview",
      value: "preview",
    },
    { description: "Stream npx tsx wrapper", name: "Run", value: "run" },
    { description: "Exit OpenTUI", name: "Quit", value: "quit" },
  ];

  const backOptions = [
    { description: "Return to menu", name: "Back", value: "back" },
  ];

  const packageOptions = packages.map((packageDir) => ({
    description: packageDir,
    name: packageDir,
    value: packageDir,
  }));

  const wrapperSelectOptions = wrappers.map((wrapper) => ({
    description: wrapper.scriptPath,
    name: wrapper.npmScript,
    value: wrapper.npmScript,
  }));

  const previewScriptOptions = previewTargets.map((target) => ({
    description: target.script,
    name: target.label,
    value: target.script,
  }));

  const runActionOptions = [
    {
      description: "Spawn npx tsx for selected wrapper",
      name: "Run now",
      value: "go",
    },
    { description: "Return to menu", name: "Back", value: "back" },
  ];

  const wrapper = wrappers[wrapIndex];
  const runWrapper = wrappers[runWrapIndex];

  function startWrapperRun(): void {
    if (!runWrapper) return;
    stopRun();
    setRunLog("");
    setRunStatus("Running…");
    const spawnNpxTsx = behavior?.spawnNpxTsx ?? defaultSpawnNpxTsx;
    const handle = spawnNpxTsx(resolvedProjectRoot, runWrapper.scriptPath, [], {
      onStderrChunk(chunk) {
        setRunLog((prev) => prev + chunk);
      },
      onStdoutChunk(chunk) {
        setRunLog((prev) => prev + chunk);
      },
    });
    childRef.current = handle;
    handle.promise
      .then(({ status }) => {
        childRef.current = null;
        setRunStatus(`Finished (exit ${String(status)})`);
      })
      .catch((error: unknown) => {
        childRef.current = null;
        const message = error instanceof Error ? error.message : String(error);
        setRunLog((prev) => `${prev}${prev.length > 0 ? "\n" : ""}${message}`);
        setRunStatus("Finished (failed to run wrapper)");
      });
  }

  return (
    <box style={{ flexDirection: "column", flexGrow: 1, gap: 1, padding: 1 }}>
      <text>
        {headerText} Repo: {resolvedProjectRoot}
      </text>

      {step === "menu" ? (
        <>
          <text bold>Menu</text>
          <select
            onChange={(_i, option) => {
              const value = option?.value;
              if (value === "quit") {
                process.kill(process.pid, "SIGINT");
                return;
              }
              if (value === "overview") setStep("overview");
              if (value === "packages") setStep("packages");
              if (value === "wrappers") setStep("wrappers");
              if (value === "preview") setStep("preview");
              if (value === "run") setStep("run");
            }}
            options={menuOptions}
            selectedIndex={0}
            showDescription={true}
          />
        </>
      ) : null}

      {step === "overview" ? (
        <>
          <text bold>Diagnostics excerpt</text>
          <text style={{ fg: "gray" }}>
            Full JSON: {diagnosticsJsonCommandLine}
          </text>
          <scrollbox style={{ flexGrow: 1, maxHeight: 18 }}>
            <text>{overviewText}</text>
          </scrollbox>
          <tab-select
            onSelect={(_i, option) => {
              if (option?.value === "back") setStep("menu");
            }}
            options={backOptions}
            showDescription={true}
          />
        </>
      ) : null}

      {step === "packages" ? (
        <>
          <text bold>Packages</text>
          <select
            onChange={(index) => {
              setPkgIndex(clampIndex(index, packages.length));
            }}
            options={packageOptions}
            selectedIndex={pkgIndex}
            showDescription={false}
          />
          {diagnostics.packages
            .filter((row) => row.dir === currentPkg)
            .map((row) => (
              <text key={row.dir}>
                build={String(row.scripts.build)} test={row.scripts.test} lint=
                {String(row.scripts.lint)} type={row.scripts.typeCheck ?? "—"}
              </text>
            ))}
          <tab-select
            onSelect={(_i, option) => {
              if (option?.value === "back") setStep("menu");
            }}
            options={backOptions}
            showDescription={true}
          />
        </>
      ) : null}

      {step === "wrappers" ? (
        <>
          <text bold>Wrappers</text>
          <select
            onChange={(index) => {
              setWrapIndex(clampIndex(index, wrappers.length));
            }}
            options={wrapperSelectOptions}
            selectedIndex={wrapIndex}
            showDescription={true}
          />
          {wrapper ? (
            <>
              <text style={{ fg: "gray" }}>{wrapper.description}</text>
              <text>
                {PlatformOrchestrationKit_formatNpmRunRootCommandLine(
                  wrapper.npmScript,
                )}
              </text>
              <text>
                {PlatformOrchestrationKit_formatNpxTsxCommandLine(
                  wrapper.scriptPath,
                )}
              </text>
            </>
          ) : null}
          <tab-select
            onSelect={(_i, option) => {
              if (option?.value === "back") setStep("menu");
            }}
            options={backOptions}
            showDescription={true}
          />
        </>
      ) : null}

      {step === "preview" ? (
        <>
          <text bold>Command preview</text>
          <select
            onChange={(index) => {
              setPkgIndex(clampIndex(index, packages.length));
            }}
            options={packageOptions}
            selectedIndex={pkgIndex}
            showDescription={false}
          />
          <select
            onChange={(index) => {
              setPreviewScriptIndex(clampIndex(index, previewTargets.length));
            }}
            options={
              previewScriptOptions.length > 0
                ? previewScriptOptions
                : [{ description: "", name: "(none)", value: "" }]
            }
            selectedIndex={Math.min(
              previewScriptIndex,
              Math.max(previewScriptOptions.length - 1, 0),
            )}
            showDescription={false}
          />
          <text>
            {previewTarget
              ? PlatformOrchestrationKit_formatNpmRunPackageCommandLine(
                  currentPkg,
                  previewTarget.script,
                )
              : "(no script targets)"}
          </text>
          <tab-select
            onSelect={(_i, option) => {
              if (option?.value === "back") setStep("menu");
            }}
            options={backOptions}
            showDescription={true}
          />
        </>
      ) : null}

      {step === "run" ? (
        <>
          <text bold>Run wrapper (long output scrolls below)</text>
          <select
            onChange={(index) => {
              setRunWrapIndex(clampIndex(index, wrappers.length));
            }}
            options={wrapperSelectOptions}
            selectedIndex={runWrapIndex}
            showDescription={true}
          />
          {runWrapper ? (
            <text style={{ fg: "gray" }}>
              {PlatformOrchestrationKit_formatNpxTsxCommandLine(
                runWrapper.scriptPath,
              )}
            </text>
          ) : null}
          <text>{runStatus}</text>
          <scrollbox style={{ flexGrow: 1, maxHeight: 14 }}>
            <text>{runLog.length > 0 ? runLog : "(no output yet)"}</text>
          </scrollbox>
          <tab-select
            onSelect={(_i, option) => {
              const value = option?.value;
              if (value === "back") {
                stopRun();
                setRunLog("");
                setRunStatus("");
                setStep("menu");
              }
              if (value === "go") {
                startWrapperRun();
              }
            }}
            options={runActionOptions}
            showDescription={true}
          />
        </>
      ) : null}
    </box>
  );
}
