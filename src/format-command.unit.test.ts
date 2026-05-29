/**
 * @fileoverview Verifies human-readable npm and `npx tsx` command preview strings for platform
 * orchestration helpers.
 *
 * This file owns Node test coverage for `PlatformOrchestrationKit_formatNpmRunCommand`,
 * `PlatformOrchestrationKit_formatNpmRunPackageCommandLine`, `PlatformOrchestrationKit_formatNpmRunRootCommandLine`,
 * and `PlatformOrchestrationKit_formatNpxTsxCommandLine` quoting and flag placement.
 * Flow: call formatter -> assert exact preview string matches copy/paste expectations.
 *
 * @testing Node test (tsx): cd packages/platform-orchestration-kit && node ../../node_modules/tsx/dist/cli.mjs --test src/format-command.unit.test.ts
 *
 * @see packages/platform-orchestration-kit/src/format-command.ts - Preview formatters for `npm run` lines whose shell-quoting and `--prefix` behavior is asserted here.
 * @see packages/platform-orchestration-kit/src/spawn-npx-tsx.ts - Defines `PlatformOrchestrationKit_formatNpxTsxCommandLine` alongside streamed `npx tsx` spawn helpers exercised by this preview test.
 * @see docs/TYPESCRIPT_STANDARDS_DOCUMENTATION_FILE_OVERVIEWS.md - File-overview contract this test module header follows for verification and cross-reference discipline.
 * @documentation reviewed=2026-05-22 standard=FILE_OVERVIEW_STANDARDS_TYPESCRIPT@3
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  PlatformOrchestrationKit_formatNpmRunCommand,
  PlatformOrchestrationKit_formatNpmRunPackageCommandLine,
  PlatformOrchestrationKit_formatNpmRunRootCommandLine,
} from "./format-command.js";
import { PlatformOrchestrationKit_formatNpxTsxCommandLine } from "./spawn-npx-tsx.js";

describe("PlatformOrchestrationKit command formatting", () => {
  it("formats npm run previews", () => {
    assert.equal(
      PlatformOrchestrationKit_formatNpmRunCommand("build"),
      "npm run build",
    );
    assert.equal(
      PlatformOrchestrationKit_formatNpmRunCommand("test", [
        "--runTestsByPath",
        "a b.test.ts",
      ]),
      "npm run test -- --runTestsByPath 'a b.test.ts'",
    );
  });

  it("formats package and root npm previews", () => {
    assert.equal(
      PlatformOrchestrationKit_formatNpmRunPackageCommandLine(
        "packages/demo",
        "build",
      ),
      "npm run build --prefix packages/demo",
    );
    assert.equal(
      PlatformOrchestrationKit_formatNpmRunRootCommandLine("type-check", {
        silent: true,
      }),
      "npm run --silent type-check",
    );
  });

  it("formats npx tsx previews", () => {
    assert.equal(
      PlatformOrchestrationKit_formatNpxTsxCommandLine(
        "scripts/platform/commands/build-all.ts",
      ),
      "npx tsx scripts/platform/commands/build-all.ts",
    );
  });
});
