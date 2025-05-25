#!/usr/bin/env -S deno run --allow-ffi --allow-read --allow-env

/**
 * Notcurses FFI Demo
 * 
 * This demo shows the working notcurses FFI integration with the TUI framework.
 * It demonstrates text output, colors, and basic rendering.
 */

import { notcurses } from '../src/graphics/notcurses-ffi.ts'

async function runDemo() {
  console.log('🎨 Notcurses FFI Demo')
  console.log('Press Ctrl+C to exit')
  
  // Initialize notcurses
  if (!notcurses.isAvailable()) {
    console.log('❌ Notcurses FFI not available')
    return
  }
  
  const success = await notcurses.init({})
  if (!success) {
    console.log('❌ Failed to initialize notcurses')
    return
  }
  
  const stdPlane = notcurses.getStandardPlane()
  if (!stdPlane) {
    console.log('❌ Failed to get standard plane')
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
    console.error('Demo error:', error)
  } finally {
    notcurses.stop()
  }
}

// Handle graceful shutdown
Deno.addSignalListener('SIGINT', () => {
  console.log('\n👋 Shutting down...')
  notcurses.stop()
  Deno.exit(0)
})

if (import.meta.main) {
  await runDemo()
} 
