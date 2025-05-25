// Main runtime and initialization for the TUI framework

import type {
  Component,
  RenderContext,
  TerminalCapabilities,
  TerminalNode,
  TerminalScreen,
} from './types.ts'
import { ANSI_CODES, DEFAULT_TERMINAL_HEIGHT, DEFAULT_TERMINAL_WIDTH } from './constants.ts'
import { diagnosticLogger } from '../utils/diagnostic-logger.ts'
import { notcurses } from '../graphics/notcurses-ffi.ts'
import { planeManager } from '../graphics/plane-manager.ts'

export class TUIRuntime {
  private context: RenderContext | null = null
  private rootComponent: (() => TerminalNode) | null = null
  private running = false
  private frameId = 0
  private signalHandlers: Record<string, (() => void) | undefined> = {}
  private usingNotcurses = false

  constructor() {
    this.setupSignalHandlers()
    diagnosticLogger.info('TUIRuntime', 'Runtime instance created')
  }

  async initialize(): Promise<void> {
    if (this.context) {
      throw new Error('Runtime already initialized')
    }

    diagnosticLogger.info('TUIRuntime', 'Starting initialization')
    diagnosticLogger.logSystemInfo()

    // Try to initialize notcurses first (temporarily disabled due to symbol issues)
    // this.usingNotcurses = await this.initializeGraphics()
    this.usingNotcurses = false

    // Initialize terminal capabilities detection
    const capabilities = await this.detectCapabilities()

    // Initialize screen buffer
    const screen = this.initializeScreen()

    // Initialize constraint solver (placeholder for now)
    const solver = {
      addVariable: () => {},
      addConstraint: () => {},
      solve: () => new Map(),
      updateVariable: () => {},
      removeConstraint: () => {},
    }

    this.context = {
      screen,
      solver,
      capabilities,
    }

    // Setup terminal for TUI mode
    await this.enterTUIMode()

    diagnosticLogger.info('TUIRuntime', 'Initialization complete', {
      usingNotcurses: this.usingNotcurses,
      screenSize: { width: screen.width, height: screen.height },
    })
  }

  async run<Props>(rootComponent: Component<Props>, props: Props): Promise<void> {
    if (!this.context) {
      await this.initialize()
    }

    this.rootComponent = () => rootComponent(props)
    this.running = true

    // Start the main render loop
    this.startRenderLoop()

    // Wait for termination
    await this.waitForTermination()
  }

  async shutdown(): Promise<void> {
    diagnosticLogger.info('TUIRuntime', 'Starting shutdown')
    this.running = false

    // Clean up graphics system
    if (this.usingNotcurses) {
      try {
        diagnosticLogger.info('Graphics', 'Cleaning up notcurses')
        planeManager.cleanup()
        notcurses.stop()
        diagnosticLogger.info('Graphics', 'Notcurses cleanup complete')
      } catch (error) {
        diagnosticLogger.error('Graphics', 'Error during notcurses cleanup', error)
      }
    }

    // Clean up signal handlers
    if (this.signalHandlers) {
      try {
        if (this.signalHandlers.SIGINT) {
          Deno.removeSignalListener('SIGINT', this.signalHandlers.SIGINT)
          this.signalHandlers.SIGINT = undefined
        }
        if (this.signalHandlers.SIGTERM) {
          Deno.removeSignalListener('SIGTERM', this.signalHandlers.SIGTERM)
          this.signalHandlers.SIGTERM = undefined
        }
        if (this.signalHandlers.SIGWINCH) {
          Deno.removeSignalListener('SIGWINCH' as Deno.Signal, this.signalHandlers.SIGWINCH)
          this.signalHandlers.SIGWINCH = undefined
        }
      } catch {
        // Ignore cleanup errors
      }
    }

    await this.exitTUIMode()
    this.context = null

    diagnosticLogger.info('TUIRuntime', 'Shutdown complete')
  }

  private async initializeGraphics(): Promise<boolean> {
    try {
      diagnosticLogger.info('Graphics', 'Attempting to initialize notcurses')

      // Check if notcurses is available
      if (!notcurses.isAvailable()) {
        diagnosticLogger.warn('Graphics', 'Notcurses FFI not available, falling back to ANSI mode')
        return false
      }

      // Initialize notcurses
      const success = await notcurses.init({
        flags: 0, // Default flags
        logLevel: 0, // No logging by default
      })

      if (success) {
        diagnosticLogger.logNotcursesInit(true)

        // Initialize plane manager
        const planeInitSuccess = planeManager.initialize()
        if (!planeInitSuccess) {
          diagnosticLogger.error('Graphics', 'Failed to initialize plane manager')
          return false
        }

        diagnosticLogger.info('Graphics', 'Graphics system initialized successfully')
        return true
      } else {
        diagnosticLogger.logNotcursesInit(false, 'Initialization returned false')
        return false
      }
    } catch (error) {
      diagnosticLogger.logNotcursesInit(false, error)
      return false
    }
  }

  private async detectCapabilities(): Promise<TerminalCapabilities> {
    diagnosticLogger.debug('TUIRuntime', 'Detecting terminal capabilities')

    // Basic capability detection - will be enhanced in Phase 6
    const capabilities = {
      colors: {
        trueColor: true, // Assume modern terminal for now
        colorCount: 16777216,
      },
      graphics: {
        sixel: false, // Will detect in graphics phase
        kitty: false,
        iterm2: false,
      },
      input: {
        mouse: true,
        touch: false,
        kittyKeyboard: false,
      },
      features: {
        alternateScreen: true,
        bracketedPaste: true,
        focusEvents: false,
      },
    }

    diagnosticLogger.debug('TUIRuntime', 'Terminal capabilities detected', capabilities)
    return capabilities
  }

  private initializeScreen(): TerminalScreen {
    const width = Deno.consoleSize?.()?.columns ?? DEFAULT_TERMINAL_WIDTH
    const height = Deno.consoleSize?.()?.rows ?? DEFAULT_TERMINAL_HEIGHT

    // Initialize empty screen buffer
    const buffer = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => ({
        char: ' ',
        foreground: { r: 255, g: 255, b: 255 },
        background: { r: 0, g: 0, b: 0 },
      })))

    return {
      width,
      height,
      buffer,
    }
  }

  private async enterTUIMode(): Promise<void> {
    diagnosticLogger.info('TUIRuntime', 'Entering TUI mode')

    // Check if we have a proper TTY
    if (!Deno.stdin.isTerminal()) {
      const error =
        'TUI applications require a terminal (TTY). Cannot run with piped input or in non-interactive environments.'
      diagnosticLogger.error('TUIRuntime', error)
      throw new Error(error)
    }

    try {
      // Only set terminal modes if not using notcurses (notcurses handles this internally)
      if (!this.usingNotcurses) {
        diagnosticLogger.debug('TUIRuntime', 'Setting up ANSI terminal mode')

        // Enable alternate screen and hide cursor
        await this.writeToTerminal(ANSI_CODES.ALTERNATE_SCREEN_ENTER)
        await this.writeToTerminal(ANSI_CODES.CURSOR_HIDE)
        await this.writeToTerminal(ANSI_CODES.MOUSE_ENABLE)
        await this.writeToTerminal(ANSI_CODES.BRACKETED_PASTE_ENABLE)
      } else {
        diagnosticLogger.debug('TUIRuntime', 'Using notcurses terminal mode (no ANSI setup needed)')
      }

      // Enable raw mode for input
      try {
        Deno.stdin.setRaw(true)
        diagnosticLogger.info('TUIRuntime', 'Raw mode enabled successfully')
      } catch (error) {
        // Restore terminal state if raw mode fails
        if (!this.usingNotcurses) {
          await this.writeToTerminal(ANSI_CODES.CURSOR_SHOW)
          await this.writeToTerminal(ANSI_CODES.ALTERNATE_SCREEN_EXIT)
        }
        const errorMsg = `Failed to enter raw terminal mode: ${
          String(error)
        }. TUI applications need direct terminal access.`
        diagnosticLogger.error('TUIRuntime', errorMsg)
        throw new Error(errorMsg)
      }
    } catch (error) {
      diagnosticLogger.error('TUIRuntime', 'Failed to enter TUI mode', error)
      throw error
    }
  }

  private async exitTUIMode(): Promise<void> {
    diagnosticLogger.info('TUIRuntime', 'Exiting TUI mode')

    // Restore terminal state
    try {
      if (Deno.stdin.isTerminal()) {
        Deno.stdin.setRaw(false)
        diagnosticLogger.debug('TUIRuntime', 'Raw mode disabled')
      }
    } catch (error) {
      diagnosticLogger.warn('TUIRuntime', 'Error disabling raw mode', error)
    }

    // Only restore ANSI modes if we're not using notcurses
    if (!this.usingNotcurses) {
      try {
        diagnosticLogger.debug('TUIRuntime', 'Restoring ANSI terminal state')
        await this.writeToTerminal(ANSI_CODES.BRACKETED_PASTE_DISABLE)
        await this.writeToTerminal(ANSI_CODES.MOUSE_DISABLE)
        await this.writeToTerminal(ANSI_CODES.CURSOR_SHOW)
        await this.writeToTerminal(ANSI_CODES.ALTERNATE_SCREEN_EXIT)
      } catch (error) {
        diagnosticLogger.warn('TUIRuntime', 'Error restoring terminal state', error)
      }
    } else {
      diagnosticLogger.debug('TUIRuntime', 'Notcurses handles terminal state restoration')
    }
  }

  private async writeToTerminal(data: string): Promise<void> {
    const encoder = new TextEncoder()
    // Use synchronous write for immediate output to avoid buffering
    Deno.stdout.writeSync(encoder.encode(data))
  }

  private startRenderLoop(): void {
    diagnosticLogger.info('TUIRuntime', 'Starting render loop')

    const renderFrame = async () => {
      diagnosticLogger.debug(
        'RenderLoop',
        `renderFrame called - running: ${this.running}, context: ${!!this
          .context}, rootComponent: ${!!this.rootComponent}`,
      )

      if (!this.running || !this.context || !this.rootComponent) {
        diagnosticLogger.warn('RenderLoop', 'Skipping frame - missing requirements')
        return
      }

      try {
        // Render the component tree
        diagnosticLogger.debug('RenderLoop', 'Calling rootComponent()')
        const vdom = this.rootComponent()
        diagnosticLogger.debug('RenderLoop', 'Got VDOM, calling renderToScreen', { vdom })
        await this.renderToScreen(vdom)
        this.frameId++

        // Log frame info occasionally for debugging
        if (this.frameId % 60 === 0) { // Every second at 60fps
          diagnosticLogger.debug('RenderLoop', `Rendered frame ${this.frameId}`)
        }
      } catch (error) {
        diagnosticLogger.error('RenderLoop', 'Render error', error)
      }

      if (this.running) {
        setTimeout(renderFrame, 16) // ~60 FPS
      }
    }

    diagnosticLogger.debug('RenderLoop', 'Calling initial renderFrame')
    renderFrame()
  }

  private async renderToScreen(node: TerminalNode): Promise<void> {
    if (!this.context) return

    const startTime = performance.now()

    try {
      if (this.usingNotcurses) {
        await this.renderWithNotcurses(node)
      } else {
        await this.renderWithANSI(node)
      }

      const renderTime = performance.now() - startTime
      diagnosticLogger.logRenderAttempt(
        this.usingNotcurses ? 'Notcurses' : 'ANSI',
        true,
        renderTime,
      )
    } catch (error) {
      const renderTime = performance.now() - startTime
      diagnosticLogger.logRenderAttempt(
        this.usingNotcurses ? 'Notcurses' : 'ANSI',
        false,
        renderTime,
        error,
      )
    }
  }

  private async renderWithNotcurses(node: TerminalNode): Promise<void> {
    // Clear the standard plane
    const stdPlane = notcurses.getStandardPlane()
    if (!stdPlane) {
      throw new Error('No standard plane available')
    }

    notcurses.clearPlane(stdPlane)

    // Render the node tree using notcurses
    await this.renderNodeWithNotcurses(node, stdPlane, 0, 0)

    // Render to screen
    const renderSuccess = notcurses.render()
    if (!renderSuccess) {
      diagnosticLogger.error('Notcurses', 'Failed to render to screen')
    }
  }

  private async renderWithANSI(node: TerminalNode): Promise<void> {
    // Debug: Log what we're trying to render
    diagnosticLogger.debug('RenderANSI', 'renderWithANSI called', {
      node: JSON.stringify(node, null, 2),
    })

    // Clear screen for now (inefficient, will optimize later)
    await this.writeToTerminal(ANSI_CODES.CLEAR_SCREEN + ANSI_CODES.CURSOR_HOME)

    diagnosticLogger.debug('RenderANSI', 'Screen cleared, starting node rendering')

    // Render node tree (placeholder implementation)
    await this.renderNodeWithANSI(node, 0, 0)

    diagnosticLogger.debug('RenderANSI', 'Node rendering complete')
  }

  private async renderNodeWithNotcurses(
    node: TerminalNode,
    plane: Deno.PointerValue,
    x: number,
    y: number,
  ): Promise<void> {
    // Enhanced node rendering with notcurses
    if (node.type === 'text' && typeof node.props.children === 'string') {
      // Set color if specified
      if (node.props.color && typeof node.props.color === 'string') {
        const color = this.parseColor(node.props.color)
        if (color) {
          notcurses.setForegroundColor(plane, color.r, color.g, color.b)
        }
      }

      // Put text at position
      const success = notcurses.putText(plane, y, x, node.props.children)
      if (!success) {
        diagnosticLogger.warn(
          'Notcurses',
          `Failed to put text: "${node.props.children}" at ${x},${y}`,
        )
      }
    }

    // Render children with proper positioning
    let currentY = y
    for (const child of node.children) {
      // Use child positioning if specified with proper type checking
      const childX = (typeof child.props.x === 'number') ? child.props.x : x
      const childY = (typeof child.props.y === 'number') ? child.props.y : currentY

      await this.renderNodeWithNotcurses(child, plane, childX, childY)

      // Increment Y for next child if no explicit positioning
      if (typeof child.props.y !== 'number') {
        currentY++
      }
    }
  }

  private async renderNodeWithANSI(node: TerminalNode, x: number, y: number): Promise<void> {
    diagnosticLogger.debug(
      'RenderANSI',
      `renderNodeWithANSI - type: ${node.type}, x: ${x}, y: ${y}`,
      { props: node.props },
    )

    // Very basic node rendering with ANSI
    if (node.type === 'text' && typeof node.props.children === 'string') {
      diagnosticLogger.debug('RenderANSI', `Rendering text "${node.props.children}" at ${x},${y}`)

      // Handle color
      let colorCode = ''
      if (node.props.color && typeof node.props.color === 'string') {
        colorCode = this.getANSIColorCode(node.props.color)
        diagnosticLogger.debug('RenderANSI', `Using color code: ${colorCode}`)
      }

      const ansiSequence = `${colorCode}\x1b[${y + 1};${x + 1}H${node.props.children}\x1b[0m`
      diagnosticLogger.debug('RenderANSI', `Writing ANSI sequence: ${JSON.stringify(ansiSequence)}`)

      await this.writeToTerminal(ansiSequence)

      diagnosticLogger.debug('RenderANSI', `Text written to terminal`)
    } else {
      diagnosticLogger.debug('RenderANSI', `Not a text node or invalid children type`)
    }

    // Render children (simplified)
    let currentY = y
    for (const child of node.children) {
      const childX = (typeof child.props.x === 'number') ? child.props.x : x
      const childY = (typeof child.props.y === 'number') ? child.props.y : currentY

      await this.renderNodeWithANSI(child, childX, childY)

      if (typeof child.props.y !== 'number') {
        currentY++
      }
    }
  }

  // Helper methods for color handling
  private parseColor(color: string): { r: number; g: number; b: number } | null {
    // Simple color parsing - will be enhanced later
    const colorMap: Record<string, { r: number; g: number; b: number }> = {
      'black': { r: 0, g: 0, b: 0 },
      'red': { r: 255, g: 0, b: 0 },
      'green': { r: 0, g: 255, b: 0 },
      'yellow': { r: 255, g: 255, b: 0 },
      'blue': { r: 0, g: 0, b: 255 },
      'magenta': { r: 255, g: 0, b: 255 },
      'cyan': { r: 0, g: 255, b: 255 },
      'white': { r: 255, g: 255, b: 255 },
    }

    const normalizedColor = color.toLowerCase()
    return colorMap[normalizedColor] || null
  }

  private getANSIColorCode(color: string): string {
    // Basic ANSI color codes
    const colorMap: Record<string, string> = {
      'black': '\x1b[30m',
      'red': '\x1b[31m',
      'green': '\x1b[32m',
      'yellow': '\x1b[33m',
      'blue': '\x1b[34m',
      'magenta': '\x1b[35m',
      'cyan': '\x1b[36m',
      'white': '\x1b[37m',
    }

    const normalizedColor = color.toLowerCase()
    return colorMap[normalizedColor] || ''
  }

  private setupSignalHandlers(): void {
    const shutdown = () => {
      this.running = false
      this.shutdown().then(() => Deno.exit(0)).catch(() => Deno.exit(1))
    }

    const handleResize = () => {
      // Handle resize - will implement in later phases
    }

    // Handle Ctrl+C and other termination signals
    try {
      Deno.addSignalListener('SIGINT', shutdown)
      Deno.addSignalListener('SIGTERM', shutdown)

      // Store handlers for cleanup
      this.signalHandlers = {
        SIGINT: shutdown,
        SIGTERM: shutdown,
      }
    } catch (error) {
      diagnosticLogger.warn('TUIRuntime', 'Could not set up signal handlers', error)
    }

    // Handle window resize (if supported)
    try {
      if (typeof Deno.addSignalListener === 'function') {
        Deno.addSignalListener('SIGWINCH' as Deno.Signal, handleResize)
        this.signalHandlers.SIGWINCH = handleResize
      }
    } catch {
      // SIGWINCH not supported on this platform
    }
  }

  private async waitForTermination(): Promise<void> {
    return new Promise<void>((resolve) => {
      // TEMPORARILY DISABLE INPUT HANDLER FOR DEBUGGING
      // this.startInputHandler(resolve)

      // Auto-exit after 3 seconds for testing
      setTimeout(() => {
        diagnosticLogger.info('TUIRuntime', 'Auto-exiting for debug...')
        this.running = false
        resolve()
      }, 3000)

      // Also poll for running state changes
      const pollForExit = () => {
        if (!this.running) {
          resolve()
        } else {
          setTimeout(pollForExit, 50)
        }
      }

      pollForExit()
    })
  }

  private startInputHandler(onExit: () => void): void {
    diagnosticLogger.info('TUIRuntime', 'Starting input handler')

    // Use stream-based input to avoid blocking the main thread
    const handleInput = async () => {
      try {
        const reader = Deno.stdin.readable.getReader()

        while (this.running) {
          // Use setTimeout to yield control and prevent blocking
          await new Promise((resolve) => setTimeout(resolve, 0))

          try {
            // Try to read with a timeout to avoid indefinite blocking
            const { value, done } = await Promise.race([
              reader.read(),
              new Promise<{ value: undefined; done: boolean }>((_, reject) =>
                setTimeout(() => reject(new Error('timeout')), 50)
              ),
            ])

            if (done) break
            if (!value) continue

            // Process each byte in the chunk
            for (const byte of value) {
              const char = String.fromCharCode(byte)

              // Log key presses for debugging (but not too often)
              if (Math.random() < 0.1) { // Log ~10% of keypresses
                diagnosticLogger.debug('Input', `Key pressed: ${char} (${byte})`)
              }

              // Check for quit characters
              if (char === 'q' || char === 'Q' || byte === 3) { // 3 is Ctrl+C
                diagnosticLogger.info('Input', `Exit key pressed: ${char}`)
                this.running = false
                reader.releaseLock()
                onExit()
                return
              }
            }
          } catch (error) {
            // Timeout or other error - continue the loop
            if (error instanceof Error && error.message === 'timeout') {
              continue
            }
            throw error
          }
        }

        reader.releaseLock()
      } catch (error) {
        if (this.running) {
          diagnosticLogger.error('Input', 'Input error', error)
          diagnosticLogger.error('TUIRuntime', 'Input error', error)
        }
      }
    }

    // Start input handling in background
    handleInput().catch((error) => {
      diagnosticLogger.error('Input', 'Input handler failed', error)
    })
  }

  // Method to verify if signal handlers are removed (for testing purposes)
  public areSignalHandlersRemoved(): boolean {
    return !this.signalHandlers.SIGINT && !this.signalHandlers.SIGTERM &&
      !this.signalHandlers.SIGWINCH
  }
}

// Convenience function to run a TUI app
export async function runApp<Props>(component: Component<Props>, props: Props): Promise<void> {
  const runtime = new TUIRuntime()
  try {
    await runtime.run(component, props)
  } finally {
    await runtime.shutdown()
  }
}
