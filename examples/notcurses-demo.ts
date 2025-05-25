#!/usr/bin/env -S deno run --allow-ffi --allow-read --allow-env

/**
 * Notcurses FFI Demo
 * 
 * This demo shows the working notcurses FFI integration with the TUI framework.
 * It demonstrates text output, colors, and basic rendering.
 */

import { notcurses } from '../src/graphics/notcurses-ffi.ts'
import { diagnosticLogger } from '../src/utils/diagnostic-logger.ts'

async function runDemo() {
  diagnosticLogger.info('NotcursesDemo', '🎨 Notcurses FFI Demo')
  diagnosticLogger.info('NotcursesDemo', 'Press Ctrl+C to exit')
  
  // Initialize notcurses
  if (!notcurses.isAvailable()) {
    diagnosticLogger.error('NotcursesDemo', '❌ Notcurses FFI not available')
    return
  }
  
  const success = await notcurses.init({})
  if (!success) {
    diagnosticLogger.error('NotcursesDemo', '❌ Failed to initialize notcurses')
    return
  }
  
  const stdPlane = notcurses.getStandardPlane()
  if (!stdPlane) {
    diagnosticLogger.error('NotcursesDemo', '❌ Failed to get standard plane')
    notcurses.stop()
    return
  }
  
  try {
    // Clear the screen
    notcurses.clearPlane(stdPlane)
    
    // Set colors and draw text
    notcurses.setForegroundColor(stdPlane, 255, 255, 255) // White text
    notcurses.setBackgroundColor(stdPlane, 0, 0, 0)       // Black background
    notcurses.putText(stdPlane, 0, 0, '🎉 Notcurses FFI is working!')
    
    notcurses.setForegroundColor(stdPlane, 255, 100, 100) // Light red
    notcurses.putText(stdPlane, 2, 2, 'Text output: ✅')
    
    notcurses.setForegroundColor(stdPlane, 100, 255, 100) // Light green  
    notcurses.putText(stdPlane, 3, 2, 'Color support: ✅')
    
    notcurses.setForegroundColor(stdPlane, 100, 100, 255) // Light blue
    notcurses.putText(stdPlane, 4, 2, 'FFI integration: ✅')
    
    notcurses.setForegroundColor(stdPlane, 255, 255, 100) // Yellow
    notcurses.putText(stdPlane, 6, 2, 'Press Ctrl+C to exit...')
    
    // Render the screen
    notcurses.render()
    
    // Keep the demo running until interrupted
    await new Promise(() => {}) // Wait forever
    
  } catch (error) {
    diagnosticLogger.error('NotcursesDemo', 'Demo error:', error)
  } finally {
    notcurses.stop()
  }
}

// Handle graceful shutdown
Deno.addSignalListener('SIGINT', () => {
  diagnosticLogger.info('NotcursesDemo', '\n👋 Shutting down...')
  notcurses.stop()
  Deno.exit(0)
})

if (import.meta.main) {
  await runDemo()
} 
