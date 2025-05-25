// Minimal demo using only core runtime

import { TUIRuntime } from '../src/core/runtime.ts'
import type { TerminalNode } from '../src/core/types.ts'
import { diagnosticLogger } from '../src/utils/diagnostic-logger.ts'

const simpleComponent = (): TerminalNode => ({
  type: 'text',
  props: {
    children: 'Hello from TUI Framework!',
  },
  children: [],
})

async function main() {
  diagnosticLogger.info('MinimalDemo', 'Starting minimal TUI demo...')
  
  const runtime = new TUIRuntime()
  
  try {
    diagnosticLogger.info('MinimalDemo', 'Initializing runtime...')
    await runtime.initialize()
    
    diagnosticLogger.info('MinimalDemo', 'Runtime initialized successfully!')
    
    // Run for 2 seconds then exit
    setTimeout(async () => {
      diagnosticLogger.info('MinimalDemo', 'Shutting down...')
      await runtime.shutdown()
      Deno.exit(0)
    }, 2000)
    
    await runtime.run(simpleComponent, {})
    
  } catch (error) {
    diagnosticLogger.error('MinimalDemo', 'Demo failed:', error)
    await runtime.shutdown()
    Deno.exit(1)
  }
}

if (import.meta.main) {
  await main()
} 
