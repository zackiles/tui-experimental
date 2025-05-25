// Advanced Blitter Selection Engine
// Implements intelligent blitter selection based on content type and terminal capabilities

import { kittyRenderer } from './kitty-graphics.ts'
import { sixelRenderer } from './sixel.ts'

export enum BlitterType {
  PIXEL = 'pixel',
  SEXTANT_3x2 = 'sextant',
  QUADRANT_2x2 = 'quadrant',
  HALF_BLOCK_2x1 = 'halfblock',
  BRAILLE_4x2 = 'braille',
  ASCII_SPACE = 'ascii',
}

export interface GraphicsContent {
  type: 'image' | 'text' | 'canvas' | 'chart'
  source?: unknown
  requiresHighDetail?: boolean
  hasMultipleColors?: boolean
  isAnimated?: boolean
  dimensions?: { width: number; height: number }
}

export interface TerminalCapabilities {
  supportsPixelGraphics: boolean
  supportsKittyGraphics: boolean
  supportsSixel: boolean
  supportsITerm2: boolean
  supportsSextants: boolean
  supportsQuadrants: boolean
  supportsBraille: boolean
  supportsUnicode: boolean
  colorDepth: number
  maxColors: number
  terminalType: string
}

export class BlitterEngine {
  private capabilities: TerminalCapabilities | null = null

  // Detect terminal capabilities
  async detectTerminalCapabilities(): Promise<TerminalCapabilities> {
    if (this.capabilities) {
      return this.capabilities
    }

    const termType = Deno.env.get('TERM') || 'unknown'
    const termProgram = Deno.env.get('TERM_PROGRAM') || ''
    const kittyWindow = Deno.env.get('KITTY_WINDOW_ID')

    // Detect pixel graphics support
    const supportsKittyGraphics = termType === 'xterm-kitty' || kittyWindow !== undefined
    const supportsSixel = await sixelRenderer.detectSupport()
    const supportsITerm2 = termProgram === 'iTerm.app'
    const supportsPixelGraphics = supportsKittyGraphics || supportsSixel || supportsITerm2

    // Detect text rendering capabilities
    const supportsUnicode = this.detectUnicodeSupport()
    const supportsSextants = supportsUnicode && this.detectSextantSupport()
    const supportsQuadrants = supportsUnicode && this.detectQuadrantSupport()
    const supportsBraille = supportsUnicode && this.detectBrailleSupport()

    // Detect color capabilities
    const colorDepth = this.detectColorDepth()
    const maxColors = this.getMaxColors(colorDepth)

    this.capabilities = {
      supportsPixelGraphics,
      supportsKittyGraphics,
      supportsSixel,
      supportsITerm2,
      supportsSextants,
      supportsQuadrants,
      supportsBraille,
      supportsUnicode,
      colorDepth,
      maxColors,
      terminalType: termType,
    }

    return this.capabilities
  }

  // Select optimal blitter based on content and capabilities
  async selectOptimalBlitter(
    content: GraphicsContent,
    capabilities?: TerminalCapabilities,
  ): Promise<BlitterType> {
    const caps = capabilities || await this.detectTerminalCapabilities()

    // Pixel graphics for true images when supported
    if (content.type === 'image' && caps.supportsPixelGraphics) {
      return BlitterType.PIXEL
    }

    // High-quality sextants for detailed graphics
    if (content.requiresHighDetail && caps.supportsSextants) {
      return BlitterType.SEXTANT_3x2
    }

    // Quadrants for moderate detail with multiple colors
    if (content.hasMultipleColors && caps.supportsQuadrants) {
      return BlitterType.QUADRANT_2x2
    }

    // Braille for high-resolution monochrome content
    if (content.type === 'chart' && caps.supportsBraille) {
      return BlitterType.BRAILLE_4x2
    }

    // Half-blocks as a good middle ground
    if (caps.supportsUnicode) {
      return BlitterType.HALF_BLOCK_2x1
    }

    // ASCII fallback for maximum compatibility
    return BlitterType.ASCII_SPACE
  }

  // Get blitter performance characteristics
  getBlitterInfo(blitter: BlitterType): {
    pixelRatio: [number, number]
    colorSupport: 'full' | 'limited' | 'monochrome'
    performance: 'high' | 'medium' | 'low'
    compatibility: 'high' | 'medium' | 'low'
  } {
    switch (blitter) {
      case BlitterType.PIXEL:
        return {
          pixelRatio: [1, 1],
          colorSupport: 'full',
          performance: 'high',
          compatibility: 'low',
        }
      case BlitterType.SEXTANT_3x2:
        return {
          pixelRatio: [3, 2],
          colorSupport: 'full',
          performance: 'medium',
          compatibility: 'medium',
        }
      case BlitterType.QUADRANT_2x2:
        return {
          pixelRatio: [2, 2],
          colorSupport: 'full',
          performance: 'medium',
          compatibility: 'medium',
        }
      case BlitterType.HALF_BLOCK_2x1:
        return {
          pixelRatio: [2, 1],
          colorSupport: 'full',
          performance: 'high',
          compatibility: 'high',
        }
      case BlitterType.BRAILLE_4x2:
        return {
          pixelRatio: [4, 2],
          colorSupport: 'monochrome',
          performance: 'high',
          compatibility: 'high',
        }
      case BlitterType.ASCII_SPACE:
        return {
          pixelRatio: [1, 1],
          colorSupport: 'limited',
          performance: 'high',
          compatibility: 'high',
        }
      default:
        return {
          pixelRatio: [2, 1],
          colorSupport: 'full',
          performance: 'medium',
          compatibility: 'medium',
        }
    }
  }

  // Check if a specific blitter is supported
  async isBlitterSupported(blitter: BlitterType): Promise<boolean> {
    const caps = await this.detectTerminalCapabilities()

    switch (blitter) {
      case BlitterType.PIXEL:
        return caps.supportsPixelGraphics
      case BlitterType.SEXTANT_3x2:
        return caps.supportsSextants
      case BlitterType.QUADRANT_2x2:
        return caps.supportsQuadrants
      case BlitterType.BRAILLE_4x2:
        return caps.supportsBraille
      case BlitterType.HALF_BLOCK_2x1:
        return caps.supportsUnicode
      case BlitterType.ASCII_SPACE:
        return true // Always supported
      default:
        return false
    }
  }

  // Get all supported blitters in order of preference
  async getSupportedBlitters(): Promise<BlitterType[]> {
    const caps = await this.detectTerminalCapabilities()
    const supported: BlitterType[] = []

    if (caps.supportsPixelGraphics) supported.push(BlitterType.PIXEL)
    if (caps.supportsSextants) supported.push(BlitterType.SEXTANT_3x2)
    if (caps.supportsQuadrants) supported.push(BlitterType.QUADRANT_2x2)
    if (caps.supportsBraille) supported.push(BlitterType.BRAILLE_4x2)
    if (caps.supportsUnicode) supported.push(BlitterType.HALF_BLOCK_2x1)
    supported.push(BlitterType.ASCII_SPACE) // Always available

    return supported
  }

  // Private helper methods for capability detection
  private detectUnicodeSupport(): boolean {
    const locale = Deno.env.get('LANG') || Deno.env.get('LC_ALL') || ''
    return locale.toLowerCase().includes('utf') || locale.toLowerCase().includes('unicode')
  }

  private detectSextantSupport(): boolean {
    // Sextants require Unicode 13+ support
    // Most modern terminals support this, but we can check term type
    const term = Deno.env.get('TERM') || ''
    const modernTerms = ['xterm-256color', 'xterm-kitty', 'screen-256color', 'tmux-256color']
    return modernTerms.some((t) => term.includes(t))
  }

  private detectQuadrantSupport(): boolean {
    // Quadrants are widely supported in Unicode terminals
    return this.detectUnicodeSupport()
  }

  private detectBrailleSupport(): boolean {
    // Braille is supported in most Unicode terminals except some console variants
    const term = Deno.env.get('TERM') || ''
    return this.detectUnicodeSupport() && !term.includes('linux')
  }

  private detectColorDepth(): number {
    const term = Deno.env.get('TERM') || ''
    const colorTerm = Deno.env.get('COLORTERM') || ''

    // Check for true color support
    if (colorTerm === 'truecolor' || colorTerm === '24bit') {
      return 24
    }

    // Check term type for color support
    if (term.includes('256color') || term.includes('kitty')) {
      return 8 // 256 colors
    }

    if (term.includes('color')) {
      return 4 // 16 colors
    }

    return 1 // Monochrome
  }

  private getMaxColors(colorDepth: number): number {
    switch (colorDepth) {
      case 24:
        return 16777216 // 2^24
      case 8:
        return 256
      case 4:
        return 16
      default:
        return 2
    }
  }

  // Get current terminal capabilities
  getCapabilities(): TerminalCapabilities | null {
    return this.capabilities
  }

  // Force capability refresh
  async refreshCapabilities(): Promise<TerminalCapabilities> {
    this.capabilities = null
    return await this.detectTerminalCapabilities()
  }
}

// Export singleton instance
export const blitterEngine = new BlitterEngine()
