// The Elm Architecture (TEA) runtime implementation
import { type JSX } from '@tui/jsx/jsx-runtime'
import { diagnosticLogger } from '../utils/diagnostic-logger.ts'

export interface Command<Message> {
  execute(): Promise<Message | null>
}

export interface Subscription<Message> {
  subscribe(dispatch: (message: Message) => void): () => void
}

export type UpdateFunction<Model, Message> = (
  model: Model,
  message: Message,
) => [Model, Command<Message>[]]

export type ViewFunction<Model> = (model: Model) => JSX.Element

export interface Program<Model, Message> {
  init(): [Model, Command<Message>[]]
  update: UpdateFunction<Model, Message>
  view: ViewFunction<Model>
  subscriptions?(model: Model): Subscription<Message>[]
}

export type AppState<Model> = {
  model: Model
  isRunning: boolean
  renderRequested: boolean
  lastRenderTime: number
}

// Polyfill for requestAnimationFrame in Deno
const requestAnimationFrame = globalThis.requestAnimationFrame ||
  ((callback: (time: number) => void) => {
    return setTimeout(() => callback(performance.now()), 16) // ~60fps
  })

const cancelAnimationFrame = globalThis.cancelAnimationFrame ||
  ((id: number) => clearTimeout(id))

export class TEARuntime<Model, Message> {
  private program: Program<Model, Message>
  private state: AppState<Model>
  private messageQueue: Message[] = []
  private isProcessing = false
  private subscriptions: Array<() => void> = []
  private renderCallbacks: Array<(element: JSX.Element) => void> = []
  private frameId: number | null = null
  private maxFPS = 60
  private minFrameTime = 1000 / this.maxFPS

  constructor(program: Program<Model, Message>) {
    this.program = program

    // Initialize state
    const [initialModel, initialCommands] = program.init()
    this.state = {
      model: initialModel,
      isRunning: false,
      renderRequested: false,
      lastRenderTime: 0,
    }

    // Process initial commands
    this.processCommands(initialCommands)
  }

  // Start the runtime
  start(): void {
    if (this.state.isRunning) return

    this.state.isRunning = true
    this.setupSubscriptions()
    this.requestRender()
  }

  // Stop the runtime
  stop(): void {
    if (!this.state.isRunning) return

    this.state.isRunning = false
    this.cleanup()
  }

  // Dispatch a message to the update function
  dispatch(message: Message): void {
    this.messageQueue.push(message)
    this.processMessageQueue()
  }

  // Process all queued messages
  private async processMessageQueue(): Promise<void> {
    if (this.isProcessing || !this.state.isRunning) return

    this.isProcessing = true

    while (this.messageQueue.length > 0 && this.state.isRunning) {
      const message = this.messageQueue.shift()!
      await this.processMessage(message)
    }

    this.isProcessing = false
  }

  // Process a single message
  private async processMessage(message: Message): Promise<void> {
    try {
      // Call the update function
      const [newModel, commands] = this.program.update(this.state.model, message)

      // Update state
      this.state.model = newModel

      // Process commands
      await this.processCommands(commands)

      // Update subscriptions if needed
      this.updateSubscriptions()

      // Request a render
      this.requestRender()
    } catch (error) {
      diagnosticLogger.error('TEARuntime', 'Error processing message', {
        error,
        message,
        model: this.state.model,
      })
    }
  }

  // Process commands (side effects)
  private async processCommands(commands: Command<Message>[]): Promise<void> {
    const commandPromises = commands.map(async (command) => {
      try {
        const resultMessage = await command.execute()
        if (resultMessage) {
          this.dispatch(resultMessage)
        }
      } catch (error) {
        diagnosticLogger.error('TEARuntime', 'Error executing command', { error, command })
      }
    })

    // Execute all commands concurrently
    await Promise.all(commandPromises)
  }

  // Set up subscriptions
  private setupSubscriptions(): void {
    this.updateSubscriptions()
  }

  // Update subscriptions based on current model
  private updateSubscriptions(): void {
    // Clean up existing subscriptions
    this.subscriptions.forEach((cleanup) => cleanup())
    this.subscriptions = []

    // Set up new subscriptions if the program defines them
    if (this.program.subscriptions) {
      const newSubscriptions = this.program.subscriptions(this.state.model)

      newSubscriptions.forEach((subscription) => {
        const cleanup = subscription.subscribe((message) => {
          this.dispatch(message)
        })
        this.subscriptions.push(cleanup)
      })
    }
  }

  // Request a render with frame rate limiting
  private requestRender(): void {
    if (this.state.renderRequested) return

    this.state.renderRequested = true

    if (this.frameId) {
      cancelAnimationFrame(this.frameId)
    }

    this.frameId = requestAnimationFrame(() => {
      this.performRender()
    })
  }

  // Perform the actual render
  private performRender(): void {
    if (!this.state.isRunning) return

    const now = performance.now()
    const timeSinceLastRender = now - this.state.lastRenderTime

    // Frame rate limiting
    if (timeSinceLastRender < this.minFrameTime) {
      this.frameId = requestAnimationFrame(() => {
        this.performRender()
      })
      return
    }

    try {
      // Call the view function
      const element = this.program.view(this.state.model)

      // Notify render callbacks
      this.renderCallbacks.forEach((callback) => {
        try {
          callback(element)
        } catch (error) {
          diagnosticLogger.error('TEARuntime', 'Error in render callback', error)
        }
      })

      this.state.lastRenderTime = now
      this.state.renderRequested = false
    } catch (error) {
      diagnosticLogger.error('TEARuntime', 'Error rendering view', {
        error,
        model: this.state.model,
      })
    }
  }

  // Add a render callback
  onRender(callback: (element: JSX.Element) => void): () => void {
    this.renderCallbacks.push(callback)

    // Return cleanup function
    return () => {
      const index = this.renderCallbacks.indexOf(callback)
      if (index >= 0) {
        this.renderCallbacks.splice(index, 1)
      }
    }
  }

  // Get current model (read-only)
  getModel(): Model {
    return this.state.model
  }

  // Get current state
  getState(): Readonly<AppState<Model>> {
    return { ...this.state }
  }

  // Set frame rate limit
  setMaxFPS(fps: number): void {
    this.maxFPS = Math.max(1, Math.min(120, fps))
    this.minFrameTime = 1000 / this.maxFPS
  }

  // Get frame rate limit
  getMaxFPS(): number {
    return this.maxFPS
  }

  // Check if running
  isRunning(): boolean {
    return this.state.isRunning
  }

  // Get message queue length (for debugging)
  getMessageQueueLength(): number {
    return this.messageQueue.length
  }

  // Get subscription count (for debugging)
  getSubscriptionCount(): number {
    return this.subscriptions.length
  }

  // Clean up resources
  private cleanup(): void {
    // Cancel pending render
    if (this.frameId) {
      cancelAnimationFrame(this.frameId)
      this.frameId = null
    }

    // Clean up subscriptions
    this.subscriptions.forEach((cleanup) => cleanup())
    this.subscriptions = []

    // Clear message queue
    this.messageQueue = []

    // Clear render callbacks
    this.renderCallbacks = []
  }
}

// Utility function to create a simple program
export function createProgram<Model, Message>(
  init: () => [Model, Command<Message>[]],
  update: UpdateFunction<Model, Message>,
  view: ViewFunction<Model>,
  subscriptions?: (model: Model) => Subscription<Message>[],
): Program<Model, Message> {
  return {
    init,
    update,
    view,
    subscriptions,
  }
}

// Utility function to run a TEA program
export function runProgram<Model, Message>(
  program: Program<Model, Message>,
  onRender: (element: JSX.Element) => void,
): TEARuntime<Model, Message> {
  const runtime = new TEARuntime(program)
  runtime.onRender(onRender)
  runtime.start()
  return runtime
}
