// Hello World example for the TUI framework
/// <reference path="../src/jsx/jsx-runtime.ts" />

import { runApp, Text } from '../src/main.ts'

function App() {
  return (
    <div>
      <Text color="green">Hello, Terminal UI World!</Text>
      <Text color="yellow" y={1}>This is a next-generation TUI framework</Text>
      <Text color="cyan" y={2}>Built with TypeScript, Deno, and Constraints</Text>
      <Text color="magenta" y={4}>Press 'q' or Ctrl+C to exit</Text>
    </div>
  )
}

if (import.meta.main) {
  await runApp(App, {})
} 
