// Advanced Color and Transparency System
// Implements 24-bit RGB color with alpha blending and advanced color management

export interface ColorChannel {
  r: number
  g: number
  b: number
  a: number
}

export enum AlphaMode {
  TRANSPARENT = 'transparent', // select next color
  BLEND = 'blend', // average colors
  OPAQUE = 'opaque', // use color unchanged
  HIGHCONTRAST = 'highcontrast', // complement background
}

export interface Sprite {
  visual: unknown // Would be actual ncvisual in full implementation
  transparentColor?: ColorChannel
  width: number
  height: number
}

export class AdvancedColorSystem {
  // Create a color channel with RGBA values
  createChannel(
    r: number,
    g: number,
    b: number,
    alpha: AlphaMode = AlphaMode.OPAQUE,
  ): ColorChannel {
    // Clamp values to valid ranges
    const clampedR = Math.max(0, Math.min(255, Math.floor(r)))
    const clampedG = Math.max(0, Math.min(255, Math.floor(g)))
    const clampedB = Math.max(0, Math.min(255, Math.floor(b)))

    // Convert alpha mode to numeric value
    let alphaValue = 255
    switch (alpha) {
      case AlphaMode.TRANSPARENT:
        alphaValue = 0
        break
      case AlphaMode.BLEND:
        alphaValue = 128
        break
      case AlphaMode.OPAQUE:
        alphaValue = 255
        break
      case AlphaMode.HIGHCONTRAST:
        alphaValue = 200 // Custom value for high contrast
        break
    }

    return {
      r: clampedR,
      g: clampedG,
      b: clampedB,
      a: alphaValue,
    }
  }

  // Create color from hex string
  createChannelFromHex(hex: string, alpha: AlphaMode = AlphaMode.OPAQUE): ColorChannel {
    // Remove # if present
    const cleanHex = hex.replace('#', '')

    // Parse hex values
    const r = parseInt(cleanHex.substr(0, 2), 16) || 0
    const g = parseInt(cleanHex.substr(2, 2), 16) || 0
    const b = parseInt(cleanHex.substr(4, 2), 16) || 0

    return this.createChannel(r, g, b, alpha)
  }

  // Create gradient between two colors
  createGradient(
    start: ColorChannel,
    end: ColorChannel,
    steps: number,
  ): ColorChannel[] {
    if (steps <= 0) return []
    if (steps === 1) return [start]

    const colors: ColorChannel[] = []

    for (let i = 0; i < steps; i++) {
      const ratio = i / (steps - 1)
      const invRatio = 1 - ratio

      const r = Math.round(start.r * invRatio + end.r * ratio)
      const g = Math.round(start.g * invRatio + end.g * ratio)
      const b = Math.round(start.b * invRatio + end.b * ratio)
      const a = Math.round(start.a * invRatio + end.a * ratio)

      colors.push({ r, g, b, a })
    }

    return colors
  }

  // Blend two colors based on alpha
  blendColors(foreground: ColorChannel, background: ColorChannel): ColorChannel {
    const alpha = foreground.a / 255
    const invAlpha = 1 - alpha

    return {
      r: Math.round(foreground.r * alpha + background.r * invAlpha),
      g: Math.round(foreground.g * alpha + background.g * invAlpha),
      b: Math.round(foreground.b * alpha + background.b * invAlpha),
      a: Math.max(foreground.a, background.a),
    }
  }

  // Apply transparency effect to a color
  applyTransparency(color: ColorChannel, mode: AlphaMode): ColorChannel {
    const result = { ...color }

    switch (mode) {
      case AlphaMode.TRANSPARENT:
        result.a = 0
        break
      case AlphaMode.BLEND:
        result.a = Math.round(result.a * 0.5)
        break
      case AlphaMode.OPAQUE:
        result.a = 255
        break
      case AlphaMode.HIGHCONTRAST:
        // Increase contrast by adjusting RGB values
        result.r = result.r > 127 ? 255 : 0
        result.g = result.g > 127 ? 255 : 0
        result.b = result.b > 127 ? 255 : 0
        result.a = 255
        break
    }

    return result
  }

  // Get complementary color (for high contrast mode)
  getComplementaryColor(color: ColorChannel): ColorChannel {
    return {
      r: 255 - color.r,
      g: 255 - color.g,
      b: 255 - color.b,
      a: color.a,
    }
  }

  // Convert color to grayscale
  toGrayscale(color: ColorChannel): ColorChannel {
    // Use luminance formula for accurate grayscale conversion
    const gray = Math.round(0.299 * color.r + 0.587 * color.g + 0.114 * color.b)

    return {
      r: gray,
      g: gray,
      b: gray,
      a: color.a,
    }
  }

  // Adjust color brightness
  adjustBrightness(color: ColorChannel, factor: number): ColorChannel {
    const clampedFactor = Math.max(0, Math.min(2, factor)) // Clamp between 0 and 2

    return {
      r: Math.min(255, Math.round(color.r * clampedFactor)),
      g: Math.min(255, Math.round(color.g * clampedFactor)),
      b: Math.min(255, Math.round(color.b * clampedFactor)),
      a: color.a,
    }
  }

  // Adjust color saturation
  adjustSaturation(color: ColorChannel, factor: number): ColorChannel {
    const gray = this.toGrayscale(color)
    const clampedFactor = Math.max(0, Math.min(2, factor))

    return {
      r: Math.round(gray.r + (color.r - gray.r) * clampedFactor),
      g: Math.round(gray.g + (color.g - gray.g) * clampedFactor),
      b: Math.round(gray.b + (color.b - gray.b) * clampedFactor),
      a: color.a,
    }
  }

  // Convert ColorChannel to CSS color string
  toCSSColor(color: ColorChannel): string {
    if (color.a === 255) {
      return `rgb(${color.r}, ${color.g}, ${color.b})`
    } else {
      const alpha = color.a / 255
      return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha.toFixed(3)})`
    }
  }

  // Convert ColorChannel to hex string
  toHexColor(color: ColorChannel): string {
    const toHex = (value: number) => {
      const hex = Math.round(value).toString(16)
      return hex.length === 1 ? '0' + hex : hex
    }

    return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`
  }

  // Create sprite with transparency support
  createSprite(
    visual: unknown, // Would be actual ncvisual in full implementation
    options: {
      transparentColor?: ColorChannel
      width: number
      height: number
    },
  ): Sprite {
    return {
      visual,
      transparentColor: options.transparentColor,
      width: options.width,
      height: options.height,
    }
  }

  // Get color luminance (for contrast calculations)
  getLuminance(color: ColorChannel): number {
    // Convert to relative luminance using sRGB formula
    const normalize = (c: number) => {
      const normalized = c / 255
      return normalized <= 0.03928
        ? normalized / 12.92
        : Math.pow((normalized + 0.055) / 1.055, 2.4)
    }

    const r = normalize(color.r)
    const g = normalize(color.g)
    const b = normalize(color.b)

    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }

  // Calculate contrast ratio between two colors
  getContrastRatio(color1: ColorChannel, color2: ColorChannel): number {
    const lum1 = this.getLuminance(color1)
    const lum2 = this.getLuminance(color2)

    const lighter = Math.max(lum1, lum2)
    const darker = Math.min(lum1, lum2)

    return (lighter + 0.05) / (darker + 0.05)
  }

  // Check if color combination meets WCAG accessibility standards
  meetsWCAGContrast(
    foreground: ColorChannel,
    background: ColorChannel,
    level: 'AA' | 'AAA' = 'AA',
  ): boolean {
    const ratio = this.getContrastRatio(foreground, background)
    const threshold = level === 'AAA' ? 7 : 4.5

    return ratio >= threshold
  }

  // Find accessible color variant
  findAccessibleColor(
    color: ColorChannel,
    background: ColorChannel,
    level: 'AA' | 'AAA' = 'AA',
  ): ColorChannel {
    if (this.meetsWCAGContrast(color, background, level)) {
      return color
    }

    // Try making the color darker or lighter
    let adjusted = color
    let factor = 0.8

    // Try darkening first
    for (let i = 0; i < 10; i++) {
      adjusted = this.adjustBrightness(color, factor)
      if (this.meetsWCAGContrast(adjusted, background, level)) {
        return adjusted
      }
      factor -= 0.1
    }

    // Try lightening if darkening didn't work
    factor = 1.2
    for (let i = 0; i < 10; i++) {
      adjusted = this.adjustBrightness(color, factor)
      if (this.meetsWCAGContrast(adjusted, background, level)) {
        return adjusted
      }
      factor += 0.1
    }

    // If still no success, return high contrast version
    return this.getComplementaryColor(background)
  }

  // Predefined color palettes
  static readonly PALETTE = {
    // Material Design colors
    RED: { r: 244, g: 67, b: 54, a: 255 },
    PINK: { r: 233, g: 30, b: 99, a: 255 },
    PURPLE: { r: 156, g: 39, b: 176, a: 255 },
    DEEP_PURPLE: { r: 103, g: 58, b: 183, a: 255 },
    INDIGO: { r: 63, g: 81, b: 181, a: 255 },
    BLUE: { r: 33, g: 150, b: 243, a: 255 },
    LIGHT_BLUE: { r: 3, g: 169, b: 244, a: 255 },
    CYAN: { r: 0, g: 188, b: 212, a: 255 },
    TEAL: { r: 0, g: 150, b: 136, a: 255 },
    GREEN: { r: 76, g: 175, b: 80, a: 255 },
    LIGHT_GREEN: { r: 139, g: 195, b: 74, a: 255 },
    LIME: { r: 205, g: 220, b: 57, a: 255 },
    YELLOW: { r: 255, g: 235, b: 59, a: 255 },
    AMBER: { r: 255, g: 193, b: 7, a: 255 },
    ORANGE: { r: 255, g: 152, b: 0, a: 255 },
    DEEP_ORANGE: { r: 255, g: 87, b: 34, a: 255 },
    BROWN: { r: 121, g: 85, b: 72, a: 255 },
    GREY: { r: 158, g: 158, b: 158, a: 255 },
    BLUE_GREY: { r: 96, g: 125, b: 139, a: 255 },

    // Basic colors
    BLACK: { r: 0, g: 0, b: 0, a: 255 },
    WHITE: { r: 255, g: 255, b: 255, a: 255 },
    TRANSPARENT: { r: 0, g: 0, b: 0, a: 0 },

    // Terminal colors (ANSI)
    ANSI_BLACK: { r: 0, g: 0, b: 0, a: 255 },
    ANSI_RED: { r: 128, g: 0, b: 0, a: 255 },
    ANSI_GREEN: { r: 0, g: 128, b: 0, a: 255 },
    ANSI_YELLOW: { r: 128, g: 128, b: 0, a: 255 },
    ANSI_BLUE: { r: 0, g: 0, b: 128, a: 255 },
    ANSI_MAGENTA: { r: 128, g: 0, b: 128, a: 255 },
    ANSI_CYAN: { r: 0, g: 128, b: 128, a: 255 },
    ANSI_WHITE: { r: 192, g: 192, b: 192, a: 255 },

    // Bright ANSI colors
    ANSI_BRIGHT_BLACK: { r: 128, g: 128, b: 128, a: 255 },
    ANSI_BRIGHT_RED: { r: 255, g: 0, b: 0, a: 255 },
    ANSI_BRIGHT_GREEN: { r: 0, g: 255, b: 0, a: 255 },
    ANSI_BRIGHT_YELLOW: { r: 255, g: 255, b: 0, a: 255 },
    ANSI_BRIGHT_BLUE: { r: 0, g: 0, b: 255, a: 255 },
    ANSI_BRIGHT_MAGENTA: { r: 255, g: 0, b: 255, a: 255 },
    ANSI_BRIGHT_CYAN: { r: 0, g: 255, b: 255, a: 255 },
    ANSI_BRIGHT_WHITE: { r: 255, g: 255, b: 255, a: 255 },
  } as const
}

// Export singleton instance
export const colorSystem = new AdvancedColorSystem()
