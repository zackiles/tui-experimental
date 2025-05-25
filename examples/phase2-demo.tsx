// Phase 2 Feature Demo - Comprehensive demonstration of TUI framework capabilities

import { type JSX } from '@tui/jsx/jsx-runtime'
import { Box, Text } from '../src/widgets/mod.ts'
import { createProgram, runProgram, Cmd } from '../src/tea/mod.ts'
import { inputManager } from '../src/input/protocols.ts'
import { notcurses } from '../src/graphics/notcurses-ffi.ts'
import { sixelRenderer } from '../src/graphics/sixel.ts'
import { kittyRenderer } from '../src/graphics/kitty-graphics.ts'
import { diagnosticLogger } from '../src/utils/diagnostic-logger.ts'
import { terminalCleanup } from '../src/utils/terminal-cleanup.ts'

// Application state
interface Model {
  mousePosition: { x: number; y: number }
  keyPressed: string
  counter: number
  terminalSize: { width: number; height: number }
  inputMode: 'keyboard' | 'mouse' | 'graphics'
  graphicsSupport: {
    notcurses: boolean
    sixel: boolean
    kitty: boolean
  }
  log: string[]
}

// Application messages
type Message =
  | { type: 'KeyPressed'; key: string }
  | { type: 'MouseMoved'; x: number; y: number }
  | { type: 'MouseClicked'; x: number; y: number; button: string }
  | { type: 'TerminalResized'; width: number; height: number }
  | { type: 'Increment' }
  | { type: 'SwitchMode'; mode: 'keyboard' | 'mouse' | 'graphics' }
  | { type: 'TestGraphics' }
  | { type: 'GraphicsDetected'; support: { notcurses: boolean; sixel: boolean; kitty: boolean } }
  | { type: 'LogMessage'; message: string }

// Initialize the application
function init(): [Model, any[]] {
  const initialModel: Model = {
    mousePosition: { x: 0, y: 0 },
    keyPressed: '',
    counter: 0,
    terminalSize: { width: 80, height: 24 },
    inputMode: 'keyboard',
    graphicsSupport: {
      notcurses: false,
      sixel: false,
      kitty: false
    },
    log: ['Application started']
  }

  // Initialize input systems and detect graphics support
  const commands = [
    Cmd.fromPromise(
      detectGraphicsSupport(),
      (support) => ({ type: 'GraphicsDetected', support: support }),
      (error) => ({ type: 'GraphicsDetected', support: { notcurses: false, sixel: false, kitty: false } })
    )
  ]

  return [initialModel, commands]
}

// Detect available graphics support
async function detectGraphicsSupport() {
  const support = {
    notcurses: notcurses.isAvailable(),
    sixel: await sixelRenderer.detectSupport(),
    kitty: await kittyRenderer.detectSupport()
  }
  
  // Initialize input manager
  await inputManager.initialize()
  
  return support
}

// Update function
function update(model: Model, message: Message): [Model, any[]] {
  switch (message.type) {
    case 'KeyPressed':
      return [
        {
          ...model,
          keyPressed: message.key,
          log: [...model.log.slice(-9), `Key pressed: ${message.key}`]
        },
        []
      ]

    case 'MouseMoved':
      return [
        {
          ...model,
          mousePosition: { x: message.x, y: message.y }
        },
        []
      ]

    case 'MouseClicked':
      return [
        {
          ...model,
          mousePosition: { x: message.x, y: message.y },
          log: [...model.log.slice(-9), `Mouse clicked: ${message.button} at (${message.x}, ${message.y})`]
        },
        []
      ]

    case 'TerminalResized':
      return [
        {
          ...model,
          terminalSize: { width: message.width, height: message.height },
          log: [...model.log.slice(-9), `Terminal resized: ${message.width}x${message.height}`]
        },
        []
      ]

    case 'Increment':
      return [
        {
          ...model,
          counter: model.counter + 1
        },
        []
      ]

    case 'SwitchMode':
      return [
        {
          ...model,
          inputMode: message.mode,
          log: [...model.log.slice(-9), `Switched to ${message.mode} mode`]
        },
        []
      ]

    case 'TestGraphics':
      const commands = []
      
      if (model.graphicsSupport.sixel) {
        commands.push(
          Cmd.fromPromise(
            testSixelGraphics(),
            () => ({ type: 'LogMessage', message: 'Sixel graphics test completed' }),
            (error) => ({ type: 'LogMessage', message: `Sixel error: ${error.message}` })
          )
        )
      }
      
      if (model.graphicsSupport.kitty) {
        commands.push(
          Cmd.fromPromise(
            testKittyGraphics(),
            () => ({ type: 'LogMessage', message: 'Kitty graphics test completed' }),
            (error) => ({ type: 'LogMessage', message: `Kitty error: ${error.message}` })
          )
        )
      }

      return [model, commands]

    case 'GraphicsDetected':
      return [
        {
          ...model,
          graphicsSupport: message.support,
          log: [...model.log.slice(-9), `Graphics support: ${JSON.stringify(message.support)}`]
        },
        []
      ]

    case 'LogMessage':
      return [
        {
          ...model,
          log: [...model.log.slice(-9), message.message]
        },
        []
      ]

    default:
      return [model, []]
  }
}

// Test Sixel graphics
async function testSixelGraphics() {
  const testPattern = new Uint8Array(64 * 64 * 3) // RGB data
  
  // Create a simple color gradient
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      const index = (y * 64 + x) * 3
      testPattern[index] = (x / 64) * 255     // R
      testPattern[index + 1] = (y / 64) * 255 // G
      testPattern[index + 2] = 128            // B
    }
  }
  
  await sixelRenderer.renderImage(testPattern, 'png')
}

// Test Kitty graphics
async function testKittyGraphics() {
  // Create a simple test image (this would normally be a real PNG/JPEG)
  const testData = new Uint8Array([137, 80, 78, 71]) // PNG header bytes
  await kittyRenderer.renderImage(testData, 'png')
}

// View function
function view(model: Model): JSX.Element {
  return (
    <Box 
      width={model.terminalSize.width} 
      height={model.terminalSize.height}
      border="double"
      borderColor="cyan"
      padding={1}
    >
      {/* Header */}
      <Box border="single" padding={1} backgroundColor="blue">
        {[<Text color="white">🚀 TUI Framework Phase 2 Demo</Text>]}
      </Box>

      {/* Main content area */}
      <Box direction="row" gap={2} padding={1}>
        {/* Left panel - Input demo */}
        <Box 
          width={30} 
          border="single" 
          borderColor="green" 
          padding={1}
        >
          {[
            <Text color="green">📝 Input Demo</Text>,
            <Box padding={[1, 0]}>
              {[
                <Text>{`Mode: ${model.inputMode}`}</Text>,
                <Text>{`Last key: ${model.keyPressed || 'none'}`}</Text>,
                <Text>{`Mouse: (${model.mousePosition.x}, ${model.mousePosition.y})`}</Text>,
                <Text>{`Counter: ${model.counter}`}</Text>
              ]}
            </Box>,
            <Box padding={[1, 0]}>
              {[
                <Text color="yellow">Controls:</Text>,
                <Text>Space: Increment</Text>,
                <Text>1/2/3: Switch modes</Text>,
                <Text>G: Test graphics</Text>,
                <Text>Q: Quit</Text>
              ]}
            </Box>
          ]}
        </Box>

        {/* Center panel - Graphics support */}
        <Box 
          width={25} 
          border="single" 
          borderColor="magenta" 
          padding={1}
        >
          {[
            <Text color="magenta">🎨 Graphics Support</Text>,
            <Box padding={[1, 0]}>
              {[
                <Text>{`Notcurses: ${model.graphicsSupport.notcurses ? '✅' : '❌'}`}</Text>,
                <Text>{`Sixel: ${model.graphicsSupport.sixel ? '✅' : '❌'}`}</Text>,
                <Text>{`Kitty: ${model.graphicsSupport.kitty ? '✅' : '❌'}`}</Text>
              ]}
            </Box>,
            <Box padding={[1, 0]}>
              {[<Text>{`Terminal: ${model.terminalSize.width}×${model.terminalSize.height}`}</Text>]}
            </Box>
          ]}
        </Box>

        {/* Right panel - Activity log */}
        <Box 
          width={25} 
          border="single" 
          borderColor="yellow" 
          padding={1}
        >
          <Text color="yellow">📋 Activity Log</Text>
          
          <Box padding={[1, 0]} height={15} overflow="scroll">
            {[...model.log.map((entry) => <Text>{entry}</Text>)]}
          </Box>
        </Box>
      </Box>

      {/* Footer */}
      <Box border="single" padding={1} backgroundColor="gray">
        {[<Text>{`Press keys to interact • Move mouse • Current mode: ${model.inputMode}`}</Text>]}
      </Box>
    </Box>
  )
}

// Subscriptions for input events
function subscriptions(model: Model) {
  return [
    // Keyboard subscription
    {
      subscribe(dispatch: (message: Message) => void) {
        return inputManager.addKeyboardListener((keyEvent) => {
          const key = keyEvent.key
          
          // Handle special keys
          if (key === ' ') {
            dispatch({ type: 'Increment' })
          } else if (key === '1') {
            dispatch({ type: 'SwitchMode', mode: 'keyboard' })
          } else if (key === '2') {
            dispatch({ type: 'SwitchMode', mode: 'mouse' })
          } else if (key === '3') {
            dispatch({ type: 'SwitchMode', mode: 'graphics' })
          } else if (key.toLowerCase() === 'g') {
            dispatch({ type: 'TestGraphics' })
          } else if (key.toLowerCase() === 'q') {
            // Proper cleanup before exit
            await inputManager.shutdown()
            await terminalCleanup.cleanup()
            Deno.exit(0)
          }
          
          dispatch({ type: 'KeyPressed', key })
        })
      }
    },

    // Mouse subscription
    {
      subscribe(dispatch: (message: Message) => void) {
        return inputManager.addMouseListener((mouseEvent) => {
          if (mouseEvent.type === 'move') {
            dispatch({ 
              type: 'MouseMoved', 
              x: mouseEvent.x, 
              y: mouseEvent.y 
            })
          } else if (mouseEvent.type === 'press') {
            dispatch({ 
              type: 'MouseClicked', 
              x: mouseEvent.x, 
              y: mouseEvent.y,
              button: mouseEvent.button
            })
          }
        })
      }
    },

    // Resize subscription
    {
      subscribe(dispatch: (message: Message) => void) {
        return inputManager.addResizeListener((resizeEvent) => {
          dispatch({ 
            type: 'TerminalResized', 
            width: resizeEvent.width, 
            height: resizeEvent.height 
          })
        })
      }
    }
  ]
}

// Main application
async function main() {
  diagnosticLogger.info('Phase2Demo', '🚀 Starting TUI Framework Phase 2 Demo...')
  
  // Record original terminal state
  terminalCleanup.recordOriginalState()
  
  try {
    // Create and run the TEA program
    const program = createProgram(init, update, view, subscriptions)
    
    const runtime = runProgram(program, (element) => {
      // This would normally render to the terminal
      // For now, just show that rendering is happening
      diagnosticLogger.debug('Phase2Demo', '📺 Rendering UI... (Element received)')
      
      // In a complete implementation, this would:
      // 1. Convert JSX to terminal operations
      // 2. Apply constraint-based layout
      // 3. Render to terminal buffer
      // 4. Update screen efficiently
    })

    diagnosticLogger.info('Phase2Demo', '✅ Demo running! Check terminal for updates.')
    diagnosticLogger.info('Phase2Demo', 'Press Ctrl+C to exit')

    // Keep the program running
    await new Promise(() => {}) // Run forever
  } catch (error) {
    diagnosticLogger.error('Phase2Demo', 'Error in demo', error)
    await terminalCleanup.cleanup()
    throw error
  }
}

// Run the demo
if (import.meta.main) {
  await main()
} 
