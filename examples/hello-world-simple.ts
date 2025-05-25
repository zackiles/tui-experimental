// Simple Hello World example for the TUI framework (without JSX)

import { runApp, TUIRuntime } from '../src/main.ts'
import type { TerminalNode, Component } from '../src/main.ts'

const HelloWorld: Component = () => {
  return {
    type: 'div',
    props: {},
    children: [
      {
        type: 'text',
        props: {
          children: 'Hello, Terminal UI World!',
          color: 'green',
          x: 0,
          y: 0,
        },
        children: [],
      },
      {
        type: 'text',
        props: {
          children: 'This is a next-generation TUI framework',
          color: 'yellow',
          x: 0,
          y: 1,
        },
        children: [],
      },
      {
        type: 'text',
        props: {
          children: 'Built with TypeScript, Deno, and Constraints',
          color: 'cyan',
          x: 0,
          y: 2,
        },
        children: [],
      },
      {
        type: 'text',
        props: {
          children: 'Press \'q\' or Ctrl+C to exit',
          color: 'magenta',
          x: 0,
          y: 4,
        },
        children: [],
      },
    ],
  }
}

if (import.meta.main) {
  console.log('Starting TUI Framework Demo...')
  try {
    await runApp(HelloWorld, {})
  } catch (error) {
    console.error('Error running TUI app:', error)
    Deno.exit(1)
  }
} 
