

Ran tool


Ran tool

# Notcurses Advanced Graphics Implementation Plan

Based on research into notcurses capabilities and the existing FFI foundation, here's a comprehensive plan to actively use notcurses' advanced features for rendering and graphics in the TUI framework.

## Phase 1: Advanced Plane Management & Rendering Engine

### 1.1 Multi-Plane Rendering System
Create a sophisticated plane management system that leverages notcurses' z-ordered rendering:

```typescript
// src/graphics/plane-manager.ts
export class PlaneManager {
  private planes: Map<string, PlaneContext> = new Map()
  private renderOrder: string[] = []
  
  createPlane(id: string, options: PlaneCreationOptions): PlaneContext {
    const plane = notcurses.createPlane(options)
    const context = new PlaneContext(id, plane, options)
    this.planes.set(id, context)
    this.updateRenderOrder()
    return context
  }
  
  setPlaneZIndex(id: string, zIndex: number): void {
    // Dynamically reorder planes for advanced layering
  }
  
  renderAll(): void {
    // Render all planes in z-order with transparency support
    for (const id of this.renderOrder) {
      this.planes.get(id)?.render()
    }
    notcurses.render()
  }
}
```

### 1.2 Advanced Blitter Selection Engine
Implement intelligent blitter selection based on content type and terminal capabilities:

```typescript
// src/graphics/blitter-engine.ts
export class BlitterEngine {
  selectOptimalBlitter(
    content: GraphicsContent,
    terminalCapabilities: TerminalCapabilities
  ): BlitterType {
    // Pixel graphics for true images
    if (content.type === 'image' && terminalCapabilities.supportsPixelGraphics) {
      return BlitterType.PIXEL
    }
    
    // High-quality sextants for detailed graphics
    if (content.requiresHighDetail && terminalCapabilities.supportsSextants) {
      return BlitterType.SEXTANT_3x2
    }
    
    // Quadrants for moderate detail
    if (content.hasMultipleColors && terminalCapabilities.supportsQuadrants) {
      return BlitterType.QUADRANT_2x2
    }
    
    // Fallback to half-blocks
    return BlitterType.HALF_BLOCK_2x1
  }
}
```

## Phase 2: Visual System with True Graphics Support

### 2.1 Advanced Visual Renderer
Implement ncvisual support for true pixel graphics and image manipulation:

```typescript
// src/graphics/visual-renderer.ts
export class VisualRenderer {
  async renderImage(
    imagePath: string, 
    plane: PlaneContext,
    options: ImageRenderOptions
  ): Promise<void> {
    const visual = await notcurses.loadImage(imagePath)
    
    // Apply transformations
    if (options.scale) {
      notcurses.scaleVisual(visual, options.scale.width, options.scale.height)
    }
    
    if (options.rotation) {
      notcurses.rotateVisual(visual, options.rotation)
    }
    
    // Select optimal blitter based on terminal capabilities
    const blitter = this.blitterEngine.selectOptimalBlitter(
      { type: 'image', source: visual },
      await this.detectTerminalCapabilities()
    )
    
    // Render with advanced options
    await notcurses.blitVisual(visual, plane.handle, {
      blitter,
      scaling: options.scaling || 'SCALE',
      alpha: options.alpha || 'OPAQUE',
      placement: options.placement
    })
  }
  
  createCustomGraphics(
    pixelData: Uint8Array,
    width: number,
    height: number
  ): Visual {
    return notcurses.createVisualFromRGBA(pixelData, width, height)
  }
}
```

### 2.2 Protocol-Specific Graphics Support
Implement support for modern terminal graphics protocols:

```typescript
// src/graphics/terminal-protocols.ts
export class TerminalProtocolManager {
  async detectCapabilities(): Promise<TerminalCapabilities> {
    const capabilities = {
      supportsKittyGraphics: await this.detectKittyProtocol(),
      supportsSixel: await this.detectSixelSupport(),
      supportsITerm2: await this.detectITerm2Protocol(),
      supportsPixelGraphics: false
    }
    
    capabilities.supportsPixelGraphics = 
      capabilities.supportsKittyGraphics || 
      capabilities.supportsSixel || 
      capabilities.supportsITerm2
    
    return capabilities
  }
  
  private async detectKittyProtocol(): Promise<boolean> {
    // Query terminal using kitty graphics protocol detection
    return notcurses.checkPixelSupport() === 'KITTY'
  }
  
  async renderWithOptimalProtocol(
    visual: Visual,
    plane: PlaneContext
  ): Promise<void> {
    const capabilities = await this.detectCapabilities()
    
    if (capabilities.supportsKittyGraphics) {
      return this.renderWithKitty(visual, plane)
    } else if (capabilities.supportsSixel) {
      return this.renderWithSixel(visual, plane)
    } else {
      return this.renderWithFallback(visual, plane)
    }
  }
}
```

## Phase 3: Advanced Color and Transparency System

### 3.1 Advanced Color Management
Implement 24-bit RGB color with alpha blending:

```typescript
// src/graphics/color-system.ts
export class AdvancedColorSystem {
  createChannel(r: number, g: number, b: number, alpha: AlphaMode): ColorChannel {
    const rgb = (r << 16) | (g << 8) | b
    return notcurses.createChannelWithAlpha(rgb, alpha)
  }
  
  createGradient(
    start: ColorChannel,
    end: ColorChannel,
    steps: number
  ): ColorChannel[] {
    return notcurses.interpolateColors(start, end, steps)
  }
  
  applyTransparency(
    plane: PlaneContext,
    alphaMode: AlphaMode
  ): void {
    // TRANSPARENT: select next color
    // BLEND: average colors
    // OPAQUE: use color unchanged
    // HIGHCONTRAST: complement background
    notcurses.setPlaneAlpha(plane.handle, alphaMode)
  }
  
  createSprite(
    visual: Visual,
    transparentColor?: ColorChannel
  ): Sprite {
    // Create sprites with transparency support
    return new Sprite(visual, { transparentColor })
  }
}
```

### 3.2 Advanced Effects System
Implement visual effects using notcurses capabilities:

```typescript
// src/graphics/effects-system.ts
export class EffectsSystem {
  async fadeIn(
    plane: PlaneContext,
    duration: number,
    callback?: EffectCallback
  ): Promise<void> {
    const fadectx = notcurses.createFadeContext(plane.handle)
    const iterations = notcurses.getFadeIterations(fadectx)
    
    for (let i = 0; i < iterations; i++) {
      await notcurses.fadeInIteration(plane.handle, fadectx, i, callback)
      await this.delay(duration / iterations)
    }
    
    notcurses.destroyFadeContext(fadectx)
  }
  
  createLinearGradient(
    plane: PlaneContext,
    direction: GradientDirection,
    colors: ColorChannel[]
  ): void {
    const { width, height } = plane.dimensions
    
    notcurses.drawGradient(
      plane.handle,
      0, 0, width, height,
      direction === 'horizontal' ? colors[0] : colors[0],
      direction === 'horizontal' ? colors[1] : colors[0],
      direction === 'vertical' ? colors[0] : colors[1],
      direction === 'vertical' ? colors[1] : colors[1]
    )
  }
  
  pulse(
    plane: PlaneContext,
    period: number,
    callback?: EffectCallback
  ): void {
    // Implement pulsing effects
    notcurses.pulse(plane.handle, { period }, callback)
  }
}
```

## Phase 4: Widget System with Advanced Graphics

### 4.1 Graphics-Enhanced Widgets
Create widgets that leverage advanced notcurses features:

```typescript
// src/widgets/advanced-widgets.ts
export class ImageWidget extends Widget {
  private visual: Visual | null = null
  private imagePlane: PlaneContext | null = null
  
  async setImage(
    imagePath: string,
    options: ImageDisplayOptions = {}
  ): Promise<void> {
    this.visual = await this.visualRenderer.loadImage(imagePath)
    
    if (options.effects?.blur) {
      this.visual = await this.applyBlur(this.visual, options.effects.blur)
    }
    
    await this.visualRenderer.renderImage(
      imagePath,
      this.imagePlane!,
      options
    )
    
    this.requestRender()
  }
  
  setTransparency(alpha: number): void {
    if (this.imagePlane) {
      this.colorSystem.applyTransparency(
        this.imagePlane,
        alpha > 0 ? AlphaMode.BLEND : AlphaMode.TRANSPARENT
      )
    }
  }
}

export class AdvancedProgressBar extends Widget {
  render(): void {
    // Use gradients and advanced blitters for smooth progress bars
    this.effectsSystem.createLinearGradient(
      this.plane,
      'horizontal',
      [this.startColor, this.endColor]
    )
    
    // Use sextants for high-resolution progress indication
    this.drawProgressWithSextants(this.progress)
  }
}

export class ChartWidget extends Widget {
  private dataVisual: Visual | null = null
  
  async renderChart(data: ChartData): Promise<void> {
    // Create pixel-perfect charts using true graphics
    this.dataVisual = await this.generateChartVisual(data)
    
    await this.visualRenderer.renderCustomGraphics(
      this.dataVisual,
      this.plane,
      { blitter: BlitterType.PIXEL }
    )
  }
}
```

### 4.2 Interactive Graphics Elements
Implement interactive elements with advanced graphics:

```typescript
// src/widgets/interactive-graphics.ts
export class InteractiveCanvas extends Widget {
  private layers: Map<string, PlaneContext> = new Map()
  
  addLayer(name: string, zIndex: number): CanvasLayer {
    const plane = this.planeManager.createPlane(`${this.id}-${name}`, {
      parent: this.plane,
      zIndex,
      transparent: true
    })
    
    this.layers.set(name, plane)
    return new CanvasLayer(plane, this.visualRenderer)
  }
  
  async drawPixel(x: number, y: number, color: ColorChannel): Promise<void> {
    // Direct pixel manipulation for drawing applications
    const visual = this.visualRenderer.createSinglePixelVisual(color)
    await this.visualRenderer.renderAtPosition(visual, x, y)
  }
  
  async captureRegion(
    x: number, y: number, 
    width: number, height: number
  ): Promise<Visual> {
    // Capture screen regions as visuals for advanced operations
    return notcurses.captureScreenRegion(x, y, width, height)
  }
}
```

## Phase 5: Integration with Framework Architecture

### 5.1 Enhanced Rendering Pipeline
Integrate advanced graphics into the existing framework:

```typescript
// src/core/advanced-runtime.ts
export class AdvancedRuntime extends Runtime {
  private planeManager: PlaneManager
  private visualRenderer: VisualRenderer
  private effectsSystem: EffectsSystem
  private protocolManager: TerminalProtocolManager
  
  async initialize(): Promise<void> {
    await super.initialize()
    
    // Initialize notcurses with advanced options
    const success = await notcurses.init({
      flags: NotcursesFlags.NO_ALTERNATE_SCREEN,
      logLevel: LogLevel.WARNING
    })
    
    if (!success) {
      throw new Error('Failed to initialize advanced graphics')
    }
    
    // Setup advanced subsystems
    this.planeManager = new PlaneManager()
    this.visualRenderer = new VisualRenderer()
    this.effectsSystem = new EffectsSystem()
    this.protocolManager = new TerminalProtocolManager()
    
    // Detect terminal capabilities
    const capabilities = await this.protocolManager.detectCapabilities()
    this.configureForCapabilities(capabilities)
  }
  
  render(): void {
    // Enhanced render loop with plane management
    this.planeManager.renderAll()
  }
}
```

### 5.2 Framework API Extensions
Extend the framework API to expose advanced graphics features:

```typescript
// src/api/graphics-api.ts
export interface AdvancedGraphicsAPI {
  // Plane management
  createPlane(options: PlaneOptions): PlaneHandle
  setPlaneTransparency(plane: PlaneHandle, alpha: AlphaMode): void
  movePlane(plane: PlaneHandle, x: number, y: number): void
  resizePlane(plane: PlaneHandle, width: number, height: number): void
  
  // Visual rendering
  loadImage(path: string): Promise<VisualHandle>
  renderVisual(visual: VisualHandle, plane: PlaneHandle): Promise<void>
  createCustomVisual(pixelData: Uint8Array, width: number, height: number): VisualHandle
  
  // Effects
  fadeIn(plane: PlaneHandle, duration: number): Promise<void>
  fadeOut(plane: PlaneHandle, duration: number): Promise<void>
  createGradient(plane: PlaneHandle, colors: Color[], direction: GradientDirection): void
  
  // Advanced features
  detectTerminalCapabilities(): Promise<TerminalCapabilities>
  enablePixelGraphics(): Promise<boolean>
  createSprite(visual: VisualHandle, transparent?: Color): SpriteHandle
}
```

## Phase 6: Example Applications

### 6.1 Image Viewer Application
```typescript
// examples/image-viewer.tsx
export function ImageViewer() {
  const [currentImage, setCurrentImage] = useState<string>('')
  const graphicsAPI = useGraphicsAPI()
  
  return (
    <Application>
      <ImageWidget
        src={currentImage}
        effects={{ fadeIn: true, blur: 0.5 }}
        onLoad={() => graphicsAPI.fadeIn(imageWidget.plane, 500)}
        scaling="fit"
        blitter="auto"
      />
      <StatusBar>
        Pixel Graphics: {graphicsAPI.capabilities.supportsPixelGraphics ? '✓' : '✗'}
      </StatusBar>
    </Application>
  )
}
```

### 6.2 Data Visualization Dashboard
```typescript
// examples/dashboard.tsx
export function DataDashboard() {
  return (
    <Application>
      <PlaneContainer zIndex={0}>
        <BackgroundGradient colors={['#1a1a2e', '#16213e']} />
      </PlaneContainer>
      
      <PlaneContainer zIndex={1} transparent>
        <ChartWidget 
          data={chartData}
          type="line"
          renderMode="pixel-perfect"
          animations={{ enabled: true, duration: 1000 }}
        />
      </PlaneContainer>
      
      <PlaneContainer zIndex={2} transparent>
        <InteractiveOverlay
          onHover={(x, y) => showDataPoint(x, y)}
          onClick={(x, y) => selectDataPoint(x, y)}
        />
      </PlaneContainer>
    </Application>
  )
}
```

## Implementation Timeline

**Week 1-2**: Advanced FFI integration and plane management
**Week 3-4**: Visual rendering system and blitter engine  
**Week 5-6**: Color system and transparency effects
**Week 7-8**: Graphics-enhanced widgets and interactive elements
**Week 9-10**: Framework integration and API development
**Week 11-12**: Example applications and performance optimization

This plan leverages notcurses' most advanced features including true pixel graphics, sophisticated plane management, advanced color systems, and modern terminal protocol support to create a powerful graphics-enabled TUI framework that goes far beyond basic text rendering.
