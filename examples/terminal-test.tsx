// Terminal size test - works with small terminals
/// <reference path="../src/jsx/jsx-runtime.ts" />

import { runApp, Text } from '../src/main.ts'

function App() {
  const termSize = Deno.consoleSize?.() || { columns: 80, rows: 24 }
  
  return (
    <div>
      <Text color="green" x={0} y={0}>OK!</Text>
      <Text color="yellow" x={4} y={0}>{termSize.columns}x{termSize.rows}</Text>
      <Text color="cyan" x={0} y={1}>Press q</Text>
    </div>
  )
}

if (import.meta.main) {
  console.log('=== TUI FRAMEWORK TEST ===')
  console.log('If you see this message, the framework started successfully.')
  console.log('Resize your terminal to at least 80x24 for best results.')
  console.log('Press q to exit when ready.')
  console.log('')
  
  await runApp(App, {})
  
  console.log('')
  console.log('TUI test completed successfully!')
  console.log('Check logs/ directory for detailed diagnostic information.')
} 
