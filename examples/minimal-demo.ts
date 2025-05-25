// Minimal demo using only core runtime

import { TUIRuntime } from '../src/core/runtime.ts'
import type { TerminalNode } from '../src/core/types.ts'

const simpleComponent = (): TerminalNode => ({
  type: 'text',
  props: {
    children: 'Hello from TUI Framework!',
  },
  children: [],
})

async function main() {
  console.log('Starting minimal TUI demo...')
  
  const runtime = new TUIRuntime()
  
  try {
    console.log('Initializing runtime...')
    await runtime.initialize()
    
    console.log('Runtime initialized successfully!')
    
    // Run for 2 seconds then exit
    setTimeout(async () => {
      console.log('Shutting down...')
      await runtime.shutdown()
      Deno.exit(0)
    }, 2000)
    
    await runtime.run(simpleComponent, {})
    
  } catch (error) {
    console.error('Demo failed:', error)
    await runtime.shutdown()
    Deno.exit(1)
  }
}

if (import.meta.main) {
  await main()
} 