// Advanced Graphics Demonstration
// Showcases the notcurses advanced graphics implementation with real examples

import { planeManager } from '../src/graphics/plane-manager.ts'
import { blitterEngine, BlitterType, GraphicsContent } from '../src/graphics/blitter-engine.ts'
import { visualRenderer } from '../src/graphics/visual-renderer.ts'
import { colorSystem, AdvancedColorSystem } from '../src/graphics/color-system.ts'
import { effectsSystem, EffectsSystem, GradientDirection } from '../src/graphics/effects-system.ts'
import { notcurses } from '../src/graphics/notcurses-ffi.ts'

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
    console.log('🎨 Advanced Graphics Demo - Initializing...')

    try {
      // Initialize notcurses
      const success = await notcurses.init()
      if (!success) {
        console.warn('⚠️  Notcurses not available, running in fallback mode')
      }

      // Detect terminal capabilities
      this.state.capabilities = await blitterEngine.detectTerminalCapabilities()
      this.logCapabilities()

      this.state.isRunning = true
      return true
    } catch (error) {
      console.error('❌ Failed to initialize graphics demo:', error)
      return false
    }
  }

  private logCapabilities(): void {
    const caps = this.state.capabilities
    console.log('\n📊 Terminal Graphics Capabilities:')
    console.log(`  • Terminal: ${caps.terminalType}`)
    console.log(`  • Color Depth: ${caps.colorDepth}-bit`)
    console.log(`  • Max Colors: ${caps.maxColors.toLocaleString()}`)
    console.log(`  • Unicode Support: ${caps.supportsUnicode ? '✅' : '❌'}`)
    console.log(`  • Pixel Graphics: ${caps.supportsPixelGraphics ? '✅' : '❌'}`)
    console.log(`  • Kitty Protocol: ${caps.supportsKittyGraphics ? '✅' : '❌'}`)
    console.log(`  • Sixel Support: ${caps.supportsSixel ? '✅' : '❌'}`)
    console.log(`  • Sextants: ${caps.supportsSextants ? '✅' : '❌'}`)
    console.log(`  • Quadrants: ${caps.supportsQuadrants ? '✅' : '❌'}`)
    console.log(`  • Braille: ${caps.supportsBraille ? '✅' : '❌'}`)
  }

  async runDemo(): Promise<void> {
    if (!this.state.isRunning) {
      console.log('❌ Demo not initialized')
      return
    }

    console.log('\n🚀 Starting Advanced Graphics Demonstrations\n')

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
      console.log(`\n🎯 Demo ${i + 1}/${demos.length}: ${demo.name}`)
      console.log('─'.repeat(50))

      try {
        await demo.fn()
        console.log(`✅ ${demo.name} completed successfully`)
      } catch (error) {
        console.error(`❌ ${demo.name} failed:`, error)
      }

      // Pause between demos
      if (i < demos.length - 1) {
        console.log('\n⏳ Pausing for 2 seconds...')
        await this.delay(2000)
      }
    }

    console.log('\n🎉 All demonstrations completed!')
  }

  // Demo 1: Multi-Plane Rendering with Z-ordering
  private async demoMultiPlaneRendering(): Promise<void> {
    console.log('Creating multiple planes with different z-indices...')

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

      console.log(`  • Created ${planeManager.getPlaneCount()} planes`)
      console.log('  • Demonstrating z-order rendering')
      
      await this.delay(1000)

      // Demonstrate z-index changes
      console.log('  • Changing z-order...')
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
    console.log('Demonstrating intelligent blitter selection...')

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

      console.log(`  • ${content.type.toUpperCase()} content:`)
      console.log(`    - Selected blitter: ${blitter}`)
      console.log(`    - Pixel ratio: ${info.pixelRatio[0]}x${info.pixelRatio[1]}`)
      console.log(`    - Color support: ${info.colorSupport}`)
      console.log(`    - Compatibility: ${info.compatibility}`)
      console.log(`    - Supported: ${supported ? '✅' : '❌'}`)
    }

    // Show all supported blitters
    const supportedBlitters = await blitterEngine.getSupportedBlitters()
    console.log(`  • Supported blitters: ${supportedBlitters.join(', ')}`)
  }

  // Demo 3: Advanced Color Systems
  private async demoColorSystems(): Promise<void> {
    console.log('Demonstrating advanced color manipulation...')

    // Create color channels
    const red = colorSystem.createChannel(255, 0, 0)
    const blue = colorSystem.createChannel(0, 0, 255)
    const fromHex = colorSystem.createChannelFromHex('#00FF00')

    console.log('  • Color creation:')
    console.log(`    - Red: ${colorSystem.toCSSColor(red)}`)
    console.log(`    - Blue: ${colorSystem.toCSSColor(blue)}`)
    console.log(`    - Green (from hex): ${colorSystem.toCSSColor(fromHex)}`)

    // Create gradient
    const gradient = colorSystem.createGradient(red, blue, 5)
    console.log('  • Gradient colors:')
    gradient.forEach((color, i) => {
      console.log(`    ${i + 1}. ${colorSystem.toHexColor(color)}`)
    })

    // Blend colors
    const blended = colorSystem.blendColors(red, blue)
    console.log(`  • Blended color: ${colorSystem.toCSSColor(blended)}`)

    // Accessibility check
    const white = AdvancedColorSystem.PALETTE.WHITE
    const black = AdvancedColorSystem.PALETTE.BLACK
    const contrastRatio = colorSystem.getContrastRatio(white, black)
    const wcagAA = colorSystem.meetsWCAGContrast(white, black, 'AA')

    console.log('  • Accessibility:')
    console.log(`    - White/Black contrast ratio: ${contrastRatio.toFixed(2)}`)
    console.log(`    - WCAG AA compliant: ${wcagAA ? '✅' : '❌'}`)

    // Show palette colors
    console.log('  • Available palette colors:')
    const paletteEntries = Object.entries(AdvancedColorSystem.PALETTE).slice(0, 5)
    paletteEntries.forEach(([name, color]) => {
      console.log(`    - ${name}: ${colorSystem.toHexColor(color)}`)
    })
  }

  // Demo 4: Advanced Effects
  private async demoAdvancedEffects(): Promise<void> {
    console.log('Demonstrating visual effects...')

    const effectPlane = planeManager.createPlane('effects', {
      x: 5, y: 5, rows: 8, cols: 30,
      zIndex: 1
    })

    if (!effectPlane) return

    this.fillPlaneWithPattern(effectPlane, '█', 'Effects Demo')

    console.log('  • Fade in effect...')
    await effectsSystem.fadeIn(effectPlane, 1000)

    console.log('  • Slide animation...')
    await effectsSystem.slide(effectPlane, 5, 5, 15, 8, { duration: 1000 })

    console.log('  • Shake effect...')
    await effectsSystem.shake(effectPlane, { duration: 500, intensity: 3 })

    console.log('  • Typewriter effect...')
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

    console.log('  • Fade out effect...')
    await effectsSystem.fadeOut(effectPlane, 1000)

    planeManager.destroyPlane('effects')
  }

  // Demo 5: Gradient Rendering
  private async demoGradients(): Promise<void> {
    console.log('Demonstrating gradient rendering...')

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
      console.log(`  • ${direction} gradient`)
      effectsSystem.createLinearGradient(gradientPlane, direction, colors)
      planeManager.renderAll()
      await this.delay(1500)
    }

    planeManager.destroyPlane('gradients')
  }

  // Demo 6: Image Processing (simulated)
  private async demoImageProcessing(): Promise<void> {
    console.log('Demonstrating image processing capabilities...')

    // Create a simulated image
    const imageData = new Uint8Array(64 * 64 * 4) // 64x64 RGBA
    this.generateTestImage(imageData, 64, 64)

    console.log('  • Created test image (64x64 RGBA)')

    const visual = visualRenderer.createCustomGraphics(imageData, 64, 64, 'rgba')
    console.log(`  • Visual created: ${visual.width}x${visual.height}`)

    // Demonstrate transformations
    console.log('  • Applying transformations...')
    
    const scaled = await visualRenderer.transformVisual(visual, {
      scale: { width: 32, height: 32 }
    })
    console.log(`    - Scaled to: ${scaled.width}x${scaled.height}`)

    const rotated = await visualRenderer.transformVisual(scaled, {
      rotation: 90
    })
    console.log('    - Rotated 90 degrees')

    const flipped = await visualRenderer.transformVisual(rotated, {
      flip: 'horizontal'
    })
    console.log('    - Flipped horizontally')

    console.log('  • Image processing pipeline completed')
  }

  // Demo 7: Animation System
  private async demoAnimations(): Promise<void> {
    console.log('Demonstrating animation system...')

    const animPlane = planeManager.createPlane('animation', {
      x: 10, y: 10, rows: 6, cols: 20,
      zIndex: 1
    })

    if (!animPlane) return

    this.fillPlaneWithPattern(animPlane, '▓', 'Animated')

    console.log('  • Scale animation...')
    await effectsSystem.scale(animPlane, 1.0, 1.5, { duration: 1000 })
    await effectsSystem.scale(animPlane, 1.5, 1.0, { duration: 1000 })

    console.log('  • Blink animation...')
    await effectsSystem.blink(animPlane, { count: 3, onDuration: 300, offDuration: 300 })

    console.log('  • Available easing functions:')
    const easingNames = Object.keys(EffectsSystem.EASING)
    easingNames.forEach(name => {
      console.log(`    - ${name}`)
    })

    planeManager.destroyPlane('animation')
  }

  // Helper methods
  private fillPlaneWithPattern(plane: any, char: string, text: string): void {
    // Simulate filling a plane with a pattern
    // In a real implementation, this would use notcurses plane manipulation
    console.log(`    Filled plane '${plane.id}' with pattern '${char}' and text '${text}'`)
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
    console.log('\n🧹 Cleaning up...')
    
    // Stop all animations
    effectsSystem.stopAllAnimations()
    
    // Clean up all planes
    planeManager.cleanup()
    
    // Stop notcurses
    notcurses.stop()
    
    this.state.isRunning = false
    console.log('✅ Cleanup completed')
  }
}

// Main execution
async function main(): Promise<void> {
  const demo = new AdvancedGraphicsDemo()

  try {
    // Initialize the demo
    const success = await demo.initialize()
    if (!success) {
      console.log('❌ Failed to initialize graphics demo')
      return
    }

    // Run all demonstrations
    await demo.runDemo()

  } catch (error) {
    console.error('❌ Demo failed:', error)
  } finally {
    // Always cleanup
    await demo.cleanup()
  }
}

// Run the demo if this is the main module
if (import.meta.main) {
  console.log('🎨 Advanced Graphics Demo Starting...')
  main().catch(console.error)
} 
