/**
 * @fileoverview Verifies static Ink rendering for the platform orchestration maintainer menu shell.
 *
 * This file owns regression coverage that `PlatformOrchestrationKitMaintainerInkApp` emits expected
 * menu labels when rendered through `ink` with a minimal wrapper fixture.
 * Flow: render component to string -> assert key menu copy substrings.
 *
 * @example
 * ```typescript
 * it("renders the maintainer menu copy", async () => {
 *   const output = await renderToString(
 *     React.createElement(PlatformOrchestrationKitMaintainerInkApp, {
 *       projectRoot: process.cwd(),
 *       wrappers,
 *     }),
 *   );
 *   assert.match(output, /Menu/);
 * });
 * ```
 *
 * @testing Node.js test runner unit: cd packages/platform-orchestration-kit && node ../../node_modules/tsx/dist/cli.mjs --test src/maintainer-ink-app.unit.test.ts
 *
 * @see packages/platform-orchestration-kit/src/maintainer-ink-app.tsx - Ink maintainer shell implementation whose rendered menu copy and diagnostics framing are asserted here.
 * @see packages/platform-orchestration-kit/package.json - Declares the package test npm script that runs all src unit tests via tsx and the Node.js test runner (glob is defined in that manifest).
 * @see docs/TYPESCRIPT_STANDARDS_DOCUMENTATION_FILE_OVERVIEWS.md - Defines the file-overview tag order and documentation metadata line enforced by the repo scanner.
 * @documentation reviewed=2026-05-23 standard=FILE_OVERVIEW_STANDARDS_TYPESCRIPT@3
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { renderToString } from "ink";
import React from "react";

import { PlatformOrchestrationKitMaintainerInkApp } from "./maintainer-ink-app.js";

const wrappers = [
  {
    description: "Build every configured workspace package.",
    npmScript: "build",
    scriptPath: "tooling/build-all.ts",
  },
] as const;

describe("PlatformOrchestrationKitMaintainerInkApp", () => {
  it("renders the maintainer menu copy", async () => {
    const output = await renderToString(
      React.createElement(PlatformOrchestrationKitMaintainerInkApp, {
        projectRoot: process.cwd(),
        wrappers,
      }),
    );

    assert.match(output, /Menu/);
    assert.match(output, /Diagnostics overview/);
    assert.match(output, /Run wrapper/);
  });
});
