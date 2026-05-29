/**
 * @fileoverview Verifies shared argv parsing and help-text assembly for platform orchestration UI launchers.
 *
 * This file owns Node test coverage for `PlatformOrchestrationKit_parseUiLaunchOptions` flag handling
 * (`--project-root`, `--print-command`, `--help`) and for `PlatformOrchestrationKit_buildUiHelpText` output shape.
 * Flow: pass argv or help options -> assert parsed fields and help string contents.
 *
 * @testing Node test (tsx): cd packages/platform-orchestration-kit && node ../../node_modules/tsx/dist/cli.mjs --test src/ui-launcher.unit.test.ts
 *
 * @see packages/platform-orchestration-kit/src/ui-launcher.ts - Shared launcher parser and help builder whose CLI-facing contracts are asserted here.
 * @see packages/platform-orchestration-kit/src/index.ts - Package barrel that re-exports the ui-launcher helpers verified by this test module.
 * @see docs/TYPESCRIPT_STANDARDS_DOCUMENTATION_FILE_OVERVIEWS.md - File-overview contract this test module header follows for verification and cross-reference discipline.
 * @documentation reviewed=2026-05-23 standard=FILE_OVERVIEW_STANDARDS_TYPESCRIPT@3
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  PlatformOrchestrationKit_buildUiHelpText,
  PlatformOrchestrationKit_parseUiLaunchOptions,
} from "./ui-launcher.js";

describe("PlatformOrchestrationKit UI launcher", () => {
  it("parses project root, command previews, and help", () => {
    const parsed = PlatformOrchestrationKit_parseUiLaunchOptions([
      "--project-root",
      "/tmp/example",
      "--print-command",
      "build",
      "--help",
    ]);

    assert.equal(parsed.projectRoot, "/tmp/example");
    assert.equal(parsed.printCommandScript, "build");
    assert.equal(parsed.helpRequested, true);
  });

  it("builds adapter-owned help text", () => {
    const help = PlatformOrchestrationKit_buildUiHelpText({
      description: "Launcher",
      examples: ["npm run x"],
      programLabel: "npm run x --",
    });

    assert.match(help, /--project-root/);
    assert.match(help, /npm run x/);
  });
});
