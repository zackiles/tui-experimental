// Debug test to verify the TUI framework is working
/// <reference path="../src/jsx/jsx-runtime.ts" />

import { runApp, Text } from '../src/main.ts'
import { diagnosticLogger } from '../src/utils/diagnostic-logger.ts'

function App() {
  const termSize = Deno.consoleSize?.() || { columns: 80, rows: 24 }
  
  return (
    <div>
      <Text color="green" x={0} y={0}>TUI WORKING!</Text>
      <Text color="yellow" x={0} y={1}>Size: {`${termSize.columns}x${termSize.rows}`}</Text>
      <Text color="cyan" x={0} y={2}>Press 'q' to exit</Text>
    </div>
  )
}

if (import.meta.main) {
  diagnosticLogger.info('DebugTest', 'Starting TUI debug test...')
  await runApp(App, {})
  diagnosticLogger.info('DebugTest', 'TUI debug test finished.')
} 
