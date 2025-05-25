// Core framework types for the next-generation terminal UI framework

export interface TerminalNode {
  type: string
  props: Record<string, unknown>
  children: TerminalNode[]
  constraints?: Constraint[]
}

export interface TerminalRect {
  x: number
  y: number
  width: number
  height: number
}

export interface RenderContext {
  screen: TerminalScreen
  solver: ConstraintSolver
  capabilities: TerminalCapabilities
}

// TEA integration types
export interface AppState<Model> {
  model: Model
  commands: Command[]
  subscriptions: Subscription[]
}

export type UpdateFunction<Model, Message> = 
  (model: Model, message: Message) => [Model, Command[]]

export type ViewFunction<Model> = 
  (model: Model) => TerminalNode

// Constraint system types
export interface Constraint {
  expression: string
  strength?: ConstraintStrength
  variable?: string
}

export enum ConstraintStrength {
  Required = 'required',
  Strong = 'strong', 
  Medium = 'medium',
  Weak = 'weak'
}

// Terminal graphics and capabilities
export interface TerminalCapabilities {
  colors: {
    trueColor: boolean
    colorCount: number
  }
  graphics: {
    sixel: boolean
    kitty: boolean
    iterm2: boolean
  }
  input: {
    mouse: boolean
    touch: boolean
    kittyKeyboard: boolean
  }
  features: {
    alternateScreen: boolean
    bracketedPaste: boolean
    focusEvents: boolean
  }
}

export interface TerminalScreen {
  width: number
  height: number
  buffer: TerminalCell[][]
  alternateBuffer?: TerminalCell[][]
}

export interface TerminalCell {
  char: string
  foreground?: Color
  background?: Color
  style?: TextStyle
}

export interface Color {
  r: number
  g: number
  b: number
  a?: number
}

export interface TextStyle {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
}

// Input event types
export interface KeyEvent {
  key: string
  modifiers: string[]
  type: 'press' | 'release'
}

export interface MouseEvent {
  x: number
  y: number
  button: 'left' | 'right' | 'middle' | 'wheel-up' | 'wheel-down'
  modifiers: string[]
  type: 'press' | 'release' | 'drag' | 'move'
}

// TEA Command and Subscription base classes
export abstract class Command<Message = unknown> {
  abstract execute(): Promise<Message | null>
}

export abstract class Subscription<Message = unknown> {
  abstract subscribe(dispatch: (message: Message) => void): () => void
}

// Constraint solver interface
export interface ConstraintSolver {
  addVariable(name: string): void
  addConstraint(constraint: Constraint): void
  solve(): Map<string, number>
  updateVariable(name: string, value: number): void
  removeConstraint(constraintId: string): void
}

// Component lifecycle
export type Component<Props = Record<string, unknown>> = (props: Props) => TerminalNode

export interface ComponentState {
  mounted: boolean
  rendered: boolean
  updateQueue: unknown[]
}

// Graphics context
export interface TerminalCanvas {
  setPixel(x: number, y: number, color: Color): void
  drawLine(x1: number, y1: number, x2: number, y2: number, color: Color): void
  drawRect(x: number, y: number, width: number, height: number, color: Color): void
  drawText(text: string, x: number, y: number, color: Color): void
  clear(): void
} 