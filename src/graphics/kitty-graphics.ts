// Kitty Graphics Protocol implementation
// Advanced features: transparency, positioning, animations, compression

import { encodeBase64 } from '@std/encoding/base64'
import { diagnosticLogger } from '../utils/diagnostic-logger.ts'

interface KittyCapabilities {
  supported: boolean
  version: string
  maxTransmissionSize: number
  supportsTransparency: boolean
  supportsAnimation: boolean
  supportsCompression: boolean
}

interface KittyImageOptions {
  id?: number
  placement?: {
    x?: number
    y?: number
    width?: number
    height?: number
    columns?: number
    rows?: number
  }
  z_index?: number
  transparency?: boolean
  delete?: boolean
}

interface KittyAnimationFrame {
  imageId: number
  duration: number // in milliseconds
  gap?: number
}

export class KittyRenderer {
  private capabilities: KittyCapabilities | null = null
  private nextImageId = 1
  private imageRegistry = new Map<number, string>()

  // Detect Kitty graphics protocol support
  async detectSupport(): Promise<boolean> {
    try {
      // Check if we're in Kitty terminal
      const term = Deno.env.get('TERM')
      const kittyWindow = Deno.env.get('KITTY_WINDOW_ID')

      if (term === 'xterm-kitty' || kittyWindow) {
        this.capabilities = {
          supported: true,
          version: '0.26.0', // Assume recent version
          maxTransmissionSize: 4096,
          supportsTransparency: true,
          supportsAnimation: true,
          supportsCompression: true,
        }
        return true
      }

      // Query graphics protocol support
      const encoder = new TextEncoder()
      const decoder = new TextDecoder()

      Deno.stdin.setRaw(true)

      // Send graphics capability query
      await Deno.stdout.write(encoder.encode('\x1b_Gi=1,a=q;\x1b\\'))

      const buffer = new Uint8Array(1024)
      const timeout = setTimeout(() => {
        Deno.stdin.setRaw(false)
      }, 200)

      let bytesRead = 0
      try {
        bytesRead = await Deno.stdin.read(buffer) || 0
      } catch {
        clearTimeout(timeout)
        Deno.stdin.setRaw(false)
        return false
      }

      clearTimeout(timeout)
      Deno.stdin.setRaw(false)

      const response = decoder.decode(buffer.slice(0, bytesRead))

      // Check for Kitty graphics response
      if (response.includes('_G') && response.includes('OK')) {
        this.capabilities = {
          supported: true,
          version: 'unknown',
          maxTransmissionSize: 4096,
          supportsTransparency: true,
          supportsAnimation: true,
          supportsCompression: false,
        }
        return true
      }

      return false
    } catch (error) {
      diagnosticLogger.warn('KittyRenderer', 'Error detecting Kitty graphics support', error)
      return false
    }
  }

  // Encode image data as base64 chunks
  private encodeImageData(imageData: Uint8Array): string[] {
    const base64Data = encodeBase64(imageData)
    const chunkSize = this.capabilities?.maxTransmissionSize || 4096
    const chunks: string[] = []

    for (let i = 0; i < base64Data.length; i += chunkSize) {
      chunks.push(base64Data.slice(i, i + chunkSize))
    }

    return chunks
  }

  // Create Kitty graphics escape sequence
  private createGraphicsSequence(
    action: string,
    payload: string = '',
    options: Record<string, string | number> = {},
  ): string {
    let sequence = '\x1b_G'

    // Add action
    sequence += `a=${action}`

    // Add options
    for (const [key, value] of Object.entries(options)) {
      sequence += `,${key}=${value}`
    }

    // Add payload if present
    if (payload) {
      sequence += `;${payload}`
    }

    sequence += '\x1b\\'
    return sequence
  }

  // Upload image data to terminal
  async uploadImage(
    imageData: Uint8Array,
    format: 'png' | 'jpeg' | 'gif',
    options: KittyImageOptions = {},
  ): Promise<number | null> {
    if (!this.capabilities?.supported) {
      const supported = await this.detectSupport()
      if (!supported) {
        diagnosticLogger.warn('KittyRenderer', 'Kitty graphics not supported')
        return null
      }
    }

    try {
      const imageId = options.id || this.nextImageId++
      const chunks = this.encodeImageData(imageData)

      // Transmission parameters
      const transmissionOptions: Record<string, string | number> = {
        f: format === 'png' ? 100 : format === 'jpeg' ? 24 : 1,
        i: imageId,
        t: 'd', // Direct transmission
      }

      // Add size information if available
      if (imageData.length > 0) {
        transmissionOptions.s = imageData.length
      }

      // Send image data in chunks
      for (let i = 0; i < chunks.length; i++) {
        const isLast = i === chunks.length - 1
        const chunkOptions = { ...transmissionOptions }

        if (i === 0) {
          // First chunk
          chunkOptions.m = chunks.length > 1 ? 1 : 0
        } else if (isLast) {
          // Last chunk
          chunkOptions.m = 0
          delete chunkOptions.f
          delete chunkOptions.s
        } else {
          // Middle chunk
          chunkOptions.m = 1
          delete chunkOptions.f
          delete chunkOptions.s
        }

        const sequence = this.createGraphicsSequence('T', chunks[i], chunkOptions)
        await Deno.stdout.write(new TextEncoder().encode(sequence))

        // Small delay between chunks
        if (!isLast) {
          await new Promise((resolve) => setTimeout(resolve, 1))
        }
      }

      // Store image reference
      this.imageRegistry.set(imageId, format)

      return imageId
    } catch (error) {
      diagnosticLogger.error('KittyRenderer', 'Error uploading Kitty image', error)
      return null
    }
  }

  // Display uploaded image
  async displayImage(imageId: number, options: KittyImageOptions = {}): Promise<boolean> {
    if (!this.capabilities?.supported) return false

    try {
      const displayOptions: Record<string, string | number> = {
        i: imageId,
      }

      // Position and size options
      if (options.placement) {
        const p = options.placement
        if (p.x !== undefined) displayOptions.x = p.x
        if (p.y !== undefined) displayOptions.y = p.y
        if (p.width !== undefined) displayOptions.w = p.width
        if (p.height !== undefined) displayOptions.h = p.height
        if (p.columns !== undefined) displayOptions.c = p.columns
        if (p.rows !== undefined) displayOptions.r = p.rows
      }

      // Z-index for layering
      if (options.z_index !== undefined) {
        displayOptions.z = options.z_index
      }

      const sequence = this.createGraphicsSequence('p', '', displayOptions)
      await Deno.stdout.write(new TextEncoder().encode(sequence))

      return true
    } catch (error) {
      diagnosticLogger.error('KittyRenderer', 'Error displaying Kitty image', error)
      return false
    }
  }

  // Delete image from terminal
  async deleteImage(imageId: number): Promise<boolean> {
    if (!this.capabilities?.supported) return false

    try {
      const sequence = this.createGraphicsSequence('d', '', { i: imageId })
      await Deno.stdout.write(new TextEncoder().encode(sequence))

      this.imageRegistry.delete(imageId)
      return true
    } catch (error) {
      diagnosticLogger.error('KittyRenderer', 'Error deleting Kitty image', error)
      return false
    }
  }

  // Create animation from multiple images
  async createAnimation(frames: KittyAnimationFrame[]): Promise<boolean> {
    if (!this.capabilities?.supported || !this.capabilities.supportsAnimation) {
      return false
    }

    try {
      // Display frames in sequence
      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i]

        // Display current frame
        await this.displayImage(frame.imageId, {
          placement: { x: 0, y: 0 },
        })

        // Wait for frame duration
        await new Promise((resolve) => setTimeout(resolve, frame.duration))

        // Clear previous frame (except for last frame)
        if (i < frames.length - 1) {
          await this.deleteImage(frame.imageId)

          // Optional gap between frames
          if (frame.gap) {
            await new Promise((resolve) => setTimeout(resolve, frame.gap))
          }
        }
      }

      return true
    } catch (error) {
      diagnosticLogger.error('KittyRenderer', 'Error creating Kitty animation', error)
      return false
    }
  }

  // Clear all images
  async clearAllImages(): Promise<boolean> {
    if (!this.capabilities?.supported) return false

    try {
      const sequence = this.createGraphicsSequence('d', '', { a: 'A' })
      await Deno.stdout.write(new TextEncoder().encode(sequence))

      this.imageRegistry.clear()
      return true
    } catch (error) {
      diagnosticLogger.error('KittyRenderer', 'Error clearing Kitty images', error)
      return false
    }
  }

  // Query image status
  async queryImage(imageId: number): Promise<boolean> {
    if (!this.capabilities?.supported) return false

    try {
      const sequence = this.createGraphicsSequence('q', '', { i: imageId })
      await Deno.stdout.write(new TextEncoder().encode(sequence))

      // In a real implementation, you'd wait for and parse the response
      return true
    } catch (error) {
      diagnosticLogger.error('KittyRenderer', 'Error querying Kitty image', error)
      return false
    }
  }

  // Upload and display image in one call
  async renderImage(
    imageData: Uint8Array,
    format: 'png' | 'jpeg' | 'gif',
    options: KittyImageOptions = {},
  ): Promise<boolean> {
    const imageId = await this.uploadImage(imageData, format, options)
    if (!imageId) return false

    return await this.displayImage(imageId, options)
  }

  // Create image from file
  async renderImageFromFile(
    filePath: string,
    options: KittyImageOptions = {},
  ): Promise<boolean> {
    try {
      const imageData = await Deno.readFile(filePath)

      // Detect format from file extension
      const ext = filePath.toLowerCase().split('.').pop()
      let format: 'png' | 'jpeg' | 'gif' = 'png'

      if (ext === 'jpg' || ext === 'jpeg') {
        format = 'jpeg'
      } else if (ext === 'gif') {
        format = 'gif'
      }

      return await this.renderImage(imageData, format, options)
    } catch (error) {
      diagnosticLogger.error('KittyRenderer', 'Error rendering image from file', error)
      return false
    }
  }

  // Get capabilities
  getCapabilities(): KittyCapabilities | null {
    return this.capabilities
  }

  // Get list of uploaded images
  getUploadedImages(): number[] {
    return Array.from(this.imageRegistry.keys())
  }
}

// Export singleton instance
export const kittyRenderer = new KittyRenderer()

export type { KittyAnimationFrame, KittyCapabilities, KittyImageOptions }
