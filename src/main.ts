// Main entry point for the next-generation TUI framework

// CRITICAL: Prevent invisible console output in TUI mode
import './utils/no-console.ts'

// Core exports
export { runApp, TUIRuntime } from './core/runtime.ts'
export type {
  AppState,
  Color,
  Component,
  ComponentState,
  Constraint,
  KeyEvent,
  MouseEvent,
  RenderContext,
  TerminalCanvas,
  TerminalCapabilities,
  TerminalCell,
  TerminalNode,
  TerminalRect,
  TerminalScreen,
  TextStyle,
  UpdateFunction,
  ViewFunction,
} from './core/types.ts'
export { Command, ConstraintStrength, Subscription } from './core/types.ts'

// Layout system
export { KiwiConstraintSolver } from './layout/cassowary.ts'

// JSX runtime
export {
  Fragment,
  jsx,
  jsxDEV,
  jsxs,
  TUI,
  useConstraints,
  useEffect,
  useState,
} from './jsx/jsx-runtime.ts'

// Widgets
export { Text } from './widgets/text.tsx'
export type { TextProps } from './widgets/text.tsx'

// Constants
export {
  ANSI_CODES,
  COLOR_FORMATS,
  DEFAULT_TERMINAL_HEIGHT,
  DEFAULT_TERMINAL_WIDTH,
  FRAMEWORK_NAME,
  GRAPHICS_PROTOCOLS,
  INPUT_TYPES,
  VERSION,
} from './core/constants.ts'

// Version info
export const version = '0.1.0'
export const name = 'TUI Framework'
