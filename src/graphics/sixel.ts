// Sixel graphics protocol implementation
// Supported by: XTerm, mlterm, WezTerm, foot, Alacritty (experimental)

import { diagnosticLogger } from '../utils/diagnostic-logger.ts'

interface SixelCapabilities {
  supported: boolean
  maxColors: number
  maxWidth: number
  maxHeight: number
}

interface SixelColor {
  index: number
  r: number
  g: number
  b: number
}

interface SixelImage {
  width: number
  height: number
  colors: SixelColor[]
  data: Uint8Array
}

export class SixelRenderer {
  private capabilities: SixelCapabilities | null = null

  // Detect if terminal supports Sixel graphics
  async detectSupport(): Promise<boolean> {
    try {
      // Query terminal capabilities using DA2 (Device Attributes)
      const encoder = new TextEncoder()
      const decoder = new TextDecoder()

      // Enable raw mode to capture response
      Deno.stdin.setRaw(true)

      // Send Device Attributes query
      await Deno.stdout.write(encoder.encode('\x1b[c'))

      // Read response with timeout
      const buffer = new Uint8Array(1024)
      const timeout = setTimeout(() => {
        Deno.stdin.setRaw(false)
      }, 100)

      let bytesRead = 0
      try {
        bytesRead = await Deno.stdin.read(buffer) || 0
      } catch {
        // Timeout or error
        clearTimeout(timeout)
        Deno.stdin.setRaw(false)
        return false
      }

      clearTimeout(timeout)
      Deno.stdin.setRaw(false)

      const response = decoder.decode(buffer.slice(0, bytesRead))

      // Check for Sixel support indicators
      const hasSixelSupport = response.includes('4') ||
        response.includes('?4') ||
        response.includes(';4;') ||
        Deno.env.get('TERM')?.includes('xterm') ||
        Deno.env.get('TERM')?.includes('mlterm') ||
        false

      if (hasSixelSupport) {
        this.capabilities = {
          supported: true,
          maxColors: 256,
          maxWidth: 1000,
          maxHeight: 1000,
        }
      }

      return hasSixelSupport
    } catch (error) {
      diagnosticLogger.warn('SixelRenderer', 'Error detecting Sixel support', error)
      return false
    }
  }

  // Convert RGB color to Sixel color definition
  private rgbToSixel(r: number, g: number, b: number): string {
    // Convert 8-bit RGB to Sixel color space (0-100 scale)
    const sixelR = Math.round((r / 255) * 100)
    const sixelG = Math.round((g / 255) * 100)
    const sixelB = Math.round((b / 255) * 100)

    return `${sixelR};${sixelG};${sixelB}`
  }

  // Encode image data as Sixel
  private encodeToSixel(imageData: SixelImage): string {
    let sixelData = '\x1bPq' // Start Sixel sequence

    // Define color palette
    for (const color of imageData.colors) {
      sixelData += `#${color.index};2;${this.rgbToSixel(color.r, color.g, color.b)}`
    }

    // Encode image data in 6-pixel high strips
    const width = imageData.width
    const height = imageData.height

    for (let y = 0; y < height; y += 6) {
      // Start new sixel line
      sixelData += '#0' // Select color 0

      for (let x = 0; x < width; x++) {
        let sixelByte = 0

        // Pack 6 vertical pixels into a sixel character
        for (let bit = 0; bit < 6 && (y + bit) < height; bit++) {
          const pixelIndex = (y + bit) * width + x
          if (pixelIndex < imageData.data.length && imageData.data[pixelIndex] > 0) {
            sixelByte |= 1 << bit
          }
        }

        // Convert to sixel character (add 63 to make printable)
        sixelData += String.fromCharCode(sixelByte + 63)
      }

      // End line with carriage return
      sixelData += '$' // Carriage return
      sixelData += '-' // Line feed
    }

    sixelData += '\x1b\\' // End Sixel sequence
    return sixelData
  }

  // Simple image processing: convert raw image to sixel format
  async processImage(imageBytes: Uint8Array, format: 'png' | 'jpeg'): Promise<SixelImage | null> {
    try {
      // For now, create a simple test pattern
      // In a real implementation, you'd decode the PNG/JPEG
      const width = 64
      const height = 64

      const colors: SixelColor[] = [
        { index: 0, r: 0, g: 0, b: 0 }, // Black
        { index: 1, r: 255, g: 0, b: 0 }, // Red
        { index: 2, r: 0, g: 255, b: 0 }, // Green
        { index: 3, r: 0, g: 0, b: 255 }, // Blue
        { index: 4, r: 255, g: 255, b: 255 }, // White
      ]

      const data = new Uint8Array(width * height)

      // Create a simple pattern for testing
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const index = y * width + x

          if (x < width / 4) {
            data[index] = 1 // Red
          } else if (x < width / 2) {
            data[index] = 2 // Green
          } else if (x < (3 * width) / 4) {
            data[index] = 3 // Blue
          } else {
            data[index] = 4 // White
          }
        }
      }

      return {
        width,
        height,
        colors,
        data,
      }
    } catch (error) {
      diagnosticLogger.error('SixelRenderer', 'Error processing image', error)
      return null
    }
  }

  // Render image using Sixel protocol
  async renderImage(imageBytes: Uint8Array, format: 'png' | 'jpeg'): Promise<boolean> {
    if (!this.capabilities?.supported) {
      const supported = await this.detectSupport()
      if (!supported) {
        diagnosticLogger.warn('SixelRenderer', 'Sixel graphics not supported')
        return false
      }
    }

    try {
      const sixelImage = await this.processImage(imageBytes, format)
      if (!sixelImage) {
        diagnosticLogger.error('SixelRenderer', 'Failed to process image')
        return false
      }

      const sixelData = this.encodeToSixel(sixelImage)

      // Output the Sixel data to terminal
      await Deno.stdout.write(new TextEncoder().encode(sixelData))

      return true
    } catch (error) {
      diagnosticLogger.error('SixelRenderer', 'Error rendering Sixel image', error)
      return false
    }
  }

  // Render text as Sixel graphics (for fancy text effects)
  async renderText(
    text: string,
    fontSize: number = 16,
    color: [number, number, number] = [255, 255, 255],
  ): Promise<boolean> {
    if (!this.capabilities?.supported) {
      const supported = await this.detectSupport()
      if (!supported) return false
    }

    try {
      // Create a simple bitmap font rendering
      const charWidth = Math.floor(fontSize * 0.6)
      const charHeight = fontSize
      const width = text.length * charWidth
      const height = charHeight

      const colors: SixelColor[] = [
        { index: 0, r: 0, g: 0, b: 0 },
        { index: 1, r: color[0], g: color[1], b: color[2] },
      ]

      const data = new Uint8Array(width * height)

      // Simple bitmap rendering (just filled rectangles for now)
      for (let i = 0; i < text.length; i++) {
        const startX = i * charWidth

        for (let y = 2; y < height - 2; y++) {
          for (let x = startX + 2; x < startX + charWidth - 2; x++) {
            if (x < width) {
              data[y * width + x] = 1
            }
          }
        }
      }

      const sixelImage: SixelImage = {
        width,
        height,
        colors,
        data,
      }

      const sixelData = this.encodeToSixel(sixelImage)
      await Deno.stdout.write(new TextEncoder().encode(sixelData))

      return true
    } catch (error) {
      diagnosticLogger.error('SixelRenderer', 'Error rendering Sixel text', error)
      return false
    }
  }

  // Get current capabilities
  getCapabilities(): SixelCapabilities | null {
    return this.capabilities
  }

  // Clear Sixel graphics
  async clear(): Promise<void> {
    // Send clear sequence
    await Deno.stdout.write(new TextEncoder().encode('\x1b[2J'))
  }
}

// Export singleton instance
export const sixelRenderer = new SixelRenderer()

export type { SixelCapabilities, SixelColor, SixelImage }
