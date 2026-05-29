/**
 * @fileoverview Augments React JSX intrinsic elements with OpenTUI host tags (`box`, `scrollbox`,
 * `text`, `select`, `tab-select`) so package TSX renderers type-check against the terminal renderer.
 *
 * This file owns the local prop contracts mirrored into `global.JSX`, `react`, and
 * `react/jsx-runtime` so consumers do not depend on root launcher script typings.
 *
 * @example
 * ```typescript
 * import type { FC } from "react";
 *
 * export const PlatformOrchestrationKit_OpenTuiHostSnippet: FC = () => (
 *   <box style={{ flexDirection: "column", gap: 1 }}>
 *     <text bold>Ready</text>
 *   </box>
 * );
 * ```
 *
 * @testing CLI: npm run platform-orchestration-kit:type-check
 * @see packages/platform-orchestration-kit/src/opentui-app.tsx - OpenTUI TSX renderer that relies on these intrinsic names and prop shapes when composing launcher UI.
 * @see docs/TYPESCRIPT_STANDARDS_DOCUMENTATION_FILE_OVERVIEWS.md - File-overview contract governing this header block and verification tags.
 * @documentation reviewed=2026-05-23 standard=FILE_OVERVIEW_STANDARDS_TYPESCRIPT@3
 */

import type { Key, ReactNode } from "react";
import type { PlatformOrchestrationKit_OpenTuiSelectOption } from "./opentui-app.js";

type PlatformOrchestrationKit_OpenTuiFlexDirection = "column" | "row";

type PlatformOrchestrationKit_OpenTuiStyle = {
  flexDirection?: PlatformOrchestrationKit_OpenTuiFlexDirection;
  flexGrow?: number;
  gap?: number;
  maxHeight?: number;
  padding?: number;
  fg?: string;
};

type PlatformOrchestrationKit_OpenTuiContainerProps = {
  children?: ReactNode;
  key?: Key;
  style?: PlatformOrchestrationKit_OpenTuiStyle;
};

type PlatformOrchestrationKit_OpenTuiTextProps = {
  bold?: boolean;
  children?: ReactNode;
  key?: Key;
  style?: PlatformOrchestrationKit_OpenTuiStyle;
};

type PlatformOrchestrationKit_OpenTuiSelectProps = {
  key?: Key;
  onSelect?: (
    index: number,
    option: PlatformOrchestrationKit_OpenTuiSelectOption | undefined,
  ) => void;
  options: readonly PlatformOrchestrationKit_OpenTuiSelectOption[];
  showDescription?: boolean;
};

type PlatformOrchestrationKit_OpenTuiListSelectProps = {
  key?: Key;
  onChange?: (
    index: number,
    option: PlatformOrchestrationKit_OpenTuiSelectOption | undefined,
  ) => void;
  options: readonly PlatformOrchestrationKit_OpenTuiSelectOption[];
  selectedIndex?: number;
  showDescription?: boolean;
};

declare global {
  namespace JSX {
    interface IntrinsicElements {
      box: PlatformOrchestrationKit_OpenTuiContainerProps;
      scrollbox: PlatformOrchestrationKit_OpenTuiContainerProps;
      select: PlatformOrchestrationKit_OpenTuiListSelectProps;
      text: PlatformOrchestrationKit_OpenTuiTextProps;
      "tab-select": PlatformOrchestrationKit_OpenTuiSelectProps;
    }
  }
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      box: PlatformOrchestrationKit_OpenTuiContainerProps;
      scrollbox: PlatformOrchestrationKit_OpenTuiContainerProps;
      select: PlatformOrchestrationKit_OpenTuiListSelectProps;
      text: PlatformOrchestrationKit_OpenTuiTextProps;
      "tab-select": PlatformOrchestrationKit_OpenTuiSelectProps;
    }
  }
}

declare module "react/jsx-runtime" {
  namespace JSX {
    interface IntrinsicElements {
      box: PlatformOrchestrationKit_OpenTuiContainerProps;
      scrollbox: PlatformOrchestrationKit_OpenTuiContainerProps;
      select: PlatformOrchestrationKit_OpenTuiListSelectProps;
      text: PlatformOrchestrationKit_OpenTuiTextProps;
      "tab-select": PlatformOrchestrationKit_OpenTuiSelectProps;
    }
  }
}

export {};
