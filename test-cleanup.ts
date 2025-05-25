#!/usr/bin/env -S deno run -A

// Simple test script to verify terminal cleanup works
import { terminalCleanup } from './src/utils/terminal-cleanup.ts'

async function testTerminalCleanup() {
  console.log('🧪 Testing terminal cleanup...')
  
  // Record original state
  terminalCleanup.recordOriginalState()
  
  // Simulate entering TUI mode
  const encoder = new TextEncoder()
  
  console.log('📺 Entering alternate screen in 2 seconds...')
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  Deno.stdout.writeSync(encoder.encode('\x1b[?1049h')) // Enter alternate screen
  Deno.stdout.writeSync(encoder.encode('\x1b[?25l'))   // Hide cursor
  Deno.stdout.writeSync(encoder.encode('\x1b[2J'))     // Clear screen
  Deno.stdout.writeSync(encoder.encode('\x1b[H'))      // Home cursor
  
  // Write some test content
  Deno.stdout.writeSync(encoder.encode('🚀 TUI Mode Active - This should disappear after cleanup\n'))
  Deno.stdout.writeSync(encoder.encode('Cleanup will happen automatically in 3 seconds...'))
  
  // Wait 3 seconds instead of waiting for input
  await new Promise(resolve => setTimeout(resolve, 3000))
  
  console.log('\n🧹 Performing cleanup...')
  
  // Test cleanup
  await terminalCleanup.cleanup()
  
  console.log('✅ Cleanup complete! Terminal should be restored.')
  console.log('🔍 Check if you can see this message clearly.')
  console.log('📝 If you see this message without corruption, the cleanup worked!')
}

if (import.meta.main) {
  try {
    await testTerminalCleanup()
  } catch (error) {
    console.error('❌ Test failed:', error)
    // Emergency cleanup
    const encoder = new TextEncoder()
    const emergencyReset = '\x1b[!p\x1b[?25h\x1b[?1049l\x1b[0m\x1b[2J\x1b[H'
    Deno.stdout.writeSync(encoder.encode(emergencyReset))
  }
} 
