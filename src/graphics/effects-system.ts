// Advanced Effects System
// Implements visual effects using notcurses capabilities including fades,
// gradients, animations, and other advanced graphical effects

import type { EffectCallback, PlaneContext } from './plane-manager.ts'
import { type ColorChannel, colorSystem } from './color-system.ts'
import { notcurses } from './notcurses-ffi.ts'

export enum GradientDirection {
  HORIZONTAL = 'horizontal',
  VERTICAL = 'vertical',
  DIAGONAL_DOWN = 'diagonal-down',
  DIAGONAL_UP = 'diagonal-up',
  RADIAL = 'radial',
}

export interface AnimationOptions {
  duration: number
  easing?: EasingFunction
  loop?: boolean
  reverse?: boolean
  delay?: number
}

export interface FadeOptions {
  duration: number
  startAlpha?: number
  endAlpha?: number
  callback?: EffectCallback
}

export interface PulseOptions {
  period: number
  minAlpha?: number
  maxAlpha?: number
  callback?: EffectCallback
}

export type EasingFunction = (t: number) => number

export class EffectsSystem {
  private activeAnimations = new Map<string, Animation>()
  private animationId = 0

  // Fade plane in over specified duration
  async fadeIn(
    plane: PlaneContext,
    duration: number,
    callback?: EffectCallback,
  ): Promise<void> {
    return this.fade(plane, {
      duration,
      startAlpha: 0,
      endAlpha: 255,
      callback,
    })
  }

  // Fade plane out over specified duration
  async fadeOut(
    plane: PlaneContext,
    duration: number,
    callback?: EffectCallback,
  ): Promise<void> {
    return this.fade(plane, {
      duration,
      startAlpha: 255,
      endAlpha: 0,
      callback,
    })
  }

  // Generic fade implementation
  async fade(plane: PlaneContext, options: FadeOptions): Promise<void> {
    const { duration, startAlpha = 255, endAlpha = 0, callback } = options
    const steps = Math.max(10, Math.min(100, Math.floor(duration / 16))) // ~60 FPS
    const alphaStep = (endAlpha - startAlpha) / steps
    const timeStep = duration / steps

    for (let i = 0; i <= steps; i++) {
      const currentAlpha = startAlpha + (alphaStep * i)
      const progress = i / steps

      // Apply alpha to plane (placeholder - would need actual notcurses alpha support)
      this.setPlaneAlpha(plane, currentAlpha)

      // Call callback if provided
      if (callback && callback(i, steps)) {
        break // Stop if callback returns true
      }

      // Wait for next frame
      if (i < steps) {
        await this.delay(timeStep)
      }
    }
  }

  // Create linear gradient on plane
  createLinearGradient(
    plane: PlaneContext,
    direction: GradientDirection,
    colors: ColorChannel[],
  ): void {
    if (colors.length < 2) return

    const { width, height } = plane.dimensions

    switch (direction) {
      case GradientDirection.HORIZONTAL:
        this.drawHorizontalGradient(plane, colors, width, height)
        break
      case GradientDirection.VERTICAL:
        this.drawVerticalGradient(plane, colors, width, height)
        break
      case GradientDirection.DIAGONAL_DOWN:
        this.drawDiagonalGradient(plane, colors, width, height, false)
        break
      case GradientDirection.DIAGONAL_UP:
        this.drawDiagonalGradient(plane, colors, width, height, true)
        break
      case GradientDirection.RADIAL:
        this.drawRadialGradient(plane, colors, width, height)
        break
    }
  }

  // Pulse effect - fade in and out continuously
  async pulse(
    plane: PlaneContext,
    options: PulseOptions,
  ): Promise<void> {
    const { period, minAlpha = 0, maxAlpha = 255, callback } = options
    const halfPeriod = period / 2
    let iteration = 0

    while (true) {
      // Fade in
      await this.fade(plane, {
        duration: halfPeriod,
        startAlpha: minAlpha,
        endAlpha: maxAlpha,
        callback: callback ? (i, steps) => callback(iteration * 2 + i, steps * 2) : undefined,
      })

      // Fade out
      await this.fade(plane, {
        duration: halfPeriod,
        startAlpha: maxAlpha,
        endAlpha: minAlpha,
        callback: callback
          ? (i, steps) => callback(iteration * 2 + steps + i, steps * 2)
          : undefined,
      })

      iteration++

      // Check if callback wants to stop
      if (callback && callback(iteration, -1)) {
        break
      }
    }
  }

  // Slide animation
  async slide(
    plane: PlaneContext,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    options: AnimationOptions,
  ): Promise<void> {
    const { duration, easing = this.easeInOutQuad } = options
    const steps = Math.floor(duration / 16) // ~60 FPS
    const deltaX = toX - fromX
    const deltaY = toY - fromY

    for (let i = 0; i <= steps; i++) {
      const progress = easing(i / steps)
      const currentX = fromX + (deltaX * progress)
      const currentY = fromY + (deltaY * progress)

      // Move plane to current position
      plane.options.x = Math.round(currentX)
      plane.options.y = Math.round(currentY)

      await this.delay(duration / steps)
    }
  }

  // Scale animation
  async scale(
    plane: PlaneContext,
    fromScale: number,
    toScale: number,
    options: AnimationOptions,
  ): Promise<void> {
    const { duration, easing = this.easeInOutQuad } = options
    const steps = Math.floor(duration / 16)
    const deltaScale = toScale - fromScale
    const originalWidth = plane.dimensions.width
    const originalHeight = plane.dimensions.height

    for (let i = 0; i <= steps; i++) {
      const progress = easing(i / steps)
      const currentScale = fromScale + (deltaScale * progress)

      const newWidth = Math.round(originalWidth * currentScale)
      const newHeight = Math.round(originalHeight * currentScale)

      // Resize plane
      plane.dimensions.width = newWidth
      plane.dimensions.height = newHeight

      await this.delay(duration / steps)
    }
  }

  // Rotation effect (text-based approximation)
  async rotate(
    plane: PlaneContext,
    fromAngle: number,
    toAngle: number,
    options: AnimationOptions,
  ): Promise<void> {
    const { duration, easing = this.easeInOutQuad } = options
    const steps = Math.floor(duration / 16)
    const deltaAngle = toAngle - fromAngle

    for (let i = 0; i <= steps; i++) {
      const progress = easing(i / steps)
      const currentAngle = fromAngle + (deltaAngle * progress)

      // Apply rotation effect (placeholder - would need actual rotation implementation)
      this.applyRotationEffect(plane, currentAngle)

      await this.delay(duration / steps)
    }
  }

  // Typewriter effect for text
  async typewriter(
    plane: PlaneContext,
    text: string,
    options: {
      speed?: number // Characters per second
      cursor?: boolean // Show blinking cursor
      sound?: boolean // Make typing sounds (if supported)
    } = {},
  ): Promise<void> {
    const { speed = 10, cursor = true } = options
    const charDelay = 1000 / speed

    // Clear plane first
    notcurses.clearPlane(plane.handle)

    for (let i = 0; i <= text.length; i++) {
      const currentText = text.substring(0, i)
      const displayText = cursor && i < text.length ? currentText + '|' : currentText

      // Clear and redraw
      notcurses.clearPlane(plane.handle)
      notcurses.putText(plane.handle, 0, 0, displayText)

      if (i < text.length) {
        await this.delay(charDelay)
      }
    }

    // Remove cursor if it was shown
    if (cursor) {
      notcurses.clearPlane(plane.handle)
      notcurses.putText(plane.handle, 0, 0, text)
    }
  }

  // Blink effect
  async blink(
    plane: PlaneContext,
    options: {
      count?: number // Number of blinks, -1 for infinite
      onDuration?: number
      offDuration?: number
    } = {},
  ): Promise<void> {
    const { count = 3, onDuration = 500, offDuration = 500 } = options
    let blinks = 0

    while (count === -1 || blinks < count) {
      // Show
      plane.isVisible = true
      await this.delay(onDuration)

      // Hide
      plane.isVisible = false
      await this.delay(offDuration)

      blinks++
    }

    // Ensure visible at end
    plane.isVisible = true
  }

  // Shake effect
  async shake(
    plane: PlaneContext,
    options: {
      intensity?: number
      duration?: number
      direction?: 'horizontal' | 'vertical' | 'both'
    } = {},
  ): Promise<void> {
    const { intensity = 2, duration = 500, direction = 'both' } = options
    const originalX = plane.options.x
    const originalY = plane.options.y
    const steps = Math.floor(duration / 16)

    for (let i = 0; i < steps; i++) {
      let offsetX = 0
      let offsetY = 0

      if (direction === 'horizontal' || direction === 'both') {
        offsetX = (Math.random() - 0.5) * intensity * 2
      }

      if (direction === 'vertical' || direction === 'both') {
        offsetY = (Math.random() - 0.5) * intensity * 2
      }

      plane.options.x = originalX + Math.round(offsetX)
      plane.options.y = originalY + Math.round(offsetY)

      await this.delay(duration / steps)
    }

    // Restore original position
    plane.options.x = originalX
    plane.options.y = originalY
  }

  // Private helper methods
  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private setPlaneAlpha(plane: PlaneContext, alpha: number): void {
    // Placeholder for setting plane alpha
    // In full implementation, this would use notcurses alpha blending
    plane.isTransparent = alpha < 255
  }

  // Gradient drawing methods
  private drawHorizontalGradient(
    plane: PlaneContext,
    colors: ColorChannel[],
    width: number,
    height: number,
  ): void {
    for (let x = 0; x < width; x++) {
      const progress = x / (width - 1)
      const color = this.interpolateColors(colors, progress)

      for (let y = 0; y < height; y++) {
        this.setPixelColor(plane, x, y, color)
      }
    }
  }

  private drawVerticalGradient(
    plane: PlaneContext,
    colors: ColorChannel[],
    width: number,
    height: number,
  ): void {
    for (let y = 0; y < height; y++) {
      const progress = y / (height - 1)
      const color = this.interpolateColors(colors, progress)

      for (let x = 0; x < width; x++) {
        this.setPixelColor(plane, x, y, color)
      }
    }
  }

  private drawDiagonalGradient(
    plane: PlaneContext,
    colors: ColorChannel[],
    width: number,
    height: number,
    upward: boolean,
  ): void {
    const maxDistance = Math.sqrt(width * width + height * height)

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const distance = upward
          ? Math.sqrt((width - x) * (width - x) + y * y)
          : Math.sqrt(x * x + y * y)
        const progress = Math.min(1, distance / maxDistance)
        const color = this.interpolateColors(colors, progress)

        this.setPixelColor(plane, x, y, color)
      }
    }
  }

  private drawRadialGradient(
    plane: PlaneContext,
    colors: ColorChannel[],
    width: number,
    height: number,
  ): void {
    const centerX = width / 2
    const centerY = height / 2
    const maxRadius = Math.min(centerX, centerY)

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const distance = Math.sqrt((x - centerX) * (x - centerX) + (y - centerY) * (y - centerY))
        const progress = Math.min(1, distance / maxRadius)
        const color = this.interpolateColors(colors, progress)

        this.setPixelColor(plane, x, y, color)
      }
    }
  }

  private interpolateColors(colors: ColorChannel[], progress: number): ColorChannel {
    if (colors.length === 0) return { r: 0, g: 0, b: 0, a: 255 }
    if (colors.length === 1) return colors[0]

    const scaledProgress = progress * (colors.length - 1)
    const index = Math.floor(scaledProgress)
    const remainder = scaledProgress - index

    if (index >= colors.length - 1) return colors[colors.length - 1]

    const color1 = colors[index]
    const color2 = colors[index + 1]

    return {
      r: Math.round(color1.r + (color2.r - color1.r) * remainder),
      g: Math.round(color1.g + (color2.g - color1.g) * remainder),
      b: Math.round(color1.b + (color2.b - color1.b) * remainder),
      a: Math.round(color1.a + (color2.a - color1.a) * remainder),
    }
  }

  private setPixelColor(plane: PlaneContext, x: number, y: number, color: ColorChannel): void {
    // Placeholder for setting individual pixel colors
    // In full implementation, this would use notcurses cell manipulation
    try {
      notcurses.setBackgroundColor(plane.handle, color.r, color.g, color.b)
      notcurses.putText(plane.handle, y, x, ' ')
    } catch (error) {
      // Ignore errors for now
    }
  }

  private applyRotationEffect(plane: PlaneContext, angle: number): void {
    // Placeholder for rotation effect
    // In a text-based environment, this might involve character substitution
    // or other visual tricks to simulate rotation
  }

  // Easing functions
  private easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
  }

  private easeInQuad(t: number): number {
    return t * t
  }

  private easeOutQuad(t: number): number {
    return t * (2 - t)
  }

  private easeInCubic(t: number): number {
    return t * t * t
  }

  private easeOutCubic(t: number): number {
    return (--t) * t * t + 1
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1
  }

  // Animation management
  private createAnimation(id: string, animation: Animation): void {
    this.activeAnimations.set(id, animation)
  }

  private stopAnimation(id: string): void {
    const animation = this.activeAnimations.get(id)
    if (animation) {
      animation.stop()
      this.activeAnimations.delete(id)
    }
  }

  // Stop all animations
  stopAllAnimations(): void {
    for (const [id, animation] of this.activeAnimations) {
      animation.stop()
    }
    this.activeAnimations.clear()
  }

  // Get available easing functions
  static readonly EASING = {
    LINEAR: (t: number) => t,
    EASE_IN_QUAD: (t: number) => t * t,
    EASE_OUT_QUAD: (t: number) => t * (2 - t),
    EASE_IN_OUT_QUAD: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    EASE_IN_CUBIC: (t: number) => t * t * t,
    EASE_OUT_CUBIC: (t: number) => (--t) * t * t + 1,
    EASE_IN_OUT_CUBIC: (t: number) =>
      t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
    BOUNCE: (t: number) => {
      if (t < 1 / 2.75) return 7.5625 * t * t
      if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75
      if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375
      return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375
    },
  } as const
}

// Simple animation class
class Animation {
  private stopped = false

  constructor(private animationFn: () => void) {}

  stop(): void {
    this.stopped = true
  }

  isStopped(): boolean {
    return this.stopped
  }
}

// Export singleton instance
export const effectsSystem = new EffectsSystem()
