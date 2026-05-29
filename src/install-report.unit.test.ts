/**
 * @fileoverview Verifies install-phase reporting helpers for status aggregation, console
 * summaries, and shell-safe display quoting.
 *
 * This file owns Node test coverage for `PlatformOrchestrationKit_installPhaseResultStatus`,
 * `PlatformOrchestrationKit_printInstallPhaseResult`, and
 * `PlatformOrchestrationKit_shellQuoteForInstallDisplay`.
 * Flow: build phase result payloads -> assert status precedence, captured `console.log` lines, and
 * quoting for hostile paths.
 *
 * @testing Node test (tsx): cd packages/platform-orchestration-kit && node ../../node_modules/tsx/dist/cli.mjs --test src/install-report.unit.test.ts
 *
 * @see packages/platform-orchestration-kit/src/install-report.ts - Install-report helpers whose phase-status rules, formatted console output, and display quoting invariants are asserted here.
 * @see packages/platform-orchestration-kit/src/index.ts - Package barrel that re-exports the install-report surface covered by these regression tests for downstream orchestration callers.
 * @see docs/TYPESCRIPT_STANDARDS_DOCUMENTATION_FILE_OVERVIEWS.md - File-overview contract this test module header follows for verification and cross-reference discipline.
 * @documentation reviewed=2026-05-22 standard=FILE_OVERVIEW_STANDARDS_TYPESCRIPT@3
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  PlatformOrchestrationKit_installPhaseResultStatus,
  PlatformOrchestrationKit_printInstallPhaseResult,
  PlatformOrchestrationKit_shellQuoteForInstallDisplay,
} from "./install-report.js";

function captureConsoleLog(run: () => void): string[] {
  const originalLog = console.log;
  const lines: string[] = [];
  console.log = (...values: unknown[]): void => {
    lines.push(values.map(String).join(" "));
  };
  try {
    run();
  } finally {
    console.log = originalLog;
  }
  return lines;
}

test("PlatformOrchestrationKit_installPhaseResultStatus prioritizes failures over blocks", () => {
  assert.equal(
    PlatformOrchestrationKit_installPhaseResultStatus({
      blockedSteps: [{ label: "blocked" }],
      failedSteps: [{ label: "failed" }],
    }),
    "FAILED",
  );
  assert.equal(
    PlatformOrchestrationKit_installPhaseResultStatus({
      blockedSteps: [{ label: "blocked" }],
    }),
    "BLOCKED",
  );
  assert.equal(
    PlatformOrchestrationKit_installPhaseResultStatus({}),
    "COMPLETED",
  );
});

test("PlatformOrchestrationKit_printInstallPhaseResult renders populated sections and notes", () => {
  const output = captureConsoleLog(() => {
    PlatformOrchestrationKit_printInstallPhaseResult({
      completedSteps: [{ label: "done", detail: "detail" }],
      failedSteps: [{ label: "failed" }],
      notes: ["note", ""],
      phaseCount: 8,
      phaseNumber: 2,
      resultDivider: "---",
      status: "FAILED",
      title: "Dependency Install",
    });
  });

  assert.deepEqual(output, [
    "",
    "---",
    "PHASE 2/8 RESULT · FAILED · Dependency Install",
    "---",
    "Completed in this phase:",
    "  - done",
    "    detail",
    "",
    "Failed in this phase:",
    "  - failed",
    "",
    "Notes:",
    "  note",
    "",
    "",
  ]);
});

test("PlatformOrchestrationKit_shellQuoteForInstallDisplay preserves shell-hostile characters", () => {
  assert.equal(
    PlatformOrchestrationKit_shellQuoteForInstallDisplay(
      '/tmp/demo path/"quoted"',
    ),
    '"/tmp/demo path/\\"quoted\\""',
  );
});
