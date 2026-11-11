/**
 * @fileoverview Verifies command catalog lookup and npm-script resolution for direct scripts and
 * deploy-target-mapped deploy commands.
 *
 * This file owns Node test coverage for `PlatformOrchestrationKit_findCommandById` and
 * `PlatformOrchestrationKit_resolveCommandNpmScript` using a small in-memory fixture catalog.
 * Flow: fixture definitions -> find by id -> resolve script (with or without deploy target) -> assert throws when deploy target is required but missing.
 *
 * @testing Node test (tsx): cd packages/platform-orchestration-kit && node ../../node_modules/tsx/dist/cli.mjs --test src/command-catalog.unit.test.ts
 *
 * @see packages/platform-orchestration-kit/src/command-catalog.ts - Shared catalog types and find/resolve helpers whose branching rules and error messages are asserted here.
 * @see scripts/platform/ui/lib/commands.ts - Platform UI command table that relies on the same resolution semantics when turning launcher selections into runnable npm scripts.
 * @see packages/platform-orchestration-kit/src/ink-app.tsx - Ink launcher surface that calls `PlatformOrchestrationKit_resolveCommandNpmScript` after menu-driven command selection.
 * @documentation reviewed=2026-05-22 standard=FILE_OVERVIEW_STANDARDS_TYPESCRIPT@3
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  PlatformOrchestrationKit_findCommandById,
  PlatformOrchestrationKit_resolveCommandNpmScript,
  type PlatformOrchestrationKit_CommandDefinition,
} from "./command-catalog.js";

const commands: readonly PlatformOrchestrationKit_CommandDefinition[] = [
  {
    category: "quality",
    description: "Run tests",
    id: "test",
    label: "Test",
    npmScript: "test",
    requiresDeployTarget: false,
    riskLevel: "normal",
  },
  {
    category: "deploy",
    deployScripts: [
      { npmScript: "deploy:staging", target: "staging" },
      { npmScript: "deploy:production", target: "production" },
    ],
    description: "Deploy",
    id: "deploy",
    label: "Deploy",
    npmScript: null,
    requiresDeployTarget: true,
    riskLevel: "high",
  },
];

void describe("PlatformOrchestrationKit command catalog", () => {
  void it("finds commands and resolves direct npm scripts", () => {
    const testCommand = PlatformOrchestrationKit_findCommandById({ commands, id: "test" });
    assert.equal(testCommand?.id, "test");
    assert.equal(
      testCommand ? PlatformOrchestrationKit_resolveCommandNpmScript({ command: testCommand }) : null,
      "test",
    );
  });

  void it("resolves deploy target mappings", () => {
    const deploy = PlatformOrchestrationKit_findCommandById({ commands, id: "deploy" });
    assert.equal(
      deploy
        ? PlatformOrchestrationKit_resolveCommandNpmScript({
            command: deploy,
            deployTarget: "staging",
          })
        : null,
      "deploy:staging",
    );
  });

  void it("requires deploy targets for deploy commands", () => {
    const deploy = PlatformOrchestrationKit_findCommandById({ commands, id: "deploy" });
    assert.throws(() => {
      if (deploy) {
        PlatformOrchestrationKit_resolveCommandNpmScript({ command: deploy, deployTarget: null });
      }
    }, /Deploy target/);
  });
});
