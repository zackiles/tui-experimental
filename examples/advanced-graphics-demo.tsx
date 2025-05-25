// Advanced Graphics Demonstration
// Showcases the notcurses advanced graphics implementation with real examples

import { planeManager } from '../src/graphics/plane-manager.ts'
import { blitterEngine, BlitterType, GraphicsContent } from '../src/graphics/blitter-engine.ts'
import { visualRenderer } from '../src/graphics/visual-renderer.ts'
import { colorSystem, AdvancedColorSystem } from '../src/graphics/color-system.ts'
import { effectsSystem, EffectsSystem, GradientDirection } from '../src/graphics/effects-system.ts'
import { notcurses } from '../src/graphics/notcurses-ffi.ts'
import { diagnosticLogger } from '../src/utils/diagnostic-logger.ts'

interface DemoState {
  currentDemo: number
  isRunning: boolean
  capabilities: any
}

class AdvancedGraphicsDemo {
  private state: DemoState = {
    currentDemo: 0,
    isRunning: false,
    capabilities: null
  }

  async initialize(): Promise<boolean> {
    diagnosticLogger.info('AdvancedGraphicsDemo', '🎨 Advanced Graphics Demo - Initializing...')

    try {
      // Initialize notcurses
      const success = await notcurses.init()
      if (!success) {
        diagnosticLogger.warn('AdvancedGraphicsDemo', '⚠️  Notcurses not available, running in fallback mode')
      }

      // Detect terminal capabilities
      this.state.capabilities = await blitterEngine.detectTerminalCapabilities()
      this.logCapabilities()

      this.state.isRunning = true
      return true
    } catch (error) {
      diagnosticLogger.error('AdvancedGraphicsDemo', '❌ Failed to initialize graphics demo:', error)
      return false
    }
  }

  private logCapabilities(): void {
    const caps = this.state.capabilities
    diagnosticLogger.info('AdvancedGraphicsDemo', '\n📊 Terminal Graphics Capabilities:')
    diagnosticLogger.info('AdvancedGraphicsDemo', `  • Terminal: ${caps.terminalType}`)
    diagnosticLogger.info('AdvancedGraphicsDemo', `  • Color Depth: ${caps.colorDepth}-bit`)
    diagnosticLogger.info('AdvancedGraphicsDemo', `  • Max Colors: ${caps.maxColors.toLocaleString()}`)
    diagnosticLogger.info('AdvancedGraphicsDemo', `  • Unicode Support: ${caps.supportsUnicode ? '✅' : '❌'}`)
    diagnosticLogger.info('AdvancedGraphicsDemo', `  • Pixel Graphics: ${caps.supportsPixelGraphics ? '✅' : '❌'}`)
    diagnosticLogger.info('AdvancedGraphicsDemo', `  • Kitty Protocol: ${caps.supportsKittyGraphics ? '✅' : '❌'}`)
    diagnosticLogger.info('AdvancedGraphicsDemo', `  • Sixel Support: ${caps.supportsSixel ? '✅' : '❌'}`)
    diagnosticLogger.info('AdvancedGraphicsDemo', `  • Sextants: ${caps.supportsSextants ? '✅' : '❌'}`)
    diagnosticLogger.info('AdvancedGraphicsDemo', `  • Quadrants: ${caps.supportsQuadrants ? '✅' : '❌'}`)
    diagnosticLogger.info('AdvancedGraphicsDemo', `  • Braille: ${caps.supportsBraille ? '✅' : '❌'}`)
  }

  async runDemo(): Promise<void> {
    if (!this.state.isRunning) {
      diagnosticLogger.error('AdvancedGraphicsDemo', '❌ Demo not initialized')
      return
    }

    diagnosticLogger.info('AdvancedGraphicsDemo', '\n🚀 Starting Advanced Graphics Demonstrations\n')

    const demos = [
      { name: 'Multi-Plane Rendering', fn: () => this.demoMultiPlaneRendering() },
      { name: 'Blitter Selection', fn: () => this.demoBlitterSelection() },
      { name: 'Color Systems', fn: () => this.demoColorSystems() },
      { name: 'Advanced Effects', fn: () => this.demoAdvancedEffects() },
      { name: 'Gradient Rendering', fn: () => this.demoGradients() },
      { name: 'Image Processing', fn: () => this.demoImageProcessing() },
      { name: 'Animation System', fn: () => this.demoAnimations() }
    ]

    for (let i = 0; i < demos.length; i++) {
      const demo = demos[i]
      diagnosticLogger.info('AdvancedGraphicsDemo', `\n🎯 Demo ${i + 1}/${demos.length}: ${demo.name}`)
      diagnosticLogger.info('AdvancedGraphicsDemo', '─'.repeat(50))

      try {
        await demo.fn()
        diagnosticLogger.info('AdvancedGraphicsDemo', `✅ ${demo.name} completed successfully`)
      } catch (error) {
        diagnosticLogger.error('AdvancedGraphicsDemo', `❌ ${demo.name} failed:`, error)
      }

      // Pause between demos
      if (i < demos.length - 1) {
        diagnosticLogger.info('AdvancedGraphicsDemo', '\n⏳ Pausing for 2 seconds...')
        await this.delay(2000)
      }
    }

    diagnosticLogger.info('AdvancedGraphicsDemo', '\n🎉 All demonstrations completed!')
  }

  // Demo 1: Multi-Plane Rendering with Z-ordering
  private async demoMultiPlaneRendering(): Promise<void> {
    diagnosticLogger.info('AdvancedGraphicsDemo', 'Creating multiple planes with different z-indices...')

    // Create background plane
    const backgroundPlane = planeManager.createPlane('background', {
      x: 0, y: 0, rows: 10, cols: 40,
      zIndex: 0
    })

    // Create middle plane
    const middlePlane = planeManager.createPlane('middle', {
      x: 5, y: 2, rows: 6, cols: 30,
      zIndex: 1,
      transparent: true
    })

    // Create foreground plane
    const foregroundPlane = planeManager.createPlane('foreground', {
      x: 10, y: 4, rows: 4, cols: 20,
      zIndex: 2
    })

    if (backgroundPlane && middlePlane && foregroundPlane) {
      // Fill planes with content
      this.fillPlaneWithPattern(backgroundPlane, '░', 'Background Layer')
      this.fillPlaneWithPattern(middlePlane, '▒', 'Middle Layer')
      this.fillPlaneWithPattern(foregroundPlane, '█', 'Foreground')

      // Render all planes
      planeManager.renderAll()

      diagnosticLogger.info('AdvancedGraphicsDemo', `  • Created ${planeManager.getPlaneCount()} planes`)
      diagnosticLogger.info('AdvancedGraphicsDemo', '  • Demonstrating z-order rendering')
      
      await this.delay(1000)

      // Demonstrate z-index changes
      diagnosticLogger.info('AdvancedGraphicsDemo', '  • Changing z-order...')
      planeManager.setPlaneZIndex('background', 3)
      planeManager.renderAll()

      await this.delay(1000)

      // Cleanup
      planeManager.destroyPlane('background')
      planeManager.destroyPlane('middle')
      planeManager.destroyPlane('foreground')
    }
  }

  // Demo 2: Blitter Selection Based on Content
  private async demoBlitterSelection(): Promise<void> {
    diagnosticLogger.info('AdvancedGraphicsDemo', 'Demonstrating intelligent blitter selection...')

    const contentTypes: GraphicsContent[] = [
      {
        type: 'image',
        hasMultipleColors: true,
        requiresHighDetail: true
      },
      {
        type: 'chart',
        hasMultipleColors: false,
        requiresHighDetail: true
      },
      {
        type: 'text',
        hasMultipleColors: true,
        requiresHighDetail: false
      }
    ]

    for (const content of contentTypes) {
      const blitter = await blitterEngine.selectOptimalBlitter(content)
      const info = blitterEngine.getBlitterInfo(blitter)
      const supported = await blitterEngine.isBlitterSupported(blitter)

      diagnosticLogger.info('AdvancedGraphicsDemo', `  • ${content.type.toUpperCase()} content:`)
      diagnosticLogger.info('AdvancedGraphicsDemo', `    - Selected blitter: ${blitter}`)
      diagnosticLogger.info('AdvancedGraphicsDemo', `    - Pixel ratio: ${info.pixelRatio[0]}x${info.pixelRatio[1]}`)
      diagnosticLogger.info('AdvancedGraphicsDemo', `    - Color support: ${info.colorSupport}`)
      diagnosticLogger.info('AdvancedGraphicsDemo', `    - Compatibility: ${info.compatibility}`)
      diagnosticLogger.info('AdvancedGraphicsDemo', `    - Supported: ${supported ? '✅' : '❌'}`)
    }

    // Show all supported blitters
    const supportedBlitters = await blitterEngine.getSupportedBlitters()
    diagnosticLogger.info('AdvancedGraphicsDemo', `  • Supported blitters: ${supportedBlitters.join(', ')}`)
  }

  // Demo 3: Advanced Color Systems
  private async demoColorSystems(): Promise<void> {
    diagnosticLogger.info('AdvancedGraphicsDemo', 'Demonstrating advanced color manipulation...')

    // Create color channels
    const red = colorSystem.createChannel(255, 0, 0)
    const blue = colorSystem.createChannel(0, 0, 255)
    const fromHex = colorSystem.createChannelFromHex('#00FF00')

    diagnosticLogger.info('AdvancedGraphicsDemo', '  • Color creation:')
    diagnosticLogger.info('AdvancedGraphicsDemo', `    - Red: ${colorSystem.toCSSColor(red)}`)
    diagnosticLogger.info('AdvancedGraphicsDemo', `    - Blue: ${colorSystem.toCSSColor(blue)}`)
    diagnosticLogger.info('AdvancedGraphicsDemo', `    - Green (from hex): ${colorSystem.toCSSColor(fromHex)}`)

    // Create gradient
    const gradient = colorSystem.createGradient(red, blue, 5)
    diagnosticLogger.info('AdvancedGraphicsDemo', '  • Gradient colors:')
    gradient.forEach((color, i) => {
      diagnosticLogger.info('AdvancedGraphicsDemo', `    ${i + 1}. ${colorSystem.toHexColor(color)}`)
    })

    // Blend colors
    const blended = colorSystem.blendColors(red, blue)
    diagnosticLogger.info('AdvancedGraphicsDemo', `  • Blended color: ${colorSystem.toCSSColor(blended)}`)

    // Accessibility check
    const white = AdvancedColorSystem.PALETTE.WHITE
    const black = AdvancedColorSystem.PALETTE.BLACK
    const contrastRatio = colorSystem.getContrastRatio(white, black)
    const wcagAA = colorSystem.meetsWCAGContrast(white, black, 'AA')

    diagnosticLogger.info('AdvancedGraphicsDemo', '  • Accessibility:')
    diagnosticLogger.info('AdvancedGraphicsDemo', `    - White/Black contrast ratio: ${contrastRatio.toFixed(2)}`)
    diagnosticLogger.info('AdvancedGraphicsDemo', `    - WCAG AA compliant: ${wcagAA ? '✅' : '❌'}`)

    // Show palette colors
    diagnosticLogger.info('AdvancedGraphicsDemo', '  • Available palette colors:')
    const paletteEntries = Object.entries(AdvancedColorSystem.PALETTE).slice(0, 5)
    paletteEntries.forEach(([name, color]) => {
      diagnosticLogger.info('AdvancedGraphicsDemo', `    - ${name}: ${colorSystem.toHexColor(color)}`)
    })
  }

  // Demo 4: Advanced Effects
  private async demoAdvancedEffects(): Promise<void> {
    diagnosticLogger.info('AdvancedGraphicsDemo', 'Demonstrating visual effects...')

    const effectPlane = planeManager.createPlane('effects', {
      x: 5, y: 5, rows: 8, cols: 30,
      zIndex: 1
    })

    if (!effectPlane) return

    this.fillPlaneWithPattern(effectPlane, '█', 'Effects Demo')

    diagnosticLogger.info('AdvancedGraphicsDemo', '  • Fade in effect...')
    await effectsSystem.fadeIn(effectPlane, 1000)

    diagnosticLogger.info('AdvancedGraphicsDemo', '  • Slide animation...')
    await effectsSystem.slide(effectPlane, 5, 5, 15, 8, { duration: 1000 })

    diagnosticLogger.info('AdvancedGraphicsDemo', '  • Shake effect...')
    await effectsSystem.shake(effectPlane, { duration: 500, intensity: 3 })

    diagnosticLogger.info('AdvancedGraphicsDemo', '  • Typewriter effect...')
    const textPlane = planeManager.createPlane('typewriter', {
      x: 5, y: 15, rows: 2, cols: 40,
      zIndex: 2
    })

    if (textPlane) {
      await effectsSystem.typewriter(textPlane, 'Hello, Advanced Graphics!', {
        speed: 8,
        cursor: true
      })

      await this.delay(1000)
      planeManager.destroyPlane('typewriter')
    }

    diagnosticLogger.info('AdvancedGraphicsDemo', '  • Fade out effect...')
    await effectsSystem.fadeOut(effectPlane, 1000)

    planeManager.destroyPlane('effects')
  }

  // Demo 5: Gradient Rendering
  private async demoGradients(): Promise<void> {
    diagnosticLogger.info('AdvancedGraphicsDemo', 'Demonstrating gradient rendering...')

    const gradientPlane = planeManager.createPlane('gradients', {
      x: 2, y: 2, rows: 12, cols: 50,
      zIndex: 0
    })

    if (!gradientPlane) return

    const colors = [
      AdvancedColorSystem.PALETTE.RED,
      AdvancedColorSystem.PALETTE.YELLOW,
      AdvancedColorSystem.PALETTE.GREEN,
      AdvancedColorSystem.PALETTE.BLUE
    ]

    const directions = [
      GradientDirection.HORIZONTAL,
      GradientDirection.VERTICAL,
      GradientDirection.DIAGONAL_DOWN,
      GradientDirection.RADIAL
    ]

    for (const direction of directions) {
      diagnosticLogger.info('AdvancedGraphicsDemo', `  • ${direction} gradient`)
      effectsSystem.createLinearGradient(gradientPlane, direction, colors)
      planeManager.renderAll()
      await this.delay(1500)
    }

    planeManager.destroyPlane('gradients')
  }

  // Demo 6: Image Processing (simulated)
  private async demoImageProcessing(): Promise<void> {
    diagnosticLogger.info('AdvancedGraphicsDemo', 'Demonstrating image processing capabilities...')

    // Create a simulated image
    const imageData = new Uint8Array(64 * 64 * 4) // 64x64 RGBA
    this.generateTestImage(imageData, 64, 64)

    diagnosticLogger.info('AdvancedGraphicsDemo', '  • Created test image (64x64 RGBA)')

    const visual = visualRenderer.createCustomGraphics(imageData, 64, 64, 'rgba')
    diagnosticLogger.info('AdvancedGraphicsDemo', `  • Visual created: ${visual.width}x${visual.height}`)

    // Demonstrate transformations
    diagnosticLogger.info('AdvancedGraphicsDemo', '  • Applying transformations...')
    
    const scaled = await visualRenderer.transformVisual(visual, {
      scale: { width: 32, height: 32 }
    })
    diagnosticLogger.info('AdvancedGraphicsDemo', `    - Scaled to: ${scaled.width}x${scaled.height}`)

    const rotated = await visualRenderer.transformVisual(scaled, {
      rotation: 90
    })
    diagnosticLogger.info('AdvancedGraphicsDemo', '    - Rotated 90 degrees')

    const flipped = await visualRenderer.transformVisual(rotated, {
      flip: 'horizontal'
    })
    diagnosticLogger.info('AdvancedGraphicsDemo', '    - Flipped horizontally')

    diagnosticLogger.info('AdvancedGraphicsDemo', '  • Image processing pipeline completed')
  }

  // Demo 7: Animation System
  private async demoAnimations(): Promise<void> {
    diagnosticLogger.info('AdvancedGraphicsDemo', 'Demonstrating animation system...')

    const animPlane = planeManager.createPlane('animation', {
      x: 10, y: 10, rows: 6, cols: 20,
      zIndex: 1
    })

    if (!animPlane) return

    this.fillPlaneWithPattern(animPlane, '▓', 'Animated')

    diagnosticLogger.info('AdvancedGraphicsDemo', '  • Scale animation...')
    await effectsSystem.scale(animPlane, 1.0, 1.5, { duration: 1000 })
    await effectsSystem.scale(animPlane, 1.5, 1.0, { duration: 1000 })

    diagnosticLogger.info('AdvancedGraphicsDemo', '  • Blink animation...')
    await effectsSystem.blink(animPlane, { count: 3, onDuration: 300, offDuration: 300 })

    diagnosticLogger.info('AdvancedGraphicsDemo', '  • Available easing functions:')
    const easingNames = Object.keys(EffectsSystem.EASING)
    easingNames.forEach(name => {
      diagnosticLogger.info('AdvancedGraphicsDemo', `    - ${name}`)
    })

    planeManager.destroyPlane('animation')
  }

  // Helper methods
  private fillPlaneWithPattern(plane: any, char: string, text: string): void {
    // Simulate filling a plane with a pattern
    // In a real implementation, this would use notcurses plane manipulation
    diagnosticLogger.debug('AdvancedGraphicsDemo', `    Filled plane '${plane.id}' with pattern '${char}' and text '${text}'`)
  }

  private generateTestImage(data: Uint8Array, width: number, height: number): void {
    // Generate a simple test pattern
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4
        
        // Create a colorful pattern
        data[index] = (x * 4) % 256     // Red
        data[index + 1] = (y * 4) % 256 // Green
        data[index + 2] = ((x + y) * 2) % 256 // Blue
        data[index + 3] = 255           // Alpha
      }
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async cleanup(): Promise<void> {
    diagnosticLogger.info('AdvancedGraphicsDemo', '\n🧹 Cleaning up...')
    
    // Stop all animations
    effectsSystem.stopAllAnimations()
    
    // Clean up all planes
    planeManager.cleanup()
    
    // Stop notcurses
    notcurses.stop()
    
    this.state.isRunning = false
    diagnosticLogger.info('AdvancedGraphicsDemo', '✅ Cleanup completed')
  }
}

// Main execution
async function main(): Promise<void> {
  const demo = new AdvancedGraphicsDemo()

  try {
    // Initialize the demo
    const success = await demo.initialize()
    if (!success) {
      diagnosticLogger.error('AdvancedGraphicsDemo', '❌ Failed to initialize graphics demo')
      return
    }

    // Run all demonstrations
    await demo.runDemo()

  } catch (error) {
    diagnosticLogger.error('AdvancedGraphicsDemo', '❌ Demo failed:', error)
  } finally {
    // Always cleanup
    await demo.cleanup()
  }
}

// Run the demo if this is the main module
if (import.meta.main) {
  diagnosticLogger.info('AdvancedGraphicsDemo', '🎨 Advanced Graphics Demo Starting...')
  main().catch(error => diagnosticLogger.error('AdvancedGraphicsDemo', error))
} 
