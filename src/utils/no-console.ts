// Console hijacking utility for TUI applications
// Prevents invisible console output by failing fast with clear error messages
// Usage: import './utils/no-console.ts' (activates automatically)

const originalConsole = globalThis.console

const createConsoleError = (method: string, args: unknown[]) => {
  const error = new Error(
    `❌ FATAL: console.${method}() called in TUI mode! Output will be invisible.\n` +
      `Use diagnosticLogger.${method === 'log' ? 'info' : method}() instead.\n` +
      `Import from: src/utils/diagnostic-logger.ts\n` +
      `Logs written to: logs/ directory\n` +
      `Args: ${JSON.stringify(args)}\n` +
      `See .cursor/rules/no-console-in-tui.mdc for details.`,
  )
  originalConsole.error(error)
  Deno.exit(1)
}

// Hijack all console methods that produce output
globalThis.console = {
  ...originalConsole,
  log: (...args: unknown[]) => createConsoleError('log', args),
  debug: (...args: unknown[]) => createConsoleError('debug', args),
  info: (...args: unknown[]) => createConsoleError('info', args),
  warn: (...args: unknown[]) => createConsoleError('warn', args),
  error: (...args: unknown[]) => createConsoleError('error', args),
  trace: (...args: unknown[]) => createConsoleError('trace', args),
  // Keep timing and grouping methods as they might be useful for debugging
  // but they should still be avoided in production TUI apps
} as Console
