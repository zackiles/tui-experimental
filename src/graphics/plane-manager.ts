// Advanced Plane Management System
// Implements sophisticated plane management with z-ordered rendering,
// transparency support, and dynamic plane reordering

import { notcurses, type PlaneOptions } from './notcurses-ffi.ts'
import { diagnosticLogger } from '../utils/diagnostic-logger.ts'

export interface PlaneCreationOptions extends PlaneOptions {
  zIndex?: number
  transparent?: boolean
  parent?: PlaneContext
}

export interface PlaneContext {
  id: string
  handle: Deno.PointerValue
  options: PlaneCreationOptions
  dimensions: { width: number; height: number }
  zIndex: number
  isVisible: boolean
  isTransparent: boolean
  parent?: PlaneContext
  children: Set<PlaneContext>
}

export interface EffectCallback {
  (iteration: number, totalIterations: number): boolean
}

export class PlaneManager {
  private planes: Map<string, PlaneContext> = new Map()
  private renderOrder: string[] = []
  private nextPlaneId = 1
  private initialized = false

  constructor() {
    // Constructor kept simple - actual initialization in initialize() method
  }

  // Initialize the plane manager with the standard plane
  initialize(): boolean {
    if (this.initialized) return true

    try {
      // Initialize with standard plane if available
      const stdPlane = notcurses.getStandardPlane()
      if (stdPlane) {
        const stdContext: PlaneContext = {
          id: 'standard',
          handle: stdPlane,
          options: { y: 0, x: 0, rows: 24, cols: 80, zIndex: 0 },
          dimensions: { width: 80, height: 24 },
          zIndex: 0,
          isVisible: true,
          isTransparent: false,
          children: new Set(),
        }
        this.planes.set('standard', stdContext)
        this.renderOrder.push('standard')
        this.initialized = true
        return true
      } else {
        diagnosticLogger.warn('PlaneManager', 'No standard plane available for initialization')
        return false
      }
    } catch (error) {
      diagnosticLogger.error('PlaneManager', 'Error initializing plane manager', error)
      return false
    }
  }

  // Check if initialized
  isInitialized(): boolean {
    return this.initialized
  }

  // Create a new plane with advanced options
  createPlane(id: string, options: PlaneCreationOptions): PlaneContext | null {
    try {
      // Use provided ID or generate one
      const planeId = id || `plane_${this.nextPlaneId++}`

      // Create the actual notcurses plane
      const handle = notcurses.createPlane(options)
      if (!handle) {
        diagnosticLogger.error('PlaneManager', 'Failed to create notcurses plane')
        return null
      }

      const context: PlaneContext = {
        id: planeId,
        handle,
        options,
        dimensions: { width: options.cols, height: options.rows },
        zIndex: options.zIndex || 0,
        isVisible: true,
        isTransparent: options.transparent || false,
        parent: options.parent,
        children: new Set(),
      }

      // Add to parent's children if specified
      if (options.parent) {
        options.parent.children.add(context)
      }

      this.planes.set(planeId, context)
      this.updateRenderOrder()

      return context
    } catch (error) {
      diagnosticLogger.error('PlaneManager', 'Error creating plane', error)
      return null
    }
  }

  // Destroy a plane and cleanup resources
  destroyPlane(id: string): boolean {
    const context = this.planes.get(id)
    if (!context) return false

    try {
      // Destroy all children first
      for (const child of context.children) {
        this.destroyPlane(child.id)
      }

      // Remove from parent's children
      if (context.parent) {
        context.parent.children.delete(context)
      }

      // Destroy the notcurses plane
      notcurses.destroyPlane(context.handle)

      // Remove from tracking
      this.planes.delete(id)
      this.renderOrder = this.renderOrder.filter((pid) => pid !== id)

      return true
    } catch (error) {
      diagnosticLogger.error('PlaneManager', 'Error destroying plane', error)
      return false
    }
  }

  // Set plane z-index for dynamic layering
  setPlaneZIndex(id: string, zIndex: number): void {
    const context = this.planes.get(id)
    if (!context) return

    context.zIndex = zIndex
    this.updateRenderOrder()
  }

  // Move plane to a new position
  movePlane(id: string, x: number, y: number): boolean {
    const context = this.planes.get(id)
    if (!context) return false

    try {
      // Update context
      context.options.x = x
      context.options.y = y

      // Note: Actual plane movement would require additional notcurses FFI bindings
      // For now we track the intended position
      return true
    } catch (error) {
      diagnosticLogger.error('PlaneManager', 'Error moving plane', error)
      return false
    }
  }

  // Resize a plane
  resizePlane(id: string, width: number, height: number): boolean {
    const context = this.planes.get(id)
    if (!context) return false

    try {
      context.dimensions.width = width
      context.dimensions.height = height
      context.options.cols = width
      context.options.rows = height

      // Note: Actual plane resizing would require additional notcurses FFI bindings
      return true
    } catch (error) {
      diagnosticLogger.error('PlaneManager', 'Error resizing plane', error)
      return false
    }
  }

  // Set plane visibility
  setPlaneVisibility(id: string, visible: boolean): void {
    const context = this.planes.get(id)
    if (!context) return

    context.isVisible = visible
  }

  // Set plane transparency
  setPlaneTransparency(id: string, transparent: boolean): void {
    const context = this.planes.get(id)
    if (!context) return

    context.isTransparent = transparent
  }

  // Get plane context by ID
  getPlane(id: string): PlaneContext | undefined {
    return this.planes.get(id)
  }

  // Get all planes
  getAllPlanes(): PlaneContext[] {
    return Array.from(this.planes.values())
  }

  // Get planes in render order
  getPlanesInRenderOrder(): PlaneContext[] {
    return this.renderOrder
      .map((id) => this.planes.get(id))
      .filter((context): context is PlaneContext => context !== undefined)
  }

  // Update render order based on z-index
  private updateRenderOrder(): void {
    const contexts = Array.from(this.planes.values())

    // Sort by z-index (lower z-index rendered first, higher on top)
    contexts.sort((a, b) => a.zIndex - b.zIndex)

    this.renderOrder = contexts.map((context) => context.id)
  }

  // Render all planes in z-order with transparency support
  renderAll(): boolean {
    try {
      for (const id of this.renderOrder) {
        const context = this.planes.get(id)
        if (!context || !context.isVisible) continue

        this.renderPlane(context)
      }

      // Trigger notcurses render
      return notcurses.render()
    } catch (error) {
      diagnosticLogger.error('PlaneManager', 'Error rendering planes', error)
      return false
    }
  }

  // Render individual plane
  private renderPlane(context: PlaneContext): void {
    try {
      // Handle transparency effects
      if (context.isTransparent) {
        // Note: Actual transparency would require notcurses alpha blending
        // This is a placeholder for the transparency logic
      }

      // Render children
      for (const child of context.children) {
        if (child.isVisible) {
          this.renderPlane(child)
        }
      }
    } catch (error) {
      diagnosticLogger.error('PlaneManager', 'Error rendering individual plane', error)
    }
  }

  // Clear all planes
  clearAll(): void {
    for (const context of this.planes.values()) {
      try {
        notcurses.clearPlane(context.handle)
      } catch (error) {
        diagnosticLogger.error('PlaneManager', 'Error clearing plane', error)
      }
    }
  }

  // Get plane count
  getPlaneCount(): number {
    return this.planes.size
  }

  // Find planes by criteria
  findPlanes(predicate: (context: PlaneContext) => boolean): PlaneContext[] {
    return Array.from(this.planes.values()).filter(predicate)
  }

  // Get planes by z-index range
  getPlanesByZIndex(minZ: number, maxZ: number): PlaneContext[] {
    return this.findPlanes((context) => context.zIndex >= minZ && context.zIndex <= maxZ)
  }

  // Cleanup all planes
  cleanup(): void {
    for (const id of Array.from(this.planes.keys())) {
      this.destroyPlane(id)
    }
    this.planes.clear()
    this.renderOrder = []
  }
}

// Export singleton instance
export const planeManager = new PlaneManager()
