// Comprehensive terminal cleanup utility
// Ensures terminal is properly restored after TUI applications exit

import { ANSI_CODES } from '../core/constants.ts'
import { diagnosticLogger } from './diagnostic-logger.ts'

export class TerminalCleanup {
  private static instance: TerminalCleanup | null = null
  private cleanupHandlers: (() => void | Promise<void>)[] = []
  private isCleaningUp = false
  private originalTerminalState: {
    rawMode: boolean
    alternateScreen: boolean
    mouseEnabled: boolean
    bracketedPaste: boolean
    focusTracking: boolean
  } | null = null

  private constructor() {
    this.setupGlobalCleanup()
  }

  static getInstance(): TerminalCleanup {
    if (!TerminalCleanup.instance) {
      TerminalCleanup.instance = new TerminalCleanup()
    }
    return TerminalCleanup.instance
  }

  // Record the original terminal state before any modifications
  recordOriginalState(): void {
    this.originalTerminalState = {
      rawMode: false, // Assume normal mode initially
      alternateScreen: false,
      mouseEnabled: false,
      bracketedPaste: false,
      focusTracking: false,
    }
    diagnosticLogger.debug('TerminalCleanup', 'Original terminal state recorded')
  }

  // Add a cleanup handler
  addCleanupHandler(handler: () => void | Promise<void>): void {
    this.cleanupHandlers.push(handler)
  }

  // Remove a cleanup handler
  removeCleanupHandler(handler: () => void | Promise<void>): void {
    const index = this.cleanupHandlers.indexOf(handler)
    if (index >= 0) {
      this.cleanupHandlers.splice(index, 1)
    }
  }

  // Perform comprehensive terminal cleanup
  async cleanup(): Promise<void> {
    if (this.isCleaningUp) return
    this.isCleaningUp = true

    diagnosticLogger.info('TerminalCleanup', 'Starting comprehensive terminal cleanup')

    try {
      // Run custom cleanup handlers first
      for (const handler of this.cleanupHandlers) {
        try {
          await handler()
        } catch (error) {
          diagnosticLogger.warn('TerminalCleanup', 'Error in cleanup handler', error)
        }
      }

      // Restore terminal to normal state
      await this.restoreTerminalState()

      diagnosticLogger.info('TerminalCleanup', 'Terminal cleanup completed successfully')
    } catch (error) {
      diagnosticLogger.error('TerminalCleanup', 'Error during terminal cleanup', error)
    } finally {
      this.isCleaningUp = false
    }
  }

  // Restore terminal to its original state
  private async restoreTerminalState(): Promise<void> {
    const encoder = new TextEncoder()

    try {
      // Disable raw mode first (most important)
      if (Deno.stdin.isTerminal()) {
        try {
          Deno.stdin.setRaw(false)
          diagnosticLogger.debug('TerminalCleanup', 'Raw mode disabled')
        } catch (error) {
          diagnosticLogger.warn('TerminalCleanup', 'Failed to disable raw mode', error)
        }
      }

      // Comprehensive terminal reset sequence
      const resetSequence = [
        // Reset all terminal modes and attributes
        '\x1b[!p', // Soft terminal reset
        '\x1b[?25h', // Show cursor
        '\x1b[?1000l', // Disable mouse tracking
        '\x1b[?1002l', // Disable button event mouse tracking
        '\x1b[?1003l', // Disable any motion mouse tracking
        '\x1b[?1006l', // Disable SGR mouse mode
        '\x1b[?2004l', // Disable bracketed paste
        '\x1b[?1004l', // Disable focus tracking
        '\x1b[?47l', // Exit alternate screen (old method)
        '\x1b[?1049l', // Exit alternate screen (new method)
        '\x1b[0m', // Reset all text attributes
        '\x1b[2J', // Clear entire screen
        '\x1b[H', // Move cursor to home position
      ].join('')

      // Write the reset sequence synchronously for immediate effect
      Deno.stdout.writeSync(encoder.encode(resetSequence))

      // Small delay to ensure terminal processes the reset
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Additional cleanup for specific terminal types
      await this.performTerminalSpecificCleanup()

      // Force a final flush and ensure cursor is visible
      await Deno.stdout.write(encoder.encode('\x1b[?25h'))

      // Final delay to ensure everything is processed
      await new Promise((resolve) => setTimeout(resolve, 10))

      diagnosticLogger.debug('TerminalCleanup', 'Terminal state restoration completed')
    } catch (error) {
      diagnosticLogger.error('TerminalCleanup', 'Error restoring terminal state', error)
    }
  }

  // Perform cleanup specific to certain terminal types
  private async performTerminalSpecificCleanup(): Promise<void> {
    const term = Deno.env.get('TERM') || ''
    const encoder = new TextEncoder()

    try {
      // Kitty terminal specific cleanup
      if (term.includes('kitty') || Deno.env.get('KITTY_WINDOW_ID')) {
        const kittyReset = '\x1b[<u' // Disable Kitty keyboard protocol
        Deno.stdout.writeSync(encoder.encode(kittyReset))
        diagnosticLogger.debug('TerminalCleanup', 'Kitty-specific cleanup performed')
      }

      // iTerm2 specific cleanup
      if (Deno.env.get('TERM_PROGRAM') === 'iTerm.app') {
        // iTerm2 specific reset sequences if needed
        diagnosticLogger.debug('TerminalCleanup', 'iTerm2-specific cleanup performed')
      }

      // Windows Terminal specific cleanup
      if (Deno.env.get('WT_SESSION')) {
        // Windows Terminal specific reset sequences if needed
        diagnosticLogger.debug('TerminalCleanup', 'Windows Terminal-specific cleanup performed')
      }
    } catch (error) {
      diagnosticLogger.warn('TerminalCleanup', 'Error in terminal-specific cleanup', error)
    }
  }

  // Setup global cleanup handlers for various exit scenarios
  private setupGlobalCleanup(): void {
    // Handle normal exit
    globalThis.addEventListener?.('beforeunload', () => {
      this.cleanup()
    })

    // Handle process signals
    try {
      Deno.addSignalListener('SIGINT', () => {
        diagnosticLogger.info('TerminalCleanup', 'SIGINT received, cleaning up terminal')
        this.cleanup().then(() => Deno.exit(130)) // 128 + 2 (SIGINT)
      })

      Deno.addSignalListener('SIGTERM', () => {
        diagnosticLogger.info('TerminalCleanup', 'SIGTERM received, cleaning up terminal')
        this.cleanup().then(() => Deno.exit(143)) // 128 + 15 (SIGTERM)
      })
    } catch (error) {
      diagnosticLogger.warn('TerminalCleanup', 'Could not set up signal handlers', error)
    }

    // Handle uncaught exceptions
    globalThis.addEventListener('error', (event) => {
      diagnosticLogger.error('TerminalCleanup', 'Uncaught error, cleaning up terminal', event.error)
      this.cleanup()
    })

    // Handle unhandled promise rejections
    globalThis.addEventListener('unhandledrejection', (event) => {
      diagnosticLogger.error(
        'TerminalCleanup',
        'Unhandled promise rejection, cleaning up terminal',
        event.reason,
      )
      this.cleanup()
    })
  }

  // Force immediate cleanup (for emergency situations)
  forceCleanup(): void {
    const encoder = new TextEncoder()

    try {
      // Disable raw mode first
      if (Deno.stdin.isTerminal()) {
        Deno.stdin.setRaw(false)
      }

      // Emergency terminal reset - synchronous only
      const emergencyReset = [
        '\x1b[!p', // Soft terminal reset
        '\x1b[?25h', // Show cursor
        '\x1b[?1000l', // Disable mouse tracking
        '\x1b[?1006l', // Disable SGR mouse mode
        '\x1b[?2004l', // Disable bracketed paste
        '\x1b[?1004l', // Disable focus tracking
        '\x1b[?1049l', // Exit alternate screen
        '\x1b[0m', // Reset all text attributes
        '\x1b[2J', // Clear entire screen
        '\x1b[H', // Move cursor to home position
        '\x1b[?25h', // Ensure cursor is visible (repeat)
      ].join('')

      Deno.stdout.writeSync(encoder.encode(emergencyReset))
    } catch {
      // Ignore errors in emergency cleanup
    }
  }
}

// Export singleton instance
export const terminalCleanup = TerminalCleanup.getInstance()

// Convenience function for one-time cleanup
export async function cleanupTerminal(): Promise<void> {
  await terminalCleanup.cleanup()
}

// Emergency cleanup function
export function emergencyCleanupTerminal(): void {
  terminalCleanup.forceCleanup()
}
