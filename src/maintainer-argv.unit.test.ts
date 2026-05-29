/**
 * @fileoverview Verifies maintainer argv parsing and help text for platform orchestration CLIs.
 *
 * This file owns Node test coverage for `PlatformOrchestrationKit_parseMaintainerArgv` and
 * `PlatformOrchestrationKit_getMaintainerHelpText`, including `--help` precedence over `--json` and
 * `--project-root` passthrough into the parsed result.
 * Flow: build argv arrays -> assert parsed discriminant and fields -> assert help text mentions flags.
 *
 * @testing Node test (tsx): cd packages/platform-orchestration-kit && node ../../node_modules/tsx/dist/cli.mjs --test src/maintainer-argv.unit.test.ts
 *
 * @see packages/platform-orchestration-kit/src/maintainer-argv.ts - Maintainer argv parser and help renderer whose flag precedence and output strings are asserted here.
 * @see scripts/platform-orchestration/lib/maintainer-argv.ts - Script-layer re-export that wires this kit contract into Ink and OpenTUI maintainer entrypoints consuming the same flags.
 * @see docs/TYPESCRIPT_STANDARDS_DOCUMENTATION_FILE_OVERVIEWS.md - File-overview standard this test module header follows for verification and cross-reference discipline.
 * @documentation reviewed=2026-05-23 standard=FILE_OVERVIEW_STANDARDS_TYPESCRIPT@3
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  PlatformOrchestrationKit_getMaintainerHelpText,
  PlatformOrchestrationKit_parseMaintainerArgv,
} from "./maintainer-argv.js";

describe("PlatformOrchestrationKit maintainer argv", () => {
  it("parses JSON mode and project root", () => {
    assert.deepEqual(PlatformOrchestrationKit_parseMaintainerArgv(["--json", "--project-root", "/tmp/r"]), {
      kind: "json",
      projectRoot: "/tmp/r",
    });
  });

  it("lets help win over JSON", () => {
    assert.deepEqual(PlatformOrchestrationKit_parseMaintainerArgv(["--json", "--help"]), {
      kind: "help",
    });
  });

  it("renders help text with JSON and project-root flags", () => {
    const help = PlatformOrchestrationKit_getMaintainerHelpText("npm run x --");
    assert.match(help, /--json/);
    assert.match(help, /--project-root/);
  });
});
