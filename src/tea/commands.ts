// Command system for side effects in TEA architecture

import { Command } from './runtime.ts'

// Base command implementations

// No-operation command
export class NoOpCommand<Message> implements Command<Message> {
  async execute(): Promise<Message | null> {
    return null
  }
}

// Delay command
export class DelayCommand<Message> implements Command<Message> {
  constructor(
    private duration: number,
    private message: Message,
  ) {}

  async execute(): Promise<Message | null> {
    await new Promise((resolve) => setTimeout(resolve, this.duration))
    return this.message
  }
}

// HTTP request command
export class HttpCommand<Message> implements Command<Message> {
  constructor(
    private url: string,
    private options: RequestInit,
    private onSuccess: (data: unknown) => Message,
    private onError: (error: Error) => Message,
  ) {}

  async execute(): Promise<Message | null> {
    try {
      const response = await fetch(this.url, this.options)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return this.onSuccess(data)
    } catch (error) {
      return this.onError(error as Error)
    }
  }
}

// File system command
export class FileCommand<Message> implements Command<Message> {
  constructor(
    private operation: 'read' | 'write' | 'delete' | 'exists',
    private path: string,
    private data: string | Uint8Array | null,
    private onSuccess: (result: unknown) => Message,
    private onError: (error: Error) => Message,
  ) {}

  async execute(): Promise<Message | null> {
    try {
      let result: unknown

      switch (this.operation) {
        case 'read':
          if (this.path.endsWith('.json')) {
            const content = await Deno.readTextFile(this.path)
            result = JSON.parse(content)
          } else {
            result = await Deno.readTextFile(this.path)
          }
          break

        case 'write':
          if (typeof this.data === 'string') {
            await Deno.writeTextFile(this.path, this.data)
          } else if (this.data instanceof Uint8Array) {
            await Deno.writeFile(this.path, this.data)
          }
          result = true
          break

        case 'delete':
          await Deno.remove(this.path)
          result = true
          break

        case 'exists':
          try {
            await Deno.stat(this.path)
            result = true
          } catch {
            result = false
          }
          break

        default:
          throw new Error(`Unknown file operation: ${this.operation}`)
      }

      return this.onSuccess(result)
    } catch (error) {
      return this.onError(error as Error)
    }
  }
}

// Animation frame command
export class AnimationFrameCommand<Message> implements Command<Message> {
  constructor(private message: Message) {}

  async execute(): Promise<Message | null> {
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        resolve(this.message)
      })
    })
  }
}

// Timer command
export class TimerCommand<Message> implements Command<Message> {
  constructor(
    private interval: number,
    private message: Message,
    private immediate = false,
  ) {}

  async execute(): Promise<Message | null> {
    if (this.immediate) {
      setTimeout(() => {
        // This would need to be handled by the runtime to dispatch periodically
      }, this.interval)
      return this.message
    }

    await new Promise((resolve) => setTimeout(resolve, this.interval))
    return this.message
  }
}

// Random number command
export class RandomCommand<Message> implements Command<Message> {
  constructor(
    private min: number,
    private max: number,
    private onResult: (value: number) => Message,
  ) {}

  async execute(): Promise<Message | null> {
    const value = Math.random() * (this.max - this.min) + this.min
    return this.onResult(value)
  }
}

// Terminal command
export class TerminalCommand<Message> implements Command<Message> {
  constructor(
    private command: string,
    private args: string[],
    private onSuccess: (output: string) => Message,
    private onError: (error: Error) => Message,
  ) {}

  async execute(): Promise<Message | null> {
    try {
      const process = new Deno.Command(this.command, {
        args: this.args,
        stdout: 'piped',
        stderr: 'piped',
      })

      const { code, stdout, stderr } = await process.output()

      if (code !== 0) {
        const errorText = new TextDecoder().decode(stderr)
        throw new Error(`Command failed with code ${code}: ${errorText}`)
      }

      const outputText = new TextDecoder().decode(stdout)
      return this.onSuccess(outputText)
    } catch (error) {
      return this.onError(error as Error)
    }
  }
}

// Batch command - execute multiple commands
export class BatchCommand<Message> implements Command<Message> {
  constructor(
    private commands: Command<Message>[],
    private onComplete: (results: (Message | null)[]) => Message,
  ) {}

  async execute(): Promise<Message | null> {
    const results = await Promise.all(
      this.commands.map((cmd) => cmd.execute()),
    )
    return this.onComplete(results)
  }
}

// Sequential command - execute commands one after another
export class SequentialCommand<Message> implements Command<Message> {
  constructor(
    private commands: Command<Message>[],
    private onComplete: (results: (Message | null)[]) => Message,
  ) {}

  async execute(): Promise<Message | null> {
    const results: (Message | null)[] = []

    for (const command of this.commands) {
      const result = await command.execute()
      results.push(result)
    }

    return this.onComplete(results)
  }
}

// Command builder utilities

export const Cmd = {
  // Create a no-op command
  none<Message>(): Command<Message> {
    return new NoOpCommand<Message>()
  },

  // Create a batch of commands
  batch<Message>(...commands: Command<Message>[]): Command<Message>[] {
    return commands
  },

  // Create a delay command
  delay<Message>(duration: number, message: Message): Command<Message> {
    return new DelayCommand(duration, message)
  },

  // Create an HTTP GET command
  get<Message>(
    url: string,
    onSuccess: (data: unknown) => Message,
    onError: (error: Error) => Message,
  ): Command<Message> {
    return new HttpCommand(url, { method: 'GET' }, onSuccess, onError)
  },

  // Create an HTTP POST command
  post<Message>(
    url: string,
    data: unknown,
    onSuccess: (data: unknown) => Message,
    onError: (error: Error) => Message,
  ): Command<Message> {
    return new HttpCommand(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
      onSuccess,
      onError,
    )
  },

  // Create a file read command
  readFile<Message>(
    path: string,
    onSuccess: (content: string) => Message,
    onError: (error: Error) => Message,
  ): Command<Message> {
    return new FileCommand('read', path, null, (result) => onSuccess(result as string), onError)
  },

  // Create a file write command
  writeFile<Message>(
    path: string,
    content: string,
    onSuccess: () => Message,
    onError: (error: Error) => Message,
  ): Command<Message> {
    return new FileCommand('write', path, content, onSuccess, onError)
  },

  // Create an animation frame command
  animationFrame<Message>(message: Message): Command<Message> {
    return new AnimationFrameCommand(message)
  },

  // Create a random number command
  random<Message>(
    min: number,
    max: number,
    onResult: (value: number) => Message,
  ): Command<Message> {
    return new RandomCommand(min, max, onResult)
  },

  // Create a terminal command
  exec<Message>(
    command: string,
    args: string[],
    onSuccess: (output: string) => Message,
    onError: (error: Error) => Message,
  ): Command<Message> {
    return new TerminalCommand(command, args, onSuccess, onError)
  },

  // Transform a promise into a command
  fromPromise<T, Message>(
    promise: Promise<T>,
    onSuccess: (value: T) => Message,
    onError: (error: Error) => Message,
  ): Command<Message> {
    return {
      async execute(): Promise<Message | null> {
        try {
          const result = await promise
          return onSuccess(result)
        } catch (error) {
          return onError(error as Error)
        }
      },
    }
  },

  // Map over a command result
  map<T, Message>(
    command: Command<T>,
    mapper: (message: T) => Message,
  ): Command<Message> {
    return {
      async execute(): Promise<Message | null> {
        const result = await command.execute()
        return result ? mapper(result) : null
      },
    }
  },
}
