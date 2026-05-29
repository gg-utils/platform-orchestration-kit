/**
 * @fileoverview Verifies reusable workspace package-script orchestration helpers for npm wrapper
 * and maintainer tooling.
 *
 * This file owns regression coverage over synthetic workspace fixtures: workspace glob expansion,
 * per-package `package.json` script maps, placeholder test-script detection, type-check alias
 * resolution, and filtered package lists by script name.
 * Flow: scaffold temp repo with `package.json` fixtures -> call helpers -> assert discovery and
 * classification outputs.
 *
 * @example
 * ```typescript
 * test("resolves workspace package directories", () => {
 *   const packageDirs = PlatformOrchestrationKit_resolveWorkspacePackageDirs(root);
 *   assert.deepEqual(packageDirs, ["packages/one", "packages/two"]);
 * });
 * ```
 *
 * @testing Node test runner (tsx): cd packages/platform-orchestration-kit && node ../../node_modules/tsx/dist/cli.mjs --test src/package-orchestration.unit.test.ts
 * @testing Node test runner (tsx): cd packages/platform-orchestration-kit && npm run test
 *
 * @see packages/platform-orchestration-kit/src/package-orchestration.ts - Workspace package discovery, script map parsing, test-script classification, and type-check script resolution implemented and asserted here.
 * @see packages/platform-orchestration-kit/src/diagnostics.ts - Diagnostics payload assembly that must stay semantically aligned with the workspace and script-shape contracts exercised by these tests.
 * @see docs/TYPESCRIPT_STANDARDS_DOCUMENTATION_FILE_OVERVIEWS.md - Repository file-overview contract governing this header’s tag order and `@documentation` metadata.
 * @documentation reviewed=2026-05-23 standard=FILE_OVERVIEW_STANDARDS_TYPESCRIPT@3
 */

import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test, { afterEach } from "node:test";

import {
  PlatformOrchestrationKit_classifyTestScript,
  PlatformOrchestrationKit_getPackagesWithScript,
  PlatformOrchestrationKit_readPackageScripts,
  PlatformOrchestrationKit_resolveTypeCheckScript,
  PlatformOrchestrationKit_resolveWorkspacePackageDirs,
} from "./package-orchestration.js";

const tempDirs: string[] = [];

function createTempRoot(): string {
  const dir = mkdtempSync(
    path.join(tmpdir(), "platform-orchestration-package-"),
  );
  tempDirs.push(dir);
  return dir;
}

function writeJson(filePath: string, value: unknown): void {
  writeFileSync(filePath, JSON.stringify(value), "utf8");
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { force: true, recursive: true });
  }
});

test("PlatformOrchestrationKit package orchestration discovers scripts", () => {
  const root = createTempRoot();
  mkdirSync(path.join(root, "packages", "one"), { recursive: true });
  mkdirSync(path.join(root, "packages", "two"), { recursive: true });
  writeJson(path.join(root, "package.json"), { workspaces: ["packages/*"] });
  writeJson(path.join(root, "packages", "one", "package.json"), {
    scripts: { build: "tsc", test: "node --test", "type-check": "tsc" },
  });
  writeJson(path.join(root, "packages", "two", "package.json"), {
    scripts: {
      test: 'echo "Error: no test specified" && exit 1',
      "ts:check": "tsc",
    },
  });

  const packageDirs =
    PlatformOrchestrationKit_resolveWorkspacePackageDirs(root);

  assert.deepEqual(packageDirs, ["packages/one", "packages/two"]);
  assert.deepEqual(
    PlatformOrchestrationKit_readPackageScripts(root, "packages/one"),
    {
      build: "tsc",
      test: "node --test",
      "type-check": "tsc",
    },
  );
  assert.equal(
    PlatformOrchestrationKit_classifyTestScript(root, "packages/two"),
    "placeholder",
  );
  assert.equal(
    PlatformOrchestrationKit_resolveTypeCheckScript(root, "packages/two"),
    "ts:check",
  );
  assert.deepEqual(
    PlatformOrchestrationKit_getPackagesWithScript(root, packageDirs, "test", {
      excludeTestPlaceholder: true,
    }),
    [{ dir: "packages/one", script: "test" }],
  );
});
