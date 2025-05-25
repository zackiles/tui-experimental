// Framework constants for the next-generation terminal UI framework

// Version information
export const VERSION = '0.1.0'
export const FRAMEWORK_NAME = 'TUI Framework'

// Default terminal capabilities
export const DEFAULT_TERMINAL_WIDTH = 80
export const DEFAULT_TERMINAL_HEIGHT = 24
export const MIN_TERMINAL_WIDTH = 20
export const MIN_TERMINAL_HEIGHT = 5

// ANSI escape sequences
export const ANSI_CODES = {
  // Cursor control
  CURSOR_HIDE: '\x1b[?25l',
  CURSOR_SHOW: '\x1b[?25h',
  CURSOR_HOME: '\x1b[H',
  CURSOR_SAVE: '\x1b[s',
  CURSOR_RESTORE: '\x1b[u',
  
  // Screen control
  CLEAR_SCREEN: '\x1b[2J',
  CLEAR_LINE: '\x1b[2K',
  ALTERNATE_SCREEN_ENTER: '\x1b[?1049h',
  ALTERNATE_SCREEN_EXIT: '\x1b[?1049l',
  
  // Mouse support
  MOUSE_ENABLE: '\x1b[?1000h\x1b[?1006h',
  MOUSE_DISABLE: '\x1b[?1000l\x1b[?1006l',
  
  // Keyboard protocols
  KITTY_KEYBOARD_ENABLE: '\x1b[>1u',
  KITTY_KEYBOARD_DISABLE: '\x1b[<u',
  BRACKETED_PASTE_ENABLE: '\x1b[?2004h',
  BRACKETED_PASTE_DISABLE: '\x1b[?2004l',
  
  // Focus events
  FOCUS_TRACKING_ENABLE: '\x1b[?1004h',
  FOCUS_TRACKING_DISABLE: '\x1b[?1004l',
} as const

// Graphics protocol detection
export const GRAPHICS_PROTOCOLS = {
  SIXEL: 'sixel',
  KITTY: 'kitty',
  ITERM2: 'iterm2',
} as const

// Color formats
export const COLOR_FORMATS = {
  RGB_24BIT: 'rgb24',
  RGB_256: 'rgb256',
  RGB_16: 'rgb16',
  RGB_8: 'rgb8',
} as const

// Input event types
export const INPUT_TYPES = {
  KEYBOARD: 'keyboard',
  MOUSE: 'mouse',
  PASTE: 'paste',
  FOCUS: 'focus',
  RESIZE: 'resize',
} as const

// Layout constraint defaults
export const CONSTRAINT_DEFAULTS = {
  MIN_WIDTH: 0,
  MIN_HEIGHT: 0,
  MAX_WIDTH: Number.MAX_SAFE_INTEGER,
  MAX_HEIGHT: Number.MAX_SAFE_INTEGER,
  DEFAULT_PRIORITY: 1000,
} as const

// Performance constants
export const PERFORMANCE = {
  TARGET_FPS: 60,
  FRAME_TIME_MS: 1000 / 60,
  MAX_RENDER_TIME_MS: 16,
  DIFF_BATCH_SIZE: 100,
} as const

// Text measurement constants
export const TEXT_METRICS = {
  MONOSPACE_CHAR_WIDTH: 1,
  WIDE_CHAR_WIDTH: 2,
  COMBINING_CHAR_WIDTH: 0,
  TAB_WIDTH: 8,
} as const

// Environment detection
export const ENV = {
  DENO: typeof Deno !== 'undefined',
  NODE: false, // Will be implemented later with proper Node.js support
  BROWSER: typeof window !== 'undefined',
} as const

// FFI library paths (platform-specific)
export const FFI_PATHS = {
  NOTCURSES: {
    MACOS: '/opt/homebrew/lib/libnotcurses.dylib',
    LINUX: '/usr/lib/x86_64-linux-gnu/libnotcurses.so',
    WINDOWS: 'notcurses.dll',
  },
  TERMKEY: {
    MACOS: '/opt/homebrew/lib/libtermkey.dylib',
    LINUX: '/usr/lib/x86_64-linux-gnu/libtermkey.so',
    WINDOWS: 'termkey.dll',
  },
} as const

// Development flags
export const DEV_FLAGS = {
  HOT_RELOAD: true,
  DEBUG_LAYOUT: false,
  DEBUG_RENDERING: false,
  DEBUG_INPUT: false,
  PERFORMANCE_MONITORING: false,
} as const 