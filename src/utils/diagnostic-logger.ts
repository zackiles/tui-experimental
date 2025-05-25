// Diagnostic Logger for TUI Framework Debug Information

export interface LogEntry {
  timestamp: string
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'
  component: string
  message: string
  data?: unknown
}

class DiagnosticLogger {
  private logFiles: {
    out: string
    err: string
    all: string
  }
  private isEnabled = false

  constructor() {
    // Create log files with daily rotation (YYYY-MM-DD format)
    const date = new Date().toISOString().split('T')[0] // Gets YYYY-MM-DD
    this.logFiles = {
      out: `logs/tui-debug-${date}-out.log`, // DEBUG, INFO only
      err: `logs/tui-debug-${date}-err.log`, // WARN, ERROR only
      all: `logs/tui-debug-${date}-all.log`, // Everything
    }

    // Enable logging if DENO_ENV is not set or TUI_DEBUG is set
    this.isEnabled = !Deno.env.get('DENO_ENV') || !!Deno.env.get('TUI_DEBUG')

    if (this.isEnabled) {
      this.ensureLogDirectory()
      this.log('INFO', 'DiagnosticLogger', 'Diagnostic logging initialized', {
        logFiles: this.logFiles,
        pid: Deno.pid,
        platform: Deno.build.os,
        arch: Deno.build.arch,
      })
    }
  }

  private ensureLogDirectory(): void {
    try {
      Deno.mkdirSync('logs', { recursive: true })
    } catch (error) {
      if (!(error instanceof Deno.errors.AlreadyExists)) {
        console.warn('Failed to create logs directory:', error)
        this.isEnabled = false
      }
    }
  }

  log(level: LogEntry['level'], component: string, message: string, data?: unknown): void {
    if (!this.isEnabled) return

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      component,
      message,
      data,
    }

    try {
      const logLine = this.formatLogEntry(entry)

      // Always write to all.log
      Deno.writeTextFileSync(this.logFiles.all, logLine + '\n', { append: true })

      // Write to appropriate level-specific log
      if (level === 'DEBUG' || level === 'INFO') {
        Deno.writeTextFileSync(this.logFiles.out, logLine + '\n', { append: true })
      } else if (level === 'WARN' || level === 'ERROR') {
        Deno.writeTextFileSync(this.logFiles.err, logLine + '\n', { append: true })
      }

      // Also log to console if TUI_DEBUG_CONSOLE is set
      if (Deno.env.get('TUI_DEBUG_CONSOLE')) {
        console.log(`[${entry.level}] ${entry.component}: ${entry.message}`, entry.data || '')
      }
    } catch (error) {
      console.warn('Failed to write to log files:', error)
    }
  }

  debug(component: string, message: string, data?: unknown): void {
    this.log('DEBUG', component, message, data)
  }

  info(component: string, message: string, data?: unknown): void {
    this.log('INFO', component, message, data)
  }

  warn(component: string, message: string, data?: unknown): void {
    this.log('WARN', component, message, data)
  }

  error(component: string, message: string, data?: unknown): void {
    this.log('ERROR', component, message, data)
  }

  private formatLogEntry(entry: LogEntry): string {
    const dataStr = entry.data ? ` | ${JSON.stringify(entry.data)}` : ''
    return `${entry.timestamp} [${entry.level}] ${entry.component}: ${entry.message}${dataStr}`
  }

  // Log system info
  logSystemInfo(): void {
    if (!this.isEnabled) return

    try {
      const consoleSize = Deno.consoleSize?.()
      const env = {
        TERM: Deno.env.get('TERM'),
        COLORTERM: Deno.env.get('COLORTERM'),
        TERM_PROGRAM: Deno.env.get('TERM_PROGRAM'),
        TERM_PROGRAM_VERSION: Deno.env.get('TERM_PROGRAM_VERSION'),
        KITTY_WINDOW_ID: Deno.env.get('KITTY_WINDOW_ID'),
        SIXEL: Deno.env.get('SIXEL'),
      }

      this.info('SystemInfo', 'Terminal environment detected', {
        consoleSize,
        env,
        isTerminal: Deno.stdin.isTerminal(),
        denoVersion: Deno.version,
      })
    } catch (error) {
      this.error('SystemInfo', 'Failed to collect system info', error)
    }
  }

  // Log notcurses initialization attempt
  logNotcursesInit(success: boolean, error?: unknown): void {
    if (success) {
      this.info('Notcurses', 'Successfully initialized notcurses')
    } else {
      this.error('Notcurses', 'Failed to initialize notcurses', error)
    }
  }

  // Log rendering attempts
  logRenderAttempt(component: string, success: boolean, timing?: number, error?: unknown): void {
    if (success) {
      this.debug('Renderer', `${component} render successful`, { timing })
    } else {
      this.error('Renderer', `${component} render failed`, { error, timing })
    }
  }

  // Get current log file paths
  getLogFiles(): { out: string; err: string; all: string } {
    return this.logFiles
  }

  // Get all log files as array for compatibility
  getLogFile(): string {
    return this.logFiles.all
  }

  // Check if logging is enabled
  isLoggingEnabled(): boolean {
    return this.isEnabled
  }
}

// Export singleton instance
export const diagnosticLogger = new DiagnosticLogger()
