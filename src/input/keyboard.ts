// Advanced keyboard input handling with modern terminal protocol support

import { diagnosticLogger } from '../utils/diagnostic-logger.ts'

export interface KeyEvent {
  key: string
  code?: string
  ctrl: boolean
  alt: boolean
  shift: boolean
  meta: boolean
  type: 'press' | 'release' | 'repeat'
  timestamp: number
}

export interface KeyboardCapabilities {
  supportsKittyProtocol: boolean
  supportsModifyOtherKeys: boolean
  supportsBracketedPaste: boolean
  supportsKeyRelease: boolean
}

// Special key mappings for different protocols
const ANSI_KEY_MAP: Record<string, string> = {
  '\x1b[A': 'ArrowUp',
  '\x1b[B': 'ArrowDown',
  '\x1b[C': 'ArrowRight',
  '\x1b[D': 'ArrowLeft',
  '\x1b[H': 'Home',
  '\x1b[F': 'End',
  '\x1b[2~': 'Insert',
  '\x1b[3~': 'Delete',
  '\x1b[5~': 'PageUp',
  '\x1b[6~': 'PageDown',
  '\x1bOP': 'F1',
  '\x1bOQ': 'F2',
  '\x1bOR': 'F3',
  '\x1bOS': 'F4',
  '\x1b[15~': 'F5',
  '\x1b[17~': 'F6',
  '\x1b[18~': 'F7',
  '\x1b[19~': 'F8',
  '\x1b[20~': 'F9',
  '\x1b[21~': 'F10',
  '\x1b[23~': 'F11',
  '\x1b[24~': 'F12',
  '\x7f': 'Backspace',
  '\x1b': 'Escape',
  '\t': 'Tab',
  '\r': 'Enter',
  '\n': 'Enter',
  ' ': 'Space',
}

// Control key mappings
const CTRL_KEY_MAP: Record<string, string> = {
  '\x01': 'a',
  '\x02': 'b',
  '\x03': 'c',
  '\x04': 'd',
  '\x05': 'e',
  '\x06': 'f',
  '\x07': 'g',
  '\x08': 'h',
  '\x09': 'i',
  '\x0a': 'j',
  '\x0b': 'k',
  '\x0c': 'l',
  '\x0d': 'm',
  '\x0e': 'n',
  '\x0f': 'o',
  '\x10': 'p',
  '\x11': 'q',
  '\x12': 'r',
  '\x13': 's',
  '\x14': 't',
  '\x15': 'u',
  '\x16': 'v',
  '\x17': 'w',
  '\x18': 'x',
  '\x19': 'y',
  '\x1a': 'z',
}

export class KeyboardInput {
  private capabilities: KeyboardCapabilities | null = null
  private listeners: ((event: KeyEvent) => void)[] = []
  private isRawMode = false
  private decoder = new TextDecoder()
  private buffer = ''
  private bracketedPasteMode = false

  constructor() {
    this.setupSignalHandlers()
  }

  // Set up signal handlers for cleanup
  private setupSignalHandlers(): void {
    const cleanup = () => {
      this.disableRawMode()
      Deno.exit(0)
    }

    Deno.addSignalListener('SIGINT', cleanup)
    Deno.addSignalListener('SIGTERM', cleanup)
  }

  // Detect terminal keyboard capabilities
  async detectCapabilities(): Promise<KeyboardCapabilities> {
    if (this.capabilities) return this.capabilities

    const capabilities: KeyboardCapabilities = {
      supportsKittyProtocol: false,
      supportsModifyOtherKeys: false,
      supportsBracketedPaste: false,
      supportsKeyRelease: false,
    }

    try {
      // Check environment variables
      const term = Deno.env.get('TERM')
      const kittyWindow = Deno.env.get('KITTY_WINDOW_ID')

      if (term === 'xterm-kitty' || kittyWindow) {
        capabilities.supportsKittyProtocol = true
        capabilities.supportsKeyRelease = true
        capabilities.supportsBracketedPaste = true
      }

      // Check for XTerm
      if (term?.includes('xterm')) {
        capabilities.supportsModifyOtherKeys = true
        capabilities.supportsBracketedPaste = true
      }

      this.capabilities = capabilities
      return capabilities
    } catch (error) {
      diagnosticLogger.warn('KeyboardInput', 'Error detecting keyboard capabilities', error)
      this.capabilities = capabilities
      return capabilities
    }
  }

  // Enable Kitty keyboard protocol
  async enableKittyProtocol(): Promise<boolean> {
    const caps = await this.detectCapabilities()
    if (!caps.supportsKittyProtocol) return false

    try {
      // Enable Kitty keyboard protocol with all features
      // Flags: report all keys, report repeat, report release, report alternate keys
      await Deno.stdout.write(new TextEncoder().encode('\x1b[>1u'))
      return true
    } catch (error) {
      diagnosticLogger.error('KeyboardInput', 'Error enabling Kitty protocol', error)
      return false
    }
  }

  // Disable Kitty keyboard protocol
  async disableKittyProtocol(): Promise<void> {
    try {
      await Deno.stdout.write(new TextEncoder().encode('\x1b[<1u'))
    } catch (error) {
      diagnosticLogger.error('KeyboardInput', 'Error disabling Kitty protocol', error)
    }
  }

  // Enable XTerm modifyOtherKeys
  async enableModifyOtherKeys(): Promise<boolean> {
    const caps = await this.detectCapabilities()
    if (!caps.supportsModifyOtherKeys) return false

    try {
      // Level 2: report all modifier combinations
      await Deno.stdout.write(new TextEncoder().encode('\x1b[>4;2m'))
      return true
    } catch (error) {
      diagnosticLogger.error('KeyboardInput', 'Error enabling modifyOtherKeys', error)
      return false
    }
  }

  // Enable bracketed paste mode
  async enableBracketedPaste(): Promise<boolean> {
    const caps = await this.detectCapabilities()
    if (!caps.supportsBracketedPaste) return false

    try {
      await Deno.stdout.write(new TextEncoder().encode('\x1b[?2004h'))
      this.bracketedPasteMode = true
      return true
    } catch (error) {
      diagnosticLogger.error('KeyboardInput', 'Error enabling bracketed paste', error)
      return false
    }
  }

  // Disable bracketed paste mode
  async disableBracketedPaste(): Promise<void> {
    try {
      await Deno.stdout.write(new TextEncoder().encode('\x1b[?2004l'))
      this.bracketedPasteMode = false
    } catch (error) {
      diagnosticLogger.error('KeyboardInput', 'Error disabling bracketed paste', error)
    }
  }

  // Enable raw mode for input capture
  async enableRawMode(): Promise<boolean> {
    if (this.isRawMode) return true

    try {
      Deno.stdin.setRaw(true)
      this.isRawMode = true

      // Enable modern keyboard protocols
      await this.enableKittyProtocol()
      await this.enableModifyOtherKeys()
      await this.enableBracketedPaste()

      this.startInputLoop()
      return true
    } catch (error) {
      diagnosticLogger.error('KeyboardInput', 'Error enabling raw mode', error)
      return false
    }
  }

  // Disable raw mode
  disableRawMode(): void {
    if (!this.isRawMode) return

    try {
      Deno.stdin.setRaw(false)
      this.isRawMode = false

      // Disable protocols
      this.disableKittyProtocol()
      this.disableBracketedPaste()
    } catch (error) {
      diagnosticLogger.error('KeyboardInput', 'Error disabling raw mode', error)
    }
  }

  // Start the input processing loop
  private async startInputLoop(): Promise<void> {
    const buffer = new Uint8Array(1024)

    while (this.isRawMode) {
      try {
        const bytesRead = await Deno.stdin.read(buffer)
        if (!bytesRead) continue

        const data = this.decoder.decode(buffer.slice(0, bytesRead))
        this.buffer += data
        this.processInputBuffer()
      } catch (error) {
        if (this.isRawMode) {
          diagnosticLogger.error('KeyboardInput', 'Input loop error', error)
        }
        break
      }
    }
  }

  // Process accumulated input buffer
  private processInputBuffer(): void {
    while (this.buffer.length > 0) {
      const event = this.parseNextKeyEvent()
      if (!event) break

      this.dispatchKeyEvent(event)
    }
  }

  // Parse the next key event from buffer
  private parseNextKeyEvent(): KeyEvent | null {
    if (this.buffer.length === 0) return null

    // Handle bracketed paste
    if (this.buffer.startsWith('\x1b[200~')) {
      const endIndex = this.buffer.indexOf('\x1b[201~')
      if (endIndex === -1) return null // Incomplete paste

      const pasteContent = this.buffer.slice(6, endIndex)
      this.buffer = this.buffer.slice(endIndex + 6)

      return {
        key: pasteContent,
        ctrl: false,
        alt: false,
        shift: false,
        meta: false,
        type: 'press',
        timestamp: Date.now(),
      }
    }

    // Try Kitty protocol first
    const kittyEvent = this.parseKittySequence()
    if (kittyEvent) return kittyEvent

    // Try XTerm sequences
    const xtermEvent = this.parseXTermSequence()
    if (xtermEvent) return xtermEvent

    // Try standard ANSI sequences
    const ansiEvent = this.parseAnsiSequence()
    if (ansiEvent) return ansiEvent

    // Single character
    const char = this.buffer[0]
    this.buffer = this.buffer.slice(1)

    return this.createKeyEvent(char, false, false, false, false)
  }

  // Parse Kitty keyboard protocol sequence
  private parseKittySequence(): KeyEvent | null {
    // Kitty format: \x1b[unicode;modifiers;type;state;alternate_keyu
    const match = this.buffer.match(/^\x1b\[(\d+);(\d+);(\d+);(\d+);(\d+)u/)
    if (!match) return null

    this.buffer = this.buffer.slice(match[0].length)

    const unicode = parseInt(match[1])
    const modifiers = parseInt(match[2])
    const type = parseInt(match[3])

    const ctrl = (modifiers & 4) !== 0
    const alt = (modifiers & 2) !== 0
    const shift = (modifiers & 1) !== 0
    const meta = (modifiers & 8) !== 0

    const eventType = type === 1 ? 'press' : type === 2 ? 'repeat' : 'release'
    const key = String.fromCharCode(unicode)

    return {
      key,
      ctrl,
      alt,
      shift,
      meta,
      type: eventType,
      timestamp: Date.now(),
    }
  }

  // Parse XTerm modifyOtherKeys sequence
  private parseXTermSequence(): KeyEvent | null {
    // XTerm format: \x1b[27;modifiers;unicode~
    const match = this.buffer.match(/^\x1b\[27;(\d+);(\d+)~/)
    if (!match) return null

    this.buffer = this.buffer.slice(match[0].length)

    const modifiers = parseInt(match[1])
    const unicode = parseInt(match[2])

    const ctrl = (modifiers & 4) !== 0
    const alt = (modifiers & 2) !== 0
    const shift = (modifiers & 1) !== 0
    const meta = (modifiers & 8) !== 0

    const key = String.fromCharCode(unicode)

    return {
      key,
      ctrl,
      alt,
      shift,
      meta,
      type: 'press',
      timestamp: Date.now(),
    }
  }

  // Parse standard ANSI escape sequences
  private parseAnsiSequence(): KeyEvent | null {
    // Try longest sequences first
    for (const sequence of Object.keys(ANSI_KEY_MAP).sort((a, b) => b.length - a.length)) {
      if (this.buffer.startsWith(sequence)) {
        this.buffer = this.buffer.slice(sequence.length)
        const key = ANSI_KEY_MAP[sequence]

        return {
          key,
          ctrl: false,
          alt: false,
          shift: false,
          meta: false,
          type: 'press',
          timestamp: Date.now(),
        }
      }
    }

    return null
  }

  // Create key event from character
  private createKeyEvent(
    char: string,
    ctrl: boolean,
    alt: boolean,
    shift: boolean,
    meta: boolean,
  ): KeyEvent {
    let key = char

    // Check for control characters
    if (char.charCodeAt(0) < 32) {
      const ctrlKey = CTRL_KEY_MAP[char]
      if (ctrlKey) {
        key = ctrlKey
        ctrl = true
      }
    }

    // Handle printable characters
    if (char.length === 1 && char.charCodeAt(0) >= 32) {
      key = char
    }

    return {
      key,
      ctrl,
      alt,
      shift,
      meta,
      type: 'press',
      timestamp: Date.now(),
    }
  }

  // Dispatch key event to listeners
  private dispatchKeyEvent(event: KeyEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event)
      } catch (error) {
        diagnosticLogger.error('KeyboardInput', 'Error in key event listener', error)
      }
    }
  }

  // Add event listener
  addEventListener(listener: (event: KeyEvent) => void): () => void {
    this.listeners.push(listener)

    // Return cleanup function
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index >= 0) {
        this.listeners.splice(index, 1)
      }
    }
  }

  // Remove event listener
  removeEventListener(listener: (event: KeyEvent) => void): void {
    const index = this.listeners.indexOf(listener)
    if (index >= 0) {
      this.listeners.splice(index, 1)
    }
  }

  // Get current capabilities
  getCapabilities(): KeyboardCapabilities | null {
    return this.capabilities
  }

  // Check if in raw mode
  isInRawMode(): boolean {
    return this.isRawMode
  }
}

// Export singleton instance
export const keyboard = new KeyboardInput()

export type { KeyboardCapabilities }
