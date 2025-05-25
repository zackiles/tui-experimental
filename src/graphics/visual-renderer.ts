// Advanced Visual Renderer
// Implements ncvisual support for true pixel graphics and image manipulation

import {
  type BlitterEngine,
  blitterEngine,
  type BlitterType,
  type GraphicsContent,
} from './blitter-engine.ts'
import { type KittyRenderer, kittyRenderer } from './kitty-graphics.ts'
import { type SixelRenderer, sixelRenderer } from './sixel.ts'
import { notcurses } from './notcurses-ffi.ts'
import type { PlaneContext } from './plane-manager.ts'
import { diagnosticLogger } from '../utils/diagnostic-logger.ts'

export interface ImageRenderOptions {
  scale?: { width: number; height: number }
  rotation?: number
  alpha?: AlphaMode
  scaling?: ScalingMode
  placement?: PlacementOptions
  blitter?: BlitterType
}

export interface PlacementOptions {
  x: number
  y: number
  width?: number
  height?: number
}

export enum AlphaMode {
  OPAQUE = 'opaque',
  TRANSPARENT = 'transparent',
  BLEND = 'blend',
  HIGHCONTRAST = 'highcontrast',
}

export enum ScalingMode {
  SCALE = 'scale',
  STRETCH = 'stretch',
  CONTAIN = 'contain',
  COVER = 'cover',
  NONE = 'none',
}

export interface Visual {
  handle: Deno.PointerValue | null
  width: number
  height: number
  format: 'rgba' | 'rgb' | 'bgra'
  data?: Uint8Array
}

export class VisualRenderer {
  private blitterEngine: BlitterEngine
  private kittyRenderer: KittyRenderer
  private sixelRenderer: SixelRenderer

  constructor(
    blitterEngineInstance?: BlitterEngine,
    kittyRendererInstance?: KittyRenderer,
    sixelRendererInstance?: SixelRenderer,
  ) {
    this.blitterEngine = blitterEngineInstance || blitterEngine
    this.kittyRenderer = kittyRendererInstance || kittyRenderer
    this.sixelRenderer = sixelRendererInstance || sixelRenderer
  }

  // Render image with protocol auto-detection and optimal blitter selection
  async renderImage(
    imagePath: string,
    plane: PlaneContext,
    options: ImageRenderOptions = {},
  ): Promise<boolean> {
    try {
      // Load the image data
      const imageData = await Deno.readFile(imagePath)

      // Detect file format
      const format = this.detectImageFormat(imagePath)
      if (!format) {
        diagnosticLogger.error('VisualRenderer', 'Unsupported image format', { path: imagePath })
        return false
      }

      // Get terminal capabilities and select optimal rendering method
      const capabilities = await this.blitterEngine.detectTerminalCapabilities()

      // Try pixel-perfect rendering first if supported
      if (capabilities.supportsPixelGraphics) {
        return await this.renderWithPixelGraphics(imageData, format, plane, options)
      }

      // Fall back to character-based rendering
      return await this.renderWithCharacterGraphics(imageData, format, plane, options)
    } catch (error) {
      diagnosticLogger.error('VisualRenderer', 'Error rendering image', error)
      return false
    }
  }

  // Create visual from RGBA pixel data
  createCustomGraphics(
    pixelData: Uint8Array,
    width: number,
    height: number,
    format: 'rgba' | 'rgb' | 'bgra' = 'rgba',
  ): Visual {
    // For now, create a simple visual structure
    // In a full implementation, this would use notcurses ncvisual functions
    return {
      handle: null, // Would be actual notcurses visual handle
      width,
      height,
      format,
      data: pixelData,
    }
  }

  // Apply transformations to visual
  async transformVisual(
    visual: Visual,
    options: {
      scale?: { width: number; height: number }
      rotation?: number
      flip?: 'horizontal' | 'vertical' | 'both'
    },
  ): Promise<Visual> {
    // Create transformed copy
    const transformed = { ...visual }

    if (options.scale && visual.data) {
      transformed.data = await this.scaleImageData(
        visual.data,
        visual.width,
        visual.height,
        options.scale.width,
        options.scale.height,
        visual.format,
      )
      transformed.width = options.scale.width
      transformed.height = options.scale.height
    }

    if (options.rotation && transformed.data) {
      transformed.data = await this.rotateImageData(
        transformed.data,
        transformed.width,
        transformed.height,
        options.rotation,
        transformed.format,
      )
    }

    if (options.flip && transformed.data) {
      transformed.data = this.flipImageData(
        transformed.data,
        transformed.width,
        transformed.height,
        options.flip,
        transformed.format,
      )
    }

    return transformed
  }

  // Render with pixel graphics protocols (Kitty, Sixel, iTerm2)
  private async renderWithPixelGraphics(
    imageData: Uint8Array,
    format: string,
    plane: PlaneContext,
    options: ImageRenderOptions,
  ): Promise<boolean> {
    const capabilities = await this.blitterEngine.detectTerminalCapabilities()

    // Try Kitty graphics protocol first (most advanced)
    if (capabilities.supportsKittyGraphics) {
      try {
        const success = await this.kittyRenderer.renderImage(
          imageData,
          format as 'png' | 'jpeg' | 'gif',
          {
            placement: options.placement,
            z_index: plane.zIndex,
          },
        )
        if (success) return true
      } catch (error) {
        diagnosticLogger.warn('VisualRenderer', 'Kitty graphics failed, trying fallback', error)
      }
    }

    // Try Sixel protocol
    if (capabilities.supportsSixel) {
      try {
        return await this.sixelRenderer.renderImage(imageData, format as 'png' | 'jpeg')
      } catch (error) {
        diagnosticLogger.warn('VisualRenderer', 'Sixel graphics failed, trying fallback', error)
      }
    }

    // Try iTerm2 protocol (if available)
    if (capabilities.supportsITerm2) {
      try {
        return await this.renderWithITerm2(imageData, format, options)
      } catch (error) {
        diagnosticLogger.warn('VisualRenderer', 'iTerm2 graphics failed', error)
      }
    }

    return false
  }

  // Render with character-based graphics (Unicode blocks, Braille, etc.)
  private async renderWithCharacterGraphics(
    imageData: Uint8Array,
    format: string,
    plane: PlaneContext,
    options: ImageRenderOptions,
  ): Promise<boolean> {
    try {
      // Convert image to pixels for processing
      const visual = await this.imageToVisual(imageData, format)
      if (!visual || !visual.data) return false

      // Select optimal blitter
      const content: GraphicsContent = {
        type: 'image',
        hasMultipleColors: true,
        requiresHighDetail: true,
        dimensions: { width: visual.width, height: visual.height },
      }

      const blitter = options.blitter || await this.blitterEngine.selectOptimalBlitter(content)

      // Render using selected blitter
      return await this.renderWithBlitter(visual, plane, blitter, options)
    } catch (error) {
      diagnosticLogger.error('VisualRenderer', 'Error rendering with character graphics', error)
      return false
    }
  }

  // Render visual using specific blitter
  private async renderWithBlitter(
    visual: Visual,
    plane: PlaneContext,
    blitter: BlitterType,
    options: ImageRenderOptions,
  ): Promise<boolean> {
    if (!visual.data) return false

    try {
      const blitterInfo = this.blitterEngine.getBlitterInfo(blitter)
      const [scaleX, scaleY] = blitterInfo.pixelRatio

      // Calculate character grid dimensions
      const charWidth = Math.ceil(visual.width / scaleX)
      const charHeight = Math.ceil(visual.height / scaleY)

      // Process image data for the specific blitter
      switch (blitter) {
        case 'halfblock':
          return await this.renderHalfBlocks(visual, plane, charWidth, charHeight)
        case 'quadrant':
          return await this.renderQuadrants(visual, plane, charWidth, charHeight)
        case 'sextant':
          return await this.renderSextants(visual, plane, charWidth, charHeight)
        case 'braille':
          return await this.renderBraille(visual, plane, charWidth, charHeight)
        case 'ascii':
          return await this.renderASCII(visual, plane, charWidth, charHeight)
        default:
          return await this.renderHalfBlocks(visual, plane, charWidth, charHeight)
      }
    } catch (error) {
      diagnosticLogger.error('VisualRenderer', 'Error rendering with blitter', error)
      return false
    }
  }

  // Blitter-specific rendering methods
  private async renderHalfBlocks(
    visual: Visual,
    plane: PlaneContext,
    charWidth: number,
    charHeight: number,
  ): Promise<boolean> {
    if (!visual.data) return false

    try {
      const bytesPerPixel = visual.format === 'rgb' ? 3 : 4

      for (let cy = 0; cy < charHeight; cy++) {
        for (let cx = 0; cx < charWidth; cx++) {
          const px = cx * 2
          const py = cy * 2

          // Get top and bottom pixels
          const topPixel = this.getPixel(visual.data, px, py, visual.width, bytesPerPixel)
          const bottomPixel = this.getPixel(visual.data, px, py + 1, visual.width, bytesPerPixel)

          // Choose appropriate half-block character
          const char = this.selectHalfBlockChar(topPixel, bottomPixel)
          const [fgColor, bgColor] = this.getHalfBlockColors(topPixel, bottomPixel)

          // Set colors and render character
          notcurses.setForegroundColor(plane.handle, fgColor[0], fgColor[1], fgColor[2])
          notcurses.setBackgroundColor(plane.handle, bgColor[0], bgColor[1], bgColor[2])
          notcurses.putText(plane.handle, cy, cx, char)
        }
      }

      return true
    } catch (error) {
      diagnosticLogger.error('VisualRenderer', 'Error rendering half blocks', error)
      return false
    }
  }

  private async renderQuadrants(
    visual: Visual,
    plane: PlaneContext,
    charWidth: number,
    charHeight: number,
  ): Promise<boolean> {
    // Implementation for quadrant rendering using ▗▐▖▀▟▌▙ characters
    // This is a simplified version - full implementation would be more complex
    diagnosticLogger.info('VisualRenderer', 'Quadrant rendering not fully implemented yet')
    return false
  }

  private async renderSextants(
    visual: Visual,
    plane: PlaneContext,
    charWidth: number,
    charHeight: number,
  ): Promise<boolean> {
    // Implementation for sextant rendering using Unicode 13 sextant characters
    diagnosticLogger.info('VisualRenderer', 'Sextant rendering not fully implemented yet')
    return false
  }

  private async renderBraille(
    visual: Visual,
    plane: PlaneContext,
    charWidth: number,
    charHeight: number,
  ): Promise<boolean> {
    // Implementation for Braille pattern rendering
    diagnosticLogger.info('VisualRenderer', 'Braille rendering not fully implemented yet')
    return false
  }

  private async renderASCII(
    visual: Visual,
    plane: PlaneContext,
    charWidth: number,
    charHeight: number,
  ): Promise<boolean> {
    // Implementation for ASCII art rendering using brightness mapping
    diagnosticLogger.info('VisualRenderer', 'ASCII rendering not fully implemented yet')
    return false
  }

  // Helper methods
  private detectImageFormat(filePath: string): string | null {
    const ext = filePath.toLowerCase().split('.').pop()
    switch (ext) {
      case 'png':
        return 'png'
      case 'jpg':
      case 'jpeg':
        return 'jpeg'
      case 'gif':
        return 'gif'
      case 'webp':
        return 'webp'
      default:
        return null
    }
  }

  private async imageToVisual(imageData: Uint8Array, format: string): Promise<Visual | null> {
    // In a real implementation, this would decode the image using a library
    // For now, return a placeholder
    return {
      handle: null,
      width: 64,
      height: 64,
      format: 'rgba',
      data: new Uint8Array(64 * 64 * 4), // Placeholder RGBA data
    }
  }

  private getPixel(
    data: Uint8Array,
    x: number,
    y: number,
    width: number,
    bytesPerPixel: number,
  ): [number, number, number, number] {
    const index = (y * width + x) * bytesPerPixel
    if (index >= data.length) return [0, 0, 0, 255]

    const r = data[index] || 0
    const g = data[index + 1] || 0
    const b = data[index + 2] || 0
    const a = bytesPerPixel === 4 ? (data[index + 3] || 255) : 255

    return [r, g, b, a]
  }

  private selectHalfBlockChar(
    topPixel: [number, number, number, number],
    bottomPixel: [number, number, number, number],
  ): string {
    const topBrightness = this.getPixelBrightness(topPixel)
    const bottomBrightness = this.getPixelBrightness(bottomPixel)

    if (topBrightness > 128 && bottomBrightness > 128) return '█' // Full block
    if (topBrightness > 128 && bottomBrightness <= 128) return '▀' // Upper half
    if (topBrightness <= 128 && bottomBrightness > 128) return '▄' // Lower half
    return ' ' // Empty
  }

  private getHalfBlockColors(
    topPixel: [number, number, number, number],
    bottomPixel: [number, number, number, number],
  ): [[number, number, number], [number, number, number]] {
    return [
      [topPixel[0], topPixel[1], topPixel[2]],
      [bottomPixel[0], bottomPixel[1], bottomPixel[2]],
    ]
  }

  private getPixelBrightness(pixel: [number, number, number, number]): number {
    // Simple brightness calculation using luminance formula
    return 0.299 * pixel[0] + 0.587 * pixel[1] + 0.114 * pixel[2]
  }

  // Image processing helpers (simplified implementations)
  private async scaleImageData(
    data: Uint8Array,
    srcWidth: number,
    srcHeight: number,
    destWidth: number,
    destHeight: number,
    format: string,
  ): Promise<Uint8Array> {
    // Simplified nearest-neighbor scaling
    const bytesPerPixel = format === 'rgb' ? 3 : 4
    const scaled = new Uint8Array(destWidth * destHeight * bytesPerPixel)

    for (let y = 0; y < destHeight; y++) {
      for (let x = 0; x < destWidth; x++) {
        const srcX = Math.floor((x * srcWidth) / destWidth)
        const srcY = Math.floor((y * srcHeight) / destHeight)

        const srcIndex = (srcY * srcWidth + srcX) * bytesPerPixel
        const destIndex = (y * destWidth + x) * bytesPerPixel

        for (let i = 0; i < bytesPerPixel; i++) {
          scaled[destIndex + i] = data[srcIndex + i] || 0
        }
      }
    }

    return scaled
  }

  private async rotateImageData(
    data: Uint8Array,
    width: number,
    height: number,
    angle: number,
    format: string,
  ): Promise<Uint8Array> {
    // Simplified rotation (90-degree increments only)
    const times = Math.floor(angle / 90) % 4
    let result = data
    let w = width
    let h = height

    for (let i = 0; i < times; i++) {
      result = this.rotate90(result, w, h, format)
      ;[w, h] = [h, w] // Swap dimensions
    }

    return result
  }

  private rotate90(data: Uint8Array, width: number, height: number, format: string): Uint8Array {
    const bytesPerPixel = format === 'rgb' ? 3 : 4
    const rotated = new Uint8Array(width * height * bytesPerPixel)

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIndex = (y * width + x) * bytesPerPixel
        const destIndex = ((width - 1 - x) * height + y) * bytesPerPixel

        for (let i = 0; i < bytesPerPixel; i++) {
          rotated[destIndex + i] = data[srcIndex + i]
        }
      }
    }

    return rotated
  }

  private flipImageData(
    data: Uint8Array,
    width: number,
    height: number,
    direction: 'horizontal' | 'vertical' | 'both',
    format: string,
  ): Uint8Array {
    const bytesPerPixel = format === 'rgb' ? 3 : 4
    const flipped = new Uint8Array(data.length)

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let destX = x
        let destY = y

        if (direction === 'horizontal' || direction === 'both') {
          destX = width - 1 - x
        }
        if (direction === 'vertical' || direction === 'both') {
          destY = height - 1 - y
        }

        const srcIndex = (y * width + x) * bytesPerPixel
        const destIndex = (destY * width + destX) * bytesPerPixel

        for (let i = 0; i < bytesPerPixel; i++) {
          flipped[destIndex + i] = data[srcIndex + i]
        }
      }
    }

    return flipped
  }

  private async renderWithITerm2(
    imageData: Uint8Array,
    format: string,
    options: ImageRenderOptions,
  ): Promise<boolean> {
    // Placeholder for iTerm2 protocol implementation
    diagnosticLogger.info('VisualRenderer', 'iTerm2 protocol not implemented yet')
    return false
  }
}

// Export singleton instance
export const visualRenderer = new VisualRenderer()
