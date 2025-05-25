import { ANSI_CODES } from '../core/constants.ts'
import { getVendoredLibraryPath, setupNotcursesLibraryPaths } from '../../vendor/notcurses/setup.ts'
import { diagnosticLogger } from '../utils/diagnostic-logger.ts'

// Platform-specific library paths - using vendored libraries
const getLibraryPath = (): string => {
  const os = Deno.build.os

  // Ensure library paths are set up
  setupNotcursesLibraryPaths()

  switch (os) {
    case 'darwin':
      return getVendoredLibraryPath('libnotcurses-core.dylib')
    case 'linux':
      return getVendoredLibraryPath('libnotcurses-core.so')
    case 'windows':
      return getVendoredLibraryPath('notcurses-core.dll')
    default:
      throw new Error(`Unsupported platform: ${os}`)
  }
}

// Notcurses initialization options
interface NotcursesOptions {
  flags?: number
  logLevel?: number
  margins?: {
    top: number
    right: number
    bottom: number
    left: number
  }
}

// Notcurses plane options
interface PlaneOptions {
  y: number
  x: number
  rows: number
  cols: number
  userptr?: number
  name?: string
  resizecb?: number
  flags?: number
  margin_b?: number
  margin_r?: number
}

let libnotcurses:
  | Deno.DynamicLibrary<{
    notcurses_core_init: {
      parameters: ['pointer', 'pointer']
      result: 'pointer'
    }
    notcurses_stop: {
      parameters: ['pointer']
      result: 'i32'
    }
    ncpile_render: {
      parameters: ['pointer']
      result: 'i32'
    }
    notcurses_stdplane: {
      parameters: ['pointer']
      result: 'pointer'
    }
    ncplane_create: {
      parameters: ['pointer', 'pointer']
      result: 'pointer'
    }
    ncplane_cursor_move_yx: {
      parameters: ['pointer', 'i32', 'i32']
      result: 'i32'
    }
    ncplane_puttext: {
      parameters: ['pointer', 'i32', 'i32', 'buffer', 'pointer']
      result: 'i32'
    }
    ncplane_putc_yx: {
      parameters: ['pointer', 'i32', 'i32', 'u32']
      result: 'i32'
    }
    ncplane_set_fg_rgb8: {
      parameters: ['pointer', 'u32', 'u32', 'u32']
      result: 'i32'
    }
    ncplane_set_bg_rgb8: {
      parameters: ['pointer', 'u32', 'u32', 'u32']
      result: 'i32'
    }
    ncplane_erase: {
      parameters: ['pointer']
      result: 'void'
    }
    ncplane_destroy: {
      parameters: ['pointer']
      result: 'void'
    }
    ncvisual_from_file: {
      parameters: ['buffer']
      result: 'pointer'
    }
    ncvisual_blit: {
      parameters: ['pointer', 'pointer', 'pointer']
      result: 'i32'
    }
    ncvisual_destroy: {
      parameters: ['pointer']
      result: 'void'
    }
  }>
  | null = null

// Initialize the FFI library
const initializeFFI = (): void => {
  if (libnotcurses) return

  try {
    const libraryPath = getLibraryPath()
    diagnosticLogger.info('NotcursesFFI', `Loading notcurses library from: ${libraryPath}`)

    libnotcurses = Deno.dlopen(libraryPath, {
      notcurses_core_init: {
        parameters: ['pointer', 'pointer'],
        result: 'pointer',
      },
      notcurses_stop: {
        parameters: ['pointer'],
        result: 'i32',
      },
      ncpile_render: {
        parameters: ['pointer'],
        result: 'i32',
      },
      notcurses_stdplane: {
        parameters: ['pointer'],
        result: 'pointer',
      },
      ncplane_create: {
        parameters: ['pointer', 'pointer'],
        result: 'pointer',
      },
      ncplane_cursor_move_yx: {
        parameters: ['pointer', 'i32', 'i32'],
        result: 'i32',
      },
      ncplane_puttext: {
        parameters: ['pointer', 'i32', 'i32', 'buffer', 'pointer'],
        result: 'i32',
      },
      ncplane_putc_yx: {
        parameters: ['pointer', 'i32', 'i32', 'u32'],
        result: 'i32',
      },
      ncplane_set_fg_rgb8: {
        parameters: ['pointer', 'u32', 'u32', 'u32'],
        result: 'i32',
      },
      ncplane_set_bg_rgb8: {
        parameters: ['pointer', 'u32', 'u32', 'u32'],
        result: 'i32',
      },
      ncplane_erase: {
        parameters: ['pointer'],
        result: 'void',
      },
      ncplane_destroy: {
        parameters: ['pointer'],
        result: 'void',
      },
      ncvisual_from_file: {
        parameters: ['buffer'],
        result: 'pointer',
      },
      ncvisual_blit: {
        parameters: ['pointer', 'pointer', 'pointer'],
        result: 'i32',
      },
      ncvisual_destroy: {
        parameters: ['pointer'],
        result: 'void',
      },
    })

    diagnosticLogger.info('NotcursesFFI', 'Notcurses FFI loaded successfully')
  } catch (error) {
    diagnosticLogger.warn(
      'NotcursesFFI',
      'Notcurses FFI not available, falling back to ANSI mode',
      error,
    )
    libnotcurses = null
  }
}

// Safe wrapper class for Notcurses functionality
export class NotcursesWrapper {
  private nc: Deno.PointerValue | null = null
  private standardPlane: Deno.PointerValue | null = null
  private isInitialized = false

  constructor() {
    initializeFFI()
  }

  // Check if Notcurses is available
  isAvailable(): boolean {
    return libnotcurses !== null
  }

  // Initialize Notcurses
  async init(options: NotcursesOptions = {}): Promise<boolean> {
    if (!libnotcurses) {
      diagnosticLogger.warn('NotcursesFFI', 'Notcurses not available, using fallback')
      return false
    }

    try {
      // Create options structure
      const optionsBuffer = new Uint8Array(64) // Use Uint8Array instead of ArrayBuffer
      const optionsPtr = Deno.UnsafePointer.of(optionsBuffer)

      this.nc = libnotcurses.symbols.notcurses_core_init(
        optionsPtr,
        null, // No file output
      )

      if (!this.nc || this.nc === null) {
        throw new Error('Failed to initialize Notcurses')
      }

      this.standardPlane = libnotcurses.symbols.notcurses_stdplane(this.nc)
      if (!this.standardPlane) {
        throw new Error('Failed to get standard plane')
      }

      this.isInitialized = true
      return true
    } catch (error) {
      diagnosticLogger.error('NotcursesFFI', 'Notcurses initialization failed', error)
      return false
    }
  }

  // Stop Notcurses and cleanup
  stop(): void {
    if (!libnotcurses || !this.nc) return

    try {
      libnotcurses.symbols.notcurses_stop(this.nc)
      this.nc = null
      this.standardPlane = null
      this.isInitialized = false
    } catch (error) {
      diagnosticLogger.error('NotcursesFFI', 'Error stopping Notcurses', error)
    }
  }

  // Render the screen
  render(): boolean {
    if (!libnotcurses || !this.nc) return false

    try {
      const result = libnotcurses.symbols.ncpile_render(this.standardPlane)
      return result >= 0
    } catch (error) {
      diagnosticLogger.error('NotcursesFFI', 'Render error', error)
      return false
    }
  }

  // Create a new plane
  createPlane(options: PlaneOptions): Deno.PointerValue | null {
    if (!libnotcurses || !this.standardPlane) return null

    try {
      const optionsBuffer = new Uint8Array(64)
      const view = new DataView(optionsBuffer.buffer)

      // Pack plane options into buffer
      view.setInt32(0, options.y, true)
      view.setInt32(4, options.x, true)
      view.setInt32(8, options.rows, true)
      view.setInt32(12, options.cols, true)

      const optionsPtr = Deno.UnsafePointer.of(optionsBuffer)
      const plane = libnotcurses.symbols.ncplane_create(
        this.standardPlane,
        optionsPtr,
      )

      return plane
    } catch (error) {
      diagnosticLogger.error('NotcursesFFI', 'Error creating plane', error)
      return null
    }
  }

  // Put text at coordinates on a plane
  putText(plane: Deno.PointerValue, y: number, x: number, text: string): boolean {
    if (!libnotcurses) return false

    try {
      // Use ncplane_puttext which is globally exported
      const textBuffer = new TextEncoder().encode(text + '\0')
      const result = libnotcurses.symbols.ncplane_puttext(plane, y, x, textBuffer, null)
      return result >= 0
    } catch (error) {
      diagnosticLogger.error('NotcursesFFI', 'Error putting text', error)

      // Fallback: try character by character
      try {
        let success = true
        for (let i = 0; i < text.length; i++) {
          const charCode = text.charCodeAt(i)
          const result = libnotcurses.symbols.ncplane_putc_yx(plane, y, x + i, charCode)
          if (result < 0) {
            success = false
            break
          }
        }
        return success
      } catch (fallbackError) {
        diagnosticLogger.error(
          'NotcursesFFI',
          'Error with fallback character output',
          fallbackError,
        )
        return false
      }
    }
  }

  // Set foreground color (24-bit RGB) - Fixed parameters
  setForegroundColor(plane: Deno.PointerValue, r: number, g: number, b: number): boolean {
    if (!libnotcurses) return false

    try {
      const result = libnotcurses.symbols.ncplane_set_fg_rgb8(plane, r, g, b)
      return result >= 0
    } catch (error) {
      diagnosticLogger.error('NotcursesFFI', 'Error setting foreground color', error)
      return false
    }
  }

  // Set background color (24-bit RGB) - Fixed parameters
  setBackgroundColor(plane: Deno.PointerValue, r: number, g: number, b: number): boolean {
    if (!libnotcurses) return false

    try {
      const result = libnotcurses.symbols.ncplane_set_bg_rgb8(plane, r, g, b)
      return result >= 0
    } catch (error) {
      diagnosticLogger.error('NotcursesFFI', 'Error setting background color', error)
      return false
    }
  }

  // Clear a plane
  clearPlane(plane: Deno.PointerValue): void {
    if (!libnotcurses) return

    try {
      libnotcurses.symbols.ncplane_erase(plane)
    } catch (error) {
      diagnosticLogger.error('NotcursesFFI', 'Error clearing plane', error)
    }
  }

  // Destroy a plane
  destroyPlane(plane: Deno.PointerValue): void {
    if (!libnotcurses) return

    try {
      libnotcurses.symbols.ncplane_destroy(plane)
    } catch (error) {
      diagnosticLogger.error('NotcursesFFI', 'Error destroying plane', error)
    }
  }

  // Load and display an image
  async loadImage(filePath: string): Promise<Deno.PointerValue | null> {
    if (!libnotcurses) return null

    try {
      const pathBuffer = new TextEncoder().encode(filePath + '\0')
      const visual = libnotcurses.symbols.ncvisual_from_file(pathBuffer)
      return visual
    } catch (error) {
      diagnosticLogger.error('NotcursesFFI', 'Error loading image', error)
      return null
    }
  }

  // Display an image visual
  displayImage(visual: Deno.PointerValue, plane: Deno.PointerValue): boolean {
    if (!libnotcurses) return false

    try {
      const result = libnotcurses.symbols.ncvisual_blit(visual, plane, null)
      return result >= 0
    } catch (error) {
      diagnosticLogger.error('NotcursesFFI', 'Error displaying image', error)
      return false
    }
  }

  // Cleanup image visual
  destroyVisual(visual: Deno.PointerValue): void {
    if (!libnotcurses) return

    try {
      libnotcurses.symbols.ncvisual_destroy(visual)
    } catch (error) {
      diagnosticLogger.error('NotcursesFFI', 'Error destroying visual', error)
    }
  }

  // Get standard plane
  getStandardPlane(): Deno.PointerValue | null {
    return this.standardPlane
  }

  // Check if initialized
  getIsInitialized(): boolean {
    return this.isInitialized
  }
}

// Export singleton instance
export const notcurses = new NotcursesWrapper()

export type { NotcursesOptions, PlaneOptions }
