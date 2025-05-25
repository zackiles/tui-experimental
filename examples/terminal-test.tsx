// Terminal size test - works with small terminals
/// <reference path="../src/jsx/jsx-runtime.ts" />

import { runApp, Text } from '../src/main.ts'
import { diagnosticLogger } from '../src/utils/diagnostic-logger.ts'

function App() {
  const termSize = Deno.consoleSize?.() || { columns: 80, rows: 24 }
  
  return (
    <div>
      <Text color="green" x={0} y={0}>OK!</Text>
      <Text color="yellow" x={4} y={0}>{`${termSize.columns}x${termSize.rows}`}</Text>
      <Text color="cyan" x={0} y={1}>Press q</Text>
    </div>
  )
}

if (import.meta.main) {
  diagnosticLogger.info('TUITest', '=== TUI FRAMEWORK TEST ===')
  diagnosticLogger.info('TUITest', 'If you see this message, the framework started successfully.')
  diagnosticLogger.info('TUITest', 'Resize your terminal to at least 80x24 for best results.')
  diagnosticLogger.info('TUITest', 'Press q to exit when ready.')
  diagnosticLogger.info('TUITest', '')
  
  await runApp(App, {})
  
  diagnosticLogger.info('TUITest', '')
  diagnosticLogger.info('TUITest', 'TUI test completed successfully!')
  diagnosticLogger.info('TUITest', 'Check logs/ directory for detailed diagnostic information.')
} 
