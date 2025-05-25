// Custom JSX transformation runtime for the TUI framework

import type { TerminalNode } from '../core/types.ts'

export namespace JSX {
  export interface Element extends TerminalNode {}

  export interface IntrinsicElements {
    div: TerminalProps
    text: TextProps
    image: ImageProps
    canvas: CanvasProps
    input: InputProps
    box: BoxProps
    [key: string]: any
  }

  export interface ElementChildrenAttribute {
    children: {}
  }
}

// Base props for all terminal elements
interface TerminalProps {
  children?: JSX.Element | JSX.Element[] | string
  key?: string
  id?: string
  constraints?: string[]
}

// Specific component props
interface TextProps extends TerminalProps {
  children: string
  color?: string
  backgroundColor?: string
  style?: 'normal' | 'bold' | 'italic' | 'underline'
  wrap?: boolean
  align?: 'left' | 'center' | 'right'
}

interface ImageProps extends TerminalProps {
  src: string
  alt?: string
  width?: number | 'auto'
  height?: number | 'auto'
  fit?: 'contain' | 'cover' | 'fill' | 'scale-down'
}

interface CanvasProps extends TerminalProps {
  width: number
  height: number
  onDraw?: (ctx: any) => void
}

interface InputProps extends TerminalProps {
  value?: string
  placeholder?: string
  onChange?: (value: string) => void
  onEnter?: (value: string) => void
  type?: 'text' | 'password' | 'number'
}

interface BoxProps extends TerminalProps {
  border?: 'none' | 'single' | 'double' | 'rounded'
  padding?: number | [number, number] | [number, number, number, number]
  margin?: number | [number, number] | [number, number, number, number]
  backgroundColor?: string
}

// JSX factory functions
export function jsx(
  type: string | Function,
  props: Record<string, unknown> | null,
  key?: string,
): JSX.Element {
  // Normalize props
  const normalizedProps = props || {}
  if (key !== undefined) {
    normalizedProps.key = key
  }

  // Extract children from props
  const { children: rawChildren, ...otherProps } = normalizedProps
  const children = normalizeChildren(rawChildren)

  // Handle component functions
  if (typeof type === 'function') {
    return type({ ...otherProps, children })
  }

  // Create terminal node
  return {
    type,
    props: otherProps,
    children,
  }
}

export const jsxs = jsx
export const jsxDEV = jsx

// Helper function to normalize children
function normalizeChildren(children: unknown): TerminalNode[] {
  if (children === null || children === undefined) {
    return []
  }

  if (Array.isArray(children)) {
    return children.flatMap(normalizeChildren)
  }

  if (typeof children === 'string' || typeof children === 'number') {
    return [{
      type: 'text',
      props: { children: String(children) },
      children: [],
    }]
  }

  if (typeof children === 'object' && 'type' in children) {
    return [children as TerminalNode]
  }

  // Handle other types by converting to string
  return [{
    type: 'text',
    props: { children: String(children) },
    children: [],
  }]
}

// Fragment support
export function Fragment({ children }: { children: unknown }): JSX.Element {
  return {
    type: 'fragment',
    props: {},
    children: normalizeChildren(children),
  }
}

// Hook-like state management (simplified)
interface StateHook<T> {
  value: T
  setValue: (newValue: T | ((prev: T) => T)) => void
}

const stateHooks: StateHook<any>[] = []
let currentHookIndex = 0

export function useState<T>(initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const hookIndex = currentHookIndex++

  if (hookIndex >= stateHooks.length) {
    stateHooks.push({
      value: initialValue,
      setValue: (newValue: T | ((prev: T) => T)) => {
        const hook = stateHooks[hookIndex]
        if (typeof newValue === 'function') {
          hook.value = (newValue as (prev: T) => T)(hook.value)
        } else {
          hook.value = newValue
        }
        // Trigger re-render - will be implemented in runtime
        scheduleRerender()
      },
    })
  }

  const hook = stateHooks[hookIndex]
  return [hook.value, hook.setValue]
}

// Effect hook (simplified)
interface EffectHook {
  effect: () => void | (() => void)
  deps?: unknown[]
  cleanup?: () => void
}

const effectHooks: EffectHook[] = []

export function useEffect(effect: () => void | (() => void), deps?: unknown[]): void {
  const hookIndex = currentHookIndex++

  if (hookIndex >= effectHooks.length) {
    effectHooks.push({ effect, deps })
    // Run effect on first mount
    scheduleEffect(hookIndex)
  } else {
    const hook = effectHooks[hookIndex]
    const depsChanged = !deps || !hook.deps ||
      deps.length !== hook.deps.length ||
      deps.some((dep, i) => dep !== hook.deps![i])

    if (depsChanged) {
      hook.effect = effect
      hook.deps = deps
      scheduleEffect(hookIndex)
    }
  }
}

// Constraint builder hook
export function useConstraints(): ConstraintBuilder {
  return new ConstraintBuilder()
}

class ConstraintBuilder {
  private constraints: string[] = []

  equal(var1: string, var2: string): this {
    this.constraints.push(`${var1} == ${var2}`)
    return this
  }

  greaterEqual(variable: string, value: number): this {
    this.constraints.push(`${variable} >= ${value}`)
    return this
  }

  lessEqual(variable: string, value: number): this {
    this.constraints.push(`${variable} <= ${value}`)
    return this
  }

  ratio(var1: string, var2: string, ratio: number): this {
    this.constraints.push(`${var1} == ${var2} * ${ratio}`)
    return this
  }

  build(): string[] {
    return [...this.constraints]
  }
}

// Runtime integration hooks
let rerenderCallback: (() => void) | null = null
let effectCallback: ((hookIndex: number) => void) | null = null

export function setRerenderCallback(callback: () => void): void {
  rerenderCallback = callback
}

export function setEffectCallback(callback: (hookIndex: number) => void): void {
  effectCallback = callback
}

function scheduleRerender(): void {
  if (rerenderCallback) {
    // Reset hook index for next render
    currentHookIndex = 0
    rerenderCallback()
  }
}

function scheduleEffect(hookIndex: number): void {
  if (effectCallback) {
    effectCallback(hookIndex)
  }
}

// Reset hooks (called before each render)
export function resetHooks(): void {
  currentHookIndex = 0
}

// Execute effects
export function executeEffect(hookIndex: number): void {
  const hook = effectHooks[hookIndex]
  if (hook) {
    // Clean up previous effect
    if (hook.cleanup) {
      hook.cleanup()
    }

    // Run new effect
    const cleanup = hook.effect()
    if (typeof cleanup === 'function') {
      hook.cleanup = cleanup
    }
  }
}

// Built-in components
export const TUI = {
  Text: ({ children, ...props }: TextProps) => jsx('text', { children, ...props }),
  Box: ({ children, ...props }: BoxProps) => jsx('box', { children, ...props }),
  Image: ({ children, ...props }: ImageProps) => jsx('image', { children, ...props }),
  Canvas: ({ children, ...props }: CanvasProps) => jsx('canvas', { children, ...props }),
  Input: ({ children, ...props }: InputProps) => jsx('input', { children, ...props }),
}
