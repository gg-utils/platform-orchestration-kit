/**
 * @fileoverview Verifies the platform-orchestration interactive terminal menu rendering loop,
 * script dispatch from user selections, and invalid-input plus exit-alias handling.
 *
 * This file owns node:test regression coverage for a fake session transcript that exercises
 * `PlatformOrchestrationKit_printInteractiveMenu`, `PlatformOrchestrationKit_handleInteractiveMenuSelection`,
 * and `PlatformOrchestrationKit_runInteractiveMenu` without a real TTY.
 * Flow: configure menu -> render or run loop -> assert recorded session lines and script runner calls.
 *
 * @example
 * ```typescript
 * test("prints configured sections", () => {
 *   const session = new FakeSession();
 *   PlatformOrchestrationKit_printInteractiveMenu({ config, session });
 *   assert.equal(session.lines.includes("item:1:Diagnostics:Run diagnostics"), true);
 * });
 * ```
 *
 * @testing Node test unit: cd packages/platform-orchestration-kit && node ../../node_modules/tsx/dist/cli.mjs --test src/interactive-menu.unit.test.ts
 *
 * @see packages/platform-orchestration-kit/src/interactive-menu.ts - Reusable menu loop and session contract whose render, dispatch, and loop exit behavior is asserted here.
 * @see packages/platform-orchestration-kit/src/index.ts - Package barrel that re-exports the interactive menu helpers covered by these regression tests.
 * @documentation reviewed=2026-05-22 standard=FILE_OVERVIEW_STANDARDS_TYPESCRIPT@3
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  PlatformOrchestrationKit_handleInteractiveMenuSelection,
  PlatformOrchestrationKit_printInteractiveMenu,
  PlatformOrchestrationKit_runInteractiveMenu,
  type PlatformOrchestrationKit_InteractiveMenuConfig,
  type PlatformOrchestrationKit_InteractiveMenuSession,
} from "./interactive-menu.js";

class FakeSession implements PlatformOrchestrationKit_InteractiveMenuSession {
  readonly lines: string[] = [];
  private readonly answers: string[];

  constructor(answers: readonly string[] = []) {
    this.answers = Array.from(answers);
  }

  clearScreen(): void {
    this.lines.push("clear");
  }

  printError(text: string): void {
    this.lines.push(`error:${text}`);
  }

  printHeader(family: string, focus: string): void {
    this.lines.push(`header:${family}:${focus}`);
  }

  printKicker(text: string): void {
    this.lines.push(`kicker:${text}`);
  }

  printMenuItem(number: string | number, label: string, description: string): void {
    this.lines.push(`item:${number}:${label}:${description}`);
  }

  printPanelTitle(title: string, subtitle = ""): void {
    this.lines.push(`panel:${title}:${subtitle}`);
  }

  printSectionBreak(): void {
    this.lines.push("break");
  }

  printSuccess(text: string): void {
    this.lines.push(`success:${text}`);
  }

  async promptReadLine(promptText: string): Promise<string> {
    this.lines.push(`prompt:${promptText}`);
    return this.answers.shift() ?? "3";
  }

  writeLine(text = ""): void {
    this.lines.push(`line:${text}`);
  }
}

const config: PlatformOrchestrationKit_InteractiveMenuConfig = {
  exitItem: {
    aliases: ["q"],
    description: "Leave",
    exitMessage: "Leaving.",
    key: "3",
    kind: "exit",
    label: "Exit",
  },
  headerFamily: "ORCHESTRATION",
  headerFocus: "MAIN MENU",
  invalidSelectionMessage: "Choose a valid action.",
  panelSubtitle: "Maintainer console.",
  panelTitle: "Console",
  promptText: "Choose: ",
  sections: [
    {
      items: [
        {
          description: "Run diagnostics",
          key: "1",
          kind: "script",
          label: "Diagnostics",
          scriptName: "orchestration:test",
        },
      ],
      kicker: "  Diagnostics",
    },
    {
      items: [
        {
          description: "Run quality checks",
          key: "2",
          kind: "script",
          label: "Quality",
          scriptName: "quality",
        },
      ],
      kicker: "  Quality",
    },
  ],
};

test("PlatformOrchestrationKit_printInteractiveMenu renders configured sections", () => {
  const session = new FakeSession();

  PlatformOrchestrationKit_printInteractiveMenu({ config, session });

  assert.deepEqual(session.lines, [
    "clear",
    "header:ORCHESTRATION:MAIN MENU",
    "panel:Console:Maintainer console.",
    "kicker:  Diagnostics",
    "item:1:Diagnostics:Run diagnostics",
    "break",
    "kicker:  Quality",
    "item:2:Quality:Run quality checks",
    "break",
    "item:3:Exit:Leave",
    "line:",
  ]);
});

test("PlatformOrchestrationKit_handleInteractiveMenuSelection dispatches scripts", async () => {
  const session = new FakeSession();
  const runs: string[] = [];

  assert.equal(
    await PlatformOrchestrationKit_handleInteractiveMenuSelection({
      action: "1",
      config,
      cwd: "/repo",
      runScript: async (options) => {
        runs.push(`${options.cwd}:${options.scriptName}`);
      },
      session,
    }),
    "continue",
  );

  assert.deepEqual(runs, ["/repo:orchestration:test"]);
});

test(
  "PlatformOrchestrationKit_runInteractiveMenu handles invalid input and exit alias",
  async () => {
    const session = new FakeSession(["bad", "q"]);
    const runs: string[] = [];

    await PlatformOrchestrationKit_runInteractiveMenu({
      config,
      cwd: "/repo",
      runScript: async (options) => {
        runs.push(options.scriptName);
      },
      session,
    });

    assert.deepEqual(runs, []);
    assert.equal(session.lines.includes("error:Choose a valid action."), true);
    assert.equal(session.lines.includes("success:Leaving."), true);
  },
);
