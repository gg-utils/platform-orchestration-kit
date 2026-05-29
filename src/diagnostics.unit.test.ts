/**
 * @fileoverview Verifies platform orchestration diagnostics helpers for workspace package discovery,
 * per-package script availability, ordered preview targets, and JSON payload assembly.
 *
 * This file owns regression coverage for `packages/platform-orchestration-kit/src/diagnostics.ts`
 * helpers consumed by maintainer UIs and the platform orchestration CLI.
 * Flow: scaffold temp repo directories and `package.json` fixtures -> invoke builders -> assert
 * resolved package dirs, script presence flags, preview target ordering, and payload fields
 * including content-queue guard script existence.
 *
 * @testing Node.js test runner: cd packages/platform-orchestration-kit && node ../../node_modules/tsx/dist/cli.mjs --test src/diagnostics.unit.test.ts
 *
 * @see packages/platform-orchestration-kit/src/diagnostics.ts - Diagnostics module under test that resolves workspace packages, derives script presence maps, orders preview targets, and assembles maintainer JSON payloads asserted here.
 * @see scripts/platform-orchestration/print-diagnostics-json.mts - Root CLI entry that calls `PlatformOrchestrationKit_buildDiagnosticsPayload` using the same contract shape exercised by the payload assembly test here.
 * @see packages/platform-orchestration-kit/src/maintainer-ink-app.tsx - Ink maintainer UI that loads diagnostics payload fields whose workspace resolution and guard checks are validated here.
 * @documentation reviewed=2026-05-22 standard=FILE_OVERVIEW_STANDARDS_TYPESCRIPT@3
 */
import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  PlatformOrchestrationKit_buildDiagnosticsPayload,
  PlatformOrchestrationKit_buildPackageDiagnostics,
  PlatformOrchestrationKit_buildPackagePreviewTargets,
  PlatformOrchestrationKit_resolveWorkspacePackageDirs,
} from "./diagnostics.js";

const tempDirectories: string[] = [];

function createTempDir(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "platform-orchestration-kit-"));
  tempDirectories.push(dir);
  return dir;
}

function writeJson(filePath: string, value: unknown): void {
  writeFileSync(filePath, JSON.stringify(value), "utf8");
}

afterEach(() => {
  while (tempDirectories.length > 0) {
    const dir = tempDirectories.pop();
    if (dir !== undefined) {
      rmSync(dir, { force: true, recursive: true });
    }
  }
});

describe("PlatformOrchestrationKit diagnostics", () => {
  it("discovers workspace package directories", () => {
    const root = createTempDir();
    mkdirSync(path.join(root, "packages", "one"), { recursive: true });
    writeJson(path.join(root, "package.json"), { workspaces: ["packages/*"] });
    writeJson(path.join(root, "packages", "one", "package.json"), {
      name: "one",
      scripts: {},
    });

    assert.deepEqual(
      PlatformOrchestrationKit_resolveWorkspacePackageDirs(root),
      ["packages/one"],
    );
  });

  it("builds package diagnostics from explicit package dirs", () => {
    const root = createTempDir();
    mkdirSync(path.join(root, "pkg"), { recursive: true });
    writeJson(path.join(root, "pkg", "package.json"), {
      name: "pkg",
      scripts: {
        build: "tsc",
        lint: "eslint .",
        test: "node --test",
        "type-check": "tsc",
      },
    });

    const rows = PlatformOrchestrationKit_buildPackageDiagnostics({
      packageDirs: ["pkg"],
      repoRoot: root,
    });
    assert.equal(rows[0]?.hasPackageJson, true);
    assert.equal(rows[0]?.scripts.build, true);
    assert.equal(rows[0]?.scripts.test, "present");
    assert.equal(rows[0]?.scripts.typeCheck, "type-check");
  });

  it("builds ordered package preview targets", () => {
    const root = createTempDir();
    mkdirSync(path.join(root, "pkg"), { recursive: true });
    writeJson(path.join(root, "pkg", "package.json"), {
      name: "pkg",
      scripts: {
        build: "tsc",
        lint: "eslint .",
        test: "node --test",
        "type-check": "tsc",
      },
    });

    assert.deepEqual(
      PlatformOrchestrationKit_buildPackagePreviewTargets({
        packageDir: "pkg",
        repoRoot: root,
      }),
      [
        { label: "build", script: "build" },
        { label: "type-check", script: "type-check" },
        { label: "lint", script: "lint" },
        { label: "test", script: "test" },
      ],
    );
  });

  it("builds diagnostics payload from wrapper and guard config", () => {
    const root = createTempDir();
    mkdirSync(path.join(root, "scripts", "platform", "commands"), {
      recursive: true,
    });
    writeFileSync(
      path.join(
        root,
        "scripts",
        "platform",
        "commands",
        "content-queue-guards.ts",
      ),
      "",
      "utf8",
    );

    const payload = PlatformOrchestrationKit_buildDiagnosticsPayload({
      contentQueueGuardsPath:
        "scripts/platform/commands/content-queue-guards.ts",
      packageDirs: [],
      repoRoot: root,
      wrappers: [
        {
          description: "Build",
          npmScript: "build",
          scriptPath: "scripts/platform/commands/build-all.ts",
        },
      ],
    });

    assert.equal(payload.contentQueueGuardsScriptExists, true);
    assert.deepEqual(payload.wrappers, [
      {
        npmScript: "build",
        scriptPath: "scripts/platform/commands/build-all.ts",
      },
    ]);
  });
});
