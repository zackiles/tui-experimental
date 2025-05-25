// Simple terminal test to verify ANSI escape sequences work correctly
// This bypasses the full framework to isolate terminal output issues

import { ANSI_CODES } from '../src/core/constants.ts'

async function writeToTerminal(data: string): Promise<void> {
  const encoder = new TextEncoder()
  await Deno.stdout.write(encoder.encode(data))
}

async function simpleTerminalTest() {
  console.log('🧪 Testing basic terminal ANSI sequences...')
  console.log('Press any key to start the test, or Ctrl+C to exit')
  
  // Wait for user input
  const buffer = new Uint8Array(1)
  await Deno.stdin.read(buffer)
  
  try {
    // Enter alternate screen
    await writeToTerminal(ANSI_CODES.ALTERNATE_SCREEN_ENTER)
    await writeToTerminal(ANSI_CODES.CURSOR_HIDE)
    await writeToTerminal(ANSI_CODES.CLEAR_SCREEN)
    await writeToTerminal(ANSI_CODES.CURSOR_HOME)
    
    // Write some test content
    await writeToTerminal('\x1b[2;2H🎉 Terminal Test Success!')
    await writeToTerminal('\x1b[4;2H✅ ANSI codes working properly')
    await writeToTerminal('\x1b[6;2H✅ Alternate screen active')
    await writeToTerminal('\x1b[8;2H✅ Cursor positioning working')
    
    await writeToTerminal('\x1b[10;2H\x1b[33mYellow text test\x1b[0m')
    await writeToTerminal('\x1b[11;2H\x1b[32mGreen text test\x1b[0m')
    await writeToTerminal('\x1b[12;2H\x1b[36mCyan text test\x1b[0m')
    
    await writeToTerminal('\x1b[14;2HTest will exit in 3 seconds...')
    
    // Wait 3 seconds
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // Restore terminal
    await writeToTerminal(ANSI_CODES.CURSOR_SHOW)
    await writeToTerminal(ANSI_CODES.ALTERNATE_SCREEN_EXIT)
    
    console.log('✅ Terminal test completed successfully!')
    
  } catch (error) {
    // Ensure we restore terminal state even on error
    await writeToTerminal(ANSI_CODES.CURSOR_SHOW)
    await writeToTerminal(ANSI_CODES.ALTERNATE_SCREEN_EXIT)
    console.error('❌ Terminal test failed:', error)
    Deno.exit(1)
  }
}

if (import.meta.main) {
  await simpleTerminalTest()
} 
